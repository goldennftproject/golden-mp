'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),fs=require('node:fs');
const {ctx}=require('./arrancar-el-juego.contexto').arrancar(path.resolve(__dirname,'..')),run=s=>vm.runInContext(s,ctx),{GF,G}=ctx;
ctx.estadoDeCero();GF.configurarEspacio(4);GF.aplicarTerreno(0);ctx.toast=()=>{};
assert.equal(GF.PESCA_ACTIVA,false);assert.equal(GF.esPescaOculta('ov-lonja'),true);
G.fish={'carpa@1.00':2};G.escamas=7;G.skills.fishing=123;
G.nasas=[{id:'junco',listaEn:0}];
const antes=JSON.stringify(G);
assert.equal(ctx.pescaV4Abrir(),false);ctx.pescaAparejosAbrir();
assert.equal(ctx.lanceSacar('junco'),null);assert.equal(ctx.pezVender('carpa@1.00',1),false);
assert.equal(ctx.nasaCalar('junco'),false);assert.equal(ctx.nasaCobrar(0),false);assert.equal(ctx.lonjaEntregarEscalon(0),false);
assert.equal(ctx.canaV4Comprar('junco'),false);assert.equal(ctx.canaReparar('junco'),false);
assert.equal(ctx.puedeAccion('fish',{}).ok,false,'todas las entradas de pesca comparten el bloqueo');
assert.equal(JSON.stringify(G),antes,'pausa no gasta, produce ni borra equipo o progreso');
for(const id of ['fish','lonja','excavar'])assert.equal(ctx.tutoHecho({id}),true,'tutorial no exige pesca pausada');
const snap=JSON.parse(JSON.stringify(ctx.snapshot()));ctx.hydrate(snap);
assert.equal(G.skills.fishing,123);assert.equal(G.fish['carpa@1.00'],2);assert.equal(G.nasas.length,1);assert.equal(G.espacioV,4);
// El catálogo del servidor no cambia ni pierde índices al compactar expansiones.
const src=fs.readFileSync('supabase/functions/guardar/index.ts','utf8');
const contrato=vm.runInNewContext(src.match(/const NODOS_CONTRATO = ([\s\S]*?);/)[1]);
for(const [i,t] of contrato){const o=GF.WORLD_OBJECTS[i];assert.equal(o.type==='ore'?o.ore:o.type,t,'contrato nodo '+i);}
G.tuto={step:run("tutoIdx('place_store')"),done:false,n:0};G.expansiones=0;GF.aplicarTerreno(0);
assert.equal(ctx.tutoActivo().id,'espacio_inicial');
G.expansiones=1;GF.aplicarTerreno(1);assert.equal(ctx.tutoActivo().id,'place_store','expansión devuelve el paso original sin cambiar índices');
// Todos los planos tempranos pueden colocarse ampliando, sin borrar objetos iniciales.
G.obras={};
for(const tipo of ['store','horno','cocina']){
 let colocado=false;
 for(let intentos=0;intentos<17&&!colocado;intentos++){
  const o=GF.WORLD_OBJECTS.find(o=>o.type===tipo);
  for(const k of GF.terreno(G.expansiones).mias){const [c,r]=k.split(',').map(Number);
   if(Array.from({length:o.wCells},(_,i)=>!GF.enCerca(c+i,r)&&!GF.celdaOcupada(c+i,r)).every(Boolean)){
    G.obras[tipo]={col:c,row:r};GF.ocupCambio();colocado=true;break;
   }
  }
  if(!colocado){G.expansiones++;GF.aplicarTerreno(G.expansiones);}
 }
 assert.ok(colocado,tipo+' cabe tras expandir');
}
assert.ok(G.expansiones<=2,'dos primeras expansiones permiten la cadena temprana');
console.log('OK: pausa sin pérdidas ni producción, F5, contrato de nodos, tutorial sin pesca y espacio real para los tres planos tempranos.');
