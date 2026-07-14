import { StyleSheet, Platform, Dimensions } from 'react-native';

// Mede a tela para saber se é um monitor (PC) ou tela de celular
const larguraTela = Dimensions.get('window').width;
const isDesktopWeb = Platform.OS === 'web' && larguraTela > 768;

export const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    // Encontre o 'header' e adicione o alignItems, justifyContent e position:
    header: {
        backgroundColor: '#0F172A',
        padding: 15,
        paddingTop: 10,
        borderBottomWidth: 2.5,
        borderBottomColor: '#D4A25F',
        justifyContent: 'center', // Garante que o texto fique centralizado
        alignItems: 'center',     // Garante que o texto fique centralizado
        position: 'relative'      // Permite que o logo flutue sobre ele
    },

    // Adicione esta NOVA classe em qualquer lugar (pode ser logo abaixo do header):
    headerLogo: {
        position: 'absolute',
        left: 15,       // Posiciona na ESQUERDA (onde você desenhou o círculo)
        // right: 20,   // Se preferir na DIREITA, apague o 'left: 20' e descomente esta linha
        top: '15%',     // Empurra para a metade
        marginTop: 0,  // Ajuste fino para alinhar perfeitamente com os textos
        width: 65,      // Largura da imagem
        height: 65,     // Altura da imagem
    },

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
    cartaoQtd: { color: '#D4A25F', fontSize: 16, fontWeight: 'bold', position: 'absolute', right: 0, top: 32 },
    cartaoTextoMaterial: { color: '#D4A25F', fontSize: 16, marginVertical: 2, fontWeight: '600' },
    cartaoTexto: { color: '#E2E8F0', fontSize: 14, marginVertical: 2 },
    labelMaterial: { color: '#D4A25F', fontSize: 16, fontWeight: '600' },
    label: { color: '#94A3B8', fontWeight: '600' },
    divisor: { height: 1, backgroundColor: '#334155', marginVertical: 10 },
    statusTag: { fontSize: 14, fontWeight: '600', marginTop: 5 },
    statusOk: { color: '#4ADE80' },
    statusPendente: { color: '#F87171' },
    inputPesquisa: { backgroundColor: '#1E293B', color: '#FFFFFF', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
    noResultsText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 20 },
    cartaoLinhaAfastadaActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    btnExcluir: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#991B1B' },
    btnExcluirTexto: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
    btnBaixa: { backgroundColor: '#059669', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center', borderWidth: 1, borderColor: '#047857' },
    btnBaixaTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

    botaoFlutuanteTexto: {
        color: '#0F172A',
        fontSize: 40,
        fontWeight: 'bold',
        // Aplica a correção de -4 APENAS se for Web no Computador. No celular fica 0 (perfeito).
        transform: [{ translateY: isDesktopWeb ? -4 : 0 }],
    },

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
        bottom: 90, // Ajuste a altura conforme necessário
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 15,
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

    input: { backgroundColor: '#0F172A', color: '#FFFFFF', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, marginBottom: 15, fontSize: 16 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inputArea: { height: 80, textAlignVertical: 'top' },

    modalBotoes: {
        flexDirection: isDesktopWeb ? 'row' : 'column', // Lado a lado no PC, Empilhado no Celular
        marginTop: 10,
        paddingBottom: 15,
        gap: 10, // Adiciona espaçamento automático entre os botões (funciona em linha ou coluna)
    },
    
    btnCancelar: {
        flex: 1,
        height: 55,               // Altura travada para ignorar o tamanho do emoji
        justifyContent: 'center', // Centraliza o texto verticalmente
        borderRadius: 8,
        backgroundColor: '#334155',
        alignItems: 'center',
        paddingVertical: 15,
    },
    btnCancelarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

    btnCancelar: {
        flex: 1,
        minHeight: 55,            // minHeight garante que ele nunca fique esmagado
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#334155',
        alignItems: 'center',
        paddingVertical: 15,      // Força a margem interna para engordar o botão
    },
    
    btnSalvarTexto: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },

    btnAssinarDepois: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#D4A25F', borderWidth: 1, borderColor: '#e79326' },
    btnAssinarDepoisTexto: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
    
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


    modalTitle: { color: '#D4A25F', fontSize: 20, fontWeight: 'bold', marginLeft: 3, marginBottom: 15 },
    modalLabel: { 
        color: '#E2E8F0', // Cor clara para ficar bem visível no fundo escuro
        fontSize: 14, 
        fontWeight: '600', 
        marginBottom: 5, 
        marginTop: 10 
    },
    modalSubtitle: { 
        color: '#94A3B8', 
        fontSize: 12, 
        marginBottom: 10 
    },
    
    // --- ESTILOS DO MENU SPEED DIAL (NOVO) ---
    menuFlutuanteContainer: {
        position: 'absolute',
        bottom: 170, // Altura em relação ao botão +
        right: 30,  // Alinhado com o botão +
        alignItems: 'flex-end', // Alinha tudo à direita
        zIndex: 15,
    },
    fabItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15, // Espaçamento entre os botões
    },
    fabLabel: {
        backgroundColor: '#1E293B',
        color: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 15, // Espaço entre o texto e o botão redondo
        fontSize: 14,
        fontWeight: 'bold',
        overflow: 'hidden',
        // Sombra da etiqueta
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    miniFab: {
        width: 50,
        height: 50,
        borderRadius: 25, // Metade da largura/altura deixa perfeitamente redondo
        backgroundColor: '#334155', // Cor do botão circular
        justifyContent: 'center',
        alignItems: 'center',
        // Sombra do botão
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },

    miniFabIcon: {
        fontSize: 27,
        transform: [{ translateY: isDesktopWeb ? -2 : 0 }],
    },

    // ---------- BOTTOM SHEET ----------

    bottomSheetContent: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 25,
        borderTopWidth: 1,
        borderColor: '#334155',
    },

    bottomSheetTitle: {
        color: '#D4A25F',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
    },

    bottomSheetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },

    bottomSheetIcon: {
        fontSize: 30,
        marginRight: 18,
    },

    bottomSheetButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },

    bottomSheetButtonSub: {
        color: '#94A3B8',
        fontSize: 14,
        marginTop: 3,
    },

    btnCancelarAdd: {
        marginTop: 25,
        backgroundColor: '#334155',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },

    // ---------- MENU DOS TRÊS PONTOS ----------

    nestMenuBtn: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
    nestMenuText: { color: '#94A3B8', fontSize: 24, fontWeight: 'bold' },

});