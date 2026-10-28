const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('public/equipo/index.html','utf8'),source=fs.readFileSync('public/equipo/panel.js','utf8').replace(/^import .*;\s*$/gm,'');
const dom=new JSDOM(html,{url:'https://goldenfarm.onrender.com/equipo/'}),doc=dom.window.document;
let authUid='blocked',onAuth,pending,calls=0;const client={auth:{getSession:async()=>({data:{session:authUid?{user:{id:authUid}}:null}}),onAuthStateChange:cb=>{onAuth=cb;}},functions:{invoke:async(name,{body})=>{
 calls++;assert.equal(name,'equipo');if(body.cuenta==='blocked')return {error:{context:new Response(JSON.stringify({error:'Sin acceso'}),{status:403})}};
 if(pending)return new Promise(r=>{pending.resolve=r;});
 if(body.vista==='cuentas')return {data:{ok:true,role:'dev',at:new Date().toISOString(),rows:Array.from({length:26},(_,i)=>({name:'<img src=x onerror=alert(1)>',user_id:'fixture-'+i,golden:0,plata:2,nivel:1}))}};
 return {data:{ok:true,role:'dev',deposits_enabled:false,at:new Date().toISOString(),cuentas:5,rows:[]}};
}}};
const c={document:doc,window:{supabase:{createClient:()=>client}},Node:dom.window.Node,project:{url:'qa',key:'public'},console,queueMicrotask,confirm:()=>false,prompt:()=>null};vm.createContext(c);vm.runInContext(source,c);
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
 Object.assign(c,await import('../public/equipo/solvencia.mjs'));
 await settle();assert.equal(doc.getElementById('panel').hidden,true);assert.equal(doc.getElementById('content').textContent,'');
 authUid='dev';await c.load();assert.equal(doc.getElementById('panel').hidden,false);assert.match(doc.getElementById('identity').textContent,/Dev/);assert.equal(doc.querySelector('.danger').disabled,true);
 const calc=doc.querySelector('.reserve-calculator'),form=calc.querySelector('form'),countBefore=calls;form.elements.reserve.value='100';form.elements.liability.value='0';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.match(calc.textContent,/Retiros bloqueados/);assert.equal(calls,countBefore,'el escenario de reserva no se envía al servidor');form.elements.liability.value='100';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.match(calc.textContent,/Presupuesto hipotético de 30 días: 0 USDT/);
 doc.querySelector('[data-view="cuentas"]').click();await settle();assert.equal(doc.querySelectorAll('tbody tr').length,25);assert.equal(doc.querySelector('#content img'),null,'no interpreta nombre como HTML');assert.match(doc.querySelector('tbody').textContent,/<img/);assert.equal(doc.getElementById('next').disabled,false);
 const before=calls;await settle();assert.equal(calls,before,'sin sondeo periódico');
 pending={};const old=c.load();await settle();authUid=null;onAuth('SIGNED_OUT',null);pending.resolve({data:{ok:true,role:'dev',rows:[{name:'No debe aparecer'}],at:new Date().toISOString()}});await old;await settle();assert.equal(doc.getElementById('content').textContent,'');assert.equal(doc.getElementById('panel').hidden,true,'respuesta tardía no filtra datos al cerrar sesión');
 assert.equal(c.txLink('javascript:alert(1)').tagName,'SPAN');
 console.log('OK equipo UI: acceso denegado sin datos, rol Dev, pausa desactivada, XSS, paginación, sin sondeo y respuesta tardía tras logout ignorada.');
})().catch(e=>{console.error(e);process.exitCode=1;});
