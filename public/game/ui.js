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
  "ov-forge": () => refreshForge(), "ov-market": () => refreshMarket(), "ov-barn": () => { refreshBarn(); refreshCooking(); },
  "ov-config": () => refreshConfig(), "ov-lb": () => refreshLb(), "ov-daily": () => refreshDaily() };
// los overlays NO bloquean el juego: podés seguir moviéndote/interactuando con la ventana abierta
function openOv(id) { const e = $(id); if (!e) return; e.classList.add("show"); if (OV_REFRESH[id]) OV_REFRESH[id](); }
function closeOv(id) { const e = $(id); if (e) e.classList.remove("show"); }
function closeAllOv() { document.querySelectorAll(".ov.show").forEach(e => e.classList.remove("show")); }

/* ---- HUD ---- */
function refreshHud() { setTxt("s-level", G.level); setTxt("s-prestige", G.prestige); setTxt("s-plata", fmt(G.plata)); setTxt("s-golden", fmt(G.golden)); setTxt("s-week", G.week); setTxt("s-hp", Math.ceil(G.hp) + "/" + G.hpMax); if (typeof refreshHotbar === "function") refreshHotbar(); }

/* ---- inventario por casillas (todo es ítem; arrastrar para reordenar) ---- */
let dndActive = false;   // no re-renderizar mientras se arrastra
function durColor(pct) { return pct > 50 ? "#8fd06a" : pct > 20 ? "#e0c76a" : "#e0705a"; }
function itemView(d) {
  if (!d) return null;
  if (d.kind === "tool") {
    if (d.key === "axe") return { sprite: "axe", emoji: "🔧", label: "Hacha · durabilidad " + toolDur("axe") + "/" + TOOL_DEF.axe.max, dur: Math.round(toolDur("axe") / TOOL_DEF.axe.max * 100) };
    if (d.key === "rod") return { sprite: "fishing_rod", emoji: "🔧", label: "Caña · durabilidad " + toolDur("rod") + "/" + TOOL_DEF.rod.max, dur: Math.round(toolDur("rod") / TOOL_DEF.rod.max * 100) };
    if (d.key === "sword") return { sprite: "sword", emoji: "⚔️", label: "Espada de Hierro · durabilidad " + toolDur("sword") + "/" + TOOL_DEF.sword.max, dur: Math.round(toolDur("sword") / TOOL_DEF.sword.max * 100) };
    if (d.key === "bow") return { sprite: "bow", emoji: "🏹", label: "Arco · durabilidad " + toolDur("bow") + "/" + TOOL_DEF.bow.max, dur: Math.round(toolDur("bow") / TOOL_DEF.bow.max * 100) };
    return { sprite: "hoe", emoji: "🪝", label: "Azada", dur: null };
  }
  if (d.kind === "pick") { const pd = PICK_DEF[d.key]; return { sprite: pd.sprite, emoji: "⛏️", label: pd.label + " · durabilidad " + (G.picks.dur[d.key] || 0) + "/" + pd.dur, dur: Math.round((G.picks.dur[d.key] || 0) / pd.dur * 100) }; }
  if (d.kind === "res") return { sprite: CROP_DEF[d.key] ? "crop_" + d.key : null, emoji: RES_EMOJI[d.key], label: RES_LABEL[d.key], dur: null };
  if (d.kind === "seed") { const cd = CROP_DEF[d.key]; return { sprite: "seed_" + d.key, emoji: cd.emoji, label: cd.label + " (semilla)", dur: null }; }
  if (d.kind === "fish") { const f = FISH_DEF[d.key]; return { sprite: null, emoji: f ? f.emoji : "🐟", label: f ? f.label : "Pez", dur: null }; }
  return { sprite: null, emoji: "?", label: "", dur: null };
}
// si el sprite existe lo muestra; si falla la carga, cae al emoji (sin romper)
function itemIcon(v) {
  if (v.sprite && v.emoji) return `<img src="${GF.spr(v.sprite)}" onerror="this.outerHTML='<span class=&quot;em&quot;>${v.emoji}</span>'">`;
  if (v.sprite) return `<img src="${GF.spr(v.sprite)}">`;
  return `<span class="em">${v.emoji}</span>`;
}
function durBar(v) { return (v.dur != null && v.dur < 100) ? `<span class="durb"><i style="width:${Math.max(0, v.dur)}%;background:${durColor(v.dur)}"></i></span>` : ""; }
function invCellHtml(d, i, rem, zone) {
  if (!d) return `<div class="slot" data-slot="${i}" data-zone="${zone}"></div>`;
  let cnt = "";
  if (d.kind === "res" || d.kind === "seed" || d.kind === "fish") { const k = d.kind + ":" + d.key; const n = Math.min(99, rem[k] || 0); rem[k] = (rem[k] || 0) - n; cnt = `<span class="cnt">${fmt(n)}</span>`; }
  const v = itemView(d);
  const sel = (d.kind === "seed" && G.selSeed === d.key) ? " sel" : "";
  const eq = (d.kind === "pick" && G.picks.eq === d.key) ? " eq" : "";
  return `<div class="slot filled${sel}${eq}" draggable="true" data-slot="${i}" data-zone="${zone}" title="${v.label}">${itemIcon(v)}${cnt}${durBar(v)}</div>`;
}
function refreshInv() {
  syncSlots();
  const cap = invSlots(), rem = {};
  ITEM_RES_ORDER.forEach(r => rem["res:" + r] = Math.floor(G.res[r] || 0));
  CROP_ORDER.forEach(s => rem["seed:" + s] = Math.floor(G.seeds[s] || 0));
  FISH_ORDER.forEach(f => rem["fish:" + f] = Math.floor((G.fish && G.fish[f]) || 0));
  let html = "";
  for (let i = 0; i < cap; i++) html += invCellHtml(G.slots[i], i, rem, "inv");
  $("inv-slots").innerHTML = html;
  const used = canonicalStacks().length, cap2 = $("inv-cap"); if (cap2) cap2.textContent = `Bolsa: ${used}/${cap} · recursos y semillas apilan hasta 99`;
  const ss = $("inv-selseed"); if (ss && CROP_DEF[G.selSeed]) ss.textContent = "🌱 Plantando: " + CROP_DEF[G.selSeed].emoji + " " + CROP_DEF[G.selSeed].label + " · clic una semilla para cambiar";
  renderInvExpand();
  bindZoneDnD($("inv-slots"), "inv");
  $("inv-slots").querySelectorAll("[data-slot]").forEach(c => c.addEventListener("click", () => invCellClick(+c.dataset.slot)));
  refreshHotbar();
}
function invCellClick(i) {
  const d = G.slots[i]; if (!d) return;
  if (d.kind === "seed") { if (!cropUnlocked(d.key)) { toast("Necesitás Cultivo nivel " + CROP_DEF[d.key].lvl); return; } selectSeed(d.key); toast("🌱 Plantando: " + CROP_DEF[d.key].label); }
  else if (d.kind === "pick") { if (G.picks.owned[d.key]) equipPick(d.key); }
}

