/* Independent draft-protocol checks. No production connections or player files. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSharedGraveClaim } from '../supabase/functions/calaveras/claim-plan.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const leaf = (k, n = 1, kind = 'res', extra = {}) => ({ kind, k, n, ...extra });
function flatten(cont) {
  return cont ? cont.items.flatMap(item => item.c && item.items ? flatten(item) : [item]) : [];
}
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sorted(v)]));
  return value;
}
function conserved(entries) {
  const counts = {};
  for (const { n, ...item } of entries) {
    const key = JSON.stringify(sorted(item));
    counts[key] = (counts[key] || 0) + n;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
test('partial fit moves whole piles only; a repeat plan receives only canonical leftovers', () => {
  const carried = { c: 'bag', items: Array.from({ length: 7 }, (_, i) => leaf('already-' + i)) };
  const items = [leaf('madera', 5), leaf('piedra', 8)];
  const p = planSharedGraveClaim(carried, items);
  assert.deepEqual(p.moved, [items[0]]); assert.deepEqual(p.remaining, [items[1]]);
  assert.equal(p.reason, 'container_full');
  const again = planSharedGraveClaim(p.cont, p.remaining);
  assert.deepEqual(again.moved, []); assert.deepEqual(again.remaining, p.remaining);
  assert.deepEqual(carried.items, Array.from({ length: 7 }, (_, i) => leaf('already-' + i)));
});
test('stackable metadata is not erased or merged with different metadata', () => {
  const carried = { c: 'bag', items: [leaf('plata', 12, 'res', { source: 'one' })] };
  const p = planSharedGraveClaim(carried, [leaf('plata', 5, 'res', { source: 'two' })]);
  assert.equal(p.cont.items.length, 2);
  assert.equal(p.cont.items[0].n, 12); assert.equal(p.cont.items[1].n, 5);
});
test('identical weapon and armour entries stay separate objects and retain all metadata', () => {
  const w = { dur: 17, maxDur: 100, plus: 3, runas: { fuego: 2 } };
  const weapon = leaf('espada_bronce', 1, 'arm', { w });
  const armour = leaf('fibra', 1, 'armorset', { piezas: ['casco', 'botas'], dur: { casco: 11, botas: 9 } });
  const p = planSharedGraveClaim({ c: 'backpack', items: [weapon, armour] }, [weapon, armour]);
  assert.equal(p.cont.items.length, 4);
  assert.deepEqual(p.cont.items[2], weapon); assert.deepEqual(p.cont.items[3], armour);
  p.cont.items[2].w.runas.fuego = 99;
  assert.equal(w.runas.fuego, 2); assert.equal(p.cont.items[0].w.runas.fuego, 2);
});
test('capacity handles nested containers without silently adding a third level', () => {
  const full = Array.from({ length: 8 }, (_, i) => leaf('full-' + i));
  assert.throws(() => planSharedGraveClaim({ c: 'bag', items: [{ c: 'bag', items: [{ c: 'bag', items: [] }] }] }, []));
  const carried = { c: 'bag', items: [{ c: 'bag', items: [] }, ...full.slice(0, 7)] };
  const p = planSharedGraveClaim(carried, [leaf('madera', 5)]);
  assert.equal(p.cont.items.length, 8); assert.equal(p.cont.items[0].items[0].n, 5);
});
test('unknown container types including prototype keys are rejected', () => {
  for (const c of ['unknown', '__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.throws(() => planSharedGraveClaim({ c, items: [] }, [leaf('madera')]), 'type=' + c);
  }
});
test('malformed items, invalid quantities and special item keys are rejected', () => {
  for (const item of [leaf('madera', 0), leaf('madera', -1), leaf('madera', Infinity), leaf('madera', NaN),
    leaf('__proto__'), leaf('constructor'), leaf('prototype'), leaf('madera', 1, 'nonexistent')]) {
    assert.throws(() => planSharedGraveClaim({ c: 'bag', items: [] }, [item]));
  }
});
test('1000 generated plans conserve every item and metadata and never mutate input', () => {
  let seed = 731;
  const random = limit => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % limit; };
  for (let iteration = 0; iteration < 1000; iteration++) {
    const n = random(9), carried = { c: 'bag', items: Array.from({ length: n }, (_, i) => leaf('existing-' + i, random(10) + 1)) };
    const items = Array.from({ length: random(12) }, (_, i) => i % 3 === 0
      ? leaf('espada_bronce', 1, 'arm', { w: { dur: random(50) + 1, plus: random(5), runas: { fuego: random(3) } } })
      : leaf('res-' + random(4), random(30) + 1));
    const snapshot = copy({ carried, items });
    const result = planSharedGraveClaim(carried, items);
    assert.deepEqual(conserved([...flatten(carried), ...items]), conserved([...flatten(result.cont), ...result.remaining]));
    assert.deepEqual({ carried, items }, snapshot);
    assert.ok(result.cont.items.length <= 8);
  }
});
