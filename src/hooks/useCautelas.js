import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, updateDoc, doc, query, runTransaction } from 'firebase/firestore';
import { removerAcentos } from '../utils/formatters';
import { exportarParaPDF } from '../services/pdfService';

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

function obterMateriaisVinculados(cautela) {
    if (!Array.isArray(cautela?.materiais)) return [];

    return cautela.materiais
        .filter(material => material?.materialId)
        .map(material => ({
            materialId: material.materialId,
            nome: String(material.nome || 'Material').trim(),
            quantidade: Number(material.quantidade)
        }))
        .filter(material => Number.isFinite(material.quantidade) && material.quantidade > 0);
}

function agruparMateriaisVinculados(materiais) {
    const grupos = new Map();

    materiais.forEach(material => {
        if (!material.materialId) return;
        const atual = grupos.get(material.materialId);
        if (atual) {
            atual.quantidade += Number(material.quantidade);
        } else {
            grupos.set(material.materialId, {
                materialId: material.materialId,
                nome: material.nome,
                quantidade: Number(material.quantidade)
            });
        }
    });

    return [...grupos.values()];
}

function normalizarMateriaisParaSalvar(materiais) {
    return materiais.map(material => {
        const linha = {
            nome: String(material.nome || '').trim(),
            quantidade: Number(material.quantidade)
        };

        if (material.materialId) {
            linha.materialId = material.materialId;
            linha.estoqueControlado = true;
            if (Array.isArray(material.caminhoEstoque)) {
                linha.caminhoEstoque = material.caminhoEstoque;
            }
            if (material.caminhoExibicao) {
                linha.caminhoExibicao = material.caminhoExibicao;
            }
        }

        return linha;
    });
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

    const [modalConfirmacaoCautela, setModalConfirmacaoCautela] = useState(false);
    const [dadosConfirmacaoCautela, setDadosConfirmacaoCautela] = useState({ titulo: '', msg: '', acao: null });

    // --- FORMULÁRIO DE NOVA CAUTELA ---
    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoMilitar, setNovoMilitar] = useState('');
    const [novaOm, setNovaOm] = useState('');
    // 🔥 Agora suporta múltiplos materiais numa mesma cautela (antes era 1 campo só).
    const [materiaisCautela, setMateriaisCautela] = useState([{ nome: '', quantidade: '' }]);
    const [novaObs, setNovaObs] = useState('');
    const [novoMilSecOpCautela, setNovoMilSecOpCautela] = useState('');
    const aoCriarCautelaRef = useRef(null);
    const operacaoEmAndamentoRef = useRef(false);

    const abrirNovaCautela = () => {
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
            Alert.alert('Atenção', 'Selecione pelo menos um material válido.');
            return false;
        }

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
        setMateriaisCautela(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
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
            msg: `Deseja realmente excluir a cautela de ${cautela.militar}? Se ela estiver ativa, os materiais serão devolvidos ao estoque.`,
            acao: async () => {
                setModalConfirmacaoCautela(false);
                try {
                    await excluirCautelaComEstoque(cautela.id);
                    Alert.alert('Sucesso', 'Cautela excluída e estoque atualizado.');
                } catch (error) {
                    console.error(error);
                    Alert.alert(
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
                    Alert.alert('Sucesso', 'Todas as cautelas foram excluídas e o estoque foi atualizado.');
                } catch (error) {
                    console.error(error);
                    Alert.alert(
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
        await runTransaction(db, async transaction => {
            const cautelaRef = doc(db, 'cautelas', cautelaId);
            const cautelaSnapshot = await transaction.get(cautelaRef);
            if (!cautelaSnapshot.exists()) return;

            const cautela = cautelaSnapshot.data();
            const deveRetornarEstoque =
                !cautela.dataEntrega &&
                cautela.estoqueBaixado === true &&
                cautela.estoqueDevolvido !== true;
            const materiais = deveRetornarEstoque
                ? agruparMateriaisVinculados(obterMateriaisVinculados(cautela))
                : [];
            const snapshotsMateriais = [];

            for (const material of materiais) {
                const materialRef = doc(db, 'materiais', material.materialId);
                const materialSnapshot = await transaction.get(materialRef);
                if (!materialSnapshot.exists()) {
                    throw new Error(`MATERIAL_INEXISTENTE|${material.nome}`);
                }
                snapshotsMateriais.push({ material, materialRef, materialSnapshot });
            }

            snapshotsMateriais.forEach(({ material, materialRef, materialSnapshot }) => {
                const dados = materialSnapshot.data();
                const disponivel = Number(dados.quantidade) || 0;
                const cautelada = Number(dados.quantidadeCautelada) || 0;

                transaction.update(materialRef, {
                    quantidade: disponivel + material.quantidade,
                    quantidadeCautelada: Math.max(0, cautelada - material.quantidade),
                    quantidadeTotal: Number.isFinite(Number(dados.quantidadeTotal))
                        ? Number(dados.quantidadeTotal)
                        : disponivel + cautelada
                });
            });

            transaction.delete(cautelaRef);
        });
    }

    const handleAssinatura = async (signature, operacaoForcada = null) => {
        if (operacaoEmAndamentoRef.current) return;
        const operacao = operacaoForcada || tipoOperacao;

        if (operacao === 'criar') {
            // 🔥 Valida cada linha de material: nome preenchido e quantidade numérica > 0.
            const materiaisValidos = materiaisCautela.filter(
                m => String(m?.nome ?? '').trim() !== ''
            );
            if (materiaisValidos.length === 0) {
                Alert.alert('Atenção', 'Adicione ao menos um material.');
                return;
            }
            for (const m of materiaisValidos) {
                const quantidade = Number(m.quantidade);
                if (!Number.isFinite(quantidade) || quantidade <= 0) {
                    Alert.alert('Atenção', `Quantidade inválida para "${m.nome}". Informe um número maior que zero.`);
                    return;
                }
                if (
                    m.estoqueDisponivel !== undefined &&
                    quantidade > Number(m.estoqueDisponivel)
                ) {
                    Alert.alert(
                        'Quantidade indisponível',
                        `Há somente ${m.estoqueDisponivel} unidade(s) de "${m.nome}" no estoque.`
                    );
                    return;
                }
            }

            const materiaisNormalizados = normalizarMateriaisParaSalvar(materiaisValidos);
            const materiaisVinculados = agruparMateriaisVinculados(materiaisNormalizados);
            const novaCautela = {
                militar: novoMilitar,
                om: novaOm.trim() || 'Não informada',
                // materiais: fonte de verdade (lista); material/quantidade: strings
                // "resumo" mantidas por compatibilidade com telas antigas e busca.
                materiais: materiaisNormalizados,
                material: materiaisNormalizados.map(m => m.nome).join(', '),
                quantidade: materiaisNormalizados.map(m => String(m.quantidade)).join(', '),
                observacao: novaObs,
                dataCautela: dataSelecionada.toLocaleDateString('pt-BR'),
                milSecOpCautela: novoMilSecOpCautela,
                assinaturaCautela: signature,
                dataEntrega: '',
                obsEntrega: '',
                milSecOp: '',
                assinaturaDevolucao: '',
                estoqueBaixado: materiaisVinculados.length > 0,
                estoqueDevolvido: false
            };

            operacaoEmAndamentoRef.current = true;
            try {
                const cautelaRef = doc(collection(db, 'cautelas'));

                await runTransaction(db, async transaction => {
                    const snapshotsMateriais = [];

                    for (const material of materiaisVinculados) {
                        const materialRef = doc(db, 'materiais', material.materialId);
                        const materialSnapshot = await transaction.get(materialRef);
                        if (!materialSnapshot.exists()) {
                            throw new Error(`MATERIAL_INEXISTENTE|${material.nome}`);
                        }
                        snapshotsMateriais.push({ material, materialRef, materialSnapshot });
                    }

                    snapshotsMateriais.forEach(({ material, materialRef, materialSnapshot }) => {
                        const dados = materialSnapshot.data();
                        const disponivel = Number(dados.quantidade);

                        if (!Number.isFinite(disponivel) || disponivel < material.quantidade) {
                            throw new Error(
                                `SALDO_INSUFICIENTE|${material.nome}|${Number.isFinite(disponivel) ? disponivel : 0}`
                            );
                        }

                        const cautelada = Number(dados.quantidadeCautelada) || 0;
                        transaction.update(materialRef, {
                            quantidade: disponivel - material.quantidade,
                            quantidadeCautelada: cautelada + material.quantidade,
                            quantidadeTotal: Number.isFinite(Number(dados.quantidadeTotal))
                                ? Number(dados.quantidadeTotal)
                                : disponivel + cautelada
                        });
                    });

                    transaction.set(cautelaRef, novaCautela);
                });

                setModalAssinatura(false);
                setNovoMilitar(''); setNovaOm(''); setMateriaisCautela([{ nome: '', quantidade: '' }]); setNovaObs(''); setNovoMilSecOpCautela('');
                const aoCriarCautela = aoCriarCautelaRef.current;
                aoCriarCautelaRef.current = null;
                aoCriarCautela?.();
                Alert.alert("Sucesso", "Cautela registrada no sistema!");
            } catch (error) {
                console.error("Erro ao salvar cautela: ", error);
                setModalAssinatura(false);
                setModalVisivel(true);
                Alert.alert(
                    "Erro",
                    mensagemErroEstoque(error, "Não foi possível salvar a cautela.")
                );
            } finally {
                operacaoEmAndamentoRef.current = false;
            }

        } else if (operacao === 'assinar_pendente') {
            operacaoEmAndamentoRef.current = true;
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
            } finally {
                operacaoEmAndamentoRef.current = false;
            }

        } else {
            if (novoMilSecOp.trim() === '') {
                Alert.alert("Atenção", "Informe qual militar da Sec Op está recebendo o material!");
                return;
            }
            const dataHoje = new Date().toLocaleDateString('pt-BR');
            operacaoEmAndamentoRef.current = true;
            try {
                const resultado = await runTransaction(db, async transaction => {
                    const cautelaRef = doc(db, 'cautelas', idCautelaParaAssinar);
                    const cautelaSnapshot = await transaction.get(cautelaRef);
                    if (!cautelaSnapshot.exists()) throw new Error('CAUTELA_INEXISTENTE');

                    const cautela = cautelaSnapshot.data();
                    if (cautela.dataEntrega) return { jaBaixada: true };

                    const deveRetornarEstoque =
                        cautela.estoqueBaixado === true &&
                        cautela.estoqueDevolvido !== true;
                    const materiais = deveRetornarEstoque
                        ? agruparMateriaisVinculados(obterMateriaisVinculados(cautela))
                        : [];
                    const snapshotsMateriais = [];

                    for (const material of materiais) {
                        const materialRef = doc(db, 'materiais', material.materialId);
                        const materialSnapshot = await transaction.get(materialRef);
                        if (!materialSnapshot.exists()) {
                            throw new Error(`MATERIAL_INEXISTENTE|${material.nome}`);
                        }
                        snapshotsMateriais.push({ material, materialRef, materialSnapshot });
                    }

                    snapshotsMateriais.forEach(({ material, materialRef, materialSnapshot }) => {
                        const dados = materialSnapshot.data();
                        const disponivel = Number(dados.quantidade) || 0;
                        const cautelada = Number(dados.quantidadeCautelada) || 0;

                        transaction.update(materialRef, {
                            quantidade: disponivel + material.quantidade,
                            quantidadeCautelada: Math.max(0, cautelada - material.quantidade),
                            quantidadeTotal: Number.isFinite(Number(dados.quantidadeTotal))
                                ? Number(dados.quantidadeTotal)
                                : disponivel + cautelada
                        });
                    });

                    transaction.update(cautelaRef, {
                        dataEntrega: dataHoje,
                        obsEntrega: novaObsEntrega,
                        milSecOp: novoMilSecOp,
                        assinaturaDevolucao: signature,
                        estoqueDevolvido: deveRetornarEstoque
                    });

                    return { jaBaixada: false };
                });

                if (resultado?.jaBaixada) {
                    setModalAssinatura(false);
                    Alert.alert("Atenção", "Esta cautela já recebeu baixa.");
                    return;
                }

                setModalAssinatura(false);
                setNovoMilSecOp('');
                setNovaObsEntrega('');
                Alert.alert("Sucesso", "Baixa realizada!");
            } catch (error) {
                console.error(error);
                Alert.alert(
                    "Erro",
                    mensagemErroEstoque(error, "Não foi possível registrar a devolução.")
                );
            } finally {
                operacaoEmAndamentoRef.current = false;
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
        abrirNovaCautela, fecharNovaCautela, iniciarCautelaComMateriais,
        novoMilitar, setNovoMilitar,
        novaOm, setNovaOm,
        materiaisCautela, adicionarLinhaMaterial, removerLinhaMaterial, atualizarLinhaMaterial,
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
