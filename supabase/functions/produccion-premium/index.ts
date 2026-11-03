import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import { UUID, premiumDetalle, premiumColocacion } from './rules.ts';

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json','Cache-Control':'no-store'}});
const rpcError=(error: any)=>{
 const message=String(error?.message||''),conflicto=message.startsWith('conflicto:'),tasaCambio=message.startsWith('precio:');
 return json({error:conflicto?'Otra sesión guardó; sincroniza la granja antes de operar':error?.code==='P0001'?message:'No se pudo confirmar el nodo Golden',conflicto,tasaCambio},conflicto?409:tasaCambio?412:error?.code==='P0001'||String(error?.code||'').startsWith('22')?400:503);
};
Deno.serve(async(req: Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!jwt)return json({error:'Inicia sesión para operar'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:authError}=await admin.auth.getUser(jwt);
  if(authError||!u?.user||u.user.is_anonymous||!u.user.email_confirmed_at)return json({error:'Necesitas una cuenta de correo confirmada'},401);
  const text=await req.text();if(text.length>4000)return json({error:'Pedido demasiado grande'},400);
  let body:any,detail:any;try{body=JSON.parse(text);detail=premiumDetalle(body.produccionPremium);}catch(e){return json({error:e instanceof Error?e.message:'Pedido inválido'},400);}
  if(body.cuenta!==u.user.id)return json({error:'La sesión cambió de cuenta'},409);
  if(typeof body.base!=='string'||!Number.isFinite(Date.parse(body.base))||typeof body.op!=='string'||!UUID.test(body.op))return json({error:'Versión u operación inválida'},400);
  let placement=null;
  if(detail.accion==='colocar'){
   const {data:context,error}=await admin.rpc('gf_produccion_premium_contexto',{p_uid:u.user.id,p_op:body.op,p_detalle:detail});
   if(error)return rpcError(error);
   if(!context?.ok)return json({error:'No se pudo consultar tu granja'},503);
   if(context.repetido)return json(context);
   if(Date.parse(context.updated_at)!==Date.parse(body.base))return json({error:'Otra sesión guardó; sincroniza la granja antes de operar',conflicto:true},409);
   try{placement=premiumColocacion(context.data,detail);}catch(e){return json({error:e instanceof Error?e.message:'Emplazamiento inválido'},400);}
  }
  const {data,error}=await admin.rpc('gf_produccion_premium',{p_uid:u.user.id,p_base:body.base,p_op:body.op,p_detalle:detail,p_colocacion:placement});
  if(error)return rpcError(error);
  return data?.ok?json(data):json({error:'No se pudo confirmar el nodo Golden'},503);
 }catch{return json({error:'No se pudo contactar con el servidor de producción'},503);}
});
