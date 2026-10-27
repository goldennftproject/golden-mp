'use strict';
// Acciones reales, reloj adelantado sólo para esperas y servidor real con almacenamiento en memoria.
// No mide diversión ni duración de una sesión humana. No escribe en servicios externos.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');let clock=Date.UTC(2026,9,27,12);
class Clock extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
const prefix=fs.readFileSync(__dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
const servidor=new Function('require','__dirname','Date',prefix+';return servidor;')(require,__dirname,Clock);
const save=fs.readFileSync(root+'/public/game/save.js','utf8');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':save.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
const run=s=>vm.runInContext(s,c);c.Date=Clock;c.nowMs=()=>clock;
const notes=[];for(const k of ['refreshHud','refreshInv','refreshHotbar','refreshMarket','refreshSeedShop','refreshForge','syncSlots','celebrate','tutoRefresh','tutoCheck','syncCobertizo','reiniciarGranjaSuave','showSaving','showSaved'])c[k]=()=>{};
c.log=s=>notes.push(s);c.toast=s=>notes.push(s);c.isOpen=()=>false;c.setTimeout=(f,ms)=>ms===1500?setImmediate(f):0;c.clearTimeout=()=>{};
c.estadoDeCero();c.tutoMigrar();const s=servidor(null);let failures=[];
c.qaSb={functions:{invoke:async(_,p)=>{const r=await s.call(p.body),d=await r.json();if(r.status!==200)failures.push({status:r.status,error:d});return r.status===200?{data:d}:{error:{context:{status:r.status,json:async()=>d}}};}},auth:{getUser:async()=>({data:{user:{id:'qa'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:s.row(),error:null})})})})};
run("sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_BASES.set('qa',null)");
const proto=vm.runInContext('FarmScene.prototype',c),sprite={setVisible(){},setAlpha(){}};
const sc={objs:[],plots:[],textures:{exists:()=>false},setObjTex(){},barraGolpes(){},premioFx(){},showGrowing(){},setPlotGlow(){},coinBurst(){}};
sc.syncNodos=()=>proto.syncNodos.call(sc);sc.syncPlots=()=>proto.syncPlots.call(sc);
function rebuild(){
 sc.objs=c.GF.WORLD_OBJECTS.map((o,i)=>({...o,i,cx:(o.leftCol+(o.wCells||1)/2)*c.GF.TILE,by:o.baseRow*c.GF.TILE,sprite})).filter(o=>['tree','rock','ore'].includes(o.type)&&c.produccionNodoPoseido(o.i));
 for(const o of sc.objs)Object.assign(o,c.G.nodos[c.produccionNodoKey(o.i)]||{});
 sc.plots=Array.from({length:c.G.plotsOwned},(_,i)=>({type:'plot',i,cx:i*42,by:84,spr:sprite,emo:sprite,timer:sprite,state:'dry',...(c.G.plots[i]||{})}));
}
async function checkpoint(reload=false){clock+=1000;await c.saveFarm(true);assert.deepEqual(failures,[],'el portero acepta progreso legítimo');assert.equal(run("SAVE_CONFLICTOS.has('qa')"),false);if(reload){const prior=s.row().data;assert.equal(await c.loadFarm(),true);for(const k of ['plata','golden','expansiones','kitReclamado'])assert.equal(c.G[k],prior[k],k+' persiste');assert.equal(JSON.stringify(c.G.nodos),JSON.stringify(prior.nodos),'los nodos sobreviven a la lectura autoritativa');rebuild();}}
function finish(kind,o){assert.ok(c.energiaGranjaPuede(kind),kind+' tiene energía');sc.action={kind,o};proto.finishAction.call(sc);}
async function cropCycle(sell=true){
 const plots=sc.plots.filter(p=>p.state==='dry');if(!plots.length)return;
 while(c.energiaGranjaTick()<plots.length*2)clock+=4*3600000;
 c.buySeed('papa',plots.length);assert.ok(c.G.seeds.papa>=plots.length,'se pueden reponer semillas');
 for(const p of plots)finish('plant',p);await checkpoint(true);
 clock=Math.max(clock,...sc.plots.map(p=>p.readyAt||0))+1;
 for(const p of sc.plots.filter(p=>p.state==='growing')){assert.ok(clock>=p.readyAt);p.state='ready';finish('harvest',p);}
 if(sell){run("marketCur='plata';MERCADO_GLOBAL=false");c.mercadoGlobalActivo=()=>false;c.$('mq-papa').value=Math.floor(c.G.res.papa||0);c.sellItem('papa');}
 await checkpoint(true);
}
async function gather(resource,n){
 for(let guard=0;(c.G.res[resource]||0)<n&&guard<400;guard++){
  if(c.energiaGranjaTick()<1)clock+=4*3600000;
  const kind=resource==='madera'?'chop':'mine',o=sc.objs.find(o=>o.type===(resource==='madera'?'tree':'rock'));assert.ok(o,'hay nodo propio '+resource);
  if(o.readyAt>clock)clock=o.readyAt+1;
  const needTool=resource==='madera'?c.toolCount('axe')<1:!c.picoParaNodo(o);
  if(needTool){const cost=resource==='madera'?run('TOOL_CRAFT.axe.plata'):run('PICK_DEF.stone.plata');while(c.G.plata<cost+3){clock+=4*3600000;await cropCycle();}if(resource==='madera')c.craftTool('axe');else c.craftPick('stone');}
  const allowed=c.puedeAccion(kind,o);assert.ok(allowed.ok,JSON.stringify(allowed));finish(kind,o);await checkpoint(guard%7===0);
 }
 assert.ok(c.G.res[resource]>=n,'se alcanza '+resource+' sin acreditar recursos de prueba');
}
(async()=>{
 await c.SAVE_READY;await checkpoint();assert.equal(c.kitReclamar(),true);rebuild();await checkpoint(true);await cropCycle();assert.equal(c.tutoActivo().id,'place_store');
 for(const t of ['store','horno','cocina']){
  assert.ok(c.G.planos[t],t+' plano ganado');c.GF.ocupCambio();sc.placing={tipo:'obra',id:t};sc.celdaLibreAdorno=proto.celdaLibreAdorno;sc.porQueNoEntra=()=> 'ocupado';let sitio;
  for(let row=c.GF.R0;row<c.GF.R0+c.GF.ROWS&&!sitio;row++)for(let col=c.GF.C0;col<c.GF.C0+c.GF.COLS;col++){const h=proto.huellaColocar.call(sc,col,row);if(h.libre){sitio={col:h.c0,row};break;}}
  assert.ok(sitio,t+' cabe físicamente junto a los edificios anteriores');assert.equal(c.obraColocar(t,sitio.col,sitio.row,true),true);sc.placing=null;c.GF.ocupCambio();await checkpoint(true);
  for(const [r,n]of Object.entries(run('BUILD_DEF')[t].cost))await gather(r,n);
  const resources=JSON.stringify(c.G.res);c.obraDepositar(t,{madera:1});await checkpoint(true);assert.notEqual(JSON.stringify(c.G.res),resources,'aporte parcial persiste');
  assert.equal(c.obraDepositar(t),true);c.obraConstruir(t);await checkpoint(true);assert.equal(c.G.built[t],true);
  if(t==='horno'){
   while(c.G.plata<run('ARM_DEF.espada_madera.plata')+3){clock+=4*3600000;await cropCycle();}
   await gather('madera',run('ARM_DEF.espada_madera.cost.madera'));c.craftWeapon('espada_madera');assert.ok(c.G.weapons.espada_madera);c.G.gear.arma='espada_madera';c.tutoEvent('equiparm');c.tutoEvent('dummy');await checkpoint(true);
  }
 }
 // Cultivar se mantiene viable después de construir y al volver en días distintos.
 for(let day=0;day<7;day++){clock+=86400000;await cropCycle();assert.ok(c.G.plata>=3);}
 const e=c.expansionSiguiente();while(c.G.level<e.nivel){clock+=4*3600000;await cropCycle();}
 for(const[r,n]of Object.entries(e.costo)){if(r==='plata'){for(let j=0;c.G.plata<n&&j<100;j++){clock+=4*3600000;await cropCycle();}assert.ok(c.G.plata>=n);}else await gather(r,n);}
 assert.equal(c.expansionComprar(),true);const until=c.G.expObra.hasta;await checkpoint(true);assert.equal(c.G.expansiones,0,'la obra no se entrega antes');clock=until+1;await checkpoint(true);assert.equal(c.expansionObraTick(),true);await checkpoint(true);assert.equal(c.G.expansiones,1);assert.equal(c.G.produccion.vale,1);assert.equal(c.produccionComprar('plot'),true);await checkpoint(true);assert.equal(c.G.produccion.vale,0);assert.equal(c.G.plotsOwned,4);assert.ok(c.produccionUsados()<=c.produccionCapacidad());
 console.log('OK: cuenta nueva → cultivo → Herrería/Horno/Cocina con aportes parciales → espada → siete días de cultivo → expansión offline y nodo elegido; '+s.writes()+' guardados aceptados con recargas y relojes conservados.');
})().catch(e=>{console.error(e);console.error('Últimos mensajes:',notes.slice(-5));process.exitCode=1;});
