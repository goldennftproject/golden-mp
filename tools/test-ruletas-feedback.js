'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const {JSDOM}=require(repo+'/node_modules/jsdom');
const script=fs.readFileSync(process.env.GF_RULETAS_FEEDBACK_SCRIPT||repo+'/public/game/ruletas.js','utf8'),stateSource=fs.readFileSync(repo+'/public/game/state.js','utf8');
const config=JSON.parse(fs.readFileSync(repo+'/sql/ruletas.sql','utf8').match(/select '(\{"version":1,[^']+)'::jsonb/)[1]);
const wood=config.objetos.premios.find(p=>p.item==='madera'),op='11111111-1111-4111-8111-111111111111';
const status=used=>({config,habilitado:true,juegoAbierto:true,bote:10,reserva:0,financiado:true,usados:used,gratisRestantes:3-used,precioPlata:0});
const receipt=(overrides={})=>({op,modo:'objetos',roll:100,premio:wood,coste:0,...overrides});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(options={}){
 const dom=new JSDOM('<!doctype html><div id="flujo"></div><button id="entry">Ruletas</button>',{url:'https://goldenfarm.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
 let counter=0,timerId=0,queries=0,spins=0,claims=0,saves=0,blocked=!!options.full;
 const timers=new Map(),blockedKeys=new Set(options.blockedKeys||[]);w.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};w.clearTimeout=id=>timers.delete(id);w.setInterval=()=>{throw Error('No polling');};
 w.G={res:{madera:0},mkPend:[],golden:0,plata:1000};w.UID='fixture-account';w.matchMedia=()=>({matches:true});
 w.openOv=id=>d.getElementById(id).classList.add('show');w.closeOv=id=>d.getElementById(id).classList.remove('show');
 w.ruletasPendiente=()=>false;w.refreshHud=()=>{};w.syncSlots=()=>{};w.isOpen=()=>false;w.toast=()=>{};w.log=()=>{};w.saveFarm=()=>{saves++;};
 w.tryAddRes=(key,amount)=>{if(blocked||blockedKeys.has(key))return false;w.G.res[key]=(w.G.res[key]||0)+amount;return true;};
 const delivery=stateSource.slice(stateSource.indexOf('function mkPoner('),stateSource.indexOf('function mkEntregar('));w.eval(delivery);
 const realClaim=w.mkPendCobrar;w.mkPendCobrar=()=>{claims++;return realClaim();};
 w.bolsaFoto=()=>Object.fromEntries(Object.entries(w.G.res).map(([key,n])=>['res:'+key,n]));
 const flowStart=stateSource.indexOf('var _flujoFoto = null;');w.eval(stateSource.slice(flowStart,stateSource.indexOf('/* ═',flowStart)));w.flujoCambios();
 w.ruletasConsultar=async()=>{queries++;return{estado:status(counter),...(options.recover?{found:true,recibo:receipt(options.recover)}:{found:false})};};
 w.ruletasGirar=async()=>{
  spins++;if(options.error)throw Error('Sin confirmar');counter++;
  const r=receipt(options.result);
  if(r.modo==='objetos'&&!r.cancelado)w.G.mkPend.push({kind:wood.kind,item:wood.item,qty:wood.qty,payload:null});
  if(r.goldenWin)w.G.golden=r.payout;
  return{estado:status(counter),recibo:r,repetido:!!options.repeated,cancelado:!!r.cancelado};
 };
 w.askConfirm=(text,fn)=>fn();w.eval(script);
 const $=selector=>d.querySelector(selector);
 async function open(){w.abrirRuletas();await tick();}
 async function spin(m='objetos'){$(m==='golden'?'#gf-tab-golden':'#gf-tab-objects').click();$(m==='golden'?'.gf-spin-golden':'.gf-spin-objects').click();await tick();const ev=new w.Event('transitionend');ev.propertyName='transform';$(m==='golden'?'.gf-golden-wheel':'.gf-object-wheel').dispatchEvent(ev);await tick();}
 return{w,d,$,open,spin,timers,setFull:v=>blocked=v,setKeyBlocked:(key,value)=>value?blockedKeys.add(key):blockedKeys.delete(key),get counts(){return{queries,spins,claims,saves};},close:()=>w.close()};
}
test('a fresh confirmed object prize says Por recoger and keeps actual inventory unchanged',async()=>{
 const f=fixture();await f.open();await f.spin();
 assert.match(f.$('.gf-premio-aviso').textContent,/\+5MaderaPor recoger/);assert.match(f.$('.gf-premio-aviso img').src,/res_madera/);
 assert.equal(f.w.G.res.madera,0);assert.equal(f.w.G.mkPend.length,1);assert.equal(f.counts.claims,0);assert.equal(f.counts.saves,0);
 assert.deepEqual(Array.from(f.w.flujoCambios()),[],'queue receipt is not a bag gain');
 assert.equal(f.$('.gf-consulta').nextElementSibling,f.$('.gf-entregas'),'claim control precedes the wheel and long prize catalogue');
 assert.match(f.$('.gf-entregas>span').textContent,/aún no están en tu bolsa/);assert(!f.$('[data-r-recoger]').disabled);f.close();
});
test('recovered, repeated and cancelled receipts never replay a fresh win notification',async()=>{
 for(const opts of [{recover:{}},{repeated:true},{result:{cancelado:true,premio:null}}]){
  const f=fixture(opts);await f.open();if(!opts.recover)await f.spin();
  assert.equal(f.$('.gf-premio-aviso'),null);f.close();
 }
});
test('failed confirmation produces neither a win notice nor a fake pending item',async()=>{
 const f=fixture({error:true});await f.open();await f.spin();assert.equal(f.$('.gf-premio-aviso'),null);assert.equal(f.w.G.mkPend.length,0);assert.equal(f.w.G.res.madera,0);assert.match(f.$('[data-r-estado]').textContent,/Sin confirmar/);f.close();
});
test('manual collection uses the existing delivery code once and the normal bag diff reports exactly the actual amount',async()=>{
 const f=fixture();await f.open();await f.spin();f.$('[data-r-recoger]').click();await tick();
 assert.equal(f.w.G.res.madera,5);assert.equal(f.w.G.mkPend.length,0);assert.equal(f.counts.claims,1);
 assert.equal(f.$('.gf-premio-aviso'),null,'the pending label is removed once an actual claim succeeds');
 assert.deepEqual(JSON.parse(JSON.stringify(f.w.flujoCambios())),[{kind:'res',key:'madera',d:5}]);
 assert(f.$('[data-r-recoger]').disabled);f.$('[data-r-recoger]').click();await tick();assert.equal(f.counts.claims,1);assert.equal(f.w.G.res.madera,5);assert.deepEqual(Array.from(f.w.flujoCambios()),[]);f.close();
});
test('a full bag keeps the confirmed prize pending and never advertises an inventory gain',async()=>{
 const f=fixture({full:true});await f.open();await f.spin();f.$('[data-r-recoger]').click();await tick();
 assert.equal(f.w.G.res.madera,0);assert.equal(f.w.G.mkPend.length,1);assert.match(f.$('.gf-entregas>span').textContent,/Por recoger/);assert.deepEqual(Array.from(f.w.flujoCambios()),[]);
 f.setFull(false);f.$('[data-r-recoger]').click();await tick();assert.equal(f.w.G.res.madera,5);assert.equal(f.w.G.mkPend.length,0);f.close();
});
test('receipt identity prevents a duplicate banner; a confirmed Golden payout is labelled as credited',async()=>{
 const duplicate=fixture();await duplicate.open();await duplicate.spin();const first=duplicate.$('.gf-premio-aviso');await duplicate.spin();assert.equal(duplicate.$('.gf-premio-aviso'),first,'same receipt UUID cannot replace/replay the notice');duplicate.close();
 const golden=fixture({result:{modo:'golden',payout:10.8,goldenWin:true,premio:{kind:'golden',item:'golden',qty:10.8}}});golden.w.G.golden=100;await golden.open();await golden.spin('golden');
 assert.match(golden.$('.gf-premio-aviso').textContent,/\+10,8GoldenAcreditados/);assert.equal(golden.w.G.golden,10.8);assert.equal(golden.w.G.mkPend.length,0);golden.close();
});

test('collecting another queued item keeps the blocked roulette prize notice until that prize is delivered',async()=>{
 const f=fixture({blockedKeys:['madera']});f.w.G.mkPend.push({kind:'res',item:'piedra',qty:3,payload:null});await f.open();await f.spin();
 const notice=f.$('.gf-premio-aviso');f.$('[data-r-recoger]').click();await tick();
 assert.equal(f.w.G.res.piedra,3);assert.equal(f.w.G.res.madera,0);assert.equal(f.w.G.mkPend.length,1);assert.equal(f.$('.gf-premio-aviso'),notice);
 assert.match(notice.textContent,/Por recoger/);assert.deepEqual(JSON.parse(JSON.stringify(f.w.flujoCambios())),[{kind:'res',key:'piedra',d:3}]);
 f.setKeyBlocked('madera',false);f.$('[data-r-recoger]').click();await tick();assert.equal(f.w.G.res.madera,5);assert.equal(f.$('.gf-premio-aviso'),null);f.close();
});

test('changing accounts removes the previous account transient reward notice',async()=>{
 const f=fixture();await f.open();await f.spin();assert(f.$('.gf-premio-aviso'));
 f.w.UID='another-account';f.w.refrescarRuletas();assert.equal(f.$('.gf-premio-aviso'),null);f.close();
});
