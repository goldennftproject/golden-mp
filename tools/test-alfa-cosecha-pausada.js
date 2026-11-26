'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { arrancar } = require('./arrancar-el-juego.contexto');

const root = path.resolve(__dirname, '..');
const doc = new JSDOM(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8')).window.document;
doc.defaultView.HTMLElement.prototype.scrollIntoView = function () {};
const { ctx: c } = arrancar(root, { 'game/main.js': '' });

(async () => {
  await c.SAVE_READY;
  for (const name of ['saveFarm', 'refreshHud', 'toast', 'log']) c[name] = () => {};
  c.document = doc;
  c.innerWidth = 1360;
  c.estadoDeCero();
  c.tutoMigrar();
  c.G.kitReclamado = true;
  c.G.tuto.step = c.tutoIdx('harvest');
  c.G.tuto.n = 1;
  const plots = [100, 150, 200].map((cx, i) => ({
    type: 'plot', i, cx, by: 400, state: i === 2 ? 'dry' : 'ready',
    cropKey: i === 2 ? null : 'papa',
  }));
  const proto = vm.runInContext('FarmScene.prototype', c);
  const scene = {
    plots,
    cancelarCamaraGuia() {},
    programarCamaraGuia(x) { this.panX = x; },
    syncPlots: proto.syncPlots,
    updateTutoArrow: proto.updateTutoArrow,
    nodoGuiaUsable: proto.nodoGuiaUsable,
  };
  c.window.farmScene = scene;
  scene.syncPlots();

  assert.equal(c.produccionAlternar('p:0'), true);
  assert.equal(c.tutoTxt(c.tutoActivo()), 'Cosecha 1 papa');
  scene.updateTutoArrow();
  assert.equal(scene.panX, 150, 'la cámara va a la única parcela cosechable');
  assert.deepEqual(Array.from(proto.objetivosDestinoGuia.call(scene, c.guiaDestinoActual()), p => p.i), [1]);

  assert.equal(c.produccionAlternar('p:1'), true);
  scene.updateTutoArrow();
  assert.equal(scene.guiaTarget, null, 'se cancela la señal del mundo cuando no hay cosecha activa');
  assert.match(c.tutoTxt(c.tutoActivo()), /Reactiva la Parcela 1/);
  assert.equal(c.guiaDestinoActual().ui, '[data-prod-pause="p:0"]');
  const cobertizo = doc.getElementById('ov-cobertizo');
  c.openOv = (id) => {
    assert.equal(id, 'ov-cobertizo');
    cobertizo.classList.add('show');
    c.refreshCobertizo();
  };
  c.mostrarObjetivo();
  assert.equal(doc.activeElement.dataset.prodPause, 'p:0');
  assert.match(doc.activeElement.textContent, /Reactivar/);
  assert.equal(c.G.tuto.n, 1, 'la guía no reactiva ni cambia el progreso');

  const cupo = c.produccionCapacidad();
  c.GF.WORLD_OBJECTS.some((node, i) => {
    if (['tree', 'rock', 'ore'].includes(node.type)) c.G.produccion.nodos[i] = true;
    return c.produccionUsados() >= cupo;
  });
  assert.equal(c.produccionHayCupo(), false);
  assert.match(c.tutoTxt(c.tutoActivo()), /Pausa otra producción .*reactivar la Parcela 1/);
  assert.equal(c.guiaDestinoActual().ui, '#prod-gestion > summary');
  c.mostrarObjetivo();
  assert.equal(doc.activeElement.parentElement.id, 'prod-gestion');

  assert.equal(c.produccionAlternar('p:2'), true, 'liberar cupo por el comportamiento real');
  scene.syncPlots();
  c.window.farmScene = null;
  c.hydrate(JSON.parse(JSON.stringify(c.snapshot())));
  assert.equal(c.tutoActivo().id, 'harvest');
  assert.equal(c.G.tuto.n, 1);
  assert.equal(c.G.plots[0].cropKey, 'papa');
  assert.equal(c.G.plots[0].state, 'ready');
  assert.equal(c.guiaDestinoActual().ui, '[data-prod-pause="p:0"]');
  assert.equal(c.produccionAlternar('p:0'), true);
  assert.equal(c.G.plots[0].cropKey, 'papa');
  assert.equal(c.G.plots[0].state, 'ready');
  assert.equal(c.tutoTxt(c.tutoActivo()), 'Cosecha 1 papa');
  assert.equal(c.guiaDestinoActual().target, 'plot');
  assert.equal(c.G.tuto.n, 1);
  console.log('OK: guía de cosecha con pausa parcial, pausa total, cupo lleno y reactivación después de recargar.');
})().catch(e => { console.error(e); process.exitCode = 1; });
