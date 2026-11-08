'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.GF_TEST_ROOT||path.resolve(__dirname,'..'),candidate=process.env.GF_CANDIDATE_DIR;
const {JSDOM}=require(path.join(root,'node_modules/jsdom'));
const plain=x=>JSON.parse(JSON.stringify(x));
function setup(){
  const replacements=candidate?Object.fromEntries(['state','ui'].map(k=>['game/'+k+'.js',fs.readFileSync(path.join(candidate,'public/game',k+'.js'),'utf8')])):{};
  const {ctx:c}=require(path.join(root,'tools/arrancar-el-juego.contexto.js')).arrancar(root,replacements),run=s=>vm.runInContext(s,c);
  const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost/'});c.document=dom.window.document;
  const toasts=[];let saves=0;c.toast=t=>toasts.push(String(t));c.log=()=>{};c.celebrate=()=>{};c.refreshHud=()=>{};c.saveFarm=()=>{saves++;return Promise.resolve();};
  run('estadoDeCero();G.built.establo=true;G.plata=9606;G.skills.farming=6833;G.tuto={done:true};');
  const draw=()=>{c.refreshEstablo();return dom.window.document.querySelector('[data-buyani="alpaca"]');};
  return {c,run,dom,draw,toasts,saves:()=>saves,close:()=>dom.window.close()};
}
test('Cultivo5 sin trigo muestra el requisito y 480 Plata, impide confirmar y no cobra',()=>{
  const e=setup();try{const {c,dom}=e,b=e.draw();assert.equal(c.farmSkillLevel(),5);assert.equal(c.cropUnlocked('trigo'),false);assert.equal(b.disabled,true);assert.match(b.textContent,/480/);assert.match(b.closest('.forge-row').textContent,/Cultivo nivel 6 o tener Trigo en la bolsa/);b.click();assert.equal(dom.window.document.getElementById('ov-confirm').classList.contains('show'),false);c.comprarAnimal('alpaca');assert.equal(c.G.plata,9606);assert.equal(c.animalCant('alpaca'),0);assert.equal(e.saves(),0);}finally{e.close();}
});
test('tener trigo mantiene compra válida: confirmar cobra480 una vez, siguiente720, snapshot conserva',()=>{
  const e=setup();try{const {c,dom}=e;c.G.res.trigo=1;const b=e.draw();assert.equal(b.disabled,false);b.click();assert.equal(c.G.plata,9606);assert.equal(c.animalCant('alpaca'),0);dom.window.document.getElementById('cf-yes').click();assert.equal(c.G.plata,9126);assert.equal(c.G.res.trigo,1);assert.equal(c.animalCant('alpaca'),1);assert.equal(e.saves(),1);assert.equal(c.animalPrecio('alpaca'),720);c.comprarAnimal('alpaca');assert.equal(c.G.plata,8406);assert.equal(c.animalCant('alpaca'),2);assert.match(c.animalCompraMotivo('alpaca'),/lleno/);const old=plain(c.snapshot());e.c.qaSnap=old;e.run('estadoDeCero();hydrate(qaSnap);');assert.equal(c.animalCant('alpaca'),2);assert.equal(c.G.plata,8406);}finally{e.close();}
});
test('Cultivo6 permite comprar sin trigo almacenado y conserva las reglas de nivel, Establo, cupo y Plata',()=>{
  const e=setup();try{const {c}=e;let xp=0;for(let n=1;n<6;n++)xp+=e.run('skillNeed('+n+',"farming")');c.G.skills.farming=xp;assert.equal(c.farmSkillLevel(),6);assert.equal(c.animalCompraMotivo('alpaca'),'');assert.equal(e.draw().disabled,false);c.G.built.establo=false;assert.match(c.animalCompraMotivo('alpaca'),/construye el Establo/);c.G.built.establo=true;c.G.plata=479;assert.match(c.animalCompraMotivo('alpaca'),/plata/);assert.match(c.animalCompraMotivo('conejo'),/Ganadería nivel 4/);c.G.plata=9606;c.comprarAnimal('alpaca');assert.equal(c.animalCant('alpaca'),1);assert.equal(c.G.plata,9126);assert.equal(c.G.res.trigo,0);}finally{e.close();}
});
test('un botón o confirmación anterior revalida comida y no cobra cuando ya falta',()=>{
  const e=setup();try{const {c,dom}=e;c.G.res.trigo=1;let b=e.draw();c.G.res.trigo=0;b.onclick();assert.equal(dom.window.document.getElementById('ov-confirm').classList.contains('show'),false);assert.equal(c.G.plata,9606);c.G.res.trigo=1;b=e.draw();b.click();c.G.res.trigo=0;dom.window.document.getElementById('cf-yes').click();assert.equal(c.G.plata,9606);assert.equal(c.animalCant('alpaca'),0);assert.equal(e.saves(),0);}finally{e.close();}
});
