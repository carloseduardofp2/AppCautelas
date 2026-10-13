import test from 'node:test';
import assert from 'node:assert/strict';
import { movimentar, prepararDevolucao, validarPrevisao, inteiro, itensCautela, normalizarItens } from '../src/utils/estoque.mjs';
import { gerarHtmlLivro } from '../src/utils/pdfHtml.mjs';
test('sequência de retirada, segunda cautela, parcial e acréscimo conserva o total', () => {
 let s = { quantidade: 10, quantidadeCautelada: 0, quantidadeTotal: 10 };
 for (const [q, d, c] of [[3,7,3],[2,5,5],[-1,6,4],[2,4,6],[-6,10,0]]) {
  s = movimentar(s, q); assert.equal(s.quantidade,d); assert.equal(s.quantidadeCautelada,c); assert.equal(s.quantidadeTotal,10);
 }
});
test('recusa saldo insuficiente, devolução excessiva e dados inconsistentes', () => {
 for (const [s,q] of [[{quantidade:2,quantidadeCautelada:0},3],[{quantidade:2,quantidadeCautelada:1},-2],[{quantidade:2,quantidadeCautelada:1,quantidadeTotal:9},1]]) assert.throws(() => movimentar(s,q));
 for(const q of ['',null,-1,1.5,NaN,Infinity]) assert.throws(() => inteiro(q));
});
test('devolução parcial trabalha com pendente; não duplica a retirada', () => {
 const c={estoqueBaixado:true,materiais:[{nome:'Rádio',materialId:'r',quantidade:5,pendente:3}]};
 const d=prepararDevolucao(c,{'original-0':1}); assert.equal(d.itens[0].pendente,2); assert.equal(d.itens[0].quantidade,5); assert.deepEqual(d.movimentos,[['r',1]]);
 assert.throws(() => prepararDevolucao(c,{'original-0':4})); assert.throws(() => prepararDevolucao(c,{inexistente:1}));
 assert.throws(() => itensCautela({materiais:[{nome:'Inválido',quantidade:2,pendente:3}]}));
});
test('dados antigos sem campos opcionais continuam legíveis sem inventar vínculo', () => {
 const c={material:'Mesa',quantidade:'2'};assert.equal(itensCautela(c)[0].pendente,2);assert.equal(itensCautela(c)[0].estoqueControlado,false);
 assert.equal(itensCautela({...c,dataEntrega:'01/01/2026'})[0].pendente,0);
});
test('previsão opcional e calendário inválido',()=>{assert.equal(validarPrevisao(''),'');assert.equal(validarPrevisao('2026-10-05'),'2026-10-05');assert.throws(()=>validarPrevisao('2026-02-30'));});
test('PDF escapa conteúdo e não exibe seção de acréscimos vazia',()=>{
 const h=gerarHtmlLivro([{militar:'<script>alert(1)</script>',material:'Mesa',quantidade:1}]);assert.ok(!h.includes('<script>'));assert.ok(!h.includes('MATERIAIS ADICIONADOS'));assert.ok(!h.includes('undefined'));assert.ok(!h.includes('null'));
});
test('PDF preserva originais, previsão, acréscimos e histórico de correção',()=>{
 const h=gerarHtmlLivro([{militar:'Torcato',materiaisOriginais:[{nome:'Púlpito',quantidade:1}],materiais:[{nome:'Púlpito',quantidade:5}],previsaoDevolucao:'2026-10-05',historico:[{tipo:'adicionar',operador:'Operador',itens:[{nome:'Banner',quantidade:2}],em:{seconds:1790798400}},{tipo:'editar',antes:{militar:'Torcato'},depois:{militar:'Sd Torcato'},motivo:'Correção'}]}]);
 for(const t of ['Púlpito</td><td class="centro">1','05/10/2026','Acréscimo 1','Banner','Operador','Edição 2']) assert.ok(h.includes(t),t);
});

test('ordenação natural de prateleiras e caminhos com números',async()=>{
 const {compararNatural}=await import('../src/utils/ordenacao.mjs');
 assert.deepEqual(['Prateleira 10','Prateleira 3','Prateleira 1','Prateleira 2'].sort(compararNatural),['Prateleira 1','Prateleira 2','Prateleira 3','Prateleira 10']);
 assert.deepEqual(['Armário 2 › Gaveta 11','Armário 2 › Gaveta 3','Armário 1'].sort(compararNatural),['Armário 1','Armário 2 › Gaveta 3','Armário 2 › Gaveta 11']);
});

