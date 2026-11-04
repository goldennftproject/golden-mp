'use strict';
// Ejecuta renderers/handlers reales y controla la confirmación del guardado en memoria.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
function servidor(filaInicial){
 const {stripTypeScriptTypes}=require('node:module');
 const js=stripTypeScriptTypes(fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8')).replace(/^import .*createClient.*;\s*$/m,'');
 let fila=structuredClone(filaInicial),writes=0,handle;
 const admin={auth:{getUser:async()=>({data:{user:{id:'qa-incursion'}},error:null})},from:table=>{
  if(table==='market')return{select:()=>({or:()=>({limit:async()=>({data:[],error:null})})})};
  if(table==='farm_saves_log')return{insert:async()=>({error:null})};
  assert.equal(table,'farms');let mode='read',value,filters={};
  const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q;},update:v=>{mode='update';value=v;return q;},maybeSingle:async()=>{
   if(mode==='read')return{data:structuredClone(fila),error:null};
   if(fila.updated_at!==filters.updated_at)return{data:null,error:null};
   fila=structuredClone(value);writes++;return{data:{updated_at:fila.updated_at},error:null};
  }};return q;
 }};
 const ctx={Response,Request,Date,Math,JSON,Number,Object,Array,Set,String,isFinite,createClient:()=>admin,Deno:{env:{get:()=> 'unused'},serve:f=>{handle=f;}}};
 vm.createContext(ctx);vm.runInContext(js,ctx);
 return{call:body=>handle(new Request('https://qa.invalid/guardar',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify(body)})),writes:()=>writes,row:()=>fila};
}
function fixture(vip=false){
 // Omitir sólo el arranque asíncrono de Auth: la cuenta y el ACK son ficticios.
 const save=fs.readFileSync(path.join(root,'public/game/save.js'),'utf8').replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve(false);');
 const {ctx:c}=require('./arrancar-el-juego.contexto.js').arrancar(root,{'game/save.js':save,'game/main.js':''}),run=s=>vm.runInContext(s,c);
 c.document=new JSDOM('<main><div id="inc-list"></div></main>').window.document;
 c.estadoDeCero();c.G.gear.arma='espada_bronce';c.G.weapons.espada_bronce={dur:10000};
 c.G.produccion.vipHasta=vip?c.nowMs()+86400000:0;
 c.G.tuto={step:25,n:0,done:false,v:c.TUTO_VER};c.GF.scene='farm';
 const messages=[],confirmations=[];let saves=0,release;
 c.toast=s=>messages.push(String(s));c.log=()=>{};c.refreshHud=()=>{};c.syncSlots=()=>{};
 c.askConfirm=(text,yes,options)=>confirmations.push({text,yes,options});
 c.saveFarm=()=>{saves++;return c.G.incursion?Promise.resolve():new Promise(resolve=>{release=resolve;});};
 run("UID='test-incursion-ui';CARGA_OK=true;SOLO_LOCAL=false;SAVE_BASES.clear();SAVE_BASES.set(UID,'base-before');SAVE_CONFIRMACIONES.clear();SAVE_CONFIRMACIONES.set(UID,1);SAVE_CONFLICTOS.clear();INC_SALIDA_EN_CURSO=false;");
 c.refreshIncursion();
 const button=k=>c.document.querySelector('[data-inc="'+k+'"]');
 const ack=()=>run("SAVE_BASES.set('test-incursion-ui','base-confirmed');SAVE_CONFIRMACIONES.set('test-incursion-ui',2);");
 return {c,run,messages,confirmations,button,ack,saves:()=>saves,release:()=>release()};
}
(async()=>{
 const f=fixture();
 assert.equal(f.button('zn1').disabled,false);assert.match(f.button('zn1').textContent,/Prueba del tutorial/);
 for(const k of ['zn2','zn3','guarida']){assert.equal(f.button(k).disabled,true);assert.equal(f.button(k).textContent,'Sólo VIP');f.button(k).click();}
 assert.equal(f.confirmations.length,0);
 f.button('zn1').click();assert.equal(f.confirmations.length,1);assert.equal(f.saves(),0,'abrir la confirmación no guarda ni lanza');
 const pending=f.confirmations[0].yes();await Promise.resolve();
 assert.equal(f.saves(),1);assert.equal(f.c.G.incursion,null);assert.equal(f.c.statGet('incursion'),0);
 assert.equal(f.run('INC_SALIDA_EN_CURSO'),true);assert.equal(f.button('zn1').disabled,true);
 await f.confirmations[0].yes();assert.equal(f.saves(),1,'una segunda confirmación no crea otro flush');
 f.ack();f.release();await pending;
 assert.ok(f.c.G.incursion,JSON.stringify({messages:f.messages,uid:f.run('UID'),base:f.run('SAVE_BASES.get(UID)'),acks:f.run('SAVE_CONFIRMACIONES.get(UID)'),step:f.c.G.tuto.step,trial:f.c.incursionDisponiblePorTutorial()}));
 assert.equal(f.c.G.incursion.zona,'zn1');assert.equal(f.c.statGet('incursion'),1);assert.equal(f.c.G.tuto.step,26);
 assert.equal(f.run('INC_SALIDA_EN_CURSO'),false);assert.equal(f.button('zn1').disabled,true);
 // Resolver el flush sin ACK verificable nunca permite empezar.
 const noAck=fixture();noAck.button('zn1').click();const noAckPending=noAck.confirmations[0].yes();
 noAck.release();await noAckPending;assert.equal(noAck.c.G.incursion,null);assert.equal(noAck.c.G.tuto.step,25);
 assert.equal(noAck.c.G.incursionTutorialUsada,false);assert.ok(noAck.messages.some(s=>/confirmar el paso/.test(s)));
 // La cuenta que inició la petición debe seguir siendo la activa al confirmar.
 const switched=fixture();switched.button('zn1').click();const switchPending=switched.confirmations[0].yes();
 switched.ack();switched.run("UID='another-test-account';");switched.release();await switchPending;
 assert.equal(switched.c.G.incursion,null);assert.equal(switched.c.statGet('incursion'),0);
 // Un conflicto o una marca consumida recibida mientras esperamos también bloquean.
 for(const change of [x=>x.run("SAVE_CONFLICTOS.add('test-incursion-ui');"),x=>{x.c.G.incursionTutorialUsada=true;}]){
  const changed=fixture();changed.button('zn1').click();const wait=changed.confirmations[0].yes();
  changed.ack();change(changed);changed.release();await wait;assert.equal(changed.c.G.incursion,null);
 }
 // Un rechazo de red libera el bloqueo, no lanza y permite volver a intentarlo.
 const failed=fixture();failed.c.saveFarm=()=>Promise.reject(new Error('fixture offline'));
 failed.button('zn1').click();await failed.confirmations[0].yes();assert.equal(failed.c.G.incursion,null);
 assert.equal(failed.run('INC_SALIDA_EN_CURSO'),false);assert.equal(failed.button('zn1').disabled,false);
 assert.ok(failed.messages.some(s=>/No se pudo confirmar la salida/.test(s)));
 const consumed=fixture();consumed.c.G.incursionTutorialUsada=true;consumed.c.refreshIncursion();
 assert.equal(consumed.button('zn1').disabled,true);assert.equal(consumed.button('zn1').textContent,'Sólo VIP');
 // VIP no necesita el flush de excepción; conserva la salida normal y su etiqueta.
 const premium=fixture(true);assert.equal(premium.button('zn1').textContent,'Salir');
 premium.c.incursionSincronizarTutorial=()=>{throw Error('VIP no debe pedir la prueba');};
 premium.button('zn1').click();await premium.confirmations[0].yes();assert.equal(premium.c.G.incursion.zona,'zn1');
 // Handler HTTP real: la marca acompaña al ACK inicial y al reintento del mismo op.
 const http=fixture(),base=new Date(Date.now()-1000).toISOString(),old=JSON.parse(JSON.stringify(http.c.snapshot()));
 http.c.incSalir('zn1');const data=JSON.parse(JSON.stringify(http.c.snapshot()));
 const server=servidor({user_id:'qa-incursion',name:'QA',updated_at:base,data:old});
 const body={cuenta:'qa-incursion',name:'QA',base,op:'qa-incursion-first',data};
 let response=await server.call(body);assert.equal(response.status,200);let ack=await response.json();
 assert.equal(ack.incursionTutorialUsada,true);assert.equal(server.row().data.incursionTutorialUsada,true);assert.equal(server.writes(),1);
 body.data.incursionTutorialUsada=false;
 response=await server.call(body);assert.equal(response.status,200);ack=await response.json();
 assert.equal(ack.repetido,true);assert.equal(ack.incursionTutorialUsada,true);assert.equal(server.writes(),1);
 console.log('OK UI incursión: sólo primera zona Free, confirmación y ACK previos, doble clic/cuenta/conflicto/sin ACK/red bloqueados, marca consumida y VIP normal.');
 console.log('OK handler real: ACK y op repetida conservan la marca de prueba consumida sin repetir escrituras.');
})().catch(error=>{console.error(error);process.exitCode=1;});
