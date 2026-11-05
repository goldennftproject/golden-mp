'use strict';
// Local client/ACK/guardar rules only. No network or game/player writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..');
const state=fs.readFileSync(path.join(repo,'public/game/state.js'),'utf8');
const save=fs.readFileSync(path.join(repo,'public/game/save.js'),'utf8').replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();');
const results=[];const clone=x=>JSON.parse(JSON.stringify(x));let completed=false;
process.on('beforeExit',()=>{if(!completed){console.error('Incomplete candidate suite after '+results.length+' cases');process.exitCode=1;}});
function fresh(){
 const {ctx:c}=require(path.join(repo,'tools/arrancar-el-juego.contexto.js')).arrancar(repo,{'game/state.js':state,'game/save.js':save,'game/main.js':''});
 let now=1800000000000;const run=s=>vm.runInContext(s,c);
 c.Date=class extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}};c.nowMs=()=>now;
 for(const k of ['toast','log','refreshHud','refreshCobertizo','syncSlots','refreshInv','refreshHotbar','showSaving','showSaved','showSaveError','usdtProgramarPendiente'])c[k]=()=>{};
 c.isOpen=()=>false;c.sleepMs=async()=>{};c.copiaGuardar=()=>{};c.setTimeout=f=>{f();return 0;};c.console=console;
 run("estadoDeCero();sb={};UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_OTRA=false;SAVE_CONFLICTOS.clear();lastSavedKey=null;SAVE_BASES.clear();SAVE_CONFIRMACIONES.clear();");
 return {c,run,t:()=>now,set:t=>{now=t;},advance:ms=>{now+=ms;}};
}
function add(c,t,label='Estofado'){const b={type:'cd',label,mult:.85,until:t+90000};c.G.buffs.push(b);return b;}
function ack(x){return {data:{ok:true,updated_at:new Date(x.t()).toISOString()},error:null};}
async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}
async function test(name,fn){await fn();results.push({name,ok:true});}
(async()=>{
 await test('expired CD kept, effect expires, other expired buffs removed',()=>{
  const x=fresh(),{c}=x,b=add(c,x.t());c.G.buffs.push({type:'speed',mult:2,until:x.t()+1000});x.advance(150000);c.buffTick();
  assert.equal(c.G.buffs.length,1);assert.equal(c.G.buffs[0].until,b.until);assert.equal(c.cdMult(),1);assert.equal(c.buffTotal('cd'),0);
 });
 await test('exact confirmed expired witness cleaned; acknowledged key remains clean',async()=>{
  const x=fresh(),{c}=x;add(c,x.t());x.advance(150000);c.buffTick();let sent;
  c.alfaInvocarGuardado=async body=>{sent=clone(body);return ack(x);};await c.saveFarm(true);
  assert.equal(sent.data.buffs.length,1);assert.equal(c.G.buffs.length,0);assert.equal(x.run('lastSavedKey'),c.snapKey());
 });
 await test('active confirmed witness expires normally on later tick',async()=>{
  const x=fresh(),{c}=x;add(c,x.t());c.alfaInvocarGuardado=async()=>ack(x);await c.saveFarm(true);assert.equal(c.G.buffs.length,1);assert.equal(c.cdMult(),.85);
  x.advance(90001);c.buffTick();assert.equal(c.G.buffs.length,0);assert.equal(c.cdMult(),1);
 });
 await test('old ACK never removes a newer consumption; both real saves exercised',async()=>{
  const x=fresh(),{c}=x,a=add(c,x.t(),'A');x.advance(150000);c.buffTick();let release,first;
  c.alfaInvocarGuardado=body=>{first=clone(body);return new Promise(r=>{release=r;});};
  const pending=c.saveFarm(true);await settle();assert.equal(first.data.buffs.length,1);
  const b=add(c,x.t(),'B');c.G.plata+=1;x.advance(150000);c.buffTick();assert.equal(c.G.buffs.length,2);
  release(ack(x));await pending;
  assert.deepEqual(Array.from(c.G.buffs,b=>b.until),[b.until]);assert.notEqual(x.run('lastSavedKey'),c.snapKey());
  let second;c.alfaInvocarGuardado=async body=>{second=clone(body);return ack(x);};await c.saveFarm(true);
  assert.equal(second.data.buffs.length,1);assert.equal(second.data.buffs[0].until,b.until);assert.equal(c.G.buffs.length,0);assert.notEqual(a.until,b.until);
 });
 await test('local snapshot/hydrate before ACK preserves pending expired witness',async()=>{
  const x=fresh(),{c}=x;const b=add(c,x.t());x.advance(150000);c.buffTick();const local=clone(c.snapshot());
  c.hydrate(local);c.buffTick();assert.equal(c.G.buffs.length,1);assert.equal(c.G.buffs[0].until,b.until);assert.equal(c.cdMult(),1);
  let body;c.alfaInvocarGuardado=async s=>{body=clone(s);return ack(x);};await c.saveFarm(true);assert.equal(body.data.buffs.length,1);assert.equal(c.G.buffs.length,0);
 });
 await test('failed save preserves pending witness across both retries',async()=>{
  const x=fresh(),{c}=x;add(c,x.t());x.advance(150000);c.buffTick();let calls=0;
  c.alfaInvocarGuardado=async()=>{calls++;return {error:{message:'local-test-offline',context:{status:503}},data:null};};
  await c.saveFarm(true);assert.equal(calls,2);assert.equal(c.G.buffs.length,1);c.buffTick();assert.equal(c.G.buffs.length,1);
 });
 await test('wrong account ACK cannot clean pending witness',async()=>{
  const x=fresh(),{c}=x;add(c,x.t());x.advance(150000);c.buffTick();let release;
  c.alfaInvocarGuardado=()=>new Promise(r=>{release=r;});const p=c.saveFarm(true);await settle();x.run("UID='another-account'");release(ack(x));await p;assert.equal(c.G.buffs.length,1);
 });
 await test('unconfirmed or mismatched ACK lists do not clear witness',()=>{
  const x=fresh(),{c}=x,b=add(c,x.t());x.advance(150000);c.buffTick();
  c.buffCdConfirmar([]);assert.equal(c.G.buffs.length,1);c.buffCdConfirmar([{...b,until:b.until-1}]);assert.equal(c.G.buffs.length,1);
  c.buffCdConfirmar([{...b,mult:.9}]);assert.equal(c.G.buffs.length,1);
 });
 await test('new state clears acknowledgement cache; invalid expired CD not retained',()=>{
  const x=fresh(),{c}=x;const b=add(c,x.t());c.buffCdConfirmar([b]);c.estadoDeCero();c.G.buffs=[{...b}];x.advance(150000);c.buffTick();assert.equal(c.G.buffs.length,1);
  c.buffCdRestaurar([{type:'cd',mult:NaN,until:b.until},{type:'cd',mult:.85,until:'bad'},null]);assert.equal(c.G.buffs.length,0);
 });
 await test('actual server now credits retained expired food, rejects no-food/fast clocks',()=>{
  const x=fresh(),{c}=x,start=x.t(),food=add(c,start);x.advance(150000);c.buffTick();
  const source=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8'),s={console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite};vm.createContext(s);vm.runInContext(source.slice(source.indexOf('const VERSION'),source.indexOf('/* === FIN REGLAS ===')),s);
  const key=vm.runInContext('PREMIUM_WORLD.versions[3].objects[0].key',s);
  const a={espacioV:3,expansiones:0,level:3,plata:30,plotsOwned:3,treesOpen:[0],rocksOpen:[0],res:{madera:0},tools:{axe:1},skills:{tala:0,crafting:0},stats:{talar:{_:0}},nodoUsos:{0:0},nodos:{[key]:{readyAt:start-1000,cdIni:start-1801000}},energiaGranja:{actual:50,at:start},produccion:{v:1,vipUnico:1,base:5,nodos:{},pausas:{},vipHasta:0},actividadAcciones:{chop:0},actividadGranja:{v:1,energia:0,registro:{chop:0}},logrosAcciones:{madera:0},logrosV2:{v:1,progreso:{madera:0},registro:{madera:0},cobrados:{}},dishes:{estofado:1},buffs:[]};
  function next(){const b=clone(a);b.tools.axe=0;b.skills.tala=10;b.stats.talar._=1;b.nodoUsos[0]=1;b.res.madera=1;b.actividadAcciones.chop=1;b.logrosAcciones.madera=1;b.energiaGranja.actual=49+90000*50/14400000;b.energiaGranja.at=x.t();b.dishes.estofado=0;b.nodos[key]={cdIni:start+60000,readyAt:start+60000+1530000};b.buffs=clone(c.G.buffs);return b;}
  const b=next(),receipt={};s.actividadActualizar(a,b,x.t(),receipt,true,start);assert.equal(receipt.chop,1);assert.equal(b.logrosV2.progreso.madera,1);assert.equal(b.actividadGranja.jornada.progreso.chop,1);
  const noFood=next();noFood.dishes.estofado=1;assert.equal(s.talaEvidenciaNodos(a,noFood,x.t(),start),0);
  const impossible=next();impossible.nodos[key].readyAt=impossible.nodos[key].cdIni+1000;assert.equal(s.talaEvidenciaNodos(a,impossible,x.t(),start),0);
  assert.ok(food.until<x.t());assert.equal(c.cdMult(),1);
 });
 completed=true;console.log(JSON.stringify({generatedAt:new Date().toISOString(),scope:'actual source; no network or player writes',count:results.length,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
