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
