'use strict';

// Tests the shipped browser code against the shipped guardar HTTP handler.
// All state, Auth, storage and database responses are synthetic and in memory.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { webcrypto, randomUUID } = require('node:crypto');
const repo = process.env.GF_TEST_ROOT || path.resolve(__dirname, '..');
const repoRequire = createRequire(path.join(repo, 'package.json'));
const { JSDOM } = repoRequire('jsdom');
const copy = value => JSON.parse(JSON.stringify(value));
const KEY = 'espada_madera';
const OLD = { dur: 13, plus: 3, sockets: ['fuego'], qa: { original: true } };
const AWARD = { dur: 40, plus: 1, sockets: ['hielo'], qa: { receipt: 'synthetic' } };
const pending = () => ({ kind: 'arm', item: KEY, qty: 1, payload: copy(AWARD) });
const microtasks = async () => { for (let n = 0; n < 70; n++) await Promise.resolve(); };
const source = fs.readFileSync(path.join(repo, 'tools/test-guardado-atomico.js'), 'utf8').split('(async()=>{')[0];
const serverFactory = new Function('require', '__dirname', source + ';return servidor;')(repoRequire, path.join(repo, 'tools'));

function environment({ equip = false, main = true, reserved = false, slots = 15 } = {}) {
  const save = fs.readFileSync(path.join(repo, 'public/game/save.js'), 'utf8');
  assert(save.includes('window.SAVE_READY = initSave();'), 'known save initialization can be disabled');
  const loaded = repoRequire('./tools/arrancar-el-juego.contexto').arrancar(repo, {
    'game/main.js': '',
    'game/save.js': save.replace('window.SAVE_READY = initSave();', 'window.SAVE_READY = Promise.resolve();')
  });
  const core = new Set(['game/config.js', 'game/state.js', 'game/ui.js', 'game/save.js']);
  assert.deepEqual(loaded.problemas.filter(p => p.grave && core.has(p.quien)), [], 'real state/save/inventory code initializes');
  const c = loaded.ctx, run = text => vm.runInContext(text, c);
  const dom = new JSDOM(loaded.HTML, { url: 'http://qa.invalid/' });
  c.document = dom.window.document;
  c.crypto = webcrypto;
  c.fetch = () => { throw Error('Network forbidden in reserve QA'); };
  const notices = [];
  c.toast = (...args) => notices.push(args);
  for (const key of ['log', 'refreshHud', 'refreshHotbar', 'refreshForge', 'refreshCombate', 'showSaving', 'showSaved', 'showSaveError', 'sesionLog', 'usdtProgramarPendiente']) c[key] = () => {};
  c.isOpen = id => id === 'ov-inv';
  c.mercadoBloquearPantalla = () => () => {};
  c.estadoDeCero();
  c.G.res = { madera: 99 * (slots - (main && !equip ? 1 : 0) - (reserved ? 1 : 0)) };
  c.G.seeds = {}; c.G.dishes = {}; c.G.fish = {}; c.G.tools = {}; c.G.picks = { owned: {}, dur: {}, eq: null };
  c.G.canas = {}; c.G.armor = {}; c.G.conts = {}; c.G.invRows = 0;
  c.G.weapons = main ? { [KEY]: copy(OLD) } : {};
  c.G.weaponSpares = reserved ? { 'r-qa-existing': { key: KEY, w: copy(AWARD) } } : {};
  c.G.gear.arma = equip ? KEY : null;
  c.G.tuto = { done: true, step: 999, n: 0, v: 99 };
  c.G.mkPend = reserved ? [] : [pending()];
  c.syncSlots();
  const base = new Date(Date.now() - 1000).toISOString();
  const server = serverFactory({ user_id: 'qa', name: 'QA', updated_at: base, data: copy(c.snapshot()) }, { postgresTime: true });
  const calls = [], economicCalls = [];
  let holdEconomic = null, responseMode = 'ok';
  c.qaSb = {
    functions: { invoke: async (name, { body }) => {
      assert.equal(name, 'guardar');
      const request = copy(body); calls.push(request);
      if (request.repuesto) {
        economicCalls.push(request);
        if (holdEconomic) await holdEconomic;
      }
      const response = await server.call(request);
      const json = await response.json();
      if (request.repuesto && responseMode === 'lost') return { error: { context: { status: 503 } } };
      return response.ok ? { data: json } : { error: { context: { status: response.status, json: async () => json } } };
    } },
    auth: { getUser: async () => ({ data: { user: { id: run('UID') } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: copy(server.row()) }) }) }) })
  };
  c.qaBase = base;
  run("sb=qaSb;UID='qa';CARGA_OK=true;SOLO_LOCAL=false;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_OTRA=false;SAVE_CONFLICTOS.clear();SAVE_BASES.set('qa',qaBase);lastSavedKey=null;");
  return {
    c, run, dom, server, calls, economicCalls, notices,
    hold(promise) { holdEconomic = promise; },
    loseResponses() { responseMode = 'lost'; },
    showResponses() { responseMode = 'ok'; },
    render() { c.refreshInv(); return dom.window.document.getElementById('inv-slots'); },
    async settled() { await microtasks(); const p = run('MERCADO_EN_CURSO'); if (p) await p; await microtasks(); },
    close() { dom.window.close(); }
  };
}

