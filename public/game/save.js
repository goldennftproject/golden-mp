/* Golden Farm · persistencia por cuenta (login anónimo de Supabase) */
const SB_URL = "https://eusxpsmqczmczgyhndtd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3hwc21xY3ptY3pneWhuZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzU2OTMsImV4cCI6MjEwMDc1MTY5M30.ko-XxFFjf_YnBsnBvrSCOsMLTQ285G51r-UPLYZIDJ8";

let sb = null, UID = null, saveTimer = null, lastSavedKey = null;

async function initSave() {
  try {
    if (!window.supabase || !window.supabase.createClient) return false;
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) { console.warn("Login anónimo falló (¿está habilitado en Supabase?):", error.message); return false; }
      session = data.session;
    }
    UID = session.user.id;
    return true;
  } catch (e) { console.warn("initSave error:", e); return false; }
}

// campos de progreso que guardamos (no world/cooldowns/buffs, que son de la sesión)
function snapshot() {
  return { plata: G.plata, golden: G.golden, level: G.level, prestige: G.prestige, week: G.week,
    res: G.res, picks: G.picks, skills: G.skills, fish: G.fish, plots: G.plots, seeds: G.seeds, selSeed: G.selSeed,
    tools: G.tools, toolsLost: G.toolsLost, sflStock: true, invRows: G.invRows, slots: G.slots, hotbar: G.hotbar, hotSel: G.hotSel, hbInit: G.hbInit, layout: G.layout,
    daily: G.daily, plotsOwned: G.plotsOwned, seedBuys: G.seedBuys, built: G.built,
    hp: G.hp, hpMax: G.hpMax, combatXp: G.combatXp, stam: G.stam, stamAcc: G.stamAcc, stamRec: G.stamRec, pass: G.pass, tuto: G.tuto, firstSeeds: G.firstSeeds,
    stats: G.stats, statsBase: G.statsBase, chestCap: G.chestCap, edif2: G.edif2, cosmeticos: G.cosmeticos, animals: G.animals, armor: G.armor, armorEq: G.armorEq, ofrendaPts: G.ofrendaPts, ofrendaLog: G.ofrendaLog, nodoUsos: G.nodoUsos, cosEq: G.cosEq, incursion: G.incursion, incDia: G.incDia, dummyTrain: G.dummyTrain, swordOwned: G.swordOwned, bowOwned: G.bowOwned, swordWoodOwned: G.swordWoodOwned, gear: G.gear,
    armasUnlocked: G.armasUnlocked, treesOpen: G.treesOpen, rocksOpen: G.rocksOpen, firstCropDone: G.firstCropDone, weapons: G.weapons,
    dishes: G.dishes, cooking: G.cooking, chests: G.chests, dummyUsedAt: G.dummyUsedAt,
    armCd: G.armCd, mkPend: G.mkPend, testeoDado: G.testeoDado,
    layoutPlots: G.layoutPlots, layoutPond: G.layoutPond };
}
// "huella" del estado guardable (incluye el apodo); si no cambia, no hay nada que guardar
function snapKey() { return JSON.stringify({ n: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), d: snapshot() }); }

