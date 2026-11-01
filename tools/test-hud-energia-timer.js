'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const doc=new JSDOM(fs.readFileSync('public/index.html','utf8')).window.document;
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(process.cwd(),{'game/main.js':''});
c.document=doc;c.estadoDeCero();c.GF.scene='farm';
let t=1800000000000;c.nowMs=()=>t;
const eta=doc.getElementById('energia-granja-eta'),pill=doc.getElementById('energia-granja-pill');
function set(actual,vip=0){c.G.produccion={vipHasta:vip};c.G.energiaGranja={actual,at:t,v:1};c.refreshEnergiaHud(actual);}
set(49);assert.equal(eta.textContent,'+1 4:48');assert.match(pill.title,/Completa en 4:48/);
set(49.5);assert.equal(eta.textContent,'+1 2:24');
set(0);assert.match(pill.title,/Completa en 4:00:00/);
set(50);assert.equal(eta.hidden,true);assert.match(pill.title,/Energía completa/);
set(99,t+86400000);assert.equal(eta.textContent,'+1 2:24');
set(99.5,t+60000);assert.equal(eta.textContent,'+1 1:00');assert.match(pill.title,/Completa en 1:00/);
set(49.5);t+=60000;const v=c.energiaGranjaTick();c.refreshEnergiaHud(v);assert.equal(eta.textContent,'+1 1:24');
console.log('OK: temporizador Free/VIP, energía fraccionaria, completa, vencimiento VIP y avance sin interacción.');