async function claim(e) {
  assert.equal(e.c.mkPendCobrar(), 1, 'confirmed duplicate award can be collected');
  await e.c.saveFarm(true);
  assert.equal(e.run("SAVE_CONFLICTOS.has('qa')"), false, 'accepted claim does not manufacture a save conflict');
  assert.equal(e.c.G.mkPend.length, 0);
  const ids = Object.keys(e.c.G.weaponSpares || {});
  assert.equal(ids.length, 1, 'exactly one stable reserve was created');
  return ids[0];
}

test('Nico 15/35: claim preserves both full records; actual bag DOM shows two swords and survives save/hydrate', async t => {
  const e = environment(); t.after(() => e.close());
  assert.equal(e.c.canonicalStacks().length, 15);
  const id = await claim(e);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), OLD);
  assert.deepEqual(copy(e.c.G.weaponSpares[id]), { key: KEY, w: AWARD });
  assert.equal(e.c.G.gear.arma, null);
  assert.equal(e.c.canonicalStacks().length, 16);
  const grid = e.render();
  assert.equal(grid.querySelectorAll('[data-inv-spare]').length, 1);
  const swords = [...grid.querySelectorAll('.k-arm')];
  assert.equal(swords.length, 2, 'original sword and reserve each have a real bag slot');
  assert(swords.some(node => /13\//.test(node.title)), 'original wear is visible');
  const spare = grid.querySelector('[data-inv-spare]');
  assert.match(spare.title, /repuesto/i);
  assert.match(spare.title, /40\//);
  assert.equal(spare.getAttribute('role'), 'button');
  assert.equal(spare.tabIndex, 0);
  assert(spare.querySelector('img'), 'reserve uses actual weapon artwork');
  assert.equal(e.c.mkPendCobrar(), 0, 'claiming again cannot duplicate it');
  const snapshot = copy(e.c.snapshot());
  e.c.estadoDeCero(); e.c.hydrate(snapshot);
  assert.deepEqual(copy(e.c.G.weaponSpares[id]), { key: KEY, w: AWARD });
  assert.deepEqual(copy(e.c.G.weapons[KEY]), OLD);
  assert.equal(e.render().querySelectorAll('[data-inv-spare]').length, 1);
});

test('bag DOM click swaps only after authoritative ACK; same reserve id keeps full original record; next save/reload preserves result', async t => {
  const e = environment({ equip: true, reserved: true }); t.after(() => e.close());
  let release; e.hold(new Promise(resolve => { release = resolve; }));
  const grid = e.render(), before = copy(e.c.snapshot());
  grid.querySelector('[data-inv-spare]').click();
  await microtasks();
  assert.equal(e.economicCalls.length, 1, 'one operation goes through economiaSolicitar');
  assert.deepEqual(e.economicCalls[0].repuesto, { id: 'r-qa-existing' });
  assert.deepEqual(copy(e.c.G.weapons), before.weapons, 'waiting for ACK does not overwrite current weapon');
  assert.deepEqual(copy(e.c.G.weaponSpares), before.weaponSpares, 'waiting does not consume reserve');
  grid.querySelector('[data-inv-spare]').click(); await microtasks();
  assert.equal(e.economicCalls.length, 1, 'double click does not start a second operation');
  release(); await e.settled();
  assert.deepEqual(copy(e.c.G.weapons[KEY]), AWARD);
  assert.deepEqual(copy(e.c.G.weaponSpares['r-qa-existing']), { key: KEY, w: OLD });
  assert.equal(e.c.G.gear.arma, KEY);
  await e.c.saveFarm(true);
  assert.equal(e.run("SAVE_CONFLICTOS.has('qa')"), false, 'ordinary save after server swap stays valid');
  assert.deepEqual(copy(e.server.row().data.weaponSpares['r-qa-existing']), { key: KEY, w: OLD });
  assert.equal(e.server.row().data.weaponSparesOps.filter(x => x.op === e.economicCalls[0].op).length, 1, 'server keeps one receipt for the two identical requests');
  const accepted = copy(e.server.row().data); e.c.estadoDeCero(); e.c.hydrate(accepted);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), AWARD);
  assert.deepEqual(copy(e.c.G.weaponSpares['r-qa-existing']), { key: KEY, w: OLD });
  assert.match(e.render().querySelector('[data-inv-spare]').title, /13\//, 'bag repaints previous main as the new reserve');
});