// botón para ampliar la bolsa (+6): primera fila con minerales, siguientes con plata
function renderInvExpand() {
  const el = $("inv-expand"); if (!el) return;
  const nc = nextInvCost();
  if (!nc) { el.innerHTML = '<span class="exmax">Bolsa al máximo (' + invSlots() + ')</span>'; return; }
  const label = nc.type === "res" ? Object.keys(nc.cost).map(k => RES_EMOJI[k] + nc.cost[k]).join(" ") : "🪙 " + fmt(nc.cost);
  const aff = nc.type === "res" ? canAfford(nc.cost) : G.plata >= nc.cost;
  el.innerHTML = '<button class="green sm" id="inv-expbtn" ' + (aff ? "" : "disabled") + '>Ampliar +6 · ' + label + "</button>";
  const b = $("inv-expbtn"); if (b) b.onclick = expandInv;
}

/* ---- barra de accesos directos (hotbar de 10 huecos) ---- */
function hotItemExists(d) {
  if (!d) return false;
  if (d.kind === "pick") return !!G.picks.owned[d.key];
  if (d.kind === "res") return (G.res[d.key] || 0) > 0;
  if (d.kind === "seed") return (G.seeds[d.key] || 0) > 0;
  if (d.kind === "fish") return ((G.fish && G.fish[d.key]) || 0) > 0;
  return true;   // herramientas siempre están
}
function hotCellHtml(d, i) {
  const num = `<span class="hk">${i === 9 ? 0 : i + 1}</span>`;
  const on = (G.hotSel === i) ? " on" : "";
  if (!d) return `<div class="hcell${on}" data-slot="${i}" data-zone="hot">${num}</div>`;
  const v = itemView(d);
  let cnt = ""; if (d.kind === "res") cnt = `<span class="cnt">${fmt(G.res[d.key] || 0)}</span>`; if (d.kind === "seed") cnt = `<span class="cnt">${fmt(G.seeds[d.key] || 0)}</span>`; if (d.kind === "fish") cnt = `<span class="cnt">${fmt((G.fish && G.fish[d.key]) || 0)}</span>`;
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
  box.querySelectorAll("[data-slot]").forEach(c => c.addEventListener("click", () => hotSelect(+c.dataset.slot)));
}
// seleccionar hueco de la hotbar (= herramienta "en mano"); equipa pico / elige semilla si corresponde
function hotSelect(i) {
  if (i < 0 || i > 9) return;
  G.hotSel = i;
  const d = G.hotbar[i];
  if (d) {
    if (d.kind === "pick" && G.picks.owned[d.key]) equipPick(d.key);
    else if (d.kind === "seed" && cropUnlocked(d.key)) selectSeed(d.key);
  }
  const v = d ? itemView(d) : null;
  toast(v ? "✋ " + v.label : "Hueco " + (i === 9 ? 0 : i + 1) + " vacío");
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
  if (isOpen("ov-inv")) refreshInv(); else refreshHotbar();
}

