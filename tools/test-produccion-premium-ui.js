'use strict';
// Cliente real, servidor simulado: nunca compra ni escribe datos de jugadores.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),{ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});
const clock=1800000000000,dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'));
const doc=dom.window.document,ops=[],avisos=[];let pregunta,recarga;
const id=n=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
const recibo=(n,tipo='tree',nodo=null)=>({id:id(n),tipo,coste:tipo==='bronce'?2.5:1,desde:clock,nodo});
const libro=compras=>({v:1,compras});
const snap=()=>JSON.stringify(c.G);
const turn=()=>new Promise(r=>setImmediate(r));
function fresco(){c.estadoDeCero();c.GF.aplicarTerreno(0);c.G.golden=20;c.G.level=1;c.G.produccion.premium=libro([]);c.farmScene=null;ops.length=0;pregunta=null;recarga=null;}
(async()=>{
 await c.SAVE_READY;c.document=doc;c.innerWidth=1346;c.nowMs=()=>clock;
 doc.defaultView.HTMLElement.prototype.scrollIntoView=function(){};
 for(const name of ['refreshHud','refreshCobertizo','saveFarm','log'])c[name]=()=>{};
 c.toast=text=>avisos.push(text);c.abrirRecargaGolden=precio=>{recarga=precio;};
 vm.runInContext('sb={};UID="qa-premium";CARGA_OK=true;SOLO_LOCAL=false;SAVE_CONFLICTOS.clear();',c);
 const realConfirm=c.askConfirm;c.askConfirm=(texto,yes,options)=>{pregunta={texto,yes,options};};
 c.economiaSolicitar=async detalle=>{ops.push(JSON.parse(JSON.stringify(detalle)));return {ok:true};};
 fresco();c.PRODUCCION_PREMIUM_ACTIVA=false;
 c.refreshProduccionGranja();assert.equal(doc.getElementById('prod-premium'),null);assert.equal(c.produccionPremiumComprar('tree',1),false);assert.equal(ops.length,0);
 c.PRODUCCION_PREMIUM_ACTIVA=true;
 // Los precios dependen sólo de compras Golden confirmadas, nunca de nodos Plata, pausas o VIP.
 for(const [tipo,precios] of Object.entries({tree:[1,1.5,2],rock:[1,1.5,2],bronce:[2.5,3.5,5]})){
  for(let n=0;n<3;n++){c.G.produccion.premium=libro(Array.from({length:n},(_,i)=>recibo(i+1,tipo)));assert.equal(c.produccionPremiumCotizacion(tipo).precio,precios[n]);}
  c.G.produccion.premium=libro([recibo(1,tipo),recibo(2,tipo),recibo(3,tipo)]);assert.equal(c.produccionPremiumCotizacion(tipo).precio,null);assert.match(c.produccionPremiumMotivo(tipo),/Máximo de 3/);
 }
 fresco();assert.equal(c.produccionUsados(),5);assert.equal(c.produccionCapacidad(),5);assert.equal(c.G.expansiones,0);
 c.G.produccion.vale=1;c.G.produccion.vipNodos=2;
 const before=snap();assert.equal(c.produccionPremiumMotivo('bronce'),'','Se compra antes del nivel3, sin expansión ni cupo libre');
 c.confirmarCompraProduccionPremium('bronce');assert.match(pregunta.texto,/2.5 Golden/);assert.equal(ops.length,0,'Abrir confirmación no compra');assert.equal(snap(),before);
 await pregunta.yes();assert.deepEqual(ops,[{produccionPremium:{accion:'comprar',tipo:'bronce',precioEsperado:2.5}}]);assert.equal(snap(),before,'Sólo la respuesta autoritativa puede entregar o descontar');
 ops.length=0;c.confirmarCompraProduccionPremium('tree');c.G.produccion.premium=libro([recibo(1)]);assert.equal(pregunta.yes(),false,'Una cotización desactualizada vuelve a revisión');assert.equal(ops.length,0);
 c.refreshProduccionGranja();assert.equal(doc.querySelector('[data-prod-premium="tree"]').textContent,'Comprar Árbol · 1.5 Golden');assert.equal(doc.getElementById('prod-premium-motivo-tree').textContent,'Comprados 1/3 · incluye cupo propio');assert.equal(doc.querySelector('[data-prod-premium-colocar]').textContent,'Elegir celda');
 fresco();c.G.golden=0;c.refreshProduccionGranja();const recharge=doc.querySelector('[data-prod-premium="tree"]');assert.equal(recharge.textContent,'Recargar Golden');assert.equal(recharge.disabled,false);recharge.click();assert.equal(recarga,1);assert.equal(ops.length,0);
 // El techo global se prueba con el mismo algoritmo y un cupo reducido de fixture:
 // hoy tres tipos por tres compras sólo pueden sumar nueve de los doce permitidos.
 fresco();assert.equal(c.PRODUCCION_PREMIUM_MAX,12);c.G.produccion.premium=libro([recibo(1),recibo(2)]);c.PRODUCCION_PREMIUM_MAX=2;assert.match(c.produccionPremiumMotivo('rock'),/Máximo de 2 compras.*cuenta/);c.PRODUCCION_PREMIUM_MAX=12;
 assert.equal(c.produccionPremiumNormalizar(libro(Array.from({length:13},(_,i)=>recibo(i+1)))),null);
 // Hidratación: copia estricta; datos malformados bloquean y nunca se convierten en cero compras.
 assert.deepEqual(JSON.parse(JSON.stringify(c.produccionPremiumNormalizar())),{v:1,compras:[]});
 const source=libro([{...recibo(1),extra:'no copiar'}]),copy=c.produccionPremiumNormalizar(source);assert.equal(copy.compras[0].extra,undefined);copy.compras[0].coste=99;assert.equal(source.compras[0].coste,1);
 for(const bad of [libro([recibo(1),recibo(1)]),libro([{...recibo(1),id:'no-uuid'}]),libro([{...recibo(1),tipo:'__proto__'}]),libro([{...recibo(1),coste:NaN}]),libro([{...recibo(1),coste:-1}]),libro([{...recibo(1),desde:Infinity}]),libro([{...recibo(1),nodo:0}]),{v:0,compras:[]}])assert.equal(c.produccionPremiumNormalizar(bad),null);
 c.G.produccion.premium={v:0,compras:[]};assert.equal(c.produccionPremiumCotizacion('tree'),null);assert.match(c.produccionPremiumMotivo('tree'),/Sincroniza/);assert.equal(c.produccionPremiumCotizacion('__proto__'),null);
 // Los nueve soportes físicos son exclusivos y no conceden cupos genéricos para compras Plata.
 const slots={};for(const tipo of ['tree','rock','bronce']){slots[tipo]=c.GF.WORLD_OBJECTS.findIndex(o=>o.premiumOnly&&(tipo==='bronce'?o.type==='ore'&&o.ore==='bronce':o.type===tipo));assert(slots[tipo]>=86,'Soporte premium reservado '+tipo);}
 assert.equal(c.produccionPremiumNormalizar(libro([recibo(1,'tree',slots.rock)])),null,'Rechaza índice de otro tipo');
 assert.equal(c.produccionPremiumNormalizar(libro([recibo(1,'tree',slots.tree),recibo(2,'tree',slots.tree)])),null,'Rechaza compartir un soporte');
 fresco();c.G.produccion.premium=libro([recibo(1,'tree',slots.tree)]);c.G.produccion.nodos[slots.tree]=true;
 assert.equal(c.produccionPremiumEsNodo(slots.tree),true);assert.equal(c.produccionPremiumEsNodo(slots.tree,'plot'),false);assert.equal(c.produccionPremiumDerecho(id(1)),null,'Un derecho colocado deja de estar en bolsa');
 assert.equal(c.produccionUsados(),5);assert.equal(c.produccionPremiumUsados(),1);assert.equal(c.celdasProductivas(),6,'Producción total conserva el nodo premium');assert.equal(c.produccionHayCupo(),false,'Su cupo propio no se aprovecha para Plata');
 assert.equal(c.produccionComprar('tree'),false,'Plata sigue requiriendo un cupo regular');
 c.G.produccion.pausas['n:'+slots.tree]={at:clock,estado:{readyAt:clock+1000}};
 assert.equal(c.produccionAlternar('n:'+slots.tree),true,'Reactivar premium no exige cupo regular');assert.equal(c.produccionPremiumUsados(),1);
 c.G.produccion.vipHasta=clock-1;c.G.produccion.vipAplicado=true;c.G.plotsOwned=5;c.G.produccion.orden=['p:3','p:4','n:'+slots.tree];c.produccionVipTick(true);
 assert.equal(c.G.produccion.pausas['n:'+slots.tree],undefined,'VencimientoVIP conserva el cupo propio');assert.equal(c.produccionUsados(),5);assert.equal(c.produccionPremiumUsados(),1);
 // Descubrimiento y colocación por una acción separada, sin compra implícita.
 fresco();c.G.produccion.premium=libro([recibo(1,'bronce')]);c.refreshProduccionGranja();assert.equal(doc.querySelector('[data-prod-premium="bronce"]').disabled,false);assert.equal(doc.querySelector('[data-prod-premium-colocar]').disabled,true);assert.equal(c.iniciarColocacionProduccionPremium(id(1)),false,'Bronce necesita nivel3 sólo al colocar');
 c.G.level=3;let placing=null;c.farmScene={iniciarColocacionPremium:valor=>{placing=valor;return true;}};assert.equal(c.iniciarColocacionProduccionPremium(id(1)),true);assert.equal(placing,id(1));assert.equal(ops.length,0);
 let opened=null;c.closeAllOv=()=>{};c.openOv=target=>{opened=target;c.refreshProduccionGranja();};c.refreshNft();doc.getElementById('prod-premium-acceso').click();assert.equal(opened,'ov-cobertizo');assert.equal(doc.getElementById('prod-premium').open,true);assert.equal(ops.length,0);
 // La promesa de colocación sólo confirma tras ACK; Cancelar/Escape/fallo la resuelven false.
 c.askConfirm=realConfirm;const originalState=snap();let acknowledge;
 c.economiaSolicitar=detalle=>{ops.push(JSON.parse(JSON.stringify(detalle)));return new Promise(resolve=>{acknowledge=resolve;});};
 let pending=c.confirmarColocacionProduccionPremium(id(1),480,480),done=false;pending.then(()=>{done=true;});doc.getElementById('cf-yes').click();await turn();assert.equal(done,false);assert.equal(snap(),originalState);assert.deepEqual(ops.at(-1),{produccionPremium:{accion:'colocar',id:id(1),cx:480,by:480}});acknowledge({ok:true});assert.equal(await pending,true);
 pending=c.confirmarColocacionProduccionPremium(id(1),480,480);doc.getElementById('cf-no').click();assert.equal(await pending,false);
 pending=c.confirmarColocacionProduccionPremium(id(1),480,480);c.cerrarConfirmacionLocal();assert.equal(await pending,false,'Escape/backdrop no dejan promesa huérfana');
 c.economiaSolicitar=async()=>undefined;pending=c.confirmarColocacionProduccionPremium(id(1),480,480);doc.getElementById('cf-yes').click();assert.equal(await pending,false,'No finge colocación al fallar la operación');assert.equal(snap(),originalState);
 assert.equal(c.confirmarColocacionProduccionPremium(id(1),NaN,480),false);c.PRODUCCION_PREMIUM_ACTIVA=false;assert.equal(c.iniciarColocacionProduccionPremium(id(1)),false);
 dom.window.close();console.log('OK: precios escalonados, 3/tipo y12global, sin expansión/cupo/nivel para comprar, vales intactos, libro estricto, cupo propio/Plata/VIP, recarga, acceso Mejoras, colocación nivel3, cancelación y ACK sin G optimista.');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
