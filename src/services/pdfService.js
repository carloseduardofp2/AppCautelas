import { avisar } from '../utils/avisar';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { gerarHtmlLivro } from '../utils/pdfHtml.mjs';

import { aguardarImagens, ehNavegadorMovel } from '../utils/exportacao.mjs';

let geradorPendente;
const carregarGerador = () => geradorPendente ||= import('html2pdf.js').catch(e => { geradorPendente = null; throw e; });
function apresentarPDFParaCompartilhar(arquivo, janelaPreparada) {
  janelaPreparada?.close();
  const documento = document;
  const url = URL.createObjectURL(arquivo);
  let podeCompartilhar = false;
  try { podeCompartilhar = Boolean(navigator.share && navigator.canShare?.({ files: [arquivo] })); }
  catch { /* Compartilhamento de arquivo indisponível neste navegador. */ }
  const tela = documento.createElement('div');
  tela.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#10182b;color:#f4f6fa;font:16px Arial,sans-serif;padding:24px;box-sizing:border-box';
  const painel = documento.createElement('div');
  painel.style.cssText = 'width:100%;max-width:420px;background:#202d43;border-radius:18px;padding:28px;box-sizing:border-box;text-align:center';
  const titulo = documento.createElement('h2');
  titulo.textContent = 'Livro de Cautelas';
  titulo.style.cssText = 'margin:0 0 12px;color:#d7aa65;font-size:23px';
  const mensagem = documento.createElement('p');
  mensagem.textContent = podeCompartilhar ? 'PDF pronto para compartilhar.' : 'Seu navegador não permite compartilhar o arquivo diretamente. Baixe o PDF para compartilhá-lo.';
  mensagem.style.cssText = 'line-height:1.5;margin:0 0 24px';
  painel.append(titulo, mensagem);
  if (podeCompartilhar) {
    const botao = documento.createElement('button');
    botao.textContent = 'Compartilhar PDF';
    botao.style.cssText = 'display:block;width:100%;padding:16px;border:0;border-radius:10px;background:#d7aa65;color:#10182b;font:bold 17px Arial,sans-serif;cursor:pointer';
    botao.onclick = async () => {
      try {
        await navigator.share({ files: [arquivo], title: 'Livro de Cautelas' });
        tela.remove();
      } catch (erro) {
        if (erro.name !== 'AbortError') mensagem.textContent = 'Não foi possível compartilhar. Tente novamente ou baixe o PDF.';
      }
    };
    painel.append(botao);
  }
  const baixar = documento.createElement('a');
  baixar.href = url;
  baixar.download = arquivo.name;
  baixar.textContent = 'Baixar PDF';
  baixar.style.cssText = 'display:block;margin-top:20px;color:#f4f6fa;text-decoration:underline';
  painel.append(baixar);
  const fechar = documento.createElement('button');
  fechar.textContent = 'Fechar';
  fechar.style.cssText = 'display:block;margin:24px auto 0;background:transparent;border:0;color:#f4f6fa;font:16px Arial,sans-serif';
  fechar.onclick = () => tela.remove();
  painel.append(fechar);
  tela.append(painel);
  documento.body.append(tela);
  setTimeout(() => URL.revokeObjectURL(url), 3600000);
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
          apresentarPDFParaCompartilhar(arquivo, janelaPreparada);
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