/* ---- skills ---- */
function refreshSkills() {
  $("sk-avg").innerHTML = "Nivel medio: <b>" + avgSkillLevel().toFixed(1) + "</b>";
  $("sk-grid").innerHTML = SKILL_DEFS.map(([k, ic, nm]) => { const inf = skillInfo(G.skills[k]); const pct = Math.round(inf.into / inf.need * 100); const soon = (k === "range" && G.skills[k] === 0) ? " · próximamente" : "";
    return `<div class="skrow"><span class="ic">${ic}</span><div class="body"><div class="nm"><span>${nm}</span><span class="lv">Nv. ${inf.lvl}</span></div><div class="skbar"><i style="width:${pct}%"></i></div><div class="xp">${fmt(inf.into)}/${fmt(inf.need)} XP${soon}</div></div></div>`; }).join("");
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
  // slots de combate: armaduras equipadas, arma y munición
  const fill = (id, on, em, nm) => { const el = $(id); if (!el) return; el.classList.toggle("ghost", !on); el.innerHTML = "<span>" + em + "</span><i>" + nm + "</i>"; };
  const gearSlot = (id, slot, fallbackEm, fallbackNm) => { const g = G.gear && G.gear[slot]; const gd = g && GEAR_DEF[g]; fill(id, !!gd, gd ? gd.emoji : fallbackEm, gd ? gd.label + " +" + gd.def : fallbackNm); };
  gearSlot("eq-casco", "casco", "⛑️", "Casco");
  gearSlot("eq-armadura", "armadura", "🥋", "Armadura");
  gearSlot("eq-botas", "botas", "🥾", "Botas");
  gearSlot("eq-escudo", "escudo", "🛡️", "Escudo");
  fill("eq-arma", G.swordOwned, "⚔️", G.swordOwned ? "Espada de Hierro" : "Arma");
  const fl = (G.res && G.res.flecha) || 0;
  fill("eq-municion", fl > 0, "➳", fl > 0 ? fl + " flechas" : "Munición");
  const ed = $("eq-def"); if (ed) ed.textContent = "Defensa total: " + gearDefTotal() + (G.bowOwned ? " · 🏹 Arco equipado" : "");
}

