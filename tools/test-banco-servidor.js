'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const repo=path.resolve(__dirname,'..'),source=stripTypeScriptTypes(fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8')).replace(/^import .*createClient.*;\s*$/m,'');
function server(){
 let handle,writes=0,rate,readError=false,writeError=false,row={user_id:'qa',name:'QA',updated_at:'2026-10-16T22:00:00.000Z',data:{plata:100000,golden:20.018518}};
 const admin={auth:{getUser:async token=>token==='qa'?{data:{user:{id:'qa'}}}:{error:{message:'invalid'}}},from:table=>{
  assert.equal(table,'farms');let mode='read',value,base;
  const q={select:()=>q,eq:(k,v)=>{if(k==='updated_at')base=v;return q;},update:v=>{value=v;mode='update';return q;},maybeSingle:async()=>{
   if(mode==='read'){const data=structuredClone(row);await Promise.resolve();return {data,error:readError?{message:'offline'}:null};}
   if(writeError)return {error:{message:'offline'}};
   if(base!==row.updated_at)return {data:null,error:null};
   row={...row,...structuredClone(value)};writes++;return {data:{updated_at:row.updated_at},error:null};
  }};return q;
 }};
 const ctx={Request,Response,Date,Math,JSON,Number,Object,Array,Set,String,isFinite,createClient:()=>admin,Deno:{env:{get:k=>k==='BANCO_PLATA_POR_GOLDEN'?rate:'unused'},serve:f=>handle=f}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,row:()=>row,writes:()=>writes,setRate:v=>rate=v,failRead:()=>readError=true,failWrite:()=>writeError=true,call:(body,token='qa')=>handle(new Request('https://qa.invalid/guardar',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({cuenta:'qa',...body})}))};
}
const op='11111111-1111-4111-8111-111111111111';
(async()=>{
 let s=server(),r=await s.call({banco:{accion:'cotizar'}}),quote=await r.json();assert.equal(r.status,200);assert.equal(quote.tasa,10000);assert.equal(quote.usdt,false);assert.equal(s.writes(),0);
 const request={base:s.row().updated_at,op,banco:{accion:'canjear',golden:2,revision:quote.revision}};
 const original=structuredClone(s.row());
 r=await s.call(request);assert.equal(r.status,200);assert.equal(s.row().data.plata,80000);assert.equal(s.row().data.golden,22.018518);assert.equal(s.writes(),1);
 s.setRate('12000');r=await s.call(request);assert.equal(r.status,200);assert.equal((await r.json()).repetido,true);assert.equal(s.writes(),1,'perder respuesta y cambiar tasa no duplica');
 r=await s.call({...request,op:crypto.randomUUID(),base:s.row().updated_at});assert.equal(r.status,412);assert.equal((await r.json()).tasaCambio,true);assert.equal(s.writes(),1);
 r=await s.call({banco:{accion:'cotizar'}});assert.equal((await r.json()).tasa,12000);
 for(const golden of [0,-1,1.5,1000001,'2',null])assert.equal((await s.call({...request,base:s.row().updated_at,op:crypto.randomUUID(),banco:{...request.banco,golden}})).status,400);
 for(const accion of ['depositar','retirar','usdt'])assert.equal((await s.call({...request,base:s.row().updated_at,op:crypto.randomUUID(),banco:{...request.banco,accion}})).status,400,'sin operaciones USDT');
 assert.equal((await s.call({...request,cuenta:'otra'})).status,409);assert.equal((await s.call(request,'bad')).status,401);
 assert.equal((await s.call({...request,base:s.row().updated_at,banco:{...request.banco,golden:3}})).status,400,'no reutiliza un recibo para otro importe');
 s=server();const base=s.row().updated_at;const concurrentes=await Promise.all([s.call({...request,base,op:crypto.randomUUID()}),s.call({...request,base,op:crypto.randomUUID()})]);assert.deepEqual(concurrentes.map(x=>x.status).sort(),[200,409]);assert.equal(s.writes(),1,'CAS entre dos pestañas');
 const normal=structuredClone(s.row().data);assert.ok(!s.ctx.protegerEconomia(s.row().data,normal,Date.now()).some(e=>/Golden|Banco/.test(e)),'guardado posterior válido');
 normal.banco.ops=[];assert.ok(s.ctx.protegerEconomia(s.row().data,normal,Date.now()).some(e=>/Banco/.test(e)),'no borra recibos desde cliente');
 s=server();r=await s.call({...request,banco:{...request.banco,golden:11}});assert.equal(r.status,400);assert.equal(s.writes(),0,'sin Plata no cambia nada');
 s=server();s.setRate('no-valido');assert.equal((await s.call({banco:{accion:'cotizar'}})).status,503);assert.equal(s.writes(),0,'configuración inválida falla cerrada');
 for(const type of ['failRead','failWrite']){s=server();s[type]();assert.equal((await s.call(request)).status,503);assert.equal(s.writes(),0);}
 assert.equal(original.data.plata,100000);
 console.log('OK: Banco real 10000 inicial, tasa ajustable, fracciones conservadas, cambio de tasa 412, CAS, idempotencia, identidad, validaciones y errores sin mutar saldo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
