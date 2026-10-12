import { texto } from './estoque.mjs';

// Leitura compatível: o texto antigo vira OBS 1 sem escrever no banco.
export function observacoesCautela(c = {}) {
  if (Array.isArray(c.observacoes)) return c.observacoes.map(o => ({ ...o }));
  return String(c.observacao || '').trim() ? [{ id:'obs-1', numero:1, texto:c.observacao, material:'' }] : [];
}
export function prepararObservacoes(c, entrada, operacaoId) {
  const anteriores = observacoesCautela(c);
  if (!Array.isArray(entrada) || entrada.length > 50 || entrada.length < anteriores.length) throw new Error('Mantenha as observações existentes. Para corrigir, edite o texto. Limite: 50 observações.');
  const alteradas = [];
  const lista = entrada.map((o,i) => {
    const antes = anteriores[i];
    if (antes && o.id !== antes.id) throw new Error('A ordem das observações mudou. Reabra a edição.');
    const numero = i+1;
    const atual = {...(antes || {}), id:antes?.id || `obs-${numero}`, numero,
      texto:texto(o.texto, `OBS ${numero}`, 2000, false), material:texto(o.material, 'Material da observação', 200, false)};
    if (!antes && !atual.texto) throw new Error(`OBS ${numero}: escreva a observação ou remova o campo vazio.`);
    if (!antes || atual.texto !== antes.texto || atual.material !== (antes.material || '')) {
      atual.origemOperacaoId = antes?.origemOperacaoId || (antes ? 'legado' : operacaoId);
      atual.ultimaOperacaoId = operacaoId;
      alteradas.push({id:atual.id,numero,antes:antes || null,depois:{...atual}});
    }
    return atual;
  });
  return { lista, alteradas, resumo:lista.map(o => o.texto).filter(Boolean).join('\n') };
}
