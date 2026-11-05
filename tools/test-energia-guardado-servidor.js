'use strict';
// Timestamp/cap acceptance of a workspace-only candidate through the actual HTTP guardar handler.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),candidate=path.join(root,'supabase/functions/guardar/index.ts');
const requireGame=createRequire(path.join(root,'tools/test-guardado-atomico.js')),T=Date.UTC(2026,10,5,12),D=1800000,clone=structuredClone;
let clock=T+1000;
class Clock extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
let prefix=fs.readFileSync(path.join(root,'tools/test-guardado-atomico.js'),'utf8').split('(async()=>{')[0];
prefix=prefix.replace('const fuente=fs.readFileSync(path.resolve(__dirname,"../supabase/functions/guardar/index.ts"),"utf8");','const fuente=fs.readFileSync('+JSON.stringify(candidate)+',"utf8");');
const factory=new Function('require','__dirname','Date',prefix+';return servidor;')(requireGame,path.join(root,'tools'),Clock),rows=[];
function base(){return {espacioV:3,expansiones:0,level:3,plata:30,golden:0,plotsOwned:3,treesOpen:[0],rocksOpen:[0],res:{madera:0,piedra:0},tools:{axe:35},skills:{tala:0,crafting:0},stats:{talar:{_:0}},nodoUsos:{0:5},nodos:{},energiaGranja:{v:1,actual:40,at:T},built:{store:true},produccion:{v:1,vipUnico:1,base:5,vipHasta:0,vipAplicado:false,nodos:{},pausas:{},vale:0,valesV:2,orden:[]},actividadAcciones:{chop:0},actividadGranja:{v:1,energia:0,registro:{chop:0}},logrosAcciones:{madera:0},logrosV2:{v:1,progreso:{madera:0},registro:{madera:0},cobrados:{},ops:[]}};}
function server(data){return factory({user_id:'qa',name:'QA',updated_at:new Date(T).toISOString(),data});}
async function send(s,data,op){const r=await s.call({cuenta:'qa',base:s.row().updated_at,jornada:1,op:op.replace(/[^a-z0-9-]/gi,'-'),data});return {status:r.status,body:await r.json()};}
(async()=>{
 for(const [name,energy,valid]of [
  ['past timestamp',{v:1,actual:40,at:T-DAY()},true],['past timestamp plus inflated energy',{v:1,actual:100,at:T-DAY()},true],
  ['future timestamp plus inflated energy',{v:1,actual:100,at:T+DAY()},true],['real snapshot timestamp',{v:1,actual:39,at:T+500},true],
  ['negative timestamp',{v:1,actual:100,at:-1},true],['missing energy',undefined,true],
  ['negative balance',{v:1,actual:-1,at:T},false],['above maximum',{v:1,actual:101,at:T},false],
  ['nonfinite balance',{v:1,actual:Infinity,at:T},false],['nonfinite timestamp',{v:1,actual:39,at:Infinity},false]
 ]){
  clock=T+1000;const a=base(),s=server(a),b=clone(a);if(energy===undefined)delete b.energiaGranja;else b.energiaGranja=energy;
  const r=await send(s,b,'case-'+name);assert.equal(r.status,valid?200:409,name+': '+JSON.stringify(r.body));
  if(valid){const e=s.row().data.energiaGranja;assert(e.at>=T&&e.at<=clock,name+' cannot move accepted energy anchor outside server bounds');
   assert(e.actual<=s.ctx.energiaServidor(a,e.at)+1e-9,name+' cannot mint energy above the real server allowance');
   assert(e.actual>=0&&e.actual<=50);assert.equal(s.row().data.plata,a.plata);assert.equal(s.row().data.logrosV2.progreso.madera,0,'timestamps alone never prove wood');rows.push({name,passed:true,energy:e});
  }else{assert.equal(s.writes(),0,name+' rejects before persistence');rows.push({name,passed:true,status:r.status});}
 }
 // Repeated future clocks must not turn every save into another independent refill.
 clock=T;const a=base(),s=server(a);
 for(let i=1;i<=50;i++){clock=T+i*1000;const next=clone(s.row().data);next.energiaGranja={v:1,actual:100,at:clock+DAY()};assert.equal((await send(s,next,'future-'+i)).status,200);}
 const energy=s.row().data.energiaGranja;assert(energy.actual<=40+50000*50/14400000+1e-8,'50 forged future timestamps cannot receive more than 50 seconds of real regeneration');
 rows.push({name:'repeated future timestamps',passed:true,writes:s.writes(),energy});
 // Stale samples must not reuse hours of regeneration for fresh actions on every request.
 clock=T;const stale=base();stale.energiaGranja={v:1,actual:0,at:T-4*3600000};stale.expansiones=9;stale.plotsOwned=12;
 stale.plots=Array.from({length:12},()=>({state:'dry'}));stale.seeds={papa:100};stale.stats.plantar={papa:0};stale.actividadAcciones.plant=0;
 const staleServer=server(stale);
 for(let i=0;i<10;i++){
  clock=T+(i+1)*1000;const previous=clone(staleServer.row().data),next=clone(previous),lastVersion=Date.parse(staleServer.row().updated_at);
  next.plots[i]={state:'growing',cropKey:'papa',readyAt:clock+180000};next.seeds.papa--;next.stats.plantar.papa++;next.actividadAcciones.plant++;
  next.energiaGranja={v:1,actual:0,at:T-4*3600000};
  assert.equal(staleServer.ctx.actividadEvidencias(previous,next,clock,lastVersion).plant,1,'the fixture has an independent real planting witness');
  const r=await send(staleServer,next,'stale-plant-'+i);assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(staleServer.row().data.actividadGranja.jornada.progreso.plant,0,'the same stale energy sample cannot fund new actions repeatedly');
  assert(staleServer.row().data.energiaGranja.at>=lastVersion,'accepted energy anchor reaches the prior server version');
 }
 rows.push({name:'stale zero-energy sample with ten new planting witnesses',passed:true,writes:staleServer.writes(),energy:staleServer.row().data.energiaGranja});
 // An expired VIP cannot retain a 100-point capacity by supplying a future timestamp.
 clock=T+1000;const vip=base();vip.produccion.vipHasta=T+500;vip.energiaGranja.actual=80;const v=server(vip),after=clone(vip);after.energiaGranja={v:1,actual:100,at:T+DAY()};
 assert.equal((await send(v,after,'expired-vip')).status,200);assert(v.row().data.energiaGranja.actual<=50);rows.push({name:'expired VIP cap',passed:true,energy:v.row().data.energiaGranja});
 // Independent residual reproduction with a canonical previous server timestamp.
 const src=fs.readFileSync(path.join(root,'public/game/state.js'),'utf8'),client=vm.createContext({Date,Math,JSON,Number,Object,Array,Set,String,isFinite,toast(){}});
 vm.runInContext('var G,clientTime; function nowMs(){return clientTime;}\n'+src.slice(src.indexOf('const ENERGIA_GRANJA_MAX'),src.indexOf('function actividadGranjaRecibir')),client);
 const e=base(),probe=server(e),world=vm.runInContext('PREMIUM_WORLD.versions[3]',probe.ctx),key=world.objects[0].key;
 e.nodos[key]={readyAt:T-60000,cdIni:T-60000-D};client.G=clone(e);client.clientTime=T+10100;client.energiaGranjaPagar('chop',1,true);
 const b=clone(client.G);b.nodoUsos[0]++;b.stats.talar._++;b.skills.tala+=10;b.tools.axe--;b.res.madera++;b.logrosAcciones.madera++;b.nodos[key]={cdIni:client.clientTime,readyAt:client.clientTime+D};
 const receipt={},at=T+10050;probe.ctx.protegerEconomia(e,b,at,T);probe.ctx.actividadActualizar(e,b,at,receipt,true,T);
 assert.equal(receipt.chop,1,'signed normalization aligns future energy samples without a rounding allowance');
 const residual={name:'client +100ms / network 50ms',credited:receipt.chop,asked:b.actividadGranja.registro.chop,achievement:b.logrosV2.progreso.madera,notFixed:false};
 const result={candidate,readOnlyGame:true,synthetic:true,passed:rows.length,rows,residual};
 console.log(JSON.stringify({passed:rows.length,residual},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
function DAY(){return 86400000;}
