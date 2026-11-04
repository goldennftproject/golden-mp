'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
let source=fs.readFileSync('supabase/functions/discord-link/index.ts','utf8').replace(/^import .*;\r?\n/,'');source=stripTypeScriptTypes(source);
const uid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',id='1777777777777777777',token='fixture-discord-access-token-123456';
let handler,calls=[],profile={id,username:'tester',global_name:'Tester'},meta={application:{id:'1564641499654656091'},user:{id},scopes:['identify'],expires:'2099-01-01T00:00:00Z'},auth=true,rpcError=null;
const admin={auth:{getUser:async()=>({data:{user:auth?{id:uid,email_confirmed_at:'yes',is_anonymous:false}:null}})},rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true,linked:true,name:'Tester (@tester)'},error:rpcError};}};
const ctx={createClient:()=>admin,Deno:{serve:f=>handler=f,env:{get:()=>''}},Response,Request,AbortSignal,TextEncoder,crypto:webcrypto,fetch:async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer '+token);return Response.json(url.endsWith('/oauth2/@me')?meta:profile);}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const request=(extra={})=>handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer verified-fixture'},body:JSON.stringify({action:'oauth',account:uid,discord_access_token:token,...extra})}));
(async()=>{
 let response=await request({discord_id:'999999999999999999',name:'Forged'});assert.equal(response.status,200);assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{name:'discord_oauth_link',args:{p_user:uid,p_discord:id,p_name:'Tester (@tester)'}});
 assert.equal((await request({account:'other'})).status,409);auth=false;assert.equal((await request()).status,401);auth=true;
 for(const change of [{application:{id:'wrong'}},{scopes:['email']},{expires:'2000-01-01T00:00:00Z'},{expires:'invalid'},{user:{id:'199999999999999999'}}]){const before=structuredClone(meta),n=calls.length;Object.assign(meta,change);assert.equal((await request()).status,403);assert.equal(calls.length,n);meta=before;}
 for(const change of [{id:'123'},{bot:true},{username:''}]){const before=structuredClone(profile),n=calls.length;Object.assign(profile,change);assert.equal((await request()).status,403);assert.equal(calls.length,n);profile=before;}
 for(const bad of ['',123,'x'.repeat(513),'evil\r\nHeader'])assert.equal((await request({discord_access_token:bad})).status,400);
 rpcError={code:'P0001',message:'Este Discord ya está vinculado a otra granja'};response=await request();assert.equal(response.status,409);assert.equal((await response.json()).error,rpcError.message);
 console.log('OK OAuth Edge: Auth y cuenta verificadas, token de la aplicación oficial, scope y caducidad, perfil autoritativo, rechazo de falsificaciones y conflictos.');
})().catch(e=>{console.error(e);process.exitCode=1;});
