/* Golden Farm · UI (overlay HTML sobre el canvas de Phaser) */
function $(id) { return document.getElementById(id); }
function setTxt(id, v) { const e = $(id); if (e) e.textContent = v; }

/* ---- toast / log ---- */
let toastT = null;
function toast(m) { const t = $("toast"); if (!t) return; t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1400); }
function log(m, k = "") { const b = $("log"); if (!b) return; const d = document.createElement("div"); d.className = "l" + (k ? " " + k : ""); d.textContent = m; b.appendChild(d); while (b.children.length > 30) b.removeChild(b.firstChild); b.scrollTop = b.scrollHeight; }

/* ---- overlays ---- */
function isOpen(id) { const e = $(id); return !!(e && e.classList.contains("show")); }
function anyOvOpen() { return !!document.querySelector(".ov.show"); }
const OV_REFRESH = { "ov-inv": () => refreshInv(), "ov-skills": () => refreshSkills(), "ov-equip": () => refreshEquip(),
  "ov-forge": () => refreshForge(), "ov-market": () => refreshMarket(), "ov-barn": () => refreshBarn(),
  "ov-cocina": () => refreshCooking(),
  "ov-altar": () => refreshAltar(),
  "ov-pass": () => refreshPass(),
  "ov-cofre": () => refreshChest(),
  "ov-config": () => refreshConfig(), "ov-lb": () => refreshLb(), "ov-daily": () => refreshDaily() };
// los overlays NO bloquean el juego: podés seguir moviéndote/interactuando con la ventana abierta
// sonido propio de cada edificio al abrir su ventana (pedido del diseñador)
const OV_SFX = { "ov-market": "shop", "ov-forge": "forge", "ov-barn": "door", "ov-cocina": "door", "ov-cofre": "door", "ov-daily": "coin", "ov-altar": "forge" };
function openOv(id) { const e = $(id); if (!e) return; e.classList.add("show"); if (window.sfx) sfx(OV_SFX[id] || "click"); if (OV_REFRESH[id]) OV_REFRESH[id](); }
function closeOv(id) { const e = $(id); if (e) e.classList.remove("show"); }
function closeAllOv() { document.querySelectorAll(".ov.show").forEach(e => e.classList.remove("show")); }

/* ---- HUD ---- */
/* --- celebración de subida de nivel (doc maestro 2/8): cartel + glow + partículas, con COLA --- */
const CELEB_Q = [];
let celebBusy = false;
function celebrate(ev) { CELEB_Q.push(ev); if (!celebBusy) nextCeleb(); }
function nextCeleb() {
  const ev = CELEB_Q.shift();
  if (!ev) { celebBusy = false; return; }
  celebBusy = true;
  const box = document.getElementById("celeb");
  if (!box) { toast(ev.title + (ev.sub ? " · " + ev.sub : "")); celebBusy = false; return; }
  const dur = ev.big ? 2600 : 1900;   // grande = fogonazo + confeti + más tiempo
  box.className = "";
  box.innerHTML = (ev.big ? '<div class="flash"></div>' : '') +
    '<div class="halo" style="animation:chalo ' + dur + 'ms ease-out forwards"></div>' +
    '<div class="card" style="animation:cpop .25s cubic-bezier(.34,1.56,.64,1), cvanish .45s ease-in ' + (dur - 450) + 'ms forwards">' +
    '<div class="shine"></div><div class="t">' + ev.title + '</div>' +
    (ev.sub ? '<div class="s">' + ev.sub + '</div>' : '') +
    (ev.reward ? '<div class="r">' + ev.reward + '</div>' : '') + '</div><div class="burst"></div>';
  const burst = box.querySelector(".burst"), n = ev.big ? 48 : 26;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * (ev.big ? 260 : 150);
    p.style.setProperty("--dx", Math.cos(a) * r + "px");
    p.style.setProperty("--dy", (Math.sin(a) * r * 0.7 - 30) + "px");
    p.style.setProperty("--fall", (40 + Math.random() * 90) + "px");
    p.style.animationDelay = (Math.random() * 0.15) + "s";
    p.style.animationDuration = (0.9 + Math.random() * 0.8) + "s";
    const sz = Math.random() < 0.5 ? 3 : 5; p.style.width = p.style.height = sz + "px";
    if (ev.big && Math.random() < 0.4) p.style.background = ["#8fd14f", "#6cc4ff", "#ff8f8f", "#d9a7ff"][Math.floor(Math.random() * 4)];   // confeti
    burst.appendChild(p);
  }
  if (window.sfx) { sfx("level"); if (ev.big) setTimeout(() => sfx("level"), 350); }   // fanfarria más larga en las grandes
  setTimeout(() => { box.className = "hidden"; box.innerHTML = ""; setTimeout(nextCeleb, 250); }, dur);
}
window.celebrate = celebrate;

function refreshHud() { setTxt("s-level", G.level); setTxt("s-prestige", G.prestige); setTxt("s-plata", fmt(G.plata)); setTxt("s-golden", fmt(G.golden)); setTxt("s-week", G.week); setTxt("s-hp", Math.ceil(G.hp) + "/" + G.hpMax); refreshCombatBar(); if (typeof checkCooking === "function") checkCooking(); if (typeof refreshHotbar === "function") refreshHotbar(); }
function refreshCombatBar() {   // doc maestro 2/8: insignia de nivel + relleno dorado + "XP actual / necesaria"
  const el = document.getElementById("c-lvl"); if (!el || typeof combatInfo !== "function") return;
  const ci = combatInfo();
  el.textContent = ci.lvl;
  setTxt("c-xp", fmt(ci.into) + "/" + fmt(ci.need));
  const f = document.getElementById("c-fill"); if (f) f.style.width = Math.min(100, ci.into / ci.need * 100).toFixed(1) + "%";
}

/* ---- inventario por casillas (todo es ítem; arrastrar para reordenar) ---- */
let dndActive = false;   // no re-renderizar mientras se arrastra
function durColor(pct) { return pct > 50 ? "#8fd06a" : pct > 20 ? "#e0c76a" : "#e0705a"; }
function itemView(d) {
  if (!d) return null;
  if (d.kind === "tool") {
    if (d.key === "axe") return { sprite: "axe", emoji: "🔧", label: "Hacha · 1 uso cada una · tenés " + toolCount("axe"), dur: null };
    if (d.key === "rod") return { sprite: "fishing_rod", emoji: "🔧", label: "Caña · 1 uso cada una · tenés " + toolCount("rod"), dur: null };
    if (d.key === "sword") return { sprite: "sword", emoji: "⚔️", label: "Espada de Hierro · durabilidad " + toolDur("sword") + "/" + TOOL_DEF.sword.max, dur: Math.round(toolDur("sword") / TOOL_DEF.sword.max * 100) };
    if (d.key === "sword_wood") return { sprite: "sword_wood", emoji: "🗡️", label: "Espada de Madera · durabilidad " + toolDur("sword_wood") + "/" + TOOL_DEF.sword_wood.max, dur: Math.round(toolDur("sword_wood") / TOOL_DEF.sword_wood.max * 100) };
    if (d.key === "bow") return { sprite: "bow", emoji: "🏹", label: "Arco · durabilidad " + toolDur("bow") + "/" + TOOL_DEF.bow.max, dur: Math.round(toolDur("bow") / TOOL_DEF.bow.max * 100) };
    return null;   // la azada se retiró del juego (31/7)
  }
  if (d.kind === "arm") {
    const w = ARM_DEF[d.key], own = G.weapons && G.weapons[d.key];
    if (!w || !own) return null;
    return { sprite: ARM_TIPO_DEF[w.tipo].sprite, emoji: "⚔️", label: w.label + " · daño " + w.min + "–" + w.max + " · durabilidad " + own.dur + "/" + w.dur, dur: Math.round(own.dur / w.dur * 100) };
  }
  if (d.kind === "pick") { const pd = PICK_DEF[d.key]; const glow = d.key === "diamond" ? "glow-cyan" : (d.key === "netherite" ? "glow-fire" : (d.key === "gold" ? "glow-gold" : "")); return { sprite: pd.sprite, emoji: "⛏️", glow, label: pd.label + " · 1 uso cada uno · tenés " + pickCount(d.key), dur: null }; }
  if (d.kind === "res") return { sprite: resSprite(d.key), emoji: RES_EMOJI[d.key], label: RES_LABEL[d.key], dur: null };
  if (d.kind === "seed") { const cd = CROP_DEF[d.key]; return { sprite: "seed_" + d.key, emoji: cd.emoji, label: cd.label + " (semilla)", dur: null }; }
  if (d.kind === "fish") { const f = FISH_DEF[d.key]; const glow = { raro: "glow-blue", epico: "glow-purple", legendario: "glow-gold" }[d.key] || ""; return { sprite: f ? f.sprite : null, emoji: f ? f.emoji : "🐟", glow, label: f ? f.label : "Pez", dur: null }; }
  if (d.kind === "dish") { const r = RECIPE_DEF[d.key]; return { sprite: r ? r.sprite : null, emoji: r ? r.emoji : "🍲", label: r ? r.label + " · clic para comer (" + dishDesc(r) + ")" : "Plato", dur: null }; }
  if (d.kind === "chest") return { sprite: "cofre", emoji: "📦", label: "Cofre depósito · clic para colocarlo en la granja", dur: null };
  return { sprite: null, emoji: "?", label: "", dur: null };
}
// si el sprite existe lo muestra; si falla la carga, cae al emoji (sin romper)
function itemIcon(v) {
  const cls = v.glow ? ` class="${v.glow}"` : "";
  if (v.sprite && v.emoji) return `<img${cls} src="${GF.spr(v.sprite)}" onerror="this.outerHTML='<span class=&quot;em&quot;>${v.emoji}</span>'">`;
  if (v.sprite) return `<img${cls} src="${GF.spr(v.sprite)}">`;
  return `<span class="em">${v.emoji}</span>`;
}
function durBar(v) { return (v.dur != null && v.dur < 100) ? `<span class="durb"><i style="width:${Math.max(0, v.dur)}%;background:${durColor(v.dur)}"></i></span>` : ""; }
// ícono chico de recurso en línea de texto (costos, requisitos); cae al emoji si falla
// 31/7: title = leyenda al pasar el cursor (los iconitos son muy chicos para reconocerlos a ojo)
function resIc(k) { const s = resSprite(k), nm = (CROP_DEF[k] && CROP_DEF[k].label) || RES_LABEL[k] || k; return s ? `<img class="ric" title="${nm}" src="${GF.spr(s)}" onerror="this.outerHTML='${RES_EMOJI[k] || "?"}'">` : `<span title="${nm}">${RES_EMOJI[k] || "?"}</span>`; }
function fishIc(k) { const f = FISH_DEF[k], nm = f ? f.label : "Pez"; return f && f.sprite ? `<img class="ric" title="${nm}" src="${GF.spr(f.sprite)}" onerror="this.outerHTML='${f.emoji}'">` : `<span title="${nm}">${f ? f.emoji : "🐟"}</span>`; }
function coinIc(cur) { const nm = cur === "esencia" ? "Esencia" : "Plata"; return `<img class="ric" title="${nm}" src="${GF.spr(cur === "esencia" ? "coin_esencia" : "coin_plata")}" onerror="this.outerHTML='${cur === "esencia" ? "✨" : "🪙"}'">`; }
function invCellHtml(d, i, rem, zone) {
  if (!d) return `<div class="slot" data-slot="${i}" data-zone="${zone}"></div>`;
  let cnt = "";
  if (d.kind === "res" || d.kind === "seed" || d.kind === "fish" || d.kind === "dish" || d.kind === "chest" || (d.kind === "tool" && (d.key === "axe" || d.key === "rod")) || d.kind === "pick") { const k = d.kind + ":" + d.key; const n = Math.min(99, rem[k] || 0); rem[k] = (rem[k] || 0) - n; cnt = `<span class="cnt">${fmt(n)}</span>`; }
  const v = itemView(d);
  const sel = (d.kind === "seed" && G.selSeed === d.key) ? " sel" : "";
  const eq = (d.kind === "pick" && G.picks.eq === d.key) ? " eq" : "";
  return `<div class="slot filled${sel}${eq}" draggable="true" data-slot="${i}" data-zone="${zone}" title="${v.label}">${itemIcon(v)}${cnt}${durBar(v)}</div>`;
}
function bindTrash() {
  const tr = $("inv-trash"); if (!tr || tr._bound) return; tr._bound = true;
  tr.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; tr.classList.add("hot"); });
  tr.addEventListener("dragleave", () => tr.classList.remove("hot"));
  tr.addEventListener("drop", e => { e.preventDefault(); tr.classList.remove("hot"); dndActive = false; dndDrop(e.dataTransfer.getData("text/plain"), "trash", 0); });
}
function refreshInv() {
  syncSlots();
  bindTrash();
  const cap = invSlots(), rem = {};
  ITEM_RES_ORDER.forEach(r => rem["res:" + r] = Math.floor(G.res[r] || 0));
  CROP_ORDER.forEach(s => rem["seed:" + s] = Math.floor(G.seeds[s] || 0));
  FISH_ORDER.forEach(f => rem["fish:" + f] = Math.floor((G.fish && G.fish[f]) || 0));
  RECIPE_ORDER.forEach(d => rem["dish:" + d] = Math.floor((G.dishes && G.dishes[d]) || 0));
  rem["chest:cofre"] = (typeof chestsInBag === "function") ? chestsInBag() : 0;
  rem["tool:axe"] = toolCount("axe"); rem["tool:rod"] = toolCount("rod");   // herramientas apilables
  PICK_ORDER.forEach(id => rem["pick:" + id] = pickCount(id));
  let html = "";
  for (let i = 0; i < cap; i++) html += invCellHtml(G.slots[i], i, rem, "inv");
  $("inv-slots").innerHTML = html;
  const used = canonicalStacks().length, cap2 = $("inv-cap"); if (cap2) cap2.textContent = `Bolsa: ${used}/${cap} · recursos y semillas apilan hasta 99`;
  const ss = $("inv-selseed"); if (ss && CROP_DEF[G.selSeed]) ss.innerHTML = `Plantando: <img class="ric" src="${GF.spr("seed_" + G.selSeed)}" onerror="this.outerHTML='${CROP_DEF[G.selSeed].emoji}'"> ` + CROP_DEF[G.selSeed].label + " · clic una semilla para cambiar";
  renderInvExpand();
  bindZoneDnD($("inv-slots"), "inv");
  $("inv-slots").querySelectorAll("[data-slot]").forEach(c => c.addEventListener("click", () => invCellClick(+c.dataset.slot)));
  refreshHotbar();
}
function invCellClick(i) {
  const d = G.slots[i]; if (!d) return;
  if (d.kind === "seed") { if (!cropUnlocked(d.key)) { toast("Necesitás Cultivo nivel " + CROP_DEF[d.key].lvl); return; } selectSeed(d.key); toast("Plantando: " + CROP_DEF[d.key].label); }
  else if (d.kind === "arm") {
    if (G.weapons) delete G.weapons[d.key];
    if (G.gear.arma === d.key) G.gear.arma = null;
    toast("Tiraste " + ((ARM_DEF[d.key] || {}).label || "el arma"));
    if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-forge")) refreshForge();
  }
  else if (d.kind === "pick") { if (G.picks.owned[d.key]) equipPick(d.key); }
  else if (d.kind === "dish") eatDish(d.key);
  else if (d.kind === "chest") { if (window.FARM && FARM.placeChestFromBag) FARM.placeChestFromBag(); }
}

