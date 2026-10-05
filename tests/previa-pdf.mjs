import {chromium} from 'playwright';
import {gerarHtmlLivro} from '../src/utils/pdfHtml.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const assinatura=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=60;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,200,60);x.fillStyle='#475569';x.font='16px Arial';x.fillText('EXEMPLO',52,36);return c.toDataURL('image/png');});
 const nomes=['Banner da Cia','Banner de segurança','Púlpito','Abafadores','Protetor auricular','Porta-banner','Kit microfone','Caixa de som','Colmeias 9 mm','Bandeira do Brasil','Bandeira da Cia'];
 const base={om:'Cia C/3ª DE',dataCautela:'03/10/2026',milSecOpCautela:'Cb Exemplo',assinaturaCautela:assinatura,observacao:'Material para formatura'};
 const lista=[{...base,militar:'Sd Exemplo',materiaisOriginais:[{nome:'Púlpito',quantidade:1},{nome:'Banner',quantidade:1}],previsaoDevolucao:'2026-10-05',historico:[{tipo:'adicionar',militar:'Sd Exemplo',operador:'Cb Exemplo',em:{seconds:1791048000},itens:[{nome:'Banner',quantidade:1}],assinatura},{tipo:'adicionar',militar:'Sd Exemplo',operador:'Cb Exemplo',em:{seconds:1791051600},itens:[{nome:'Caixa de som',quantidade:1}],assinatura}]},{...base,militar:'Sgt Demonstração',materiais:nomes.map((nome,i)=>({nome,quantidade:i===3?10:1}))},{...base,militar:'Cb Demonstração',materiais:[{nome:'Rádio',quantidade:2}],dataEntrega:'03/10/2026',milSecOp:'Cb Exemplo',obsEntrega:'Conferido',assinaturaDevolucao:assinatura}];
 let html=gerarHtmlLivro(lista).replace('<h3>Seção de Operações</h3>','<h3>Seção de Operações · PRÉVIA COM DADOS FICTÍCIOS</h3>');
 await page.setContent(html);await page.pdf({path:'output/pdf/previa-livro-cautelas.pdf',preferCSSPageSize:true,printBackground:true});
} finally {await browser.close();}
