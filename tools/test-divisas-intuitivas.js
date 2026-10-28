'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),doc=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8')).window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});c.document=doc;c.isOpen=()=>false;
vm.runInContext("UID='qa';CARGA_OK=true;SOLO_LOCAL=false;BANCO_COTIZACION={uid:'qa',tasa:10000,recibido:Date.now(),revision:'qa'};",c);
c.G.plata=25000;c.refreshBanco(false);
const input=doc.getElementById('banco-cantidad'),button=doc.getElementById('banco-canjear'),preview=doc.getElementById('banco-previa');
input.value=2;c.bancoActualizarPrevia();assert.equal(button.disabled,true);assert.equal(doc.getElementById('banco-interno').hidden,true);assert.ok(doc.getElementById('usdt-panel').textContent.includes('1 USDT → 1 Golden'));
const hud=[...doc.querySelectorAll('.divisa-hud')];assert.equal(hud.length,2);for(const b of hud){assert.equal(b.tagName,'BUTTON');assert.equal(b.dataset.panel,'ov-banco');assert.ok(b.getAttribute('aria-label'));}
assert.equal(doc.querySelectorAll('#ov-banco .divisa-uso').length,2);for(const b of doc.querySelectorAll('#ov-banco [data-panel]'))assert.ok(doc.getElementById(b.dataset.panel));
assert.equal(doc.querySelector('#banco-canjear').closest('details'),null);assert.ok(doc.querySelector('#banco-actividad').closest('details'));
assert.equal(button.closest('.banco-cuerpo'),null,'acción principal fuera del contenido desplazable');assert.ok(button.closest('.banco-acciones'));
console.log('OK: divisas identificables, canje interno oculto y compra USDT separada.');
