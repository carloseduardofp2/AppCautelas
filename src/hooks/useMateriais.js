import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../services/firebaseConfig';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { removerAcentos } from '../utils/formatters';

const LOCAL_NAO_INFORMADO = 'Não informado';
const SEPARADOR_CAMINHO = ' › ';
const LIMITE_OPERACOES_LOTE = 400;

const limparSegmento = (valor) => String(valor ?? '').trim().replace(/\s+/g, ' ');
const chaveCaminho = (caminho) => JSON.stringify(caminho);
const caminhosIguais = (a, b) => chaveCaminho(a) === chaveCaminho(b);
const caminhoEhPrefixo = (prefixo, caminho) =>
    prefixo.length <= caminho.length && prefixo.every((segmento, indice) => segmento === caminho[indice]);

function obterCaminhoRegistro(registro) {
    if (Array.isArray(registro?.path)) {
        return registro.path.map(limparSegmento).filter(Boolean);
    }

    const local = limparSegmento(registro?.localizacao);
    const subLocal = limparSegmento(registro?.subLocalizacao);

    if (!local || local === LOCAL_NAO_INFORMADO) return [];
    return subLocal ? [local, subLocal] : [local];
}

function obterCamposLegados(caminho) {
    return {
        localizacao: caminho[0] || LOCAL_NAO_INFORMADO,
        subLocalizacao: caminho.length > 1 ? caminho.slice(1).join(SEPARADOR_CAMINHO) : ''
    };
}

function compararTextos(a, b) {
    return removerAcentos(limparSegmento(a)).localeCompare(
        removerAcentos(limparSegmento(b)),
        'pt-BR'
    );
}