test('PDF mantém mais de seis materiais e acréscimos em operações sem duplicar',()=>{
 const itens=Array.from({length:11},(_,i)=>({nome:`Material-${i}`,quantidade:1}));
 const h=gerarHtmlLivro([{militar:'Sd Exemplo',materiaisOriginais:itens,materiais:[...itens,{nome:'Extra',quantidade:2}],historico:[{tipo:'adicionar',militar:'Sd Exemplo',operador:'Cb SecOp',itens:[{nome:'Extra',quantidade:2}]}]}]);
 assert.equal((h.match(/<tbody class="operacao">/g)||[]).length,3); // Duas partes da retirada + acréscimo.
 assert.ok(!h.includes('ORIGINAIS'));assert.ok(!h.includes('Qtd original'));
 for(const m of itens) assert.ok(h.includes(`${m.nome}</td><td class="centro">1`));
 assert.equal((h.match(/Extra<\/td>/g)||[]).length,1);
 assert.ok(h.includes('>Sd Exemplo</td>'));assert.ok(h.includes('>Cb SecOp</td>'));
});

test('PDF apresenta observação vigente uma vez e mantém edição identificada',()=>{
 const c={militar:'Sd Exemplo',observacao:'Texto corrigido',dadosOriginais:{militar:'Sd Exemplo',observacao:'Texto antigo repetido'},historico:[{tipo:'editar',militar:'Sd Assinante',operador:'Cb Operador',antes:{observacao:'Texto antigo repetido'},depois:{observacao:'Texto corrigido'},motivo:'Conferência'}]};
 const html=gerarHtmlLivro([c]);
 assert.equal((html.match(/Texto corrigido/g)||[]).length,1);
 assert.equal((html.match(/Texto antigo repetido/g)||[]).length,0);
 const [movimentos,notas]=html.split('<table class="notas">');
 assert.ok(!movimentos.includes('Texto corrigido'));assert.ok(notas.includes('Texto corrigido'));
 assert.ok(movimentos.includes('>Cb Operador</td>'));
 for(const label of ['Militar','Militar SecOp']) assert.ok(html.includes(`<th>${label}</th>`));
 assert.ok(html.includes('<b>OBS 1</b>'));assert.ok(html.includes('corrigida na Edição 1'));
 assert.ok(html.includes('Edição 1'));assert.equal(c.dadosOriginais.observacao,'Texto antigo repetido');
 const vazio=gerarHtmlLivro([{...c,observacao:'',historico:[{...c.historico[0],depois:{observacao:''}}]}]);assert.ok(vazio.includes('Sem observações.'));
});

test('exportação carrega históricos em paralelo limitado e preserva ordem e assinaturas',async()=>{
 const {carregarHistoricosParaPDF}=await import('../src/utils/exportacao.mjs');
 const lista=Array.from({length:14},(_,i)=>({id:String(i),assinaturaCautela:`assinatura-${i}`}));
 let ativos=0,pico=0;const progressos=[];
 const completos=await carregarHistoricosParaPDF(lista,async id=>{
  pico=Math.max(pico,++ativos);await new Promise(r=>setTimeout(r,Number(id)%2?1:5));ativos--;
  return [{id:`historico-${id}`,assinatura:`edicao-${id}`}];
 },n=>progressos.push(n));
 assert.equal(pico,6);assert.deepEqual(completos.map(c=>c.id),lista.map(c=>c.id));
 for(const c of completos){assert.equal(c.assinaturaCautela,`assinatura-${c.id}`);assert.equal(c.historico[0].assinatura,`edicao-${c.id}`);}
 assert.deepEqual(progressos,Array.from({length:15},(_,i)=>i));assert.equal(lista[0].historico,undefined);
 await assert.rejects(carregarHistoricosParaPDF(lista,async()=>{throw Error('Sem conexão');}),/Sem conexão/);
 assert.deepEqual(await carregarHistoricosParaPDF([],()=>{throw Error('Não deveria ler');}),[]);
});

test('impressão aguarda carregamento das assinaturas e fontes',async()=>{
 const {aguardarImagens}=await import('../src/utils/exportacao.mjs');
 const pendente=new EventTarget();pendente.complete=false;
 let terminou=false;let fontes;
 const pronto=aguardarImagens({images:[{complete:true},pendente],fonts:{ready:new Promise(r=>{fontes=r;})}}).then(()=>{terminou=true;});
 await Promise.resolve();assert.equal(terminou,false);
 pendente.dispatchEvent(new Event('load'));await Promise.resolve();assert.equal(terminou,false);
 fontes();await pronto;assert.equal(terminou,true);
});

test('reconhece Android para gerar arquivo PDF mesmo sem compartilhamento direto',async()=>{
 const {ehNavegadorMovel}=await import('../src/utils/exportacao.mjs');
 assert.equal(ehNavegadorMovel('Mozilla/5.0 (Linux; Android 16; SM-S731B) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'),true);
 assert.equal(ehNavegadorMovel('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36'),false);
});
