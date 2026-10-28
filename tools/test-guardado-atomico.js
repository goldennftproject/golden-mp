"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const fuente=fs.readFileSync(path.resolve(__dirname,"../supabase/functions/guardar/index.ts"),"utf8");
const js=stripTypeScriptTypes(fuente).replace(/^import .*createClient.*;\s*$/m,"");
function servidor(inicial, opciones={}) {
  let fila=inicial && structuredClone(inicial), writes=0, handle;
  const admin={auth:{getUser:async()=>({data:{user:{id:"qa"}},error:null})},from:tabla=>{
    if(tabla==="market")return{select:()=>({or:()=>({limit:async()=>({data:[],error:opciones.marketError?{message:"offline"}:null})})})};
    if(tabla==="farm_saves_log")return{insert:async()=>({error:null})};
    assert.equal(tabla,"farms");
    let modo="read",valor,filtros={};
    const q={select:()=>q,eq:(k,v)=>{filtros[k]=v;return q;},update:v=>{modo="update";valor=v;return q;},insert:v=>{modo="insert";valor=v;return q;},maybeSingle:async()=>{
      if(modo==="read"){const copia=structuredClone(fila);await Promise.resolve();return{data:copia,error:opciones.readError?{message:"offline"}:null};}
      if(opciones.sinAck && Object.hasOwn(valor,"mercado_ack"))return{error:{code:"42703",message:"mercado_ack missing"},data:null};
      if(modo==="insert"&&fila)return{error:{code:"23505",message:"duplicate"},data:null};
      if(modo==="update"&&(!fila||fila.updated_at!==filtros.updated_at))return{error:null,data:null};
      writes++;fila=structuredClone(valor);if(opciones.postgresTime)fila.updated_at=new Date(fila.updated_at).toISOString().replace(/Z$/,'+00:00');return{error:null,data:{updated_at:fila.updated_at}};
    }};return q;
  }};
  const ctx={Response,Request,Date,Math,JSON,Number,Object,Array,Set,String,isFinite,createClient:()=>admin,Deno:{env:{get:()=>"unused"},serve:f=>{handle=f;}}};
  vm.createContext(ctx);vm.runInContext(js,ctx);
  return{call:(body,auth=true)=>handle(new Request("https://qa.invalid/guardar",{method:"POST",headers:auth?{Authorization:"Bearer qa"}:{},body:JSON.stringify({...body,...(body.artefacto && !body.cuenta ? {cuenta:'qa'}:{})})})),row:()=>fila,writes:()=>writes,ctx};
}
const base="2026-10-15T12:00:00.000Z";
const inicial={user_id:"qa",name:"QA",updated_at:base,data:{plata:10,golden:20,level:1,res:{maiz:10}}};
(async()=>{
  let s=servidor(inicial);
  const op='11111111-1111-4111-8111-111111111111';
  let objetos=servidor({...inicial,data:{...inicial.data,golden:100}});
  let compra=await objetos.call({base,op,artefacto:{accion:'comprar',id:'cobre'}});
  assert.equal(compra.status,200);assert.equal(objetos.row().data.golden,90);
  assert.equal((await objetos.call({cuenta:'otra',base,op,artefacto:{accion:'comprar',id:'plata'}})).status,409,'cambio de cuenta bloqueado');
  compra=await objetos.call({base,op,artefacto:{accion:'comprar',id:'cobre'}});
  assert.equal(compra.status,200);assert.equal((await compra.json()).repetido,true);assert.equal(objetos.writes(),1,'reintento no cobra dos veces');
  let carrera=servidor({...inicial,data:{...inicial.data,golden:100}});
  const concurrentes=await Promise.all([carrera.call({base,op,artefacto:{accion:'comprar',id:'cobre'}}),carrera.call({base,op:'22222222-2222-4222-8222-222222222222',artefacto:{accion:'comprar',id:'plata'}})]);
  assert.deepEqual(concurrentes.map(r=>r.status).sort(),[200,409]);assert.equal(carrera.writes(),1,'CAS evita compras simultáneas sobre un mismo saldo');
  objetos=servidor({...inicial,data:{...inicial.data,artefactos:{v:1,items:{cobre:{desde:Date.now()-86400000,cobrado:Date.now()-86400000,resto:0,moneda:'plata-v2'}},ops:[]},energiaGranja:{v:1,actual:100,at:Date.now()}}});
  const cobro=await objetos.call({base,op,artefacto:{accion:'cobrar',id:'cobre'}});
  assert.equal(cobro.status,200);assert.equal(objetos.row().data.golden,20);assert.equal(objetos.row().data.plata,880);assert.ok(objetos.row().data.energiaGranja.actual<=99);
  assert.equal((await objetos.call({base,op,artefacto:{accion:'cobrar',id:'cobre'}})).status,200);assert.equal(objetos.writes(),1,'recibo impide cobro doble');
  let r=await s.call({base,data:{plata:12010,golden:20,level:1,res:{maiz:0}}});
  assert.equal(r.status,200,"venta grande de stock aceptado no se rechaza");
  // El catálogo se verifica contra el mismo juego que cobra las ventas.
  const real=require("./arrancar-el-juego.contexto.js").arrancar(path.resolve(__dirname,".."));
  const catalogo=vm.runInContext("VENTA_SISTEMA",s.ctx);
  for(const k of Object.keys(catalogo)) assert.equal(real.ctx.priceOf(k),catalogo[k],k);
  assert.equal(real.ctx.totalVenta("tablon",1),0,"procesados no se venden al sistema; comercio entre jugadores");
  s=servidor(inicial);r=await s.call({base:"otra-version",data:inicial.data});assert.equal(r.status,409);assert.equal(s.writes(),0);
  s=servidor(inicial);r=await s.call({base,data:{...inicial.data,golden:1000020}});assert.equal(r.status,409);assert.equal((await r.json()).economia,true);assert.equal(s.writes(),0,"el handler real no persiste emisión arbitraria");
  s=servidor(inicial);
  const rs=await Promise.all([s.call({base,data:{...inicial.data,plata:11}}),s.call({base,data:{...inicial.data,plata:12}})]);
  assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1,"dos sesiones no se pisan");
  s=servidor(inicial);
  const pedido={base,op:"qa-una-operacion",data:{...inicial.data,plata:11}};
  assert.equal((await s.call(pedido)).status,200);r=await s.call(pedido);
  assert.equal(r.status,200);assert.equal((await r.json()).repetido,true);assert.equal(s.writes(),1,"reintentar tras perder la respuesta no duplica ni genera un conflicto falso");
  s=servidor(null);const inicialNuevo={plata:3,golden:0,res:{},produccion:{v:1,vipUnico:1,base:5,nodos:{},vipHasta:0}};const nuevos=await Promise.all([s.call({base:null,data:inicialNuevo}),s.call({base:null,data:inicialNuevo})]);
  assert.deepEqual(nuevos.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);
  for(const opciones of [{readError:true},{marketError:true}]) {s=servidor(inicial,opciones);r=await s.call({base,data:inicial.data});assert.equal(r.status,503);assert.equal(s.writes(),0);}
  s=servidor(inicial,{sinAck:true});r=await s.call({base,data:inicial.data});assert.equal(r.status,200);assert.equal(s.writes(),1);
  s=servidor(inicial);r=await s.call({data:inicial.data},false);assert.equal(r.status,401);assert.equal(s.writes(),0);
  // PostgreSQL devuelve timestamptz con +00:00; la operación debe devolver ESA versión.
  const pg=servidor({...inicial,data:{...inicial.data,golden:100}},{postgresTime:true});
  const pgCompra=await pg.call({base,op,artefacto:{accion:'comprar',id:'cobre'}});
  assert.equal(pgCompra.status,200);const pgAck=await pgCompra.json();
  assert.equal(pgAck.updated_at,pg.row().updated_at,'el ACK conserva exactamente la versión de PostgreSQL');
  const pgGuardar=await pg.call({base:pgAck.updated_at,op:'normal-despues-compra',data:pgAck.data});
  assert.equal(pgGuardar.status,200,'guardar después de una compra no inventa otra sesión');
  const pgConflicto=await pg.call({base:pgAck.updated_at,op:'sesion-realmente-vieja',data:pgAck.data});
  assert.equal(pgConflicto.status,409,'una versión realmente antigua sigue bloqueada');
  const now=Date.now(), rewardBase=new Date(now-1000).toISOString();
  const rewardOld={plata:10,golden:0,level:1,res:{},seeds:{papa:3},plots:[{state:'dry'}],energiaGranja:{actual:50,at:now},produccion:{v:1,vipUnico:1,base:5,nodos:{},vipHasta:0}};
  const rewardNext=structuredClone(rewardOld);rewardNext.seeds.papa=2;rewardNext.plots[0]={state:'growing',cropKey:'papa',readyAt:now+180000};rewardNext.energiaGranja.actual=49;rewardNext.actividadAcciones={plant:1};
  const rewardServer=servidor({user_id:'qa',name:'QA',updated_at:rewardBase,data:rewardOld});
  const rewardBody={jornada:1,base:rewardBase,op:'jornada-operacion-1',data:rewardNext};
  const rewardResp=await rewardServer.call(rewardBody);assert.equal(rewardResp.status,200);assert.equal(rewardServer.row().data.plata,35);
  const rewardRetry=await rewardServer.call(rewardBody);assert.equal(rewardRetry.status,200);assert.equal((await rewardRetry.json()).repetido,true);assert.equal(rewardServer.writes(),1);
  const idle=await rewardServer.call({jornada:1,base:rewardServer.row().updated_at,op:'jornada-idle-next',data:rewardServer.row().data});assert.equal(idle.status,200);assert.equal(rewardServer.row().data.plata,35);
  const racingReward=servidor({user_id:'qa',name:'QA',updated_at:rewardBase,data:rewardOld});
  const rewardRace=await Promise.all([racingReward.call(rewardBody),racingReward.call({...rewardBody,op:'jornada-operacion-2'})]);assert.deepEqual(rewardRace.map(r=>r.status).sort(),[200,409]);assert.equal(racingReward.row().data.plata,35);
  const compoundOld={...structuredClone(rewardOld),seeds:{},plots:[],skills:{crafting:0},tools:{axe:0},stats:{talar:{_:0}}};
  const compoundNext=structuredClone(compoundOld);compoundNext.plata=8;compoundNext.skills.crafting=5;compoundNext.res.madera=1;compoundNext.stats.talar._=1;compoundNext.energiaGranja.actual=49;compoundNext.actividadAcciones={chop:1};
  const compoundServer=servidor({user_id:'qa',name:'QA',updated_at:rewardBase,data:compoundOld});
  const compoundBody={jornada:1,base:rewardBase,op:'hacha-fabricada-consumida',data:compoundNext};
  assert.equal((await compoundServer.call(compoundBody)).status,200);assert.equal(compoundServer.row().data.plata,33,'gasto de 2 y premio de 25 en el handler real');
  assert.equal((await compoundServer.call(compoundBody)).status,200);assert.equal(compoundServer.writes(),1,'el recibo compuesto no duplica crédito');
  // Cliente real: cola de escrituras, paquetes inmutables y base de la última respuesta.
  const ctx=real.ctx,run=c=>vm.runInContext(c,ctx);let invocaciones=[],soltar;
  ctx.qaSb={functions:{invoke:async(nombre,{body})=>{
    invocaciones.push(body);
    if(invocaciones.length===1)return new Promise(resolve=>{soltar=resolve;});
    return{data:{ok:true,updated_at:"v3"},error:null};
  }}};
  run("sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_BASES.set(UID,'v1');copiaGuardar=()=>{};showSaving=()=>{};showSaved=()=>{};G.res.madera=10;");
  const primero=ctx.saveFarm(true);await Promise.resolve();await Promise.resolve();
  assert.equal(invocaciones.length,1);run("G.res.madera=20;");ctx.saveFarm(true);
  assert.equal(invocaciones[0].data.res.madera,10,"el paquete enviado no muta al seguir jugando");
  soltar({data:{ok:true,updated_at:"v2"},error:null});await primero;
  assert.equal(invocaciones.length,2);assert.equal(invocaciones[1].base,"v2");assert.equal(invocaciones[1].data.res.madera,20);
  // ACK productivo: el premio ya persistido no debe generar un segundo guardado sucio.
  ctx.qaSb={functions:{invoke:async()=>({data:{ok:true,updated_at:'bono-v1',actividadGranja:{v:1,energia:1,registro:{plant:1},bonoTotal:25}},error:null})}};
  run("sb=qaSb;G.plata=10;G.actividadGranja=null;SAVE_CONFLICTOS.clear();lastSavedKey=null;");
  await ctx.saveFarm(true);
  assert.equal(ctx.G.plata,35,'premio confirmado añadido una vez');
  assert.equal(run('lastSavedKey===snapKey()'),true,'ACK no deja un guardado falso pendiente');
  let bonusRelease;
  ctx.qaSb={functions:{invoke:async()=>new Promise(resolve=>{bonusRelease=resolve;})}};
  run("sb=qaSb;G.plata=40;");
  const bonusFlight=ctx.saveFarm(true);await Promise.resolve();await Promise.resolve();
  run('G.plata-=7;');
  bonusRelease({data:{ok:true,updated_at:'bono-v2',actividadGranja:{v:1,energia:2,registro:{plant:2},bonoTotal:50}},error:null});
  await bonusFlight;
  assert.equal(ctx.G.plata,58,'ACK suma premio sin borrar gasto en vuelo');
  assert.equal(run('lastSavedKey===snapKey()'),false,'gasto en vuelo sigue pendiente');
  let llamadas=0,upserts=0;
  ctx.qaSb={functions:{invoke:async()=>{llamadas++;return{data:null,error:{context:{status:409}}};}},from:()=>{upserts++;throw Error("No debe intentar una puerta alternativa");}};
  run("sb=qaSb;lastSavedKey=null;log=()=>{};toast=()=>{};showSaveError=()=>{};G.plata=99;");
  await ctx.saveFarm(true);await ctx.saveFarm(true);
  assert.equal(llamadas,1);assert.equal(upserts,0);assert.equal(ctx.G.plata,99,"un conflicto no hidrata ni borra el progreso actual");
  assert.equal(run("SAVE_CONFLICTOS.has('qa')"),true);
  console.log("OK: stock vendido, catálogo, CAS de sesiones, inserción concurrente, errores de lectura, fallback de columna, auth, cola de guardado y 409 sin perder progreso.");
})().catch(e=>{console.error(e);process.exitCode=1;});
