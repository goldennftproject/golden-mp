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
  "ov-cofre": () => refreshChest(),
  "ov-config": () => refreshConfig(), "ov-lb": () => refreshLb(), "ov-daily": () => refreshDaily() };
// los overlays NO bloquean el juego: podés seguir moviéndote/interactuando con la ventana abierta
// sonido propio de cada edificio al abrir su ventana (pedido del diseñador)
const OV_SFX = { "ov-market": "shop", "ov-forge": "forge", "ov-barn": "door", "ov-cocina": "door", "ov-cofre": "door", "ov-daily": "coin" };
function openOv(id) { const e = $(id); if (!e) return; e.classList.add("show"); if (window.sfx) sfx(OV_SFX[id] || "click"); if (OV_REFRESH[id]) OV_REFRESH[id](); }
function closeOv(id) { const e = $(id); if (e) e.classList.remove("show"); }
function closeAllOv() { document.querySelectorAll(".ov.show").forEach(e => e.classList.remove("show")); }

/* ---- HUD ---- */
function refreshHud() { setTxt("s-level", G.level); setTxt("s-prestige", G.prestige); setTxt("s-plata", fmt(G.plata)); setTxt("s-golden", fmt(G.golden)); setTxt("s-week", G.week); setTxt("s-hp", Math.ceil(G.hp) + "/" + G.hpMax); if (typeof checkCooking === "function") checkCooking(); if (typeof refreshHotbar === "function") refreshHotbar(); }

