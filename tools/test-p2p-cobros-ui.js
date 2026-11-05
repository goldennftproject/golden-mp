'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const sold=(id='sale-1',price=6,fee=10,seller='qa-owner')=>({id,kind:'res',item:'madera',name:'Madera',qty:6,price,fee_pct:fee,seller,sold_to:'qa-buyer',paid:false});
const offer=(id='offer-1',seller='qa-other')=>({id,kind:'res',item:'papa',name:'Papa',qty:1,price:4,fee_pct:10,seller,seller_name:'Otra granja',sold_to:null,paid:false});
const fixtures=[];
async function fixture(){
 const dom=new JSDOM(html,{url:'https://golden.test/'}),doc=dom.window.document;
 const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});await c.SAVE_READY;
 c.document=doc;c.estadoDeCero();c.innerWidth=1360;c.UID='qa-owner';c.G.plata=100;c.G.res={madera:10,papa:2};
 const calls={mine:[],list:[],collect:[],buy:[],cancel:[],publish:[],save:0,network:0,timers:0};
 const controls={own:[sold(),offer('own-open','qa-owner'),{...sold('already-paid'),paid:true}],public:[offer()]};
 c.mkMine=async opts=>{calls.mine.push({uid:c.UID,opts});assert.equal(opts?.estricto,true,'consulta propia estricta');assert.equal(opts?.pendientes,true,'incluye las ventas sin cobrar');return typeof controls.mine==='function'?controls.mine(c.UID):controls.own;};
 c.mkList=async (filter,opts)=>{calls.list.push({uid:c.UID,filter,opts});assert.equal(filter,null);assert.equal(opts?.estricto,true,'consulta pública estricta');return typeof controls.list==='function'?controls.list(c.UID):controls.public;};
 c.mkPendCount=()=>0;c.saveFarm=()=>calls.save++;c.fetch=()=>{calls.network++;throw new Error('consulta directa imprevista');};
 c.setTimeout=c.setInterval=()=>{calls.timers++;return 0;};
 c.marketCobrar=async row=>{calls.collect.push(row);controls.own=controls.own.filter(x=>x.id!==row?.id);};
 c.marketComprar=async row=>{calls.buy.push(row);};c.marketCancelar=async row=>{calls.cancel.push(row);};c.marketPublicar=async (...args)=>{calls.publish.push(args);};
 c.isOpen=id=>id==='ov-p2p';dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const run=s=>vm.runInContext(s,c),get=id=>doc.getElementById(id),tab=t=>doc.querySelector('[data-p2p="'+t+'"]');
 const state=JSON.stringify(c.G);
 const f={dom,doc,c,calls,controls,run,get,tab,state};fixtures.push(f);return f;
}
function noAction(f,label){
 assert.equal(f.calls.collect.length,0,label+' · no cobra');assert.equal(f.calls.buy.length,0,label+' · no compra');
 assert.equal(f.calls.cancel.length,0,label+' · no retira');assert.equal(f.calls.publish.length,0,label+' · no publica');
 assert.equal(f.calls.save,0,label+' · no guarda');assert.equal(f.calls.network,0,label+' · sin consultas fuera de las dos lecturas declaradas');
 assert.equal(f.calls.timers,0,label+' · sin sondeos ni temporizadores');assert.equal(JSON.stringify(f.c.G),f.state,label+' · no cambia G');
}
function cobroVisible(f,n,net){
 const text=f.get('p2p-cobros').textContent;
 assert.match(text,new RegExp('\\b'+n+'\\s+venta'),text);assert.match(text,new RegExp('\\b'+net+'\\s*(?:de\\s+)?Plata','i'),text);
 assert.equal(f.get('p2p-ver-cobros').hidden,false,'el acceso Ver cobros está disponible');
}
function hasError(text){return /no (?:se )?(?:ha |han )?(?:podido|pudo|pudieron)|error|fall|no disponible|no se puede|no pudieron/i.test(text);}
(async()=>{
 // El renderer registrado al abrir devuelve una promesa esperable y consulta ambos conjuntos una vez.
 {
  const f=await fixture();assert.equal(f.get('p2p-cobros').getAttribute('role'),'status');
  assert.match(f.tab('mias').textContent,/Mis anuncios y cobros/);assert(f.get('p2p-actualizar'));
  const opening=f.run("OV_REFRESH['ov-p2p']()");assert.equal(typeof opening?.then,'function','la apertura permite esperar el refresco');await opening;
  assert.equal(f.calls.mine.length,1);assert.equal(f.calls.list.length,1);cobroVisible(f,1,5);noAction(f,'abrir Comercio');
  await f.get('p2p-ver-cobros').onclick();assert(f.tab('mias').classList.contains('active'));assert(f.get('p2p-list').querySelector('[data-cobrar="sale-1"]'));
  assert.equal(f.calls.mine.length,1,'Ver cobros reutiliza la lectura propia');assert.equal(f.calls.list.length,1);noAction(f,'Ver cobros sólo navega');
  await f.tab('vender').onclick();await f.tab('comprar').onclick();assert.equal(f.calls.mine.length,1,'navegar no vuelve a consultar lo propio');assert.equal(f.calls.list.length,1,'reutiliza la lista pública');noAction(f,'cambiar pestañas');
  await tick();assert.equal(f.calls.mine.length,1);assert.equal(f.calls.list.length,1,'no consulta pasivamente tras quedar abierto');
  await f.run("OV_REFRESH['ov-p2p']()");assert.equal(f.calls.mine.length,2,'reabrir trae el estado actual');assert.equal(f.calls.list.length,2);
  await f.get('p2p-actualizar').onclick();assert.equal(f.calls.mine.length,3,'Actualizar fuerza la consulta propia');assert.equal(f.calls.list.length,3);noAction(f,'Actualizar sólo lee');
 }
 // El total usa el neto real por anuncio y excluye anuncios activos o ya cobrados.
 {
  const f=await fixture();f.controls.own=[sold(),sold('rounded',250,7),{...sold('paid',999),paid:true},offer('active','qa-owner')];
  await f.c.refreshP2P(true);cobroVisible(f,2,238);noAction(f,'neto y redondeo');
 }
 // Cobrar sigue siendo un gesto aparte y después vuelve a consultar sin acreditar nada desde la UI.
 {
  const f=await fixture();await f.c.refreshP2P(true);await f.get('p2p-ver-cobros').onclick();
  const before=JSON.stringify(f.c.G);await f.get('p2p-list').querySelector('[data-cobrar="sale-1"]').onclick();
  assert.equal(f.calls.collect.length,1);assert.equal(f.calls.collect[0].id,'sale-1');assert.equal(f.calls.mine.length,2,'refresca tras respuesta de Cobrar');
  assert.equal(f.calls.list.length,1,'no consulta anuncios públicos mientras está en Mis anuncios');assert.equal(f.get('p2p-ver-cobros').hidden,true);
  assert.equal(JSON.stringify(f.c.G),before,'el renderer no acredita Plata por su cuenta');assert.equal(f.calls.save,0);
 }
 // Cero confirmado es distinto de error; ninguna consulta fallida se presenta como lista vacía.
 {
  const f=await fixture();f.controls.own=[];await f.c.refreshP2P(true);assert.equal(f.get('p2p-ver-cobros').hidden,true);
  assert(!hasError(f.get('p2p-cobros').textContent),'cero confirmado no es un error');
  f.controls.mine=()=>Promise.reject(new Error('fallo de consulta propia'));await f.c.refreshP2P(true);
  assert.equal(f.get('p2p-ver-cobros').hidden,true);assert(hasError(f.get('p2p-cobros').textContent),'se informa el fallo propio');
  assert(!/sin ventas|no tienes ventas|0 ventas/i.test(f.get('p2p-cobros').textContent),'el error no afirma cero ventas');
  assert(f.get('p2p-list').querySelector('[data-buy="offer-1"]'),'un fallo propio no borra los anuncios públicos actuales');
  await f.tab('mias').onclick();assert(hasError(f.get('p2p-list').textContent),'Mis anuncios conserva el error');
  assert(!/No tienes nada publicado|Anuncios activos:\s*0/.test(f.get('p2p-list').textContent),'no convierte el fallo en una lista vacía');noAction(f,'fallo propio');
 }
 {
  const f=await fixture();f.controls.list=()=>Promise.reject(new Error('fallo público'));await f.c.refreshP2P(true);
  cobroVisible(f,1,5);assert(hasError(f.get('p2p-list').textContent),'se informa el fallo público');
  assert(!/No hay publicaciones ahora/.test(f.get('p2p-list').textContent),'no confunde error público con ausencia de ofertas');
  await f.get('p2p-ver-cobros').onclick();assert(f.get('p2p-list').querySelector('[data-cobrar="sale-1"]'),'la consulta propia válida sigue utilizable');noAction(f,'fallo público');
 }
 // La pestaña que quede seleccionada durante la carga manda al completar las respuestas.
 {
  const f=await fixture(),mine=deferred(),list=deferred();f.controls.mine=()=>mine.promise;f.controls.list=()=>list.promise;
  const loading=f.c.refreshP2P(true);assert.equal(f.get('p2p-ver-cobros').hidden,true,'no promete cobros mientras carga');
  const tab1=f.tab('mias').onclick(),tab2=f.tab('vender').onclick(),tab3=f.tab('mias').onclick();
  mine.resolve([sold()]);list.resolve([offer()]);await Promise.all([loading,tab1,tab2,tab3]);
  assert(f.tab('mias').classList.contains('active'));assert(f.get('p2p-list').querySelector('[data-cobrar="sale-1"]'));
  assert.equal(f.calls.mine.length,1);assert.equal(f.calls.list.length,1);noAction(f,'pestañas durante carga');
 }
 // Dos refrescos normales concurrentes comparten las lecturas, no duplican carga.
 {
  const f=await fixture(),mine=deferred(),list=deferred();f.controls.mine=()=>mine.promise;f.controls.list=()=>list.promise;
  const a=f.c.refreshP2P(),b=f.c.refreshP2P();assert.equal(typeof a?.then,'function');assert.equal(typeof b?.then,'function');await tick();
  assert.equal(f.calls.mine.length,1);assert.equal(f.calls.list.length,1);mine.resolve([sold()]);list.resolve([offer()]);await Promise.all([a,b]);cobroVisible(f,1,5);
 }
 // Forzar una carga nueva invalida la respuesta anterior, aunque termine más tarde.
 {
  const f=await fixture(),oldMine=deferred(),oldList=deferred();let mi=0,li=0;
  f.controls.mine=()=>++mi===1?oldMine.promise:Promise.resolve([]);f.controls.list=()=>++li===1?oldList.promise:Promise.resolve([offer('fresh-public')]);
  const old=f.c.refreshP2P(true);await tick();await f.c.refreshP2P(true);assert.equal(f.get('p2p-ver-cobros').hidden,true);
  oldMine.resolve([sold('old-sale')]);oldList.resolve([offer('old-public')]);await old;
  assert.equal(f.get('p2p-ver-cobros').hidden,true,'la respuesta vieja no revive un cobro');assert(f.get('p2p-list').querySelector('[data-buy="fresh-public"]'));
  assert(!f.get('p2p-list').querySelector('[data-buy="old-public"]'));
 }
 // La respuesta de otra sesión nunca puede aparecer en la nueva ni ejecutar handlers viejos.
 {
  const f=await fixture();await f.c.refreshP2P(true);await f.get('p2p-ver-cobros').onclick();
  const oldHandler=f.get('p2p-list').querySelector('[data-cobrar="sale-1"]').onclick;
  f.c.UID='qa-next';f.controls.own=[];await f.c.refreshP2P(true);await oldHandler();
  assert.equal(f.calls.collect.length,0,'un handler capturado de la sesión anterior no cobra');assert.equal(f.get('p2p-ver-cobros').hidden,true);
 }
 {
  const f=await fixture(),mine=deferred(),list=deferred();
  f.controls.mine=uid=>uid==='qa-owner'?mine.promise:Promise.resolve([]);
  f.controls.list=uid=>uid==='qa-owner'?list.promise:Promise.resolve([offer('next-public')]);
  const old=f.c.refreshP2P(true);await tick();f.c.UID='qa-next';await f.c.refreshP2P(true);mine.resolve([sold('previous-session')]);list.resolve([offer('previous-public')]);await old;
  assert.equal(f.get('p2p-ver-cobros').hidden,true);assert(f.get('p2p-list').querySelector('[data-buy="next-public"]'));assert(!f.get('p2p-list').querySelector('[data-buy="previous-public"]'));
 }
 console.log('OK: apertura/Actualizar, netos y redondeo, navegación sin cobro, cobro manual, errores separados, caché sin sondeo, concurrencia, última pestaña, generación forzada y sesión/handlers anteriores descartados.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{for(const f of fixtures)f.dom.window.close();});
