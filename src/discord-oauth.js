'use strict';

// Profile linking only. Email Auth and player saves are deliberately outside this router.
const express = require('express');
const crypto = require('node:crypto');
const OFFICIAL_ORIGIN = 'https://goldenfarm.onrender.com';
const CLIENT_ID = '1564641499654656091';
const SUPABASE_URL = 'https://ulspkdaljeuleqqdokfk.supabase.co';
const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsc3BrZGFsamV1bGVxcWRva2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDk5NTMsImV4cCI6MjEwNDk4NTk1M30.HRtJ0kEX6kxAZl2uUhNur2czVmbwCl2jtEcM50p0EsA';
const COOKIE = '__Host-gf-discord-oauth';
const FLOW_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const random = () => crypto.randomBytes(32).toString('base64url');
const digest = value => crypto.createHash('sha256').update(value).digest();
const fault = (status, message, code) => Object.assign(new Error(message), { status, ...(code ? { code } : {}) });

function crearDiscordOAuth(options = {}) {
  const router = express.Router();
  const origin = options.origin || OFFICIAL_ORIGIN;
  const supabase = options.supabaseUrl || SUPABASE_URL;
  const anonKey = options.anonKey || PUBLIC_ANON_KEY;
  const secret = options.clientSecret === undefined ? process.env.DISCORD_CLIENT_SECRET : options.clientSecret;
  const fetcher = options.fetch || globalThis.fetch;
  const now = options.now || Date.now;
  const ttl = options.ttlMs || 300000;
  const timeout = options.timeoutMs || 10000;
  const maxFlows = options.maxFlows || 200;
  const redirectUri = origin + '/api/discord/callback';
  const flows = new Map();
  const starts = new Map();
  const parseJson = express.json({ limit: '2kb', strict: true });

  async function remoteJson(url, init, limit = timeout) {
    const abort = new AbortController();
    let timer;
    const expired = new Promise((_, reject) => {
      timer = setTimeout(() => { abort.abort(); reject(Error('upstream timeout')); }, limit);
    });
    try {
      return await Promise.race([expired, (async () => {
        const response = await fetcher(url, { ...init, signal: abort.signal, redirect: 'error' });
        const text = await response.text();
        if (text.length > 20000) throw Error('upstream response too large');
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        return { status: response.status, ok: response.ok, data, retryAfter: response.headers.get('retry-after') };
      })()]);
    } finally { clearTimeout(timer); }
  }

  async function revoke(accessToken) {
    if (!accessToken) return;
    try {
      await remoteJson('https://discord.com/api/oauth2/token/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + secret).toString('base64') },
        body: new URLSearchParams({ token: accessToken, token_type_hint: 'access_token' }).toString(),
      }, Math.min(timeout, 2000));
    } catch { /* Best effort; these are only tokens issued by this flow, never bot tokens. */ }
  }

  function discard(flow) {
    flows.delete(flow.id);
    const token = flow.accessToken;
    flow.accessToken = null;
    if (token) void revoke(token);
  }
  function purge() {
    for (const flow of flows.values()) {
      // A bounded in-flight request may finish; revoking its token mid-request would race it.
      if (flow.expiresAt <= now() && !['exchanging', 'finishing'].includes(flow.phase)) discard(flow);
    }
    for (const [user, createdAt] of starts) if (now() - createdAt >= 30000) starts.delete(user);
  }
  // Free instances may be idle between requests. Expired provider tokens still get dropped.
  const cleanup = setInterval(purge, Math.min(30000, ttl));
  cleanup.unref();
  router.dispose = () => {
    clearInterval(cleanup);
    for (const flow of flows.values()) discard(flow);
    starts.clear();
  };
  function cookieValue(req) {
    const values = String(req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE + '='));
    if (values.length !== 1) return '';
    const value = values[0].slice(COOKIE.length + 1);
    return FLOW_PATTERN.test(value) ? value : '';
  }
  function boundFlow(req, id) {
    if (typeof id !== 'string' || !FLOW_PATTERN.test(id)) throw fault(400, 'Solicitud de vinculación inválida.');
    const flow = flows.get(id), cookie = cookieValue(req);
    if (!flow || flow.expiresAt <= now()) throw fault(409, 'La solicitud ha caducado. Vuelve a pulsar Vincular Discord.');
    if (!cookie || !crypto.timingSafeEqual(digest(cookie), flow.cookieHash)) throw fault(403, 'Abre la vinculación desde el mismo navegador del juego.');
    return flow;
  }
  function checkPost(req) {
    if (req.headers.origin !== origin) throw fault(403, 'Abre esta acción desde Golden Farm.');
    if (!req.is('application/json')) throw fault(415, 'La solicitud debe ser JSON.');
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !UUID_PATTERN.test(req.body.account || '')) throw fault(400, 'Cuenta inválida. Vuelve a abrir Configuración.');
    if (!secret) throw fault(503, 'La vinculación con Discord todavía no está disponible.');
  }
  async function authenticated(req) {
    const match = String(req.headers.authorization || '').match(/^Bearer ([^\s]{20,8192})$/i);
    if (!match) throw fault(401, 'Entra con el correo verificado de tu granja.');
    let response;
    try {
      response = await remoteJson(supabase + '/auth/v1/user', { headers: { apikey: anonKey, Authorization: 'Bearer ' + match[1] } });
    } catch { throw fault(503, 'No se pudo comprobar tu sesión. Reintenta con conexión.'); }
    if (!response.ok) throw fault(response.status >= 500 || response.status === 429 ? 503 : 401, 'No se pudo comprobar tu sesión. Vuelve a entrar con tu correo.');
    const user = response.data;
    if (!user || !UUID_PATTERN.test(user.id || '') || !user.email_confirmed_at || user.is_anonymous === true) throw fault(401, 'Entra con el correo verificado de tu granja.');
    if (user.id !== req.body.account) throw fault(409, 'La cuenta cambió. Vuelve a abrir Configuración.');
    return { id: user.id, jwt: match[1] };
  }
  function jsonError(res, error) {
    res.status(Number.isInteger(error.status) ? error.status : 503).json({ ok: false, error: error.status ? error.message : 'No se pudo completar la vinculación. Reintenta con conexión.', ...(error.code === 'authorization_pending' ? { code: 'authorization_pending' } : {}) });
  }
  function popup(res, result, message, status = 200) {
    const nonce = crypto.randomBytes(18).toString('base64');
    const serialize = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    res.set('Content-Security-Policy', "default-src 'none'; script-src 'nonce-" + nonce + "'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.status(status).type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Discord · Golden Farm</title><h1>Golden Farm</h1><p id="resultado"></p><p>Puedes volver a la ventana del juego.</p><script nonce="' + nonce + '">document.getElementById("resultado").textContent=' + serialize(message) + ';history.replaceState(null,"","/api/discord/callback");if(window.opener)window.opener.postMessage(' + serialize(result) + ',' + serialize(origin) + ');</script></html>');
  }

  router.use('/api/discord', (req, res, next) => {
    purge();
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' });
    next();
  });

  router.post('/api/discord/start', parseJson, async (req, res) => {
    try {
      checkPost(req);
      const user = await authenticated(req);
      purge();
      const previous = Array.from(flows.values()).find(flow => flow.user === user.id);
      if (previous && ['exchanging', 'finishing'].includes(previous.phase)) throw fault(409, 'La vinculación está en curso. Espera un momento.');
      if (starts.has(user.id)) throw fault(429, 'Espera 30 segundos antes de volver a intentarlo.');
      if (previous) discard(previous);
      if (flows.size >= maxFlows || starts.size >= maxFlows) throw fault(429, 'Hay muchas solicitudes de vinculación. Inténtalo en unos minutos.');
      const id = random(), cookie = random(), verifier = random();
      const flow = { id, user: user.id, cookieHash: digest(cookie), verifier, createdAt: now(), expiresAt: now() + ttl, phase: 'requested', accessToken: null, receipt: null };
      flows.set(id, flow);
      starts.set(user.id, now());
      res.cookie(COOKIE, cookie, { secure: true, httpOnly: true, sameSite: 'lax', path: '/', maxAge: ttl });
      const url = new URL('https://discord.com/oauth2/authorize');
      url.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', scope: 'identify', redirect_uri: redirectUri, state: id, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'consent' }).toString();
      res.json({ ok: true, url: url.toString(), flow: id });
    } catch (error) { jsonError(res, error); }
  });

  router.get('/api/discord/callback', async (req, res) => {
    let flow;
    try {
      if (!secret) throw fault(503, 'La vinculación con Discord todavía no está disponible.');
      flow = boundFlow(req, req.query.state);
      if (req.query.iss !== undefined && req.query.iss !== 'https://discord.com') throw fault(400, 'Respuesta de Discord inválida.');
      if (req.query.error !== undefined) {
        if (flow.phase !== 'requested') throw fault(409, 'Esta solicitud ya se ha utilizado.');
        flow.phase = 'failed';
        return popup(res, { type: 'golden-discord-oauth', ok: false, flow: flow.id, error: 'cancelled' }, 'Has cancelado la vinculación con Discord.');
      }
      if (flow.phase === 'authorized' || flow.phase === 'complete') return popup(res, { type: 'golden-discord-oauth', ok: true, flow: flow.id }, 'Discord autorizado. Vuelve al juego para terminar la vinculación.');
      if (flow.phase !== 'requested') throw fault(409, 'Esta solicitud ya se ha utilizado.');
      if (typeof req.query.code !== 'string' || !req.query.code || req.query.code.length > 2048) throw fault(400, 'Respuesta de Discord inválida.');
      flow.phase = 'exchanging';
      const response = await remoteJson('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + secret).toString('base64') },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: req.query.code, redirect_uri: redirectUri, code_verifier: flow.verifier }).toString(),
      });
      flow.verifier = null;
      const token = response.data;
      if (!response.ok || !token || token.token_type?.toLowerCase() !== 'bearer' || typeof token.access_token !== 'string' || !token.access_token || token.access_token.length > 4096 || !String(token.scope || '').split(/\s+/).includes('identify')) {
        if (response.ok && typeof token?.access_token === 'string' && token.access_token.length <= 4096) void revoke(token.access_token);
        throw fault(503, 'No se pudo comprobar la autorización de Discord. Vuelve a intentarlo.');
      }
      if (flow.expiresAt <= now()) { void revoke(token.access_token); throw fault(409, 'La solicitud ha caducado. Vuelve a pulsar Vincular Discord.'); }
      flow.accessToken = token.access_token;
      flow.phase = 'authorized';
      popup(res, { type: 'golden-discord-oauth', ok: true, flow: flow.id }, 'Discord autorizado. Vuelve al juego para terminar la vinculación.');
    } catch (error) {
      if (flow && flow.phase === 'exchanging') { flow.phase = 'failed'; flow.verifier = null; }
      popup(res, { type: 'golden-discord-oauth', ok: false, ...(flow ? { flow: flow.id } : {}), error: 'failed' }, error.status ? error.message : 'No se pudo contactar con Discord. Vuelve a pulsar Vincular Discord.', error.status || 503);
    }
  });

  router.post('/api/discord/finish', parseJson, async (req, res) => {
    let flow;
    try {
      checkPost(req);
      flow = boundFlow(req, req.body.flow);
      const user = await authenticated(req);
      if (user.id !== flow.user) throw fault(409, 'La cuenta cambió. Inicia de nuevo la vinculación desde tu granja.');
      if (flow.expiresAt <= now()) throw fault(409, 'La solicitud ha caducado. Vuelve a pulsar Vincular Discord.');
      if (flow.phase === 'complete') return res.json(flow.receipt);
      if (flow.phase === 'finishing') throw fault(409, 'La vinculación está en curso. Espera un momento.');
      if (flow.phase === 'requested' || flow.phase === 'exchanging') throw fault(409, 'Termina la autorización en la ventana de Discord y vuelve al juego.', 'authorization_pending');
      if (flow.phase !== 'authorized' || !flow.accessToken) throw fault(409, 'Autoriza Discord antes de terminar la vinculación.');
      flow.phase = 'finishing';
      let response;
      try {
        response = await remoteJson(supabase + '/functions/v1/discord-link', {
          method: 'POST', headers: { apikey: anonKey, Authorization: 'Bearer ' + user.jwt, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'oauth', account: user.id, discord_access_token: flow.accessToken }),
        });
      } catch { flow.phase = 'authorized'; throw fault(503, 'No se pudo confirmar el resultado. Puedes volver a comprobar la vinculación.'); }
      if (!response.ok || !response.data?.ok || response.data.linked !== true) {
        const retry = response.status === 429 || response.status >= 500;
        flow.phase = retry ? 'authorized' : 'failed';
        if (!retry) { const token = flow.accessToken; flow.accessToken = null; void revoke(token); }
        if (response.status === 429) res.set('Retry-After', '30');
        throw fault(retry ? (response.status === 429 ? 429 : 503) : response.status === 409 ? 409 : 403, retry ? 'No se pudo confirmar el resultado. Puedes volver a comprobar la vinculación.' : 'No se pudo vincular este Discord. Comprueba si ya está vinculado a otra granja.');
      }
      const data = response.data;
      if (typeof data.name !== 'string' || !data.name || data.name.length > 80) { flow.phase = 'authorized'; throw fault(503, 'No se pudo confirmar el resultado. Puedes volver a comprobar la vinculación.'); }
      flow.receipt = { ok: true, linked: true, name: data.name, founder_eligible: data.founder_eligible === true };
      flow.phase = 'complete';
      const token = flow.accessToken;
      flow.accessToken = null;
      void revoke(token);
      res.json(flow.receipt);
    } catch (error) { jsonError(res, error); }
  });

  router.post('/api/discord/cancel', parseJson, async (req, res) => {
    try {
      checkPost(req);
      const flow = boundFlow(req, req.body.flow), user = await authenticated(req);
      if (flow.user !== user.id) throw fault(409, 'La cuenta cambió. Vuelve a abrir Configuración.');
      if (['exchanging', 'finishing'].includes(flow.phase)) throw fault(409, 'La vinculación está en curso. Espera un momento.');
      discard(flow);
      res.clearCookie(COOKIE, { secure: true, httpOnly: true, sameSite: 'lax', path: '/' });
      res.json({ ok: true });
    } catch (error) { jsonError(res, error); }
  });

  router.use((error, req, res, next) => {
    if (!req.path.startsWith('/api/discord/')) return next(error);
    jsonError(res, fault(error.type === 'entity.too.large' ? 413 : 400, 'Solicitud inválida. Vuelve a abrir Configuración.'));
  });
  return router;
}

module.exports = { crearDiscordOAuth };
