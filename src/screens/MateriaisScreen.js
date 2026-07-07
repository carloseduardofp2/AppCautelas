import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function MateriaisScreen({ pesquisaMateriais, setPesquisaMateriais, caminhoMateriais, setCaminhoMateriais, pastasExibicao, itensExibicao, abrirOpcoesPasta, abrirOpcoesItem, menuVisivel, itemMenu, fecharMenu, acaoEditarMenu, acaoExcluirMenu,
  confirmacaoVisivel, setConfirmacaoVisivel, dadosConfirmacao, modalEditarPastaVisivel, setModalEditarPastaVisivel, nomeEdicaoPasta, setNomeEdicaoPasta, salvarEdicaoPasta }) {
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

      {pesquisaMateriais === '' && (
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

      {pastasExibicao.map((pasta, index) => (
        <TouchableOpacity
          key={`pasta-${index}`}
          style={styles.nestItem}
          onPress={() => {setPesquisaMateriais(''); setCaminhoMateriais(pasta.path)}}
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
          </View>

          <TouchableOpacity
            style={styles.nestMenuBtn}
            onPress={() => abrirOpcoesPasta(pasta)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.nestMenuText}>⋮</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {itensExibicao.map((item) => (
        <View key={item.id} style={styles.nestItem}>
          <View style={[styles.nestIconContainer, { backgroundColor: '#475569' }]}>
            <Text style={styles.nestIcon}>📄</Text>
          </View>
          <View style={styles.nestItemBody}>
            <Text style={styles.nestTitle}>{item.item}</Text>
            <Text style={styles.nestSubtitle}>Qtd: {item.quantidade} | {item.observacao || 'Sem obs'}</Text>
            {pesquisaMateriais !== '' && item.localizacao !== 'Não informado' && (
              <Text style={[styles.nestSubtitle, { color: '#D4A25F' }]}>
                📍 {item.localizacao} {item.subLocalizacao ? `› ${item.subLocalizacao}` : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.nestMenuBtn}
            onPress={() => abrirOpcoesItem(item)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.nestMenuText}>⋮</Text>
          </TouchableOpacity>
        </View>
      ))}

      {pastasExibicao.length === 0 && itensExibicao.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📦</Text>
          <Text style={styles.noResultsText}>Adicione objetos ou contentores aqui!</Text>
        </View>
      )}

      {/* ========================================== */}
      {/* 1. MODAL CUSTOMIZADO: MENU DE OPÇÕES (BOTTOM SHEET) */}
      {/* ========================================== */}
      <Modal visible={menuVisivel} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={fecharMenu}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>
              {itemMenu?.tipo === 'pasta' ? `Pasta: ${itemMenu.dados.nome}` : itemMenu?.dados.item}
            </Text>

            <TouchableOpacity style={styles.bottomSheetButton} onPress={acaoEditarMenu}>
              <Text style={styles.bottomSheetIcon}>✏️</Text>
              <Text style={styles.bottomSheetButtonText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetButton} onPress={acaoExcluirMenu}>
              <Text style={styles.bottomSheetIcon}>🗑️</Text>
              <Text style={[styles.bottomSheetButtonText, { color: '#F87171' }]}>Excluir</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelarAdd} onPress={fecharMenu}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    </View>
  );
}