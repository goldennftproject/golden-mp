'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
let src=fs.readFileSync('supabase/functions/discord-link/index.ts','utf8').replace(/^import .*;\r?\n/,'');src=stripTypeScriptTypes(src);
let handle,calls=[],uid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',user={id:uid,email_confirmed_at:'yes',is_anonymous:false};
let rpcResult={ok:true,linked:false},discordId='1777777777777777777';
const admin={auth:{getUser:async jwt=>jwt==='valid'?{data:{user}}:{data:{user:null},error:{}}},rpc:async(name,args)=>{calls.push(args);return {data:rpcResult};}};
const context={createClient:()=>admin,Deno:{serve:f=>handle=f,env:{get:()=>''}},Response,Request,AbortSignal,TextEncoder,crypto:webcrypto,fetch:async(url,opts)=>{
 if(opts.headers.Authorization!=='Bot correct')return new Response('{}',{status:401});
 return Response.json(url.endsWith('users/@me')?{id:'1564641499654656091',bot:true}:{user:{id:discordId,username:'tester',global_name:'Tester'}});
}};
vm.createContext(context);vm.runInContext(src,context);
const request=(body,jwt='valid',bot='')=>handle(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer '+jwt,'x-discord-bot-token':bot},body:JSON.stringify(body)}));
(async()=>{
 assert.equal((await request({action:'state',account:uid},'invalid')).status,401);
 assert.equal((await request({action:'state',account:'other'})).status,409);
 user.is_anonymous=true;assert.equal((await request({action:'state',account:uid})).status,401);user.is_anonymous=false;
 let r=await request({action:'create',account:uid});const created=await r.json();assert.match(created.code,/^GF-[A-F0-9]{32}$/);assert.match(calls.at(-1).p_hash,/^[a-f0-9]{64}$/);assert.notEqual(calls.at(-1).p_hash,created.code);
 assert.equal((await request({action:'claim',code:created.code,discord_id:discordId})).status,401);
 assert.equal((await request({action:'claim',code:created.code,discord_id:discordId},'valid','wrong')).status,503);
 r=await request({action:'claim',code:created.code,discord_id:discordId},'valid','correct');assert.equal(r.status,200);assert.equal(calls.at(-1).p_user,null);assert.equal(calls.at(-1).p_name,'Tester (@tester)');
 assert.equal((await request({action:'withdraw'})).status,400);
 console.log('OK: sesión verificada, cuenta propietaria, códigos aleatorios cifrados por hash, bot oficial y miembro autoritativo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
