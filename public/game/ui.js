/* Golden Farm · UI (overlay HTML sobre el canvas de Phaser) */
function $(id) { return document.getElementById(id); }
function setTxt(id, v) { const e = $(id); if (e) e.textContent = v; }

/* ---- toast / log ---- */
let toastT = null;
function toast(m) { const t = $("toast"); if (!t) return; t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1400); }
function log(m, k = "") { const b = $("log"); if (!b) return; const d = document.createElement("div"); d.className = "l" + (k ? " " + k : ""); d.textContent = m; b.prepend(d); while (b.children.length > 30) b.removeChild(b.lastChild); }

/* ---- overlays ---- */
function isOpen(id) { const e = $(id); return !!(e && e.classList.contains("show")); }
function anyOvOpen() { return !!document.querySelector(".ov.show"); }
const OV_REFRESH = { "ov-inv": () => refreshInv(), "ov-skills": () => refreshSkills(), "ov-equip": () => refreshEquip(),
  "ov-forge": () => refreshForge(), "ov-market": () => refreshMarket(), "ov-barn": () => refreshBarn(),
  "ov-config": () => refreshConfig(), "ov-lb": () => refreshLb() };
function openOv(id) { const e = $(id); if (!e) return; e.classList.add("show"); GF.uiOpen = true; if (OV_REFRESH[id]) OV_REFRESH[id](); }
function closeOv(id) { const e = $(id); if (e) e.classList.remove("show"); GF.uiOpen = anyOvOpen(); }
function closeAllOv() { document.querySelectorAll(".ov.show").forEach(e => e.classList.remove("show")); GF.uiOpen = false; }

/* ---- HUD ---- */
function refreshHud() { setTxt("s-level", G.level); setTxt("s-prestige", G.prestige); setTxt("s-plata", fmt(G.plata)); setTxt("s-golden", fmt(G.golden)); setTxt("s-week", G.week); }

/* ---- inventario ---- */
function invSlotHtml(s) { const im = s.sprite ? `<img src="${GF.spr(s.sprite)}">` : `<span class="em">${s.em}</span>`; const c = (s.count != null) ? `<span class="cnt">${fmt(s.count)}</span>` : ""; return `<div class="slot filled" title="${s.nm}">${im}${c}</div>`; }
function refreshInv() { const st = invStacks(); let html = ""; for (let i = 0; i < INV_SLOTS; i++) html += st[i] ? invSlotHtml(st[i]) : '<div class="slot"></div>'; $("inv-slots").innerHTML = html; const cap = $("inv-cap"); if (cap) cap.textContent = `Bolsa: ${Math.min(st.length, INV_SLOTS)}/${INV_SLOTS} espacios · máx 99 por recurso`; }

/* ---- skills ---- */
function refreshSkills() {
  $("sk-avg").innerHTML = "Nivel medio: <b>" + avgSkillLevel().toFixed(1) + "</b>";
  $("sk-grid").innerHTML = SKILL_DEFS.map(([k, ic, nm]) => { const inf = skillInfo(G.skills[k]); const pct = Math.round(inf.into / inf.need * 100); const soon = (k === "range" && G.skills[k] === 0) ? " · próximamente" : "";
    return `<div class="skrow"><span class="ic">${ic}</span><div class="body"><div class="nm"><span>${nm}</span><span class="lv">Nv. ${inf.lvl}</span></div><div class="skbar"><i style="width:${pct}%"></i></div><div class="xp">${fmt(inf.into)}/${fmt(inf.need)} XP${soon}</div></div></div>`; }).join("");
}

/* ---- equipo ---- */
function eqCard(sprite, em, nm, st, cls) { const im = sprite ? `<img src="${GF.spr(sprite)}">` : `<span>${em}</span>`; return `<div class="eqcard"><div class="ic">${im}</div><div><div class="nm">${nm}</div><div class="st ${cls || ""}">${st}</div></div></div>`; }
function refreshEquip() {
  let html = "";
  html += eqCard("hoe", "🪝", "Azada", "Lista · para regar/plantar", "ok");
  html += eqCard("axe", "🪓", "Hacha", "Lista · para talar", "ok");
  { const eq = G.picks.eq, pd = eq ? PICK_DEF[eq] : null, dur = pd ? (G.picks.dur[eq] || 0) : 0;
    html += eqCard(pd ? pd.sprite : "pick_stone", "⛏️", pd ? pd.label : "Sin pico",
      pd ? dur + "/" + pd.dur + " durab · mina hasta " + ORE_DEF[ORE_ORDER[pd.mineTier]].label : "Crafteá uno en la Herrería", dur > 0 ? "ok" : "busy"); }
  html += eqCard("fishing_rod", "🎣", "Caña", "Lista · para pescar", "ok");
  $("eq-grid").innerHTML = html;
}

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
}

