'use strict';
// Real renderer and production engine, synthetic state/DOM only: no Auth or live saves.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),{JSDOM}=require('jsdom');
const {ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root,{'game/main.js':''});
const dom=new JSDOM(fs.readFileSync(path.join(root,'public/index.html'),'utf8'),{url:'http://localhost/'}),doc=dom.window.document;
let clock=1800000000000,saves=0,scrolls=0,checks=0;
const key=o=>c.produccionClave(o),button=o=>doc.querySelector('[data-prod-pause="'+key(o)+'"]');
const notice=()=>doc.querySelector('.prod-pausadas'),management=()=>doc.getElementById('prod-gestion');
const snapshot=()=>JSON.stringify(c.G);
function render(){c.refreshProduccionGranja();}
function reset(){
 c.estadoDeCero();c.GF.aplicarTerreno(0);c.farmScene=null;c.G.tuto={done:true};c.G.level=1;
 c.G.produccion.premium={v:1,compras:[]};doc.getElementById('prod-granja').innerHTML='';
 saves=0;scrolls=0;
}
function pauseStone({full=false}={}){
 const rock=c.produccionItems().find(o=>o.type==='rock');assert(rock,'fixture has an owned rock');
 const node=c.produccionNodoKey(rock.i);c.G.nodos=c.G.nodos||{};
 c.G.nodos[node]={cdIni:clock,halfAt:clock+30000,readyAt:clock+60000};
 assert(c.produccionAlternar(key(rock)));assert(c.produccionPausada(rock));
 if(full){c.G.plotsOwned=4;c.G.plots[3]={state:'dry',cropKey:null,readyAt:0};}
 doc.getElementById('prod-granja').innerHTML='';saves=0;return{rock,node};
}
function check(name,fn){fn();checks++;console.log('  ok   '+name);}
(async()=>{
 await c.SAVE_READY;c.document=doc;c.nowMs=()=>clock;c.innerWidth=1280;
 doc.defaultView.HTMLElement.prototype.scrollIntoView=function(){scrolls++;};
 for(const name of ['refreshHud','log','toast'])c[name]=()=>{};
 c.saveFarm=()=>{saves++;};c.refreshCobertizo=render;

 check('sin pausas no aparece aviso y la gestión comienza cerrada',()=>{
  reset();render();assert.equal(notice(),null);assert.equal(management().open,false);
 });
 check('con cupo libre anuncia la pausa, abre la gestión y ofrece Reactivar',()=>{
  reset();const{rock}=pauseStone();render();
  assert.equal(c.produccionUsados(),4);assert.equal(c.produccionCapacidad(),5);
  assert(notice());assert.match(notice().textContent,/1.*producci[oó]n.*pausada/i);
  assert.equal(management().open,true);assert.equal(button(rock).disabled,false);assert.equal(button(rock).textContent,'Reactivar');
  assert.equal(management().querySelector('[data-prod-pause]').dataset.prodPause,key(rock),'las pausadas aparecen antes de las activas');
 });
 check('el aviso queda antes de la jornada, no se duplica al refrescar y desaparece al reactivar',()=>{
  reset();const{rock}=pauseStone(),before=snapshot();render();render();
  const jornada=doc.getElementById('cob-jornada'),container=doc.getElementById('cob-paused-notice');
  assert(jornada&&container&&notice());assert(container.contains(notice()));
  assert(container.compareDocumentPosition(jornada)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING,'el aviso precede a las misiones');
  assert.equal(doc.querySelectorAll('#cob-paused-notice').length,1);assert.equal(doc.querySelectorAll('.prod-pausadas').length,1);
  assert.equal(doc.querySelectorAll('#prod-ver-pausadas').length,1);assert.equal(snapshot(),before);assert.equal(saves,0);
  button(rock).click();assert.equal(notice(),null);render();assert.equal(notice(),null);assert.equal(c.produccionPausada(rock),false);
 });
 check('con capacidad completa explica junto a la roca por qué Reactivar está bloqueado',()=>{
  reset();const{rock}=pauseStone({full:true});render();const b=button(rock),row=b.closest('.row');
  assert.equal(c.produccionUsados(),c.produccionCapacidad());assert.equal(management().open,true);assert.equal(b.disabled,true);
  assert.match(row.textContent,/Sin cupo libre.*pausa otra producci[oó]n o expande/i);
  assert.match(b.title,/cupo/i);
  const description=(b.getAttribute('aria-describedby')||'').trim().split(/\s+/).filter(Boolean);
  assert(description.length>0);for(const id of description)assert(doc.getElementById(id),'referenced explanation exists');
  assert(description.some(id=>/Sin cupo libre/i.test(doc.getElementById(id).textContent)));
 });
 check('un botón bloqueado no cambia la pausa ni guarda al pulsarlo',()=>{
  reset();const{rock}=pauseStone({full:true});render();const before=snapshot();button(rock).click();assert.equal(snapshot(),before);assert.equal(saves,0);
 });
 check('reactivar conserva el tiempo pendiente y retira el aviso de pausa',()=>{
  reset();const{rock,node}=pauseStone(),pause=c.G.produccion.pausas[key(rock)],ready=pause.estado.readyAt;
  clock+=20000;render();button(rock).click();
  assert.equal(c.produccionPausada(rock),false);assert.equal(c.G.nodos[node].readyAt,ready+20000);
  assert.equal(c.G.nodos[node].readyAt-clock,60000);assert.equal(notice(),null);assert.equal(saves,1);
 });
 check('respeta cerrar la gestión manualmente al refrescar',()=>{
  reset();pauseStone();render();management().open=false;render();assert.equal(management().open,false);
 });
 check('Ver pausadas vuelve a abrir la gestión y lleva el foco a su resumen',()=>{
  reset();pauseStone();render();management().open=false;
  const link=doc.getElementById('prod-ver-pausadas');assert(link&&!link.disabled);link.click();
  assert.equal(management().open,true);assert.equal(doc.activeElement,management().querySelector('summary'));assert(scrolls>0);
 });
 check('mostrar y refrescar las pausas no reactiva, cobra ni guarda automáticamente',()=>{
  reset();pauseStone({full:true});const before=snapshot();render();render();assert.equal(snapshot(),before);assert.equal(saves,0);
 });
 check('un nodo Golden con cupo propio puede reactivarse aun con los cupos comunes completos',()=>{
  reset();const slot=c.GF.WORLD_OBJECTS.findIndex(o=>o.premiumOnly&&o.type==='rock');assert(slot>=0);
  c.G.produccion.premium={v:1,compras:[{id:'11111111-1111-4111-8111-000000000001',tipo:'rock',coste:1,desde:clock,nodo:slot}]};
  c.G.produccion.nodos[slot]=true;c.G.produccion.pausas['n:'+slot]={at:clock,estado:{readyAt:clock+60000}};
  const rock=c.produccionItems().find(o=>o.i===slot&&o.type==='rock');assert(rock);render();const b=button(rock);
  assert.equal(c.produccionUsados(),c.produccionCapacidad());assert.equal(b.disabled,false);
  assert.match(b.closest('.row').textContent,/cupo propio Golden/);assert(!/Sin cupo libre/i.test(b.closest('.row').textContent));
  assert(!/Sin cupo libre|No queda cupo libre/i.test(notice().textContent));
  b.click();assert.equal(c.produccionPausada(rock),false);assert.equal(c.produccionUsados(),c.produccionCapacidad());
 });

 dom.window.close();console.log('\n✓ '+checks+' contratos de producción pausada y reactivación visibles.\n');
})().catch(error=>{dom.window.close();console.error(error);process.exitCode=1;});