// botón para ampliar la bolsa (+6): primera fila con minerales, siguientes con plata
function renderInvExpand() {
  const el = $("inv-expand"); if (!el) return;
  const nc = nextInvCost();
  if (!nc) { el.innerHTML = '<span class="exmax">Bolsa al máximo (' + invSlots() + ')</span>'; return; }
  const label = nc.type === "res" ? Object.keys(nc.cost).map(k => resIc(k) + nc.cost[k]).join(" ") : coinIc("plata") + " " + fmt(nc.cost);
  const aff = nc.type === "res" ? canAfford(nc.cost) : G.plata >= nc.cost;
  el.innerHTML = '<button class="green sm" id="inv-expbtn" ' + (aff ? "" : "disabled") + '>Ampliar +5 · ' + label + "</button>";
  const b = $("inv-expbtn"); if (b) b.onclick = expandInv;
}

/* ---- barra de accesos directos (hotbar de 10 huecos) ---- */
function hotItemExists(d) {
  if (!d) return false;
  if (d.kind === "tool") { if (d.key === "sword") return G.swordOwned; if (d.key === "bow") return G.bowOwned; return !toolLost(d.key); }
  if (d.kind === "pick") return !!G.picks.owned[d.key];
  if (d.kind === "res") return (G.res[d.key] || 0) > 0;
  if (d.kind === "seed") return (G.seeds[d.key] || 0) > 0;
  if (d.kind === "fish") return ((G.fish && G.fish[d.key]) || 0) > 0;
  if (d.kind === "dish") return ((G.dishes && G.dishes[d.key]) || 0) > 0;
  return true;   // herramientas siempre están
}
function hotCellHtml(d, i) {
  const num = `<span class="hk">${i === 9 ? 0 : i + 1}</span>`;
  const on = (G.hotSel === i) ? " on" : "";
  if (!d) return `<div class="hcell${on}" data-slot="${i}" data-zone="hot">${num}</div>`;
  const v = itemView(d);
  let cnt = ""; if (d.kind === "res") cnt = `<span class="cnt">${fmt(G.res[d.key] || 0)}</span>`; if (d.kind === "seed") cnt = `<span class="cnt">${fmt(G.seeds[d.key] || 0)}</span>`; if (d.kind === "fish") cnt = `<span class="cnt">${fmt((G.fish && G.fish[d.key]) || 0)}</span>`; if (d.kind === "dish") cnt = `<span class="cnt">${fmt((G.dishes && G.dishes[d.key]) || 0)}</span>`;
  const sel = (d.kind === "seed" && G.selSeed === d.key) ? " sel" : "";
  const eq = (d.kind === "pick" && G.picks.eq === d.key) ? " eq" : "";
  const ghost = hotItemExists(d) ? "" : " ghost";
  return `<div class="hcell filled${on}${sel}${eq}${ghost}" draggable="true" data-slot="${i}" data-zone="hot" title="${v.label}">${num}${itemIcon(v)}${cnt}${durBar(v)}</div>`;
}
function refreshHotbar() {
  if (dndActive) return;
  const box = $("hotbar"); if (!box) return;
  ensureHotbarDefaults();
  syncSlots();
  if (!Array.isArray(G.hotbar)) G.hotbar = [];
  while (G.hotbar.length < 10) G.hotbar.push(null);
  let html = ""; for (let i = 0; i < 10; i++) html += hotCellHtml(G.hotbar[i], i);
  box.innerHTML = html;
  bindZoneDnD(box, "hot");
  box.querySelectorAll("[data-slot]").forEach(c => {
    c.addEventListener("click", () => hotSelect(+c.dataset.slot));
    // clic derecho: quitar el objeto de la barra (detalless.docx)
    c.addEventListener("contextmenu", (e) => { e.preventDefault(); const i = +c.dataset.slot; if (G.hotbar[i]) { G.hotbar[i] = null; toast("Quitado de la barra"); refreshHotbar(); } });
  });
}
// seleccionar hueco de la hotbar (= herramienta "en mano"); equipa pico / elige semilla si corresponde
function hotSelect(i) {
  if (i < 0 || i > 9) return;
  G.hotSel = i;
  const d = G.hotbar[i];
  if (d) {
    if (d.kind === "pick" && G.picks.owned[d.key]) equipPick(d.key);
    else if (d.kind === "seed" && cropUnlocked(d.key)) selectSeed(d.key);
    else if (d.kind === "dish") eatDish(d.key);
  }
  const v = d ? itemView(d) : null;
  toast(v ? "" + v.label : "Hueco " + (i === 9 ? 0 : i + 1) + " vacío");
  refreshHotbar();
}

