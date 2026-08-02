/* Golden Farm · estado del juego + economía (sin DOM ni canvas) */
window.GF = window.GF || {};
GF.spr = (k) => "assets/farm/" + k + ".png?a=7";   // ?a=N rompe el caché de los íconos (a=7: lombriz oficial PixelLab)

// --- estado principal (con algunos recursos de arranque para probar los menús) ---
const G = {
  plata: 0, golden: 20, level: 1, prestige: 0, week: 1,
  hp: 100, hpMax: 100, swordOwned: false, bowOwned: false, swordWoodOwned: false, firstCropDone: false,   // combate (Fase D)
  armasUnlocked: false,          // viernes (2): la pestana Armas de la Herreria se paga (20 madera + 20 piedra + 1000 plata)
  treesOpen: [0], rocksOpen: [0],  // viernes (2): índices de árboles/piedras desbloqueados (cualquiera, sin orden — pedido Discord)
  gear: { casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false },
  weapons: {},                   // doc 2/8: armas nuevas — id ("espada_madera") -> { dur }
  combatXp: 0,                   // doc 2/8: barra de Combate GLOBAL — suma la XP de todos los kills
  armCd: {},                     // enfriamiento de crafteo por arma   // equipo (armas se equipan en el panel de Equipo — detalles jueves)
  res: { madera: 0, piedra: 0, bronce: 0, hierro: 0, oro: 0, diamante: 0, netherita: 0, carne: 0, flecha: 0, lombriz: 0,
    tablon: 0, barra_piedra: 0, barra_bronce: 0, barra_hierro: 0, barra_oro: 0,
    papa: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0 },
  seeds: { papa: 3, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0 },  // viernes (2): la bolsa nace con SOLO 3 semillas de papa
  selSeed: "papa",   // semilla elegida para plantar
  picks: { owned: { stone: true }, dur: { stone: 15 }, eq: "stone" },   // doc 2/8: set de arranque con usos generosos
  tools: { axe: 15, rod: 15 },   // doc 2/8: 15 usos de arranque; después se craftean de a 1 uso
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
  skills: { fishing: 0, farming: 0, cooking: 0, range: 0, sword: 0, hacha: 0, mazo: 0, mining: 0, crafting: 0 },   // doc 2/8: cada arma es su propia skill (espada=sword, arco=range)
};
window.G = G;

// --- utilidades ---
function fmt(n) { n = Math.floor(n); return n >= 1000 ? (n / 1000).toFixed(n % 1000 < 100 ? 0 : 1).replace(".0", "") + "k" : "" + n; }
function nowMs() { return Date.now(); }
function cdMult() { const t = Date.now(); let m = 1; for (const b of G.buffs) if (b.type === "cd" && b.until > t) m *= b.mult; return m; }
function yieldMult() { const t = Date.now(); let m = 1 + 0.015 * (G.level - 1) + G.prestige * 0.015; for (const b of G.buffs) if (b.type === "yield" && b.until > t) m *= b.mult; return m; }
function addBuff(type, label, mult, durSec) { G.buffs.push({ type, label, mult, until: Date.now() + durSec * 1000 }); }
// buffs de comida (doc maestro 2/8): suma de valores activos por tipo
function buffTotal(type) { const t = Date.now(); let s = 0; for (const b of G.buffs) if (b.type === type && b.until > t) s += b.mult; return s; }
function dmgMult() { return 1 + (buffTotal("dmg") + buffTotal("feast")) / 100; }
function dmgTakenMult() { return Math.max(0.2, 1 - (buffTotal("def") + buffTotal("feast")) / 100); }
function speedMult() { return 1 + (buffTotal("speed") + buffTotal("feast")) / 100; }
function farmSpeedMult() { return Math.max(0.4, 1 - buffTotal("farm") / 100); }   // acorta las acciones de cultivo
function luckMult() { return 1 + buffTotal("luck") / 100; }
function combatXpMult() { return 1 + buffTotal("combatxp") / 100; }
function buffTick() {   // 1 vez por segundo desde el HUD: regeneración y vida máxima temporal
  const t = Date.now(); let dirty = false;
  for (const b of G.buffs) {
    if (b.type === "regen" && b.until > t && G.hp < G.hpMax) { G.hp = Math.min(G.hpMax, G.hp + b.mult); dirty = true; }
    if (b.type === "hpmax") {
      if (b.until > t && !b.on) { b.on = true; G.hpMax += b.mult; G.hp = Math.min(G.hpMax, G.hp + b.mult); dirty = true; }
      if (b.until <= t && b.on) { b.on = false; G.hpMax -= b.mult; G.hp = Math.min(G.hp, G.hpMax); dirty = true; }
    }
  }
  G.buffs = G.buffs.filter(b => b.until > t || b.on);
  if (dirty) { const el = document.getElementById("s-hp"); if (el) el.textContent = Math.ceil(G.hp) + "/" + G.hpMax; }
}
function hToMs(h) { return h * G.secPerGameHour * 1000 * cdMult(); }

