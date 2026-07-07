import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { removerAcentos } from '../utils/formatters';

// Hook responsável pela Reserva de Materiais: dados do Firestore,
// navegação de pastas/prateleiras, cadastro e edição de itens.
export function useMateriais() {
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

    // --- EDIÇÃO DE MATERIAIS ---
    const [modalEditarMaterialVisivel, setModalEditarMaterialVisivel] = useState(false);
    const [idMaterialEditando, setIdMaterialEditando] = useState(null);
    const [editMatLocal, setEditMatLocal] = useState('');
    const [editMatSubLocal, setEditMatSubLocal] = useState('');
    const [editMatNome, setEditMatNome] = useState('');
    const [editMatQtd, setEditMatQtd] = useState('');
    const [editMatObs, setEditMatObs] = useState('');

    // --- MENU DE ADIÇÃO E PRATELEIRAS ---
    const [modalTipoAdicaoVisivel, setModalTipoAdicaoVisivel] = useState(false);
    const [modalNovaPrateleiraVisivel, setModalNovaPrateleiraVisivel] = useState(false);
    const [nomeNovaPrateleira, setNomeNovaPrateleira] = useState('');

    // --- CONEXÃO EM TEMPO REAL COM O FIRESTORE ---
    useEffect(() => {
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

        return () => unsubscribeMateriais();
    }, []);

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

    async function salvarNovaPrateleira() {
        if (nomeNovaPrateleira.trim() === '') {
            Alert.alert('Atenção', 'Digite o nome da prateleira/local.');
            return;
        }

        try {
            let local = '';
            let subLocal = '';

            if (caminhoMateriais.length === 0) {
                local = nomeNovaPrateleira;
            } else if (caminhoMateriais.length === 1) {
                local = caminhoMateriais[0];
                subLocal = nomeNovaPrateleira;
            } else {
                Alert.alert('Limite', 'O sistema suporta criar pastas apenas até o nível 2.');
                return;
            }

            await addDoc(collection(db, 'materiais'), {
                localizacao: local,
                subLocalizacao: subLocal,
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

        setTimeout(() => {
            setMatLocal(caminhoMateriais.length > 0 ? caminhoMateriais[0] : '');
            setMatSubLocal(caminhoMateriais.length > 1 ? caminhoMateriais[1] : '');
            setMatNome('');
            setMatQtd('');
            setMatObs('');
            setModalMateriaisVisivel(true);
        }, 250);
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

    async function executarExclusaoPasta(pasta) {
        try {
            const ehNivel1 = pasta.path.length === 1;
            let qItensRef;

            if (ehNivel1) {
                qItensRef = query(collection(db, 'materiais'), where('localizacao', '==', pasta.nome));
            } else {
                qItensRef = query(collection(db, 'materiais'),
                    where('localizacao', '==', pasta.path[0]),
                    where('subLocalizacao', '==', pasta.nome)
                );
            }

            const querySnapshot = await getDocs(qItensRef);
            const promessasDelecao = querySnapshot.docs.map(documento => deleteDoc(doc(db, 'materiais', documento.id)));

            await Promise.all(promessasDelecao);
            Alert.alert("Sucesso", "Local e seus itens foram removidos.");
        } catch (error) {
            console.error(error);
            Alert.alert("Erro", "Não foi possível excluir a pasta.");
        }
    }

    async function confirmarExclusaoPasta(pasta) {
        Alert.alert(
            "Excluir Local",
            `Tem certeza que deseja excluir "${pasta.nome}" e TODOS os materiais dentro dela?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => executarExclusaoPasta(pasta) }
            ]
        );
    }

    function prepararEdicaoPasta(pasta) {
        Alert.alert("Em Breve", "A funcionalidade de renomear pastas estará disponível na próxima atualização.");
    }

    function abrirOpcoesPasta(pasta) {
        Alert.alert(
            `Pasta: ${pasta.nome}`,
            "O que deseja fazer?",
            [
                { text: "✏️ Editar", onPress: () => prepararEdicaoPasta(pasta) },
                {
                    text: "🗑️ Excluir",
                    onPress: () => confirmarExclusaoPasta(pasta),
                    style: 'destructive'
                },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    }

    function abrirOpcoesItem(material) {
        Alert.alert(
            material.item,
            `Qtd: ${material.quantidade}\nObs: ${material.observacao || 'Nenhuma'}`,
            [
                { text: "✏️ Editar", onPress: () => prepararEdicaoMaterial(material) },
                { text: "🗑️ Excluir", onPress: () => excluirMaterial(material.id, material.item), style: 'destructive' },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    }

    const obterItensExibicao = () => {
        const termo = removerAcentos(pesquisaMateriais);

        if (termo !== '') {
            const itens = listaMateriais.filter(m =>
                !m.isFolder && (
                    removerAcentos(m.item || '').includes(termo) ||
                    removerAcentos(m.localizacao || '').includes(termo) ||
                    removerAcentos(m.subLocalizacao || '').includes(termo)
                )
            );

            const pastasEncontradas = [];

            const locaisUnicos = [...new Set(listaMateriais.map(m => m.localizacao).filter(l => l && l !== 'Não informado'))];
            locaisUnicos.forEach(loc => {
                if (removerAcentos(loc).includes(termo)) {
                    const count = listaMateriais.filter(m => m.localizacao === loc && !m.isFolder).length;
                    pastasEncontradas.push({ nome: loc, count, path: [loc] });
                }
            });

            const subLocais = listaMateriais.filter(m => m.subLocalizacao && m.subLocalizacao !== '').map(m => ({ loc: m.localizacao, sub: m.subLocalizacao }));
            const subLocaisUnicos = [...new Set(subLocais.map(x => JSON.stringify(x)))].map(x => JSON.parse(x));

            subLocaisUnicos.forEach(obj => {
                if (removerAcentos(obj.sub).includes(termo)) {
                    const count = listaMateriais.filter(m => m.localizacao === obj.loc && m.subLocalizacao === obj.sub && !m.isFolder).length;
                    pastasEncontradas.push({ nome: obj.sub, count, path: [obj.loc, obj.sub] });
                }
            });

            return { pastas: pastasEncontradas, itens };
        }

        if (caminhoMateriais.length === 0) {
            const locaisUnicos = [...new Set(listaMateriais.map(m => m.localizacao).filter(l => l && l !== 'Não informado'))];
            const pastas = locaisUnicos.map(loc => {
                const count = listaMateriais.filter(m => m.localizacao === loc && !m.isFolder).length;
                return { nome: loc, count, path: [loc] };
            });
            const itens = listaMateriais.filter(m => (!m.localizacao || m.localizacao === 'Não informado') && !m.isFolder);
            return { pastas, itens };
        }

        if (caminhoMateriais.length === 1) {
            const localAtual = caminhoMateriais[0];
            const materiaisNoLocal = listaMateriais.filter(m => m.localizacao === localAtual);
            const subLocaisUnicos = [...new Set(materiaisNoLocal.map(m => m.subLocalizacao).filter(Boolean))];

            const pastas = subLocaisUnicos.map(sub => {
                const count = materiaisNoLocal.filter(m => m.subLocalizacao === sub && !m.isFolder).length;
                return { nome: sub, count, path: [localAtual, sub] };
            });
            const itens = materiaisNoLocal.filter(m => !m.subLocalizacao && !m.isFolder);
            return { pastas, itens };
        }

        const localAtual = caminhoMateriais[0];
        const subLocalAtual = caminhoMateriais[1];
        const itens = listaMateriais.filter(m => m.localizacao === localAtual && m.subLocalizacao === subLocalAtual && !m.isFolder);
        return { pastas: [], itens };
    };

    const { pastas: pastasExibicao, itens: itensExibicao } = obterItensExibicao();

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
    };
}