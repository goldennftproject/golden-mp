'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/game/forest.js','utf8');
for(const filas of [6,9,12,15,25]){
 const stop=new Error('dimensiones listas'),GF={TILE:42,ROWS_BASE:filas,WORLD_H:filas*42};
 Object.defineProperty(GF,'uiOpen',{set(){throw stop;}});
 const ctx={GF,Phaser:{Scene:class{}},console};vm.createContext(ctx);vm.runInContext(source+';globalThis.Escena=ForestScene;',ctx);
 const scene=new ctx.Escena();assert.throws(()=>scene.create(),e=>e===stop);
 assert.equal(scene.W,1344);assert.equal(scene.H,630,'la Zona conserva 15 filas con granja de '+filas);assert.equal(GF.ROWS_BASE,filas);assert.equal(GF.WORLD_H,filas*42);
}
console.log('OK: Zona 32x15 independiente de granjas 6/9/12/15 y expansiones; la granja no cambia.');
