'use strict';
// Real local HTTP router; every Discord/Supabase request is intercepted in memory.
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const express = require('express');
const { crearDiscordOAuth } = require('../src/discord-oauth');
const ORIGIN = 'https://goldenfarm.onrender.com';
const APP = '1564641499654656091';
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', C = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const jwt = id => 'verified-fixture-access-token-' + id;
const ACCESS = 'discord-provider-token-server-only';
const SECRET = 'fixture-client-secret-never-public';
let assertions = 0;
function ok(value, label) { assert(value, label); assertions++; }
function equal(value, expected, label) { assert.equal(value, expected, label); assertions++; }

async function fixture(options = {}) {
  let time = 1900000000000, authMode = 'ok', tokenMode = 'ok', edgeMode = 'ok';
  let holdEdge, enteredEdge;
  const calls = [];
  const upstream = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) {
      if (authMode === 'hang') return new Promise(() => {});
      if (authMode === 'rate') return Response.json({}, { status: 429 });
      const id = [A, B, C].find(id => init.headers.Authorization === 'Bearer ' + jwt(id));
      if (!id) return Response.json({}, { status: 401 });
      return Response.json({ id, email_confirmed_at: authMode === 'unconfirmed' ? null : '2026-01-01T00:00:00Z', is_anonymous: authMode === 'anonymous' });
    }
    if (url === 'https://discord.com/api/oauth2/token') {
      if (tokenMode === 'hang') return new Promise(() => {});
      equal(init.method, 'POST');
      equal(init.headers['Content-Type'], 'application/x-www-form-urlencoded');
      equal(Buffer.from(init.headers.Authorization.slice(6), 'base64').toString(), APP + ':' + SECRET);
      const body = new URLSearchParams(init.body);
      equal(body.get('grant_type'), 'authorization_code');
      equal(body.get('redirect_uri'), ORIGIN + '/api/discord/callback');
      ok(/^[A-Za-z0-9_-]{43}$/.test(body.get('code_verifier')), 'PKCE verifier uses 256 random bits');
      if (tokenMode === 'invalid') return Response.json({ error: 'invalid_grant', description: 'private-provider-error' }, { status: 400 });
      return Response.json({ access_token: ACCESS, token_type: 'Bearer', scope: 'identify', refresh_token: 'must-never-be-kept' });
    }
    if (url.endsWith('/functions/v1/discord-link')) {
      const body = JSON.parse(init.body);
      equal(body.action, 'oauth'); equal(body.discord_access_token, ACCESS);
      equal(init.headers.Authorization, 'Bearer ' + jwt(body.account));
      if (edgeMode === 'hang') return new Promise(() => {});
      if (edgeMode === 'rate') return Response.json({ error: 'private-detail' }, { status: 429 });
      if (edgeMode === 'fail') return Response.json({ error: 'private-detail' }, { status: 503 });
      if (edgeMode === 'conflict') return Response.json({ error: 'private-account-detail' }, { status: 409 });
      if (edgeMode === 'hold') {
        enteredEdge();
        return new Promise(resolve => { holdEdge = () => resolve(Response.json({ ok: true, linked: true, name: 'Tester (@tester)', founder_eligible: false })); });
      }
      return Response.json({ ok: true, linked: true, name: 'Tester (@tester)', founder_eligible: true, unexpected_private_field: 'do-not-return' });
    }
    if (url === 'https://discord.com/api/oauth2/token/revoke') {
      equal(new URLSearchParams(init.body).get('token'), ACCESS, 'only own flow token is revoked');
      return Response.json({});
    }
    throw Error('Unexpected external destination: ' + url);
  };
  const app = express();
  const router = crearDiscordOAuth({ clientSecret: SECRET, fetch: upstream, now: () => time, ...options });
  app.use(router);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (path, body, config = {}) => {
    const headers = { Origin: ORIGIN, Authorization: 'Bearer ' + jwt(config.id || A), 'Content-Type': 'application/json', ...(config.cookie ? { Cookie: config.cookie } : {}), ...config.headers };
    const response = await fetch(base + '/api/discord/' + path, { method: 'POST', headers, body: config.raw || JSON.stringify(body) });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }
    return { status: response.status, data, text, headers: response.headers };
  };
  const start = async (id = A) => {
    const r = await post('start', { account: id }, { id });
    equal(r.status, 200, 'start must succeed');
    return { ...r, id, flow: r.data.flow, url: new URL(r.data.url), cookie: r.headers.get('set-cookie').split(';')[0] };
  };
  const callback = async (flow, query = {}) => {
    const search = new URLSearchParams({ state: flow.flow, code: 'one-time-fixture-code', iss: 'https://discord.com', ...query });
    const response = await fetch(base + '/api/discord/callback?' + search, { headers: { Cookie: flow.cookie } });
    return { status: response.status, text: await response.text(), headers: response.headers };
  };
  const count = ending => calls.filter(c => c.url.endsWith(ending)).length;
  const finish = (flow, config = {}) => post('finish', { account: config.id || flow.id, flow: flow.flow }, { id: config.id || flow.id, cookie: flow.cookie, ...config });
  return {
    post, start, callback, finish, count, calls,
    advance: ms => { time += ms; },
    auth: mode => { authMode = mode; }, token: mode => { tokenMode = mode; }, edge: mode => { edgeMode = mode; },
    hold: () => { edgeMode = 'hold'; return new Promise(resolve => { enteredEdge = resolve; }); }, release: () => holdEdge(),
    close: async () => { router.dispose(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}

(async () => {
  const f = await fixture();
  try {
    equal((await f.post('start', { account: A }, { headers: { Origin: 'https://foreign.test' } })).status, 403);
    equal(f.calls.length, 0, 'foreign origins never reach Auth');
    equal((await f.post('start', { account: A }, { headers: { Authorization: '' } })).status, 401);
    equal((await f.post('start', { account: A }, { headers: { Authorization: 'Bearer not-a-valid-fixture-token' } })).status, 401);
    equal((await f.post('start', { account: B })).status, 409, 'requested account is checked against authoritative Auth');
    f.auth('unconfirmed'); equal((await f.post('start', { account: A })).status, 401);
    f.auth('anonymous'); equal((await f.post('start', { account: A })).status, 401); f.auth('ok');
    equal((await f.post('start', { account: A }, { raw: '{invalid' })).status, 400);
    equal((await f.post('start', { account: A, padding: 'x'.repeat(3000) })).status, 413);

    const flow = await f.start();
    equal(flow.url.origin, 'https://discord.com');
    equal(flow.url.searchParams.get('scope'), 'identify');
    equal(flow.url.searchParams.get('redirect_uri'), ORIGIN + '/api/discord/callback');
    equal(flow.url.searchParams.get('state'), flow.flow);
    equal(flow.url.searchParams.get('code_challenge_method'), 'S256');
    ok(/^[A-Za-z0-9_-]{43}$/.test(flow.flow));
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) ok(flow.headers.get('set-cookie').includes(attr), attr);
    equal(flow.headers.get('cache-control'), 'no-store');
    const pendingAuthorization = await f.finish(flow);
    equal(pendingAuthorization.status, 409); equal(pendingAuthorization.data.code, 'authorization_pending');
    equal(f.count('/functions/v1/discord-link'), 0, 'focus before consent does not finalize');
    equal((await f.post('start', { account: A })).status, 429, 'regeneration is throttled');
    const wrongCookie = { ...flow, cookie: '__Host-gf-discord-oauth=' + 'x'.repeat(43) };
    equal((await f.callback(wrongCookie)).status, 403); equal(f.count('/oauth2/token'), 0);
    equal((await f.callback(flow, { iss: 'https://foreign.test' })).status, 400); equal(f.count('/oauth2/token'), 0);
    const authorized = await f.callback(flow);
    equal(authorized.status, 200);
    ok(authorized.text.includes('golden-discord-oauth')); ok(authorized.text.includes(flow.flow));
    ok(authorized.text.includes('history.replaceState')); ok(authorized.text.includes('https://goldenfarm.onrender.com'));
    for (const sensitive of [SECRET, ACCESS, jwt(A), 'one-time-fixture-code', 'must-never-be-kept']) ok(!authorized.text.includes(sensitive), 'callback never exposes credentials');
    ok(authorized.headers.get('content-security-policy').includes("default-src 'none'"));
    equal(authorized.headers.get('referrer-policy'), 'no-referrer');
    const exchange = f.calls.find(c => c.url.endsWith('/oauth2/token'));
    const verifier = new URLSearchParams(exchange.init.body).get('code_verifier');
    equal(crypto.createHash('sha256').update(verifier).digest('base64url'), flow.url.searchParams.get('code_challenge'));
    equal((await f.callback(flow)).status, 200); equal(f.count('/oauth2/token'), 1, 'duplicate callback cannot exchange a code twice');
    equal((await f.finish(flow, { id: B })).status, 409); equal(f.count('/functions/v1/discord-link'), 0, 'switching accounts never links the original flow');
    equal((await f.finish(wrongCookie)).status, 403);
    const linked = await f.finish(flow);
    equal(linked.status, 200);
    assert.deepEqual(linked.data, { ok: true, linked: true, name: 'Tester (@tester)', founder_eligible: true }); assertions++;
    ok(!linked.text.includes('do-not-return')); ok(!linked.text.includes(ACCESS));
    equal(f.count('/functions/v1/discord-link'), 1);
    equal((await f.finish(flow)).status, 200); equal(f.count('/functions/v1/discord-link'), 1, 'successful receipt is idempotent');

    f.advance(31000);
    const cancelled = await f.start();
    const denied = await f.callback(cancelled, { error: 'access_denied' });
    equal(denied.status, 200); ok(denied.text.includes('"ok":false')); ok(denied.text.includes('"error":"cancelled"')); ok(denied.text.includes(cancelled.flow));
    equal((await f.finish(cancelled)).status, 409);
    ok(!(await f.finish(cancelled)).data.code, 'cancelled authorization is not reported as pending');
    f.advance(31000);
    const pending = await f.start();
    equal((await f.post('cancel', { account: A, flow: pending.flow }, { cookie: pending.cookie })).status, 200);
    equal((await f.callback(pending)).status, 409, 'cancelled flow cannot be reused');
    equal((await f.post('start', { account: A })).status, 429, 'cancel cannot bypass the regeneration limit');
    f.advance(31000);
    const expired = await f.start();
    f.advance(300001); equal((await f.callback(expired)).status, 409);

    const retry = await f.start(); await f.callback(retry);
    f.edge('rate'); equal((await f.finish(retry)).status, 429);
    f.edge('fail'); const failed = await f.finish(retry); equal(failed.status, 503); ok(!failed.text.includes('private-detail'));
    f.edge('ok'); equal((await f.finish(retry)).status, 200, '429/503 retain only a short-lived server proof for retry');
    f.advance(31000);
    const conflict = await f.start(); await f.callback(conflict); f.edge('conflict');
    const conflictResult = await f.finish(conflict); equal(conflictResult.status, 409); ok(!conflictResult.text.includes('private-account-detail'));
    equal((await f.finish(conflict)).status, 409, 'definitive failure consumes the flow');

    f.advance(31000);
    const concurrent = await f.start(); await f.callback(concurrent);
    const entered = f.hold(), first = f.finish(concurrent);
    await entered;
    equal((await f.finish(concurrent)).status, 409, 'only one finish request may call Edge');
    f.release(); equal((await first).status, 200);
    // A new server has no pending proof; restart fails closed rather than inventing a binding.
    const restarted = await fixture();
    try { equal((await restarted.finish(concurrent)).status, 409); equal(restarted.calls.length, 0); } finally { await restarted.close(); }
  } finally { await f.close(); }

  const limited = await fixture({ maxFlows: 2 });
  try {
    await limited.start(A); await limited.start(B);
    equal((await limited.post('start', { account: C }, { id: C })).status, 429, 'pending state has a hard memory bound');
    limited.advance(300001); equal((await limited.post('start', { account: C }, { id: C })).status, 200, 'expired state frees capacity');
  } finally { await limited.close(); }

  const unavailable = await fixture({ clientSecret: '' });
  try { equal((await unavailable.post('start', { account: A })).status, 503); equal(unavailable.calls.length, 0); } finally { await unavailable.close(); }

  const idle = await fixture({ ttlMs: 40 });
  try {
    const abandoned = await idle.start(); await idle.callback(abandoned);
    idle.advance(41);
    await new Promise(resolve => setTimeout(resolve, 90));
    ok(idle.count('/oauth2/token/revoke') > 0, 'idle timer drops/revokes expired tokens without an incoming request');
    equal((await idle.finish(abandoned)).status, 409);
  } finally { await idle.close(); }

  const slow = await fixture({ timeoutMs: 30 });
  try {
    slow.auth('hang'); equal((await slow.post('start', { account: A })).status, 503, 'Auth timeout is bounded');
    slow.auth('ok'); const hangingProvider = await slow.start(); slow.token('hang');
    equal((await slow.callback(hangingProvider)).status, 503, 'provider timeout is bounded');
    slow.advance(31000); slow.token('ok'); const hangingEdge = await slow.start(); await slow.callback(hangingEdge); slow.edge('hang');
    equal((await slow.finish(hangingEdge)).status, 503, 'ambiguous Edge timeout retains retry proof');
    slow.edge('ok'); equal((await slow.finish(hangingEdge)).status, 200);
  } finally { await slow.close(); }
  console.log('OK: ' + assertions + ' checks over real local HTTP: verified email Auth, origin/account/cookie binding, S256 PKCE, private tokens, consent denial, same-account completion, idempotency, concurrency, limits, timeouts and restart fail-closed. No live player writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
