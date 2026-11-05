'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const {ctx,HTML}=require('./arrancar-el-juego.contexto').arrancar(root);
const dom=new JSDOM(HTML,{url:'http://localhost'}),doc=dom.window.document;
ctx.document=doc;ctx.isOpen=()=>false;
let clock=Date.parse('2026-11-05T23:59:59Z'),requests=0,saves=0;
ctx.nowMs=()=>clock;
ctx.fetch=()=>{requests++;throw new Error('el contador no consulta la red');};
ctx.saveFarm=()=>{saves++;};ctx.economiaSolicitar=()=>{requests++;return Promise.resolve();};
const run=s=>vm.runInContext(s,ctx),badge=()=>doc.getElementById('misiones-contador'),button=doc.getElementById('misiones-acceso');
assert(button&&badge(),'el HTML real incluye el contador dentro del acceso existente');
assert.equal(badge().parentElement,button);
assert.equal(badge().getAttribute('aria-hidden'),'true','el nombre accesible lo da el botón');
const day=()=>new Date(clock).toISOString().slice(0,10);
function setDay(change={}){
  const j={v:2,dia:day(),energia:0,plata:0,progreso:{},cobradas:{},...change};
  ctx.__counterDay=j;
  run('estadoDeCero();G.actividadGranja={v:1,energia:0,bonoTotal:0,jornada:JSON.parse(JSON.stringify(__counterDay))}');
}
function sync(expected,label){
  const before=run('JSON.stringify(G)');run('syncJornadaBadge()');
  assert.equal(badge().hidden,expected===0,label+' · ocultación');
  assert.equal(badge().textContent,expected?String(expected):'',label+' · cantidad');
  assert.equal(run('JSON.stringify(G)'),before,label+' · no muta la partida');
  assert.equal(requests,0,label+' · sin consultas o cobros');assert.equal(saves,0,label+' · sin guardados');
  assert.ok(button.getAttribute('aria-label'),'el botón conserva un nombre accesible');
}
setDay();sync(0,'sin misiones completas');
setDay({progreso:{plant:19,platos:29,chop:9,mine:9},energia:199});sync(0,'objetivos parciales');
setDay({progreso:{plant:20}});sync(1,'una misión lista');assert.match(button.title,/1/);assert.match(button.getAttribute('aria-label'),/1/);
setDay({progreso:{plant:20,platos:30,chop:10,mine:10},energia:200});sync(5,'las cinco listas');
run('G.actividadGranja.jornada.cobradas.siembra=500;G.actividadGranja.jornada.plata=500');sync(4,'cobro confirmado');
run('G.actividadGranja.jornada.plata=5000');sync(0,'límite diario alcanzado');
setDay({plata:4900,progreso:{plant:20}});sync(1,'premio parcial positivo al borde del límite');
setDay({v:1,progreso:{plant:20,platos:30,chop:10,mine:10},energia:200});sync(0,'jornada antigua no cuenta');
setDay({progreso:{platos:30},cobradas:{cosecha:500},plata:500});sync(0,'premio antiguo de cosecha conserva cocina cobrada');
setDay({progreso:{plant:20},cobradas:{siembra:500},plata:500});sync(0,'no cuenta un premio ya cobrado');
setDay();run('G.actividadAcciones={plant:20,chop:10,mine:10};G.stats={plantar:{papa:20},talar:{madera:10}}');sync(0,'acciones locales todavía sin confirmar');
ctx.__ack={v:1,energia:10,bonoTotal:0,registro:{chop:10},jornada:{v:2,dia:day(),energia:10,plata:0,progreso:{chop:10},cobradas:{}}};
run('actividadGranjaRecibir(__ack);actividadGranjaRefrescar()');assert.equal(badge().hidden,false);assert.equal(badge().textContent,'1','el ACK refresca el acceso sin abrir el panel');
ctx.__ack.jornada.cobradas.madera=500;ctx.__ack.jornada.plata=500;
run('actividadGranjaRecibir(__ack);actividadGranjaRefrescar()');assert.equal(badge().hidden,true,'el ACK del cobro retira el contador');
setDay({progreso:{plant:20}});sync(1,'antes de medianoche UTC');clock+=2000;sync(0,'el latido después de medianoche retira el día vencido');
assert.equal(requests,0);assert.equal(saves,0);dom.window.close();

// El aspecto ilustrado conserva el mismo contador y el mismo botón al alternar.
const visual=new JSDOM('<button id="cfg-visual-v2"></button><nav id="compras-accesos">'+button.outerHTML+'</nav>',{url:'http://localhost',runScripts:'outside-only'}),w=visual.window;
w.innerWidth=1200;w.localStorage.setItem('gf_visual_v2','classic');
w.eval(fs.readFileSync(path.join(root,'public/game/visual-v2.js'),'utf8'));
const vb=w.document.getElementById('misiones-contador'),mb=w.document.getElementById('misiones-acceso');let clicks=0;
mb.addEventListener('click',()=>clicks++);vb.hidden=false;vb.textContent='2';
for(const on of [true,false,true,false]){
  w.GoldenVisual.setEnabled(on);
  assert.equal(w.document.getElementById('misiones-contador'),vb,'no sustituye o pierde el contador al cambiar aspecto');
  assert.equal(vb.parentElement,mb);assert.equal(vb.hidden,false);assert.equal(vb.textContent,'2');
  assert.equal(w.document.querySelectorAll('#misiones-contador').length,1);
  mb.click();
}
assert.equal(clicks,4,'el listener del botón existente sigue funcionando');
vb.hidden=true;vb.textContent='';w.GoldenVisual.setEnabled(true);assert.equal(vb.hidden,true,'el cambio de aspecto no revela un cero oculto');
visual.window.close();
console.log('OK: contador confirmado 0/1/5, parcial/cobrado/límite, ACK, migración, medianoche UTC, acciones no confirmadas sin premio, sin red/guardado/mutación y reversibilidad Clásico/Renovado con el mismo botón.');
