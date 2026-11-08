/* Real save.js hooks and real guardar V13 guard, with synthetic SDK/CAS only. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const REPO = path.resolve(__dirname,'..');
const UID = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
const ID = '33333333-3333-4333-8333-333333333333';
const BASE = '2026-11-08T23:00:00.123456+00:00', NOW = Date.parse('2026-11-08T23:00:03Z');
const source = fs.readFileSync(path.join(path.resolve(__dirname,'..'),'public/game/save.js'), 'utf8');
const edge = fs.readFileSync(path.join(path.resolve(__dirname,'..'),'supabase/functions/guardar/index.ts'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const conflict = proof => ({ error: { context: { status: 409, json: async () => ({ conflicto: true, ...(proof ? { graveProof: proof } : {}) }) } } });
function env(at = NOW) {
  const { ctx: c, problemas } = require(path.join(REPO, 'tools/arrancar-el-juego.contexto.js')).arrancar(REPO, {
    'game/main.js': '', 'game/save.js': source.replace('window.SAVE_READY = initSave();', 'window.SAVE_READY = Promise.resolve();'),
  });
  assert.equal(problemas.filter(p => p.quien === 'game/save.js' && p.grave).length, 0);
  const run = code => vm.runInContext(code, c), memory = new Map(), calls = [], rawCalls = [], stats = { hydrated: 0, reconciled: 0, invalidated: 0 };
  let now = at;
  c.Date = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  c.nowMs = () => now; c.crypto = { randomUUID };
  c.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key),
    key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
  for (const name of ['log', 'toast', 'showSaving', 'showSaved', 'showSaveError', 'refreshHud', 'refreshLogros', 'syncSlots', 'refreshInv',
    'actividadGranjaRefrescar', 'sesionLog', 'buffCdConfirmar', 'actividadGranjaRecibir', 'logrosRecibir', 'usdtProgramarPendiente']) c[name] = () => {};
  c.isOpen = () => false; c.sleepMs = async () => {};
  const copies = []; c.copiaGuardar = (data, confirmed) => copies.push({ data: plain(data), confirmed });
  let remote = { version: BASE, name: 'Granjero', data: null }, onSave, sharedPending = false, counter = 0;
  const stamp = () => '2026-11-08T23:00:' + String(4 + ++counter).padStart(2, '0') + '.123456+00:00';
  const write = body => {
    if (body.base !== remote.version) return conflict();
    remote = { version: stamp(), name: body.name, data: { ...plain(body.data), _saveOp: body.op } };
    return { data: { ok: true, updated_at: remote.version } };
  };
  c.qaSb = { functions: { invoke: async (_name, { body }) => {
    rawCalls.push(body); calls.push(plain(body)); return onSave ? onSave(body, calls.length) : write(body);
  } }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data: plain(remote.data), name: remote.name, updated_at: remote.version } }) }) }) }) };
  run(`estadoDeCero();UID='${UID}';CARGA_OK=true;SOLO_LOCAL=false;sb=qaSb;SAVE_EN_CURSO=null;MERCADO_EN_CURSO=null;SAVE_OTRA=false;SAVE_CONFLICTOS.clear();SAVE_BASES.set('${UID}','${BASE}');lastSavedKey=null;`);
  c.G._graveProtocol = 1;
  c.G.tumba = { id: ID, revision: 1, zona: 'pantano', x: 100, y: 100, hasta: now + 600000,
    items: Array.from({ length: 6 }, (_, i) => ({ kind: 'res', k: 'loot-' + i, n: i + 1 })) };
  c.G.cont = { c: 'backpack', items: [{ kind: 'res', k: 'carne', n: 2 }] };
  c.G.res.madera = 40; c.G.pedidos = { mission: 'establo', progress: 2 };
  c.G.weapons = { espada_madera: { dur: 30, plus: 2, runas: { fuego: 1 } } };
  const hydrateReal = c.hydrate; c.hydrate = data => { stats.hydrated++; return hydrateReal(data); };
  vm.runInContext(fs.readFileSync(path.join(path.resolve(__dirname,'..'),'public/game/grave-rebase.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(path.resolve(__dirname,'..'),'public/game/graves-api.js'), 'utf8'), c);
  c.GoldenGraves.hasPending = () => sharedPending;
  c.GoldenGraves.reconcile = async () => { stats.reconciled++; };
  c.GoldenGraves.invalidateOwn = () => { stats.invalidated++; };
  remote.data = plain(c.snapshot());
  function proof(body, accepted = false) {
    const before = plain(body.data.tumba), after = { ...plain(before), revision: before.revision + 1, items: before.items.slice(1) };
    const anchor = accepted ? stamp() : body.base;
    const currentData = { ...plain(accepted ? body.data : remote.data), _saveOp: accepted ? body.op : remote.data._saveOp || 'previous-op', tumba: after };
    const currentBase = stamp(); remote = { version: currentBase, data: currentData, name: body.name };
    return { ok: true, proofType: 'foreign_grave_claim_chain_v1', uid: UID, op: body.op, requestedBase: body.base,
      acceptedOwn: accepted, fromBase: anchor, currentBase, currentName: body.name, currentData: plain(currentData),
      serverNow: new c.Date().toISOString(), validUntil: new c.Date(now + 30000).toISOString(), nonGraveHashCurrent: 'a'.repeat(64),
      events: [{ eventId: counter, foreign: true, kind: 'claimed', graveId: ID, fromRevision: before.revision, toRevision: after.revision,
        baseBefore: anchor, baseAfter: currentBase, graveBefore: before, graveAfter: after, nonGraveHashBefore: 'a'.repeat(64), nonGraveHashAfter: 'a'.repeat(64) }] };
  }
  return { c, run, memory, calls, rawCalls, stats, copies, write, proof,
    onSave(fn) { onSave = fn; }, pending: () => run(`SAVE_PENDIENTES.get('${UID}')`),
    base: () => run(`SAVE_BASES.get('${UID}')`), conflicted: () => run(`SAVE_CONFLICTOS.has('${UID}')`),
    setSharedPending(v) { sharedPending = v; }, setNow(v) { now = v; }, setRemote(value) { remote = value; }, get remote() { return remote; } };
}

test('real saveFarm retryNew changes UUID and base, preserves in-flight progress, and never mutates original request', async () => {
  const e = env(); let original;
  e.onSave((body, n) => {
    if (n === 1) { original = plain(body); const p = e.proof(body); e.c.G.res.madera += 7; e.c.G.pedidos.progress = 4; e.c.G.weapons.espada_madera.dur = 27; return conflict(p); }
    return e.write(body);
  });
  await e.c.saveFarm(true);
  assert.equal(e.calls.length, 2); assert.notEqual(e.calls[1].op, original.op); assert.notEqual(e.calls[1].base, original.base);
  assert.deepEqual(plain(e.rawCalls[0]), original); assert.equal(e.calls[1].data.res.madera, 47); assert.equal(e.calls[1].data.pedidos.progress, 4);
  assert.equal(e.c.G.res.madera, 47); assert.equal(e.c.G.pedidos.progress, 4); assert.equal(e.c.G.weapons.espada_madera.dur, 27);
  assert.equal(e.c.G.tumba.revision, 2); assert.equal(e.stats.hydrated, 0); assert.equal(e.conflicted(), false); assert.equal(e.pending(), undefined);
  for (const body of e.calls) assert.equal(body.graveProtocol, 1);
});
test('real lost-own-ACK hook recognizes pre-theft content without hydrating older farm over later actions', async () => {
  const e = env(); e.onSave((body, n) => {
    if (n === 1) { const p = e.proof(body, true); e.c.G.res.madera = 49; e.c.G.pedidos.progress = 9; return { data: { ok: true, repetido: true, updated_at: p.currentBase, graveProof: p } }; }
    return e.write(body);
  });
  await e.c.saveFarm(true);
  assert.equal(e.stats.hydrated, 0); assert.equal(e.conflicted(), false); assert.equal(e.c.G.res.madera, 49); assert.equal(e.c.G.pedidos.progress, 9);
  assert.equal(e.remote.data.res.madera, 49); assert.equal(e.remote.data.pedidos.progress, 9); assert.equal(e.c.G.tumba.revision, 2);
});
test('three rebase events per queue are bounded; a fourth competing claim preserves and blocks pending state', async () => {
  const e = env(); e.onSave(body => conflict(e.proof(body)));
  await e.c.saveFarm(true);
  assert.equal(e.calls.length, 4); assert.equal(e.run(`SAVE_GRAVE_REBASES.get('${UID}')`), 3);
  assert.equal(e.c.G.tumba.revision, 4); assert.equal(e.conflicted(), true); assert.ok(e.pending());
  assert.equal(new Set(e.calls.map(body => body.op)).size, 4); assert.equal(e.stats.hydrated, 0);
});
test('unknown proof, account switch and unrelated remote change fail closed with live progress preserved', async () => {
  for (const mode of ['unknown', 'account', 'other-change']) {
    const e = env(); e.onSave(body => {
      const p = e.proof(body); e.c.G.res.madera = 51;
      if (mode === 'unknown') p.proofType = 'unrecognized';
      if (mode === 'other-change') p.events[0].nonGraveHashAfter = 'b'.repeat(64);
      if (mode === 'account') e.run(`UID='${OTHER}'`);
      return conflict(p);
    });
    await e.c.saveFarm(true); assert.equal(e.calls.length, 1); assert.equal(e.stats.hydrated, 0); assert.equal(e.c.G.res.madera, 51);
    assert.equal(e.c.G.tumba.revision, 1); assert.ok(e.pending());
    if (mode !== 'account') assert.equal(e.conflicted(), true);
  }
});
test('legacy local pickup cannot be inferred into a tomb-only patch', async () => {
  const e = env(); e.onSave(body => { const p = e.proof(body); e.c.G.tumba = null; e.c.G.cont.items.push({ kind: 'res', k: 'loot-0', n: 1 }); return conflict(p); });
  await e.c.saveFarm(true); assert.equal(e.calls.length, 1); assert.equal(e.conflicted(), true); assert.equal(e.c.G.tumba, null);
  assert.equal(e.c.G.cont.items.at(-1).k, 'loot-0'); assert.equal(e.stats.hydrated, 0);
});
test('snapshot/hydrate retains all 187 grave entries and exact IDs, revisions and item metadata', () => {
  const e = env(); const data = plain(e.c.snapshot());
  data.tumba.items = Array.from({ length: 187 }, (_, i) => ({ kind: i % 2 ? 'armorset' : 'arm', k: 'item-' + i, n: 1,
    w: { dur: i + 1, plus: 2, runas: { fuego: 1 } }, piezas: ['casco'], dur: { casco: i + 2 } }));
  const expected = plain(data.tumba); e.c.hydrate(data); const after = plain(e.c.snapshot());
  assert.deepEqual(after.tumba, expected); assert.equal(after._graveProtocol, 1);
});
test('generic recovery delegates a grave receipt to reconciliation without full-farm hydration', async () => {
  const e = env(); e.setSharedPending(true); e.run(`SAVE_CONFLICTOS.add('${UID}')`);
  const before = plain(e.c.snapshot()); const r = await e.c.recuperarGuardadoServidor();
  assert.equal(r, true); assert.equal(e.stats.reconciled, 1); assert.equal(e.stats.hydrated, 0); assert.deepEqual(plain(e.c.snapshot()), before);
});

const rules = vm.createContext({ Math, JSON, Number, Object, Array, Set, Date, isFinite });
vm.runInContext(edge.slice(edge.indexOf('function graveCanonical('), edge.indexOf('/* === FIN REGLAS === */')), rules);
function server() {
  const file = path.join(REPO, 'tools/test-guardado-atomico.js');
  const requireReal = createRequire(file);
  const requireFake = name => ['fs', 'node:fs'].includes(name) ? { ...fs, readFileSync(filename, ...args) { return String(filename).replaceAll('\\', '/').endsWith('/supabase/functions/guardar/index.ts') ? edge : fs.readFileSync(filename, ...args); } } : requireReal(name);
  const prefix = fs.readFileSync(file, 'utf8').split('(async()=>{')[0];
  return new Function('require', '__dirname', prefix + ';return servidor;')(requireFake, path.dirname(file));
}
test('real V13 HTTP handler rejects an old client with 409 and never writes or resets the farm', async () => {
  const e = env(), data = plain(e.c.snapshot()), factory = server();
  const s = factory({ user_id: 'qa', name: 'QA', updated_at: BASE, data });
  const r = await s.call({ base: BASE, op: randomUUID(), name: 'QA', data: { ...plain(data), tumba: null } });
  assert.equal(r.status, 409); assert.equal((await r.json()).actualizar, true); assert.equal(s.writes(), 0); assert.deepEqual(s.row().data, data);
});
test('real V13 guard rejects new deadlines/coordinates, removed IDs, altered quantities and early clearing', async () => {
  const e = env(), prev = plain(e.c.snapshot()), factory = server();
  for (const change of [t => { t.hasta++; }, t => { t.x++; }, t => { delete t.id; }, t => { t.items[0].n++; }, () => null]) {
    const next = plain(prev); const result = change(next.tumba); if (result === null) next.tumba = null;
    assert.equal(typeof rules.graveOrdinaryGuard(prev, plain(next), 1, NOW), 'string');
    const s = factory({ user_id: 'qa', name: 'QA', updated_at: BASE, data: plain(prev) });
    const r = await s.call({ base: BASE, op: randomUUID(), graveProtocol: 1, name: 'QA', data: next });
    assert.equal(r.status, 409); assert.equal(s.writes(), 0); assert.deepEqual(s.row().data, prev);
  }
});
test('real pure V13 guard keeps legacy saves un-enrolled and allows unchanged enrolled state', () => {
  const e = env(), legacy = plain(e.c.snapshot()); delete legacy._graveProtocol; delete legacy.tumba.id; delete legacy.tumba.revision;
  const next = plain(legacy); next._graveProtocol = 1;
  assert.equal(rules.graveOrdinaryGuard(legacy, next, undefined, NOW), null); assert.equal(next._graveProtocol, undefined); assert.deepEqual(next.tumba, legacy.tumba);
  const enrolled = plain(e.c.snapshot()); assert.equal(rules.graveOrdinaryGuard(enrolled, plain(enrolled), 1, NOW), null);
});

