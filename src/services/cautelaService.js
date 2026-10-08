import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { normalizarItens, itensCautela, agruparMovimentos, movimentar, prepararDevolucao, texto, validarPrevisao, validarAssinatura, limiteDocumento } from '../utils/estoque.mjs';

export const novaOperacaoId = db => doc(collection(db, 'cautelas')).id;
const resumo = itens => ({ material: itens.map(m => m.nome).join(', '), quantidade: itens.map(m => m.quantidade).join(', ') });
const exigirAberta = c => { if (c.dataEntrega || c.estoqueDevolvido === true || c.excluida) throw new Error('Esta cautela está finalizada e não aceita alterações de materiais.'); };

// Recebe db explicitamente para que os mesmos fluxos sejam testados no Emulator.
export async function salvarMovimentacao(db, p) {
  const ref = doc(db, 'cautelas', p.cautelaId || p.operacaoId);
  const eventoRef = doc(collection(ref, 'historico'), p.operacaoId);
  const operador = texto(p.operador, 'Militar SecOp');
  const uid = texto(p.uid, 'Sessão');
  const assinatura = ['criar', 'adicionar', 'devolver', 'assinar', 'assinar_devolucao', 'editar'].includes(p.tipo)
    ? validarAssinatura(p.assinatura, p.tipo !== 'criar') : '';
  return runTransaction(db, async tx => {
    const [snap, evento] = await Promise.all([tx.get(ref), tx.get(eventoRef)]);
    if (evento.exists()) return { id: ref.id, repetida: true };
    if (p.tipo === 'criar' && snap.exists()) throw new Error('Identificador já utilizado. Reabra o formulário.');
    if (p.tipo !== 'criar' && !snap.exists()) throw new Error('A cautela não existe mais.');
    const c = snap.exists() ? snap.data() : {};
    let alteracoes = {}, movimentos = [], itensEvento = [], sentido = 1;
    const registro = { tipo: p.tipo, operador, uid, identidade: 'nome_declarado_sessao_anonima', em: serverTimestamp() };
    if (p.tipo === 'criar') {
      const itens = normalizarItens(p.itens);
      alteracoes = {
        militar: texto(p.militar, 'Militar que cautelou'), om: texto(p.om, 'OM', 200, false),
        observacao: texto(p.observacao, 'Observação', 2000, false),
        previsaoDevolucao: validarPrevisao(p.previsaoDevolucao),
        materiais: itens, ...resumo(itens), dataCautela: texto(p.dataCautela, 'Data'),
        milSecOpCautela: operador, assinaturaCautela: assinatura,
        dataEntrega: '', obsEntrega: '', milSecOp: '', assinaturaDevolucao: '',
        estoqueBaixado: itens.some(m => m.estoqueControlado), estoqueDevolvido: false,
        schemaVersion: 2, revisao: 1, totalAcrescimos: 0, createdAt: serverTimestamp(), createdBy: uid
      };
      movimentos = agruparMovimentos(itens); itensEvento = itens;
    } else if (p.tipo === 'devolver' || p.tipo === 'excluir') {
      if (c.excluida) throw new Error('Cautela já excluída.');
      if (p.tipo === 'devolver') exigirAberta(c);
      if (!c.dataEntrega && c.estoqueDevolvido !== true) {
        const solicitadas = p.tipo === 'excluir'
          ? Object.fromEntries(itensCautela(c).map(m => [m.linhaId, m.pendente])) : p.quantidades;
        const d = prepararDevolucao(c, solicitadas);
        movimentos = d.movimentos; itensEvento = d.devolvidos; sentido = -1;
        alteracoes.materiais = d.itens;
        if (d.completa) Object.assign(alteracoes, {
          dataEntrega: p.dataHoje, milSecOp: operador,
          obsEntrega: texto(p.observacao, 'Observação', 2000, false),
          assinaturaDevolucao: assinatura, estoqueDevolvido: true
        });
        registro.semReposicaoAutomatica = d.devolvidos.some(m => m.materialId && !m.estoqueControlado);
        registro.completa = d.completa;
      }
      if (p.tipo === 'excluir') alteracoes.excluida = true;
      // Na devolução final a imagem fica só no campo já usado pelo PDF original.
      if (p.tipo === 'devolver' && !registro.completa) registro.assinatura = assinatura;
      registro.observacao = texto(p.observacao, 'Observação', 2000, false);
    } else if (p.tipo === 'editar') {
      if (c.excluida) throw new Error('Cautela excluída.');
      if ((c.revisao || 0) !== p.revisao) throw new Error('A cautela foi modificada em outro aparelho. Reabra a edição.');
      alteracoes = {
        observacao: texto(p.observacao, 'Observação', 2000, false),
        previsaoDevolucao: validarPrevisao(p.previsaoDevolucao),
        militar: texto(p.militar, 'Militar que cautelou'), om: texto(p.om, 'OM', 200, false)
      };
      registro.antes = Object.fromEntries(Object.keys(alteracoes).map(k => [k, c[k] || '']));
      registro.depois = { ...alteracoes };
      registro.assinatura = assinatura;
      registro.militar = texto(p.militarRetirada ?? p.militar, 'Militar');
      registro.motivo = texto(p.motivo, 'Motivo', 1000, false);
      if (!c.dadosOriginais) alteracoes.dadosOriginais = { ...registro.antes };
    } else if (p.tipo === 'assinar_devolucao') {
      if (!c.dataEntrega || c.assinaturaDevolucao || c.excluida) throw new Error('Não há assinatura de devolução pendente neste registro.');
      alteracoes.assinaturaDevolucao = assinatura;
    } else if (p.tipo === 'assinar') {
      if (c.assinaturaCautela || c.excluida) throw new Error('A cautela já está assinada ou excluída.');
      alteracoes.assinaturaCautela = assinatura;
    } else if (p.tipo !== 'adicionar') throw new Error('Operação inválida.');

    if (p.tipo === 'adicionar' || (p.tipo === 'editar' && p.itens?.length)) {
      exigirAberta(c);
      if (!c.assinaturaCautela) throw new Error('Colha primeiro a assinatura da retirada original.');
      const novos = normalizarItens(p.itens);
      const itens = itensCautela(c);
      for (const m of novos) {
        const atual = itens.find(i => i.materialId === m.materialId && i.nome === m.nome && i.estoqueControlado === m.estoqueControlado);
        if (atual) { atual.quantidade += m.quantidade; atual.pendente += m.quantidade; }
        else itens.push({ ...m, linhaId: `${p.operacaoId}-${itens.length}` });
      }
      if (itens.length > 150) throw new Error('Esta cautela já possui 150 linhas distintas. Abra outra cautela.');
      alteracoes = {
        ...alteracoes,
        materiais: itens, ...resumo(itens), totalAcrescimos: (c.totalAcrescimos || 0) + 1,
        ...(!c.materiaisOriginais ? { materiaisOriginais: itensCautela(c) } : {})
      };
      movimentos = agruparMovimentos(novos); itensEvento = novos;
      registro.assinatura = assinatura;
      registro.militar = texto(p.militarRetirada ?? p.militar, 'Militar');
    }

    const snapshots = [];
    for (const [id, qtd] of movimentos) {
      const materialRef = doc(db, 'materiais', id);
      const material = await tx.get(materialRef);
      if (!material.exists()) throw new Error('Material vinculado não encontrado. Não será substituído por outro de nome semelhante.');
      const dados = material.data();
      // Arquivados ainda podem receber uma devolução, mas não novas retiradas.
      snapshots.push([materialRef, movimentar({ ...dados, arquivado: sentido < 0 ? false : dados.arquivado }, qtd * sentido)]);
    }
    if (p.tipo !== 'criar' && !alteracoes.materiais && Array.isArray(c.materiais)) alteracoes.materiais = itensCautela(c);
    alteracoes = { ...alteracoes, schemaVersion: 2, revisao: (c.revisao || 0) + 1, updatedAt: serverTimestamp(), updatedBy: uid };
    limiteDocumento({ ...c, ...alteracoes });
    for (const [materialRef, dados] of snapshots) tx.update(materialRef, dados);
    if (p.tipo === 'criar') tx.set(ref, alteracoes); else tx.update(ref, alteracoes);
    tx.set(eventoRef, { ...registro, revisao: alteracoes.revisao, itens: itensEvento });
    return { id: ref.id, completa: registro.completa };
  });
}

export async function carregarHistorico(db, id) {
  const s = await getDocs(collection(db, 'cautelas', id, 'historico'));
  return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.em?.seconds || 0) - (b.em?.seconds || 0) || (a.em?.nanoseconds || 0) - (b.em?.nanoseconds || 0) || (a.revisao || 0) - (b.revisao || 0));
}
