/* Golden Farm · estado del juego + economía (sin DOM ni canvas) */
window.GF = window.GF || {};
GF.spr = (k) => "assets/farm/" + k + ".png?a=7";   // ?a=N rompe el caché de los íconos (a=7: lombriz oficial PixelLab)

// --- estado principal (con algunos recursos de arranque para probar los menús) ---
const G = {
  plata: 0, golden: 20, level: 1, prestige: 0, week: 1,
  hp: 100, hpMax: 100, swordOwned: false, bowOwned: false, swordWoodOwned: false,   // combate (Fase D)
  armasUnlocked: false,          // viernes (2): la pestana Armas de la Herreria se paga (20 madera + 20 piedra + 1000 plata)
  treesOpen: [0], rocksOpen: [0],  // viernes (2): índices de árboles/piedras desbloqueados (cualquiera, sin orden — pedido Discord)
  gear: { casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false },   // equipo (armas se equipan en el panel de Equipo — detalles jueves)
  res: { madera: 0, piedra: 0, bronce: 0, hierro: 0, oro: 0, diamante: 0, netherita: 0, carne: 0, flecha: 0, lombriz: 0,
    tablon: 0, barra_piedra: 0, barra_bronce: 0, barra_hierro: 0, barra_oro: 0,
    papa: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0 },
  seeds: { papa: 3, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0 },  // viernes (2): la bolsa nace con SOLO 3 semillas de papa
  selSeed: "papa",   // semilla elegida para plantar
  picks: { owned: { stone: true }, dur: { stone: 1 }, eq: "stone" },
  tools: { axe: 1, rod: 1 },   // SFL puro: herramientas de 1 uso
  toolsLost: {},                 // herramientas tiradas a la papelera (31/7: el diseñador pidió que se puedan tirar)
  invRows: 0,                    // filas extra de inventario compradas
  slots: [],                     // inventario por casillas: [{kind,key}|null]
  hotbar: [null, null, null, null, null, null, null, null, null, null],  // 10 accesos directos
  hotSel: 0,                     // hueco de la hotbar seleccionado (herramienta "en mano")
  hbInit: false,                 // si ya se cargaron los accesos directos por defecto
  layout: {},                    // posiciones editadas de objetos de la granja: {index:{cx,by}}
  layoutPlots: {},               // parcelas movidas: {index:{col,row}}
  layoutPond: null,              // laguna movida: {col,row}
  fish: { comun: 0, raro: 0, epico: 0, legendario: 0 },
  plots: [],   // estado de las parcelas: [{state, readyAt, cropKey}] — lo llena la FarmScene
  plotsOwned: 2,   // viernes (2): se nace con 2 parcelas; el resto se desbloquea
  daily: { day: 0, last: "" },   // cofre diario: día de racha reclamado (1..7) y fecha del último reclamo
  seedBuys: { date: "", count: 0 },   // cupo diario de semillas (compras + cofre)
  dishes: {},      // platos cocinados (van a la bolsa; clic para comer)
  cooking: null,   // { id, endAt, total } — barra de enfriamiento al cocinar
  chests: [],      // cofres depósito: [{col,row,items:[{kind,key,n}|null × 10]}] — +1% materiales c/u
  dummyUsedAt: 0,  // último entrenamiento con el dummy (cooldown 4h)
  built: { store: true, horno: false, cocina: false },   // viernes (2): la Herreria es el unico edificio gratis; horno y cocina se construyen
  buffs: [], secPerGameHour: 1, gameHours: 0,
  skills: { fishing: 0, farming: 0, cooking: 0, range: 0, sword: 0, mining: 0, crafting: 0 },
};
window.G = G;

// --- utilidades ---
function fmt(n) { n = Math.floor(n); return n >= 1000 ? (n / 1000).toFixed(n % 1000 < 100 ? 0 : 1).replace(".0", "") + "k" : "" + n; }
function nowMs() { return Date.now(); }
function cdMult() { const t = Date.now(); let m = 1; for (const b of G.buffs) if (b.type === "cd" && b.until > t) m *= b.mult; return m; }
function yieldMult() { const t = Date.now(); let m = 1 + 0.015 * (G.level - 1) + G.prestige * 0.015; for (const b of G.buffs) if (b.type === "yield" && b.until > t) m *= b.mult; return m; }
function addBuff(type, label, mult, durSec) { G.buffs.push({ type, label, mult, until: Date.now() + durSec * 1000 }); }
function hToMs(h) { return h * G.secPerGameHour * 1000 * cdMult(); }

// --- recursos ---
const RES_EMOJI = { madera:"", piedra:"", bronce:"", oro:"", diamante:"", netherita:"", carne:"", flecha:"", lombriz:"",
  papa:"", zanahoria:"", cebolla:"", calabacin:"", repollo:"", calabaza:"", brocoli:"" };
const RES_LABEL = { madera:"Madera", piedra:"Piedra", bronce:"Bronce", hierro:"Hierro", oro:"Oro", diamante:"Diamante", netherita:"Netherita", carne:"Carne", flecha:"Flecha", lombriz:"Lombriz",
  tablon:"Tablón de madera", barra_piedra:"Bloques de piedra", barra_bronce:"Barra de bronce", barra_hierro:"Barra de hierro", barra_oro:"Barra de oro",
  papa:"Papa", zanahoria:"Zanahoria", cebolla:"Cebolla", calabacin:"Calabacín", repollo:"Repollo", calabaza:"Calabaza", brocoli:"Brócoli" };
// íconos cozy de recursos (los cultivos usan crop_<key>)
const RES_SPRITE = { madera:"res_madera", piedra:"res_piedra", bronce:"res_bronce", hierro:"res_hierro", oro:"res_oro", diamante:"res_diamante", netherita:"res_netherita", carne:"res_carne", flecha:"res_flecha", lombriz:"res_lombriz",
  tablon:"res_tablon", barra_piedra:"res_barra_piedra", barra_bronce:"res_barra_bronce", barra_hierro:"res_barra_hierro", barra_oro:"res_barra_oro" };
function resSprite(k) { return CROP_DEF[k] ? "crop_" + k : (RES_SPRITE[k] || null); }

// --- cultivos (semillas compradas en la Tienda; se desbloquean por nivel de Cultivo) ---
const CROP_ORDER = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli"];
// TABLA DE PRECIOS del diseñador (31/7): Ganancia = Tiempo × Riesgo × Nivel. Papa base: compra 1 / venta 3 / 1h.
// growH = horas reales de la tabla. En TESTEO corre comprimido: 1h → 1min (GROW_SCALE). Para pasar a real: GROW_SCALE = 1.
var GROW_SCALE = 1;   // 2/8: FUERA la compresión de testeo — el tiempo que se pone en balance.html es el tiempo real del juego
const CROP_DEF = {
  papa:      { label:"Papa",      emoji:"🥔", lvl:1, seedCost:1,  growH:1,  yield:1, price:3 },
  zanahoria: { label:"Zanahoria", emoji:"🥕", lvl:2, seedCost:3,  growH:2,  yield:1, price:8 },
  cebolla:   { label:"Cebolla",   emoji:"🧅", lvl:3, seedCost:6,  growH:4,  yield:1, price:16 },
  calabacin: { label:"Calabacín", emoji:"🥒", lvl:4, seedCost:12, growH:8,  yield:1, price:32 },
  repollo:   { label:"Repollo",   emoji:"🥬", lvl:5, seedCost:20, growH:12, yield:1, price:50 },
  calabaza:  { label:"Calabaza",  emoji:"🎃", lvl:6, seedCost:40, growH:24, yield:1, price:100 },
  brocoli:   { label:"Brócoli",   emoji:"🥦", lvl:7, seedCost:90, growH:48, yield:1, price:210 },
};
function recomputeCropGrow() { for (const k in CROP_DEF) CROP_DEF[k].grow = Math.round(CROP_DEF[k].growH * 3600 * GROW_SCALE); }
recomputeCropGrow();   // en segundos, como siempre
// --- peces (ítems del inventario) ---
const FISH_ORDER = ["comun", "raro", "epico", "legendario"];
const FISH_DEF = { comun: { label: "Pez común", emoji: "🐟", sprite: "fish_comun" }, raro: { label: "Pez raro", emoji: "🐠", sprite: "fish_raro" }, epico: { label: "Pez épico", emoji: "🐡", sprite: "fish_epico" }, legendario: { label: "Pez legendario", emoji: "🐋", sprite: "fish_legendario" } };