// --- recursos ---
const RES_EMOJI = { madera:"", piedra:"", bronce:"", oro:"", diamante:"", netherita:"", carne:"", flecha:"", lombriz:"",
  trigo:"🌾", maiz:"🌽", girasol:"🌻",
  papa:"", zanahoria:"", cebolla:"", calabacin:"", repollo:"", calabaza:"", brocoli:"" };
const RES_LABEL = { madera:"Madera", piedra:"Piedra", bronce:"Bronce", hierro:"Hierro", oro:"Oro", diamante:"Diamante", netherita:"Netherita", carne:"Carne", flecha:"Flecha", lombriz:"Lombriz",
  trigo:"Trigo", maiz:"Maíz", girasol:"Girasol",
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
  papa:      { label:"Papa",      emoji:"🥔", lvl:1, seedCost:1,  growH:1,  yield:1, price:3, xp:2 },
  zanahoria: { label:"Zanahoria", emoji:"🥕", lvl:2, seedCost:3,  growH:2,  yield:1, price:8, xp:3 },
  cebolla:   { label:"Cebolla",   emoji:"🧅", lvl:3, seedCost:6,  growH:4,  yield:1, price:16, xp:7 },
  calabacin: { label:"Calabacín", emoji:"🥒", lvl:4, seedCost:12, growH:8,  yield:1, price:32, xp:10 },
  repollo:   { label:"Repollo",   emoji:"🥬", lvl:5, seedCost:20, growH:12, yield:1, price:50, xp:20 },
  calabaza:  { label:"Calabaza",  emoji:"🎃", lvl:6, seedCost:40, growH:24, yield:1, price:100, xp:40 },
  brocoli:   { label:"Brócoli",   emoji:"🥦", lvl:7, seedCost:90, growH:48, yield:1, price:210, xp:80 },
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
  horno:  { label: "Horno de Piedra", cost: { madera: 10, piedra: 8 },  lvl: 3 },   // doc 2/8: costo early + granja nv 3
  cocina: { label: "Cocina",          cost: { madera: 20, piedra: 15 }, lvl: 5 },   // doc 2/8: costo early + granja nv 5
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
  ["sword","","Espada"],["hacha","","Hacha (combate)"],["mazo","","Mazo"],["range","","Arco"],["cooking","","Cocina"],["crafting","","Artesanía"]];
