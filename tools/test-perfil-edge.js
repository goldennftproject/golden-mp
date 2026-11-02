'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
let src=stripTypeScriptTypes(fs.readFileSync('supabase/functions/perfil/index.ts','utf8').replace(/^import .*;\r?\n/,''));
let handle,calls=[],uid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',user={id:uid,email_confirmed_at:'yes',is_anonymous:false};
const admin={auth:{getUser:async jwt=>jwt==='valid'?{data:{user}}:{data:{user:null},error:{}}},rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true,name:args.p_name||'Actual'}};}};
vm.runInNewContext(src,{createClient:()=>admin,Deno:{serve:f=>handle=f,env:{get:()=>''}},Response,Request});
const request=(body,jwt='valid')=>handle(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer '+jwt},body:JSON.stringify(body)}));
(async()=>{
 assert.equal((await request({action:'state',account:uid},'invalid')).status,401);
 assert.equal((await request({action:'rename',account:'other',name:'Otro'})).status,409);assert.equal(calls.length,0);
 user.is_anonymous=true;assert.equal((await request({action:'state',account:uid})).status,401);user.is_anonymous=false;
 for(const name of ['a','<script>', 'x'.repeat(25), 'A\nB','😀😀😀','---'])assert.equal((await request({action:'rename',account:uid,name})).status,400);
 const r=await request({action:'rename',account:uid,name:'  Granja  Jose\u0301  ',data:{golden:999},uid:'another'});assert.equal(r.status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),{name:'farm_profile',args:{p_uid:uid,p_action:'rename',p_name:'Granja José'}});
 assert.equal((await request({action:'delete',account:uid})).status,400);
 assert.equal((await request({action:'rename',account:uid,name:'a'.repeat(2100)})).status,400);
 console.log('OK: sesión y propiedad, nombre normalizado, validación y sólo nombre enviado al RPC.');
})().catch(e=>{console.error(e);process.exitCode=1;});
