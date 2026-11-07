import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
const CORS={"Access-Control-Allow-Origin":"https://goldenfarm.onrender.com","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!jwt)return json({error:'Sin sesión'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:u,error:authError}=await admin.auth.getUser(jwt);
  if(authError||!u?.user)return json({error:'Sesión inválida'},401);
  const raw=await req.text();if(raw.length>2000)return json({error:'Pedido demasiado grande'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Pedido inválido'},400);}
  if(body?.cuenta!==u.user.id)return json({error:'La sesión cambió de cuenta; recargá antes de operar'},409);
  if(body?.accion==='estado'){
   if(body.op!==undefined&&!uuid(body.op))return json({error:'Recibo inválido'},400);
   const {data,error}=await admin.rpc('gf_ruletas_estado',{p_uid:u.user.id,p_op:body.op??null});
   if(error)return json({error:error.code==='P0001'?error.message:'No se pudo consultar la ruleta'},error.code==='P0001'?400:503);
   return json(data);
  }
  if(!['girar','comprobar'].includes(body?.accion)||!['golden','objetos'].includes(body.modo)||!uuid(body.op)||typeof body.precioEsperado!=='number'||!Number.isFinite(body.precioEsperado)||![0,1,100,200].includes(body.precioEsperado)||body.accion==='girar'&&(typeof body.base!=='string'||!Number.isFinite(Date.parse(body.base))))return json({error:'Pedido de giro inválido'},400);
  const params={p_uid:u.user.id,p_op:body.op,p_modo:body.modo,p_precio_esperado:body.precioEsperado};
  const {data,error}=body.accion==='comprobar'?await admin.rpc('gf_ruletas_reconciliar',params):await admin.rpc('gf_ruletas_girar',{...params,p_base:body.base});
  if(error){
   const conflict=/^conflicto:/i.test(error.message||''),priceChanged=/^precio:/i.test(error.message||'');
   return json({error:error.code==='P0001'?error.message:'No se pudo confirmar el giro; comprobá el recibo antes de reintentar',conflicto:conflict,precioCambio:priceChanged},conflict?409:priceChanged?412:error.code==='P0001'||/^22/.test(error.code||'')?400:503);
  }
  return json(data);
 }catch{return json({error:'Entrega incierta. Comprobá el mismo recibo antes de intentar otro giro.'},503);}
});