/* ---- drag & drop de casillas (bolsa ↔ hotbar) ---- */
function bindZoneDnD(container, zone) {
  if (!container) return;
  container.querySelectorAll("[data-slot]").forEach(cell => {
    cell.addEventListener("dragstart", e => { dndActive = true; e.dataTransfer.setData("text/plain", zone + ":" + cell.dataset.slot); e.dataTransfer.effectAllowed = "move"; });
    cell.addEventListener("dragend", () => { dndActive = false; });
    cell.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
    cell.addEventListener("drop", e => { e.preventDefault(); dndActive = false; dndDrop(e.dataTransfer.getData("text/plain"), zone, +cell.dataset.slot); });
  });
}
function dndDrop(src, tz, ti) {
  if (!src) return; const ci = src.indexOf(":"), sz = src.slice(0, ci), si = +src.slice(ci + 1);
  if (sz === "inv" && tz === "inv") { const a = G.slots[si]; G.slots[si] = G.slots[ti]; G.slots[ti] = a; }
  else if (sz === "inv" && tz === "hot") { const d = G.slots[si]; if (d) G.hotbar[ti] = { kind: d.kind, key: d.key }; }
  else if (sz === "hot" && tz === "hot") { const a = G.hotbar[si]; G.hotbar[si] = G.hotbar[ti]; G.hotbar[ti] = a; }
  else if (sz === "hot" && tz === "inv") { G.hotbar[si] = null; }
  else if (tz === "trash") {   // tirar a la basura (detalless.docx) — con confirmación (30/7)
    if (sz === "hot") { G.hotbar[si] = null; toast("Quitado de la barra"); }
    else { const d = G.slots[si]; if (d) {
      const inf = trashInfo(d);
      if (!inf) toast("Eso no se puede tirar");
      else if (inf.n > 0) askConfirm("¿Seguro que quieres tirar " + inf.n + " × " + inf.lbl + "? No se puede recuperar.", () => { trashStack(d); if (isOpen("ov-inv")) refreshInv(); else refreshHotbar(); });
    } }
  }
  if (isOpen("ov-inv")) refreshInv(); else refreshHotbar();
}
// cartel de confirmación (papelera, desbloqueo de parcelas, etc.)
// opts: { title, yes, no, yesClass, noClass } — por defecto el estilo de la papelera
function askConfirm(msg, onYes, opts) {
  opts = opts || {};
  const ov = $("ov-confirm"); if (!ov) { onYes(); return; }
  const tt = $("cf-title"); if (tt) tt.textContent = opts.title || "Tirar a la papelera";
  const m = $("cf-msg"); if (m) m.textContent = msg;
  ov.classList.add("show");
  const yes = $("cf-yes"), no = $("cf-no");
  if (yes) { yes.textContent = opts.yes || "Tirar"; yes.className = opts.yesClass || "red"; yes.onclick = () => { ov.classList.remove("show"); onYes(); }; }
  if (no) { no.textContent = opts.no || "Cancelar"; no.className = (opts.noClass || "ghost") + " sm"; no.onclick = () => ov.classList.remove("show"); }
}
// qué se tiraría de una pila (cantidad + nombre) — null si no se puede tirar
function trashInfo(d) {
  if (d.kind === "arm")  return { n: 1, lbl: (ARM_DEF[d.key] || {}).label || "arma" };
  if (d.kind === "res")  return { n: Math.min(99, Math.floor(G.res[d.key] || 0)), lbl: RES_LABEL[d.key] || d.key };
  if (d.kind === "seed") return { n: Math.min(99, Math.floor(G.seeds[d.key] || 0)), lbl: "semillas de " + (CROP_DEF[d.key] ? CROP_DEF[d.key].label : d.key) };
  if (d.kind === "fish") return { n: Math.min(99, Math.floor((G.fish && G.fish[d.key]) || 0)), lbl: (FISH_DEF[d.key] ? FISH_DEF[d.key].label : "peces") };
  if (d.kind === "dish") return { n: Math.min(99, Math.floor((G.dishes && G.dishes[d.key]) || 0)), lbl: (RECIPE_DEF[d.key] ? RECIPE_DEF[d.key].label : "platos") };
  // herramientas y picos SÍ se tiran (pedido del diseñador 31/7); apilables: se tira la pila
  if (d.kind === "tool") {
    if (d.key === "axe" || d.key === "rod") return { n: Math.min(99, toolCount(d.key)), lbl: TOOL_DEF[d.key].label };
    return { n: 1, lbl: TOOL_DEF[d.key] ? TOOL_DEF[d.key].label : "la herramienta" };
  }
  if (d.kind === "pick") return { n: Math.min(99, pickCount(d.key)), lbl: PICK_DEF[d.key] ? PICK_DEF[d.key].label : "el pico" };
  return null;
}
// tirar una pila de recursos/semillas/pescados (las herramientas no se tiran)
function trashStack(d) {
  if (window.sfx) sfx("trash");
  if (d.kind === "res")  { const n = Math.min(99, Math.floor(G.res[d.key] || 0));  if (n <= 0) return; G.res[d.key] -= n;  toast("Tiraste " + n + " " + RES_LABEL[d.key]); }
  else if (d.kind === "seed") { const n = Math.min(99, Math.floor(G.seeds[d.key] || 0)); if (n <= 0) return; G.seeds[d.key] -= n; toast("Tiraste " + n + " semillas"); }
  else if (d.kind === "fish") { const n = Math.min(99, Math.floor((G.fish && G.fish[d.key]) || 0)); if (n <= 0) return; G.fish[d.key] -= n; toast("Tiraste " + n + " peces"); }
  else if (d.kind === "dish") { const n = Math.min(99, Math.floor((G.dishes && G.dishes[d.key]) || 0)); if (n <= 0) return; G.dishes[d.key] -= n; toast("Tiraste " + n + " platos"); }
  else if (d.kind === "tool") {   // herramientas y armas (pedido del diseñador 31/7)
    if (d.key === "sword") { G.swordOwned = false; delete G.tools.sword; if (G.gear.arma === "sword") G.gear.arma = null; }
    else if (d.key === "sword_wood") { G.swordWoodOwned = false; delete G.tools.sword_wood; if (G.gear.arma === "sword_wood") G.gear.arma = null; }
    else if (d.key === "bow") { G.bowOwned = false; delete G.tools.bow; if (G.gear.arma === "bow") G.gear.arma = null; }
    else if (d.key === "axe" || d.key === "rod") { const n = Math.min(99, toolCount(d.key)); G.tools[d.key] = toolCount(d.key) - n; }   // tira la pila (hasta 99)
    G.hotbar = G.hotbar.map(h => (h && h.kind === "tool" && h.key === d.key && toolDur(d.key) <= 0) ? null : h);
    toast("Tiraste " + (TOOL_DEF[d.key] ? TOOL_DEF[d.key].label : "la herramienta"));
    if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-forge")) refreshForge();
  }
  else if (d.kind === "pick") {
    const n = Math.min(99, pickCount(d.key));
    G.picks.dur[d.key] = pickCount(d.key) - n;
    if (G.picks.dur[d.key] <= 0) { delete G.picks.owned[d.key]; delete G.picks.dur[d.key]; if (G.picks.eq === d.key) G.picks.eq = PICK_ORDER.find(id => G.picks.owned[id]) || null; G.hotbar = G.hotbar.map(h => (h && h.kind === "pick" && h.key === d.key) ? null : h); }
    toast("Tiraste " + n + " × " + (PICK_DEF[d.key] ? PICK_DEF[d.key].label : "pico"));
    if (isOpen("ov-forge")) refreshForge();
  }
  else { toast("Eso no se puede tirar"); return; }
  syncSlots(); if (typeof saveFarm === "function") saveFarm();
}

/* ---- skills ---- */
function refreshSkills() {
  $("sk-avg").innerHTML = "Nivel medio: <b>" + avgSkillLevel().toFixed(1) + "</b>";
  $("sk-grid").innerHTML = SKILL_DEFS.map(([k, ic, nm]) => {
    let inf;
    if (k === "cooking") { const l = cookLevel(), xp = G.skills.cooking || 0, nx = COOK_LVLS[l + 1]; inf = { lvl: l, into: xp - COOK_LVLS[l], need: nx != null ? nx - COOK_LVLS[l] : (xp - COOK_LVLS[l] || 1) }; }
    else inf = skillInfo(G.skills[k]);
    const pct = Math.round(inf.into / inf.need * 100); const soon = (k === "range" && G.skills[k] === 0) ? " · próximamente" : "";
    return `<div class="skrow"><span class="ic"><img class="skic" src="${GF.spr("sk_" + k)}" onerror="this.outerHTML='${ic}'"></span><div class="body"><div class="nm"><span>${nm}</span><span class="lv">Nv. ${inf.lvl}</span></div><div class="skbar"><i style="width:${pct}%"></i></div><div class="xp">${fmt(inf.into)}/${fmt(inf.need)} XP${soon}</div></div></div>`; }).join("");
}

/* ---- equipo (slots estilo RPG; armadura/armas llegan con el combate) ---- */
function refreshEquip() {
  const box = $("eq-grid");
  if (box) box.innerHTML = "";   // viernes (2): fuera el cinturón de herramientas del panel de Equipo
  // slots de combate: sin títulos — silueta del objeto cuando está vacío, sprite real cuando está equipado
  const SIL = { "eq-casco": "sil_casco", "eq-armadura": "sil_armadura", "eq-botas": "sil_botas", "eq-escudo": "sil_escudo", "eq-arma": "sil_arma", "eq-municion": "sil_municion" };
  const fill = (id, on, html, tip) => { const el = $(id); if (!el) return; el.classList.toggle("ghost", !on); el.title = tip || ""; el.innerHTML = on ? html : `<img class="eqsil" src="${GF.spr(SIL[id])}" onerror="this.remove()">`; };
  const spIc = (sprite, em) => `<img class="eqimg" src="${GF.spr(sprite)}" onerror="this.outerHTML='${em}'">`;
  const gearSlot = (id, slot, nm) => { const g = G.gear && G.gear[slot]; const gd = g && GEAR_DEF[g]; fill(id, !!gd, gd ? spIc(gd.sprite, gd.emoji) : "", gd ? gd.label + " · defensa +" + gd.def : nm); };
  gearSlot("eq-casco", "casco", "Casco");
  gearSlot("eq-armadura", "armadura", "Armadura");
  gearSlot("eq-botas", "botas", "Botas");
  gearSlot("eq-escudo", "escudo", "Escudo");
  // arma: se EQUIPA/CAMBIA con clic en el slot (detalles jueves) — espada ↔ arco ↔ nada
  const arma = G.gear.arma;
  const armaDef = arma && ARM_DEF[arma];
  fill("eq-arma", !!armaDef, armaDef ? spIc(ARM_TIPO_DEF[armaDef.tipo].sprite, "") : "",
    armaDef ? armaDef.label + " equipada · clic para cambiar" : "Arma · clic para equipar");
  const armaEl = $("eq-arma");
  if (armaEl) armaEl.onclick = () => {
    const opts = [null]; ARM_ORDER.forEach(id => { if (G.weapons && G.weapons[id]) opts.push(id); });
    if (opts.length === 1) { toast("No tenés armas — crafteálas en la Herrería"); return; }
    G.gear.arma = opts[(opts.indexOf(G.gear.arma) + 1) % opts.length];
    toast(G.gear.arma ? ARM_DEF[G.gear.arma].label + " equipada" : "Arma desequipada");
    refreshEquip(); if (typeof syncSlots === "function") syncSlots(); if (typeof saveFarm === "function") saveFarm();
  };
  // munición: las flechas se equipan a mano con clic (ya no se autoequipan al craftear)
  const fl = (G.res && G.res.flecha) || 0;
  const munOn = !!G.gear.municion && fl > 0;
  fill("eq-municion", munOn, spIc("res_flecha", "") + '<b class="eqcnt">' + fmt(fl) + "</b>",
    munOn ? fl + " flechas equipadas · clic para desequipar" : (fl > 0 ? "Munición · clic para equipar tus " + fl + " flechas" : "Munición (crafteá flechas en la Herrería)"));
  const munEl = $("eq-municion");
  if (munEl) munEl.onclick = () => {
    if (fl <= 0) { toast("No tenés flechas — crafteálas en la Herrería"); return; }
    G.gear.municion = !G.gear.municion;
    toast(G.gear.municion ? "Flechas equipadas" : "Flechas desequipadas");
    refreshEquip(); if (typeof saveFarm === "function") saveFarm();
  };
  const ed = $("eq-def"); if (ed) ed.textContent = "Defensa total: " + gearDefTotal();
}

/* ---- cofre diario ---- */
function refreshDaily() {
  const box = $("dy-locks"); if (!box || typeof dailyState !== "function") return;
  const st = dailyState();
  const claimed = (G.daily && G.daily.day) || 0;
  const base = st.claimable ? st.day - 1 : claimed;   // días ya cobrados de esta racha
  $("dy-banner").innerHTML = st.claimable
    ? "Día <b>" + st.day + "</b> de 7 — reclamá tu recompensa de hoy."
    : "Día <b>" + (claimed || 1) + "</b> de 7 reclamado — volvé mañana.";
  box.innerHTML = DAILY_REWARDS.map((r, i) => {
    const d = i + 1;
    let cls = "fut", ic = "";
    if (d <= base) { cls = "done"; ic = ""; }
    else if (st.claimable && d === st.day) { cls = "now"; ic = `<img class="dyimg" src="${GF.spr("chest_daily")}" onerror="this.outerHTML='🎁'">`; }
    return `<div class="dylock ${cls}" title="${r.label}"><div class="ic">${ic}</div><div class="dl">Día ${d}</div></div>`;
  }).join("");
  const idx = (st.claimable ? st.day : Math.max(1, claimed)) - 1;
  $("dy-reward").innerHTML = (st.lost ? '<span class="bad">Perdiste la racha — volvés al Día 1.</span>' : "")
    + (st.claimable ? "Hoy: " : "Reclamado: ") + DAILY_REWARDS[idx].label
    + (st.lost ? '<br><button class="ghost sm" id="dy-recover">Recuperar racha · ' + STREAK_RECOVER_COST + ' ' + coinIc("esencia") + '</button>' : "");
  const rec = $("dy-recover"); if (rec) rec.onclick = () => recoverStreak();
  const b = $("dy-claim");
  if (b) { b.disabled = !st.claimable; b.textContent = st.claimable ? "Reclamar " : "Vuelve mañana"; }
}

