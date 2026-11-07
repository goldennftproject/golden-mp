/* Public game news. Read-only feed; seen IDs are a browser preference, never farm data. */
(function (root) {
  'use strict';
  const doc = root.document, panel = doc.getElementById('ov-noticias');
  if (!panel || root.GoldenNews) return;
  const list = doc.getElementById('news-list'), detail = doc.getElementById('news-detail');
  const status = doc.getElementById('news-status'), badge = doc.getElementById('gm-news-badge');
  const refresh = doc.getElementById('news-refresh'), lightbox = doc.getElementById('news-lightbox');
  const largeImage = doc.getElementById('news-large-image'), imageClose = doc.getElementById('news-image-close');
  const zoom = doc.getElementById('news-image-zoom'), storageKey = 'gf_news_seen_v1';
  const source = '/news/index.json';
  let items = [], selected = '', inflight = null, failed = false, loaded = false, imageFocus = null;
  let seen = readSeen();

  function readSeen() {
    try {
      const value = JSON.parse(root.localStorage.getItem(storageKey) || '[]');
      return new Set(Array.isArray(value) ? value.filter(x => typeof x === 'string').slice(-500) : []);
    } catch (_) { return new Set(); }
  }
  function element(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function safeLink(value, discordOnly) {
    if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      if (discordOnly && (url.port || !['discord.com', 'www.discord.com', 'discordapp.com'].includes(url.hostname) || !/^\/channels\/\d+\/\d+\/\d+\/?$/.test(url.pathname))) return null;
      return url.href;
    } catch (_) { return null; }
  }
  function safeImage(value) {
    if (typeof value !== 'string' || !/^\/news\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp)$/.test(value)) return null;
    return value;
  }
  function normalize(feed) {
    if (!feed || feed.version !== 1 || !Array.isArray(feed.items) || feed.items.length > 100) throw Error('feed');
    const ids = new Set();
    return feed.items.map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id) ||
          typeof item.title !== 'string' || !item.title.trim() || item.title.length > 160 ||
          typeof item.content !== 'string' || item.content.length > 30000 ||
          typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
          !Number.isFinite(Date.parse(item.date + 'T12:00:00Z')) || new Date(item.date + 'T12:00:00Z').toISOString().slice(0, 10) !== item.date ||
          !safeImage(item.image) || typeof item.alt !== 'string' || item.alt.length > 500) throw Error('item');
      ids.add(item.id);
      return { id: item.id, date: item.date, title: item.title, content: item.content,
        image: item.image, alt: item.alt, discordUrl: safeLink(item.discordUrl, true) };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
  function dateText(value) {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
  }
  // Small Markdown subset. Every piece of feed text becomes a text node, never HTML.
  function inline(parent, text) {
    const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^\s)\n]+\)|https:\/\/[^\s<>()]+)/g;
    let at = 0, match;
    while ((match = pattern.exec(text))) {
      parent.append(doc.createTextNode(text.slice(at, match.index)));
      const token = match[0];
      if (token.startsWith('**')) parent.append(element('strong', '', token.slice(2, -2)));
      else if (token.startsWith('`')) parent.append(element('code', '', token.slice(1, -1)));
      else {
        const parts = /^\[([^\]]+)\]\((.+)\)$/.exec(token), href = safeLink(parts ? parts[2] : token, false);
        if (href) {
          const anchor = element('a', '', parts ? parts[1] : token); anchor.href = href; anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer'; parent.append(anchor);
        } else parent.append(doc.createTextNode(token));
      }
      at = pattern.lastIndex;
    }
    parent.append(doc.createTextNode(text.slice(at)));
  }
  function markdown(parent, text) {
    let paragraph = [], bullets = null, kind = '';
    const flush = () => {
      if (!paragraph.length) return;
      const p = element('p');
      paragraph.forEach((line, i) => { if (i) p.append(doc.createElement('br')); inline(p, line); });
      parent.append(p); paragraph = [];
    };
    for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
      const bullet = /^\s*(?:[-*•]\s+|\d+[.)]\s+)(.+)$/.exec(line), heading = /^#{1,3}\s+(.+)$/.exec(line);
      if (bullet) {
        flush(); const nextKind = /^\s*\d/.test(line) ? 'ol' : 'ul';
        if (!bullets || kind !== nextKind) { bullets = element(nextKind); parent.append(bullets); kind = nextKind; }
        const li = element('li'); inline(li, bullet[1]); bullets.append(li);
      } else {
        bullets = null; kind = '';
        if (!line.trim()) flush();
        else if (heading) { flush(); const h = element('h4'); inline(h, heading[1]); parent.append(h); }
        else if (/^\s*---+\s*$/.test(line)) { flush(); parent.append(element('hr')); }
        else paragraph.push(line);
      }
    }
    flush();
  }
  function state() {
    return { unread: items.filter(item => !seen.has(item.id)).length, loaded, failed };
  }
  function updateBadge() {
    const count = state().unread;
    badge.hidden = !count; badge.textContent = count ? count + (count === 1 ? ' nueva' : ' nuevas') : '';
    const button = doc.getElementById('gm-news');
    if (button) button.setAttribute('aria-label', count ? 'Noticias: ' + count + ' sin leer' : 'Noticias');
    root.dispatchEvent(new root.CustomEvent('golden:news-state', { detail: state() }));
  }
  function markSeen(id) {
    if (seen.has(id)) return;
    seen.add(id);
    try { root.localStorage.setItem(storageKey, JSON.stringify(Array.from(seen).slice(-500))); } catch (_) {}
    updateBadge();
  }
  function renderList() {
    const active = list.contains(doc.activeElement) && doc.activeElement.closest('[data-news-id]');
    const focusedId = active && active.dataset.newsId;
    list.replaceChildren();
    for (const item of items) {
      const button = element('button', 'news-entry'); button.type = 'button'; button.dataset.newsId = item.id;
      button.setAttribute('aria-pressed', String(item.id === selected)); button.setAttribute('aria-controls', 'news-detail');
      const date = element('time', 'news-entry-date', dateText(item.date)); date.dateTime = item.date;
      button.append(date, element('strong', 'news-entry-title', item.title));
      if (!seen.has(item.id)) button.append(element('span', 'news-entry-new', 'Nueva'));
      button.addEventListener('click', () => select(item.id, true)); list.append(button);
    }
    if (focusedId) {
      const replacement = Array.from(list.children).find(button => button.dataset.newsId === focusedId);
      if (replacement) replacement.focus({ preventScroll: true });
    }
  }
  function openImage(item, trigger) {
    if (!panel.classList.contains('show')) return;
    imageFocus = trigger; largeImage.src = item.image; largeImage.alt = item.alt;
    lightbox.classList.remove('news-original'); zoom.textContent = 'Tamaño original'; zoom.setAttribute('aria-pressed', 'false');
    lightbox.hidden = false; imageClose.focus({ preventScroll: true });
  }
  function closeImage() {
    if (lightbox.hidden) return;
    lightbox.hidden = true; largeImage.removeAttribute('src'); lightbox.classList.remove('news-original');
    if (imageFocus && imageFocus.isConnected && panel.classList.contains('show')) imageFocus.focus({ preventScroll: true });
    imageFocus = null;
  }
  function select(id, read) {
    const item = items.find(x => x.id === id); if (!item) return;
    closeImage(); selected = id;
    if (read && panel.classList.contains('show')) markSeen(id);
    renderList(); detail.replaceChildren(); detail.scrollTop = 0;
    const date = element('time', 'news-date', dateText(item.date)); date.dateTime = item.date;
    const title = element('h2', 'news-title', item.title); title.id = 'news-detail-title';
    detail.append(date, title);
    const figure = element('figure', 'news-figure'), imageButton = element('button', 'news-image-button');
    imageButton.type = 'button'; imageButton.setAttribute('aria-label', 'Ampliar imagen: ' + item.title);
    const image = element('img'); image.alt = item.alt; image.src = item.image; image.width = 1600; image.height = 1100;
    image.decoding = 'async'; imageButton.append(image, element('span', 'news-image-hint', 'Ampliar imagen'));
    imageButton.addEventListener('click', () => openImage(item, imageButton)); figure.append(imageButton);
    const imageError = element('figcaption', 'news-image-error'); imageError.hidden = true;
    imageError.append(doc.createTextNode('No se ha podido cargar la imagen. '));
    const retry = element('button', 'news-small-button', 'Reintentar imagen'); retry.type = 'button';
    retry.addEventListener('click', () => { imageError.hidden = true; imageButton.hidden = false; image.removeAttribute('src'); image.src = item.image; });
    imageError.append(retry); figure.append(imageError);
    image.addEventListener('error', () => { imageButton.hidden = true; imageError.hidden = false; });
    detail.append(figure);
    const body = element('div', 'news-content'), lines = item.content.replace(/\r\n?/g, '\n').split('\n');
    const first = (lines[0] || '').trim().replace(/^\*\*(.*)\*\*$/, '$1').replace(/^#{1,3}\s+/, '');
    // Discord includes its title in the message. The reader already has that same title.
    if (first === item.title.trim()) lines.shift();
    markdown(body, lines.join('\n')); detail.append(body);
    if (item.discordUrl) {
      const anchor = element('a', 'news-discord', 'Ver esta publicación en Discord');
      anchor.href = item.discordUrl; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; detail.append(anchor);
    }
  }
  function showStatus(text, error) {
    status.replaceChildren(); status.hidden = !text; status.dataset.error = String(!!error);
    if (text) status.append(doc.createTextNode(text));
    if (error) {
      const retry = element('button', 'news-small-button', 'Reintentar'); retry.type = 'button';
      retry.addEventListener('click', () => load()); status.append(retry);
    }
  }
  function renderOpen() {
    renderList();
    if (items.length) select(items.some(x => x.id === selected) ? selected : (items.find(x => !seen.has(x.id)) || items[0]).id, true);
    else if (loaded) { detail.replaceChildren(element('p', 'news-empty', 'Las novedades llegarán pronto.')); }
  }
  function load() {
    if (inflight) return inflight;
    refresh.disabled = true;
    if (panel.classList.contains('show')) showStatus(loaded ? 'Actualizando noticias…' : 'Cargando noticias…', false);
    const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    let timer;
    const timeout = new Promise((_, reject) => { timer = root.setTimeout(() => { if (controller) controller.abort(); reject(Error('timeout')); }, 10000); });
    inflight = Promise.race([Promise.resolve().then(() => root.fetch(source, {
      credentials: 'omit', cache: 'no-cache', mode: 'same-origin', referrerPolicy: 'no-referrer',
      ...(controller ? { signal: controller.signal } : {})
    })).then(async response => {
      if (!response.ok) throw Error('http');
      const text = await response.text(); if (text.length > 250000) throw Error('size');
      return normalize(JSON.parse(text));
    }), timeout]).then(next => {
      items = next; loaded = true; failed = false; updateBadge();
      if (panel.classList.contains('show')) { showStatus('', false); renderOpen(); }
      return true;
    }).catch(() => {
      failed = true; updateBadge();
      if (panel.classList.contains('show')) showStatus(loaded ? 'No se han podido actualizar las noticias. Puedes seguir leyendo las cargadas.' : 'No se han podido cargar las noticias. Revisa la conexión.', true);
      return false;
    }).finally(() => { root.clearTimeout(timer); refresh.disabled = false; inflight = null; });
    return inflight;
  }
  function open() {
    if (!panel.classList.contains('show')) return Promise.resolve(false);
    if (loaded) renderOpen();
    else if (!failed) detail.replaceChildren(element('p', 'news-empty', 'Cargando noticias…'));
    return load();
  }
  refresh.addEventListener('click', () => load());
  // The card can still move by its header; selecting/scrolling an article is reading.
  detail.addEventListener('pointerdown', event => { event.stopPropagation(); });
  imageClose.addEventListener('click', closeImage);
  zoom.addEventListener('click', () => {
    const original = lightbox.classList.toggle('news-original');
    zoom.textContent = original ? 'Ajustar a pantalla' : 'Tamaño original'; zoom.setAttribute('aria-pressed', String(original));
  });
  lightbox.addEventListener('pointerdown', event => { event.stopPropagation(); });
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeImage(); });
  doc.addEventListener('keydown', event => {
    if (lightbox.hidden) return;
    // Keep world shortcuts behind this modal; native scrolling/button keys still work.
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); closeImage(); }
    else if (event.key === 'Tab') {
      event.preventDefault();
      (doc.activeElement === imageClose ? zoom : imageClose).focus();
    }
  }, true);
  if (typeof root.MutationObserver === 'function') new root.MutationObserver(() => {
    if (!panel.classList.contains('show')) closeImage();
  }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  root.addEventListener('storage', event => { if (event.key === storageKey) { seen = readSeen(); updateBadge(); renderList(); } });
  root.GoldenNews = Object.freeze({ open, refresh: load, closeImage, state });
  // A single lightweight public request; no wait on it anywhere in the game boot.
  root.setTimeout(() => { if (!loaded && !failed && !inflight) load(); }, 0);
})(window);
