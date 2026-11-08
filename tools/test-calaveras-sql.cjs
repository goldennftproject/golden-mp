/* Current server-funded fixture; historical raw-capture suite preserved separately. */
/* Executes draft SQL only in an in-memory PostgreSQL WASM instance.
   This is not Supabase and has no access to production credentials or player data.
   PGlite has one connection: queued actors exercise real SQL invariants, not real lock contention. */
const fs = require('node:fs'), path = require('node:path');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const OWNER = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';
const B = '33333333-3333-4333-8333-333333333333';
const OP = '44444444-4444-4444-8444-444444444444';
const OP2 = '55555555-5555-4555-8555-555555555555';
const ID = '66666666-6666-4666-8666-666666666666';
let db, planner, deathPlanner;
const leaf = (k, n = 1, kind = 'res', extra = {}) => ({ kind, k, n, ...extra });
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
async function admin() { await db.exec('RESET ROLE'); }
async function service() {
  await db.exec("SET ROLE service_role; SELECT set_config('request.jwt.claim.role','service_role',false)");
}
async function config(enabled, ready) {
  await admin(); await db.query('UPDATE golden_internal.graves_config SET enabled=$1,protocol_ready=$2', [enabled, ready]);
}
async function farm(uid) {
  await admin(); return scalar('SELECT data,updated_at::text AS base FROM public.farms WHERE user_id=$1', [uid]);
}
async function graveRow(id) {
  await admin(); return scalar('SELECT *,expires_at::text AS expiry FROM golden_internal.player_graves WHERE id=$1', [id]);
}
async function makeGrave(items = [leaf('madera', 5)], owner = OWNER) {
  await config(true, true); // In-memory QA only; draft defaults remain OFF.
  const f=await farm(owner);
  f.data.hp=0;f.data.hpMax=100;f.data.cont={c:'backpack',items};
  f.data.zonaViaje={t:Date.now()-1000,pos:{zona:'pantano',x:100,y:100}};
  await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp()WHERE user_id=$1',[owner,JSON.stringify(f.data)]);
  const current=await farm(owner);await service();
  const pre=(await scalar('SELECT public.gf_graves_deposit_snapshot($1,$2)v',[owner,current.base])).v;
  const plan=deathPlanner(pre.actor.data,()=>99);
  const op=require('node:crypto').randomUUID();
  const done=(await scalar('SELECT public.gf_graves_deposit_commit($1,$2,$3,$4)v',[owner,op,current.base,JSON.stringify({breakSlots:plan.breakSlots,dropSlots:plan.dropSlots})])).v;
  return graveRow(done.receipt.graveId);
}
async function pre(uid, grave) {
  const f = await farm(uid); await service();
  const r = await scalar('SELECT public.gf_graves_claim_snapshot($1::uuid,$2::uuid,$3::text,$4::bigint) AS v', [uid, grave.id, f.base, grave.revision]);
  return r.v;
}
async function claim(uid, grave, op = OP, snapshot = null, planOverride = null) {
  const p = snapshot || await pre(uid, grave);
  const plan = planOverride || planner(p.actor.data.cont, p.grave.items);
  await service();
  return (await scalar('SELECT public.gf_graves_claim($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::bigint,$7::jsonb,$8::jsonb) AS v',
    [uid, grave.id, op, p.actor.updated_at, p.ownerBase, grave.revision, JSON.stringify(plan.cont), JSON.stringify(plan.remaining)])).v;
}
async function reconcile(uid, grave, op = OP) {
  await service();
  return (await scalar('SELECT public.gf_graves_reconcile($1::uuid,$2::uuid,$3::uuid,$4::bigint) AS v', [uid, grave.id, op, grave.revision])).v;
}
before(async () => {
  planner = (await import('../supabase/functions/calaveras/claim-plan.mjs')).planSharedGraveClaim;
  deathPlanner=(await import('../supabase/functions/calaveras/death-plan.mjs')).planSharedGraveDeath;
  db = new PGlite(); await db.waitReady;
  await db.exec(`CREATE ROLE service_role BYPASSRLS; CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    GRANT USAGE ON SCHEMA auth,public TO service_role,anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.role() TO service_role,anon,authenticated;
    CREATE TABLE public.farms(user_id uuid PRIMARY KEY REFERENCES auth.users(id),name text,data jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
    GRANT SELECT,INSERT,UPDATE ON public.farms TO service_role; CREATE SCHEMA golden_internal; CREATE TABLE golden_internal.game_access(id boolean PRIMARY KEY,game_open boolean); INSERT INTO golden_internal.game_access VALUES(true,true); GRANT SELECT ON golden_internal.game_access TO service_role;`);
  await db.exec(fs.readFileSync(path.join(path.resolve(__dirname,'..'),'supabase/migrations/20261108215902_calaveras_compartidas.sql'), 'utf8'));
});
beforeEach(async () => {
  await admin(); await db.exec("SELECT set_config('golden.grave_commit','0',false); UPDATE golden_internal.graves_config SET enabled=false,protocol_ready=false; TRUNCATE golden_internal.grave_events,golden_internal.grave_receipts,golden_internal.player_graves,public.farms,auth.users RESTART IDENTITY CASCADE;");
  for (const uid of [OWNER, A, B]) {
    await db.query('INSERT INTO auth.users(id) VALUES($1)', [uid]);
    const data = { hp:100,hpMax:100,level: 8, res: { madera: 77 }, latestAction: 'preserve-me', cont: { c: 'backpack', items: [] }, tumba: null,
      zonaViaje: { pos: { zona: 'pantano', x: 100, y: 100 } } };
    await db.query('INSERT INTO public.farms(user_id,name,data)VALUES($1,$2,$3)', [uid, uid === OWNER ? 'Owner' : uid === A ? 'Actor A' : 'Actor B', JSON.stringify(data)]);
  }
});
after(async () => { if (db) await db.close(); });

