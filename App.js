import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import SignatureScreen from 'react-native-signature-canvas';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// --- IMPORTAÇÃO DO FIREBASE ---
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- COMPONENTE PRINCIPAL QUE CONTÉM TODA A LÓGICA ---
function MainContent() {
  const [abaAtiva, setAbaAtiva] = useState('Livro');
  const [pesquisa, setPesquisa] = useState('');
  const [pesquisaMateriais, setPesquisaMateriais] = useState('');

  // --- NOVO: ESTADO DE NAVEGAÇÃO DE PASTAS ---
  const [caminhoMateriais, setCaminhoMateriais] = useState([]);

  // Agora o hook funciona corretamente pois está dentro do Provider
  const insets = useSafeAreaInsets();

  // --- ESTADOS DO BANCO DE DADOS ---
  const [listaCautelas, setListaCautelas] = useState([]);
  const [listaMateriais, setListaMateriais] = useState([]);

  const [isExportando, setIsExportando] = useState(false);

  // --- ESTADOS DO FORMULÁRIO DE CAUTELAS ---
  const [modalVisivel, setModalVisivel] = useState(false);
  const [novoMilitar, setNovoMilitar] = useState('');
  const [novaOm, setNovaOm] = useState('');
  const [novoMaterial, setNovoMaterial] = useState('');
  const [novaQtd, setNovaQtd] = useState('');
  const [novaObs, setNovaObs] = useState('');
  const [novoMilSecOpCautela, setNovoMilSecOpCautela] = useState('');

  // --- ESTADOS DO FORMULÁRIO DE MATERIAIS (CADASTRO) ---
  const [modalMateriaisVisivel, setModalMateriaisVisivel] = useState(false);
  const [matLocal, setMatLocal] = useState('');
  const [matSubLocal, setMatSubLocal] = useState('');
  const [matNome, setMatNome] = useState('');
  const [matQtd, setMatQtd] = useState('');
  const [matObs, setMatObs] = useState('');

  // --- ESTADOS PARA EDIÇÃO DE MATERIAIS ---
  const [modalEditarMaterialVisivel, setModalEditarMaterialVisivel] = useState(false);
  const [idMaterialEditando, setIdMaterialEditando] = useState(null);
  const [editMatLocal, setEditMatLocal] = useState('');
  const [editMatSubLocal, setEditMatSubLocal] = useState('');
  const [editMatNome, setEditMatNome] = useState('');
  const [editMatQtd, setEditMatQtd] = useState('');
  const [editMatObs, setEditMatObs] = useState('');

  // --- ESTADOS DA DEVOLUÇÃO ---
  const [novaObsEntrega, setNovaObsEntrega] = useState('');
  const [novoMilSecOp, setNovoMilSecOp] = useState('');

  // --- ESTADOS DO CALENDÁRIO ---
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  // --- ASSINATURA ---
  const [tipoOperacao, setTipoOperacao] = useState('');
  const [idCautelaParaAssinar, setIdCautelaParaAssinar] = useState(null);
  const refAssinatura = useRef();
  const [modalAssinatura, setModalAssinatura] = useState(false);

  // FIX: Estado para controlar se o ScrollView do modal pode rolar ou se deve travar para a assinatura
  const [scrollModalHabilitado, setScrollModalHabilitado] = useState(true);

  // --- CONEXÃO EM TEMPO REAL COM O FIRESTORE ---
  useEffect(() => {
    const qCautelas = query(collection(db, 'cautelas'));
    const unsubscribeCautelas = onSnapshot(qCautelas, (snapshot) => {
      const dados = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
      }));
      setListaCautelas(dados);
    }, (error) => {
      console.error("Erro ao buscar Cautelas: ", error);
      Alert.alert("Erro", "Não foi possível sincronizar as cautelas.");
    });

    const qMateriais = query(collection(db, 'materiais'));
    const unsubscribeMateriais = onSnapshot(qMateriais, (snapshot) => {
      const dados = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
      }));
      setListaMateriais(dados);
    }, (error) => {
      console.error("Erro ao buscar Materiais: ", error);
      Alert.alert("Erro", "Não foi possível sincronizar a reserva de materiais.");
    });

    return () => {
      unsubscribeCautelas();
      unsubscribeMateriais();
    };
  }, []);

  const aoMudarData = (event, dataEscolhida) => {
    setMostrarCalendario(false);
    if (dataEscolhida) {
      setDataSelecionada(dataEscolhida);
    }
  };

  function removerAcentos(texto) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // --- AÇÕES DO FIRESTORE: CAUTELAS ---
  function excluirCautela(id, militar) {
    Alert.alert(
      'Excluir Registro',
      `Tem certeza que deseja apagar permanentemente a cautela de ${militar}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'cautelas', id));
              Alert.alert("Sucesso", "Registro removido da nuvem.");
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Falha ao excluir do banco de dados.");
            }
          }
        }
      ]
    );
  }

  async function handleAssinatura(signature) {
    if (tipoOperacao === 'criar') {
      const novaCautela = {
        militar: novoMilitar,
        om: novaOm.trim() || 'Não informada',
        material: novoMaterial,
        quantidade: novaQtd,
        observacao: novaObs,
        dataCautela: dataSelecionada.toLocaleDateString('pt-BR'),
        milSecOpCautela: novoMilSecOpCautela,
        assinaturaCautela: signature,
        dataEntrega: '',
        obsEntrega: '',
        milSecOp: '',
        assinaturaDevolucao: ''
      };

      try {
        await addDoc(collection(db, 'cautelas'), novaCautela);
        setNovoMilitar(''); setNovaOm(''); setNovoMaterial(''); setNovaQtd(''); setNovaObs(''); setNovoMilSecOpCautela('');
        setModalVisivel(false);
        Alert.alert("Sucesso", "Cautela salva definitivamente na nuvem!");
      } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Não foi possível salvar a nova cautela.");
      }

    } else {
      if (novoMilSecOp.trim() === '') {
        Alert.alert("Atenção", "Informe qual militar da Sec Op está recebendo o material!");
        return;
      }
      const dataHoje = new Date().toLocaleDateString('pt-BR');

      try {
        const documentoRef = doc(db, 'cautelas', idCautelaParaAssinar);
        await updateDoc(documentoRef, {
          dataEntrega: dataHoje,
          obsEntrega: novaObsEntrega,
          milSecOp: novoMilSecOp,
          assinaturaDevolucao: signature
        });

        setNovaObsEntrega('');
        setNovoMilSecOp('');
        Alert.alert("Sucesso", "Baixa realizada e atualizada na nuvem!");
      } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Não foi possível registrar a devolução.");
      }
    }

    setModalAssinatura(false);
    setIdCautelaParaAssinar(null);
    setTipoOperacao('');
    setScrollModalHabilitado(true);
  }

  // --- AÇÕES DO FIRESTORE: RESERVA DE MATERIAIS ---
  async function salvarNovoMaterial() {
    if (matNome.trim() === '' || matQtd.trim() === '') {
      Alert.alert('Atenção', 'Nome do Item e Quantidade são obrigatórios!');
      return;
    }

    try {
      await addDoc(collection(db, 'materiais'), {
        localizacao: matLocal.trim() || 'Não informado',
        subLocalizacao: matSubLocal.trim() || '',
        item: matNome,
        quantidade: Number(matQtd),
        observacao: matObs
      });

      setMatLocal(''); setMatSubLocal(''); setMatNome(''); setMatQtd(''); setMatObs('');
      setModalMateriaisVisivel(false);
      Alert.alert("Sucesso", "Material adicionado ao estoque na nuvem!");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível cadastrar o material.");
    }
  }

  function prepararEdicaoMaterial(material) {
    setIdMaterialEditando(material.id);
    setEditMatLocal(material.localizacao === 'Não informado' ? '' : material.localizacao);
    setEditMatSubLocal(material.subLocalizacao || '');
    setEditMatNome(material.item);
    setEditMatQtd(String(material.quantidade));
    setEditMatObs(material.observacao || '');
    setModalEditarMaterialVisivel(true);
  }

  async function salvarEdicaoMaterial() {
    if (editMatNome.trim() === '' || editMatQtd.trim() === '') {
      Alert.alert('Atenção', 'Nome do Item e Quantidade são obrigatórios!');
      return;
    }

    try {
      const docRef = doc(db, 'materiais', idMaterialEditando);
      await updateDoc(docRef, {
        localizacao: editMatLocal.trim() || 'Não informado',
        subLocalizacao: editMatSubLocal.trim() || '',
        item: editMatNome.trim(),
        quantidade: Number(editMatQtd),
        observacao: editMatObs.trim()
      });

      setModalEditarMaterialVisivel(false);
      setIdMaterialEditando(null);
      Alert.alert("Sucesso", "Material atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível atualizar o material.");
    }
  }

  function excluirMaterial(id, item) {
    Alert.alert(
      'Remover do Estoque',
      `Deseja permanentemente excluir o item ${item} do sistema?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'materiais', id));
              Alert.alert("Sucesso", "Item removido do estoque.");
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Falha ao remover item.");
            }
          }
        }
      ]
    );
  }

  // --- NOVO: OPÇÕES RÁPIDAS PARA O NEST EGG ---
  function abrirOpcoesItem(material) {
    Alert.alert(
      material.item,
      `Qtd: ${material.quantidade}\nObs: ${material.observacao || 'Nenhuma'}`,
      [
        { text: "✏️ Editar", onPress: () => prepararEdicaoMaterial(material) },
        { text: "🗑️ Remover", onPress: () => excluirMaterial(material.id, material.item), style: 'destructive' },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  }

  // --- NOVO: LÓGICA DE PASTAS NEST EGG ---
  const obterItensExibicao = () => {
    if (pesquisaMateriais.trim() !== '') {
      const termo = removerAcentos(pesquisaMateriais);
      return {
        pastas: [],
        itens: listaMateriais.filter(m =>
          removerAcentos(m.item || '').includes(termo) ||
          removerAcentos(m.localizacao || '').includes(termo) ||
          removerAcentos(m.subLocalizacao || '').includes(termo)
        )
      };
    }

    if (caminhoMateriais.length === 0) {
      const locaisUnicos = [...new Set(listaMateriais.map(m => m.localizacao).filter(l => l && l !== 'Não informado'))];
      const pastas = locaisUnicos.map(loc => {
        const count = listaMateriais.filter(m => m.localizacao === loc).length;
        return { nome: loc, count, path: [loc] };
      });
      const itens = listaMateriais.filter(m => !m.localizacao || m.localizacao === 'Não informado');
      return { pastas, itens };
    }

    if (caminhoMateriais.length === 1) {
      const localAtual = caminhoMateriais[0];
      const materiaisNoLocal = listaMateriais.filter(m => m.localizacao === localAtual);
      const subLocaisUnicos = [...new Set(materiaisNoLocal.map(m => m.subLocalizacao).filter(Boolean))];

      const pastas = subLocaisUnicos.map(sub => {
        const count = materiaisNoLocal.filter(m => m.subLocalizacao === sub).length;
        return { nome: sub, count, path: [localAtual, sub] };
      });
      const itens = materiaisNoLocal.filter(m => !m.subLocalizacao);
      return { pastas, itens };
    }

    const localAtual = caminhoMateriais[0];
    const subLocalAtual = caminhoMateriais[1];
    const itens = listaMateriais.filter(m => m.localizacao === localAtual && m.subLocalizacao === subLocalAtual);
    return { pastas: [], itens };
  };

  const { pastas: pastasExibicao, itens: itensExibicao } = obterItensExibicao();

  // --- FILTROS DE PESQUISA ---
  const cautelasFiltradas = listaCautelas.filter(cautela => {
    const termo = removerAcentos(pesquisa);
    const militar = removerAcentos(cautela.militar || '');
    const om = removerAcentos(cautela.om || '');
    const material = removerAcentos(cautela.material || '');
    const data = cautela.dataCautela || '';

    return militar.includes(termo) || om.includes(termo) || material.includes(termo) || data.includes(pesquisa);
  });

  const cautelasPendentes = listaCautelas.filter(cautela => !cautela.dataEntrega || !cautela.assinaturaDevolucao);

  // --- EXPORTAÇÃO PDF ---
  async function exportarParaPDF() {
    if (isExportando) return; // Impede duplo clique
    setIsExportando(true); // Trava o botão

    try {
      const rows = listaCautelas.map(c => {
        const renderImg = (ass) => {
          if (!ass) return 'Pendente';
          if (ass.startsWith('data:image')) {
            return `<img src="${ass}" style="height: 30px; object-fit: contain;" />`;
          }
          return ass;
        };

        return `
          <tr>
            <td>${c.militar} ${c.om ? `(${c.om})` : ''}</td>
            <td>${c.material}</td>
            <td>${c.quantidade}</td>
            <td>${c.observacao || '-'}</td>
            <td>${c.dataCautela}</td>
            <td>${c.milSecOpCautela || '-'}</td>
            <td style="text-align: center;">${renderImg(c.assinaturaCautela)}</td>
            <td>${c.dataEntrega || 'Pendente'}</td>
            <td>${c.milSecOp || '-'}</td>
            <td>${c.obsEntrega || '-'}</td>
            <td style="text-align: center;">${renderImg(c.assinaturaDevolucao)}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 10px; }
              h1 { text-align: center; color: #0F172A; margin-bottom: 5px; font-size: 18px; }
              h3 { text-align: center; color: #64748B; margin-top: 0; margin-bottom: 15px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 9px; }
              th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; vertical-align: middle; }
              th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Livro de Cautelas</h1>
            <h3>Seção de Operações</h3>
            <table>
              <thead>
                <tr>
                  <th>Militar (OM)</th>
                  <th>Material</th>
                  <th>Qtd</th>
                  <th>Obs Cautela</th>
                  <th>Retirada</th>
                  <th>Mil Sec Op (Saída)</th>
                  <th>Ass. Cautela</th>
                  <th>Entrega</th>
                  <th>Mil Sec Op (Retorno)</th>
                  <th>Obs Entrega</th>
                  <th>Ass. Devolução</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Erro", "O compartilhamento não está disponível.");
      }
    } catch (error) {
      console.error("Erro na exportação:", error);
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
    } finally {
      setIsExportando(false); // Libera o botão independente de dar certo ou erro
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sistema de Cautelas</Text>
        <Text style={styles.headerSubtitle}>Seção de Operações</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>

        {/* --- ABA 1: LIVRO DE CAUTELAS --- */}
        {abaAtiva === 'Livro' && (
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

                <Text style={styles.cartaoTexto}>
                  <Text style={styles.label}>Material: </Text>
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
                  <Text style={[styles.statusTag, cautela.assinaturaDevolucao ? styles.statusOk : styles.statusPendente]}>
                    {cautela.assinaturaDevolucao ? '🔄 Devolução: Efetuada' : '🔄 Devolução: Pendente'}
                  </Text>

                  <TouchableOpacity
                    style={styles.btnExcluir}
                    onPress={() => excluirCautela(cautela.id, cautela.militar)}
                  >
                    <Text style={styles.btnExcluirTexto}>🗑️ Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {cautelasFiltradas.length === 0 && (
              <Text style={styles.noResultsText}>Nenhuma cautela encontrada.</Text>
            )}
          </View>
        )}

        {/* --- ABA 2: MATERIAIS PENDENTES --- */}
        {abaAtiva === 'Pendentes' && (
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
                      setScrollModalHabilitado(true);
                      setModalAssinatura(true);
                    }}
                  >
                    <Text style={styles.btnBaixaTexto}>Assinar Devolução</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* --- ABA 3: RESERVA DE MATERIAIS (ATUALIZADA NEST EGG) --- */}
        {abaAtiva === 'Materiais' && (
          <View style={styles.secaoContainer}>
            <Text style={styles.tituloSecao}>RESERVA DE MATERIAIS</Text>

            <TextInput
              style={[styles.inputPesquisa, { borderRadius: 25, paddingHorizontal: 20 }]}
              placeholder="🔍 Encontre as minhas coisas!"
              placeholderTextColor="#64748B"
              value={pesquisaMateriais}
              onChangeText={setPesquisaMateriais}
            />

            {/* Breadcrumb - Caminho das Pastas */}
            {pesquisaMateriais === '' && (
              <View style={styles.nestBreadcrumbBar}>
                <TouchableOpacity onPress={() => setCaminhoMateriais([])} style={{padding: 5}}>
                  <Text style={styles.nestBreadcrumbHome}>🏠</Text>
                </TouchableOpacity>
                {caminhoMateriais.map((step, idx) => (
                  <View key={idx} style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.nestBreadcrumbSeparator}>›</Text>
                    <TouchableOpacity onPress={() => setCaminhoMateriais(caminhoMateriais.slice(0, idx + 1))} style={{padding: 5}}>
                      <Text style={styles.nestBreadcrumbText}>{step}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Renderização das Pastas */}
            {pastasExibicao.map((pasta, index) => (
              <TouchableOpacity
                key={`pasta-${index}`}
                style={styles.nestItem}
                onPress={() => setCaminhoMateriais(pasta.path)}
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
                <View style={styles.nestMenuBtn}>
                  <Text style={styles.nestMenuText}>⋯</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Renderização dos Arquivos/Itens */}
            {itensExibicao.map((item) => (
              <View key={item.id} style={styles.nestItem}>
                <View style={[styles.nestIconContainer, {backgroundColor: '#475569'}]}>
                  <Text style={styles.nestIcon}>📄</Text>
                </View>
                <View style={styles.nestItemBody}>
                  <Text style={styles.nestTitle}>{item.item}</Text>
                  <Text style={styles.nestSubtitle}>Qtd: {item.quantidade} | {item.observacao || 'Sem obs'}</Text>
                  {pesquisaMateriais !== '' && item.localizacao !== 'Não informado' && (
                    <Text style={[styles.nestSubtitle, {color: '#D4A25F'}]}>
                      📍 {item.localizacao} {item.subLocalizacao ? `› ${item.subLocalizacao}` : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => abrirOpcoesItem(item)} style={styles.nestMenuBtn}>
                  <Text style={styles.nestMenuText}>⋮</Text>
                </TouchableOpacity>
              </View>
            ))}

            {pastasExibicao.length === 0 && itensExibicao.length === 0 && (
              <View style={{alignItems: 'center', marginTop: 40}}>
                 <Text style={{fontSize: 40, marginBottom: 10}}>📦</Text>
                 <Text style={styles.noResultsText}>Adicione objetos ou contentores aqui!</Text>
               </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* --- MODAL DE ASSINATURA --- */}
      <Modal visible={modalAssinatura} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView
                scrollEnabled={scrollModalHabilitado}
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

                <View style={{ height: 180, backgroundColor: 'white', borderRadius: 10, marginBottom: 15, overflow: 'hidden' }}>
                  <SignatureScreen
                    ref={refAssinatura}
                    onOK={handleAssinatura}
                    onBegin={() => setScrollModalHabilitado(false)}
                    onEnd={() => setScrollModalHabilitado(true)}
                    autoClear={false}
                    descriptionText=""
                    clearText="Limpar"
                    confirmText="Confirmar"
                  />
                </View>

                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={styles.btnCancelar} onPress={() => {
                    setModalAssinatura(false);
                    setNovaObsEntrega('');
                    setNovoMilSecOp('');
                    setScrollModalHabilitado(true);
                  }}>
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

      {/* MODAL DE NOVA CAUTELA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisivel}
        onRequestClose={() => setModalVisivel(false)}
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
                  placeholder="Mil Sec Op (Quem está entregando o material)"
                  placeholderTextColor="#64748B"
                  value={novoMilSecOpCautela}
                  onChangeText={setNovoMilSecOpCautela}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Militar que está pegando (ex: Sgt Ajala)"
                  placeholderTextColor="#64748B"
                  value={novoMilitar}
                  onChangeText={setNovoMilitar}
                />

                <TextInput
                  style={styles.input}
                  placeholder="OM (Ex: Cmdo 3ª DE)"
                  placeholderTextColor="#64748B"
                  value={novaOm}
                  onChangeText={setNovaOm}
                />

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15, marginTop: -5 }}>
                  {['Cmdo 3ª DE', 'Cmdo 6ª Bda Inf Bld', 'B Adm Gu SM'].map((omNome) => (
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

                <TextInput
                  style={styles.input}
                  placeholder="Material"
                  placeholderTextColor="#64748B"
                  value={novoMaterial}
                  onChangeText={setNovoMaterial}
                />

                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                    placeholder="Quantidade"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={novaQtd}
                    onChangeText={setNovaQtd}
                  />

                  <TouchableOpacity
                    style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setMostrarCalendario(true)}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                      {dataSelecionada.toLocaleDateString('pt-BR')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {mostrarCalendario && (
                  <DateTimePicker
                    value={dataSelecionada}
                    mode="date"
                    display="default"
                    onChange={aoMudarData}
                  />
                )}

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
                  <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalVisivel(false)}>
                    <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.btnSalvar} onPress={() => {
                    if (novoMilitar === '' || novoMaterial === '' || novaQtd === '' || novoMilSecOpCautela === '') {
                      Alert.alert('Atenção', 'Preencha os campos obrigatórios!');
                      return;
                    }
                    setTipoOperacao('criar');
                    setScrollModalHabilitado(true);
                    setModalAssinatura(true);
                  }}>
                    <Text style={styles.btnSalvarTexto}>Assinar e Salvar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* --- BOTÕES FLUTUANTES CONDICIONAIS (MANTIDOS DA VERSÃO ORIGINAL) --- */}
      {abaAtiva === 'Livro' && (
        <TouchableOpacity 
          style={[styles.botaoFlutuanteBase, { left: 25, opacity: isExportando ? 0.6 : 1 }]} 
          onPress={exportarParaPDF}
          disabled={isExportando}
        >
          <Text style={{ fontSize: 24 }}>{isExportando ? '⏳' : '📄'}</Text>
        </TouchableOpacity>
      )}

      {abaAtiva === 'Livro' && (
        <TouchableOpacity style={[styles.botaoFlutuanteBase, { right: 25 }]} onPress={() => setModalVisivel(true)}>
          <Text style={styles.botaoFlutuanteTexto}>+</Text>
        </TouchableOpacity>
      )}

      {abaAtiva === 'Materiais' && (
        <TouchableOpacity style={[styles.botaoFlutuanteBase, { right: 25 }]} onPress={() => setModalMateriaisVisivel(true)}>
          <Text style={styles.botaoFlutuanteTexto}>+</Text>
        </TouchableOpacity>
      )}

      {/* --- FOOTER (ABAS) --- */}
      <View style={[
        styles.footer,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 0,
          height: 55 + (insets.bottom > 0 ? insets.bottom : 0)
        }
      ]}>
        <TouchableOpacity style={styles.footerButton} onPress={() => setAbaAtiva('Livro')}>
          <Text style={[styles.footerButtonText, abaAtiva === 'Livro' && styles.footerButtonTextActive]}>Livro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerButton} onPress={() => setAbaAtiva('Pendentes')}>
          <Text style={[styles.footerButtonText, abaAtiva === 'Pendentes' && styles.footerButtonTextActive]}>Pendentes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerButton} onPress={() => setAbaAtiva('Materiais')}>
          <Text style={[styles.footerButtonText, abaAtiva === 'Materiais' && styles.footerButtonTextActive]}>Materiais</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- APP QUE ENVOLVE O CONTEÚDO NO PROVIDER ---
export default function App() {
  return (
    <SafeAreaProvider>
      <MainContent />
    </SafeAreaProvider>
  );
}

// --- ESTILOS INTACTOS + NOVOS ESTILOS DE PASTA NEST EGG ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { backgroundColor: '#0F172A', padding: 15, paddingTop: 10, borderBottomWidth: 2.5, borderBottomColor: '#D4A25F' },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  headerSubtitle: { color: '#94A3B8', fontSize: 18, textAlign: 'center', marginTop: 5 },
  body: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 20, paddingBottom: 110 },
  secaoContainer: { width: '100%' },
  tituloSecao: { color: '#D4A25F', fontSize: 18, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  cartao: { backgroundColor: '#1E293B', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  cartaoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cartaoLinhaAfastada: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cartaoMilitar: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  cartaoQtd: { color: '#D4A25F', fontSize: 16, fontWeight: 'bold' },
  cartaoTexto: { color: '#E2E8F0', fontSize: 14, marginVertical: 2 },
  label: { color: '#94A3B8', fontWeight: '600' },
  divisor: { height: 1, backgroundColor: '#334155', marginVertical: 10 },
  statusTag: { fontSize: 14, fontWeight: '600', marginTop: 5 },
  statusOk: { color: '#4ADE80' },
  statusPendente: { color: '#F87171' },
  inputPesquisa: { backgroundColor: '#1E293B', color: '#FFFFFF', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
  noResultsText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 20 },
  cartaoLinhaAfastadaActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  btnExcluir: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#991B1B' },
  btnExcluirTexto: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },
  btnBaixa: { backgroundColor: '#059669', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center', borderWidth: 1, borderColor: '#047857' },
  btnBaixaTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  botaoFlutuanteTexto: { color: '#0F172A', fontSize: 40, fontWeight: 'bold', lineHeight: 32 },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderTopWidth: 1.5,
    borderTopColor: '#D4A25F',
    height: 55,
    paddingBottom: Platform.OS === 'android' ? 4 : 0,
    alignItems: 'center'
  },
  footerButton: { flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' },
  footerButtonText: { color: '#94A3B8', fontSize: 19, fontWeight: '500' },
  footerButtonTextActive: { color: '#D4A25F', fontWeight: 'bold' },
  botaoFlutuanteBase: {
    position: 'absolute',
    bottom: 115,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 10,
    backgroundColor: '#D4A25F',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1E293B',
    padding: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%'
  },
  modalTitle: { color: '#D4A25F', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#0F172A', color: '#FFFFFF', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, marginBottom: 15, fontSize: 16 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputArea: { height: 80, textAlignVertical: 'top' },
  modalBotoes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingBottom: 15 },
  btnCancelar: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#334155', marginRight: 10, alignItems: 'center' },
  btnCancelarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  btnSalvar: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#D4A25F', alignItems: 'center' },
  btnSalvarTexto: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },

  // --- NOVOS ESTILOS DO SISTEMA DE PASTAS (NEST EGG) ---
  nestBreadcrumbBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  nestBreadcrumbHome: { color: '#E2E8F0', fontSize: 18 },
  nestBreadcrumbSeparator: { color: '#64748B', fontSize: 18, marginHorizontal: 8 },
  nestBreadcrumbText: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
  nestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  nestIconContainer: { width: 45, height: 45, backgroundColor: '#334155', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  nestIcon: { fontSize: 24 },
  nestBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#8B5CF6', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1E293B' },
  nestBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  nestItemBody: { flex: 1 },
  nestTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
  nestSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  nestMenuBtn: { padding: 5, justifyContent: 'center', alignItems: 'center' },
  nestMenuText: { color: '#94A3B8', fontSize: 22, fontWeight: 'bold', lineHeight: 22 },
});