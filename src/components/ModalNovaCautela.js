import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../styles/MainStyles';

export default function ModalNovaCautela({
  fechar,
  novoMilitar, setNovoMilitar,
  novaOm, setNovaOm,
  materiaisCautela, adicionarLinhaMaterial, removerLinhaMaterial, atualizarLinhaMaterial,
  novaObs, setNovaObs,
  novoMilSecOpCautela, setNovoMilSecOpCautela,
  dataSelecionada, mostrarCalendario,
  setMostrarCalendario, aoMudarData,
  avancarParaAssinatura
}) {
  const validarCampos = () => {
    if (novoMilitar === '' || novoMilSecOpCautela === '') {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios!');
      return false;
    }
    if (!materiaisCautela.some(
      m => String(m?.nome ?? '').trim() !== '' && String(m?.quantidade ?? '').trim() !== ''
    )) {
      Alert.alert('Atenção', 'Adicione ao menos um material com quantidade.');
      return false;
    }

    for (const material of materiaisCautela.filter(m => String(m?.nome ?? '').trim() !== '')) {
      const quantidade = Number(material.quantidade);
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        Alert.alert('Atenção', `Informe uma quantidade válida para "${material.nome}".`);
        return false;
      }
      if (
        material.estoqueDisponivel !== undefined &&
        quantidade > Number(material.estoqueDisponivel)
      ) {
        Alert.alert(
          'Quantidade indisponível',
          `Há somente ${material.estoqueDisponivel} unidade(s) de "${material.nome}" no estoque.`
        );
        return false;
      }
    }

    return true;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={fechar}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Nova Cautela</Text>

              <TextInput
                style={styles.input}
                placeholder="Mil Sec Op (Quem está entregando o material)"
                placeholderTextColor="#64748B"
                value={novoMilSecOpCautela}
                onChangeText={setNovoMilSecOpCautela}
              />

              <TextInput
                style={styles.input}
                placeholder="Militar que está pegando (ex: Cb Fulano)"
                placeholderTextColor="#64748B"
                value={novoMilitar}
                onChangeText={setNovoMilitar}
              />

              <TextInput
                style={styles.input}
                placeholder="OM (Ex: Cia C/3ª DE)"
                placeholderTextColor="#64748B"
                value={novaOm}
                onChangeText={setNovaOm}
              />

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15, marginTop: -5 }}>
                {['Cia C/3ª DE', 'Cia Cmdo 6ª Bda Inf Bld', 'Cmdo 6ª Bda Inf Bld', 'Cmdo 3ª DE', 'B Adm Gu SM'].map((omNome) => (
                  <TouchableOpacity
                    key={omNome}
                    style={{
                      backgroundColor: '#334155',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#475569'
                    }}
                    onPress={() => setNovaOm(omNome)}
                  >
                    <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '500' }}>{omNome}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 🔥 Lista de materiais: agora é possível cautelar mais de um item de uma vez */}
              {materiaisCautela.map((item, index) => (
                <View key={`${item.materialId || 'manual'}-${index}`} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 2, marginRight: 8, marginBottom: 0 }]}
                      placeholder="Material"
                      placeholderTextColor="#64748B"
                      value={item.nome}
                      onChangeText={(v) => atualizarLinhaMaterial(index, 'nome', v)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                      placeholder="Qtd"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      value={item.quantidade}
                      onChangeText={(v) => atualizarLinhaMaterial(index, 'quantidade', v)}
                    />
                    {materiaisCautela.length > 1 && (
                      <TouchableOpacity onPress={() => removerLinhaMaterial(index)} style={{ padding: 6 }}>
                        <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {item.materialId && (
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 5, marginLeft: 3 }}>
                      📍 {item.caminhoExibicao || 'Início'} • Disponível: {item.estoqueDisponivel}
                    </Text>
                  )}
                </View>
              ))}

              <TouchableOpacity onPress={adicionarLinhaMaterial} style={{ marginBottom: 15 }}>
                <Text style={{ color: '#38BDF8', fontWeight: '600' }}>+ Adicionar material</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setMostrarCalendario(true)}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                  📅 {dataSelecionada.toLocaleDateString('pt-BR')}
                </Text>
              </TouchableOpacity>

              {mostrarCalendario && (
                <DateTimePicker
                  value={dataSelecionada}
                  mode="date"
                  display="default"
                  onChange={aoMudarData}
                />
              )}

              <TextInput
                style={[styles.input, styles.inputArea]}
                placeholder="Observação da Cautela..."
                placeholderTextColor="#64748B"
                multiline={true}
                numberOfLines={3}
                value={novaObs}
                onChangeText={setNovaObs}
              />

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.btnCancelar} onPress={fechar}>
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                {/* BOTÃO NOVO: SALVAR PARA ASSINAR DEPOIS */}
                <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: '#475569' }]} onPress={() => {
                  if (!validarCampos()) return;
                  // 🔥 Lógica nova: Avança direto para salvar no banco com assinatura vazia
                  avancarParaAssinatura(true);
                }}>
                  <Text style={styles.btnSalvarTexto}>Salvar (Assinar Depois)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnSalvar} onPress={() => {
                  if (!validarCampos()) return;
                  avancarParaAssinatura(false);
                }}>
                  <Text style={styles.btnSalvarTexto}>✍️ Assinar Agora</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
