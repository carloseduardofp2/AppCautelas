import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert, Platform } from 'react-native';
import html2pdf from 'html2pdf.js'; // 🔥 Nova importação

// ... (suas outras funções compartilharOuBaixarPDF e downloadBlob continuam aqui)

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

      const listaMateriais = Array.isArray(c.materiais) && c.materiais.length > 0
        ? c.materiais.map(m => `${m.nome || '-'} (${m.quantidade ?? '-'})`).join('<br>')
        : `${c.material || '-'}${c.quantidade ? ` (${c.quantidade})` : ''}`;

      return `
          <tr>
            <td>${c.militar || '-'} ${c.om ? `(${c.om})` : ''}</td>
            <td>${listaMateriais}</td>
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
                  <th>Material(is) / Qtd</th>
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
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // 🔥 1. FLUXO EXCLUSIVO PARA CELULAR WEB (WhatsApp)
      if (isMobile && navigator.canShare) {
        try {
          const container = document.createElement('div');
          container.innerHTML = html;

          // Configurações para a geração silenciosa do PDF
          const opt = {
            margin:       5,
            filename:     'livro_cautelas.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape fica melhor para tabelas longas
          };

          // Gera o Blob nos bastidores (demora cerca de 1 a 2 segundos dependendo das assinaturas)
          const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
          
          // Transforma o Blob em um File que a Web Share API entenda
          const file = new File([pdfBlob], 'livro_cautelas.pdf', { type: 'application/pdf' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Livro de Cautelas',
              text: 'Segue o PDF do livro de cautelas gerado.'
            });
            setIsExportando(false);
            return; // 🛑 Sucesso! Finaliza a função aqui.
          }
        } catch (err) {
          console.error("Erro ao gerar/compartilhar PDF oculto via html2pdf:", err);
          // Se der erro ou o usuário cancelar, deixamos cair para o código original do PC como fallback de segurança
        }
      }

      // 🔥 2. FLUXO ORIGINAL PARA PC (Mantido intacto)
      try {
        const janelaImpressao = window.open('', '_blank');

        if (!janelaImpressao) {
            Alert.alert("Erro", "Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.");
            setIsExportando(false);
            return;
        }

        janelaImpressao.document.open();
        janelaImpressao.document.write(html);
        janelaImpressao.document.close();

        let jaImprimiu = false;
        const dispararImpressao = () => {
            if (jaImprimiu) return;
            jaImprimiu = true;
            try {
                janelaImpressao.focus();
                janelaImpressao.print();
                janelaImpressao.onafterprint = () => janelaImpressao.close();
            } catch (printError) {
                console.error("Erro ao imprimir:", printError);
                Alert.alert("Erro", "Não foi possível abrir a janela de impressão.");
            } finally {
                setIsExportando(false);
            }
        };

        janelaImpressao.onload = () => setTimeout(dispararImpressao, 300);
        setTimeout(dispararImpressao, 4000); 
      } catch (webError) {
          console.error("Erro na exportação (web):", webError);
          Alert.alert("Erro", "Não foi possível gerar o PDF.");
          setIsExportando(false);
      }

      return; // Encerra a função na Web
    }

    // --- SEU CÓDIGO ORIGINAL PARA NATIVO (APK/IPA) INTACTO ---
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