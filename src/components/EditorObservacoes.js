import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function EditorObservacoes({value, onChange, materiais=[], existentes=0}) {
  const nomes=[...new Set(materiais.map(m=>m.nome).filter(Boolean))];
  const mudar=(i,dados)=>onChange(value.map((o,j)=>i===j?{...o,...dados}:o));
  return <View style={{marginVertical:12}}>
    <Text style={styles.label}>Observações</Text>
    {value.map((o,i)=><View key={o.id || i} style={{marginBottom:12,padding:12,borderWidth:1,borderColor:'#475569',borderRadius:10}}>
      <Text style={styles.label}>OBS {i+1}</Text>
      <TextInput accessibilityLabel={`OBS ${i+1}`} style={[styles.input,styles.inputArea]} value={o.texto} onChangeText={texto=>mudar(i,{texto})} multiline maxLength={2000} placeholder="Detalhes do material" placeholderTextColor="#94A3B8" />
      <Text style={styles.label}>Material (opcional)</Text>
      <ScrollView horizontal keyboardShouldPersistTaps="handled"><View style={{flexDirection:'row',gap:6}}>
        {['',...new Set([...nomes,...(o.material?[o.material]:[])])].map(nome=><TouchableOpacity key={nome} accessibilityRole="button" accessibilityLabel={`OBS ${i+1}: ${nome || 'Geral'}`} onPress={()=>mudar(i,{material:nome})} style={{padding:9,borderRadius:8,backgroundColor:o.material===nome?'#D4A25F':'#334155'}}><Text style={{color:o.material===nome?'#0F172A':'#fff'}}>{nome || 'Geral'}</Text></TouchableOpacity>)}
      </View></ScrollView>
      {i>=existentes && <TouchableOpacity onPress={()=>onChange(value.filter((_,j)=>j!==i))} style={{paddingTop:10}}><Text style={{color:'#FCA5A5'}}>Remover</Text></TouchableOpacity>}
    </View>)}
    {value.length<50 && <TouchableOpacity style={styles.btnAssinarDepois} onPress={()=>onChange([...value,{texto:'',material:''}])}><Text style={styles.btnAssinarDepoisTexto}>+ Observação</Text></TouchableOpacity>}
  </View>;
}