/* ---- inventario por casillas (todo es ítem; arrastrar para reordenar) ---- */
let dndActive = false;   // no re-renderizar mientras se arrastra
function durColor(pct) { return pct > 50 ? "#8fd06a" : pct > 20 ? "#e0c76a" : "#e0705a"; }
function itemView(d) {
  if (!d) return null;
  if (d.kind === "tool") {
    if (d.key === "axe") return { sprite: "axe", emoji: "🔧", label: "Hacha · 1 uso cada una · tenés " + toolCount("axe"), dur: null };
    if (d.key === "rod") return { sprite: "fishing_rod", emoji: "🔧", label: "Caña · 1 uso cada una · tenés " + toolCount("rod"), dur: null };
    if (d.key === "sword") return { sprite: "sword", emoji: "⚔️", label: "Espada de Hierro · durabilidad " + toolDur("sword") + "/" + TOOL_DEF.sword.max, dur: Math.round(toolDur("sword") / TOOL_DEF.sword.max * 100) };
    if (d.key === "bow") return { sprite: "bow", emoji: "🏹", label: "Arco · durabilidad " + toolDur("bow") + "/" + TOOL_DEF.bow.max, dur: Math.round(toolDur("bow") / TOOL_DEF.bow.max * 100) };
    return { sprite: "hoe", emoji: "🪝", label: "Azada", dur: null };
  }
  if (d.kind === "pick") { const pd = PICK_DEF[d.key]; const glow = d.key === "diamond" ? "glow-cyan" : (d.key === "netherite" ? "glow-fire" : (d.key === "gold" ? "glow-gold" : "")); return { sprite: pd.sprite, emoji: "⛏️", glow, label: pd.label + " · 1 uso cada uno · tenés " + pickCount(d.key), dur: null }; }
  if (d.kind === "res") return { sprite: resSprite(d.key), emoji: RES_EMOJI[d.key], label: RES_LABEL[d.key], dur: null };
  if (d.kind === "seed") { const cd = CROP_DEF[d.key]; return { sprite: "seed_" + d.key, emoji: cd.emoji, label: cd.label + " (semilla)", dur: null }; }
  if (d.kind === "fish") { const f = FISH_DEF[d.key]; const glow = { raro: "glow-blue", epico: "glow-purple", legendario: "glow-gold" }[d.key] || ""; return { sprite: f ? f.sprite : null, emoji: f ? f.emoji : "🐟", glow, label: f ? f.label : "Pez", dur: null }; }
  if (d.kind === "dish") { const r = RECIPE_DEF[d.key]; return { sprite: r ? r.sprite : null, emoji: r ? r.emoji : "🍲", label: r ? r.label + " · clic para comer (" + r.desc + ")" : "Plato", dur: null }; }
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
  if (d.kind === "res")  return { n: Math.min(99, Math.floor(G.res[d.key] || 0)), lbl: RES_LABEL[d.key] || d.key };
  if (d.kind === "seed") return { n: Math.min(99, Math.floor(G.seeds[d.key] || 0)), lbl: "semillas de " + (CROP_DEF[d.key] ? CROP_DEF[d.key].label : d.key) };
  if (d.kind === "fish") return { n: Math.min(99, Math.floor((G.fish && G.fish[d.key]) || 0)), lbl: (FISH_DEF[d.key] ? FISH_DEF[d.key].label : "peces") };
  if (d.kind === "dish") return { n: Math.min(99, Math.floor((G.dishes && G.dishes[d.key]) || 0)), lbl: (RECIPE_DEF[d.key] ? RECIPE_DEF[d.key].label : "platos") };
  // herramientas y picos SÍ se tiran (pedido del diseñador 31/7); apilables: se tira la pila
  if (d.kind === "tool") {
    if (d.key === "axe" || d.key === "rod") return { n: Math.min(99, toolCount(d.key)), lbl: TOOL_DEF[d.key].label };
    return { n: 1, lbl: d.key === "hoe" ? "Azada" : (TOOL_DEF[d.key] ? TOOL_DEF[d.key].label : "la herramienta") };
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
    else if (d.key === "bow") { G.bowOwned = false; delete G.tools.bow; if (G.gear.arma === "bow") G.gear.arma = null; }
    else if (d.key === "axe" || d.key === "rod") { const n = Math.min(99, toolCount(d.key)); G.tools[d.key] = toolCount(d.key) - n; }   // tira la pila (hasta 99)
    G.hotbar = G.hotbar.map(h => (h && h.kind === "tool" && h.key === d.key && toolDur(d.key) <= 0) ? null : h);
    toast("Tiraste " + (d.key === "hoe" ? "la Azada" : (TOOL_DEF[d.key] ? TOOL_DEF[d.key].label : "la herramienta")));
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
  $("sk-grid").innerHTML = SKILL_DEFS.map(([k, ic, nm]) => { const inf = skillInfo(G.skills[k]); const pct = Math.round(inf.into / inf.need * 100); const soon = (k === "range" && G.skills[k] === 0) ? " · próximamente" : "";
    return `<div class="skrow"><span class="ic"><img class="skic" src="${GF.spr("sk_" + k)}" onerror="this.outerHTML='${ic}'"></span><div class="body"><div class="nm"><span>${nm}</span><span class="lv">Nv. ${inf.lvl}</span></div><div class="skbar"><i style="width:${pct}%"></i></div><div class="xp">${fmt(inf.into)}/${fmt(inf.need)} XP${soon}</div></div></div>`; }).join("");
}

/* ---- equipo (slots estilo RPG; armadura/armas llegan con el combate) ---- */
function refreshEquip() {
  const box = $("eq-grid"); if (!box) return;
  const eq = G.picks.eq, pd = eq ? PICK_DEF[eq] : null;
  const cells = [
    { sprite: "hoe", nm: "Azada", dur: 1, max: 1, st: "∞ no se gasta" },
    { sprite: "axe", nm: "Hacha", dur: toolDur("axe"), max: TOOL_DEF.axe.max },
    { sprite: pd ? pd.sprite : "pick_stone", nm: pd ? pd.label : "Sin pico", dur: pd ? (G.picks.dur[eq] || 0) : 0, max: pd ? pd.dur : 1 },
    { sprite: "fishing_rod", nm: "Caña", dur: toolDur("rod"), max: TOOL_DEF.rod.max },
  ];
  if (G.swordOwned) cells.push({ sprite: "sword", nm: "Espada de Hierro", dur: toolDur("sword"), max: TOOL_DEF.sword.max });
  box.innerHTML = cells.map(c => {
    const pct = Math.max(0, Math.min(100, Math.round(c.dur / c.max * 100)));
    const col = pct > 50 ? "#7ec95a" : (pct > 20 ? "#e2b23a" : "#d9534f");
    return `<div class="eqtool" title="${c.nm} · ${c.st || c.dur + "/" + c.max}"><img src="${GF.spr(c.sprite)}" onerror="this.outerHTML='⚔️'"><div class="db"><i style="width:${pct}%;background:${col}"></i></div></div>`;
  }).join("");
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
  fill("eq-arma", !!arma, arma === "bow" ? spIc("bow", "") : spIc("sword", ""),
    arma ? (arma === "bow" ? "Arco equipado" : "Espada de Hierro equipada") + " · clic para cambiar" : "Arma · clic para equipar");
  const armaEl = $("eq-arma");
  if (armaEl) armaEl.onclick = () => {
    const opts = [null]; if (G.swordOwned) opts.push("sword"); if (G.bowOwned) opts.push("bow");
    if (opts.length === 1) { toast("No tenés armas — crafteálas en la Herrería"); return; }
    G.gear.arma = opts[(opts.indexOf(G.gear.arma) + 1) % opts.length];
    toast(G.gear.arma === "sword" ? "Espada equipada" : (G.gear.arma === "bow" ? "Arco equipado" : "Arma desequipada"));
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
    return `<div class="swi" data-k="${k}" title="${cd.label} · crece en ${cd.grow}s" style="left:${x}px;top:${y}px"><img class="swimg" src="${GF.spr("seed_" + k)}" onerror="this.outerHTML='<span>${cd.emoji}</span>'"><b>×${G.seeds[k]}</b></div>`;
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
    const cs = (Object.keys(tc.cost).map(k => resIc(k) + " " + tc.cost[k]).join(" · ") + " · ").replace(/^ · $/, "") + coinIc("plata") + " " + tc.plata;
    const btn = '<button class="green sm" ' + (canAfford(tc.cost) && G.plata >= tc.plata ? "" : "disabled") + ' data-ctool="' + id + '">Craftear</button>';
    craft += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(td.sprite) + '"></div><div class="finfo"><div class="fnm">' + td.label + '</div><div class="fds">1 uso c/u · tenés ' + n + '</div><div class="fds">Costo: ' + cs + '</div></div><div class="fbtns">' + btn + '</div></div>';
  });
  // solo las ARMAS se reparan → Reparar
  [].concat(G.swordOwned ? ["sword"] : []).concat(G.bowOwned ? ["bow"] : []).forEach(id => {
    const td = TOOL_DEF[id], dur = toolDur(id), pct = Math.round(dur / td.max * 100);
    const rstr = Object.keys(td.repair).map(k => resIc(k) + td.repair[k]).join(" ");
    const btn = dur < td.max
      ? '<button class="gold sm" ' + (canAfford(td.repair) ? "" : "disabled") + ' data-rtool="' + id + '" title="Reparar: ' + rstr + '">Reparar</button>'
      : '<button class="ghost sm" disabled>100%</button>';
    repair += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(td.sprite) + '" onerror="this.outerHTML=\'' + td.emoji + '\'"></div><div class="finfo"><div class="fnm">' + td.label + '</div><div class="durbar"><i style="width:' + pct + '%"></i></div><div class="fds">' + dur + "/" + td.max + " · reparar: " + rstr + '</div></div><div class="fbtns">' + btn + "</div></div>";
  });
  // armas y flechas → pestaña ARMAS (detalles viernes: no se mezclan con las herramientas)
  let armas = "";
  if (!G.swordOwned) {
    const cstr = Object.keys(SWORD_COST).map(k => resIc(k) + " " + SWORD_COST[k]).join(" · ");
    armas += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("sword") + '" onerror="this.outerHTML=\'⚔️\'"></div><div class="finfo"><div class="fnm">Espada de Hierro</div><div class="fds">Para pelear en la Zona Negra · daño según skill Espada</div><div class="fds">Costo: ' + cstr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(SWORD_COST) ? "" : "disabled") + ' id="forge-sword">Craftear</button></div></div>';
  }
  if (!G.bowOwned) {
    const bstr = Object.keys(BOW_COST).map(k => resIc(k) + " " + BOW_COST[k]).join(" · ");
    armas += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("bow") + '" onerror="this.outerHTML=\'🏹\'"></div><div class="finfo"><div class="fnm">Arco</div><div class="fds">Ataque a distancia · daño según skill Arco · consume flechas</div><div class="fds">Costo: ' + bstr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(BOW_COST) ? "" : "disabled") + ' id="forge-bow">Craftear</button></div></div>';
  }
  const astr = Object.keys(ARROW_COST).map(k => resIc(k) + " " + ARROW_COST[k]).join(" · ");
  armas += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("res_flecha") + '" onerror="this.outerHTML=\'➳\'"></div><div class="finfo"><div class="fnm">Flechas ×10</div><div class="fds">Tenés ' + fmt(G.res.flecha || 0) + ' · Costo: ' + astr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(ARROW_COST) ? "" : "disabled") + ' id="forge-arrows">Craftear</button></div></div>';
  // cofre depósito: 10 espacios + 1% de materiales por cofre
  G.chests = G.chests || [];
  const chn = G.chests.length, chFull = chn >= CHEST_MAX;
  const chstr = Object.keys(CHEST_COST).map(k => resIc(k) + " " + CHEST_COST[k]).join(" · ") + " · " + coinIc("plata") + " " + CHEST_PLATA;
  const chOk = !chFull && canAfford(CHEST_COST) && G.plata >= CHEST_PLATA;
  craft += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("cofre") + '" onerror="this.outerHTML=\'📦\'"></div><div class="finfo"><div class="fnm">Cofre depósito (' + chn + "/" + CHEST_MAX + ')</div><div class="fds">10 espacios de guardado en tu granja · +1% de materiales por cofre (tenés +' + chn + '%)</div><div class="fds">Costo: ' + chstr + '</div></div><div class="fbtns"><button class="green sm" ' + (chOk ? "" : "disabled") + ' id="forge-chest">' + (chFull ? "Máximo" : "Craftear") + "</button></div></div>";

  $("forge-craft").innerHTML = craft || '<div class="sub">Nada por craftear — ya tenés todo. </div>';
  $("forge-armas").innerHTML = armas || '<div class="sub">Ya tenés todas las armas. Las flechas se siguen crafteando acá.</div>';
  $("forge-repair").innerHTML = repair;
  const card = $("ov-forge");
  card.querySelectorAll("[data-craft]").forEach(b => b.onclick = () => craftPick(b.dataset.craft));
  card.querySelectorAll("[data-equip]").forEach(b => b.onclick = () => equipPick(b.dataset.equip));
  card.querySelectorAll("[data-mat]").forEach(b => b.onclick = () => craftMat(b.dataset.mat));
  card.querySelectorAll("[data-repair]").forEach(b => b.onclick = () => repairPick(b.dataset.repair));
  card.querySelectorAll("[data-rtool]").forEach(b => b.onclick = () => repairTool(b.dataset.rtool));
  card.querySelectorAll("[data-ctool]").forEach(b => b.onclick = () => craftTool(b.dataset.ctool));
  const fs = $("forge-sword"); if (fs) fs.onclick = () => craftSword();
  const fb = $("forge-bow"); if (fb) fb.onclick = () => craftBow();
  const fa = $("forge-arrows"); if (fa) fa.onclick = () => craftArrows();
  const fc = $("forge-chest"); if (fc) fc.onclick = () => craftChest();
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
      ? '<button class="green sm" disabled>' + Math.ceil(left / 1000) + 's</button>'
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
  let head = "";
  if (G.cooking) {   // barra de cocción en curso
    const r = RECIPE_DEF[G.cooking.id];
    const left = Math.max(0, G.cooking.endAt - nowMs());
    const pct = Math.round((1 - left / (G.cooking.total || 1)) * 100);
    head = '<div class="forge-row"><div class="fic"></div><div class="finfo"><div class="fnm">Cocinando ' + (r ? r.label : "") + '…</div><div class="durbar"><i style="width:' + pct + '%"></i></div><div class="fds">' + Math.ceil(left / 1000) + 's restantes</div></div></div>';
  }
  box.innerHTML = head + RECIPE_ORDER.map(id => {
    const r = RECIPE_DEF[id];
    const parts = [];
    if (r.fish) for (const k in r.fish) parts.push(fishIc(k) + " ×" + r.fish[k]);
    if (r.res) for (const k in r.res) parts.push(resIc(k) + " ×" + r.res[k]);
    const fic = r.sprite ? '<img src="' + GF.spr(r.sprite) + '" onerror="this.outerHTML=\'' + r.emoji + '\'">' : r.emoji;
    return '<div class="forge-row"><div class="fic">' + fic + '</div><div class="finfo"><div class="fnm">' + r.label + '</div><div class="fds">' + r.desc + '</div><div class="fds">Ingredientes: ' + parts.join(" · ") + '</div></div><div class="fbtns"><button class="green sm" ' + ((canCook(id) && !G.cooking) ? "" : "disabled") + ' data-cook="' + id + '">Cocinar</button></div></div>';
  }).join("");
  box.querySelectorAll("[data-cook]").forEach(b => b.onclick = () => cook(b.dataset.cook));
}

