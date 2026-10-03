import { avisar } from '../utils/avisar';
import { useState, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { removerAcentos } from '../utils/formatters';
import { exportarParaPDF } from '../services/pdfService';
import { salvarMovimentacao, novaOperacaoId, carregarHistorico } from '../services/cautelaService';

// 🔥 Função única de conversão de data "dd/mm/aaaa" -> timestamp.
// Antes essa mesma lógica estava duplicada (ordenação e filtro de período),
// o que é um risco: uma correção futura em um lugar e não no outro geraria
// bugs sutis de datas. Agora só existe uma versão para manter.
function converterDataBR(dataString) {
    if (!dataString) return 0;
    const partes = dataString.split('/');
    if (partes.length !== 3) return 0;
    const dataObj = new Date(partes[2], partes[1] - 1, partes[0]);
    return isNaN(dataObj.getTime()) ? 0 : dataObj.getTime();
}

function mensagemErroEstoque(error, acaoPadrao) {
    if (error?.message?.startsWith('MATERIAL_INEXISTENTE|')) {
        return `O material "${error.message.split('|')[1]}" não existe mais no estoque. Atualize a tela e tente novamente.`;
    }
    if (error?.message?.startsWith('SALDO_INSUFICIENTE|')) {
        const [, nome, disponivel] = error.message.split('|');
        return `Há somente ${disponivel} unidade(s) de "${nome}" disponível(is).`;
    }
    if (error?.message === 'CAUTELA_INEXISTENTE') {
        return 'A cautela não existe mais. Atualize a tela e tente novamente.';
    }
    return acaoPadrao;
}

// Hook responsável por tudo que envolve o Livro de Cautelas:
// dados do Firestore, formulário de nova cautela, assinatura/devolução,
// filtro de período e exportação em PDF.
export function useCautelas() {
    const [listaCautelas, setListaCautelas] = useState([]);
    const [isExportando, setIsExportando] = useState(false);
    const [pesquisa, setPesquisa] = useState('');
    const [avisoSemResultados, setAvisoSemResultados] = useState('');

    const [responsavelExclusao, setResponsavelExclusao] = useState('');
    const responsavelExclusaoRef = useRef('');
    responsavelExclusaoRef.current = responsavelExclusao;
    const [modalConfirmacaoCautela, setModalConfirmacaoCautela] = useState(false);
    const [dadosConfirmacaoCautela, setDadosConfirmacaoCautela] = useState({ titulo: '', msg: '', acao: null });

    // --- FORMULÁRIO DE NOVA CAUTELA ---
    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoMilitar, setNovoMilitar] = useState('');
    const [novaOm, setNovaOm] = useState('');
    // 🔥 Agora suporta múltiplos materiais numa mesma cautela (antes era 1 campo só).
    const [materiaisCautela, setMateriaisCautela] = useState([{ nome: '', quantidade: '' }]);
    const [previsaoDevolucao, setPrevisaoDevolucao] = useState('');
    const operacaoIdRef = useRef(null);
    const [novaObs, setNovaObs] = useState('');
    const [novoMilSecOpCautela, setNovoMilSecOpCautela] = useState('');
    const aoCriarCautelaRef = useRef(null);
    const operacaoEmAndamentoRef = useRef(false);

    const abrirNovaCautela = () => {
        operacaoIdRef.current = novaOperacaoId(db);
        aoCriarCautelaRef.current = null;
        setModalVisivel(true);
    };

    const fecharNovaCautela = () => {
        aoCriarCautelaRef.current = null;
        setModalVisivel(false);
    };

    const iniciarCautelaComMateriais = (materiais, aoSalvarComSucesso = null) => {
        const linhas = Array.isArray(materiais)
            ? materiais
                .filter(material => String(material?.nome ?? material?.item ?? '').trim() !== '')
                .map(material => ({
                    ...material,
                    nome: String(material.nome ?? material.item).trim(),
                    quantidade: String(material.quantidadeCautela ?? material.quantidade ?? '1')
                }))
            : [];

        if (linhas.length === 0) {
            avisar('Atenção', 'Selecione pelo menos um material válido.');
            return false;
        }

        operacaoIdRef.current = novaOperacaoId(db);
        setMateriaisCautela(linhas);
        aoCriarCautelaRef.current =
            typeof aoSalvarComSucesso === 'function' ? aoSalvarComSucesso : null;
        setModalVisivel(true);
        return true;
    };

    const adicionarLinhaMaterial = () => {
        setMateriaisCautela(prev => [...prev, { nome: '', quantidade: '' }]);
    };
    const removerLinhaMaterial = (index) => {
        setMateriaisCautela(prev => prev.filter((_, i) => i !== index));
    };
    const atualizarLinhaMaterial = (index, campo, valor) => {
        setMateriaisCautela(prev => prev.map((item, i) => {
            if (i !== index) return item;

            // Se o nome de um item vindo do estoque for alterado manualmente,
            // ele deixa de apontar para aquele registro para não salvar um vínculo incorreto.
            if (campo === 'nome' && item.materialId && valor.trim() !== item.nome.trim()) {
                const {
                    materialId,
                    estoqueDisponivel,
                    caminhoEstoque,
                    caminhoExibicao,
                    ...linhaManual
                } = item;
                return { ...linhaManual, nome: valor };
            }

            return { ...item, [campo]: valor };
        }));
    };

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
            dados.sort((a, b) => converterDataBR(b.dataCautela) - converterDataBR(a.dataCautela));

            setListaCautelas(dados.filter(c => !c.excluida));
        }, (error) => {
            console.error("Erro ao buscar Cautelas: ", error);
            avisar("Erro", "Não foi possível sincronizar as cautelas.");
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
            msg: `Deseja realmente excluir a cautela de ${cautela.militar}? Se ela estiver ativa, os materiais serão devolvidos ao estoque.`,
            acao: async () => {
                setModalConfirmacaoCautela(false);
                try {
                    await excluirCautelaComEstoque(cautela.id);
                    avisar('Sucesso', 'Cautela excluída e estoque atualizado.');
                } catch (error) {
                    console.error(error);
                    avisar(
                        'Erro',
                        mensagemErroEstoque(error, 'Não foi possível excluir a cautela.')
                    );
                }
            }
        });
        setModalConfirmacaoCautela(true);
    };

    const solicitarExclusaoTodas = () => {
        setDadosConfirmacaoCautela({
            titulo: "⚠️ Limpeza Mensal",
            msg: "Tem certeza que deseja excluir TODAS as cautelas? Os materiais das cautelas ativas serão devolvidos ao estoque.",
            acao: async () => {
                setModalConfirmacaoCautela(false);
                try {
                    for (const cautela of listaCautelas) {
                        await excluirCautelaComEstoque(cautela.id);
                    }
                    avisar('Sucesso', 'Todas as cautelas foram excluídas e o estoque foi atualizado.');
                } catch (error) {
                    console.error(error);
                    avisar(
                        'Erro',
                        mensagemErroEstoque(
                            error,
                            'A limpeza foi interrompida. Algumas cautelas podem já ter sido excluídas; atualize a tela antes de tentar novamente.'
                        )
                    );
                }
            }
        });
        setModalConfirmacaoCautela(true);
    };

    async function excluirCautelaComEstoque(cautelaId) {
        const operador = responsavelExclusaoRef.current.trim();
        if (!operador) throw new Error('Informe o responsável pela exclusão no Livro.');
        await salvarMovimentacao(db, { tipo: 'excluir', cautelaId, operacaoId: novaOperacaoId(db), operador,
            uid: auth.currentUser?.uid, dataHoje: new Date().toLocaleDateString('pt-BR'), observacao: 'Exclusão solicitada no Livro' });
    }

    const handleAssinatura = async (signature, operacaoForcada = null) => {
        if (operacaoEmAndamentoRef.current) return;
        const operacao = operacaoForcada || tipoOperacao;
        operacaoEmAndamentoRef.current = true;
        try {
            const id = operacaoIdRef.current || (operacaoIdRef.current = novaOperacaoId(db));
            if (operacao === 'criar') {
                await salvarMovimentacao(db, { tipo: 'criar', operacaoId: id,
                    operador: novoMilSecOpCautela, uid: auth.currentUser?.uid, assinatura: signature,
                    militar: novoMilitar, om: novaOm, observacao: novaObs, previsaoDevolucao,
                    dataCautela: dataSelecionada.toLocaleDateString('pt-BR'),
                    itens: materiaisCautela.filter(m => String(m.nome || '').trim()) });
                setNovoMilitar(''); setNovaOm(''); setNovaObs(''); setPrevisaoDevolucao('');
                setMateriaisCautela([{ nome: '', quantidade: '' }]); setNovoMilSecOpCautela('');
                aoCriarCautelaRef.current?.(); aoCriarCautelaRef.current = null;
            } else if (operacao === 'assinar_pendente') {
                const c = listaCautelas.find(c => c.id === idCautelaParaAssinar);
                await salvarMovimentacao(db, { tipo: 'assinar', operacaoId: id, cautelaId: idCautelaParaAssinar,
                    operador: c?.milSecOpCautela || 'Responsável pela assinatura presencial', uid: auth.currentUser?.uid, assinatura: signature });
            } else {
                throw new Error('Abra a devolução pela aba Pendentes e selecione as quantidades.');
            }
            operacaoIdRef.current = null;
            setModalAssinatura(false); setModalVisivel(false);
            avisar('Sucesso', 'Registro salvo.');
        } catch (error) {
            avisar('Não foi possível salvar', error.message || 'Confira a conexão e tente novamente.');
            if (operacao === 'criar') { setModalAssinatura(false); setModalVisivel(true); }
        } finally { operacaoEmAndamentoRef.current = false; }
    };

    const exportarComHistorico = async lista => {
        if (isExportando) return;
        setIsExportando(true);
        const janela = Platform.OS === 'web' ? window.open('', '_blank') : null;
        if (janela) janela.document.body.textContent = 'Preparando o PDF com histórico…';
        try {
            const completos = [];
            for (const c of lista) completos.push({ ...c, historico: await carregarHistorico(db, c.id) });
            await exportarParaPDF(completos, false, setIsExportando, janela);
        } catch (e) { janela?.close(); avisar('PDF não gerado', 'Não foi possível carregar o histórico completo. Confira a conexão.'); }
        finally { setIsExportando(false); }
    };

    const abrirMenuExportacao = () => {
        setModalExportacaoVisivel(true);
    };

    const exportarTodas = () => {
        setModalExportacaoVisivel(false);
        exportarComHistorico(listaCautelas);
    };

    const abrirSelecaoPeriodo = () => {
        setModalExportacaoVisivel(false);
        setModalPeriodoVisivel(true); // Abre o nosso novo visual
    };

    const gerarRelatorioFiltrado = (inicio, fim) => {
        const inicioObj = new Date(inicio); inicioObj.setHours(0, 0, 0, 0);
        const fimObj = new Date(fim); fimObj.setHours(23, 59, 59, 999);

        const filtradas = listaCautelas.filter(c => {
            const dataCautelaMs = converterDataBR(c.dataCautela);
            if (dataCautelaMs === 0) return false;
            return dataCautelaMs >= inicioObj.getTime() && dataCautelaMs <= fimObj.getTime();
        });

        if (filtradas.length === 0) {
            // Em vez do Alert, define a mensagem e faz ela sumir após 4 segundos
            setAvisoSemResultados("Nenhuma cautela encontrada neste período.");
            setTimeout(() => setAvisoSemResultados(''), 4000);
        } else {
            setAvisoSemResultados('');
            exportarComHistorico(filtradas);
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
        listaCautelas, isExportando, previsaoDevolucao, setPrevisaoDevolucao, exportarComHistorico,
        pesquisa, setPesquisa,
        modalVisivel, setModalVisivel,
        abrirNovaCautela, fecharNovaCautela, iniciarCautelaComMateriais,
        novoMilitar, setNovoMilitar,
        novaOm, setNovaOm,
        materiaisCautela, adicionarLinhaMaterial, removerLinhaMaterial, atualizarLinhaMaterial,
        selecionarMaterial: m => setMateriaisCautela(prev => [...prev.filter(i => i.nome.trim()), m]),
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
        modalConfirmacaoCautela, setModalConfirmacaoCautela, responsavelExclusao, setResponsavelExclusao,
        dadosConfirmacaoCautela,
        handleAssinatura,
        abrirMenuExportacao,
        cautelasFiltradas,
        cautelasPendentes,
        modalExportacaoVisivel, setModalExportacaoVisivel,
        exportarTodas, abrirSelecaoPeriodo
    };
}
