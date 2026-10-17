'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..'));
const {GF,G}=ctx;
ctx.estadoDeCero(); assert.equal(G.espacioV,4); GF.configurarEspacio(4); GF.aplicarTerreno(0);
assert.equal(GF.COLS_BASE,6);assert.equal(GF.ROWS_BASE,6);
assert.equal(GF.terreno(0).mias.size,36); assert.equal(GF.terreno(16).mias.size,196);
assert.equal(ctx.produccionCapacidad(),5); assert.equal(ctx.produccionUsados(),5);
for(const [width,height] of [[1280,720],[1920,1080],[1024,600]]){
 let zoom=0; const scene=Object.create(vm.runInContext('FarmScene',ctx).prototype);
 scene.scale={width,height};scene.cameras={main:{setZoom:z=>zoom=z}};scene.fitCamera();
 assert.ok(GF.WORLD_H*zoom<=height-160,'la granja cabe entre HUD y barra');
 assert.ok(GF.WORLD_W*zoom<=width,'ningún lateral se recorta');
}
// Huellas reales de TODOS los elementos presentes, no de los planos futuros.
const ocupadas=new Map();
const add=(c,r,t)=>{assert.equal(GF.enCerca(c,r),false,`${t} en cerca ${c},${r}`);const k=c+','+r;assert.equal(ocupadas.has(k),false,`${t} solapa ${ocupadas.get(k)} en ${k}`);ocupadas.set(k,t);};
GF.WORLD_OBJECTS.forEach((o,i)=>{if(!GF.objetoPresente(GF.COLLISIONS[i]))return;for(let k=0;k<o.wCells;k++)add(o.leftCol+k,o.baseRow-1,o.type);});
GF.PLOTS.slice(0,3).forEach(p=>add(p.col,p.row,'parcela'));
assert.equal(GF.PESCA_ACTIVA,false);assert.equal(ocupadas.size,15,'todo el inicio cabe sin solaparse');
add(4,4,'portal');assert.equal(ocupadas.size,16,'portal reservado sin pisar cultivos ni servicios');
// Siempre queda sitio para planos de 3 celdas sin quitar la laguna/cultivos.
let huecos=0;for(let r=1;r<8;r++)for(let c=1;c<6;c++)if([0,1,2].every(k=>!ocupadas.has((c+k)+','+r))){huecos++;break;}
assert.equal(ctx.tutoCabePlano('store'),false,'expandir es necesario para la Herrería');
G.expansiones=1;GF.aplicarTerreno(1);assert.equal(ctx.tutoCabePlano('store'),true,'primera expansión aporta espacio útil');G.expansiones=0;GF.aplicarTerreno(0);
const nuevo=JSON.parse(JSON.stringify(ctx.snapshot()));ctx.hydrate(nuevo);assert.equal(G.espacioV,4);
for(const v of [1,2,3,4]){
 GF.configurarEspacio(v);let previo=null,interiorPrevio=0;
 assert.equal(GF.WORLD_OBJECTS.length,86,'índices del portero estables');
 for(let n=0;n<=16;n++){
  const t=GF.aplicarTerreno(n);
  const interior=Array.from(t.mias).filter(k=>{const [c,r]=k.split(',').map(Number);return !GF.enCerca(c,r);}).length;
  if(n>0)assert.ok(interior>interiorPrevio,`v${v} expansión ${n}: añade espacio interior útil`);interiorPrevio=interior;
  if(previo){const e=GF.EXPANSIONES[n-1];assert.equal(t.mias.size-previo.size,(e.c1-e.c0)*(e.r1-e.r0));for(const k of previo)assert.ok(t.mias.has(k),'nunca se pierde terreno');}
  const visit=new Set(),cola=[t.mias.values().next().value];while(cola.length){const k=cola.pop();if(visit.has(k)||!t.mias.has(k))continue;visit.add(k);const [c,r]=k.split(',').map(Number);cola.push(`${c-1},${r}`,`${c+1},${r}`,`${c},${r-1}`,`${c},${r+1}`);}
  assert.equal(visit.size,t.mias.size,`v${v} etapa ${n}: terreno conectado`);
  previo=t.mias;
 }
}
// Una partida existente con layout conserva el mapa y su progreso.
ctx.estadoDeCero();ctx.hydrate({level:7,plata:456,layout:{0:{cx:462,by:84}},expansiones:2});
assert.equal(G.espacioV,1);assert.equal(G.level,7);assert.equal(G.plata,456);
GF.configurarEspacio(G.espacioV);assert.equal(GF.COLS_BASE,15);
// Un comienzo aún sin editar pasa al mapa pequeño sin regalar la carga del nodo.
ctx.estadoDeCero();ctx.hydrate({level:1,plata:3,reinicio:100,nodos:{'tree:10,2':{readyAt:999999}}});
assert.equal(G.espacioV,2);assert.equal(G.nodos['tree:9,2'].readyAt,999999);
const snap=JSON.parse(JSON.stringify(ctx.snapshot()));ctx.hydrate(snap);assert.equal(G.espacioV,2);assert.equal(G.nodos['tree:9,2'].readyAt,999999);
console.log('OK: inicio 6×6 sin solapamientos, 16 expansiones conectadas y útiles, contrato de 86 objetos estable, mapas anteriores preservados.');
