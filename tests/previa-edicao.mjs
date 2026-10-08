import {writeFileSync} from 'node:fs';
import {gerarHtmlLivro} from '../src/utils/pdfHtml.mjs';
// Dados fictícios; nenhuma conexão ao Firebase.
const assinatura=process.env.ASSINATURA_PREVIA;
const base={militar:'Sd Exemplo',om:'Cia C/3ª DE',dataCautela:'08/10/2026',milSecOpCautela:'Cb Operador',assinaturaCautela:assinatura,observacao:'Material para formatura',previsaoDevolucao:'2026-10-10',materiaisOriginais:[{nome:'Púlpito',quantidade:1},{nome:'Banner',quantidade:1}]};
const lista=[{...base,historico:[{tipo:'editar',militar:'Sd Retirante',operador:'Cb SecOp',em:{seconds:1791478800},itens:[{nome:'Banner',quantidade:1}],antes:{previsaoDevolucao:'2026-10-09'},depois:{previsaoDevolucao:'2026-10-10'},assinatura},{tipo:'editar',militar:'Sd Exemplo',operador:'Sgt Operador',em:{seconds:1791482400},itens:[],antes:{observacao:'Material para formatura'},depois:{observacao:'Uso no pátio'},assinatura}]},{...base,militar:'Cb Demonstração',previsaoDevolucao:'',materiaisOriginais:[{nome:'Rádio',quantidade:2}],historico:[]}];
writeFileSync('output/pdf/previa-edicao-unificada.html',gerarHtmlLivro(lista).replace('<h3>Seção de Operações</h3>','<h3>Seção de Operações · PRÉVIA COM DADOS FICTÍCIOS</h3>'));
