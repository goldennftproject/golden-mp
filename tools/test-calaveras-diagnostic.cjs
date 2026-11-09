/* Diagnostic export from the actual recovery modal. Synthetic SDK, DOM and
   storage only: no network, database or player data is used by this suite. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict');
const REPO=process.env.GF_DIAGNOSTIC_REPO||path.resolve(__dirname,'..');
const SOURCE=fs.readFileSync(process.env.GF_GRAVES_DIAGNOSTIC_CANDIDATE||path.join(REPO,'public/game/graves-api.js'),'utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const OP='44444444-4444-4444-8444-444444444444',WRONG_OP='55555555-5555-4555-8555-555555555555';
const BASE='2026-11-08T23:19:40.984000+00:00',SAME='2026-11-08T23:19:40.984Z',LATER='2026-11-08T23:19:41.984000+00:00';
const clone=x=>JSON.parse(JSON.stringify(x));
const secrets=['snapshot-private-marker','inventory-private-marker','auth-private-marker','session-private-marker','query-private-marker'];
function fixture(){
 const store=new Map(),calls=[],downloads=[],blobs=new Map(),revoked=[],anchors=[];
 let live={hp:0,_graveProtocol:0,level:8,res:{madera:47},cont:{c:'backpack',items:[{kind:'res',k:secrets[1],n:19}]},privateTrace:secrets[0]},paused=false,responder;
 const stats={hydrates:0,copies:0,fetches:0};
 function element(tag='div'){
  return{tagName:String(tag).toUpperCase(),children:[],style:{},inert:false,disabled:false,
   appendChild(child){child.parent=this;child.parentNode=this;this.children.push(child);return child;},
   removeChild(child){this.children=this.children.filter(x=>x!==child);child.parent=null;child.parentNode=null;},
   remove(){if(this.parent)this.parent.removeChild(this);},setAttribute(k,v){this[k]=String(v);},focus(){},
   click(){if(this.tagName==='A'){anchors.push({download:this.download,href:this.href});const blob=blobs.get(this.href);assert.ok(blob);downloads.push({text:blob.parts.join(''),type:blob.type,filename:this.download});}else if(this.onclick)return this.onclick();}};
 }
 const body=element('body');body.appendChild(element('main'));
 const script={src:'https://goldenfarm.onrender.com/game/graves-api.js?b=known-build&r=1&access_token='+secrets[4]};
 class BlobMock{constructor(parts,options={}){this.parts=parts;this.type=options.type;}async text(){return this.parts.join('');}}
 class URLMock extends URL{static createObjectURL(blob){const key='blob:local-'+blobs.size;blobs.set(key,blob);return key;}static revokeObjectURL(key){revoked.push(key);}}
 const c={console,Date,JSON,Math,Object,Array,String,Number,Error,Promise,Map,Set,URL:URLMock,Blob:BlobMock,
  GF:{GRAVES_SHARED_ENABLED:true,forestCuerpos:[]},SB_REF:'qa',UID:A,NICK:'Known public nickname',CARGA_OK:true,SOLO_LOCAL:false,
  SAVE_BASES:new Map([[A,BASE]]),SAVE_CONFIRMACIONES:new Map([[A,0]]),SAVE_CONFLICTOS:new Set(),MERCADO_EN_CURSO:null,SAVE_EN_CURSO:null,SAVE_OTRA:true,lastSavedKey:'opaque-last-saved-key',
  SESION_ACTUAL:{access_token:secrets[2],refresh_token:secrets[3],user:{id:A}},crypto:{randomUUID:()=>WRONG_OP},
  document:{body,currentScript:script,scripts:[script],createElement:element,querySelectorAll:selector=>selector.includes('script')?[script]:[],querySelector:selector=>selector.includes('script')?script:null},
  location:{href:'https://goldenfarm.onrender.com/?access_token='+secrets[4],origin:'https://goldenfarm.onrender.com',pathname:'/'},
  setTimeout:fn=>{fn();return 1;},clearTimeout(){},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size;}},
  conTope:p=>p,snapshot:()=>clone(live),snapKey:(data=live)=>JSON.stringify(data),hydrate(data){stats.hydrates++;live=clone(data);},copiaGuardar(){stats.copies++;},guardadoTienePendiente:()=>false,
  async saveFarm(){c.SAVE_CONFIRMACIONES.set(c.UID,(c.SAVE_CONFIRMACIONES.get(c.UID)||0)+1);c.lastSavedKey=c.snapKey();},
  mercadoMarcarPendiente:(uid,p)=>store.set('gf-venta-pendiente-qa-'+uid,JSON.stringify(p)),mercadoLimpiarPendiente:uid=>store.delete('gf-venta-pendiente-qa-'+uid),
  mercadoPendiente:uid=>JSON.parse(store.get('gf-venta-pendiente-qa-'+uid)||'null'),mercadoBloquearPantalla:()=>()=>{},zonaGuardarPos(){},refreshHud(){},syncSlots(){},refreshMorral(){},toast(){},
  fetch(){stats.fetches++;throw Error('diagnostic must never fetch');},
  sb:{functions:{invoke:async(name,{body:request})=>{calls.push({name,body:clone(request)});assert.equal(typeof responder,'function');return responder(request);}},auth:{getSession(){throw Error('diagnostic must not inspect Auth');}}},
 };
 Object.defineProperty(c,'G',{get:()=>live,set:value=>{live=value;}});c.nowMs=()=>Date.now();c.window=c;
 vm.createContext(c);vm.runInContext(SOURCE,c);
 const scene={zonaKey:'pantano',hero:{x:100,y:100},scene:{isPaused:()=>paused,pause(){paused=true;},resume(){paused=false;}},sys:{isActive:()=>!paused,isPaused:()=>paused}};
 const p={cuenta:A,op:OP,createdAt:Date.now(),base:BASE,beforeKey:'opaque-before-key-'+secrets[0],beforeSnapshot:clone(live),calavera:{action:'morir'}};
 store.set('gf-calavera-recibo-qa-'+A+'-'+OP,JSON.stringify(p));c.mercadoMarcarPendiente(A,p);c.SAVE_CONFLICTOS.add(A);
 const ack=(overrides={})=>({ok:true,data:{...clone(live),privateTrace:'remote-'+secrets[0]},updated_at:SAME,cancelado:true,
  receipt:{op:OP,action:'morir',graveId:null,cancelado:true},...overrides});
 responder=()=>({data:ack(),error:null});
 return{c,api:c.GoldenGraves,scene,p,store,calls,stats,downloads,revoked,anchors,ack,live:()=>live,paused:()=>paused,respond(fn){responder=fn;}};
}
async function blocked(f,pattern=/partida cambió después/){await assert.rejects(()=>f.api.reconcile(f.scene),pattern);assert.ok(f.scene._graveRecovery);}
function allKeys(value,result=[]){if(value&&typeof value==='object')for(const [key,v]of Object.entries(value)){result.push(key);allKeys(v,result);}return result;}
function button(f){const el=f.scene._graveRecovery?.children[3];assert.ok(el,'the existing primary remains at index2 and diagnostic button is secondary');assert.equal(el.textContent,'Descargar informe para Suren');return el;}
function keys(value,allowed){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),allowed.slice().sort());}
const FLAG_KEYS=['keyEqualsBefore','keyEqualsLastSaved','ordinaryPending','conflict','sessionMatchesPending'];
function whitelist(report){
 keys(report,['format','version','diagnosticBuild','loadedBuild','script','publicNick','pending','liveBase','flags','lastACK','exportedAt']);
 assert.ok(Number.isFinite(Date.parse(report.exportedAt)));
 if(report.script!==null)keys(report.script,['origin','path','b']);
 if(report.pending!==null)keys(report.pending,['op','action','base']);
 if(report.flags!==null){keys(report.flags,FLAG_KEYS);for(const value of Object.values(report.flags))assert.ok(value===null||typeof value==='boolean');}
 if(report.lastACK!==null){
  keys(report.lastACK,['request','updated_at','cancelado','receipt','liveBase','flags','guard','capturedAt']);
  assert.ok(Number.isFinite(Date.parse(report.lastACK.capturedAt)));
  if(report.lastACK.request!==null)keys(report.lastACK.request,['op','action','base']);
  keys(report.lastACK.receipt,['action','op','actorBaseBefore','actorBaseAfter','cancelado']);
  if(report.lastACK.flags!==null){keys(report.lastACK.flags,FLAG_KEYS);for(const value of Object.values(report.lastACK.flags))assert.ok(value===null||typeof value==='boolean');}
 }
}

test('the real blocked modal exports local JSON with the secondary button and performs no network or game mutation',async()=>{
 const f=fixture();await blocked(f);const before=clone(f.live()),journal=[...f.store],count=f.calls.length;
 assert.match(f.scene._graveRecovery.children[2].textContent,/Comprobar regreso/);
 await button(f).onclick();
 assert.equal(f.downloads.length,1);assert.match(f.downloads[0].filename,/\.json$/i);assert.match(f.downloads[0].type,/application\/json/);
 assert.equal(f.calls.length,count);assert.equal(f.stats.fetches,0);assert.equal(f.stats.hydrates,0);assert.equal(f.stats.copies,0);
 assert.deepEqual(f.live(),before);assert.deepEqual([...f.store],journal);assert.equal(f.api.hasPending(A),true);assert.equal(f.paused(),true);
 assert.equal(f.revoked.length,1);
});

test('diagnostic metadata excludes raw account IDs, snapshots, inventory, key strings, Auth and URL query secrets',async()=>{
 const f=fixture();await blocked(f);await button(f).onclick();const text=f.downloads[0].text,report=JSON.parse(text),downloaded=text+'\n'+f.downloads[0].filename;
 for(const secret of [A,B,...secrets,'opaque-before-key-','opaque-last-saved-key'])assert.equal(downloaded.includes(secret),false,'must not export '+secret);
 for(const forbidden of ['data','beforeSnapshot','snapshot','inventory','cont','items','res','beforeKey','lastSavedKey','access_token','refresh_token','user_id','cuenta','uid','UID'])assert.equal(allKeys(report).includes(forbidden),false,'forbidden key '+forbidden);
 assert.ok(text.includes(BASE));assert.ok(text.includes(SAME));assert.ok(text.includes(OP));assert.ok(text.includes('morir'));
 assert.ok(text.includes('known-build'));assert.ok(text.includes('graves-api.js'));
 whitelist(report);
});

test('the strict whitelist includes exact bases, booleans and guard reason needed to diagnose the blocked branch',async()=>{
 const f=fixture();await blocked(f);const report=clone(f.api.diagnosticReport());whitelist(report);
 assert.equal(report.format,'goldenfarm-calaveras-diagnostico');assert.equal(report.version,1);
 assert.equal(report.pending.base,BASE);assert.equal(report.liveBase,BASE);assert.equal(report.lastACK.updated_at,SAME);
 assert.equal(report.lastACK.request.op,OP);assert.equal(report.lastACK.receipt.op,OP);assert.equal(report.lastACK.cancelado,true);
 assert.equal(report.lastACK.guard,'local_changed');assert.equal(report.flags.keyEqualsBefore,null);assert.equal(report.flags.keyEqualsLastSaved,null);
 assert.equal(report.lastACK.flags.keyEqualsBefore,false);assert.equal(report.lastACK.flags.keyEqualsLastSaved,false);
 assert.equal(report.flags.ordinaryPending,false);assert.equal(report.flags.conflict,true);assert.equal(report.flags.sessionMatchesPending,true);
 assert.deepEqual(report.script,{origin:'https://goldenfarm.onrender.com',path:'/game/graves-api.js',b:'known-build'});
});

test('reset clears account-bound observations and an old modal button cannot export the previous account report',async()=>{
 const f=fixture();await blocked(f);const old=button(f);f.api.reset();f.c.UID=B;f.c.NICK='Second public nickname';
 await old.onclick();assert.equal(f.downloads.length,0);assert.equal(f.scene._graveRecovery,null);
 const report=JSON.stringify(f.api.diagnosticReport());
 assert.equal(report.includes(OP),false);assert.equal(report.includes(BASE),false);assert.equal(report.includes(SAME),false);assert.equal(report.includes('Known public nickname'),false);
});

test('a real later base still blocks acknowledgement and retains the journal and local progress',async()=>{
 const f=fixture(),before=clone(f.live());f.respond(()=>({data:f.ack({updated_at:LATER}),error:null}));
 await blocked(f,/canceló.*otra operación/);assert.deepEqual(f.live(),before);assert.equal(f.api.pending(A).op,OP);assert.equal(f.stats.hydrates,0);
});

test('a wrong receipt UUID remains rejected; diagnostic presence grants no bypass',async()=>{
 const f=fixture(),before=clone(f.live());f.respond(()=>({data:f.ack({receipt:{op:WRONG_OP,action:'morir',graveId:null,cancelado:true}}),error:null}));
 await blocked(f,/no corresponde/);await button(f).onclick();
 assert.deepEqual(f.live(),before);assert.equal(f.api.pending(A).op,OP);assert.equal(f.stats.hydrates,0);
});

test('different PostgreSQL microsecond versions remain blocked instead of being conflated by the diagnostic',async()=>{
 const f=fixture(),before=clone(f.live());f.p.base='2026-11-08T23:19:40.984001Z';f.c.SAVE_BASES.set(A,f.p.base);
 f.store.set('gf-calavera-recibo-qa-'+A+'-'+OP,JSON.stringify(f.p));f.c.mercadoMarcarPendiente(A,f.p);
 f.respond(()=>({data:f.ack({updated_at:'2026-11-08T23:19:40.984002Z'}),error:null}));
 await blocked(f);await button(f).onclick();
 const text=f.downloads[0].text;assert.ok(text.includes('.984001Z'));assert.ok(text.includes('.984002Z'));
 assert.deepEqual(f.live(),before);assert.equal(f.api.pending(A).op,OP);assert.equal(f.stats.hydrates,0);
});

test('untrusted malformed timestamp and receipt fields are null metadata, never arbitrary private strings',async()=>{
 const f=fixture();f.p.base=secrets[0];f.c.SAVE_BASES.set(A,secrets[1]);
 f.store.set('gf-calavera-recibo-qa-'+A+'-'+OP,JSON.stringify(f.p));f.c.mercadoMarcarPendiente(A,f.p);
 f.respond(()=>({data:f.ack({updated_at:secrets[2],receipt:{op:secrets[3],action:secrets[4],actorBaseBefore:secrets[0],actorBaseAfter:secrets[1],cancelado:true}}),error:null}));
 await blocked(f,/guardado confirmado/);await button(f).onclick();const text=f.downloads[0].text,report=JSON.parse(text);whitelist(report);
 for(const secret of secrets)assert.equal(text.includes(secret),false);
 assert.equal(report.pending.base,null);assert.equal(report.liveBase,null);assert.equal(report.lastACK.updated_at,null);
 assert.deepEqual(report.lastACK.receipt,{action:null,op:null,actorBaseBefore:null,actorBaseAfter:null,cancelado:true});assert.equal(report.lastACK.guard,'invalid_response');
});

test('a failed local download offers retry and leaves the blocked request and game untouched',async()=>{
 const f=fixture();await blocked(f);const before=clone(f.live()),pending=clone(f.api.pending(A)),count=f.calls.length;
 f.c.URL.createObjectURL=()=>{throw Error('synthetic local download unavailable');};
 const secondary=button(f);await secondary.onclick();
 assert.equal(secondary.textContent,'Reintentar descarga del informe');assert.equal(f.downloads.length,0);assert.equal(f.calls.length,count);
 assert.deepEqual(f.live(),before);assert.deepEqual(clone(f.api.pending(A)),pending);assert.equal(f.stats.hydrates,0);assert.equal(f.paused(),true);
});

test('reporting and downloading do not call snapshot or snapKey, which can normalize a legacy game',async()=>{
 const f=fixture();await blocked(f);const before=clone(f.live());let keyCalls=0,snapshotCalls=0;
 f.c.snapKey=()=>{keyCalls++;f.live().privateTrace='unexpected-normalization';throw Error('diagnostic must not call snapKey');};
 f.c.snapshot=()=>{snapshotCalls++;f.live().privateTrace='unexpected-snapshot';throw Error('diagnostic must not call snapshot');};
 const report=clone(f.api.diagnosticReport());whitelist(report);await button(f).onclick();
 assert.equal(keyCalls,0);assert.equal(snapshotCalls,0);assert.deepEqual(f.live(),before);assert.equal(f.downloads.length,1);
 assert.equal(report.lastACK.flags.keyEqualsBefore,false);assert.equal(report.lastACK.flags.keyEqualsLastSaved,false);
});
