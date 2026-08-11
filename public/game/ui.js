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
const OV_REFRESH = { "ov-entrenando": () => entrenarSync(), "ov-clan": () => refreshClan(), "ov-misiones": () => refreshMisiones(), "ov-mapa": () => refreshMapa(), "ov-inv": () => refreshInv(), "ov-skills": () => refreshSkills(), "ov-equip": () => refreshEquip(), "ov-godhand": () => refreshGodHand(),
  "ov-forge": () => refreshForge(), "ov-market": () => refreshMarket(), "ov-barn": () => refreshBarn(),
  "ov-cocina": () => refreshCooking(),
  "ov-horno": () => refreshHorno(),
  "ov-altar": () => refreshAltar(),
  "ov-establo": () => refreshEstablo(),
  "ov-curtiduria": () => refreshCurtiduria(),
  "ov-ofrendas": () => refreshOfrendas(),
  "ov-incursion": () => refreshIncursion(),
  "ov-p2p": () => refreshP2P(),
  "ov-cos": () => refreshCosmeticos(),
  "ov-pass": () => refreshPass(),
  "ov-cofre": () => refreshChest(),
  "ov-config": () => refreshConfig(), "ov-lb": () => refreshLb(), "ov-daily": () => refreshDaily() };
// los overlays NO bloquean el juego: podés seguir moviéndote/interactuando con la ventana abierta
// sonido propio de cada edificio al abrir su ventana (pedido del diseñador)
const OV_SFX = { "ov-market": "shop", "ov-forge": "forge", "ov-barn": "door", "ov-cocina": "door", "ov-cofre": "door", "ov-daily": "coin", "ov-altar": "forge", "ov-establo": "door", "ov-curtiduria": "forge" };
function openOv(id) { const e = $(id); if (!e) return; e.classList.add("show"); if (window.sfx) sfx(OV_SFX[id] || "click"); if (OV_REFRESH[id]) OV_REFRESH[id](); }

// FUNDIDO A NEGRO al cambiar de escena (granja <-> Zona Negra <-> plaza). Antes era un corte seco.
function irAEscena(sc, destino) {
  const el = $("fadeblk"), ms = (typeof FX_FADE_MS === "number") ? FX_FADE_MS : 0;
  if (!el || ms <= 0) { sc.scene.start(destino); return; }
  el.style.transitionDuration = ms + "ms";
  el.classList.add("on");
  setTimeout(() => {
    sc.scene.start(destino);
    setTimeout(() => el.classList.remove("on"), 60);   // ya arrancó la escena nueva: se abre el telón
  }, ms);
}
// SACUDIDA de un botón que no se puede apretar: explica el "no" sin sacar un cartel
function noNo(el) {
  if (!el) return;
  el.classList.remove("nono"); void el.offsetWidth; el.classList.add("nono");
  setTimeout(() => el.classList.remove("nono"), 320);
}
function closeOv(id) { const e = $(id); if (e) e.classList.remove("show"); }

/* ---- RESUMEN DEL VIAJE A LA ZONA NEGRA (10/8) --------------------------------
   Al volver, un cuadro con lo que trajiste. Antes el botín se diluía en la bolsa y no
   quedaba forma de saber si el viaje había valido la pena. */
function mostrarResumenZona(r) {
  if (!r) return;
  const tit = $("zr-tit"), sub = $("zr-sub"), body = $("zr-body"), cd = $("zr-cd");
  if (!body) return;
  const filas = [];
  Object.keys(r.res).forEach(k => filas.push((RES_LABEL[k] || k) + ": <b>+" + fmt(r.res[k]) + "</b>"));
  if (r.plata) filas.push("Plata: <b>+" + fmt(r.plata) + "</b>");
  if (r.golden) filas.push("$Golden: <b>+" + fmt(r.golden) + "</b>");
  if (tit) tit.textContent = r.derrotado ? "Te trajeron de vuelta" : "De vuelta en la granja";
  if (sub) sub.textContent = (r.derrotado ? "Te derrotaron, pero conservás lo que ya habías recogido. " : "") +
    "Estuviste " + fmtSecs(Math.round(r.min * 60)) + " en la Zona Negra.";
  body.innerHTML = "<div><b>" + r.matados + "</b> " + (r.matados === 1 ? "monstruo" : "monstruos") +
    " · <b>+" + fmt(r.xp) + "</b> XP de Combate</div>" +
    (filas.length ? "<div style=\"margin-top:6px\">" + filas.join(" · ") + "</div>"
                  : "<div style=\"margin-top:6px\">No trajiste materiales.</div>");
  if (cd) cd.textContent = "El granjero descansa " + ZONA_CD_MIN + " min antes de poder volver a entrar.";
  cuandoListo(() => openOv("ov-zonares"));
}

/* ---- ENTRENAMIENTO EN EL DUMMY (9/8) ----------------------------------------
   Antes se podía dejar entrenando y seguir jugando, y encima cobrar al instante:
   clic, salir, cobrar, repetir. Ahora la ventana TAPA el juego (clase .bloquea) y
   el primer minuto no paga, así que hay que dejarlo entrenando de verdad. */
let _entrEv = null;
function entrenarSync() {
  const el = $("entr-info"); if (!el) return;
  if (typeof dummyEntrenando !== "function" || !dummyEntrenando()) { entrenarCerrar(); return; }
  if (!isOpen("ov-entrenando")) { entrenarCerrar(); return; }   // si se cerró por otro lado, el tick no queda vivo
  const utiles = dummyMsUtiles();
  const xp = Math.round(Math.min(DUMMY_OFF_MAX_H, utiles / 3600000) * DUMMY_OFF_XP_H);
  const falta = Math.max(0, DUMMY_OFF_ESPERA_MS - (nowMs() - G.dummyTrain.desde));
  el.innerHTML = falta > 0
    ? "Todavía no cuenta — arranca en <b>" + Math.ceil(falta / 1000) + " s</b>"
    : "Entrenando hace <b>" + fmtDur(utiles) + "</b> · llevás <b>+" + fmt(xp) + " XP</b>";
  if (!_entrEv) _entrEv = setInterval(entrenarSync, 1000);
}
function entrenarCerrar() {
  if (_entrEv) { clearInterval(_entrEv); _entrEv = null; }
  closeOv("ov-entrenando");
}
// corta el entrenamiento, cobra lo que corresponda y devuelve el juego
function entrenarFin() {
  if (typeof dummyCobrar === "function") dummyCobrar();
  entrenarCerrar();
  try { refreshHud(); } catch (e) {}
}
// Las ventanas .bloquea (hoy: el entrenamiento) NO se cierran con Escape, ni con un clic
// afuera, ni al entrar en modo edición: si se cerraran, el jugador volvería al juego con el
// entrenamiento corriendo, que es justo el exploit que la ventana viene a tapar (10/8).
function closeAllOv() { document.querySelectorAll(".ov.show:not(.bloquea)").forEach(e => e.classList.remove("show")); }

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

// CONTADOR ANIMADO: los números del HUD "corren" hasta el valor nuevo en vez de saltar de golpe.
// Solo cuando la diferencia se nota (más de 4): para +1 de madera no vale la pena.
const _cnt = {};
function setNum(id, valor) {
  const el = document.getElementById(id); if (!el) return;
  const anterior = _cnt[id] == null ? valor : _cnt[id];
  _cnt[id] = valor;
  if (el._tm) { clearInterval(el._tm); el._tm = null; }
  const dif = valor - anterior;
  if (Math.abs(dif) <= 4) { el.textContent = fmt(valor); return; }
  const pasos = 14; let i = 0;
  el._tm = setInterval(() => {
    i++;
    const k = 1 - Math.pow(1 - i / pasos, 3);   // arranca rápido y frena al final
    el.textContent = fmt(Math.round(anterior + dif * k));
    if (i >= pasos) { clearInterval(el._tm); el._tm = null; el.textContent = fmt(valor); }
  }, 26);
}
function refreshHud() {
  try { syncMisionesBadge(); } catch (e) {}   // contador de misiones del menú (10/8)
  refreshStam(); setTxt("s-level", G.level); setTxt("s-prestige", G.prestige); setNum("s-plata", G.plata); setNum("s-golden", G.golden); setTxt("s-week", G.week); setTxt("s-hp", Math.ceil(G.hp) + "/" + G.hpMax); refreshCombatBar(); if (typeof checkCooking === "function") checkCooking(); if (typeof refreshHotbar === "function") refreshHotbar(); }
