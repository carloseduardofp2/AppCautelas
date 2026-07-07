import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { styles } from '../styles/MainStyles';

export default function ModalAssinatura({
  fechar,
  handleAssinatura,
  tipoOperacao,
  novaObsEntrega,
  setNovaObsEntrega,
  novoMilSecOp,
  setNovoMilSecOp,
  refAssinatura
}) {

  // 🔥 CSS turbinado: O 'touch-action: none' impede nativamente que o Android tente rolar a tela
  const webStyle = `
    .m-signature-pad {
      box-shadow: none; border: none;
    }
    .m-signature-pad--body {
      touch-action: none;
    }
    body, html {
      height: 100%;
      touch-action: none;
    }
  `;

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              // 🔥 A grande sacada: Só ativamos a rolagem se for a tela de Devolução (que tem campos de texto).
              // Para as outras assinaturas, a tela fica 100% rígida, garantindo precisão total da caneta.
              scrollEnabled={tipoOperacao === 'baixa'}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Assinatura do Militar</Text>

              {tipoOperacao === 'baixa' && (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="Mil Sec Op (Quem está recebendo de volta)"
                    placeholderTextColor="#64748B"
                    value={novoMilSecOp}
                    onChangeText={setNovoMilSecOp}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Observação da Entrega (ex: Sem alterações)"
                    placeholderTextColor="#64748B"
                    value={novaObsEntrega}
                    onChangeText={setNovaObsEntrega}
                  />
                </View>
              )}

              {/* REMOVIDOS os gatilhos onBegin e onEnd que causavam o bug do recarregamento */}
              <View style={{ height: 180, backgroundColor: 'white', borderRadius: 10, marginBottom: 15, overflow: 'hidden' }}>
                <SignatureScreen
                  ref={refAssinatura}
                  onOK={handleAssinatura}
                  webStyle={webStyle}
                  autoClear={false}
                  descriptionText=""
                  clearText="Limpar"
                  confirmText="Confirmar"
                />
              </View>

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.btnCancelar} onPress={fechar}>
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnSalvar} onPress={() => refAssinatura.current.readSignature()}>
                  <Text style={styles.btnSalvarTexto}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}