const SKILL_NAME = {}; SKILL_DEFS.forEach(([k,,nm]) => SKILL_NAME[k] = nm);
var XP_BASE = 100, XP_EXP = 2.7;   // doc maestro 2/8: curva 1-150 anclada (nivel 40 = 360 h); editables en balance.html
function skillNeed(lvl) { return Math.round(XP_BASE * Math.pow(lvl, XP_EXP)); }
function skillInfo(xp) { let lvl = 1, acc = 0, need = skillNeed(1); while (xp >= acc + need && lvl < 150) { acc += need; lvl++; need = skillNeed(lvl); } return { lvl, into: xp - acc, need }; }
// --- Barra de Combate GLOBAL (doc maestro 2/8): un solo nivel que suma la XP de TODOS los kills.
//     Convive con las skills por arma (esas siguen dando el +Nivel/2 al daño). Misma curva 1-150.
var COMBAT_HP5 = 20, COMBAT_HP10 = 40;   // vida máxima extra en los hitos (editables en el panel)
function combatInfo() { return skillInfo(G.combatXp || 0); }
function combatHpBonus(lvl) { return (lvl >= 5 ? COMBAT_HP5 : 0) + (lvl >= 10 ? COMBAT_HP10 : 0); }
function applyCombatHp() {   // vida máxima = 100 + hitos de Combate (nivel 5 y 10)
  const want = 100 + combatHpBonus(combatInfo().lvl) + G.buffs.reduce((s, b) => s + (b.type === "hpmax" && b.on ? b.mult : 0), 0);
  if (G.hpMax !== want) { const dif = want - G.hpMax; G.hpMax = want; if (dif > 0) G.hp = Math.min(G.hpMax, G.hp + dif); G.hp = Math.min(G.hpMax, G.hp); }
}
function addCombatXp(xp) {
  xp = Math.round(xp * combatXpMult());   // Guiso Campestre: +% XP de combate
  const before = combatInfo().lvl;
  G.combatXp = (G.combatXp || 0) + xp;
  const after = combatInfo().lvl;
  if (after > before) {
    applyCombatHp();
    const salto = after - before;   // un Trol puede subir varios niveles: UN solo cartel (doc)
    const hito = after === 5 || after % 10 === 0;
    const vida = combatHpBonus(after) > combatHpBonus(before) ? "+" + (combatHpBonus(after) - combatHpBonus(before)) + " de vida máxima" : "";
    log("Tu nivel de Combate subió a " + after + "." + (vida ? " " + vida + "." : ""), "good");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + after + "!" + (salto > 1 ? " (+" + salto + ")" : ""), sub: "Combate", big: hito, reward: vida });
    else { toast("¡Combate nivel " + after + "!"); if (window.sfx) sfx("level"); }
    if (window.onCombatLevelUp) window.onCombatLevelUp(after, salto);   // gancho para la celebración (Fase 5)
  }
  refreshHud();
}
function avgSkillLevel() { let s=0,n=0; for (const k in G.skills){ s+=skillInfo(G.skills[k]).lvl; n++; } return n ? s/n : 1; }
function addXp(sk, amt) {
  if (!(sk in G.skills)) return;
  if (sk === "cooking") return addCookXp(amt);   // la cocina tiene SU tabla 1-10 (doc maestro 2/8)
  const before = skillInfo(G.skills[sk]).lvl;
  G.skills[sk] += amt;
  const after = skillInfo(G.skills[sk]).lvl;
  if (after > before) {
    log(`${SKILL_NAME[sk]} subió a nivel ${after}.`, "good");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + after + "!" + (after - before > 1 ? " (+" + (after - before) + ")" : ""), sub: SKILL_NAME[sk] });
    else { toast("" + SKILL_NAME[sk] + " nivel " + after); if (window.sfx) sfx("level"); }
  }
  if (sk === "farming") recalcFarmLevel();   // doc maestro 2/8: el nivel de granja vive de la XP de farmeo
  if (isOpen("ov-skills")) refreshSkills();
}
function addCookXp(amt) {
  amt = Math.round(amt * (1 + buffTotal("cookxp") / 100));   // Pan de Trigo: +% XP de cocina
  const before = cookLevel();
  G.skills.cooking = (G.skills.cooking || 0) + amt;
  const after = cookLevel();
  if (after > before) {
    const rec = RECIPE_ORDER.filter(id => RECIPE_DEF[id].lvl === after && !RECIPE_DEF[id].desc).map(id => RECIPE_DEF[id].label);
    log("Cocina subió a nivel " + after + (rec.length ? ". Nueva receta: " + rec.join(" · ") : "") + (after === 8 ? ". ¡Ya podés vender platos por $Golden!" : "") + ".", "good");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + after + "!", sub: "Cocina" + (after >= 10 ? " maestra" : ""), big: after >= 10,
      reward: (rec.length ? "Nueva receta: " + rec.join(" · ") : "") + (after === 8 ? (rec.length ? " · " : "") + "Venta en $Golden" : "") });
    else { toast("Cocina nivel " + after); if (window.sfx) sfx("level"); }
    if (window.onCookLevelUp) window.onCookLevelUp(after);   // celebración (Fase 5)
  }
  if (isOpen("ov-skills")) refreshSkills();
}