function hydrate(d) {
  if (!d) return;
  ["plata", "golden", "level", "prestige", "week"].forEach(k => { if (typeof d[k] === "number") G[k] = d[k]; });
  if (d.res) G.res = Object.assign({}, G.res, d.res);
  if (d.skills) G.skills = Object.assign({}, G.skills, d.skills);
  if (d.fish) G.fish = Object.assign({}, G.fish, d.fish);
  if (Array.isArray(d.plots)) G.plots = d.plots;
  if (d.seeds) G.seeds = Object.assign({}, G.seeds, d.seeds);
  if (d.selSeed && CROP_DEF[d.selSeed]) G.selSeed = d.selSeed;
  if (d.tools) G.tools = Object.assign({}, G.tools, d.tools);
  if (d.toolsLost) G.toolsLost = d.toolsLost;   // legado (pre-apilables)
  // edificios construibles (viernes 1): las partidas viejas ya los tienen construidos
  const BUILT0 = { store: true, horno: false, cocina: false, altar: false, establo: false, curtiduria: false, ofrendas: false };
  if (d.built) G.built = Object.assign({}, BUILT0, d.built);
  else G.built = Object.assign({}, BUILT0, { horno: true, cocina: true });
  G.built.store = true;   // viernes (2): la Herrería es gratis, siempre está
  if (typeof d.invRows === "number") G.invRows = Math.max(0, Math.min(INV_MAX_ROWS, d.invRows));
  if (Array.isArray(d.slots)) G.slots = d.slots;
  if (Array.isArray(d.hotbar)) G.hotbar = d.hotbar.slice(0, 10);
  // la azada se retiró del juego (pedido del diseñador 31/7): se limpia de hotbar y bolsa guardadas
  G.hotbar = (G.hotbar || []).map(h => (h && h.kind === "tool" && h.key === "hoe") ? null : h);
  if (Array.isArray(G.slots)) G.slots = G.slots.map(sl => (sl && sl.kind === "tool" && sl.key === "hoe") ? null : sl);
  if (typeof d.hotSel === "number") G.hotSel = Math.max(0, Math.min(9, d.hotSel));
  if (typeof d.hbInit === "boolean") G.hbInit = d.hbInit;
  if (d.layout && typeof d.layout === "object") G.layout = d.layout;
  if (d.daily && typeof d.daily === "object") G.daily = { day: d.daily.day || 0, last: d.daily.last || "" };
  if (typeof d.plotsOwned === "number") G.plotsOwned = Math.max(2, Math.min(12, d.plotsOwned));   // viernes (2): se arranca con 2
  if (d.seedBuys && typeof d.seedBuys === "object") G.seedBuys = { date: d.seedBuys.date || "", count: d.seedBuys.count || 0 };
  if (typeof d.hpMax === "number") G.hpMax = d.hpMax;
  G.combatXp = (typeof d.combatXp === "number") ? d.combatXp : 0;
  G.stats = (d.stats && typeof d.stats === "object") ? d.stats : {};
  G.statsBase = (d.statsBase && typeof d.statsBase === "object") ? d.statsBase : {};
  G.chestCap = Number(d.chestCap) || 0;
  G.edif2 = (d.edif2 && typeof d.edif2 === "object") ? d.edif2 : {};
  G.cosmeticos = Array.isArray(d.cosmeticos) ? d.cosmeticos : [];
  G.animals = (d.animals && typeof d.animals === "object") ? d.animals : {};
  G.armor = (d.armor && typeof d.armor === "object") ? d.armor : {};
  G.armorEq = d.armorEq || null;
  G.ofrendaPts = Number(d.ofrendaPts) || 0;
  G.ofrendaLog = Number(d.ofrendaLog) || 0;
  G.nodoUsos = (d.nodoUsos && typeof d.nodoUsos === "object") ? d.nodoUsos : {};
  G.cosEq = (d.cosEq && typeof d.cosEq === "object") ? d.cosEq : null;
  G.incursion = (d.incursion && d.incursion.endAt) ? d.incursion : null;
  G.incDia = (d.incDia && typeof d.incDia === "object") ? d.incDia : null;
  G.dummyTrain = (d.dummyTrain && d.dummyTrain.desde) ? d.dummyTrain : null;
  G.stam = (typeof d.stam === "number") ? d.stam : null;   // null = arranca llena
  G.stamAcc = (typeof d.stamAcc === "number") ? d.stamAcc : 0;
  G.stamRec = (d.stamRec && typeof d.stamRec === "object") ? d.stamRec : null;
  G.pass = (d.pass && typeof d.pass === "object") ? d.pass : null;
  if (d.tuto && typeof d.tuto === "object") G.tuto = d.tuto;
  else G.tuto = { step: 0, n: 0, done: !!(d.firstCropDone || (d.level && d.level > 1) || (d.plata && d.plata > 50)) };   // veteranos: sin tutorial
  if (typeof tutoMigrar === "function") tutoMigrar();   // cadena nueva: recalcula el paso si el guardado es viejo
  if (typeof tutoSync === "function") tutoSync(true);   // el cartel y la flecha se rehacen con el paso ya cargado
  if (typeof applyCombatHp === "function") applyCombatHp();   // vida máxima = 100 + hitos de Combate
  if (typeof d.hp === "number") G.hp = Math.max(1, Math.min(G.hpMax, d.hp));
  if (typeof d.swordOwned === "boolean") G.swordOwned = d.swordOwned;
  if (typeof d.bowOwned === "boolean") G.bowOwned = d.bowOwned;
  G.swordWoodOwned = d.swordWoodOwned === true;
  // ARMAS NUEVAS (doc 2/8) + migración de las viejas: madera→espada_madera, "de Hierro"(bronce)→espada_bronce, arco→arco_madera
  G.weapons = (d.weapons && typeof d.weapons === "object") ? d.weapons : {};
  if (!d.weapons) {
    if (d.swordWoodOwned) G.weapons.espada_madera = { dur: 40 };
    if (d.swordOwned) G.weapons.espada_bronce = { dur: 60 };
    if (d.bowOwned) G.weapons.arco_madera = { dur: 40 };
  }
  // (la migración del ARMA EQUIPADA va más abajo, DESPUÉS de cargar d.gear — si se hace acá
  //  opera sobre el gear por defecto y el jugador queda sin arma equipada para siempre)
  // limpiar armas viejas de hotbar/slots guardados
  const armaVieja = h => h && h.kind === "tool" && (h.key === "sword" || h.key === "sword_wood" || h.key === "bow");
  G.hotbar = (G.hotbar || []).map(h => armaVieja(h) ? null : h);
  if (Array.isArray(G.slots)) G.slots = G.slots.map(sl => armaVieja(sl) ? null : sl);
  G.firstCropDone = d.firstCropDone !== false;   // legado
  G.firstSeeds = (typeof d.firstSeeds === "number") ? d.firstSeeds
    : (d.firstCropDone === false ? FIRST_GROW_N : 0);   // veteranos: 0 (ya no les toca el arranque rápido)
  G.armasUnlocked = d.armasUnlocked === true;   // viernes (2): la pestaña Armas se paga (también para veteranos)
  // viernes (2): sets de árboles/piedras abiertos; compat con el guardado por contador de la primera versión
  G.treesOpen = Array.isArray(d.treesOpen) ? d.treesOpen.filter(n => typeof n === "number") : (typeof d.treesOwned === "number" ? Array.from({length: Math.max(1, Math.min(6, d.treesOwned))}, (_, i) => i) : [0]);
  G.rocksOpen = Array.isArray(d.rocksOpen) ? d.rocksOpen.filter(n => typeof n === "number") : (typeof d.rocksOwned === "number" ? Array.from({length: Math.max(1, Math.min(6, d.rocksOwned))}, (_, i) => i) : [0]);
  if (!G.treesOpen.length) G.treesOpen = [0]; if (!G.rocksOpen.length) G.rocksOpen = [0];
  if (d.gear && typeof d.gear === "object") G.gear = Object.assign({ casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false }, d.gear);
  // migración (detalles jueves): partidas viejas sin slot de arma/munición conservan su comportamiento
  const og = d.gear || {};
  if (!("arma" in og)) G.gear.arma = d.swordOwned ? "espada_bronce" : (d.bowOwned ? "arco_madera" : null);   // ids NUEVOS
  if (!("municion" in og)) G.gear.municion = ((d.res && d.res.flecha) || 0) > 0;
  // migración del arma equipada + validación (acá sí, con el gear guardado ya cargado)
  const mapArma = { sword_wood: "espada_madera", sword: "espada_bronce", bow: "arco_madera" };
  if (mapArma[G.gear.arma]) G.gear.arma = mapArma[G.gear.arma];
  if (G.gear.arma && !(typeof ARM_DEF !== "undefined" && ARM_DEF[G.gear.arma] && G.weapons[G.gear.arma])) G.gear.arma = null;
  if (d.dishes && typeof d.dishes === "object") G.dishes = Object.assign({}, d.dishes);
  // la Cocina pasó a tener varias ollas: los guardados viejos traían un solo objeto
  if (Array.isArray(d.cooking)) G.cooking = d.cooking.filter(c => c && c.endAt);
  else if (d.cooking && typeof d.cooking === "object" && d.cooking.endAt) G.cooking = [d.cooking];
  else G.cooking = [];
  if (Array.isArray(d.chests)) G.chests = d.chests.slice(0, 50).map(c => ({ col: (typeof c.col === "number" ? c.col : null), row: (typeof c.row === "number" ? c.row : null), items: (Array.isArray(c.items) ? c.items.slice(0, 10) : Array(10).fill(null)) }));
  if (typeof d.dummyUsedAt === "number") G.dummyUsedAt = d.dummyUsedAt;
  if (d.armCd && typeof d.armCd === "object") G.armCd = d.armCd;   // el enfriamiento de forja ya no se saltea con F5
  G.mkPend = Array.isArray(d.mkPend) ? d.mkPend : [];               // entregas pendientes del Mercado
  G.testeoDado = d.testeoDado === true;                             // el regalo del modo testeo se da una sola vez
  if (d.layoutPlots && typeof d.layoutPlots === "object") G.layoutPlots = d.layoutPlots;
  if (d.layoutPond && typeof d.layoutPond === "object") G.layoutPond = { col: d.layoutPond.col, row: d.layoutPond.row };
  if (d.picks && d.picks.owned && d.picks.dur) G.picks = d.picks;
  // migración ÚNICA al modelo apilable (31/7): la durabilidad vieja pasa a ser "1 herramienta"
  if (!d.sflStock) {
    for (const k of ["axe", "rod"]) if ((G.tools[k] || 0) > 0) G.tools[k] = 1;
    for (const k in G.picks.dur) if ((G.picks.dur[k] || 0) > 0) G.picks.dur[k] = 1;
    if (d.toolsLost) for (const k in d.toolsLost) if (d.toolsLost[k]) G.tools[k] = 0;
  }
}

