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
 await page.getByText('Selecionar do estoque',{exact:true}).click();await page.getByText('Rádio de teste — disponível: 10',{exact:true}).click();
 await page.getByPlaceholder('Qtd',{exact:true}).fill('3');
 await page.screenshot({path:`${out}/criacao-desktop.png`});
 await page.getByText('✍️ Assinar Agora',{exact:true}).click();
 async function assinar(){await page.locator('canvas').click({position:{x:10,y:10}});const b=await page.locator('canvas').boundingBox();await page.mouse.move(b.x+25,b.y+90);await page.mouse.down();for(let i=0;i<35;i++)await page.mouse.move(b.x+25+i*5,b.y+90+Math.sin(i)*20);await page.mouse.up();await page.screenshot({path:`${out}/assinatura.png`});await page.getByText('Confirmar',{exact:true}).click();await page.locator('canvas').waitFor({state:'hidden'});}
 await assinar();await page.getByText('Sd Teste E2E',{exact:true}).waitFor();
 let c=(await getDocs(collection(db,'cautelas'))).docs.find(d=>d.data().militar==='Sd Teste E2E');assert.ok(c);const id=c.id;
 let stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,7);assert.equal(stock.quantidadeCautelada,3);
 await page.getByText('+ Material',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Segundo');
 await page.getByText('Selecionar do estoque',{exact:true}).click();await page.getByText('Rádio de teste — disponível: 7',{exact:true}).click();await page.getByLabel('Quantidade de Rádio de teste').fill('2');await page.getByText('Conferir e assinar',{exact:true}).click();await assinar();
 await page.getByText('Acréscimos assinados: 1',{exact:true}).waitFor();stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,5);
 await page.getByText('Editar',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Corretor');await page.getByLabel('Motivo da correção').fill('Complementar observações');await page.getByLabel('Observação',{exact:true}).fill('Material conferido');await page.getByText('Salvar com histórico',{exact:true}).click();await page.getByText('Material conferido',{exact:true}).waitFor();
 await page.getByText('Pendentes',{exact:true}).click();await page.getByText('Selecionar devolução / detalhes',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Retorno');await page.getByLabel('Devolver Rádio de teste').fill('1');await page.getByText('Conferir e assinar',{exact:true}).click();await assinar();stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,6);assert.equal(stock.quantidadeCautelada,4);
 await page.getByText('Selecionar devolução / detalhes',{exact:true}).click();await page.getByLabel('Militar da SecOp responsável pelo lançamento').fill('Cb Final');await page.getByText('Selecionar toda a quantidade pendente',{exact:true}).click();await page.getByText('Conferir e assinar',{exact:true}).click();await assinar();await page.getByText('Tudo certo! Nenhum material pendente no momento.',{exact:true}).waitFor();stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,10);assert.equal(stock.quantidadeCautelada,0);
 await page.getByText('Livro',{exact:true}).click();assert.equal(await page.getByText('+ Material',{exact:true}).count(),0);
 await page.getByText('Detalhes / PDF',{exact:true}).click();await page.getByText('Histórico',{exact:true}).waitFor();await page.screenshot({path:`${out}/historico-desktop.png`});
 const popupPromise=page.waitForEvent('popup');await page.getByText('PDF desta cautela',{exact:true}).click();const popup=await popupPromise;await popup.getByText('MATERIAIS ADICIONADOS POSTERIORMENTE',{exact:true}).waitFor();await popup.pdf({path:`${out}/cautela-e2e.pdf`,preferCSSPageSize:true,printBackground:true});await popup.close();
 await page.getByText('Fechar',{exact:true}).click();
 for(const [w,h] of [[360,800],[768,1024],[1280,900]]){await page.setViewportSize({width:w,height:h});await page.reload();await page.getByText('LIVRO DE CAUTELAS',{exact:true}).waitFor();await page.screenshot({path:`${out}/livro-${w}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.getByText('Materiais',{exact:true}).click();await page.getByText('Rádio de teste',{exact:true}).waitFor();
 await page.getByText('⋮',{exact:true}).click();await page.getByText('Editar',{exact:true}).click();await page.getByText('Editar Item / Localização',{exact:true}).waitFor();
 assert.equal(await page.getByText('Adicionar foto',{exact:true}).count(),0);
 await page.getByText('Salvar Alterações',{exact:true}).click();await page.getByText('Editar Item / Localização',{exact:true}).waitFor({state:'hidden'});
 stock=(await getDoc(doc(db,'materiais','e2e-radio'))).data();assert.equal(stock.quantidade,10);assert.equal(stock.quantidadeCautelada,0);assert.equal(stock.quantidadeTotal,10);
 assert.deepEqual(errors,[]);console.log('E2E PASS: criar, selecionar estoque, previsão, assinatura, acréscimo, edição, parcial, final, bloqueio pós-encerramento, histórico, PDF, 3 larguras.');
}catch(e){await page?.screenshot({path:`${out}/falha.png`});console.error(e);throw e;}finally{await browser?.close();server.kill();await deleteApp(app);}
