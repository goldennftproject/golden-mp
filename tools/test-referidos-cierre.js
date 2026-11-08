'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),save=fs.readFileSync(path.join(root,'public/game/save.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/game/ui.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const normalizer=save.slice(save.indexOf('function normalizarEventoReferidos('),save.indexOf('async function miReferido('));
const event={id:'referidos-20261108',status:'open',ends_at:'2026-11-09T03:00:00.000Z',server_now:'2026-11-09T02:59:59.999Z',tickets:2,my_qualified:2};
const nctx=vm.createContext({Date,Number});vm.runInContext(normalizer,nctx);
assert.equal(nctx.normalizarEventoReferidos(event).status,'open');
assert.equal(nctx.normalizarEventoReferidos({...event,status:'closed',server_now:event.ends_at}).status,'closed');
assert.equal(nctx.normalizarEventoReferidos({...event,status:'closed'}).status,'closed','authoritative sealed state stays closed if server clock is corrected backwards');
for(const bad of [null,{...event,id:'other'},{...event,tickets:6},{...event,tickets:-1},{...event,my_qualified:1},{...event,server_now:'bad'},{...event,ends_at:'2026-11-10T03:00:00Z'},{...event,server_now:event.ends_at}])assert.equal(nctx.normalizarEventoReferidos(bad),null);
const source=ui.slice(ui.indexOf('function prepararReferidos()'),ui.indexOf('\nlet PERFIL_SOLICITUD='));
function fixture(initial=event){
 const doc=new JSDOM(html,{pretendToBeVisual:true}).window.document,timers=new Map(),cleared=[];let mono=0,next=0,calls=0,assignments=0,copied='';
 const r={url:'https://goldenfarm.onrender.com/?ref=ABCDEF1234567890',code:'ABCDEF1234567890',registered:3,inviter:null,event:initial};
 const c=vm.createContext({Date,Number,UID:'account-a',document:doc,$:id=>doc.getElementById(id),performance:{now:()=>mono},setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;},clearTimeout:id=>{cleared.push(id);timers.delete(id);},confirm:()=>true,navigator:{clipboard:{writeText:async s=>{copied=s;}}},miReferido:async code=>{calls++;if(code){assignments++;return{...r,inviter:code};}return r;}});
 vm.runInContext(source,c);c.prepararReferidos();
 return{c,doc,r,timers,cleared,get calls(){return calls;},get assignments(){return assignments;},get copied(){return copied;},el:id=>doc.getElementById('cfg-referido-'+id),tick(ms){mono+=ms;const t=[...timers.values()];timers.clear();t.forEach(x=>x.fn());}};
}
(async()=>{
 const f=fixture();assert.equal(f.calls,0,'opening config does not query');assert.equal(f.el('evento').hidden,true);
 await f.el('ver').onclick();assert.equal(f.calls,1);assert.match(f.el('evento').textContent,/abierto.*Participación hasta.*Tus boletos: 2\/5/);assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].ms,1);
 f.tick(1);assert.match(f.el('evento').textContent,/cerrado.*Pendiente de revisión y sorteo/);assert.equal(f.calls,1,'deadline timer never polls');assert.equal(f.timers.size,0);assert.equal(f.el('ver').disabled,false);assert.equal(f.el('asignar').disabled,false);
 await f.el('copiar').onclick();assert.equal(f.copied,f.r.url);f.el('codigo').value='1234567890abcdef';await f.el('asignar').onclick();assert.equal(f.assignments,1,'ordinary assignment still works after contest closes');assert.equal(f.el('manual').hidden,true);
 const closed=fixture({...event,status:'closed',server_now:event.ends_at});await closed.el('ver').onclick();assert.match(closed.el('evento').textContent,/cerrado/);assert.equal(closed.timers.size,0);assert.equal(closed.el('ver').disabled,false);assert.equal(closed.el('asignar').disabled,false);
 const missing=fixture(null);await missing.el('ver').onclick();assert.match(missing.el('evento').textContent,/no disponible/);assert.equal(missing.el('resultado').hidden,false);assert.equal(missing.timers.size,0);
 const lifecycle=fixture({...event,server_now:'2026-11-09T02:59:00Z'});await lifecycle.el('ver').onclick();const old=[...lifecycle.timers.values()][0].fn;lifecycle.c.prepararReferidos();assert.equal(lifecycle.timers.size,0);assert.equal(lifecycle.el('evento').hidden,true);await lifecycle.el('ver').onclick();const current=lifecycle.el('evento').textContent;old();assert.equal(lifecycle.el('evento').textContent,current,'cancelled prior timer cannot erase current view');
 lifecycle.c.UID='account-b';lifecycle.tick(1);assert.equal(lifecycle.el('evento').hidden,true,'timer never displays previous account');
 const pending=fixture();let release;pending.c.miReferido=()=>new Promise(resolve=>{release=resolve;});const job=pending.el('ver').onclick();pending.c.UID='account-b';release(pending.r);await job;assert.equal(pending.el('resultado').hidden,true,'late account response is ignored');
 const hidden=fixture();await hidden.el('ver').onclick();Object.defineProperty(hidden.doc,'hidden',{configurable:true,value:true});hidden.doc.dispatchEvent(new hidden.doc.defaultView.Event('visibilitychange'));assert.equal(hidden.timers.size,0);Object.defineProperty(hidden.doc,'hidden',{configurable:true,value:false});hidden.doc.dispatchEvent(new hidden.doc.defaultView.Event('visibilitychange'));assert.equal(hidden.calls,1);assert.equal(hidden.timers.size,1);hidden.c.prepararReferidos.cancelarEvento();assert.equal(hidden.timers.size,0);
 const error=fixture();error.c.miReferido=async()=>{throw Error('Sin conexión');};await error.el('ver').onclick();assert.equal(error.el('status').textContent,'Sin conexión');assert.equal(error.el('evento').hidden,true);assert.equal(error.el('ver').disabled,false);
 const assignError=fixture();await assignError.el('ver').onclick();assignError.c.miReferido=async()=>{throw Error('No se pudo asignar');};assignError.el('codigo').value='1234567890abcdef';await assignError.el('asignar').onclick();assert.equal(assignError.el('status').textContent,'No se pudo asignar');assert.equal(assignError.timers.size,1,'failed assignment preserves the known closing timer');assignError.tick(1);assert.match(assignError.el('evento').textContent,/cerrado/);assert.equal(assignError.calls,1,'failed assignment timer never adds a status poll');
 console.log('OK Cierre de referidos: límites, datos malformados, contador propio, cierre sin sondeo, invitaciones permanentes, cancelación y cambio de cuenta.');
})().catch(e=>{console.error(e);process.exitCode=1;});
