import { formatarPrevisao } from './estoque.mjs';
import { observacoesCautela } from './observacoes.mjs';
export const escapar = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const texto = v => escapar(v).replace(/\n/g,'<br>');
const img = (s, vazio='Pendente') => typeof s === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s) ? `<img alt="Assinatura" src="${s}" class="assinatura">` : vazio;
const hora = h => h?.em?.toDate ? h.em.toDate().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : h?.em?.seconds ? new Date(h.em.seconds*1000).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : 'Data não registrada';
const mudou = (h,k) => h.antes && Object.hasOwn(h.antes,k) && h.antes[k] !== h.depois?.[k];

export function gerarHtmlLivro(lista) {
 const blocos=lista.map(c=>{
  const original=c.dadosOriginais || c;
  const notas=observacoesCautela(c);
  const historico=c.historico || [];
  const saidas=historico.filter(h=>['editar','adicionar'].includes(h.tipo));
  const devolucoes=historico.filter(h=>h.tipo==='devolver');
  const tituloEvento=h=>`${h.tipo==='adicionar'?'Acréscimo':'Edição'} ${saidas.indexOf(h)+1}`;
  const refs=(h)=> h ? (h.observacoesAlteradas || []).map(o=>o.id) : notas.filter(o=>!o.origemOperacaoId || o.origemOperacaoId==='legado' || o.origemOperacaoId===c.id).map(o=>o.id);
  const operacoes=[{titulo:'Retirada',data:c.dataCautela,itens:c.materiaisOriginais || c.materiais || [{nome:c.material,quantidade:c.quantidade}],militar:original.militar,om:original.om,secop:c.milSecOpCautela,assinatura:img(c.assinaturaCautela),final:'-',notas:refs(null)}];
  const avisos=[];
  historico.forEach(h=>{
   if (['editar','adicionar'].includes(h.tipo)) {
    const ids=refs(h);
    if (mudou(h,'observacao') && !h.observacoesAlteradas && notas[0]) ids.push(notas[0].id);
    const detalhes=[];
    if(mudou(h,'militar'))detalhes.push(`<b>Titular:</b> ${escapar(h.depois.militar)}`);
    if(mudou(h,'om'))detalhes.push(`<b>OM:</b> ${escapar(h.depois.om || '-')}`);
    if(mudou(h,'previsaoDevolucao'))detalhes.push(`<b>Previsão:</b> ${escapar(h.depois.previsaoDevolucao ? formatarPrevisao(h.depois.previsaoDevolucao) : 'Sem previsão')}`);
    if(h.motivo)detalhes.push(`<b>Motivo:</b> ${texto(h.motivo)}`);
    operacoes.push({titulo:tituloEvento(h),data:hora(h),itens:h.itens || [],militar:h.militar || 'Não registrado',secop:h.operador,assinatura:img(h.assinatura,'Não registrada'),final:'-',notas:ids,detalhes:detalhes.join('<br>')});
   } else if(h.tipo==='devolver') {
    operacoes.push({titulo:h.completa?'Devolução total':'Devolução parcial',data:hora(h),itens:h.itens || [],militar:h.militar || 'Não registrado',secop:h.operador,assinatura:h.completa?'-':img(h.assinatura,'Não registrada'),final:h.completa?img(c.assinaturaDevolucao):'-',notas:[]});
    if(h.semReposicaoAutomatica)avisos.push('Registro antigo: houve devolução sem reposição automática no estoque.');
   }
  });
  if(c.dataEntrega && !devolucoes.some(h=>h.completa)) operacoes.push({titulo:'Devolução total',data:c.dataEntrega,itens:[],militar:'Não registrado',secop:c.milSecOp,assinatura:'-',final:img(c.assinaturaDevolucao),notas:[]});
  const cabecalho=`<tr class="identidade"><th colspan="4">${escapar(c.militar)}${c.om?' · '+escapar(c.om):''}</th><th colspan="3">${c.previsaoDevolucao?`<b>Previsão:</b> ${escapar(formatarPrevisao(c.previsaoDevolucao))} · `:''}${c.dataEntrega?'Devolvida':'Pendente'}</th></tr><tr><th>Operação / Data</th><th>Material</th><th>Qtd.</th><th>Militar</th><th>Assinatura<br><small>Retirada / Edições</small></th><th>Militar SecOp</th><th>Assinatura<br><small>Devolução total</small></th></tr>`;
  const linhas=operacoes.map(op=>{
   const materiais=op.itens.length?op.itens:[{nome:'-',quantidade:'-'}];
   let html='';
   // Pequenos grupos evitam uma célula de assinatura atravessando várias páginas.
   for(let inicio=0;inicio<materiais.length;inicio+=6){
    const grupo=materiais.slice(inicio,inicio+6);
    html+='<tbody class="operacao">'+grupo.map((m,i)=>{
     const numeros=notas.filter(o=>op.notas.includes(o.id) && o.material && o.material===m.nome).map(o=>`OBS ${o.numero}`);
     const celulaMaterial=`<td>${texto(m.nome)}${numeros.length?` <b class="referencia">· ${numeros.join(', ')}</b>`:''}</td><td class="centro">${escapar(m.quantidade)}</td>`;
     const gerais=notas.filter(o=>op.notas.includes(o.id) && (!o.material || !op.itens.some(m=>m.nome===o.material)));
     const infoNotas=gerais.length ? '<div>'+gerais.map(o=>`<b>OBS ${o.numero}</b>`).join(', ')+'</div>':'';
     return `<tr>${i===0?`<td rowspan="${grupo.length}"><b>${escapar(op.titulo)}${inicio?' (cont.)':''}</b><br>${escapar(op.data || '-')}</td>`:''}${celulaMaterial}${i===0?`<td rowspan="${grupo.length}">${texto(op.militar || '-')}${op.om && op.om!==c.om?`<br><small><b>OM:</b> ${escapar(op.om)}</small>`:''}</td><td rowspan="${grupo.length}" class="centro">${op.assinatura}</td><td rowspan="${grupo.length}">${texto(op.secop || '-')}</td><td rowspan="${grupo.length}" class="centro">${op.final}</td>`:''}</tr>${i===grupo.length-1 && (op.detalhes || infoNotas)?`<tr><td colspan="7" class="alteracoes">${infoNotas}${op.detalhes || ''}</td></tr>`:''}`;
    }).join('')+'</tbody>';
   }
   return html;
  }).join('');
  const notasHtml=notas.map(o=>{
   const evento=saidas.find(h=>o.ultimaOperacaoId && (h.id===o.ultimaOperacaoId || h.observacoesAlteradas?.some(a=>a.id===o.id && a.depois?.ultimaOperacaoId===o.ultimaOperacaoId)));
   const corrigida=evento?.observacoesAlteradas?.find(a=>a.id===o.id)?.antes;
   // Em dados antigos, as edições substituíam um único texto; exibir somente sua versão atual.
   const ultimaLegada=!Array.isArray(c.observacoes)?saidas.filter(h=>mudou(h,'observacao')).at(-1):null;
   const detalhe=corrigida?` · corrigida na ${tituloEvento(evento)}`:ultimaLegada?` · corrigida na ${tituloEvento(ultimaLegada)}`:'';
   return `<b>OBS ${o.numero}${o.material?' · '+escapar(o.material):''}</b>${detalhe?` <small>${escapar(detalhe)}</small>`:''}: ${texto(o.texto || 'Sem observação')}`;
  });
  const retornos=devolucoes.filter(h=>h.observacao).map(h=>`<b>${h.completa?'Retorno':'Retorno parcial'} · ${escapar(hora(h))}</b><br>${texto(h.observacao)}<br><b>Militar SecOp:</b> ${escapar(h.operador || '-')}`);
  if(c.obsEntrega && !devolucoes.some(h=>h.completa && h.observacao===c.obsEntrega))retornos.push(`<b>Retorno:</b> ${texto(c.obsEntrega)}<br><b>Militar SecOp:</b> ${escapar(c.milSecOp || '-')}`);
  retornos.push(...avisos.map(escapar));
  if(!notasHtml.length)notasHtml.push('Sem observações.');
  if(!retornos.length)retornos.push(c.dataEntrega?'Sem observações no retorno.':'Aguardando devolução.');
  const observacoes=Array.from({length:Math.max(notasHtml.length,retornos.length)},(_,i)=>`<tbody class="nota"><tr><td>${notasHtml[i] || ''}</td><td>${retornos[i] || ''}</td></tr></tbody>`).join('');
  return `<section class="cautela"><table class="movimentos"><colgroup>${[13,22.5,5,14.5,15,14,16].map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead>${cabecalho}</thead>${linhas}</table><table class="notas"><colgroup><col style="width:64%"><col style="width:36%"></colgroup><thead><tr><th>Observações</th><th>Observações Militar SecOp</th></tr></thead>${observacoes}</table></section>`;
 }).join('');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Livro de Cautelas — SecOp</title><style>
 @page{size:A4 landscape;margin:9mm}body{font-family:Arial,sans-serif;color:#172334;margin:0}h1{text-align:center;font-size:19px;margin:0 0 5px}h3{text-align:center;font-size:11px;font-weight:normal;margin:0 0 16px}
 table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;line-height:1.35}th,td{border:1px solid #bfc8d1;padding:6px;vertical-align:top;overflow-wrap:anywhere;word-wrap:break-word}th{text-align:center;background:#edf1f5;font-weight:bold}thead{display:table-header-group}.identidade th{text-align:left;font-size:10px}.identidade th:last-child{font-size:9px}.cautela{margin-bottom:14px}.operacao{break-inside:avoid;page-break-inside:avoid}.centro{text-align:center}.assinatura{width:105px;max-width:100%;height:32px;object-fit:contain}small{font-size:8px;color:#566273}.alteracoes{font-size:9px;background:#fafbfc}.notas{margin-top:-1px}.nota{break-inside:avoid;page-break-inside:avoid}.referencia{font-size:9px}
 </style></head><body><h1>Livro de Cautelas</h1><h3>Seção de Operações</h3>${blocos || '<p>Nenhuma cautela no período.</p>'}</body></html>`;
}
