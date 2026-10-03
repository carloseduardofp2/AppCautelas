// Regras puras compartilhadas pelas telas, transações e testes.
export function inteiro(valor, nome = 'Quantidade', minimo = 0) {
  if (valor === '' || valor == null || !Number.isSafeInteger(Number(valor)) || Number(valor) < minimo) {
    throw new Error(`${nome}: informe um número inteiro maior ou igual a ${minimo}.`);
  }
  return Number(valor);
}

export function texto(valor, nome, limite = 200, obrigatorio = true) {
  const t = String(valor ?? '').trim();
  if ((obrigatorio && !t) || t.length > limite) throw new Error(`${nome}: preencha até ${limite} caracteres.`);
  return t;
}

export function validarPrevisao(valor) {
  if (!valor) return '';
  const v = String(valor);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) throw new Error('Previsão: informe uma data válida.');
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) throw new Error('Previsão: data inválida.');
  return v;
}
export const formatarPrevisao = v => v ? String(v).split('-').reverse().join('/') : '';

export function saldo(material) {
  if (material.isFolder || material.arquivado) throw new Error('Este material não está disponível para movimentação.');
  const quantidade = inteiro(material.quantidade, 'Disponível');
  const quantidadeCautelada = inteiro(material.quantidadeCautelada ?? 0, 'Cautelado');
  const quantidadeTotal = inteiro(material.quantidadeTotal ?? quantidade + quantidadeCautelada, 'Total');
  if (quantidade + quantidadeCautelada !== quantidadeTotal) throw new Error('Estoque divergente: confira o total físico antes de movimentar este material.');
  return { quantidade, quantidadeCautelada, quantidadeTotal };
}

export function movimentar(material, retirada) {
  const s = saldo(material);
  if (!Number.isSafeInteger(retirada)) throw new Error('Movimentação inválida.');
  if (retirada > s.quantidade) throw new Error(`Estoque insuficiente: há ${s.quantidade} unidade(s) disponível(is).`);
  if (-retirada > s.quantidadeCautelada) throw new Error('Estoque divergente: devolução maior que o saldo cautelado. Confira os registros antigos.');
  return { ...s, quantidade: s.quantidade - retirada, quantidadeCautelada: s.quantidadeCautelada + retirada };
}

export function itensCautela(c) {
  const lista = Array.isArray(c.materiais) && c.materiais.length ? c.materiais : [{ nome: c.material || 'Material', quantidade: c.quantidade }];
  return lista.map((m, i) => {
    const quantidade = inteiro(m.quantidade, 'Quantidade da cautela', 1);
    const pendente = c.dataEntrega || c.excluida ? 0 : inteiro(m.pendente ?? m.quantidade, 'Saldo pendente');
    if (pendente > quantidade) throw new Error('Saldo pendente maior que a retirada: confira o registro original.');
    return ({
    ...m, linhaId: m.linhaId || `original-${i}`,
    quantidade, pendente,
    estoqueControlado: !!m.materialId && (m.estoqueControlado === false ? false : c.estoqueBaixado === true || (c.schemaVersion === 2 && m.estoqueControlado === true))
  }); });
}
export function normalizarItens(lista) {
  if (!Array.isArray(lista) || !lista.length || lista.length > 100) throw new Error('Selecione entre 1 e 100 materiais por operação.');
  return lista.map((m, i) => ({
    nome: texto(m.nome, 'Material'), quantidade: inteiro(m.quantidade, 'Quantidade', 1),
    pendente: inteiro(m.quantidade, 'Quantidade', 1), linhaId: m.linhaId || `original-${i}`,
    ...(m.materialId ? { materialId: texto(m.materialId, 'Identificador'), estoqueControlado: true } : { estoqueControlado: false })
  }));
}
export function agruparMovimentos(itens, campo = 'quantidade') {
  const mapa = new Map();
  for (const m of itens) if (m.materialId && m.estoqueControlado !== false) mapa.set(m.materialId, (mapa.get(m.materialId) || 0) + inteiro(m[campo], campo));
  return [...mapa].filter(([, qtd]) => qtd > 0);
}
export function prepararDevolucao(cautela, solicitadas) {
  const itens = itensCautela(cautela);
  const linhas = itens.map(m => ({ ...m, devolver: inteiro(solicitadas[m.linhaId] ?? 0, 'Devolução') }));
  if (Object.keys(solicitadas).some(id => !itens.some(m => m.linhaId === id))) throw new Error('A cautela mudou; reabra a devolução.');
  if (!linhas.some(m => m.devolver)) throw new Error('Informe ao menos uma quantidade a devolver.');
  if (linhas.some(m => m.devolver > m.pendente)) throw new Error('A devolução excede a quantidade pendente. Atualize a cautela.');
  return {
    itens: linhas.map(({ devolver, ...m }) => ({ ...m, pendente: m.pendente - devolver })),
    devolvidos: linhas.filter(m => m.devolver > 0).map(m => ({ ...m, quantidade: m.devolver })),
    movimentos: agruparMovimentos(linhas, 'devolver'),
    completa: linhas.every(m => m.pendente === m.devolver)
  };
}
export function validarAssinatura(s, obrigatoria = true) {
  if (!s && !obrigatoria) return '';
  if (typeof s !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s) || s.length > 60000) throw new Error('Assine novamente. A assinatura deve ser uma imagem compacta de até 45 KB.');
  return s;
}
export function limiteDocumento(dados) {
  // Margem para overhead do Firestore e dados legados.
  if (encodeURIComponent(JSON.stringify(dados)).replace(/%[A-F0-9]{2}/g, 'x').length > 650000) throw new Error('Esta cautela atingiu o limite seguro de tamanho. Abra uma nova cautela.');
}
