import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function MateriaisScreen({ pesquisaMateriais, setPesquisaMateriais, caminhoMateriais, setCaminhoMateriais, pastasExibicao, itensExibicao, abrirOpcoesPasta, abrirOpcoesItem, menuVisivel, itemMenu, fecharMenu, acaoEditarMenu, acaoMoverMenu, acaoExcluirMenu,
  confirmacaoVisivel, setConfirmacaoVisivel, dadosConfirmacao, modalEditarPastaVisivel, setModalEditarPastaVisivel, nomeEdicaoPasta, setNomeEdicaoPasta, salvarEdicaoPasta, modoSelecao, itensSelecionados,
  modalMoverVisivel, caminhoDestinoMover, setCaminhoDestinoMover,
  pastaSendoMovida, ativarModoSelecao, toggleSelecao, confirmarMovimentacao, cancelarMovimentacao, todasAsPastas }) {
  return (
    <View style={styles.secaoContainer}>
      <Text style={styles.tituloSecao}>RESERVA DE MATERIAIS</Text>

      <TextInput
        style={[styles.inputPesquisa, { borderRadius: 25, paddingHorizontal: 20 }]}
        placeholder="🔍 Encontre as minhas coisas!"
        placeholderTextColor="#64748B"
        value={pesquisaMateriais}
        onChangeText={setPesquisaMateriais}
      />

      {pesquisaMateriais.trim() === '' && (
        <View style={styles.nestBreadcrumbBar}>
          <TouchableOpacity onPress={() => setCaminhoMateriais([])} style={{ padding: 5 }}>
            <Text style={styles.nestBreadcrumbHome}>🏠</Text>
          </TouchableOpacity>
          {caminhoMateriais.map((step, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.nestBreadcrumbSeparator}>›</Text>
              <TouchableOpacity onPress={() => setCaminhoMateriais(caminhoMateriais.slice(0, idx + 1))} style={{ padding: 5 }}>
                <Text style={styles.nestBreadcrumbText}>{step}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {pastasExibicao.map((pasta) => (
        <TouchableOpacity
          key={pasta.id}
          style={styles.nestItem}
          onPress={() => { setPesquisaMateriais(''); setCaminhoMateriais(pasta.path) }}
        >
          <View style={styles.nestIconContainer}>
            <Text style={styles.nestIcon}>📦</Text>
            {pasta.count > 0 && (
              <View style={styles.nestBadge}>
                <Text style={styles.nestBadgeText}>{pasta.count}</Text>
              </View>
            )}
          </View>
          <View style={styles.nestItemBody}>
            <Text style={styles.nestTitle}>{pasta.nome}</Text>
            {pesquisaMateriais.trim() !== '' && pasta.caminhoCompleto !== pasta.nome && (
              <Text style={styles.nestSubtitle}>{pasta.caminhoCompleto}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.nestMenuBtn}
            onPress={(event) => {
              event.stopPropagation?.();
              abrirOpcoesPasta(pasta);
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.nestMenuText}>⋮</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {itensExibicao.map((item) => {
        const selecionado = itensSelecionados.includes(item.id);

        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.nestItem,
              selecionado && { borderColor: '#D4A25F', borderWidth: 1, backgroundColor: '#1E293B' } // Destaque visual
            ]}
            // Se segurar, ativa a seleção. Se já estiver em modo de seleção, um clique normal marca/desmarca.
            onLongPress={() => ativarModoSelecao(item.id)}
            onPress={() => modoSelecao ? toggleSelecao(item.id) : null}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            <View style={[styles.nestIconContainer, { backgroundColor: selecionado ? '#D4A25F' : '#475569' }]}>
              <Text style={styles.nestIcon}>{selecionado ? '✓' : '📄'}</Text>
            </View>
            <View style={styles.nestItemBody}>
              <Text style={styles.nestTitle}>{item.item}</Text>
              <Text style={styles.nestSubtitle}>Qtd: {item.quantidade} | {item.observacao || 'Sem obs'}</Text>
              {pesquisaMateriais.trim() !== '' && item.caminhoExibicao && (
                <Text style={styles.nestSubtitle}>📍 {item.caminhoExibicao}</Text>
              )}
            </View>

            {/* Esconde o menu de 3 pontinhos se estiver no modo de seleção */}
            {!modoSelecao && (
              <TouchableOpacity
                style={styles.nestMenuBtn}
                onPress={(event) => {
                  event.stopPropagation?.();
                  abrirOpcoesItem(item);
                }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.nestMenuText}>⋮</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}

      {pastasExibicao.length === 0 && itensExibicao.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📦</Text>
          <Text style={styles.noResultsText}>Adicione objetos ou contentores aqui!</Text>
        </View>
      )}

      {/* ========================================== */}
      {/* 1. MODAL CUSTOMIZADO: MENU DE OPÇÕES (BOTTOM SHEET) */}
      {/* ========================================== */}
      <Modal visible={menuVisivel} transparent animationType="slide" onRequestClose={fecharMenu}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={fecharMenu}
            accessibilityLabel="Fechar menu"
          />
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>
              {itemMenu?.tipo === 'pasta' ? `Pasta: ${itemMenu.dados.nome}` : itemMenu?.dados.item}
            </Text>

            <TouchableOpacity style={styles.bottomSheetButton} onPress={acaoEditarMenu}>
              <Text style={styles.bottomSheetIcon}>✏️</Text>
              <Text style={styles.bottomSheetButtonText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetButton} onPress={acaoMoverMenu}>
              <Text style={styles.bottomSheetIcon}>📦</Text>
              <Text style={styles.bottomSheetButtonText}>
                {itemMenu?.tipo === 'pasta' ? 'Mover prateleira' : 'Mover material'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetButton} onPress={acaoExcluirMenu}>
              <Text style={styles.bottomSheetIcon}>🗑️</Text>
              <Text style={[styles.bottomSheetButtonText, { color: '#F87171' }]}>Excluir</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelarAdd} onPress={fecharMenu}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* 2. MODAL CUSTOMIZADO: CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* ========================================== */}
      <Modal visible={confirmacaoVisivel} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{dadosConfirmacao.titulo}</Text>

            <Text style={{ color: '#E2E8F0', fontSize: 16, textAlign: 'center', marginBottom: 25 }}>
              {dadosConfirmacao.msg}
            </Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setConfirmacaoVisivel(false)}>
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: '#7F1D1D' }]} onPress={dadosConfirmacao.acao}>
                <Text style={[styles.btnSalvarTexto, { color: '#FFF' }]}>Sim, Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* 3. MODAL CUSTOMIZADO: RENOMEAR PASTA */}
      {/* ========================================== */}
      <Modal visible={modalEditarPastaVisivel} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 30 }]}>
            <Text style={styles.modalTitle}>Renomear Local</Text>

            <TextInput
              style={styles.input}
              placeholder="Digite o novo nome..."
              placeholderTextColor="#64748B"
              value={nomeEdicaoPasta}
              onChangeText={setNomeEdicaoPasta}
              autoFocus={true}
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditarPastaVisivel(false)}>
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSalvar} onPress={salvarEdicaoPasta}>
                <Text style={styles.btnSalvarTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* MODAL PARA ESCOLHER A PASTA DE DESTINO       */}
      {/* ========================================== */}
      <Modal visible={modalMoverVisivel} transparent animationType="slide" onRequestClose={cancelarMovimentacao}>
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheetContent, { maxHeight: '80%' }]}>
            <Text style={styles.bottomSheetTitle}>
              {pastaSendoMovida
                ? `Mover "${pastaSendoMovida.nome}" para onde?`
                : 'Mover material(is) para onde?'}
            </Text>

            {pastaSendoMovida && (
              <Text style={{ color: '#94A3B8', textAlign: 'center', marginBottom: 12 }}>
                As prateleiras internas e todos os materiais serão movidos juntos.
              </Text>
            )}

            <ScrollView style={{ width: '100%', marginBottom: 15 }}>
              {todasAsPastas.map(pasta => {
                // Criamos uma variável para saber se esta pasta é a que está selecionada
                const isSelected = JSON.stringify(caminhoDestinoMover) === JSON.stringify(pasta.pathFuturo || []);

                return (
                  <TouchableOpacity
                    key={pasta.id}
                    style={{
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: '#334155',
                      // 🔥 Fundo com uma leve transparência dourada e uma borda lateral se estiver selecionado
                      backgroundColor: isSelected ? 'rgba(212, 162, 95, 0.15)' : 'transparent',
                      borderLeftWidth: isSelected ? 4 : 0,
                      borderLeftColor: '#D4A25F',
                    }}
                    onPress={() => setCaminhoDestinoMover(pasta.pathFuturo || [])}
                  >
                    <Text style={{
                      // 🔥 O texto também fica dourado e em negrito se selecionado
                      color: isSelected ? '#D4A25F' : '#F8FAFC',
                      fontSize: 16,
                      fontWeight: isSelected ? 'bold' : 'normal'
                    }}>
                      {pasta.nomeExibicao || pasta.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.btnCancelar, { flex: 1, marginRight: 10 }]} onPress={cancelarMovimentacao}>
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSalvar, { flex: 1 }]} onPress={confirmarMovimentacao}>
                <Text style={styles.btnSalvarTexto}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
