import React, { createElement, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../styles/MainStyles';
import { formatarPrevisao } from '../utils/estoque.mjs';
export default function CampoData({ value, onChange, limpavel = true, label = 'Previsão de devolução (opcional)' }) {
  const [aberto, setAberto] = useState(false);
  return <View style={{ marginBottom: 12 }}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS === 'web' ? createElement('input', { type: 'date', 'aria-label': label, value, onChange: e => onChange(e.target.value), style: { boxSizing: 'border-box', width: '100%', minHeight: 44, padding: 10, colorScheme: 'dark', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: 8 } }) :
      <TouchableOpacity style={styles.input} onPress={() => setAberto(true)}><Text style={styles.cartaoTexto}>{formatarPrevisao(value) || 'Sem previsão — selecionar data'}</Text></TouchableOpacity>}
    {aberto && <DateTimePicker value={value ? new Date(`${value}T12:00:00`) : new Date()} onChange={(e, d) => { setAberto(false); if (e.type !== 'dismissed' && d) onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); }} />}
    {!!value && limpavel && <TouchableOpacity onPress={() => onChange('')} style={{ padding: 8 }}><Text style={styles.btnCancelarTexto}>Limpar previsão</Text></TouchableOpacity>}
  </View>;
}