test('full bag keeps exact pending prize; freeing one slot claims a single reserve; equipped weapon stays unchanged', async t => {
  const e = environment({ equip: true, slots: 35 }); t.after(() => e.close());
  const before = copy(e.c.snapshot());
  assert.equal(e.c.mkPendCobrar(), 0);
  assert.deepEqual(copy(e.c.G.mkPend), before.mkPend);
  assert.deepEqual(copy(e.c.G.weapons), before.weapons);
  assert.deepEqual(copy(e.c.G.weaponSpares), {});
  assert.equal(e.c.canonicalStacks().length, 35);
  e.c.G.res.madera -= 99;
  const id = await claim(e);
  assert.equal(e.c.canonicalStacks().length, 35);
  assert.deepEqual(copy(e.c.G.weaponSpares[id].w), AWARD);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), OLD);
  assert.equal(e.c.G.gear.arma, KEY);
});

test('server can equip reserve without existing main; no phantom empty reserve remains', async t => {
  const e = environment({ main: false, reserved: true }); t.after(() => e.close());
  e.render().querySelector('[data-inv-spare]').click(); await e.settled();
  assert.deepEqual(copy(e.c.G.weapons[KEY]), AWARD);
  assert.deepEqual(copy(e.c.G.weaponSpares), {});
  assert.equal(e.c.G.gear.arma, KEY);
  assert.equal(e.render().querySelectorAll('[data-inv-spare]').length, 0);
});

test('lost swap response retries the identical receipt; server swaps once; reload recovers authoritative outcome', async t => {
  const e = environment({ equip: true, reserved: true }); t.after(() => e.close());
  e.loseResponses();
  e.render().querySelector('[data-inv-spare]').click(); await e.settled();
  assert.equal(e.economicCalls.length, 2);
  assert.deepEqual(e.economicCalls[0], e.economicCalls[1], 'retry preserves account/base/op and chosen stable id');
  assert.deepEqual(copy(e.server.row().data.weapons[KEY]), AWARD);
  assert.deepEqual(copy(e.server.row().data.weaponSpares['r-qa-existing']), { key: KEY, w: OLD });
  assert.deepEqual(copy(e.c.G.weapons[KEY]), OLD, 'uncertain result does not pretend local success');
  assert.equal(e.run("SAVE_CONFLICTOS.has('qa')"), true);
  assert.equal(e.c.mercadoPendiente('qa'), true);
  e.showResponses();
  assert.equal(await e.c.loadFarm(), true);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), AWARD);
  assert.deepEqual(copy(e.c.G.weaponSpares['r-qa-existing']), { key: KEY, w: OLD });
  assert.equal(e.render().querySelectorAll('[data-inv-spare]').length, 1);
});

test('account change during swap does not hydrate former account or retry under another identity', async t => {
  const e = environment({ equip: true, reserved: true }); t.after(() => e.close());
  let release; e.hold(new Promise(resolve => { release = resolve; }));
  e.render().querySelector('[data-inv-spare]').click(); await microtasks();
  assert.equal(e.economicCalls.length, 1);
  e.run("UID='other';estadoDeCero();G.plata=77;G.weaponSpares={};");
  const other = copy(e.c.snapshot());
  release(); await e.settled();
  assert.deepEqual(copy(e.c.G.weapons), other.weapons);
  assert.deepEqual(copy(e.c.G.weaponSpares), other.weaponSpares);
  assert.equal(e.c.G.plata, 77);
  assert(e.economicCalls.every(body => body.cuenta === 'qa'));
  assert.equal(e.run("SAVE_CONFLICTOS.has('other')"), false, 'former account response does not block current account');
});

