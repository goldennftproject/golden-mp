'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),doc=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8')).window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});c.document=doc;c.isOpen=()=>false;
vm.runInContext("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;BANCO_COTIZACION={uid:'qa',tasa:10000,recibido:Date.now(),revision:'qa'};",c);
c.G.plata=25000;c.refreshBanco(false);
const input=doc.getElementById('banco-cantidad'),button=doc.getElementById('banco-canjear'),preview=doc.getElementById('banco-previa');
input.value=2;input.dispatchEvent(new doc.defaultView.Event('input'));
assert.equal(button.disabled,false);assert.match(button.textContent,/2 Golden/);assert.match(preview.textContent,/20.000 Plata.*2 Golden.*5.000 Plata/);
input.value=3;input.dispatchEvent(new doc.defaultView.Event('input'));assert.equal(button.disabled,true);assert.match(preview.textContent,/Te faltan 5.000 Plata/);
input.value=1.5;input.dispatchEvent(new doc.defaultView.Event('input'));assert.equal(button.disabled,true);assert.match(preview.textContent,/entera/);
vm.runInContext('BANCO_COTIZACION.recibido=Date.now()-60001',c);c.isOpen=()=>true;c.bancoTick();assert.equal(button.disabled,true);assert.equal(doc.getElementById('banco-tasa').textContent,'—');assert.match(preview.textContent,/Actualizá la tasa/);assert.match(doc.getElementById('banco-info').textContent,/Sin tasa vigente/);c.bancoCotizar=()=>{throw Error('El tick no debe consultar al servidor');};c.bancoTick();
const hud=[...doc.querySelectorAll('.divisa-hud')];assert.equal(hud.length,2);for(const b of hud){assert.equal(b.tagName,'BUTTON');assert.equal(b.dataset.panel,'ov-banco');assert.ok(b.getAttribute('aria-label'));}
assert.equal(doc.querySelectorAll('#ov-banco .divisa-uso').length,2);for(const b of doc.querySelectorAll('#ov-banco [data-panel]'))assert.ok(doc.getElementById(b.dataset.panel));
assert.equal(doc.querySelector('#banco-canjear').closest('details'),null);assert.ok(doc.querySelector('#banco-actividad').closest('details'));
assert.equal(button.closest('.banco-cuerpo'),null,'acción principal fuera del contenido desplazable');assert.ok(button.closest('.banco-acciones'));
console.log('OK: Plata y Golden identificables, accesos nativos, tasa numérica, coste/resultado/faltante y bloqueos de cantidad y tasa vencida.');
