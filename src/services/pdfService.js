import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert, Platform } from 'react-native';

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

      // 🔥 Fallback defensivo: como este PDF é um documento oficial, nunca deve
      // exibir "undefined" caso algum campo venha vazio/ausente do Firestore.
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
              <tbody>
                ${rows}
              </tbody>
            </table>
          </body>
        </html>
      `;

    // --- SOLUÇÃO HÍBRIDA (WEB E CELULAR) ---
    if (Platform.OS === 'web') {
        // 🔥 Try/catch próprio: antes, um erro aqui dentro pulava para o catch
        // externo, cujo "finally" só reseta isExportando fora da Web — deixando
        // o botão de exportar travado em "carregando" para sempre.
        try {
            // Na Web: Cria um quadro invisível com o HTML puro para não vazar o visual do app
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();

            // Aguarda meio segundo para as assinaturas carregarem antes de gerar o PDF
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (printError) {
                    console.error("Erro ao imprimir:", printError);
                    Alert.alert("Erro", "Não foi possível abrir a janela de impressão.");
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) document.body.removeChild(iframe);
                    }, 1000);
                    setIsExportando(false);
                }
            }, 500);
        } catch (webError) {
            console.error("Erro na exportação (web):", webError);
            Alert.alert("Erro", "Não foi possível gerar o PDF.");
            setIsExportando(false);
        }

        return; // Encerra a função aqui para a Web
    }

    // --- SEU CÓDIGO ORIGINAL INTACTO PARA O CELULAR ---
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
    if (Platform.OS !== 'web') {
        setIsExportando(false);
    }
  }
}