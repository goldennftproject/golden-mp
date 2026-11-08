/* Browser protocol in a fresh VM per case. SDK/Auth/network/storage are synthetic. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const script = fs.readFileSync(path.join(path.resolve(__dirname,'..'),'public/game/graves-api.js'), 'utf8');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const ID = '33333333-3333-4333-8333-333333333333', OP = '44444444-4444-4444-8444-444444444444';
const OP2 = '55555555-5555-4555-8555-555555555555';
const BASE = '2026-11-08T23:00:00.000000Z', NEXT = '2026-11-08T23:00:00.100000Z';
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(options = {}) {
  const store = new Map(options.store || []), calls = [], stats = { hydrates: 0, pauses: 0, resumes: 0, unlocks: 0 };
  let live = clone(options.live || { level: 8, hp: 100, _graveProtocol: 0, latestAction: 'keep', cont: { c: 'bag', items: [] } }), responder = null, paused = !!options.paused, serial = 0;
  function element() { return { children: [], style: {}, inert: false, disabled: false, appendChild(child) { child.parent = this; this.children.push(child); },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }, setAttribute() {}, focus() {} }; }
  const body = element(); body.appendChild(element());
  const marker = { graveId: ID, revision: 2, x: 100, y: 100, zona: 'pantano', mia: true };
  const status = () => ({ ok: true, enabled: true, serverNow: new Date().toISOString(), ownGraveId: ID,
    markers: [{ id: ID, nombre: 'Actor A', zona: 'pantano', x: 100, y: 100,
      expiresAt: new Date(Date.now() + 200000).toISOString(), revision: 2, isMine: true }] });
  const result = (overrides = {}) => ({ ok: true, data: { level: 8, hp: 100, _graveProtocol: 0, latestAction: 'keep', cont: { c: 'bag', items: [{ kind: 'res', k: 'madera', n: 5 }] } },
    updated_at: NEXT, cancelado: false,
    receipt: { op: OP, graveId: ID, revisionBefore: 2, revisionAfter: 3, cancelado: false, actorBaseBefore: BASE, actorBaseAfter: NEXT }, ...overrides });
  const deathResult = (overrides = {}, op = OP) => ({ ok: true, data: { level: 8, hp: 50, _graveProtocol: 1, latestAction: 'keep', cont: null, tumba: null, zonaViaje: null },
    updated_at: NEXT, cancelado: false, receipt: { op, action: 'morir', graveId: null, cancelado: false, actorBaseBefore: BASE, actorBaseAfter: NEXT }, ...overrides });
  const ctx = {
    console, Date, JSON, Math, Object, Array, String, Number, Error, Promise, Map, Set,
    GF: { GRAVES_SHARED_ENABLED: true, forestCuerpos: [] }, SB_REF: 'qa', UID: A, CARGA_OK: true, SOLO_LOCAL: false,
    SAVE_BASES: new Map([[A, options.base || BASE]]), SAVE_CONFIRMACIONES: new Map([[A, 0]]), SAVE_CONFLICTOS: new Set(),
    MERCADO_EN_CURSO: null, SAVE_EN_CURSO: null, SAVE_OTRA: false, lastSavedKey: JSON.stringify(live),
    crypto: { randomUUID: () => serial++ ? OP2 : OP }, document: { body, createElement: element },
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, val) => store.set(key, String(val)),
      removeItem: key => store.delete(key), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } },
    conTope: p => p, snapshot: () => clone(live), snapKey: () => JSON.stringify(live),
    hydrate(data) { stats.hydrates++; live = clone(data); }, copiaGuardar() {}, guardadoTienePendiente: () => false,
    async saveFarm() { ctx.SAVE_CONFIRMACIONES.set(ctx.UID, (ctx.SAVE_CONFIRMACIONES.get(ctx.UID) || 0) + 1); ctx.lastSavedKey = JSON.stringify(live); },
    mercadoMarcarPendiente: (uid, p) => store.set('gf-venta-pendiente-qa-' + uid, JSON.stringify(p)),
    mercadoLimpiarPendiente: uid => store.delete('gf-venta-pendiente-qa-' + uid),
    mercadoPendiente(uid) { try { return JSON.parse(store.get('gf-venta-pendiente-qa-' + uid) || 'null'); } catch { return null; } },
    mercadoBloquearPantalla: () => () => stats.unlocks++, zonaGuardarPos() {}, refreshHud() {}, syncSlots() {}, refreshMorral() {}, toast() {},
    sb: { functions: { async invoke(name, { body }) { calls.push({ name, body: clone(body) }); return responder ? await responder(body) : { data: body.accion === 'estado' ? status() : result(), error: null }; } } },
  };
  Object.defineProperty(ctx, 'G', { get: () => live, set: value => { live = value; } });
  ctx.nowMs = () => Date.now();
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(script, ctx);
  const scene = { zonaKey: 'pantano', hero: { x: 100, y: 100 }, scene: { isPaused: () => paused,
    pause() { paused = true; stats.pauses++; }, resume() { paused = false; stats.resumes++; } },
    dibujarCuerpo(c) { c.spr = { destroy() {} }; }, retirarCuerpo(c) { ctx.GF.forestCuerpos = ctx.GF.forestCuerpos.filter(x => x !== c); } };
  return { ctx, api: ctx.GoldenGraves, store, calls, stats, marker, scene, status, result, deathResult,
    respond(fn) { responder = fn; }, live: () => live, change(fn) { fn(live); }, paused: () => paused };
}
test('default-off browser gate prevents load/claim and creates no network request', async () => {
  const f = fixture(); delete f.ctx.GF.GRAVES_SHARED_ENABLED;
  await assert.rejects(() => f.api.load(f.scene), /sesión/); await assert.rejects(() => f.api.claim(f.marker, f.scene), /sesión/);
  assert.equal(f.calls.length, 0); assert.equal(f.stats.hydrates, 0);
});
test('a confirmed claim flushes first, journals one UUID, hydrates once and releases pause/UI', async () => {
  const f = fixture(); await f.api.load(f.scene); const r = await f.api.claim(f.marker, f.scene);
  assert.equal(r.ok, true); assert.equal(f.ctx.SAVE_CONFIRMACIONES.get(A), 1);
  assert.equal(f.calls.filter(x => x.body.accion === 'recoger').length, 1);
  assert.equal(f.calls.find(x => x.body.accion === 'recoger').body.op, OP);
  assert.equal(f.live().cont.items[0].n, 5); assert.equal(f.stats.hydrates, 1); assert.equal(f.api.pending(A), null);
  assert.equal(f.stats.pauses, 1); assert.equal(f.stats.resumes, 1); assert.equal(f.stats.unlocks, 1);
});
test('uncertain delivery retains UUID and only reconciliation reuses it', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.respond(async body => { if (body.accion === 'recoger') throw Error('timeout after unknown commit'); return { data: body.accion === 'estado' ? f.status() : f.result(), error: null }; });
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /timeout/);
  assert.equal(f.api.pending(A).op, OP); assert.equal(f.stats.hydrates, 0);
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /pendiente/);
  await f.api.reconcile(f.scene);
  assert.equal(f.calls.filter(c => c.body.accion === 'recoger').length, 1);
  assert.equal(f.calls.find(c => c.body.accion === 'comprobar').body.op, OP);
  assert.equal(f.api.pending(A), null); assert.equal(f.live().cont.items[0].n, 5);
});
test('an account switch during claim cannot hydrate or clear the original account receipt', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.respond(async body => { if (body.accion === 'recoger') f.ctx.UID = B; return { data: f.result(), error: null }; });
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /cuenta/);
  assert.equal(f.stats.hydrates, 0); assert.equal(f.api.pending(A).op, OP); assert.equal(f.api.pending(B), null);
});
test('local progress changed after request is backed up instead of replaced by the ACK', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.respond(async () => { f.change(d => { d.latestAction = 'new live action'; }); return { data: f.result(), error: null }; });
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /partida cambió/);
  assert.equal(f.stats.hydrates, 0); assert.equal(f.live().latestAction, 'new live action');
  assert.equal(f.api.pending(A).op, OP); assert.ok([...f.store.keys()].some(k => k.startsWith('gf-conflicto-respaldo-')));
});
test('a server conflict preserves live progress and receipt instead of hydrating', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.respond(async () => ({ data: f.result({ conflicto: true }), error: null }));
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /otra operación/);
  assert.equal(f.stats.hydrates, 0); assert.equal(f.api.pending(A).op, OP);
});
test('an ACK with a different operation or target is rejected before changing state', async () => {
  for (const receipt of [{ op: OP2, graveId: ID }, { op: OP, graveId: B }]) {
    const f = fixture(); await f.api.load(f.scene);
    f.respond(async () => ({ data: f.result({ receipt }), error: null }));
    await assert.rejects(() => f.api.claim(f.marker, f.scene), /recibo|operación|calavera/i);
    assert.equal(f.stats.hydrates, 0); assert.equal(f.api.pending(A).op, OP);
  }
});
test('a corrupt shared pending slot does not hide the durable per-operation journal', () => {
  const f = fixture();
  f.store.set('gf-venta-pendiente-qa-' + A, '{broken');
  f.store.set('gf-calavera-recibo-qa-' + A + '-' + OP, JSON.stringify({ cuenta: A, op: OP, createdAt: 1, calavera: { id: ID, revision: 2 }, base: BASE, beforeKey: 'old' }));
  assert.equal(f.api.pending(A)?.op, OP);
});
test('unable to persist a durable receipt means no mutation request is sent', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.ctx.localStorage.setItem = () => { throw Error('storage quota'); };
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /storage quota/);
  assert.equal(f.calls.filter(c => c.body.accion === 'recoger').length, 0); assert.equal(f.stats.hydrates, 0);
});
test('stale status after account switch or scene shutdown cannot draw markers', async () => {
  for (const transition of ['account', 'shutdown']) {
    const f = fixture(); let resolve;
    f.respond(() => new Promise(done => { resolve = done; }));
    const load = f.api.load(f.scene);
    if (transition === 'account') f.ctx.UID = B; else f.api.clear(f.scene);
    resolve({ data: f.status(), error: null });
    assert.equal(await load, false); assert.equal(f.ctx.GF.forestCuerpos.length, 0); assert.equal(f.api.own(), null);
  }
});
test('guiding arrow uses only marker matching both own ID and owner flag', async () => {
  const f = fixture();
  f.respond(async () => { const data = f.status(); data.markers[0].isMine = false; return { data, error: null }; });
  await f.api.load(f.scene); assert.equal(f.api.own(), null);
  f.respond(async () => ({ data: f.status(), error: null }));
  await f.api.load(f.scene); assert.equal(f.api.own().id, ID); assert.equal(f.api.own().mine, true);
});
test('own invalidation updates only header metadata and marks the drawn reflection for retirement', async () => {
  const f = fixture(); await f.api.load(f.scene);
  const c = f.ctx.GF.forestCuerpos.find(x => x.mia);
  const sprite = { texture: 'player-grave-sentinel' }, fx = [{ sparkle: true }], timer = { pending: true };
  c.sprite = 'player_grave'; c.spr = sprite; c.fx = fx; c._despedidaTimer = timer; c.revisado = true;
  f.api.invalidateOwn({ id: ID, revision: 3, zona: 'pantano', x: 110, y: 120, hasta: Date.now() + 10000, items: [{ kind: 'res', k: 'madera', n: 5 }] });
  assert.equal(c.spr, sprite); assert.equal(c.sprite, 'player_grave'); assert.equal(c.fx, fx); assert.equal(c._despedidaTimer, timer); assert.equal(c.revisado, true);
  assert.equal(c.revision, 3); assert.equal(c.x, 110); assert.equal(c.drops.length, 0);
  f.api.invalidateOwn(null); assert.equal(c.until, 0); assert.equal(f.api.own(), null); assert.equal(c.spr, sprite);
});
test('an already loaded accepted ACK clears the journal without hydrating the same progress again', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.respond(async () => { throw Error('timeout'); });
  await assert.rejects(() => f.api.claim(f.marker, f.scene));
  f.change(data => { data.cont.items = [{ kind: 'res', k: 'madera', n: 5 }]; });
  f.ctx.SAVE_BASES.set(A, NEXT); f.ctx.lastSavedKey = f.ctx.snapKey();
  f.respond(async body => ({ data: body.accion === 'estado' ? f.status() : f.result(), error: null }));
  await f.api.reconcile(f.scene);
  assert.equal(f.api.pending(A), null); assert.equal(f.stats.hydrates, 0); assert.equal(f.live().cont.items[0].n, 5);
});
test('cancelled receipt cannot hydrate a newer unrelated farm version over the pending base', async () => {
  const f = fixture(); await f.api.load(f.scene);
  f.respond(async () => { throw Error('timeout'); });
  await assert.rejects(() => f.api.claim(f.marker, f.scene));
  f.respond(async () => ({ data: f.result({ cancelado: true, receipt: { op: OP, graveId: ID, cancelado: true } }), error: null }));
  await assert.rejects(() => f.api.reconcile(f.scene), /canceló.*otra operación/);
  assert.equal(f.stats.hydrates, 0); assert.equal(f.api.pending(A).op, OP); assert.equal(f.live().latestAction, 'keep');
});
test('enrolled death always uses the server even with the feature flag off; a confirmed null-grave result is valid', async () => {
  const f = fixture(); f.change(d => { d.hp = 0; d._graveProtocol = 1; }); f.ctx.GF.GRAVES_SHARED_ENABLED = false;
  assert.equal(f.api.deathUsesServer(), true);
  f.respond(async () => ({ data: f.deathResult(), error: null }));
  const r = await f.api.die(f.scene);
  assert.equal(r.receipt.graveId, null); assert.equal(f.calls[0].body.accion, 'morir'); assert.equal(f.calls[0].body.op, OP);
  assert.equal(f.calls[0].body.id, undefined); assert.equal(f.calls[0].body.items, undefined);
  assert.equal(f.live().hp, 50); assert.equal(f.live().cont, null); assert.equal(f.api.pending(A), null);
  assert.equal(f.stats.resumes, 1);
});
test('legacy death requires a successful enabled status and cannot silently switch after a failed status refresh', async () => {
  const f = fixture(); f.change(d => { d.hp = 0; });
  assert.equal(f.api.deathUsesServer(), false); await assert.rejects(() => f.api.die(f.scene), /privado/);
  await f.api.load(f.scene); assert.equal(f.api.deathUsesServer(), true);
  f.respond(async () => { throw Error('status offline'); });
  await assert.rejects(() => f.api.load(f.scene), /status offline/);
  assert.equal(f.api.deathUsesServer(), false);
  f.change(d => { d._graveProtocol = 1; }); assert.equal(f.api.deathUsesServer(), true);
});
test('an older failed status request cannot invalidate a newer successful status generation', async () => {
  const f = fixture(); let rejectOld, requested = 0;
  f.respond(async () => {
    if (++requested === 1) return await new Promise((_resolve, reject) => { rejectOld = reject; });
    return { data: f.status(), error: null };
  });
  const first = f.api.load(f.scene); await f.api.load(f.scene);
  assert.equal(f.api.deathUsesServer(), true); rejectOld(Error('old request failed'));
  await assert.rejects(() => first, /old request/); assert.equal(f.api.deathUsesServer(), true);
});
test('uncertain death keeps inventory, UUID and recovery pause until the same death receipt is confirmed', async () => {
  const f = fixture(); f.change(d => { d.hp = 0; d._graveProtocol = 1; d.cont.items.push({ kind: 'res', k: 'madera', n: 5 }); });
  const original = clone(f.live());
  f.respond(async body => { if (body.accion === 'morir') throw Error('timeout after uncertain death'); return { data: f.deathResult(), error: null }; });
  await assert.rejects(() => f.api.die(f.scene), /timeout/);
  assert.deepEqual(f.live(), original); assert.equal(f.api.pending(A).op, OP); assert.equal(f.api.pending(A).calavera.action, 'morir');
  assert.equal(f.paused(), true); assert.equal(f.stats.resumes, 0); assert.ok(f.scene._graveRecovery);
  assert.equal(f.ctx.document.body.children[0].inert, true);
  await f.api.reconcile(f.scene);
  assert.equal(f.calls[1].body.accion, 'comprobar'); assert.equal(f.calls[1].body.tipo, 'morir'); assert.equal(f.calls[1].body.op, OP);
  assert.equal(f.calls.filter(c => c.body.accion === 'morir').length, 1);
  assert.equal(f.live().hp, 50); assert.equal(f.api.pending(A), null); assert.equal(f.paused(), false); assert.equal(f.stats.resumes, 1);
  assert.equal(f.ctx.document.body.children[0].inert, false);
});
test('HTTP 400 after death is sealed by cancellation before a fresh UUID; no optimistic inventory loss or resume', async () => {
  const f = fixture(); f.change(d => { d.hp = 0; d._graveProtocol = 1; });
  const original = clone(f.live());
  f.respond(async body => body.accion === 'morir'
    ? { data: null, error: { context: { status: 400, json: async () => ({ error: 'server rejected death' }) } } }
    : { data: f.deathResult({ cancelado: true, updated_at: BASE, data: original, receipt: { op: OP, action: 'morir', graveId: null, cancelado: true } }), error: null });
  await assert.rejects(() => f.api.die(f.scene), /server rejected/);
  assert.equal(f.api.pending(A).op, OP); assert.deepEqual(f.live(), original); assert.equal(f.paused(), true);
  const cancelled = await f.api.reconcile(f.scene); assert.equal(cancelled.cancelado, true);
  assert.equal(f.api.pending(A), null); assert.equal(f.live().hp, 0); assert.equal(f.stats.resumes, 0);
  assert.equal(f.paused(), true, 'a dead player must still confirm a new death transaction');
  f.respond(async body => ({ data: f.deathResult({}, body.op), error: null }));
  f.scene.iniciarMuerteCompartida = async () => { await f.api.die(f.scene); f.api.hideRecovery(f.scene, true); };
  await f.scene._graveRecovery.children[2].onclick();
  const requests = f.calls.filter(c => c.body.accion === 'morir');
  assert.equal(requests.length, 2); assert.equal(requests[0].body.op, OP); assert.equal(requests[1].body.op, OP2);
  assert.equal(f.live().hp, 50); assert.equal(f.paused(), false); assert.equal(f.stats.resumes, 1);
});
test('HTTP 400 after pickup retains its UUID until a cancelled pickup receipt releases recovery', async () => {
  const f = fixture(); await f.api.load(f.scene); const original = clone(f.live());
  f.respond(async body => body.accion === 'recoger'
    ? { data: null, error: { context: { status: 400, json: async () => ({ error: 'pickup rejected' }) } } }
    : { data: body.accion === 'estado' ? f.status() : f.result({ cancelado: true, updated_at: BASE, data: original,
      receipt: { op: OP, action: 'recoger', graveId: ID, cancelado: true } }), error: null });
  await assert.rejects(() => f.api.claim(f.marker, f.scene), /pickup rejected/);
  assert.equal(f.api.pending(A).op, OP); assert.deepEqual(f.live(), original); assert.equal(f.stats.resumes, 0);
  await f.api.reconcile(f.scene);
  assert.equal(f.calls.filter(c => c.body.accion === 'recoger').length, 1); assert.equal(f.calls.find(c => c.body.accion === 'comprobar').body.op, OP);
  assert.equal(f.api.pending(A), null); assert.deepEqual(f.live(), original); assert.equal(f.paused(), false); assert.equal(f.stats.resumes, 1);
});
test('cold load of an uncertain death can reconcile an already loaded ACK with flags off and without hydrating again', async () => {
  const first = fixture(); first.change(d => { d.hp = 0; d._graveProtocol = 1; });
  first.respond(async () => { throw Error('timeout'); }); await assert.rejects(() => first.api.die(first.scene));
  const f = fixture({ store: [...first.store], live: first.deathResult().data, base: NEXT }); f.ctx.GF.GRAVES_SHARED_ENABLED = false;
  f.respond(async () => ({ data: f.deathResult(), error: null })); f.api.showRecovery(f.scene, 'recover the previous receipt');
  assert.equal(f.paused(), true); await f.scene._graveRecovery.children[2].onclick();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].body.accion, 'comprobar'); assert.equal(f.calls[0].body.tipo, 'morir');
  assert.equal(f.api.pending(A), null); assert.equal(f.stats.hydrates, 0); assert.equal(f.paused(), false);
});
test('cold canonical load can clear a confirmed death receipt after a later foreign claim changed only the farm version', async () => {
  const first = fixture(); first.change(d => { d.hp = 0; d._graveProtocol = 1; });
  first.respond(async () => { throw Error('ACK lost'); }); await assert.rejects(() => first.api.die(first.scene));
  const latest = '2026-11-08T23:00:02.000000Z';
  const canonical = first.deathResult().data;
  const f = fixture({ store: [...first.store], live: canonical, base: latest });
  f.ctx.GF.GRAVES_SHARED_ENABLED = false;
  f.respond(async () => ({ data: f.deathResult({ updated_at: latest, conflicto: true }), error: null }));
  f.api.showRecovery(f.scene, 'already loaded current canonical farm');
  await f.scene._graveRecovery.children[2].onclick();
  assert.equal(f.api.pending(A), null, 'a confirmed receipt must not remain stranded after current canonical state was loaded');
  assert.equal(f.stats.hydrates, 0); assert.equal(f.paused(), false);
});
test('recovery never resumes a scene that was already paused before the operation', async () => {
  const f = fixture({ paused: true }); f.change(d => { d.hp = 0; d._graveProtocol = 1; });
  f.respond(async body => { if (body.accion === 'morir') throw Error('timeout'); return { data: f.deathResult(), error: null }; });
  await assert.rejects(() => f.api.die(f.scene)); await f.api.reconcile(f.scene);
  assert.equal(f.stats.resumes, 0); assert.equal(f.paused(), true);
});
test('a death ACK cannot be substituted by a pickup ACK with the same UUID', async () => {
  const f = fixture(); f.change(d => { d.hp = 0; d._graveProtocol = 1; });
  f.respond(async () => ({ data: f.result(), error: null }));
  await assert.rejects(() => f.api.die(f.scene), /recibo/);
  assert.equal(f.api.pending(A).calavera.action, 'morir'); assert.equal(f.stats.hydrates, 0); assert.equal(f.live().hp, 0);
});
test('switching account during death never hydrates or resumes the old scene and retains its account journal', async () => {
  const f = fixture(); f.change(d => { d.hp = 0; d._graveProtocol = 1; });
  f.respond(async () => { f.ctx.UID = B; return { data: f.deathResult(), error: null }; });
  await assert.rejects(() => f.api.die(f.scene), /cuenta/);
  assert.equal(f.stats.hydrates, 0); assert.equal(f.stats.resumes, 0); assert.equal(f.api.pending(A).op, OP); assert.equal(f.api.pending(B), null);
  f.api.reset(); assert.equal(f.api.pending(A).op, OP);
});
