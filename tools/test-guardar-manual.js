'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),save=fs.readFileSync(path.join(root,'public/game/save.js'),'utf8'),{ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':'','game/save.js':save.replace('window.SAVE_READY = initSave();','window.SAVE_READY = Promise.resolve();')});
c.document=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8')).window.document;const run=s=>vm.runInContext(s,c),b=()=>c.document.getElementById('gm-guardar'),txt=()=>c.document.getElementById('gm-guardado').textContent;
function setup(){run("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;MERCADO_EN_CURSO=null;SAVE_EN_CURSO=null;SAVE_CONFLICTOS.clear();SAVE_CONFIRMACIONES.clear();SAVE_BASES.set('qa','2026-10-24T12:00:00.000Z');");}
(async()=>{
 assert.equal(b().closest('#gmenu'),null);assert.equal(b().closest('#hud-flot'),null);assert.ok(b().closest('#guardado-manual'));assert.equal(c.document.querySelectorAll('#gm-guardar').length,1);assert.ok(b().querySelector('svg'));assert.equal(b().textContent,'');assert.equal(b().getAttribute('aria-label'),'Guardar ahora');
 setup();let calls=0,release;c.saveFarm=async force=>{assert.equal(force,true);calls++;await new Promise(r=>release=r);run("SAVE_CONFIRMACIONES.set('qa',1)");};
 let p=c.guardarAhora();assert.ok(b().disabled);assert.equal(b().getAttribute('aria-busy'),'true');assert.ok(b().querySelector('svg'));await c.guardarAhora();assert.equal(calls,1);assert.ok(!txt().includes('Guardado confirmado'));release();await p;assert.match(txt(),/Guardado confirmado/);assert.equal(b().disabled,false);assert.equal(b().getAttribute('aria-busy'),'false');assert.ok(b().querySelector('svg'));
 setup();c.saveFarm=async()=>{};await c.guardarAhora();assert.match(txt(),/No se pudo confirmar/);assert.ok(!txt().includes('Guardado confirmado'));assert.equal(b().dataset.estado,'error');assert.equal(b().disabled,false);
 assert.equal(b().title,'Guardar ahora');assert.equal(b().getAttribute('aria-busy'),'false');
 setup();c.saveFarm=async()=>{throw Error('offline')};await c.guardarAhora();assert.match(txt(),/No se pudo confirmar/);assert.equal(b().disabled,false);assert.equal(b().dataset.estado,'error');
 setup();run("SAVE_CONFLICTOS.add('qa')");calls=0;c.saveFarm=async()=>calls++;await c.guardarAhora();assert.equal(calls,0);assert.equal(b().dataset.estado,'error');
 setup();c.saveFarm=async()=>run("UID='otra';SAVE_CONFIRMACIONES.set('qa',1)");await c.guardarAhora();assert.equal(txt(),'');assert.equal(b().dataset.estado,'');
 setup();let finish;const pending=new Promise(r=>finish=r);c.qaPending=pending;run('SAVE_EN_CURSO=qaPending');calls=0;c.saveFarm=async()=>{calls++;run("SAVE_CONFIRMACIONES.set('qa',2)");};p=c.guardarAhora();assert.equal(calls,0);run("SAVE_CONFIRMACIONES.set('qa',1);SAVE_EN_CURSO=null");finish();await p;assert.equal(calls,1);assert.match(txt(),/Guardado confirmado/,'esperar autosave no sustituye el guardado solicitado');
 assert.equal(b().dataset.estado,'ok');
 setup();run('SOLO_LOCAL=true');calls=0;await c.guardarAhora();assert.equal(calls,0);assert.equal(b().dataset.estado,'error');
 assert.ok(save.includes('guardado||Date.now()-actividad<5000'));assert.ok(save.includes('window.addEventListener("beforeunload", () => { saveFarm(); })'));
 const ui=fs.readFileSync(path.join(root,'public/game/ui.js'),'utf8');assert.ok(ui.includes('guardar.onclick=guardarAhora'));
 console.log('OK: botón manual, ACK remoto, clic único, fallos, conflictos, cambio de cuenta y cola; autoguardado y F5 sin cambios.');
})().catch(e=>{console.error(e);process.exitCode=1});
