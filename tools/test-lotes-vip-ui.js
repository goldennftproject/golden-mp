const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
ctx.estadoDeCero();ctx.document=new JSDOM(fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8')).window.document;
ctx.isOpen=()=>false;ctx.G.plata=100000;ctx.G.armasUnlocked=true;ctx.canAfford=()=>true;
const doc=ctx.document,selectors='[data-craft5],[data-ctool5],#forge-arrows5';
ctx.G.produccion.vipHasta=0;ctx.refreshForge();
let buttons=[...doc.querySelectorAll(selectors)];assert.ok(buttons.length>=4);
for(const b of buttons){assert.equal(b.disabled,true,'Free no tiene lotes habilitados: '+b.outerHTML);assert.match(b.textContent,/VIP/);}
assert.equal(doc.querySelector('[data-craft="stone"]').disabled,false,'fabricar uno sigue disponible');
ctx.G.produccion.vipHasta=Date.now()+86400000;ctx.refreshForge();
buttons=[...doc.querySelectorAll(selectors)];for(const b of buttons)assert.equal(b.disabled,false,'VIP con materiales habilita lotes');
ctx.canAfford=()=>false;ctx.refreshForge();for(const b of doc.querySelectorAll(selectors))assert.equal(b.disabled,true,'VIP no evita el coste');
ctx.canAfford=()=>true;ctx.G.produccion.vipHasta=Date.now()-1;ctx.refreshForge();for(const b of doc.querySelectorAll(selectors))assert.equal(b.disabled,true,'VIP vencido vuelve a Free');
const ui=fs.readFileSync(path.resolve(__dirname,'../public/game/ui.js'),'utf8');
ctx.G.res.madera=100;ctx.hornoLibres=()=>3;
for(const vip of [false,true,false]){
 ctx.G.produccion.vipHasta=vip?Date.now()+86400000:0;ctx.refreshHorno();ctx.refreshAltar();
 const batches=[...doc.querySelectorAll('[data-mat5],[data-caltar5],[data-cruna5]')];assert.ok(batches.length>2);
 for(const b of batches){assert.equal(b.disabled,!vip);assert.match(b.textContent,/VIP/);}
}
for(const marker of ['data-caltar5','data-cruna5']){
 const line=ui.split('\n').find(l=>l.includes(marker)&&l.includes('<button'));
 assert.match(line,/vipVigente\(\)/);assert.match(line,/×5 · VIP/);
}
console.log('OK: lotes de picos, hachas y flechas deshabilitados y rotulados VIP para Free, habilitados para VIP con recursos; expiración, costes, fabricación individual y rótulos de altar conservados.');
