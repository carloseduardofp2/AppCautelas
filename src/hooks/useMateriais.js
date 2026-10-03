import { avisar } from '../utils/avisar';
import { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import {
    addDoc, runTransaction, serverTimestamp,
    collection,
    doc,
    getDocs,
    onSnapshot,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { itensCautela, inteiro } from '../utils/estoque.mjs';
import { compararNatural } from '../utils/ordenacao.mjs';
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
    return compararNatural(limparSegmento(a), limparSegmento(b));
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
    const [salvandoMaterial, setSalvandoMaterial] = useState(false);
    const travaMaterial = useRef(false);
    const materialEdicaoRef = useRef(null);
    const novoMaterialId = useRef(null);
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
            setListaMateriais(dados.filter(m => !m.arquivado));
        }, (error) => {
            console.error('Erro ao buscar Materiais:', error);
            avisar('Erro', 'Não foi possível sincronizar a reserva de materiais.');
        });

        return () => unsubscribeMateriais();
    }, []);

    function obterCautelasAtivasDoMaterial(materialId) {
        const porMilitar = new Map();

        listaCautelas
            .filter(cautela => !String(cautela?.dataEntrega || '').trim())
            .forEach(cautela => {
                if (!Array.isArray(cautela.materiais)) return;
                try { itensCautela(cautela); } catch { return; }

                const quantidadeNaCautela = itensCautela(cautela)
                    .filter(material => material?.materialId === materialId)
                    .reduce((total, material) => {
                        const quantidade = Number(material.pendente);
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
            avisar('Atenção', 'Digite o nome da prateleira/local.');
            return null;
        }

        if (nomeLimpo.includes('›')) {
            avisar('Atenção', 'O nome da prateleira não pode conter o caractere "›".');
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
                if (excluir) lote.update(referencia, { arquivado: true });
                else lote.update(referencia, dados);
            });

            await lote.commit();
        }
    }

    async function salvarNovoMaterial() {
        if (!matNome.trim() || !matQtd.trim()) {
            avisar('Atenção', 'Nome do Item e Quantidade são obrigatórios!');
            return;
        }

        const quantidade = Number(matQtd);
        if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
            avisar('Atenção', 'Quantidade inválida. Informe um número válido.');
            return;
        }

        const caminho = resolverCaminhoFormulario(
            matLocal,
            matSubLocal,
            caminhoCadastroPreferido
        );

        if (travaMaterial.current) return;
        travaMaterial.current = true; setSalvandoMaterial(true);
        try {
            const referencia = doc(db, 'materiais', novoMaterialId.current || (novoMaterialId.current = doc(collection(db, 'materiais')).id));
            await runTransaction(db, async tx => {
                const existente = await tx.get(referencia);
                if (existente.exists()) return;
                tx.set(referencia, { ...obterCamposLegados(caminho), path: caminho, isFolder: false,
                    item: matNome.trim(), quantidade, quantidadeCautelada: 0, quantidadeTotal: quantidade,
                    observacao: matObs.trim(), createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid || '' });
            });
            setMatNome(''); setMatQtd(''); setMatObs(''); novoMaterialId.current = null;
            setModalMateriaisVisivel(false);
            avisar('Sucesso', 'Material adicionado ao estoque!');
        } catch (error) { avisar('Erro ao salvar material', error.message); }
        finally { travaMaterial.current = false; setSalvandoMaterial(false); }
    }

    async function salvarNovaPrateleira() {
        const nome = validarNomePrateleira(nomeNovaPrateleira);
        if (!nome) return;

        if (pastaComMesmoNomeExiste(caminhoMateriais, nome)) {
            avisar('Atenção', 'Já existe uma prateleira com esse nome neste local.');
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
            avisar('Erro', 'Não foi possível criar a prateleira.');
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

        materialEdicaoRef.current = material;
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
            avisar('Atenção', 'Nome do Item e Quantidade são obrigatórios!');
            return;
        }

        const quantidade = Number(editMatQtd);
        if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
            avisar('Atenção', 'Quantidade inválida. Informe um número válido.');
            return;
        }

        const caminho = resolverCaminhoFormulario(
            editMatLocal,
            editMatSubLocal,
            caminhoEdicaoOriginal
        );
        if (travaMaterial.current) return;
        travaMaterial.current = true; setSalvandoMaterial(true);
        const original = materialEdicaoRef.current;
        try {
            const historicoRef = doc(collection(db, 'materiais', idMaterialEditando, 'historico'));
            await runTransaction(db, async tx => {
                const referencia = doc(db, 'materiais', idMaterialEditando);
                const snapshot = await tx.get(referencia);
                if (!snapshot.exists()) throw new Error('O material não existe mais.');
                const atual = snapshot.data();
                if (atual.arquivado) throw new Error('O material foi removido.');
                for (const k of ['quantidade', 'quantidadeCautelada', 'item', 'observacao']) {
                    if (JSON.stringify(atual[k]) !== JSON.stringify(original[k])) throw new Error('O material mudou em outro aparelho. Reabra a edição para conferir o saldo atual.');
                }
                if (JSON.stringify(atual.path || []) !== JSON.stringify(original.path || [])) throw new Error('Localização alterada por outro operador. Reabra a edição.');
                const cautelada = inteiro(atual.quantidadeCautelada ?? 0, 'Cautelado');
                // Alterar o nome não reconcilia silenciosamente um total legado divergente.
                const total = quantidade !== Number(atual.quantidade) || atual.quantidadeTotal == null
                    ? quantidade + cautelada : inteiro(atual.quantidadeTotal, 'Total');
                tx.update(referencia, { ...obterCamposLegados(caminho), path: caminho, item: editMatNome.trim(),
                    quantidade, quantidadeCautelada: cautelada, quantidadeTotal: total,
                    observacao: editMatObs.trim(), updatedAt: serverTimestamp() });
                tx.set(historicoRef, { tipo: 'editar_material', uid: auth.currentUser?.uid || '', em: serverTimestamp(),
                    antes: { item: atual.item, quantidade: atual.quantidade, quantidadeCautelada: cautelada, quantidadeTotal: atual.quantidadeTotal ?? null, path: atual.path || [] },
                    depois: { item: editMatNome.trim(), quantidade, quantidadeCautelada: cautelada, quantidadeTotal: total, path: caminho } });
            });
            setModalEditarMaterialVisivel(false); setIdMaterialEditando(null);
            avisar('Material atualizado', 'Alterações salvas.');
        } catch (error) { avisar('Erro ao editar material', error.message); }
        finally { travaMaterial.current = false; setSalvandoMaterial(false); }
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
                avisar('Atenção', 'Já existe uma prateleira com esse nome neste local.');
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
            avisar('Erro', 'Não foi possível renomear a prateleira.');
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
                    avisar(
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
                    avisar(
                        'Material cautelado',
                        'Dê baixa ou exclua a cautela ativa antes de remover este material do estoque.'
                    );
                    return;
                }

                setDadosConfirmacao({
                    titulo: 'Remover do Estoque',
                    msg: `Deseja remover da lista o item "${item.dados.item}"?`,
                    acao: async () => {
                        setConfirmacaoVisivel(false);
                        try {
                            await arquivarRegistros([item.dados.id]);
                        } catch (error) {
                            console.error(error);
                            avisar('Erro', 'Não foi possível excluir o material.');
                        }
                    }
                });
            }
            setConfirmacaoVisivel(true);
        }, 250);
    }

    async function arquivarRegistros(ids) {
        if (ids.length > 200) throw new Error('Remova em grupos menores de até 200 registros.');
        await runTransaction(db, async tx => {
            const registros = [];
            for (const id of ids) {
                const referencia = doc(db, 'materiais', id);
                const snap = await tx.get(referencia);
                if (snap.exists()) registros.push([referencia, snap.data()]);
            }
            for (const [referencia, dados] of registros) {
                if (Number(dados.quantidadeCautelada || 0) > 0) throw new Error('Há material cautelado. Conclua a devolução antes de remover.');
                tx.update(referencia, { arquivado: true, archivedAt: serverTimestamp() });
            }
        });
    }

    async function executarExclusaoPasta(pasta) {
        try {
            const registros = await carregarRegistrosAtuais();
            const operacoes = registros
                .filter(registro => !registro.arquivado && caminhoEhPrefixo(pasta.path, obterCaminhoRegistro(registro)))
                .map(registro => ({ id: registro.id, excluir: true }));

            await arquivarRegistros(operacoes.map(o => o.id));
            setCaminhoMateriais([]);
        } catch (error) {
            console.error(error);
            avisar('Erro', 'Não foi possível excluir a prateleira.');
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
            avisar('Atenção', 'Selecione pelo menos um material.');
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

            avisar(
                'Lista atualizada',
                'Um dos materiais selecionados não existe mais. Confira a seleção e tente novamente.'
            );
            return null;
        }

        const semSaldo = registrosSelecionados.filter(
            registro => !Number.isFinite(Number(registro.quantidade)) || Number(registro.quantidade) <= 0
        );

        if (semSaldo.length > 0) {
            avisar(
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
            avisar('Atenção', 'Selecione pelo menos um material.');
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
            avisar('Atenção', 'Selecione pelo menos um material.');
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
        avisar('Sucesso', `${itensSelecionados.length} material(is) movido(s) com sucesso!`);
    }

    async function moverPasta() {
        const caminhoOrigem = pastaSendoMovida.path;
        const caminhoPaiAtual = caminhoOrigem.slice(0, -1);

        if (
            caminhosIguais(caminhoDestinoMover, caminhoOrigem) ||
            caminhoEhPrefixo(caminhoOrigem, caminhoDestinoMover)
        ) {
            avisar('Atenção', 'Uma prateleira não pode ser movida para dentro dela mesma.');
            return false;
        }

        if (caminhosIguais(caminhoDestinoMover, caminhoPaiAtual)) {
            avisar('Atenção', 'Esta prateleira já está nesse local.');
            return false;
        }

        const registros = await carregarRegistrosAtuais();
        const nomePasta = caminhoOrigem[caminhoOrigem.length - 1];

        if (pastaComMesmoNomeExiste(caminhoDestinoMover, nomePasta, caminhoOrigem, registros)) {
            avisar('Atenção', 'O destino já possui uma prateleira com esse nome.');
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
        avisar('Sucesso', 'Prateleira e todo o seu conteúdo foram movidos!');
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
            avisar('Erro', 'Não foi possível concluir a movimentação.');
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
        listaMateriais, salvandoMaterial,
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
