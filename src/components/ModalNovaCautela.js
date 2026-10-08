import { avisar } from '../utils/avisar';
import React from 'react';
import CampoData from './CampoData';
import SeletorEstoque from './SeletorEstoque';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../styles/MainStyles';

export default function ModalNovaCautela({
  fechar, previsaoDevolucao, setPrevisaoDevolucao, estoque, selecionarMaterial,
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
      avisar('Atenção', 'Preencha os campos obrigatórios!');
      return false;
    }
    if (!materiaisCautela.some(
      m => String(m?.nome ?? '').trim() !== '' && String(m?.quantidade ?? '').trim() !== ''
    )) {
      avisar('Atenção', 'Adicione ao menos um material com quantidade.');
      return false;
    }

    for (const material of materiaisCautela.filter(m => String(m?.nome ?? '').trim() !== '')) {
      const quantidade = Number(material.quantidade);
      if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
        avisar('Atenção', `Informe uma quantidade válida para "${material.nome}".`);
        return false;
      }
      if (
        material.estoqueDisponivel !== undefined &&
        quantidade > Number(material.estoqueDisponivel)
      ) {
        avisar(
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
                placeholder="Militar SecOp"
                placeholderTextColor="#64748B"
                value={novoMilSecOpCautela}
                onChangeText={setNovoMilSecOpCautela}
              />

              <TextInput
                style={styles.input}
                placeholder="Militar"
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

              <SeletorEstoque materiais={estoque} selecionados={materiaisCautela} onSelect={selecionarMaterial} onRemove={removerLinhaMaterial} />
              <CampoData value={previsaoDevolucao} onChange={setPrevisaoDevolucao} />

              <CampoData value={`${dataSelecionada.getFullYear()}-${String(dataSelecionada.getMonth()+1).padStart(2,'0')}-${String(dataSelecionada.getDate()).padStart(2,'0')}`} onChange={v => { if (v) aoMudarData({ type: 'set' }, new Date(`${v}T12:00:00`)); }} limpavel={false} label="Data da retirada" />

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
