'use strict';
// Deterministic, synthetic read-only diagnosis. Actual client finishAction/save code and actual guardar HTTP handler.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),requireGame=createRequire(path.join(root,'tools/test-guardado-atomico.js'));
const START=Date.UTC(2026,10,5,12),clone=structuredClone,rows=[];
const flush=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
async function scenario({stage,delay,extra,queued,spendWood,skew=0,initialCharges=4,initialEnergy=50,processingDelay=0}){
 let clock=START,release,requests=[],responses=[],failures=[];
 class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 class ClientClock extends Date{constructor(...args){super(...(args.length?args:[clock+skew]));}static now(){return clock+skew;}}
 let prefix=fs.readFileSync(path.join(root,'tools/test-guardado-atomico.js'),'utf8').split('(async()=>{')[0];
 if(process.env.GUARDAR_CANDIDATE)prefix=prefix.replace('const fuente=fs.readFileSync(path.resolve(__dirname,"../supabase/functions/guardar/index.ts"),"utf8");','const fuente=fs.readFileSync('+JSON.stringify(path.resolve(process.env.GUARDAR_CANDIDATE))+',"utf8");');
 const factory=new Function('require','__dirname','Date',prefix+';return servidor;')(requireGame,path.join(root,'tools'),Clock);
 const save=fs.readFileSync(path.join(root,'public/game/save.js'),'utf8');
 const {ctx:c}=requireGame('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':save.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
 const run=s=>vm.runInContext(s,c);c.Date=ClientClock;c.nowMs=()=>clock+skew;
 for(const k of ['refreshHud','refreshInv','refreshHotbar','refreshMarket','refreshSeedShop','refreshForge','refreshBarn','syncSlots','celebrate','tutoRefresh','tutoCheck','syncCobertizo','reiniciarGranjaSuave','showSaving','showSaved','showSaveError','log','toast','oficiosSync','recalcFarmLevel','tutoEvent','passEvent'])c[k]=()=>{};
 c.isOpen=()=>false;c.setTimeout=(f,ms)=>ms===1500?setImmediate(f):0;c.clearTimeout=()=>{};
 await c.SAVE_READY;c.estadoDeCero();c.G.tuto={v:15,step:99,done:true,n:0};c.kitReclamar();c.G.tools.axe=20;c.G.plata=100;c.G.built.store=true;
 c.G.stats={talar:{_:0}};c.G.statsBase={};c.G.skills.tala=0;c.G.nodoUsos={};c.G.actividadAcciones={};c.G.actividadGranja=null;c.G.logrosAcciones={};c.G.logrosV2=null;
 const proto=run('FarmScene.prototype'),sprite={setVisible(){},setAlpha(){}},sc={objs:[],textures:{exists:()=>false},setObjTex(){},barraGolpes(){},premioFx(){},syncNodos(){return proto.syncNodos.call(sc);}};
 sc.objs=c.GF.WORLD_OBJECTS.map((o,i)=>({...o,i,cx:0,by:0,sprite})).filter(o=>['tree','rock','ore'].includes(o.type)&&c.produccionNodoPoseido(o.i));
 const tree=sc.objs.find(o=>o.type==='tree');assert(tree,'synthetic new player owns a tree');
 tree.readyAt=START-(initialCharges-1)*1800000;tree.cdIni=tree.readyAt-1800000;tree.halfAt=tree.readyAt-900000;sc.syncNodos();c.farmScene=sc;c.FARM=sc;c.GF.scene='farm';
 c.G.energiaGranja={v:1,actual:initialEnergy,at:START};
 const initial=clone(c.snapshot()),stamp=new Date(START-1000).toISOString(),server=factory({user_id:'qa',name:'QA',updated_at:stamp,data:initial});
 const wait=new Promise(resolve=>{release=resolve;});
 c.qaSb={functions:{invoke:async(_,p)=>{
  const index=requests.length;requests.push(clone(p.body));if(index===0&&stage==='server'){await wait;clock+=processingDelay;}
  const response=await server.call(p.body),data=await response.json();responses.push({index,status:response.status,at:clock,activity:clone(data.actividadGranja||null),logros:clone(data.logrosV2||null)});
  if(index===0&&stage==='ack')await wait;
  if(response.status!==200)failures.push({status:response.status,result:data});
  return response.status===200?{data}:{error:{context:{status:response.status,json:async()=>data}}};
 }},auth:{getUser:async()=>({data:{user:{id:'qa'}}})},from:()=>{throw Error('No external reads or writes are allowed');}};
 run("sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;lastSavedKey=null;SAVE_BASES.set('qa',"+JSON.stringify(stamp)+");SAVE_CONFLICTOS.clear();");
 const counters=()=>({wood:c.G.res.madera||0,axes:c.G.tools.axe,energy:c.G.energiaGranja.actual,at:c.G.energiaGranja.at,uses:c.G.nodoUsos[tree.i]||0,tala:c.G.stats.talar._,xp:c.G.skills.tala,asked:c.G.actividadAcciones.chop||0,woodAsked:c.G.logrosAcciones.madera||0,confirmed:c.G.actividadGranja?.registro?.chop||0,goal:c.G.actividadGranja?.jornada?.progreso?.chop||0,achievement:c.G.logrosV2?.progreso?.madera||0,node:clone(c.G.nodos[c.produccionNodoKey(tree.i)])});
 function cut(){const before=c.G.stats.talar._;for(let click=0;click<3&&c.G.stats.talar._===before;click++){clock+=1000;sc.action={kind:'chop',o:tree};proto.finishAction.call(sc);}assert.equal(c.G.stats.talar._,before+1,'one actual productive chop');if(spendWood)c.G.res.madera--;}
 cut();const firstLocal=counters(),first=c.saveFarm(true);await flush();assert.equal(requests.length,1);
 clock+=delay;for(let n=0;n<extra;n++)cut();const during=counters();if(queued)c.saveFarm(true);
 release();await first;const afterAck=counters(),pendingAfterAck=run('lastSavedKey!==snapKey()');
 if(!queued)await c.saveFarm(true);
 const accepted=server.row().data,expected=1+extra,pass=failures.length===0&&(accepted.logrosV2?.progreso?.madera||0)===expected&&(accepted.actividadGranja?.jornada?.progreso?.chop||0)===expected;
 return {stage,delay,extra,queued,spendWood,skew,initialCharges,processingDelay,pass,expected,requests:requests.length,writes:server.writes(),failures,firstLocal,during,afterAck,pendingAfterAck,accepted:{uses:accepted.nodoUsos?.[tree.i]||0,tala:accepted.stats?.talar?._||0,xp:accepted.skills?.tala||0,energy:accepted.energiaGranja,asked:accepted.actividadAcciones?.chop||0,confirmed:accepted.actividadGranja?.registro?.chop||0,goal:accepted.actividadGranja?.jornada?.progreso?.chop||0,achievement:accepted.logrosV2?.progreso?.madera||0,wood:accepted.res?.madera||0},responses};
}
if(require.main===module)(async()=>{
 for(const stage of ['ack','server'])for(const delay of [0,5000,30000,300000])for(const queued of [false,true]){
  rows.push(await scenario({stage,delay,extra:1,queued,spendWood:false}));
 }
 for(const stage of ['ack','server'])rows.push(await scenario({stage,delay:5000,extra:3,queued:true,spendWood:true}));
 for(const extra of [1,3])for(const processingDelay of [0,50,1500,5000,30000])rows.push(await scenario({stage:'server',delay:5000,extra,queued:true,spendWood:true,processingDelay}));
 const files=['public/game/save.js','public/game/state.js','public/game/farm.js','supabase/functions/guardar/index.ts'];
 const report={at:new Date().toISOString(),scope:'Synthetic, in-memory actual client and HTTP guardar handler. No DB or repository writes.',sourceSha256:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),total:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length,rows};
 if(process.env.GUARDAR_CANDIDATE)report.candidate={path:path.resolve(process.env.GUARDAR_CANDIDATE),sha256:crypto.createHash('sha256').update(fs.readFileSync(process.env.GUARDAR_CANDIDATE)).digest('hex')};
 console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,failures:rows.filter(r=>!r.pass).map(({stage,delay,extra,queued,spendWood,accepted,failures})=>({stage,delay,extra,queued,spendWood,accepted,failures}))},null,2));
 process.exitCode=report.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={scenario};
