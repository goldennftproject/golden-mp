'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),{ctx}=require('./arrancar-el-juego.contexto').arrancar(repo);
let clock=1800000000000;ctx.nowMs=()=>clock;ctx.toast=()=>{};ctx.log=()=>{};ctx.saveFarm=()=>{};ctx.refreshHud=()=>{};ctx.reiniciarGranjaSuave=()=>{};ctx.celebrate=()=>{};
const source=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8'),server={Math,Number,Array,Object,Set,Date,isFinite,JSON};vm.createContext(server);vm.runInContext(source.slice(source.indexOf('const VERSION ='),source.indexOf('/* === FIN REGLAS === */')),server);
const snap=()=>JSON.parse(JSON.stringify(ctx.snapshot())),check=(a,b)=>server.protegerEconomia(structuredClone(a),structuredClone(b),clock);
ctx.estadoDeCero();ctx.G.level=25;ctx.G.plata=100000;ctx.G.res.madera=100;ctx.G.res.piedra=100;
let last;
for(let n=1;n<=16;n++){
 const e=ctx.expansionSiguiente();assert.equal(e.n,n);last=e;
 ctx.G.expObra={i:e.i,n:e.n,desde:clock-n*600000-1,hasta:clock-1};const before=snap();
 assert.equal(ctx.expansionObraTick(),true);const after=snap();assert.equal(after.produccion.vale,n);assert.equal(after.plotsOwned,3,'no asigna parcela automáticamente');assert.equal(ctx.produccionUsados(),5);
 assert.equal(check(before,after).length,0,'servidor acepta el vale de la expansión '+n);
 assert.equal(ctx.expansionObraTick(),false);assert.equal(ctx.G.produccion.vale,n);
}
assert.equal(ctx.expansionEntregar(last),false,'repetir la entrega no duplica vales');
const saved=snap();ctx.hydrate(saved);assert.equal(ctx.G.produccion.vale,16,'F5 no recorta los vales acumulados');
for(let n=0;n<16;n++){
 const tipo=['tree','rock','plot'][n%3],before=snap(),balance=ctx.G.plata;
 assert.equal(ctx.produccionComprar(tipo),true,'se puede elegir '+tipo+' para el vale '+n);
 assert.equal(ctx.G.plata,balance);assert.equal(ctx.G.produccion.vale,15-n);assert.equal(check(before,snap()).length,0,'canje validado en servidor '+tipo);
}
const full=snap();assert.equal(ctx.produccionComprar('plot'),false,'sin cupo no consume ni cobra');assert.equal(ctx.G.plata,full.plata);
ctx.estadoDeCero();ctx.G.expansiones=5;const old=snap();delete old.produccion.valesV;old.produccion.vale=1;
ctx.hydrate(old);const migrated=snap();assert.equal(migrated.produccion.vale,5,'conserva primera sin usar y acredita otras cuatro');assert.equal(migrated.produccion.valesV,2);assert.equal(check(old,migrated).length,0);
ctx.hydrate(migrated);assert.equal(ctx.G.produccion.vale,5,'compensación una sola vez');assert.equal(check(migrated,snap()).length,0);
const forged=snap();forged.produccion.vale++;assert.ok(check(migrated,forged).some(e=>e.includes('Vale')),'no se inventan vales');
const downgraded=snap();delete downgraded.produccion.valesV;assert.ok(check(migrated,downgraded).some(e=>e.includes('vales')),'no se elimina la marca para repetir la compensación');
const lost=snap();lost.produccion.vale--;assert.ok(check(migrated,lost).some(e=>e.includes('sin nodo')),'no desaparece un vale sin recibir nodo');
const initial=ctx.estadoDeCero();const fresh=snap();fresh.produccion.vale=1;assert.ok(check(null,fresh).some(e=>e.includes('vales')),'granja nueva no crea vales iniciales');
ctx.document=new JSDOM(fs.readFileSync(path.join(repo,'public/index.html'),'utf8')).window.document;ctx.G.expansiones=1;ctx.G.produccion.vale=1;ctx.refreshCobertizo();
const area=ctx.document.getElementById('prod-granja');assert.equal(area.querySelector('[data-prod-buy="tree"]').closest('details').open,true,'la elección gratuita se abre, no la ayuda');
for(const k of ['tree','rock','plot'])assert.match(area.querySelector('[data-prod-buy="'+k+'"]').textContent,/incluido/);
assert.match(area.textContent,/consume un vale/);console.log('OK: 16 expansiones entregan vales elegibles, acumulación/F5, tres tipos sin cobro, cupo físico, compensación idempotente y rechazo de duplicación en servidor.');
