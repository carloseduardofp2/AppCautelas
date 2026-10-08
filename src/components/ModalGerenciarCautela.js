import { avisar } from '../utils/avisar';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Alert, Image } from 'react-native';
import { styles } from '../styles/MainStyles';
import CampoData from './CampoData';
import SeletorEstoque from './SeletorEstoque';
import ModalAssinatura from './ModalAssinatura';
import { db, auth } from '../services/firebaseConfig';
import { salvarMovimentacao, novaOperacaoId, carregarHistorico } from '../services/cautelaService';
import { itensCautela, prepararDevolucao, normalizarItens, texto } from '../utils/estoque.mjs';

export default function ModalGerenciarCautela({ cautela, modo, estoque, fechar, exportar }) {
  const [operador, setOperador] = useState('');
  const [militar, setMilitar] = useState(cautela.militar || '');
  const [militarRetirada, setMilitarRetirada] = useState(cautela.militar || '');
  const podeAdicionar = !cautela.dataEntrega && cautela.estoqueDevolvido !== true && !!cautela.assinaturaCautela;
  const [om, setOm] = useState(cautela.om || '');
  const [obs, setObs] = useState(modo === 'editar' ? cautela.observacao || '' : '');
  const [previsao, setPrevisao] = useState(cautela.previsaoDevolucao || '');
  const [novos, setNovos] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [assinando, setAssinando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState(null);
  const [erroHistorico, setErroHistorico] = useState('');
  const id = useRef(novaOperacaoId(db));
  const trava = useRef(false);
  const refAssinatura = useRef();
  let itens = [], erroLegado = '';
  try { itens = itensCautela(cautela); } catch (e) { erroLegado = e.message; }
  useEffect(() => {
    let ativo = true;
    carregarHistorico(db, cautela.id).then(h => ativo && setHistorico(h)).catch(() => ativo && setErroHistorico('Não foi possível carregar o histórico. Reabra os detalhes após verificar sua conexão.'));
    return () => { ativo = false; };
  }, [cautela.id]);
  const salvar = async assinatura => {
    if (trava.current) return;
    trava.current = true; setSalvando(true);
    try {
      await salvarMovimentacao(db, { tipo: modo, cautelaId: cautela.id, operacaoId: id.current,
        uid: auth.currentUser?.uid, operador, assinatura, itens: novos,
        quantidades, militar, militarRetirada, om, observacao: obs, revisao: cautela.revisao || 0,
        previsaoDevolucao: previsao, dataHoje: new Date().toLocaleDateString('pt-BR') });
      fechar(); avisar('Sucesso', 'Operação registrada com histórico.');
    } finally { trava.current = false; setSalvando(false); }
  };
  const continuar = async () => {
    try {
      texto(operador, 'Militar SecOp');
      if (modo === 'editar') { texto(militar, 'Titular'); texto(militarRetirada, 'Militar'); if (novos.length) normalizarItens(novos); }
      if (modo === 'adicionar') { texto(militar, 'Militar que está cautelando'); normalizarItens(novos); }
      if (modo === 'devolver') prepararDevolucao(cautela, quantidades);
      if (modo === 'excluir') await salvar('');
      else setAssinando(true);
    } catch (e) { avisar('Confira os dados', e.message); }
  };
  const campo = (label, valor, set, multiline = false) => <View>
    <Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={valor} onChangeText={set} multiline={multiline} maxLength={multiline ? 2000 : 200} />
  </View>;
  if (assinando) return <ModalAssinatura fechar={() => setAssinando(false)} handleAssinatura={salvar} refAssinatura={refAssinatura} tipoOperacao="acrescimo"
    titulo={['devolver','assinar_devolucao'].includes(modo) ? 'Assinatura da devolução' : 'Assinar edição'}
    descricao={['editar','adicionar'].includes(modo)
      ? `${militarRetirada} · Militar SecOp: ${operador}. Titular: ${militar}; OM: ${om || '—'}; Previsão: ${previsao || '—'}; Observação: ${obs || '—'}. ${novos.length ? 'Adicionar: ' + novos.map(m => `${m.nome}: ${m.quantidade}`).join('; ') : 'Sem novos materiais'}. Confira e assine.`
      : `${cautela.militar} — ${modo === 'assinar_devolucao' ? 'Assinatura da devolução registrada' : itens.filter(m => Number(quantidades[m.linhaId]) > 0).map(m => `${m.nome}: ${quantidades[m.linhaId]}`).join('; ')}` } />;
  return <Modal visible transparent animationType="slide" onRequestClose={() => !salvando && fechar()}>
    <View style={styles.modalOverlay}><View style={styles.modalContent}><ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.modalTitle}>{{ assinar_devolucao: 'Assinar devolução já registrada', adicionar: 'Adicionar materiais', editar: 'Editar cautela', devolver: 'Devolver materiais', detalhes: 'Detalhes e histórico', excluir: 'Excluir cautela' }[modo]}</Text>
      <Text style={[styles.cartaoTexto, { marginBottom: 12 }]}>{cautela.militar} — retirada: {cautela.dataCautela}</Text>
      {!!erroLegado && <Text style={{ color: '#FCA5A5' }}>Registro antigo requer conferência: {erroLegado}. Nenhum saldo será alterado por suposição.</Text>}
      {['editar','adicionar'].includes(modo) && campo('Militar', militarRetirada, setMilitarRetirada)}
      {modo !== 'detalhes' && campo('Militar SecOp', operador, setOperador)}
      {modo === 'editar' && <>
        {campo('Titular', militar, setMilitar)}{campo('OM', om, setOm)}
        <CampoData value={previsao} onChange={setPrevisao} />
      </>}
      {modo === 'editar' && <View style={{ marginVertical: 12 }}><Text style={styles.label}>Materiais atuais</Text>{itens.map(m => <Text key={m.linhaId} style={styles.cartaoTexto}>{m.nome} · {m.quantidade}</Text>)}</View>}
      {['editar','adicionar'].includes(modo) && podeAdicionar && <>
        <SeletorEstoque materiais={estoque} selecionados={novos} onSelect={m => setNovos(v => [...v, m])} onRemove={i => setNovos(v => v.filter((_,j) => i !== j))} />
      </>}
      {modo === 'devolver' && <>
        <TouchableOpacity style={styles.btnSalvar} onPress={() => setQuantidades(Object.fromEntries(itens.map(m => [m.linhaId, String(m.pendente)])))}><Text style={styles.btnSalvarTexto}>Selecionar tudo</Text></TouchableOpacity>
        {itens.filter(m => m.pendente > 0).map(m => <View key={m.linhaId}>
          <Text style={styles.cartaoTexto}>{m.nome} — pendente: {m.pendente}</Text>
          {m.materialId && !m.estoqueControlado && <Text style={{ color: '#FBBF24' }}>Registro anterior sem baixa comprovada: devolução sem reposição automática no estoque.</Text>}
          <TextInput accessibilityLabel={`Devolver ${m.nome}`} style={styles.input} keyboardType="numeric" value={String(quantidades[m.linhaId] || '')} placeholder="Quantidade a devolver" placeholderTextColor="#94A3B8" onChangeText={v => setQuantidades(a => ({ ...a, [m.linhaId]: v || 0 }))} />
        </View>)}
      </>}
      {['editar','devolver'].includes(modo) && campo('Observação', obs, setObs, true)}
      {modo === 'excluir' && <Text style={styles.cartaoTexto}>A cautela sairá do Livro. Somente os saldos pendentes com baixa de estoque comprovada serão repostos. O registro e as assinaturas serão preservados para auditoria.</Text>}
      {modo === 'detalhes' && <>
        {itens.map(m => <Text key={m.linhaId} style={styles.cartaoTexto}>{m.nome}: {m.quantidade} retirado(s), {m.pendente} pendente(s)</Text>)}
        <TouchableOpacity style={[styles.btnSalvar, { marginVertical: 12 }]} onPress={() => exportar([cautela])}><Text style={styles.btnSalvarTexto}>PDF desta cautela</Text></TouchableOpacity>
        <Text style={styles.label}>Histórico</Text>
        {!!erroHistorico && <Text style={{ color: '#FCA5A5' }}>{erroHistorico}</Text>}
        {historico === null && !erroHistorico && <Text style={styles.cartaoTexto}>Carregando…</Text>}
        {historico?.length === 0 && <Text style={styles.cartaoTexto}>Registro anterior ao histórico de operações.</Text>}
        {historico?.map(h => <View key={h.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#475569' }}>
          <Text style={styles.cartaoTexto}>{h.em?.toDate?.().toLocaleString('pt-BR') || 'Horário não disponível'} — {h.tipo} — {h.operador}</Text>
          {h.itens?.map((m,i) => <Text key={i} style={styles.cartaoTexto}>{m.nome}: {m.quantidade}</Text>)}
          {h.antes && Object.keys(h.antes).filter(k => h.antes[k] !== h.depois[k]).map(k => <Text key={k} style={styles.cartaoTexto}>{{militar:'Militar',om:'OM',observacao:'Observação',previsaoDevolucao:'Previsão de devolução'}[k] || k}: {h.antes[k] || '(vazio)'} → {h.depois[k] || '(vazio)'}</Text>)}
          {!!h.motivo && <Text style={styles.cartaoTexto}>Motivo: {h.motivo}</Text>}
          {!!h.assinatura && <Image accessibilityLabel="Assinatura desta operação" source={{ uri: h.assinatura }} style={{ width: '100%', height: 70, backgroundColor: '#fff', marginTop: 8 }} resizeMode="contain" />}
        </View>)}
      </>}
      <View style={[styles.modalBotoes, { marginTop: 16 }]}>
        <TouchableOpacity disabled={salvando} style={styles.btnCancelar} onPress={fechar}><Text style={styles.btnCancelarTexto}>Fechar</Text></TouchableOpacity>
        {modo !== 'detalhes' && <TouchableOpacity disabled={salvando || (!!erroLegado && modo !== 'editar')} style={styles.btnSalvar} onPress={continuar}><Text style={styles.btnSalvarTexto}>{salvando ? 'Salvando…' : ['editar','adicionar','devolver','assinar_devolucao'].includes(modo) ? 'Conferir e assinar' : 'Salvar com histórico'}</Text></TouchableOpacity>}
      </View>
    </ScrollView></View></View>
  </Modal>;
}
