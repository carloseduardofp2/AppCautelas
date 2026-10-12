import { avisar } from '../utils/avisar';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { gerarHtmlLivro } from '../utils/pdfHtml.mjs';

import { aguardarImagens } from '../utils/exportacao.mjs';

let geradorPendente;
const carregarGerador = () => geradorPendente ||= import('html2pdf.js').catch(e => { geradorPendente = null; throw e; });
function podeCompartilharArquivo() {
  if (Platform.OS !== 'web' || !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || !navigator.canShare) return false;
  try { return navigator.canShare({files:[new File(['%PDF-1.4'], 'livro_cautelas.pdf', {type:'application/pdf'})]}); }
  catch { return false; }
}
export function prepararGeradorPDF() {
  if (podeCompartilharArquivo()) void carregarGerador().catch(() => {});
}

export async function exportarParaPDF(listaCautelas, isExportando, setIsExportando, janelaPreparada = null) {
  if (isExportando) return;
  setIsExportando(true);

  try {
    const html = gerarHtmlLivro(listaCautelas);
    // --- SOLUÇÃO HÍBRIDA (WEB E CELULAR) ---
    if (Platform.OS === 'web') {

      // 🔥 1. FLUXO EXCLUSIVO PARA CELULAR WEB (WhatsApp)
      if (podeCompartilharArquivo()) {
        try {
          const container = document.createElement('div');
          container.innerHTML = html;

          // Configurações para a geração silenciosa do PDF
          const opt = {
            margin:       5,
            filename:     'livro_cautelas.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape fica melhor para tabelas longas
          };

          // O módulo já começa a carregar durante a busca dos históricos.
          const { default: html2pdf } = await carregarGerador();
          const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
          
          // Transforma o Blob em um File que a Web Share API entenda
          const file = new File([pdfBlob], 'livro_cautelas.pdf', { type: 'application/pdf' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Livro de Cautelas',
              text: 'Segue o PDF do livro de cautelas gerado.'
            });
            janelaPreparada?.close();
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
        const janelaImpressao = janelaPreparada || window.open('', '_blank');

        if (!janelaImpressao) {
            avisar("Erro", "Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.");
            janelaPreparada?.close();
            setIsExportando(false);
            return;
        }

        janelaImpressao.document.open();
        janelaImpressao.document.write(html);
        janelaImpressao.document.close();

        await aguardarImagens(janelaImpressao.document);
        janelaImpressao.focus();
        janelaImpressao.onafterprint = () => janelaImpressao.close();
        janelaImpressao.print();
      } catch (webError) {
          console.error("Erro na exportação (web):", webError);
          avisar("Erro", "Não foi possível gerar o PDF.");
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
      avisar("Erro", "O compartilhamento não está disponível.");
    }

  } catch (error) {
    console.error("Erro na exportação:", error);
    avisar("Erro", "Não foi possível gerar o PDF.");
  } finally {
    setIsExportando(false);
  }
}