test('draft defaults and half-enabled state stay closed without changing existing saves', async () => {
  const before = await farm(OWNER);
  for (const [enabled, ready] of [[false, false], [true, false], [false, true]]) {
    await config(enabled, ready); await service();
    const status = (await scalar('SELECT public.gf_graves_status($1::uuid,$2::text) AS v', [A, 'pantano'])).v;
    assert.equal(status.enabled, false); assert.deepEqual(status.markers, []);
    await assert.rejects(() => db.query('SELECT public.gf_graves_claim_snapshot($1,$2,$3,1)', [A, ID, before.base]), /no disponibles/);
  }
  assert.deepEqual((await farm(OWNER)).data, before.data);
});
test('actual service_role can call sanctioned RPCs but anon/authenticated cannot read private tables or call RPCs', async () => {
  await service();
  assert.equal((await scalar('SELECT public.gf_graves_status($1::uuid,$2::text) AS v', [A, 'pantano'])).v.enabled, false);
  for (const role of ['anon', 'authenticated']) {
    await admin(); await db.exec('SET ROLE ' + role);
    await assert.rejects(() => db.query('SELECT * FROM golden_internal.player_graves'), /permission denied/);
    await assert.rejects(() => db.query('SELECT public.gf_graves_status($1,$2)', [A, 'pantano']), /permission denied/);
  }
});
test('an accepted death registers once; a normal identical save never renews expiry', async () => {
  const g = await makeGrave(); const before = await farm(OWNER);
  await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1', [OWNER, JSON.stringify(before.data)]);
  const after = await graveRow(g.id);
  assert.equal(after.expiry, g.expiry); assert.equal(after.revision, 1);
  assert.equal((await scalar('SELECT count(*)::int AS n FROM golden_internal.player_graves')).n, 1);
});
test('claim commits claimant container, owner grave and receipt together while keeping all unrelated progress', async () => {
  const g = await makeGrave(); const beforeOwner = await farm(OWNER), beforeActor = await farm(A);
  const result = await claim(A, g);
  assert.equal(result.ok, true); assert.equal(result.repeated, false);
  const owner = await farm(OWNER), actor = await farm(A), row = await graveRow(g.id);
  assert.equal(owner.data.tumba, null); assert.equal(actor.data.cont.items[0].n, 5); assert.equal(row.status, 'claimed');
  for (const data of [owner.data, actor.data]) { assert.equal(data.level, 8); assert.equal(data.res.madera, 77); assert.equal(data.latestAction, 'preserve-me'); }
  assert.notEqual(owner.base, beforeOwner.base); assert.notEqual(actor.base, beforeActor.base);
  assert.equal((await scalar("SELECT count(*)::int AS n FROM golden_internal.grave_receipts WHERE request->>'action'='recoger'")).n, 1);
});
test('two prepared actors cannot collect one grave twice; stale second claimant fails and loses nothing', async () => {
  const g = await makeGrave(); const pa = await pre(A, g), pb = await pre(B, g);
  await claim(A, g, OP, pa);
  await assert.rejects(() => claim(B, g, OP2, pb), /conflicto|cambió/);
  assert.equal((await farm(B)).data.cont.items.length, 0);
  assert.equal((await farm(A)).data.cont.items[0].n, 5);
});
test('replaying an operation returns the durable receipt; changing its target cannot reuse it', async () => {
  const g = await makeGrave(); const p = await pre(A, g), first = await claim(A, g, OP, p);
  const repeat = await claim(A, g, OP, p);
  assert.equal(repeat.repeated, true); assert.deepEqual(repeat.receipt, first.receipt);
  assert.equal((await farm(A)).data.cont.items[0].n, 5);
  await assert.rejects(() => claim(A, { ...g, id: ID }, OP, p), /Recibo usado/);
});
test('the same UUID is scoped to its authenticated actor rather than being a global transfer token', async () => {
  const g = await makeGrave(); await reconcile(A, g, OP);
  const r = await claim(B, g, OP);
  assert.equal(r.cancelado, false); assert.equal((await farm(B)).data.cont.items[0].n, 5);
  assert.equal((await farm(A)).data.cont.items.length, 0);
});
test('cancellation seals a missing operation so a late request cannot collect', async () => {
  const g = await makeGrave(); const p = await pre(A, g);
  assert.equal((await reconcile(A, g)).cancelado, true);
  const late = await claim(A, g, OP, p);
  assert.equal(late.cancelado, true); assert.equal((await farm(A)).data.cont.items.length, 0);
  assert.equal((await graveRow(g.id)).items[0].n, 5);
});
test('reconciliation remains available after the feature is switched off', async () => {
  const g = await makeGrave(); await claim(A, g); await config(false, false);
  const r = await reconcile(A, g); assert.equal(r.cancelado, false); assert.equal(r.data.cont.items[0].n, 5);
});
test('a prepared request expires before commit according to wall clock and delivers nothing', async () => {
  const g = await makeGrave(); const p = await pre(A, g);
  await admin(); await db.query("UPDATE golden_internal.player_graves SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1", [g.id]);
  await assert.rejects(() => claim(A, g, OP, p), /venció/);
  assert.equal((await farm(A)).data.cont.items.length, 0);
});
test('partial fit preserves exact leftovers and permits another claimant to take only what remains', async () => {
  const items = [leaf('madera', 5), leaf('piedra', 8)], g = await makeGrave(items);
  await admin(); const actor = await farm(A);
  actor.data.cont = { c: 'bag', items: Array.from({ length: 7 }, (_, i) => leaf('fill-' + i)) };
  await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1', [A, JSON.stringify(actor.data)]);
  await claim(A, g);
  const partial = await graveRow(g.id); assert.deepEqual(partial.items, [items[1],leaf('backpack',1,'cont')]); assert.equal(partial.revision, 2);
  await claim(B, partial, OP2);
  assert.equal((await farm(A)).data.cont.items.at(-1).n, 5);
  assert.deepEqual((await farm(B)).data.cont.items, [items[1],leaf('backpack',1,'cont')]);
  assert.equal((await farm(OWNER)).data.tumba, null);
});
test('a full or missing container returns a receipt without changing farm versions or grave revision', async () => {
  for (const cont of [null, { c: 'bag', items: Array.from({ length: 8 }, (_, i) => leaf('fill-' + i)) }]) {
    const g = await makeGrave(); const f = await farm(A);
    f.data.cont = cont;
    await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1', [A, JSON.stringify(f.data)]);
    const beforeActor = await farm(A), beforeOwner = await farm(OWNER);
    await claim(A, g, cont === null ? OP : OP2);
    assert.equal((await farm(A)).base, beforeActor.base); assert.equal((await farm(OWNER)).base, beforeOwner.base);
    const after = await graveRow(g.id); assert.equal(after.revision, g.revision); assert.deepEqual(after.items, g.items);
  }
});
test('canonical weapon runes/durability and armour pieces/durability survive SQL conservation checks', async () => {
  const items = [leaf('espada_bronce', 1, 'arm', { w: { dur: 12, plus: 4, runas: { fuego: 2 } } }),
    leaf('fibra', 1, 'armorset', { piezas: ['casco', 'botas'], dur: { casco: 11, botas: 27 } })];
  const g = await makeGrave(items); await claim(A, g);
  assert.deepEqual((await farm(A)).data.cont.items, [...items,leaf('backpack',1,'cont')]);
});
test('an accepted far-away or different-zone journey is denied without returning a private loot plan', async () => {
  const g = await makeGrave(); const f = await farm(A);
  for (const pos of [{ zona: 'pantano', x: 600, y: 600 }, { zona: 'guarida', x: 100, y: 100 }]) {
    f.data.zonaViaje.pos = pos;
    await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1', [A, JSON.stringify(f.data)]);
    await assert.rejects(() => pre(A, g), /Acercate/);
    await admin();
  }
});
test('claim cannot create item value or change the container type or existing weapon metadata', async () => {
  const g = await makeGrave(); const p = await pre(A, g);
  await assert.rejects(() => claim(A, g, OP, p, { cont: { c: 'backpack', items: [leaf('golden', 999)] }, remaining: [] }), /conserva/);
  await assert.rejects(() => claim(A, g, OP2, p, { cont: { c: 'bag', items: [leaf('madera', 5)] }, remaining: [] }), /contenedor/);
  assert.equal((await farm(A)).data.cont.items.length, 0);
});
test('own grave uses the same transaction and one farm row; repeated operation does not duplicate', async () => {
  const g = await makeGrave(); await admin();
  const owner=await farm(OWNER);owner.data.cont={c:'backpack',items:[]};owner.data.zonaViaje={t:Date.now(),pos:{zona:'pantano',x:100,y:100}};await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp()WHERE user_id=$1',[OWNER,JSON.stringify(owner.data)]);
  const p = await pre(OWNER, g); await claim(OWNER, g, OP, p); await claim(OWNER, g, OP, p);
  const f = await farm(OWNER); assert.equal(f.data.tumba, null); assert.equal(f.data.cont.items[0].n, 5);
});
test('stale owner CAS after a foreign claim cannot overwrite theft or unrelated progress', async () => {
  const g = await makeGrave(); const before = await farm(OWNER); await claim(A, g); await admin();
  const result = await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1 AND updated_at=$3 RETURNING user_id', [OWNER, JSON.stringify(before.data), before.base]);
  assert.equal(result.rows.length, 0); assert.equal((await farm(OWNER)).data.tumba, null);
});
test('a later ordinary write cannot restore the identical claimed grave source', async () => {
  const g = await makeGrave(); const before = await farm(OWNER); await claim(A, g); await admin();
  await assert.rejects(() => db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1', [OWNER, JSON.stringify(before.data)]), /operación confirmada/);
  assert.equal((await farm(OWNER)).data.tumba, null);
});
test('reconciliation flags newer unrelated claimant progress rather than presenting an old ACK as current', async () => {
  const g = await makeGrave(); await claim(A, g); const f = await farm(A);
  f.data.latestAction = 'newer action after claim';
  await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp() WHERE user_id=$1', [A, JSON.stringify(f.data)]);
  const r = await reconcile(A, g); assert.equal(r.conflicto, true);
  assert.equal((await farm(A)).data.latestAction, 'newer action after claim');
});
test('legacy raw snapshots stay private and cannot become a new shared source',async()=>{
 const f=await farm(OWNER);f.data.tumba={zona:'pantano',x:100,y:100,hasta:Date.now()+300000,items:[leaf('madera',5)]};
 await db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp()WHERE user_id=$1',[OWNER,JSON.stringify(f.data)]);
 assert.equal((await scalar('SELECT count(*)::int n FROM golden_internal.player_graves')).n,0);
});
test('changing the deadline cannot recreate a claimed source for an enrolled owner',async()=>{
 const g=await makeGrave(),old=await farm(OWNER);await claim(A,g);const owner=await farm(OWNER);
 owner.data.tumba={...old.data.tumba,hasta:old.data.tumba.hasta+1000};
 await assert.rejects(()=>db.query('UPDATE public.farms SET data=$2,updated_at=clock_timestamp()WHERE user_id=$1 AND updated_at=$3',[OWNER,JSON.stringify(owner.data),owner.base]),/operación confirmada/);
 assert.equal((await farm(OWNER)).data.tumba,null);
});
test('public markers contain no private owner UID, inventory or snapshot', async () => {
  const g = await makeGrave(); await service();
  const status = (await scalar('SELECT public.gf_graves_status($1::uuid,$2::text) AS v', [A, 'pantano'])).v;
  assert.equal(status.markers.length, 1); assert.equal(status.markers[0].id, g.id);
  const text = JSON.stringify(status); for (const secret of [OWNER, 'items', 'madera', 'latestAction']) assert.equal(text.includes(secret), false);
});
