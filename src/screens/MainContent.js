import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, Text, TouchableOpacity, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { styles } from '../styles/MainStyles';
import { useCautelas } from '../hooks/useCautelas';
import { useMateriais } from '../hooks/useMateriais';

import Header from '../components/Header';
import Footer from '../components/Footer';
import ModalNovaCautela from '../components/ModalNovaCautela';
import ModalAssinatura from '../components/ModalAssinatura';
import ModalMaterial from '../components/ModalMaterial';
import MenuFlutuanteLivro from '../components/MenuFlutuanteLivro';

import LivroScreen from './LivroScreen';
import PendentesScreen from './PendentesScreen';
import MateriaisScreen from './MateriaisScreen';

export default function MainContent() {
    // --- ESTADO DE NAVEGAÇÃO (única coisa que continua "geral") ---
    const [abaAtiva, setAbaAtiva] = useState('Livro');

    // --- TUDO relacionado ao Livro de Cautelas vive no hook abaixo ---
    const {
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
        dataInicio, dataFim, statusFiltro,
        aoMudarData,
        excluirCautela,
        excluirTodasCautelas,
        handleAssinatura,
        abrirMenuExportacao,
        cautelasFiltradas,
        cautelasPendentes,
    } = useCautelas();

    // --- TUDO relacionado à Reserva de Materiais vive neste outro hook ---
    const {
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
    } = useMateriais();

    // ==========================================
    // RENDERIZAÇÃO (VISUAL DO APLICATIVO)
    // ==========================================
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            {/* COMPONENTE HEADER */}
            <Header />

            {/* CORPO DA APLICAÇÃO - SCROLLVIEW ENVOLVENDO AS ABAS */}
            <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>

                {abaAtiva === 'Livro' && (
                    <LivroScreen
                        pesquisa={pesquisa}
                        setPesquisa={setPesquisa}
                        cautelasFiltradas={cautelasFiltradas}
                        excluirCautela={excluirCautela}
                        setIdCautelaParaAssinar={setIdCautelaParaAssinar}
                        setTipoOperacao={setTipoOperacao}
                        setModalAssinatura={setModalAssinatura}
                    />
                )}

                {abaAtiva === 'Pendentes' && (
                    <PendentesScreen
                        cautelasPendentes={cautelasPendentes}
                        setIdCautelaParaAssinar={setIdCautelaParaAssinar}
                        setTipoOperacao={setTipoOperacao}
                        setModalAssinatura={setModalAssinatura}
                    />
                )}

                {abaAtiva === 'Materiais' && (
                    <MateriaisScreen
                        pesquisaMateriais={pesquisaMateriais}
                        setPesquisaMateriais={setPesquisaMateriais}
                        caminhoMateriais={caminhoMateriais}
                        setCaminhoMateriais={setCaminhoMateriais}
                        pastasExibicao={pastasExibicao}
                        itensExibicao={itensExibicao}
                        abrirOpcoesPasta={abrirOpcoesPasta}
                        abrirOpcoesItem={abrirOpcoesItem}
                    />
                )}

            </ScrollView>

            {/* --- INSERÇÃO DOS MODAIS --- */}
            {modalVisivel && (
                <ModalNovaCautela
                    fechar={() => setModalVisivel(false)}
                    novoMilitar={novoMilitar} setNovoMilitar={setNovoMilitar}
                    novaOm={novaOm} setNovaOm={setNovaOm}
                    novoMaterial={novoMaterial} setNovoMaterial={setNovoMaterial}
                    novaQtd={novaQtd} setNovaQtd={setNovaQtd}
                    novaObs={novaObs} setNovaObs={setNovaObs}
                    novoMilSecOpCautela={novoMilSecOpCautela} setNovoMilSecOpCautela={setNovoMilSecOpCautela}
                    dataSelecionada={dataSelecionada} mostrarCalendario={mostrarCalendario}
                    setMostrarCalendario={setMostrarCalendario} aoMudarData={aoMudarData}
                    avancarParaAssinatura={(salvarSemAssinar) => {
                        setModalVisivel(false);

                        if (salvarSemAssinar === true) {
                            handleAssinatura('', 'criar');
                        } else {
                            setTipoOperacao('criar');
                            setModalAssinatura(true);
                        }
                    }}
                />
            )}

            {modalAssinatura && (
                <ModalAssinatura
                    fechar={() => setModalAssinatura(false)}
                    handleAssinatura={handleAssinatura}
                    tipoOperacao={tipoOperacao}
                    novaObsEntrega={novaObsEntrega} setNovaObsEntrega={setNovaObsEntrega}
                    novoMilSecOp={novoMilSecOp} setNovoMilSecOp={setNovoMilSecOp}
                    scrollModalHabilitado={scrollModalHabilitado} setScrollModalHabilitado={setScrollModalHabilitado}
                    refAssinatura={refAssinatura}
                />
            )}

            <ModalMaterial
                modalMateriaisVisivel={modalMateriaisVisivel} setModalMateriaisVisivel={setModalMateriaisVisivel}
                matLocal={matLocal} setMatLocal={setMatLocal}
                matSubLocal={matSubLocal} setMatSubLocal={setMatSubLocal}
                matNome={matNome} setMatNome={setMatNome}
                matQtd={matQtd} setMatQtd={setMatQtd}
                matObs={matObs} setMatObs={setMatObs}
                salvarNovoMaterial={salvarNovoMaterial}

                modalEditarMaterialVisivel={modalEditarMaterialVisivel} setModalEditarMaterialVisivel={setModalEditarMaterialVisivel}
                setIdMaterialEditando={setIdMaterialEditando}
                editMatLocal={editMatLocal} setEditMatLocal={setEditMatLocal}
                editMatSubLocal={editMatSubLocal} setEditMatSubLocal={setEditMatSubLocal}
                editMatNome={editMatNome} setEditMatNome={setEditMatNome}
                editMatQtd={editMatQtd} setEditMatQtd={setEditMatQtd}
                editMatObs={editMatObs} setEditMatObs={setEditMatObs}
                salvarEdicaoMaterial={salvarEdicaoMaterial}

                modalTipoAdicaoVisivel={modalTipoAdicaoVisivel} setModalTipoAdicaoVisivel={setModalTipoAdicaoVisivel}
                abrirCadastroMaterialContextual={abrirCadastroMaterialContextual}

                modalNovaPrateleiraVisivel={modalNovaPrateleiraVisivel} setModalNovaPrateleiraVisivel={setModalNovaPrateleiraVisivel}
                nomeNovaPrateleira={nomeNovaPrateleira} setNomeNovaPrateleira={setNomeNovaPrateleira}
                salvarNovaPrateleira={salvarNovaPrateleira}
            />

            {/* COMPONENTE FOOTER */}
            <Footer abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />

            {/* CALENDÁRIO NATIVO (SEM MODAL PARA EVITAR CONFLITOS) */}
            {mostrarCalendario && (
                <DateTimePicker
                    value={statusFiltro === 'inicio' ? dataInicio : dataFim}
                    mode="date"
                    display="default"
                    onChange={aoMudarData}
                />
            )}

            {/* --- BOTÃO FLUTUANTE DA ABA LIVRO (MENU SPEED DIAL) --- */}
            {abaAtiva === 'Livro' && (
                <MenuFlutuanteLivro
                    onNovaCautela={() => setModalVisivel(true)}
                    onExportarPDF={abrirMenuExportacao}
                    onExcluirTodas={excluirTodasCautelas}
                />
            )}

            {/* --- BOTÃO FLUTUANTE DA ABA MATERIAIS --- */}
            {abaAtiva === 'Materiais' && (
                <TouchableOpacity style={[styles.botaoFlutuanteBase, { right: 25 }]} onPress={() => setModalTipoAdicaoVisivel(true)}>
                    <Text style={styles.botaoFlutuanteTexto}>+</Text>
                </TouchableOpacity>
            )}

        </SafeAreaView>
    );
}