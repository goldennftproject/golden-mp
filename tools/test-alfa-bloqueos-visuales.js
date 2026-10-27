'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),doc=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8')).window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});
(async()=>{
 await c.SAVE_READY;c.document=doc;c.innerWidth=1280;c.estadoDeCero();c.isOpen=id=>id==='ov-cocina';doc.defaultView.HTMLElement.prototype.scrollIntoView=function(){};
 let clock=Date.now();c.nowMs=()=>clock;
 const checks=[];function check(name,fn){try{fn();checks.push({name,ok:true})}catch(e){checks.push({name,ok:false,error:e.message})}}
 c.G.plata=0;c.G.seeds={};c.G.res={};c.G.plots=[{state:'ready'},{state:'dry'}];
 check('La ayuda para ganar Plata señala la cosecha lista',()=>assert.equal(c.tutoSubPlata('',10).guiaPlot,'ready'));
 c.G.plots=[{state:'growing'},{state:'dry'}];
 check('La espera señala los cultivos que crecen',()=>assert.equal(c.tutoSubPlata('',10).guiaPlot,'growing'));
 c.G.skills.cooking=10000;c.G.res={papa:99,madera:99,carne:99};c.G.cooking=[];c._ckSel='papa_asada';c.G.energiaGranja={v:1,actual:0,at:clock};c.refreshCooking();
 check('Cocinar anticipa que falta energía',()=>{const b=doc.querySelector('[data-ckcook="papa_asada"]');assert.equal(b.disabled,true);assert.match(b.textContent,/energía/)});
 c.G.energiaGranja.actual=50;const room=c.roomForDish;c.roomForDish=()=>false;c.refreshCooking();
 check('Cocinar anticipa que falta espacio',()=>{const b=doc.querySelector('[data-ckcook="papa_asada"]');assert.equal(b.disabled,true);assert.match(b.textContent,/Bolsa llena|espacio/)});c.roomForDish=room;
 c.openOv=id=>{doc.getElementById(id).classList.add('show');c.refreshCooking()};c.guiaActiva=()=>({id:'estofado',panel:'ov-cocina',ui:'[data-cook="estofado"]',receta:'estofado'});c.tutoSub=()=>null;c._ckSel='papa_asada';
 c.mostrarObjetivo();check('Mostrar selecciona la receta y no prepara el plato',()=>{assert.equal(c._ckSel,'estofado');assert.equal(c.G.cooking.length,0);assert.ok(doc.querySelector('#ck-detalle [data-ckcook="estofado"]'));});

 // El aviso de energía se actualiza sin cerrar la Cocina ni crear guardados periódicos.
 let timer=null;c.setTimeout=fn=>{timer=fn;return 17};c._ckTick=null;c._ckSel='papa_asada';c.G.energiaGranja={v:1,actual:0,at:clock};c.refreshCooking();
 check('Cocina vuelve a habilitarse al recuperar energía',()=>{assert.equal(typeof timer,'function');clock+=300000;timer();assert.equal(doc.querySelector('[data-ckcook="papa_asada"]').disabled,false);assert.equal(c._ckTick,null);});
 // Una pestaña puede sustituir su contenido: Mostrar debe enfocar el nodo nuevo, no uno desconectado.
 const cont=doc.getElementById('ov-market'),pane=doc.getElementById('shop-deco');pane.innerHTML='<button id="qa-accion">Elegir</button>';
 const anterior=pane.firstElementChild;let compras=0;doc.querySelector('[data-shop="deco"]').onclick=()=>{pane.innerHTML='<button id="qa-accion">Elegir</button>';pane.firstElementChild.onclick=()=>compras++};
 c.openOv=()=>{};c.guiaActiva=()=>({id:'qa',panel:'ov-market',ui:'#qa-accion'});c.tutoHighlight=()=>{};c.mostrarObjetivo();
 check('Mostrar enfoca el control reconstruido sin pulsarlo',()=>{assert.equal(anterior.isConnected,false);assert.equal(doc.activeElement,doc.getElementById('qa-accion'));assert.equal(compras,0)});

 check('Comercio y mejora de anuncios explican su uso y conservan sus cupos',()=>{
  assert.equal(doc.querySelector('#ov-p2p h3').textContent,'Comercio entre jugadores');
  c.estadoDeCero();c.G.golden=10;assert.match(c.infraHtml('tienda'),/\+1 anuncio de venta al día/);assert.match(c.infraHtml('tienda'),/10 Golden/);
  assert.equal(c.infraCupoP2P(),1);c.G.infraestructura={tienda:true};assert.equal(c.infraCupoP2P(),2);c.G.produccion.vipHasta=clock+86400000;assert.equal(c.infraCupoP2P(),11);
 });
 console.log(JSON.stringify(checks,null,2));if(checks.some(x=>!x.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
