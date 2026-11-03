'use strict';
// El renderer de semillas real sigue siendo la única autoridad de precios, compras y bloqueos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('public/index.html'),ui=read('public/game/ui.js');
const renderer=ui.slice(ui.indexOf('function refreshSeedShop()'),ui.indexOf('/* ---- granja (nivel) ---- */'));
const dom=new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,doc=w.document,calls=[];
Object.assign(w,{innerWidth:1672,innerHeight:948,G:{plata:100,golden:0,seeds:{papa:4,ciruela:2}},GF:{PESCA_ACTIVA:false},CROP_ORDER:['papa','ciruela','calabaza'],
 CROP_DEF:{papa:{label:'Papa',seedCost:1,grow:180,lvl:1},ciruela:{label:'Ciruela',seedCost:5,grow:300,lvl:2},calabaza:{label:'Calabaza',seedCost:40,grow:600,lvl:5}},
 $:id=>doc.getElementById(id),seedBuysToday:()=>({count:4}),seedDailyMax:()=>120,cropUnlocked:k=>k!=='calabaza',fmt:String,fmtSecs:s=>s+' s',
 itemIcon:i=>'<img src="assets/farm/'+i.sprite+'.png" alt="">',coinIc:()=>'<img src="assets/farm/coin_plata.png" alt="">',
 refreshPacks(){},tutoHighlight(){},seedShopReponerFocoPc(){},seedShopGuardarFocoPc(){},buySeed:(key,n)=>calls.push({key,n}),
 FARM:{refreshReferenceFraming:()=>calls.push({framing:true})}
});
w.eval(renderer);w.refreshSeedShop();
const ov=doc.getElementById('ov-market'),card=ov.querySelector('.card'),box=doc.getElementById('seed-shop');
const input=doc.getElementById('sq-papa'),buy=box.querySelector('[data-buy="papa"]');input.max='3';
const state=JSON.stringify(w.G),handler=buy.onclick;
let inputEvents=0,customClicks=0;input.addEventListener('input',()=>inputEvents++);buy.addEventListener('click',()=>customClicks++);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
w.eval(read('public/game/visual-v2.js'));w.eval(read('public/game/reference-market.js'));
(async()=>{
 await tick();
 assert.equal(box.querySelector('[data-buy="papa"]'),buy,'No reemplaza el botón de compra');assert.equal(doc.getElementById('sq-papa'),input,'No reemplaza el input');assert.equal(buy.onclick,handler,'Listener original conservado');
 assert.equal(box.querySelectorAll('.ref-quantity').length,2,'Sólo cultivos disponibles tienen cantidad');
 assert.deepEqual([...ov.querySelectorAll('.shoptab')].map(b=>b.dataset.shop),['buy','sell','deco','nft'],'Las cuatro rutas siguen disponibles');
 assert.equal(box.querySelector('[data-cultivo-bloqueado="calabaza"]').disabled,true,'No abre cultivos bloqueados');
 const row=input.closest('.mkt-row'),plus=row.querySelector('[aria-label^="Aumentar"]'),minus=row.querySelector('[aria-label^="Reducir"]');
 assert.equal(row.querySelector('.ref-price span').textContent,'1 Plata','Copia la previa verdadera');assert.equal(minus.disabled,true);
 plus.click();await tick();assert.equal(input.value,'2');assert.equal(inputEvents,1);assert.equal(row.querySelector('.ref-price span').textContent,'2 Plata');assert.equal(calls.filter(c=>c.key).length,0,'Ajustar cantidad no compra');
 plus.click();await tick();assert.equal(input.value,'3');assert.equal(plus.disabled,true,'Respeta max real');plus.click();assert.equal(input.value,'3');assert.equal(inputEvents,2);
 minus.click();await tick();assert.equal(input.value,'2');buy.click();assert.equal(customClicks,1);assert.deepEqual(calls.filter(c=>c.key),[{key:'papa',n:2}]);
 input.disabled=true;await tick();assert(plus.disabled&&minus.disabled,'Input deshabilitado bloquea ambos controles');input.disabled=false;await tick();
 const price=doc.getElementById('st-papa');price.textContent='Cupo diario agotado';await tick();assert.equal(row.querySelector('.ref-price span').textContent,'Cupo diario agotado','El renderer conserva su mensaje de cupo');
 const disabled=box.querySelector('[data-buy="ciruela"]');disabled.disabled=true;await tick();assert.equal(disabled.disabled,true,'No habilita compras por decoración');
 assert.equal(JSON.stringify(w.G),state,'Sólo presentación y eventos, sin escritura de G');
 ov.classList.add('show');await tick();assert(calls.some(c=>c.framing),'Comunica ocupación al framing');
 const frameCount=calls.filter(c=>c.framing).length;w.GoldenReferenceMarket.update();w.GoldenReferenceMarket.update();await tick();assert.equal(calls.filter(c=>c.framing).length,frameCount,'No recentra al actualizar una cantidad');
 // Rehacer producción debe decorar filas nuevas y conservar sus nuevos handlers.
 w.refreshSeedShop();const newInput=doc.getElementById('sq-papa'),newBuy=box.querySelector('[data-buy="papa"]'),newHandler=newBuy.onclick;await tick();assert.equal(box.querySelectorAll('.ref-quantity').length,2);assert.equal(newBuy.onclick,newHandler);assert.equal(doc.getElementById('sq-papa'),newInput);
 w.GoldenVisual.setEnabled(false);await tick();
 assert.equal(box.querySelector('.ref-quantity'),null);assert.equal(ov.querySelector('.ref-market-mark'),null);assert.equal(ov.querySelector('.ref-market-footer'),null);assert.equal(newBuy.textContent,'Comprar · 1 c/u');
 assert.deepEqual([...ov.querySelectorAll('.shoptab')].map(b=>b.dataset.shop),['buy','deco','nft','sell'],'Clásico devuelve el orden original');
 const classic=ov.innerHTML;w.GoldenVisual.setEnabled(true);await tick();w.GoldenVisual.setEnabled(false);await tick();assert.equal(ov.innerHTML,classic,'La reversión mantiene exactamente el markup clásico');
 w.GoldenVisual.setEnabled(true);await tick();w.innerWidth=899;w.dispatchEvent(new w.Event('resize'));await tick();assert.equal(ov.innerHTML,classic,'Móvil mantiene la interfaz original');
 w.innerWidth=1672;w.dispatchEvent(new w.Event('resize'));await tick();assert.equal(box.querySelectorAll('.ref-quantity').length,2);assert.equal(JSON.stringify(w.G),state);
 // Después de quedar estable el observer no vuelve a escribir nodos o clases.
 let mutations=0;const observer=new w.MutationObserver(ms=>mutations+=ms.length);observer.observe(ov,{subtree:true,childList:true,attributes:true,characterData:true});w.GoldenReferenceMarket.update();await tick();assert.equal(mutations,0,'Actualizar una UI estable es idempotente');observer.disconnect();
 dom.window.close();console.log('OK: renderer/precios reales, botones e inputs preservados, +/- sin compras y con límites, cupos/bloqueos, refresh dinámico, framing único, reversión exacta, móvil y observer estable');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