/* ---- sembrado rápido: rueda de semillas (clic derecho en parcela seca) ---- */
function showSeedWheel(px, py, plot) {
  const w = $("seedwheel"); if (!w) return;
  const opts = CROP_ORDER.filter(k => cropUnlocked(k) && (G.seeds[k] || 0) > 0);
  if (!opts.length) { toast("No tenés semillas — comprá en la Tienda"); return; }
  const c = w.querySelector(".swc");
  c.style.left = px + "px"; c.style.top = py + "px";
  const R = 62;
  c.innerHTML = opts.map((k, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / opts.length;
    const x = Math.round(Math.cos(a) * R), y = Math.round(Math.sin(a) * R);
    const cd = CROP_DEF[k];
    return `<div class="swi" data-k="${k}" title="${cd.label} · crece en ${fmtSecs(cd.grow)}" style="left:${x}px;top:${y}px"><img class="swimg" src="${GF.spr("seed_" + k)}" onerror="this.outerHTML='<span>${cd.emoji}</span>'"><b>×${G.seeds[k]}</b></div>`;
  }).join("") + '<div class="swi center" style="left:0;top:0"><span></span></div>';
  w.classList.add("show");
  c.querySelectorAll(".swi[data-k]").forEach(el => el.onclick = (ev) => {
    ev.stopPropagation();
    G.selSeed = el.dataset.k; hideSeedWheel();
    if (window.FARM && plot) { FARM.pendingObj = plot; if (FARM.goTo) FARM.goTo(plot.cx, plot.by + 18); else FARM.moveTarget = { x: plot.cx, y: plot.by + 18 }; }
    if (isOpen("ov-inv")) refreshInv();
    if (typeof refreshHotbar === "function") refreshHotbar();
  });
}
function hideSeedWheel() { const w = $("seedwheel"); if (w) w.classList.remove("show"); }

/* ---- herrería: pestaña Craftear (picos sin tener + armas + flechas) y pestaña Reparar (todo lo tuyo) ---- */
function refreshForge() {
  const eq = G.picks.eq;
  let craft = "", repair = "";
  // picos APILABLES (31/7): cada uno es 1 uso; craftear suma al stock
  PICK_ORDER.forEach(id => {
    const pd = PICK_DEF[id], n = pickCount(id), isEq = eq === id && n > 0;
    const mineEmo = ORE_ORDER.filter(o => ORE_DEF[o].tier <= pd.mineTier).map(o => resIc(o)).join("");
    const img = '<img src="' + GF.spr(pd.sprite) + '">';
    const costStr = Object.keys(pd.cost).map(k => resIc(k) + " " + pd.cost[k]).join(" · ") + (pd.plata ? " · " + coinIc("plata") + " " + pd.plata : "");
    const afford = canAfford(pd.cost) && (!pd.plata || G.plata >= pd.plata);
    let btns = '<button class="green sm" ' + (afford ? "" : "disabled") + ' data-craft="' + id + '">Craftear</button>';
    if (n > 0 && !isEq) btns += '<button class="ghost sm" data-equip="' + id + '">Equipar</button>';
    craft += '<div class="forge-row ' + (isEq ? "eq" : "") + '"><div class="fic">' + img + '</div><div class="finfo"><div class="fnm">' + pd.label + (isEq ? ' <span class="tag">equipado</span>' : "") + '</div><div class="fds">Mina: ' + mineEmo + ' · 1 uso c/u · tenés ' + n + '</div><div class="fds">Costo: ' + costStr + '</div></div><div class="fbtns">' + btns + "</div></div>";
  });
  // herramientas consumibles (modelo SFL 31/7): hacha y caña se craftean baratas y se rompen (sin reparación)
  craft += '<div class="shophead">Herramientas</div>';
  ["axe", "rod"].forEach(id => {
    const td = TOOL_DEF[id], tc = TOOL_CRAFT[id], n = toolCount(id);
    const cs = Object.keys(tc.cost).map(k => resIc(k) + " " + tc.cost[k]).join(" · ") + (tc.plata ? (Object.keys(tc.cost).length ? " · " : "") + coinIc("plata") + " " + tc.plata : "");
    const ok = canAfford(tc.cost) && G.plata >= tc.plata;
    const btn = '<button class="green sm" ' + (ok ? "" : "disabled") + ' data-ctool="' + id + '">Craftear</button>'
      + '<button class="green sm" ' + (ok ? "" : "disabled") + ' data-ctool5="' + id + '" title="Craftear 5 de una (doc 2/8: crafteo en lote)">×5</button>';
    craft += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(td.sprite) + '"></div><div class="finfo"><div class="fnm">' + td.label + '</div><div class="fds">1 uso c/u · tenés ' + n + '</div><div class="fds">Costo: ' + cs + '</div></div><div class="fbtns">' + btn + '</div></div>';
  });
  // solo las ARMAS se reparan → Reparar
  ARM_ORDER.forEach(id => {   // doc 2/8: las armas nuevas se reparan acá
    if (!G.weapons || !G.weapons[id]) return;
    const w = ARM_DEF[id], dur = G.weapons[id].dur, pct = Math.round(dur / w.dur * 100);
    const rstr = Object.keys(w.repair).map(k => resIc(k) + w.repair[k]).join(" ");
    const btn = dur < w.dur
      ? '<button class="gold sm" ' + (canAfford(w.repair) ? "" : "disabled") + ' data-rarm="' + id + '" title="Reparar: ' + rstr + '">Reparar</button>'
      : '<button class="ghost sm" disabled>100%</button>';
    repair += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(ARM_TIPO_DEF[w.tipo].sprite) + '"></div><div class="finfo"><div class="fnm">' + w.label + '</div><div class="durbar"><i style="width:' + pct + '%"></i></div><div class="fds">' + dur + "/" + w.dur + " · reparar: " + rstr + '</div></div><div class="fbtns">' + btn + "</div></div>";
  });
  // armas y flechas → pestaña ARMAS (detalles viernes: no se mezclan con las herramientas)
  let armas = "";
  if (!G.armasUnlocked) {   // viernes (2): la pestaña Armas se desbloquea pagando
    const ustr = Object.keys(ARMAS_UNLOCK_COST).map(k => resIc(k) + " " + ARMAS_UNLOCK_COST[k]).join(" · ") + " · " + coinIc("plata") + " " + ARMAS_UNLOCK_PLATA;
    const uok = canAfford(ARMAS_UNLOCK_COST) && G.plata >= ARMAS_UNLOCK_PLATA;
    armas = '<div class="forge-row"><div class="fic"><img src="' + GF.spr("sword") + '" onerror="this.outerHTML=\'⚔️\'"></div><div class="finfo"><div class="fnm">Sección de Armas cerrada</div><div class="fds">Habilitá la forja de armas pagando una única vez.</div><div class="fds">Costo: ' + ustr + '</div></div><div class="fbtns"><button class="green sm" ' + (uok ? "" : "disabled") + ' id="forge-unlock-armas">Desbloquear</button></div></div>';
    $("forge-armas").innerHTML = armas;
    const fu = $("forge-unlock-armas"); if (fu) fu.onclick = () => unlockArmas();
  }
  if (G.armasUnlocked) {   // doc maestro 2/8: 4 tipos × 5 rarezas con daño aleatorio y buff
    const BUFF_DESC = { espada: "de crítico (daño ×2)", hacha: "de la defensa ignorada", mazo: "de aturdir (pierde su golpe)", arco: "de daño/s por sangrado (3 s)" };
    ARM_TIPOS.forEach(tipo => {
      const td = ARM_TIPO_DEF[tipo];
      armas += '<div class="shophead">' + td.label + ' — ' + td.buffLabel + '</div>';
      ARM_RAREZAS.forEach(rar => {
        const id = tipo + "_" + rar, w = ARM_DEF[id], own = G.weapons && G.weapons[id];
        const cs = Object.keys(w.cost).map(k => resIc(k) + " " + w.cost[k]).join(" · ") + " · " + coinIc("plata") + " " + w.plata;
        const eqNow = G.gear.arma === id;
        const plusTag = (typeof armPlus === "function" && armPlus(id)) ? " +" + armPlus(id) : "";
        let btns = "";
        if (own) {
          btns = eqNow ? '<button class="ghost sm" disabled>Equipada</button>' : '<button class="ghost sm" data-eqarm="' + id + '">Equipar</button>';
        } else {
          const cdL = armCdLeft(id);
          btns = cdL > 0 ? '<button class="green sm" disabled>' + fmtSecs(Math.ceil(cdL / 1000)) + '</button>'
            : '<button class="green sm" ' + (canAfford(w.cost) && G.plata >= w.plata ? "" : "disabled") + ' data-carm="' + id + '">Forjar</button>';
        }
        armas += '<div class="forge-row ' + (eqNow ? "eq" : "") + '"><div class="fic"><img src="' + GF.spr(td.sprite) + '"></div><div class="finfo"><div class="fnm">' + w.label + plusTag + (own ? ' <span class="tag">' + G.weapons[id].dur + '/' + w.dur + '</span>' : '') + '</div><div class="fds">Daño ' + w.min + '–' + w.max + ' · ' + td.buffLabel + ' ' + w.buffVal + (tipo === "arco" ? "/s" : "%") + ' ' + BUFF_DESC[tipo] + '</div><div class="fds">' + (own ? 'Reparación en la pestaña Reparar' : 'Costo: ' + cs) + '</div></div><div class="fbtns">' + btns + '</div></div>';
      });
    });
  }
  const astr = G.armasUnlocked ? Object.keys(ARROW_COST).map(k => resIc(k) + " " + ARROW_COST[k]).join(" · ") : "";
  if (G.armasUnlocked) armas += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("res_flecha") + '" onerror="this.outerHTML=\'➳\'"></div><div class="finfo"><div class="fnm">Flechas ×10</div><div class="fds">Tenés ' + fmt(G.res.flecha || 0) + ' · Costo: ' + astr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(ARROW_COST) ? "" : "disabled") + ' id="forge-arrows">Craftear</button></div></div>';
  // cofre depósito: 10 espacios + 1% de materiales por cofre
  G.chests = G.chests || [];
  const chn = G.chests.length, chFull = chn >= CHEST_MAX;
  const chstr = Object.keys(CHEST_COST).map(k => resIc(k) + " " + CHEST_COST[k]).join(" · ") + " · " + coinIc("plata") + " " + CHEST_PLATA;
  const chOk = !chFull && canAfford(CHEST_COST) && G.plata >= CHEST_PLATA;
  craft += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("cofre") + '" onerror="this.outerHTML=\'📦\'"></div><div class="finfo"><div class="fnm">Cofre depósito (' + chn + "/" + CHEST_MAX + ')</div><div class="fds">10 espacios de guardado en tu granja · +1% de materiales por cofre (tenés +' + chn + '%)</div><div class="fds">Costo: ' + chstr + '</div></div><div class="fbtns"><button class="green sm" ' + (chOk ? "" : "disabled") + ' id="forge-chest">' + (chFull ? "Máximo" : "Craftear") + "</button></div></div>";

  $("forge-craft").innerHTML = craft || '<div class="sub">Nada por craftear — ya tenés todo. </div>';
  if (G.armasUnlocked) $("forge-armas").innerHTML = armas || '<div class="sub">Ya tenés todas las armas. Las flechas se siguen crafteando acá.</div>';
  $("forge-repair").innerHTML = repair;
  const card = $("ov-forge");
  card.querySelectorAll("[data-craft]").forEach(b => b.onclick = () => craftPick(b.dataset.craft));
  card.querySelectorAll("[data-equip]").forEach(b => b.onclick = () => equipPick(b.dataset.equip));
  card.querySelectorAll("[data-mat]").forEach(b => b.onclick = () => craftMat(b.dataset.mat));
  card.querySelectorAll("[data-repair]").forEach(b => b.onclick = () => repairPick(b.dataset.repair));
  card.querySelectorAll("[data-rtool]").forEach(b => b.onclick = () => repairTool(b.dataset.rtool));
  card.querySelectorAll("[data-ctool]").forEach(b => b.onclick = () => craftTool(b.dataset.ctool));
  card.querySelectorAll("[data-ctool5]").forEach(b => b.onclick = () => craftTool(b.dataset.ctool5, 5));
  card.querySelectorAll("[data-carm]").forEach(b => b.onclick = () => craftWeapon(b.dataset.carm));
  card.querySelectorAll("[data-rarm]").forEach(b => b.onclick = () => repairWeapon(b.dataset.rarm));
  card.querySelectorAll("[data-eqarm]").forEach(b => b.onclick = () => { G.gear.arma = b.dataset.eqarm; toast(ARM_DEF[b.dataset.eqarm].label + " equipada"); if (typeof applyCombatHp === "function") applyCombatHp(); refreshHud(); refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (typeof saveFarm === "function") saveFarm(); });
  const fa = $("forge-arrows"); if (fa) fa.onclick = () => craftArrows();
  const fc = $("forge-chest"); if (fc) fc.onclick = () => craftChest();
  if (typeof tutoHighlight === "function") tutoHighlight();
}
function refreshTools() { refreshForge(); }   // compatibilidad con llamadas viejas

