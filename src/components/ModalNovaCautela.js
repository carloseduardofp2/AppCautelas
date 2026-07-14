import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../styles/MainStyles';

export default function ModalNovaCautela({
  fechar,
  novoMilitar, setNovoMilitar,
  novaOm, setNovaOm,
  novoMaterial, setNovoMaterial,
  novaQtd, setNovaQtd,
  novaObs, setNovaObs,
  novoMilSecOpCautela, setNovoMilSecOpCautela,
  dataSelecionada, mostrarCalendario,
  setMostrarCalendario, aoMudarData,
  avancarParaAssinatura
}) {
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

              <TextInput
                style={styles.input}
                placeholder="Material"
                placeholderTextColor="#64748B"
                value={novoMaterial}
                onChangeText={setNovoMaterial}
              />

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  placeholder="Quantidade"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={novaQtd}
                  onChangeText={setNovaQtd}
                />

                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center', paddingHorizontal: 30 }]}
                    onPress={() => setMostrarCalendario(true)}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                    {dataSelecionada.toLocaleDateString('pt-BR')}
                  </Text>
                </TouchableOpacity>
              </View>

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
                  if (novoMilitar === '' || novoMaterial === '' || novaQtd === '' || novoMilSecOpCautela === '') {
                    Alert.alert('Atenção', 'Preencha os campos obrigatórios!');
                    return;
                  }
                  // 🔥 Lógica nova: Avança direto para salvar no banco com assinatura vazia
                  avancarParaAssinatura(true);
                }}>
                  <Text style={styles.btnSalvarTexto}>Salvar (Assinar Depois)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnSalvar} onPress={() => {
                  if (novoMilitar === '' || novoMaterial === '' || novaQtd === '' || novoMilSecOpCautela === '') {
                    Alert.alert('Atenção', 'Preencha os campos obrigatórios!');
                    return;
                  }
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