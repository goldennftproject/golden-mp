'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const doc=new JSDOM(fs.readFileSync('public/index.html','utf8')).window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(process.cwd(),{'game/main.js':''});
(async()=>{
 await c.SAVE_READY;c.document=doc;c.estadoDeCero();c.NICK='Viejo';let result={ok:true,name:'Viejo',discord_linked:true,discord_name:'Discord (@discord)'},calls=[],fail=false,resolve;
 const uid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 c.profileSb={functions:{invoke:async(name,{body})=>{calls.push(body);if(fail)return {error:{context:{json:async()=>({error:'Sin confirmar'})}}};if(body.name==='Tardío')return new Promise(r=>resolve=r);return {data:result};}}};
 vm.runInContext("sb=profileSb;UID='"+uid+"';CARGA_OK=true;SOLO_LOCAL=false",c);
 c.copiaGuardar=()=>{};const tick=()=>new Promise(r=>setImmediate(r));
 const before=JSON.stringify(c.G);c.refreshPerfil();await tick();assert.equal(doc.getElementById('perfil-nombre-actual').textContent,'Viejo');assert.match(doc.getElementById('perfil-discord').textContent,/@discord/);
 doc.getElementById('perfil-nombre').value='Nuevo';result={ok:true,name:'Nuevo',discord_linked:true,discord_name:'Discord (@discord)'};
 doc.getElementById('perfil-guardar').click();await tick();assert.equal(c.NICK,'Nuevo');assert.equal(JSON.stringify(c.G),before);assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),{action:'rename',account:uid,name:'Nuevo'});
 fail=true;doc.getElementById('perfil-nombre').value='No confirmado';doc.getElementById('perfil-guardar').click();await tick();assert.equal(c.NICK,'Nuevo');assert.match(doc.getElementById('perfil-status').textContent,/Sin confirmar/);fail=false;
 doc.getElementById('perfil-nombre').value='Tardío';doc.getElementById('perfil-guardar').click();await tick();vm.runInContext("UID='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'",c);c.NICK='Otra cuenta';resolve({data:{ok:true,name:'Tardío'}});await tick();assert.equal(c.NICK,'Otra cuenta');assert.equal(JSON.stringify(c.G),before);
 assert.equal(doc.querySelectorAll('.gmi[data-panel="ov-perfil"]').length,1);
 console.log('OK: perfil visible, cambio sólo tras ACK, progreso intacto, error y respuesta de otra cuenta descartada.');
})().catch(e=>{console.error(e);process.exitCode=1;});
