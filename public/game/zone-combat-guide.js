/* First-entry combat instructions. Only DOM and an account-scoped browser preference. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc) return;
  const seenInMemory = new Set();
  let active = null;
  const PREFIX = 'gf-zone-combat-guide-v1-';
  const mouse = '<svg viewBox="0 0 32 44" aria-hidden="true"><rect x="5" y="2" width="22" height="38" rx="11" fill="#f9edcf" stroke="#684629" stroke-width="2"/><path d="M16 3v15h10V13A10 10 0 0 0 16 3Z" fill="#e8ac42" stroke="#684629" stroke-width="1.5"/><path d="M6 18h20M16 4v8" fill="none" stroke="#684629" stroke-width="1.5"/><rect x="14" y="8" width="4" height="7" rx="2" fill="#684629"/></svg>';
  const movement = '<svg viewBox="0 0 62 48" aria-hidden="true"><path d="M4 14h21l-6-6m6 6-6 6" fill="none" stroke="#527a41" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="m8 29 6-3 5 8-6 3zm9 7 6-3 4 7-6 3z" fill="#527a41"/><path d="m43 7 11 5 5 11-5 11-11 5-11-5-5-11 5-11z" fill="#a8513f" stroke="#743b2c" stroke-width="2"/><path d="M36 23h14" stroke="#fff1ce" stroke-width="4" stroke-linecap="round"/></svg>';
  function identity(options) {
    let uid = null, project = null;
    try { uid = options.getUid(); project = options.getProjectRef(); } catch (error) {}
    return { uid: typeof uid === 'string' && uid.length > 0 && uid.length <= 160 ? uid : null,
      project: typeof project === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(project) ? project : 'golden-farm' };
  }
  function sameIdentity(ui) { const current = identity(ui.options); return current.uid === ui.identity.uid && current.project === ui.identity.project; }
  function keyFor(account) { return account.uid ? PREFIX + account.project + '-' + account.uid : null; }
  function alreadySeen(ui) {
    if (seenInMemory.has(ui.memoryKey)) return true;
    if (!ui.key) return false;
    try { return root.localStorage.getItem(ui.key) === 'seen'; } catch (error) { return false; }
  }
  function markSeen(ui) {
    if (!sameIdentity(ui)) return false;
    seenInMemory.add(ui.memoryKey);
    if (ui.key) try { root.localStorage.setItem(ui.key, 'seen'); } catch (error) {}
    return true;
  }
  function rect(id) {
    const element = doc.getElementById(id);
    if (!element || element.hidden || !element.getBoundingClientRect) return null;
    const style = root.getComputedStyle ? root.getComputedStyle(element) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return null;
    const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 ? box : null;
  }
  function layout(ui) {
    if (active !== ui) return;
    if (!sameIdentity(ui)) { clear(ui.scene); return; }
    const width = root.innerWidth || 800, height = root.innerHeight || 600;
    let top = 8, left = 8, right = width - 8, bottom = height - 8;
    for (const id of ['hudbar', 'hud-flot']) { const box = rect(id); if (box) top = Math.max(top, box.bottom + 8); }
    for (const id of ['hotwrap', 'editbar']) { const box = rect(id); if (box && box.top > top + 90) bottom = Math.min(bottom, box.top - 8); }
    for (const id of ['morral', 'combate']) { const box = rect(id); if (box && box.left > width / 2) right = Math.min(right, box.left - 8); }
    const shortcuts = rect('compras-accesos');
    if (shortcuts && shortcuts.right < right - 180) left = Math.max(left, shortcuts.right + 8);
    const available = Math.max(160, right - left), panelWidth = Math.min(310, available, Math.max(160, width - 16));
    ui.root.style.left = Math.max(8, right - panelWidth) + 'px';
    ui.root.style.top = Math.min(top, Math.max(8, height - 100)) + 'px';
    ui.root.style.width = panelWidth + 'px';
    ui.root.style.setProperty('--combat-guide-max-height', Math.max(94, bottom - top - 50) + 'px');
    ui.root.classList.toggle('zone-combat-guide-compact', panelWidth < 260);
  }
  function focus(element) { if (!element || !element.focus) return; try { element.focus({ preventScroll: true }); } catch (error) { element.focus(); } }
  function close(ui) {
    if (!sameIdentity(ui)) { clear(ui.scene); return; }
    const ownedFocus = ui.card.contains && ui.card.contains(doc.activeElement);
    ui.card.hidden = true; ui.help.setAttribute('aria-expanded', 'false');
    if (ownedFocus) focus(ui.help);
  }
  function show(ui, manual) {
    if (!ui || !sameIdentity(ui)) { if (ui) clear(ui.scene); return false; }
    ui.card.hidden = false; ui.help.setAttribute('aria-expanded', 'true'); layout(ui);
    if (!markSeen(ui)) { clear(ui.scene); return false; }
    if (manual) focus(ui.title);
    return true;
  }
  function clear(scene) {
    const ui = active; if (!ui || (scene && ui.scene !== scene)) return;
    active = null;
    root.removeEventListener('resize', ui.reposition);
    root.removeEventListener('orientationchange', ui.reposition);
    doc.removeEventListener('visibilitychange', ui.reposition);
    if (ui.resizeObserver) ui.resizeObserver.disconnect();
    if (ui.mutationObserver) ui.mutationObserver.disconnect();
    ui.root.remove();
    if (ui.scene && ui.scene._combatGuide === ui) ui.scene._combatGuide = null;
  }
  function attach(scene, options) {
    clear();
    if (!scene || !doc.body) return false;
    options = options || {};
    const getters = {
      getUid: typeof options.getUid === 'function' ? options.getUid : () => null,
      getProjectRef: typeof options.getProjectRef === 'function' ? options.getProjectRef : () => 'golden-farm'
    };
    const account = identity(getters), key = keyFor(account);
    const element = doc.createElement('div'); element.id = 'zone-combat-guide-root';
    element.innerHTML = '<button type="button" id="zone-combat-guide-help" aria-controls="zone-combat-guide" aria-expanded="false"><span aria-hidden="true">?</span> Combate</button>' +
      '<section id="zone-combat-guide" role="region" aria-labelledby="zone-combat-guide-title" hidden>' +
      '<div class="zone-combat-guide-paper"><p class="zone-combat-guide-kicker">Zona Negra · Con ratón</p><h2 id="zone-combat-guide-title" tabindex="-1">Combate en 3 pasos</h2>' +
      '<ol><li><span class="zone-combat-guide-art zone-combat-guide-target" aria-hidden="true"><img src="assets/farm/rata_idle_0.png" alt="" width="50" height="35"><span class="zone-combat-guide-mouse">' + mouse + '</span></span><span><strong>Fija y ataca</strong><span>Clic derecho en un monstruo: ataque automático.</span></span></li>' +
      '<li><span class="zone-combat-guide-art" aria-hidden="true">' + movement + '</span><span><strong>Elige cómo moverte</strong><span><b>Perseguir:</b> te acercas. <b>Parado:</b> atacas sin moverte.</span></span></li>' +
      '<li><span class="zone-combat-guide-art zone-combat-guide-ground" aria-hidden="true"><span class="zone-combat-guide-mouse">' + mouse + '</span><svg viewBox="0 0 62 48"><path d="m30 28 17-9 13 8-17 10z" fill="#829056" stroke="#5e693e" stroke-width="2"/><path d="m38 24 12 10m0-10L38 34" stroke="#a8513f" stroke-width="3" stroke-linecap="round"/></svg></span><span><strong>Cancela el objetivo</strong><span>Clic derecho en el suelo vacío.</span></span></li></ol>' +
      '<button type="button" id="zone-combat-guide-understood">Entendido</button></div></section>';
    doc.body.appendChild(element);
    const ui = { scene, options: getters, identity: account, key, memoryKey: key || 'unidentified-browser-session', root: element,
      card: doc.getElementById('zone-combat-guide'), help: doc.getElementById('zone-combat-guide-help'), title: doc.getElementById('zone-combat-guide-title') };
    active = ui; scene._combatGuide = ui;
    // Native UI targets are also rejected by clicDeInterfaz in ForestScene. Keep keyboard
    // events away from Phaser: Space on a focused button must never start an attack.
    for (const eventName of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown', 'keyup']) element.addEventListener(eventName, event => {
      if (!sameIdentity(ui)) { clear(scene); return; }
      const keyboard = eventName === 'keydown' || eventName === 'keyup';
      // After dismissing, focus returns to Help. Movement and E still belong to the
      // game; only native button activation (Space/Enter) stays inside this control.
      if (keyboard && ui.card.hidden && event.target === ui.help && ![' ', 'Spacebar', 'Enter'].includes(event.key)) return;
      event.stopPropagation();
      if (eventName === 'keydown' && event.key === 'Escape' && !ui.card.hidden) { event.preventDefault(); close(ui); }
    });
    element.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); });
    ui.help.addEventListener('click', () => show(ui, true));
    doc.getElementById('zone-combat-guide-understood').addEventListener('click', () => close(ui));
    ui.reposition = () => layout(ui);
    root.addEventListener('resize', ui.reposition); root.addEventListener('orientationchange', ui.reposition); doc.addEventListener('visibilitychange', ui.reposition);
    const observed = ['hudbar', 'hud-flot', 'hotwrap', 'editbar', 'morral', 'combate', 'compras-accesos'].map(id => doc.getElementById(id)).filter(Boolean);
    if (root.ResizeObserver) { ui.resizeObserver = new root.ResizeObserver(ui.reposition); observed.forEach(node => ui.resizeObserver.observe(node)); }
    if (root.MutationObserver) { ui.mutationObserver = new root.MutationObserver(ui.reposition); observed.forEach(node => ui.mutationObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style'] })); }
    layout(ui);
    if (!alreadySeen(ui)) show(ui, false);
    return true;
  }
  function open(scene) { return !!active && (!scene || active.scene === scene) && show(active, true); }
  root.GoldenCombatGuide = Object.freeze({ attach, clear, open });
})(typeof window === 'undefined' ? globalThis : window);
