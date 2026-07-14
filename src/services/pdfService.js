import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert, Platform } from 'react-native';

// Função auxiliar para compartilhar ou baixar o PDF no navegador
async function compartilharOuBaixarPDF(base64Data, nomeArquivo) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // Tenta usar o compartilhamento nativo do celular/navegador (Web Share API)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], `${nomeArquivo}.pdf`, { type: 'application/pdf' })] })) {
        try {
            await navigator.share({
                files: [new File([blob], `${nomeArquivo}.pdf`, { type: 'application/pdf' })],
                title: 'Cautela Gerada',
                text: 'Segue o PDF da cautela solicitada.'
            });
        } catch (error) {
            console.error("Erro ao compartilhar via Web Share:", error);
            downloadBlob(blob, `${nomeArquivo}.pdf`); // Fallback para download
        }
    } else {
        downloadBlob(blob, `${nomeArquivo}.pdf`); // Fallback para download
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function exportarParaPDF(listaCautelas, isExportando, setIsExportando) {
    if (isExportando) return;
    setIsExportando(true);

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
                    <td>${c.militar || '-'} ${c.om ? `(${c.om})` : ''}</td>
                    <td>${c.material || '-'}</td>
                    <td>${c.quantidade ?? '-'}</td>
                    <td>${c.observacao || '-'}</td>
                    <td>${c.dataCautela || '-'}</td>
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
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;

        // GERAÇÃO DO PDF USANDO EXPO-PRINT (Funciona para Web e Mobile)
        const { uri } = await Print.printToFileAsync({ html });

        if (Platform.OS === 'web') {
            // Extrai o base64 da URI (data:application/pdf;base64,...)
            const base64Data = uri.split('base64,')[1];
            await compartilharOuBaixarPDF(base64Data, "Cautela_S3_" + new Date().getTime());
        } else {
            // Lógica original para Mobile Nativo
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("Erro", "O compartilhamento não está disponível.");
            }
        }

    } catch (error) {
        console.error("Erro na exportação:", error);
        Alert.alert("Erro", "Não foi possível gerar o PDF.");
    } finally {
        setIsExportando(false);
    }
}