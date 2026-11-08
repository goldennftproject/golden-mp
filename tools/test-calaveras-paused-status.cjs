/* Current API and real Forest recovery methods; synthetic Auth/RPC/DOM only.
   No network, database, credentials, player files or production writes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict');
const REPO=process.env.GF_COLD_REPO||path.resolve(__dirname,'..');
const read=(name,override)=>fs.readFileSync(process.env[override]||path.join(REPO,'public/game',name),'utf8');
const api=read('graves-api.js','GF_COLD_API_CANDIDATE'),forest=read('forest.js','GF_COLD_FOREST_CANDIDATE');
const UID='11111111-1111-4111-8111-111111111111',OTHER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OLD='22222222-2222-4222-8222-222222222222',NEW='33333333-3333-4333-8333-333333333333';
const BASE='2026-11-08T23:19:40.984+00:00',NEXT='2026-11-08T23:25:00.000+00:00',copy=x=>JSON.parse(JSON.stringify(x));
function element(){return{children:[],style:{},inert:false,disabled:false,appendChild(c){c.parent=this;this.children.push(c);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);},setAttribute(){},focus(){}};}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function sprite(x,y){const target={x,y,width:48,height:48,visible:true,active:true};let chain;chain=new Proxy(target,{get(t,key){return key in t?t[key]:(...args)=>chain;}});return chain;}
function fixture({journal=false}={}){
 const calls=[],memory=new Map(),transitions=[],body=element();body.appendChild(element());
 let life='active',live={hp:0,hpMax:100,cont:{c:'backpack',items:[{kind:'tool',k:'axe',n:2},{kind:'pick',k:'gold',n:3}]},tumba:null,zonaViaje:{pos:{zona:'pantano',x:100,y:100}},res:{madera:40}};
 const statusQueue=[];
 const ctx={console,Date,JSON,Math,Number,String,Object,Array,Map,Set,Error,Promise,Phaser:{Scene:class{}},
  GF:{GRAVES_SHARED_ENABLED:true,forestCuerpos:[],forestDrops:[],TILE:42,SIZE:{hero:48},ZOOM:1,zona:'pantano'},UID,SB_REF:'local-proof',CARGA_OK:true,SOLO_LOCAL:false,
  SAVE_BASES:new Map([[UID,BASE]]),SAVE_CONFIRMACIONES:new Map([[UID,0]]),SAVE_CONFLICTOS:new Set(journal?[UID]:[]),
  SAVE_EN_CURSO:null,MERCADO_EN_CURSO:null,SAVE_OTRA:false,crypto:{randomUUID:()=>NEW},
  nowMs:()=>Date.parse(NEXT),tumba:()=>live.tumba,log(){},toast(){},refreshHud(){},irAEscena:(_s,key)=>transitions.push(key),
  ZONA_DEF:{pantano:{label:'Zona Negra',arboles:0,mobs:[]}},zonaAnt:()=>null,zonaSig:()=>null,
  document:{body,createElement:element,getElementById:()=>null},
  localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),key:i=>[...memory.keys()][i]??null,get length(){return memory.size;}},
  snapshot:()=>copy(live),snapKey:(data=live)=>JSON.stringify(data),hydrate:d=>{live=copy(d);},copiaGuardar(){},guardadoTienePendiente:()=>false,conTope:p=>p,
  mercadoPendiente:uid=>memory.has('gf-venta-pendiente-local-proof-'+uid),
  mercadoMarcarPendiente:(uid,p)=>memory.set('gf-venta-pendiente-local-proof-'+uid,JSON.stringify(p)),
  mercadoLimpiarPendiente:uid=>memory.delete('gf-venta-pendiente-local-proof-'+uid),mercadoBloquearPantalla:()=>()=>{},zonaGuardarPos(){},
  saveFarm:async()=>{ctx.SAVE_CONFIRMACIONES.set(UID,(ctx.SAVE_CONFIRMACIONES.get(UID)||0)+1);ctx.lastSavedKey=JSON.stringify(live);},
  sb:{functions:{invoke:async(_name,{body})=>{
   calls.push(copy(body));
   if(body.accion==='estado'){
    if(statusQueue.length){const next=statusQueue.shift();if(next instanceof Error)throw next;if(next?.promise)return await next.promise;return{data:next,error:null};}
    return{data:{ok:true,enabled:true,serverNow:NEXT,ownGraveId:null,markers:[]},error:null};
   }
   if(body.accion==='comprobar')return{data:{ok:true,data:copy(live),updated_at:BASE,cancelado:true,receipt:{op:OLD,action:'morir',graveId:null,cancelado:true}},error:null};
   assert.equal(body.accion,'morir');assert.equal(body.op,NEW);
   return{data:{ok:true,data:{...copy(live),hp:50,cont:null,zonaViaje:null,_graveProtocol:1},updated_at:NEXT,cancelado:false,
    receipt:{op:body.op,action:'morir',graveId:null,cancelado:false,actorBaseBefore:BASE,actorBaseAfter:NEXT}},error:null};
  }}}};
 ctx.window=ctx;Object.defineProperty(ctx,'G',{get:()=>live});ctx.lastSavedKey=JSON.stringify(live);
 if(journal){const p={cuenta:UID,op:OLD,base:BASE,beforeKey:JSON.stringify(live),calavera:{action:'morir'}};memory.set('gf-venta-pendiente-local-proof-'+UID,JSON.stringify(p));memory.set('gf-calavera-recibo-local-proof-'+UID+'-'+OLD,JSON.stringify(p));}
 vm.createContext(ctx);vm.runInContext(api,ctx);vm.runInContext(forest+'\nglobalThis.QaForest=ForestScene;',ctx);
 const scene=Object.create(ctx.QaForest.prototype);
 const shutdown=[],camera={};for(const name of ['setBounds','startFollow','setZoom','setBackgroundColor'])camera[name]=()=>camera;
 Object.assign(scene,{zonaKey:'pantano',hero:{x:100,y:100},leaving:false,sys:{isActive:()=>life==='active',isPaused:()=>life==='paused'},
  scene:{isPaused:()=>life==='paused',pause(){life='paused';},resume(){life='active';}},
  events:{once(name,callback){if(name==='shutdown')shutdown.push(callback);}},
  add:{image:sprite,sprite,text:sprite,graphics:sprite},textures:{exists:()=>false},
  input:{mouse:{disableContextMenu(){}},on(){},keyboard:{addKeys:()=>({act:{on(){}},act2:{on(){}}})}},cameras:{main:camera},
  refreshVisualTheme(){},clearVisualFloor(){},spawnMonster(){},updateAura(){}});
 const loading=scene.actualizarCalaverasCompartidas;scene.actualizarCalaverasCompartidas=function(){const p=loading.call(this);this.qaStatus=p;return p;};
 return{ctx,scene,calls,transitions,statusQueue,api:ctx.GoldenGraves,get live(){return live;},setLife:l=>{life=l;},getLife:()=>life,
  shutdown(){life='stopped';for(const callback of shutdown)callback();},
  click:async()=>{assert.ok(scene._graveRecovery);await scene._graveRecovery.children[2].onclick();},
  message:()=>scene._graveRecovery?.children[1]?.textContent};
}
const status=enabled=>({ok:true,enabled,serverNow:NEXT,ownGraveId:null,markers:[]});

test('late status is accepted during the real recovery pause; both real buttons finish once',async()=>{
 const f=fixture({journal:true}),d=deferred();f.statusQueue.push(d);
 const loading=f.api.load(f.scene);f.api.showRecovery(f.scene);assert.equal(f.getLife(),'paused');
 d.resolve({data:status(true),error:null});assert.equal(await loading,true);assert.equal(f.api.deathUsesServer(),true);
 await f.click();assert.equal(f.api.pending(UID),null);assert.match(f.scene._graveRecovery.children[2].textContent,/Confirmar/);
 await f.click();assert.equal(f.live.hp,50);assert.equal(f.live.cont,null);assert.deepEqual(f.transitions,['farm']);
 assert.deepEqual(f.calls.map(c=>c.accion),['estado','comprobar','morir']);
});
test('an active status remains accepted',async()=>{const f=fixture();assert.equal(await f.api.load(f.scene),true);assert.equal(f.api.deathUsesServer(),true);});
for(const life of ['stopped','sleeping'])test(life+' scene cannot install a delayed status',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);const loading=f.api.load(f.scene);f.setLife(life);d.resolve({data:status(true),error:null});
 assert.equal(await loading,false);assert.equal(f.api.deathUsesServer(),false);
});
test('shutdown/clear generation rejects the old status and cannot revive its removed button',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);const loading=f.api.load(f.scene);f.api.showRecovery(f.scene);
 const old=f.scene._graveRecovery.children[2];f.api.clear(f.scene);d.resolve({data:status(true),error:null});
 assert.equal(await loading,false);assert.equal(f.api.deathUsesServer(),false);await old.onclick();assert.equal(f.calls.length,1);assert.equal(f.scene._graveRecovery,null);
});
test('an account change rejects the status and cannot use an old recovery button',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);const loading=f.api.load(f.scene);f.api.showRecovery(f.scene);const old=f.scene._graveRecovery.children[2];
 f.ctx.UID=OTHER;f.api.reset();d.resolve({data:status(true),error:null});assert.equal(await loading,false);await old.onclick();assert.equal(f.calls.length,1);assert.equal(f.api.deathUsesServer(),false);
});
test('an older status cannot replace a newer verified response',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);const old=f.api.load(f.scene);assert.equal(await f.api.load(f.scene),true);
 d.resolve({data:status(false),error:null});assert.equal(await old,false);assert.equal(f.api.deathUsesServer(),true);
});
test('Confirmar retries failed initial status then uses one fresh death UUID',async()=>{
 const f=fixture();f.statusQueue.push(Error('synthetic initial connection failure'));await assert.rejects(f.api.load(f.scene),/connection failure/);
 f.api.showRecovery(f.scene);await f.click();assert.equal(f.live.hp,50);assert.deepEqual(f.transitions,['farm']);assert.deepEqual(f.calls.map(c=>c.accion),['estado','estado','morir']);
});
test('failed retry remains explicit and preserves progress without a mutation or journal',async()=>{
 const f=fixture();f.statusQueue.push(Error('synthetic retry connection failure'));f.api.showRecovery(f.scene);await f.click();
 assert.match(f.message(),/connection failure/);assert.equal(f.live.hp,0);assert.equal(f.live.cont.items.length,2);assert.equal(f.api.pending(UID),null);assert.deepEqual(f.calls.map(c=>c.accion),['estado']);
});
test('disabled status is explicit and never invokes private defeat or creates a death UUID',async()=>{
 const f=fixture();f.statusQueue.push(status(false));f.api.showRecovery(f.scene);await f.click();
 assert.match(f.message(),/No se pudo habilitar/);assert.equal(f.live.hp,0);assert.equal(f.api.pending(UID),null);assert.deepEqual(f.calls.map(c=>c.accion),['estado']);
});
test('a null return from iniciarMuerteCompartida is visible rather than a silent button',async()=>{
 const f=fixture();await f.api.load(f.scene);f.scene.iniciarMuerteCompartida=async()=>null;f.api.showRecovery(f.scene);await f.click();
 assert.match(f.message(),/El regreso no se confirmó/);assert.equal(f.live.hp,0);assert.equal(f.calls.filter(c=>c.accion==='morir').length,0);
});
test('a status error after shutdown does not recreate a recovery modal',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);f.api.showRecovery(f.scene);const clicking=f.click();f.api.clear(f.scene);f.setLife('stopped');d.reject(Error('late response'));
 await clicking;assert.equal(f.scene._graveRecovery,null);assert.equal(f.calls.filter(c=>c.accion==='morir').length,0);
});
test('real Forest.create quarantines hp0 without a journal before its delayed status arrives',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);f.scene.create();
 assert.equal(f.api.pending(UID),null);assert.equal(f.getLife(),'paused');assert.ok(f.scene._graveRecovery);assert.equal(f.live.hp,0);
 assert.deepEqual(f.calls.map(c=>c.accion),['estado']);assert.match(f.scene._graveRecovery.children[2].textContent,/Confirmar/);
 d.resolve({data:status(true),error:null});assert.equal(await f.scene.qaStatus,true);await f.click();
 assert.equal(f.live.hp,50);assert.deepEqual(f.transitions,['farm']);assert.equal(f.calls.filter(c=>c.accion==='morir').length,1);
});
test('real Forest.create hp0 without journal stays paused after status fails and retries with Confirmar',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);f.scene.create();d.reject(Error('initial forest status failed'));
 await assert.rejects(f.scene.qaStatus,/initial forest status failed/);assert.equal(f.getLife(),'paused');assert.ok(f.scene._graveRecovery);assert.equal(f.live.cont.items.length,2);
 await f.click();assert.equal(f.live.hp,50);assert.deepEqual(f.calls.map(c=>c.accion),['estado','estado','morir']);assert.deepEqual(f.transitions,['farm']);
});
test('real Forest shutdown rejects status and removes the hp0 no-journal recovery button',async()=>{
 const f=fixture(),d=deferred();f.statusQueue.push(d);f.scene.create();const old=f.scene._graveRecovery.children[2];f.shutdown();
 d.resolve({data:status(true),error:null});assert.equal(await f.scene.qaStatus,false);await old.onclick();
 assert.equal(f.scene._graveRecovery,null);assert.equal(f.api.deathUsesServer(),false);assert.equal(f.calls.filter(c=>c.accion==='morir').length,0);assert.equal(f.live.hp,0);
});
