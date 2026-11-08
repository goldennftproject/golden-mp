/* Real cold auth/load/hydrate, Forest recovery methods and DOM button handlers.
   Uses synthetic SDK responses only; never accesses a database or network. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto'),{test}=require('node:test'),assert=require('node:assert/strict');
const REPO=process.env.GF_COLD_REPO||path.resolve(__dirname,'..');
const UID='11111111-1111-4111-8111-111111111111',OP='44444444-4444-4444-8444-444444444444';
const BASE='2026-11-08T23:19:40.984000+00:00',NEXT='2026-11-08T23:20:00.000000+00:00',END='2026-11-08T23:20:01.000000+00:00';
const clone=x=>JSON.parse(JSON.stringify(x));
const source=(file,override)=>fs.readFileSync(process.env[override]||path.join(REPO,'public/game',file),'utf8');
function fixture({hp=0,travel='pantano',delayedStatus=false}={}){
 const {ctx:c,elementos}=require(path.join(REPO,'tools/arrancar-el-juego.contexto.js')).arrancar(REPO,{
  'game/main.js':'',
  'game/save.js':source('save.js','GF_COLD_SAVE_CANDIDATE').replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();'),
  'game/graves-api.js':source('graves-api.js','GF_COLD_API_CANDIDATE'),
  'game/ui.js':source('ui.js','GF_COLD_UI_CANDIDATE').replace(/^initUI\(\);$/m,'// QA invokes the real recovery handlers directly.'),
 });
 const run=code=>vm.runInContext(code,c),memory=new Map(),calls=[],transitions=[],savedCopies=[];
 let paused=false,resolveStatus,remote;
 c.Date=class extends Date{constructor(...args){super(...(args.length?args:[Date.parse(BASE)]));}static now(){return Date.parse(BASE);}};
 c.nowMs=()=>Date.parse(BASE);c.crypto={randomUUID};
 c.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),key:i=>[...memory.keys()][i]??null,get length(){return memory.size;}};
 for(const el of Object.values(elementos))if(el&&typeof el==='object')el.style={setProperty(){},removeProperty(){}};
 c.document.documentElement.style={setProperty(){},removeProperty(){}};
 for(const name of ['log','toast','showSaved','showSaving','showSaveError','sesionLog','usdtProgramarPendiente'])c[name]=()=>{};
 c.copiaGuardar=(data,saved)=>savedCopies.push({data:clone(data),saved});c.sleepMs=async()=>{};
 c.irAEscena=(_scene,key)=>transitions.push(key);
 run("estadoDeCero();UID=null;CARGA_OK=false;SOLO_LOCAL=false;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_OTRA=false;lastSavedKey=null;GF.GRAVES_SHARED_ENABLED=true;GF.scene='forest';");
 Object.assign(c.G,{hp,hpMax:100,buffs:[],armorEq:null,stam:72,stamAcc:0,stamLastAt:Date.parse(BASE),
  stamFullAt:Date.parse(BASE)+4000000,cont:{c:'backpack',items:[{kind:'res',k:'madera',n:5}]},tumba:null,
  zonaViaje:travel===null?null:{t:Date.parse(BASE)-30000,pos:{zona:travel,x:100,y:100}},energiaGranja:{v:1,actual:50,at:Date.parse(BASE)}});
 c.G.res.madera=40;remote=clone(c.snapshot());delete remote._graveProtocol;
 const beforeSnapshot={...clone(remote),hp:0},p={cuenta:UID,op:OP,createdAt:Date.parse(BASE),base:BASE,beforeKey:c.snapKey(beforeSnapshot),beforeSnapshot,calavera:{action:'morir'}};
 const ref=run('SB_REF');
 memory.set('gf-servidor-epoca-'+ref,run('GF_SERVIDOR_EPOCA'));
 memory.set('gf-calavera-recibo-'+ref+'-'+UID+'-'+OP,JSON.stringify(p));
 memory.set('gf-venta-pendiente-'+ref+'-'+UID,JSON.stringify(p));
 const session={user:{id:UID},refresh_token:'synthetic-not-a-credential'};
 const status=()=>({ok:true,enabled:true,serverNow:new c.Date().toISOString(),ownGraveId:null,markers:[]});
 c.qaSb={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),onAuthStateChange(){}},
  from:table=>{assert.equal(table,'farms');return{select:()=>({eq:()=>({maybeSingle:async()=>({data:{name:'Synthetic actor',data:clone(remote),updated_at:BASE},error:null})})})};},
  functions:{invoke:async(_name,{body})=>{
   calls.push(clone(body));
   if(body.accion==='estado')return delayedStatus?await new Promise(resolve=>{resolveStatus=()=>resolve({data:status(),error:null});}):{data:status(),error:null};
   if(body.accion==='comprobar')return{data:{ok:true,data:clone(remote),updated_at:BASE,cancelado:true,receipt:{op:OP,action:'morir',graveId:null,cancelado:true}},error:null};
   if(body.jornada){assert.equal(body.data.hp,0,'a fresh death preflush must retain canonical hp0');return{data:{ok:true,updated_at:NEXT},error:null};}
   assert.equal(body.accion,'morir');assert.notEqual(body.op,OP);assert.equal(body.base,NEXT);
   assert.deepEqual(clone(c.G.cont),remote.cont,'inventory remains intact until the server ACK');
   return{data:{ok:true,data:{...clone(c.snapshot()),hp:50,cont:null,tumba:null,zonaViaje:null,_graveProtocol:1},updated_at:END,cancelado:false,
    receipt:{op:body.op,action:'morir',graveId:null,cancelado:false,actorBaseBefore:body.base,actorBaseAfter:END}},error:null};
  }}};
 c.supabase={createClient:()=>c.qaSb};
 const scene={zonaKey:'pantano',hero:{x:100,y:100},leaving:false,_graveDeathPending:false,_graveDeathPromise:null,_graveDeathFinishedOp:null,
  scene:{isPaused:()=>paused,pause(){paused=true;},resume(){paused=false;}},sys:{isActive:()=>!paused,isPaused:()=>paused}};
 const proto=run('ForestScene.prototype');
 for(const name of ['derrotaCompartidaActiva','iniciarMuerteCompartida','finalizarMuerteCompartida'])scene[name]=proto[name].bind(scene);
 const state=()=>({hp:c.G.hp,conflict:run(`SAVE_CONFLICTOS.has('${UID}')`),savePending:c.guardadoTienePendiente(UID),marketPending:!!c.mercadoPendiente(UID),gravePending:!!c.GoldenGraves.pending(UID),busy:c.GoldenGraves.busy()});
 return{c,run,scene,calls,remote,p,transitions,savedCopies,state,paused:()=>paused,resolveStatus:()=>{assert.equal(typeof resolveStatus,'function');resolveStatus();}};
}
async function coldLoad(f){assert.equal(await f.c.initSave(),true);assert.equal(await f.c.loadFarm(),true);}
async function click(f){assert.ok(f.scene._graveRecovery);const button=f.scene._graveRecovery.children[2];assert.equal(button.disabled===true,false);await button.onclick();}

test('cold canonical hp0 survives auth/load and both real recovery clicks reach the farm with a fresh death UUID',async()=>{
 const f=fixture();await coldLoad(f);assert.equal(f.c.G.hp,0);
 await f.c.GoldenGraves.load(f.scene);f.c.GoldenGraves.showRecovery(f.scene,'Previous death receipt');
 await click(f);
 assert.equal(f.c.G.hp,0);assert.deepEqual(clone(f.c.G.cont),f.remote.cont);
 assert.equal(f.state().gravePending,false);assert.equal(f.state().marketPending,false);assert.equal(f.state().conflict,false);
 await click(f);
 assert.equal(f.c.G.hp,50);assert.equal(f.c.G.cont,null);assert.equal(f.scene._graveRecovery,null);assert.equal(f.state().busy,false);
 // Actual Phaser stops the old Forest scene on this transition; the headless
 // transition spy does not emulate the scene manager's stop lifecycle.
 assert.deepEqual(f.transitions,['farm']);assert.equal(f.c.G.res.madera,40);
 assert.deepEqual(f.calls.filter(x=>x.accion!=='estado').map(x=>x.accion||'guardar'),['comprobar','guardar','morir']);
});

test('a status response arriving after recovery pauses Forest still permits the actual confirmation button',async()=>{
 const f=fixture({delayedStatus:true});await coldLoad(f);const loading=f.c.GoldenGraves.load(f.scene);
 f.c.GoldenGraves.showRecovery(f.scene,'Previous death receipt');assert.equal(f.paused(),true);
 f.resolveStatus();await loading;assert.equal(f.c.GoldenGraves.deathUsesServer(),true);
 await click(f);await click(f);
 assert.equal(f.c.G.hp,50);assert.equal(f.state().busy,false);assert.deepEqual(f.transitions,['farm']);
 assert.equal(f.calls.filter(x=>x.accion==='morir').length,1);
});

for(const hp of [1,80])test('a hp0 local journal cannot create a defeat over canonical hp'+hp,async()=>{
 const f=fixture({hp});await coldLoad(f);assert.equal(f.c.G.hp,hp);
 await f.c.GoldenGraves.load(f.scene);f.c.GoldenGraves.showRecovery(f.scene,'Stale journal');await click(f);await click(f);
 assert.equal(f.c.G.hp,hp);assert.deepEqual(clone(f.c.G.cont),f.remote.cont);assert.equal(f.c.G.res.madera,40);
 assert.equal(f.calls.filter(x=>x.accion==='morir').length,0);assert.deepEqual(f.transitions,[]);
});

for(const travel of [null,'not-a-real-zone','toString','__proto__'])test('legacy hp0 outside a valid saved journey keeps its existing minimum-life policy: '+travel,async()=>{
 const f=fixture({travel});await coldLoad(f);
 assert.equal(f.c.G.hp,1,'a local death journal does not authorize a new defeat');
 assert.equal(f.calls.filter(x=>x.accion==='morir').length,0);assert.equal(f.state().gravePending,true);
});
