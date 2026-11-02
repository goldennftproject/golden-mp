import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const CORS={'Access-Control-Allow-Origin':'https://goldenfarm.onrender.com','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const raw=await req.text();if(raw.length>2000)return json({error:'Solicitud demasiado grande'},400);
  const b=JSON.parse(raw);
  if(!['state','rename'].includes(b.action))return json({error:'Acción no disponible'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  const {data:u,error}=await admin.auth.getUser(jwt);
  if(error||!u.user?.email_confirmed_at||u.user.is_anonymous)return json({error:'Entra con el correo verificado de tu granja'},401);
  if(b.account!==u.user.id)return json({error:'La cuenta cambió; vuelve a abrir Mi perfil'},409);
  let name:null|string=null;
  if(b.action==='rename'){
   if(typeof b.name!=='string')return json({error:'Escribe el nombre de tu granja'},400);
   name=b.name.normalize('NFC').trim().replace(/ +/g,' ');
   if(!/^[\p{L}\p{N} ._-]{3,24}$/u.test(name)||!/[\p{L}\p{N}]/u.test(name))return json({error:'Usa de 3 a 24 caracteres: letras, números, espacios, punto, guion o guion bajo'},400);
  }
  const r=await admin.rpc('farm_profile',{p_uid:u.user.id,p_action:b.action,p_name:name});
  if(r.error)return json({error:r.error.code==='P0001'?r.error.message:'No se pudo confirmar el perfil. Vuelve a consultarlo antes de reintentar.'},409);
  return json(r.data);
 }catch{return json({error:'No se pudo consultar el perfil. Reintenta con conexión.'},503);}
});