function farmLevel() { return skillInfo(G.skills.farming).lvl; }
function cropUnlocked(k) { const cd = CROP_DEF[k]; return !!cd && farmLevel() >= cd.lvl; }
function selectSeed(k) { if (!CROP_DEF[k]) return; G.selSeed = k; if (isOpen("ov-inv")) refreshInv(); }
// cupo diario de semillas (anti-inflación): compras + las del cofre suman al mismo límite
var SEED_DAILY_MAX = 30;
var CD = { tree: 14, rock: 20 };   // enfriamiento (s) de árbol y piedra — editable en balance.html
function seedBuysToday() {
  const sb = G.seedBuys || (G.seedBuys = { date: "", count: 0 });
  if (sb.date !== dayStamp(0)) { sb.date = dayStamp(0); sb.count = 0; }
  return sb;
}
function buySeed(k, qty) {
  const cd = CROP_DEF[k]; if (!cd) return;
  if (!cropUnlocked(k)) { toast("Necesitás Cultivo nivel " + cd.lvl); return; }
  qty = Math.max(1, Math.floor(qty || 1));
  const sb = seedBuysToday(), left = SEED_DAILY_MAX - sb.count;
  if (left <= 0) { toast("Límite diario de semillas alcanzado (30) — volvé mañana"); return; }
  if (qty > left) { qty = left; toast("Cupo diario: solo podés comprar " + left + " más hoy"); }
  const cost = cd.seedCost * qty;
  if (G.plata < cost) { toast("Te falta plata"); return; }
  G.plata -= cost; G.seeds[k] = (G.seeds[k] || 0) + qty; sb.count += qty;
  log(`Compraste ${qty} semilla(s) de ${cd.label} por ${cost} plata. (cupo: ${sb.count}/${SEED_DAILY_MAX})`); toast("+" + qty + " " + cd.label);
  refreshHud(); if (typeof refreshSeedShop === "function") refreshSeedShop(); if (isOpen("ov-inv")) refreshInv();
}

// --- construcción de edificios (detalles viernes 1): recetas para levantar cada edificio ---
const BUILD_DEF = {
  store:  { label: "Herrería",        cost: {} },   // viernes (2): la Herrería es gratis (ya construida)
  horno:  { label: "Horno de Piedra", cost: { madera: 100, piedra: 100 } },
  cocina: { label: "Cocina",          cost: { madera: 100, papa: 10, zanahoria: 10, cebolla: 10, calabacin: 10, repollo: 10 } },
};
function buildCostStr(key) { const b = BUILD_DEF[key]; return Object.keys(b.cost).map(k => (b.cost[k]) + " " + (RES_LABEL[k] || k)).join(" + "); }

// --- materiales intermedios (detalles213: "tablones / stone bar / iron bar / iron gold" mapeados a nuestros recursos) ---
const MAT_ORDER = ["tablon","barra_piedra","barra_bronce","barra_hierro","barra_oro"];
const MAT_DEF = {
  tablon:       { label:"Tablón de madera", sprite:"res_tablon",       cost:{ madera:3 } },
  barra_piedra: { label:"Bloques de piedra",  sprite:"res_barra_piedra", cost:{ piedra:3 } },
  barra_bronce: { label:"Barra de bronce",  sprite:"res_barra_bronce", cost:{ bronce:3 } },
  barra_hierro: { label:"Barra de hierro",  sprite:"res_barra_hierro", cost:{ hierro:3 } },
  barra_oro:    { label:"Barra de oro",     sprite:"res_barra_oro",    cost:{ oro:3 } },
};
var MAT_CD_MS = 6000;   // detalles viernes: craftear barras tiene enfriamiento
function matCdLeft(id) { G.matCd = G.matCd || {}; return Math.max(0, (G.matCd[id] || 0) - nowMs()); }
function craftMat(id) {
  const md = MAT_DEF[id]; if (!md) return;
  const left = matCdLeft(id);
  if (left > 0) { toast(md.label + " en enfriamiento (" + Math.ceil(left / 1000) + "s)"); return; }
  if (!canAfford(md.cost)) { toast("Te faltan materiales"); return; }
  if (!roomForRes(id, 1)) { bagFull("craftear " + md.label); return; }
  payCost(md.cost); G.res[id] = (G.res[id] || 0) + 1;
  G.matCd[id] = nowMs() + MAT_CD_MS;
  addXp("crafting", 3); log("Fundiste 1 " + md.label + " en el Horno.", "good"); toast("+1 " + md.label);
  if (typeof refreshHorno === "function" && isOpen("ov-horno")) refreshHorno();
  if (isOpen("ov-inv")) refreshInv(); refreshHud();
}

// --- lombrices (detalles213): carnada de pesca, se compran en la Tienda ---
var WORM_PRICE = 3;
function buyWorm(qty) {
  qty = Math.max(1, Math.floor(qty || 1));
  const cost = WORM_PRICE * qty;
  if (G.plata < cost) { toast("Te falta plata"); return; }
  if (!roomForRes("lombriz", qty)) { bagFull("comprar lombrices"); return; }
  G.plata -= cost; G.res.lombriz = (G.res.lombriz || 0) + qty;
  log("Compraste " + qty + " lombriz(ces) por " + cost + " plata.", "good"); toast("+" + qty + " Lombriz");
  refreshHud(); if (typeof refreshSeedShop === "function") refreshSeedShop(); if (isOpen("ov-inv")) refreshInv();
}

// --- skills ---
const SKILL_DEFS = [["farming","","Cultivo"],["fishing","","Pesca"],["mining","","Minería"],
  ["sword","","Espada"],["range","","Arco"],["cooking","","Cocina"],["crafting","","Artesanía"]];
const SKILL_NAME = {}; SKILL_DEFS.forEach(([k,,nm]) => SKILL_NAME[k] = nm);
function skillInfo(xp) { let lvl=1, need=50, acc=0; while (xp >= acc+need && lvl<99){ acc+=need; lvl++; need=Math.round(need*1.35);} return { lvl, into: xp-acc, need }; }
function avgSkillLevel() { let s=0,n=0; for (const k in G.skills){ s+=skillInfo(G.skills[k]).lvl; n++; } return n ? s/n : 1; }
function addXp(sk, amt) {
  if (!(sk in G.skills)) return;
  const before = skillInfo(G.skills[sk]).lvl;
  G.skills[sk] += amt;
  const after = skillInfo(G.skills[sk]).lvl;
  if (after > before) { log(`${SKILL_NAME[sk]} subió a nivel ${after}.`, "good"); toast("" + SKILL_NAME[sk] + " nivel " + after); if (window.sfx) sfx("level"); }
  if (isOpen("ov-skills")) refreshSkills();
}