/* ---- Horno de Piedra (detalles viernes 1): acá se funden TODOS los lingotes/barras ---- */
function refreshHorno() {
  const box = $("horno-mats"); if (!box) return;
  let html = "", anyCooling = false;
  MAT_ORDER.forEach(id => {
    const md = MAT_DEF[id], cs = Object.keys(md.cost).map(k => resIc(k) + " " + md.cost[k]).join(" · ");
    const left = matCdLeft(id); if (left > 0) anyCooling = true;
    const btn = left > 0
      ? '<button class="green sm" disabled>' + fmtSecs(Math.ceil(left / 1000)) + '</button>'
      : '<button class="green sm" ' + (canAfford(md.cost) ? "" : "disabled") + ' data-mat="' + id + '">Fundir</button>';
    html += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(md.sprite) + '"></div><div class="finfo"><div class="fnm">' + md.label + '</div><div class="fds">Tenés ' + fmt(G.res[id] || 0) + ' · Costo: ' + cs + '</div></div><div class="fbtns">' + btn + '</div></div>';
  });
  if (anyCooling && !window._hornoCdTick) { window._hornoCdTick = setTimeout(() => { window._hornoCdTick = null; if (isOpen("ov-horno")) refreshHorno(); }, 1000); }
  box.innerHTML = html;
  box.querySelectorAll("[data-mat]").forEach(b => b.onclick = () => craftMat(b.dataset.mat));
}

/* ---- cofre depósito: guardar/sacar pilas (detalles 29/7) ---- */
function refreshChest() {
  const ci = (typeof window.chestOpen === "number") ? window.chestOpen : 0;
  const ch = (G.chests || [])[ci];
  const box = $("cofre-slots"), inv = $("cofre-inv"), info = $("cofre-info");
  if (!ch || !box) return;
  if (info) info.textContent = "Cofre " + (ci + 1) + " de " + G.chests.length + " · bonus total de materiales: +" + G.chests.length + "% · hasta 99 por espacio";
  box.innerHTML = ch.items.map((s, i) => {
    if (!s) return '<div class="slot"></div>';
    const v = itemView({ kind: s.kind, key: s.key });
    return `<div class="slot filled" data-wd="${i}" title="${v.label} — clic para sacar">${itemIcon(v)}<span class="cnt">${s.n}</span></div>`;
  }).join("");
  box.querySelectorAll("[data-wd]").forEach(el => el.onclick = () => chestWithdraw(ci, +el.dataset.wd));
  const stacks = [];
  ITEM_RES_ORDER.forEach(k => { const n = Math.floor(G.res[k] || 0); if (n > 0) stacks.push({ kind: "res", key: k, n }); });
  CROP_ORDER.forEach(k => { const n = Math.floor(G.seeds[k] || 0); if (n > 0) stacks.push({ kind: "seed", key: k, n }); });
  FISH_ORDER.forEach(k => { const n = Math.floor((G.fish && G.fish[k]) || 0); if (n > 0) stacks.push({ kind: "fish", key: k, n }); });
  RECIPE_ORDER.forEach(k => { const n = Math.floor((G.dishes && G.dishes[k]) || 0); if (n > 0) stacks.push({ kind: "dish", key: k, n }); });
  inv.innerHTML = stacks.map((s, i) => {
    const v = itemView({ kind: s.kind, key: s.key });
    return `<div class="slot filled" data-dp="${i}" title="${v.label} — clic para guardar">${itemIcon(v)}<span class="cnt">${fmt(s.n)}</span></div>`;
  }).join("") || '<div class="sub">No tenés nada para guardar.</div>';
  inv.querySelectorAll("[data-dp]").forEach(el => el.onclick = () => { const s = stacks[+el.dataset.dp]; chestDeposit(ci, s.kind, s.key); });
  // recoger el cofre y guardarlo en la bolsa (detalles jueves) — solo si está vacío
  const pu = $("cofre-pickup");
  if (pu) { const empty = ch.items.every(s => !s); pu.disabled = !empty; pu.title = empty ? "" : "Vaciá el cofre para poder recogerlo"; pu.onclick = () => { if (window.FARM && FARM.pickupChest) FARM.pickupChest(ci); }; }
}

/* ---- cocina (en la Granja) ---- */
function refreshCooking() {
  const box = $("cook-list"); if (!box) return;
  const lvl = cookLevel(), xp = G.skills.cooking || 0;
  const nxt = COOK_LVLS[lvl + 1];
  let head = '<div class="forge-row"><div class="finfo"><div class="fnm">Cocina nivel ' + lvl + (lvl >= 10 ? ' — Cocina maestra' : '') + '</div>' +
    (nxt != null ? '<div class="durbar"><i style="width:' + Math.round((xp - COOK_LVLS[lvl]) / (nxt - COOK_LVLS[lvl]) * 100) + '%"></i></div><div class="fds">' + fmt(xp) + '/' + fmt(nxt) + ' XP para el nivel ' + (lvl + 1) + '</div>' : '') +
    (lvl > 1 ? '<div class="fds">Maestría: buffs y precios de venta +' + Math.round((cookPot(1) - 1) * 100) + '% en las recetas de nivel 1 (2% por nivel sobre la receta, tope +50%)</div>' : '') +
    '</div></div>';
  if (G.cooking) {   // barra de cocción en curso
    const r = RECIPE_DEF[G.cooking.id];
    const left = Math.max(0, G.cooking.endAt - nowMs());
    const pct = Math.round((1 - left / (G.cooking.total || 1)) * 100);
    head += '<div class="forge-row"><div class="fic"></div><div class="finfo"><div class="fnm">Cocinando ' + (r ? r.label : "") + '…</div><div class="durbar"><i style="width:' + pct + '%"></i></div><div class="fds">' + fmtSecs(Math.ceil(left / 1000)) + ' restantes</div></div></div>';
  }
  box.innerHTML = head + RECIPE_ORDER.map(id => {
    const r = RECIPE_DEF[id];
    const locked = r.lvl && lvl < r.lvl;
    const parts = [];
    if (r.fish) for (const k in r.fish) parts.push(fishIc(k) + " ×" + r.fish[k]);
    if (r.res) for (const k in r.res) parts.push(resIc(k) + " ×" + r.res[k]);
    const fic = r.sprite ? '<img src="' + GF.spr(r.sprite) + '" onerror="this.outerHTML=\'' + r.emoji + '\'">' : r.emoji;
    const own = Math.floor((G.dishes && G.dishes[id]) || 0);
    const vPlata = Math.round((r.plata || 0) * cookPot(r.lvl));
    let btns = '<button class="green sm" ' + ((!locked && canCook(id) && !G.cooking) ? "" : "disabled") + ' data-cook="' + id + '">' + (locked ? "Nivel " + r.lvl : "Cocinar") + '</button>';
    if (own > 0 && r.plata) btns += '<button class="sm" data-selld="' + id + '">Vender (' + own + ') · ' + vPlata + ' plata</button>';
    if (own > 0 && r.goldenP && lvl >= 8) btns += '<button class="sm" data-sellg="' + id + '">Vender · ' + r.goldenP + ' $G</button>';
    return '<div class="forge-row' + (locked ? ' locked' : '') + '"><div class="fic">' + fic + '</div><div class="finfo"><div class="fnm">' + r.label + (locked ? ' · se desbloquea a nivel ' + r.lvl : '') + '</div><div class="fds">' + dishDesc(r) + ' · cocción ' + fmtSecs(r.cookS || 8) + ' · +' + r.xp + ' XP</div><div class="fds">Ingredientes: ' + parts.join(" · ") + (r.plata ? ' · Venta: ' + vPlata + ' plata' + (r.goldenP ? ' o ' + r.goldenP + ' $Golden (Nv 8)' : '') : '') + '</div></div><div class="fbtns">' + btns + '</div></div>';
  }).join("");
  box.querySelectorAll("[data-cook]").forEach(b => b.onclick = () => cook(b.dataset.cook));
  box.querySelectorAll("[data-selld]").forEach(b => b.onclick = () => sellDish(b.dataset.selld, false));
  box.querySelectorAll("[data-sellg]").forEach(b => b.onclick = () => sellDish(b.dataset.sellg, true));
}



/* ---- Tutorial guiado (doc maestro 2/8): cartel de objetivo + tilde animado ---- */
function tutoRefresh() {
  const el = document.getElementById("tuto"); if (!el) return;
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  document.getElementById("tuto-txt").textContent = st.txt;
  document.getElementById("tuto-n").textContent = st.n > 1 ? " " + Math.min(G.tuto.n || 0, st.n) + "/" + st.n : "";
  tutoHighlight();
}
// resalta el BOTÓN exacto del paso actual dentro del panel abierto (ej.: el Hacha en la Herrería)
function tutoHighlight() {
  document.querySelectorAll(".tutohl").forEach(e => e.classList.remove("tutohl"));
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st || !st.ui || !st.panel || !isOpen(st.panel)) return;
  const cont = document.getElementById(st.panel); if (!cont) return;
  const el = cont.querySelector(st.ui); if (!el) return;
  el.classList.add("tutohl");
  const fila = el.closest(".forge-row, .mkt-row");
  if (fila) { fila.classList.add("tutohl"); fila.scrollIntoView({ block: "nearest" }); }
}
window.tutoHighlight = tutoHighlight;

// el guardado se hidrata de forma asíncrona: si el paso cambia, se redibujan cartel Y flecha juntos
let _tutoSig = null;
function tutoSync(force) {
  const sig = G.tuto ? (G.tuto.step + ":" + (G.tuto.n || 0) + ":" + !!G.tuto.done) : "-";
  if (!force && sig === _tutoSig) return;
  _tutoSig = sig;
  tutoRefresh();
  if (window.farmScene && window.farmScene.updateTutoArrow) { try { window.farmScene.updateTutoArrow(); } catch (e) {} }
}
window.tutoSync = tutoSync;

function tutoCheck(txt) {   // tilde animado sobre el cartel al cumplir un paso
  const el = document.getElementById("tuto"); if (!el) return;
  const c = document.createElement("span"); c.className = "check"; c.textContent = "✓";
  el.appendChild(c); setTimeout(() => c.remove(), 900);
  toast("Objetivo cumplido: " + txt);
}
window.tutoRefresh = tutoRefresh; window.tutoCheck = tutoCheck;

