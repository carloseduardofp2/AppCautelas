import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Use firebase emulators:exec com demo-cautelas.');
const out='test-results';await mkdir(out,{recursive:true});
const app=initializeApp({projectId:'demo-cautelas',apiKey:'demo-key'},'e2e');const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});await signInAnonymously(auth);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080);
await setDoc(doc(db,'materiais','e2e-radio'),{item:'Rádio de teste',quantidade:10,quantidadeCautelada:0,quantidadeTotal:10,isFolder:false,path:[]});
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory','dist-test'],{stdio:'ignore'});
let browser, page;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:8765')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{console.log('DIALOG',d.message());return d.accept();});
 await page.goto('http://127.0.0.1:8765');await page.getByText('LIVRO DE CAUTELAS',{exact:true}).waitFor();
 await page.getByLabel('Abrir ações do Livro').click();await page.getByLabel('Nova cautela',{exact:true}).click();
 await page.getByPlaceholder('Mil Sec Op (Quem está entregando o material)').fill('Cb Operador');
 await page.getByPlaceholder('Militar que está pegando (ex: Cb Fulano)').fill('Sd Teste E2E');
 await page.getByLabel('Previsão de devolução (opcional)').fill('2026-10-05');
 await page.getByLabel('Selecionar material do estoque').click();await page.getByLabel('Pesquisar material no estoque').fill('radio');await page.getByRole('button',{name:'Rádio de teste, disponível: 10, Início',exact:true}).click();
 await page.getByLabel('Quantidade a adicionar').fill('3');await page.getByText('+ Adicionar',{exact:true}).click();
 await page.screenshot({path:`${out}/criacao-desktop.png`});
 await page.getByText('✍️ Assinar Agora',{exact:true}).click();
 async function assinar(){await page.locator('canvas').click({position:{x:10,y:10}});const b=await page.locator('canvas').boundingBox();await page.mouse.move(b.x+25,b.y+90);await page.mouse.down();for(let i=0;i<35;i++)await page.mouse.move(b.x+25+i*5,b.y+90+Math.sin(i)*20);await page.mouse.up();await page.screenshot({path:`${out}/assinatura.png`});await page.getByText('Confirmar',{exact:true}).click();await page.locator('canvas').waitFor({state:'hidden'});}
 await assinar();await page.getByText('Sd Teste E2E',{exact:true}).waitFor();
 let c=(await getDocs(collection(db,'cautelas'))).docs.find(d=>d.data().militar==='Sd Teste E2E');assert.ok(c);const id=c.id;
 let stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,7);assert.equal(stock.quantidadeCautelada,3);
 await page.getByText('+ Material',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Segundo');
 await page.getByLabel('Selecionar material do estoque').click();await page.getByRole('button',{name:'Rádio de teste, disponível: 7, Início',exact:true}).click();await page.getByLabel('Quantidade a adicionar').fill('2');await page.getByText('+ Adicionar',{exact:true}).click();await page.getByText('Conferir e assinar',{exact:true}).click();await assinar();
 await page.getByText('Acréscimos assinados: 1',{exact:true}).waitFor();stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,5);
 await page.getByText('Editar',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Corretor');await page.getByLabel('Motivo da correção').fill('Complementar observações');await page.getByLabel('Observação',{exact:true}).fill('Material conferido');await page.getByText('Salvar com histórico',{exact:true}).click();await page.getByText('Material conferido',{exact:true}).waitFor();
 await page.getByText('Pendentes',{exact:true}).click();await page.getByText('Selecionar devolução / detalhes',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Retorno');await page.getByLabel('Devolver Rádio de teste').fill('1');await page.getByText('Conferir e assinar',{exact:true}).click();await assinar();stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,6);assert.equal(stock.quantidadeCautelada,4);
 await page.getByText('Selecionar devolução / detalhes',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Final');await page.getByText('Selecionar toda a quantidade pendente',{exact:true}).click();await page.getByText('Conferir e assinar',{exact:true}).click();await assinar();await page.getByText('Tudo certo! Nenhum material pendente no momento.',{exact:true}).waitFor();stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,10);assert.equal(stock.quantidadeCautelada,0);
 await page.getByText('Livro',{exact:true}).click();assert.equal(await page.getByText('+ Material',{exact:true}).count(),0);
 assert.equal(await page.getByText('Detalhes / PDF',{exact:true}).count(),0);
 await page.getByLabel('Abrir ações do Livro').click();await page.getByText('📄',{exact:true}).click();
 const popupPromise=page.waitForEvent('popup');await page.getByText('Todas as Cautelas',{exact:true}).click();
 const popup=await popupPromise;await popup.getByText(/Acréscimo 1 ·/).waitFor();
 await popup.pdf({path:`${out}/livro-completo.pdf`,preferCSSPageSize:true,printBackground:true});await popup.close();

 for(const [w,h] of [[360,800],[768,1024],[1280,900]]){await page.setViewportSize({width:w,height:h});await page.reload();await page.getByText('LIVRO DE CAUTELAS',{exact:true}).waitFor();await page.screenshot({path:`${out}/livro-${w}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.getByText('Materiais',{exact:true}).click();await page.getByText('Rádio de teste',{exact:true}).waitFor();
 await page.getByText('⋮',{exact:true}).click();await page.getByText('Editar',{exact:true}).click();await page.getByText('Editar Item / Localização',{exact:true}).waitFor();
 assert.equal(await page.getByText('Adicionar foto',{exact:true}).count(),0);
 await page.getByText('Salvar Alterações',{exact:true}).click();await page.getByText('Editar Item / Localização',{exact:true}).waitFor({state:'hidden'});
 stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,10);assert.equal(stock.quantidadeCautelada,0);assert.equal(stock.quantidadeTotal,10);

 // Correção explícita de cautelados: responsável obrigatório, sem motivo e histórico persistido.
 await page.getByText('⋮',{exact:true}).click();await page.getByText('Editar',{exact:true}).click();
 await page.getByLabel('Quantidade cautelada').fill('2');
 await page.getByText('Salvar Alterações',{exact:true}).click();
 assert.equal((await getDoc(doc(db,'materiais','e2e-radio'))).data().quantidadeCautelada,0);
 await page.getByLabel('Responsável pelo ajuste').fill('Cb Conferente');
 assert.equal(await page.getByLabel('Motivo do ajuste').count(),0);
 await page.getByText('Conferência do estoque',{exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:`${out}/ajuste-estoque.png`});
 await page.getByText('Salvar Alterações',{exact:true}).click();
 await page.getByText('Editar Item / Localização',{exact:true}).waitFor({state:'hidden'});
 stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,10);assert.equal(stock.quantidadeCautelada,2);assert.equal(stock.quantidadeTotal,12);
 const ajustes=(await getDocs(collection(db,'materiais','e2e-radio','historico'))).docs.map(d=>d.data());
 assert.ok(ajustes.some(h=>h.tipo==='ajustar_saldo' && h.operador==='Cb Conferente' && h.antes.quantidadeCautelada===0 && h.depois.quantidadeCautelada===2));
 assert.equal((await getDoc(doc(db,'cautelas',id))).data().materiais[0].pendente,0);
 // Prévia com dados fictícios; pesquisa sem acento e por prateleira, limites e avulso.
 for(const [id,nome,q,p] of [['banner','Banner institucional',8,'Prateleira 2'],['pulpito','Púlpito',2,'Prateleira 1'],['megafone','Megafone',0,'Prateleira 3']]) await setDoc(doc(db,'materiais',id),{item:nome,quantidade:q,quantidadeCautelada:0,quantidadeTotal:q,path:['Sala',p],isFolder:false});
 await page.getByText('Livro',{exact:true}).click();await page.getByLabel('Abrir ações do Livro').click();await page.getByLabel('Nova cautela',{exact:true}).click();
 await page.getByPlaceholder('Mil Sec Op (Quem está entregando o material)').fill('Cb Operador');await page.getByPlaceholder('Militar que está pegando (ex: Cb Fulano)').fill('Sd Exemplo');
 await page.getByLabel('Selecionar material do estoque').click();await page.getByLabel('Pesquisar material no estoque').fill('pulpito');
 await page.getByRole('button',{name:'Púlpito, disponível: 2, Sala › Prateleira 1',exact:true}).click();
 await page.getByLabel('Quantidade a adicionar').fill('3');await page.getByText('+ Adicionar',{exact:true}).click();await page.getByText('Há somente 2 unidade(s) disponível(is) para adicionar.',{exact:true}).waitFor();
 await page.getByLabel('Quantidade a adicionar').fill('1');await page.getByText('+ Adicionar',{exact:true}).click();
 await page.getByRole('tab',{name:'Item avulso',exact:true}).click();await page.getByLabel('Nome do material avulso').fill('Extensão emprestada');await page.getByText('+ Adicionar',{exact:true}).click();
 await page.getByRole('tab',{name:'Do estoque',exact:true}).click();await page.getByLabel('Selecionar material do estoque').click();await page.getByLabel('Pesquisar material no estoque').fill('Prateleira 2');
 await page.getByRole('button',{name:'Banner institucional, disponível: 8, Sala › Prateleira 2',exact:true}).waitFor();
 await page.getByLabel('Pesquisar material no estoque').fill('');
 for(const [w,h] of [[1280,1000],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.getByText('Materiais da cautela',{exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:`${out}/selecao-${w}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await page.setViewportSize({width:1280,height:1000});await page.getByRole('tab',{name:'Item avulso',exact:true}).click();await page.getByText('Materiais da cautela',{exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${out}/avulso-desktop.png`});
 await page.getByRole('button',{name:'Remover Extensão emprestada',exact:true}).click();assert.equal(await page.getByText('Extensão emprestada',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('E2E PASS: busca, estoque/avulso, limites, assinatura, acréscimo, parcial/final, PDF geral, ajuste auditado, layout desktop/celular.');
}catch(e){await page?.screenshot({path:`${out}/falha.png`});console.error(e);throw e;}finally{await browser?.close();server.kill();await deleteApp(app);}
