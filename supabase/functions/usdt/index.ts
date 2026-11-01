import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {DESTINATION,TOKEN,RPCS,rpcCall,verifyDeposit,findOrderPayment,DepositError} from './protocol.mjs';
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
  async function order(action:string,extra={}){
   const {data,error}=await admin.rpc('usdt_order',{p_uid:uid,p_action:action,...extra});
   if(error)throw new DepositError('No se pudo consultar la solicitud de recarga',503);
   if(!data?.ok)throw new DepositError(data?.error||'Solicitud no válida');
   return data;
  }
  if(action==='estado')return json({...await order('estado'),destination:DESTINATION,token:TOKEN,chain:56,rate:1,withdrawals:false,min:1,max:10000,mode:'exact_amount'});
  if(action==='create'){
   const amount=b.usdt.amount;
   if(!Number.isSafeInteger(amount)||amount<1||amount>10000)return json({error:'Elige entre 1 y 10.000 Golden enteros'},400);
   const heads=await Promise.all(RPCS.map(async url=>{if(await rpcCall(url,'eth_chainId')!=='0x38')throw new DepositError('Red incorrecta',503);return Number(BigInt(await rpcCall(url,'eth_blockNumber')));}));
   return json(await order('create',{p_golden:amount,p_block:Math.max(...heads)}));
  }
  if(action==='find'||action==='claim'){
   const id=String(b.usdt.order||'');
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return json({error:'Selecciona tu solicitud de recarga'},400);
   const o=(await order('get',{p_id:id})).order;
   let tx=String(b.usdt.tx||o.tx||'').toLowerCase();
   const prior=tx&&/^0x[0-9a-f]{64}$/.test(tx)?await wallet('receipt',{p_address:tx}):{credited:false};
   if(!prior.credited){
    if(!(await order('estado')).deposits)return json({error:'Depósitos cerrados. No envíes fondos.'},400);
    await order(action==='find'?'find_check':'check',{p_id:id});
   }
   if(action==='find'){
    if(!tx){
     let found;
     try{found=await findOrderPayment(o);}catch(e){return json({error:'La búsqueda no está disponible. Pega el identificador de la transacción para comprobar el mismo pago.',manual:true},503);}
     tx=found.tx||'';
     if(!tx){await order('advance',{p_id:id,p_block:found.scanned});return json({ok:true,pending:true,message:'No se encontró el pago en el tramo revisado. Puedes volver a buscar o pegar la transacción. No repitas el envío.'});}
    }
    return json({ok:true,tx});
   }
   if(!/^0x[0-9a-f]{64}$/.test(tx))return json({error:'Identificador de transacción inválido'},400);
   if(!prior.credited){attemptAdmin=admin;attemptUid=uid;attemptTx=tx;}
   const v=prior.credited?{block:null,hash:null,logIndex:null,amount:null,address:null,time:null}:await verifyDeposit(tx,o);
   const {data,error}=await admin.rpc('usdt_credit_order',{p_uid:uid,p_base:b.base,p_id:id,p_tx:tx,p_address:v.address,p_block:v.block,p_hash:v.hash,p_log:v.logIndex,p_amount:v.amount,p_time:v.time});
   if(error)throw new DepositError('No se pudo confirmar la acreditación; comprueba el mismo pago sin repetirlo',503);
   if(!data?.ok){await record('error',data?.error||'No se pudo acreditar');return json({error:data?.error||'No se pudo acreditar'},data?.conflict?409:400);}
   await record('acreditado','Depósito por importe exclusivo confirmado');
   return json(data);
  }
  return json({error:'Acción no permitida; retiros desactivados'},400);
 }catch(e){const status=e instanceof DepositError?e.status:503,message=e instanceof DepositError?e.message:'No se pudo verificar; no envíes otro pago';await record(status===425?'pendiente':'error',message);return json({error:message},status);}
});
