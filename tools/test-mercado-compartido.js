"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const raiz=path.resolve(__dirname,"..");
const fuente=stripTypeScriptTypes(fs.readFileSync(path.join(raiz,"supabase/functions/mercado/index.ts"),"utf8")).replace(/^import .*createClient.*;\s*$/m,"");
async function edge() {
  let handle,calls=[],rpcError=null;
  const admin={auth:{getUser:async jwt=>jwt==="valido"?{data:{user:{id:"verificado"}}}:{error:{message:"invalid"}}},rpc:async(n,p)=>{calls.push({n,p});return{data:{ok:true},error:rpcError};}};
  vm.runInNewContext(fuente,{Response,Request,Date,JSON,Number,createClient:()=>admin,Deno:{env:{get:()=>"test"},serve:f=>handle=f}});
  const call=(body,jwt="valido")=>handle(new Request("https://qa.invalid/mercado",{method:"POST",headers:{Authorization:"Bearer "+jwt},body:JSON.stringify(body)}));
  assert.equal((await call({accion:"cotizar"},"falso")).status,401);assert.equal(calls.length,0);
  await call({accion:"cotizar",uid:"otro"});assert.equal(calls[0].p.p_uid,"verificado");
  const venta={accion:"vender",item:"papa",cantidad:1,moneda:"plata",minimo:2,base:new Date().toISOString(),op:crypto.randomUUID(),uid:"otro"};
  assert.equal((await call(venta)).status,200);assert.equal(calls[1].p.p_uid,"verificado");
  for(const mal of [{cantidad:0},{cantidad:10001},{cantidad:1.5},{minimo:-1},{moneda:"usdt"},{op:"duplicado"},{base:"sin fecha"}])assert.equal((await call({...venta,...mal})).status,400);
  rpcError={code:"P0001",message:"conflicto: otra sesión"};assert.equal((await call(venta)).status,409);
  rpcError={code:"P0001",message:"presupuesto: agotado"};assert.equal((await call(venta)).status,400);
  rpcError={code:"XX000",message:"detalle interno"};let r=await call(venta);assert.equal(r.status,503);assert.ok(!(await r.text()).includes("detalle interno"));
}
async function cliente(){
  const {ctx}=require("./arrancar-el-juego.contexto.js").arrancar(raiz),run=c=>vm.runInContext(c,ctx);
  await new Promise(resolve=>setImmediate(resolve));
  ctx.window.crypto={randomUUID:()=>crypto.randomUUID()};
  run("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;MERCADO_GLOBAL=true;SAVE_BASES.set(UID,'v1');copiaGuardar=()=>{};showSaving=()=>{};showSaved=()=>{};toast=()=>{};log=()=>{};refreshMarket=()=>{};refreshHud=()=>{};syncSlots=()=>{};refreshHotbar=()=>{};isOpen=()=>false;tutoEvent=()=>{};G.res.papa=30;G.plata=100;");
  function cotizar(){ctx.qaCot={recursos:{papa:{volumen:0,resto:0,demanda:100,disponible:400}},presupuesto:5000};run("MERCADO_CACHE={...qaCot,uid:UID,recibido:Date.now()};");}
  return{ctx,run,cotizar};
}
(async()=>{
  await edge();
  let {ctx,run,cotizar}=await cliente(),calls=[],resolver;
  ctx.qaSb={functions:{invoke:async(n,{body})=>{
    calls.push({n,body});if(n==="guardar")return{data:{ok:true,updated_at:"v2"}};
    if(body.accion==="cotizar")return{data:{ok:true,...ctx.qaCot}};
    return new Promise(resolve=>resolver=resolve);
  }}};run("sb=qaSb;");cotizar();
  const p=ctx.mercadoSistemaVender("papa",3,"plata");
  assert.equal(ctx.mercadoSistemaVender("papa",3,"plata"),p,"doble clic comparte operación");
  for(let n=0;n<20&&!resolver;n++)await Promise.resolve();
  assert.ok(resolver,"venta después del guardado confirmado: " + JSON.stringify(calls) + " " + run("JSON.stringify({base:SAVE_BASES.get(UID),acks:SAVE_CONFIRMACIONES.get(UID),conf:SAVE_CONFLICTOS.has(UID)})"));assert.equal(calls[0].n,"guardar");
  assert.equal(calls[1].body.base,"v2");assert.equal(ctx.G.res.papa,30,"sin débito especulativo");
  const pendiente=ctx.saveFarm(true);assert.equal(calls.filter(x=>x.n==="guardar").length,1,"autosave espera la transacción");
  resolver({data:{ok:true,cobro:6,updated_at:"v3",at:Date.now(),volumen:3,resto:0}});
  await p;await pendiente;assert.equal(ctx.G.res.papa,27);assert.equal(ctx.G.plata,106);
  for(const status of [400,409,503]){
    ({ctx,run,cotizar}=await cliente());let ventas=0,ops=[];
    ctx.qaSb={functions:{invoke:async(n,{body})=>{
      if(n==="guardar")return{data:{ok:true,updated_at:"v2"}};
      if(body.accion==="cotizar")return{data:{ok:true,...ctx.qaCot}};
      ventas++;ops.push(body.op);return{error:{context:{status,json:async()=>({error:"QA"})}}};
    }}};run("sb=qaSb;");cotizar();await ctx.mercadoSistemaVender("papa",3,"plata");
    assert.equal(ctx.G.res.papa,30);assert.equal(ctx.G.plata,100);
    assert.equal(ventas,status===503?2:1);assert.equal(run("SAVE_CONFLICTOS.has(UID)"),status!==400);
    assert.equal(ctx.mercadoPendiente("qa"),status!==400,"marca persistente protege recargas sin confirmar");
    if(status===503)assert.equal(ops[0],ops[1],"reintento con la misma idempotencia");
  }
  ({ctx,run,cotizar}=await cliente());
  const nube=JSON.parse(run("JSON.stringify(snapshot())"));nube.plata=80;nube.res.papa=27;
  ctx.qaCloud={data:nube,name:"QA",updated_at:"v4"};ctx.qaLocal={uid:"qa",nivel:1,plata:10000,data:{...nube,plata:10000,res:{...nube.res,papa:30}}};
  run("copiaLeer=()=>qaLocal;mercadoMarcarPendiente(UID,{op:'respuesta-perdida'});sb={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:qaCloud,error:null})})})})};");
  assert.equal(await ctx.loadFarm(),true);assert.equal(ctx.G.plata,80);assert.equal(ctx.G.res.papa,27,"recargar no resucita el stock de la copia previa");
  assert.equal(ctx.mercadoPendiente("qa"),false);assert.ok(run("localStorage.getItem(GF_APARCADA_KEY)"),"respaldo previo conservado aparte");
  console.log("OK: JWT verificado, parámetros, errores, flush previo, doble clic, autosave serializado, cobro confirmado, fallos sin débito y reintentos idempotentes.");
})().catch(e=>{console.error(e);process.exitCode=1;});
