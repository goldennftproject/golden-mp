'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{stripTypeScriptTypes}=require('node:module'),crypto=require('node:crypto');
const root=process.cwd(),saveSource=fs.readFileSync('public/game/save.js','utf8');
const edgeSource=stripTypeScriptTypes(fs.readFileSync('supabase/functions/usdt/index.ts','utf8')).replace(/^import .*;\s*$/gm,'');
const TX='0x'+'a'.repeat(64),HASH='0x'+'b'.repeat(64),SENDER='0x'+'3'.repeat(40);
const copy=v=>structuredClone(v);
async function backend(){
 const protocol=await import('../supabase/functions/usdt/protocol.mjs');
 const {DESTINATION,TOKEN,TRANSFER}=protocol,topic=a=>'0x'+a.slice(2).padStart(64,'0');
 const state={farm:{version:'v1',data:{golden:0,marker:'preserve'}},order:null,credited:false,credits:0,prepares:0,calls:[],enabled:true,dropsVerify:0,dropsClaim:0};
 const chain={head:100,payment:false,amount:10000001000000000000n,time:Math.floor(Date.now()/1000)+60,badProof:false,failRPC:false,reads:0};
 function log(){return {address:TOKEN,topics:[TRANSFER,topic(SENDER),topic(DESTINATION)],data:'0x'+chain.amount.toString(16).padStart(64,'0'),transactionHash:TX,blockNumber:'0x96',blockHash:HASH,logIndex:'0x1'};}
 async function rpc(url,method,params){
  chain.reads++;
  if(chain.failRPC)throw Error('RPC unavailable');
  if(method==='eth_chainId')return '0x38';
  if(method==='eth_blockNumber')return '0x'+chain.head.toString(16);
  if(method==='eth_call')return '0x12';
  if(method==='eth_getBlockByNumber')return params[0]==='finalized'?{number:'0x'+(chain.head-10).toString(16)}:{hash:HASH,timestamp:'0x'+chain.time.toString(16)};
  if(method==='eth_getLogs'){
   if(url.includes('drpc.org'))throw Error('provider limit');
   return chain.payment&&BigInt(params[0].fromBlock)<=150n&&BigInt(params[0].toBlock)>=150n?[log()]:[];
  }
  if(method==='eth_getTransactionReceipt')return chain.payment?{status:'0x1',blockNumber:'0x96',blockHash:HASH,transactionHash:TX,from:SENDER,to:TOKEN,logs:[log()]}:null;
  if(method==='eth_getTransactionByHash')return chain.payment?{hash:TX,blockHash:HASH,from:SENDER,to:chain.badProof?DESTINATION:TOKEN,input:'0xa9059cbb'+DESTINATION.slice(2).padStart(64,'0')+chain.amount.toString(16).padStart(64,'0')}:null;
  throw Error('Unexpected RPC '+method);
 }
 const admin={auth:{getUser:async token=>token==='qa'?{data:{user:{id:'qa'}}}:{error:{}}},rpc:async(name,p)=>{
  assert.equal(p.p_uid,'qa');
  if(name==='usdt_intento')return {data:null};
  if(name==='usdt_wallet')return {data:{ok:true,credited:state.credited&&p.p_address===TX}};
  if(name==='usdt_order'){
   if(p.p_action==='estado')return {data:{ok:true,deposits:state.enabled,orders:state.order?[copy(state.order)]:[],history:state.credited?[{tx:TX,golden:10.000001}]:[]}};
   if(p.p_action==='create'){
    if(!state.order)state.order={id:crypto.randomUUID(),start_block:p.p_block,scan_block:p.p_block,amount_wei:'10000001000000000000',amount:'10.000001',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+1800000).toISOString(),tx:null};
    return {data:{ok:true,order:copy(state.order)}};
   }
   if(!state.order||p.p_id!==state.order.id)return {data:{error:'Wrong order'}};
   if(p.p_action==='advance')state.order.scan_block=p.p_block;
   return {data:{ok:true,order:copy(state.order)}};
  }
  if(name==='usdt_prepare_order'){
   state.prepares++;Object.assign(state.order,{verified_tx:p.p_tx,verified_address:p.p_address,verified_block:p.p_block,verified_hash:p.p_hash,verified_log:p.p_log,verified_time:p.p_time,verified_at:new Date().toISOString()});
   return {data:{ok:true,verified:true,tx:p.p_tx}};
  }
  if(name==='usdt_credit_order'){
   if(state.credited)return {data:{ok:true,repetido:true,cobro:10.000001,data:copy(state.farm.data),updated_at:state.farm.version}};
   if(p.p_base!==state.farm.version)return {data:{error:'stale version',conflict:true}};
   assert.equal(p.p_amount,state.order.amount_wei);assert.equal(p.p_tx,TX);
   state.credited=true;state.credits++;state.order.tx=TX;state.farm.data.golden+=10.000001;state.farm.version='credited';
   return {data:{ok:true,cobro:10.000001,data:copy(state.farm.data),updated_at:state.farm.version}};
  }
  throw Error('Unexpected DB RPC '+name);
 }};
 let handle;
 const context=vm.createContext({Request,Response,Promise,JSON,Number,String,Math,Error,console,createClient:()=>admin,DESTINATION,TOKEN,RPCS:protocol.RPCS,DepositError:protocol.DepositError,rpcCall:rpc,findOrderPayment:o=>protocol.findOrderPayment(o,rpc),verifyDeposit:(tx,o)=>protocol.verifyDeposit(tx,o,rpc),Deno:{env:{get:()=>''},serve:f=>handle=f}});
 vm.runInContext(edgeSource,context);
 async function invoke(name,{body}){
  assert.equal(name,'usdt');state.calls.push(body.usdt.accion);
  const response=await handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer qa'},body:JSON.stringify(body)}));
  const data=await response.json();
  if(body.usdt.accion==='verify'&&state.dropsVerify-->0&&data.verified)throw Error('Response lost after durable verify');
  if(body.usdt.accion==='claim'&&state.dropsClaim-->0&&data.ok)throw Error('Response lost after credit commit');
  return response.ok?{data}:{error:{context:{status:response.status,json:async()=>data}}};
 }
 return {state,chain,invoke,DESTINATION};
}
function client(b){
 const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':saveSource.replace('window.SAVE_READY = initSave();','')});
 const doc=new JSDOM(fs.readFileSync('public/index.html','utf8')).window.document,run=s=>vm.runInContext(s,c),queue=[],messages=[],control={saveOK:true};
 c.document=doc;c.$=id=>doc.getElementById(id);c.crypto=crypto.webcrypto;c.conTope=p=>p;
 c.setTimeout=f=>{queue.push(f);return queue.length;};c.clearTimeout=()=>{};
 c.toast=t=>messages.push(t);c.usdtMensaje=t=>{messages.push(t);const el=doc.getElementById('usdt-message');if(el)el.textContent=t;};
 c.refreshHud=()=>{};c.isOpen=()=>false;c.mercadoBloquearPantalla=()=>()=>{};c.mercadoMarcarPendiente=()=>{};c.mercadoLimpiarPendiente=()=>{};c.copiaGuardar=()=>{};c.snapshot=()=>({});
 c.hydrate=d=>run('G.golden='+JSON.stringify(d.golden));
 c.SB_TEST={functions:{invoke:b.invoke}};run("sb=SB_TEST;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;");
 c.saveFarm=async()=>{if(control.saveOK)run("SAVE_CONFIRMACIONES.set(UID,(SAVE_CONFIRMACIONES.get(UID)||0)+1);SAVE_BASES.set(UID,"+JSON.stringify(b.state.farm.version)+");");};
 async function flush(){let n=0;while(queue.length){assert(++n<20,'retry loop');await queue.shift()();await Promise.resolve();}}
 async function create(){
  await c.usdtConsultar(true);doc.getElementById('usdt-amount').value='10';await c.usdtCrearSolicitud();
  assert(b.state.order);assert.equal(doc.getElementById('usdt-exact').value,'10.000001');
  assert.equal(b.state.credits,0);
 }
 async function check(hash=false){if(hash)doc.getElementById('usdt-tx').value=TX;await c.usdtComprobar();}
 return {c,run,doc,queue,messages,control,flush,create,check};
}
(async()=>{
 // Complete creation -> no payment yet -> external transfer fixture -> discovery -> two-RPC proof -> credit.
 const happy=await backend(),a=client(happy);await a.create();
 happy.chain.head=100;await a.check();assert.equal(happy.state.prepares,0);assert.equal(happy.state.credits,0);
 happy.chain.payment=true;happy.chain.head=400;await a.check();assert.equal(happy.state.credits,1,JSON.stringify({calls:happy.state.calls,messages:a.messages,order:happy.state.order}));assert.equal(happy.state.farm.data.golden,10.000001);assert.equal(happy.state.farm.data.marker,'preserve');
 assert(happy.state.calls.includes('verify')&&happy.state.calls.includes('claim'));await a.check(true);assert.equal(happy.state.credits,1,'repeated check duplicated Golden');
 // A farm conflict cannot stop verification or erase its receipt. A fresh session settles automatically.
 const conflict=await backend(),b=client(conflict);await b.create();conflict.chain.head=400;conflict.chain.payment=true;b.run("SAVE_CONFLICTOS.add(UID)");
 await b.check(true);assert(conflict.state.order.verified_tx);assert.equal(conflict.state.credits,0);await b.flush();
 conflict.chain.failRPC=true;const reconnected=client(conflict);await reconnected.c.usdtConsultar(true);await reconnected.flush();assert.equal(conflict.state.credits,1,'reconnect did not settle saved receipt');
 // Dropped verification response: receipt survives on server and is recovered without re-reading chain.
 const lostVerify=await backend(),d=client(lostVerify);await d.create();lostVerify.chain.head=400;lostVerify.chain.payment=true;lostVerify.state.dropsVerify=1;
 await d.check(true);assert(lostVerify.state.order.verified_tx);assert.equal(lostVerify.state.credits,0);lostVerify.chain.failRPC=true;
 const d2=client(lostVerify);await d2.c.usdtConsultar(true);await d2.flush();assert.equal(lostVerify.state.credits,1);
 // Save ACK missing after successful verification: keep receipt, then retry after a later accepted save.
 const saveFailure=await backend(),e=client(saveFailure);await e.create();saveFailure.chain.head=400;saveFailure.chain.payment=true;e.control.saveOK=false;await e.check(true);
 assert(saveFailure.state.order.verified_tx);assert.equal(saveFailure.state.credits,0);
 e.control.saveOK=true;e.run('USDT_REINTENTO_AT=0');e.c.usdtProgramarPendiente();await e.flush();assert.equal(saveFailure.state.credits,1);
 // Dropped credit ACK: retry uses same transaction and returns accepted receipt, never double credit.
 const lostCredit=await backend(),f=client(lostCredit);await f.create();lostCredit.chain.head=400;lostCredit.chain.payment=true;lostCredit.state.dropsClaim=1;await f.check(true);
 assert.equal(lostCredit.state.credits,1);assert.equal(lostCredit.state.farm.data.golden,10.000001);
 // Pending confirmations and wrong amounts cannot create a verified receipt.
 const invalid=await backend(),g=client(invalid);await g.create();invalid.chain.payment=true;invalid.chain.head=200;await g.check(true);assert.equal(invalid.state.prepares,0);
 invalid.chain.head=400;invalid.chain.amount+=1n;await g.check(true);assert.equal(invalid.state.prepares,0);assert.equal(invalid.state.credits,0);
 const beforeCalls=invalid.state.calls.length;g.run('CARGA_OK=false;');await g.check(true);assert.equal(invalid.state.calls.length,beforeCalls,'unloaded session called server');
 console.log('OK FULL FLOW: real client + Edge + chain verifier; create, search with provider failure, confirmations, durable receipt, save conflict, reconnect, dropped verify/credit responses, no ACK, idempotency and wrong amount.');
})().catch(e=>{console.error(e);process.exitCode=1;});