/* ---- mercado / tienda ---- */
function refreshMarket() {
  const cur = marketCur;
  $("mkt-list").innerHTML = SELLABLE.map(res => { const owned = G.res[res] || 0; const u = marketUnit(res); const uStr = cur === "plata" ? `${u} de plata c/u` : `${u.toFixed(1)} $Golden c/u`;
    return `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: resSprite(res), emoji: RES_EMOJI[res] })}</span><div class="minfo"><div class="mnm">${RES_LABEL[res]}</div><div class="mds">Tenés ${fmt(owned)} · ${uStr}</div></div><input id="mq-${res}" type="number" min="0" max="${owned}" value="${owned > 0 ? owned : 0}"><button class="vbtn" id="vb-${res}">Vender</button></div>`; }).join("");
  SELLABLE.forEach(res => { const btn = $("vb-" + res); if (btn) btn.onclick = () => sellItem(res); });
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
    return `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: "seed_" + k, emoji: cd.emoji })}</span><div class="minfo"><div class="mnm">${cd.label} <span class="seedlv">nv ${cd.lvl}</span></div><div class="mds">Semilla · crece en ${cd.grow}s · tenés ${fmt(G.seeds[k] || 0)}</div></div>${controls}</div>`;
  }).join("")
  // carnada (detalles213): lombrices para pescar — fuera del cupo diario de semillas
  + '<div class="shophead">Carnada</div>'
  + `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: "res_lombriz", emoji: "" })}</span><div class="minfo"><div class="mnm">Lombriz</div><div class="mds">Carnada de pesca · 1 por lanzamiento · tenés ${fmt(G.res.lombriz || 0)}</div></div><input id="sq-lombriz" type="number" min="1" value="10"><button class="green sm" id="buy-lombriz" ${G.plata >= WORM_PRICE ? "" : "disabled"}>Comprar · ${coinIc("plata")}${WORM_PRICE} c/u</button></div>`;
  box.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const inp = $("sq-" + b.dataset.buy); buySeed(b.dataset.buy, inp ? +inp.value : 1); });
  const wb = $("buy-lombriz"); if (wb) wb.onclick = () => { const inp = $("sq-lombriz"); buyWorm(inp ? +inp.value : 1); };
}