/* ---- mercado ---- */
function refreshMarket() {
  const cur = marketCur;
  $("mkt-list").innerHTML = SELLABLE.map(res => { const owned = G.res[res]; const u = marketUnit(res); const uStr = cur === "plata" ? `${u} de plata c/u` : `${u.toFixed(1)} $Golden c/u`;
    return `<div class="mkt-row"><span class="mimg">${RES_EMOJI[res]}</span><div class="minfo"><div class="mnm">${RES_LABEL[res]}</div><div class="mds">Tenés ${fmt(owned)} · ${uStr}</div></div><input id="mq-${res}" type="number" min="0" max="${owned}" value="${owned > 0 ? owned : 0}"><button class="vbtn" id="vb-${res}">Vender</button></div>`; }).join("");
  SELLABLE.forEach(res => { const btn = $("vb-" + res); if (btn) btn.onclick = () => sellItem(res); });
  document.querySelectorAll(".curbtn").forEach(b => b.classList.toggle("active", b.dataset.cur === cur));
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

/* ---- leaderboard (datos locales de ejemplo por ahora) ---- */
const LB_PLATA = [["Pixelmancer",9120],["DoñaRosa",7430],["ElTuco",6110],["KoiMaster",5280],["LunaVerde",4650],["Milena",3890],["NightOwl",3120],["Faröe",2480],["Tobías",1760],["ElGranjero",990]];
const LB_EXP = [["KoiMaster",6.8],["Pixelmancer",6.2],["Golden",5.9],["LunaVerde",5.1],["DoñaRosa",4.7],["Milena",4.0],["Sol",3.4],["NightOwl",2.9],["Faröe",2.2],["Tobías",1.5]];
let lbTab = "plata";
function lbRowHtml(r, i, col) { const rank = i + 1; const cls = (r.me ? "me " : "") + (rank <= 3 ? "top" + rank : ""); const val = col === "plata" ? `<span class="coin silver"></span>${fmt(r.v)}` : `⭐ ${(+r.v).toFixed(1)}`; return `<div class="lbrow ${cls}"><span class="rk">${rank}</span><span class="nm">${(r.n || "—")}</span><span class="val">${val}</span></div>`; }
function refreshLb() {
  document.querySelectorAll(".lbtab").forEach(b => b.classList.toggle("active", b.dataset.lb === lbTab));
  const col = lbTab;
  const base = (col === "plata" ? LB_PLATA : LB_EXP).map(([n, v]) => ({ n, v, me: false }));
  base.push({ n: (window.NICK || "Vos"), v: col === "plata" ? Math.floor(G.plata) : +avgSkillLevel().toFixed(1), me: true });
  base.sort((a, b) => b.v - a.v);
  $("lb-list").innerHTML = base.slice(0, 20).map((r, i) => lbRowHtml(r, i, col)).join("");
  const note = $("lb-note"); if (note) note.textContent = "Ranking local de ejemplo. El ranking online real se conecta en otra fase.";
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
  document.querySelectorAll(".ov").forEach(ov => ov.addEventListener("mousedown", e => { if (e.target === ov) closeOv(ov.id); }));
  const lu = $("levelup"); if (lu) lu.onclick = levelUp;
  const pr = $("prestige"); if (pr) pr.onclick = prestige;
  document.querySelectorAll(".curbtn").forEach(b => b.onclick = () => { marketCur = b.dataset.cur; refreshMarket(); });
  document.querySelectorAll(".lbtab").forEach(b => b.onclick = () => { lbTab = b.dataset.lb; refreshLb(); });
  const ce = $("cfg-edit"); if (ce) ce.onclick = () => toast("La edición de la granja llega en otra fase.");
  const cr = $("cfg-reset"); if (cr) cr.onclick = () => toast("Próximamente.");
  const lh = $("loghead"); if (lh) lh.onclick = () => $("logpanel").classList.toggle("collapsed");

  const KEYS = { i: "ov-inv", x: "ov-skills", p: "ov-equip", l: "ov-lb", c: "ov-config", o: "ov-market", k: "ov-forge", b: "ov-barn" };
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const key = e.key.toLowerCase();
    if (key === "escape") { closeAllOv(); return; }
    if (KEYS[key]) { const id = KEYS[key]; if (isOpen(id)) closeOv(id); else { closeAllOv(); openOv(id); } e.preventDefault(); }
  });

  refreshHud();
  setInterval(refreshHud, 1000);
}
initUI();
