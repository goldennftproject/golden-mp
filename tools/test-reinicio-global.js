'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const { ctx } = require('./arrancar-el-juego.contexto').arrancar(repo);
vm.runInContext('UID="prueba"; estadoDeCero(); G.reinicio=200;', ctx);
const copia = { uid:'prueba', nivel:25, plata:999999, data:{reinicio:100} };
assert.equal(ctx.copiaEsMejor(copia), false, 'el respaldo viejo no resucita');
copia.data.reinicio = 200;
assert.equal(ctx.copiaEsMejor(copia), true, 'recuperación normal de la misma partida');
copia.uid = 'otro';
assert.equal(ctx.copiaEsMejor(copia), false);
const source = fs.readFileSync(path.join(repo,'supabase/functions/guardar/index.ts'),'utf8');
const guard = source.match(/if \(Number\(prevRow\?\.data\?\.reinicio[^\n]+/)[0];
for (const data of [{}, {reinicio:100}, {reinicio:200}]) {
  const c = {prevRow:{data:{reinicio:200}},data,json:(body,status)=>({body,status})};
  const result = vm.runInNewContext('(function(){'+guard+'})()',c);
  assert.equal(result?.status, data.reinicio===200 ? undefined : 409);
}
ctx.estadoDeCero();
assert.equal(ctx.G.level,1); assert.equal(ctx.G.plata,3); assert.equal(ctx.G.golden,20);
assert.equal(ctx.G.produccion.vipHasta,0); assert.equal(ctx.G.expansiones,0);
assert.ok(Object.values(ctx.G.res).every(n=>n===0));
assert.equal(ctx.G.tuto.step,0); assert.equal(ctx.G.kitReclamado,false);
console.log('OK: reinicio global bloquea respaldos y escrituras anteriores, conserva recuperación válida y estado inicial real.');