/* ---- cofre diario ---- */
function refreshDaily() {
  const box = $("dy-locks"); if (!box || typeof dailyState !== "function") return;
  const st = dailyState();
  const claimed = (G.daily && G.daily.day) || 0;
  const base = st.claimable ? st.day - 1 : claimed;   // días ya cobrados de esta racha
  $("dy-banner").innerHTML = st.claimable
    ? "Día <b>" + st.day + "</b> de 7 — reclamá tu recompensa de hoy."
    : "Día <b>" + (claimed || 1) + "</b> de 7 reclamado ✔ — volvé mañana.";
  box.innerHTML = DAILY_REWARDS.map((r, i) => {
    const d = i + 1;
    let cls = "fut", ic = "🔒";
    if (d <= base) { cls = "done"; ic = "✅"; }
    else if (st.claimable && d === st.day) { cls = "now"; ic = "🎁"; }
    return `<div class="dylock ${cls}" title="${r.label}"><div class="ic">${ic}</div><div class="dl">Día ${d}</div></div>`;
  }).join("");
  const idx = (st.claimable ? st.day : Math.max(1, claimed)) - 1;
  $("dy-reward").innerHTML = (st.lost ? '<span class="bad">😢 Perdiste la racha — volvés al Día 1.</span>' : "")
    + (st.claimable ? "Hoy: " : "Reclamado: ") + DAILY_REWARDS[idx].label
    + (st.lost ? '<br><button class="ghost sm" id="dy-recover">Recuperar racha · ' + STREAK_RECOVER_COST + ' ✨</button>' : "");
  const rec = $("dy-recover"); if (rec) rec.onclick = () => recoverStreak();
  const b = $("dy-claim");
  if (b) { b.disabled = !st.claimable; b.textContent = st.claimable ? "Reclamar 🎁" : "Vuelve mañana"; }
}

/* ---- sembrado rápido: rueda de semillas (clic derecho en parcela seca) ---- */
function showSeedWheel(px, py, plot) {
  const w = $("seedwheel"); if (!w) return;
  const opts = CROP_ORDER.filter(k => cropUnlocked(k) && (G.seeds[k] || 0) > 0);
  if (!opts.length) { toast("🌱 No tenés semillas — comprá en la Tienda"); return; }
  const c = w.querySelector(".swc");
  c.style.left = px + "px"; c.style.top = py + "px";
  const R = 62;
  c.innerHTML = opts.map((k, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / opts.length;
    const x = Math.round(Math.cos(a) * R), y = Math.round(Math.sin(a) * R);
    const cd = CROP_DEF[k];
    return `<div class="swi" data-k="${k}" title="${cd.label} · crece en ${cd.grow}s" style="left:${x}px;top:${y}px"><span>${cd.emoji}</span><b>×${G.seeds[k]}</b></div>`;
  }).join("") + '<div class="swi center" style="left:0;top:0"><span>🌱</span></div>';
  w.classList.add("show");
  c.querySelectorAll(".swi[data-k]").forEach(el => el.onclick = (ev) => {
    ev.stopPropagation();
    G.selSeed = el.dataset.k; hideSeedWheel();
    if (window.FARM && plot) { FARM.pendingObj = plot; FARM.moveTarget = { x: plot.cx, y: plot.by + 18 }; }
    if (isOpen("ov-inv")) refreshInv();
    if (typeof refreshHotbar === "function") refreshHotbar();
  });
}
function hideSeedWheel() { const w = $("seedwheel"); if (w) w.classList.remove("show"); }

