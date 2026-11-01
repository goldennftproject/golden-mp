const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/usdt/index.ts','utf8')).replace(/^import .*;\s*$/gm,'');
class DepositError extends Error{constructor(m,status=400){super(m);this.status=status;}}
(async()=>{
 let handle,credits=0,checks=0,enabled=false,prior=false,finds=0;
 const id='11111111-1111-4111-8111-111111111111',tx='0x'+'a'.repeat(64),order={id,amount_wei:'10000001000000000000',amount:'10.000001',start_block:1};
 const admin={auth:{getUser:async t=>t==='qa'?{data:{user:{id:'qa'}}}:{error:{}}},rpc:async(name,p)=>{
  assert.equal(p.p_uid,'qa');
  if(name==='usdt_intento')return {data:null};
  if(name==='usdt_prepare_order'){Object.assign(order,{verified_tx:p.p_tx,verified_address:p.p_address,verified_block:p.p_block,verified_hash:p.p_hash,verified_log:p.p_log,verified_time:p.p_time});return {data:{ok:true,verified:true,tx:p.p_tx}};}
  if(name==='usdt_credit_order'){credits++;assert.equal(p.p_id,id);return {data:{ok:true,cobro:10.000001,data:{golden:10.000001},updated_at:'v2'}};}
  if(name==='usdt_wallet'){assert.equal(p.p_action,'receipt');return {data:{ok:true,credited:prior}};}
  assert.equal(name,'usdt_order');
  if(p.p_action==='estado')return {data:{ok:true,deposits:enabled,orders:[]}};
  if(p.p_action==='check')checks++;
  if(p.p_action==='find_check')finds++;
  return {data:{ok:true,order}};
 }};
 const c={Request,Response,Promise,JSON,Number,String,Math,Error,DepositError,DESTINATION:'0x'+'1'.repeat(40),TOKEN:'0x'+'2'.repeat(40),RPCS:['one','two'],rpcCall:async(u,m)=>m==='eth_chainId'?'0x38':'0xa',findOrderPayment:async()=>({tx,scanned:10}),verifyDeposit:async()=>({block:11,hash:'hash',logIndex:0,amount:order.amount_wei,address:'0x'+'3'.repeat(40),time:123}),createClient:()=>admin,Deno:{env:{get:()=>''},serve:f=>handle=f}};
 vm.createContext(c);vm.runInContext(source,c);
 const call=(usdt,cuenta='qa',token='qa')=>handle(new Request('https://qa.invalid',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({cuenta,usdt,base:'v1'})}));
 assert.equal((await call({accion:'estado'},'qa','bad')).status,401);assert.equal((await call({accion:'estado'},'otra')).status,409);
 for(const accion of ['retirar','bind','challenge'])assert.equal((await call({accion})).status,400);
 const claim={accion:'claim',order:id,tx};
 assert.equal((await call(claim)).status,400);assert.equal(credits,0);
 enabled=true;
 assert.equal((await call({accion:'create',amount:10})).status,200);
 assert.equal((await call({accion:'create',amount:10.3})).status,400);
 assert.equal((await call({accion:'create',amount:0})).status,400);
 assert.equal((await call({accion:'claim',order:'bad',tx})).status,400);
 assert.equal((await call({accion:'find',order:id})).status,200);assert.equal(finds,1);
 assert.equal((await call(claim)).status,200);assert.equal(credits,1);assert.equal(checks,1);
 prior=true;enabled=false;c.verifyDeposit=()=>{throw Error('No recheck for accepted receipt');};
 assert.equal((await call(claim)).status,200);assert.equal(checks,1);
 console.log('OK Edge: identity, order creation, no bind/sign, deposits gate, independent find/claim limits, disabled withdrawals and idempotent retry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
