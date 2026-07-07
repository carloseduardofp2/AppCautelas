import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function MateriaisScreen({ pesquisaMateriais, setPesquisaMateriais, caminhoMateriais, setCaminhoMateriais, pastasExibicao, itensExibicao, abrirOpcoesPasta, abrirOpcoesItem }) {
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
    </View>
  );
}