/* ---- herrería ---- */
function refreshForge() {
  const eq = G.picks.eq;
  $("forge-list").innerHTML = PICK_ORDER.map(id => {
    const pd = PICK_DEF[id]; const owned = !!G.picks.owned[id]; const dur = G.picks.dur[id] || 0;
    const mineEmo = ORE_ORDER.filter(o => ORE_DEF[o].tier <= pd.mineTier).map(o => ORE_DEF[o].emoji).join("");
    const costStr = Object.keys(pd.cost).map(k => RES_EMOJI[k] + " " + pd.cost[k]).join(" · ");
    const durPct = owned ? Math.round(dur / pd.dur * 100) : 0;
    let btns = "";
    if (!owned) { const aff = canAfford(pd.cost); btns = '<button class="green sm" ' + (aff ? "" : "disabled") + ' data-craft="' + id + '">Craftear</button>'; }
    else { const isEq = eq === id; btns = '<button class="ghost sm" ' + (isEq ? "disabled" : "") + ' data-equip="' + id + '">' + (isEq ? "Equipado" : "Equipar") + "</button>";
      if (dur < pd.dur) { const rc = repairCostOf(id); const raff = canAfford(rc); const rstr = Object.keys(rc).map(k => RES_EMOJI[k] + rc[k]).join(" "); btns += '<button class="gold sm" ' + (raff ? "" : "disabled") + ' data-repair="' + id + '" title="Reparar: ' + rstr + '">Reparar</button>'; } }
    const img = '<img src="' + GF.spr(pd.sprite) + '">';
    return '<div class="forge-row ' + (eq === id ? "eq" : "") + '"><div class="fic">' + img + '</div><div class="finfo"><div class="fnm">' + pd.label + (eq === id ? ' <span class="tag">equipado</span>' : "") + '</div><div class="fds">Mina: ' + mineEmo + " · " + pd.dur + " usos" + (pd.fast ? " · ⚡ rápido (gasta doble)" : "") + "</div>" + (owned ? '<div class="durbar"><i style="width:' + durPct + '%"></i></div><div class="fds">' + dur + "/" + pd.dur + "</div>" : '<div class="fds">Costo: ' + costStr + "</div>") + "</div><div class=\"fbtns\">" + btns + "</div></div>";
  }).join("");
  $("forge-list").querySelectorAll("[data-craft]").forEach(b => b.onclick = () => craftPick(b.dataset.craft));
  $("forge-list").querySelectorAll("[data-equip]").forEach(b => b.onclick = () => equipPick(b.dataset.equip));
  $("forge-list").querySelectorAll("[data-repair]").forEach(b => b.onclick = () => repairPick(b.dataset.repair));
  refreshTools();
}

// herrería · reparación de hacha, caña y espada (la espada primero se craftea)
function refreshTools() {
  const box = $("forge-tools"); if (!box) return;
  const ids = ["axe", "rod"].concat(G.swordOwned ? ["sword"] : []).concat(G.bowOwned ? ["bow"] : []);
  let html = ids.map(id => {
    const td = TOOL_DEF[id], dur = toolDur(id), pct = Math.round(dur / td.max * 100);
    const rstr = Object.keys(td.repair).map(k => RES_EMOJI[k] + td.repair[k]).join(" ");
    const btn = dur < td.max
      ? '<button class="gold sm" ' + (canAfford(td.repair) ? "" : "disabled") + ' data-rtool="' + id + '" title="Reparar: ' + rstr + '">Reparar</button>'
      : '<button class="ghost sm" disabled>100%</button>';
    return '<div class="forge-row"><div class="fic"><img src="' + GF.spr(td.sprite) + '" onerror="this.outerHTML=\'' + td.emoji + '\'"></div><div class="finfo"><div class="fnm">' + td.label + '</div><div class="durbar"><i style="width:' + pct + '%"></i></div><div class="fds">' + dur + "/" + td.max + " · reparar: " + rstr + '</div></div><div class="fbtns">' + btn + "</div></div>";
  }).join("");
  if (!G.swordOwned) {
    const cstr = Object.keys(SWORD_COST).map(k => RES_EMOJI[k] + " " + SWORD_COST[k]).join(" · ");
    html += '<div class="forge-row"><div class="fic">⚔️</div><div class="finfo"><div class="fnm">Espada de Hierro</div><div class="fds">Para pelear en el Bosque · daño según skill Espada</div><div class="fds">Costo: ' + cstr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(SWORD_COST) ? "" : "disabled") + ' id="forge-sword">Craftear</button></div></div>';
  }
  if (!G.bowOwned) {
    const bstr = Object.keys(BOW_COST).map(k => RES_EMOJI[k] + " " + BOW_COST[k]).join(" · ");
    html += '<div class="forge-row"><div class="fic">🏹</div><div class="finfo"><div class="fnm">Arco</div><div class="fds">Ataque a distancia · daño según skill Arco · consume flechas</div><div class="fds">Costo: ' + bstr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(BOW_COST) ? "" : "disabled") + ' id="forge-bow">Craftear</button></div></div>';
  }
  const astr = Object.keys(ARROW_COST).map(k => RES_EMOJI[k] + " " + ARROW_COST[k]).join(" · ");
  html += '<div class="forge-row"><div class="fic">➳</div><div class="finfo"><div class="fnm">Flechas ×10</div><div class="fds">Tenés ' + fmt(G.res.flecha || 0) + ' · Costo: ' + astr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(ARROW_COST) ? "" : "disabled") + ' id="forge-arrows">Craftear</button></div></div>';
  box.innerHTML = html;
  box.querySelectorAll("[data-rtool]").forEach(b => b.onclick = () => repairTool(b.dataset.rtool));
  const fs = $("forge-sword"); if (fs) fs.onclick = () => craftSword();
  const fb = $("forge-bow"); if (fb) fb.onclick = () => craftBow();
  const fa = $("forge-arrows"); if (fa) fa.onclick = () => craftArrows();
}

