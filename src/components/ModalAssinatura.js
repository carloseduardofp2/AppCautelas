import React, { useRef, createElement } from 'react';
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

  // ============================================================
  // LÓGICA DE ASSINATURA EXCLUSIVA PARA A WEB (CELULAR E PC)
  // ============================================================
  const canvasRef = useRef(null);
  const isDrawingWeb = useRef(false);

  // Captura exatamente onde o dedo (ou mouse) está encostando
  const getCoordenadas = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    isDrawingWeb.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordenadas(e, canvas);

    // Estilo da "Caneta"
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingWeb.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordenadas(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingWeb.current = false;
  };

  const limparWeb = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirmarWeb = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Transforma o desenho do HTML5 em uma imagem Base64 exata para o seu PDF
    const base64 = canvas.toDataURL('image/png');
    handleAssinatura(base64);
  };

  // ============================================================
  // ESTILOS PARA O APLICATIVO NATIVO
  // ============================================================
  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--body { touch-action: none; }
    body, html { height: 100%; touch-action: none; }
  `;

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
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

              {/* MÁGICA: Renderização Condicional (Web vs App) */}
              {Platform.OS === 'web' ? (
                <View style={{ alignItems: 'center', marginBottom: 15 }}>
                  <View style={{ backgroundColor: '#FFF', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', width: 300, height: 180 }}>
                    {/* Cria a prancheta invisível que funciona no Chrome/Safari */}
                    {createElement('canvas', {
                      ref: canvasRef,
                      width: 300,
                      height: 180,
                      style: { touchAction: 'none', cursor: 'crosshair' },
                      onMouseDown: startDrawing,
                      onMouseMove: draw,
                      onMouseUp: stopDrawing,
                      onMouseOut: stopDrawing,
                      onTouchStart: startDrawing,
                      onTouchMove: draw,
                      onTouchEnd: stopDrawing,
                    })}
                  </View>
                  <TouchableOpacity onPress={limparWeb} style={{ marginTop: 10, padding: 8 }}>
                    <Text style={{ color: '#D4A25F', fontWeight: 'bold' }}>🧹 Limpar Assinatura</Text>
                  </TouchableOpacity>
                </View>
              ) : (
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
              )}

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.btnCancelar} onPress={fechar}>
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.btnSalvar} 
                  onPress={() => {
                    // Direciona o botão Confirmar para a prancheta correta
                    if (Platform.OS === 'web') {
                      confirmarWeb();
                    } else {
                      refAssinatura.current.readSignature();
                    }
                  }}
                >
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