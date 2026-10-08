import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, collection, disableNetwork, enableNetwork } from 'firebase/firestore';
import { salvarMovimentacao } from '../src/services/cautelaService.js';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Execute somente com firebase emulators:exec.');
const apps=[];
async function cliente(nome,login=true){const app=initializeApp({projectId:'demo-cautelas',apiKey:'demo-key'},nome);apps.push(app);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080);const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});if(login)await signInAnonymously(auth);return {app,db,uid:auth.currentUser?.uid};}
const a=await cliente('a'),b=await cliente('b');
const assinatura='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const base={operador:'Cb Teste',uid:a.uid,assinatura,dataHoje:'30/09/2026',dataCautela:'30/09/2026',militar:'Sd Torcato',om:'Cia',observacao:''};
const salvar=(p,db=a.db)=>salvarMovimentacao(db,{...base,...p});
const material=async(id,total=10)=>setDoc(doc(a.db,'materiais',id),{item:id,quantidade:total,quantidadeCautelada:0,quantidadeTotal:total,isFolder:false});
const item=(id,q)=>({nome:id,materialId:id,quantidade:q});
async function saldos(id,d,c){const s=(await getDoc(doc(a.db,'materiais',id))).data();assert.equal(s.quantidade,d);assert.equal(s.quantidadeCautelada,c);assert.equal(s.quantidadeTotal,d+c);}

