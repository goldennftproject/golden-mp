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
 const s=server(),before=structuredClone(s.row());
 const quote=await s.call({banco:{accion:'cotizar'}});assert.equal(quote.status,200);assert.equal((await quote.json()).canje,false);
 for(const accion of ['canjear','depositar','retirar','usdt'])assert.equal((await s.call({base:s.row().updated_at,op,banco:{accion,golden:1,revision:'plata-golden:10000'}})).status,403);
 assert.equal((await s.call({cuenta:'otra',banco:{accion:'canjear'}})).status,409);
 assert.equal((await s.call({banco:{accion:'canjear'}},'bad')).status,401);
 s.setRate('1');assert.equal((await s.call({banco:{accion:'canjear',golden:1}})).status,403);
 assert.equal(s.writes(),0);assert.deepEqual(s.row(),before);
 console.log('OK Banco alfa: canje desactivado, sin débito/emisión, ni bypass por tasa, retiro o identidad.');
})().catch(e=>{console.error(e);process.exitCode=1;});
