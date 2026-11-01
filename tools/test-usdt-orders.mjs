import assert from 'node:assert/strict';
import {inspectDeposit,verifyDeposit,findOrderPayment,TOKEN,DESTINATION,TRANSFER} from '../supabase/functions/usdt/protocol.mjs';
const tx='0x'+'a'.repeat(64),hash='0x'+'b'.repeat(64),sender='0x'+'3'.repeat(40),topic=a=>'0x'+a.slice(2).padStart(64,'0');
const amount=10000001000000000000n;
const order={start_block:50,scan_block:50,amount_wei:String(amount),created_at:'2026-11-01T12:00:00Z',expires_at:'2026-11-01T12:30:00Z'};
const timestamp=Math.floor(Date.parse('2026-11-01T12:10:00Z')/1000);
function fixture(change=()=>{}){
 const log={address:TOKEN,topics:[TRANSFER,topic(sender),topic(DESTINATION)],data:'0x'+amount.toString(16).padStart(64,'0'),transactionHash:tx,blockNumber:'0x64',blockHash:hash,logIndex:'0x1'};
 const receipt={status:'0x1',blockNumber:'0x64',blockHash:hash,transactionHash:tx,from:sender,to:TOKEN,logs:[log]};
 const transaction={hash:tx,blockHash:hash,from:sender,to:TOKEN,input:'0xa9059cbb'+DESTINATION.slice(2).padStart(64,'0')+amount.toString(16).padStart(64,'0')};
 const meta={chain:'0x38',head:'0x200',final:'0x190',hash,time:timestamp,decimals:'0x12'};change(receipt,transaction,meta,log);
 return async(method,params)=>{
  if(method==='eth_getLogs'){assert.equal(params[0].address,TOKEN);return [log];}
  if(method==='eth_getBlockByNumber')return params[0]==='finalized'?{number:meta.final}:{hash:meta.hash,timestamp:'0x'+meta.time.toString(16)};
  return {eth_chainId:meta.chain,eth_getTransactionReceipt:receipt,eth_getTransactionByHash:transaction,eth_blockNumber:meta.head,eth_call:meta.decimals}[method];
 };
}
const result=await inspectDeposit(fixture(),tx,order);assert.equal(result.address,sender);assert.equal(result.amount,String(amount));assert.equal(result.time,timestamp);
for(const change of [
 (r,t,m)=>m.chain='0x1',(r,t,m)=>m.decimals='0x6',(r,t,m)=>m.time=timestamp+3600,
 (r,t,m)=>m.time=timestamp-3600,(r,t)=>t.from=DESTINATION,(r,t)=>t.to=DESTINATION,
 (r,t)=>t.input=t.input.slice(0,74)+(amount+1n).toString(16).padStart(64,'0'),
 (r,t,m)=>m.head='0x65',(r,t,m)=>m.final='0x60',(r,t,m)=>m.hash=tx,r=>r.status='0x0',
 r=>r.logs[0].topics[2]=topic(sender),r=>r.logs[0].removed=true,r=>r.logs.push(r.logs[0])
])await assert.rejects(()=>inspectDeposit(fixture(change),tx,order));
const payment=await findOrderPayment(order,async(u,m,p)=>fixture()(m,p));assert.equal(payment.tx,tx);assert.equal(payment.scanned,393);
let first;await assert.rejects(()=>verifyDeposit(tx,order,async(u,m,p)=>{first??=u;return fixture((r,t,meta)=>{if(u!==first)meta.time++;})(m,p);}));
let logsCalls=0;
const empty=await findOrderPayment(order,async(u,m,p)=>{if(m==='eth_getLogs'){logsCalls++;assert(BigInt(p[0].toBlock)-BigInt(p[0].fromBlock)<2000n);return [];}return fixture()(m,p);});
assert.equal(empty.tx,null);assert.equal(logsCalls,2);
console.log('OK: exact fractional payment, arbitrary sender, timing, 120 confirmations, finality, two nodes, bounded discovery and mismatch rejection.');

const fallback=await findOrderPayment(order,async(u,m,p)=>{if(u.includes('drpc.org'))throw Error('provider unavailable');return fixture()(m,p);});
assert.equal(fallback.tx,tx,'one failed discovery provider must not prevent independent receipt verification');
await assert.rejects(()=>findOrderPayment(order,async()=>{throw Error('all unavailable');}));
let pages=0;
const paged=await findOrderPayment(order,async(u,m,p)=>{if(m==='eth_blockNumber')return '0xffff';if(m==='eth_getBlockByNumber'&&p[0]==='finalized')return {number:'0xff00'};if(m==='eth_getLogs'){pages++;return [];}return fixture()(m,p);});
assert.equal(pages,6);assert.equal(paged.scanned,6050,'one click scans at most 6000 blocks');
