const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'supabase/functions/guardar/index.ts'),'utf8');
const rules=source.slice(source.indexOf('const VERSION ='),source.indexOf('/* === FIN REGLAS === */'));
const ctx=vm.createContext({Math,Number,Array,Object,Set,Date,isFinite});vm.runInContext(rules,ctx);
const real=require('./arrancar-el-juego.contexto').arrancar(root).ctx;
const run=s=>vm.runInContext(s,ctx),read=s=>vm.runInContext(s,real),now=1800000000000;
const initial=JSON.parse(read('JSON.stringify(snapshot())'));initial.golden=120;
function check(prev,next){ctx.prev=structuredClone(prev);ctx.next=structuredClone(next);return run('protegerEconomia(prev,next,1800000000000)');}
let next=structuredClone(initial);next.golden+=1e6;assert.ok(check(initial,next).some(x=>x.includes('Golden')));
next=structuredClone(initial);next.produccion.base=9999;assert.ok(check(initial,next).some(x=>x.includes('Capacidad')));
next=structuredClone(initial);next.produccion.vipHasta=now+30*86400000;next.produccion.vipAplicado=true;
assert.ok(check(initial,next).some(x=>x.includes('Golden')),'VIP sin pagar rechazado');
next.golden-=100;assert.equal(check(initial,next).length,0,'VIP único pagado admitido');
let vip=structuredClone(next);vip.pass.stars=120;vip.pass.claimV={};
next=structuredClone(vip);next.pass.claimV[3]=true;next.golden+=5;assert.equal(check(vip,next).length,0);
let cobrado=structuredClone(next);next=structuredClone(cobrado);next.pass.claimV={};assert.ok(check(cobrado,next).length);
next=structuredClone(cobrado);next.golden+=5;assert.ok(check(cobrado,next).length,'mismo premio no paga dos veces');
next=structuredClone(initial);next.pass.stars=1000000;assert.ok(check(initial,next).some(x=>x.includes('Estrellas')));
next=structuredClone(initial);next.produccion.base=9999;next.golden=20;assert.ok(check(null,next).length,'primera partida también protegida');
next=structuredClone(initial);next.expansiones=1;assert.ok(check(initial,next).some(x=>x.includes('obra')),'no regala expansión');
next=structuredClone(initial);next.plotsOwned=10;assert.ok(check(initial,next).some(x=>x.includes('capacidad')));
next=structuredClone(initial);next.cont={items:[{k:'golden',n:1e6}]};assert.ok(check(initial,next).some(x=>x.includes('Golden')),'no blanquea Golden en contenedores');
next=structuredClone(initial);next.golden+=1e6;next.cont={items:[{k:'golden',n:-1e6}]};assert.ok(check(initial,next).some(x=>x.includes('Golden')),'no compensa emisión con un contenedor negativo');
next=structuredClone(initial);next.golden-=10;next.cont={items:[{k:'golden',n:10}]};assert.equal(check(initial,next).length,0,'mover moneda propia no es emisión');
const catalogo=run('NODOS_CONTRATO');assert.equal(catalogo.length,real.GF.WORLD_OBJECTS.filter(o=>['tree','rock','ore'].includes(o.type)).length);
for(const [i,t,lock,exp] of catalogo){const o=real.GF.WORLD_OBJECTS[i];assert.equal(t,o.type==='ore'?o.ore:o.type);assert.equal(exp,o.exp);if(lock!=null)assert.equal(lock,real.GF.COLLISIONS[i].lock);}
assert.deepEqual(Array.from(run('FARM_XP_CONTRATO')),Array.from(real.FARM_XP_LVLS));
for(const exp of [0,1,3,8,16]){
 const legacy=structuredClone(initial);delete legacy.produccion;legacy.expansiones=exp;legacy.expParcelasDadas=exp;legacy.plotsOwned=3+exp;legacy.treesOpen=[0,1,2];legacy.rocksOpen=[0,1,2];
 real.qaLegacy=legacy;read('estadoDeCero();hydrate(qaLegacy);');const migrated=JSON.parse(read('JSON.stringify(snapshot())'));
 assert.equal(check(legacy,migrated).length,0,'conserva legado con '+exp+' expansiones');
 assert.equal(check(migrated,structuredClone(migrated)).length,0,'legado migrado sigue guardando '+exp);
}
assert.equal(read('Array.from({length:16},(_,i)=>expansionPrecioCupo(i)).reduce((s,x)=>s+x,0)'),7720);
read('G.produccion.base=5;G.expansiones=16;');assert.equal(read('produccionVipCupos()'),6,'VIP escala con la granja, no se diluye al final');
read("G.skills.farming=0;G.skills.mining=5000;G.skills.tala=0;G.farmXpBase=0;G.level=24;");
assert.equal(read('farmPuedeSubir()'),true,'minero puede completar progreso sin cultivos ni tala');
read('G.level=25;prestige();');assert.equal(read('farmXpProductiva()'),0,'prestigio no reutiliza XP vieja');
const saved=read('JSON.stringify(snapshot())');real.qaGuardado=JSON.parse(saved);read('G.farmXpBase=0;hydrate(qaGuardado);');assert.equal(read('farmXpProductiva()'),0,'offset conserva el prestigio al recargar');
console.log('OK: Golden, contenedores, VIP pagado, pase sin duplicación, estrellas, capacidad, obras, contrato del mundo, curva de expansiones y progreso minero/prestigio.');