// --- niveles de granja ---
const LEVELS = { 2:{papa:20,madera:10}, 3:{papa:35,madera:20,piedra:5}, 4:{zanahoria:35,madera:35,piedra:12},
  5:{zanahoria:60,madera:55,piedra:22}, 6:{cebolla:60,madera:80,piedra:36}, 7:{cebolla:100,madera:115,piedra:55},
  8:{calabaza:30,oro:3}, 9:{calabaza:60,oro:6}, 10:{brocoli:50,oro:10} };
function canLevel() { if (G.level >= 10) return false; const n = LEVELS[G.level+1]; for (const k in n) if ((G.res[k]||0) < n[k]) return false; return true; }
function levelUp() { if (!canLevel()) { toast("Te faltan recursos"); return; } const n = LEVELS[G.level+1]; for (const k in n) G.res[k]-=n[k]; G.level++; log(`¡Granja nivel ${G.level}! Yield +${((yieldMult()-1)*100).toFixed(1)}%.`, "gold"); toast("¡Nivel " + G.level + "!"); refreshBarn(); refreshHud(); }
function prestige() { if (G.level < 10) { toast("Llegá a nivel 10"); return; } G.prestige++; G.level=1; for (const k in G.res) G.res[k]=0; log(`Reinicio. Prestigio ${G.prestige}.`, "gold"); toast("Prestigio " + G.prestige + "!"); refreshBarn(); refreshHud(); }

// --- minerales y picos ---
const ORE_ORDER = ["piedra","bronce","oro","diamante","netherita"];
const ORE_DEF = {
  piedra:   { tier:0, label:"Piedra",    emoji:"🪨", sprite:"node_stone",     cd:60,  yield:1, price:6 },
  bronce:   { tier:1, label:"Bronce",    emoji:"🟫", sprite:"node_bronze",    cd:75,  yield:1, price:12 },
  hierro:   { tier:2, label:"Hierro",    emoji:"⛓️", sprite:"node_iron",      cd:80,  yield:1, price:15 },   // viernes (2): lo mina el Pico de Hierro
  oro:      { tier:3, label:"Oro",       emoji:"🟡", sprite:"node_gold",      cd:90,  yield:1, price:30 },
  diamante: { tier:4, label:"Diamante",  emoji:"💎", sprite:"node_diamond",   cd:110, yield:1, price:80 },
  netherita:{ tier:5, label:"Netherita", emoji:"🔶", sprite:"node_netherite", cd:150, yield:1, price:200 },
};
const PICK_ORDER = ["stone","bronze","iron","gold","diamond","netherite"];
const PICK_DEF = {
  // modelo SFL puro (31/7): 1 uso por pico, costos baratos (material del tier anterior + madera + monedas)
  // costos "detalles viernes (2)"; el Pico de Bronce no figura en el doc y se interpola
  stone:    { tier:0, label:"Pico de Piedra",    mineTier:0, dur:1, cost:{madera:3},            plata:10,  sprite:"pick_stone" },
  bronze:   { tier:1, label:"Pico de Bronce",    mineTier:1, dur:1, cost:{madera:4,piedra:5},   plata:10,  sprite:"pick_bronze" },   // confirmado por el diseñador (Discord 31/7)
  iron:     { tier:2, label:"Pico de Hierro",    mineTier:2, dur:1, cost:{madera:3,piedra:5},   plata:10,  sprite:"pick_iron" },
  gold:     { tier:3, label:"Pico de Oro",       mineTier:3, dur:1, cost:{madera:3,bronce:5},   plata:35,  sprite:"pick_gold" },
  diamond:  { tier:4, label:"Pico de Diamante",  mineTier:4, dur:1, cost:{oro:3,madera:3},      plata:45,  sprite:"pick_diamond" },
  netherite:{ tier:5, label:"Pico de Netherita", mineTier:5, dur:1, cost:{diamante:1,madera:5}, plata:100, sprite:"pick_netherite" },
};
function equippedPick() { return (G.picks.eq && G.picks.owned[G.picks.eq]) ? G.picks.eq : null; }
function canAfford(c) { for (const k in c) if ((G.res[k]||0) < c[k]) return false; return true; }
function payCost(c) { for (const k in c) G.res[k]-=c[k]; }
// la fragua se enciende un rato cada vez que trabajás en la Herrería (detalles jueves)
const FORGE_LIT_MS = 8000;
function forgeWork() { G.forgeLitUntil = nowMs() + FORGE_LIT_MS; if (window.FARM && FARM.updateForge) FARM.updateForge(); if (window.sfx) sfx("mine"); }
// picos APILABLES: G.picks.dur[id] es la CANTIDAD (1 uso cada uno); craftear suma al stock
function pickCount(id) { return G.picks.owned[id] ? Math.max(0, Math.floor(G.picks.dur[id] || 0)) : 0; }
function craftPick(id) {
  const pd = PICK_DEF[id];
  if (pickCount(id) >= 99) { toast("Máximo 99 " + pd.label); return; }
  if (!canAfford(pd.cost)) { toast("Te faltan materiales"); return; }
  if (pd.plata && G.plata < pd.plata) { toast("Te falta plata"); return; }
  payCost(pd.cost); if (pd.plata) G.plata -= pd.plata;
  const first = !G.picks.owned[id];
  G.picks.owned[id] = true; G.picks.dur[id] = pickCount(id) + 1;
  if (first || !G.picks.eq) G.picks.eq = id;
  addXp("crafting", 10 + pd.tier * 4);
  log("Crafteaste " + pd.label + " (tenés " + G.picks.dur[id] + ").", "gold"); toast("+1 " + pd.label);
  forgeWork(); refreshForge(); refreshInv(); refreshHud(); syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
}
// modelo SFL (31/7): los picos NO se reparan — se rompen y se craftean de nuevo
function destroyPick(id) {
  delete G.picks.owned[id]; delete G.picks.dur[id];
  if (G.picks.eq === id) G.picks.eq = PICK_ORDER.find(p => G.picks.owned[p]) || null;
  G.hotbar = G.hotbar.map(h => (h && h.kind === "pick" && h.key === id) ? null : h);
  syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
  uiRefreshAfterBreak();   // ídem hacha/caña: refresco inmediato de los paneles abiertos
}
// re-renderiza los paneles que muestran herramientas, si están abiertos (la rotura puede pasar con UI visible)
function uiRefreshAfterBreak() {
  try {
    if (typeof isOpen !== "function") return;
    if (isOpen("ov-inv") && typeof refreshInv === "function") refreshInv();
    if (isOpen("ov-equip") && typeof refreshEquip === "function") refreshEquip();
    if (isOpen("ov-forge") && typeof refreshForge === "function") refreshForge();
  } catch (e) {}
}
function repairCostOf(id) { const pd=PICK_DEF[id]; const c={}; for (const k in pd.cost) c[k]=Math.max(1,Math.ceil(pd.cost[k]*0.3)); return c; }
function repairPick(id) { const pd=PICK_DEF[id]; if (!G.picks.owned[id]) return; if ((G.picks.dur[id]||0)>=pd.dur){ toast("Ya está al 100%"); return; } const c=repairCostOf(id); if (!canAfford(c)){ toast("Te faltan materiales para reparar"); return; } payCost(c); G.picks.dur[id]=pd.dur; log("Reparaste "+pd.label+" (100%).","good"); toast("Reparado"); forgeWork(); refreshForge(); }
function equipPick(id) { if (!G.picks.owned[id]){ toast("No lo tenés"); return; } G.picks.eq=id; log("Equipaste "+PICK_DEF[id].label+".");  toast("Equipado"); refreshForge(); refreshInv(); }

