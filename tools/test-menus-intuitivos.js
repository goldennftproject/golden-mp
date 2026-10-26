'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),doc=new JSDOM(html).window.document;
const menus=[...doc.querySelectorAll('#gmenu .gmi[data-panel]')];assert.equal(menus.length,20);assert.equal(new Set(menus.map(b=>b.dataset.panel)).size,20);
for(const b of menus){assert.ok(doc.getElementById(b.dataset.panel));assert.ok(b.title);assert.ok(b.querySelector('.ic').textContent.trim());}
assert.equal(doc.querySelectorAll('#gmenu .menu-seccion').length,5);assert.ok(doc.querySelector('[data-panel="ov-skills"]').textContent.includes('Habilidades'));
assert.equal(doc.getElementById('banco-canjear').closest('details'),null);assert.ok(doc.getElementById('banco-actividad').closest('details'));assert.ok(doc.getElementById('gm-fijar'));assert.ok(doc.getElementById('gm-guardar'));
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});c.document=doc;c.refreshArtefactos();
assert.equal(doc.querySelectorAll('#objetos-productores .resumen-menu>span').length,3);assert.ok(doc.querySelector('#objetos-productores details').textContent.includes('no es un retorno garantizado'));
for(const b of doc.querySelectorAll('[data-artefacto-comprar],[data-artefacto-cobrar]'))assert.equal(b.closest('details'),null,'acciones fuera de la ayuda');
assert.ok(!doc.querySelector('#ov-cobertizo').textContent.includes('fabricar equipo: 2'));
console.log('OK: 20 destinos conservados, iconos, ayudas, grupos, canje y acciones a la vista; condiciones completas disponibles.');
