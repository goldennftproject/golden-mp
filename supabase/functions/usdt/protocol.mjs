export const DESTINATION='0x4abb7580eac480203f4ce8890674a29519dd9139';
export const TOKEN='0x55d398326f99059ff775485246999027b3197955';
export const RPCS=['https://bsc-dataseed.bnbchain.org','https://bsc-dataseed.defibit.io'];
export const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const lower=x=>String(x||'').toLowerCase();
export class DepositError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export async function rpcCall(url,method,params=[]){
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new DepositError('La red no responde; no envíes otro pago',503);
 const j=await r.json();if(j.error)throw new DepositError('No se pudo verificar la red; vuelve a comprobar más tarde',503);return j.result;
}
export async function inspectDeposit(call,tx,wallet){
 if(!/^0x[0-9a-f]{64}$/.test(tx))throw new DepositError('Identificador de transacción inválido');
 const [chain,receipt,transaction,head,finalized,decimals]=await Promise.all([
  call('eth_chainId'),call('eth_getTransactionReceipt',[tx]),call('eth_getTransactionByHash',[tx]),call('eth_blockNumber'),call('eth_getBlockByNumber',['finalized',false]),call('eth_call',[{to:TOKEN,data:'0x313ce567'},'latest'])
 ]);
 if(chain!=='0x38'||BigInt(decimals)!==18n)throw new DepositError('Red o token no válidos',503);
 if(!receipt||!transaction)throw new DepositError('Transacción todavía no encontrada; espera y vuelve a comprobar',425);
 if(receipt.status!=='0x1')throw new DepositError('La transacción falló; no se acreditó Golden');
 const block=BigInt(receipt.blockNumber);
 if(block<=BigInt(wallet.start_block))throw new DepositError('El depósito debe ser posterior a la vinculación de tu wallet');
 if(!finalized||BigInt(finalized.number)<block||BigInt(head)-block+1n<120n)throw new DepositError('Esperando finalidad y 120 confirmaciones; vuelve a comprobar sin pagar otra vez',425);
 if(lower(transaction.from)!==wallet.address||lower(receipt.from)!==wallet.address||lower(transaction.to)!==TOKEN||lower(receipt.to)!==TOKEN||lower(transaction.hash)!==tx||lower(receipt.transactionHash)!==tx)throw new DepositError('El pago no procede de tu wallet vinculada al contrato USDT admitido');
 const input=lower(transaction.input);
 if(!/^0xa9059cbb[0-9a-f]{128}$/.test(input)||input.slice(10,74)!==DESTINATION.slice(2).padStart(64,'0'))throw new DepositError('Sólo se admiten transferencias directas de USDT al destino del juego');
 const amount=BigInt('0x'+input.slice(74));
 if(amount<10n**18n||amount>10000n*10n**18n||amount%(10n**18n)!==0n)throw new DepositError('El importe debe ser entero, entre 1 y 10.000 USDT');
 const logs=receipt.logs.filter(l=>lower(l.address)===TOKEN&&l.topics?.length===3&&lower(l.topics[0])===TRANSFER&&lower(l.topics[1])==='0x'+wallet.address.slice(2).padStart(64,'0')&&lower(l.topics[2])==='0x'+DESTINATION.slice(2).padStart(64,'0'));
 if(logs.length!==1||logs[0].removed||!/^0x[0-9a-fA-F]{64}$/.test(logs[0].data)||BigInt(logs[0].data)!==amount)throw new DepositError('No se encontró una transferencia USDT válida por ese importe');
 const canonical=await call('eth_getBlockByNumber',[receipt.blockNumber,false]);
 if(!canonical||lower(canonical.hash)!==lower(receipt.blockHash)||lower(transaction.blockHash)!==lower(receipt.blockHash))throw new DepositError('El bloque cambió; espera antes de comprobar de nuevo',425);
 const logIndex=Number(BigInt(logs[0].logIndex));if(!Number.isSafeInteger(logIndex)||logIndex<0)throw new DepositError('Comprobante inválido',503);
 return {block:Number(block),hash:lower(receipt.blockHash),logIndex,amount:amount.toString()};
}
export async function verifyDeposit(tx,wallet,call=rpcCall){
 const results=await Promise.all(RPCS.map(url=>inspectDeposit((m,p)=>call(url,m,p),tx,wallet)));
 if(JSON.stringify(results[0])!==JSON.stringify(results[1]))throw new DepositError('Los nodos no coinciden; no se acreditó nada, vuelve a comprobar',503);
 return results[0];
}
