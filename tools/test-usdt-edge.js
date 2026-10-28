const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module'),{Wallet,verifyMessage,getAddress}=require('ethers');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/usdt/index.ts','utf8')).replace(/^import .*;\s*$/gm,'');
class DepositError extends Error{constructor(m,status=400){super(m);this.status=status;}}
(async()=>{
 const w=Wallet.createRandom(),proof={ok:true,message:'Golden Farm - test nonce '+crypto.randomUUID(),address:w.address.toLowerCase()};let handle,credits=0,checks=0,enabled=false,prior=false;const diagnostics=[];
 const admin={auth:{getUser:async t=>t==='qa'?{data:{user:{id:'qa'}}}:{error:{}}},rpc:async(name,p)=>{
  if(name==='usdt_intento'){diagnostics.push(p);return {data:null,error:null};}
  if(name==='usdt_credit'){credits++;assert.equal(p.p_uid,'qa');return {data:{ok:true,cobro:10,data:{golden:10},updated_at:'v2'}};}
  assert.equal(name,'usdt_wallet');assert.equal(p.p_uid,'qa');
  if(p.p_action==='proof')return {data:proof};
  if(p.p_action==='estado')return {data:{ok:true,address:proof.address,start_block:1,deposits:enabled}};
  if(p.p_action==='receipt')return {data:{ok:true,credited:prior}};
  if(p.p_action==='check'){checks++;return {data:{ok:true,address:proof.address,start_block:1}};}
  if(p.p_action==='bind'){assert.equal(p.p_block,10);return {data:{ok:true}};}
  return {data:{ok:true}};
 }};
 const c={Request,Response,Promise,JSON,Number,String,Math,Error,DepositError,getAddress,verifyMessage,DESTINATION:'0x'+'1'.repeat(40),TOKEN:'0x'+'2'.repeat(40),RPCS:['one','two'],rpcCall:async(u,m)=>m==='eth_chainId'?'0x38':'0xa',verifyDeposit:async()=>({block:11,hash:'hash',logIndex:0,amount:'10000000000000000000'}),createClient:()=>admin,Deno:{env:{get:()=>''},serve:f=>handle=f}};
 vm.createContext(c);vm.runInContext(source,c);
 const call=(usdt,cuenta='qa',token='qa')=>handle(new Request('https://qa.invalid',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({cuenta,usdt,base:'v1'})}));
 assert.equal((await call({accion:'estado'},'qa','bad')).status,401);assert.equal((await call({accion:'estado'},'otra')).status,409);
 assert.equal((await call({accion:'retirar'})).status,400);assert.equal((await call({accion:'bind',nonce:'n',signature:await w.signMessage(proof.message+'x')})).status,400);
 assert.equal((await call({accion:'bind',nonce:'n',signature:await w.signMessage(proof.message)})).status,200);
 const claim={accion:'claim',tx:'0x'+'a'.repeat(64)};
 assert.equal((await call(claim)).status,400);assert.equal(credits,0);
 enabled=true;assert.equal((await call(claim)).status,200);assert.equal(credits,1);assert.equal(checks,1);
 assert.equal(diagnostics.length,1);assert.equal(diagnostics[0].p_state,'acreditado');assert.equal(diagnostics[0].p_uid,'qa');
 prior=true;enabled=false;c.verifyDeposit=()=>{throw Error('No debe consultar de nuevo la cadena para un recibo ya aceptado');};
 assert.equal((await call(claim)).status,200);assert.equal(checks,1);
 console.log('OK Edge USDT: sesión, identidad, firma, vinculación, cierre de depósitos, retiro bloqueado y reintento del recibo sin nueva consulta ni cuota.');
})().catch(e=>{console.error(e);process.exitCode=1;});