/* ---- Pase de Batalla (doc maestro 2/8): 30 niveles Free/VIP, estrellas por misiones ---- */
function refreshPass() {
  const box = $("pass-list"); if (!box) return;
  const p = passInit(), lvl = passLvl();
  const into = p.stars - lvl * PASS_STARS_LVL, need = PASS_STARS_LVL;
  let h = '<div class="forge-row"><div class="finfo">' +
    '<div class="fnm">Nivel ' + lvl + ' / 30 · ' + fmt(p.stars) + ' estrellas' + (p.vip ? ' · <b style="color:#ffe08a">VIP activo</b> (+' + Math.round((PASS_VIP_BOOST - 1) * 100) + '% estrellas)' : '') + '</div>' +
    (lvl < 30 ? '<div class="durbar"><i style="width:' + Math.round(into / need * 100) + '%"></i></div><div class="fds">' + into + '/' + need + ' estrellas para el nivel ' + (lvl + 1) + '</div>' : '<div class="fds">¡Pase completo!</div>') +
    '<div class="fds">Se sube JUGANDO: misiones diarias y semanales dan estrellas. La temporada dura 4-6 semanas.</div></div>' +
    '<div class="fbtns">' + (p.vip ? '' : '<button class="green sm" id="pass-vip">Pase VIP · ' + PASS_VIP_PRICE + ' $G</button>') +
    (lvl < 30 ? '<button class="sm" id="pass-buylvl">+1 nivel · ' + PASS_LVL_GOLD + ' $G</button>' : '') + '</div></div>';
  // misiones
  h += '<div class="fnm" style="margin-top:8px">Misiones de HOY (' + PASS_STAR_DAILY + ' estrellas c/u · las 3 = +' + PASS_STAR_BONUS + ')</div>';
  p.daily.mis.forEach(m => {
    const md = PASS_MISIONES[m.k];
    h += '<div class="forge-row' + (m.ok ? ' eq' : '') + '"><div class="finfo"><div class="fnm">' + md.label.replace("#", m.goal) + (m.ok ? " — CUMPLIDA" : "") + '</div><div class="durbar"><i style="width:' + Math.min(100, Math.round(m.n / m.goal * 100)) + '%"></i></div><div class="fds">' + Math.min(m.n, m.goal) + '/' + m.goal + '</div></div></div>';
  });
  h += '<div class="fnm" style="margin-top:8px">Misiones de la SEMANA (' + PASS_STAR_WEEKLY + ' estrellas c/u)</div>';
  p.weekly.mis.forEach(m => {
    const md = PASS_MISIONES[m.k];
    h += '<div class="forge-row' + (m.ok ? ' eq' : '') + '"><div class="finfo"><div class="fnm">' + md.label.replace("#", m.goal) + (m.ok ? " — CUMPLIDA" : "") + '</div><div class="durbar"><i style="width:' + Math.min(100, Math.round(m.n / m.goal * 100)) + '%"></i></div><div class="fds">' + Math.min(m.n, m.goal) + '/' + m.goal + '</div></div></div>';
  });
  // cosméticos ganados
  if (p.cosmetics.length) h += '<div class="fds" style="margin-top:6px">Tus cosméticos: ' + p.cosmetics.join(" · ") + '</div>';
  // los 30 niveles
  h += '<div class="fnm" style="margin-top:8px">Recompensas (Free / VIP)</div>';
  for (let nv = 1; nv <= 30; nv++) {
    const rf = PASS_FREE[nv - 1], rv = PASS_VIP[nv - 1];
    const alc = nv <= lvl, hito = PASS_HITOS[nv] || "";
    const bf = p.claimF[nv] ? '<button class="ghost sm" disabled>Reclamado</button>' : (alc ? '<button class="green sm" data-pfree="' + nv + '">Reclamar</button>' : '');
    const bv = p.claimV[nv] ? '<button class="ghost sm" disabled>Reclamado</button>' : (alc && p.vip ? '<button class="green sm" data-pvip="' + nv + '">Reclamar VIP</button>' : '');
    h += '<div class="forge-row' + (alc ? '' : ' locked') + '"><div class="finfo">' +
      '<div class="fnm">Nivel ' + nv + (hito ? ' <span style="color:#ffe08a">' + hito + '</span>' : '') + '</div>' +
      '<div class="fds">FREE: ' + passRewardStr(rf) + '</div>' +
      '<div class="fds" style="color:#ffe9ac">VIP: ' + passRewardStr(rv) + (p.vip ? '' : ' (requiere Pase VIP)') + '</div>' +
      '</div><div class="fbtns">' + bf + bv + '</div></div>';
  }
  box.innerHTML = h;
  const pv = $("pass-vip"); if (pv) pv.onclick = () => passBuyVip();
  const pl = $("pass-buylvl"); if (pl) pl.onclick = () => passBuyLevel();
  box.querySelectorAll("[data-pfree]").forEach(b => b.onclick = () => passClaim(Number(b.dataset.pfree), false));
  box.querySelectorAll("[data-pvip]").forEach(b => b.onclick = () => passClaim(Number(b.dataset.pvip), true));
}

/* ---- Altar de Runas (doc maestro 2/8) ---- */
function refreshAltar() {
  const box = $("altar-list"); if (!box) return;
  const owned = Object.keys(G.weapons || {});
  let h = "";
  // ---- Eje 1: MEJORA +1..+15 ----
  h += '<div class="fnm" style="margin-top:2px">Mejorar arma (+1 a +15)</div>';
  h += '<div class="fds">Cada intento gasta Runas de Poder + plata. Polvo de Suerte: +10 pts de éxito. De +6 a +10 fallar baja −1; de +11 a +15 fallar puede ROMPER el arma salvo que uses Runa de Protección.</div>';
  h += '<div class="fds">Tenés: ' + (G.res.runa_poder || 0) + ' Runa de Poder · ' + (G.res.polvo_suerte || 0) + ' Polvo de Suerte · ' + (G.res.runa_proteccion || 0) + ' Runa de Protección · ' + (G.res.esencia_runica || 0) + ' Esencia rúnica</div>';
  if (!owned.length) h += '<div class="fds">No tenés armas: forjá una en la Herrería.</div>';
  owned.forEach(id => {
    const w = ARM_DEF[id]; if (!w) return;
    const plus = armPlus(id), next = plus + 1;
    if (next > 15) { h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + w.label + ' +15</div><div class="fds">Tope de tope: +215% de daño. Aura de leyenda.</div></div></div>'; return; }
    const u = UPG[next];
    h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + w.label + (plus ? " +" + plus : "") + ' → +' + next + '</div>' +
      '<div class="fds">Éxito: <b>' + u.ex + '%</b> (con polvo ' + u.exP + '%) · +' + u.dmg + '% daño acum. · Cuesta ' + u.rp + ' Runa de Poder + ' + u.plata + ' plata' + (next >= 6 ? (next >= 11 ? ' · al fallar: −1 y RIESGO DE ROTURA' : ' · al fallar: baja −1') : ' · al fallar solo perdés materiales') + '</div>' +
      '<div class="fds"><label><input type="checkbox" data-polvo="' + id + '"> usar Polvo de Suerte</label> &nbsp; <label><input type="checkbox" data-prot="' + id + '"' + (next >= 11 ? ' checked' : '') + '> usar Runa de Protección</label></div>' +
      '<div class="fds">Ranuras de runa: ' + [1, 2, 3].map(sl => { const abre = sl === 1 ? 3 : sl === 2 ? 7 : 12; const sk = armSockets(id)[sl]; return sl <= socketsOpen(plus) ? (sk ? runaLabel(sk.t, sk.r) : "vacía") : "cerrada (+" + abre + ")"; }).join(" · ") + '</div>' +
      '</div><div class="fbtns"><button class="green sm" data-upg="' + id + '">Mejorar</button></div></div>';
  });
  // ---- Sockets del arma equipada ----
  const eq = armaEq();
  if (eq && socketsOpen(armPlus(eq)) > 0) {
    h += '<div class="fnm" style="margin-top:10px">Runas de ' + ARM_DEF[eq].label + (armPlus(eq) ? " +" + armPlus(eq) : "") + ' (equipada)</div>';
    h += '<div class="fds">Socketear una runa sobre otra DESTRUYE la anterior.</div>';
    for (let sl = 1; sl <= 3; sl++) {
      const open = sl <= socketsOpen(armPlus(eq));
      const cur = armSockets(eq)[sl];
      if (!open) { h += '<div class="fds">Ranura ' + sl + ': cerrada (se abre a +' + (sl === 1 ? 3 : sl === 2 ? 7 : 12) + ')</div>'; continue; }
      let opts = '<option value="">' + (cur ? runaLabel(cur.t, cur.r) + ' (puesta)' : '(vacía)') + '</option>';
      RUNA_ORDER.forEach(t => { for (let r = 1; r <= 5; r++) { const n = G.res[runaKey(t, r)] || 0; if (n > 0) opts += '<option value="' + t + ':' + r + '">' + runaLabel(t, r) + ' — ' + RUNA_TIPOS[t].buff + ' +' + runaVal(t, r) + RUNA_TIPOS[t].uni + ' (×' + n + ')</option>'; } });
      h += '<div class="forge-row"><div class="finfo"><div class="fds">Ranura ' + sl + ': <select data-socket="' + sl + '">' + opts + '</select></div></div></div>';
    }
  }
  // ---- Eje 2: crafteo de materiales ----
  h += '<div class="fnm" style="margin-top:10px">Craftear materiales</div>';
  for (const id in ALTAR_CRAFT) {
    const c = ALTAR_CRAFT[id];
    const costo = Object.keys(c.cost).map(k => c.cost[k] + " " + (RES_LABEL[k] || k)).join(" + ") + (c.plata ? " + " + c.plata + " plata" : "") + (c.golden ? " + " + c.golden + " $Golden" : "");
    h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + RES_LABEL[id] + ' <span class="fds">(tenés ' + (G.res[id] || 0) + ')</span></div><div class="fds">' + costo + '</div></div><div class="fbtns"><button class="green sm" data-caltar="' + id + '">Craftear</button></div></div>';
  }
  // runas de atributo I
  h += '<div class="fnm" style="margin-top:10px">Craftear runas de atributo (rareza I)</div>';
  h += '<div class="fds">Cuestan ' + Object.keys(RUNA_CRAFT.cost).map(k => RUNA_CRAFT.cost[k] + " " + (RES_LABEL[k] || k)).join(" + ") + ' + ' + RUNA_CRAFT.plata + ' plata.</div>';
  RUNA_ORDER.forEach(t => {
    h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + RUNA_TIPOS[t].label + ' I <span class="fds">(tenés ' + (G.res[runaKey(t, 1)] || 0) + ')</span></div><div class="fds">' + RUNA_TIPOS[t].buff + ': +' + RUNA_TIPOS[t].vals[0] + RUNA_TIPOS[t].uni + ' → +' + RUNA_TIPOS[t].vals[4] + RUNA_TIPOS[t].uni + ' en rareza V</div></div><div class="fbtns"><button class="green sm" data-cruna="' + t + '">Craftear I</button></div></div>';
  });
  // ---- Fusión ----
  let fus = "";
  RUNA_ORDER.forEach(t => { for (let r = 1; r <= 4; r++) { const n = G.res[runaKey(t, r)] || 0; if (n >= 3) fus += '<div class="forge-row"><div class="finfo"><div class="fnm">3× ' + runaLabel(t, r) + ' → 1× ' + runaLabel(t, r + 1) + '</div><div class="fds">' + (FUSE_GOLD[r] ? "Cuesta " + FUSE_GOLD[r] + " $Golden" : "Gratis") + ' · tenés ' + n + '</div></div><div class="fbtns"><button class="green sm" data-fuse="' + t + ':' + r + '">Fusionar</button></div></div>'; } });
  if (fus) h += '<div class="fnm" style="margin-top:10px">Fusionar runas (3 iguales → 1 de rareza superior)</div>' + fus;
  box.innerHTML = h;
  box.querySelectorAll("[data-upg]").forEach(b => b.onclick = () => {
    const id = b.dataset.upg;
    const polvo = box.querySelector('[data-polvo="' + id + '"]');
    const prot = box.querySelector('[data-prot="' + id + '"]');
    upgradeWeapon(id, polvo && polvo.checked, prot && prot.checked);
  });
  box.querySelectorAll("[data-caltar]").forEach(b => b.onclick = () => craftAltarItem(b.dataset.caltar));
  box.querySelectorAll("[data-cruna]").forEach(b => b.onclick = () => craftRunaI(b.dataset.cruna));
  box.querySelectorAll("[data-fuse]").forEach(b => b.onclick = () => { const [t, r] = b.dataset.fuse.split(":"); fuseRuna(t, Number(r)); });
  box.querySelectorAll("[data-socket]").forEach(sel => sel.onchange = () => {
    if (!sel.value) return;
    const [t, r] = sel.value.split(":");
    socketRuna(armaEq(), Number(sel.dataset.socket), t, Number(r));
  });
}

