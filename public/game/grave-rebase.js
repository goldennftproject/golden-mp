/* Pure, fail-closed verification of an authenticated foreign-grave delta proof.
   No fetch, storage, mutation, hydration, timers or retry occurs in this module. */
(function () {
  'use strict';
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const copy = value => JSON.parse(JSON.stringify(value));
  const sorted = value => Array.isArray(value) ? value.map(sorted) : object(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
  const equal = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
  const withoutGrave = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'tumba'));
  const graveIdentity = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'items' && key !== 'revision'));
  function isRemaining(before, after) {
    const pool = before.map(value => JSON.stringify(sorted(value)));
    for (const value of after) { const i = pool.indexOf(JSON.stringify(sorted(value))); if (i < 0) return false; pool.splice(i, 1); }
    return true;
  }
  // Date.parse alone collapses different PostgreSQL CAS versions within one millisecond.
  function version(value) {
    if (typeof value !== 'string') return null;
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::?\d{2})?)$/.exec(value);
    if (!m) return null;
    let zone = m[4]; if (/^[+-]\d{2}$/.test(zone)) zone += ':00';
    const seconds = Date.parse(m[1] + 'T' + m[2] + zone);
    if (!Number.isFinite(seconds)) return null;
    return BigInt(seconds) * 1000n + BigInt((m[3] || '').padEnd(6, '0'));
  }
  const sameVersion = (a, b) => version(a) !== null && version(a) === version(b);
  function prepare(input) {
    const no = reason => ({ ok: false, reason });
    try {
      const { uid, currentUid, pending, live, liveBase, proof } = input || {};
      const now = Number(input && input.now);
      if (!uuid(uid) || currentUid !== uid || !object(pending) || pending.uid !== uid || !object(pending.body) || !object(pending.body.data) || !object(live)) return no('account_or_pending_changed');
      if (typeof pending.body.op !== 'string' || !/^[a-zA-Z0-9._-]{8,100}$/.test(pending.body.op) || !sameVersion(liveBase, pending.body.base)) return no('pending_base_changed');
      if (!object(proof) || proof.ok !== true || proof.proofType !== 'foreign_grave_claim_chain_v1' || proof.uid !== uid || proof.op !== pending.body.op || !sameVersion(proof.requestedBase, pending.body.base)) return no('unbound_proof');
      const serverNow = version(proof.serverNow), validUntil = version(proof.validUntil);
      if (!Number.isFinite(now) || serverNow === null || validUntil === null || validUntil <= serverNow || validUntil - serverNow > 30000000n || BigInt(Math.trunc(now)) * 1000n >= validUntil || BigInt(Math.trunc(now)) * 1000n + 5000000n < serverNow) return no('expired_proof');
      if (!object(pending.body.data.tumba) || !Array.isArray(pending.body.data.tumba.items) || !pending.body.data.tumba.items.length || !equal(live.tumba, pending.body.data.tumba)) return no('local_grave_changed');
      if (!Array.isArray(proof.events) || !proof.events.length || proof.events.length > 50 || !object(proof.currentData) || typeof proof.currentName !== 'string') return no('incomplete_chain');
      const first = proof.events[0], last = proof.events[proof.events.length - 1];
      if (!equal(first.graveBefore, pending.body.data.tumba) || !equal(last.graveAfter, proof.currentData.tumba)) return no('grave_anchor_mismatch');
      const currentVersion = version(proof.currentBase), anchorVersion = version(first.baseBefore), pendingVersion = version(pending.body.base);
      if (currentVersion === null || anchorVersion === null || pendingVersion === null || currentVersion <= anchorVersion || !sameVersion(proof.fromBase, first.baseBefore) || !sameVersion(last.baseAfter, proof.currentBase)) return no('version_anchor_mismatch');
      const acceptedOwn = proof.acceptedOwn === true;
      if (acceptedOwn ? (proof.currentData._saveOp !== pending.body.op || anchorVersion <= pendingVersion) : (proof.currentData._saveOp === pending.body.op || anchorVersion !== pendingVersion)) return no('uncertain_old_operation');
      const hash = first.nonGraveHashBefore;
      if (typeof hash !== 'string' || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/i.test(hash) || hash !== proof.nonGraveHashCurrent) return no('non_grave_change');
      let base = first.baseBefore, grave = first.graveBefore, previousId = -1, previousRevision = null;
      for (const event of proof.events) {
        if (!object(event) || event.foreign !== true || event.kind !== 'claimed' || !uuid(event.graveId) || event.graveId !== first.graveId || !Number.isSafeInteger(event.eventId) || event.eventId <= previousId || !Number.isSafeInteger(event.fromRevision) || !Number.isSafeInteger(event.toRevision) || event.toRevision !== event.fromRevision + 1) return no('non_foreign_or_bad_event');
        if (previousRevision !== null && event.fromRevision !== previousRevision) return no('revision_gap');
        if (!sameVersion(event.baseBefore, base) || version(event.baseAfter) === null || version(event.baseAfter) <= version(event.baseBefore) || !equal(event.graveBefore, grave)) return no('chain_gap');
        if (event.nonGraveHashBefore !== hash || event.nonGraveHashAfter !== hash) return no('non_grave_change');
        if (event.graveAfter !== null && (!object(event.graveAfter) || !Array.isArray(event.graveAfter.items))) return no('bad_grave_after');
        if (!object(event.graveBefore) || event.graveBefore.id !== event.graveId || event.graveBefore.revision !== event.fromRevision || !Array.isArray(event.graveBefore.items) ||
          (event.graveAfter !== null && (event.graveAfter.id !== event.graveId || event.graveAfter.revision !== event.toRevision || !equal(graveIdentity(event.graveBefore), graveIdentity(event.graveAfter)) || !isRemaining(event.graveBefore.items, event.graveAfter.items)))) return no('grave_identity_changed');
        base = event.baseAfter; grave = event.graveAfter; previousId = event.eventId; previousRevision = event.toRevision;
      }
      const reconstructed = { name: proof.currentName, updated_at: first.baseBefore,
        data: { ...copy(proof.currentData), tumba: copy(first.graveBefore) } };
      if (acceptedOwn && (proof.currentName !== pending.body.name || typeof input.verifyAcceptedSnapshot !== 'function' || input.verifyAcceptedSnapshot(pending, reconstructed) !== true)) return no('accepted_snapshot_not_proven');
      // The server proof establishes that ONLY tumba changed remotely. Local later
      // actions in every other field are deliberately retained, including cont.
      const liveSnapshot = { ...copy(live), tumba: copy(grave) };
      if (!equal(withoutGrave(liveSnapshot), withoutGrave(live))) return no('local_non_grave_changed');
      const result = { ok: true, mode: acceptedOwn ? 'ackOwn' : 'retryNew', base: proof.currentBase,
        grave: copy(grave), liveSnapshot, oldOp: pending.body.op };
      if (acceptedOwn) result.acknowledgedSnapshot = { ...copy(pending.body.data), tumba: copy(grave) };
      return result;
    } catch { return no('invalid_proof'); }
  }
  const api = { prepare, version, sameVersion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GoldenGraveRebase = api;
})();
