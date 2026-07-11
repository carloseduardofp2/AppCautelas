import { useState, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, writeBatch } from 'firebase/firestore';
import { removerAcentos } from '../utils/formatters';
import { exportarParaPDF } from '../services/pdfService';

// Hook responsável por tudo que envolve o Livro de Cautelas:
// dados do Firestore, formulário de nova cautela, assinatura/devolução,
// filtro de período e exportação em PDF.
export function useCautelas() {
    const [listaCautelas, setListaCautelas] = useState([]);
    const [isExportando, setIsExportando] = useState(false);
    const [pesquisa, setPesquisa] = useState('');
    const [avisoSemResultados, setAvisoSemResultados] = useState('');

    const [modalConfirmacaoCautela, setModalConfirmacaoCautela] = useState(false);
    const [dadosConfirmacaoCautela, setDadosConfirmacaoCautela] = useState({ titulo: '', msg: '', acao: null });

    // --- FORMULÁRIO DE NOVA CAUTELA ---
    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoMilitar, setNovoMilitar] = useState('');
    const [novaOm, setNovaOm] = useState('');
    const [novoMaterial, setNovoMaterial] = useState('');
    const [novaQtd, setNovaQtd] = useState('');
    const [novaObs, setNovaObs] = useState('');
    const [novoMilSecOpCautela, setNovoMilSecOpCautela] = useState('');

    // --- ASSINATURA / DEVOLUÇÃO ---
    const [tipoOperacao, setTipoOperacao] = useState('');
    const [idCautelaParaAssinar, setIdCautelaParaAssinar] = useState(null);
    const refAssinatura = useRef();
    const [modalAssinatura, setModalAssinatura] = useState(false);
    const [scrollModalHabilitado, setScrollModalHabilitado] = useState(true);
    const [novaObsEntrega, setNovaObsEntrega] = useState('');
    const [novoMilSecOp, setNovoMilSecOp] = useState('');

    // --- CALENDÁRIO / FILTRO DE PERÍODO ---
    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [dataInicio, setDataInicio] = useState(new Date());
    const [dataFim, setDataFim] = useState(new Date());
    const [statusFiltro, setStatusFiltro] = useState(null);

    const [modalPeriodoVisivel, setModalPeriodoVisivel] = useState(false);

    const [modalExportacaoVisivel, setModalExportacaoVisivel] = useState(false);

    // --- CONEXÃO EM TEMPO REAL COM O FIRESTORE ---
    useEffect(() => {
        const qCautelas = query(collection(db, 'cautelas'));
        const unsubscribeCautelas = onSnapshot(qCautelas, (snapshot) => {
            const dados = snapshot.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));

            // Ordenação Cronológica (Mais recentes no topo)
            dados.sort((a, b) => {
                const converterDataParaNumero = (dataString) => {
                    if (!dataString) return 0;
                    const partes = dataString.split('/');
                    if (partes.length !== 3) return 0;
                    return new Date(partes[2], partes[1] - 1, partes[0]).getTime();
                };
                return converterDataParaNumero(b.dataCautela) - converterDataParaNumero(a.dataCautela);
            });

            setListaCautelas(dados);
        }, (error) => {
            console.error("Erro ao buscar Cautelas: ", error);
            Alert.alert("Erro", "Não foi possível sincronizar as cautelas.");
        });

        return () => unsubscribeCautelas();
    }, []);

    const aoMudarData = (event, dataEscolhida) => {
        if (event.type === 'dismissed') {
            setMostrarCalendario(false);
            setStatusFiltro(null);
            return;
        }

        setMostrarCalendario(false);
        if (!dataEscolhida) return;

        if (statusFiltro === 'inicio') {
            setDataInicio(dataEscolhida);
            setStatusFiltro('fim');
            setTimeout(() => setMostrarCalendario(true), 300);
        }
        else if (statusFiltro === 'fim') {
            setDataFim(dataEscolhida);
            setStatusFiltro(null);
            gerarRelatorioFiltrado(dataInicio, dataEscolhida);
        }
        else {
            setDataSelecionada(dataEscolhida);
        }
    };

    const solicitarExclusao = (cautela) => {
        setDadosConfirmacaoCautela({
            titulo: "Excluir Cautela",
            msg: `Deseja realmente excluir a cautela de ${cautela.militar}?`,
            acao: async () => {
                setModalConfirmacaoCautela(false);
                try {
                    await deleteDoc(doc(db, 'cautelas', cautela.id));
                } catch (error) {
                    console.error(error);
                }
            }
        });
        setModalConfirmacaoCautela(true);
    };

    const solicitarExclusaoTodas = () => {
        setDadosConfirmacaoCautela({
            titulo: "⚠️ Limpeza Mensal",
            msg: "Tem certeza que deseja excluir TODAS as cautelas? Esta ação é irreversível.",
            acao: async () => {
                setModalConfirmacaoCautela(false);
                try {
                    const batch = writeBatch(db);
                    listaCautelas.forEach((cautela) => {
                        const ref = doc(db, 'cautelas', cautela.id);
                        batch.delete(ref);
                    });
                    await batch.commit();
                } catch (error) {
                    console.error(error);
                }
            }
        });
        setModalConfirmacaoCautela(true);
    };  

    const handleAssinatura = async (signature, operacaoForcada = null) => {
        const operacao = operacaoForcada || tipoOperacao;

        if (operacao === 'criar') {
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
                setModalAssinatura(false);
                setNovoMilitar(''); setNovaOm(''); setNovoMaterial(''); setNovaQtd(''); setNovaObs(''); setNovoMilSecOpCautela('');
                Alert.alert("Sucesso", "Cautela registrada no sistema!");
            } catch (error) {
                console.error("Erro ao salvar cautela: ", error);
                Alert.alert("Erro", "Não foi possível salvar a cautela.");
            }

        } else if (operacao === 'assinar_pendente') {
            try {
                const docRef = doc(db, 'cautelas', idCautelaParaAssinar);
                await updateDoc(docRef, {
                    assinaturaCautela: signature
                });
                setModalAssinatura(false);
                Alert.alert("Sucesso", "Assinatura colhida com sucesso!");
            } catch (error) {
                console.error(error);
                Alert.alert("Erro", "Falha ao salvar assinatura tardia.");
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
                setModalAssinatura(false);
                setNovoMilSecOp('');
                setNovaObsEntrega('');
                Alert.alert("Sucesso", "Baixa realizada!");
            } catch (error) {
                console.error(error);
                Alert.alert("Erro", "Não foi possível registrar a devolução.");
            }
        }
    };

    const abrirMenuExportacao = () => {
        setModalExportacaoVisivel(true);
    };

    const exportarTodas = () => {
        setModalExportacaoVisivel(false);
        exportarParaPDF(listaCautelas, isExportando, setIsExportando);
    };

    const abrirSelecaoPeriodo = () => {
        setModalExportacaoVisivel(false);
        setModalPeriodoVisivel(true); // Abre o nosso novo visual
    };

    const gerarRelatorioFiltrado = (inicio, fim) => {
        const inicioObj = new Date(inicio); inicioObj.setHours(0, 0, 0, 0);
        const fimObj = new Date(fim); fimObj.setHours(23, 59, 59, 999);

        const filtradas = listaCautelas.filter(c => {
            if (!c.dataCautela) return false;
            const partes = c.dataCautela.split('/');
            if (partes.length !== 3) return false;
            const dataCautelaObj = new Date(partes[2], partes[1] - 1, partes[0]);
            if (isNaN(dataCautelaObj.getTime())) return false;
            return dataCautelaObj >= inicioObj && dataCautelaObj <= fimObj;
        });

        if (filtradas.length === 0) {
            // Em vez do Alert, define a mensagem e faz ela sumir após 4 segundos
            setAvisoSemResultados("Nenhuma cautela encontrada neste período.");
            setTimeout(() => setAvisoSemResultados(''), 4000); 
        } else {
            setAvisoSemResultados('');
            exportarParaPDF(filtradas, isExportando, setIsExportando);
        }   
    };

    const cautelasFiltradas = listaCautelas.filter(cautela => {
        const termo = removerAcentos(pesquisa);
        const militar = removerAcentos(cautela.militar || '');
        const om = removerAcentos(cautela.om || '');
        const material = removerAcentos(cautela.material || '');
        const data = cautela.dataCautela || '';

        return militar.includes(termo) || om.includes(termo) || material.includes(termo) || data.includes(pesquisa);
    });

    const cautelasPendentes = listaCautelas.filter(cautela => !cautela.dataEntrega || !cautela.assinaturaDevolucao);

    return {
        listaCautelas, isExportando,
        pesquisa, setPesquisa,
        modalVisivel, setModalVisivel,
        novoMilitar, setNovoMilitar,
        novaOm, setNovaOm,
        novoMaterial, setNovoMaterial,
        novaQtd, setNovaQtd,
        novaObs, setNovaObs,
        novoMilSecOpCautela, setNovoMilSecOpCautela,
        tipoOperacao, setTipoOperacao,
        idCautelaParaAssinar, setIdCautelaParaAssinar,
        refAssinatura,
        modalAssinatura, setModalAssinatura,
        scrollModalHabilitado, setScrollModalHabilitado,
        novaObsEntrega, setNovaObsEntrega,
        novoMilSecOp, setNovoMilSecOp,
        dataSelecionada, mostrarCalendario, setMostrarCalendario,
        dataInicio, setDataInicio,
        dataFim, setDataFim,
        statusFiltro, setStatusFiltro,
        modalPeriodoVisivel, setModalPeriodoVisivel,
        avisoSemResultados, setAvisoSemResultados,
        gerarRelatorioFiltrado,
        aoMudarData,
        solicitarExclusao, solicitarExclusaoTodas,
        modalConfirmacaoCautela, setModalConfirmacaoCautela, 
        dadosConfirmacaoCautela,
        handleAssinatura,
        abrirMenuExportacao,
        cautelasFiltradas,
        cautelasPendentes,
        modalExportacaoVisivel, setModalExportacaoVisivel,
        exportarTodas, abrirSelecaoPeriodo
    };
}