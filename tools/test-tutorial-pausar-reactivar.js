'use strict';
// Motor, snapshot e hidratación reales; partidas sintéticas, sin Auth ni servidor.
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'),{'game/main.js':''});
const run=s=>vm.runInContext(s,c),clone=o=>JSON.parse(JSON.stringify(o));
let clock=1800000000000,checks=0,saves=0,messages=[];
function check(name,fn){fn();checks++;console.log('  ok   '+name);}
function reset(id='sell'){
 c.estadoDeCero();c.farmScene=null;c.GF.aplicarTerreno(0);
 c.G.tuto={step:run('tutoIdx('+JSON.stringify(id)+')'),n:0,done:false,v:c.TUTO_VER};
 c.G.firstCropDone=true;c.G.kitReclamado=true;
 c.G.plots=Array.from({length:3},()=>({state:'dry',cropKey:null,readyAt:0}));
 saves=0;messages=[];
}
(async()=>{
 await c.SAVE_READY;c.nowMs=()=>clock;c.saveFarm=()=>{saves++;};
 c.log=t=>messages.push(t);c.toast=()=>{};c.refreshHud=()=>{};c.refreshCobertizo=()=>{};c.tutoRefresh=()=>{};c.celebrate=()=>{};
 check('la cadena y la versión guardadas no se desplazan',()=>{
  assert.equal(c.TUTO_VER,15);assert.equal(run("tutoIdx('harvest')"),3);assert.equal(run("tutoIdx('sell')"),4);
  assert.equal(run("tutoIdx('incursion')"),25);
  reset('cook');const old=clone(c.G.tuto);c.tutoMigrar();assert.deepEqual(clone(c.G.tuto),old);
 });
 check('la lección aparece tras cosechar sin modificar estado al consultarla',()=>{
  reset('harvest');c.G.tuto.n=2;assert.equal(c.tutoPracticaPausa(),null);
  c.tutoEvent('harvest');assert.equal(c.G.tuto.step,4);
  const before=JSON.stringify(c.G);for(let i=0;i<3;i++)assert.equal(c.tutoActivo().id,'produccion_pausar');
  assert.equal(JSON.stringify(c.G),before);assert.equal(c.tutoActivo().clave,'p:0');
 });
 check('sólo ofrece una parcela vacía y activa; replantar no bloquea el recorrido',()=>{
  reset();c.G.plots[0]={state:'growing',cropKey:'papa',readyAt:clock+90000};
  assert.equal(c.tutoActivo().clave,'p:1');
  c.G.produccion.pausas['p:1']={at:clock,estado:{state:'dry',cropKey:null}};
  assert.equal(c.tutoActivo().clave,'p:2');c.G.plots[2]={state:'ready',cropKey:'papa'};
  assert.equal(c.tutoPracticaPausa(),null);assert.equal(c.tutoActivo().id,'sell');
 });
 check('pausar y reactivar la misma parcela enseña sin alterar progreso ni premios',()=>{
  reset();c.G.tuto.n=1;const progress=clone(c.G.tuto),plata=c.G.plata,res=clone(c.G.res),used=c.produccionUsados();
  assert(c.produccionAlternar('p:0'));assert.equal(c.produccionUsados(),used-1);
  assert.deepEqual(clone(c.G.tuto.pausaPractica),{fase:'reactivar',clave:'p:0'});
  assert.equal(c.tutoActivo().id,'produccion_reactivar');clock+=10000;
  assert(c.produccionAlternar('p:0'));assert.equal(c.produccionUsados(),used);
  assert.deepEqual(clone(c.G.tuto.pausaPractica),{fase:'hecho'});assert.equal(c.tutoActivo().id,'sell');
  for(const k of ['step','n','done','v'])assert.equal(c.G.tuto[k],progress[k]);
  assert.equal(c.G.plata,plata);assert.deepEqual(clone(c.G.res),res);assert.equal(saves,2);
  assert.equal(messages.filter(t=>t.startsWith('Ya sabes pausar')).length,1);
  c.produccionAlternar('p:0');c.produccionAlternar('p:0');
  assert.equal(messages.filter(t=>t.startsWith('Ya sabes pausar')).length,1,'no repite cierre');
 });
 check('acciones inválidas o en curso no registran la práctica',()=>{
  reset();c.farmScene={action:{}};assert.equal(c.produccionAlternar('p:0'),false);
  assert.equal(c.G.tuto.pausaPractica,undefined);assert.equal(saves,0);
  c.farmScene=null;assert.equal(c.produccionAlternar('p:999'),false);assert.equal(c.G.tuto.pausaPractica,undefined);
 });
 check('no confunde pausar otra producción o reactivarla con la parcela elegida',()=>{
  reset();c.produccionAlternar('p:1');assert.equal(c.G.tuto.pausaPractica,undefined);
  c.produccionAlternar('p:1');assert.equal(c.G.tuto.pausaPractica,undefined);
  c.produccionAlternar('p:0');c.produccionAlternar('p:1');c.produccionAlternar('p:1');
  assert.equal(c.G.tuto.pausaPractica.fase,'reactivar');assert.equal(c.tutoActivo().clave,'p:0');
 });
 check('recargar conserva la práctica, el contador y los tiempos de pausa',()=>{
  reset();c.G.tuto.n=2;c.produccionAlternar('p:0');
  const saved=clone(c.snapshot()),tuto=clone(c.G.tuto);clock+=60000;c.hydrate(saved);
  assert.deepEqual(clone(c.G.tuto),tuto);assert.equal(c.tutoActivo().id,'produccion_reactivar');
  assert(c.produccionPausada({type:'plot',i:0}));assert(c.produccionAlternar('p:0'));
  assert.equal(c.G.tuto.n,2);assert.equal(c.G.plots[0].state,'dry');
 });
 check('si ocupa el cupo liberado, explica cómo reactivar sin hacerlo automáticamente',()=>{
  reset();c.produccionAlternar('p:0');c.G.plotsOwned=4;c.G.plots[3]={state:'dry',cropKey:null};
  const before=JSON.stringify(c.G);assert.equal(c.tutoActivo().ui,'#prod-gestion > summary');
  assert.match(c.tutoActivo().txt,/pausa otra producción/);assert.equal(JSON.stringify(c.G),before);
  assert.equal(c.produccionAlternar('p:0'),false);assert.equal(c.G.tuto.pausaPractica.fase,'reactivar');
  assert(c.produccionAlternar('p:3'));assert(c.produccionAlternar('p:0'));
  assert(c.produccionPausada({type:'plot',i:3}),'la segunda pausa es manual y se conserva');
  assert.equal(c.G.tuto.pausaPractica.fase,'hecho');
 });
 check('vender antes de practicar conserva cada venta y deja seguir al jugador',()=>{
  reset();c.tutoActivo();c.tutoEvent('sell');assert.equal(c.G.tuto.n,1);c.tutoEvent('sell');c.tutoEvent('sell');
  assert.equal(c.G.tuto.step,5);assert.equal(c.G.tuto.pausaPractica,undefined);assert.equal(c.tutoActivo().id,'place_store');
 });
 check('vender durante la práctica avanza sin perder el destino pendiente de reactivar',()=>{
  reset();c.produccionAlternar('p:0');c.tutoEvent('sell');c.tutoEvent('sell');c.tutoEvent('sell');
  assert.equal(c.G.tuto.step,5);assert.equal(c.tutoActivo().id,'produccion_reactivar');
  assert(c.produccionAlternar('p:0'));assert.equal(c.tutoActivo().id,'place_store');
 });
 check('el autoskip y los recursos conservan el paso real mientras la práctica está pendiente',()=>{
  reset();c.produccionAlternar('p:0');c.G.tuto.step=run("tutoIdx('wood_st')");
  c.G.res.madera=0;c.tutoAutoSkip();assert.equal(c.G.tuto.step,6);
  c.G.res.madera=999;c.tutoCheckRes();assert(c.G.tuto.step>6);assert.equal(c.G.tuto.pausaPractica.fase,'reactivar');
 });
 check('tutoriales completados y veteranos no se reabren ni cobran recompensas',()=>{
  reset();c.G.tuto={step:32,n:0,done:true,v:15};const before=clone(c.G.tuto),plata=c.G.plata;
  c.tutoMigrar();assert.equal(c.tutoPracticaPausa(),null);assert.deepEqual(clone(c.G.tuto),before);assert.equal(c.G.plata,plata);
  c.G.tuto.pausaPractica={fase:'reactivar',clave:'p:0'};c.G.produccion.pausas['p:0']={at:clock,estado:{state:'dry'}};
  assert.equal(c.tutoActivo(),null);c.produccionAlternar('p:0');assert.equal(c.G.tuto.done,true);assert.equal(c.G.tuto.step,32);
 });
 console.log('\n'+checks+' contratos de práctica y preservación verificados');
})().catch(e=>{console.error(e);process.exitCode=1;});
