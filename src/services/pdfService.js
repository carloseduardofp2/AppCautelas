import { avisar } from '../utils/avisar';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { gerarHtmlLivro } from '../utils/pdfHtml.mjs';

import { aguardarImagens, ehNavegadorMovel } from '../utils/exportacao.mjs';

let geradorPendente;
const carregarGerador = () => geradorPendente ||= import('html2pdf.js').catch(e => { geradorPendente = null; throw e; });
function podeCompartilharArquivo() {
  if (Platform.OS !== 'web' || !ehNavegadorMovel(navigator.userAgent) || !navigator.canShare) return false;
  try { return navigator.canShare({files:[new File(['%PDF-1.4'], 'livro_cautelas.pdf', {type:'application/pdf'})]}); }
  catch { return false; }
}
export function prepararGeradorPDF() {
  if (Platform.OS === 'web' && ehNavegadorMovel(navigator.userAgent)) void carregarGerador().catch(() => {});
}

export async function exportarParaPDF(listaCautelas, isExportando, setIsExportando, janelaPreparada = null) {
  if (isExportando) return;
  setIsExportando(true);

  try {
    const html = gerarHtmlLivro(listaCautelas);
    // --- SOLUÇÃO HÍBRIDA (WEB E CELULAR) ---
    if (Platform.OS === 'web') {

      // O Android pode ignorar @page landscape na tela de impressão. No celular,
      // geramos o arquivo A4 horizontal antes de abrir o compartilhamento ou download.
      if (ehNavegadorMovel(navigator.userAgent)) {
        try {
          const container = document.createElement('div');
          container.innerHTML = html;
          const { default: html2pdf } = await carregarGerador();
          const pdfBlob = await html2pdf().set({
            margin: 5,
            filename: 'livro_cautelas.pdf',
            image: { type: 'jpeg', quality: 0.92 },
            html2canvas: { scale: 1.5 },
            pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
          }).from(container).outputPdf('blob');
          const arquivo = new File([pdfBlob], 'livro_cautelas.pdf', { type: 'application/pdf' });
          if (podeCompartilharArquivo() && navigator.canShare({ files: [arquivo] })) {
            try {
              await navigator.share({ files: [arquivo], title: 'Livro de Cautelas' });
              janelaPreparada?.close();
              return;
            } catch (e) {
              if (e.name === 'AbortError') { janelaPreparada?.close(); return; }
              // Se o compartilhamento falhar, ainda é possível salvar o arquivo.
            }
          }
          const url = URL.createObjectURL(pdfBlob);
          setTimeout(() => URL.revokeObjectURL(url), 300000);
          if (janelaPreparada && !janelaPreparada.closed) janelaPreparada.location.replace(url);
          else {
            const link = document.createElement('a');
            link.href = url; link.download = 'livro_cautelas.pdf';
            document.body.appendChild(link); link.click(); link.remove();
          }
        } catch (error) {
          console.error('Erro ao gerar PDF horizontal no celular:', error);
          janelaPreparada?.close();
          avisar('PDF não gerado', 'Não foi possível preparar o arquivo. Tente novamente.');
        }
        return;
      }

      // Impressão no computador.
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