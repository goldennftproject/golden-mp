/* QA aislada: carga ForestScene real con el candidato como reemplazo en memoria.
   No abre navegador, red, partidas ni base de datos. node --test este-archivo.cjs
   --baseline permite demostrar qué casos nuevos fallan sobre la copia anterior. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const REPO = path.resolve(__dirname,'..');
const baseline = false;
const candidatePath = path.join(REPO,'public/game/forest.js');
const source = fs.readFileSync(candidatePath, 'utf8');
const guidePath = path.join(REPO,'public/game/grave-guide.js');
const { ctx, elementos, problemas } = require(path.join(REPO, 'tools/arrancar-el-juego.contexto.js'))
  .arrancar(REPO, { 'game/forest.js': source });
const read = code => vm.runInContext(code, ctx);
const Forest = read('ForestScene'), GF = read('GF'), G = ctx.G;
const notices = [];
if (fs.existsSync(guidePath)) vm.runInContext(fs.readFileSync(guidePath, 'utf8'), ctx, { filename: 'public/game/grave-guide.js' });
ctx.__qaNow = 1800000000000;
ctx.toast = message => notices.push(message);
for (const name of ['log', 'refreshHud', 'refreshMorral', 'syncSlots', 'placeCuerpoPanelPc', 'sfx']) ctx[name] = () => {};
ctx.isOpen = () => false;
ctx.clicDeInterfaz = () => false;
ctx.anyOvOpen = () => false;
ctx.hayOvPcAbierto = () => false;
ctx.nowMs = () => ctx.__qaNow;
ctx.saveFarm = () => Promise.resolve();
read('nowMs=window.nowMs; toast=window.toast; log=window.log; refreshHud=window.refreshHud; refreshMorral=window.refreshMorral; syncSlots=window.syncSlots; placeCuerpoPanelPc=window.placeCuerpoPanelPc; isOpen=window.isOpen; clicDeInterfaz=window.clicDeInterfaz; anyOvOpen=window.anyOvOpen; hayOvPcAbierto=window.hayOvPcAbierto;');

function el(id) {
  const node = elementos[id] || ctx.document.getElementById(id);
  node.classes = new Set();
  node.classList = {
    add: (...names) => names.forEach(name => node.classes.add(name)),
    remove: (...names) => names.forEach(name => node.classes.delete(name)),
    contains: name => node.classes.has(name),
    toggle(name, value) { if (value) node.classes.add(name); else node.classes.delete(name); },
  };
  return node;
}
let panel, prompt;
function sprite(x, y, bounds) {
  return { x, y, active: true, visible: true, destroyed: false,
    getBounds() { return bounds || { x: x - 12, y: y - 15, width: 24, height: 15 }; },
    destroy() { this.destroyed = true; this.active = false; },
  };
}
function scene() {
  const s = Object.create(Forest.prototype);
  const callbacks = [];
  Object.assign(s, {
    zonaKey: 'pantano', hero: { x: 100, y: 100 }, monsters: [], callbacks,
    input: { activePointer: { x: 100, y: 100, worldX: -500, worldY: -500, withinGame: true, isDown: false }, manager: { isOver: true } },
    cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } },
    tweens: { killTweensOf() {}, add(cfg) { if (cfg.repeat !== -1 && cfg.onComplete) cfg.onComplete(); return {}; } },
    time: { now: 1000, delayedCall(ms, callback) {
      const finish = s.time.now + ms;
      const timer = { getRemaining: () => Math.max(0, finish - s.time.now), callback };
      callbacks.push(timer); return timer;
    } },
    nearestMonster: () => null,
  });
  return s;
}
function corpse(extra = {}) {
  const c = { x: 100, y: 100, zona: 'pantano', label: 'Murciélago', key: 'murcielago',
    drops: [{ kind: 'res', k: 'carne', n: 7 }], revisado: false, ...extra };
  c.spr = extra.spr || sprite(c.x, c.y);
  return c;
}
function grave(extra = {}) {
  const t = { x: 100, y: 100, zona: 'pantano', hasta: ctx.__qaNow + 192000,
    items: [{ kind: 'res', k: 'piedra', n: 3 }], ...extra };
  G.tumba = t;
  const c = corpse({ x: t.x, y: t.y, zona: t.zona, label: 'tu cuerpo', key: '__tumba', mia: true,
    _tumbaHasta: t.hasta, drops: t.items.slice() });
  GF.forestCuerpos.push(c);
  return c;
}
const json = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
beforeEach(() => {
  GF.forestCuerpos = []; GF.forestDrops = []; GF.uiOpen = false; GF.editMode = false; GF.zona = 'pantano';
  G.tumba = null; G.cont = { c: 'backpack', items: [] };
  ctx.__qaNow = 1800000000000; notices.length = 0;
  ctx.innerWidth = 1280; ctx.hayOvPcAbierto = () => false; ctx.anyOvOpen = () => false;
  read('hayOvPcAbierto=window.hayOvPcAbierto; anyOvOpen=window.anyOvOpen;');
  panel = el('cuerpo-panel'); prompt = el('prompt'); el('cbar');
  delete ctx.cerrarCuerpoPanel;
});

test('el candidato se evalúa sin errores de carga', () => {
  assert.equal(problemas.filter(p => p.quien === 'game/forest.js' && p.grave).length, 0);
  assert.equal(typeof Forest.prototype.cuerpoEnPunto, 'function');
});
test('un cadáver invisible de otra zona no intercepta el visible ni permite cobrarlo', () => {
  const s = scene(), other = corpse({ zona: 'guarida' }), visible = corpse({ x: 105 });
  GF.forestCuerpos = [other, visible];
  assert.equal(s.cuerpoEnPunto(100, 100), visible);
  s.recogerCuerpo(other);
  assert.equal(ctx.contContar(G.cont, 'res', 'carne'), 0);
  assert.equal(other.drops.length, 1);
});
test('sprites ocultos o destruidos no interceptan cuerpos visibles', () => {
  const s = scene(), hidden = corpse(), destroyed = corpse(), visible = corpse({ x: 105 });
  hidden.spr.visible = false; destroyed.spr.active = false;
  GF.forestCuerpos = [hidden, destroyed, visible];
  assert.equal(s.cuerpoEnPunto(100, 100), visible);
});
test('el borde dibujado del murciélago responde fuera del antiguo círculo de 22 px', () => {
  const s = scene();
  const c = corpse({ spr: sprite(100, 96, { x: 77.17, y: 78, width: 45.66, height: 36 }) });
  GF.forestCuerpos = [c];
  assert.equal(s.cuerpoEnPunto(122.5, 96), c);
  assert.equal(s.cuerpoEnPunto(124, 96), null);
});
test('en empate exacto la calavera propia no queda bloqueada por un cadáver anterior', () => {
  const s = scene(), mob = corpse(); GF.forestCuerpos = [mob]; const own = grave();
  assert.equal(s.cuerpoEnPunto(100, 100), own);
});
test('hover recalcula el punto con la cámara actual aunque worldX esté obsoleto', () => {
  const s = scene(), c = corpse(); GF.forestCuerpos = [c];
  s.cameras.main.getWorldPoint = () => ({ x: 100, y: 100 });
  assert.equal(s.cuerpoBajoCursor(), c);
  s.cameras.main.getWorldPoint = () => ({ x: 500, y: 500 });
  assert.equal(s.cuerpoBajoCursor(), null);
});
test('hover muestra nombre y acción sin revelar el premio antes de revisar', () => {
  const s = scene(), c = corpse(); GF.forestCuerpos = [c];
  s.updatePrompt();
  assert.match(prompt.textContent, /Cuerpo de Murciélago/);
  assert.match(prompt.textContent, /Clic izquierdo: revisar/);
  assert.doesNotMatch(prompt.textContent, /7|carne|Desaparece en/i);
  assert.equal(c.revisado, false); assert.equal(c.drops.length, 1);
  assert.equal(prompt.classList.contains('show'), true);
});
test('una calavera de jugador identifica al dueño y el vencimiento sin revelar pertenencias', () => {
  const s = scene(), c = corpse({ graveId: 'qa-shared-grave', ownerName: 'Not | SG',
    until: new Date(ctx.__qaNow + 92000).toISOString(), drops: [] });
  const help = s.ayudaCuerpo(c);
  assert.match(help, /Calavera de Not \| SG/);
  assert.match(help, /Desaparece en 1:32/);
  assert.match(help, /Clic izquierdo para recoger/);
  assert.doesNotMatch(help, /carne|madera|piedra/i);
});
test('una calavera compartida no acredita una copia local de botín sin confirmación del servidor', () => {
  const s = scene(), c = corpse({ graveId: 'qa-shared-grave', ownerName: 'otro jugador' });
  GF.forestCuerpos = [c];
  s.recogerCuerpo(c);
  assert.equal(G.cont.items.length, 0);
  assert.equal(c.drops[0].n, 7);
});
test('el siguiente tick retira sprite y destellos de una cabecera compartida invalidada', () => {
  const s = scene(); let destroyedFx = false;
  const c = corpse({ graveId: 'qa-shared-grave', mia: true, until: 0, drops: [] });
  c.fx = [{ destroy() { destroyedFx = true; } }]; GF.forestCuerpos = [c];
  s.actualizarTumbaCuerpos();
  assert.equal(GF.forestCuerpos.includes(c), false); assert.equal(c.spr.destroyed, true); assert.equal(destroyedFx, true);
});
test('tumba propia muestra mm:ss del plazo real y lejos explica acercarse', () => {
  const s = scene(), c = grave();
  assert.match(s.ayudaCuerpo(c), /Tu calavera.*Desaparece en 3:12/);
  ctx.__qaNow += 1000;
  assert.match(s.ayudaCuerpo(c), /3:11/);
  s.hero.x = 400;
  assert.match(s.ayudaCuerpo(c), /Acercate/);
  s.revisarCuerpo(c);
  assert.equal(c.revisado, false);
  assert.equal(panel.classList.contains('show'), false);
  assert.match(notices.at(-1), /lejos/);
});
test('la ayuda no tapa menús, un ataque o el panel de botín; táctil no activa hover', () => {
  const s = scene(), c = corpse(); GF.forestCuerpos = [c];
  for (const mode of ['menu', 'attack', 'body']) {
    GF.uiOpen = mode === 'menu'; s.action = mode === 'attack' ? {} : null;
    if (mode === 'body') panel.classList.add('show'); else panel.classList.remove('show');
    s.updatePrompt(); assert.equal(prompt.classList.contains('show'), false, mode);
  }
  panel.classList.remove('show'); s.input.activePointer.wasTouch = true;
  assert.equal(s.cuerpoBajoCursor(), null);
});
test('caducidad dentro de la escena retira sprite, destellos y panel sin entregar objetos', () => {
  const s = scene(), c = grave(); let fxDestroyed = false;
  c.fx = [{ destroy() { fxDestroyed = true; } }];
  s.abrirCuerpo(c); assert.equal(panel.classList.contains('show'), true);
  ctx.__qaNow = G.tumba.hasta + 1;
  s.actualizarTumbaCuerpos();
  assert.equal(G.tumba, null); assert.equal(GF.forestCuerpos.includes(c), false);
  assert.equal(c.spr.destroyed, true); assert.equal(fxDestroyed, true);
  assert.equal(panel.classList.contains('show'), false);
  s.recogerCuerpo(c);
  assert.equal(ctx.contContar(G.cont, 'res', 'piedra'), 0);
});
test('el tick real revalida la tumba antes de continuar la simulación', () => {
  const s = scene(), c = grave(); ctx.__qaNow = G.tumba.hasta + 1;
  const validate = s.actualizarTumbaCuerpos, stop = new Error('stop after actual grave tick');
  s.actualizarTumbaCuerpos = function () { validate.call(this); throw stop; };
  assert.throws(() => s.updateReal(16, 16), error => error === stop);
  assert.equal(G.tumba, null); assert.equal(GF.forestCuerpos.includes(c), false);
});
test('botón abierto antes de caducar revalida el plazo al recoger', () => {
  const s = scene(), c = grave(); s.abrirCuerpo(c);
  const click = elementos['cuerpo-recoger'].onclick;
  ctx.__qaNow = G.tumba.hasta + 1;
  click();
  assert.equal(ctx.contContar(G.cont, 'res', 'piedra'), 0);
  assert.equal(panel.classList.contains('show'), false);
});
test('una tumba reemplazada invalida el panel viejo sin borrar ni entregar la nueva', () => {
  const s = scene(), old = grave(); s.abrirCuerpo(old);
  const click = elementos['cuerpo-recoger'].onclick;
  const newer = { x: 170, y: 100, zona: 'pantano', hasta: ctx.__qaNow + 599000,
    items: [{ kind: 'res', k: 'madera', n: 12 }] };
  G.tumba = newer; click();
  assert.equal(G.tumba, newer);
  assert.equal(newer.items[0].n, 12);
  assert.equal(G.cont.items.length, 0);
  assert.equal(GF.forestCuerpos.includes(old), false);
});
test('el estado vigente sustituye una copia vieja del panel y un segundo clic no duplica', () => {
  const s = scene(), c = grave();
  c.drops = [{ kind: 'res', k: 'piedra', n: 999 }];
  s.recogerCuerpo(c); s.recogerCuerpo(c);
  assert.equal(ctx.contContar(G.cont, 'res', 'piedra'), 3);
  assert.equal(G.tumba, null);
});
test('dos espejos previos de la misma tumba no permiten cobrar dos veces', () => {
  const s = scene(), c = grave();
  const stale = { ...c, drops: c.drops.slice(), spr: sprite(100, 100) };
  GF.forestCuerpos.push(stale);
  s.recogerCuerpo(c); s.recogerCuerpo(stale);
  assert.equal(ctx.contContar(G.cont, 'res', 'piedra'), 3);
  assert.equal(G.tumba, null);
});
test('un contenedor lleno conserva todos los objetos en la tumba y permite recoger después', () => {
  const s = scene(), c = grave();
  G.cont = { c: 'bag', items: Array.from({ length: 8 }, (_, i) => ({ kind: 'res', k: 'fill' + i, n: 1 })) };
  s.recogerCuerpo(c);
  assert.equal(G.tumba.items[0].n, 3);
  assert.equal(c.drops[0].n, 3);
  assert.match(notices.at(-1), /lleno/i);
  G.cont = { c: 'backpack', items: [] };
  s.recogerCuerpo(c);
  assert.equal(ctx.contContar(G.cont, 'res', 'piedra'), 3);
});
test('armas conservan durabilidad, mejoras y runas al recuperar', () => {
  const w = { dur: 23, plus: 4, runas: [{ id: 'fuego', n: 2 }] };
  const s = scene(), c = grave({ items: [{ kind: 'arm', k: 'espada_bronce', n: 1, w }] });
  s.recogerCuerpo(c);
  assert.deepEqual(json(G.cont.items[0].w), w);
});
test('armaduras conservan las piezas concretas y la durabilidad de cada pieza', () => {
  const pieces = ['casco', 'botas'], dur = { casco: 11, botas: 27 };
  const s = scene(), c = grave({ items: [{ kind: 'armorset', k: 'fibra', n: 1, piezas: pieces, dur }] });
  s.recogerCuerpo(c);
  assert.deepEqual(json(G.cont.items[0].piezas), pieces);
  assert.deepEqual(json(G.cont.items[0].dur), dur);
});
test('el plazo de cadáver vacío usa tiempo de escena y no se reinicia con más clics', () => {
  const s = scene(), c = corpse({ drops: [], revisado: true }); GF.forestCuerpos = [c];
  s.despedirCuerpo(c); s.time.now += 12500; s.despedirCuerpo(c);
  assert.equal(s.callbacks.length, 1);
  assert.match(s.ayudaCuerpo(c), /1:18/);
  ctx.__qaNow += 9 * 60000;
  assert.match(s.ayudaCuerpo(c), /1:18/);
});
test('cerrar y shutdown desactivan el panel, su referencia global y el cartel', () => {
  const s = scene(), c = corpse(); GF.forestCuerpos = [c];
  s.abrirCuerpo(c); assert.equal(typeof ctx.cerrarCuerpoPanel, 'function');
  s.cerrarCuerpo();
  assert.equal(panel.classList.contains('show'), false); assert.equal(ctx.cerrarCuerpoPanel, undefined);
  const hooks = []; const stop = new Error('stop after registering actual shutdown hook');
  s.events = { once(event, fn) { if (event === 'shutdown') hooks.push(fn); } };
  s.refreshVisualTheme = () => { throw stop; };
  // La iluminación pertenece a otra suite y su DOM no está emulado aquí.
  ctx.GoldenLighting = { attach() {} };
  assert.throws(() => s.create(), error => error === stop);
  s.abrirCuerpo(c); prompt.classList.add('show', 'cuerpo-ayuda');
  elementos.cbar.classList.add('fight');
  hooks[0]();
  assert.equal(panel.classList.contains('show'), false);
  assert.equal(ctx.cerrarCuerpoPanel, undefined);
  assert.equal(prompt.classList.contains('show'), false);
  assert.equal(prompt.classList.contains('cuerpo-ayuda'), false);
  assert.equal(elementos.cbar.classList.contains('fight'), false);
});

test('guía fuera de pantalla: cuatro direcciones, esquinas y cambio de zoom caben en el área segura', () => {
  const position = ctx.GoldenGraveGuide.positionFor;
  const view = { x: 0, y: 0, width: 1000, height: 500 };
  const canvas = { left: 100, top: 50, width: 1000, height: 500 };
  const safe = { left: 140, right: 1060, top: 90, bottom: 510 };
  const right = position({ x: 1500, y: 250 }, view, canvas, safe);
  assert.deepEqual(json(right), { left: 1060, top: 300, angle: 0 });
  const up = position({ x: 500, y: -100 }, view, canvas, safe);
  assert.deepEqual(json(up), { left: 600, top: 90, angle: -90 });
  const left = position({ x: -500, y: 250 }, view, canvas, safe);
  assert.equal(left.left, safe.left); assert.equal(left.angle, 180);
  const down = position({ x: 500, y: 800 }, view, canvas, safe);
  assert.equal(down.top, safe.bottom); assert.equal(down.angle, 90);
  for (const target of [{ x: -1000, y: -1000 }, { x: 2000, y: 1000 }, { x: 2000, y: -1000 }]) {
    const p = position(target, view, canvas, safe);
    assert.ok(p.left >= safe.left && p.left <= safe.right);
    assert.ok(p.top >= safe.top && p.top <= safe.bottom);
    assert.ok(Number.isFinite(p.angle));
  }
  const zoom = position({ x: 1100, y: 325 }, { x: 500, y: 200, width: 500, height: 250 }, canvas, safe);
  assert.deepEqual(json(zoom), { left: 1060, top: 300, angle: 0 });
});
test('guía oculta para un objetivo ya visible, incluso en bordes, y cámara sin extensión', () => {
  const position = ctx.GoldenGraveGuide.positionFor;
  const view = { x: 20, y: 30, width: 200, height: 100 };
  const canvas = { left: 0, top: 0, width: 800, height: 400 };
  const safe = { left: 50, right: 750, top: 30, bottom: 370 };
  for (const target of [{ x: 20, y: 30 }, { x: 220, y: 130 }, { x: 100, y: 90 }]) {
    assert.equal(position(target, view, canvas, safe), null);
  }
  assert.equal(position({ x: 900, y: 300 }, { ...view, width: 0 }, canvas, safe), null);
});
function guideUI(s, options = {}) {
  const root = { hidden: true, style: {}, removed: false, getBoundingClientRect: () => ({ width: 180, height: 40 }), remove() { this.removed = true; } };
  s._graveGuide = { root, arrow: { style: {} }, title: { textContent: '' }, detail: { textContent: '' }, options };
  s.cameras.main.worldView = { x: 0, y: 0, width: 500, height: 250 };
  s.sys = { game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500 }) } } };
  return s._graveGuide;
}
function withGuideDOM(fn) {
  const original = ctx.document.getElementById;
  ctx.document.getElementById = id => id === 'cuerpo-panel' ? panel : null;
  try { fn(); } finally { ctx.document.getElementById = original; }
}
test('guía sólo identifica tumba propia vigente y desaparece sin cambiar botín o estado', () => withGuideDOM(() => {
  const s = scene(), c = grave({ x: 900, y: 100 }); const ui = guideUI(s);
  const before = json(G.tumba);
  ctx.GoldenGraveGuide.update(s);
  assert.equal(ui.root.hidden, false); assert.equal(ui.title.textContent, 'Tu calavera');
  assert.match(ui.detail.textContent, /3:12/);
  assert.deepEqual(json(G.tumba), before); assert.equal(c.revisado, false); assert.equal(G.cont.items.length, 0);
  G.tumba.x = 100; ctx.GoldenGraveGuide.update(s); assert.equal(ui.root.hidden, true);
  G.tumba.x = 900; GF.uiOpen = true; ctx.GoldenGraveGuide.update(s); assert.equal(ui.root.hidden, true);
  GF.uiOpen = false; G.tumba.hasta = ctx.__qaNow - 1; ctx.GoldenGraveGuide.update(s); assert.equal(ui.root.hidden, true);
  ctx.GoldenGraveGuide.clear(s); assert.equal(ui.root.removed, true); assert.equal(s._graveGuide, null);
}));
test('una tumba en otro mapa guía al portal y nunca a coordenadas de ese mapa como si fueran locales', () => withGuideDOM(() => {
  const s = scene(); s.W = 1344; s.H = 630; s.salidaDer = true; s.salidaIzq = true;
  const order = read('ZONA_ORDER'); assert.ok(order.length >= 2);
  s.zonaKey = order[0]; grave({ zona: order[1], x: 100, y: 100 });
  const ui = guideUI(s);
  ctx.GoldenGraveGuide.update(s);
  assert.equal(ui.root.hidden, false);
  assert.match(ui.title.textContent, /Tu calavera:/);
  assert.match(ui.detail.textContent, /Hacia el portal/);
  assert.ok(Number.parseFloat(ui.root.style.left) > 500, 'portal siguiente a la derecha');
}));
test('el adaptador de dueño rechaza una tumba que no pertenece al jugador', () => withGuideDOM(() => {
  const s = scene(); grave({ x: 900 });
  const ui = guideUI(s, { getOwnGrave: () => G.tumba, isMine: () => false });
  ctx.GoldenGraveGuide.update(s);
  assert.equal(ui.root.hidden, true);
  assert.equal(G.cont.items.length, 0);
}));
test('en la granja la guía apunta al portal y desaparece al editar o abrir un menú', () => withGuideDOM(() => {
  const s = scene(); s.zonaKey = 'granja'; s.portal = { cx: 900, by: 100 };
  grave({ zona: 'pantano', x: 100, y: 100 });
  const ui = guideUI(s);
  ctx.GoldenGraveGuide.update(s);
  assert.equal(ui.root.hidden, false); assert.match(ui.detail.textContent, /Hacia el portal/);
  assert.ok(Number.parseFloat(ui.root.style.left) > 500);
  GF.editMode = true; ctx.GoldenGraveGuide.update(s); assert.equal(ui.root.hidden, true);
  GF.editMode = false; GF.uiOpen = true; ctx.GoldenGraveGuide.update(s); assert.equal(ui.root.hidden, true);
}));
