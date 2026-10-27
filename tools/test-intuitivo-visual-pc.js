'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8')),doc=dom.window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});
(async()=>{
 await c.SAVE_READY;c.document=doc;c.innerWidth=1280;c.estadoDeCero();c.isOpen=()=>false;
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 // HUD: la experiencia se identifica sin confundirla con la energía o con los requisitos.
 c.refreshFarmBar();assert.equal(doc.getElementById('lvl-tipo').textContent,'XP');assert.equal(doc.getElementById('lvlpill').dataset.progreso,'xp');
 c.G.level=25;c.refreshFarmBar();assert.equal(doc.getElementById('lvl-tipo').textContent,'');assert.equal(doc.getElementById('lvl-txt').textContent,'MAX');
 c.G.level=1;
 // Banco: visual y lector de pantalla reciben la misma cotización, sin activar un canje.
 vm.runInContext("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;BANCO_COTIZACION={uid:'qa',tasa:10000,recibido:Date.now(),revision:'qa'};",c);
 c.G.plata=25000;const input=doc.getElementById('banco-cantidad'),visual=doc.getElementById('banco-visual');input.value=2;c.bancoActualizarPrevia();
 assert.deepEqual([...visual.querySelectorAll('strong')].map(e=>e.textContent),['20.000','2']);assert.match(doc.getElementById('banco-previa').textContent,/20.000 Plata.*2 Golden/);assert.equal(visual.dataset.insuficiente,'false');
 input.value=3;c.bancoActualizarPrevia();assert.equal(visual.dataset.insuficiente,'true');assert.equal(doc.getElementById('banco-canjear').disabled,true);
 input.value='1.5';c.bancoActualizarPrevia();assert.equal(visual.children.length,0,'no dibuja importes inválidos');
 vm.runInContext('BANCO_COTIZACION.recibido=Date.now()-61000',c);input.value=2;c.bancoActualizarPrevia();assert.equal(visual.children.length,0,'no conserva una tasa caducada');
 // Compras: imágenes y ventajas, propiedad real; visitar el catálogo no ejecuta compras.
 const snapshot=JSON.stringify(c.G);c.refreshTienda();assert.equal(JSON.stringify(c.G),snapshot);
 assert.equal(doc.querySelectorAll('.tienda-producto .tienda-chips').length,4);assert.equal(doc.querySelectorAll('.tienda-producto .compra-estado').length,0);
 c.G.produccion.vipHasta=Date.now()+86400000;c.refreshTienda();assert.match(doc.querySelector('.tienda-destacado .compra-estado').textContent,/VIP activo/);
 c.G.produccion.vipHasta=0;c.refreshTienda();assert.equal(doc.querySelector('.tienda-destacado .compra-estado'),null,'no muestra VIP activo después de vencer');
 // Menús: la información secundaria es desplegable, sin esconder acciones de uso frecuente.
 assert.ok(doc.querySelector('#ov-barn details.ayuda-menu'));assert.ok(doc.querySelector('#forge-pane-repair details.ayuda-menu'));
 for(const id of ['ov-cobertizo','ov-equip','ov-objetivos','ov-p2p'])assert.ok(doc.querySelector('.gmi[data-panel="'+id+'"] small'));
 assert.equal(doc.getElementById('banco-canjear').closest('details'),null);
 // Feedback: tipo, icono de acción y texto sin interpretar HTML; un bloqueo borra el éxito anterior.
 c.toast('Hacha lista','success','fabricar');const toast=doc.getElementById('toast');assert.equal(toast.dataset.resultado,'success');assert.equal(toast.dataset.accion,'fabricar');
 c.toast('Te faltan materiales');assert.equal(toast.dataset.resultado,'warning');assert.equal(toast.dataset.accion,'');
 c.toast('<img src=x>','info');assert.equal(toast.children.length,0,'el mensaje continúa siendo texto seguro');
 // Edificios: cada aviso se deriva de sus datos, no de un contador nuevo ni de una acción optimista.
 const p=vm.runInContext('FarmScene.prototype',c);c.pendienteDe=t=>t==='horno'?2:t==='buzon'?1:0;
 assert.equal(p.indicadorEdificio.call({}, {type:'horno'}).texto,'✓ 2');assert.equal(p.indicadorEdificio.call({}, {type:'buzon'}).texto,'✉ 1');assert.equal(p.indicadorEdificio.call({}, {type:'market'}),null);
 c.G.obras={store:{}};c.G.built.store=false;assert.equal(p.indicadorEdificio.call({}, {type:'store'}).texto,'⚒');c.G.built.store=true;assert.equal(p.indicadorEdificio.call({}, {type:'store'}),null);
 c.farmPuedeSubir=()=>true;assert.equal(p.indicadorEdificio.call({}, {type:'barn'}).texto,'↑');c.farmPuedeSubir=()=>false;assert.equal(p.indicadorEdificio.call({}, {type:'barn'}),null);
 c.G.built.establo=true;c.animalListos=()=>0;assert.equal(p.indicadorEdificio.call({}, {type:'establo'}),null);c.animalListos=k=>k==='alpaca'?2:0;assert.equal(p.indicadorEdificio.call({}, {type:'establo'}).texto,'✓ 2');
 // Mostrar: cambiar de estado de parcela retira las marcas antiguas aunque el paso conserve su id.
 let cleaned=0;c.GF.uiOpen=false;c.GF.editMode=false;c.guiaDestinoActual=()=>({id:'plant',target:'plot',guiaPlot:'ready'});
 p.tickDestinoGuia.call({_guiaHasta:Date.now()+8000,_guiaPaso:{id:'plant',target:'plot',guiaPlot:'dry'},limpiarDestinoGuia(){cleaned++}});assert.equal(cleaned,1);
 c.GF.uiOpen=true;c.guiaDestinoActual=()=>({id:'plant',target:'plot',guiaPlot:'dry'});
 p.tickDestinoGuia.call({_guiaHasta:Date.now()+8000,_guiaPaso:c.guiaDestinoActual(),limpiarDestinoGuia(){cleaned++}});assert.equal(cleaned,2,'ninguna marca activa detrás de un menú');
 c.GF.uiOpen=false;const plot={cx:10,by:20,state:'dry'},effects=[];const fx=()=>({setStrokeStyle(){return this},setDepth(){return this},setOrigin(){return this},destroy(){}});const scene={_guiaHasta:Date.now()+8000,_guiaPaso:c.guiaDestinoActual(),plots:[plot],objetivosDestinoGuia:p.objetivosDestinoGuia,add:{rectangle(){return fx()},text(x,y,t){effects.push(t);return fx()}}};p.tickDestinoGuia.call(scene);assert.equal(effects[0],'↓');assert.equal(scene._guiaMarcas[0].fx.length,2,'contorno y flecha sobre la misma parcela');
 console.log('OK: siete mejoras de PC, propiedad y expiración, cotización y bloqueos, estados derivados y limpieza de guía; sin compras ni cambios de economía.');
})().catch(e=>{console.error(e);process.exitCode=1});