const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));

async function loadFarm() {
  if (!sb || !UID) return false;
  // hasta 3 intentos con espera creciente: la red del jugador puede parpadear justo al entrar
  for (let intento = 0; intento < 3; intento++) {
    try {
      const { data, error } = await sb.from("farms").select("data,name").eq("user_id", UID).maybeSingle();
      if (error) { console.warn("loadFarm:", error.message); await sleepMs(1200 * (intento + 1)); continue; }
      if (data) {
        if (data.data) hydrate(data.data);
        if (data.name && !window.NICK) window.NICK = data.name;  // si no tipeaste apodo, usá el guardado
        lastSavedKey = snapKey();   // referencia: lo que acabás de cargar ya está guardado
        return true;
      }
      // primera vez: crear la fila
      await saveFarm();
      return false;
    } catch (e) { console.warn("loadFarm error:", e); await sleepMs(1200 * (intento + 1)); }
  }
  return false;
}

// force=true guarda siempre; sin force, solo si el progreso cambió desde el último guardado
async function saveFarm(force) {
  if (!sb || !UID) return;
  const key = snapKey();
  if (!force && key === lastSavedKey) return;   // nada que guardar: ni siquiera muestra el indicador
  if (typeof showSaving === "function") showSaving();
  // hasta 2 intentos inmediatos; si fallan, lastSavedKey no se actualiza y el autosave reintenta al próximo ciclo
  for (let intento = 0; intento < 2; intento++) {
    try {
      const { error } = await sb.from("farms").upsert({ user_id: UID, name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), data: snapshot(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      lastSavedKey = key;   // recién ahora quedó persistido
      if (typeof showSaved === "function") showSaved();
      return;
    } catch (e) { if (intento === 0) await sleepMs(1500); else console.warn("saveFarm sin conexión (reintenta solo):", e && e.message); }
  }
}

// ---- ranking real (lee la vista pública "leaderboard") ----
async function fetchLeaderboard() {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("leaderboard")
      .select("user_id,name,plata,skills,level,prestige")
      .limit(200);
    if (error) { console.warn("leaderboard:", error.message); return null; }
    return data || [];
  } catch (e) { console.warn("leaderboard err:", e); return null; }
}

// ---- chat global (Supabase Realtime broadcast) ----
let chatChannel = null;
function initChat(onMsg) {
  if (!sb || chatChannel) return;
  chatChannel = sb.channel("global-chat", { config: { broadcast: { self: true } } });
  chatChannel.on("broadcast", { event: "msg" }, ({ payload }) => { try { onMsg(payload); } catch (e) {} });
  chatChannel.subscribe();
}
function sendChat(text) {
  if (!chatChannel || !text) return;
  chatChannel.send({ type: "broadcast", event: "msg", payload: { name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")), color: (typeof colorNombre === "function" ? colorNombre() : null), text: String(text).slice(0, 140), t: Date.now() } });
}

function startAutosave() {
  if (saveTimer) return;
  saveTimer = setInterval(() => { saveFarm(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveFarm(); });
  window.addEventListener("beforeunload", () => { saveFarm(); });
}

// arranca la sesión en segundo plano; main.js espera esta promesa
window.SAVE_READY = initSave();

// ================= MERCADO P2P ("detallitos (1)" punto 8) =================
// Tabla `market` en Supabase. El anon-key solo permite lo justo (ver policies en sql/market.sql):
// publicar lo tuyo, comprar publicaciones libres (update condicional = atómico) y cobrar tus ventas.
async function mkList(filtro) {
  if (!sb) return [];
  try {
    let q = sb.from("market").select("*").is("sold_to", null).order("created_at", { ascending: false }).limit(60);
    if (filtro && filtro.kind) q = q.eq("kind", filtro.kind);
    const { data, error } = await q;
    if (error) { console.warn("market list:", error.message); return []; }
    return data || [];
  } catch (e) { console.warn("market list err:", e); return []; }
}
async function mkMine() {
  if (!sb || !UID) return [];
  try {
    const { data, error } = await sb.from("market").select("*").eq("seller", UID).order("created_at", { ascending: false }).limit(60);
    if (error) { console.warn("market mine:", error.message); return []; }
    return data || [];
  } catch (e) { return []; }
}
async function mkPublish(row) {
  if (!sb || !UID) { toast("Necesitás conexión para publicar"); return null; }
  try {
    const { data, error } = await sb.from("market").insert(Object.assign({ seller: UID, seller_name: (typeof nombreLucido === "function" ? nombreLucido() : (window.NICK || "Granjero")) }, row)).select().single();
    if (error) { console.warn("market publish:", error.message); toast("No se pudo publicar"); return null; }
    return data;
  } catch (e) { toast("No se pudo publicar"); return null; }
}
// compra ATÓMICA: solo pega si la fila sigue libre (sold_to null)
async function mkBuy(id) {
  if (!sb || !UID) { toast("Necesitás conexión para comprar"); return null; }
  try {
    const { data, error } = await sb.from("market").update({ sold_to: UID, sold_at: new Date().toISOString() })
      .eq("id", id).is("sold_to", null).select();
    if (error) { console.warn("market buy:", error.message); return null; }
    return (data && data[0]) || null;   // null = alguien lo compró primero
  } catch (e) { return null; }
}
// retiro ATÓMICO: solo devuelve true si REALMENTE borró la fila.
// Antes bastaba con que no hubiera error: un DELETE que no matchea nada no da error, así que
// el doble clic (o retirar algo ya vendido) devolvía el ítem a la bolsa una y otra vez.
async function mkCancel(id) {
  if (!sb || !UID) return false;
  try {
    const { data, error } = await sb.from("market").delete().eq("id", id).eq("seller", UID).is("sold_to", null).select();
    if (error) { console.warn("market cancel:", error.message); return false; }
    return !!(data && data.length === 1);
  } catch (e) { return false; }
}
// cobro ATÓMICO: solo pega si la venta existe, es tuya, está vendida y NO estaba cobrada
async function mkCollect(id) {
  if (!sb || !UID) return false;
  try {
    const { data, error } = await sb.from("market").update({ paid: true })
      .eq("id", id).eq("seller", UID).eq("paid", false).not("sold_to", "is", null).select();
    if (error) { console.warn("market collect:", error.message); return false; }
    return !!(data && data.length === 1);
  } catch (e) { return false; }
}
