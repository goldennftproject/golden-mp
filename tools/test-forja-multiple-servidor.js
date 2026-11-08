'use strict';
// Ejecuta el handler publicado con almacenamiento en memoria: ninguna cuenta ni red.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..'),catalogRoot=process.env.GF_CATALOG_ROOT||root;
const source=stripTypeScriptTypes(fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8')).replace(/^import .*createClient.*;\s*$/m,'');
const now=Date.parse('2026-11-08T18:00:00.000Z'),base=new Date(now-1000).toISOString();
class Clock extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
const clone=v=>JSON.parse(JSON.stringify(v));
const catalog={console,Date:Clock,Math,JSON};catalog.window=catalog;vm.createContext(catalog);
for(const f of ['config.js','state.js'])vm.runInContext(fs.readFileSync(path.join(catalogRoot,'public/game',f),'utf8'),catalog);
const defs=clone(vm.runInContext('ARM_DEF',catalog)),ids=Object.keys(defs);
const xpFor=n=>{let x=0;for(let i=1;i<n;i++)x+=catalog.skillNeed(i);return x;};
const op=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
function initial(){return {user_id:'qa',name:'QA',updated_at:base,data:{plata:1000000,golden:0,level:1,prestige:0,armasUnlocked:true,combatXp:xpFor(16),res:{madera:1000000,piedra:1000000,barra_bronce:1000000,barra_oro:1000000,diamante:1000000},skills:{crafting:1001},weapons:{espada_madera:{dur:23,plus:7,sockets:[null,{t:'guardiana',r:3}],extra:{marca:'actual'}}},weaponSpares:{'r-viejo':{key:'espada_madera',w:{dur:8,plus:2,sockets:[{t:'roja',r:1}]}}},gear:{arma:'espada_madera'},mkPend:[],armCd:{},energiaGranja:{v:1,actual:0,at:now}}};}
function server(row=initial(),options={}){
 let stored=clone(row),writes=0,handler;
 const admin={auth:{getUser:async()=>({data:{user:{id:'qa'}},error:null})},from:table=>{
  if(table==='farm_saves_log')return {insert:async()=>({error:null})};
  if(table==='market')return {select:()=>({or:()=>({limit:async()=>({data:[],error:null})})})};
  assert.equal(table,'farms');let change=null,filters={};
  const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q;},update:v=>{change=v;return q;},maybeSingle:async()=>{
   if(!change){const current=clone(stored);await Promise.resolve();return {data:current,error:options.readError?{message:'offline'}:null};}
   if(options.writeError)return {data:null,error:{message:'offline'}};
   if(stored.updated_at!==filters.updated_at)return {data:null,error:null};
   writes++;stored={...stored,...clone(change)};if(options.postgresTime)stored.updated_at=stored.updated_at.replace(/Z$/,'+00:00');return {data:{updated_at:stored.updated_at},error:null};
  }};return q;
 }};
 const ctx={Response,Request,Date:Clock,Math,JSON,Number,Object,Array,Set,String,isFinite,createClient:()=>admin,Deno:{env:{get:()=> 'unused'},serve:f=>{handler=f;}}};vm.createContext(ctx);vm.runInContext(source,ctx);
 return {call:(body,auth=true)=>handler(new Request('https://qa.invalid/guardar',{method:'POST',headers:auth?{Authorization:'Bearer qa'}:{},body:JSON.stringify(body)})),row:()=>clone(stored),writes:()=>writes,ctx};
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('  ok '+name);}
const forge=(id,n=1,b=base)=>({cuenta:'qa',base:b,op:op(n),forja:{id}});
(async()=>{
 await check('los veinte modelos conservan costes, XP, durabilidad, nivel y enfriamiento reales',async()=>{
  assert.equal(ids.length,20);
  for(const id of ids){const w=defs[id],s=server(),before=s.row().data;
   const model=clone(vm.runInContext(`forjaModelo(${JSON.stringify(id)})`,s.ctx));
   assert.deepEqual(model.cost,w.cost,id);assert.equal(model.plata,w.plata,id);assert.equal(model.lvl,w.lvl,id);assert.equal(model.cd,w.cd,id);assert.equal(model.dur,w.dur,id);assert.equal(model.xp,10+w.ri*4,id);
   const r=await s.call(forge(id));assert.equal(r.status,200,id);const d=s.row().data;
   assert.equal(d.plata,before.plata-w.plata,id);for(const k of Object.keys(before.res))assert.equal(d.res[k],before.res[k]-(w.cost[k]||0),id);
   assert.equal(d.skills.crafting,before.skills.crafting+10+w.ri*4,id);assert.equal(d.armCd[id],now+w.cd*1000,id);
   assert.equal(d.energiaGranja.actual,0,id+': fabricar cuesta cero energía');
   assert.deepEqual(d.mkPend,[{kind:'arm',item:id,qty:1,payload:{dur:w.dur}}]);assert.deepEqual(d.weapons,before.weapons);assert.deepEqual(d.weaponSpares,before.weaponSpares);assert.deepEqual(d.gear,before.gear);
   assert.deepEqual(d.forjaOps,[{op:op(1),id}]);assert.equal(s.writes(),1);
  }
 });
 await check('un reintento con la misma UUID se confirma antes del CAS sin cobrar de nuevo',async()=>{
  const s=server(),request=forge('espada_madera');assert.equal((await s.call(request)).status,200);const first=s.row();const r=await s.call(request);assert.equal(r.status,200);assert.equal((await r.json()).repetido,true);assert.deepEqual(s.row(),first);assert.equal(s.writes(),1);
 });
 await check('la UUID no puede reutilizarse para otro modelo',async()=>{const s=server();await s.call(forge('espada_madera'));assert.equal((await s.call(forge('hacha_madera',1,s.row().updated_at))).status,400);assert.equal(s.writes(),1);});
 await check('dos sesiones no pueden cobrar ni entregar dos veces sobre la misma base',async()=>{const s=server();const rs=await Promise.all([s.call(forge('espada_madera',1)),s.call(forge('espada_madera',2))]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);assert.equal(s.row().data.mkPend.length,1);});
 await check('la cuenta de la petición debe coincidir con Auth',async()=>{const s=server();assert.equal((await s.call({...forge('espada_madera'),cuenta:'otra'})).status,409);assert.equal(s.writes(),0);});
 await check('una sesión no autenticada no forja',async()=>{const s=server();assert.equal((await s.call(forge('espada_madera'),false)).status,401);assert.equal(s.writes(),0);});
 await check('una base antigua no cobra ni genera entregas',async()=>{const s=server();assert.equal((await s.call(forge('espada_madera',1,'vieja'))).status,409);assert.equal(s.writes(),0);});
 await check('rechaza modelo inválido, clave especial y UUID inválida',async()=>{for(const id of ['espada_zafiro','__proto__',null]){const s=server();assert.equal((await s.call(forge(id))).status,400);assert.equal(s.writes(),0);}const s=server();assert.equal((await s.call({...forge('espada_madera'),op:'invalido'})).status,400);});
 await check('la espada de entrada sigue disponible con Armas cerrada',async()=>{const row=initial();row.data.armasUnlocked=false;row.data.combatXp=0;const s=server(row);assert.equal((await s.call(forge('espada_madera'))).status,200);});
 await check('los otros diecinueve modelos respetan el desbloqueo',async()=>{for(const id of ids.filter(k=>k!=='espada_madera')){const row=initial();row.data.armasUnlocked=false;const s=server(row);assert.equal((await s.call(forge(id))).status,400,id);assert.equal(s.writes(),0);}});
 await check('todos los modelos respetan el umbral exacto de Combate',async()=>{for(const id of ids){const w=defs[id],row=initial();row.data.combatXp=xpFor(w.lvl);assert.equal((await server(row).call(forge(id))).status,200,id);if(w.lvl>1){row.data.combatXp--;const s=server(row);assert.equal((await s.call(forge(id))).status,400,id);assert.equal(s.writes(),0);}}});
 await check('no permite saltar el enfriamiento',async()=>{const s=server();await s.call(forge('espada_madera'));assert.equal((await s.call(forge('espada_madera',2,s.row().updated_at))).status,400);assert.equal(s.writes(),1);});
 await check('permite otra copia cuando vence el enfriamiento',async()=>{const row=initial();row.data.armCd.espada_madera=now;const s=server(row);assert.equal((await s.call(forge('espada_madera'))).status,200);assert.equal(s.row().data.weapons.espada_madera.plus,7);});
 await check('cada material faltante bloquea sin cargos parciales',async()=>{for(const k of Object.keys(defs.espada_bronce.cost)){const row=initial();row.data.res[k]=defs.espada_bronce.cost[k]-1;const s=server(row);assert.equal((await s.call(forge('espada_bronce'))).status,400);assert.equal(s.writes(),0);}});
 await check('Plata insuficiente bloquea sin consumir materiales',async()=>{const row=initial();row.data.plata=9;const s=server(row);assert.equal((await s.call(forge('espada_madera'))).status,400);assert.equal(s.writes(),0);});
 await check('las entregas previas y fichas completas se conservan',async()=>{const row=initial();row.data.mkPend=[{kind:'arm',item:'espada_madera',qty:1,payload:{dur:7,plus:6,sockets:[{t:'roja',r:2}],custom:{original:true}}}];const s=server(row);assert.equal((await s.call(forge('espada_madera'))).status,200);assert.deepEqual(s.row().data.mkPend[0],row.data.mkPend[0]);assert.equal(s.row().data.mkPend.length,2);});
 await check('una bolsa llena conserva la nueva arma pendiente',async()=>{const row=initial();row.data.bagSlots=1;row.data.res.extra=99;const s=server(row);assert.equal((await s.call(forge('espada_madera'))).status,200);assert.equal(s.row().data.mkPend.length,1);});
 await check('errores de lectura/escritura no producen un ACK falso',async()=>{for(const options of [{readError:true},{writeError:true}]){const s=server(initial(),options);assert.equal((await s.call(forge('espada_madera'))).status,503);assert.equal(s.writes(),0);}});
 await check('el ACK conserva exactamente la representación timestamptz de PostgreSQL',async()=>{const s=server(initial(),{postgresTime:true}),r=await s.call(forge('espada_madera'));assert.equal(r.status,200);assert.equal((await r.json()).updated_at,s.row().updated_at);});
 await check('el guardado ordinario no puede borrar recibos ni adelantar el reloj',async()=>{const s=server();await s.call(forge('espada_madera'));for(const mutate of [d=>{d.forjaOps=[];},d=>{d.armCd={};}]){const d=s.row().data;mutate(d);assert.equal((await s.call({cuenta:'qa',base:s.row().updated_at,data:d})).status,409);}assert.equal(s.writes(),1);});
 await check('omitir campos anteriores conserva recibos y reloj',async()=>{const s=server();await s.call(forge('espada_madera'));const d=s.row().data;delete d.forjaOps;delete d.armCd;const r=await s.call({cuenta:'qa',base:s.row().updated_at,data:d});assert.equal(r.status,200,JSON.stringify(await r.clone().json()));assert.equal(s.row().data.forjaOps.length,1);assert.equal(s.row().data.armCd.espada_madera,now+3000);});
 await check('no inyecta campos vacíos cuando antes y después los omitían',async()=>{const row=initial();delete row.data.armCd;const s=server(row),r=await s.call({cuenta:'qa',base,data:row.data});assert.equal(r.status,200,JSON.stringify(await r.clone().json()));assert.equal(Object.hasOwn(s.row().data,'forjaOps'),false);assert.equal(Object.hasOwn(s.row().data,'armCd'),false);});
 await check('el prestigio conserva recibos y relojes sin falso bloqueo de forja',async()=>{const row=initial();row.data.forjaOps=[{op:op(1),id:'espada_madera'}];row.data.armCd.espada_madera=now+3000;const s=server(row);const old=s.row().data,next=clone(old);next.prestige++;next.level=1;for(const k in next.res)next.res[k]=0;const errors=vm.runInContext(`(()=>{const e=[];protegerForja(${JSON.stringify(old)},${JSON.stringify(next)},e);return e;})()`,s.ctx);assert.equal(errors.length,0);});
 console.log(`OK: ${checks} contratos de forja autoritativa, 20 modelos reales; CAS, recibos, pagos y fichas preservados.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
