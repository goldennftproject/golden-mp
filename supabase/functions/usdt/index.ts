import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {verifyMessage,getAddress} from 'npm:ethers@6.15.0';
import {DESTINATION,TOKEN,RPCS,rpcCall,verifyDeposit,DepositError} from './protocol.mjs';
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 let attemptAdmin:any=null,attemptUid:string|null=null,attemptTx:string|null=null;
 async function record(state:string,detail:string){if(attemptAdmin&&attemptUid&&attemptTx){try{await attemptAdmin.rpc('usdt_intento',{p_uid:attemptUid,p_tx:attemptTx,p_state:state,p_detail:detail});}catch{console.warn('No se pudo registrar diagnóstico USDT');}}}
 try{
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!jwt)return json({error:'Sin sesión'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:u,error:e}=await admin.auth.getUser(jwt);if(e||!u?.user)return json({error:'Sesión inválida'},401);
  const uid=u.user.id,b=await req.json();if(b.cuenta!==uid)return json({error:'La sesión cambió de cuenta'},409);
  const action=b.usdt?.accion;
  async function wallet(action:string,extra={}){const {data,error}=await admin.rpc('usdt_wallet',{p_uid:uid,p_action:action,...extra});if(error)throw new DepositError('No se pudo consultar o vincular la wallet',503);if(!data?.ok)throw new DepositError(data?.error||'Operación no válida');return data;}
  if(action==='estado')return json({...await wallet('estado'),destination:DESTINATION,token:TOKEN,chain:56,rate:1,withdrawals:false,min:1,max:10000});
  if(action==='challenge'){
   let address;try{address=getAddress(b.usdt.address).toLowerCase();}catch{return json({error:'Dirección inválida'},400);}
   if(address===DESTINATION)return json({error:'La wallet receptora del juego no puede vincularse a un jugador'},400);
   return json(await wallet('challenge',{p_address:address}));
  }
  if(action==='bind'){
   const proof=await wallet('proof',{p_nonce:b.usdt.nonce});
   let signer;try{signer=verifyMessage(proof.message,b.usdt.signature).toLowerCase();}catch{return json({error:'Firma inválida'},400);}
   if(signer!==proof.address)return json({error:'La firma no pertenece a esa wallet'},400);
   const heads=await Promise.all(RPCS.map(async url=>{if(await rpcCall(url,'eth_chainId')!=='0x38')throw new DepositError('Red incorrecta',503);return Number(BigInt(await rpcCall(url,'eth_blockNumber')));}));
   return json(await wallet('bind',{p_nonce:b.usdt.nonce,p_block:Math.max(...heads)}));
  }
  if(action==='claim'){
   const tx=String(b.usdt.tx||'').toLowerCase();
   if(!/^0x[0-9a-f]{64}$/.test(tx))return json({error:'Identificador de transacción inválido'},400);
   const prior=await wallet('receipt',{p_address:tx});
   if(!prior.credited&&!(await wallet('estado')).deposits)return json({error:'Los depósitos todavía no están abiertos; no envíes fondos'},400);
   const w=await wallet(prior.credited?'estado':'check');
   if(!prior.credited){attemptAdmin=admin;attemptUid=uid;attemptTx=tx;}
   const v=prior.credited?{block:null,hash:null,logIndex:null,amount:null}:await verifyDeposit(tx,w);
   const {data,error}=await admin.rpc('usdt_credit',{p_uid:uid,p_base:b.base,p_tx:tx,p_address:w.address,p_block:v.block,p_hash:v.hash,p_log:v.logIndex,p_amount:v.amount});
   if(error)throw new DepositError('No se pudo confirmar la acreditación; consulta de nuevo sin repetir el pago',503);
   if(!data?.ok){await record('error',data?.error||'No se pudo acreditar');return json({error:data?.error||'No se pudo acreditar'},data?.conflict?409:400);}
   await record('acreditado','Depósito acreditado; recibo financiero confirmado');
   return json(data);
  }
  return json({error:'Acción no permitida; retiros desactivados'},400);
 }catch(e){const status=e instanceof DepositError?e.status:503,message=e instanceof DepositError?e.message:'No se pudo verificar; no envíes otro pago';await record(status===425?'pendiente':'error',message);return json({error:message},status);}
});