// clic en la barra de estamina: ofrece la recarga premium (con su tope diario)
function bindStamPill() {
  const pill = document.getElementById("stampill"); if (!pill || pill._bound) return;
  pill._bound = true; pill.style.cursor = "pointer";
  pill.onclick = () => {
    if (typeof stamRecargar !== "function") return;
    const r = stamRecargasHoy();
    if (G.stam >= stamMax()) { toast("La estamina ya está llena"); return; }
    askConfirm("Recargar la estamina al máximo cuesta " + STAM_GOLDEN + " $Golden. Te quedan " +
      (STAM_RECARGAS_DIA - r.n) + " recargas hoy. ¿Recargar?", () => stamRecargar(),
      { title: "Recargar estamina", yes: "Recargar", yesClass: "green", no: "Cancelar", noClass: "red" });
  };
}
function refreshStam() {
  bindStamPill();
  const pill = document.getElementById("stampill"); if (!pill || typeof stamMax !== "function") return;
  const enZN = window.GF && GF.scene === "forest";
  pill.style.display = enZN ? "" : "none";
  if (!enZN) return;
  const mx = stamMax(), v = Math.floor(G.stam == null ? mx : G.stam);
  setTxt("s-stam", v + "/" + mx);
  const f = document.getElementById("stam-fill"); if (f) f.style.width = Math.round(v / mx * 100) + "%";
}
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
    return { sprite: w.sprite || ARM_TIPO_DEF[w.tipo].sprite, emoji: "⚔️", label: w.label + " · daño " + w.min + "–" + w.max + " · durabilidad " + own.dur + "/" + w.dur, dur: Math.round(own.dur / w.dur * 100) };
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
  // 10/8: cada familia lleva su color de borde (k-res, k-seed, k-fish, k-dish, k-tool…), para
  // reconocer de qué es una casilla sin tener que leer el tooltip.
  return `<div class="slot filled k-${d.kind}${sel}${eq}" draggable="true" data-slot="${i}" data-zone="${zone}" title="${v.label}">${itemIcon(v)}${cnt}${durBar(v)}</div>`;
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
  else if (d.kind === "arm") {   // clic = EQUIPAR (para tirarla, la papelera). Antes se borraba de una: bug reportado
    if (!(G.weapons && G.weapons[d.key])) return;
    if (G.gear.arma === d.key) { G.gear.arma = null; toast("Guardaste " + ((ARM_DEF[d.key] || {}).label || "el arma")); }
    else { G.gear.arma = d.key; toast(((ARM_DEF[d.key] || {}).label || "Arma") + " equipada"); if (typeof tutoEvent === "function") tutoEvent("equiparm"); }
    if (typeof applyCombatHp === "function") applyCombatHp();
    refreshHud();
    if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-forge")) refreshForge();
    if (typeof saveFarm === "function") saveFarm();
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
  return `<div class="hcell filled k-${d.kind}${on}${sel}${eq}${ghost}" draggable="true" data-slot="${i}" data-zone="hot" title="${v.label}">${num}${itemIcon(v)}${cnt}${durBar(v)}</div>`;
}
let _hotFirma = null;
function refreshHotbar(forzar) {
  if (dndActive) return;
  const box = $("hotbar"); if (!box) return;
  ensureHotbarDefaults();
  syncSlots();
  if (!Array.isArray(G.hotbar)) G.hotbar = [];
  while (G.hotbar.length < 10) G.hotbar.push(null);
  let html = ""; for (let i = 0; i < 10; i++) html += hotCellHtml(G.hotbar[i], i);
  // La llama refreshHud, o sea el tick de 1 segundo: si no comparamos, la barra se reconstruye
  // entera 60 veces por minuto y se recuelgan sus 20 listeners aunque no haya cambiado nada.
  // De paso se perdía el :hover en cada tick (10/8).
  if (!forzar && html === _hotFirma && box.firstChild) return;
  _hotFirma = html;
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
  if (no) { no.textContent = opts.no || "Cancelar"; no.className = (opts.noClass || "ghost") + " sm"; no.onclick = () => { ov.classList.remove("show"); if (typeof opts.onNo === "function") opts.onNo(); }; }
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
  fill("eq-arma", !!armaDef, armaDef ? spIc(armaDef.sprite || ARM_TIPO_DEF[armaDef.tipo].sprite, "") : "",
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
  // 11/8 (2ª ronda del diseñador): las piezas EQUIPADAS de la Curtiduría llenan los CASILLEROS
  // del área de equipo — antes solo salían en la lista de abajo y los casilleros quedaban vacíos.
  // Guantes y Pantalones dejaron de ser "próximamente". El gear viejo de loot conserva su lugar.
  {
    const setEq = (G.armorEq && ARMOR_SETS[G.armorEq]) ? G.armorEq : null;
    const MAPA = { "eq-casco": ["yelmo", "casco"], "eq-armadura": ["pecho", "armadura"], "eq-pantalones": ["pantalones", null], "eq-botas": ["botas", "botas"], "eq-guantes": ["guantes", null] };
    for (const id in MAPA) {
      const [pz, slotViejo] = MAPA[id], el = $(id); if (!el) continue;
      const viejo = slotViejo && G.gear && G.gear[slotViejo] && GEAR_DEF[G.gear[slotViejo]];
      if (viejo) continue;   // ese casillero ya lo dibujó gearSlot con el gear de loot
      if (setEq && armorTiene(setEq, pz)) {
        const sd = ARMOR_SETS[setEq];
        el.classList.remove("ghost");
        el.title = ARMOR_SLOT_LABEL[pz] + " · " + sd.label + " · defensa +" + sd.piezas[pz].def;
        el.innerHTML = spIc("armor_" + setEq + "_" + pz, "🛡️");
      } else if (!slotViejo) {   // guantes/pantalones vacíos: silueta genérica
        el.classList.add("ghost"); el.title = ARMOR_SLOT_LABEL[pz]; el.innerHTML = '<span class="sil"></span>';
      }
    }
  }
  // fixs.docx #7 (11/8): la armadura de la Curtiduría se crafteaba y "no aparecía en ningún
  // lado" fuera de esa ventana. Ahora el panel de Equipo lista tus sets, piezas y bonos.
  if (box) {
    let h = '<div class="secc">Armadura de la Curtiduría</div>';
    const tengoAlguna = ARMOR_ORDER.some(s => armorPuestas(s) > 0);
    if (!tengoAlguna) h += '<div class="info">Todavía no crafteaste ninguna pieza — se hacen en la Curtiduría con los materiales de tus animales.</div>';
    else ARMOR_ORDER.forEach(set => {
      const n = armorPuestas(set); if (!n) return;
      const sd = ARMOR_SETS[set], eq = armorEquipado(set);
      h += '<div class="forge-row' + (eq ? ' eq' : '') + '"><div class="finfo"><div class="fnm">' + sd.label + (eq ? ' <span class="tag">equipada</span>' : '') + ' <span class="tag">' + n + '/5</span></div>' +
        '<div class="fds">' + ARMOR_SLOTS.filter(pz => armorTiene(set, pz)).map(pz =>
          '<img src="' + GF.spr("armor_" + set + "_" + pz) + '" title="' + ARMOR_SLOT_LABEL[pz] + '" style="width:26px;height:26px;image-rendering:pixelated;vertical-align:middle" onerror="this.remove()">').join(" ") + '</div>' +
        (armorSetCompleto(set) ? '<div class="fds">Set completo: ' + sd.bono.txt + '</div>' : '<div class="fds">Defensa de las piezas: +' + ARMOR_SLOTS.reduce((a, pz) => a + (armorTiene(set, pz) ? sd.piezas[pz].def : 0), 0) + '</div>') + '</div>' +
        '<div class="fbtns">' + (eq ? '' : '<button class="green sm" data-armeq="' + set + '">Equipar</button>') + '</div></div>';
    });
    box.innerHTML = h;
    box.querySelectorAll("[data-armeq]").forEach(b => b.onclick = () => { G.armorEq = b.dataset.armeq; toast(ARMOR_SETS[b.dataset.armeq].label + " equipada"); if (typeof saveFarm === "function") saveFarm(); refreshEquip(); refreshHud(); });
  }
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
  const esDia7 = (st.claimable ? st.day : Math.max(1, claimed)) === 7;
  $("dy-reward").innerHTML = (st.claimable ? "Hoy: " : "Reclamado: ") + DAILY_REWARDS[idx].label
    + (esDia7 ? '<br><b style="color:#7a5606">Esta semana: ' + coleccionableDeLaSemana() + '</b>' : "")
    + '<br><span class="fds">Si faltás un día no perdés nada: seguís donde quedaste.</span>';
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
    let btns = '<button class="green sm" ' + (afford ? "" : "disabled") + ' data-craft="' + id + '">Craftear</button>'
      + '<button class="green sm" ' + (afford ? "" : "disabled") + ' data-craft5="' + id + '" title="Craftear 5 de una">×5</button>';
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
    repair += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(w.sprite || ARM_TIPO_DEF[w.tipo].sprite) + '"></div><div class="finfo"><div class="fnm">' + w.label + '</div><div class="durbar"><i style="width:' + pct + '%"></i></div><div class="fds">' + dur + "/" + w.dur + " · reparar: " + rstr + '</div></div><div class="fbtns">' + btn + "</div></div>";
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
        armas += '<div class="forge-row ' + (eqNow ? "eq" : "") + '"><div class="fic"><img src="' + GF.spr(w.sprite || td.sprite) + '"></div><div class="finfo"><div class="fnm">' + w.label + plusTag + (own ? ' <span class="tag">' + G.weapons[id].dur + '/' + w.dur + '</span>' : '') + '</div><div class="fds">Daño ' + w.min + '–' + w.max + ' · ' + td.buffLabel + ' ' + w.buffVal + (tipo === "arco" ? "/s" : "%") + ' ' + BUFF_DESC[tipo] + '</div><div class="fds">' + (own ? 'Reparación en la pestaña Reparar' : 'Costo: ' + cs) + '</div></div><div class="fbtns">' + btns + '</div></div>';
      });
    });
  }
  const astr = G.armasUnlocked ? Object.keys(ARROW_COST).map(k => resIc(k) + " " + ARROW_COST[k]).join(" · ") : "";
  if (G.armasUnlocked) armas += '<div class="forge-row"><div class="fic"><img src="' + GF.spr("res_flecha") + '" onerror="this.outerHTML=\'➳\'"></div><div class="finfo"><div class="fnm">Flechas ×10</div><div class="fds">Tenés ' + fmt(G.res.flecha || 0) + ' · Costo: ' + astr + '</div></div><div class="fbtns"><button class="green sm" ' + (canAfford(ARROW_COST) ? "" : "disabled") + ' id="forge-arrows">Craftear</button><button class="green sm" ' + (canAfford(ARROW_COST) ? "" : "disabled") + ' id="forge-arrows5" title="Craftear 50 flechas">×5</button></div></div>';
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
  card.querySelectorAll("[data-craft5]").forEach(b => b.onclick = () => craftLote(craftPick, b.dataset.craft5, 5));
  card.querySelectorAll("[data-equip]").forEach(b => b.onclick = () => equipPick(b.dataset.equip));
  card.querySelectorAll("[data-mat]").forEach(b => b.onclick = () => craftMat(b.dataset.mat));
  card.querySelectorAll("[data-repair]").forEach(b => b.onclick = () => repairPick(b.dataset.repair));
  card.querySelectorAll("[data-rtool]").forEach(b => b.onclick = () => repairTool(b.dataset.rtool));
  card.querySelectorAll("[data-ctool]").forEach(b => b.onclick = () => craftTool(b.dataset.ctool));
  card.querySelectorAll("[data-ctool5]").forEach(b => b.onclick = () => craftTool(b.dataset.ctool5, 5));
  card.querySelectorAll("[data-carm]").forEach(b => b.onclick = () => craftWeapon(b.dataset.carm));
  card.querySelectorAll("[data-rarm]").forEach(b => b.onclick = () => repairWeapon(b.dataset.rarm));
  card.querySelectorAll("[data-eqarm]").forEach(b => b.onclick = () => { G.gear.arma = b.dataset.eqarm; toast(ARM_DEF[b.dataset.eqarm].label + " equipada"); if (typeof tutoEvent === "function") tutoEvent("equiparm"); if (typeof applyCombatHp === "function") applyCombatHp(); refreshHud(); refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (typeof saveFarm === "function") saveFarm(); });
  const fa = $("forge-arrows"); if (fa) fa.onclick = () => craftArrows();
  const fa5 = $("forge-arrows5"); if (fa5) fa5.onclick = () => craftLote(craftArrows, null, 5);
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
      : '<button class="green sm" ' + (canAfford(md.cost) ? "" : "disabled") + ' data-mat="' + id + '">Fundir</button>'
        + '<button class="green sm" ' + (canAfford(md.cost) ? "" : "disabled") + ' data-mat5="' + id + '" title="Fundir 5 (se van encolando por el enfriamiento)">×5</button>';
    html += '<div class="forge-row"><div class="fic"><img src="' + GF.spr(md.sprite) + '"></div><div class="finfo"><div class="fnm">' + md.label + '</div><div class="fds">Tenés ' + fmt(G.res[id] || 0) + ' · Costo: ' + cs + '</div></div><div class="fbtns">' + btn + '</div></div>';
  });
  if (anyCooling && !window._hornoCdTick) { window._hornoCdTick = setTimeout(() => { window._hornoCdTick = null; if (isOpen("ov-horno")) refreshHorno(); }, 1000); }
  box.innerHTML = html;
  box.querySelectorAll("[data-mat]").forEach(b => b.onclick = () => craftMat(b.dataset.mat));
  box.querySelectorAll("[data-mat5]").forEach(b => b.onclick = () => craftLote(craftMat, b.dataset.mat5, 5));
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
  { // ollas en paralelo (3/8: se cocinan varios platos a la vez)
    const lista = cookList();
    head += '<div class="fds" style="margin:4px 0">Ollas: ' + lista.length + '/' + cookSlots() + ' en uso' + (edif2("cocina") ? ' · Cocina nivel 2: −' + EDIF2_COCINA + '% de tiempo y +' + EDIF2_COCINA_OLLA + ' olla' : '') + '</div>';
    lista.forEach(c => {
      const r = RECIPE_DEF[c.id];
      const left = Math.max(0, c.endAt - nowMs());
      const pct = Math.round((1 - left / (c.total || 1)) * 100);
      head += '<div class="forge-row"><div class="fic">' + (r && r.sprite ? '<img src="' + GF.spr(r.sprite) + '" onerror="this.outerHTML=\'' + (r.emoji || "") + '\'">' : (r ? r.emoji : "")) + '</div>' +
        '<div class="finfo"><div class="fnm">Cocinando ' + (r ? r.label : "") + '…</div><div class="durbar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="fds">' + fmtSecs(Math.ceil(left / 1000)) + ' restantes</div></div></div>';
    });
  }
  box.innerHTML = head + RECIPE_ORDER.map(id => {
   try {
    const r = RECIPE_DEF[id];
    const locked = r.lvl && lvl < r.lvl;
    const parts = [];
    if (r.fish) for (const k in r.fish) parts.push(fishIc(k) + " ×" + r.fish[k]);
    if (r.res) for (const k in r.res) parts.push(resIc(k) + " ×" + r.res[k]);
    const fic = r.sprite ? '<img src="' + GF.spr(r.sprite) + '" onerror="this.outerHTML=\'' + r.emoji + '\'">' : r.emoji;
    const own = Math.floor((G.dishes && G.dishes[id]) || 0);
    const vPlata = Math.round(dishPrice(r) * cookPot(r.lvl));
    let btns = '<button class="green sm" ' + ((!locked && canCook(id) && cookFree() > 0) ? "" : "disabled") + ' data-cook="' + id + '">' + (locked ? "Nivel " + r.lvl : "Cocinar") + '</button>';
    // el tiempo que se muestra tiene que ser el que de verdad va a tardar: la Cocina nivel 2
    // descuenta un % y el panel prometía el tiempo sin descuento (10/8)
    if (own > 0 && r.plata) btns += '<button class="sm" data-selld="' + id + '">Vender (' + own + ') · ' + vPlata + ' plata</button>';
    if (own > 0 && r.goldenP && lvl >= 8) btns += '<button class="sm" data-sellg="' + id + '">Vender · ' + r.goldenP + ' $G</button>';
    return '<div class="forge-row' + (locked ? ' locked' : '') + '"><div class="fic">' + fic + '</div><div class="finfo"><div class="fnm">' + r.label + (locked ? ' · se desbloquea a nivel ' + r.lvl : '') + '</div><div class="fds">' + dishDesc(r) + ' · cocción ' + fmtSecs(Math.round((r.cookS || 8) * (typeof cocinaFactor === "function" ? cocinaFactor() : 1))) + ' · +' + r.xp + ' XP</div><div class="fds">Ingredientes: ' + parts.join(" · ") + (r.plata ? ' · Venta: ' + vPlata + ' plata' + (r.goldenP ? ' o ' + r.goldenP + ' $Golden (Nv 8)' : '') : '') + '</div></div><div class="fbtns">' + btns + '</div></div>';
   } catch (e) { console.warn("receta con problema:", id, e); return ""; }
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
  document.getElementById("tuto-txt").textContent = tutoTxt(st);
  const need = tutoNeed(st);
  document.getElementById("tuto-n").textContent = st.res ? " " + Math.min(tutoTiene(st), need) + "/" + need
    : (st.n > 1 ? " " + Math.min(G.tuto.n || 0, st.n) + "/" + st.n : "");
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
  if (typeof tutoCheckRes === "function") tutoCheckRes();   // pasos de "juntá X de madera/piedra/plata"
  // ...y también los pasos de HACER algo: si construiste la Cocina antes de que el tutorial
  // te la pidiera, el paso se salta solo en vez de quedar pidiendo algo ya hecho (9/8)
  if (typeof tutoAutoSkip === "function") { try { tutoAutoSkip(); } catch (e) {} }
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  const sig = G.tuto ? (G.tuto.step + ":" + (st && st.res ? tutoTiene(st) : (G.tuto.n || 0)) + ":" + !!G.tuto.done) : "-";
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
/* ---- MISIONES DE HOY, fuera del Pase (10/8) ------------------------------------
   El diseñador las quería en su propia casilla, más llamativa: metidas adentro del Pase
   pasaban desapercibidas, y son lo que le da a alguien una razón para entrar hoy. */
function refreshMisiones() {
  const box = $("mis-list"); if (!box) return;
  const p = passInit();
  const hechas = p.daily.mis.filter(m => m.ok).length;
  let h = '<div class="info">Llevás <b>' + hechas + ' de ' + p.daily.mis.length + '</b> hoy · cada una da ' +
    PASS_STAR_DAILY + ' estrellas, y las tres juntas suman <b>+' + PASS_STAR_BONUS + '</b> de bonus' +
    (p.daily.bonus ? ' <span class="oro">(bonus ya cobrado)</span>' : '') + '</div>';
  h += misionesHtml(p.daily.mis, PASS_STAR_DAILY);
  h += '<div class="secc">Misiones de la semana</div>' + misionesHtml(p.weekly.mis, PASS_STAR_WEEKLY);
  h += '<div class="fds" style="margin-top:6px">Las estrellas suben el <b>Pase de Batalla</b>, que es donde están las recompensas.</div>';
  box.innerHTML = h;
}
function misionesHtml(lista, stars) {
  return lista.map(m => {
    const md = PASS_MISIONES[m.k] || { label: "Misión" };   // misión de una temporada vieja: no rompe el panel
    return '<div class="forge-row' + (m.ok ? ' eq' : '') + '"><div class="finfo"><div class="fnm">' + md.label.replace("#", m.goal) +
      (m.ok ? ' <span style="color:#3f6b2a">— CUMPLIDA (+' + stars + ' estrellas)</span>' : '') + '</div>' +
      '<div class="durbar"><i style="width:' + Math.min(100, Math.round(m.n / m.goal * 100)) + '%"></i></div>' +
      '<div class="fds">' + Math.min(m.n, m.goal) + '/' + m.goal + ' · recompensa: ' + stars + ' estrellas</div></div></div>';
  }).join("");
}
// el contador del menú: cuántas llevás hoy, y pulsa si te queda alguna sin cumplir
function syncMisionesBadge() {
  const b = $("gm-mis"); if (!b || typeof passInit !== "function") return;
  try {
    const p = passInit(), hechas = p.daily.mis.filter(m => m.ok).length, tot = p.daily.mis.length;
    b.textContent = hechas + "/" + tot;
    const btn = b.closest(".gmi"); if (btn) btn.classList.toggle("listo", hechas < tot);
  } catch (e) {}
}

/* ---- CLAN Y ASALTO AL DRAGÓN (10/8) ------------------------------------------
   Decisiones tomadas y por qué:
     · El asalto NO es en vivo. El clan abre el asalto y cada uno entra cuando puede: la
       vida del jefe es compartida y vive en Supabase. Un raid en tiempo real obligaría a
       montar salas de combate (hoy solo existen en la plaza) y, con pocos jugadores a la
       vez, no se juntaría nunca.
     · Hacen falta 3 miembros para abrirlo. Con 5 un clan chico nunca llega.
     · El botín se reparte proporcional al daño, con un piso del 10% para el que aportó
       poco: sin piso el que recién empieza no vuelve, sin proporción aparece el que se
       cuelga del trabajo ajeno.
   La barra de vida y el reparto los resuelve Postgres, no el cliente: si el daño se
   escribiera desde el navegador, cualquiera se anotaría el asalto entero desde la consola. */
let _clanCache = null, _clanT = 0;
function refreshClan() {
  const box = $("clan-list"); if (!box) return;
  if (nowMs() - _clanT > 8000) {
    _clanT = nowMs();
    Promise.all([clanMio(), raidActivo()]).then(([c, r]) => { _clanCache = { c, r }; if (isOpen("ov-clan")) pintarClan(); });
  }
  pintarClan();
}
function pintarClan() {
  const box = $("clan-list"); if (!box) return;
  if (!_clanCache) { box.innerHTML = '<div class="fds">Cargando…</div>'; return; }
  const { c, r } = _clanCache;
  if (!c) {
    box.innerHTML = '<div class="info">Todavía no estás en ningún clan. Podés fundar uno o entrar con el código de un amigo.</div>' +
      '<div class="forge-row"><div class="finfo"><div class="fnm">Fundar un clan</div>' +
      '<div class="fds"><input id="clan-nom" placeholder="Nombre del clan" maxlength="24" style="width:100%"></div></div>' +
      '<div class="fbtns"><button class="green sm" id="clan-crear">Fundar</button></div></div>' +
      '<div class="forge-row"><div class="finfo"><div class="fnm">Entrar a uno</div>' +
      '<div class="fds"><input id="clan-cod" placeholder="Código de 6 letras" maxlength="6" style="width:100%"></div></div>' +
      '<div class="fbtns"><button class="green sm" id="clan-unirse">Entrar</button></div></div>';
    const bc = $("clan-crear"); if (bc) bc.onclick = async () => {
      const n = ($("clan-nom") || {}).value || "";
      if (n.trim().length < 3) { toast("Poné un nombre de al menos 3 letras"); return; }
      const res = await clanCrear(n.trim());
      if (res.error) { toast("No se pudo: " + res.error); return; }
      toast("¡Clan fundado! Código: " + (res.ok && res.ok.codigo));
      _clanT = 0; refreshClan();
    };
    const bu = $("clan-unirse"); if (bu) bu.onclick = async () => {
      const k = ($("clan-cod") || {}).value || "";
      const res = await clanUnirse(k.trim());
      if (res.error) { toast("No se pudo: " + res.error); return; }
      toast("¡Entraste al clan!"); _clanT = 0; refreshClan();
    };
    return;
  }
  const n = c.miembros.length;
  let h = '<div class="info">Clan <b>' + c.clan.nombre + '</b> · ' + n + '/' + c.clan.tope + ' miembros · ' +
    'código para invitar: <b>' + c.clan.codigo + '</b></div>';
  h += '<div class="secc">Miembros</div>';
  h += c.miembros.map(m => '<div class="forge-row"><div class="finfo"><div class="fnm">' + m.nombre +
    (m.rol !== "miembro" ? ' <span class="tag">' + m.rol + '</span>' : '') + '</div></div></div>').join("");
  // ---- el asalto ----
  h += '<div class="secc">Asalto al Dragón</div>';
  if (!r || !r.raid || r.raid.estado === "expirado") {
    const puede = n >= RAID_MIN_MIEMBROS;
    h += '<div class="info">' + (puede
      ? 'No hay ningún asalto abierto. Al abrirlo, el Dragón aparece en la Guarida con <b>' + fmt(RAID_HP) + '</b> de vida compartida y el clan tiene <b>48 h</b> para bajarlo.'
      : 'Hacen falta <b>' + RAID_MIN_MIEMBROS + '</b> miembros para abrir un asalto. Ahora son ' + n + '.') + '</div>' +
      '<div class="forge-row"><div class="finfo"><div class="fnm">Abrir asalto</div>' +
      '<div class="fds">Después cada uno entra a la Guarida cuando puede y le pega. No hace falta estar conectados a la vez.</div></div>' +
      '<div class="fbtns"><button class="green sm" ' + (puede ? "" : "disabled") + ' id="raid-abrir">Abrir</button></div></div>';
  } else {
    const q = r.raid, pct = Math.max(0, Math.min(100, Math.round(q.hp / q.hp_max * 100)));
    const mio = (r.dmg || []).find(d => d.user_id === UID);
    const vencido = q.estado === "vencido";
    h += '<div class="forge-row"><div class="finfo">' +
      '<div class="fnm">Dragón de las Cavernas ' + (vencido ? '<span class="tag">¡vencido!</span>' : '') + '</div>' +
      '<div class="durbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="fds">' + fmt(Math.ceil(q.hp)) + ' / ' + fmt(q.hp_max) + ' de vida' +
        (vencido ? '' : ' · cierra ' + new Date(q.cierra_at).toLocaleString()) + '</div></div>' +
      '<div class="fbtns">' + (vencido && mio && !mio.cobrado ? '<button class="gold sm" id="raid-cobrar">Cobrar tu parte</button>' : '') + '</div></div>';
    h += '<div class="secc">Quién pegó</div>';
    const tot = (r.dmg || []).reduce((s, d) => s + Number(d.dmg || 0), 0) || 1;
    h += (r.dmg || []).map(d => '<div class="forge-row' + (d.user_id === UID ? ' eq' : '') + '"><div class="finfo">' +
      '<div class="fnm">' + d.nombre + (d.user_id === UID ? ' <span class="tag">vos</span>' : '') + '</div>' +
      '<div class="fds">' + fmt(Math.round(d.dmg)) + ' de daño · ' + (d.dmg / tot * 100).toFixed(1) + '% del botín' +
      (d.cobrado ? ' · ya cobró' : '') + '</div></div></div>').join("") ||
      '<div class="fds">Nadie le pegó todavía. Entrá a la Guarida.</div>';
  }
  h += '<div class="forge-row"><div class="finfo"><div class="fds">Salir del clan te saca del asalto en curso.</div></div>' +
    '<div class="fbtns"><button class="sm" id="clan-salir">Salir del clan</button></div></div>';
  box.innerHTML = h;
  const ra = $("raid-abrir"); if (ra) ra.onclick = async () => {
    const res = await raidAbrir(RAID_HP);
    if (res.error) { toast("No se pudo: " + res.error); return; }
    toast("¡Asalto abierto! El Dragón espera en la Guarida."); _clanT = 0; refreshClan();
  };
  const rc = $("raid-cobrar"); if (rc) rc.onclick = async () => {
    const res = await raidCobrar();
    if (res.error || !res.parte) { toast("No hay nada para cobrar"); return; }
    raidBotin(res.parte);
    _clanT = 0; refreshClan();
  };
  const cs = $("clan-salir"); if (cs) cs.onclick = async () => {
    askConfirm("¿Seguro que querés salir del clan?", async () => {
      await clanSalir(); toast("Saliste del clan"); _clanT = 0; refreshClan();
    }, { title: "Salir del clan", yes: "Salir", yesClass: "red", no: "Quedarme" });
  };
}
// entrega la parte del botín del jefe que te tocó
function raidBotin(parte) {
  const p = Math.max(0, Math.min(1, parte));
  const dar = { plata: Math.round(RAID_BOTIN.plata * p), esencia_oscura: Math.max(1, Math.round(RAID_BOTIN.esencia_oscura * p)),
                diamante: Math.round(RAID_BOTIN.diamante * p), netherita: Math.round(RAID_BOTIN.netherita * p) };
  G.plata += dar.plata;
  ["esencia_oscura", "diamante", "netherita"].forEach(k => { if (dar[k] > 0) tryAddRes(k, dar[k]); });
  const txt = Object.keys(dar).filter(k => dar[k] > 0).map(k => "+" + fmt(dar[k]) + " " + (k === "plata" ? "plata" : RES_LABEL[k])).join(" · ");
  log("Botín del Dragón (" + Math.round(p * 100) + "% del reparto): " + txt, "gold");
  if (window.celebrate) celebrate({ title: "¡DRAGÓN VENCIDO!", sub: "Asalto del clan", big: true, reward: txt });
  refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
}

/* ---- MAPA (10/8): dónde estás y a dónde podés ir ---- */
function refreshMapa() {
  const box = $("mapa-list"); if (!box) return;
  const aca = (window.GF && GF.scene) || "farm";
  const espera = (typeof zonaCdLeft === "function") ? zonaCdLeft() : 0;
  const zonas = [
    { id: "farm",   nom: "Tu granja",   ds: "Cultivos, animales, edificios y la laguna.", ir: true },
    { id: "plaza",  nom: "La plaza",    ds: "El hub con los demás jugadores. Chat y encuentro.", ir: true },
  ];
  let h = zonas.map(z => {
    const estoy = z.id === aca;
    return '<div class="forge-row' + (estoy ? ' eq' : '') + '"><div class="finfo">' +
      '<div class="fnm">' + z.nom + (estoy ? ' <span class="tag">estás acá</span>' : '') + '</div>' +
      '<div class="fds">' + z.ds + '</div></div><div class="fbtns">' +
      (estoy ? '' : '<button class="green sm" data-ir="' + z.id + '">Ir</button>') +
      '</div></div>';
  }).join("");
  // ---- los mapas de la Zona Negra (10/8) ----
  h += '<div class="secc">Zona Negra</div>';
  h += '<div class="info">Se entra por el portal de la granja, y de un mapa al siguiente se pasa por el teleport del fondo. ' +
    (espera > 0 ? 'El granjero descansa — podés volver en <b>' + fmtDur(espera) + '</b>.' : 'Cada mapa pide más nivel de Combate.') + '</div>';
  const vistas = G.zonasVistas || ["pantano"];
  h += ZONA_ORDER.map(k => {
    const z = ZONA_DEF[k], estoy = (aca === "forest" && GF.zona === k);
    const puede = zonaPuedeEntrar(k), visto = vistas.indexOf(k) >= 0;
    return '<div class="forge-row' + (estoy ? ' eq' : (puede ? '' : ' locked')) + '"><div class="finfo">' +
      '<div class="fnm">' + z.label + (estoy ? ' <span class="tag">estás acá</span>' : '') +
        (z.clan ? ' <span class="tag">de clan</span>' : '') + '</div>' +
      '<div class="fds">' + z.ds + '</div>' +
      '<div class="fds">' + (puede ? (visto ? "Ya estuviste acá." : "Nunca entraste.") : "Pide Combate nivel " + z.lvl + ".") + '</div>' +
      '</div><div class="fbtns"></div></div>';
  }).join("");
  box.innerHTML = h;
  box.querySelectorAll("[data-ir]").forEach(b => b.onclick = () => irAZona(b.dataset.ir));
}
function irAZona(id) {
  const sc = window.farmScene || window.forestScene || window.plazaScene;
  closeOv("ov-mapa");
  if (id === "forest") { toast("Entrá por el portal de la granja"); return; }
  const actual = (window.GF && GF.scene) || "farm";
  if (id === actual) return;
  const escena = (window.farmScene && window.farmScene.scene) ? window.farmScene : sc;
  if (escena && escena.scene) { escena.leaving = true; irAEscena(escena, id); }
}

function refreshPass() {
  const box = $("pass-list"); if (!box) return;
  const p = passInit(), lvl = passLvl();
  const into = p.stars - lvl * PASS_STARS_LVL, need = PASS_STARS_LVL;
  let h = '<div class="forge-row"><div class="finfo">' +
    '<div class="fnm">Nivel ' + lvl + ' / 30 · ' + fmt(p.stars) + ' estrellas' + (p.vip ? ' · <b style="color:#7a5606">VIP activo</b> (+' + Math.round((PASS_VIP_BOOST - 1) * 100) + '% estrellas)' : '') + '</div>' +
    (lvl < 30 ? '<div class="durbar"><i style="width:' + Math.round(into / need * 100) + '%"></i></div><div class="fds">' + into + '/' + need + ' estrellas para el nivel ' + (lvl + 1) + '</div>' : '<div class="fds">¡Pase completo!</div>') +
    '<div class="fds">Se sube JUGANDO: misiones diarias y semanales dan estrellas. La temporada dura 4-6 semanas.</div></div>' +
    '<div class="fbtns">' + (p.vip ? '' : '<button class="green sm" id="pass-vip">Pase VIP · ' + PASS_VIP_PRICE + ' $G</button>') +
    (lvl < 30 ? '<button class="sm" id="pass-buylvl">+1 nivel · ' + PASS_LVL_GOLD + ' $G</button>' : '') + '</div></div>';
  // Las misiones se mudaron a su propia ventana (10/8): acá solo queda el atajo, para que el
  // Pase sea lo que tiene que ser — la lista de recompensas.
  { const hechas = p.daily.mis.filter(m => m.ok).length;
    h += '<div class="info">Misiones de hoy: <b>' + hechas + '/' + p.daily.mis.length + '</b> cumplidas. ' +
      '<button class="green sm" id="pass-ir-mis">Ver misiones</button></div>'; }
  // cosméticos ganados
  if (p.cosmetics.length) h += '<div class="fds" style="margin-top:6px">Tus cosméticos: ' + p.cosmetics.join(" · ") + '</div>';
  // fixs.docx #5 (11/8): botón RECLAMAR TODO — junta lo pendiente de todos los niveles alcanzados
  const pendientes = [];
  for (let nv = 1; nv <= Math.min(lvl, 30); nv++) {
    if (!p.claimF[nv]) pendientes.push([nv, false]);
    if (p.vip && !p.claimV[nv]) pendientes.push([nv, true]);
  }
  if (pendientes.length) h += '<div class="info"><button class="green sm" id="pass-claimall">🎁 RECLAMAR TODO (' + pendientes.length + ')</button></div>';
  // los 30 niveles
  h += '<div class="secc">Recompensas (Free / VIP)</div>';
  for (let nv = 1; nv <= 30; nv++) {
    const rf = PASS_FREE[nv - 1], rv = PASS_VIP[nv - 1];
    const alc = nv <= lvl, hito = PASS_HITOS[nv] || "";
    const bf = p.claimF[nv] ? '<button class="ghost sm" disabled>Reclamado</button>' : (alc ? '<button class="green sm" data-pfree="' + nv + '">Reclamar</button>' : '');
    const bv = p.claimV[nv] ? '<button class="ghost sm" disabled>Reclamado</button>' : (alc && p.vip ? '<button class="green sm" data-pvip="' + nv + '">Reclamar VIP</button>' : '');
    h += '<div class="forge-row' + (alc ? '' : ' locked') + '"><div class="finfo">' +
      '<div class="fnm">Nivel ' + nv + (hito ? ' <span style="color:#7a5606">' + hito + '</span>' : '') + '</div>' +
      '<div class="fds free">FREE: ' + passRewardStr(rf) + '</div>' +
      '<div class="fds vip">VIP: ' + passRewardStr(rv) + (p.vip ? '' : ' (requiere Pase VIP)') + '</div>' +
      '</div><div class="fbtns">' + bf + bv + '</div></div>';
  }
  box.innerHTML = h;
  const im = $("pass-ir-mis"); if (im) im.onclick = () => { closeOv("ov-pass"); openOv("ov-misiones"); };
  const pv = $("pass-vip"); if (pv) pv.onclick = () => passBuyVip();
  const pl = $("pass-buylvl"); if (pl) pl.onclick = () => passBuyLevel();
  box.querySelectorAll("[data-pfree]").forEach(b => b.onclick = () => passClaim(Number(b.dataset.pfree), false));
  box.querySelectorAll("[data-pvip]").forEach(b => b.onclick = () => passClaim(Number(b.dataset.pvip), true));
  const ca = $("pass-claimall"); if (ca) ca.onclick = () => { pendientes.forEach(([nv, vip]) => passClaim(nv, vip)); toast("Reclamaste " + pendientes.length + " recompensa(s) del pase"); };   // fixs #5
}



/* ---- GOD HAND 2.0 (fixs.docx #19, 11/8): los 6 espacios de semillas ---- */
function refreshGodHand() {
  const box = $("godhand-list"); if (!box) return;
  if (!tengoGodHand()) { box.innerHTML = '<div class="info">Todavía no la compraste — está en la Tienda, sección GOD HAND.</div>'; return; }
  const inv = godHandInv();
  let h = '<div class="info">Semillas cargadas: <b>' + godHandTotal() + '/' + (GODHAND_SLOTS * GODHAND_CAP_SLOT) + '</b> · ' +
    'Tarifa: <b>' + GODHAND_PLATA_HORA + ' plata</b> la 1ª hora, +10% cada una (24 h = ' + fmt(godHandCostoHoras(GODHAND_MAX_H)) + ')</div>';
  inv.forEach((s, i) => {
    const d = s && CROP_DEF[s.key];
    h += '<div class="forge-row"><div class="fic">' + (d ? '<img src="' + GF.spr("crop_" + s.key) + '" onerror="this.outerHTML=\'' + d.emoji + '\'">' : '') + '</div>' +
      '<div class="finfo"><div class="fnm">Espacio ' + (i + 1) + (d ? ' · ' + d.label + ' <span class="tag">' + s.n + '/' + GODHAND_CAP_SLOT + '</span>' : ' <span class="tag">vacío</span>') + '</div>' +
      '<div class="fds">' + (d ? 'Ciclo de ' + d.label + ': siembra, cosecha y resiembra solo.' : 'Elegí qué semilla cargar.') + '</div></div>' +
      '<div class="fbtns">' +
        (d && s.n >= GODHAND_CAP_SLOT ? '' : '<select data-ghsel="' + i + '">' +
          (d ? '<option value="' + s.key + '">' + CROP_DEF[s.key].label + '</option>'
             : '<option value="">— semilla —</option>' + CROP_ORDER.filter(k => (G.seeds[k] || 0) > 0).map(k => '<option value="' + k + '">' + CROP_DEF[k].label + ' (' + Math.floor(G.seeds[k]) + ')</option>').join("")) +
          '</select><button class="green sm" data-ghload="' + i + '">Cargar</button>') +
        (d ? '<button class="ghost sm" data-ghout="' + i + '">Vaciar</button>' : '') +
      '</div></div>';
  });
  h += '<div class="fds">Solo trabaja las parcelas que estaban VACÍAS al irte. Si una siembra queda a medias, la vas a encontrar creciendo.</div>';
  box.innerHTML = h;
  box.querySelectorAll("[data-ghload]").forEach(b => b.onclick = () => {
    const i = Number(b.dataset.ghload), sel = box.querySelector('[data-ghsel="' + i + '"]');
    const key = sel && sel.value; if (!key) { toast("Elegí una semilla"); return; }
    godHandCargar(i, key);
  });
  box.querySelectorAll("[data-ghout]").forEach(b => b.onclick = () => godHandVaciar(Number(b.dataset.ghout)));
}

/* ---- Curtiduría: las 20 piezas de armadura ("2das mejoras") ---- */
function refreshCurtiduria() {
  const box = $("curti-list"); if (!box) return;
  let h = '<div class="info">Equipada: <b>' + (G.armorEq && ARMOR_SETS[G.armorEq] ? ARMOR_SETS[G.armorEq].label + " · " + armorDefensa() + " de defensa" : "ninguna") + '</b></div>';
  ARMOR_ORDER.forEach(set => {
    const sd = ARMOR_SETS[set], eq = armorEquipado(set), n = armorPuestas(set), completo = armorSetCompleto(set);
    const defTotal = ARMOR_SLOTS.reduce((a, pz) => a + sd.piezas[pz].def, 0);
    h += '<div class="secc">' + sd.label + ' <span class="fds">(' + sd.tipo + ' · ' + n + '/5 piezas · ' + defTotal + ' de defensa el set)</span></div>';
    h += '<div class="info"><div>Material: <b>' + RES_LABEL[sd.mat] + '</b> (tenés ' + (G.res[sd.mat] || 0) + ') · del ' + ANIMAL_DEF[sd.animal].label + '</div>' +
      '<div class="oro">Bono del set completo: ' + sd.bono.txt + (completo ? ' — ACTIVO' : '') + '</div></div>';
    ARMOR_SLOTS.forEach(pz => {
      const p = sd.piezas[pz], tiene = armorTiene(set, pz);
      const costo = p.mat + " " + RES_LABEL[sd.mat] + (p.hierro ? " · " + p.hierro + " Hierro" : "") + " · " + p.plata + " plata";
      const puede = (G.res[sd.mat] || 0) >= p.mat && (!p.hierro || (G.res.hierro || 0) >= p.hierro) && G.plata >= p.plata && (G.built && G.built.curtiduria);
      // 10/8: cada pieza con su ícono (antes la lista era puro texto y las 20 filas se veían iguales)
      h += '<div class="forge-row' + (tiene ? ' eq' : '') + '">' +
        '<div class="fic"><img src="' + GF.spr("armor_" + set + "_" + pz) + '" onerror="this.remove()"></div>' +
        '<div class="finfo">' +
        '<div class="fnm">' + ARMOR_SLOT_LABEL[pz] + ' <span class="tag">+' + p.def + ' def</span>' + (tiene ? ' ✓' : '') + '</div>' +
        '<div class="fds">' + (tiene ? "Ya la tenés" : "Costo: " + costo) + '</div></div>' +
        '<div class="fbtns">' + (tiene ? '<button class="ghost sm" disabled>Lista</button>'
          : '<button class="green sm" ' + (puede ? "" : "disabled") + ' data-carmor="' + set + ':' + pz + '">Craftear</button>') + '</div></div>';
    });
    if (n) h += '<div class="fbtns" style="margin-top:4px">' + (eq ? '<button class="ghost sm" disabled>Puesta</button>'
      : '<button class="green sm" data-eqset="' + set + '">Ponerse esta armadura</button>') + '</div>';
  });
  box.innerHTML = h;
  box.querySelectorAll("[data-carmor]").forEach(b => b.onclick = () => { const [s2, p2] = b.dataset.carmor.split(":"); craftArmor(s2, p2); });
  box.querySelectorAll("[data-eqset]").forEach(b => b.onclick = () => equiparSet(b.dataset.eqset));
}

/* ---- Establo: animales, felicidad y producción ("2das mejoras") ---- */
function refreshEstablo() {
  const box = $("establo-list"); if (!box) return;
  let h = "";
  ANIMAL_ORDER.forEach(k => {
    const d = ANIMAL_DEF[k], a = animalDe(k);
    const come = d.come.map(c => (CROP_DEF[c] ? CROP_DEF[c].label : c)).join(" o ");
    if (!a) {
      h += '<div class="forge-row"><div class="fic">' + d.emoji + '</div><div class="finfo">' +
        '<div class="fnm">' + d.label + '</div>' +
        '<div class="fds">Come ' + come + ' · produce ' + RES_LABEL[d.mat] + ' (' + d.porCiclo + ' cada ' + fmtSecs(d.cicloH * 3600) + ')</div>' +
        '<div class="fds">Desbloquea la armadura de ' + d.armadura + '</div></div>' +
        '<div class="fbtns"><button class="green sm" ' + (G.golden >= animalPrecio(k) ? "" : "disabled") + ' data-buyani="' + k + '">Comprar · ' + animalPrecio(k) + ' $G</button></div></div>';
      return;
    }
    const f = animalFelicidad(k), listo = animalListo(k);
    // 10/8: ahora se puede tener más de uno por tipo. Alimentar y recoger actúan sobre TODOS
    // los de ese tipo de una sola vez: con 5 alpacas, cinco botones sueltos sería un castigo.
    const cant = animalCant(k), listos = animalListos(k), tope = cant >= ANIMAL_MAX;
    const tieneComida = d.come.some(c => (G.res[c] || 0) > 0);
    const rinde = Math.max(1, Math.round(d.porCiclo * (FELIZ_MIN_PROD + (1 - FELIZ_MIN_PROD) * f / 100)));
    h += '<div class="forge-row' + (listo ? ' eq' : '') + '"><div class="fic">' + d.emoji + '</div><div class="finfo">' +
      '<div class="fnm">' + d.label + (cant > 1 ? ' ×' + cant : '') + ' <span class="tag">felicidad ' + f + '/100' + (cant > 1 ? ' (media)' : '') + '</span></div>' +
      '<div class="durbar"><i style="width:' + f + '%"></i></div>' +
      '<div class="fds">' + (listo ? '<b style="color:#3f6b2a">' + (listos > 1 ? listos + ' listos' : '¡Listo!') + ' · dan ' + (rinde * listos) + ' de ' + RES_LABEL[d.mat] + '</b>' : 'El próximo produce en ' + fmtDur(animalFalta(k)) + ' · rendiría ' + rinde + ' de ' + RES_LABEL[d.mat]) + '</div>' +
      '<div class="fds">Alimentalo con ' + come + ' (+' + FELIZ_POR_COMIDA + ' de felicidad) · pierde ' + FELIZ_BAJA_H + '/hora si lo descuidás</div></div>' +
      '<div class="fbtns">' +
        '<button class="green sm" ' + (tieneComida ? "" : "disabled") + ' data-feed="' + k + '">Alimentar</button>' +
        '<button class="green sm" ' + (listo ? "" : "disabled") + ' data-take="' + k + '">Recoger' + (listos > 1 ? ' todo (' + listos + ')' : '') + '</button>' +
        '<button class="green sm" ' + (!tope && G.golden >= animalPrecio(k) ? "" : "disabled") + ' data-buyani="' + k + '">' + (tope ? 'Tope ' + ANIMAL_MAX : 'Otro · ' + animalPrecio(k) + ' $G') + '</button>' +
      '</div></div>';
  });
  h += '<div class="info">Materiales: ' + ANIMAL_ORDER.map(k => RES_LABEL[ANIMAL_DEF[k].mat] + " <b>" + (G.res[ANIMAL_DEF[k].mat] || 0) + "</b>").join(" · ") + '</div>';
  box.innerHTML = h;
  box.querySelectorAll("[data-buyani]").forEach(b => b.onclick = () => {
    const k = b.dataset.buyani, d = ANIMAL_DEF[k];
    askConfirm("Comprar " + d.label + " cuesta " + d.golden + " $Golden. Después hay que alimentarlo para que produzca " + RES_LABEL[d.mat] + ". ¿Comprar?",
      () => comprarAnimal(k), { title: "Comprar " + d.label, yes: "Comprar", yesClass: "green", no: "Cancelar", noClass: "red" });
  });
  box.querySelectorAll("[data-feed]").forEach(b => b.onclick = () => alimentarAnimal(b.dataset.feed));
  box.querySelectorAll("[data-take]").forEach(b => b.onclick = () => recogerAnimal(b.dataset.take));
}

/* ---- Altar de Runas (doc maestro 2/8) ---- */
function refreshAltar() {
  const box = $("altar-list"); if (!box) return;
  const owned = Object.keys(G.weapons || {});
  let h = "";
  // ---- Eje 1: MEJORA +1..+15 ----
  h += '<div class="secc">Mejorar arma (+1 a +15)</div>';
  h += '<div class="info"><div>Cada intento gasta Runas de Poder + plata. Polvo de Suerte: +10 pts de éxito. De +6 a +10 fallar baja −1; de +11 a +15 fallar puede ROMPER el arma salvo que uses Runa de Protección.</div>';
  h += '<div>Tenés: ' + (G.res.runa_poder || 0) + ' Runa de Poder · ' + (G.res.polvo_suerte || 0) + ' Polvo de Suerte · ' + (G.res.runa_proteccion || 0) + ' Runa de Protección · ' + (G.res.esencia_runica || 0) + ' Esencia rúnica</div>';
  h += '</div>';
  if (!owned.length) h += '<div class="info">No tenés armas: forjá una en la Herrería.</div>';
  owned.forEach(id => {
    const w = ARM_DEF[id]; if (!w) return;
    const plus = armPlus(id), next = plus + 1;
    if (next > 15) { h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + w.label + ' +15</div><div class="fds">Tope de tope: +215% de daño. Aura de leyenda.</div></div></div>'; return; }
    const u = UPG[next];
    h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + w.label + (plus ? " +" + plus : "") + ' → +' + next + '</div>' +
      '<div class="fds">Éxito: <b>' + u.ex + '%</b> (con polvo ' + u.exP + '%) · +' + u.dmg + '% daño acum. · Cuesta ' + u.rp + ' Runa de Poder + ' + u.plata + ' plata' + (next >= 6 ? (next >= 11 ? ' · al fallar: −1 y RIESGO DE ROTURA' : ' · al fallar: baja −1') : ' · al fallar solo perdés materiales') + '</div>' +
      '<div class="fds"><label><input type="checkbox" data-polvo="' + id + '"> usar Polvo de Suerte</label> &nbsp; <label><input type="checkbox" data-prot="' + id + '"' + (next >= 11 ? ' checked' : '') + '> usar Runa de Protección</label></div>' +
      '<div class="fds">Ranuras de runa: ' + [1, 2, 3].map(sl => { const abre = sl === 1 ? 3 : sl === 2 ? 7 : 12; const sk = armSockets(id)[sl]; return sl <= socketsOpen(plus) ? (sk ? runaLabel(sk.t, sk.r) : "vacía") : "cerrada (+" + abre + ")"; }).join(" · ") + '</div>' +
      // El Altar era el ÚNICO panel donde ningún botón se deshabilitaba: salían todos verdes y
      // state.js rebotaba con un toast. Además, como la sacudida noNo() depende de [disabled],
      // nunca se disparaba acá (10/8).
      '</div><div class="fbtns"><button class="green sm" ' + ((G.res.runa_poder || 0) >= (UPG[Math.min(15, (armPlus(id) || 0) + 1)] || { rp: 0 }).rp ? "" : "disabled") + ' data-upg="' + id + '">Mejorar</button></div></div>';
  });
  // ---- Sockets del arma equipada ----
  const eq = armaEq();
  if (eq && socketsOpen(armPlus(eq)) > 0) {
    h += '<div class="secc">Runas de ' + ARM_DEF[eq].label + (armPlus(eq) ? " +" + armPlus(eq) : "") + ' (equipada)</div>';
    h += '<div class="info">Socketear una runa sobre otra DESTRUYE la anterior.</div>';
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
  h += '<div class="secc">Craftear materiales</div>';
  for (const id in ALTAR_CRAFT) {
    const c = ALTAR_CRAFT[id];
    const costo = Object.keys(c.cost).map(k => c.cost[k] + " " + (RES_LABEL[k] || k)).join(" + ") + (c.plata ? " + " + c.plata + " plata" : "") + (c.golden ? " + " + c.golden + " $Golden" : "");
    const okC = canAfford(c.cost) && (!c.plata || G.plata >= c.plata) && (!c.golden || G.golden >= c.golden);
    h += '<div class="forge-row' + (okC ? '' : ' locked') + '"><div class="finfo"><div class="fnm">' + RES_LABEL[id] + ' <span class="fds">(tenés ' + (G.res[id] || 0) + ')</span></div><div class="fds">' + costo + '</div></div><div class="fbtns"><button class="green sm" ' + (okC ? "" : "disabled") + ' data-caltar="' + id + '">Craftear</button><button class="green sm" ' + (okC ? "" : "disabled") + ' data-caltar5="' + id + '" title="Craftear 5">×5</button></div></div>';
  }
  // runas de atributo I
  h += '<div class="secc">Craftear runas de atributo (rareza I)</div>';
  h += '<div class="info">Cuestan ' + Object.keys(RUNA_CRAFT.cost).map(k => RUNA_CRAFT.cost[k] + " " + (RES_LABEL[k] || k)).join(" + ") + ' + ' + RUNA_CRAFT.plata + ' plata.</div>';
  const okR = canAfford(RUNA_CRAFT.cost) && G.plata >= RUNA_CRAFT.plata;
  RUNA_ORDER.forEach(t => {
    h += '<div class="forge-row' + (okR ? '' : ' locked') + '"><div class="finfo"><div class="fnm">' + RUNA_TIPOS[t].label + ' I <span class="fds">(tenés ' + (G.res[runaKey(t, 1)] || 0) + ')</span></div><div class="fds">' + RUNA_TIPOS[t].buff + ': +' + RUNA_TIPOS[t].vals[0] + RUNA_TIPOS[t].uni + ' → +' + RUNA_TIPOS[t].vals[4] + RUNA_TIPOS[t].uni + ' en rareza V</div></div><div class="fbtns"><button class="green sm" ' + (okR ? "" : "disabled") + ' data-cruna="' + t + '">Craftear I</button><button class="green sm" ' + (okR ? "" : "disabled") + ' data-cruna5="' + t + '" title="Craftear 5">×5</button></div></div>';
  });
  // ---- Fusión ----
  let fus = "";
  RUNA_ORDER.forEach(t => { for (let r = 1; r <= 4; r++) { const n = G.res[runaKey(t, r)] || 0; if (n >= 3) fus += '<div class="forge-row"><div class="finfo"><div class="fnm">3× ' + runaLabel(t, r) + ' → 1× ' + runaLabel(t, r + 1) + '</div><div class="fds">' + (FUSE_GOLD[r] ? "Cuesta " + FUSE_GOLD[r] + " $Golden" : "Gratis") + ' · tenés ' + n + '</div></div><div class="fbtns"><button class="green sm" ' + ((!FUSE_GOLD[r] || G.golden >= FUSE_GOLD[r]) ? "" : "disabled") + ' data-fuse="' + t + ':' + r + '">Fusionar</button></div></div>'; } });
  if (fus) h += '<div class="secc">Fusionar runas (3 iguales → 1 de rareza superior)</div>' + fus;
  box.innerHTML = h;
  box.querySelectorAll("[data-upg]").forEach(b => b.onclick = () => {
    const id = b.dataset.upg;
    const polvo = box.querySelector('[data-polvo="' + id + '"]');
    const prot = box.querySelector('[data-prot="' + id + '"]');
    upgradeWeapon(id, polvo && polvo.checked, prot && prot.checked);
  });
  box.querySelectorAll("[data-caltar]").forEach(b => b.onclick = () => craftAltarItem(b.dataset.caltar));
  box.querySelectorAll("[data-caltar5]").forEach(b => b.onclick = () => craftLote(craftAltarItem, b.dataset.caltar5, 5));
  box.querySelectorAll("[data-cruna]").forEach(b => b.onclick = () => craftRunaI(b.dataset.cruna));
  box.querySelectorAll("[data-cruna5]").forEach(b => b.onclick = () => craftLote(craftRunaI, b.dataset.cruna5, 5));
  box.querySelectorAll("[data-fuse]").forEach(b => b.onclick = () => { const [t, r] = b.dataset.fuse.split(":"); fuseRuna(t, Number(r)); });
  box.querySelectorAll("[data-socket]").forEach(sel => sel.onchange = () => {
    if (!sel.value) return;
    const [t, r] = sel.value.split(":");
    socketRuna(armaEq(), Number(sel.dataset.socket), t, Number(r));
  });
}

/* ---- mercado / tienda ---- */
/* ---- TIENDA · pestaña de ADORNOS (10/8) --------------------------------------
   Decorar la granja y, más adelante, los eventos de "la más linda". Acá también van las
   parcelas (pagables en plata o en $Golden) y la GOD HAND, porque son las tres compras
   que el doc pidió meter "en la misma área de la tienda". */
function refreshDeco() {
  const box = $("deco-shop"); if (!box) return;
  let h = "";
  // --- parcelas ---
  const tope = (G.plotsOwned || 2) >= PLOT_MAX;   // 10/8: el diseñador subió el tope de 12 a 60
  h += '<div class="secc">Parcelas</div>';
  h += '<div class="forge-row"><div class="finfo"><div class="fnm">Parcela nueva <span class="tag">' + (G.plotsOwned || 2) + '/' + PLOT_MAX + '</span></div>' +
    '<div class="fds">' + (tope ? "Ya tenés las " + PLOT_MAX + "." : "Elegís con qué pagarla. El precio sube con cada una." + ((G.plotsOwned || 2) >= 12 ? " Las nuevas van a tu zona de edición: las ponés vos donde quieras." : "")) + '</div></div>' +
    '<div class="fbtns">' +
      (tope ? '<button class="ghost sm" disabled>Completo</button>' :
        '<button class="green sm" ' + (G.plata >= plotUnlockCost() ? "" : "disabled") + ' data-plot="plata">' + fmt(plotUnlockCost()) + ' plata</button>' +
        '<button class="green sm" ' + (G.golden >= plotUnlockGolden() ? "" : "disabled") + ' data-plot="golden">' + plotUnlockGolden() + ' $G</button>') +
    '</div></div>';
  // --- GOD HAND ---
  h += '<div class="secc">GOD HAND</div>';
  h += '<div class="forge-row' + (tengoGodHand() ? ' eq' : '') + '"><div class="fic"><img src="' + GF.spr("godhand") + '" onerror="this.remove()"></div><div class="finfo"><div class="fnm">GOD HAND' + (tengoGodHand() ? ' <span class="tag">tuya</span>' : '') + '</div>' +
    '<div class="fds">El cropper NFT completo: cargale hasta 300 semillas (6 espacios) y mientras no estás hace TODO el ciclo en tus parcelas vacías — siembra, cosecha y resiembra — y te entrega lo producido al volver.</div>' +
    '<div class="fds">Cobra en plata por hora trabajada (100 la primera, +10% cada una, hasta 24 h). Se compra una vez y queda para siempre.</div>' +
    (tengoGodHand() ? '<div class="fds"><b>Semillas cargadas: ' + godHandTotal() + '/300.</b> Trabaja sola la próxima vez que vuelvas con parcelas vacías.</div>' : '') + '</div>' +
    '<div class="fbtns">' + (tengoGodHand() ? '<button class="gold sm" id="gh-admin">✋ Cargar semillas</button>' :
      '<button class="green sm" ' + (G.golden >= GODHAND_GOLDEN ? "" : "disabled") + ' id="buy-godhand">' + GODHAND_GOLDEN + ' $G</button>') + '</div></div>';
  // --- adornos ---
  h += '<div class="secc">Adornos</div>';
  // Discord del diseñador (10/8): compraba vallas y flores y no sabía a dónde iban.
  // Ahora la bolsa se ve acá mismo y hay un botón que te lleva directo a ponerlos.
  const enBolsa = DECO_ORDER.reduce((a, id) => a + decoTengo(id), 0);
  h += '<div class="info">Los adornos no dan ninguna ventaja: son para que la granja se vea linda. Al comprarlos van a tu <b>bolsa</b> y los colocás desde el modo edición. En bolsa: <b>' + enBolsa + '</b> · Puestos: <b>' + decoPuestos() + '/' + DECO_MAX + '</b>' +
    (enBolsa ? ' <button class="green sm" id="deco-editar">✏️ Ponerlos ahora</button>' : '') + '</div>';
  DECO_ORDER.forEach(id => {
    const d = DECO_DEF[id], tengo = decoTengo(id);
    if (d.cofre) return;   // los del cofre de login no se venden acá
    const precio = d.plata ? fmt(d.plata) + " plata" : d.golden + " $G";
    const puede = d.plata ? G.plata >= d.plata : G.golden >= d.golden;
    h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + d.label + (tengo ? ' <span class="tag">sin poner: ' + tengo + '</span>' : '') + '</div>' +
      '<div class="fds">' + d.ds + '</div></div>' +
      '<div class="fbtns"><button class="green sm" ' + (puede ? "" : "disabled") + ' data-buydeco="' + id + '">' + precio + '</button></div></div>';
  });
  box.innerHTML = h;
  box.querySelectorAll("[data-buydeco]").forEach(b => b.onclick = () => { comprarDeco(b.dataset.buydeco); refreshDeco(); });
  box.querySelectorAll("[data-plot]").forEach(b => b.onclick = () => { comprarParcela(b.dataset.plot === "golden"); refreshDeco(); });
  const gh = $("buy-godhand"); if (gh) gh.onclick = () => { comprarGodHand(); refreshDeco(); };
  const ga = $("gh-admin"); if (ga) ga.onclick = () => { if (typeof refreshGodHand === "function") refreshGodHand(); openOv("ov-godhand"); };   // GOD HAND 2.0
  const de = $("deco-editar"); if (de) de.onclick = () => { if (window.setEditMode) setEditMode(true); };   // cierra la Tienda y abre el modo edición con el selector de adornos
}

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
  box.innerHTML = '<div class="shophead">Cupo diario: ' + sb.count + '/' + seedDailyMax() + ' semillas (sube con el nivel de granja)</div>' + CROP_ORDER.map(k => {
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
  const box = $("barn-body") || $("barn-list") || document.querySelector("#ov-barn .card");
  const nv = G.level, sig = nv + 1;
  const xp = Math.floor(G.skills.farming || 0);
  const need = FARM_XP_LVLS[sig];
  let h = '<div class="secc">Granja nivel ' + nv + ' / ' + FARM_NIVEL_MAX + '</div>';
  if (sig > FARM_NIVEL_MAX) h += '<div class="info">¡Máximo alcanzado! Leyenda de la Granja Dorada.</div>';
  else {
    const desde = FARM_XP_LVLS[nv] || 0;
    const pct = Math.max(0, Math.min(100, Math.round((xp - desde) / Math.max(1, need - desde) * 100)));
    h += '<div class="durbar" style="margin:6px 0"><i style="width:' + pct + '%"></i></div>@INFO@';
    // los datos sueltos van en un recuadro claro, no escritos sobre la madera
    let info = '<div><b>XP de cosecha:</b> ' + fmt(xp) + ' / ' + fmt(need) + '</div>';
    const tareas = tareasDelNivel(sig);
    if (tareas.length) {
      h += '<div class="secc">Tareas para el nivel ' + sig + '</div>';
      tareas.forEach(t => {
        const p0 = Math.min(tareaProgreso(t), t[2]), ok = p0 >= t[2];
        h += '<div class="forge-row' + (ok ? ' eq' : '') + '"><div class="finfo"><div class="fnm">' + tareaLabel(t) + (ok ? ' ✓' : '') + '</div>' +
          '<div class="durbar"><i style="width:' + Math.round(p0 / t[2] * 100) + '%"></i></div>' +
          '<div class="fds">' + p0 + '/' + t[2] + '</div></div></div>';
      });
    } else info += '<div>Nivel rápido: sube solo con la XP de cosecha.</div>';
    if (FARM_UNLOCK[sig]) info += '<div class="verde">Recompensa del nivel ' + sig + ': ' + FARM_UNLOCK[sig] + '</div>';
    h = h.replace("@INFO@", '<div class="info">' + info + '</div>');
  }
  h += '<div class="info"><div>Parcelas: <b>' + (G.plotsOwned || 2) + '</b> · Cofres: <b>+' + (G.chestCap || 0) + '</b> de capacidad</div>' +
    ((G.cosmeticos || []).length ? '<div>Cosméticos ganados: <b>' + G.cosmeticos.length + '</b></div>' : '') + '</div>';
  if (box) box.innerHTML = h;
}


/* ---- configuración ---- */
function refreshConfig() {
  const st = $("cfg-auth-status"); if (st) st.textContent = "Jugando como: " + (window.NICK || "Granjero") + ". (Cuenta/login llega en otra fase.)";
  const l = $("cfg-login"); if (l) l.style.display = "none"; const o = $("cfg-logout"); if (o) o.style.display = "none";
}

/* ---- leaderboard (datos reales desde Supabase) ---- */
let lbTab = "plata";
let lbData = null, lbFetchedAt = 0, lbLoading = false;

function lbRowHtml(r, i, col) {
  const rank = i + 1; const cls = (r.me ? "me " : "") + (rank <= 3 ? "top" + rank : "");
  const val = col === "plata" ? `${coinIc("plata")}${fmt(r.v)}` : (col === "skill" ? escapeHtml(String(r.v)) : `${(+r.v).toFixed(1)}`);
  const c = r.me ? cosElegido() : null;   // los cosméticos propios se ven en vivo
  const nm = r.me ? escapeHtml(nombreLucido(r.n)) : escapeHtml(r.n || "—");
  const est = r.me ? ` class="nm ${c.marco !== "ninguno" ? "marco-" + c.marco : ""}" style="color:${colorNombre()}"` : ' class="nm"';
  return `<div class="lbrow ${cls}"><span class="rk">${rank}</span><span${est}>${nm}</span><span class="val">${val}</span></div>`;
}

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

// "detallitos (1)" punto 1: la skill MÁS ALTA de cada jugador para el ranking
function topSkillFromObj(sk) {
  if (!sk || typeof sk !== "object") return null;
  let mejor = null;
  for (const k in sk) {
    const lvl = (k === "cooking" && typeof cookLevelFromXp === "function") ? cookLevelFromXp(Number(sk[k]) || 0) : skillInfo(Number(sk[k]) || 0).lvl;
    if (!mejor || lvl > mejor.lvl) mejor = { k, lvl, nombre: (typeof SKILL_NAME !== "undefined" && SKILL_NAME[k]) || k };
  }
  return mejor;
}
function topSkillMio() { return topSkillFromObj(G.skills); }

function renderLb() {
  const col = lbTab, note = $("lb-note");
  const meId = (typeof UID === "string") ? UID : null;
  const rows = (Array.isArray(lbData) ? lbData : []).map(p => {
    const isMe = meId && p.user_id === meId;
    let plata = Math.floor(Number(p.plata) || 0);
    let exp = avgSkillFromObj(p.skills);
    let top = topSkillFromObj(p.skills);
    if (isMe) { plata = Math.floor(G.plata); exp = +avgSkillLevel().toFixed(2); top = topSkillMio(); }   // mis datos, en vivo
    return { n: p.name || "—", plata, exp, top, me: !!isMe };
  });
  // si todavía no estoy guardado en la tabla, me agrego con mis valores actuales
  if (meId && !rows.some(r => r.me)) rows.push({ n: window.NICK || "Vos", plata: Math.floor(G.plata), exp: +avgSkillLevel().toFixed(2), top: topSkillMio(), me: true });
  const val = r => (col === "plata" ? r.plata : (col === "skill" ? (r.top ? r.top.lvl : 0) : r.exp));
  rows.sort((a, b) => val(b) - val(a));
  $("lb-list").innerHTML = rows.slice(0, 20).map((r, i) => lbRowHtml({ n: r.n, v: (col === "skill" && r.top ? r.top.nombre + " " + r.top.lvl : val(r)), me: r.me }, i, col)).join("");
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
  d.innerHTML = '<b' + (m.color ? ' style="color:' + escapeHtml(String(m.color)) + '"' : "") + '>' + escapeHtml(m.name || "?") + ":</b> " + escapeHtml(m.text || "");
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
      card.classList.add("movida");   // ya no está centrada por transform: el pop de apertura usa otra animación
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
    el.classList.add("movida");
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
        el.classList.add("movida");   // posición guardada: ya no está centrada por transform
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
  // fixs.docx #10 (11/8): opción de menú FIJO — queda desplegado y no se cierra al elegir
  // ni al hacer clic afuera. La preferencia sobrevive al F5 (localStorage).
  window.menuFijo = () => { try { return localStorage.getItem("gmenuFijo") === "1"; } catch (e) { return false; } };
  const gmFijar = $("gm-fijar");
  const gmFijarTxt = () => { if (gmFijar) gmFijar.innerHTML = '<span class="ic"></span> ' + (menuFijo() ? "📌 Menú fijo: Sí" : "📌 Menú fijo: No"); };
  if (gmFijar) { gmFijarTxt(); gmFijar.onclick = () => { try { localStorage.setItem("gmenuFijo", menuFijo() ? "0" : "1"); } catch (e) {} gmFijarTxt(); toast(menuFijo() ? "El menú queda desplegado" : "El menú se recoge solo"); }; }
  if (menuFijo()) gmenu.classList.remove("collapsed");
  // multiventana: abrir un panel ya no cierra los demás (detalles 29/7)
  document.querySelectorAll(".gmi[data-panel]").forEach(b => b.onclick = () => { openOv(b.dataset.panel); if (!menuFijo()) gmenu.classList.add("collapsed"); });
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeOv(b.dataset.close));
  // entrenamiento: el botón y también un clic en cualquier lado de la capa oscura
  { const b = $("entr-fin"); if (b) b.onclick = entrenarFin;
    const ov = $("ov-entrenando"); if (ov) ov.addEventListener("click", ev => { if (ev.target === ov) entrenarFin(); }); }
  // initOverlayDrag() reemplazado por initUniversalDrag(): ahora toda la ventana es agarrable, no solo el título
  const lu = $("levelup"); if (lu) lu.onclick = levelUp;
  const pr = $("prestige"); if (pr) pr.onclick = prestige;
  document.querySelectorAll(".curbtn").forEach(b => b.onclick = () => { marketCur = b.dataset.cur; refreshMarket(); });
  document.querySelectorAll(".lbtab").forEach(b => b.onclick = () => { lbTab = b.dataset.lb; refreshLb(); });
  document.querySelectorAll(".shoptab[data-shop]").forEach(b => b.onclick = () => {
    if (b.dataset.shop === "deco") refreshDeco();
    document.querySelectorAll(".shoptab[data-shop]").forEach(x => x.classList.toggle("active", x === b));
    const s = b.dataset.shop;
    $("shop-buy").style.display = s === "buy" ? "" : "none";
    $("shop-sell").style.display = s === "sell" ? "" : "none";
    { const dp = $("shop-deco"); if (dp) dp.style.display = s === "deco" ? "" : "none"; }
  });
  // clic fuera de una ventana abierta → se cierra (menos la bolsa: multitarea al minar/talar, detalles 29/7)
  // apretar un botón bloqueado: se sacude en vez de no hacer nada (el "no" se entiende sin cartel)
  document.addEventListener("pointerdown", (e) => {
    const cont = e.target.closest && e.target.closest(".fbtns, .forge-row");
    if (!cont) return;
    const b = cont.querySelector("button[disabled]");
    if (b && cont.querySelectorAll("button").length === cont.querySelectorAll("button[disabled]").length) noNo(b);
  }, true);
  document.addEventListener("pointerdown", (e) => {
    // el menú se pliega solo al clickear fuera de él (volver a jugar) — salvo con menú fijo (#10)
    const gm = $("gmenu");
    if (gm && !gm.classList.contains("collapsed") && !e.target.closest("#gmenu, #menu-btn") && !(window.menuFijo && menuFijo())) gm.classList.add("collapsed");
    if (!anyOvOpen()) return;
    if (e.target.closest(".card, #gmenu, #hotwrap, .hudbar, #logpanel, #editbar, #seedwheel")) return;
    document.querySelectorAll(".ov.show:not(.bloquea)").forEach(o => { if (o.id !== "ov-inv") o.classList.remove("show"); });
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
// llena el selector de adornos con lo que tengas sin colocar
function syncEditDeco() {
  const sel = $("edit-deco"), lbl = $("edit-decons"); if (!sel) return;
  const hay = DECO_ORDER.filter(id => decoTengo(id) > 0);
  sel.innerHTML = hay.length ? hay.map(id => '<option value="' + id + '">' + DECO_DEF[id].label + ' (' + decoTengo(id) + ')</option>').join("")
                             : '<option value="">— no tenés adornos —</option>';
  sel.disabled = !hay.length;
  const bp = $("edit-poner"); if (bp) bp.disabled = !hay.length;
  // fix #17 (11/8): el botón de parcelas pendientes de colocar
  const ep = $("edit-parcela");
  if (ep) {
    const n = (typeof parcelasPendientes === "function") ? parcelasPendientes() : 0;
    ep.style.display = n > 0 ? "" : "none";
    ep.textContent = "Poner parcela (" + n + ")";
  }
  if (lbl) lbl.textContent = "Puestos: " + decoPuestos() + "/" + DECO_MAX + " · se compran en la Tienda";
}
// fix #14 (11/8): ya no se tira al primer hueco — el jugador hace CLIC en la celda que quiere
function ponerAdornoElegido() {
  const sel = $("edit-deco"); if (!sel || !sel.value) return;
  const sc = window.farmScene;
  if (!sc || !sc.iniciarColocar) { toast("Entrá a la granja para poner adornos"); return; }
  sc.iniciarColocar("deco", sel.value);
}

  window.setEditMode = (on) => {
    GF.editMode = on;
    const ce2 = $("cfg-edit"); if (ce2) ce2.textContent = on ? "Terminar edición" : "Modo edición";
    const eb = $("editbar"); if (eb) eb.classList.toggle("show", on);
    if (window.FARM && FARM.gridG) FARM.gridG.setVisible(on);   // el cuadriculado solo se ve editando
    if (on) { closeAllOv(); syncEditDeco(); toast("Arrastrá los objetos a otra celda"); }
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
  // --- adornos: el selector y el botón de la barra de edición (10/8) ---
  { const bp = $("edit-poner"); if (bp) bp.onclick = () => ponerAdornoElegido(); }
  { const ep2 = $("edit-parcela"); if (ep2) ep2.onclick = () => { const sc = window.farmScene; if (sc && sc.iniciarColocar) sc.iniciarColocar("plot"); }; }   // fix #17
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

  // 10/8: N = mapa, J = misiones de hoy. (M ya estaba tomada por desplegar el menú.)
  // Los EDIFICIOS salieron del menú y de los atajos (Tienda O, Herrería K, Granero B): se
  // entra clickeándolos en la granja, que es lo que les da sentido a estar construidos.
  const KEYS = { i: "ov-inv", x: "ov-skills", p: "ov-equip", l: "ov-lb", c: "ov-config", g: "ov-daily", n: "ov-mapa", j: "ov-misiones" };
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
  setInterval(() => { if (typeof buffTick === "function") buffTick(); if (typeof stamTick === "function") stamTick(); if (typeof incTick === "function") incTick(); if (typeof granjaRegen === "function") granjaRegen(); tutoSync(); refreshHud(); }, 1000);
}
initUI();


/* ================= VENTANAS NUEVAS ("2das mejoras") ================= */

/* ---- Altar de Ofrendas: quemar recursos por puntos ---- */
// RANKING DEL ALTAR (10/8): quién lleva más puntos de ofrenda. Se pide una sola vez por
// apertura y se guarda, para no golpear Supabase en cada refresco de la ventana.
let _ofrRank = null, _ofrRankT = 0;
function ofrendaRankHtml() {
  if (!_ofrRank) return '<div class="fds">Cargando el ranking…</div>';
  if (_ofrRank.error) {
    return '<div class="fds">El ranking de ofrendas todavía no está publicado. Se enciende creando la ' +
      'vista <b>ofrenda_rank</b> en Supabase (está el SQL en <b>sql/ranking_ofrendas.sql</b>).</div>';
  }
  const rows = _ofrRank.rows || [];
  if (!rows.length) return '<div class="fds">Todavía no hay ofrendas de nadie. Podés ser el primero.</div>';
  const total = rows.reduce((s, r) => s + (r.ofrenda_pts || 0), 0) || 1;
  const yo = (typeof UID !== "undefined") ? rows.findIndex(r => r.user_id === UID) : -1;
  let h = rows.slice(0, 10).map((r, i) => {
    const mio = (typeof UID !== "undefined" && r.user_id === UID);
    const parte = ((r.ofrenda_pts || 0) / total * 100).toFixed(1);
    return '<div class="forge-row' + (mio ? ' eq' : '') + '"><div class="finfo"><div class="fnm">' +
      (i + 1) + '. ' + (r.name || "Granjero") + (mio ? ' <span class="tag">vos</span>' : '') + '</div>' +
      '<div class="fds">' + fmt(r.ofrenda_pts || 0) + ' puntos · ' + parte + '% del pozo</div></div></div>';
  }).join("");
  if (yo >= 10) h += '<div class="fds">Tu posición: <b>' + (yo + 1) + '</b> de ' + rows.length + '</div>';
  return h;
}
function refreshOfrendas() {
  const box = $("ofr-list"); if (!box) return;
  // el ranking se refresca como mucho cada 60 s
  if (typeof fetchOfrendaRank === "function" && nowMs() - _ofrRankT > 60000) {
    _ofrRankT = nowMs();
    fetchOfrendaRank().then(r => { _ofrRank = r; if (isOpen("ov-ofrendas")) refreshOfrendas(); });
  }
  let h = '<div class="forge-row"><div class="finfo">' +
    '<div class="fnm">Tus Puntos de Ofrenda: ' + fmt(ofrendaPuntos()) + '</div>' +
    '<div class="fds">Recursos entregados: ' + fmt(G.ofrendaLog || 0) + ' · los puntos no se gastan ni se pierden</div>' +
    '<div class="fds">Pozo de referencia del airdrop: ' + fmt(OFRENDA_POZO) + ' $Golden, repartido proporcionalmente. Es posible y discrecional: no hay un valor garantizado por recurso.</div>' +
    '</div></div>';
  h += '<div class="secc">Quién lleva más</div>' + ofrendaRankHtml();
  OFRENDA_ORDER.forEach(k => {
    const tengo = Math.floor(G.res[k] || 0), pts = ofrendaValor(k);
    if (!pts) return;
    const nombre = (CROP_DEF[k] && CROP_DEF[k].label) || RES_LABEL[k] || k;
    h += '<div class="forge-row"><div class="fic">' + resIc(k) + '</div><div class="finfo">' +
      '<div class="fnm">' + nombre + ' <span class="tag">' + pts + ' pts c/u</span></div>' +
      '<div class="fds">Tenés ' + fmt(tengo) + (tengo ? ' · entregar todo daría ' + fmt(tengo * pts) + ' puntos' : '') + '</div></div>' +
      '<div class="fbtns">' +
        '<input id="ofq-' + k + '" type="number" min="1" max="' + Math.max(1, tengo) + '" value="' + (tengo > 0 ? Math.min(tengo, 10) : 1) + '" style="width:64px">' +
        '<button class="green sm" ' + (tengo > 0 ? "" : "disabled") + ' data-ofr="' + k + '">Ofrendar</button>' +
      '</div></div>';
  });
  box.innerHTML = h;
  box.querySelectorAll("[data-ofr]").forEach(b => b.onclick = () => {
    const k = b.dataset.ofr, inp = $("ofq-" + k), n = Math.max(1, Math.floor(+(inp && inp.value) || 1));
    askConfirm("Vas a QUEMAR " + n + " de " + ((CROP_DEF[k] && CROP_DEF[k].label) || RES_LABEL[k] || k) + " para siempre a cambio de " + fmt(n * ofrendaValor(k)) + " Puntos de Ofrenda. No se puede deshacer. ¿Ofrendar?",
      () => { ofrendar(k, n); refreshOfrendas(); }, { title: "Ofrendar", yes: "Ofrendar", yesClass: "green", no: "Cancelar", noClass: "red" });
  });
}

/* ---- Incursiones: combate de un clic ---- */
function refreshIncursion() {
  const box = $("inc-list"); if (!box) return;
  const inc = incActiva(), cupo = incCupoHoy(), poder = incPoder();
  const sinCupo = !!(INC_CUPO_DIA && cupo.n >= INC_CUPO_DIA);   // el cupo también bloquea el botón (10/8)
  let h = '<div class="info">Tu poder de combate: <b>' + poder + '</b>' + (poder ? '' : ' — necesitás un arma equipada') +
    ' · incursiones de hoy: ' + cupo.n + '/' + (INC_CUPO_DIA || "sin tope") + '</div>';
  if (inc) {
    const z = INCURSIONES[inc.zona], left = incFalta(), pct = Math.round((1 - left / (inc.total || 1)) * 100);
    h += '<div class="forge-row eq"><div class="finfo"><div class="fnm">En incursión: ' + z.label + '</div>' +
      '<div class="durbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="fds">Vuelve en ' + fmtSecs(Math.ceil(left / 1000)) + '</div></div></div>';
  }
  INC_ORDER.forEach(k => {
    const z = INCURSIONES[k];
    const listo = poder >= z.poderRec, flojo = poder < z.poderRec * 0.5;
    const est = z.mobs.map(m => (MONSTER_DEF[m] ? MONSTER_DEF[m].label : m)).join(", ");
    h += '<div class="forge-row' + (flojo ? ' locked' : '') + '"><div class="finfo">' +
      '<div class="fnm">' + z.label + ' <span class="tag">' + fmtSecs(z.min * 60) + '</span></div>' +
      '<div class="fds">' + est + '</div>' +
      '<div class="fds">Poder recomendado: ' + z.poderRec +
        (listo ? ' — <b style="color:#3f6b2a">estás listo</b>'
               : (flojo ? ' — <b style="color:#b03a2e">te van a superar</b>'
                        : ' — vas justo: volverías herido y con menos botín')) + '</div></div>' +
      // el cupo diario también bloquea el botón: antes salía verde y incSalir rebotaba con un
      // toast, aunque la misma ventana mostraba "incursiones de hoy: n/N" (10/8)
      '<div class="fbtns"><button class="green sm" ' + (inc || !poder || sinCupo ? "disabled" : "") + ' data-inc="' + k + '">Salir</button></div></div>';
  });
  h += '<div class="info">Al Dragón de las Cavernas hay que ir a pelearlo en persona: no se puede por incursión.</div>';
  box.innerHTML = h;
  box.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => {
    const k = b.dataset.inc, z = INCURSIONES[k];
    askConfirm("Mandar al granjero a " + z.label + " por " + fmtSecs(z.min * 60) + ". Gasta durabilidad del arma y estamina. ¿Salir?",
      () => { incSalir(k); refreshIncursion(); },
      { title: "Incursión a " + z.label, yes: "Salir", yesClass: "green", no: "Cancelar", noClass: "red" });
  });
}

/* ---- Mercado entre jugadores (P2P) ---- */
let p2pTab = "comprar", p2pCache = null, p2pLoading = false;
async function refreshP2P() {
  const box = $("p2p-list"); if (!box) return;
  document.querySelectorAll("[data-p2p]").forEach(b => {
    b.classList.toggle("active", b.dataset.p2p === p2pTab);
    b.onclick = () => { p2pTab = b.dataset.p2p; p2pCache = null; refreshP2P(); };
  });
  if (p2pLoading) return;
  const tabPedida = p2pTab;   // la pestaña con la que arrancó ESTA carga
  if (!p2pCache) {
    p2pLoading = true; box.innerHTML = '<div class="fds">Cargando…</div>';
    try { p2pCache = (tabPedida === "comprar") ? await mkList() : await mkMine(); }
    catch (e) { p2pCache = []; }
    p2pLoading = false;
    // si mientras cargaba el jugador cambió de pestaña, esto ya no sirve: se recarga con la nueva
    if (p2pTab !== tabPedida) { p2pCache = null; return refreshP2P(); }
  }
  const filas = p2pCache || [];
  let h = "";
  // entregas pendientes (compras/retiros que no entraron en la bolsa): nunca se pierden
  if (typeof mkPendCount === "function" && mkPendCount() > 0) {
    h += '<div class="forge-row eq"><div class="finfo"><div class="fnm">Entregas pendientes (' + mkPendCount() + ')</div>' +
      '<div class="fds">No entraron en la bolsa. Hacé lugar y reclamalas.</div></div>' +
      '<div class="fbtns"><button class="green sm" id="p2p-pend">Reclamar</button></div></div>';
  }
  if (p2pTab === "vender") {
    h += '<div class="fds">Elegí qué publicar. Se descuenta de tu bolsa hasta que se venda o lo retires.</div>';
    const ops = [];
    CROP_ORDER.forEach(k => { if ((G.res[k] || 0) > 0) ops.push(["res", k, G.res[k]]); });
    ["madera","piedra","bronce","hierro","oro","diamante","netherita","fibra","pelaje","cuero","colmillo","esencia_runica"].forEach(k => { if ((G.res[k] || 0) > 0) ops.push(["res", k, G.res[k]]); });
    CROP_ORDER.forEach(k => { if ((G.seeds[k] || 0) > 0) ops.push(["seed", k, G.seeds[k]]); });
    RECIPE_ORDER.forEach(k => { if (((G.dishes || {})[k] || 0) > 0) ops.push(["dish", k, G.dishes[k]]); });
    FISH_ORDER.forEach(k => { if (((G.fish || {})[k] || 0) > 0) ops.push(["fish", k, G.fish[k]]); });
    Object.keys(G.weapons || {}).forEach(k => ops.push(["arm", k, 1]));
    if (!ops.length) h += '<div class="fds">No tenés nada para publicar todavía.</div>';
    ops.forEach(([kind, key, max], i) => {
      const sug = Math.max(1, Math.round((typeof priceOf === "function" ? priceOf(key) : 10) || 10));
      h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + mkNombre(kind, key) + ' <span class="tag">' + MARKET_KINDS[kind] + '</span></div>' +
        '<div class="fds">Tenés ' + fmt(max) + (kind === "arm" ? " · se publica con su durabilidad y sus runas" : "") + '</div></div>' +
        '<div class="fbtns">' +
          (kind === "arm" ? '' : '<input id="p2q-' + i + '" type="number" min="1" max="' + max + '" value="1" style="width:56px">') +
          '<input id="p2p-' + i + '" type="number" min="1" value="' + sug + '" style="width:70px" title="Precio en plata">' +
          '<button class="green sm" data-pub="' + kind + ':' + key + ':' + i + '">Publicar</button>' +
        '</div></div>';
    });
  } else if (p2pTab === "mias") {
    const activas = filas.filter(r => !r.sold_to), vendidas = filas.filter(r => r.sold_to && !r.paid);
    if (vendidas.length) h += '<div class="fnm">Ventas por cobrar</div>';
    vendidas.forEach(r => {
      const neto = Math.max(1, Math.round(r.price * (1 - MARKET_FEE / 100)));
      h += '<div class="forge-row eq"><div class="finfo"><div class="fnm">' + escapeHtml(r.name || r.item) + ' ×' + r.qty + ' — VENDIDO</div>' +
        '<div class="fds">Te quedan ' + fmt(neto) + ' de plata (precio ' + fmt(r.price) + ' − ' + MARKET_FEE + '% de comisión)</div></div>' +
        '<div class="fbtns"><button class="green sm" data-cobrar="' + r.id + '">Cobrar</button></div></div>';
    });
    h += '<div class="secc">Publicaciones activas (' + activas.length + '/' + MARKET_MAX_PUB + ')</div>';
    if (!activas.length) h += '<div class="fds">No tenés nada publicado.</div>';
    activas.forEach(r => {
      h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + escapeHtml(r.name || r.item) + ' ×' + r.qty + '</div>' +
        '<div class="fds">Precio: ' + fmt(r.price) + ' de plata</div></div>' +
        '<div class="fbtns"><button class="sm" data-cancel="' + r.id + '">Retirar</button></div></div>';
    });
  } else {
    if (!filas.length) h += '<div class="fds">No hay publicaciones ahora mismo. Volvé en un rato o publicá algo vos.</div>';
    filas.forEach(r => {
      const mio = r.seller === (typeof UID === "string" ? UID : "");
      h += '<div class="forge-row"><div class="finfo"><div class="fnm">' + escapeHtml(r.name || r.item) + ' ×' + r.qty + ' <span class="tag">' + (MARKET_KINDS[r.kind] || r.kind) + '</span></div>' +
        '<div class="fds">Vende: ' + escapeHtml(r.seller_name || "granjero") + (mio ? " (vos)" : "") + '</div></div>' +
        '<div class="fbtns"><button class="green sm" ' + (mio || G.plata < r.price ? "disabled" : "") + ' data-buy="' + r.id + '">Comprar · ' + fmt(r.price) + '</button></div></div>';
    });
  }
  box.innerHTML = h;
  { const pb = $("p2p-pend"); if (pb) pb.onclick = () => { mkPendCobrar(); refreshP2P(); }; }
  box.querySelectorAll("[data-pub]").forEach(b => b.onclick = async () => {
    const [kind, key, i] = b.dataset.pub.split(":");
    const q = $("p2q-" + i), pr = $("p2p-" + i);
    await marketPublicar(kind, key, kind === "arm" ? 1 : Math.max(1, +(q && q.value) || 1), Math.max(1, +(pr && pr.value) || 1));
    p2pCache = null; refreshP2P();
  });
  box.querySelectorAll("[data-buy]").forEach(b => b.onclick = async () => {
    await marketComprar((p2pCache || []).find(r => String(r.id) === b.dataset.buy));
    p2pCache = null; refreshP2P();
  });
  box.querySelectorAll("[data-cancel]").forEach(b => b.onclick = async () => {
    await marketCancelar((p2pCache || []).find(r => String(r.id) === b.dataset.cancel));
    p2pCache = null; refreshP2P();
  });
  box.querySelectorAll("[data-cobrar]").forEach(b => b.onclick = async () => {
    await marketCobrar((p2pCache || []).find(r => String(r.id) === b.dataset.cobrar));
    p2pCache = null; refreshP2P();
  });
}

/* ---- Cosméticos: elegir qué lucir ---- */
function refreshCosmeticos() {
  const box = $("cos-list"); if (!box) return;
  const c = cosElegido();
  const titulos = cosTitulosDisponibles(), colores = cosColoresDisponibles(), marcos = cosMarcosDisponibles();
  let h = '<div class="forge-row"><div class="finfo"><div class="fnm">Así te ven los demás</div>' +
    '<div class="fds" style="font-size:15px"><span class="nm ' + (c.marco !== "ninguno" ? "marco-" + c.marco : "") + '" style="color:' + colorNombre() + ';font-weight:800">' +
    escapeHtml(nombreLucido(window.NICK)) + '</span></div></div></div>';
  h += '<div class="secc">Título</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    ['<button class="sm ' + (!c.titulo ? "green" : "ghost") + '" data-cost="titulo:">Sin título</button>']
      .concat(titulos.map(t => '<button class="sm ' + (c.titulo === t ? "green" : "ghost") + '" data-cost="titulo:' + t + '">' + t + '</button>')).join(" ") +
    (titulos.length ? "" : ' <span class="fds">Todavía no ganaste ninguno — se consiguen subiendo la granja.</span>') + '</div></div></div>';
  h += '<div class="secc">Color del nombre</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    colores.map(k => '<button class="sm ' + (c.color === k ? "green" : "ghost") + '" data-cost="color:' + k + '" style="color:' + COS_COLORES[k] + '">' + k + '</button>').join(" ") + '</div></div></div>';
  h += '<div class="secc">Marco</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    marcos.map(k => '<button class="sm ' + (c.marco === k ? "green" : "ghost") + '" data-cost="marco:' + k + '">' + (k === "ninguno" ? "Sin marco" : (COS_MARCOS[k] || k)) + '</button>').join(" ") + '</div></div></div>';
  h += '<div class="secc">Aura del granjero</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    (cosAuraDisponible()
      ? '<button class="sm ' + (c.aura ? "green" : "ghost") + '" data-cost="aura:1">Encendida</button> <button class="sm ' + (!c.aura ? "green" : "ghost") + '" data-cost="aura:0">Apagada</button> <span class="fds">Se ve en la Zona Negra y en la plaza.</span>'
      : 'Se desbloquea con los títulos de granja nivel 30 en adelante.') + '</div></div></div>';
  // MASCOTA (10/8): pasea por la granja. No produce nada, es para lucirla.
  const masc = cosMascotasDisponibles();
  h += '<div class="secc">Mascota</div><div class="forge-row">' +
    (COS_MASCOTAS.gallina ? '<div class="fic"><img src="' + GF.spr(COS_MASCOTAS.gallina.sprite) + '" onerror="this.remove()"></div>' : '') +
    '<div class="finfo"><div class="fds">' +
    (masc.length > 1
      ? masc.map(k => '<button class="sm ' + ((c.mascota || "ninguna") === k ? "green" : "ghost") + '" data-cost="mascota:' + k + '">' +
          (k === "ninguna" ? "Ninguna" : COS_MASCOTAS[k].label) + '</button>').join(" ") + ' <span class="fds">Pasea por tu granja.</span>'
      : 'Todavía no tenés ninguna — la gallina "Pinta" sale del cofre de login.') + '</div></div></div>';
  // SKINS (10/8): sombrero del cofre, camino de pétalos y granja legendaria de nivel 50
  const skinBtns = (campo, on) => '<button class="sm ' + (on ? "green" : "ghost") + '" data-cost="' + campo + ':1">Puesto</button> ' +
    '<button class="sm ' + (!on ? "green" : "ghost") + '" data-cost="' + campo + ':0">Guardado</button>';
  h += '<div class="secc">Sombrero</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    (cosSombreroDisponible()
      ? skinBtns("sombrero", c.sombrero) + ' <span class="fds">Paja brillante: lo lleva puesto el granjero.</span>'
      : 'El Sombrero de paja brillante sale del cofre de login.') + '</div></div></div>';
  h += '<div class="secc">Suelo</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    (cosPetalosDisponible()
      ? skinBtns("petalos", c.petalos) + ' <span class="fds">Camino de pétalos: los vas dejando al caminar.</span>'
      : 'El Camino de pétalos sale del cofre de login.') + '</div></div></div>';
  h += '<div class="secc">Granja</div><div class="forge-row"><div class="finfo"><div class="fds">' +
    (cosGranjaOroDisponible()
      ? skinBtns("granjaOro", c.granjaOro) + ' <span class="fds">Legendaria: valla dorada y chispas de oro.</span>'
      : 'La skin de Granja Legendaria llega con el nivel 50.') + '</div></div></div>';
  if ((G.cosmeticos || []).length) {
    h += '<div class="secc">Todo lo que ganaste (' + G.cosmeticos.length + ')</div>';
    h += '<div class="info">' + G.cosmeticos.map(x => escapeHtml(String(x))).join(" · ") + '</div>';
  }
  box.innerHTML = h;
  box.querySelectorAll("[data-cost]").forEach(b => b.onclick = () => {
    const [campo, val] = b.dataset.cost.split(":");
    const esBool = campo === "aura" || campo === "sombrero" || campo === "petalos" || campo === "granjaOro";   // las skins son prendido/apagado
    cosSet(campo, esBool ? val === "1" : val);
    refreshCosmeticos();
  });
}

/* ---- BLINDAJE DE PANELES ----------------------------------------------------
   Si una función de refresco revienta a mitad de camino, la ventana quedaba VACÍA
   y sin botones (ya nos pasó con una tabla de precios inexistente). Acá se envuelven
   todas: el error se ve en la consola, el jugador recibe un aviso y el resto del
   juego sigue funcionando. */
(function blindarPaneles() {
  const paneles = ["refreshInv","refreshSkills","refreshEquip","refreshForge","refreshMarket","refreshBarn",
    "refreshCooking","refreshHorno","refreshAltar","refreshEstablo","refreshCurtiduria","refreshOfrendas",
    "refreshIncursion","refreshP2P","refreshCosmeticos","refreshPass","refreshChest","refreshConfig",
    "refreshLb","refreshDaily","refreshSeedShop","refreshHotbar","refreshStam"];
  paneles.forEach(nombre => {
    const f = window[nombre];
    if (typeof f !== "function" || f.__blindado) return;
    const g = function () {
      try { return f.apply(this, arguments); }
      catch (e) {
        console.error("[panel] " + nombre + " falló:", e);
        if (typeof toast === "function") toast("Ese panel tuvo un problema — avisale al equipo");
        if (typeof log === "function") log("Error en " + nombre + ": " + (e && e.message ? e.message : e), "bad");
      }
    };
    g.__blindado = true;
    window[nombre] = g;
  });
})();
