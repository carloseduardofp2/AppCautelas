import { formatarPrevisao } from './estoque.mjs';
export const escapar = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = s => typeof s === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s) ? `<img alt="Assinatura" src="${s}" class="assinatura">` : 'Pendente';
const rotulo = { militar: 'Militar', om: 'OM', observacao: 'Observação', previsaoDevolucao: 'Previsão de devolução' };
const valorCampo = (k,v) => k === 'previsaoDevolucao' && v ? formatarPrevisao(v) : v || '(vazio)';
const hora = h => h?.em?.toDate ? h.em.toDate().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : h?.em?.seconds ? new Date(h.em.seconds * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Horário não disponível';
export function gerarHtmlLivro(lista) {
  const linhas = lista.map(c => {
    const original = c.dadosOriginais || c;
    const itens = c.materiaisOriginais || c.materiais;
    const materiais = Array.isArray(itens) ? itens.slice(0,6).map(m => `${escapar(m.nome)} (${escapar(m.quantidade)})`).join('<br>') : `${escapar(c.material)} (${escapar(c.quantidade)})`;
    let html = `<tr><td>${escapar(original.militar)} (${escapar(original.om || '-')})</td><td>${materiais}</td><td>${escapar(original.observacao || '-')}</td><td>${escapar(c.dataCautela)}</td><td>${escapar(c.milSecOpCautela)}</td><td>${img(c.assinaturaCautela)}</td><td>${escapar(c.dataEntrega || 'Pendente')}</td><td>${escapar(c.milSecOp || '-')}</td><td>${escapar(c.obsEntrega || '-')}</td><td>${img(c.assinaturaDevolucao)}</td></tr>`;
    if (Array.isArray(itens) && itens.length > 6) {
      html += '<tr><td colspan="10" class="subtitulo">MATERIAIS ORIGINAIS — CONTINUAÇÃO</td></tr>';
      for (const m of itens.slice(6)) html += `<tr><td colspan="8">${escapar(m.nome)}</td><td colspan="2">Quantidade: ${escapar(m.quantidade)}</td></tr>`;
    }
    if (c.previsaoDevolucao) html += `<tr><td colspan="10"><b>Previsão de devolução:</b> ${escapar(formatarPrevisao(c.previsaoDevolucao))} — ${escapar(c.militar)}</td></tr>`;
    const acrescimos = (c.historico || []).filter(h => h.tipo === 'adicionar');
    if (acrescimos.length) {
      html += '<tr><td colspan="10" class="subtitulo">MATERIAIS ADICIONADOS POSTERIORMENTE</td></tr>';
      for (const h of acrescimos) {
        html += `<tr><td colspan="3"><b>${escapar(hora(h))}</b><br>Lançado por: ${escapar(h.operador)}<br>Militar que cautelou: ${escapar(h.militar || c.militar)}</td><td colspan="7">${img(h.assinatura)}<br>Assinatura referente a este acréscimo</td></tr>`;
        for (const m of h.itens || []) html += `<tr><td colspan="8">${escapar(m.nome)}</td><td colspan="2">Quantidade: ${escapar(m.quantidade)}</td></tr>`;
      }
    }
    for (const h of (c.historico || []).filter(h => h.tipo === 'devolver' || h.tipo === 'editar')) {
      html += `<tr><td colspan="10" class="subtitulo">${h.tipo === 'editar' ? 'CORREÇÃO REGISTRADA' : 'DEVOLUÇÃO'} — ${escapar(hora(h))} — ${escapar(h.operador)}</td></tr>`;
      if (h.tipo === 'editar') {
        for (const k of Object.keys(h.antes || {}).filter(k => h.antes[k] !== h.depois[k])) html += `<tr><td colspan="2">${escapar(rotulo[k] || k)}</td><td colspan="4">Anterior: ${escapar(valorCampo(k,h.antes[k]))}</td><td colspan="4">Novo: ${escapar(valorCampo(k,h.depois[k]))}</td></tr>`;
        html += `<tr><td colspan="10">Motivo: ${escapar(h.motivo)}</td></tr>`;
      } else {
        for (const m of h.itens || []) html += `<tr><td colspan="8">${escapar(m.nome)}</td><td colspan="2">Devolvido: ${escapar(m.quantidade)}</td></tr>`;
        html += `<tr><td colspan="7">${escapar(h.observacao || 'Sem observações')}${h.semReposicaoAutomatica ? ' — Registro legado: houve item sem reposição automática de estoque.' : ''}</td><td colspan="3">${h.completa ? 'Assinatura final na linha principal' : img(h.assinatura)}</td></tr>`;
      }
    }
    return html;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Livro de Cautelas — SecOp</title><style>
    @page { size: A4 landscape; margin: 8mm; } body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 5px; } h3 { font-size: 12px; text-align: center; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; } th,td { border: 1px solid #94a3b8; padding: 5px; overflow-wrap: anywhere; vertical-align: middle; }
    th,.subtitulo { background: #e2e8f0; font-weight: bold; } tr { break-inside: avoid; page-break-inside: avoid; } thead { display: table-header-group; }
    .assinatura { width: 85px; max-width: 100%; height: 32px; object-fit: contain; }
  </style></head><body><h1>Livro de Cautelas</h1><h3>Seção de Operações</h3><table><thead><tr>
    <th>Militar (OM)</th><th>Material(is) / Qtd original</th><th>Obs Cautela</th><th>Retirada</th><th>Mil Sec Op (Saída)</th><th>Ass. Cautela</th><th>Entrega</th><th>Mil Sec Op (Retorno)</th><th>Obs Entrega</th><th>Ass. Devolução</th>
  </tr></thead><tbody>${linhas}</tbody></table></body></html>`;
}