// --- herramientas (hacha + caña con durabilidad; el pico se maneja aparte) ---
const TOOL_DEF = {
  axe:   { label:"Hacha",            emoji:"🪓", sprite:"axe",         max:1, repair:{madera:6} },   // SFL puro: 1 uso = 1 talada
  rod:   { label:"Caña",             emoji:"🎣", sprite:"fishing_rod", max:1, repair:{madera:4} },   // SFL puro: 1 uso = 1 pesca
  sword: { label:"Espada de Hierro", emoji:"⚔️", sprite:"sword",       max:80, repair:{bronce:2} },
  sword_wood: { label:"Espada de Madera", emoji:"🗡️", sprite:"sword_wood", max:40, repair:{madera:2} },   // viernes (2): arma inicial
  bow:   { label:"Arco",             emoji:"🏹", sprite:"bow",         max:60, repair:{madera:5} },
};
// --- espadas (se craftean en la Herrería; viernes 2: SIN arma equipada no se ataca) ---
const SWORD_COST = { bronce: 12 };   // 100% metal (feedback del diseñador: nada de madera)
const SWORD_WOOD_COST = { madera: 5 };
function craftSwordWood() {
  if (G.swordWoodOwned) { toast("Ya tenés la Espada de Madera"); return; }
  if (!canAfford(SWORD_WOOD_COST)) { toast("Te faltan materiales"); return; }
  payCost(SWORD_WOOD_COST); G.swordWoodOwned = true; G.tools.sword_wood = TOOL_DEF.sword_wood.max;
  if (!G.gear.arma) G.gear.arma = "sword_wood";
  addXp("crafting", 8);
  log("Crafteaste la Espada de Madera.", "gold"); toast("¡Espada de Madera!"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
function craftSword() {
  if (G.swordOwned) { toast("Ya tenés la espada"); return; }
  if (!canAfford(SWORD_COST)) { toast("Te faltan materiales"); return; }
  payCost(SWORD_COST); G.swordOwned = true; G.tools.sword = TOOL_DEF.sword.max;
  if (!G.gear.arma) G.gear.arma = "sword";   // si el slot de arma está libre, se equipa sola
  addXp("crafting", 14);
  log("Crafteaste la Espada de Hierro.", "gold"); toast("¡Espada de Hierro!"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
// daño del jugador — viernes (2): SOLO con arma equipada (sin arma no hay ataque, devuelve 0)
var DMG_SWORD_BASE = 8, DMG_SWORD_WOOD_BASE = 4, DMG_BOW_BASE = 6;   // bases editables desde balance.html
function swordDmg() {
  const lvl = skillInfo(G.skills.sword).lvl;
  if (G.gear.arma === "sword" && toolDur("sword") > 0) return DMG_SWORD_BASE + Math.floor(lvl / 2);        // solo si está EQUIPADA
  if (G.gear.arma === "sword_wood" && toolDur("sword_wood") > 0) return DMG_SWORD_WOOD_BASE + Math.floor(lvl / 2);
  return 0;
}

// --- arco y flechas (combate a distancia; usa la skill Arco) ---
const BOW_COST = { madera: 12, bronce: 2 };
const ARROW_COST = { madera: 2, piedra: 1 };   // craftea 10 flechas
function craftBow() {
  if (G.bowOwned) { toast("Ya tenés el arco"); return; }
  if (!canAfford(BOW_COST)) { toast("Te faltan materiales"); return; }
  payCost(BOW_COST); G.bowOwned = true; G.tools.bow = TOOL_DEF.bow.max;
  if (!G.gear.arma) G.gear.arma = "bow";   // si el slot de arma está libre, se equipa solo
  addXp("crafting", 12);
  log("Crafteaste el Arco.", "gold"); toast("¡Arco!"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
function craftArrows() {
  if (!canAfford(ARROW_COST)) { toast("Te faltan materiales"); return; }
  payCost(ARROW_COST); G.res.flecha = (G.res.flecha || 0) + 10;   // van a la bolsa, NO se autoequipan (detalles jueves)
  addXp("crafting", 3);
  log("Crafteaste 10 flechas — están en tu bolsa; equipalas en el panel de Equipo.", "good"); toast("+10 flechas en la bolsa"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
function bowDmg() { return DMG_BOW_BASE + Math.floor(skillInfo(G.skills.range).lvl / 2); }
// viernes (2): la pestaña Armas de la Herrería se desbloquea pagando
const ARMAS_UNLOCK_COST = { madera: 20, piedra: 20 }; var ARMAS_UNLOCK_PLATA = 1000;
function unlockArmas() {
  if (G.armasUnlocked) return;
  if (!canAfford(ARMAS_UNLOCK_COST)) { toast("Te faltan materiales"); return; }
  if (G.plata < ARMAS_UNLOCK_PLATA) { toast("Te falta plata"); return; }
  payCost(ARMAS_UNLOCK_COST); G.plata -= ARMAS_UNLOCK_PLATA; G.armasUnlocked = true;
  log("Desbloqueaste la pestaña Armas de la Herrería.", "gold"); toast("¡Armas desbloqueadas!");
  refreshForge(); refreshHud(); if (typeof saveFarm === "function") saveFarm();
}
// viernes (2): desbloqueo progresivo de árboles y piedras (3/9/27/81/100) — se paga por CANTIDAD ya abierta, el orden es libre
const NODE_UNLOCK_COSTS = [3, 9, 27, 81, 100];
function treeUnlockCost() { return NODE_UNLOCK_COSTS[Math.min(NODE_UNLOCK_COSTS.length - 1, Math.max(0, (G.treesOpen || [0]).length - 1))]; }
function rockUnlockCost() { return NODE_UNLOCK_COSTS[Math.min(NODE_UNLOCK_COSTS.length - 1, Math.max(0, (G.rocksOpen || [0]).length - 1))]; }
function canShoot() { return G.gear.arma === "bow" && toolDur("bow") > 0 && G.gear.municion && (G.res.flecha || 0) > 0; }   // arco Y flechas equipados

// --- armaduras (dropean de los monstruos del Bosque; reducen el daño recibido) ---
const GEAR_DEF = {
  botas_cuero:    { slot:"botas",    label:"Botas de Cuero",    emoji:"🥾", def:1, sprite:"gear_botas_cuero" },
  casco_cuero:    { slot:"casco",    label:"Casco de Cuero",    emoji:"🪖", def:1, sprite:"gear_casco_cuero" },
  pechera_cuero:  { slot:"armadura", label:"Pechera de Cuero",  emoji:"🥋", def:2, sprite:"gear_pechera_cuero" },
  escudo_madera:  { slot:"escudo",   label:"Escudo de Madera",  emoji:"🛡️", def:1, sprite:"gear_escudo_madera" },
  casco_hierro:   { slot:"casco",    label:"Casco de Hierro",   emoji:"⛑️", def:2, sprite:"gear_casco_hierro" },
  escudo_hierro:  { slot:"escudo",   label:"Escudo de Hierro",  emoji:"🛡️", def:2, sprite:"gear_escudo_hierro" },
  pechera_hierro: { slot:"armadura", label:"Pechera de Hierro", emoji:"🛡️", def:3, sprite:"gear_pechera_hierro" },
};
function gearDefTotal() { let d = 0; for (const s in G.gear) { const g = G.gear[s]; if (g && GEAR_DEF[g]) d += GEAR_DEF[g].def; } return d; }
// al lootear una pieza: se equipa si mejora el slot; si no, se vende sola
function gainGear(key) {
  const gd = GEAR_DEF[key]; if (!gd) return;
  const cur = G.gear[gd.slot];
  if (!cur || GEAR_DEF[cur].def < gd.def) {
    G.gear[gd.slot] = key;
    log("Equipaste " + gd.label + " (defensa +" + gd.def + ").", "gold"); toast("" + gd.label + " equipado");
  } else {
    const v = 5 + gd.def * 5; G.plata += v;
    log(gd.label + " repetido — vendido por " + v + " plata.", "good"); toast("+" + v + " (" + gd.label + ")");
  }
  if (isOpen("ov-equip")) refreshEquip(); refreshHud();
}

// --- cocina (en la Granja: platos que curan y dan buffs; usa carne/pescado) ---
const RECIPE_ORDER = ["pescado_asado", "estofado", "banquete"];
const RECIPE_DEF = {
  pescado_asado: { label:"Pescado asado", emoji:"🐟", sprite:"dish_pescado_asado", fish:{comun:1}, res:{madera:1},
    heal:30, buff:{type:"yield",label:"Cosecha +10%",mult:1.10,dur:90}, xp:8,
    desc:"Cura 30 · Cosecha +10% (1 min 30 s)" },
  estofado: { label:"Estofado de carne", emoji:"🍲", sprite:"dish_estofado", res:{carne:2, papa:1, madera:1},
    heal:60, buff:{type:"cd",label:"Enfriamientos -15%",mult:0.85,dur:90}, xp:12,
    desc:"Cura 60 · Enfriamientos -15% (1 min 30 s)" },
  banquete: { label:"Banquete del granjero", emoji:"🍗", sprite:"dish_banquete", fish:{raro:1}, res:{carne:2, calabaza:1, madera:1},
    heal:9999, buff:{type:"yield",label:"Cosecha +20%",mult:1.20,dur:180}, xp:25,
    desc:"Cura TODA la vida · Cosecha +20% (3 min)" },
};
function canCook(id) {
  const r = RECIPE_DEF[id]; if (!r) return false;
  if (r.res) for (const k in r.res) if ((G.res[k] || 0) < r.res[k]) return false;
  if (r.fish) for (const k in r.fish) if ((G.fish[k] || 0) < r.fish[k]) return false;
  return true;
}
const COOK_MS = 8000;   // tiempo de cocción (barra de enfriamiento, detalless.docx)
function cook(id) {
  const r = RECIPE_DEF[id]; if (!r) return;
  if (G.cooking) { toast("Ya hay algo en el fuego…"); return; }
  if (!canCook(id)) { toast("Te faltan ingredientes"); return; }
  if (!roomForDish(id)) { bagFull("cocinar " + r.label); return; }
  if (r.res) for (const k in r.res) G.res[k] -= r.res[k];
  if (r.fish) for (const k in r.fish) G.fish[k] -= r.fish[k];
  G.cooking = { id, endAt: nowMs() + COOK_MS, total: COOK_MS };
  log("Cocinando " + r.label + "…"); toast("Cocinando…");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
}
// se llama cada segundo desde el HUD: cuando termina la cocción, el plato va a la bolsa
function checkCooking() {
  if (!G.cooking) return;
  if (nowMs() < G.cooking.endAt) { if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking(); return; }
  const r = RECIPE_DEF[G.cooking.id];
  if (r) {
    G.dishes = G.dishes || {};
    G.dishes[G.cooking.id] = (G.dishes[G.cooking.id] || 0) + 1;
    addXp("cooking", r.xp);
    log(r.emoji + " ¡" + r.label + " listo! Lo tenés en la bolsa.", "gold"); toast(r.emoji + " ¡Listo! Está en tu bolsa");
  }
  G.cooking = null;
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
  if (typeof saveFarm === "function") saveFarm();
}
// comer un plato de la bolsa (clic sobre el ítem)
function eatDish(id) {
  const r = RECIPE_DEF[id]; if (!r || !G.dishes || (G.dishes[id] || 0) <= 0) return;
  G.dishes[id]--;
  if (window.sfx) sfx("eat");
  G.hp = Math.min(G.hpMax, G.hp + r.heal);
  if (r.buff) addBuff(r.buff.type, r.buff.label, r.buff.mult, r.buff.dur);
  log(r.emoji + " Comiste " + r.label + ". " + r.desc, "gold"); toast(r.emoji + " ¡Ñam!");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// --- cofres depósito (detalles 29/7): 10 espacios, +1% de materiales por cofre, máx 50 ---
const CHEST_COST = { madera: 20, piedra: 10 };
const CHEST_PLATA = 200;
const CHEST_MAX = 50;
const CHEST_SLOTS = 10;
function chestBonus() { return 1 + 0.01 * ((G.chests || []).filter(c => c.col != null).length); }   // el bonus lo dan los cofres COLOCADOS
function chestsInBag() { return (G.chests || []).filter(c => c.col == null).length; }
function craftChest() {
  G.chests = G.chests || [];
  if (G.chests.length >= CHEST_MAX) { toast("Máximo de cofres (" + CHEST_MAX + ")"); return; }
  if (!canAfford(CHEST_COST)) { toast("Te faltan materiales"); return; }
  if (G.plata < CHEST_PLATA) { toast("Te falta plata (" + CHEST_PLATA + " )"); return; }
  payCost(CHEST_COST); G.plata -= CHEST_PLATA;
  G.chests.push({ col: null, row: null, items: Array(CHEST_SLOTS).fill(null) });   // queda EN LA BOLSA hasta que lo coloques
  addXp("crafting", 8);
  log("Crafteaste un cofre depósito — está en tu bolsa. Colocalo con un clic desde la bolsa.", "gold");
  toast("Cofre en la bolsa (" + G.chests.length + "/" + CHEST_MAX + ")"); forgeWork();
  refreshForge(); refreshHud();
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm(true);
}
// guardar una pila de la bolsa en el cofre (apila hasta 99 por espacio)
function chestDeposit(ci, kind, key) {
  const ch = G.chests && G.chests[ci]; if (!ch) return;
  const stores = { res: G.res, seed: G.seeds, fish: G.fish, dish: G.dishes };
  const st = stores[kind]; if (!st) { toast("Eso no se puede guardar"); return; }
  const avail = Math.floor(st[key] || 0); if (avail <= 0) return;
  let slot = ch.items.find(s => s && s.kind === kind && s.key === key && s.n < 99);
  if (!slot) { const i = ch.items.indexOf(null); if (i < 0) { toast("Cofre lleno"); return; } slot = ch.items[i] = { kind, key, n: 0 }; }
  const n = Math.min(avail, 99 - slot.n);
  slot.n += n; st[key] -= n;
  if (typeof syncSlots === "function") syncSlots();
  if (typeof refreshChest === "function") refreshChest();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm();
}
// sacar un espacio del cofre de vuelta a la bolsa
function chestWithdraw(ci, si) {
  const ch = G.chests && G.chests[ci]; if (!ch) return;
  const s = ch.items[si]; if (!s) return;
  const stores = { res: G.res, seed: G.seeds, fish: G.fish, dish: G.dishes };
  const st = stores[s.kind]; if (!st) return;
  const before = st[s.key] || 0;
  st[s.key] = before + s.n;
  if (canonicalStacks().length > invSlots()) { st[s.key] = before; toast("Bolsa llena"); return; }
  ch.items[si] = null;
  if (typeof syncSlots === "function") syncSlots();
  if (typeof refreshChest === "function") refreshChest();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm();
}

// --- dummy de práctica (detalless.docx): entrenar espada, cooldown 4 horas ---
var DUMMY_CD_MS = 4 * 3600 * 1000;
var DUMMY_XP = 30;
function fmtDur(ms) { return fmtSecs(ms / 1000); }   // 2/8: formato de tiempo ESTÁNDAR en todo el juego (delega en fmtSecs)
// 2/8: duración en formato humano desde SEGUNDOS ("9 min", "1 h 30 min", "45 s") — para la Tienda y tooltips
function fmtSecs(seg) {
  seg = Math.round(seg);
  if (seg < 60) return seg + " s";
  const d = Math.floor(seg / 86400), h = Math.floor(seg % 86400 / 3600), m = Math.floor(seg % 3600 / 60), sx = seg % 60;
  const p = [];
  if (d) p.push(d + " d"); if (h) p.push(h + " h"); if (m) p.push(m + " min"); if (sx && !d && !h) p.push(sx + " s");
  return p.join(" ");
}

// --- bestiario (Fase D) — 6 tiers, de común a legendario ---
const MONSTER_ORDER = ["rata", "larva", "orco", "lancero", "guerrero", "troll"];
const MONSTER_DEF = {
  rata:     { label:"Rata",           emoji:"🐀", sprite:"rata", size:30, hp:15,  dmg:2,  xp:6,  spd:55, loot:{ carne:[1,1,0.55], plata:[2,6,0.85] } },
  larva:    { label:"Larva Venenosa", emoji:"🐛", sprite:"larva", size:38, hp:25,  dmg:4,  xp:10, spd:35, loot:{ carne:[1,2,0.50], plata:[4,10,0.80], flecha:[1,3,0.35] }, gearLoot:[["botas_cuero",0.08]] },
  orco:     { label:"Orco",           emoji:"👹", sprite:"orc", size:52, hp:45,  dmg:7,  xp:16, spd:60, loot:{ carne:[1,2,0.55], plata:[8,16,0.85], bronce:[1,2,0.35] }, gearLoot:[["casco_cuero",0.10],["escudo_madera",0.08]] },
  lancero:  { label:"Orco Lancero",   emoji:"🔱", sprite:"lancero", size:58, hp:70,  dmg:10, xp:24, spd:70, loot:{ carne:[2,3,0.60], plata:[12,24,0.90], bronce:[1,3,0.40], flecha:[2,6,0.45] }, gearLoot:[["pechera_cuero",0.10]] },
  guerrero: { label:"Orco Guerrero",  emoji:"👺", sprite:"guerrero", size:70, hp:110, dmg:14, xp:36, spd:65, loot:{ carne:[2,4,0.60], plata:[20,40,0.90], oro:[1,2,0.30] }, gearLoot:[["casco_hierro",0.10],["escudo_hierro",0.06]] },
  troll:    { label:"Troll",          emoji:"🧌", sprite:"troll", size:74, hp:180, dmg:20, xp:60, spd:45, loot:{ carne:[3,5,0.65], plata:[40,80,0.95], oro:[1,3,0.45], diamante:[1,1,0.12] }, gearLoot:[["pechera_hierro",0.15]] },
};
// combate (detalles 338): auto-ataque cada 2s, alcance del arco 4 celdas
const ATTACK_MS = 2000;
const MELEE_RANGE = GF.TILE * 1.35;
const BOW_RANGE = GF.TILE * 4;
function rollLoot(def) {
  const out = {};
  for (const k in def.loot) {
    const e = def.loot[k], a = e[0], b = e[1], chance = (e.length > 2 ? e[2] : 1);
    if (Math.random() >= chance) continue;   // no siempre cae lo mismo (detalles 338)
    const n = a + Math.floor(Math.random() * (b - a + 1));
    if (n > 0) out[k] = n;
  }
  return out;
}
// modelo SFL APILABLE (31/7): G.tools[axe/rod] es la CANTIDAD de herramientas (1 uso cada una).
// Craftear suma al stock; usar consume 1. La espada y el arco conservan durabilidad + reparación.
function toolCount(id) { return Math.max(0, Math.floor((G.tools && G.tools[id]) || 0)); }
function toolLost(id) { return toolCount(id) <= 0; }
function toolDur(id) {
  if (id === "axe" || id === "rod") return toolCount(id);   // apilables: el chequeo es tener stock
  return (G.tools && G.tools[id] != null) ? G.tools[id] : (TOOL_DEF[id] ? TOOL_DEF[id].max : 0);
}
function useTool(id) {
  const d = toolDur(id); if (d <= 0) return false;
  G.tools[id] = d - 1;
  if ((id === "axe" || id === "rod") && G.tools[id] <= 0) {
    G.hotbar = G.hotbar.map(h => (h && h.kind === "tool" && h.key === id) ? null : h);
    syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
    uiRefreshAfterBreak();   // 31/7: que el ícono desaparezca AL INSTANTE también en bolsa/equipo/herrería abiertas
  }
  return true;
}
// craftear herramientas consumibles — costos estilo SFL, apilan hasta 99
const TOOL_CRAFT = { axe: { cost:{}, plata:10 }, rod: { cost:{ madera:3, piedra:1, oro:15 }, plata:0 } };   // viernes (2): hacha 10 plata; caña 3 madera + 1 piedra + 15 ORO (recurso)
function craftTool(id) {
  const tc = TOOL_CRAFT[id], td = TOOL_DEF[id]; if (!tc || !td) return;
  if (toolCount(id) >= 99) { toast("Máximo 99 " + td.label); return; }
  if (!canAfford(tc.cost)) { toast("Te faltan materiales"); return; }
  if (G.plata < tc.plata) { toast("Te falta plata"); return; }
  payCost(tc.cost); G.plata -= tc.plata;
  G.tools[id] = toolCount(id) + 1;
  addXp("crafting", 5); log("Crafteaste " + td.label + " (tenés " + G.tools[id] + ").", "good"); toast("+1 " + td.label);
  forgeWork(); refreshForge(); if (isOpen("ov-inv")) refreshInv(); refreshHud(); syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
}
function repairTool(id) { const td = TOOL_DEF[id]; if (!td) return; if (toolLost(id)) { toast("No tenés esa herramienta — la tiraste"); return; } if (toolDur(id) >= td.max) { toast("Ya está al 100%"); return; } if (!canAfford(td.repair)) { toast("Te faltan materiales para reparar"); return; } payCost(td.repair); G.tools[id] = td.max; log("Reparaste " + td.label + " (100%).", "good"); toast("Reparado"); forgeWork(); refreshForge(); if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-inv")) refreshInv(); }

// --- inventario (base + filas extra) ---
const INV_BASE = 20, INV_MAX_ROWS = 6;   // 20 base (4 filas de 5, pedido del diseñador 30/7), ampliable +5 por fila hasta 50
function invSlots() { return INV_BASE + (G.invRows || 0) * 5; }
function nextInvCost() {
  const r = G.invRows || 0;
  if (r >= INV_MAX_ROWS) return null;
  return { type: "plata", cost: 1000 * Math.pow(2, r) };   // 1000, 2000, 4000, 8000, 16000 (sumidero anti-inflación)
}
function expandInv() {
  const nc = nextInvCost();
  if (!nc) { toast("Bolsa al máximo"); return; }
  if (nc.type === "res") { if (!canAfford(nc.cost)) { toast("Te faltan minerales"); return; } payCost(nc.cost); }
  else { if (G.plata < nc.cost) { toast("Te falta plata"); return; } G.plata -= nc.cost; }
  G.invRows = (G.invRows || 0) + 1;
  log("Ampliaste la bolsa (+5 espacios).", "good"); toast("+5 espacios");
  refreshInv(); refreshHud();
}
/* ¿hay sitio en la bolsa para lo que va a soltar la acción?
   Se comprueba ANTES de empezar (si no, gastás la animación para nada). */
function roomForRes(key, n) {
  const before = G.res[key] || 0;
  G.res[key] = before + (n || 1);
  const ok = canonicalStacks().length <= invSlots();
  G.res[key] = before;
  return ok;
}
function roomForFish() {   // la rareza es al azar: tiene que entrar CUALQUIERA de las cuatro
  return FISH_ORDER.every(f => {
    const before = (G.fish && G.fish[f]) || 0;
    G.fish[f] = before + 1;
    const ok = canonicalStacks().length <= invSlots();
    G.fish[f] = before;
    return ok;
  });
}
function roomForDish(id) {
  const before = (G.dishes && G.dishes[id]) || 0;
  G.dishes[id] = before + 1;
  const ok = canonicalStacks().length <= invSlots();
  if (before) G.dishes[id] = before; else delete G.dishes[id];
  return ok;
}
function bagFull(what) { toast("Bolsa llena — no podés " + what); log("No tenés espacio en la bolsa: liberá un hueco para " + what + ".", "bad"); }

function invStacks() {
  const st = [];
  st.push({ sprite:"axe", em:"", nm:"Hacha ("+toolDur("axe")+"/"+TOOL_DEF.axe.max+")" });
  { const eqp = equippedPick();
    if (eqp) st.push({ sprite:PICK_DEF[eqp].sprite, em:"", nm:PICK_DEF[eqp].label+" ("+(G.picks.dur[eqp]||0)+"/"+PICK_DEF[eqp].dur+")" });
    else st.push({ sprite:"pick_stone", em:"", nm:"Sin pico" }); }
  st.push({ sprite:"fishing_rod", em:"", nm:"Caña ("+toolDur("rod")+"/"+TOOL_DEF.rod.max+")" });
  for (const r of ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","madera","piedra","bronce","oro","diamante","netherita"]) {
    let n = Math.floor(G.res[r] || 0);
    while (n > 0) { const c = Math.min(99, n); st.push({ sprite:resSprite(r), em:RES_EMOJI[r], nm:RES_LABEL[r], count:c }); n -= 99; }
  }
  return st;
}
function tryAddRes(key, amt) {
  const b = G.res[key] || 0; G.res[key] = b + amt;
  if (canonicalStacks().length > invSlots()) { G.res[key] = b; return false; }
  syncSlots();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshHotbar === "function") refreshHotbar();
  return true;
}

// --- casillas: todo es ítem (recursos/semillas apilan 99; herramientas/picos 1 c/u con durabilidad) ---
const ITEM_RES_ORDER = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","madera","piedra","bronce","hierro","oro","diamante","netherita","carne","flecha","lombriz","tablon","barra_piedra","barra_bronce","barra_hierro","barra_oro"];
function descKey(d) { return d ? d.kind + ":" + d.key : ""; }
function canonicalStacks() {
  const list = [];
  ["axe", "rod"].forEach(k => { let n = toolCount(k); while (n > 0) { list.push({ kind: "tool", key: k }); n -= 99; } });   // apilables ×99
  if (G.swordOwned) list.push({ kind: "tool", key: "sword" });
  if (G.swordWoodOwned) list.push({ kind: "tool", key: "sword_wood" });
  if (G.bowOwned) list.push({ kind: "tool", key: "bow" });
  PICK_ORDER.forEach(id => { let n = pickCount(id); while (n > 0) { list.push({ kind: "pick", key: id }); n -= 99; } });   // picos apilables ×99
  ITEM_RES_ORDER.forEach(r => { let n = Math.floor(G.res[r] || 0); while (n > 0) { list.push({ kind: "res", key: r }); n -= 99; } });
  CROP_ORDER.forEach(s => { let n = Math.floor(G.seeds[s] || 0); while (n > 0) { list.push({ kind: "seed", key: s }); n -= 99; } });
  FISH_ORDER.forEach(f => { let n = Math.floor((G.fish && G.fish[f]) || 0); while (n > 0) { list.push({ kind: "fish", key: f }); n -= 99; } });
  RECIPE_ORDER.forEach(d => { let n = Math.floor((G.dishes && G.dishes[d]) || 0); while (n > 0) { list.push({ kind: "dish", key: d }); n -= 99; } });
  { let n = chestsInBag(); while (n > 0) { list.push({ kind: "chest", key: "cofre" }); n -= 99; } }   // cofres sin colocar
  return list;
}
// reconcilia G.slots con lo que hay realmente, preservando el orden que armó el jugador
function syncSlots() {
  const cap = invSlots();
  if (!Array.isArray(G.slots)) G.slots = [];
  while (G.slots.length < cap) G.slots.push(null);
  if (G.slots.length > cap) { const extra = G.slots.splice(cap); extra.filter(Boolean).forEach(d => { const i = G.slots.indexOf(null); if (i >= 0) G.slots[i] = d; }); }
  const want = {}; canonicalStacks().forEach(d => { const k = descKey(d); want[k] = (want[k] || 0) + 1; });
  const have = {}; G.slots.forEach(d => { if (d) { const k = descKey(d); have[k] = (have[k] || 0) + 1; } });
  for (const k in have) { let surplus = have[k] - (want[k] || 0); for (let i = G.slots.length - 1; i >= 0 && surplus > 0; i--) { if (G.slots[i] && descKey(G.slots[i]) === k) { G.slots[i] = null; surplus--; } } }
  for (const k in want) {
    let cur = 0; G.slots.forEach(d => { if (d && descKey(d) === k) cur++; });
    const ix = k.indexOf(":"), kind = k.slice(0, ix), key = k.slice(ix + 1);
    for (let j = cur; j < want[k]; j++) { const i = G.slots.indexOf(null); if (i < 0) break; G.slots[i] = { kind, key }; }
  }
}
// herramienta "en mano" según el hueco seleccionado de la hotbar
function activeTool() {
  const d = G.hotbar[G.hotSel];
  if (!d) return null;
  if (d.kind === "tool") return d.key;   // "axe" | "rod"
  if (d.kind === "pick") return "pick";
  if (d.kind === "seed") return "seed";
  return null;                            // recurso u otro
}
// la primera vez, precarga la hotbar con las herramientas básicas
function ensureHotbarDefaults() {
  if (G.hbInit) return;
  if (!Array.isArray(G.hotbar)) G.hotbar = [];
  while (G.hotbar.length < 10) G.hotbar.push(null);
  if (!G.hotbar.some(Boolean)) {
    G.hotbar[0] = { kind: "tool", key: "axe" };
    G.hotbar[1] = { kind: "pick", key: (G.picks && G.picks.eq) || "stone" };
    G.hotbar[2] = { kind: "tool", key: "rod" };
    G.hotbar[3] = { kind: "seed", key: G.selSeed || "papa" };
  }
  G.hbInit = true;
}

// --- mercado ---
const PRICE = { madera:3, piedra:6, bronce:12, hierro:15, oro:30, diamante:80, netherita:200, carne:8, flecha:2 };
// 1/8: los CULTIVOS venden según CROP_DEF.price (la tabla que edita balance.html) — PRICE quedó solo para lo demás.
//      Antes el mercado usaba una copia vieja acá y los cambios del panel no se veían (bug reportado por el diseñador).
function priceOf(res) { return CROP_DEF[res] ? CROP_DEF[res].price : (PRICE[res] || 0); }
// detalles viernes (1): los minerales, madera y flechas NO se venden — solo cultivos y lo farmeado en la Zona Negra (carne)
const SELLABLE = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli"];   // viernes (2): la carne no se vende
let marketCur = "plata";
function marketUnit(res) { return marketCur === "plata" ? priceOf(res) : priceOf(res)/10; }
function sellItem(res) {
  const inp = $("mq-"+res); let q = Math.floor(parseFloat(inp && inp.value) || 0);
  q = Math.max(0, Math.min(q, G.res[res]));
  if (q <= 0) { toast("Poné una cantidad"); return; }
  if (marketCur === "plata") { const t=q*priceOf(res); G.plata+=t; G.res[res]-=q; log(`Vendiste ${q} ${RES_LABEL[res]} por ${t} de plata.`); toast("+"+t+" plata"); }
  else { const g=Math.floor(q*priceOf(res)/10); if (g<1){ toast("Muy poca cantidad para $Golden"); return; } G.res[res]-=q; G.golden+=g; log(`Vendiste ${q} ${RES_LABEL[res]} por ${g} $Golden.`,"gold"); toast("+"+g+" $Golden"); }
  if (window.sfx) sfx("coin");
  refreshMarket(); refreshHud();
}

// --- pesca ---
const FISH_COST = 5;
function goFishing() {
  if (toolDur("rod") <= 0) { toast("No tenés caña — craftéala en la Herrería"); return; }
  if ((G.res.lombriz || 0) < 1) { toast("Necesitás lombrices — compralas en la Tienda"); return; }
  G.res.lombriz -= 1; useTool("rod");   // detalles viernes: pescar cuesta SOLO 1 lombriz (sin esencia)
  if (toolDur("rod") <= 0) { log("¡La caña se rompió en pedazos! Crafteá otra en la Herrería.", "bad"); toast("¡Caña rota!"); }
  const r = Math.random();
  let rar; if (r < 0.60) rar = "comun"; else if (r < 0.85) rar = "raro"; else if (r < 0.97) rar = "epico"; else rar = "legendario";
  G.fish[rar]++; addXp("fishing", 8); addXp("cooking", 3);
  if (rar === "comun") { const p = 8 + Math.floor(Math.random() * 8); G.plata += p; log(`Pez común: +${p} plata.`); toast("+" + p + " "); }
  else if (rar === "raro") { addBuff("yield", "Yield +10%", 1.10, 90); log("Pez raro: buff Yield +10% (90s).", "good"); toast("¡Buff de yield!"); }
  else if (rar === "epico") { addBuff("cd", "Cooldowns -25%", 0.75, 90); log("Pez épico: cooldowns -25% (90s).", "good"); toast("¡Cooldowns -25%!"); }
  else { G.golden += 15; tryAddRes("oro", 1); log("¡Legendario! +15 y +1 Oro.", "gold"); toast("¡LEGENDARIO!"); }
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// --- parcelas bloqueadas: costo de desbloquear la siguiente (200, 400, 800, ... plata) ---
var PLOT_UNLOCK_BASE = 200;
function plotUnlockCost() { return PLOT_UNLOCK_BASE * Math.pow(2, Math.max(0, (G.plotsOwned || 6) - 6)); }

// --- cofre diario de login (racha de 7 días · anti-inflación: 80% insumos / 20% plata) ---
const DAILY_REWARDS = [
  { seeds: { papa: 2 },      res: { madera: 5 },   label: "×2 Semilla Papa · ×5 Madera" },
  { seeds: { zanahoria: 3 }, res: { piedra: 10 },  label: "×3 Semilla Zanahoria · ×10 Piedra" },
  { seeds: { cebolla: 2 },   res: { piedra: 10 },  label: "×2 Semilla Cebolla · ×10 Piedra" },
  { seeds: { calabacin: 2 }, plata: 20,            label: "×2 Semilla Calabacín · 20 Plata" },
  { seeds: { repollo: 2 },   res: { bronce: 5 },   label: "×2 Semilla Repollo · ×5 Bronce" },
  { res: { oro: 1 },         plata: 30,            label: "×1 Oro · 30 Plata" },
  { seeds: { calabaza: 2 },  plata: 50, buff: true, label: "×2 Semilla Calabaza · 50 Plata · Abono (+15% cosecha 10 min)" },
];
function dayStamp(off) { const d = new Date(Date.now() + (off || 0) * 86400000); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
// estado del cofre: ¿se puede reclamar hoy? ¿qué día de la racha toca? ¿se perdió la racha?
function dailyState() {
  const dd = G.daily || (G.daily = { day: 0, last: "" });
  if (dd.last === dayStamp(0)) return { claimable: false, day: dd.day, lost: false };
  const keeps = dd.last === dayStamp(-1) && dd.day >= 1 && dd.day < 7;   // ayer reclamó y no terminó la semana
  // "racha perdida" solo si había racha a medias (completar los 7 días reinicia sin penalidad)
  const lost = !!dd.last && !keeps && dd.day > 0 && dd.day < 7;
  return { claimable: true, day: keeps ? dd.day + 1 : 1, lost };
}
// recuperar la racha perdida pagando esencia (cuenta como si hubieras reclamado ayer)
const STREAK_RECOVER_COST = 50;
function recoverStreak() {
  const st = dailyState();
  if (!st.lost) { toast("No hay racha para recuperar"); return; }
  if (G.golden < STREAK_RECOVER_COST) { toast("Necesitás " + STREAK_RECOVER_COST + " para recuperar la racha"); return; }
  G.golden -= STREAK_RECOVER_COST;
  G.daily.last = dayStamp(-1);
  log("Recuperaste la racha del cofre por " + STREAK_RECOVER_COST + " esencia.", "gold"); toast("¡Racha recuperada!");
  refreshHud(); if (typeof refreshDaily === "function") refreshDaily();
  if (typeof saveFarm === "function") saveFarm(true);
}
function claimDaily() {
  const st = dailyState();
  if (!st.claimable) { toast("Ya reclamaste hoy — volvé mañana"); return; }
  const r = DAILY_REWARDS[st.day - 1];
  if (r.seeds) { const sb = seedBuysToday(); for (const k in r.seeds) { G.seeds[k] = (G.seeds[k] || 0) + r.seeds[k]; sb.count += r.seeds[k]; } }
  if (r.res) for (const k in r.res) G.res[k] = (G.res[k] || 0) + r.res[k];
  if (r.plata) G.plata += r.plata;
  if (r.buff) addBuff("yield", "Abono +15%", 1.15, 600);
  G.daily = { day: st.day, last: dayStamp(0) };
  log("Cofre diario " + st.day + "/7: " + r.label, "gold");
  toast("¡Reclamado! Día " + st.day + "/7");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshDaily === "function") refreshDaily();
  if (typeof saveFarm === "function") saveFarm(true);
}
