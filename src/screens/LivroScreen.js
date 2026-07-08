import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function LivroScreen({ pesquisa, setPesquisa, cautelasFiltradas, solicitarExclusao, setIdCautelaParaAssinar, setTipoOperacao, setModalAssinatura }) {
  return (
    <View style={styles.secaoContainer}>
      <Text style={styles.tituloSecao}>LIVRO DE CAUTELAS</Text>

      <TextInput
        style={styles.inputPesquisa}
        placeholder="🔍 Pesquisar militar, OM, material ou data..."
        placeholderTextColor="#64748B"
        value={pesquisa}
        onChangeText={setPesquisa}
      />

      {cautelasFiltradas.map((cautela) => (
        <View key={cautela.id} style={styles.cartao}>
          <View style={styles.cartaoLinha}>
            <Text style={styles.cartaoMilitar}>
              {cautela.militar} {cautela.om ? `(${cautela.om})` : ''}
            </Text>
            <Text style={styles.cartaoQtd}>Qtd: {cautela.quantidade}</Text>
          </View>

          <Text style={styles.cartaoTextoMaterial}>
            <Text style={styles.labelMaterial}>Material: </Text>
            {cautela.material}
          </Text>

          <View style={styles.cartaoLinhaAfastada}>
            <Text style={styles.cartaoTexto}>
              <Text style={styles.label}>Retirada: </Text>
              {cautela.dataCautela}
            </Text>
            <Text style={styles.cartaoTexto}>
              <Text style={styles.label}>Entrega: </Text>
              {cautela.dataEntrega || 'Pendente'}
            </Text>
          </View>

          <View style={styles.divisor} />

          <Text style={styles.cartaoTexto}>
            <Text style={styles.label}>Mil Sec Op (Saída): </Text>
            {cautela.milSecOpCautela || 'Não informado'}
          </Text>

          <Text style={styles.cartaoTexto}>
            <Text style={styles.label}>Obs Cautela: </Text>
            {cautela.observacao || 'Sem obs'}
          </Text>

          {!!cautela.dataEntrega && (
            <View style={{ marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#334155' }}>
              <Text style={styles.cartaoTexto}>
                <Text style={styles.label}>Mil Sec Op (Retorno): </Text>
                {cautela.milSecOp || 'Não informado'}
              </Text>
              <Text style={styles.cartaoTexto}>
                <Text style={styles.label}>Obs Entrega: </Text>
                {cautela.obsEntrega || 'Sem obs'}
              </Text>
            </View>
          )}

          <View style={styles.cartaoLinhaAfastadaActions}>

            {/* 🔥 NOVO BLOCO DE STATUS: Mostra a Saída e o Retorno */}
            <View style={{ flex: 1, marginRight: 10, justifyContent: 'center' }}>
              {/* Status da Cautela (Assinatura Inicial) */}
              <Text style={[styles.statusTag, cautela.assinaturaCautela ? styles.statusOk : styles.statusPendente, { marginBottom: 6 }]}>
                {cautela.assinaturaCautela ? '✅ Saída: Assinada' : '⚠️ Saída: Pendente'}
              </Text>

              {/* Status da Devolução */}
              <Text style={[styles.statusTag, cautela.assinaturaDevolucao ? styles.statusOk : styles.statusPendente]}>
                {cautela.assinaturaDevolucao ? '🔄 Retorno: Efetuado' : '🔄 Retorno: Pendente'}
              </Text>
            </View>

            {/* Alinha os botões horizontalmente */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

              {/* 🔥 BOTÃO CONDICIONAL: Só aparece se a cautela NÃO tiver assinatura inicial */}
              {!cautela.assinaturaCautela && (
                <TouchableOpacity
                  style={[styles.btnAssinarDepois, { backgroundColor: '#D4A25F', marginRight: 10 }]} // Usa o dourado do seu sistema
                  onPress={() => {
                    setIdCautelaParaAssinar(cautela.id);
                    setTipoOperacao('assinar_pendente');
                    setModalAssinatura(true);
                  }}
                >
                  <Text style={styles.btnAssinarDepoisTexto}>✍️ Assinar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.btnExcluir}
                onPress={() => solicitarExclusao(cautela)}
              >
                <Text style={styles.btnExcluirTexto}>🗑️ Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {cautelasFiltradas.length === 0 && (
        <Text style={styles.noResultsText}>Nenhuma cautela encontrada.</Text>
      )}
    </View>
  );
}