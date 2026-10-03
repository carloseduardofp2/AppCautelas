import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '../styles/MainStyles';
export default function SeletorEstoque({ materiais = [], onSelect }) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const encontrados = materiais.filter(m => !m.isFolder && !m.arquivado && normal(`${m.item} ${(m.path || []).join(' ')}`).includes(normal(busca)));
  return <View style={{ marginBottom: 14 }}>
    <TouchableOpacity style={styles.btnSalvar} onPress={() => setAberto(!aberto)}><Text style={styles.btnSalvarTexto}>{aberto ? 'Fechar seleção' : 'Selecionar do estoque'}</Text></TouchableOpacity>
    {aberto && <View>
      <TextInput accessibilityLabel="Pesquisar material no estoque" style={styles.input} placeholder="Pesquisar material ou prateleira" placeholderTextColor="#94A3B8" value={busca} onChangeText={setBusca} />
      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {encontrados.slice(0, 40).map(m => <TouchableOpacity key={m.id} disabled={Number(m.quantidade) <= 0} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#475569', opacity: Number(m.quantidade) > 0 ? 1 : 0.5 }} onPress={() => { onSelect({ materialId: m.id, nome: m.item, quantidade: '1', estoqueDisponivel: m.quantidade, caminhoExibicao: (m.path || []).join(' › ') }); setAberto(false); }}>
          <Text style={styles.cartaoTexto}>{m.item} — disponível: {m.quantidade}</Text><Text style={{ color: '#94A3B8' }}>{(m.path || []).join(' › ')}</Text>
        </TouchableOpacity>)}
        {!encontrados.length && <Text style={styles.cartaoTexto}>Nenhum material encontrado.</Text>}
        {encontrados.length > 40 && <Text style={styles.cartaoTexto}>Refine a pesquisa para encontrar outros materiais.</Text>}
      </ScrollView>
    </View>}
  </View>;
}