test('actual funded SQL death -> foreign SQL claim -> SQL proof -> real saveFarm rebase preserves later owner progress', async () => {
  const { PGlite } = require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
  const { planSharedGraveDeath } = await import('../supabase/functions/calaveras/death-plan.mjs');
  const { planSharedGraveClaim } = await import('../supabase/functions/calaveras/claim-plan.mjs');
  const e = env(Date.now()), db = new PGlite(); await db.waitReady;
  const q = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  const admin = () => db.exec('RESET ROLE');
  const service = () => db.exec("SET ROLE service_role; SELECT set_config('request.jwt.claim.role','service_role',false)");
  const farm = async uid => { await admin(); return q('SELECT data,name,updated_at::text AS base FROM public.farms WHERE user_id=$1', [uid]); };
  try {
    await db.exec(`CREATE ROLE service_role BYPASSRLS; CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.role()RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
      GRANT USAGE ON SCHEMA auth,public TO service_role,anon,authenticated; GRANT EXECUTE ON FUNCTION auth.role()TO service_role,anon,authenticated;
      CREATE TABLE public.farms(user_id uuid PRIMARY KEY REFERENCES auth.users(id),name text,data jsonb,updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
      GRANT SELECT,INSERT,UPDATE ON public.farms TO service_role;
      CREATE SCHEMA golden_internal; CREATE TABLE golden_internal.game_access(id boolean PRIMARY KEY,game_open boolean); INSERT INTO golden_internal.game_access VALUES(true,true);
      GRANT USAGE ON SCHEMA golden_internal TO service_role; GRANT SELECT ON golden_internal.game_access TO service_role;`);
    await db.exec(fs.readFileSync(path.join(path.resolve(__dirname,'..'),'supabase/migrations/20261108215902_calaveras_compartidas.sql'), 'utf8'));
    await db.exec('');
    await db.exec('UPDATE golden_internal.graves_config SET enabled=true,protocol_ready=true');
    const owner = plain(e.c.snapshot()); delete owner._graveProtocol; owner.hp = 0; owner.hpMax = 100; owner.tumba = null;
    owner.cont = { c: 'backpack', items: [{ kind: 'res', k: 'madera', n: 5 }] }; owner.gear = {}; owner.armorEq = null;
    owner.zonaViaje = { t: Date.now() - 10000, pos: { zona: 'pantano', x: 100, y: 100 }, res: plain(owner.res), plata: owner.plata, golden: 0 };
    for (const [uid, name, data] of [[UID, 'Granjero', owner], [OTHER, 'Other actor', { hp: 100, cont: { c: 'backpack', items: [] }, tumba: null, zonaViaje: { pos: { zona: 'pantano', x: 100, y: 100 } } }]]) {
      await db.query('INSERT INTO auth.users(id)VALUES($1)', [uid]); await db.query('INSERT INTO public.farms(user_id,name,data)VALUES($1,$2,$3)', [uid, name, JSON.stringify(data)]);
    }
    const before = await farm(UID); await service();
    const preDeath = (await q('SELECT public.gf_graves_deposit_snapshot($1,$2)AS v', [UID, before.base])).v;
    const death = planSharedGraveDeath(preDeath.actor.data, () => 99);
    await q('SELECT public.gf_graves_deposit_commit($1,$2,$3,$4)AS v', [UID, randomUUID(), before.base, JSON.stringify({ breakSlots: death.breakSlots, dropSlots: death.dropSlots })]);
    const accepted = await farm(UID); e.c.hydrate(accepted.data); e.stats.hydrated = 0; e.setNow(Date.now());
    e.setRemote({ version: accepted.base, data: plain(accepted.data), name: accepted.name }); e.run(`SAVE_BASES.set('${UID}',${JSON.stringify(accepted.base)});lastSavedKey=null;`);
    let original;
    e.onSave(async (body, n) => {
      if (n === 1) {
        original = plain(body); const actor = await farm(OTHER); await service();
        const g = accepted.data.tumba;
        const pre = (await q('SELECT public.gf_graves_claim_snapshot($1,$2,$3,$4)AS v', [OTHER, g.id, actor.base, g.revision])).v;
        const p = planSharedGraveClaim(pre.actor.data.cont, pre.grave.items);
        await q('SELECT public.gf_graves_claim($1,$2,$3,$4,$5,$6,$7,$8)AS v', [OTHER, g.id, randomUUID(), actor.base, pre.ownerBase, g.revision, JSON.stringify(p.cont), JSON.stringify(p.remaining)]);
        const proof = (await q('SELECT public.gf_graves_save_proof($1,$2,$3,$4)AS v', [UID, body.base, body.op, JSON.stringify(body.data.tumba)])).v;
        assert.equal(proof.ok, true); e.c.G.res.madera += 9; e.c.G.pedidos.progress = 7; e.setNow(Date.now());
        const remote = await farm(UID); e.setRemote({ version: remote.base, name: remote.name, data: plain(remote.data) });
        return conflict(proof);
      }
      await service();
      const data = { ...plain(body.data), _saveOp: body.op };
      const written = await q('UPDATE public.farms SET data=$2,updated_at=clock_timestamp()WHERE user_id=$1 AND updated_at=$3::timestamptz RETURNING updated_at::text AS base', [UID, JSON.stringify(data), body.base]);
      assert.ok(written); return { data: { ok: true, updated_at: written.base } };
    });
    await e.c.saveFarm(true);
    assert.equal(e.calls.length, 2); assert.notEqual(e.calls[1].op, original.op); assert.deepEqual(plain(e.rawCalls[0]), original);
    const final = await farm(UID), receiver = await farm(OTHER);
    assert.equal(final.data.res.madera, 49); assert.equal(final.data.pedidos.progress, 7); assert.equal(final.data.tumba, null);
    assert.equal(receiver.data.cont.items.find(x => x.k === 'madera').n, 5); assert.equal(e.stats.hydrated, 0); assert.equal(e.conflicted(), false);
    const late = await db.query('UPDATE public.farms SET data=$2 WHERE user_id=$1 AND updated_at=$3::timestamptz RETURNING user_id', [UID, JSON.stringify(original.data), original.base]);
    assert.equal(late.rows.length, 0, 'late original request cannot land after the proven base change');
  } finally { await db.close(); }
});
