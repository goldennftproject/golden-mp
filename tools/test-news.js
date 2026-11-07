'use strict';
// Actual module + overlay hooks in an isolated DOM. No game login, DB or live network.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const repo = path.resolve(__dirname, '..'), read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const html = read('public/index.html'), script = read('public/game/news.js'), css = read('public/game/news.css'), ui = read('public/game/ui.js');
const actual = JSON.parse(read('public/news/index.json'));
const clone = x => JSON.parse(JSON.stringify(x)), tick = () => new Promise(resolve => setTimeout(resolve, 10));
function fixture(feed = actual, stored) {
  const dom = new JSDOM(html, { url: 'https://goldenfarm.onrender.com/', runScripts: 'outside-only' }), w = dom.window, d = w.document;
  const style = d.createElement('style'); style.textContent = css; d.head.append(style);
  w.GF = { esAltarOculto: () => false, esPescaOculta: () => false, esOcultoMvp: () => false };
  w.$ = id => d.getElementById(id); w.refrescarGuiaTrasCerrarOv = () => {};
  for (const key of ['G', 'saveFarm', 'sb']) Object.defineProperty(w, key, { get() { throw Error('News touched ' + key); }, set() { throw Error('News changed ' + key); } });
  let current = feed, error = false, release = null; const calls = [];
  w.fetch = async (url, opts) => {
    calls.push({ url, opts });
    if (error) throw Error('offline');
    if (release) return new Promise(resolve => { release.resolve = () => resolve({ ok: true, text: async () => JSON.stringify(current) }); });
    return { ok: true, text: async () => typeof current === 'string' ? current : JSON.stringify(current) };
  };
  if (stored) w.localStorage.setItem('gf_news_seen_v1', JSON.stringify(stored));
  w.eval(ui.slice(ui.indexOf('/* ---- overlays ---- */'), ui.indexOf('function cerrarCuerpoPanelPc')));
  const start = ui.indexOf('function closeOv('); w.eval(ui.slice(start, ui.indexOf('\n}', start) + 2));
  w.eval(script);
  d.getElementById('gm-news').onclick = () => w.openOv('ov-noticias');
  d.querySelector('[data-close="ov-noticias"]').onclick = () => w.closeOv('ov-noticias');
  return { dom, w, d, calls, setFeed: x => { current = x; }, setError: x => { error = x; }, delay: () => { release = {}; return release; } };
}
function desktopStyles(f, width, height) {
  const { d, w } = f; w.innerWidth = width; w.innerHeight = height;
  const sources = Array.from(d.querySelectorAll('style,link[rel=stylesheet]')).map(el => el.tagName === 'STYLE' ? el.textContent : read('public/' + el.getAttribute('href').split('?')[0]));
  d.querySelectorAll('style,link[rel=stylesheet]').forEach(el => el.remove());
  const matches = condition => {
    for (const m of condition.matchAll(/(min|max)-(width|height)\s*:\s*([\d.]+)px/g)) {
      const value = m[2] === 'width' ? width : height;
      if (m[1] === 'min' ? value < +m[3] : value > +m[3]) return false;
    }
    return !/prefers-reduced-motion\s*:\s*reduce|pointer\s*:\s*coarse/.test(condition);
  };
  const flatten = text => {
    const probe = d.createElement('style'); probe.textContent = text; d.head.append(probe);
    const walk = rules => Array.from(rules).flatMap(rule => rule.type === 4 ? (matches(rule.conditionText) ? walk(rule.cssRules) : []) : [rule.cssText]);
    const result = walk(probe.sheet.cssRules).join('\n'); probe.remove(); return result;
  };
  const style = d.createElement('style'); style.textContent = sources.map(flatten).join('\n'); d.head.append(style);
}
function contrast(foreground, background) {
  const luminance = css => css.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
(async () => {
  assert.equal(actual.version, 1); assert(actual.items.length >= 2);
  assert.equal(html.match(/"game\/news\.js"/g).length, 1);
  assert.equal(html.match(/href="game\/news\.css\?v=1"/g).length, 1);
  assert.equal(new JSDOM(html).window.document.querySelectorAll('.gmi[data-panel="ov-noticias"]').length, 1);
  assert(!/innerHTML|insertAdjacentHTML|eval\(|new Function/.test(script));
  const f = fixture(), { w, d } = f, badge = d.getElementById('gm-news-badge');
  await tick();
  assert.equal(f.calls.length, 1, 'one background request, no polling');
  assert.equal(f.calls[0].url, '/news/index.json'); assert.equal(f.calls[0].opts.credentials, 'omit');
  assert.equal(badge.textContent, actual.items.length + ' nuevas'); assert.equal(badge.hidden, false);
  assert.equal(d.querySelectorAll('.ov.show').length, 0, 'new items never open a popup');
  assert.equal(w.localStorage.getItem('gf_news_seen_v1'), null, 'background load never marks items seen');
  d.getElementById('gm-news').click(); await tick();
  assert(d.getElementById('ov-noticias').classList.contains('show')); assert.equal(f.calls.length, 2, 'refresh on explicit open');
  assert.equal(d.querySelectorAll('.news-entry').length, actual.items.length); assert.equal(badge.textContent, (actual.items.length - 1) + (actual.items.length === 2 ? ' nueva' : ' nuevas'));
  assert.equal(d.querySelector('.news-title').textContent, actual.items[0].title);
  assert.equal(d.querySelector('.news-content').textContent.includes(actual.items[0].title), false, 'the exactly repeated Discord title is only displayed once');
  assert.equal(d.querySelectorAll('.news-content ul li').length, actual.items[0].content.split(/\r?\n/).filter(line => /^\s*[-*•]\s+/.test(line)).length); assert(d.querySelector('.news-content strong'));
  if(actual.items[0].discordUrl){assert.equal(d.querySelector('.news-discord').href, actual.items[0].discordUrl);
  assert.equal(d.querySelector('.news-discord').rel, 'noopener noreferrer');}else assert.equal(d.querySelector('.news-discord'),null);
  assert.equal(d.querySelector('.news-content a').href, 'https://goldenfarm.onrender.com/', 'the original game URL is a safe clickable link');
  let readerBubbled = false; d.querySelector('.news-card').addEventListener('pointerdown', () => { readerBubbled = true; });
  d.querySelector('.news-content p').dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
  assert.equal(readerBubbled, false, 'selecting article text cannot start the card hold-drag');
  const imageButton = d.querySelector('.news-image-button'); imageButton.focus(); imageButton.click();
  const lightbox = d.getElementById('news-lightbox'); assert.equal(lightbox.hidden, false);
  assert.equal(d.getElementById('news-large-image').getAttribute('src'), actual.items[0].image);
  assert.equal(d.activeElement.id, 'news-image-close');
  let worldKey = false; w.addEventListener('keydown', () => { worldKey = true; });
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'e', bubbles: true }));
  assert.equal(worldKey, false, 'the image modal keeps game shortcuts behind it');
  d.getElementById('news-image-zoom').click(); assert(lightbox.classList.contains('news-original'));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); assert.equal(d.activeElement.id, 'news-image-zoom');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(lightbox.hidden, true); assert.equal(d.activeElement, imageButton); assert(w.isOpen('ov-noticias'));
  d.querySelectorAll('.news-entry')[1].focus(); d.querySelectorAll('.news-entry')[1].click(); for (let i = 2; i < actual.items.length; i++) d.querySelectorAll('.news-entry')[i].click(); assert.equal(badge.hidden, true);
  assert.equal(d.activeElement.dataset.newsId, actual.items[1].id, 'rebuilding unread labels preserves the selected entry keyboard focus');
  assert.deepEqual(JSON.parse(w.localStorage.getItem('gf_news_seen_v1')), actual.items.map(x => x.id));
  d.querySelector('.news-image-button').click(); w.closeOv('ov-noticias'); assert.equal(lightbox.hidden, true);
  const restored = fixture(actual, actual.items.map(x => x.id)); await tick(); assert.equal(restored.d.getElementById('gm-news-badge').hidden, true); restored.w.close();

  f.setError(true); d.getElementById('gm-news').click(); await tick();
  assert.match(d.getElementById('news-status').textContent, /No se han podido actualizar/);
  assert(d.querySelector('.news-title'), 'cached text remains readable offline');
  f.setError(false); d.querySelector('#news-status button').click(); await tick(); assert.equal(d.getElementById('news-status').hidden, true);
  d.querySelector('.news-image-button img').dispatchEvent(new w.Event('error'));
  assert.equal(d.querySelector('.news-image-error').hidden, false); d.querySelector('.news-image-error button').click();
  assert.equal(d.querySelector('.news-image-button').hidden, false);
  f.setFeed({ version: 1, items: [] }); await w.GoldenNews.refresh(); assert.match(d.querySelector('.news-empty').textContent, /llegarán pronto/);
  w.close();

  const unsafe = clone(actual); unsafe.items = [{ ...unsafe.items[0], id: 'safe', title: '<img src=x onerror=alert(1)>',
    content: '**Negrita**\n\n- <svg onload=alert(1)>\n- [mal](javascript:alert)\n- [datos](data:text/html,evil)\n- [credenciales](https://user:pass@example.com/)\n- [bien](https://example.com/path)',
    discordUrl: 'https://user:pass@discord.com/channels/1/2/3' }];
  const x = fixture(unsafe); await tick(); x.d.getElementById('gm-news').click(); await tick();
  const body = x.d.querySelector('.news-content'); assert.equal(body.querySelectorAll('svg,img,script').length, 0);
  assert.equal(body.querySelectorAll('a').length, 1); assert.equal(body.querySelector('a').href, 'https://example.com/path');
  assert.equal(x.d.querySelector('.news-title img'), null); assert.match(x.d.querySelector('.news-title').textContent, /onerror/);
  assert.equal(x.d.querySelector('.news-discord'), null); x.w.close();

  const port = clone(actual); port.items[0].discordUrl = 'https://discord.com:8443/channels/1/2/3';
  const portFixture = fixture(port); await tick(); portFixture.d.getElementById('gm-news').click(); await tick();
  assert.equal(portFixture.d.querySelector('.news-discord'), null, 'Discord permalink rejects nonstandard ports'); portFixture.w.close();

  const broken = fixture('invalid json'); await tick(); broken.d.getElementById('gm-news').click(); await tick();
  assert.match(broken.d.getElementById('news-status').textContent, /No se han podido cargar/);
  assert.equal(broken.d.getElementById('gm-news-badge').hidden, true);
  const invalidItems = [
    ...[123, true, ['abc']].map(id => ({ ...actual.items[0], id })),
    { ...actual.items[0], date: '2026-02-31' }, { ...actual.items[0], image: 'https://example.com/image.jpg' },
    { ...actual.items[0], image: '/news/../private.jpg' }, { ...actual.items[0], image: '/news/%2e%2e/private.jpg' }
  ];
  for (const item of invalidItems) {
    broken.setFeed({ version: 1, items: [item] }); await broken.w.GoldenNews.refresh();
    assert.equal(broken.d.getElementById('news-status').dataset.error, 'true'); assert.equal(broken.d.querySelectorAll('.news-entry').length, 0);
  }
  broken.setFeed(actual); broken.d.querySelector('#news-status button').click(); await tick();
  assert.equal(broken.d.querySelectorAll('.news-entry').length, actual.items.length, 'retry recovers from corrupt/offline feed'); broken.w.close();

  const slow = fixture(); const deferred = slow.delay(); await tick();
  slow.d.getElementById('gm-news').click(); slow.w.GoldenNews.refresh(); assert.equal(slow.calls.length, 1, 'concurrent opens share one request');
  slow.w.closeOv('ov-noticias'); deferred.resolve(); await tick();
  assert.equal(slow.d.getElementById('gm-news-badge').textContent, actual.items.length + ' nuevas');
  assert.equal(slow.w.localStorage.getItem('gf_news_seen_v1'), null, 'a response after closing cannot mark unread items as read'); slow.w.close();

  const colors = fixture(); await tick(); colors.d.getElementById('gm-news').click(); await tick();
  desktopStyles(colors, 1033, 572);
  for (const renewed of [false, true]) {
    colors.d.documentElement.classList.toggle('visual-v2', renewed);
    for (const entry of colors.d.querySelectorAll('.news-entry')) {
      const title = colors.w.getComputedStyle(entry.querySelector('.news-entry-title')).color, background = colors.w.getComputedStyle(entry).backgroundColor;
      assert(contrast(title, background) >= 4.5, (renewed ? 'Renovado' : 'Clásico') + ' selected/unread title contrast');
    }
    const close = colors.w.getComputedStyle(colors.d.querySelector('#ov-noticias>.news-card>.close'));
    assert.equal(close.position, 'absolute'); assert.equal(close.right, '8px');
    for (const disabled of [false, true]) {
      const button = colors.d.getElementById('news-refresh'); button.disabled = disabled;
      const buttonStyle = colors.w.getComputedStyle(button); assert(contrast(buttonStyle.color, buttonStyle.backgroundColor) >= 4.5, 'Actualizar normal/disabled remains readable');
    }
  }
  colors.w.close();
  console.log('OK Noticias: real feed/menu/overlay hooks, single async badge without popup, seen preference, text-safe Markdown/URLs/images, cached offline+retry, image zoom/Escape/focus, invalid feed recovery and no G/save/DB access. Native QA covers geometry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
