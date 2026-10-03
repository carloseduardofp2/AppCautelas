import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { compararNatural } from '../utils/ordenacao.mjs';

const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const caminho = m => (m.path || [m.localizacao, m.subLocalizacao].filter(Boolean)).join(' › ');

export default function SeletorEstoque({ materiais = [], selecionados = [], onSelect, onRemove }) {
  const [modo, setModo] = useState('estoque');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [materialId, setMaterialId] = useState(null);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [erro, setErro] = useState('');
  const material = materiais.find(m => m.id === materialId && !m.arquivado && !m.isFolder);
  const reservada = id => selecionados.filter(m => m.materialId === id).reduce((s,m) => s + Number(m.quantidade || 0), 0);
  const disponivel = material ? Number(material.quantidade) - reservada(material.id) : 0;
  const encontrados = materiais.filter(m => !m.isFolder && !m.arquivado && normal(`${m.item} ${caminho(m)}`).includes(normal(busca)))
    .sort((a,b) => compararNatural(a.item,b.item) || compararNatural(caminho(a),caminho(b)));
  const adicionar = () => {
    const q = Number(quantidade);
    if (!Number.isSafeInteger(q) || q <= 0) return setErro('Informe uma quantidade inteira maior que zero.');
    if (modo === 'estoque' && !material) return setErro('Selecione um material do estoque.');
    if (modo === 'estoque' && q > disponivel) return setErro(`Há somente ${Math.max(0,disponivel)} unidade(s) disponível(is) para adicionar.`);
    if (modo === 'avulso' && !nome.trim()) return setErro('Informe o nome do material avulso.');
    onSelect(modo === 'estoque' ? { materialId: material.id, nome: material.item, quantidade: String(q), estoqueDisponivel: material.quantidade, caminhoExibicao: caminho(material) }
      : { nome: nome.trim(), quantidade: String(q) });
    setNome(''); setQuantidade('1'); setErro(''); setMaterialId(null); setAberto(false); setBusca('');
  };
  return <View style={s.painel}>
    <Text style={s.titulo}>Materiais da cautela</Text>
    <View style={s.abas}>
      {[['estoque','Do estoque'],['avulso','Item avulso']].map(([id,label]) => <TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{selected:modo===id}} style={[s.aba,modo===id && s.abaAtiva]} onPress={() => {setModo(id);setErro('');setAberto(false);}}><Text style={[s.abaTexto,modo===id && s.abaTextoAtiva]}>{label}</Text></TouchableOpacity>)}
    </View>
    {modo === 'estoque' ? <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Selecionar material do estoque" accessibilityState={{expanded:aberto}} style={s.seletor} onPress={() => setAberto(!aberto)}>
        <View style={{flex:1}}><Text style={s.nome}>{material?.item || 'Selecione o material…'}</Text>{material && <Text style={s.muted}>{caminho(material) || 'Início'}</Text>}</View><Text style={s.dourado}>{aberto ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {aberto && <View style={s.lista}>
        <TextInput accessibilityLabel="Pesquisar material no estoque" style={s.input} placeholder="Pesquisar nome ou prateleira" placeholderTextColor="#94A3B8" value={busca} onChangeText={setBusca} />
        <ScrollView style={{maxHeight:210}} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {encontrados.map(m => {const saldo=Number(m.quantidade)-reservada(m.id);return <TouchableOpacity key={m.id} accessibilityRole="button" accessibilityLabel={`${m.item}, disponível: ${Math.max(0,saldo)}, ${caminho(m) || 'Início'}`} disabled={saldo<=0} style={[s.resultado,saldo<=0 && {opacity:0.5}]} onPress={() => {setMaterialId(m.id);setAberto(false);setErro('');}}><View style={{flex:1}}><Text style={s.nome}>{m.item}</Text><Text style={s.muted}>{caminho(m) || 'Início'}</Text></View><Text style={s.saldo}>{saldo>0 ? `${saldo} disp.` : 'Sem saldo'}</Text></TouchableOpacity>;})}
          {!encontrados.length && <Text style={[s.muted,{padding:12}]}>Nenhum material encontrado.</Text>}
        </ScrollView>
      </View>}
      <Text style={s.aviso}>{material ? `Disponível para adicionar: ${Math.max(0,disponivel)} unidade(s).` : 'Selecione um material cadastrado na Reserva.'}</Text>
    </> : <>
      <Text style={[s.aviso,{color:'#93C5FD',backgroundColor:'#172C45'}]}>O item avulso fica registrado na cautela e não movimenta o estoque.</Text>
      <TextInput accessibilityLabel="Nome do material avulso" style={s.input} placeholder="Nome do material avulso" placeholderTextColor="#94A3B8" maxLength={200} value={nome} onChangeText={setNome} />
    </>}
    <View style={s.adicionarLinha}><View style={{width:100}}><Text style={s.label}>Quantidade</Text><TextInput accessibilityLabel="Quantidade a adicionar" keyboardType="numeric" style={[s.input,{marginBottom:0}]} value={quantidade} onChangeText={setQuantidade} /></View><TouchableOpacity accessibilityRole="button" style={s.adicionar} onPress={adicionar}><Text style={s.dourado}>+ Adicionar</Text></TouchableOpacity></View>
    {!!erro && <Text accessibilityRole="alert" style={s.erro}>{erro}</Text>}
    <View style={s.carrinho}>
      {!selecionados.some(m=>m.nome?.trim()) && <Text style={[s.muted,{textAlign:'center',padding:12}]}>Nenhum material adicionado à cautela.</Text>}
      {selecionados.map((m,i) => !!m.nome?.trim() && <View key={i} style={s.item}><View style={{flex:1}}><Text style={s.nome}>{m.nome}</Text><Text style={s.muted}>{m.materialId ? `Estoque · ${m.caminhoExibicao || 'Início'}` : 'Item avulso'}</Text></View><Text style={s.qtd}>{m.quantidade} un.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remover ${m.nome}`} onPress={()=>onRemove?.(i)} style={s.remover}><Text style={{color:'#FCA5A5',fontSize:20}}>×</Text></TouchableOpacity></View>)}
    </View>
  </View>;
}
const s=StyleSheet.create({
 painel:{backgroundColor:'#142133',borderWidth:1,borderColor:'#334155',borderRadius:12,padding:14,marginVertical:12},
 titulo:{color:'#D4A25F',fontSize:17,fontWeight:'700',marginBottom:14},
 abas:{flexDirection:'row',backgroundColor:'#0B1423',padding:4,borderRadius:9,gap:6,marginBottom:12},
 aba:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:6},abaAtiva:{backgroundColor:'#D4A25F'},abaTexto:{color:'#94A3B8',fontWeight:'700'},abaTextoAtiva:{color:'#0F172A'},
 seletor:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:'#64748B',borderRadius:8,padding:14,minHeight:52,backgroundColor:'#0F172A'},
 nome:{color:'#F1F5F9',fontSize:15,fontWeight:'600'},muted:{color:'#94A3B8',fontSize:12,lineHeight:18,marginTop:3},
 dourado:{color:'#D4A25F',fontWeight:'700',fontSize:15},lista:{borderWidth:1,borderColor:'#475569',padding:8,borderRadius:8,marginTop:6,backgroundColor:'#0F172A'},
 input:{backgroundColor:'#0F172A',borderWidth:1,borderColor:'#475569',borderRadius:8,padding:12,color:'#F8FAFC',fontSize:16,minHeight:46,marginBottom:10},resultado:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderBottomWidth:1,borderColor:'#334155'},saldo:{color:'#4ADE80',fontSize:12},
 aviso:{color:'#6EE7B7',backgroundColor:'#16313B',padding:11,borderRadius:7,fontSize:12,lineHeight:18,marginVertical:10},
 adicionarLinha:{flexDirection:'row',alignItems:'flex-end',gap:10},label:{color:'#CBD5E1',fontSize:12,marginBottom:6},adicionar:{flex:1,borderWidth:1,borderColor:'#D4A25F',borderRadius:8,minHeight:46,justifyContent:'center',alignItems:'center'},
 erro:{color:'#FCA5A5',fontSize:13,marginTop:10},carrinho:{marginTop:14,borderTopWidth:1,borderColor:'#334155'},item:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderBottomWidth:1,borderColor:'#26364A'},qtd:{color:'#D4A25F',fontSize:13,fontWeight:'700'},remover:{minWidth:40,minHeight:44,alignItems:'center',justifyContent:'center'}
});
