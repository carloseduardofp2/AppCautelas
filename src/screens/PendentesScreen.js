import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function PendentesScreen({ cautelasPendentes, setIdCautelaParaAssinar, setTipoOperacao, setModalAssinatura }) {
  return (
    <View style={styles.secaoContainer}>
      <Text style={styles.tituloSecao}>MATERIAIS PENDENTES</Text>

      {cautelasPendentes.length === 0 ? (
        <Text style={styles.noResultsText}>Tudo certo! Nenhum material pendente no momento.</Text>
      ) : (
        cautelasPendentes.map((cautela) => (
          <View key={cautela.id} style={[styles.cartao, { borderColor: '#991B1B' }]}>
            <View style={styles.cartaoLinha}>
              <Text style={styles.cartaoMilitar}>
                {cautela.militar} {cautela.om ? `(${cautela.om})` : ''}
              </Text>
              <Text style={styles.cartaoQtd}>Qtd: {cautela.quantidade}</Text>
            </View>

            <Text style={styles.cartaoTexto}><Text style={styles.label}>Material:</Text> {cautela.material}</Text>
            <Text style={styles.cartaoTexto}><Text style={styles.label}>Retirada:</Text> {cautela.dataCautela}</Text>
            <Text style={styles.cartaoTexto}><Text style={styles.label}>Mil Sec Op (Saída):</Text> {cautela.milSecOpCautela || 'Não informado'}</Text>
            <Text style={styles.cartaoTexto}><Text style={styles.label}>Obs:</Text> {cautela.observacao || 'Nenhuma'}</Text>

            <TouchableOpacity
              style={styles.btnBaixa}
              onPress={() => {
                setTipoOperacao('baixa');
                setIdCautelaParaAssinar(cautela.id);
                setModalAssinatura(true);
              }}
              >
              <Text style={styles.btnBaixaTexto}>Assinar Devolução</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}