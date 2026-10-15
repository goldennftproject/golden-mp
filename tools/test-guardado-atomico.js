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
      writes++;fila=structuredClone(valor);return{error:null,data:{updated_at:fila.updated_at}};
    }};return q;
  }};
  const ctx={Response,Request,Date,Math,JSON,Number,Object,Array,Set,String,isFinite,createClient:()=>admin,Deno:{env:{get:()=>"unused"},serve:f=>{handle=f;}}};
  vm.createContext(ctx);vm.runInContext(js,ctx);
  return{call:(body,auth=true)=>handle(new Request("https://qa.invalid/guardar",{method:"POST",headers:auth?{Authorization:"Bearer qa"}:{},body:JSON.stringify(body)})),row:()=>fila,writes:()=>writes,ctx};
}
const base="2026-10-15T12:00:00.000Z";
const inicial={user_id:"qa",name:"QA",updated_at:base,data:{plata:10,golden:20,level:1,res:{maiz:10}}};
(async()=>{
  let s=servidor(inicial);
  let r=await s.call({base,data:{plata:12010,golden:20,level:1,res:{maiz:0}}});
  assert.equal(r.status,200,"venta grande de stock aceptado no se rechaza");
  // El catálogo se verifica contra el mismo juego que cobra las ventas.
  const real=require("./arrancar-el-juego.contexto.js").arrancar(path.resolve(__dirname,".."));
  const catalogo=vm.runInContext("VENTA_SISTEMA",s.ctx);
  for(const k of Object.keys(catalogo)) assert.equal(real.ctx.priceOf(k),catalogo[k],k);
  assert.ok(real.ctx.totalVenta("tablon",1)>0,"procesado no se vende por cero");
  s=servidor(inicial);r=await s.call({base:"otra-version",data:inicial.data});assert.equal(r.status,409);assert.equal(s.writes(),0);
  s=servidor(inicial);
  const rs=await Promise.all([s.call({base,data:{...inicial.data,plata:11}}),s.call({base,data:{...inicial.data,plata:12}})]);
  assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1,"dos sesiones no se pisan");
  s=servidor(inicial);
  const pedido={base,op:"qa-una-operacion",data:{...inicial.data,plata:11}};
  assert.equal((await s.call(pedido)).status,200);r=await s.call(pedido);
  assert.equal(r.status,200);assert.equal((await r.json()).repetido,true);assert.equal(s.writes(),1,"reintentar tras perder la respuesta no duplica ni genera un conflicto falso");
  s=servidor(null);const nuevos=await Promise.all([s.call({base:null,data:{plata:3,golden:20,res:{}}}),s.call({base:null,data:{plata:3,golden:20,res:{}}})]);
  assert.deepEqual(nuevos.map(r=>r.status).sort(),[200,409]);assert.equal(s.writes(),1);
  for(const opciones of [{readError:true},{marketError:true}]) {s=servidor(inicial,opciones);r=await s.call({base,data:inicial.data});assert.equal(r.status,503);assert.equal(s.writes(),0);}
  s=servidor(inicial,{sinAck:true});r=await s.call({base,data:inicial.data});assert.equal(r.status,200);assert.equal(s.writes(),1);
  s=servidor(inicial);r=await s.call({data:inicial.data},false);assert.equal(r.status,401);assert.equal(s.writes(),0);
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
  let llamadas=0,upserts=0;
  ctx.qaSb={functions:{invoke:async()=>{llamadas++;return{data:null,error:{context:{status:409}}};}},from:()=>{upserts++;throw Error("No debe intentar una puerta alternativa");}};
  run("sb=qaSb;lastSavedKey=null;log=()=>{};toast=()=>{};showSaveError=()=>{};G.plata=99;");
  await ctx.saveFarm(true);await ctx.saveFarm(true);
  assert.equal(llamadas,1);assert.equal(upserts,0);assert.equal(ctx.G.plata,99,"un conflicto no hidrata ni borra el progreso actual");
  assert.equal(run("SAVE_CONFLICTOS.has('qa')"),true);
  console.log("OK: stock vendido, catálogo, CAS de sesiones, inserción concurrente, errores de lectura, fallback de columna, auth, cola de guardado y 409 sin perder progreso.");
})().catch(e=>{console.error(e);process.exitCode=1;});