// --- niveles de granja ---
// DOC MAESTRO 2/8: el nivel de granja sube SOLO con XP de Farmeo (curva front-loaded 1-10) y regala desbloqueos
var FARM_XP_LVLS = [0, 0, 10, 35, 90, 220, 500, 1100, 2400, 5200, 11000];   // índice = nivel, valor = XP de farmeo acumulada
const FARM_UNLOCK = { 2: "3ª parcela GRATIS", 3: "Horno básico disponible", 4: "4ª parcela GRATIS", 5: "Cocina disponible", 6: "5ª parcela GRATIS", 7: "6ª parcela GRATIS", 8: "Portal de netherita (a futuro)", 9: "Mejoras de endgame", 10: "Maestría de granja" };
function farmLevelFromXp(xp) { let l = 1; for (let i = 2; i < FARM_XP_LVLS.length; i++) if (xp >= FARM_XP_LVLS[i]) l = i; return Math.min(10, l); }
function recalcFarmLevel() {
  const nuevo = farmLevelFromXp(G.skills.farming || 0);
  while (G.level < nuevo) {
    G.level++;
    const gift = FARM_UNLOCK[G.level] || "";
    if (G.level === 2) G.plotsOwned = Math.max(G.plotsOwned || 2, 3);
    if (G.level === 4) G.plotsOwned = Math.max(G.plotsOwned, 4);
    if (G.level === 6) G.plotsOwned = Math.max(G.plotsOwned, 5);
    if (G.level === 7) G.plotsOwned = Math.max(G.plotsOwned, 6);
    log(`¡GRANJA NIVEL ${G.level}!` + (gift ? " Desbloqueaste: " + gift + "." : ""), "gold");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + G.level + "!", sub: "Granja", big: true, reward: gift || "" });
    else { toast("¡Granja nivel " + G.level + "!" + (gift ? " " + gift : "")); if (window.sfx) sfx("level"); }
    if (typeof window.onFarmLevelUp === "function") window.onFarmLevelUp(G.level, gift);   // celebración (Fase 5)
  }
  if (typeof refreshBarn === "function" && isOpen("ov-barn")) refreshBarn();
  refreshHud();
}
function canLevel() { return false; }   // legado: ya no se sube pagando recursos
function levelUp() { toast("El nivel sube cosechando (XP de Farmeo)"); }
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
/* === ARMAS DOC MAESTRO 2/8: 4 tipos × 5 rarezas, daño aleatorio + buff por tipo ===
   Espada=Crítico (daño ×2) · Hacha=Perforación (ignora % def) · Mazo=Aturdir (el mob pierde su próximo golpe) · Arco=Sangrado (daño/s 3s, a distancia) */
const ARM_TIPOS = ["espada", "hacha", "mazo", "arco"];
const ARM_RAREZAS = ["madera", "piedra", "bronce", "oro", "diamante"];
const ARM_TIPO_DEF = {
  espada: { label: "Espada", buff: "crit",   buffLabel: "Crítico",     skill: "sword", sprite: "sword", primQ: 5, secQ: 3, repQ: 2, plata: [10, 25, 60, 140, 320] },
  hacha:  { label: "Hacha",  buff: "pierce", buffLabel: "Perforación", skill: "hacha", sprite: "axe",   primQ: 6, secQ: 3, repQ: 3, plata: [10, 30, 70, 170, 385] },
  mazo:   { label: "Mazo",   buff: "stun",   buffLabel: "Aturdir",     skill: "mazo",  sprite: "pick_stone", primQ: 8, secQ: 4, repQ: 4, plata: [15, 40, 90, 210, 480] },
  arco:   { label: "Arco",   buff: "bleed",  buffLabel: "Sangrado",    skill: "range", sprite: "bow",   primQ: 4, secQ: 2, repQ: 2, plata: [10, 20, 50, 110, 255] },
};
const ARM_MINMAX = {   // daño aleatorio min-max por tipo y rareza (tablas 15-18 del compendio)
  espada: [[3,5],[4,8],[7,11],[10,18],[16,26]],
  hacha:  [[4,6],[5,9],[8,12],[12,20],[18,30]],
  mazo:   [[4,6],[6,10],[9,15],[14,22],[20,34]],
  arco:   [[2,4],[3,5],[5,9],[8,12],[12,20]],
};
const ARM_BUFFVAL = { espada: [3,5,8,12,18], hacha: [20,30,40,55,70], mazo: [8,12,16,22,30], arco: [1,2,3,4,6] };
const ARM_DUR = [40, 60, 90, 130, 190];
const ARM_CDS = [3, 5, 8, 12, 18];   // enfriamiento de crafteo (s)
const ARM_MAT = { madera: "madera", piedra: "piedra", bronce: "barra_bronce", oro: "barra_oro", diamante: "diamante" };
const ARM_RAR_LABEL = { madera: "de Madera", piedra: "de Piedra", bronce: "de Bronce", oro: "de Oro", diamante: "de Diamante" };
const ARM_DEF = {};
ARM_TIPOS.forEach(tipo => ARM_RAREZAS.forEach((rar, i) => {
  const td = ARM_TIPO_DEF[tipo], cost = {};
  cost[ARM_MAT[rar]] = td.primQ;
  if (i > 0) cost[ARM_MAT[ARM_RAREZAS[i - 1]]] = (cost[ARM_MAT[ARM_RAREZAS[i - 1]]] || 0) + td.secQ;
  const repair = {}; repair[ARM_MAT[rar]] = td.repQ;
  ARM_DEF[tipo + "_" + rar] = { tipo, rareza: rar, ri: i, label: td.label + " " + ARM_RAR_LABEL[rar],
    min: ARM_MINMAX[tipo][i][0], max: ARM_MINMAX[tipo][i][1], buffVal: ARM_BUFFVAL[tipo][i],
    dur: ARM_DUR[i], cost, plata: td.plata[i], cd: ARM_CDS[i], repair };
}));
const ARM_ORDER = [];
ARM_TIPOS.forEach(t => ARM_RAREZAS.forEach(r => ARM_ORDER.push(t + "_" + r)));