// Reserva de Materiais: sincronização, navegação hierárquica e movimentação.
// "path" é o formato principal. localizacao/subLocalizacao continuam sendo
// gravados para manter compatibilidade com telas, relatórios e dados antigos.
export function useMateriais(listaCautelas = []) {
    const [listaMateriais, setListaMateriais] = useState([]);
    const [pesquisaMateriais, setPesquisaMateriais] = useState('');
    const [caminhoMateriais, setCaminhoMateriais] = useState([]);

    // --- FORMULÁRIO DE MATERIAIS (CADASTRO) ---
    const [modalMateriaisVisivel, setModalMateriaisVisivel] = useState(false);
    const [matLocal, setMatLocal] = useState('');
    const [matSubLocal, setMatSubLocal] = useState('');
    const [matNome, setMatNome] = useState('');
    const [matQtd, setMatQtd] = useState('');
    const [matObs, setMatObs] = useState('');
    const [caminhoCadastroPreferido, setCaminhoCadastroPreferido] = useState([]);

    // --- EDIÇÃO DE MATERIAIS ---
    const [modalEditarMaterialVisivel, setModalEditarMaterialVisivel] = useState(false);
    const [idMaterialEditando, setIdMaterialEditando] = useState(null);
    const [editMatLocal, setEditMatLocal] = useState('');
    const [editMatSubLocal, setEditMatSubLocal] = useState('');
    const [editMatNome, setEditMatNome] = useState('');
    const [editMatQtd, setEditMatQtd] = useState('');
    const [editMatObs, setEditMatObs] = useState('');
    const [caminhoEdicaoOriginal, setCaminhoEdicaoOriginal] = useState([]);

    // --- ADIÇÃO E EDIÇÃO DE PRATELEIRAS ---
    const [modalTipoAdicaoVisivel, setModalTipoAdicaoVisivel] = useState(false);
    const [modalNovaPrateleiraVisivel, setModalNovaPrateleiraVisivel] = useState(false);
    const [nomeNovaPrateleira, setNomeNovaPrateleira] = useState('');
    const [modalEditarPastaVisivel, setModalEditarPastaVisivel] = useState(false);
    const [nomeEdicaoPasta, setNomeEdicaoPasta] = useState('');
    const [pastaSendoEditada, setPastaSendoEditada] = useState(null);

    // --- MENUS E CONFIRMAÇÕES ---
    const [menuVisivel, setMenuVisivel] = useState(false);
    const [itemMenu, setItemMenu] = useState(null);
    const [confirmacaoVisivel, setConfirmacaoVisivel] = useState(false);
    const [dadosConfirmacao, setDadosConfirmacao] = useState({ titulo: '', msg: '', acao: null });

    // --- SELEÇÃO, MOVIMENTAÇÃO E ENVIO PARA CAUTELA ---
    const [modoSelecao, setModoSelecao] = useState(false);
    const [itensSelecionados, setItensSelecionados] = useState([]);
    const [modalMoverVisivel, setModalMoverVisivel] = useState(false);
    const [caminhoDestinoMover, setCaminhoDestinoMover] = useState([]);
    const [pastaSendoMovida, setPastaSendoMovida] = useState(null);

    useEffect(() => {
        const unsubscribeMateriais = onSnapshot(collection(db, 'materiais'), (snapshot) => {
            const dados = snapshot.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));
            setListaMateriais(dados);
        }, (error) => {
            console.error('Erro ao buscar Materiais:', error);
            Alert.alert('Erro', 'Não foi possível sincronizar a reserva de materiais.');
        });

        return () => unsubscribeMateriais();
    }, []);

    function obterCautelasAtivasDoMaterial(materialId) {
        const porMilitar = new Map();

        listaCautelas
            .filter(cautela => !String(cautela?.dataEntrega || '').trim())
            .forEach(cautela => {
                if (!Array.isArray(cautela.materiais)) return;

                const quantidadeNaCautela = cautela.materiais
                    .filter(material => material?.materialId === materialId)
                    .reduce((total, material) => {
                        const quantidade = Number(material.quantidade);
                        return total + (Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0);
                    }, 0);

                if (quantidadeNaCautela <= 0) return;

                const militar = String(cautela.militar || 'Militar não informado').trim();
                const chave = removerAcentos(militar);
                const atual = porMilitar.get(chave);

                if (atual) {
                    atual.quantidade += quantidadeNaCautela;
                    atual.possuiRegistroAnterior =
                        atual.possuiRegistroAnterior || cautela.estoqueBaixado !== true;
                } else {
                    porMilitar.set(chave, {
                        militar,
                        om: cautela.om || '',
                        quantidade: quantidadeNaCautela,
                        possuiRegistroAnterior: cautela.estoqueBaixado !== true
                    });
                }
            });

        return [...porMilitar.values()].sort((a, b) => compararTextos(a.militar, b.militar));
    }

    function enriquecerMaterial(registro) {
        const cautelasAtivas = obterCautelasAtivasDoMaterial(registro.id);
        return {
            ...registro,
            cautelasAtivas,
            quantidadeCauteladaAtiva: cautelasAtivas.reduce(
                (total, cautela) => total + cautela.quantidade,
                0
            )
        };
    }

    function listarCaminhosDePastas(registros = listaMateriais) {
        const pastas = new Map();

        registros.forEach(registro => {
            const caminho = obterCaminhoRegistro(registro);

            // Cada segmento do endereço implica a existência de uma prateleira.
            // Isso mantém os documentos antigos visíveis mesmo antes da migração.
            caminho.forEach((_, indice) => {
                const prefixo = caminho.slice(0, indice + 1);
                pastas.set(chaveCaminho(prefixo), prefixo);
            });
        });

        return [...pastas.values()].sort((a, b) =>
            a.length - b.length || compararTextos(a.join(SEPARADOR_CAMINHO), b.join(SEPARADOR_CAMINHO))
        );
    }

    function resolverCaminhoFormulario(localInformado, subLocalInformado, caminhoPreferido = []) {
        const local = limparSegmento(localInformado);
        const subLocal = limparSegmento(subLocalInformado);

        if (!local || local === LOCAL_NAO_INFORMADO) return [];

        if (caminhoPreferido.length > 0) {
            const camposPreferidos = obterCamposLegados(caminhoPreferido);
            if (camposPreferidos.localizacao === local && camposPreferidos.subLocalizacao === subLocal) {
                return caminhoPreferido;
            }
        }

        const candidatos = listarCaminhosDePastas().filter(caminho => {
            const campos = obterCamposLegados(caminho);
            return campos.localizacao === local && campos.subLocalizacao === subLocal;
        });

        if (candidatos.length === 1) return candidatos[0];

        const segmentosSubLocal = subLocal
            ? subLocal.split('›').map(limparSegmento).filter(Boolean)
            : [];

        return [local, ...segmentosSubLocal];
    }

    function validarNomePrateleira(nome) {
        const nomeLimpo = limparSegmento(nome);

        if (!nomeLimpo) {
            Alert.alert('Atenção', 'Digite o nome da prateleira/local.');
            return null;
        }

        if (nomeLimpo.includes('›')) {
            Alert.alert('Atenção', 'O nome da prateleira não pode conter o caractere "›".');
            return null;
        }

        return nomeLimpo;
    }

    function pastaComMesmoNomeExiste(caminhoPai, nome, caminhoIgnorado = null, registros = listaMateriais) {
        const nomeComparacao = removerAcentos(nome);

        return listarCaminhosDePastas(registros).some(caminho => {
            if (caminhoIgnorado && caminhosIguais(caminho, caminhoIgnorado)) return false;
            if (!caminhosIguais(caminho.slice(0, -1), caminhoPai)) return false;
            return removerAcentos(caminho[caminho.length - 1]) === nomeComparacao;
        });
    }

    async function carregarRegistrosAtuais() {
        const snapshot = await getDocs(collection(db, 'materiais'));
        return snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));
    }

    async function executarOperacoesEmLotes(operacoes) {
        for (let inicio = 0; inicio < operacoes.length; inicio += LIMITE_OPERACOES_LOTE) {
            const lote = writeBatch(db);
            const grupo = operacoes.slice(inicio, inicio + LIMITE_OPERACOES_LOTE);

            grupo.forEach(({ id, dados, excluir }) => {
                const referencia = doc(db, 'materiais', id);
                if (excluir) lote.delete(referencia);
                else lote.update(referencia, dados);
            });

            await lote.commit();
        }
    }

    async function salvarNovoMaterial() {
        if (!matNome.trim() || !matQtd.trim()) {
            Alert.alert('Atenção', 'Nome do Item e Quantidade são obrigatórios!');
            return;
        }

        const quantidade = Number(matQtd);
        if (!Number.isFinite(quantidade) || quantidade < 0) {
            Alert.alert('Atenção', 'Quantidade inválida. Informe um número válido.');
            return;
        }

        const caminho = resolverCaminhoFormulario(
            matLocal,
            matSubLocal,
            caminhoCadastroPreferido
        );

        try {
            await addDoc(collection(db, 'materiais'), {
                ...obterCamposLegados(caminho),
                path: caminho,
                isFolder: false,
                item: matNome.trim(),
                quantidade,
                quantidadeCautelada: 0,
                quantidadeTotal: quantidade,
                observacao: matObs.trim()
            });

            setMatLocal('');
            setMatSubLocal('');
            setMatNome('');
            setMatQtd('');
            setMatObs('');
            setCaminhoCadastroPreferido([]);
            setModalMateriaisVisivel(false);
            Alert.alert('Sucesso', 'Material adicionado ao estoque!');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível cadastrar o material.');
        }
    }

    async function salvarNovaPrateleira() {
        const nome = validarNomePrateleira(nomeNovaPrateleira);
        if (!nome) return;

        if (pastaComMesmoNomeExiste(caminhoMateriais, nome)) {
            Alert.alert('Atenção', 'Já existe uma prateleira com esse nome neste local.');
            return;
        }

        const novoCaminho = [...caminhoMateriais, nome];

        try {
            await addDoc(collection(db, 'materiais'), {
                ...obterCamposLegados(novoCaminho),
                path: novoCaminho,
                isFolder: true,
                item: '',
                quantidade: 0,
                observacao: ''
            });

            setNomeNovaPrateleira('');
            setModalNovaPrateleiraVisivel(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível criar a prateleira.');
        }
    }

    function abrirCadastroMaterialContextual() {
        setModalTipoAdicaoVisivel(false);
        const campos = obterCamposLegados(caminhoMateriais);

        setTimeout(() => {
            setCaminhoCadastroPreferido(caminhoMateriais);
            setMatLocal(caminhoMateriais.length ? campos.localizacao : '');
            setMatSubLocal(campos.subLocalizacao);
            setMatNome('');
            setMatQtd('');
            setMatObs('');
            setModalMateriaisVisivel(true);
        }, 250);
    }

    function prepararEdicaoMaterial(material) {
        const caminho = obterCaminhoRegistro(material);
        const campos = obterCamposLegados(caminho);

        setIdMaterialEditando(material.id);
        setCaminhoEdicaoOriginal(caminho);
        setEditMatLocal(caminho.length ? campos.localizacao : '');
        setEditMatSubLocal(campos.subLocalizacao);
        setEditMatNome(material.item || '');
        setEditMatQtd(String(material.quantidade ?? 0));
        setEditMatObs(material.observacao || '');
        setModalEditarMaterialVisivel(true);
    }

    async function salvarEdicaoMaterial() {
        if (!editMatNome.trim() || !editMatQtd.trim()) {
            Alert.alert('Atenção', 'Nome do Item e Quantidade são obrigatórios!');
            return;
        }

        const quantidade = Number(editMatQtd);
        if (!Number.isFinite(quantidade) || quantidade < 0) {
            Alert.alert('Atenção', 'Quantidade inválida. Informe um número válido.');
            return;
        }

        const caminho = resolverCaminhoFormulario(
            editMatLocal,
            editMatSubLocal,
            caminhoEdicaoOriginal
        );
        const materialAtual = listaMateriais.find(material => material.id === idMaterialEditando);
        const quantidadeCautelada = Number(materialAtual?.quantidadeCautelada) || 0;

        try {
            await updateDoc(doc(db, 'materiais', idMaterialEditando), {
                ...obterCamposLegados(caminho),
                path: caminho,
                isFolder: false,
                item: editMatNome.trim(),
                quantidade,
                quantidadeCautelada,
                quantidadeTotal: quantidade + quantidadeCautelada,
                observacao: editMatObs.trim()
            });

            setModalEditarMaterialVisivel(false);
            setIdMaterialEditando(null);
            setCaminhoEdicaoOriginal([]);
            Alert.alert('Sucesso', 'Material atualizado com sucesso!');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível atualizar o material.');
        }
    }

    function abrirOpcoesPasta(pasta) {
        setItemMenu({ tipo: 'pasta', dados: pasta });
        setMenuVisivel(true);
    }

    function abrirOpcoesItem(material) {
        setItemMenu({ tipo: 'item', dados: material });
        setMenuVisivel(true);
    }

    function fecharMenu() {
        setMenuVisivel(false);
        setItemMenu(null);
    }

    function acaoEditarMenu() {
        const item = itemMenu;
        if (!item) return;
        setMenuVisivel(false);

        setTimeout(() => {
            if (item.tipo === 'pasta') {
                setPastaSendoEditada(item.dados);
                setNomeEdicaoPasta(item.dados.nome);
                setModalEditarPastaVisivel(true);
            } else {
                prepararEdicaoMaterial(item.dados);
            }
        }, 250);
    }

    async function salvarEdicaoPasta() {
        if (!pastaSendoEditada) return;

        const novoNome = validarNomePrateleira(nomeEdicaoPasta);
        if (!novoNome) return;

        const caminhoAntigo = pastaSendoEditada.path;
        const caminhoPai = caminhoAntigo.slice(0, -1);
        const novoCaminho = [...caminhoPai, novoNome];

        if (caminhosIguais(caminhoAntigo, novoCaminho)) {
            setModalEditarPastaVisivel(false);
            setPastaSendoEditada(null);
            return;
        }

        try {
            const registros = await carregarRegistrosAtuais();

            if (pastaComMesmoNomeExiste(caminhoPai, novoNome, caminhoAntigo, registros)) {
                Alert.alert('Atenção', 'Já existe uma prateleira com esse nome neste local.');
                return;
            }

            const operacoes = registros
                .filter(registro => caminhoEhPrefixo(caminhoAntigo, obterCaminhoRegistro(registro)))
                .map(registro => {
                    const caminhoAtual = obterCaminhoRegistro(registro);
                    const caminhoAtualizado = [
                        ...novoCaminho,
                        ...caminhoAtual.slice(caminhoAntigo.length)
                    ];

                    return {
                        id: registro.id,
                        dados: {
                            ...obterCamposLegados(caminhoAtualizado),
                            path: caminhoAtualizado
                        }
                    };
                });

            await executarOperacoesEmLotes(operacoes);

            setModalEditarPastaVisivel(false);
            setPastaSendoEditada(null);
            setNomeEdicaoPasta('');
            setCaminhoMateriais([]);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível renomear a prateleira.');
        }
    }

    function acaoExcluirMenu() {
        const item = itemMenu;
        if (!item) return;
        setMenuVisivel(false);

        setTimeout(() => {
            if (item.tipo === 'pasta') {
                const materiaisCautelados = listaMateriais.filter(registro =>
                    !registro.isFolder &&
                    caminhoEhPrefixo(item.dados.path, obterCaminhoRegistro(registro)) &&
                    obterCautelasAtivasDoMaterial(registro.id).length > 0
                );

                if (materiaisCautelados.length > 0) {
                    Alert.alert(
                        'Prateleira em uso',
                        `Não é possível excluir esta prateleira porque há material cautelado: ${materiaisCautelados
                            .slice(0, 3)
                            .map(material => material.item)
                            .join(', ')}${materiaisCautelados.length > 3 ? '...' : ''}.`
                    );
                    return;
                }

                setDadosConfirmacao({
                    titulo: 'Excluir Prateleira',
                    msg: `Tem certeza que deseja excluir "${item.dados.nome}", suas prateleiras internas e TODOS os materiais guardados nelas?`,
                    acao: async () => {
                        setConfirmacaoVisivel(false);
                        await executarExclusaoPasta(item.dados);
                    }
                });
            } else {
                if (obterCautelasAtivasDoMaterial(item.dados.id).length > 0) {
                    Alert.alert(
                        'Material cautelado',
                        'Dê baixa ou exclua a cautela ativa antes de remover este material do estoque.'
                    );
                    return;
                }

                setDadosConfirmacao({
                    titulo: 'Remover do Estoque',
                    msg: `Deseja excluir permanentemente o item "${item.dados.item}"?`,
                    acao: async () => {
                        setConfirmacaoVisivel(false);
                        try {
                            await executarOperacoesEmLotes([{ id: item.dados.id, excluir: true }]);
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Erro', 'Não foi possível excluir o material.');
                        }
                    }
                });
            }
            setConfirmacaoVisivel(true);
        }, 250);
    }

    async function executarExclusaoPasta(pasta) {
        try {
            const registros = await carregarRegistrosAtuais();
            const operacoes = registros
                .filter(registro => caminhoEhPrefixo(pasta.path, obterCaminhoRegistro(registro)))
                .map(registro => ({ id: registro.id, excluir: true }));

            await executarOperacoesEmLotes(operacoes);
            setCaminhoMateriais([]);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível excluir a prateleira.');
        }
    }

    const caminhosPastas = listarCaminhosDePastas();

    function contarMateriaisDentro(caminho) {
        return listaMateriais.filter(registro =>
            !registro.isFolder && caminhoEhPrefixo(caminho, obterCaminhoRegistro(registro))
        ).length;
    }

    function montarPasta(caminho) {
        return {
            id: `pasta-${chaveCaminho(caminho)}`,
            nome: caminho[caminho.length - 1],
            caminhoCompleto: caminho.join(SEPARADOR_CAMINHO),
            count: contarMateriaisDentro(caminho),
            path: caminho
        };
    }

    function obterItensExibicao() {
        const termo = removerAcentos(pesquisaMateriais).trim();

        if (termo) {
            const itens = listaMateriais
                .filter(registro => {
                    if (registro.isFolder) return false;
                    const caminhoTexto = obterCaminhoRegistro(registro).join(' ');
                    return [
                        registro.item,
                        registro.observacao,
                        registro.localizacao,
                        registro.subLocalizacao,
                        caminhoTexto
                    ].some(valor => removerAcentos(valor || '').includes(termo));
                })
                .sort((a, b) => compararTextos(a.item, b.item))
                .map(registro => ({
                    ...enriquecerMaterial(registro),
                    caminhoExibicao: obterCaminhoRegistro(registro).join(SEPARADOR_CAMINHO) || 'Início'
                }));

            const pastas = caminhosPastas
                .filter(caminho =>
                    removerAcentos(caminho.join(' ')).includes(termo) ||
                    removerAcentos(caminho[caminho.length - 1]).includes(termo)
                )
                .map(montarPasta);

            return { pastas, itens };
        }

        const pastas = caminhosPastas
            .filter(caminho =>
                caminho.length === caminhoMateriais.length + 1 &&
                caminhoEhPrefixo(caminhoMateriais, caminho)
            )
            .map(montarPasta);

        const itens = listaMateriais
            .filter(registro =>
                !registro.isFolder &&
                caminhosIguais(obterCaminhoRegistro(registro), caminhoMateriais)
            )
            .sort((a, b) => compararTextos(a.item, b.item))
            .map(enriquecerMaterial);

        return { pastas, itens };
    }

    const { pastas: pastasExibicao, itens: itensExibicao } = obterItensExibicao();

    function ativarModoSelecao(id) {
        setModoSelecao(true);
        setItensSelecionados(atuais => atuais.includes(id) ? atuais : [...atuais, id]);
    }

    function toggleSelecao(id) {
        setItensSelecionados(atuais => {
            const novaLista = atuais.includes(id)
                ? atuais.filter(itemId => itemId !== id)
                : [...atuais, id];

            if (novaLista.length === 0) setModoSelecao(false);
            return novaLista;
        });
    }

    function limparSelecao() {
        setModoSelecao(false);
        setItensSelecionados([]);
    }

    function obterMateriaisSelecionadosParaCautela() {
        if (itensSelecionados.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um material.');
            return null;
        }

        const materiaisPorId = new Map(
            listaMateriais
                .filter(registro => !registro.isFolder)
                .map(registro => [registro.id, registro])
        );

        const registrosSelecionados = itensSelecionados
            .map(id => materiaisPorId.get(id))
            .filter(Boolean);

        if (registrosSelecionados.length !== itensSelecionados.length) {
            const idsAindaExistentes = registrosSelecionados.map(registro => registro.id);
            setItensSelecionados(idsAindaExistentes);
            if (idsAindaExistentes.length === 0) setModoSelecao(false);

            Alert.alert(
                'Lista atualizada',
                'Um dos materiais selecionados não existe mais. Confira a seleção e tente novamente.'
            );
            return null;
        }

        const semSaldo = registrosSelecionados.filter(
            registro => !Number.isFinite(Number(registro.quantidade)) || Number(registro.quantidade) <= 0
        );

        if (semSaldo.length > 0) {
            Alert.alert(
                'Material sem saldo',
                `Não há quantidade disponível para: ${semSaldo.map(registro => registro.item).join(', ')}.`
            );
            return null;
        }

        return registrosSelecionados.map(registro => {
            const caminho = obterCaminhoRegistro(registro);

            return {
                nome: String(registro.item || '').trim(),
                quantidade: '1',
                materialId: registro.id,
                estoqueDisponivel: Number(registro.quantidade),
                caminhoEstoque: caminho,
                caminhoExibicao: caminho.join(SEPARADOR_CAMINHO) || 'Início'
            };
        });
    }

    function abrirMovimentacaoSelecionados() {
        if (itensSelecionados.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um material.');
            return;
        }

        setPastaSendoMovida(null);
        setCaminhoDestinoMover([]);
        setModalMoverVisivel(true);
    }

    function acaoMoverMenu() {
        const item = itemMenu;
        if (!item) return;

        setMenuVisivel(false);
        setCaminhoDestinoMover([]);

        setTimeout(() => {
            if (item.tipo === 'pasta') {
                setPastaSendoMovida(item.dados);
                setModoSelecao(false);
                setItensSelecionados([]);
            } else {
                setPastaSendoMovida(null);
                setItensSelecionados([item.dados.id]);
            }
            setModalMoverVisivel(true);
        }, 250);
    }

    function cancelarMovimentacao() {
        setModalMoverVisivel(false);
        setCaminhoDestinoMover([]);
        setPastaSendoMovida(null);
        limparSelecao();
    }

    async function moverItensSelecionados() {
        if (itensSelecionados.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um material.');
            return;
        }

        const camposLegados = obterCamposLegados(caminhoDestinoMover);
        const operacoes = itensSelecionados.map(id => ({
            id,
            dados: {
                ...camposLegados,
                path: caminhoDestinoMover,
                isFolder: false
            }
        }));

        await executarOperacoesEmLotes(operacoes);
        Alert.alert('Sucesso', `${itensSelecionados.length} material(is) movido(s) com sucesso!`);
    }

    async function moverPasta() {
        const caminhoOrigem = pastaSendoMovida.path;
        const caminhoPaiAtual = caminhoOrigem.slice(0, -1);

        if (
            caminhosIguais(caminhoDestinoMover, caminhoOrigem) ||
            caminhoEhPrefixo(caminhoOrigem, caminhoDestinoMover)
        ) {
            Alert.alert('Atenção', 'Uma prateleira não pode ser movida para dentro dela mesma.');
            return false;
        }

        if (caminhosIguais(caminhoDestinoMover, caminhoPaiAtual)) {
            Alert.alert('Atenção', 'Esta prateleira já está nesse local.');
            return false;
        }

        const registros = await carregarRegistrosAtuais();
        const nomePasta = caminhoOrigem[caminhoOrigem.length - 1];

        if (pastaComMesmoNomeExiste(caminhoDestinoMover, nomePasta, caminhoOrigem, registros)) {
            Alert.alert('Atenção', 'O destino já possui uma prateleira com esse nome.');
            return false;
        }

        const novoCaminhoBase = [...caminhoDestinoMover, nomePasta];
        const operacoes = registros
            .filter(registro => caminhoEhPrefixo(caminhoOrigem, obterCaminhoRegistro(registro)))
            .map(registro => {
                const caminhoAtual = obterCaminhoRegistro(registro);
                const caminhoAtualizado = [
                    ...novoCaminhoBase,
                    ...caminhoAtual.slice(caminhoOrigem.length)
                ];

                return {
                    id: registro.id,
                    dados: {
                        ...obterCamposLegados(caminhoAtualizado),
                        path: caminhoAtualizado
                    }
                };
            });

        await executarOperacoesEmLotes(operacoes);
        Alert.alert('Sucesso', 'Prateleira e todo o seu conteúdo foram movidos!');
        setCaminhoMateriais([]);
        return true;
    }

    async function confirmarMovimentacao() {
        try {
            if (pastaSendoMovida) {
                const moveu = await moverPasta();
                if (!moveu) return;
            } else {
                await moverItensSelecionados();
            }

            limparSelecao();
            setModalMoverVisivel(false);
            setCaminhoDestinoMover([]);
            setPastaSendoMovida(null);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível concluir a movimentação.');
        }
    }

    const todasAsPastas = [
        {
            nomeExibicao: '🏠 Raiz Principal (Início)',
            pathFuturo: [],
            id: 'raiz'
        },
        ...caminhosPastas
            .filter(caminho => {
                if (!pastaSendoMovida) return true;
                const origem = pastaSendoMovida.path;
                const paiAtual = origem.slice(0, -1);
                return !caminhoEhPrefixo(origem, caminho) && !caminhosIguais(caminho, paiAtual);
            })
            .map(caminho => ({
                nomeExibicao: `📁 ${caminho.join(SEPARADOR_CAMINHO)}`,
                pathFuturo: caminho,
                id: `destino-${chaveCaminho(caminho)}`
            }))
    ].filter(destino => {
        if (!pastaSendoMovida || destino.pathFuturo.length > 0) return true;
        return pastaSendoMovida.path.length > 1;
    });

    return {
        listaMateriais,
        pesquisaMateriais, setPesquisaMateriais,
        caminhoMateriais, setCaminhoMateriais,
        modalMateriaisVisivel, setModalMateriaisVisivel,
        matLocal, setMatLocal,
        matSubLocal, setMatSubLocal,
        matNome, setMatNome,
        matQtd, setMatQtd,
        matObs, setMatObs,
        salvarNovoMaterial,
        modalEditarMaterialVisivel, setModalEditarMaterialVisivel,
        setIdMaterialEditando,
        editMatLocal, setEditMatLocal,
        editMatSubLocal, setEditMatSubLocal,
        editMatNome, setEditMatNome,
        editMatQtd, setEditMatQtd,
        editMatObs, setEditMatObs,
        salvarEdicaoMaterial,
        modalTipoAdicaoVisivel, setModalTipoAdicaoVisivel,
        abrirCadastroMaterialContextual,
        modalNovaPrateleiraVisivel, setModalNovaPrateleiraVisivel,
        nomeNovaPrateleira, setNomeNovaPrateleira,
        salvarNovaPrateleira,
        pastasExibicao, itensExibicao,
        abrirOpcoesPasta, abrirOpcoesItem,
        menuVisivel, itemMenu, fecharMenu,
        acaoEditarMenu, acaoMoverMenu, acaoExcluirMenu,
        confirmacaoVisivel, setConfirmacaoVisivel, dadosConfirmacao,
        modalEditarPastaVisivel, setModalEditarPastaVisivel,
        nomeEdicaoPasta, setNomeEdicaoPasta,
        salvarEdicaoPasta,
        modoSelecao,
        itensSelecionados,
        modalMoverVisivel,
        caminhoDestinoMover, setCaminhoDestinoMover,
        pastaSendoMovida,
        ativarModoSelecao,
        toggleSelecao,
        limparSelecao,
        obterMateriaisSelecionadosParaCautela,
        abrirMovimentacaoSelecionados,
        confirmarMovimentacao,
        cancelarMovimentacao,
        todasAsPastas
    };
}