test('normal save cannot add, erase, alter or exchange a reserve; exact pending consumption authorizes its full payload only', async t => {
  const e = environment({ equip: true, reserved: true }); t.after(() => e.close());
  const initial = copy(e.server.row()), base = initial.updated_at;
  const forbidden = [
    next => { next.weaponSpares.extra = { key: KEY, w: copy(AWARD) }; },
    next => { delete next.weaponSpares['r-qa-existing']; },
    next => { next.weaponSpares['r-qa-existing'].w.dur++; },
    next => { next.weaponSpares['r-qa-existing'].w.qa.receipt = 'forged'; },
    next => { next.weapons[KEY] = copy(AWARD); next.weaponSpares['r-qa-existing'].w = copy(OLD); }
  ];
  for (const change of forbidden) {
    const s = serverFactory(copy(initial)), next = copy(initial.data); change(next);
    const response = await s.call({ cuenta: 'qa', base, op: randomUUID(), data: next });
    assert.equal(response.status, 409, 'ordinary snapshot cannot mutate authoritative reserve ownership or content');
    assert.equal(s.writes(), 0);
  }
  const omitted = copy(initial.data); delete omitted.weaponSpares;
  const s = serverFactory(copy(initial));
  assert.equal((await s.call({ cuenta: 'qa', base, op: randomUUID(), data: omitted })).status, 200);
  assert.deepEqual(s.row().data.weaponSpares, initial.data.weaponSpares, 'old client omission preserves exact reserves');
  const changedBook = copy(initial.data); changedBook.weaponSparesOps.push({ op: randomUUID(), id: 'r-qa-existing' });
  const bookServer = serverFactory(copy(initial));
  assert.equal((await bookServer.call({ cuenta: 'qa', base, op: randomUUID(), data: changedBook })).status, 409, 'ordinary snapshot cannot fabricate a swap receipt');
  const q = environment({ equip: true }); t.after(() => q.close());
  const previous = copy(q.server.row());
  const id = await claim(q);
  const accepted = copy(q.server.row().data);
  assert.deepEqual(accepted.weaponSpares[id].w, AWARD);
  assert.equal(accepted.mkPend.length, 0);
  for (const change of [
    next => { next.weaponSpares[id].w.dur++; },
    next => { next.weaponSpares[id].w.qa.receipt = 'forged'; },
    next => { next.mkPend = copy(previous.data.mkPend); },
    next => { next.weaponSpares['r-second-for-one-delivery'] = copy(next.weaponSpares[id]); }
  ]) {
    const forged = copy(accepted); change(forged); delete forged._saveOp;
    const ss = serverFactory(copy(previous));
    assert.equal((await ss.call({ cuenta: 'qa', base: previous.updated_at, op: randomUUID(), data: forged })).status, 409, 'one consumed exact receipt cannot mint altered or additional reserves');
    assert.equal(ss.writes(), 0);
  }
});

test('keyboard chooses reserve through the same operation and null views remain harmless', async t => {
  const e = environment({ equip: true, reserved: true }); t.after(() => e.close());
  assert.equal(e.c.itemView(null), null);
  const node = e.render().querySelector('[data-inv-spare]');
  const key = new e.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  node.dispatchEvent(key); await e.settled();
  assert.equal(e.economicCalls.length, 1);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), AWARD);
});

test('two identical pending weapons become two independent slot instances, while direct duplicate insertion remains blocked', async t => {
  const e = environment({ equip: true }); t.after(() => e.close());
  const second = pending(); second.payload.dur = 21; second.payload.qa.receipt = 'second-synthetic';
  e.c.G.mkPend.push(second);
  const initial = copy(e.c.snapshot());
  const base = new Date(Date.now() - 1000).toISOString();
  const s = serverFactory({ user_id: 'qa', name: 'QA', updated_at: base, data: initial });
  assert.equal(e.c.mkPoner('arm', KEY, 1, copy(AWARD)), false, 'ordinary duplicate insertion has no pending-delivery authority');
  assert.equal(e.c.mkPendCobrar(), 2);
  const ids = Object.keys(e.c.G.weaponSpares);
  assert.equal(ids.length, 2); assert.notEqual(ids[0], ids[1]);
  assert.deepEqual(ids.map(id => e.c.G.weaponSpares[id].w.dur).sort((a, b) => a - b), [21, 40]);
  assert.equal(e.c.canonicalStacks().filter(x => x.kind === 'arm_spare').length, 2);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), OLD);
  const response = await s.call({ cuenta: 'qa', base, op: randomUUID(), data: copy(e.c.snapshot()) });
  assert.equal(response.status, 200, 'server accepts exact multiplicity of two confirmed deliveries');
  assert.equal(s.row().data.mkPend.length, 0);
  assert.equal(e.render().querySelectorAll('[data-inv-spare]').length, 2);
});

test('hotbar reference invokes the same authoritative swap; carried container context cannot use farm reserve', async t => {
  const e = environment({ equip: true, reserved: true }); t.after(() => e.close());
  e.c.G.hotbar[0] = { kind: 'arm_spare', key: 'r-qa-existing' };
  assert.equal(e.c.hotItemExists(e.c.G.hotbar[0]), true);
  e.c.enZona = () => true;
  e.c.hotSelect(0); await e.settled();
  assert.equal(e.economicCalls.length, 0);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), OLD);
  e.c.enZona = () => false;
  e.c.hotSelect(0); await e.settled();
  assert.equal(e.economicCalls.length, 1);
  assert.deepEqual(copy(e.c.G.weapons[KEY]), AWARD);
  assert.deepEqual(copy(e.c.G.weaponSpares['r-qa-existing']), { key: KEY, w: OLD });
});
