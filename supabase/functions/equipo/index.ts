import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return json({error:'Inicia sesión en Golden Farm'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:u,error:authError}=await admin.auth.getUser(token);if(authError||!u?.user||!u.user.email_confirmed_at)return json({error:'Sesión confirmada requerida'},401);
  const raw=await req.text();if(raw.length>4000)return json({error:'Solicitud demasiado grande'},400);
  const b=JSON.parse(raw),uid=u.user.id;if(b.cuenta!==uid)return json({error:'La cuenta cambió'},409);
  let result;
  if(b.accion==='consultar'){
   if(!['acceso','resumen','cuentas','depositos','incidencias','auditoria'].includes(b.vista)||typeof(b.buscar??'')!=='string'||(b.buscar||'').length>100||!Number.isSafeInteger(b.page??0)||(b.page??0)<0||(b.page??0)>10000)return json({error:'Consulta inválida'},400);
   result=await admin.rpc('equipo_consulta',{p_uid:uid,p_vista:b.vista,p_search:b.buscar||'',p_page:b.page??0});
  }else if(['pausar','resolver'].includes(b.accion)){
   if(b.accion==='resolver'&&(typeof b.note!=='string'||b.note.trim().length<5||b.note.length>500||!/^0x[0-9a-f]{64}$/.test(b.tx||'')||!String(b.target||'').match(/^[0-9a-f-]{36}$/)||typeof b.version!=='string'))return json({error:'Incidencia inválida'},400);
   result=await admin.rpc('equipo_operar',{p_uid:uid,p_action:b.accion,p_target:b.target??null,p_tx:b.tx??null,p_note:b.note||'',p_version:b.version??null});
  }else return json({error:'Acción no permitida'},400);
  if(result.error)return json({error:'No se pudo consultar el panel; inténtalo de nuevo'},503);
  const data=result.data;if(!data?.ok)return json({error:data?.error||'Operación no confirmada'},data?.denied?403:data?.conflict?409:400);
  return json(data);
 }catch{return json({error:'No se pudo procesar la solicitud'},400);}
});
