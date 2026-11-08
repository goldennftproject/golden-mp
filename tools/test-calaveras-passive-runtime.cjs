/* Real state/save/UI heartbeat with candidate client/UI overrides. Synthetic actors only. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { randomUUID } = require('node:crypto'), { test } = require('node:test');
const assert = require('node:assert/strict');
const REPO = path.resolve(__dirname,'..');
const UID = '11111111-1111-4111-8111-111111111111', OP = '44444444-4444-4444-8444-444444444444';
const BASE = '2026-11-08T23:19:40.984000+00:00', NEXT = '2026-11-08T23:19:41.984000+00:00';
const clone = value => JSON.parse(JSON.stringify(value));
const apiSource = fs.readFileSync(path.join(REPO,'public/game/graves-api.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(REPO,'public/game/ui.js'), 'utf8');
function environment(spent = true) {
  const baseline = name => fs.readFileSync(path.join(REPO,'public/game',name), 'utf8');
  const { ctx: c, elementos } = require(path.join(REPO, 'tools/arrancar-el-juego.contexto.js')).arrancar(REPO, {
    'game/main.js': '', 'game/state.js': baseline('state.js'), 'game/graves-api.js': apiSource,
    'game/save.js': baseline('save.js').replace('window.SAVE_READY = initSave();', 'window.SAVE_READY = Promise.resolve();'),
    'game/ui.js': uiSource.replace(/^initUI\(\);$/m, '// QA invokes the real heartbeat manually.'),
  });
  const run = code => vm.runInContext(code, c), memory = new Map(), copies = [], calls = [];
  let now = Date.parse(BASE), paused = false, onRequest;
  const counts = { hydrates: 0, snapshotsMarkedSaved: 0 };
  c.Date = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; c.nowMs = () => now; c.crypto = { randomUUID };
  c.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
  for (const el of Object.values(elementos)) if (el && typeof el === 'object') el.style = { setProperty() {}, removeProperty() {} };
  c.document.documentElement.style = { setProperty() {}, removeProperty() {} };
  for (const name of ['log', 'toast', 'showSaved', 'showSaving', 'showSaveError', 'sesionLog', 'usdtProgramarPendiente', 'flujoChip']) c[name] = () => {};
  c.copiaGuardar = (data, saved) => { copies.push({ data: clone(data), saved }); if (saved) counts.snapshotsMarkedSaved++; }; c.sleepMs = async () => {};
  const originalHydrate = c.hydrate; c.hydrate = data => { counts.hydrates++; return originalHydrate(data); };
  const timerNames = { Mutator: ['stamTick', 1000], Render: ['refreshRecientes(); refreshMorral(); refreshCombate()', 1000], Flow: ['try { flujoTick();', 180] };
  for (const [name, [needle, interval]] of Object.entries(timerNames)) {
    const line = uiSource.split(/\r?\n/).find(row => row.includes('setInterval(() => {') && row.includes(needle));
    assert.ok(line, 'real initUI timer: ' + name);
    const callback = line.slice(line.indexOf('() =>'), line.lastIndexOf(', ' + interval + ')'));
    run('window.qa' + name + '=' + callback + ';');
    // A real unguarded callback is a nonvacuous negative control for the fixture.
    run('window.qaRaw' + name + '=' + callback.replace("if(window.GoldenGraves&&typeof GoldenGraves.busy==='function'&&GoldenGraves.busy())return;", '') + ';');
  }
  c.qaHeartbeat = () => { c.qaRender(); c.qaMutator(); c.qaFlow(); };
  const scene = { zonaKey: 'pantano', hero: { x: 100, y: 100 }, scene: { isPaused: () => paused, pause() { paused = true; }, resume() { paused = false; } } };
  c.qaSb = { functions: { invoke: async (_name, { body }) => {
    calls.push(clone(body));
    if (body.accion === 'estado') return { data: { ok: true, enabled: true, serverNow: new c.Date().toISOString(), ownGraveId: null, markers: [] }, error: null };
    return onRequest(body);
  } }, from: () => { throw Error('No database allowed'); } };
  run(`estadoDeCero();UID='${UID}';CARGA_OK=true;SOLO_LOCAL=false;sb=qaSb;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_OTRA=false;SAVE_BASES.set('${UID}','${BASE}');lastSavedKey=null;GF.GRAVES_SHARED_ENABLED=true;GF.scene='forest';`);
  Object.assign(c.G, { hp: 0, hpMax: 100, buffs: [], armorEq: null, stam: spent ? 72 : 100, stamAcc: 0, stamLastAt: now,
    stamFullAt: spent ? now + 14400000 * 0.28 : 0, cont: { c: 'backpack', items: [{ kind: 'res', k: 'madera', n: 5 }] },
    tumba: null, zonaViaje: { t: now - 30000, pos: { zona: 'pantano', x: 100, y: 100 } }, energiaGranja: { v: 1, actual: 50, at: now } });
  c.G.res.madera = 40; c.qaHeartbeat(); c.qaHeartbeat();
  const tick = ms => { now += ms; c.qaHeartbeat(); };
  const reply = (pending, data, cancelled, version = cancelled ? BASE : NEXT) => ({ data: { ok: true, data: clone(data), updated_at: version, cancelado: cancelled,
    receipt: { op: pending.op, action: 'morir', graveId: null, cancelado: cancelled, actorBaseBefore: BASE, actorBaseAfter: version } }, error: null });
  function legacyPending() {
    const data = clone(c.snapshot()), key = c.snapKey();
    const p = { cuenta: UID, op: OP, createdAt: now, base: BASE, beforeKey: key, calavera: { action: 'morir' } };
    run(`lastSavedKey=${JSON.stringify(key)};SAVE_CONFIRMACIONES.set('${UID}',1);`);
    // The old journal was made before this real passive tick / later local actions.
    tick(1000); c.G.res.madera += 7; c.G.pass.daily.mis[0].n += 2;
    c.localStorage.setItem('gf-calavera-recibo-' + run('SB_REF') + '-' + UID + '-' + OP, JSON.stringify(p));
    c.mercadoMarcarPendiente(UID, p); run(`SAVE_CONFLICTOS.add('${UID}');SAVE_OTRA=true;`);
    return { p, data, key };
  }
  return { c, run, scene, memory, calls, counts, copies, tick, reply, legacyPending,
    respond(fn) { onRequest = fn; }, paused: () => paused };
}
test('new operation freezes the real global heartbeat through preflush and ACK, then releases it to catch up', async () => {
  for (const spent of [false, true]) {
    const e = environment(spent); await e.c.GoldenGraves.load(e.scene); let frozenTicks = 0;
    e.respond(body => {
      const before = e.c.snapKey(); assert.equal(e.c.GoldenGraves.busy(), true);
      e.tick(1000); assert.equal(e.c.snapKey(), before); frozenTicks++;
      if (body.jornada) return { data: { ok: true, updated_at: BASE }, error: null };
      const p = e.c.GoldenGraves.pending(UID), canonical = clone(e.c.snapshot());
      return e.reply(p, { ...canonical, hp: 50, cont: null, tumba: null, zonaViaje: null, _graveProtocol: 1 }, false);
    });
    await e.c.GoldenGraves.die(e.scene);
    assert.equal(frozenTicks, 2); assert.equal(e.c.GoldenGraves.busy(), false); assert.equal(e.paused(), false);
    const last = e.c.G.stamLastAt, stamina = e.c.G.stam; e.tick(1000);
    assert.ok(e.c.G.stamLastAt > last); if (spent) assert.ok(e.c.G.stam > stamina);
    assert.equal(e.c.GoldenGraves.pending(UID), null);
  }
});
test('legacy cancelled receipt preserves all later local actions without hydration or a false saved ACK', async () => {
  const e = environment(), old = e.legacyPending(), live = clone(e.c.snapshot());
  const confirmations = e.run(`SAVE_CONFIRMACIONES.get('${UID}')`), key = e.run('lastSavedKey');
  e.respond(() => e.reply(old.p, old.data, true));
  const r = await e.c.GoldenGraves.reconcile(e.scene);
  assert.equal(r.cancelado, true); assert.deepEqual(clone(e.c.snapshot()), live);
  assert.equal(e.counts.hydrates, 0); assert.equal(e.counts.snapshotsMarkedSaved, 0);
  assert.equal(e.run('lastSavedKey'), key); assert.notEqual(e.c.snapKey(), key);
  assert.equal(e.run(`SAVE_CONFIRMACIONES.get('${UID}')`), confirmations); assert.equal(e.run('SAVE_OTRA'), true);
  assert.equal(e.run(`SAVE_BASES.get('${UID}')`), BASE); assert.equal(e.c.GoldenGraves.pending(UID), null);
  assert.equal(e.c.GoldenGraves.busy(), false); assert.equal(e.c.G.hp, 0); assert.equal(e.c.G.res.madera, 47);
});
test('a confirmed receipt with real later local changes remains blocked without replacing or falsely saving them', async () => {
  const e = environment(), old = e.legacyPending(), live = clone(e.c.snapshot());
  e.respond(() => e.reply(old.p, { ...old.data, hp: 50, cont: null, tumba: null, zonaViaje: null }, false));
  await assert.rejects(() => e.c.GoldenGraves.reconcile(e.scene), /partida cambió después/);
  assert.deepEqual(clone(e.c.snapshot()), live); assert.equal(e.counts.hydrates, 0); assert.equal(e.counts.snapshotsMarkedSaved, 0);
  assert.equal(e.c.GoldenGraves.pending(UID).op, OP); assert.equal(e.c.GoldenGraves.busy(), true);
  assert.equal(e.run(`SAVE_BASES.get('${UID}')`), BASE);
});
test('cancelled receipt cannot release a different local or remote base', async () => {
  for (const localChanged of [false, true]) {
    const e = environment(), old = e.legacyPending(), live = clone(e.c.snapshot());
    if (localChanged) e.run(`SAVE_BASES.set('${UID}','${NEXT}')`);
    e.respond(() => e.reply(old.p, old.data, true, localChanged ? BASE : NEXT));
    await assert.rejects(() => e.c.GoldenGraves.reconcile(e.scene), /otra operación|partida cambió/);
    assert.deepEqual(clone(e.c.snapshot()), live); assert.equal(e.counts.hydrates, 0); assert.equal(e.counts.snapshotsMarkedSaved, 0);
    assert.equal(e.c.GoldenGraves.pending(UID).op, OP); assert.equal(e.c.GoldenGraves.busy(), true);
  }
});

test('all three real initUI timers preserve pending armor/consumption state while busy and resume afterwards', async () => {
  const e = environment(), c = e.c;
  await c.GoldenGraves.load(e.scene);
  // The 180ms detector saw five wood; consuming one immediately before the
  // operation leaves a real state mutation queued in recientesUsar.
  c.flujoOlvidar(); c.qaFlow(); c.G.cont.items[0].n--;
  c.G.recientes = [];
  c.G.armorEq = 'fibra'; c.G.armor = { arm_fibra_yelmo: true };
  c.G.armorDur = {}; delete c.G.armorOff;
  let observed = 0;
  e.respond(body => {
    const before = clone(c.snapshot()), key = c.snapKey();
    assert.equal(c.GoldenGraves.busy(), true);
    for (const name of ['Render', 'Mutator', 'Flow']) {
      c['qa' + name]();
      assert.deepEqual(clone(c.snapshot()), before, name + ' must not mutate state while busy');
      assert.equal(c.snapKey(), key);
    }
    assert.deepEqual(clone(c.G.recientes), []);
    observed++;
    if (body.jornada) return { data: { ok: true, updated_at: BASE }, error: null };
    const p = c.GoldenGraves.pending(UID);
    // Cancellation preserves this exact queued state and lets the timers run.
    return e.reply(p, c.snapshot(), true);
  });
  await c.GoldenGraves.die(e.scene);
  assert.equal(observed, 2); assert.equal(c.GoldenGraves.busy(), false);
  assert.deepEqual(clone(c.G.recientes), []);
  c.qaFlow();
  assert.ok(c.G.recientes.includes('res:madera'), 'the real delayed consumption detector catches up after release');
  // Render/mutator also run again rather than staying frozen by a stale lock.
  const last = c.G.stamLastAt; e.tick(1000); assert.ok(c.G.stamLastAt > last);
  assert.equal(c.GoldenGraves.pending(UID), null);
});
