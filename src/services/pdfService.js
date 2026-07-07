import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';

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
            <td>${c.militar} ${c.om ? `(${c.om})` : ''}</td>
            <td>${c.material}</td>
            <td>${c.quantidade}</td>
            <td>${c.observacao || '-'}</td>
            <td>${c.dataCautela}</td>
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
    setIsExportando(false);
  }
}