/* ---- mercado / tienda ---- */
function refreshMarket() {
  const cur = marketCur;
  $("mkt-list").innerHTML = SELLABLE.map(res => { const owned = G.res[res] || 0; const u = marketUnit(res); const uStr = cur === "plata" ? `${u} de plata c/u` : `${u.toFixed(1)} $Golden c/u`;
    return `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: resSprite(res), emoji: RES_EMOJI[res] })}</span><div class="minfo"><div class="mnm">${RES_LABEL[res]}</div><div class="mds">Tenés ${fmt(owned)} · ${uStr}</div></div><input id="mq-${res}" type="number" min="0" max="${owned}" value="${owned > 0 ? owned : 0}"><button class="vbtn" id="vb-${res}">Vender</button></div>`; }).join("");
  SELLABLE.forEach(res => { const btn = $("vb-" + res); if (btn) btn.onclick = () => sellItem(res); });
  if (typeof tutoHighlight === "function") tutoHighlight();
  document.querySelectorAll(".curbtn").forEach(b => b.classList.toggle("active", b.dataset.cur === cur));
  refreshSeedShop();
}

// tienda de semillas: comprar con plata, bloqueadas por nivel de Cultivo
function refreshSeedShop() {
  const box = $("seed-shop"); if (!box) return;
  const sb = seedBuysToday();
  box.innerHTML = '<div class="shophead">Cupo diario: ' + sb.count + '/' + SEED_DAILY_MAX + ' semillas</div>' + CROP_ORDER.map(k => {
    const cd = CROP_DEF[k], unlocked = cropUnlocked(k), aff = G.plata >= cd.seedCost;
    const controls = unlocked
      ? `<input id="sq-${k}" type="number" min="1" value="1"><button class="green sm" data-buy="${k}" ${aff ? "" : "disabled"}>Comprar · ${coinIc("plata")}${cd.seedCost} c/u</button>`
      : `<button class="ghost sm" disabled>Cultivo nv ${cd.lvl}</button>`;
    return `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: "seed_" + k, emoji: cd.emoji })}</span><div class="minfo"><div class="mnm">${cd.label} <span class="seedlv">nv ${cd.lvl}</span></div><div class="mds">Semilla · crece en ${fmtSecs(cd.grow)} · tenés ${fmt(G.seeds[k] || 0)}</div></div>${controls}</div>`;
  }).join("")
  // carnada (detalles213): lombrices para pescar — fuera del cupo diario de semillas
  + '<div class="shophead">Carnada</div>'
  + `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: "res_lombriz", emoji: "" })}</span><div class="minfo"><div class="mnm">Lombriz</div><div class="mds">Carnada de pesca · 1 por lanzamiento · tenés ${fmt(G.res.lombriz || 0)}</div></div><input id="sq-lombriz" type="number" min="1" value="10"><button class="green sm" id="buy-lombriz" ${G.plata >= WORM_PRICE ? "" : "disabled"}>Comprar · ${coinIc("plata")}${WORM_PRICE} c/u</button></div>`;
  box.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const inp = $("sq-" + b.dataset.buy); buySeed(b.dataset.buy, inp ? +inp.value : 1); });
  if (typeof tutoHighlight === "function") tutoHighlight();
  const wb = $("buy-lombriz"); if (wb) wb.onclick = () => { const inp = $("sq-lombriz"); buyWorm(inp ? +inp.value : 1); };
}

/* ---- granja (nivel) ---- */
function refreshBarn() {
  $("barn-yield").textContent = "Yield actual +" + ((yieldMult() - 1) * 100).toFixed(1) + "%";
  const bar = $("lvlbar"), cost = $("lvlcost"), lb = $("levelup"), pb = $("prestige");
  if (G.level >= 10) { bar.style.width = "100%"; cost.innerHTML = "<b>Nivel máximo.</b> Reiniciá la granja para yield permanente."; lb.style.display = "none"; pb.style.display = "inline-block"; }
  else {   // doc maestro 2/8: el nivel de granja sube con XP de Farmeo (nada de pagar recursos)
    const need = FARM_XP_LVLS[G.level + 1] || 1, xp = (G.skills && G.skills.farming) || 0;
    lb.style.display = "none"; pb.style.display = "none";
    bar.style.width = Math.min(100, Math.round(xp / need * 100)) + "%";
    cost.innerHTML = "El nivel sube cosechando: <b>" + fmt(xp) + " / " + fmt(need) + " XP de Farmeo</b>."
      + (FARM_UNLOCK[G.level + 1] ? "<br>Próximo desbloqueo: <b>" + FARM_UNLOCK[G.level + 1] + "</b>" : "");
  }
  const ti = $("toolinfo"); if (ti) ti.style.display = "none"; const bt = $("buytool"); if (bt) bt.style.display = "none";
}

/* ---- configuración ---- */
function refreshConfig() {
  const st = $("cfg-auth-status"); if (st) st.textContent = "Jugando como: " + (window.NICK || "Granjero") + ". (Cuenta/login llega en otra fase.)";
  const l = $("cfg-login"); if (l) l.style.display = "none"; const o = $("cfg-logout"); if (o) o.style.display = "none";
}

/* ---- leaderboard (datos reales desde Supabase) ---- */
let lbTab = "plata";
let lbData = null, lbFetchedAt = 0, lbLoading = false;

function lbRowHtml(r, i, col) { const rank = i + 1; const cls = (r.me ? "me " : "") + (rank <= 3 ? "top" + rank : ""); const val = col === "plata" ? `${coinIc("plata")}${fmt(r.v)}` : `${(+r.v).toFixed(1)}`; return `<div class="lbrow ${cls}"><span class="rk">${rank}</span><span class="nm">${escapeHtml(r.n || "—")}</span><span class="val">${val}</span></div>`; }

// nivel de skill promedio a partir del objeto skills guardado de otro jugador
function avgSkillFromObj(sk) {
  if (!sk || typeof sk !== "object") return 1;
  let s = 0, n = 0;
  for (const k in sk) { s += skillInfo(Number(sk[k]) || 0).lvl; n++; }
  return n ? +(s / n).toFixed(2) : 1;
}

async function refreshLb() {
  document.querySelectorAll(".lbtab").forEach(b => b.classList.toggle("active", b.dataset.lb === lbTab));
  const note = $("lb-note");
  const stale = !lbData || (Date.now() - lbFetchedAt > 15000);
  if (stale && !lbLoading && typeof fetchLeaderboard === "function") {
    lbLoading = true;
    if (!lbData && note) note.textContent = "Cargando ranking…";
    const d = await fetchLeaderboard();
    lbLoading = false;
    if (d) { lbData = d; lbFetchedAt = Date.now(); }
    else if (!lbData) { if (note) note.textContent = "No se pudo cargar el ranking online."; $("lb-list").innerHTML = ""; return; }
  }
  renderLb();
}

function renderLb() {
  const col = lbTab, note = $("lb-note");
  const meId = (typeof UID === "string") ? UID : null;
  const rows = (Array.isArray(lbData) ? lbData : []).map(p => {
    const isMe = meId && p.user_id === meId;
    let plata = Math.floor(Number(p.plata) || 0);
    let exp = avgSkillFromObj(p.skills);
    if (isMe) { plata = Math.floor(G.plata); exp = +avgSkillLevel().toFixed(2); }   // mis datos, en vivo
    return { n: p.name || "—", plata, exp, me: !!isMe };
  });
  // si todavía no estoy guardado en la tabla, me agrego con mis valores actuales
  if (meId && !rows.some(r => r.me)) rows.push({ n: window.NICK || "Vos", plata: Math.floor(G.plata), exp: +avgSkillLevel().toFixed(2), me: true });
  const val = r => (col === "plata" ? r.plata : r.exp);
  rows.sort((a, b) => val(b) - val(a));
  $("lb-list").innerHTML = rows.slice(0, 20).map((r, i) => lbRowHtml({ n: r.n, v: val(r), me: r.me }, i, col)).join("");
  if (note) note.textContent = rows.length ? `Ranking online · ${rows.length} granjero${rows.length === 1 ? "" : "s"}` : "Todavía no hay jugadores en el ranking.";
}

/* ---- indicador de guardado ---- */
function showSaving() { const el = $("saveind"); if (!el) return; el.className = "show saving"; el.querySelector(".sdot").textContent = "⟳"; el.querySelector(".stxt").textContent = "Guardando…"; clearTimeout(el._t); }
function showSaved() { const el = $("saveind"); if (!el) return; el.className = "show"; el.querySelector(".sdot").textContent = ""; el.querySelector(".stxt").textContent = "Guardado"; clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 1600); }

/* ---- chat ---- */
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function renderChatMsg(m) {
  const box = $("chat-msgs"); if (!box || !m) return;
  const d = document.createElement("div"); d.className = "cm";
  d.innerHTML = "<b>" + escapeHtml(m.name || "?") + ":</b> " + escapeHtml(m.text || "");
  box.appendChild(d); while (box.children.length > 60) box.removeChild(box.firstChild); box.scrollTop = box.scrollHeight;
}
function doSendChat() { const ci = $("chat-in"); if (!ci) return; const t = ci.value.trim(); if (!t) return; if (typeof sendChat === "function") sendChat(t); ci.value = ""; }

/* ---- (los botones se quitaron: ahora todo se mueve manteniendo clic — arrastre universal) ---- */
function initPanelDrag() {
}

/* ---- arrastrar las ventanas (overlays) por su título ---- */
function initOverlayDrag() {
  document.querySelectorAll(".ov .card").forEach(card => {
    const handle = card.querySelector("h3"); if (!handle) return;
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      card.style.left = r.left + "px"; card.style.top = r.top + "px"; card.style.transform = "none";
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      try { handle.setPointerCapture(e.pointerId); } catch (er) {}
    });
    handle.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const w = card.offsetWidth, h = card.offsetHeight;
      const left = Math.max(4, Math.min(e.clientX - drag.dx, window.innerWidth - w - 4));
      const top = Math.max(4, Math.min(e.clientY - drag.dy, window.innerHeight - h - 4));
      card.style.left = left + "px"; card.style.top = top + "px";
    });
    const end = () => { drag = null; };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  });
}

