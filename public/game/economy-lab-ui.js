/* Interfaz local de prueba: nunca lee ni escribe las claves del guardado habitual. */
(function () {
  "use strict";
  const E = window.GoldenEconomyLab, KEY = "golden-economy-lab-v1", $ = id => document.getElementById(id);
  let state, broken = false, volatile = false, noticeTimer, busy = false;
  const money = n => (n / E.UNIT).toLocaleString("es-UY", { maximumFractionDigits: 3 });
  const safe = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const image = k => '<img alt="" src="assets/farm/' + k + '.png">';
  const now = () => Date.now() + state.offset;
  const duration = ms => ms <= 0 ? "Listo" : ms < E.HOUR ? Math.ceil(ms / E.MIN) + " min" : Math.floor(ms / E.HOUR) + " h " + Math.ceil((ms % E.HOUR) / E.MIN) + " min";
  function message(text) { clearTimeout(noticeTimer); $("message").textContent = text; $("message").classList.add("show"); noticeTimer = setTimeout(() => $("message").classList.remove("show"), 6000); }
  function read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return E.create(Date.now());
    const parsed = JSON.parse(raw); if (!E.valid(parsed)) throw new Error("Guardado de prueba incompatible o dañado");
    return parsed;
  }
  try { state = read(); } catch (e) {
    state = E.create(Date.now()); broken = true;
    message("No se pudo leer el guardado de prueba. No lo sobrescribí. Descargá una copia o elegí empezar otra prueba.");
  }
  function persist() {
    if (broken) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); volatile = false; }
    catch (e) { volatile = true; message("No se pudo guardar en este navegador. Descargá una copia antes de cerrar."); }
  }
  function focusKey(el) {
    if (!el || !el.dataset || !el.dataset.action) return null;
    return [el.dataset.action, el.dataset.id || "", el.dataset.key || ""];
  }
  function restoreFocus(key) {
    if (!key) return;
    const match = Array.from(document.querySelectorAll("[data-action]")).find(b => !b.disabled && b.dataset.action === key[0] && (b.dataset.id || "") === key[1] && (b.dataset.key || "") === key[2]);
    (match || document.querySelector('nav button[aria-pressed="true"]')).focus({ preventScroll: true });
  }
  async function act(a, fromKeyboard) {
    if (broken || busy) { if (broken) message("Primero resolvé el guardado de prueba. El original sigue conservado."); return; }
    busy = true;
    const job = () => {
      try { if (!volatile) state = read(); } catch (e) { broken = true; message("El guardado cambió y no se pudo leer. No se sobrescribió."); return; }
      a.op = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random();
      const result = E.dispatch(state, a, Date.now());
      if (result.ok) { state = result.state; persist(); }
      else message(result.error);
      render(); if (fromKeyboard) restoreFocus(fromKeyboard);
    };
    try {
      // Todas las pestañas del laboratorio usan el mismo candado local de escritura.
      if (navigator.locks) await navigator.locks.request(KEY, job);
      else job();
    } finally { busy = false; }
  }
  function replace(id, markup) { if ($(id).innerHTML !== markup) $(id).innerHTML = markup; }
  function render() {
    const focused = document.activeElement;
    const quantityFocus = focused && focused.dataset && focused.dataset.quantity;
    const t = now(); E.tick(state, t);
    const lv = E.level(state), cap = E.capacity(state, t), active = E.used(state), isVip = E.vip(state, t);
    $("silver").textContent = money(state.silver);
    $("capacity").textContent = active + " / " + cap;
    $("level").textContent = "Nivel " + lv + " · " + state.xp + " XP";
    $("vip").textContent = isVip ? "VIP · " + Math.ceil((state.vipUntil - t) / E.DAY) + " días" : "Free";
    $("clock").textContent = new Date(t).toLocaleString("es-UY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const ready = state.nodes.some(n => n.active && n.crop && n.readyAt <= t);
    $("goal").textContent = ready ? "Tu cosecha está lista. Recogela y elegí entre vender, guardar o exportar." : state.expansion ? "La expansión está en obra. Podés seguir produciendo mientras termina." : state.voucher ? "Tu expansión terminó: elegí el nodo básico incluido en Desarrollar." : !state.workshop ? "Comprá semillas, cultivá y juntá para construir la Herrería o elegir tu primera expansión." : active < cap ? "Tenés capacidad libre. Elegí qué producir con tu próximo nodo." : "Capacidad completa. Para especializarte, guardá un nodo y activá otro o comprá una expansión.";
    let html = state.nodes.filter(n => n.active).map(n => {
      const d = E.NODE[n.kind], planted = n.kind === "plot" && n.crop, crop = E.CROP[n.crop];
      const action = n.kind === "plot" && !planted ? "plant" : "collect";
      const can = n.kind === "plot" ? !planted ? (state.seeds[$("crop").value || "papa"] > 0) : n.readyAt <= t : n.charges > 0 && state.tools[d.tool] > 0;
      const label = action === "plant" ? "Sembrar" : n.kind === "plot" ? "Cosechar" : "Recoger 1";
      const status = n.kind === "plot" ? planted ? crop.label + " · " + duration(n.readyAt - t) : "Tierra libre" : n.charges + "/" + d.max + " cargas · " + (n.charges === d.max ? "lleno" : duration(n.nextAt - t));
      return '<article class="node">' + image(d.sprite) + '<h3>' + safe(d.label) + ' #' + n.id + '</h3><small>' + safe(status) + '</small><button data-action="' + action + '" data-id="' + n.id + '"' + (can ? "" : " disabled") + '>' + label + '</button><button class="secondary" data-action="store" data-id="' + n.id + '">Guardar</button></article>';
    }).join("");
    for (let i = active; i < cap; i++) html += '<div class="empty">Cupo libre<br>Elegí un nodo</div>';
    replace("farm", html);
    replace("stored", state.nodes.filter(n => !n.active).map(n => '<button data-action="activate" data-id="' + n.id + '"' + (active >= cap ? ' disabled' : '') + '>' + safe(E.NODE[n.kind].label) + ' #' + n.id + ' · Activar</button>').join("") || '<span class="sub">No hay nodos guardados.</span>');
    const c = E.expansionCost(state);
    $("expansion-note").textContent = state.expansion ? "Obra en marcha · " + duration(state.expansion.until - t) : "Expansión " + (state.expansions + 1) + "/16 · +1 cupo · " + money(c.silver) + " plata" + (c.madera ? " + " + c.madera + " madera + " + c.piedra + " piedra" : "") + " · obra " + ((state.expansions + 1) * 10) + " min";
    $("expand").disabled = !!state.expansion || state.expansions >= 16;
    $("voucher").textContent = state.voucher ? "Tenés " + state.voucher + " nodo básico incluido para elegir." : "Los nodos se compran dentro de tu capacidad disponible.";
    replace("node-shop", Object.entries(E.NODE).map(([k,d]) => '<div class="row">' + image(d.sprite) + '<div class="info"><b>' + d.label + '</b><small>1 cupo · nivel ' + d.level + ' · ' + money(d.price) + ' plata</small></div><button data-action="buyNode" data-key="' + k + '"' + (lv < d.level || active >= cap ? ' disabled' : '') + '>' + (state.voucher && k !== "bronze" ? "Elegir incluido" : "Comprar") + '</button></div>').join(""));
    const selected = $("crop").value;
    replace("crop", Object.entries(E.CROP).filter(([,d]) => d.level <= lv).map(([k,d]) => '<option value="' + k + '">' + d.label + ' · ' + state.seeds[k] + ' semillas</option>').join(""));
    if (selected && E.CROP[selected] && E.CROP[selected].level <= lv) $("crop").value = selected;
    replace("seed-shop", Object.entries(E.CROP).map(([k,d]) => '<div class="row"><div class="info"><b>' + d.label + '</b><small>Crece en ' + duration(d.cycle) + ' · tenés ' + state.seeds[k] + ' · nivel ' + d.level + '</small></div><button data-action="seed" data-key="' + k + '"' + (lv < d.level || state.silver < d.seed ? ' disabled' : '') + '>+1 · ' + money(d.seed) + '</button></div>').join(""));
    $("tools").textContent = "Hachas: " + state.tools.axe + " · picos: " + state.tools.pick + " · picos de bronce: " + state.tools.bronzePick;
    $("build").disabled = state.workshop;
    $("build").textContent = state.workshop ? "Herrería construida" : "Construir · 2 madera + 1 piedra + 10 plata";
    replace("jobs", state.jobs.map(j => '<p>' + safe(E.RES[j.key].label) + ' · ' + duration(j.until - t) + ' <button data-action="takeJob" data-id="' + j.id + '"' + (j.until > t ? ' disabled' : '') + '>Recoger</button></p>').join(""));
    $("market-budget").textContent = "Presupuesto de compra restante: " + money(5000000 - state.market.spent) + " plata hoy.";
    // Conservar la cantidad que el jugador está editando entre ticks y repintados.
    const quantities = {};
    document.querySelectorAll("[data-quantity]").forEach(el => quantities[el.dataset.quantity] = el.value);
    replace("market-list", Object.entries(E.RES).map(([k,d]) => {
      const q = E.quote(state, k, 1), qty = Math.max(1, Math.min(10000, Math.floor(Number(quantities[k]) || 1))), offer = E.quote(state, k, qty);
      return '<div class="row"><div class="info"><b>' + d.label + ' · ' + state.res[k] + '</b><small>Siguiente: ' + money(q.next) + ' · lote: ' + money(offer.total) + ' plata<br>Demanda restante: ' + q.maxQty + ' · comprar: ' + money(d.ask) + ' c/u</small></div><input type="number" min="1" max="10000" value="' + qty + '" data-quantity="' + k + '" aria-label="Cantidad de ' + d.label + '"><button data-action="sell" data-key="' + k + '"' + (state.res[k] < qty || offer.total > q.budget || qty > q.maxQty ? ' disabled' : '') + '>Vender</button><button data-action="buyResource" data-key="' + k + '"' + (state.silver < d.ask * qty ? ' disabled' : '') + '>Comprar</button></div>';
    }).join(""));
    $("export-quota").textContent = "Cupo usado: " + state.exported + "/" + (isVip ? 30 : 10) + " hoy · " + (isVip ? "VIP" : "Free");
    replace("export-list", Object.entries(E.EXPORTS).map(([k,w]) => '<div class="row"><div class="info"><b>' + E.RES[k].label + ' · tenés ' + state.res[k] + '</b><small>Consume ' + w + ' de cupo · +' + (10 * w) + ' puntos</small></div><button data-action="export" data-key="' + k + '"' + (state.res[k] < 1 || state.exported + w > (isVip ? 30 : 10) ? ' disabled' : '') + '>Entregar 1</button></div>').join(""));
    $("settlement").textContent = "Puntos pendientes: " + state.points + " · créditos ficticios liquidados: " + state.trialCredits;
    $("vip-trial").disabled = state.trialUsed;
    $("vip-expire").disabled = !isVip;
    $("save-status").textContent = broken ? "Guardado no legible: se conservó el original y las acciones están bloqueadas." : volatile ? "El guardado local falló. Descargá una copia." : "Guardado independiente en este navegador. No sincroniza con tu cuenta ni con otras computadoras.";
    replace("inventory", Object.entries(E.RES).filter(([k]) => state.res[k] > 0).map(([k,d]) => '<div>' + image(d.sprite) + safe(d.label) + ' <b>' + state.res[k] + '</b></div>').join("") || '<span class="sub">Tu bolsa está vacía. Elegí tu primer ciclo productivo.</span>');
    replace("events", state.events.slice().reverse().map(x => '<li>' + safe(x) + '</li>').join(""));
    if (quantityFocus && !document.contains(focused)) {
      const input = document.querySelector('[data-quantity="' + quantityFocus + '"]');
      if (input) input.focus({ preventScroll: true });
    }
  }
  document.addEventListener("click", ev => {
    const tab = ev.target.closest("[data-tab]");
    if (tab) {
      document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-pressed", b === tab ? "true" : "false"));
      document.querySelectorAll(".tab-panel").forEach(p => p.hidden = p.id !== "panel-" + tab.dataset.tab); return;
    }
    const b = ev.target.closest("[data-action]"); if (!b || b.disabled) return;
    const a = { type: b.dataset.action, id: Number(b.dataset.id), key: b.dataset.key, qty: 1 };
    if (a.type === "plant") a.key = $("crop").value;
    if (a.type === "buyNode") a.voucher = state.voucher > 0;
    if (a.type === "advance") a.ms = Number(b.dataset.ms);
    if (a.type === "sell" || a.type === "buyResource") a.qty = Number(document.querySelector('[data-quantity="' + a.key + '"]').value);
    act(a, ev.detail === 0 ? focusKey(b) : null);
  });
  document.addEventListener("change", ev => { if (ev.target.matches("[data-quantity], #crop")) render(); });
  $("download").onclick = () => {
    let raw; try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    const url = URL.createObjectURL(new Blob([broken && raw ? raw : JSON.stringify(state, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "golden-economia-prueba.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("reset").onclick = async () => {
    if (!confirm("¿Empezar otra partida económica de prueba? Se reemplaza sólo esta prueba local. Tu granja habitual no se toca. Podés descargar una copia antes.")) return;
    const reset = () => { broken = false; state = E.create(Date.now()); persist(); render(); };
    if (navigator.locks) await navigator.locks.request(KEY, reset); else reset();
  };
  window.addEventListener("storage", e => { if (e.key === KEY && !volatile) { try { state = read(); render(); } catch (err) { broken = true; message("El guardado de otra pestaña no es legible. Se bloqueó la escritura."); } } });
  render();
  setInterval(() => { if (!busy && !broken) { const key = focusKey(document.activeElement); render(); if (key) restoreFocus(key); } }, 1000);
})();
