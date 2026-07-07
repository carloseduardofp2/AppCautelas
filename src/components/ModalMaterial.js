import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function ModalMaterial({
  // Propriedades do Modal de Novo Material
  modalMateriaisVisivel,
  setModalMateriaisVisivel,
  matLocal,
  setMatLocal,
  matSubLocal,
  setMatSubLocal,
  matNome,
  setMatNome,
  matQtd,
  setMatQtd,
  matObs,
  setMatObs,
  salvarNovoMaterial,

  // Propriedades do Modal de Edição de Material
  modalEditarMaterialVisivel,
  setModalEditarMaterialVisivel,
  setIdMaterialEditando,
  editMatLocal,
  setEditMatLocal,
  editMatSubLocal,
  setEditMatSubLocal,
  editMatNome,
  setEditMatNome,
  editMatQtd,
  setEditMatQtd,
  editMatObs,
  setEditMatObs,
  salvarEdicaoMaterial,

  // Propriedades do Menu de Escolha (Bottom Sheet)
  modalTipoAdicaoVisivel,
  setModalTipoAdicaoVisivel,
  abrirCadastroMaterialContextual,

  // Propriedades do Modal de Nova Prateleira
  modalNovaPrateleiraVisivel,
  setModalNovaPrateleiraVisivel,
  nomeNovaPrateleira,
  setNomeNovaPrateleira,
  salvarNovaPrateleira
}) {
  return (
    <>
      {/* MODAL DE NOVO MATERIAL NO ESTOQUE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalMateriaisVisivel}
        onRequestClose={() => setModalMateriaisVisivel(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Novo Item no Estoque</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Camada 1: Local (ex: Armário 1, Prateleira A)"
                  placeholderTextColor="#64748B"
                  value={matLocal}
                  onChangeText={setMatLocal}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Camada 2: Sub-local (ex: Gaveta 1, Caixa B)"
                  placeholderTextColor="#64748B"
                  value={matSubLocal}
                  onChangeText={setMatSubLocal}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Nome do Material (ex: Rádio HT, Caneta)"
                  placeholderTextColor="#64748B"
                  value={matNome}
                  onChangeText={setMatNome}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Quantidade em Estoque"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={matQtd}
                  onChangeText={setMatQtd}
                />

                <TextInput
                  style={[styles.input, styles.inputArea]}
                  placeholder="Observações do material (Opcional)..."
                  placeholderTextColor="#64748B"
                  multiline={true}
                  numberOfLines={3}
                  value={matObs}
                  onChangeText={setMatObs}
                />

                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalMateriaisVisivel(false)}>
                    <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.btnSalvar} onPress={salvarNovoMaterial}>
                    <Text style={styles.btnSalvarTexto}>Salvar Item</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL DE EDIÇÃO DE MATERIAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEditarMaterialVisivel}
        onRequestClose={() => {
          setModalEditarMaterialVisivel(false);
          setIdMaterialEditando(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Editar Item / Localização</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Camada 1: Local (Opcional)"
                  placeholderTextColor="#64748B"
                  value={editMatLocal}
                  onChangeText={setEditMatLocal}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Camada 2: Sub-local (Opcional)"
                  placeholderTextColor="#64748B"
                  value={editMatSubLocal}
                  onChangeText={setEditMatSubLocal}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Nome do Material"
                  placeholderTextColor="#64748B"
                  value={editMatNome}
                  onChangeText={setEditMatNome}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Quantidade em Estoque"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={editMatQtd}
                  onChangeText={setEditMatQtd}
                />

                <TextInput
                  style={[styles.input, styles.inputArea]}
                  placeholder="Observações do material (Opcional)..."
                  placeholderTextColor="#64748B"
                  multiline={true}
                  numberOfLines={3}
                  value={editMatObs}
                  onChangeText={setEditMatObs}
                />

                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={styles.btnCancelar} onPress={() => {
                    setModalEditarMaterialVisivel(false);
                    setIdMaterialEditando(null);
                  }}>
                    <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.btnSalvar} onPress={salvarEdicaoMaterial}>
                    <Text style={styles.btnSalvarTexto}>Salvar Alterações</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 1: MENU INFERIOR DE ESCOLHA (BOTTOM SHEET) */}
      <Modal animationType="slide" transparent={true} visible={modalTipoAdicaoVisivel} onRequestClose={() => setModalTipoAdicaoVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>O que deseja adicionar?</Text>

            <TouchableOpacity style={styles.bottomSheetButton}
              onPress={() => {
                setModalTipoAdicaoVisivel(false);

                setTimeout(() => {
                  setModalNovaPrateleiraVisivel(true);
                }, 250);
              }}>
              <Text style={styles.bottomSheetIcon}>📦</Text>
              <View>
                <Text style={styles.bottomSheetButtonText}>Nova Prateleira / Local</Text>
                <Text style={styles.bottomSheetButtonSub}>Cria um contêiner vazio neste local</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetButton} onPress={abrirCadastroMaterialContextual}>
              <Text style={styles.bottomSheetIcon}>📄</Text>
              <View>
                <Text style={styles.bottomSheetButtonText}>Novo Material</Text>
                <Text style={styles.bottomSheetButtonSub}>Adiciona um item físico neste local</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelarAdd} onPress={() => setModalTipoAdicaoVisivel(false)}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CRIAR NOME DA PRATELEIRA */}
      <Modal animationType="slide" transparent={true} visible={modalNovaPrateleiraVisivel} onRequestClose={() => setModalNovaPrateleiraVisivel(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Criar Novo Local</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome (Ex: Armário 2, Gaveta B)"
                placeholderTextColor="#64748B"
                value={nomeNovaPrateleira}
                onChangeText={setNomeNovaPrateleira}
                autoFocus={true}
              />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalNovaPrateleiraVisivel(false)}>
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSalvar} onPress={salvarNovaPrateleira}>
                  <Text style={styles.btnSalvarTexto}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}