/* ---- cocina (en la Granja) ---- */
function refreshCooking() {
  const box = $("cook-list"); if (!box) return;
  box.innerHTML = RECIPE_ORDER.map(id => {
    const r = RECIPE_DEF[id];
    const parts = [];
    if (r.fish) for (const k in r.fish) parts.push(FISH_DEF[k].emoji + " ×" + r.fish[k]);
    if (r.res) for (const k in r.res) parts.push(RES_EMOJI[k] + " ×" + r.res[k]);
    return '<div class="forge-row"><div class="fic">' + r.emoji + '</div><div class="finfo"><div class="fnm">' + r.label + '</div><div class="fds">' + r.desc + '</div><div class="fds">Ingredientes: ' + parts.join(" · ") + '</div></div><div class="fbtns"><button class="green sm" ' + (canCook(id) ? "" : "disabled") + ' data-cook="' + id + '">Cocinar</button></div></div>';
  }).join("");
  box.querySelectorAll("[data-cook]").forEach(b => b.onclick = () => cook(b.dataset.cook));
}

/* ---- mercado / tienda ---- */
function refreshMarket() {
  const cur = marketCur;
  $("mkt-list").innerHTML = SELLABLE.map(res => { const owned = G.res[res] || 0; const u = marketUnit(res); const uStr = cur === "plata" ? `${u} de plata c/u` : `${u.toFixed(1)} $Golden c/u`;
    return `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: CROP_DEF[res] ? "crop_" + res : null, emoji: RES_EMOJI[res] })}</span><div class="minfo"><div class="mnm">${RES_LABEL[res]}</div><div class="mds">Tenés ${fmt(owned)} · ${uStr}</div></div><input id="mq-${res}" type="number" min="0" max="${owned}" value="${owned > 0 ? owned : 0}"><button class="vbtn" id="vb-${res}">Vender</button></div>`; }).join("");
  SELLABLE.forEach(res => { const btn = $("vb-" + res); if (btn) btn.onclick = () => sellItem(res); });
  document.querySelectorAll(".curbtn").forEach(b => b.classList.toggle("active", b.dataset.cur === cur));
  refreshSeedShop();
}

// tienda de semillas: comprar con plata, bloqueadas por nivel de Cultivo
function refreshSeedShop() {
  const box = $("seed-shop"); if (!box) return;
  box.innerHTML = CROP_ORDER.map(k => {
    const cd = CROP_DEF[k], unlocked = cropUnlocked(k), aff = G.plata >= cd.seedCost;
    const controls = unlocked
      ? `<input id="sq-${k}" type="number" min="1" value="1"><button class="green sm" data-buy="${k}" ${aff ? "" : "disabled"}>Comprar · 🪙${cd.seedCost} c/u</button>`
      : `<button class="ghost sm" disabled>🔒 Cultivo nv ${cd.lvl}</button>`;
    return `<div class="mkt-row"><span class="mimg">${itemIcon({ sprite: "seed_" + k, emoji: cd.emoji })}</span><div class="minfo"><div class="mnm">${cd.label} <span class="seedlv">nv ${cd.lvl}</span></div><div class="mds">Semilla · crece en ${cd.grow}s · tenés ${fmt(G.seeds[k] || 0)}</div></div>${controls}</div>`;
  }).join("");
  box.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const inp = $("sq-" + b.dataset.buy); buySeed(b.dataset.buy, inp ? +inp.value : 1); });
}

