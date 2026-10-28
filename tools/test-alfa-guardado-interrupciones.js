'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(root+'/public/game/save.js','utf8');
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function entorno(){
 const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':source.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
 const run=s=>vm.runInContext(s,c),timers=new Map(),signals=[];let now=1800000000000,id=0;
 c.Date=class extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}};c.nowMs=()=>now;
 c.setTimeout=(f,ms)=>{timers.set(++id,{at:now+ms,f});return id;};c.clearTimeout=id=>timers.delete(id);
 for(const k of ['refreshHud','syncSlots','refreshInv','actividadGranjaRefrescar','log','toast'])c[k]=()=>{};
 c.isOpen=()=>false;c.showSaving=()=>signals.push('saving');c.showSaved=()=>signals.push('ok');c.showSaveError=message=>signals.push(message||'error');
 run("estadoDeCero();UID='qa';CARGA_OK=true;SOLO_LOCAL=false;lastSavedKey=null;SAVE_BASES.set('qa','v1');SAVE_CONFLICTOS.clear();");
 return{c,run,timers,signals,async advance(ms){const end=now+ms;await flush();for(let n=0;n<1000;n++){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].f();await flush();}now=end;await flush();}};
}
(async()=>{
 // Una petición que nunca resuelve no puede secuestrar la cola y el botón para siempre.
 let e=entorno(),requests=[];e.c.qaSb={functions:{invoke:async(_,p)=>{requests.push(p.body);return new Promise(()=>{});}},from:()=>{throw Error('Escritura directa prohibida');}};e.run('sb=qaSb');
 let done=false;const blocked=e.c.saveFarm(true).then(()=>done=true);await e.advance(33000);
 assert.equal(done,true,'la cola debe liberarse aunque la red no responda');await blocked;
 assert.equal(requests.length,2);assert.equal(requests[0].op,requests[1].op,'reintentar usa el mismo recibo');assert.equal(e.run('lastSavedKey'),null);assert.ok(!e.signals.includes('ok'));assert.ok(e.signals.some(s=>/confirm|conexión/i.test(s)));assert.equal(e.run('SAVE_EN_CURSO'),null);
 // La red vuelve: se guarda lo pendiente sin perder recursos ni relojes.
 e.c.qaSb.functions.invoke=async(_,p)=>({data:{ok:true,updated_at:'v2'}});e.c.G.res.madera=7;await e.c.saveFarm();assert.equal(e.run("SAVE_CONFIRMACIONES.get('qa')"),1);assert.equal(e.c.G.res.madera,7);assert.equal(e.run('lastSavedKey'),e.c.snapKey());
 // La respuesta se pierde después del commit: se repite la misma operación, no se duplica.
 e=entorno();let first,commits=0,ops=new Set();requests=[];
 e.c.qaSb={functions:{invoke:async(_,p)=>{requests.push(p.body);if(!ops.has(p.body.op)){ops.add(p.body.op);commits++;return new Promise(r=>first=r);}return{data:{ok:true,updated_at:'v2',repetido:true}};}}};e.run('sb=qaSb');
 const lost=e.c.saveFarm(true);await e.advance(17000);await lost;assert.equal(commits,1);assert.equal(requests.length,2);assert.equal(e.run("SAVE_CONFIRMACIONES.get('qa')"),1);first({data:{ok:true,updated_at:'vieja'}});await flush();assert.equal(e.run("SAVE_BASES.get('qa')"),'v2','una respuesta tardía no retrocede la versión');
 // Ningún OK incompleto ni puerta histórica puede producir una confirmación falsa.
 for(const result of [{data:{ok:true}},{data:null,error:{context:{status:503}}}]){
  e=entorno();let direct=0;e.c.qaSb={functions:{invoke:async()=>result},from:()=>{direct++;return{upsert:async()=>({error:null})};}};e.run('sb=qaSb');const p=e.c.saveFarm(true);await e.advance(2000);await p;
  assert.equal(direct,0);assert.ok(!e.signals.includes('ok'));assert.equal(e.run('lastSavedKey'),null);
 }
 // Respuestas de una cuenta anterior jamás hidratan ni reintentan con otra sesión.
 for(const status of [422,409,503]){
  e=entorno();let release,reads=0,invokes=0;e.c.qaSb={functions:{invoke:async()=>{invokes++;return new Promise(r=>release=r);}},from:()=>{reads++;throw Error('No leer otra cuenta');}};e.run('sb=qaSb');const p=e.c.saveFarm(true);await flush();e.run("UID='otra';G.plata=77");release({error:{context:{status,json:async()=>({})}}});await e.advance(2000);await p;
  assert.equal(e.c.G.plata,77);assert.equal(reads,0);assert.equal(invokes,1);assert.ok(!e.signals.includes('ok'));assert.equal(e.run("SAVE_CONFLICTOS.has('otra')"),false);
 }
 // Cambiar de cuenta DURANTE la lectura de recuperación también conserva la nueva granja.
 e=entorno();let release;e.c.qaSb={from:()=>({select:()=>({eq:()=>({maybeSingle:()=>new Promise(r=>release=r)})})})};e.run('sb=qaSb');const recovery=e.c.porteroRechazo({});await flush();e.run("UID='otra';G.plata=88");release({data:{data:{plata:1},updated_at:'old'}});await recovery;assert.equal(e.c.G.plata,88);assert.ok(!e.signals.includes('error'));
 // Si no se puede leer o preservar el respaldo, no se anuncia una recuperación ficticia.
 for(const quota of [false,true]){
  e=entorno();e.c.G.plata=19;e.c.qaSb={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>quota?{data:{data:{plata:1},updated_at:'v2'}}:{error:{message:'offline'}}})})})};e.run('sb=qaSb');if(quota)e.c.localStorage.setItem=()=>{throw Error('quota');};await e.c.porteroRechazo({});assert.equal(e.c.G.plata,19);assert.equal(e.run("SAVE_CONFLICTOS.has('qa')"),true);
 }
 // La lectura de una granja tampoco queda colgada, y nunca restaura una copia local encima.
 e=entorno();let reads=0;e.c.qaSb={auth:{getUser:async()=>({data:{user:{id:'qa'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:()=>{reads++;return new Promise(()=>{});}})})})};e.run('sb=qaSb');done=false;const load=e.c.loadFarm().then(()=>done=true);await e.advance(55000);assert.equal(done,true);await load;assert.equal(reads,3);assert.equal(e.run('CARGA_OK'),false);assert.equal(e.run('CARGA_FALLO'),true);
 // Una petición ya terminada elimina su temporizador de tope (sesiones largas).
 e=entorno();await e.run("conTope(Promise.resolve('ok'),15000,'qa')");assert.equal(e.timers.size,0);
 // Salir requiere un ACK nuevo y no borra las llaves si falla el guardado.
 for(const confirma of [false,true]){
  e=entorno();let salidas=0;
  e.c.qaSb={auth:{signOut:async()=>{salidas++;return{error:null};}},functions:{invoke:async()=>({data:confirma?{ok:true,updated_at:'v2'}:{ok:true}})}};
  e.run("sb=qaSb;cuentaEstado=async()=>({modo:'email'});localStorage.setItem(GF_CUENTA_KEY,JSON.stringify({uid:'qa'}));");
  const salida=e.c.cerrarSesion();await e.advance(2000);const r=await salida;assert.equal(salidas,confirma?1:0);
  assert.equal(!!r.ok,confirma);assert.equal(e.run('UID'),confirma?null:'qa');
  assert.equal(!!e.run('localStorage.getItem(GF_CUENTA_KEY)'),!confirma);
 }
 // La copia histórica no puede bloquear el formulario de correo ni restaurarse.
 e=entorno();let anon=0;
 e.c.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),signInAnonymously:async()=>{anon++;throw Error('Prohibido');}}})};
 e.run("prepararEpocaServidor();GF.SOLO_EMAIL=true;huboGranja=()=>true;marcaCuenta=()=>null;UID=null;");
 assert.equal(await e.c.initSave(),false);assert.equal(e.run('PUERTA_EMAIL'),true);assert.equal(e.run('UID'),null);assert.equal(anon,0);
 console.log('OK: red colgada, reconexión, respuesta perdida/tardía, recibo único, ACK incompleto, sin escritura directa y cambios de cuenta durante guardado/recuperación.');
})().catch(e=>{console.error(e);process.exitCode=1;});
