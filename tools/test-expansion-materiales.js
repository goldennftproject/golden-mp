'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{ctx:c}=require('./arrancar-el-juego.contexto').arrancar(root),run=s=>vm.runInContext(s,c),source=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');
const rules=source.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0],s={};vm.createContext(s);vm.runInContext(rules.slice(rules.indexOf('const VERSION')),s);
const t=Date.now(),snap=()=>JSON.parse(JSON.stringify(c.snapshot()));c.nowMs=()=>t;for(const k of ['toast','log','saveFarm','refreshHud','closeOv'])c[k]=()=>{};
const tabla=vm.runInContext('EXPANSION_MATERIALES',s);
for(let i=0;i<16;i++){
 c.estadoDeCero();c.G.expansiones=i;c.G.level=25;c.G.plata=50000;c.G.res={madera:1000,piedra:1000,bronce:1000,hierro:1000,oro:1000,diamante:1000,netherita:1000};
 const e=c.expansionSiguiente(),recipe={...e.costo};delete recipe.plata;
 assert.equal(JSON.stringify(recipe),JSON.stringify(tabla[i]),'contrato cliente/servidor '+(i+1));assert.equal(e.costo.plata,c.expansionPrecioCupo(i));
 if(i>0)assert.equal(JSON.stringify(recipe),run('JSON.stringify(expansionCostos()['+i+'])'));
 const prev=snap();assert.equal(c.expansionComprar(),true);const next=snap();assert.equal(prev.plata-next.plata,e.costo.plata);
 for(const [k,q] of Object.entries(recipe))assert.equal(prev.res[k]-next.res[k],q);
 assert.equal(s.protegerEconomia(prev,structuredClone(next),t).length,0,'compra aceptada '+(i+1));assert.equal(s.ventaStockPermiso(prev,next),0,'materiales gastados no son ventas');
 for(const k of Object.keys(recipe)){const unpaid=structuredClone(next);unpaid.res[k]++;assert.ok(s.protegerEconomia(prev,unpaid,t).some(e=>e.includes('materiales')),'no omitir '+k+' en '+(i+1));}
 const falta=Object.keys(recipe)[0];c.hydrate(prev);c.G.res[falta]=recipe[falta]-1;const money=c.G.plata;assert.equal(c.expansionComprar(),false);assert.equal(c.G.plata,money);assert.ok(!c.G.expObra);
}
c.estadoDeCero();c.G.expansiones=1;c.G.level=25;c.G.plata=1000;c.G.res={madera:13,piedra:10};c.G.tools.axe=5;c.G.energiaGranja={v:1,actual:50,at:t};const p=snap();c.G.res.madera=15;c.G.tools.axe=3;c.G.stats.talar={_:2};c.G.actividadAcciones.chop=2;c.G.logrosAcciones.madera=2;c.G.energiaGranja.actual=46;assert.equal(c.expansionComprar(),true);assert.equal(s.protegerEconomia(p,snap(),t).length,0,'recolección corroborada y compra en el mismo guardado');
const old=snap();old.expObra.hasta=t-1;old.res={};const done=structuredClone(old);done.expansiones=2;done.expObra=null;done.produccion.vale++;
assert.equal(s.protegerEconomia(old,done,t).length,0,'obra ya pagada no se recobra');
console.log('OK: 16 recetas, Plata y materiales cobrados, faltantes bloqueados, recolección simultánea corroborada y obras anteriores sin recobro.');
