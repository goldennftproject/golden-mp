import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const GUILD='1564640221063024763',BOT='1564641499654656091';
const CORS={'Access-Control-Allow-Origin':'https://goldenfarm.onrender.com','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,'Content-Type':'application/json','Cache-Control':'no-store'}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
async function discord(path:string,token:string){
 const r=await fetch('https://discord.com/api/v10/'+path,{headers:{Authorization:'Bot '+token},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error('No se pudo verificar la identidad con Discord');
 return await r.json();
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const raw=await req.text();if(raw.length>2500)return json({error:'Solicitud demasiado grande'},400);
  const b=JSON.parse(raw),admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let args:any,code:string|undefined;
  if(b.action==='claim'){
   // El token del bot nunca viaja al navegador ni se conserva en la base de datos.
   // Sólo la aplicación oficial puede presentar una identidad desde una interacción.
   const token=req.headers.get('x-discord-bot-token')||'';
   if(!token||token.length>300)return json({error:'Bot autorizado requerido'},401);
   if(typeof b.discord_id!=='string'||!/^\d{17,20}$/.test(b.discord_id)||typeof b.code!=='string'||!/^GF-[A-F0-9]{32}$/.test(b.code))return json({error:'Código o identidad inválidos'},400);
   const self=await discord('users/@me',token);
   if(self.id!==BOT||!self.bot)return json({error:'Bot no autorizado'},403);
   const member=await discord('guilds/'+GUILD+'/members/'+b.discord_id,token);
   if(member.user?.id!==b.discord_id||member.user.bot)return json({error:'Miembro no válido'},403);
   args={p_user:null,p_action:'claim',p_hash:await hash(b.code),p_discord:member.user.id,p_name:((member.user.global_name||member.user.username)+' (@'+member.user.username+')').slice(0,80)};
  }else{
   if(!['state','create','confirm'].includes(b.action))return json({error:'Acción no disponible'},400);
   const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
   const {data,error}=await admin.auth.getUser(jwt);
   if(error||!data.user?.email_confirmed_at||data.user.is_anonymous)return json({error:'Entra con el correo verificado de tu granja'},401);
   if(b.account!==data.user.id)return json({error:'La cuenta cambió; vuelve a abrir Configuración'},409);
   if(b.action==='create')code='GF-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
   args={p_user:data.user.id,p_action:b.action,p_hash:code?await hash(code):null};
  }
  const {data,error}=await admin.rpc('discord_link_action',args);
  if(error)return json({error:error.code==='P0001'?error.message:'No se pudo completar la vinculación. Vuelve a consultar su estado.'},409);
  return json({...data,...(code&&!data.linked?{code}:{} )});
 }catch{return json({error:'No se pudo verificar la vinculación. Reintenta con conexión.'},503);}
});
