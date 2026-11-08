// Pure dependency-injected Edge tests. No imports from network and no real Auth/DB.
import { createHandler } from '../supabase/functions/calaveras/handler.ts';
import { planSharedGraveClaim } from '../supabase/functions/calaveras/claim-plan.mjs';
const ACTOR = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const GRAVE = '33333333-3333-4333-8333-333333333333';
const OP = '44444444-4444-4444-8444-444444444444';
const BASE = '2026-11-08T23:00:00.123456+00:00';
const copy = (v: any) => JSON.parse(JSON.stringify(v));
function equal(actual: unknown, expected: unknown, label = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(label + ': ' + JSON.stringify(actual) + ' !== ' + JSON.stringify(expected));
}
function assert(value: unknown, label = 'assertion failed') { if (!value) throw new Error(label); }
function fixture(overrides: Record<string, any> = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const accepted = { actor: { data: { cont: { c: 'bag', items: [{ kind: 'res', k: 'madera', n: 2 }] } }, updated_at: BASE },
    grave: { revision: 2, items: [{ kind: 'res', k: 'madera', n: 5 }] }, ownerBase: '2026-11-08T22:59:00.456789+00:00', ok: true };
  let planned: any = null;
  let deathPlanned: any = null;
  const handler = createHandler({
    authenticate: async (jwt: string) => overrides.user === undefined ? jwt === 'valid-session' ? { id: ACTOR } : null : overrides.user,
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (overrides.rpc) return overrides.rpc(name, args, accepted);
      if (name === 'gf_graves_claim_snapshot') return { data: accepted, error: null };
      if (name === 'gf_graves_deposit_snapshot') return { data: { ok: true, actor: { updated_at: BASE, data: { hp: 0, cont: accepted.actor.data.cont, gear: { arma: 'espada_bronce' } } } }, error: null };
      if (name === 'gf_graves_deposit_commit' || name === 'gf_graves_deposit_reconcile') return { data: { ok: true, data: { hp: 50, cont: null, tumba: null }, updated_at: BASE,
        receipt: { op: OP, action: 'morir', graveId: null, cancelado: false, actorBaseBefore: BASE, actorBaseAfter: BASE } }, error: null };
      if (name === 'gf_graves_status') return { data: { ok: true, enabled: false, serverNow: BASE, ownGraveId: GRAVE, markers: [] }, error: null };
      return { data: { ok: true, receipt: OP, updated_at: BASE, data: { privateForActorOnly: true } }, error: null };
    },
    planClaim: (cont: any, items: any[]) => { planned = copy({ cont, items }); return planSharedGraveClaim(cont, items); },
    planDeath: overrides.planDeath === undefined ? (data: any) => { deathPlanned = copy(data); return { breakSlots: ['pecho'], dropSlots: ['arma'] }; } : overrides.planDeath,
  });
  return { handler, calls, accepted, planned: () => planned, deathPlanned: () => deathPlanned };
}
function request(body: any, token = 'valid-session', origin: string | null = 'https://goldenfarm.onrender.com') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (origin) headers.Origin = origin;
  return new Request('https://local.invalid/calaveras', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
const claim = { accion: 'recoger', cuenta: ACTOR, id: GRAVE, op: OP, revision: 2, base: BASE };

Deno.test('missing/invalid Auth and body UID mismatch cannot reach any RPC', async () => {
  for (const [body, token, status] of [[claim, '', 401], [claim, 'expired', 401], [{ ...claim, cuenta: OTHER }, 'valid-session', 409]] as const) {
    const f = fixture(); const response = await f.handler(request(body, token));
    equal(response.status, status); equal(f.calls.length, 0);
  }
});
Deno.test('cross-origin requests and unsupported methods fail before Auth/RPC', async () => {
  const f = fixture();
  equal((await f.handler(request(claim, 'valid-session', 'https://attacker.invalid'))).status, 403);
  equal((await f.handler(new Request('https://local.invalid/calaveras'))).status, 405);
  equal(f.calls.length, 0);
});
Deno.test('invalid JSON, oversized request, invalid UUID and revision fail without DB access', async () => {
  const cases = ['{', 'x'.repeat(3073), { ...claim, id: '../farms' }, { ...claim, op: 'reused-unscoped-name' },
    { ...claim, revision: -1 }, { ...claim, revision: 1.5 }, { ...claim, base: 'bad-date' }];
  for (const body of cases) {
    const f = fixture(); const r = await f.handler(request(body));
    assert(r.status === 400 || r.status === 413); equal(f.calls.length, 0);
  }
});
Deno.test('public status strips private owner UID, items, farm snapshot and operation details', async () => {
  const f = fixture({ rpc: () => ({ error: null, data: { ok: true, enabled: true, serverNow: BASE, ownGraveId: GRAVE,
    private: 'secret-root', markers: [{ id: GRAVE, nombre: 'Not', zona: 'pantano', x: 10, y: 20, expiresAt: BASE,
      revision: 2, isMine: false, ownerUid: OTHER, email: 'private@example.invalid', items: [{ k: 'oro', n: 999 }], data: { jwt: 'never-send' } }] } }) });
  const r = await f.handler(request({ accion: 'estado', cuenta: ACTOR, zona: 'pantano' }));
  equal(r.status, 200); equal(r.headers.get('Cache-Control'), 'no-store');
  const text = await r.text();
  for (const secret of ['secret-root', OTHER, 'private@example.invalid', 'never-send', 'items', 'oro']) assert(!text.includes(secret), 'leaked ' + secret);
  equal(f.calls[0].args, { p_uid: ACTOR, p_zone: 'pantano' });
});
Deno.test('claim planning uses canonical RPC contents and exact PostgreSQL CAS, ignoring client loot and owner', async () => {
  const f = fixture(); const before = copy(f.accepted);
  const r = await f.handler(request({ ...claim, p_uid: OTHER, ownerUid: OTHER, items: [{ kind: 'res', k: 'golden', n: 999999 }], cont: { c: 'backpack', items: [] }, ownerBase: 'forged' }));
  equal(r.status, 200);
  equal(f.planned(), { cont: before.actor.data.cont, items: before.grave.items });
  const call = f.calls[1]; equal(call.name, 'gf_graves_claim');
  equal(call.args.p_uid, ACTOR); equal(call.args.p_base, BASE);
  equal(call.args.p_owner_base, before.ownerBase); equal(call.args.p_revision, 2);
  equal((call.args.p_cont as any).items[0].n, 7);
  equal(f.accepted, before);
});
Deno.test('malformed canonical snapshot, different actor version or revision cannot reach commit', async () => {
  for (const change of [(p: any) => { p.actor.updated_at = 'different'; }, (p: any) => { p.grave.revision++; },
    (p: any) => { delete p.grave.items; }, (p: any) => { p.actor.data = null; }]) {
    const f = fixture({ rpc: (_name: string, _args: any, p: any) => { change(p); return { error: null, data: p }; } });
    const r = await f.handler(request(claim)); equal(r.status, 503);
    equal(f.calls.length, 1); equal(f.planned(), null);
  }
});
Deno.test('reconciliation binds UUID/target/revision to authenticated actor and does not run a new plan', async () => {
  const f = fixture(); const r = await f.handler(request({ ...claim, accion: 'comprobar', p_uid: OTHER }));
  equal(r.status, 200); equal(f.planned(), null);
  equal(f.calls, [{ name: 'gf_graves_reconcile', args: { p_uid: ACTOR, p_id: GRAVE, p_op: OP, p_revision: 2 } }]);
});
Deno.test('unknown DB exceptions never return private SQL, keys or farm data', async () => {
  const secret = 'service_role=SECRET; farm email=private@example.invalid';
  const f = fixture({ rpc: () => ({ data: null, error: { code: 'XX000', message: secret } }) });
  const r = await f.handler(request(claim)); equal(r.status, 503);
  assert(!(await r.text()).includes(secret));
});
Deno.test('safe server conflict is reported as conflict and never credited optimistically', async () => {
  const f = fixture({ rpc: () => ({ data: null, error: { code: 'P0001', message: 'conflicto: versión desactualizada' } }) });
  const r = await f.handler(request(claim)); equal(r.status, 409);
  const body = await r.json(); equal(body.conflicto, true); equal(f.planned(), null); equal(f.calls.length, 1);
});
Deno.test('death plans only from canonical actor data and ignores client loot/drop plans/owner UID', async () => {
  const f = fixture();
  const r = await f.handler(request({ accion: 'morir', cuenta: ACTOR, op: OP, base: BASE, ownerUid: OTHER,
    items: [{ kind: 'res', k: 'golden', n: 999999 }], plan: { dropSlots: ['set'], breakSlots: [] }, cont: { c: 'backpack', items: [] } }));
  equal(r.status, 200); const ack = await r.json(); equal(ack.receipt.graveId, null); equal(ack.receipt.action, 'morir');
  equal(f.deathPlanned().hp, 0); equal(f.deathPlanned().cont, f.accepted.actor.data.cont);
  equal(f.calls[0], { name: 'gf_graves_deposit_snapshot', args: { p_uid: ACTOR, p_base: BASE } });
  equal(f.calls[1], { name: 'gf_graves_deposit_commit', args: { p_uid: ACTOR, p_op: OP, p_base: BASE, p_plan: { breakSlots: ['pecho'], dropSlots: ['arma'] } } });
});
Deno.test('death reconciliation requires no grave ID and binds only authenticated actor and original operation', async () => {
  const f = fixture();
  const r = await f.handler(request({ accion: 'comprobar', tipo: 'morir', cuenta: ACTOR, op: OP, p_uid: OTHER }));
  equal(r.status, 200); equal(f.deathPlanned(), null); equal(f.planned(), null);
  equal(f.calls, [{ name: 'gf_graves_deposit_reconcile', args: { p_uid: ACTOR, p_op: OP } }]);
});
Deno.test('malformed death nonce/base and unknown reconciliation action never reach a mutation', async () => {
  for (const body of [{ accion: 'morir', cuenta: ACTOR, op: 'bad', base: BASE }, { accion: 'morir', cuenta: ACTOR, op: OP, base: 'bad' },
    { accion: 'comprobar', tipo: 'unknown', cuenta: ACTOR, op: OP }, { accion: 'comprobar', tipo: 'recoger', cuenta: ACTOR, op: OP }]) {
    const f = fixture(); equal((await f.handler(request(body))).status, 400); equal(f.calls.length, 0);
  }
});
Deno.test('invalid server-generated death slot plans are rejected before commit', async () => {
  for (const plan of [{ dropSlots: ['arma', 'arma'] }, { dropSlots: ['not-a-slot'] }, { dropSlots: [], breakSlots: ['pecho', 'pecho'] },
    { dropSlots: [], breakSlots: ['not-an-armour-piece'] }]) {
    const f = fixture({ planDeath: () => plan });
    const r = await f.handler(request({ accion: 'morir', cuenta: ACTOR, op: OP, base: BASE }));
    equal(r.status, 503); equal(f.calls.length, 1); equal(f.calls[0].name, 'gf_graves_deposit_snapshot');
  }
});
Deno.test('canonical death snapshot with a changed CAS is not planned or committed', async () => {
  const f = fixture({ rpc: () => ({ error: null, data: { ok: true, actor: { data: { hp: 0 }, updated_at: '2026-11-08T23:00:01Z' } } }) });
  equal((await f.handler(request({ accion: 'morir', cuenta: ACTOR, op: OP, base: BASE }))).status, 503);
  equal(f.deathPlanned(), null); equal(f.calls.length, 1);
});
Deno.test('death ACK keeps only canonical receipt fields and exposes no internal operation bookkeeping', async () => {
  const f = fixture({ rpc: (name: string) => name === 'gf_graves_deposit_reconcile'
    ? { error: null, data: { ok: true, data: { hp: 50 }, updated_at: BASE, internalRoot: 'private-ledger', receipt: {
      op: OP, action: 'morir', graveId: null, cancelado: true, privateOwnerId: OTHER, rawPlan: { secret: true },
      summary: { pilas: 0 }, viajeResumen: { xp: 10 } } } } : { error: null, data: {} } });
  const r = await f.handler(request({ accion: 'comprobar', tipo: 'morir', cuenta: ACTOR, op: OP }));
  equal(r.status, 200); const text = await r.text();
  for (const secret of ['private-ledger', OTHER, 'rawPlan', 'privateOwnerId']) assert(!text.includes(secret), secret);
  assert(text.includes('viajeResumen')); assert(text.includes('summary'));
});
