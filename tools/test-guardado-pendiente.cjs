'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const repo=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..');
const candidate=process.argv[2]||process.env.GF_SAVE_CANDIDATE||path.join(repo,'public/game/save.js');
const source=fs.readFileSync(candidate,'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
const report={testedAt:new Date().toISOString(),candidate,scope:'full runtime with synthetic single-client CAS backend; no network',checks:[]};
const flush=async()=>{for(let n=0;n<55;n++)await Promise.resolve();};
function differences(left,right,prefix=''){if(JSON.stringify(left)===JSON.stringify(right))return[];if(!left||!right||typeof left!=='object'||typeof right!=='object')return[{path:prefix,submitted:left,stored:right}];const keys=new Set([...Object.keys(left),...Object.keys(right)]);return[...keys].flatMap(key=>differences(left[key],right[key],prefix?prefix+'.'+key:key));}
const conflict=()=>({error:{context:{status:409,json:async()=>({conflicto:true})}}});
const offline=()=>({error:{message:'offline',context:{status:503}}});
function env(){
 const {ctx:c}=require(repo+'/tools/arrancar-el-juego.contexto').arrancar(repo,{'game/main.js':'','game/save.js':source.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
 const run=s=>vm.runInContext(s,c),timers=new Map(),memory=new Map(),events={},calls=[],economicCalls=[],reads=[];
 let now=Date.parse('2026-11-07T18:00:00.000Z'),next=0,serial=0,tick;
 c.Date=class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};c.nowMs=()=>now;
 c.setTimeout=(fn,ms)=>{timers.set(++next,{at:now+ms,fn});return next;};c.clearTimeout=id=>timers.delete(id);
 c.setInterval=(fn,ms)=>{assert.equal(ms,1000);tick=fn;return 1;};c.document.addEventListener=(event,fn)=>events[event]=fn;c.addEventListener=(event,fn)=>events[event]=fn;
 c.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
 for(const name of ['log','toast','showSaving','showSaved','showSaveError','refreshHud','refreshLogros','syncSlots','refreshInv','actividadGranjaRefrescar','sesionLog'])c[name]=()=>{};c.isOpen=()=>false;c.mercadoBloquearPantalla=()=>()=>{};
 let remote={version:'2026-11-07T18:00:00.000001+00:00',data:null,name:'Granjero'},onSave,onRead,transform;
 const ack=(repetido=false)=>({data:{ok:true,updated_at:remote.version,...(repetido?{repetido:true}:{})}});
 const write=body=>{if(remote.data?._saveOp===body.op)return ack(true);if(body.base!==remote.version)return conflict();const next=plain(body.data);if(transform)transform(remote.data,next,now,Date.parse(remote.version));remote={version:'2026-11-07T18:00:00.'+String(++serial+1).padStart(6,'0')+'+00:00',data:{...next,_saveOp:body.op},name:body.name};return ack();};
 c.qaSb={functions:{invoke:async(name,request)=>{const body=plain(request.body);if(body.jornada){calls.push(body);return onSave?onSave(body,calls.length):write(body);}economicCalls.push({name,body,preGuardadoConfirmado:run('lastSavedKey')===c.snapKey()});return{data:{ok:true,data:plain(remote.data),updated_at:remote.version}};}},
 from:table=>({select:selection=>({eq:(column,uid)=>({maybeSingle:async()=>{reads.push({table,selection,column,uid});return onRead?onRead(uid):{data:{data:plain(remote.data),updated_at:remote.version,name:remote.name}};}})})}),auth:{getUser:async()=>({data:{user:{id:run('UID')}}})}};
 run("estadoDeCero();UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_OTRA=false;SAVE_CONFLICTOS.clear();SAVE_BASES.set('qa','2026-11-07T18:00:00.000001+00:00');lastSavedKey=null;saveTimer=null;sb=qaSb;");
 remote.data=plain(c.snapshot());
 const e={c,run,memory,events,calls,economicCalls,reads,write,ack,setSave:fn=>{onSave=fn;},setRead:fn=>{onRead=fn;},setTransform:fn=>{transform=fn;},get remote(){return remote;},set remote(value){remote={...value,name:value.name??remote.name};},base:()=>run("SAVE_BASES.get('qa')"),key:()=>run('lastSavedKey'),conflicted:()=>run("SAVE_CONFLICTOS.has('qa')"),copy:()=>JSON.parse(memory.get(run('GF_COPIA_KEY'))||'null'),
 async advance(ms){const end=now+ms;await flush();for(let i=0;i<2000;i++){const item=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;timers.delete(item[0]);now=item[1].at;item[1].fn();await flush();}now=end;await flush();},startAutosave(){c.startAutosave();},tick:()=>tick(),at:()=>now};return e;
}
async function check(name,test){const e=env();try{await test(e);report.checks.push({name,passed:true});}catch(error){report.checks.push({name,passed:false,error:error.stack});}}
async function loseTwo(e,{commit=true,later=9}={}){
 e.setSave((body,index)=>{if(index<=2){if(commit)e.write(body);return new Promise(()=>{});}return e.write(body);});
 e.c.G.res.madera=5;const first=e.c.saveFarm();await flush();e.c.G.res.madera=later;await e.advance(33000);await first;
 assert.equal(e.calls.length,2);assert.equal(e.calls[0].op,e.calls[1].op);assert.notEqual(e.key(),e.c.snapKey());return first;
}
(async()=>{
 await check('Snapshot ordinario con protegerEconomia y actividadActualizar reales se reconcilia tras ACK perdidos',async e=>{
  e.c.energiaGranjaTick();e.remote={...e.remote,data:plain(e.c.snapshot())};
  const backend=fs.readFileSync(repo+'/supabase/functions/guardar/index.ts','utf8'),rules=backend.slice(backend.indexOf('const VERSION ='),backend.indexOf('/* === FIN REGLAS === */'));
  const server=vm.createContext({Math,Number,Array,Object,Set,Date,isFinite});vm.runInContext(rules,server);let transforms=0;
  e.setTransform((prev,next,now,since)=>{const errors=server.protegerEconomia(prev,next,now,since);assert.deepEqual(Array.from(errors),[],'snapshot de partida ordinaria válido');server.actividadActualizar(prev,next,now,{},true,since);transforms++;});
  e.setSave((body,index)=>{if(index<=2){e.write(body);return new Promise(()=>{});}return e.write(body);});
  const first=e.c.saveFarm();await e.advance(33000);await first;assert.equal(transforms,1);assert(e.remote.data._economiaControl,'protección real normalizó control económico');assert(e.remote.data.actividadGranja,'actividad real generó su libro');report.realNormalizationDelta=differences(e.calls[0].data,e.remote.data);if(e.c.guardadoHuellaPeticion)report.realCanonicalDelta=differences(plain(e.c.guardadoHuellaPeticion(e.calls[0].data)),plain(e.c.guardadoHuellaPeticion(e.remote.data)));await e.c.saveFarm();assert.equal(e.conflicted(),false,'enriquecimiento ordinario del servidor no debe parecer economía ajena');assert.equal(e.key(),e.c.snapKey());
 });
 for(const clamp of [0,1])await check('Handler HTTP real con snapshot completo y clamp de energía '+clamp+'ms recupera dos ACK perdidos',async e=>{
  e.c.energiaGranjaTick();const initial=plain(e.c.snapshot());
  const dirname=repo+'/tools',required=createRequire(dirname+'/test-guardado-atomico.js');
  const prefix=fs.readFileSync(dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0];
  const factory=new Function('require','__dirname','Date',prefix+';return servidor;')(required,dirname,e.c.Date);
  const server=factory({user_id:'qa',name:'Granjero',updated_at:e.base(),data:initial},{postgresTime:true}),statuses=[];
  if(clamp)e.c.G.energiaGranja.at--;
  e.setRead(()=>({data:plain(server.row())}));
  e.setSave(async(body,index)=>{const response=await server.call(body),json=await response.json();statuses.push(response.status);if(index<=2)return new Promise(()=>{});return response.ok?{data:json}:{error:{context:{status:response.status,json:async()=>json}}};});
  const first=e.c.saveFarm();await e.advance(33000);await first;assert.deepEqual(statuses,[200,200]);assert.equal(server.writes(),1);await e.c.saveFarm();assert.equal(e.conflicted(),false,'normalización legítima del handler real no debe crear conflicto permanente');assert.equal(e.key(),e.c.snapKey());assert.equal(server.row().data.plata,initial.plata);assert.deepEqual(server.row().data.res,initial.res);
 });
 for(const scenario of [
  {name:'parcial pasada 1ms',oldActual:40,actual:39,offset:-1},
  {name:'parcial futura 49ms',oldActual:40,actual:39,offset:50,commitOffset:1},
  {name:'transición VIP un ms a cada tasa',oldActual:40,actual:39,offset:-2,vipOffset:-1},
  {name:'VIP vencido recorta saldo de75 a50',oldActual:75,actual:75,offset:-2,oldOffset:-2,vipOffset:-1},
  {name:'futuro cruza finVIP',oldActual:40,actual:39,offset:50,commitOffset:1,vipOffset:25},
  {name:'energía ajena suma0.1 tras commit',oldActual:40,actual:39,offset:-1,tamperEnergy:0.1,blocked:true},
  {name:'vigenciaVIP ajena cambia tras commit',oldActual:40,actual:39,offset:-1,tamperVip:true,blocked:true},
 ])await check('Handler HTTP real transporte exacto: '+scenario.name,async e=>{
  const T=e.at();e.c.energiaGranjaTick();e.c.G.energiaGranja={v:1,actual:scenario.oldActual,at:T+(scenario.oldOffset||0)};if(scenario.vipOffset!==undefined)e.c.G.produccion.vipHasta=T+scenario.vipOffset;
  const initial=plain(e.c.snapshot()),dirname=repo+'/tools',required=createRequire(dirname+'/test-guardado-atomico.js');
  const prefix=fs.readFileSync(dirname+'/test-guardado-atomico.js','utf8').split('(async()=>{')[0],factory=new Function('require','__dirname','Date',prefix+';return servidor;')(required,dirname,e.c.Date);
  const server=factory({user_id:'qa',name:'Granjero',updated_at:e.base(),data:initial},{postgresTime:true}),statuses=[];
  e.c.G.energiaGranja={v:1,actual:scenario.actual,at:T+scenario.offset};if(scenario.commitOffset)await e.advance(scenario.commitOffset);
  e.setRead(()=>({data:plain(server.row())}));e.setSave(async(body,index)=>{const response=await server.call(body),json=await response.json();statuses.push(response.status);if(index<=2)return new Promise(()=>{});return response.ok?{data:json}:{error:{context:{status:response.status,json:async()=>json}}};});
  const first=e.c.saveFarm();await e.advance(33000);await first;assert.deepEqual(statuses,[200,200]);assert.equal(server.writes(),1);const ownOp=e.calls[0].op,before=e.c.snapKey(),stored=plain(server.row().data.energiaGranja);
  if(scenario.tamperEnergy)server.row().data.energiaGranja.actual+=scenario.tamperEnergy;if(scenario.tamperVip)server.row().data.produccion.vipHasta=T+10000;
  if(scenario.blocked)server.row().updated_at=new e.c.Date(e.at()).toISOString().replace(/Z$/,'+00:00');
  await e.c.saveFarm();assert.equal(e.conflicted(),!!scenario.blocked,'sólo equivalencia matemática exacta de la petición propia permite reconciliar');assert.equal(e.calls[2].op,ownOp);assert.equal(server.row().data.plata,initial.plata);assert.deepEqual(server.row().data.res,initial.res);
  if(scenario.blocked){assert.equal(e.c.snapKey(),before);assert.notEqual(e.key(),e.c.snapKey());assert.equal(server.writes(),1);}else assert.equal(e.key(),e.c.snapKey());
  if(!report.exactEnergyTransports)report.exactEnergyTransports=[];report.exactEnergyTransports.push({name:scenario.name,submitted:e.calls[0].data.energiaGranja,accepted:stored,blocked:!!scenario.blocked});
 });
 await check('Dos ACK perdidos tras commit: reutiliza body/op/base y luego guarda acciones posteriores',async e=>{
  await loseTwo(e);const first=plain(e.calls[0]);await e.c.saveFarm();assert(e.calls.length>=4);assert.deepEqual(e.calls[2],first,'la operación incierta debe repetirse exacta');assert.notEqual(e.calls[3].op,first.op);assert.equal(e.calls[3].data.res.madera,9);assert.equal(e.remote.data.res.madera,9);assert.equal(e.c.G.res.madera,9);assert.equal(e.key(),e.c.snapKey());assert.equal(e.conflicted(),false);assert.equal(e.copy().confirmada,true);
 });
 await check('Dos timeouts sin commit: reutiliza operación y luego guarda el avance nuevo',async e=>{
  await loseTwo(e,{commit:false});assert.equal(e.remote.data.res.madera,0);const first=plain(e.calls[0]);await e.c.saveFarm();assert.deepEqual(e.calls[2],first);assert.equal(e.remote.data.res.madera,9);assert.equal(e.c.G.res.madera,9);assert.equal(e.key(),e.c.snapKey());assert.equal(e.conflicted(),false);
 });
 await check('CAS409 propio mismo op: lectura verifica recibo y conserva acciones en vuelo',async e=>{
  let first=true;e.setSave(body=>{const result=e.write(body);if(first){first=false;return conflict();}return result;});
  e.setRead(()=>{e.c.G.res.madera=9;return{data:{data:plain(e.remote.data),updated_at:e.remote.version,name:e.remote.name}};});e.c.G.res.madera=5;await e.c.saveFarm();assert(e.reads.length>=1);assert.equal(e.conflicted(),false);assert.equal(e.c.G.res.madera,9);if(e.remote.data.res.madera!==9)await e.c.saveFarm();assert.equal(e.remote.data.res.madera,9);assert.equal(e.key(),e.c.snapKey());
 });
 await check('Versión realmente ajena no se acepta ni se sobrescribe',async e=>{
  e.setSave(body=>{e.remote={version:'2026-11-07T18:00:10.000123+00:00',data:{...plain(body.data),_saveOp:'another-writer',plata:777}};return conflict();});e.c.G.res.madera=9;const before=e.c.snapKey();await e.c.saveFarm();assert.equal(e.conflicted(),true);assert.equal(e.c.snapKey(),before);assert.equal(e.remote.data.plata,777);assert.equal(e.calls.length,1);assert.equal(e.base(),'2026-11-07T18:00:00.000001+00:00');
 });
 await check('ACK repetido tras economía que conserva _saveOp pero cambia saldo/versión no autoriza rebase',async e=>{
  await loseTwo(e);const before=e.c.snapKey(),oldBase=e.base();e.remote={version:'2026-11-07T18:00:10.000123+00:00',data:{...plain(e.remote.data),plata:777}};await e.c.saveFarm();assert.equal(e.conflicted(),true);assert.equal(e.c.snapKey(),before);assert.equal(e.remote.data.plata,777);assert.equal(e.calls.length,3,'no subir snapshot actual sobre la operación económica');assert.equal(e.base(),oldBase);assert.notEqual(e.key(),e.c.snapKey());assert.notEqual(e.copy()?.confirmada,true);
 });
 await check('409 propio con estado económico posterior conservando op también bloquea',async e=>{
  e.setSave(body=>{e.write(body);e.remote={version:'2026-11-07T18:00:10.000123+00:00',data:{...plain(e.remote.data),golden:44}};return conflict();});e.c.G.res.madera=9;const before=e.c.snapKey();await e.c.saveFarm();assert.equal(e.conflicted(),true);assert.equal(e.c.snapKey(),before);assert.equal(e.remote.data.golden,44);assert.equal(e.calls.length,1);assert.notEqual(e.copy()?.confirmada,true);
 });
 await check('ACK de snapshot viejo no confirma estado actual si catchup falla',async e=>{
  await loseTwo(e);e.setSave((body,index)=>index===3?e.write(body):offline());const p=e.c.saveFarm();await e.advance(2000);await p;assert.equal(e.remote.data.res.madera,5);assert.equal(e.c.G.res.madera,9);assert.notEqual(e.key(),e.c.snapKey());assert.notEqual(e.copy()?.confirmada,true);assert.equal(e.conflicted(),false);
 });
 await check('Economía no opera si sólo confirma snapshot viejo y falla catchup actual',async e=>{
  await loseTwo(e);e.setSave((body,index)=>index===3?e.write(body):offline());const p=e.c.economiaSolicitar({diario:{accion:'reclamar'}});await e.advance(2000);await p;assert.equal(e.economicCalls.length,0);assert.equal(e.c.G.res.madera,9);assert.notEqual(e.key(),e.c.snapKey());
 });
 await check('Autosave real sale de dos ACK perdidos y vuelve a confirmar nuevos ciclos',async e=>{
  e.startAutosave();e.events.pointerdown();e.c.G.res.madera=5;await e.advance(5000);e.setSave((body,index)=>{if(index<=2){e.write(body);return new Promise(()=>{});}return e.write(body);});const first=e.tick();await flush();e.events.pointerdown();e.c.G.res.madera=9;await e.advance(33000);await first;await e.advance(5000);await e.tick();assert.equal(e.remote.data.res.madera,9);assert.equal(e.conflicted(),false);e.events.pointerdown();e.c.G.res.madera=12;await e.advance(5000);await e.tick();assert.equal(e.remote.data.res.madera,12);assert.equal(e.key(),e.c.snapKey());
 });
 await check('Cambiar de cuenta no reutiliza op ni snapshot pendiente ajeno',async e=>{
  await loseTwo(e);const originalOp=e.calls[0].op;e.run("UID='other';estadoDeCero();G.res.madera=77;SAVE_BASES.set('other','2026-11-07T18:00:20.000001+00:00');lastSavedKey=null");e.setSave(body=>({data:{ok:true,updated_at:'2026-11-07T18:00:20.000002+00:00'}}));await e.c.saveFarm();assert.equal(e.calls[2].data.res.madera,77);assert.notEqual(e.calls[2].op,originalOp);assert.equal(e.calls[2].base,'2026-11-07T18:00:20.000001+00:00');assert.equal(e.c.G.res.madera,77);assert.equal(e.run("SAVE_CONFLICTOS.has('other')"),false);
 });
 await check('Servidor reiniciado nunca se rebasa por reconocer un op antiguo',async e=>{
  await loseTwo(e);const before=e.c.snapKey();e.remote={version:'2026-11-07T18:00:30.000001+00:00',data:{...plain(e.remote.data),reinicio:99,plata:3}};await e.c.saveFarm();assert.equal(e.conflicted(),true);assert.equal(e.c.snapKey(),before);assert.equal(e.remote.data.reinicio,99);assert.equal(e.calls.length,3);
 });
 await check('Recuperación explícita hidrata servidor y no reproduce después el pendiente antiguo',async e=>{
  await loseTwo(e);e.run("SAVE_CONFLICTOS.add('qa')");const oldOp=e.calls[0].op;e.remote={version:'2026-11-07T18:00:40.000001+00:00',data:{...plain(e.remote.data),_saveOp:'other-safe',res:{...plain(e.remote.data.res),madera:6}}};assert.equal(await e.c.recuperarGuardadoServidor(),true);assert.equal(e.c.G.res.madera,6);e.c.G.res.madera=7;await e.c.saveFarm();assert.notEqual(e.calls[2].op,oldOp);assert.equal(e.calls[2].data.res.madera,7);assert.equal(e.remote.data.res.madera,7);
 });
 await check('Mismo op con otro nombre no prueba que sea la misma partida',async e=>{
  await loseTwo(e);const before=e.c.snapKey();e.remote={...e.remote,name:'Nombre cambiado'};await e.c.saveFarm();assert.equal(e.conflicted(),true);assert.equal(e.c.snapKey(),before);assert.equal(e.calls.length,3);assert.notEqual(e.copy()?.confirmada,true);
 });
 await check('Mismo op con saldo de energía distinto se rechaza aunque el reloj se normalice',async e=>{
  await loseTwo(e);const before=e.c.snapKey();e.remote={...e.remote,data:{...plain(e.remote.data),energiaGranja:{...plain(e.remote.data.energiaGranja),actual:17,at:e.at()}}};await e.c.saveFarm();assert.equal(e.conflicted(),true);assert.equal(e.c.snapKey(),before);assert.equal(e.calls.length,3);assert.equal(e.remote.data.energiaGranja.actual,17);
 });
 await check('Cambio de cuenta antes de microtarea no envía petición de la nueva cuenta por cola vieja',async e=>{
  const p=e.c.saveFarm();e.run("UID='other';G.res.madera=77");await p;assert.equal(e.calls.length,0);assert.equal(e.c.G.res.madera,77);assert.equal(e.run("SAVE_CONFIRMACIONES.get('other')||0"),0);
 });
 await check('Carga intencional misma cuenta invalida ACK antiguo aunque el UID vuelva a coincidir',async e=>{
  let release;e.setSave(()=>new Promise(resolve=>release=resolve));e.c.G.res.madera=5;const pending=e.c.saveFarm();await flush();const oldOp=e.calls[0].op;
  e.remote={version:'2026-11-07T18:00:40.000001+00:00',data:{...plain(e.remote.data),_saveOp:'new-session',res:{...plain(e.remote.data.res),madera:77}}};
  assert.equal(await e.c.loadFarm(),true);assert.equal(e.c.G.res.madera,77);const freshBase=e.base();release({data:{ok:true,updated_at:'obsolete-version'}});await pending;assert.equal(e.base(),freshBase);assert.equal(e.c.G.res.madera,77);assert.equal(e.run("SAVE_CONFIRMACIONES.get('qa')||0"),0);
  e.setSave(body=>e.write(body));e.c.G.res.madera=78;await e.c.saveFarm();assert.notEqual(e.calls[1].op,oldOp);assert.equal(e.calls[1].data.res.madera,78);assert.equal(e.remote.data.res.madera,78);
 });
 await check('Carga sin fila remota descarta operación incierta de la granja anterior',async e=>{
  await loseTwo(e);const oldOp=e.calls[0].op;e.setRead(()=>({data:null}));e.setSave(()=>({data:{ok:true,updated_at:'2026-11-07T18:01:00.000001+00:00'}}));await e.c.loadFarm();assert.equal(e.c.G.res.madera,0);assert.equal(e.calls.length,3);assert.notEqual(e.calls[2].op,oldOp);assert.equal(e.calls[2].base,null);assert.equal(e.calls[2].data.res.madera,0);assert.equal(e.key(),e.c.snapKey());assert.equal(e.conflicted(),false);
 });
 await check('Cola ocupada de otra cuenta espera y atiende solicitud explícita de la cuenta nueva',async e=>{
  let release;e.setSave((body,index)=>index===1?new Promise(resolve=>release=resolve):{data:{ok:true,updated_at:'2026-11-07T18:02:00.000002+00:00'}});e.c.G.res.madera=5;const old=e.c.saveFarm(true);await flush();assert.equal(e.calls.length,1);
  e.run("UID='other';estadoDeCero();G.res.madera=77;SAVE_BASES.set('other','2026-11-07T18:02:00.000001+00:00');lastSavedKey=null");const fresh=e.c.saveFarm(true);await flush();assert.equal(e.calls.length,1,'una sola operación de transporte activa');
  release({data:{ok:true,updated_at:'obsolete-old-account'}});await Promise.all([old,fresh]);assert.equal(e.calls.length,2,'la solicitud explícita nueva no puede desaparecer en la cola anterior');assert.equal(e.calls[1].data.res.madera,77);assert.equal(e.calls[1].base,'2026-11-07T18:02:00.000001+00:00');assert.notEqual(e.calls[1].op,e.calls[0].op);assert.equal(e.run("SAVE_CONFIRMACIONES.get('qa')||0"),0);assert.equal(e.run("SAVE_CONFIRMACIONES.get('other')||0"),1);assert.equal(e.run("SAVE_BASES.get('other')"),'2026-11-07T18:02:00.000002+00:00');assert.equal(e.c.G.res.madera,77);assert.equal(e.key(),e.c.snapKey());assert.equal(e.copy().uid,'other');
 });
 await check('Cancelar respuesta de cuenta vieja no inventa guardado nuevo sin solicitud',async e=>{
  let release;e.setSave(()=>new Promise(resolve=>release=resolve));e.c.G.res.madera=5;const old=e.c.saveFarm(true);await flush();e.run("UID='other';estadoDeCero();G.res.madera=77;lastSavedKey=null");release({data:{ok:true,updated_at:'obsolete-old-account'}});await old;assert.equal(e.calls.length,1);assert.equal(e.run("SAVE_CONFIRMACIONES.get('other')||0"),0);assert.equal(e.c.G.res.madera,77);assert.equal(e.key(),null);
 });
 for(const scenario of [{mode:'economía',confirms:true},{mode:'economía',confirms:false},{mode:'ruleta',confirms:true}])await check('Preguardado '+scenario.mode+' de cuenta nueva con cola ajena ocupada y ACK '+scenario.confirms,async e=>{
  let uuid=0,release;e.c.window.crypto={randomUUID:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`};e.c.refrescarRuletas=()=>{};
  if(typeof e.c.ruletasGirar!=='function')vm.runInContext(fs.readFileSync(path.join(repo,'public/game/ruletas-api.js'),'utf8'),e.c);
  e.setSave((body,index)=>{if(index===1)return new Promise(resolve=>release=resolve);if(!scenario.confirms)return{data:{ok:true}};e.remote={version:'2026-11-07T18:02:00.000002+00:00',data:{...plain(body.data),_saveOp:body.op},name:body.name};return e.ack();});e.c.G.res.madera=5;const old=e.c.saveFarm(true);await flush();
  e.run("UID='other';estadoDeCero();G.res.madera=77;SAVE_BASES.set('other','2026-11-07T18:02:00.000001+00:00');lastSavedKey=null");let done=false,failure;
  const operation=(scenario.mode==='economía'?e.c.economiaSolicitar({diario:{accion:'reclamar'}}):e.c.ruletasGirar('objetos',0)).then(()=>{done=true;},error=>{done=true;failure=error;});await flush();assert.equal(e.calls.length,1);assert.equal(e.economicCalls.length,0);
  release({data:{ok:true,updated_at:'obsolete-old-account'}});await e.advance(scenario.confirms?100:2000);assert.equal(done,true,'la cola propia no puede esperar circularmente su propia operación económica');await Promise.all([old,operation]);
  assert.equal(e.calls[1].data.res.madera,77);assert.equal(e.calls[1].base,'2026-11-07T18:02:00.000001+00:00');assert.notEqual(e.calls[1].op,e.calls[0].op);assert.equal(e.run("SAVE_CONFIRMACIONES.get('qa')||0"),0);assert.equal(e.c.G.res.madera,77);
  assert.equal(e.economicCalls.length,scenario.confirms?1:0,'ninguna operación usa el ACK viejo ni un preguardado incompleto');
  if(scenario.confirms){assert.equal(failure,undefined);assert.equal(e.run("SAVE_CONFIRMACIONES.get('other')||0"),1);assert.equal(e.economicCalls[0].body.cuenta,'other');assert.equal(e.economicCalls[0].body.base,'2026-11-07T18:02:00.000002+00:00');assert.notEqual(e.economicCalls[0].body.op,e.calls[0].op);assert.notEqual(e.economicCalls[0].body.op,e.calls[1].op);assert.equal(e.economicCalls[0].preGuardadoConfirmado,true,'el estado actual de B estaba confirmado justo antes de operar');}else{assert.equal(e.run("SAVE_CONFIRMACIONES.get('other')||0"),0);assert.notEqual(e.key(),e.c.snapKey());}
 });
 report.passed=report.checks.every(check=>check.passed);if(!report.passed)process.exitCode=1;
})().catch(error=>{report.error=error.stack;process.exitCode=1;}).finally(()=>{if(process.env.GF_TEST_REPORT)fs.writeFileSync(process.env.GF_TEST_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));});
