/* Read-only proof RPC on synthetic event chains in PostgreSQL WASM memory. */
const fs = require('node:fs'), path = require('node:path');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const { prepare } = require('../public/game/grave-rebase.js');
const OWNER = '11111111-1111-4111-8111-111111111111', A = '22222222-2222-4222-8222-222222222222', B = '33333333-3333-4333-8333-333333333333';
const GRAVE = '44444444-4444-4444-8444-444444444444', OP = '55555555-5555-4555-8555-555555555555';
const BASE = '2026-11-08T23:00:00.123456Z', ACCEPTED = '2026-11-08T23:00:00.223456Z';
const MIDDLE = '2026-11-08T23:00:01.123456Z', LAST = '2026-11-08T23:00:02.123456Z';
const copy = value => JSON.parse(JSON.stringify(value));
let db;
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
before(async () => {
  db = new PGlite(); await db.waitReady;
  await db.exec(`CREATE ROLE service_role BYPASSRLS; CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    CREATE SCHEMA golden_internal; CREATE TABLE golden_internal.game_access(id boolean PRIMARY KEY,game_open boolean NOT NULL); INSERT INTO golden_internal.game_access VALUES(true,true);
    GRANT USAGE ON SCHEMA auth,public TO service_role,anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.role() TO service_role,anon,authenticated;
    CREATE TABLE public.farms(user_id uuid PRIMARY KEY REFERENCES auth.users(id),name text,data jsonb NOT NULL,updated_at timestamptz NOT NULL);
    GRANT SELECT,INSERT,UPDATE ON public.farms TO service_role;`);
  await db.exec(fs.readFileSync(path.join(path.resolve(__dirname,'..'),'supabase/migrations/20261108215902_calaveras_compartidas.sql'), 'utf8'));
  await db.exec('');
});
beforeEach(async () => {
  await db.exec('RESET ROLE; TRUNCATE golden_internal.grave_events,golden_internal.grave_receipts,golden_internal.player_graves,public.farms,auth.users RESTART IDENTITY CASCADE');
  for (const uid of [OWNER, A, B]) await db.query('INSERT INTO auth.users(id)VALUES($1)', [uid]);
});
after(async () => { if (db) await db.close(); });
async function chain(accepted = false) {
  const grave = { id: GRAVE, revision: 1, zona: 'pantano', x: 100, y: 100, hasta: Date.now() + 300000,
    items: [{ kind: 'res', k: 'madera', n: 5 }, { kind: 'res', k: 'piedra', n: 8 }] };
  const partial = { ...copy(grave), revision: 2, items: [copy(grave.items[1])] };
  const original = { level: 8, res: { madera: 40 }, quests: { active: 'establo', progress: 2 },
    cont: { c: 'bag', items: [{ kind: 'res', k: 'carne', n: 2 }] }, _saveOp: accepted ? OP : 'previous-op', tumba: grave };
  const partData = { ...copy(original), tumba: partial }, endData = { ...copy(original), tumba: null };
  await db.query('INSERT INTO public.farms(user_id,name,data,updated_at)VALUES($1,$2,$3,$4)', [OWNER, 'Actor A', JSON.stringify(endData), LAST]);
  for (const uid of [A, B]) await db.query('INSERT INTO public.farms(user_id,name,data,updated_at)VALUES($1,$2,$3,$4)', [uid, 'Other actor', JSON.stringify({ secretForOtherActor: true }), LAST]);
  await db.query("INSERT INTO golden_internal.player_graves(id,owner_id,owner_name,source_key,zona,x,y,expires_at,items,revision,status)VALUES($1,$2,'Actor A','source','pantano',100,100,clock_timestamp()+interval '5 minutes','[]',3,'claimed')", [GRAVE, OWNER]);
  for (const [actor, revision, from, to, bd, ad] of [[A, 1, accepted ? ACCEPTED : BASE, MIDDLE, original, partData], [B, 2, MIDDLE, LAST, partData, endData]]) {
    await db.query("INSERT INTO golden_internal.grave_events(grave_id,owner_id,actor_id,event,from_revision,to_revision,owner_base_before,owner_base_after,grave_before,grave_after,non_grave_hash_before,non_grave_hash_after,owner_save_op_before)VALUES($1,$2,$3,'claimed',$4,$5,$6,$7,$8,$9,golden_internal.grave_non_tumba_hash($10::jsonb),golden_internal.grave_non_tumba_hash($11::jsonb),$12)",
      [GRAVE, OWNER, actor, revision, revision + 1, from, to, JSON.stringify(bd.tumba), JSON.stringify(ad.tumba), JSON.stringify(bd), JSON.stringify(ad), bd._saveOp]);
  }
  const pending = { uid: OWNER, body: { name: 'Actor A', op: OP, base: BASE, data: copy(original) } };
  // The request may contain its previous _saveOp; the existing exact-content verifier ignores that derived field.
  pending.body.data._saveOp = 'previous-op';
  const live = copy(pending.body.data); live.res.madera = 47; live.quests.progress = 4;
  return { grave, original, endData, pending, live };
}
async function proof(f, uid = OWNER) {
  await db.exec("SET ROLE service_role; SELECT set_config('request.jwt.claim.role','service_role',false)");
  return (await one('SELECT public.gf_graves_save_proof($1::uuid,$2::text,$3::text,$4::jsonb)AS v', [uid, BASE, OP, JSON.stringify(f.grave)])).v;
}
function apply(f, p, verifier) {
  return prepare({ uid: OWNER, currentUid: OWNER, liveBase: BASE, pending: f.pending, live: f.live, proof: p,
    now: Date.parse(p.serverNow), verifyAcceptedSnapshot: verifier });
}
test('SQL proof plus pure module rebases two foreign claims without losing later local actions', async () => {
  const f = await chain(), p = await proof(f); assert.equal(p.ok, true); assert.equal(p.acceptedOwn, false); assert.equal(p.events.length, 2);
  const r = apply(f, p); assert.equal(r.ok, true); assert.equal(r.mode, 'retryNew'); assert.equal(r.liveSnapshot.tumba, null);
  assert.equal(r.liveSnapshot.res.madera, 47); assert.equal(r.liveSnapshot.quests.progress, 4);
  assert.equal(JSON.stringify(p).includes(A), false); assert.equal(JSON.stringify(p).includes(B), false);
});
test('lost accepted own ACK reconstructs the exact pre-theft snapshot for the existing verifier', async () => {
  const f = await chain(true), p = await proof(f); assert.equal(p.ok, true); assert.equal(p.acceptedOwn, true);
  const r = apply(f, p, (pending, row) => {
    const a = copy(pending.body.data), b = copy(row.data); delete a._saveOp; delete b._saveOp;
    assert.deepEqual(b, a); assert.equal(row.name, pending.body.name);
    assert.equal(Date.parse(row.updated_at), Date.parse(ACCEPTED)); return true;
  });
  assert.equal(r.ok, true); assert.equal(r.mode, 'ackOwn'); assert.equal(r.acknowledgedSnapshot.res.madera, 40);
  assert.equal(r.liveSnapshot.res.madera, 47);
});
test('an intervening non-grave remote write creates a version gap and yields no proof', async () => {
  const f = await chain(); await db.query("UPDATE public.farms SET updated_at=updated_at+interval '1 millisecond' WHERE user_id=$1", [OWNER]);
  assert.equal((await proof(f)).ok, false);
});
test('non-grave data drift even with a reused timestamp is not a valid proof', async () => {
  const f = await chain(); await db.query("UPDATE public.farms SET data=jsonb_set(data,'{res,madera}','999')WHERE user_id=$1", [OWNER]);
  assert.equal((await proof(f)).ok, false);
});
test('self-claim, unknown actor or missing private snapshot cannot be treated as a foreign delta', async () => {
  const f = await chain(); await db.query('UPDATE golden_internal.grave_events SET actor_id=$1 WHERE id=1', [OWNER]);
  assert.equal((await proof(f)).ok, false);
  await db.exec('RESET ROLE'); await db.query('UPDATE golden_internal.grave_events SET actor_id=NULL WHERE id=1'); assert.equal((await proof(f)).ok, false);
  await db.exec('RESET ROLE'); await db.query('UPDATE golden_internal.grave_events SET actor_id=$1,non_grave_hash_before=NULL WHERE id=1', [A]); assert.equal((await proof(f)).ok, false);
});
test('the proof binds exactly to the old grave and does not reveal another owner farm', async () => {
  const f = await chain(); assert.equal((await proof(f, A)).ok, false);
  f.grave.items[0].n++; assert.equal((await proof(f)).ok, false);
});
test('non-grave changes inside the event itself are rejected even if timestamps are contiguous', async () => {
  const f = await chain(); await db.query("UPDATE golden_internal.grave_events SET non_grave_hash_after=repeat('b',64) WHERE id=1");
  assert.equal((await proof(f)).ok, false);
});
test('anon and authenticated cannot directly request an owner proof', async () => {
  const f = await chain();
  for (const role of ['anon', 'authenticated']) {
    await db.exec('RESET ROLE; SET ROLE ' + role);
    await assert.rejects(() => db.query('SELECT public.gf_graves_save_proof($1,$2,$3,$4)', [OWNER, BASE, OP, JSON.stringify(f.grave)]), /permission denied/);
  }
});
