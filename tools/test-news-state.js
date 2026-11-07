'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const repo = process.env.GF_TEST_ROOT || path.resolve(__dirname, '..');
const stage = path.resolve(__dirname, '..');
const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
const html = fs.readFileSync(path.join(repo, 'public/index.html'), 'utf8');
const source = fs.readFileSync(path.join(stage, 'public/game/news.js'), 'utf8');
const feed = JSON.parse(fs.readFileSync(path.join(repo, 'public/news/index.json'), 'utf8'));
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
function setup(options = {}) {
  const dom = new JSDOM(html, { url: 'https://goldenfarm.onrender.com/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, events = [], calls = [];
  let offline = !!options.offline;
  for (const key of ['G', 'sb', 'saveFarm']) Object.defineProperty(w, key, {
    get() { throw Error('News touched ' + key); }, set() { throw Error('News changed ' + key); }
  });
  w.fetch = async (url, opts) => {
    calls.push({ url, opts });
    if (offline) throw Error('offline');
    return { ok: true, text: async () => JSON.stringify(feed) };
  };
  w.addEventListener('golden:news-state', event => events.push({ ...event.detail }));
  w.eval(source);
  return { dom, w, d, calls, events, api: w.GoldenNews, offline: value => { offline = value; } };
}
test('initial single request exposes unread state without reading, focusing or opening anything', async () => {
  const f = setup();
  try {
    assert.deepEqual({ ...f.api.state() }, { unread: 0, loaded: false, failed: false });
    await tick();
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].url, '/news/index.json');
    assert.equal(f.calls[0].opts.credentials, 'omit');
    assert.deepEqual({ ...f.api.state() }, { unread: feed.items.length, loaded: true, failed: false });
    assert.deepEqual(f.events.at(-1), { unread: feed.items.length, loaded: true, failed: false });
    assert.equal(f.d.querySelectorAll('.ov.show').length, 0);
    assert.equal(f.d.activeElement, f.d.body);
    assert.equal(f.w.localStorage.getItem('gf_news_seen_v1'), null);
    await tick();
    assert.equal(f.calls.length, 1, 'state consumers do not start polling');
    const detached = f.api.state(); detached.unread = 999; detached.loaded = false;
    assert.equal(f.api.state().unread, feed.items.length, 'returned snapshot cannot modify private state');
  } finally { f.dom.window.close(); }
});
test('opening marks only the displayed article and notifies consumers and menu badge together', async () => {
  const f = setup();
  try {
    await tick();
    f.d.getElementById('ov-noticias').classList.add('show');
    await f.api.open();
    assert.equal(f.api.state().unread, feed.items.length - 1);
    assert.equal(f.events.at(-1).unread, feed.items.length - 1);
    assert.equal(JSON.parse(f.w.localStorage.getItem('gf_news_seen_v1')).length, 1);
    assert.match(f.d.getElementById('gm-news').getAttribute('aria-label'), /1 sin leer/);
    assert.equal(f.d.getElementById('gm-news-badge').textContent, '1 nueva');
    const unread = Array.from(f.d.querySelectorAll('[data-news-id]')).find(button => button.querySelector('.news-entry-new'));
    unread.click();
    assert.equal(f.api.state().unread, 0);
    assert.equal(f.events.at(-1).unread, 0);
    assert.equal(f.d.getElementById('gm-news-badge').hidden, true);
  } finally { f.dom.window.close(); }
});
test('another browser tab updates both local preference and exposed unread state without fetching', async () => {
  const f = setup();
  try {
    await tick();
    f.w.localStorage.setItem('gf_news_seen_v1', JSON.stringify(feed.items.map(item => item.id)));
    f.w.dispatchEvent(new f.w.StorageEvent('storage', { key: 'gf_news_seen_v1' }));
    assert.deepEqual({ ...f.api.state() }, { unread: 0, loaded: true, failed: false });
    assert.deepEqual(f.events.at(-1), { unread: 0, loaded: true, failed: false });
    assert.equal(f.calls.length, 1);
    assert.equal(f.d.getElementById('gm-news-badge').hidden, true);
  } finally { f.dom.window.close(); }
});
test('initial failure is distinguishable from zero unread and recovers through explicit refresh only', async () => {
  const f = setup({ offline: true });
  try {
    await tick();
    assert.deepEqual({ ...f.api.state() }, { unread: 0, loaded: false, failed: true });
    assert.deepEqual(f.events.at(-1), { unread: 0, loaded: false, failed: true });
    assert.equal(f.calls.length, 1);
    assert.equal(f.d.querySelectorAll('.ov.show').length, 0);
    await tick(); assert.equal(f.calls.length, 1);
    f.offline(false); await f.api.refresh();
    assert.deepEqual({ ...f.api.state() }, { unread: feed.items.length, loaded: true, failed: false });
    assert.equal(f.calls.length, 2);
  } finally { f.dom.window.close(); }
});
test('a failed refresh preserves already loaded articles and their true unread count', async () => {
  const f = setup();
  try {
    await tick();
    f.offline(true); assert.equal(await f.api.refresh(), false);
    assert.deepEqual({ ...f.api.state() }, { unread: feed.items.length, loaded: true, failed: true });
    assert.deepEqual(f.events.at(-1), { unread: feed.items.length, loaded: true, failed: true });
    f.d.getElementById('ov-noticias').classList.add('show');
    await f.api.open();
    assert.equal(f.api.state().unread, feed.items.length - 1);
    assert.equal(f.api.state().loaded, true);
    assert.equal(f.api.state().failed, true);
    assert(f.d.querySelector('.news-title'));
    assert.equal(f.calls.length, 3, 'requests occur only on initial load and explicit refresh/open');
    assert.equal(f.w.localStorage.getItem('gf_news_seen_v1') !== null, true);
  } finally { f.dom.window.close(); }
});
