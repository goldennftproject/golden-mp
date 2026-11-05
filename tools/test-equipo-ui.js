const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('public/equipo/index.html','utf8'),source=fs.readFileSync('public/equipo/panel.js','utf8').replace(/^import .*;\s*$/gm,'');
const dom=new JSDOM(html,{url:'https://goldenfarm.onrender.com/equipo/'}),doc=dom.window.document;
let authUid='blocked',onAuth,pending,calls=0,prompts=0;const actions=[],incidenceRows=[];const client={auth:{getSession:async()=>({data:{session:authUid?{user:{id:authUid}}:null}}),onAuthStateChange:cb=>{onAuth=cb;}},functions:{invoke:async(name,{body})=>{
 actions.push(body.accion);
 calls++;assert.equal(name,'equipo');if(body.cuenta==='blocked')return {error:{context:new Response(JSON.stringify({error:'Sin acceso'}),{status:403})}};
 if(pending)return new Promise(r=>{pending.resolve=r;});
 if(body.vista==='cuentas')return {data:{ok:true,role:'dev',at:new Date().toISOString(),rows:Array.from({length:26},(_,i)=>({name:'<img src=x onerror=alert(1)>',user_id:'fixture-'+i,golden:0,plata:2,nivel:1}))}};
 if(body.vista==='incidencias')return {data:{ok:true,role:'dev',at:new Date().toISOString(),rows:incidenceRows}};
 return {data:{ok:true,role:'dev',deposits_enabled:false,at:new Date().toISOString(),cuentas:5,rows:[]}};
}}};
const c={document:doc,window:{supabase:{createClient:()=>client}},Node:dom.window.Node,project:{url:'qa',key:'public'},console,queueMicrotask,confirm:()=>false,prompt:()=>{prompts++;return null;}};vm.createContext(c);vm.runInContext(source,c);
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
 Object.assign(c,await import('../public/equipo/solvencia.mjs'));
 await settle();assert.equal(doc.getElementById('panel').hidden,true);assert.equal(doc.getElementById('content').textContent,'');
 authUid='dev';await c.load();assert.equal(doc.getElementById('panel').hidden,false);assert.match(doc.getElementById('identity').textContent,/Dev/);assert.equal(doc.querySelector('.danger').disabled,true);
 const calc=doc.querySelector('.reserve-calculator'),form=calc.querySelector('form'),countBefore=calls;form.elements.reserve.value='100';form.elements.liability.value='0';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.match(calc.textContent,/Retiros bloqueados/);assert.equal(calls,countBefore,'el escenario de reserva no se envía al servidor');form.elements.liability.value='100';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.match(calc.textContent,/Presupuesto hipotético de 30 días: 0 USDT/);
 doc.querySelector('[data-view="cuentas"]').click();await settle();assert.equal(doc.querySelectorAll('tbody tr').length,25);assert.equal(doc.querySelector('#content img'),null,'no interpreta nombre como HTML');assert.match(doc.querySelector('tbody').textContent,/<img/);assert.equal(doc.getElementById('next').disabled,false);
 // La etiqueta administrativa depende del estado confirmado, sin resolver registros al mostrarlos.
 for(const state of ['acreditado','pendiente','error'])for(const resolved of [false,true])incidenceRows.push({
  user_id:'incidencia-'+incidenceRows.length,name:'Granja de prueba',state,resolved,detail:'Detalle conservado',
  note:'Nota conservada <img src=x onerror=alert(1)><script>alert(1)</script>',tx:'0x'+'a'.repeat(64),attempts:2,updated_at:'2026-11-05T12:00:00Z'
 });
 const incidencesBefore=JSON.stringify(incidenceRows),actionsBefore=actions.length,callsBeforeReview=calls;
 doc.querySelector('[data-view="incidencias"]').click();await settle();
 assert.equal(calls,callsBeforeReview+1,'abrir incidencias hace sólo la consulta existente');
 assert.deepEqual(actions.slice(actionsBefore),['consultar'],'mostrar no resuelve ni ejecuta operaciones');
 assert.equal(prompts,0,'mostrar no pide notas ni activa botones');
 const reviewRows=[...doc.querySelectorAll('#content tbody tr')];assert.equal(reviewRows.length,6,'matriz completa de estados y marcas de revisión');
 incidenceRows.forEach((row,i)=>{
  const review=reviewRows[i].lastElementChild,credited=row.state==='acreditado';
  assert.equal(review.querySelector('.badge').textContent,credited?'No requiere revisión':row.resolved?'Revisada':'Por revisar',row.state+' / '+row.resolved);
  assert.equal(review.querySelectorAll('button').length,!credited&&!row.resolved?1:0,'se preserva la disponibilidad de Marcar revisada');
  if(!credited&&!row.resolved)assert.equal(review.querySelector('button').textContent,'Marcar revisada');
  assert.equal(review.querySelector('p').textContent,row.note,'la nota conserva su contenido');
  assert.equal(review.querySelector('img,script'),null,'la nota no se interpreta como HTML');
  assert.match(reviewRows[i].textContent,/Detalle conservado/);
 });
 assert.equal(JSON.stringify(incidenceRows),incidencesBefore,'el render no cambia estado, resolución o notas');
 await settle();assert.equal(calls,callsBeforeReview+1,'renderizar la matriz no inicia consultas adicionales');
 const before=calls;await settle();assert.equal(calls,before,'sin sondeo periódico');
 pending={};const old=c.load();await settle();authUid=null;onAuth('SIGNED_OUT',null);pending.resolve({data:{ok:true,role:'dev',rows:[{name:'No debe aparecer'}],at:new Date().toISOString()}});await old;await settle();assert.equal(doc.getElementById('content').textContent,'');assert.equal(doc.getElementById('panel').hidden,true,'respuesta tardía no filtra datos al cerrar sesión');
 assert.equal(c.txLink('javascript:alert(1)').tagName,'SPAN');
 console.log('OK equipo UI: acceso denegado sin datos, rol Dev, pausa desactivada, XSS, paginación, revisión de acreditado/pendiente/error con ambas marcas y notas intactas, sin operaciones/sondeo y respuesta tardía tras logout ignorada.');
})().catch(e=>{console.error(e);process.exitCode=1;});
