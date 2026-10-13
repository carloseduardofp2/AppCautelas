// Limita as leituras simultâneas, preservando a ordem e recusando PDF incompleto.
export async function carregarHistoricosParaPDF(lista, carregar, progresso = () => {}, limite = 6) {
  const resultado = new Array(lista.length);
  let proximo = 0, concluidos = 0, falhou = false;
  progresso(0, lista.length);
  async function worker() {
    while (!falhou) {
      const i = proximo++;
      if (i >= lista.length) return;
      try {
        const historico = await carregar(lista[i].id);
        if (falhou) return;
        resultado[i] = { ...lista[i], historico };
        progresso(++concluidos, lista.length);
      } catch (e) { falhou = true; throw e; }
    }
  }
  await Promise.all(Array.from({length:Math.min(lista.length, Math.max(1, limite))}, worker));
  return resultado;
}

// Espera as assinaturas, sem a pausa fixa de quatro segundos da impressão.
export async function aguardarImagens(documento) {
  await Promise.all(Array.from(documento.images).map(imagem => imagem.complete
    ? Promise.resolve()
    : new Promise(resolve => {
      imagem.addEventListener('load', resolve, {once:true});
      imagem.addEventListener('error', resolve, {once:true});
    })));
  if (documento.fonts?.ready) await documento.fonts.ready;
}

export const ehNavegadorMovel = userAgent => /iPhone|iPad|iPod|Android/i.test(userAgent || '');