function armaEq() { const id = G.gear.arma; return (id && ARM_DEF[id] && G.weapons[id] && G.weapons[id].dur > 0) ? id : null; }
function armSkillKey(tipo) { return ARM_TIPO_DEF[tipo].skill; }
function armCdLeft(id) { return Math.max(0, ((G.armCd && G.armCd[id]) || 0) - nowMs()); }
function craftWeapon(id) {
  const w = ARM_DEF[id]; if (!w) return;
  if (!G.armasUnlocked) { toast("Desbloqueá la sección de Armas primero"); return; }
  if (G.weapons[id]) { toast("Ya tenés " + w.label); return; }
  if (armCdLeft(id) > 0) { toast("La forja se enfría — " + fmtSecs(Math.ceil(armCdLeft(id) / 1000))); return; }
  if (!canAfford(w.cost)) { toast("Te faltan materiales"); return; }
  if (G.plata < w.plata) { toast("Te falta plata"); return; }
  payCost(w.cost); G.plata -= w.plata;
  G.weapons[id] = { dur: w.dur };
  G.armCd = G.armCd || {}; G.armCd[id] = nowMs() + w.cd * 1000;
  if (!G.gear.arma) G.gear.arma = id;
  addXp("crafting", 10 + w.ri * 4);
  log("Forjaste " + w.label + ".", "gold"); toast("¡" + w.label + "!"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv(); refreshHud();
}
function repairWeapon(id) {
  const w = ARM_DEF[id]; if (!w || !G.weapons[id]) return;
  if (G.weapons[id].dur >= w.dur) { toast("Ya está al 100%"); return; }
  if (!canAfford(w.repair)) { toast("Te faltan materiales para reparar"); return; }
  payCost(w.repair); G.weapons[id].dur = w.dur;
  log("Reparaste " + w.label + " (100%).", "good"); toast("Reparada"); forgeWork(); refreshForge();
  if (isOpen("ov-equip")) refreshEquip(); if (isOpen("ov-inv")) refreshInv();
}
function useWeapon(id) { if (G.weapons[id] && G.weapons[id].dur > 0) G.weapons[id].dur--; return G.weapons[id] ? G.weapons[id].dur : 0; }
// la tirada de un golpe (doc: Daño = máx(1; Ataque − Def efectiva); Ataque = tirada aleatoria + nivel de la skill del arma / 2)
function rollWeaponHit(defensa) {
  const id = armaEq(); if (!id) return null;
  const w = ARM_DEF[id], lvl = skillInfo(G.skills[armSkillKey(w.tipo)] || 0).lvl;
  let atk = w.min + Math.floor(Math.random() * (w.max - w.min + 1)) + Math.floor(lvl / 2);
  let defEf = defensa || 0;
  const out = { id, tipo: w.tipo, crit: false, stun: false, bleed: 0 };
  if (w.tipo === "hacha") defEf = defEf * (1 - w.buffVal / 100);
  if (w.tipo === "espada" && Math.random() * 100 < w.buffVal) { atk *= 2; out.crit = true; }
  if (w.tipo === "mazo" && Math.random() * 100 < w.buffVal) out.stun = true;
  if (w.tipo === "arco") out.bleed = w.buffVal;
  out.dmg = Math.max(1, Math.round((atk - defEf) * dmgMult()));   // buff de daño de la comida
  return out;
}

// --- LEGADO (espada/arco viejos): queda para migración de guardados; ya no se craftea ---
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
function swordDmg() {   // legado: >0 si hay un arma CUERPO A CUERPO equipada y sana (el daño real sale de rollWeaponHit)
  const id = armaEq(); if (!id) return 0;
  const w = ARM_DEF[id]; if (w.tipo === "arco") return 0;
  return Math.round((w.min + w.max) / 2) + Math.floor(skillInfo(G.skills[armSkillKey(w.tipo)] || 0).lvl / 2);
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
function bowDmg() { const id = armaEq(); if (!id || ARM_DEF[id].tipo !== "arco") return 0; const r = rollWeaponHit(0); return r ? r.dmg : 0; }
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
function canShoot() { const id = armaEq(); return !!(id && ARM_DEF[id].tipo === "arco" && G.gear.municion && (G.res.flecha || 0) > 0); }   // arco nuevo + flechas equipadas

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
// --- COCINA (doc maestro 2/8): 14 recetas de cultivos + las 3 clásicas de pescado/carne ---
// buff nuevo: { type, val } — val en % (o HP/s en regen, vida plana en hpmax); duración = DISH_BUFF_DUR
var DISH_BUFF_DUR = 300;   // 5 min (editable en el panel)
const RECIPE_ORDER = [
  "papa_asada", "pure_papa", "sopa_zanahoria", "ensalada_repollo", "calabacin_salteado",
  "pan_trigo", "salteado_brocoli", "crema_calabaza", "tortilla_maiz", "aceite_girasol",
  "guiso_campestre", "pan_maiz_trigo", "estofado_cosecha", "banquete_bosque",
  "pescado_asado", "estofado", "banquete"];
const RECIPE_DEF = {
  papa_asada:         { label:"Papa Asada",             emoji:"🥔", res:{papa:1},                                        lvl:1,  heal:10, buff:{type:"farm",    val:5},  cookS:6,  xp:8,  plata:5 },
  pure_papa:          { label:"Puré de Papa",           emoji:"🥣", res:{papa:2, cebolla:1},                             lvl:2,  heal:13, buff:{type:"regen",   val:2},  cookS:8,  xp:10, plata:12 },
  sopa_zanahoria:     { label:"Sopa de Zanahoria",      emoji:"🍜", res:{zanahoria:2, cebolla:1},                        lvl:2,  heal:15, buff:{type:"speed",   val:8},  cookS:8,  xp:10, plata:14 },
  ensalada_repollo:   { label:"Ensalada de Repollo",    emoji:"🥗", res:{repollo:2, zanahoria:1},                        lvl:3,  heal:17, buff:{type:"def",     val:6},  cookS:10, xp:14, plata:18 },
  calabacin_salteado: { label:"Calabacín Salteado",     emoji:"🥒", res:{calabacin:2, cebolla:1},                        lvl:3,  heal:18, buff:{type:"dmg",     val:6},  cookS:10, xp:14, plata:20 },
  pan_trigo:          { label:"Pan de Trigo",           emoji:"🍞", res:{trigo:3},                                       lvl:4,  heal:20, buff:{type:"cookxp",  val:10}, cookS:12, xp:18, plata:22 },
  salteado_brocoli:   { label:"Salteado de Brócoli",    emoji:"🥦", res:{brocoli:2, calabacin:1},                        lvl:5,  heal:23, buff:{type:"farm",    val:10}, cookS:12, xp:22, plata:28 },
  crema_calabaza:     { label:"Crema de Calabaza",      emoji:"🎃", res:{calabaza:2, cebolla:1},                         lvl:5,  heal:25, buff:{type:"def",     val:10}, cookS:14, xp:24, plata:32 },
  tortilla_maiz:      { label:"Tortilla de Maíz",       emoji:"🌽", res:{maiz:2, cebolla:1},                             lvl:6,  heal:27, buff:{type:"dmg",     val:10}, cookS:14, xp:28, plata:38 },
  aceite_girasol:     { label:"Aceite de Girasol",      emoji:"🌻", res:{girasol:3},                                     lvl:6,  heal:18, buff:{type:"luck",    val:10}, cookS:14, xp:26, plata:40 },
  guiso_campestre:    { label:"Guiso Campestre",        emoji:"🍲", res:{papa:1, zanahoria:1, repollo:1, cebolla:1},     lvl:7,  heal:31, buff:{type:"combatxp",val:12}, cookS:16, xp:34, plata:55 },
  pan_maiz_trigo:     { label:"Pan de Maíz y Trigo",    emoji:"🥖", res:{trigo:2, maiz:2},                               lvl:8,  heal:34, buff:{type:"hpmax",   val:20}, cookS:16, xp:42, plata:80,  goldenP:1 },
  estofado_cosecha:   { label:"Estofado de la Cosecha", emoji:"🥘", res:{calabaza:2, maiz:1, papa:1, zanahoria:1},       lvl:9,  heal:37, buff:{type:"dmg",     val:15}, cookS:18, xp:52, plata:110, goldenP:2 },
  banquete_bosque:    { label:"Banquete del Bosque",    emoji:"🍱", res:{papa:1, zanahoria:1, repollo:1, brocoli:1, calabaza:1}, lvl:10, heal:40, buff:{type:"feast", val:20}, cookS:20, xp:70, plata:180, goldenP:4 },
  // clásicas (siguen dándole uso al pescado y la carne)
  pescado_asado: { label:"Pescado asado", emoji:"🐟", sprite:"dish_pescado_asado", fish:{comun:1}, res:{madera:1}, lvl:1,
    heal:30, buff:{type:"yield",label:"Cosecha +10%",mult:1.10,dur:90}, cookS:8, xp:8, plata:15,
    desc:"Cura 30 · Cosecha +10% (1 min 30 s)" },
  estofado: { label:"Estofado de carne", emoji:"🍲", sprite:"dish_estofado", res:{carne:2, papa:1, madera:1}, lvl:3,
    heal:60, buff:{type:"cd",label:"Enfriamientos -15%",mult:0.85,dur:90}, cookS:10, xp:12, plata:30,
    desc:"Cura 60 · Enfriamientos -15% (1 min 30 s)" },
  banquete: { label:"Banquete del granjero", emoji:"🍗", sprite:"dish_banquete", fish:{raro:1}, res:{carne:2, calabaza:1, madera:1}, lvl:6,
    heal:9999, buff:{type:"yield",label:"Cosecha +20%",mult:1.20,dur:180}, cookS:14, xp:25, plata:60,
    desc:"Cura TODA la vida · Cosecha +20% (3 min)" },
};
// niveles de cocina 1-10 (tabla del doc, XP ACUMULADA por nivel) + maestría
var COOK_LVLS = [0, 0, 30, 80, 160, 300, 520, 850, 1300, 1900, 2700];
function cookLevelFromXp(xp) { let l = 1; for (let i = 2; i < COOK_LVLS.length; i++) if (xp >= COOK_LVLS[i]) l = i; return Math.min(10, l); }
function cookLevel() { return cookLevelFromXp(G.skills.cooking || 0); }
function cookPot(rlvl) { return Math.min(1.5, 1 + 0.02 * Math.max(0, cookLevel() - (rlvl || 1))); }   // Potencia = 1 + 2% por nivel sobre la receta, tope +50%
function dishBuffLabel(b, pot) {
  const v = Math.round((b.val || 0) * (pot || 1));
  switch (b.type) {
    case "farm": return "+" + v + "% vel. de farmeo";
    case "regen": return "regenera +" + v + " HP/s";
    case "speed": return "+" + v + "% vel. de movimiento";
    case "def": return "+" + v + "% defensa";
    case "dmg": return "+" + v + "% daño";
    case "cookxp": return "+" + v + "% XP de cocina";
    case "luck": return "+" + v + "% suerte en drops";
    case "combatxp": return "+" + v + "% XP de combate";
    case "hpmax": return "+" + v + " de vida máxima";
    case "feast": return "+" + v + "% daño, defensa y velocidad";
  }
  return b.label || "";
}
function dishDesc(r) { return r.desc || ("Cura " + r.heal + " HP · " + dishBuffLabel(r.buff, 1) + " (" + fmtSecs(DISH_BUFF_DUR) + ")"); }
function canCook(id) {
  const r = RECIPE_DEF[id]; if (!r) return false;
  if (r.lvl && cookLevel() < r.lvl) return false;   // receta bloqueada por nivel de cocina
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
  const ms = (r.cookS ? r.cookS * 1000 : COOK_MS);   // cocción por receta (doc: 6-20 s)
  G.cooking = { id, endAt: nowMs() + ms, total: ms };
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
  if (r.buff && r.buff.val != null) {   // recetas del doc: el buff escala con la maestría del cocinero
    const pot = cookPot(r.lvl), v = r.buff.type === "hpmax" ? Math.round(r.buff.val * pot) : Math.round(r.buff.val * pot * 10) / 10;   // vida máx. en enteros
    addBuff(r.buff.type, dishBuffLabel(r.buff, pot), v, DISH_BUFF_DUR);
    if (r.buff.type === "hpmax") buffTick();   // la vida extra entra ya mismo
  } else if (r.buff) addBuff(r.buff.type, r.buff.label, r.buff.mult, r.buff.dur);
  log(r.emoji + " Comiste " + r.label + ". " + dishDesc(r), "gold"); toast(r.emoji + " ¡Ñam!");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// vender platos en la Cocina (doc: la maestría sube el precio; nivel 8+ desbloquea venta en $Golden)
function sellDish(id, gold) {
  const r = RECIPE_DEF[id]; if (!r || !G.dishes || (G.dishes[id] || 0) <= 0) return;
  if (gold && !(r.goldenP && cookLevel() >= 8)) { toast("La venta en $Golden se desbloquea con Cocina nivel 8"); return; }
  G.dishes[id]--;
  if (gold) { G.golden += r.goldenP; log("Vendiste " + r.label + " por " + r.goldenP + " $Golden.", "gold"); toast("+" + r.goldenP + " $Golden"); }
  else { const v = Math.round((r.plata || 0) * cookPot(r.lvl)); G.plata += v; log("Vendiste " + r.label + " por " + v + " de plata.", "gold"); toast("+" + v + " de plata"); }
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
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
  rata:     { label:"Rata",           emoji:"🐀", sprite:"rata", size:30, hp:12,  def:0,  dmg:2,  xp:100,  spd:55, loot:{ carne:[1,1,0.55], plata:[3,3,1] } },
  larva:    { label:"Larva Venenosa", emoji:"🐛", sprite:"larva", size:38, hp:22,  def:1,  dmg:3,  xp:180,  spd:35, loot:{ carne:[1,2,0.50], plata:[5,5,1], flecha:[1,3,0.35] }, gearLoot:[["botas_cuero",0.08]] },
  orco:     { label:"Orco",           emoji:"👹", sprite:"orc", size:52, hp:60,  def:4,  dmg:8,  xp:500,  spd:60, loot:{ carne:[1,2,0.55], plata:[14,14,1], bronce:[1,2,0.35] }, gearLoot:[["casco_cuero",0.10],["escudo_madera",0.08]] },
  lancero:  { label:"Orco Lancero",   emoji:"🔱", sprite:"lancero", size:58, hp:90,  def:6,  dmg:10, xp:800,  spd:70, loot:{ carne:[2,3,0.60], plata:[20,20,1], bronce:[1,3,0.40], flecha:[2,6,0.45] }, gearLoot:[["pechera_cuero",0.10]] },
  guerrero: { label:"Orco Guerrero",  emoji:"👺", sprite:"guerrero", size:70, hp:115, def:8,  dmg:12, xp:1100, spd:65, loot:{ carne:[2,4,0.60], plata:[30,30,1], oro:[1,2,0.30] }, gearLoot:[["casco_hierro",0.10],["escudo_hierro",0.06]] },
  troll:    { label:"Trol",           emoji:"🧌", sprite:"troll", size:74, hp:140, def:10, dmg:14, xp:1400, spd:45, loot:{ carne:[3,5,0.65], plata:[40,40,1], oro:[1,3,0.45], diamante:[1,1,0.12] }, gearLoot:[["pechera_hierro",0.15]] },
};
// combate (detalles 338): auto-ataque cada 2s, alcance del arco 4 celdas
const ATTACK_MS = 2000;
const MELEE_RANGE = GF.TILE * 1.35;
const BOW_RANGE = GF.TILE * 4;
function rollLoot(def) {
  const out = {};
  for (const k in def.loot) {
    const e = def.loot[k], a = e[0], b = e[1], chance = (e.length > 2 ? e[2] : 1);
    if (Math.random() >= Math.min(1, chance * luckMult())) continue;   // suerte de la comida mejora los drops (detalles 338)
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
function craftTool(id, lote) {
  lote = Math.max(1, lote || 1);
  const tc = TOOL_CRAFT[id], td = TOOL_DEF[id]; if (!tc || !td) return;
  if (lote > 1) {   // doc 2/8: crafteo en lote — la fricción es económica, no de clicks
    let hechas = 0;
    while (hechas < lote && toolCount(id) < 99 && canAfford(tc.cost) && G.plata >= tc.plata) { payCost(tc.cost); G.plata -= tc.plata; G.tools[id] = toolCount(id) + 1; hechas++; }
    if (!hechas) { toast("Te faltan materiales o plata"); return; }
    addXp("crafting", 5 * hechas); log("Crafteaste " + hechas + " × " + td.label + " (tenés " + G.tools[id] + ").", "good"); toast("+" + hechas + " " + td.label);
    forgeWork(); refreshForge(); if (isOpen("ov-inv")) refreshInv(); refreshHud(); syncSlots(); if (typeof refreshHotbar === "function") refreshHotbar();
    return;
  }
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
  for (const id of ARM_ORDER) if (G.weapons && G.weapons[id]) list.push({ kind: "arm", key: id });   // doc 2/8: armas nuevas
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
