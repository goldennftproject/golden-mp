/* Reads only: execute the production helpers against a thenable Supabase query mock.
   Fixtures stay in memory; no Supabase endpoint, player account or timer polling. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('public/game/save.js', 'utf8');
const start = source.indexOf('async function mkLecturaMercado('), end = source.indexOf('async function mkPublish(', start);
assert(start >= 0 && end > start, 'production read helpers must exist');
const helpers = source.slice(start, end);
const normalize = value => JSON.parse(JSON.stringify(value));
const pause = () => new Promise(resolve => setImmediate(resolve));

function harness(rows = [], overrides = {}) {
  const calls = [], warnings = [], timers = new Map();
  let timerId = 0, timerStarts = 0, writes = 0, responder;
  const context = {
    UID: 'player-a', AbortController,
    console: { warn: (...parts) => warnings.push(parts) },
    setTimeout(fn, ms) { assert.equal(ms, 15000); timerStarts++; const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  function query() {
    const spec = { selected: null, eq: [], is: [], order: [], limit: null, range: null, signal: null };
    const q = {
      select(columns) { spec.selected = columns; return q; },
      eq(column, value) { spec.eq.push([column, value]); return q; },
      is(column, value) { spec.is.push([column, value]); return q; },
      order(column, options) { spec.order.push([column, options]); return q; },
      limit(n) { spec.limit = n; return q; },
      range(from, to) { spec.range = [from, to]; return q; },
      abortSignal(signal) { spec.signal = signal; return q; },
      then(resolve, reject) {
        calls.push(spec);
        return Promise.resolve().then(() => responder(spec, calls.length)).then(resolve, reject);
      },
    };
    for (const method of ['insert', 'update', 'upsert', 'delete', 'rpc']) q[method] = () => { writes++; throw Error('Unexpected write: ' + method); };
    return q;
  }
  const client = { from(table) { assert.equal(table, 'market'); return query(); }, rpc() { writes++; throw Error('Unexpected RPC'); } };
  responder = async spec => {
    assert.equal(spec.selected, '*');
    let selected = rows.filter(row => spec.eq.every(([key, value]) => row[key] === value) && spec.is.every(([key, value]) => row[key] === value));
    selected.sort((a, b) => {
      for (const [key, options] of spec.order) {
        if (a[key] === b[key]) continue;
        const sign = a[key] < b[key] ? -1 : 1;
        return options.ascending ? sign : -sign;
      }
      return 0;
    });
    if (spec.range) selected = selected.slice(spec.range[0], spec.range[1] + 1);
    if (spec.limit !== null) selected = selected.slice(0, spec.limit);
    return { data: selected, error: null };
  };
  context.sb = client;
  Object.assign(context, overrides);
  vm.createContext(context); vm.runInContext(helpers, context);
  return {
    context, calls, timers, warnings,
    respond(fn) { responder = fn; },
    expire() { for (const fn of [...timers.values()]) fn(); },
    get timerStarts() { return timerStarts; },
    verify() { assert.equal(writes, 0, 'read helpers never write'); assert.equal(timers.size, 0, 'deadline cleaned after the read'); },
  };
}
function row(id, extra = {}) { return { id, seller: 'player-a', created_at: '2026-11-05T12:00:00Z', paid: false, sold_to: null, kind: 'res', item: 'madera', ...extra }; }

(async () => {
  let h = harness([row(1), row(2, { sold_to: 'buyer' }), row(3, { kind: 'seed' })]);
  assert.deepEqual(normalize(await h.context.mkList({ kind: 'res' }, { estricto: true })), [row(1)]);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].limit, 60); assert(h.calls[0].signal instanceof AbortSignal);
  h.verify();

  // An empty result is a confirmed empty array, not a query failure.
  h = harness(); assert.deepEqual(normalize(await h.context.mkMine({ estricto: true, pendientes: true })), []); h.verify();

  // Older already-paid records cannot bury an old unpaid sale behind 60 rows.
  const fixtures = Array.from({ length: 140 }, (_, i) => row(i + 1, { sold_to: i < 7 ? 'buyer' : null }));
  fixtures.push(...Array.from({ length: 180 }, (_, i) => row(1000 + i, { paid: true, sold_to: 'buyer' })), row(3000, { seller: 'other' }));
  h = harness(fixtures);
  const mine = await h.context.mkMine({ estricto: true, pendientes: true });
  assert.equal(mine.length, 140); assert.equal(mine.filter(r => r.sold_to).length, 7);
  assert.equal(mine[0].id, 140); assert.equal(mine.at(-1).id, 1, 'oldest unpaid sale remains visible');
  assert.deepEqual(h.calls.map(c => c.range), [[0, 99], [100, 199]]);
  for (const call of h.calls) {
    assert.deepEqual(normalize(call.eq), [['seller', 'player-a'], ['paid', false]]);
    assert.deepEqual(normalize(call.order), [['created_at', { ascending: false }], ['id', { ascending: false }]]);
    assert.equal(call.limit, null);
  }
  assert.equal(h.calls[0].signal, h.calls[1].signal); assert.equal(h.timerStarts, 1, 'one deadline covers the whole paginated read');
  h.verify();

  // Legacy callers keep their 60-item read without the pending filter.
  h = harness(fixtures);
  assert.equal((await h.context.mkMine()).length, 60);
  assert.deepEqual(normalize(h.calls[0].eq), [['seller', 'player-a']]); assert.equal(h.calls[0].limit, 60); assert.equal(h.timerStarts, 0); h.verify();

  for (const read of [c => c.mkList(null, { estricto: true }), c => c.mkMine({ estricto: true, pendientes: true })]) {
    for (const overrides of [{ sb: null }, { UID: null }]) {
      h = harness([], overrides); await assert.rejects(() => read(h.context), /sesión activa/); assert.equal(h.calls.length, 0); h.verify();
    }
    for (const response of [{ data: [], error: { message: 'API denied' } }, { data: null, error: null }, { data: {}, error: null }]) {
      h = harness(); h.respond(async () => response); await assert.rejects(() => read(h.context), /consultar|no válida/); assert.equal(h.calls.length, 1); h.verify();
    }
    h = harness(); h.respond(async () => { throw Error('network unavailable'); });
    await assert.rejects(() => read(h.context), /network unavailable/); assert.equal(h.calls.length, 1, 'no automatic retries'); h.verify();
    h = harness(); h.respond(async () => { h.context.UID = 'player-b'; return { data: [row(1)], error: null }; });
    await assert.rejects(() => read(h.context), /cuenta cambió/); assert.equal(h.calls.length, 1); h.verify();
  }

  for (const read of [c => c.mkList(), c => c.mkMine()]) {
    h = harness([], { sb: null }); assert.deepEqual(normalize(await read(h.context)), []); h.verify();
    for (const response of [{ data: [], error: { message: 'API denied' } }, { data: null, error: null }, { data: {}, error: null }]) {
      h = harness(); h.respond(async () => response); assert.deepEqual(normalize(await read(h.context)), []); h.verify();
    }
    h = harness(); h.respond(async () => { throw Error('network unavailable'); }); assert.deepEqual(normalize(await read(h.context)), []); h.verify();
    h = harness(); h.respond(async () => { h.context.UID = 'player-b'; return { data: [row(1)], error: null }; }); assert.deepEqual(normalize(await read(h.context)), []); h.verify();
  }

  // A failure or account switch on page two must reject, never return a partial count.
  for (const failure of ['api', 'account', 'invalid']) {
    h = harness(); h.respond(async (spec, n) => {
      if (n === 1) return { data: Array.from({ length: 100 }, (_, i) => row(i)), error: null };
      if (failure === 'account') h.context.UID = 'player-b';
      return failure === 'api' ? { data: null, error: { message: 'unavailable' } } : failure === 'invalid' ? { data: null, error: null } : { data: [row(101)], error: null };
    });
    await assert.rejects(() => h.context.mkMine({ estricto: true, pendientes: true }), /consultar|cuenta cambió|no válida/);
    assert.equal(h.calls.length, 2); h.verify();
  }

  h = harness(); h.respond(async () => ({ data: Array.from({ length: 100 }, (_, i) => row(i)), error: null }));
  await assert.rejects(() => h.context.mkMine({ estricto: true, pendientes: true }), /lista completa/);
  assert.equal(h.calls.length, 20, 'bounded reads reject instead of reporting a truncated count'); h.verify();

  // Timeout releases the UI even if the underlying transport ignores cancellation.
  for (const read of [c => c.mkList(null, { estricto: true }), c => c.mkMine({ estricto: true, pendientes: true })]) {
    h = harness(); let finish;
    h.respond(() => new Promise(resolve => { finish = resolve; }));
    const result = read(h.context), rejected = assert.rejects(() => result, /tardó demasiado/);
    await pause(); assert.equal(h.calls.length, 1); const signal = h.calls[0].signal;
    h.expire(); await rejected; assert.equal(signal.aborted, true); h.verify();
    finish({ data: Array.from({ length: 100 }, (_, i) => row(i)), error: null }); await pause();
    assert.equal(h.calls.length, 1, 'a late result cannot start more pages after the timeout');
  }
  console.log('OK P2P reads: strict failures versus empty lists, legacy compatibility, paginated unpaid records, deterministic order, account isolation, bounded deadline, no retries or writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
