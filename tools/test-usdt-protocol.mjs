import assert from 'node:assert/strict';
import {Wallet,verifyMessage,id,getAddress} from 'ethers';
import {inspectDeposit,verifyDeposit,DESTINATION,TOKEN,TRANSFER} from '../supabase/functions/usdt/protocol.mjs';
const wallet=Wallet.createRandom(),address=wallet.address.toLowerCase(),tx='0x'+'a'.repeat(64),hash='0x'+'b'.repeat(64);
assert.equal(getAddress(DESTINATION),'0x4Abb7580EaC480203f4ce8890674A29519DD9139');
assert.equal(TRANSFER,id('Transfer(address,address,uint256)'));
const message='Golden Farm\nCuenta: qa\nNonce: '+crypto.randomUUID(),sig=await wallet.signMessage(message);
assert.equal(verifyMessage(message,sig).toLowerCase(),address);assert.notEqual(verifyMessage(message+'x',sig).toLowerCase(),address);
const topic=a=>'0x'+a.slice(2).padStart(64,'0'),amount=10n*10n**18n;
const receipt={status:'0x1',blockNumber:'0x64',blockHash:hash,transactionHash:tx,from:address,to:TOKEN,logs:[{address:TOKEN,topics:[TRANSFER,topic(address),topic(DESTINATION)],data:'0x'+amount.toString(16).padStart(64,'0'),logIndex:'0x1'}]};
const transaction={hash,blockHash:hash,from:address,to:TOKEN,input:'0xa9059cbb'+DESTINATION.slice(2).padStart(64,'0')+amount.toString(16).padStart(64,'0')};transaction.hash=tx;
function fixture(change=()=>{}){
 const r=structuredClone(receipt),t=structuredClone(transaction),meta={chain:'0x38',head:'0x200',finalized:'0x190',canonical:hash,decimals:'0x12'};change(r,t,meta);
 return async(method,params)=>({eth_chainId:meta.chain,eth_getTransactionReceipt:r,eth_getTransactionByHash:t,eth_blockNumber:meta.head,eth_call:meta.decimals})[method]??(method==='eth_getBlockByNumber'?(params[0]==='finalized'?{number:meta.finalized}:{hash:meta.canonical}):null);
}
const w={address,start_block:50};const valid=await inspectDeposit(fixture(),tx,w);assert.equal(valid.amount,amount.toString());
for(const change of [
 (r,t,m)=>m.chain='0x1',(r,t,m)=>m.decimals='0x6',r=>r.status='0x0',r=>r.from=DESTINATION,
 (r,t)=>t.from=DESTINATION,(r,t)=>t.to=DESTINATION,(r,t)=>t.hash=hash,
 (r,t)=>t.input='0x',(r,t)=>t.input=t.input.slice(0,10)+'0'.repeat(64)+t.input.slice(74),
 r=>r.logs[0].address=DESTINATION,r=>r.logs[0].topics[1]=topic(DESTINATION),r=>r.logs[0].data='0x'+'0'.repeat(64),
 r=>r.logs[0].removed=true,r=>r.logs.push(r.logs[0]),(r,t,m)=>m.canonical=tx,
 (r,t,m)=>m.head='0x65',(r,t,m)=>m.finalized='0x60',
 (r,t)=>t.input=t.input.slice(0,74)+(amount+1n).toString(16).padStart(64,'0')
])await assert.rejects(()=>inspectDeposit(fixture(change),tx,w));
await assert.rejects(()=>inspectDeposit(fixture(),tx,{...w,start_block:100}));
await assert.rejects(()=>inspectDeposit(fixture(),'bad',w));
const double=await verifyDeposit(tx,w,async(url,m,p)=>fixture()(m,p));assert.deepEqual(double,valid);
let first;await assert.rejects(()=>verifyDeposit(tx,w,async(url,m,p)=>{first??=url;return fixture((r,t)=>{if(url!==first)r.logs[0].logIndex='0x2';})(m,p);}));
console.log('OK USDT: firma, checksum, token, red, remitente, destino, importe exacto, recibo, bloque canónico, finalidad, confirmaciones y desacuerdo entre nodos. Sin pagos reales.');