test('fluxos integrados: criar duas, parcial, acrescentar, editar, PDF data e finalizar',async()=>{
 await material('radio');
 await salvar({tipo:'criar',operacaoId:'c1',itens:[item('radio',3)],previsaoDevolucao:'2026-10-05'});await saldos('radio',7,3);
 await salvar({tipo:'criar',operacaoId:'c2',itens:[item('radio',2)]});await saldos('radio',5,5);
 await salvar({tipo:'devolver',cautelaId:'c1',operacaoId:'d1',quantidades:{'original-0':1}});await saldos('radio',6,4);
 await salvar({tipo:'adicionar',cautelaId:'c1',operacaoId:'a1',itens:[item('radio',2)]});await saldos('radio',4,6);
 await salvar({tipo:'adicionar',cautelaId:'c1',operacaoId:'a1',itens:[item('radio',2)]});await saldos('radio',4,6);
 const c=(await getDoc(doc(a.db,'cautelas','c1'))).data();assert.equal(c.totalAcrescimos,1);assert.equal(c.materiaisOriginais[0].quantidade,3);assert.equal(c.previsaoDevolucao,'2026-10-05');
 await salvar({tipo:'editar',cautelaId:'c1',operacaoId:'e1',revisao:c.revisao,motivo:'Corrigir OM',om:'Outra OM',previsaoDevolucao:'2026-10-06'});await saldos('radio',4,6);
 await assert.rejects(salvar({tipo:'editar',cautelaId:'c1',operacaoId:'e2',revisao:c.revisao,motivo:'Edição desatualizada'}));
 await salvar({tipo:'devolver',cautelaId:'c1',operacaoId:'d2',quantidades:{'original-0':4}});await saldos('radio',8,2);
 await assert.rejects(salvar({tipo:'adicionar',cautelaId:'c1',operacaoId:'a2',itens:[item('radio',1)]}));
 await salvar({tipo:'devolver',cautelaId:'c2',operacaoId:'d3',quantidades:{'original-0':2}});await saldos('radio',10,0);
});
test('concorrência real: somente um dispositivo consegue retirar o último item',async()=>{
 await material('ultimo',1);
 const r=await Promise.allSettled([salvar({tipo:'criar',operacaoId:'race1',itens:[item('ultimo',1)]}),salvar({tipo:'criar',operacaoId:'race2',uid:b.uid,itens:[item('ultimo',1)]},b.db)]);
 assert.equal(r.filter(x=>x.status==='fulfilled').length,1);await saldos('ultimo',0,1);
});
test('duas devoluções concorrentes não repõem o mesmo saldo duas vezes',async()=>{
 await material('devolver',2);await salvar({tipo:'criar',operacaoId:'dupla',itens:[item('devolver',2)]});
 const r=await Promise.allSettled(['ret1','ret2'].map(operacaoId=>salvar({tipo:'devolver',cautelaId:'dupla',operacaoId,quantidades:{'original-0':2}})));
 assert.equal(r.filter(x=>x.status==='fulfilled').length,1);await saldos('devolver',2,0);
});
test('falha em um item deixa toda a operação sem alterações; avulsos não movimentam estoque',async()=>{
 await material('ok',5);
 await assert.rejects(salvar({tipo:'criar',operacaoId:'falha',itens:[item('ok',2),item('ausente',1)]}));await saldos('ok',5,0);assert.equal((await getDoc(doc(a.db,'cautelas','falha'))).exists(),false);
 await salvar({tipo:'criar',operacaoId:'avulso',itens:[item('ok',2),{nome:'Avulso',quantidade:2}]});await saldos('ok',3,2);
 await salvar({tipo:'excluir',operacaoId:'exclusao',cautelaId:'avulso'});await saldos('ok',5,0);assert.equal((await getDoc(doc(a.db,'cautelas','avulso'))).data().excluida,true);
});
test('legado sem baixa comprovada não repõe estoque; adição nova mantém vínculo',async()=>{
 await material('legado',10);await setDoc(doc(a.db,'cautelas','antiga'),{militar:'Sd Antigo',assinaturaCautela:assinatura,materiais:[{nome:'legado',materialId:'legado',quantidade:2}],dataCautela:'01/09/2026'});
 await salvar({tipo:'adicionar',cautelaId:'antiga',operacaoId:'legadd',itens:[item('legado',1)]});await saldos('legado',9,1);
 const c=(await getDoc(doc(a.db,'cautelas','antiga'))).data();await salvar({tipo:'devolver',cautelaId:'antiga',operacaoId:'legreturn',quantidades:Object.fromEntries(c.materiais.map(m=>[m.linhaId,m.pendente]))});await saldos('legado',10,0);
});
test('assinatura obrigatória em acréscimos e histórico não duplicado',async()=>{
 await material('sig',5);await salvar({tipo:'criar',operacaoId:'sigc',itens:[item('sig',1)]});
 await assert.rejects(salvar({tipo:'adicionar',cautelaId:'sigc',operacaoId:'sigbad',assinatura:'',itens:[item('sig',1)]}));await saldos('sig',4,1);
 assert.equal((await getDocs(collection(a.db,'cautelas','sigc','historico'))).size,1);
});
test('legado já reposto não movimenta novamente e assinatura final pendente preserva tudo',async()=>{
 await material('reposto',10);
 const antiga={militar:'Sd Original',dataCautela:'01/09/2026',dataEntrega:'02/09/2026',assinaturaCautela:assinatura,estoqueBaixado:true,estoqueDevolvido:true,materiais:[{nome:'reposto',materialId:'reposto',quantidade:2}],observacao:'Preservar'};
 await setDoc(doc(a.db,'cautelas','reposta'),antiga);
 await salvar({tipo:'assinar_devolucao',cautelaId:'reposta',operacaoId:'assinatura-final'});
 const c=(await getDoc(doc(a.db,'cautelas','reposta'))).data();
 for(const k of ['militar','dataCautela','dataEntrega','assinaturaCautela','observacao'])assert.equal(c[k],antiga[k]);
 assert.equal(c.assinaturaDevolucao,assinatura);await saldos('reposto',10,0);
 await assert.rejects(salvar({tipo:'assinar_devolucao',cautelaId:'reposta',operacaoId:'assinatura-repetida'}));
 await setDoc(doc(a.db,'cautelas','reposta-incompleta'),{...antiga,dataEntrega:''});
 await assert.rejects(salvar({tipo:'devolver',cautelaId:'reposta-incompleta',operacaoId:'retorno-duplicado',quantidades:{'original-0':2}}));
 await assert.rejects(salvar({tipo:'adicionar',cautelaId:'reposta-incompleta',operacaoId:'adicao-fechada',itens:[item('reposto',1)]}));
 await salvar({tipo:'excluir',cautelaId:'reposta-incompleta',operacaoId:'arquivar-reposta'});await saldos('reposto',10,0);
});
test('fixture recusa acesso sem sessão',async()=>{
 const sem=await cliente('sem',false);await assert.rejects(setDoc(doc(sem.db,'materiais','negado'),{}));

});
after(async()=>{await Promise.all(apps.map(deleteApp));});

test('ajuste manual auditado, saldo corrigido e proteção contra edição concorrente',async()=>{
 const {editarMaterial}=await import('../src/services/materialService.js');
 await material('ajuste',10);
 const ref=doc(a.db,'materiais','ajuste');
 const original=(await getDoc(ref)).data();
 const dados={item:'ajuste',quantidade:7,quantidadeCautelada:3,path:[],observacao:''};
 await assert.rejects(editarMaterial(a.db,{materialId:'ajuste',original,dados,uid:a.uid,operador:'',motivo:''}));
 await saldos('ajuste',10,0);
 await editarMaterial(a.db,{materialId:'ajuste',original,dados,uid:a.uid,operador:'Cb Conferente'});
 await saldos('ajuste',7,3);
 const h=(await getDocs(collection(a.db,'materiais','ajuste','historico'))).docs[0].data();
 assert.equal(h.tipo,'ajustar_saldo');assert.equal(h.antes.quantidadeCautelada,0);assert.equal(h.depois.quantidadeCautelada,3);assert.equal(h.operador,'Cb Conferente');
 await assert.rejects(editarMaterial(a.db,{materialId:'ajuste',original,dados:{...dados,quantidade:6},uid:a.uid,operador:'Cb Outro',motivo:'Conferência concorrente'}),/mudou/);
 await assert.rejects(editarMaterial(a.db,{materialId:'ajuste',original,dados:{...dados,quantidadeCautelada:-1},uid:a.uid,operador:'Cb Outro',motivo:'Inválido'}));
 await saldos('ajuste',7,3);
});

