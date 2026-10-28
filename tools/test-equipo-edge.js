const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/equipo/index.ts','utf8')).replace(/^import .*;\s*$/gm,'');
let handle,confirmed=true;const calls=[];
const api={auth:{getUser:async token=>token==='good'?{data:{user:{id:'actual',email_confirmed_at:confirmed?'ok':null,user_metadata:{role:'admin'}}}}:{error:{}}},rpc:async(name,p)=>{calls.push({name,p});return {data:p.p_vista==='resumen'?{denied:true,error:'Sin acceso'}:{ok:true,role:'dev'}};}};
vm.runInNewContext(source,{Request,Response,JSON,Number,String,createClient:()=>api,Deno:{env:{get:()=>''},serve:f=>handle=f}});
const call=(b,token='good')=>handle(new Request('https://qa.invalid/equipo',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({cuenta:'actual',...b})}));
(async()=>{
 assert.equal((await call({accion:'consultar',vista:'acceso'},'bad')).status,401);confirmed=false;assert.equal((await call({accion:'consultar',vista:'acceso'})).status,401);confirmed=true;
 assert.equal((await call({cuenta:'otra',accion:'consultar',vista:'resumen'})).status,409);assert.equal(calls.length,0);
 assert.equal((await call({accion:'consultar',vista:'resumen',role:'admin',p_uid:'victima'})).status,403,'metadata no concede permisos');assert.equal(calls[0].p.p_uid,'actual');
 assert.equal((await call({accion:'consultar',vista:'acceso'})).status,200);
 for(const accion of ['abrir','retirar','acreditar','resetear','roles'])assert.equal((await call({accion})).status,400);
 assert.equal((await call({accion:'consultar',vista:'cuentas',page:10001})).status,400);
 assert.equal((await call({accion:'resolver',note:'no',target:'x',tx:'x'})).status,400);
 assert.equal((await call({accion:'pausar',p_uid:'victima'})).status,200);assert.equal(calls.at(-1).name,'equipo_operar');assert.equal(calls.at(-1).p.p_uid,'actual');assert.equal(calls.at(-1).p.p_action,'pausar');
 console.log('OK equipo Edge: correo confirmado, identidad, roles sólo del servidor, consultas acotadas y ninguna acción de pago, apertura, reset o delegación.');
})().catch(e=>{console.error(e);process.exitCode=1;});
