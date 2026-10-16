'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.resolve(__dirname,'..'),{ctx}=require('./arrancar-el-juego.contexto').arrancar(repo),run=s=>vm.runInContext(s,ctx);
let clock=1800000000000;ctx.nowMs=()=>clock;ctx.toast=()=>{};ctx.log=()=>{};ctx.saveFarm=()=>{};ctx.refreshHud=()=>{};ctx.isOpen=()=>false;
ctx.estadoDeCero();ctx.G.energiaGranja={v:1,actual:0,at:clock};
assert.equal(ctx.energiaGranjaPagar('plant'),false);clock+=3600000;assert.equal(ctx.energiaGranjaTick(),25);
const snap=JSON.parse(JSON.stringify(ctx.snapshot()));clock+=3600000;ctx.hydrate(snap);assert.equal(ctx.energiaGranjaTick(),50);
clock+=2*3600000;assert.equal(ctx.energiaGranjaTick(),100);clock-=3600000;assert.equal(ctx.energiaGranjaTick(),100,'retrasar reloj no resta ni regala');clock+=3600000;
ctx.G.energiaGranja={v:1,actual:0,at:clock};ctx.G.res.madera=0;assert.equal(ctx.energiaGranjaAgregar('madera',1,'chop'),false);assert.equal(ctx.G.res.madera,0);
ctx.G.energiaGranja.actual=50;const add=ctx.tryAddRes;ctx.tryAddRes=()=>false;assert.equal(ctx.energiaGranjaAgregar('madera',1,'chop'),false);assert.equal(ctx.G.energiaGranja.actual,50,'bolsa llena no cobra');ctx.tryAddRes=add;
ctx.G.built.cocina=true;ctx.G.res.papa=0;ctx.cook('papa_asada');assert.equal(ctx.G.energiaGranja.actual,50,'receta inválida no cobra');
ctx.G.res.papa=10;ctx.cook('papa_asada');assert.equal(ctx.G.energiaGranja.actual,49);
const stam=ctx.G.stam;ctx.energiaGranjaPagar('mine');assert.equal(ctx.G.stam,stam,'energía y combate son independientes');
const source=fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8'),block=source.split('/* === REGLAS ===')[1].split('/* === FIN REGLAS === */')[0];
// El marcador incluye el comentario introductorio: extraer desde la primera constante.
const rules=block.slice(block.indexOf('const VERSION'));
const server={console,Date,Math,JSON,Number,Object,Array,Set,String,isFinite};vm.createContext(server);vm.runInContext(rules,server);
const prices=vm.runInContext('ARTEFACTOS_PRECIOS',server),defs=run('ARTEFACTO_DEF');
for(const id of Object.keys(prices)){
 assert.equal(prices[id],defs[id].golden);
 assert.equal(ctx.artefactoDiario(id),server.objetoPlataDiaria(id),'producción cliente/servidor '+id);
 const dias=prices[id]*10000/server.objetoPlataDiaria(id);
 assert.ok(dias>=90&&dias<=120,'balance orientativo inicial '+id);
}
assert.equal(run('GOLDEN_EN_PLATA'),500,'ancla de referencia real');
const operar=server.artefactoOperacion,base=clock;
let d={golden:10000,plata:0,energiaGranja:{v:1,actual:100,at:base}};
for(const id of Object.keys(prices)){const r=operar(d,'comprar',id,base,'buy-'+id);assert.equal(r.error,undefined);d=r.data;}
const totalCoste=Object.values(prices).reduce((a,b)=>a+b,0);
assert.equal(d.golden,10000-totalCoste);assert.ok(operar(d,'comprar','cobre',base,'duplicado').error);
assert.ok(operar(d,'comprar','constructor',base,'invalido').error);
const clone=JSON.stringify(d);operar(d,'cobrar','cobre',base+14400000,'sin-mutacion');assert.equal(JSON.stringify(d),clone,'la propuesta no muta la fila antes del CAS');
let pasos=0;for(let dia=1;dia<=180;dia++){
 for(const id of Object.keys(prices)){
  const at=base+dia*86400000,op='claim-'+(++pasos),r=operar(d,'cobrar',id,at,op);assert.equal(r.error,undefined);assert.ok(Math.abs(r.cobro*10-Math.round(r.cobro*10))<1e-6,'cobra décimas de Plata');d=r.data;
  const repeat=operar(d,'cobrar',id,at,op);assert.equal(JSON.stringify(repeat.data),JSON.stringify(d));assert.equal(repeat.repetido,true);
 }
 if(dia===105)assert.ok(Math.abs(d.plata-((totalCoste-150)*10000+13000*105))<0.71,'balance nominal de 105 días, granero 13000/día');
}
const diaria=Object.keys(prices).reduce((n,id)=>n+server.objetoPlataDiaria(id),0);
assert.ok(Math.abs(d.plata-diaria*180)<0.71,'emisión acotada por vida útil y residuo');
assert.equal(d.golden,10000-totalCoste,'los objetos no emiten Golden directo');
assert.ok(operar(d,'cobrar','cobre',base+181*86400000,'despues').error,'no sigue emitiendo al vencer');
let a=operar({golden:10,plata:0},'comprar','cobre',base,'nuevo').data;
const cap=operar(a,'cobrar','cobre',base+10*86400000,'tope');assert.ok(cap.cobro<=server.objetoPlataDiaria('cobre'),'acumulación de 24 horas');
a={...a,energiaGranja:{v:1,actual:0,at:base+86400000}};assert.ok(operar(a,'cobrar','cobre',base+86400000,'vacio').error);
const prev=JSON.parse(JSON.stringify(d)),next=JSON.parse(JSON.stringify(d));next.artefactos.items.cobre.desde=0;
function reordenar(v){return Array.isArray(v)?v.map(reordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).reverse().map(k=>[k,reordenar(v[k])])):v;}
assert.equal(server.mismoJSON(d.artefactos,reordenar(d.artefactos)),true,'JSONB puede reordenar claves sin cambiar la propiedad');
assert.ok(!server.protegerEconomia(reordenar(d),JSON.parse(JSON.stringify(d)),base+180*86400000).some(e=>e.includes('objetos productores')),'guardar tras cobrar no se bloquea por orden de claves');
const errs=server.protegerEconomia(prev,next,base+180*86400000);assert.ok(errs.some(e=>e.includes('objetos productores')),'guardado normal no puede falsificar propiedad');
const eprev={energiaGranja:{v:1,actual:0,at:base}},enext={energiaGranja:{v:1,actual:100,at:base+999999999}};
server.protegerEconomia(eprev,enext,base+3600000);assert.equal(enext.energiaGranja.actual,25,'servidor limita reloj manipulado');
console.log('OK: energía persistente, siete objetos, 180 cobros diarios, balance inicial de 105–116 días, emisión en Plata, tope 24 h, vencimiento y recibos.');