test('acréscimo identifica quem cautela e a SecOp sem mudar o militar original',async()=>{
 await material('duas-identidades',4);
 await salvar({tipo:'criar',operacaoId:'nomes-cautela',itens:[item('duas-identidades',1)]});
 await assert.rejects(salvar({tipo:'adicionar',cautelaId:'nomes-cautela',operacaoId:'nome-vazio',militar:' ',itens:[item('duas-identidades',1)]}),/Militar/);
 await saldos('duas-identidades',3,1);
 await salvar({tipo:'adicionar',cautelaId:'nomes-cautela',operacaoId:'nomes-acrescimo',militar:'Sd Outro Militar',operador:'Cb Responsável SecOp',itens:[item('duas-identidades',1)]});
 const cautela=(await getDoc(doc(a.db,'cautelas','nomes-cautela'))).data();
 const evento=(await getDoc(doc(a.db,'cautelas','nomes-cautela','historico','nomes-acrescimo'))).data();
 assert.equal(cautela.militar,'Sd Torcato');assert.equal(evento.militar,'Sd Outro Militar');assert.equal(evento.operador,'Cb Responsável SecOp');
 const {gerarHtmlLivro}=await import('../src/utils/pdfHtml.mjs');
 const html=gerarHtmlLivro([{...cautela,historico:[evento]}]);
 assert.ok(html.includes('Cautelado por: Sd Outro Militar'));assert.ok(html.includes('Militar SecOp: Cb Responsável SecOp'));
 await saldos('duas-identidades',2,2);
});

test('edição unificada assinada é atômica, idempotente e preserva titular e originais',async()=>{
 await material('unificado',10);
 await salvar({tipo:'criar',operacaoId:'unificada',itens:[item('unificado',3)]});
 const edicao={tipo:'editar',cautelaId:'unificada',operacaoId:'unificada-e1',revisao:1,militarRetirada:'Sd Retirante',operador:'Cb SecOp',observacao:'Conferido',itens:[item('unificado',2)]};
 await assert.rejects(salvar({...edicao,militarRetirada:''}));
 await assert.rejects(salvar({...edicao,assinatura:''}));await saldos('unificado',7,3);
 await assert.rejects(salvar({...edicao,itens:[item('unificado',8)]}));
 assert.equal((await getDoc(doc(a.db,'cautelas','unificada'))).data().observacao,'');
 assert.equal((await getDoc(doc(a.db,'cautelas','unificada','historico',edicao.operacaoId))).exists(),false);
 await salvar(edicao);await salvar(edicao);await saldos('unificado',5,5);
 let c=(await getDoc(doc(a.db,'cautelas','unificada'))).data();
 assert.equal(c.militar,'Sd Torcato');assert.equal(c.observacao,'Conferido');assert.equal(c.materiaisOriginais[0].quantidade,3);
 const h=(await getDoc(doc(a.db,'cautelas','unificada','historico',edicao.operacaoId))).data();
 assert.equal(h.assinatura,assinatura);assert.equal(h.militar,'Sd Retirante');assert.equal(h.operador,'Cb SecOp');assert.equal(h.itens[0].quantidade,2);
 const {gerarHtmlLivro}=await import('../src/utils/pdfHtml.mjs');const html=gerarHtmlLivro([{...c,historico:[h]}]);
 for(const texto of ['Edição 1','unificado (3)','unificado (2)','Sd Retirante','Militar SecOp: Cb SecOp','Conferido']) assert.ok(html.includes(texto),texto);
 assert.equal((html.match(/<tr/g)||[]).length,2);assert.equal((html.match(/<img /g)||[]).length,2);
 await salvar({...edicao,operacaoId:'unificada-e2',revisao:c.revisao,itens:[],observacao:'Correção sem retirada'});await saldos('unificado',5,5);
 c=(await getDoc(doc(a.db,'cautelas','unificada'))).data();
 await salvar({tipo:'devolver',cautelaId:'unificada',operacaoId:'unificada-d',quantidades:Object.fromEntries(c.materiais.map(m=>[m.linhaId,m.pendente]))});await saldos('unificado',10,0);
 c=(await getDoc(doc(a.db,'cautelas','unificada'))).data();
 await assert.rejects(salvar({...edicao,operacaoId:'unificada-fechada',revisao:c.revisao}),/finalizada/);await saldos('unificado',10,0);
});
