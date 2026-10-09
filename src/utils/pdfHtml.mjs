import { formatarPrevisao } from './estoque.mjs';
export const escapar = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = s => typeof s === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s) ? `<img alt="Assinatura" src="${s}" class="assinatura">` : 'Pendente';
const hora = h => h?.em?.toDate ? h.em.toDate().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : h?.em?.seconds ? new Date(h.em.seconds * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Horário não disponível';
const listaItens = itens => itens.map(m => `<div class="item">${escapar(m.nome)} (${escapar(m.quantidade)})</div>`).join('');
const bloco = conteudo => `<div class="evento">${conteudo}</div>`;

export function gerarHtmlLivro(lista) {
  const linhas = lista.map(c => {
    // O snapshot evita contar um acréscimo duas vezes; não é uma seção do relatório.
    const original = c.dadosOriginais || c;
    const itens = c.materiaisOriginais || c.materiais;
    const historico = c.historico || [];
    const acrescimos = historico.filter(h => h.tipo === 'adicionar' || h.tipo === 'editar');
    let materiais = Array.isArray(itens) ? listaItens(itens) : `${escapar(c.material)} (${escapar(c.quantidade)})`;
    let assinaturaSaida = img(c.assinaturaCautela);
    let militar = `${escapar(original.militar)}<br><span class="discreto">${escapar(original.om || '-')}</span>`;
    let secop = escapar(c.milSecOpCautela);
    let observacao = escapar(original.observacao || '-');
    const previsaoOriginal = Object.hasOwn(original, 'previsaoDevolucao') ? original.previsaoDevolucao : c.previsaoDevolucao;
    let retirada = escapar(c.dataCautela) + (previsaoOriginal ? bloco(`<b>Previsão de devolução:</b><br>${escapar(formatarPrevisao(previsaoOriginal))}`) : '');
    acrescimos.forEach((h,i) => {
      const titulo = `<b>${h.tipo === 'editar' ? 'Edição' : 'Acréscimo'} ${i+1}</b>`;
      const mudou = k => h.antes && Object.hasOwn(h.antes,k) && h.antes[k] !== h.depois?.[k];
      if (h.itens?.length) materiais += bloco(`${titulo}${listaItens(h.itens)}`);
      const nome = h.militar || (h.tipo === 'editar' ? 'Não registrado' : original.militar || c.militar);
      militar += bloco(`${titulo}<div><b>Militar:</b> ${escapar(nome)}</div>${mudou('militar') ? `<div><b>Titular:</b> ${escapar(h.depois.militar)}</div>` : ''}${mudou('om') ? `<div><b>OM:</b> ${escapar(h.depois.om || '—')}</div>` : ''}`);
      secop += bloco(`${titulo}<div><b>Militar SecOp:</b> ${escapar(h.operador || '-')}</div>`);
      retirada += bloco(`${titulo}<div><b>Data:</b> ${escapar(hora(h))}</div>${mudou('previsaoDevolucao') ? `<div><b>Previsão de devolução:</b> ${escapar(h.depois.previsaoDevolucao ? formatarPrevisao(h.depois.previsaoDevolucao) : 'Sem previsão')}</div>` : ''}`);
      if (mudou('observacao') || h.motivo) observacao += bloco(`${titulo}${mudou('observacao') ? `<div><b>Observação:</b> ${escapar(h.depois.observacao || 'Sem observação')}</div>` : ''}${h.motivo ? `<div><b>Motivo:</b> ${escapar(h.motivo)}</div>` : ''}`);
      assinaturaSaida += bloco(`${titulo}<br>${h.tipo === 'editar' && !h.assinatura ? 'Registro anterior sem assinatura' : img(h.assinatura)}`);
    });
    let obsEntrega = escapar(c.obsEntrega || '-');
    let assinaturaRetorno = img(c.assinaturaDevolucao);
    historico.filter(h => h.tipo === 'devolver').forEach((h,i) => {
      obsEntrega += bloco(`<b>${h.completa ? 'Conclusão' : 'Parcial'} ${i+1} · ${escapar(hora(h))}</b><div><b>Militar SecOp:</b> ${escapar(h.operador || '-')}</div>${listaItens(h.itens || [])}${h.observacao && (!h.completa || h.observacao !== c.obsEntrega) ? `<div><b>Observação:</b> ${escapar(h.observacao)}</div>` : ''}`);
      if (!h.completa) assinaturaRetorno += bloco(`<b class="discreto">Parcial ${i+1}</b><br>${h.tipo === 'editar' && !h.assinatura ? 'Registro anterior sem assinatura' : img(h.assinatura)}`);
    });
    const extensa = (Array.isArray(itens) ? itens.length : 1) + acrescimos.reduce((n,h)=>n+(h.itens?.length || 0)+4,0) > 32;
    return `<tr${extensa ? ' class="extensa"' : ''}><td>${militar}</td><td>${materiais}</td><td>${observacao}</td><td>${retirada}</td><td>${secop}</td><td class="assinaturas">${assinaturaSaida}</td><td>${escapar(c.dataEntrega || 'Pendente')}</td><td>${escapar(c.milSecOp || '-')}</td><td>${obsEntrega}</td><td class="assinaturas">${assinaturaRetorno}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Livro de Cautelas — SecOp</title><style>
    @page { size: A4 landscape; margin: 8mm; } body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 5px; } h3 { font-size: 12px; text-align: center; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; line-height: 1.35; } th,td { border: 1px solid #94a3b8; padding: 5px; overflow-wrap: anywhere; vertical-align: middle; }
    th { background: #e2e8f0; font-weight: bold; } tr { break-inside: avoid; page-break-inside: avoid; } tr.extensa { break-inside: auto; page-break-inside: auto; } thead { display: table-header-group; }
    .item { margin: 2px 0; } .evento { border-top: 1px solid #cbd5e1; padding-top: 5px; margin-top: 5px; } .discreto { color: #475569; font-size: 8px; } .assinaturas { text-align: center; }
    .assinatura { width: 80px; max-width: 100%; height: 30px; object-fit: contain; }
  </style></head><body><h1>Livro de Cautelas</h1><h3>Seção de Operações</h3><table><colgroup>${[12,23,10,9,8,8,7,8,7,8].map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead><tr>
    <th>Militar (OM)</th><th>Material(is) / Quantidade</th><th>Obs Cautela</th><th>Retirada</th><th>Mil Sec Op (Saída)</th><th>Ass. Cautela</th><th>Entrega</th><th>Mil Sec Op (Retorno)</th><th>Obs Entrega</th><th>Ass. Devolução</th>
  </tr></thead><tbody>${linhas}</tbody></table></body></html>`;
}
