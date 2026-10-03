import { avisar } from '../utils/avisar';
import React, { useRef, useState, createElement } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Dimensions, Alert, useWindowDimensions } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { styles } from '../styles/MainStyles';

export default function ModalAssinatura({
  fechar, titulo = "Assinatura do militar que está cautelando", descricao = "",
  handleAssinatura,
  tipoOperacao,
  novaObsEntrega,
  setNovaObsEntrega,
  novoMilSecOp,
  setNovoMilSecOp,
  refAssinatura
}) {

  // ============================================================
  // TRAVA DE DUPLO CLIQUE (DOUBLE SUBMIT)
  // ============================================================
  const [isProcessando, setIsProcessando] = useState(false);

  // ============================================================
  // LÓGICA DE ASSINATURA EXCLUSIVA PARA A WEB (CELULAR E PC)
  // ============================================================
  const canvasRef = useRef(null);
  const isDrawingWeb = useRef(false);

  // Calcula a largura da tela dinamicamente para ocupar todo o espaço
  const larguraTela = useWindowDimensions().width;
  const [rolagem, setRolagem] = useState(true);
  // Subtrai as margens do modal para a prancheta caber perfeitamente
  const canvasWidth = larguraTela > 600 ? 500 : larguraTela - 90;
  const canvasHeight = 220; // Aumentei a altura para dar mais conforto

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

    // MULTIPLICA POR 2: Como a resolução interna do canvas será dobrada para
    // corrigir o visual pixelado, o mouse/dedo também precisa ser dobrado.
    return {
        x: (clientX - rect.left) * canvas.width / rect.width,
        y: (clientY - rect.top) * canvas.height / rect.height
    };
  };

  const startDrawing = (e) => {
    isDrawingWeb.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordenadas(e, canvas);

    // Ajusta a grossura da caneta (dobrada também) e o estilo para não serrilhar
    ctx.lineWidth = 6;
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

  const enviar = async signature => {
    try {
      setIsProcessando(true);
      if (Platform.OS !== 'web') {
        const compacta = await manipulateAsync(signature, [{ resize: { width: 600 } }], { format: SaveFormat.PNG, base64: true });
        signature = `data:image/png;base64,${compacta.base64}`;
      }
      await handleAssinatura(signature);
    } catch (e) { avisar('Não foi possível salvar', e.message || 'Tente novamente.'); }
    finally { setIsProcessando(false); }
  };
  const confirmarWeb = async () => {
    try {
      const c = canvasRef.current;
      if (!c) return;
      const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0, pontos = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (pixels[(y * c.width + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); pontos++; }
      }
      if (pontos < 40 || x1 - x0 < 8) throw new Error('Desenhe sua assinatura antes de confirmar.');
      const w = x1 - x0 + 1, h = y1 - y0 + 1, scale = Math.min(1, 600 / w, 200 / h);
      const out = document.createElement('canvas');
      out.width = Math.ceil(w * scale) + 16; out.height = Math.ceil(h * scale) + 16;
      out.getContext('2d').drawImage(c, x0, y0, w, h, 8, 8, w * scale, h * scale);
      await enviar(out.toDataURL('image/png'));
    } catch (e) { avisar('Assinatura', e.message); setIsProcessando(false); }
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
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => !isProcessando && fechar()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              scrollEnabled={rolagem}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>{titulo}</Text>
              {!!descricao && <Text style={[styles.cartaoTexto, { marginBottom: 12 }]}>{descricao}</Text>}

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

              {Platform.OS === 'web' ? (
                <View style={{ alignItems: 'center', marginBottom: 15 }}>
                  <View style={{
                      backgroundColor: '#FFF',
                      borderRadius: 10,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      width: canvasWidth,
                      height: canvasHeight
                  }}>
                    {createElement('canvas', {
                      ref: canvasRef,
                      // RESOLUÇÃO INTERNA (O DOBRO) PARA ALTA DEFINIÇÃO (RETINA)
                      width: canvasWidth * 2,
                      height: canvasHeight * 2,
                      // TAMANHO VISUAL (O CSS REDUZ PARA CABER NA TELA)
                      style: {
                          touchAction: 'none',
                          cursor: 'crosshair',
                          width: canvasWidth,
                          height: canvasHeight
                      },
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
                <View style={{ height: 220, backgroundColor: 'white', borderRadius: 10, marginBottom: 15, overflow: 'hidden' }}>
                  <SignatureScreen
                    ref={refAssinatura}
                    onOK={enviar}
                    onBegin={() => setRolagem(false)} onEnd={() => setRolagem(true)}
                    onEmpty={() => { setIsProcessando(false); avisar("Assinatura", "Desenhe sua assinatura."); }}
                    webStyle={webStyle}
                    autoClear={false}
                    descriptionText=""
                    clearText="Limpar"
                    confirmText="Confirmar"
                  />
                </View>
              )}

              <View style={styles.modalBotoes}>
                <TouchableOpacity
                    style={[styles.btnCancelar, { opacity: isProcessando ? 0.5 : 1 }]}
                    onPress={fechar}
                    disabled={isProcessando}
                >
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                {/* BOTÃO COM A TRAVA ANTI-CLIQUE DUPLO */}
                <TouchableOpacity
                  style={[styles.btnSalvar, { opacity: isProcessando ? 0.6 : 1 }]}
                  disabled={isProcessando}
                  onPress={() => {
                    if (isProcessando) return; // Segurança extra

                    setIsProcessando(true); // Bloqueia imediatamente o botão

                    if (Platform.OS === 'web') {
                      confirmarWeb();
                    } else {
                      refAssinatura.current.readSignature();
                    }
                  }}
                >
                  <Text style={styles.btnSalvarTexto}>
                      {isProcessando ? 'Salvando...' : 'Confirmar'}
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
