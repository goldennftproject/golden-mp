'use strict';
// Renderer de producción real + decoración opcional. No red, cuentas ni cobros reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(base,file),'utf8');
const ui=read('public/game/ui.js'),renderer=ui.slice(ui.indexOf('function refreshArtefactos()'),ui.indexOf('function bancoActualizarPrevia()'));
const definitions=read('public/game/state.js').match(/const ARTEFACTO_DEF = (\{[\s\S]*?\n\});/)[1];
const dom=new JSDOM('<div id="ov-reliquias"><div id="objetos-productores"></div></div>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,doc=w.document;
const timestamp=1800000000000,calls=[],confirms=[];
Object.assign(w,{
 innerWidth:1200,sb:{},UID:'qa',CARGA_OK:true,SOLO_LOCAL:false,SAVE_CONFLICTOS:new Set(),ARTEFACTO_DIAS:180,
 G:{golden:1000,plata:20,artefactos:{items:{'cobre:qa':{desde:timestamp,cobrado:timestamp}}}},
 $:id=>doc.getElementById(id),nowMs:()=>timestamp,vipVigente:()=>true,artefactoModelo:id=>String(id).split(':')[0],
 artefactoPendiente:()=>87,artefactoDiario:()=>87,artefactoPuedeCobrar:()=>true,energiaGranjaPuede:()=>true,artefactoTextoCobro:()=> 'Cobrar · 1 ⚡',
 fmtPlata:n=>String(n),fmtGolden:n=>String(n),escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
 ofrecerRecargaGolden:()=>{},askConfirm:(text,fn,options)=>confirms.push({text,options}),artefactoSolicitar:(action,id)=>calls.push({action,id})
});
w.eval('const ARTEFACTO_DEF='+definitions+';'+renderer);w.refreshArtefactos();
const box=doc.getElementById('objetos-productores'),original=box.innerHTML,state=JSON.stringify(w.G);
const buy=box.querySelector('[data-artefacto-comprar="cobre"]'),claim=box.querySelector('[data-artefacto-cobrar="cobre:qa"]');let customClicks=0;buy.addEventListener('click',()=>customClicks++);
const snapshot=b=>({id:b.dataset.artefactoComprar||b.dataset.artefactoCobrar,text:b.textContent,disabled:b.disabled,title:b.title});
const buttons=[...box.querySelectorAll('button')],properties=buttons.map(snapshot),emoji=box.querySelector('.objeto-nombre>span');
w.eval(read('public/game/visual-v2.js'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 assert.equal(box.querySelectorAll('.reliquia-arte').length,8,'siete modelos más un duplicado');
 const artwork=[...box.querySelectorAll('.reliquia-arte')].map(i=>i.getAttribute('src'));
 for(const key of ['gallinero','huerto','establo','tractor','granero','molino','invernadero'])assert(artwork.includes('assets/visual-v2/ui/reliquias/'+key+'.png?v=3'),key+' tiene ilustración');
 assert.equal(artwork.filter(s=>s.includes('/gallinero.')).length,2,'duplicados reutilizan ilustración sin cambiar su id');
 buttons.forEach((b,i)=>{assert.equal(box.querySelectorAll('button')[i],b,'identidad del botón');assert.deepEqual(snapshot(b),properties[i]);});
 assert.equal(box.querySelector('.objeto-nombre>span'),emoji,'se conserva el nodo de emoji original');
 buy.click();claim.click();assert.equal(customClicks,1);assert.equal(confirms.length,1,'listener de comprar conservado');assert.deepEqual(calls,[{action:'cobrar',id:'cobre:qa'}],'cobrar conserva id exacto del ejemplar');
 assert.equal(JSON.stringify(w.G),state,'decorar y recorrer flujos no modifica G');
 for(let i=0;i<3;i++){w.GoldenVisual.setEnabled(false);assert.equal(box.innerHTML,original,'Clásico restaura markup original exacto');w.GoldenVisual.setEnabled(true);assert.equal(box.querySelectorAll('.reliquia-arte').length,8,'no duplica imágenes al alternar');}
 w.innerWidth=640;w.dispatchEvent(new w.Event('resize'));assert.equal(box.innerHTML,original,'móvil conserva markup clásico');w.innerWidth=1200;w.dispatchEvent(new w.Event('resize'));assert.equal(box.querySelectorAll('.reliquia-arte').length,8);
 // Cada refresco de producción reconstruye filas: el observer decora las filas nuevas sin sustituir botones.
 w.refreshArtefactos();const refreshed=box.innerHTML,newBuy=box.querySelector('[data-artefacto-comprar="oro"]');await tick();assert.equal(box.querySelectorAll('.reliquia-arte').length,8);assert.equal(box.querySelector('[data-artefacto-comprar="oro"]'),newBuy);newBuy.click();assert.equal(confirms.length,2);
 const failed=box.querySelector('.reliquia-arte'),card=failed.closest('.objeto-card');failed.dispatchEvent(new w.Event('error'));await tick();assert.equal(card.querySelector('.reliquia-arte'),null);assert(!card.classList.contains('reliquia-renovada'),'si falta una imagen se muestra el emoji clásico');
 w.GoldenVisual.setEnabled(false);assert.equal(box.innerHTML,refreshed);assert.equal(JSON.stringify(w.G),state);
 await tick();dom.window.close();
 console.log('OK: siete ilustraciones y duplicados, IDs y botones exactos, listeners de compra/cobro, textos/costes/bloqueos, G intacto, clásico exacto, móvil, refresco dinámico y fallback de imagen');
})().catch(e=>{console.error(e);process.exitCode=1;});