/* ---- granja (nivel) ---- */
function refreshBarn() {
  $("barn-yield").textContent = "Yield actual +" + ((yieldMult() - 1) * 100).toFixed(1) + "%";
  const bar = $("lvlbar"), cost = $("lvlcost"), lb = $("levelup"), pb = $("prestige");
  if (G.level >= 10) { bar.style.width = "100%"; cost.innerHTML = "<b>Nivel máximo.</b> Reiniciá la granja para yield permanente."; lb.style.display = "none"; pb.style.display = "inline-block"; }
  else { const n = LEVELS[G.level + 1]; lb.style.display = "inline-block"; pb.style.display = "none"; lb.textContent = "Subir a nivel " + (G.level + 1); lb.disabled = !canLevel();
    let parts = [], prog = []; for (const k in n) { const h = G.res[k] || 0, miss = h < n[k]; parts.push(`<span class="${miss ? "miss" : ""}">${resIc(k)} ${fmt(h)}/${n[k]}</span>`); prog.push(Math.min(1, h / n[k])); }
    bar.style.width = (prog.reduce((a, b) => a + b, 0) / prog.length * 100) + "%";
    cost.innerHTML = "Requiere: " + parts.join(" · ") + (G.level + 1 >= 8 ? '<br><span class="cost">Niveles 8-10 piden Oro (PvP a futuro).</span>' : ""); }
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
  p.style.bottom = Math.round(Math.min(window.innerHeight * 0.55, window.innerHeight - r.top + 64)) + "px";   // 31/7: bien despegado de la barra (antes +10 y el cartel la tocaba)
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
  setInterval(refreshHud, 1000);
}
initUI();