/* ---- granja (nivel) ---- */
function refreshBarn() {
  $("barn-yield").textContent = "Yield actual +" + ((yieldMult() - 1) * 100).toFixed(1) + "%";
  const bar = $("lvlbar"), cost = $("lvlcost"), lb = $("levelup"), pb = $("prestige");
  if (G.level >= 10) { bar.style.width = "100%"; cost.innerHTML = "<b>Nivel máximo.</b> Reiniciá la granja para yield permanente."; lb.style.display = "none"; pb.style.display = "inline-block"; }
  else { const n = LEVELS[G.level + 1]; lb.style.display = "inline-block"; pb.style.display = "none"; lb.textContent = "Subir a nivel " + (G.level + 1); lb.disabled = !canLevel();
    let parts = [], prog = []; for (const k in n) { const h = G.res[k] || 0, miss = h < n[k]; parts.push(`<span class="${miss ? "miss" : ""}">${RES_EMOJI[k]} ${fmt(h)}/${n[k]}</span>`); prog.push(Math.min(1, h / n[k])); }
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

function lbRowHtml(r, i, col) { const rank = i + 1; const cls = (r.me ? "me " : "") + (rank <= 3 ? "top" + rank : ""); const val = col === "plata" ? `<span class="coin silver"></span>${fmt(r.v)}` : `⭐ ${(+r.v).toFixed(1)}`; return `<div class="lbrow ${cls}"><span class="rk">${rank}</span><span class="nm">${escapeHtml(r.n || "—")}</span><span class="val">${val}</span></div>`; }

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
function showSaved() { const el = $("saveind"); if (!el) return; el.className = "show"; el.querySelector(".sdot").textContent = "✓"; el.querySelector(".stxt").textContent = "Guardado"; clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 1600); }

/* ---- chat ---- */
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function renderChatMsg(m) {
  const box = $("chat-msgs"); if (!box || !m) return;
  const d = document.createElement("div"); d.className = "cm";
  d.innerHTML = "<b>" + escapeHtml(m.name || "?") + ":</b> " + escapeHtml(m.text || "");
  box.appendChild(d); while (box.children.length > 60) box.removeChild(box.firstChild); box.scrollTop = box.scrollHeight;
}
function doSendChat() { const ci = $("chat-in"); if (!ci) return; const t = ci.value.trim(); if (!t) return; if (typeof sendChat === "function") sendChat(t); ci.value = ""; }

/* ---- panel registro/chat: mover posición (botón ✥) ---- */
function initPanelDrag() {
  const panel = $("logpanel"), btn = $("logmove");
  if (!panel || !btn) return;
  let moving = false, drag = null;

  function applyPos(left, top) {
    const w = panel.offsetWidth, h = panel.offsetHeight;
    left = Math.max(4, Math.min(left, window.innerWidth - w - 4));
    top = Math.max(4, Math.min(top, window.innerHeight - h - 4));
    panel.style.left = left + "px"; panel.style.top = top + "px"; panel.style.bottom = "auto";
  }
  // restaurar posición guardada (por dispositivo)
  try { const s = JSON.parse(localStorage.getItem("gf_logpos") || "null"); if (s && typeof s.left === "number") applyPos(s.left, s.top); } catch (e) {}
  // si cambia el tamaño de la ventana, re-encajar dentro de la pantalla
  window.addEventListener("resize", () => { if (panel.style.top && panel.style.top !== "auto") applyPos(parseFloat(panel.style.left) || 0, parseFloat(panel.style.top) || 0); });

  btn.onclick = (e) => {
    e.stopPropagation();
    moving = !moving;
    panel.classList.toggle("moving", moving);
    btn.classList.toggle("active", moving);
    btn.title = moving ? "Fijar posición" : "Mover panel";
    toast(moving ? "✥ Arrastrá el panel para moverlo" : "📌 Posición fijada");
  };

  panel.addEventListener("pointerdown", (e) => {
    if (!moving) return;
    if (e.target.closest(".logmove, .logmin")) return;   // los botones siguen funcionando
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    try { panel.setPointerCapture(e.pointerId); } catch (er) {}
  });
  panel.addEventListener("pointermove", (e) => { if (drag) applyPos(e.clientX - drag.dx, e.clientY - drag.dy); });
  const end = () => {
    if (!drag) return; drag = null;
    const r = panel.getBoundingClientRect();
    try { localStorage.setItem("gf_logpos", JSON.stringify({ left: r.left, top: r.top })); } catch (e) {}
  };
  panel.addEventListener("pointerup", end);
  panel.addEventListener("pointercancel", end);
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

/* ---- init ---- */
function initUI() {
  GF.uiOpen = false;
  const gmenu = $("gmenu");
  const toggleMenu = () => gmenu.classList.toggle("collapsed");
  const gt = $("gmtoggle"); if (gt) gt.onclick = toggleMenu;
  const mb = $("menu-btn"); if (mb) mb.onclick = toggleMenu;
  document.querySelectorAll(".gmi").forEach(b => b.onclick = () => { closeAllOv(); openOv(b.dataset.panel); gmenu.classList.add("collapsed"); });
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeOv(b.dataset.close));
  initOverlayDrag();
  const lu = $("levelup"); if (lu) lu.onclick = levelUp;
  const pr = $("prestige"); if (pr) pr.onclick = prestige;
  document.querySelectorAll(".curbtn").forEach(b => b.onclick = () => { marketCur = b.dataset.cur; refreshMarket(); });
  document.querySelectorAll(".lbtab").forEach(b => b.onclick = () => { lbTab = b.dataset.lb; refreshLb(); });
  document.querySelectorAll(".shoptab").forEach(b => b.onclick = () => {
    document.querySelectorAll(".shoptab").forEach(x => x.classList.toggle("active", x === b));
    const s = b.dataset.shop;
    $("shop-buy").style.display = s === "buy" ? "" : "none";
    $("shop-sell").style.display = s === "sell" ? "" : "none";
  });
  // modo edición: cierra las ventanas y deja solo dos botoncitos flotantes sobre la hotbar
  window.setEditMode = (on) => {
    GF.editMode = on;
    const ce2 = $("cfg-edit"); if (ce2) ce2.textContent = on ? "✓ Terminar edición" : "Modo edición";
    const eb = $("editbar"); if (eb) eb.classList.toggle("show", on);
    if (on) { closeAllOv(); toast("✏️ Arrastrá los objetos a otra celda"); }
    else toast("📌 Edición terminada");
  };
  const doFarmReset = () => { G.layout = {}; G.layoutPlots = {}; G.layoutPond = null; if (typeof saveFarm === "function") saveFarm(true); if (window.FARM && window.FARM.scene) window.FARM.scene.restart(); toast("↺ Granja restaurada"); };
  const ce = $("cfg-edit"); if (ce) ce.onclick = () => setEditMode(!GF.editMode);
  const cr = $("cfg-reset"); if (cr) cr.onclick = doFarmReset;
  const ed = $("edit-done"); if (ed) ed.onclick = () => setEditMode(false);
  const er = $("edit-reset"); if (er) er.onclick = doFarmReset;
  const dc = $("dy-claim"); if (dc) dc.onclick = () => claimDaily();
  const sw = $("seedwheel"); if (sw) sw.onclick = hideSeedWheel;
  const lm = $("logmin"); if (lm) lm.onclick = () => $("logpanel").classList.toggle("collapsed");
  initPanelDrag();
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
    if (key >= "1" && key <= "9") { hotSelect(+key - 1); e.preventDefault(); return; }
    if (key === "0") { hotSelect(9); e.preventDefault(); return; }
    if (KEYS[key]) { const id = KEYS[key]; if (isOpen(id)) closeOv(id); else { closeAllOv(); openOv(id); } e.preventDefault(); }
  });

  refreshHud();
  setInterval(refreshHud, 1000);
}
initUI();