function initHotbarDrag() {
}

/* ---- arrastre universal: mantener clic izquierdo sobre una zona libre mueve la interfaz ---- */
const DRAG_EXCLUDE = "button, input, textarea, select, a, [draggable=true], .hcell, .swi, #log, #chatpane, .slots, .forge-list, .mkt-list, .lblist, .curbtn, .shoptab, .lbtab, .ltab, .eqslot";
function makeHoldDrag(el, saveKey, anchorBottom) {
  if (!el || el._holdDrag) return; el._holdDrag = true;
  let drag = null, started = false;
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(DRAG_EXCLUDE)) return;
    const r = el.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY };
    started = false;
    try { el.setPointerCapture(e.pointerId); } catch (er) {}
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!started && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    if (!started) { started = true; el.classList.add("uidrag"); }
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(4, Math.min(e.clientX - drag.dx, window.innerWidth - w - 4));
    const top = Math.max(4, Math.min(e.clientY - drag.dy, window.innerHeight - h - 4));
    el.style.left = left + "px"; el.style.top = top + "px";
    el.style.right = "auto"; el.style.bottom = "auto"; el.style.transform = "none";
    e.preventDefault();
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    if (started) {
      el.classList.remove("uidrag");
      const r = el.getBoundingClientRect();
      if (anchorBottom) {   // panel de registro/chat: anclado por ABAJO para que al abrirse crezca hacia arriba
        el.style.bottom = Math.max(4, window.innerHeight - r.bottom) + "px"; el.style.top = "auto";
        if (saveKey) { try { localStorage.setItem(saveKey, JSON.stringify({ left: r.left, bottom: Math.max(4, window.innerHeight - r.bottom) })); } catch (er) {} }
      }
      else if (saveKey) { try { localStorage.setItem(saveKey, JSON.stringify({ left: r.left, top: r.top })); } catch (er) {} }
    }
    started = false;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  // restaurar posición guardada (por dispositivo) y re-encajar si cambia el tamaño de la ventana
  const clamp = () => { if (!el.style.top || el.style.top === "auto") return; const w = el.offsetWidth, h = el.offsetHeight; el.style.left = Math.max(4, Math.min(parseFloat(el.style.left) || 0, window.innerWidth - w - 4)) + "px"; el.style.top = Math.max(4, Math.min(parseFloat(el.style.top) || 0, window.innerHeight - h - 4)) + "px"; };
  if (saveKey) {
    try { const s = JSON.parse(localStorage.getItem(saveKey) || "null");
      if (s && typeof s.left === "number") {
        el.style.left = s.left + "px"; el.style.right = "auto"; el.style.transform = "none";
        if (typeof s.bottom === "number") { el.style.bottom = s.bottom + "px"; el.style.top = "auto"; }
        else if (anchorBottom && typeof s.top === "number") { el.style.bottom = Math.max(4, window.innerHeight - s.top - el.offsetHeight) + "px"; el.style.top = "auto"; }   // migra posiciones viejas guardadas por arriba
        else { el.style.top = s.top + "px"; el.style.bottom = "auto"; clamp(); }
      } } catch (e) {}
    window.addEventListener("resize", clamp);
  }
}
// el aviso de interacción va SIEMPRE por encima de la barra de acceso rápido,
// aunque la barra se haya movido de sitio
function placePrompt() {
  const p = $("prompt"), hb = $("hotwrap");
  if (!p) return;
  if (!hb) { p.style.bottom = "12px"; return; }
  const r = hb.getBoundingClientRect();
  if (!r.height || r.top < window.innerHeight * 0.5) { p.style.bottom = "12px"; return; }   // barra arriba: el aviso abajo
  p.style.bottom = Math.round(Math.min(window.innerHeight * 0.55, window.innerHeight - r.top + 34)) + "px";   // 31/7: despegado de la barra pero cerquita (64 quedaba muy arriba)
}
function initUniversalDrag() {
  document.querySelectorAll(".ov .card").forEach(c => makeHoldDrag(c));          // todas las ventanas
  makeHoldDrag($("hotwrap"), "gf_hotpos");                                       // barra de acceso rápido
  placePrompt(); window.addEventListener("resize", placePrompt);
  const hw = $("hotwrap"); if (hw) { hw.addEventListener("pointerup", () => setTimeout(placePrompt, 30)); }
  makeHoldDrag($("logpanel"), "gf_logpos", true);                                // registro/chat (anclado por abajo: se abre hacia ARRIBA)
}

/* ---- init ---- */
function initUI() {
  GF.uiOpen = false;
  const gmenu = $("gmenu");
  const toggleMenu = () => gmenu.classList.toggle("collapsed");
  const gt = $("gmtoggle"); if (gt) gt.onclick = toggleMenu;
  const mb = $("menu-btn"); if (mb) mb.onclick = toggleMenu;
  // multiventana: abrir un panel ya no cierra los demás (detalles 29/7)
  document.querySelectorAll(".gmi").forEach(b => b.onclick = () => { openOv(b.dataset.panel); gmenu.classList.add("collapsed"); });
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeOv(b.dataset.close));
  // initOverlayDrag() reemplazado por initUniversalDrag(): ahora toda la ventana es agarrable, no solo el título
  const lu = $("levelup"); if (lu) lu.onclick = levelUp;
  const pr = $("prestige"); if (pr) pr.onclick = prestige;
  document.querySelectorAll(".curbtn").forEach(b => b.onclick = () => { marketCur = b.dataset.cur; refreshMarket(); });
  document.querySelectorAll(".lbtab").forEach(b => b.onclick = () => { lbTab = b.dataset.lb; refreshLb(); });
  document.querySelectorAll(".shoptab:not(.forgetab)").forEach(b => b.onclick = () => {
    document.querySelectorAll(".shoptab:not(.forgetab)").forEach(x => x.classList.toggle("active", x === b));
    const s = b.dataset.shop;
    $("shop-buy").style.display = s === "buy" ? "" : "none";
    $("shop-sell").style.display = s === "sell" ? "" : "none";
  });
  // clic fuera de una ventana abierta → se cierra (menos la bolsa: multitarea al minar/talar, detalles 29/7)
  document.addEventListener("pointerdown", (e) => {
    // el menú se pliega solo al clickear fuera de él (volver a jugar)
    const gm = $("gmenu");
    if (gm && !gm.classList.contains("collapsed") && !e.target.closest("#gmenu, #menu-btn")) gm.classList.add("collapsed");
    if (!anyOvOpen()) return;
    if (e.target.closest(".card, #gmenu, #hotwrap, .hudbar, #logpanel, #editbar, #seedwheel")) return;
    document.querySelectorAll(".ov.show").forEach(o => { if (o.id !== "ov-inv") o.classList.remove("show"); });
  });
  // clic derecho en el juego sin menú del navegador (siembra rápida, detalles 29/7)
  // clic derecho: NUNCA el menú del navegador, en ninguna parte del juego (solo se permite en campos de texto)
  document.addEventListener("contextmenu", e => { if (!e.target.closest("input,textarea")) e.preventDefault(); });
  // pestañas de la Herrería: Picos / Herramientas
  document.querySelectorAll(".forgetab").forEach(b => b.onclick = () => {
    document.querySelectorAll(".forgetab").forEach(x => x.classList.toggle("active", x === b));
    const s = b.dataset.forge;
    $("forge-pane-craft").style.display = s === "craft" ? "" : "none";
    const pa = $("forge-pane-armas"); if (pa) pa.style.display = s === "armas" ? "" : "none";
    $("forge-pane-repair").style.display = s === "repair" ? "" : "none";
  });
  // modo edición: cierra las ventanas y deja solo dos botoncitos flotantes sobre la hotbar
  window.setEditMode = (on) => {
    GF.editMode = on;
    const ce2 = $("cfg-edit"); if (ce2) ce2.textContent = on ? "Terminar edición" : "Modo edición";
    const eb = $("editbar"); if (eb) eb.classList.toggle("show", on);
    if (window.FARM && FARM.gridG) FARM.gridG.setVisible(on);   // el cuadriculado solo se ve editando
    if (on) { closeAllOv(); toast("Arrastrá los objetos a otra celda"); }
    else toast("Edición terminada");
  };
  const doFarmReset = () => { G.layout = {}; G.layoutPlots = {}; G.layoutPond = null; if (typeof saveFarm === "function") saveFarm(true); if (window.FARM && window.FARM.scene) window.FARM.scene.restart(); toast("↺ Granja restaurada"); };
  const ce = $("cfg-edit"); if (ce) ce.onclick = () => setEditMode(!GF.editMode);
  // sonidos on/off (Configuración)
  const sndBtn = $("cfg-sound");
  const sndLabel = () => { if (sndBtn) sndBtn.textContent = (window.sfxIsOn && sfxIsOn()) ? "Sonidos: Sí" : "Sonidos: No"; };
  if (sndBtn) { sndLabel(); sndBtn.onclick = () => { if (window.sfxOn) sfxOn(!(window.sfxIsOn && sfxIsOn())); sndLabel(); if (window.sfx) sfx("click"); }; }
  const cr = $("cfg-reset"); if (cr) cr.onclick = doFarmReset;
  const ed = $("edit-done"); if (ed) ed.onclick = () => setEditMode(false);
  const er = $("edit-reset"); if (er) er.onclick = doFarmReset;
  const dc = $("dy-claim"); if (dc) dc.onclick = () => claimDaily();
  const sw = $("seedwheel"); if (sw) sw.onclick = hideSeedWheel;
  const lm = $("logmin"); if (lm) lm.onclick = () => $("logpanel").classList.toggle("collapsed");
  initUniversalDrag();   // mantener clic sobre cualquier interfaz la mueve (detalles 29/7)
  document.querySelectorAll(".ltab").forEach(b => b.onclick = () => {
    $("logpanel").classList.remove("collapsed");
    document.querySelectorAll(".ltab").forEach(x => x.classList.toggle("active", x === b));
    const tab = b.dataset.tab;
    $("log").style.display = tab === "log" ? "" : "none";
    $("chatpane").style.display = tab === "chat" ? "" : "none";
    if (tab === "chat") { const ci = $("chat-in"); if (ci) ci.focus(); }
  });
  const ci = $("chat-in"), cs = $("chat-send");
  if (ci) {
    ci.addEventListener("focus", () => { GF.typing = true; GF.uiOpen = true; });
    ci.addEventListener("blur", () => { GF.typing = false; GF.uiOpen = false; });
    ci.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doSendChat(); } });
  }
  if (cs) cs.onclick = doSendChat;

  const KEYS = { i: "ov-inv", x: "ov-skills", p: "ov-equip", l: "ov-lb", c: "ov-config", o: "ov-market", k: "ov-forge", b: "ov-barn", g: "ov-daily" };
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const key = e.key.toLowerCase();
    if (key === "escape") { closeAllOv(); if (typeof hideSeedWheel === "function") hideSeedWheel(); return; }
    if (key === "m") { toggleMenu(); e.preventDefault(); return; }   // M: desplegar/plegar el menú (detalles 29/7)
    if (key >= "1" && key <= "9") { hotSelect(+key - 1); e.preventDefault(); return; }
    if (key === "0") { hotSelect(9); e.preventDefault(); return; }
    if (KEYS[key]) { const id = KEYS[key]; if (isOpen(id)) closeOv(id); else openOv(id); e.preventDefault(); }
  });

  refreshHud();
  tutoSync(true);   // cartel + flecha del tutorial guiado
  setInterval(() => { if (typeof buffTick === "function") buffTick(); tutoSync(); refreshHud(); }, 1000);
}
initUI();
