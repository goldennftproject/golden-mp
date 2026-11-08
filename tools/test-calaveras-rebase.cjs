const assert = require('node:assert/strict');
const { test } = require('node:test');
const { prepare, sameVersion } = require('../public/game/grave-rebase.js');
const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ID = '33333333-3333-4333-8333-333333333333';
const OP = '44444444-4444-4444-8444-444444444444';
const BASE = '2026-11-08T23:00:00.123456+00:00', ACCEPTED = '2026-11-08T23:00:00.223456+00:00';
const END1 = '2026-11-08T23:00:01.123456+00:00', END2 = '2026-11-08T23:00:02.123456+00:00';
const NOW = Date.parse('2026-11-08T23:00:03Z'), HASH = 'a'.repeat(32);
const copy = v => JSON.parse(JSON.stringify(v));
function fixture(acceptedOwn = false) {
  const before = { id: ID, revision: 1, zona: 'pantano', x: 100, y: 100, hasta: NOW + 60000,
    items: [{ kind: 'res', k: 'madera', n: 5 }, { kind: 'res', k: 'piedra', n: 8 }] };
  const after = { ...copy(before), revision: 2, items: [copy(before.items[1])] };
  const data = { level: 8, hp: 50, res: { madera: 40 }, quests: { active: 'establo', progress: 2 },
    cont: { c: 'bag', items: [{ kind: 'res', k: 'carne', n: 2 }] }, weapons: { sword: { dur: 30, plus: 2 } }, tumba: before };
  const pending = { uid: UID, body: { op: OP, base: BASE, name: 'Actor A', data: copy(data) }, key: 'original-key' };
  const live = copy(data); live.res.madera = 47; live.quests.progress = 4; live.hp = 45; live.weapons.sword.dur = 27;
  live.cont.items.push({ kind: 'res', k: 'fish', n: 1 });
  const proof = { ok: true, proofType: 'foreign_grave_claim_chain_v1', uid: UID, op: OP, requestedBase: BASE,
    acceptedOwn, fromBase: acceptedOwn ? ACCEPTED : BASE, currentBase: END1, currentName: 'Actor A',
    currentData: { ...copy(data), _saveOp: acceptedOwn ? OP : 'previous-op', tumba: copy(after) },
    nonGraveHashCurrent: HASH, serverNow: '2026-11-08T23:00:03Z', validUntil: '2026-11-08T23:00:33Z',
    events: [{ eventId: 20, kind: 'claimed', foreign: true, graveId: ID, fromRevision: 1, toRevision: 2,
      baseBefore: acceptedOwn ? ACCEPTED : BASE, baseAfter: END1, graveBefore: copy(before), graveAfter: copy(after),
      nonGraveHashBefore: HASH, nonGraveHashAfter: HASH }] };
  return { uid: UID, currentUid: UID, liveBase: BASE, pending, live, proof, now: NOW,
    verifyAcceptedSnapshot(p, row) { return row.name === p.body.name && row.data._saveOp === OP && JSON.stringify(row.data.tumba) === JSON.stringify(p.body.data.tumba); } };
}
function deny(change, expected) { const f = fixture(); change(f); const r = prepare(f); assert.equal(r.ok, false); if (expected) assert.equal(r.reason, expected); }
test('rejected-CAS rebase patches only the grave while preserving later resources, quests, health, equipment and loot', () => {
  const f = fixture(), before = copy(f), r = prepare(f);
  assert.equal(r.ok, true); assert.equal(r.mode, 'retryNew'); assert.equal(r.base, END1); assert.equal(r.oldOp, OP);
  assert.deepEqual(r.liveSnapshot.res, f.live.res); assert.deepEqual(r.liveSnapshot.quests, f.live.quests);
  assert.deepEqual(r.liveSnapshot.cont, f.live.cont); assert.deepEqual(r.liveSnapshot.weapons, f.live.weapons); assert.equal(r.liveSnapshot.hp, 45);
  assert.deepEqual(r.liveSnapshot.tumba, f.proof.currentData.tumba);
  assert.deepEqual(copy(f), before); assert.equal(f.pending.body.op, OP);
  r.liveSnapshot.quests.progress = 999; assert.equal(f.live.quests.progress, 4);
});
test('lost own ACK is recognized only by full accepted-snapshot callback and returns a grave-patched ACK snapshot', () => {
  const f = fixture(true); let calls = 0;
  f.verifyAcceptedSnapshot = (pending, row) => {
    calls++; assert.equal(row.updated_at, ACCEPTED); assert.equal(row.name, pending.body.name);
    assert.deepEqual(row.data.tumba, pending.body.data.tumba);
    assert.equal(row.data._saveOp, pending.body.op); return true;
  };
  const r = prepare(f); assert.equal(r.ok, true); assert.equal(r.mode, 'ackOwn'); assert.equal(calls, 1);
  assert.equal(r.acknowledgedSnapshot.res.madera, 40); assert.equal(r.liveSnapshot.res.madera, 47);
  assert.deepEqual(r.acknowledgedSnapshot.tumba, r.liveSnapshot.tumba);
});
test('lost own ACK without callback or with an unrelated accepted snapshot is rejected', () => {
  for (const verify of [undefined, () => false]) { const f = fixture(true); f.verifyAcceptedSnapshot = verify; assert.equal(prepare(f).ok, false); }
});
test('two foreign claims require an unbroken timestamp, grave and revision chain', () => {
  const f = fixture(), first = f.proof.events[0];
  f.proof.events.push({ ...copy(first), eventId: 21, fromRevision: 2, toRevision: 3, baseBefore: END1, baseAfter: END2,
    graveBefore: copy(first.graveAfter), graveAfter: null });
  f.proof.currentBase = END2; f.proof.currentData.tumba = null;
  const r = prepare(f); assert.equal(r.ok, true); assert.equal(r.liveSnapshot.tumba, null); assert.equal(r.liveSnapshot.quests.progress, 4);
  f.proof.events[1].baseBefore = '2026-11-08T23:00:01.123457+00:00'; assert.equal(prepare(f).ok, false);
});
test('legacy local pickup or another local death cannot be inferred or silently repaired', () => {
  deny(f => { f.live.tumba = null; f.live.cont.items.push({ kind: 'res', k: 'madera', n: 5 }); }, 'local_grave_changed');
  deny(f => { f.live.tumba.hasta++; }, 'local_grave_changed');
  deny(f => { f.live.tumba.items[0].n--; }, 'local_grave_changed');
});
test('a changed account, pending base or operation cannot consume a proof from another attempt', () => {
  deny(f => { f.currentUid = OTHER; }); deny(f => { f.pending.uid = OTHER; });
  deny(f => { f.proof.op = OTHER; }); deny(f => { f.proof.uid = OTHER; });
  deny(f => { f.liveBase = END1; }); deny(f => { f.proof.requestedBase = END1; });
});
test('expired, future-dated or unbounded proofs fail closed', () => {
  deny(f => { f.now += 30000; }, 'expired_proof');
  deny(f => { f.now += 30001; }, 'expired_proof');
  deny(f => { f.now -= 6000; }, 'expired_proof');
  deny(f => { f.proof.validUntil = '2026-11-08T23:10:33Z'; }, 'expired_proof');
});
test('an accepted request for a different farm display name is not recognized as the lost ACK', () => {
  const f = fixture(true); f.proof.currentName = 'Renamed'; assert.equal(prepare(f).ok, false);
});
test('remote non-grave changes, self-claims and incomplete histories are rejected', () => {
  deny(f => { f.proof.events[0].nonGraveHashAfter = 'b'.repeat(32); });
  deny(f => { f.proof.nonGraveHashCurrent = 'b'.repeat(32); });
  deny(f => { f.proof.events[0].foreign = false; });
  deny(f => { f.proof.events[0].kind = 'registered'; });
  deny(f => { f.proof.events = []; });
});
test('a changed grave identity, unearned item, revision or metadata cannot be patched in', () => {
  for (const mutate of [g => { g.x++; }, g => { g.id = OTHER; }, g => { g.revision++; }, g => { g.items[0].n++; }]) {
    deny(f => { mutate(f.proof.events[0].graveAfter); f.proof.currentData.tumba = copy(f.proof.events[0].graveAfter); });
  }
});
test('an unresolved or inconsistent old-save disposition is rejected', () => {
  deny(f => { f.proof.currentData._saveOp = OP; }, 'uncertain_old_operation');
  const f = fixture(true); f.proof.currentData._saveOp = 'other'; assert.equal(prepare(f).ok, false);
});
test('timestamps retain PostgreSQL microseconds while normalizing timezone offsets', () => {
  assert.equal(sameVersion(BASE, '2026-11-08 20:00:00.123456-03'), true);
  assert.equal(sameVersion(BASE, '2026-11-08T23:00:00.123457Z'), false);
  assert.equal(sameVersion('bad', 'bad'), false);
});
