/* Golden Farm · estado del juego + economía (sin DOM ni canvas) */
window.GF = window.GF || {};
GF.spr = (k) => "assets/farm/" + k + ".png?a=7";   // ?a=N rompe el caché de los íconos (a=7: lombriz oficial PixelLab)

// --- estado principal (con algunos recursos de arranque para probar los menús) ---
const G = {
  plata: 3, golden: 20, level: 1, prestige: 0, week: 1,   // 14/8: nacés con 3 de plata (el 1er objetivo es COMPRAR tus semillas)
  hp: 100, hpMax: 100, swordOwned: false, bowOwned: false, swordWoodOwned: false, firstCropDone: false,   // combate (Fase D)
  armasUnlocked: false,          // viernes (2): la pestana Armas de la Herreria se paga (20 madera + 20 piedra + 1000 plata)
  treesOpen: [0], rocksOpen: [0],  // viernes (2): índices de árboles/piedras desbloqueados (cualquiera, sin orden — pedido Discord)
  gear: { casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false },
  weapons: {},                   // doc 2/8: armas nuevas — id ("espada_madera") -> { dur }
  stam: null, stamAcc: 0, stamRec: null,   // estamina de la Zona Negra ("2das mejoras")
  stats: {}, statsBase: {}, chestCap: 0, edif2: {}, cosmeticos: [],
  animals: {},                   // Establo: animal → { desde, feliz, comidoAt, prodAt }
  armor: {}, armorEq: null,      // Curtiduría: piezas crafteadas y set equipado
  ofrendaPts: 0, ofrendaLog: 0,  // Altar de Ofrendas: puntos acumulados y recursos quemados
  nodoUsos: {},                  // cuántas veces se recogió de cada nodo (para el arranque rápido)
  cosEq: null,                   // cosmético lucido: título, color de nombre, marco y aura
  incursion: null, incDia: null, dummyTrain: null,   // incursiones de un clic y entrenamiento offline   // tareas de nivel 11-50, mejoras y cosméticos
  combatXp: 0,                   // doc 2/8: barra de Combate GLOBAL — suma la XP de todos los kills
  states: [],                    // doc 2/8: estados/debuffs del bestiario sobre el jugador (no se guardan)
  tuto: { step: 0, n: 0, done: false, v: 2 },   // doc 2/8: tutorial guiado de micro-objetivos (v = versión de la cadena)
  firstSeeds: 3,                 // semillas del starter pack que crecen en 45 s (se descuentan al plantarlas)
  armCd: {}, mkPend: [], testeoDado: false,   // enfriamiento de crafteo por arma · entregas pendientes · (testeoDado quedó del regalo viejo, ya no se usa)   // equipo (armas se equipan en el panel de Equipo — detalles jueves)
  res: { madera: 0, piedra: 0, bronce: 0, hierro: 0, oro: 0, diamante: 0, netherita: 0, carne: 0, flecha: 0, lombriz: 0,
    tablon: 0, barra_piedra: 0, barra_bronce: 0, barra_hierro: 0, barra_oro: 0,
    papa: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0, girasol: 0, trigo: 0, maiz: 0,
    fibra: 0, pelaje: 0, cuero: 0, colmillo: 0, esencia_runica: 0, esencia_oscura: 0 },
  seeds: { papa: 0, zanahoria: 0, cebolla: 0, calabacin: 0, repollo: 0, calabaza: 0, brocoli: 0, girasol: 0, trigo: 0, maiz: 0 },  // 14/8: la bolsa nace VACÍA — las 3 semillas se compran con la plata inicial (1er objetivo)
  selSeed: "papa",   // semilla elegida para plantar
  picks: { owned: { stone: true }, dur: { stone: 15 }, eq: "stone" },   // 14/8 (reversión del capataz): vuelve el set de arranque
  tools: { axe: 15, rod: 15 },   // 15 usos de arranque; después se craftean de a 1 uso
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
  plotsOwned: 3,   // 14/8 (dirección): se nace con 3 parcelas — la primera misión planta 3 semillas y tiene que haber 3 celdas donde apuntar
  decos: [], decoBolsa: {}, godHand: false, zonasVistas: ["pantano"],   // adornos puestos · adornos sin colocar · NFT de siembra automática (10/8)
  daily: { day: 0, last: "" },   // cofre diario: día de racha reclamado (1..7) y fecha del último reclamo
  seedBuys: { date: "", count: 0 },   // cupo diario de semillas (compras + cofre)
  dishes: {},      // platos cocinados (van a la bolsa; clic para comer)
  cooking: [],   // { id, endAt, total } — barra de enfriamiento al cocinar
  chests: [],      // cofres depósito: [{col,row,items:[{kind,key,n}|null × 10]}] — +1% materiales c/u
  dummyUsedAt: 0,  // último entrenamiento con el dummy (cooldown 4h)
  built: { store: false, horno: false, cocina: false, altar: false, establo: false, curtiduria: false, ofrendas: false },   // viernes (2): la Herreria es el unico edificio gratis; el resto se construye
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
function dmgMult() { return 1 + (buffTotal("dmg") + buffTotal("feast") + (typeof armorBonoVal === "function" ? armorBonoVal("dmgPct") : 0)) / 100; }
function dmgTakenMult() { return Math.max(0.2, 1 - (buffTotal("def") + buffTotal("feast") + (typeof armorBonoVal === "function" ? armorBonoVal("defPct") : 0)) / 100); }
function speedMult() { return 1 + (buffTotal("speed") + buffTotal("feast") + (typeof armorBonoVal === "function" ? armorBonoVal("spd") : 0)) / 100; }
function farmSpeedMult() { return Math.max(0.4, 1 - (buffTotal("farm") + (typeof armorBonoVal === "function" ? armorBonoVal("farm") : 0)) / 100); }   // acorta las acciones de cultivo
function luckMult() { return 1 + buffTotal("luck") / 100 + (typeof eqRunaVal === "function" && typeof armaEq === "function" ? eqRunaVal("fortuna") / 100 : 0); }
function combatXpMult() { return 1 + buffTotal("combatxp") / 100; }
/* --- ESTADOS sobre el jugador (bestiario doc 2/8): sangrado/veneno/quemadura (daño por s),
       maldiciones de Flaqueza (-daño) y Fragilidad (-defensa), ralentización. Tope: 2 maldiciones,
       veneno acumulable x3, el resto se renueva. Viven solo en la sesión (no se guardan). --- */
function addPlayerState(type, val, durS, label) {
  const t = Date.now();
  G.states = (G.states || []).filter(s => s.until > t);
  if (type === "veneno") {
    if (G.states.filter(s => s.type === "veneno").length >= 3) return false;   // acumulable hasta x3
  } else {
    const prev = G.states.find(s => s.type === type);
    if (prev) { prev.until = t + durS * 1000; prev.val = Math.max(prev.val, val); return true; }   // se renueva
    if ((type === "flaqueza" || type === "fragilidad") &&
        G.states.filter(s => s.type === "flaqueza" || s.type === "fragilidad").length >= 2) return false;   // tope maldiciones
  }
  G.states.push({ type, val, until: t + durS * 1000, next: t + 1000, label: label || type });
  log("Sufrís " + (label || type) + ".", "bad");
  return true;
}
function stateTotal(type) { const t = Date.now(); let s = 0; for (const st of (G.states || [])) if (st.type === type && st.until > t) s += st.val; return s; }
function playerDmgOutMult() { return Math.max(0.2, 1 - stateTotal("flaqueza") / 100); }   // Maldición de Flaqueza
function playerDefLossMult() { return Math.min(0.9, stateTotal("fragilidad") / 100); }    // Maldición de Fragilidad
function playerSlowMult() { return Math.max(0.4, 1 - stateTotal("ralen") / 100); }        // Ralentización
function cleanseStates(tipos) {
  const antes = (G.states || []).length;
  G.states = (G.states || []).filter(s => !tipos.includes(s.type));
  return antes - G.states.length;
}

var GRANJA_REGEN = 1;   // "detallitos (1)" punto 3: en la granja la vida se recupera sola (puntos por segundo)
function granjaRegen() {   // solo fuera de la Zona Negra
  if (!GRANJA_REGEN || G.hp >= G.hpMax) return;
  if (window.GF && GF.scene === "forest") return;
  G.hp = Math.min(G.hpMax, G.hp + GRANJA_REGEN);
}
function buffTick() {   // 1 vez por segundo desde el HUD: regeneración y vida máxima temporal
  const t = Date.now(); let dirty = false;
  // set de Piel completo: +N HP/s (el bono estaba en la tabla pero no lo leía nadie)
  { const rg = (typeof armorBonoVal === "function") ? armorBonoVal("regen") : 0;
    if (rg > 0 && G.hp < G.hpMax) { G.hp = Math.min(G.hpMax, G.hp + rg); dirty = true; } }
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

// --- recursos ---
const RES_EMOJI = { madera:"", piedra:"", bronce:"", oro:"", diamante:"", netherita:"", carne:"", flecha:"", lombriz:"",
  papa:"", zanahoria:"", cebolla:"", calabacin:"", repollo:"", calabaza:"", brocoli:"" };
const RES_LABEL = { madera:"Madera", piedra:"Piedra", bronce:"Bronce", hierro:"Hierro", oro:"Oro", diamante:"Diamante", netherita:"Netherita", carne:"Carne", flecha:"Flecha", lombriz:"Lombriz",
  tablon:"Tablón de madera", barra_piedra:"Bloques de piedra", barra_bronce:"Barra de bronce", barra_hierro:"Barra de hierro", barra_oro:"Barra de oro",
  papa:"Papa", zanahoria:"Zanahoria", cebolla:"Cebolla", calabacin:"Calabacín", repollo:"Repollo", calabaza:"Calabaza", brocoli:"Brócoli",
  girasol:"Girasol", trigo:"Trigo", maiz:"Maíz",
  fibra:"Fibra", pelaje:"Pelaje", cuero:"Cuero", colmillo:"Colmillo", esencia_runica:"Esencia rúnica" };
// íconos cozy de recursos (los cultivos usan crop_<key>)
const RES_SPRITE = { madera:"res_madera", piedra:"res_piedra", bronce:"res_bronce", hierro:"res_hierro", oro:"res_oro", diamante:"res_diamante", netherita:"res_netherita", carne:"res_carne", flecha:"res_flecha", lombriz:"res_lombriz",
  tablon:"res_tablon", barra_piedra:"res_barra_piedra", barra_bronce:"res_barra_bronce", barra_hierro:"res_barra_hierro", barra_oro:"res_barra_oro",
  // 10/8: materiales del Establo, la Curtiduría, el Altar y las incursiones. Eran los últimos
  // ítems de la bolsa que salían con emoji en vez de ícono.
  fibra:"res_fibra", pelaje:"res_pelaje", cuero:"res_cuero", colmillo:"res_colmillo",
  esencia_runica:"res_esencia_runica", esencia_oscura:"res_esencia_oscura" };
function resSprite(k) { return CROP_DEF[k] ? "crop_" + k : (RES_SPRITE[k] || null); }

// --- cultivos (semillas compradas en la Tienda; se desbloquean por nivel de Cultivo) ---
const CROP_ORDER = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz"];
// TABLA DE PRECIOS del diseñador (31/7): Ganancia = Tiempo × Riesgo × Nivel. Papa base: compra 1 / venta 3 / 1h.
// growH = horas reales de la tabla. En TESTEO corre comprimido: 1h → 1min (GROW_SCALE). Para pasar a real: GROW_SCALE = 1.
var GROW_SCALE = 1;   // 2/8: FUERA la compresión de testeo — el tiempo que se pone en balance.html es el tiempo real del juego
// Tabla oficial de "2das mejoras" (4/8/2026): compra/venta con ganancia que dobla por tier y
// ratio ~2,33; tiempos de 9 min (Papa) a 24 h (Maíz). XP por cosecha = minutos de crecimiento.
const CROP_DEF = {
  // 14/8 (dirección, decisión ESTRUCTURAL): el ritmo del tutorial ES el del juego — tier 1
  // rápido DE BASE, escalera que duplica hacia arriba (estilo Sunflower Land). El CUPO
  // diario de semillas hace el cambio neutro a inflación: el ingreso máximo POR DÍA no
  // cambia, solo cuán rápido lo alcanzás. ⚠ Números a validar por el diseñador.
  papa:      { label:"Papa",      emoji:"🥔", lvl:1,  seedCost:1,   growH:0.0125, yield:1, price:3,    xp:9 },    // 45 s (14/8 −50%)
  zanahoria: { label:"Zanahoria", emoji:"🥕", lvl:2,  seedCost:3,   growH:0.0417, yield:1, price:8,    xp:25 },  // 2,5 min (14/8 −50%)
  cebolla:   { label:"Cebolla",   emoji:"🧅", lvl:3,  seedCost:6,   growH:0.0833, yield:1, price:16,   xp:50 },  // 5 min (14/8 −50%)
  calabacin: { label:"Calabacín", emoji:"🥒", lvl:4,  seedCost:12,  growH:0.25, yield:1, price:32,   xp:90 },   // 15 min (−50%)
  repollo:   { label:"Repollo",   emoji:"🥬", lvl:5,  seedCost:20,  growH:0.5,  yield:1, price:50,   xp:150 },  // 30 min (−50%)
  calabaza:  { label:"Calabaza",  emoji:"🎃", lvl:6,  seedCost:40,  growH:1,    yield:1, price:100,  xp:270 },  // 1 h (−50%)
  brocoli:   { label:"Brócoli",   emoji:"🥦", lvl:7,  seedCost:90,  growH:2,    yield:1, price:210,  xp:480 },  // 2 h (−50%)
  girasol:   { label:"Girasol",   emoji:"🌻", lvl:8,  seedCost:180, growH:4,    yield:1, price:420,  xp:720 },  // 4 h (−50%)
  trigo:     { label:"Trigo",     emoji:"🌾", lvl:9,  seedCost:360, growH:6,    yield:1, price:840,  xp:1080 }, // 6 h (−50%)
  maiz:      { label:"Maíz",      emoji:"🌽", lvl:10, seedCost:720, growH:12,   yield:1, price:1680, xp:1440 },  // 12 h (−50% · ⚠ se pierde el ancla nocturna de 24 h — a validar)
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
var SEED_DAILY_BASE = 18, SEED_DAILY_POR_NIVEL = 2;   // "2das mejoras": el cupo escala con el nivel de granja
function seedDailyMax() { return SEED_DAILY_BASE + SEED_DAILY_POR_NIVEL * (G.level || 1); }
// Doc "Enfriamiento de Árboles y Minerales" (4/8): farmeo chill. Las primeras recolecciones de cada
// nodo salen en minutos (enganche) y después el nodo pasa a su enfriamiento largo real.
var GOLPES_TALAR = 3, GOLPES_MINAR = 3;   // clics para tumbar un árbol o romper una roca (lo usa también el panel de balanceo)
// si dejás un árbol o una piedra a medio golpear y no volvés en este tiempo, se recupera sola
// y NO se gasta la herramienta: la herramienta solo se descuenta cuando el nodo cae del todo.
var GOLPES_RESET_MS = 5000;
var CD = { tree: 1800, rock: 2700 };            // 14/8 −50%: 30 min el árbol · 45 min la piedra
var CD_RAPIDO = {                                // enfriamiento corto de las primeras veces
  // 10/8: eran las primeras 3 y el diseñador pidió 10, para que el tutorial se pueda terminar
  // sin quedarse esperando el enfriamiento largo del cuarto árbol.
  tree:      { seg: 60, veces: 15 },             // 14/8 −50%: 1 min · las primeras 15
  piedra:    { seg: 90, veces: 15 },             // 14/8 −50%: 1,5 min · las primeras 15
  bronce:    { seg: 180, veces: 2 },             // 14/8 −50%: 3 min · las primeras 2
  hierro:    { seg: 240, veces: 2 },             // 14/8 −50%: 4 min
  oro:       { seg: 360, veces: 1 },             // 14/8 −50%: 6 min
  diamante:  { seg: 360, veces: 1 },             // 14/8 −50%: 6 min
  netherita: { seg: 900, veces: 1 },             // 15 min · la primera
};
// cuántas veces se recogió YA de ese nodo (por nodo, no global)
function nodoUsos(o) { G.nodoUsos = G.nodoUsos || {}; return G.nodoUsos[o.i] || 0; }
function nodoSumar(o) { G.nodoUsos = G.nodoUsos || {}; G.nodoUsos[o.i] = nodoUsos(o) + 1; }
// enfriamiento que corresponde a este nodo AHORA (en segundos)
// 14/8 FINAL (dirección): la ACELERACIÓN del tutorial se ELIMINÓ — el ritmo del
// tutorial ES el ritmo del juego: escalera de cultivos rápida en tier 1 (papa 90 s) y
// CD_RAPIDO en los nodos. Una sola física; las esperas del tutorial se SOLAPAN.
/* 14/8 (proyección como GUÍA — la aceleración se eliminó; la contabilidad queda) —
   una siembra corre a 3 s solo si la PROYECCIÓN (plata + cosecha en bolsa + lo que está
   creciendo) todavía no cubre la meta del sub. Cubierta la meta: siembras a tiempo real
   y AVISO de "ya te alcanza". Atesorar cuenta en la proyección → no hay imprenta. */
function plataProyectada() {
  let p = Math.floor(G.plata || 0);
  for (const k in CROP_DEF) {
    p += Math.floor(G.res[k] || 0) * (CROP_DEF[k].price || 0);      // cosecha en bolsa
    p += Math.floor(G.seeds[k] || 0) * (CROP_DEF[k].price || 0);    // 14/8 v5: las SEMILLAS también son cosecha futura — comprar baja plata y sube semillas, o sea la proyección crece por la ganancia NETA: la cuenta cierra sola
  }
  if (Array.isArray(G.plots)) for (const pl of G.plots) {
    if (pl && pl.state === "growing" && pl.cropKey && CROP_DEF[pl.cropKey]) p += CROP_DEF[pl.cropKey].price || 0;
  }
  return p;
}
function subPlataMeta() {   // meta del sub de plata activo (0 si no hay)
  const sub = (typeof tutoSub === "function") ? tutoSub() : null;
  return (sub && sub.plata && sub.meta) ? sub.meta : 0;
}
// (la aceleración "del plan" se eliminó con la física única; la PROYECCIÓN y el
//  aviso de "ya cubrís la meta" quedan como guía — útiles también a tiempo real)
// aviso ÚNICO por meta: "con lo plantado ya cubrís los X" (lo llama tutoSync cada segundo)
function tutoAvisoCubierto() {
  const meta = subPlataMeta();
  if (!meta) { G._cubAviso = 0; return; }
  if (G._cubAviso === meta) return;
  if (plataProyectada() >= meta) {
    G._cubAviso = meta;
    toast("🎯 Con lo plantado y tu bolsa ya cubrís los " + meta + " de plata — cosechá y vendé");
    log("Con lo que está creciendo y lo que tenés en la bolsa ya llegás a los " + meta + " de plata del objetivo.", "good");
  }
}
function nodoCd(o, clave, cdLargo) {
  const r = CD_RAPIDO[clave];
  if (r && nodoUsos(o) < r.veces) return r.seg;   // todavía está en su etapa de arranque rápido
  return cdLargo;
}
function seedBuysToday() {
  const sb = G.seedBuys || (G.seedBuys = { date: "", count: 0 });
  if (sb.date !== dayStamp(0)) { sb.date = dayStamp(0); sb.count = 0; }
  return sb;
}
function buySeed(k, qty) {
  const cd = CROP_DEF[k]; if (!cd) return;
  if (!cropUnlocked(k)) { toast("Necesitás Cultivo nivel " + cd.lvl); return; }
  qty = Math.max(1, Math.floor(qty || 1));
  const sb = seedBuysToday();
  // 14/8 v6 (dirección, regla simple y final): DURANTE el tutorial el cupo de semillas NO
  // aplica — ninguna misión puede quedar matemáticamente imposible por el límite diario.
  // Al completar el tutorial, el cupo manda como siempre (ancla anti-inflación). El riesgo
  // de acaparar es chico: la plata para comprarlas hay que farmearla a tiempos reales, y
  // solo las siembras "del plan" (contabilidad de la proyección) crecen aceleradas.
  const delPlan = !!(G.tuto && !G.tuto.done);
  if (!delPlan) {
    const left = seedDailyMax() - sb.count;
    if (left <= 0) { toast("Cupo diario de semillas alcanzado (" + seedDailyMax() + ") — volvé mañana"); return; }
    if (qty > left) { qty = left; toast("Cupo diario: solo podés comprar " + left + " más hoy"); }
  }
  const cost = cd.seedCost * qty;
  if (G.plata < cost) { toast("Te falta plata"); return; }
  if (typeof tutoPermite === "function" && !tutoPermite("buyseed")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardia === "function" && !tutoGuardia("plata", cost, "comprar " + cd.label, { semilla: k })) return;   // guardia del tutorial (12/8)
  G.plata -= cost; G.seeds[k] = (G.seeds[k] || 0) + qty;
  if (!delPlan) sb.count += qty;   // 14/8 v5: la compra del plan no consume cupo
  // 13/8: la semilla comprada vuelve a la barra rápida si no estaba (la agotada sale sola)
  if (Array.isArray(G.hotbar) && !G.hotbar.some(h => h && h.kind === "seed" && h.key === k)) {
    const li = G.hotbar.findIndex(h => !h);
    if (li >= 0) { G.hotbar[li] = { kind: "seed", key: k }; if (typeof refreshHotbar === "function") refreshHotbar(true); }
  }
  // 14/8 v4 (dirección: "que se asegure de que cumpla lo que pide"): el evento se dispara
  // POR SEMILLA, no por compra — comprar 1 de 3 deja al capataz diciendo "te faltan 2".
  // Solo cuentan las de PAPA: el paso pide esas.
  if (k === "papa" && typeof tutoEvent === "function") for (let i = 0; i < qty; i++) tutoEvent("buyseed");
  log(`Compraste ${qty} semilla(s) de ${cd.label} por ${cost} plata. (cupo: ${sb.count}/${seedDailyMax()})`); toast("+" + qty + " " + cd.label);
  refreshHud(); if (typeof refreshSeedShop === "function") refreshSeedShop(); if (isOpen("ov-inv")) refreshInv();
}

/* ---- KIT DE EMERGENCIA en $Golden (14/8, pedido del diseñador): "por si se quedan
   atascados" — 5 hachas, 5 usos de pico y 5 semillas de papa POR DÍA, pagando con
   $Golden. Le da utilidad diaria al $Golden y reemplaza a los kits del tutorial como
   válvula anti-atasco después de la guía temprana. Las semillas de acá NO consumen el
   cupo diario (son el rescate, no el mercado). Precios tuneables — validar con diseñador. */
var EMERG_GOLDEN = { axe: 2, pick: 2, seed: 1 };   // $G por unidad
var EMERG_MAX = 5;                                  // tope diario por tipo
function emergBuysToday() {
  const e = G.emergBuys || (G.emergBuys = { date: "", axe: 0, pick: 0, seed: 0 });
  if (e.date !== dayStamp(0)) { e.date = dayStamp(0); e.axe = 0; e.pick = 0; e.seed = 0; }
  return e;
}
function comprarEmergencia(tipo) {
  const precio = EMERG_GOLDEN[tipo]; if (precio == null) return;
  const e = emergBuysToday();
  if ((e[tipo] || 0) >= EMERG_MAX) { toast("Tope diario del kit de emergencia (" + EMERG_MAX + ") — volvé mañana"); return; }
  if (G.golden < precio) { toast("Te faltan $Golden"); return; }
  G.golden -= precio; e[tipo] = (e[tipo] || 0) + 1;
  if (tipo === "axe") { G.tools = G.tools || {}; G.tools.axe = (G.tools.axe || 0) + 1; toast("🆘 +1 hacha"); }
  else if (tipo === "pick") {
    G.picks = G.picks || { owned: {}, dur: {}, eq: null };
    if (!G.picks.eq || !G.picks.owned[G.picks.eq]) { G.picks.owned.stone = true; G.picks.eq = "stone"; G.picks.dur.stone = 0; }
    G.picks.dur[G.picks.eq] = (G.picks.dur[G.picks.eq] || 0) + 1; toast("🆘 +1 pico");   // los picos son apilables como las hachas: 1 pico = 1 picada
  }
  else if (tipo === "seed") { G.seeds.papa = (G.seeds.papa || 0) + 1; toast("🆘 +1 semilla de papa"); }
  log("Kit de emergencia: compraste 1 " + (tipo === "axe" ? "hacha" : tipo === "pick" ? "pico" : "semilla de papa") + " por " + precio + " $Golden (" + e[tipo] + "/" + EMERG_MAX + " hoy).", "warn");
  refreshHud(); if (typeof refreshHotbar === "function") refreshHotbar(true);
  if (typeof refreshSeedShop === "function" && isOpen("ov-market")) refreshSeedShop();
  if (typeof saveFarm === "function") saveFarm();
}

// --- construcción de edificios (detalles viernes 1): recetas para levantar cada edificio ---
const BUILD_DEF = {
  store:  { label: "Herrería",        cost: { madera: 5, piedra: 2 } },   // 10/8: ya no es gratis (pedido del diseñador)
  horno:  { label: "Horno de Piedra", cost: { madera: 10, piedra: 8 },  lvl: 3 },   // doc 2/8: costo early + granja nv 3
  cocina: { label: "Cocina",          cost: { madera: 15, piedra: 8 }, lvl: 5 },   // 14/8 rebalance: era 20+15 (muralla del tutorial medida por sim)
  altar:  { label: "Altar de Runas",  cost: { piedra: 40, madera: 30, oro: 8 }, golden: 20 },   // 14/8 rebalance: era 60+40+20oro+30G (la cadena del oro medía ~700 de plata)
  establo:    { label: "Establo",     cost: { madera: 40, piedra: 25, oro: 6 }, lvl: 6 },   // 14/8 rebalance
  curtiduria: { label: "Curtiduría",  cost: { madera: 35, piedra: 28, oro: 8 }, lvl: 8 },   // 14/8 rebalance
  ofrendas:   { label: "Altar de Ofrendas", cost: { piedra: 60, madera: 45, oro: 12 }, lvl: 10 },   // 14/8 rebalance
};
function buildCostStr(key) { const b = BUILD_DEF[key]; return Object.keys(b.cost).map(k => (b.cost[k]) + " " + (RES_LABEL[k] || k)).join(" + ") + (b.golden ? " + " + b.golden + " $Golden" : ""); }

/* ============ PLANOS Y OBRAS (12/8): construcción al estilo blueprint ============
   Al llegar al nivel ganás el PLANO del edificio (ítem de la bolsa, arte pergamino).
   Lo colocás donde quieras con el "colocar con clic": aparece la OBRA (build_*) con
   los materiales pedidos flotando encima. Cada clic en la obra deposita lo que
   tengas; al completar, estrellitas y pasa al edificio construido.
   El edificio ya NO aparece gris en una posición fija: no existe hasta que colocás
   su plano, y queda donde VOS lo pusiste. */
var PLANO_NIVEL = { store: 2, horno: 3, cocina: 5, establo: 6, altar: 7, curtiduria: 8, ofrendas: 10 };   // nivel en que cae cada plano (números del diseñador · store 1→2 el 14/8: a nivel 1 caía en el SEGUNDO CERO de la partida, antes de aprender nada — el nivel 2 llega cosechando la primera tanda)
function planoTengo(t) { return !!(G.planos && G.planos[t]); }
// 13/8: el plano también vive en la HOTBAR (primer hueco libre) — colocarlo sin abrir la bolsa
function planoAHotbar(t) {
  if (!Array.isArray(G.hotbar)) return;
  if (G.hotbar.some(h => h && h.kind === "plano" && h.key === t)) return;
  const li = G.hotbar.findIndex(h => !h);
  if (li >= 0) { G.hotbar[li] = { kind: "plano", key: t }; if (typeof refreshHotbar === "function") refreshHotbar(true); }
}
function darPlano(t, silencioso) {
  const b = BUILD_DEF[t]; if (!b) return;
  if (G.built && G.built[t]) return;                  // ya construido
  if (G.obras && G.obras[t]) return;                  // la obra ya está colocada
  G.planos = G.planos || {};
  if (G.planos[t]) { planoAHotbar(t); return; }   // 13/8: guardados viejos — asegurar que esté en la barra
  G.planos[t] = 1;
  if (!silencioso) {
    log("¡Ganaste el PLANO de " + b.label + "! Está en tu bolsa: clic para colocarlo donde quieras.", "gold");
    toast("📜 ¡Plano de " + b.label + "!");
    if (window.celebrate) celebrate({ title: "¡PLANO NUEVO!", sub: b.label, big: false, reward: "Colocalo desde tu barra rápida" });
  }
  planoAHotbar(t);
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
// al subir de nivel, al avanzar el tutorial y al cargar. Durante el TUTORIAL (13/8):
// cada plano cae recién cuando SU paso llega — playtest: con TESTEO el nivel corre tan
// rápido que el del Horno caía junto al de la Herrería y el jugador no sabía cuál era cuál.
var PLANO_PASO = { store: "place_store", horno: "place_horno", cocina: "place_cocina", altar: "place_altar" };   // 13/8 v2: el plano cae JUSTO en su paso de colocación
function tutoIdx(id) { return TUTO_STEPS.findIndex(s => s.id === id); }
function planosSync(silencioso) {
  // 14/8 v2 (playtest: "el plano de la Herrería me llegó ANTES de vender las papas"):
  // DURANTE el tutorial, los planos cuyo paso está en la cadena llegan SOLO cuando su
  // misión "colocá el plano" aparece — el momento narrativo correcto. Los planos sin
  // paso en la cadena (Altar, Establo…) y todo el post-tutorial van por NIVEL puro.
  const tutoOn = G.tuto && !G.tuto.done;
  const paso = tutoOn ? (G.tuto.step || 0) : -1;
  for (const t in PLANO_NIVEL) {
    const gate = PLANO_PASO[t];
    const gi = gate ? tutoIdx(gate) : -1;
    if (tutoOn && gi >= 0) { if (paso >= gi) darPlano(t, silencioso); continue; }   // en la cadena: manda el paso
    if (G.level >= PLANO_NIVEL[t]) darPlano(t, silencioso);                          // fuera de la cadena o post-tutorial: manda el nivel
  }
}
// ¿esta acción ya fue presentada por el tutorial? (embudo 13/8: hasta que el paso de una
// acción llega, la acción está cerrada — y una vez llegado, queda abierta para siempre)
function tutoDesbloqueado(stepId) {
  if (!G.tuto || G.tuto.done) return true;
  return (G.tuto.step || 0) >= tutoIdx(stepId);
}

/* ============ EMBUDO ESTRICTO (13/8): en el arranque, SOLO lo que el objetivo pide ==
   Playtest: durante "colocá el plano" se podía plantar, cosechar acelerado, vender,
   talar y picar — puro grindeo fuera de guion. Lista blanca POR PASO para las acciones
   del loop económico (plantar, vender, comprar semillas, talar, picar). Reglas fijas:
   COSECHAR lo ya plantado y trabajar OBRAS se permiten siempre (no generan plata por
   sí solos). Los pasos que no figuran en la tabla (combate en adelante) van libres:
   ahí el juego ya es el juego. */
// TODOS los pasos tienen su lista (13/8, pedido del usuario: estricto total). Cada
// paso permite SU acción + las estrictamente necesarias para cumplirla (craftear
// hachas cuando hay que talar porque se gastan; el loop entero cuando hay que juntar
// plata; cocinar cuando el paso lo pide). Al terminar el tutorial, todo libre.
var TUTO_PERMISOS = {
  // 14/8 v2 (playtest: compró 1 semilla, la plantó, cosechó y quedó BLOQUEADO en "cosechá
  // tus 3"): el cuarteto inicial permite el loop ENTERO — es la fase de enseñanza y las
  // flechas guían el orden; los permisos no pueden exigir 3 papas y a la vez impedir
  // producirlas. Además "harvest" pasó a estar SIEMPRE permitido (ver tutoPermite).
  buyseed:     ["buyseed", "plant", "harvest"],
  plant:       ["plant", "buyseed", "harvest"],
  harvest:     ["harvest", "plant", "buyseed"],
  sell:        ["sell", "harvest", "plant", "buyseed"],
  place_store: ["obra"],
  wood_st:     ["chop", "crafttool", "cultivar"],   // 14/8: cultivar más árboles = juntar en paralelo (anti-tedio)
  stone_st:    ["mine", "crafttool"],
  build_store: ["obra"],
  wood:        ["chop", "crafttool", "cultivar"],
  stone:       ["mine", "crafttool"],
  place_horno: ["obra"],
  build_horno: ["obra"],
  crafttool:   ["crafttool"],
  woodc:       ["chop", "crafttool", "cultivar"],
  stonec:      ["mine", "crafttool"],
  place_cocina: ["obra"],
  build_cocina: ["obra"],
  cook:        ["cook", "plant", "harvest", "buyseed", "chop", "crafttool"],   // 14/8: red por si malgasta el kit de ingredientes
  eat:         ["eat", "cook"],   // 14/8: si vendió su único plato, puede recocinar (el kit repone ingredientes)
  unlockarm:   ["unlockarm", "chop", "mine", "crafttool", "repair"],   // 14/8: el desbloqueo pide 20 madera + 20 piedra — se juntan acá (la plata llega de adelanto)
  craftarm:    ["craftarm"],
  equiparm:    ["equiparm"],
  portal:      ["portal", "cook", "eat"],
  kill:        ["portal", "cook", "eat", "crafttool", "craftarm"],
  kill5:       ["portal", "cook", "eat", "crafttool", "craftarm"],
  fish:        ["fish", "crafttool", "eat"],
  // Fixes.docx 14/8 #2: la cadena del Altar cruza media economía (oro → Pico de Oro →
  // bronce → barras → Horno…), así que sus 4 pasos dejan el loop ENTERO abierto
  place_altar: ["obra", "chop", "mine", "sell", "plant", "harvest", "buyseed", "crafttool", "craftpick", "mat", "plotunlock"],
  stone_al:    ["mine", "crafttool", "craftpick", "mat", "sell", "plant", "harvest", "buyseed", "cultivar"],
  wood_al:     ["chop", "crafttool", "craftpick", "mat", "sell", "plant", "harvest", "buyseed", "cultivar"],
  build_altar: ["obra", "chop", "mine", "sell", "plant", "harvest", "buyseed", "crafttool", "craftpick", "mat", "plotunlock"],
  upgrade:     ["altar", "eat"],
  mat:         ["mat", "chop", "mine", "crafttool"],
  craftpick:   ["craftpick", "mat", "chop", "mine", "crafttool"],   // el pico pide barras del horno
  mineore:     ["mine", "craftpick", "crafttool"],
  dummy:       ["dummy", "eat"],
  unlocknode:  ["chop", "mine", "cultivar", "crafttool"],
  chest:       ["chest", "chop", "crafttool"],   // el cofre pide madera
  invexp:      ["invexp", "sell", "plant", "harvest", "buyseed", "chop", "mine", "crafttool"],   // ampliar pide plata/minerales
  passclaim:   ["passclaim"],
  socket:      ["altar", "eat"],
};
/* 14/8 (dirección, decisión final): los objetivos son una GUÍA OPCIONAL — no restringen
   NADA. El jugador los sigue cuando quiere o los ignora y juega como quiera. tutoPermite
   queda como función (hay ~13 llamadas repartidas) pero siempre dice que sí; la tabla
   TUTO_PERMISOS se conserva como documentación de qué acción enseña cada paso. */
function tutoPermite(tag) { return true; }
function tutoAviso() {
  const sub = (typeof tutoSub === "function") ? tutoSub() : null;
  const st = tutoActivo();
  toast("🎯 Ahora toca: " + (sub ? sub.txt : (st ? tutoTxt(st) : "el objetivo")));
}
/* 13/8 v3 (playtest cocina): "juntá 20 de madera" con CERO hachas no llevaba a ningún lado.
   El tutorial ahora detecta si podés cumplir el paso activo y, si no, antepone un
   SUB-OBJETIVO con su propia guía (cartel + flechas + permisos):
   sin hachas → craftearla en la Herrería → y si falta la plata, vender/plantar papa.
   pico roto → repararlo en la Herrería. Se recalcula solo: al resolverse, vuelve el paso. */
// la CADENA de la plata, eslabón por eslabón: vender lo cosechado → cosechar lo listo →
// esperar lo que crece → plantar lo que hay → comprar semillas → vender materiales.
// Se usa tanto en los pasos "juntá plata" como cuando falta la plata del hacha (13/8 v4).
// v5 (playtest): CON NÚMEROS — el plan calcula la TANDA entera ("comprá 4 semillas") en
// vez de dejar caer al jugador en el ciclo de a una semilla, que era un suplicio.
function tutoSubPlata(prefijo, meta) {
  // todos los eslabones llevan plata:true — el boost de DESVÍO se prende con esa marca.
  // 14/8 (playtest): TODOS los eslabones permiten el loop agrícola COMPLETO — con el boost
  // la papa está lista en ~22 s, el sub saltaba a "cosechá" (que solo permitía cosechar) y
  // te frenaba la tanda a mitad de plantada: bucle de a 1 otra vez. El texto y la flecha
  // GUÍAN el foco; los permisos no estrangulan la mano.
  const falta = Math.max(0, (meta || 0) - Math.floor(G.plata));
  // vender lo cosechado: el de MAYOR precio primero
  const conStock = Object.keys(CROP_DEF || {}).filter(k => (G.res[k] || 0) > 0)
    .sort((a, b) => (CROP_DEF[b].price || 0) - (CROP_DEF[a].price || 0))[0];
  if (conStock) {
    const n = Math.floor(G.res[conStock]), cd = CROP_DEF[conStock];
    const alcanza = meta && (G.plata + n * (cd.price || 0)) >= meta;
    return { plata: true, meta: meta || 0, txt: prefijo + "vendé tus " + n + " " + (cd.label || conStock).toLowerCase() + (n > 1 ? "s" : "") + (alcanza ? " — con eso alcanza" : ""),
      target: "market", panel: "ov-market", ui: "#vb-" + conStock, permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  }
  const plots = Array.isArray(G.plots) ? G.plots : [];
  const listos = plots.filter(p => p && p.state === "ready").length;
  if (listos) return { plata: true, meta: meta || 0, txt: prefijo + "cosechá tus " + listos + " cultivo" + (listos > 1 ? "s" : "") + " listo" + (listos > 1 ? "s" : ""),
    target: "plot", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  // Fixes.docx 14/8 #3: comprar más semillas sigue permitido en estos eslabones — antes,
  // al comprar UNA el sub saltaba a "plantá" y bloqueaba el resto de la tanda (de a 1, feo)
  if (plots.some(p => p && p.state === "growing")) return { plata: true, meta: meta || 0, txt: prefijo + "tus cultivos están creciendo — cosechalos apenas estén",
    target: "plot", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  const semillas = Object.keys(G.seeds || {}).reduce((a, k) => a + Math.floor(G.seeds[k] || 0), 0);
  if (semillas) return { plata: true, meta: meta || 0, txt: prefijo + "plantá tus " + semillas + " semilla" + (semillas > 1 ? "s" : ""),
    target: "plot", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  // 14/8 (dirección): el plan elige el MEJOR cultivo desbloqueado (mayor ganancia neta por
  // semilla) — cebolla rinde 10 netos contra 2 de la papa: 4-5 tandas en vez de 20. Con el
  // boost de desvío todos crecen acelerados, no solo la papa.
  let mejor = "papa";
  for (const k in CROP_DEF) {
    const cd = CROP_DEF[k];
    const abierta = (typeof cropUnlocked === "function") ? cropUnlocked(k) : k === "papa";
    if (!abierta || G.plata < (cd.seedCost || 1)) continue;
    if (((cd.price || 0) - (cd.seedCost || 0)) > ((CROP_DEF[mejor].price || 0) - (CROP_DEF[mejor].seedCost || 0))) mejor = k;
  }
  const cd = CROP_DEF[mejor] || {};
  const precio = cd.seedCost || 1, gana = Math.max(1, (cd.price || 3) - precio);
  if (G.plata >= precio) {
    // la tanda ÚTIL: las que hagan falta para llegar a la meta, tope en lo que alcanza la plata
    const utiles = falta ? Math.ceil(falta / gana) : 3;
    const n = Math.max(1, Math.min(Math.floor(G.plata / precio), utiles));
    const deUna = falta && (G.plata - n * precio + n * (cd.price || 3)) >= meta;
    const nom = (cd.label || mejor).toLowerCase();
    const accion = n > 1 ? "comprá " + n + " semillas de " + nom + " de UNA y plantalas todas" : "comprá 1 semilla de " + nom + " y plantala";
    return { plata: true, meta: meta || 0, txt: prefijo + accion + (deUna ? " — una tanda y alcanza" : ""),
      target: "market", panel: "ov-market", ui: "[data-buy='" + mejor + "']", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock"] };
  }
  return { plata: true, meta: meta || 0, txt: prefijo + "vendé lo que tengas suelto en el Mercado (el guardia protege lo del objetivo)",
    target: "market", panel: "ov-market", ui: "#shop-sell", permite: ["plant", "harvest", "sell", "buyseed", "plotunlock", "chop", "mine"] };
}
function tutoSub() {
  const st = tutoActivo(); if (!st) return null;
  // paso "juntá plata": si no hay NADA cosechado para vender, guiar al eslabón anterior
  // (playtest: "vendé tus papas" apuntando al Mercado con cero papas en la bolsa)
  if (st.res === "plata") {
    const hayCosecha = Object.keys(CROP_DEF || {}).some(k => (G.res[k] || 0) > 0);
    return hayCosecha ? null : tutoSubPlata("Para esa plata: ", tutoNeed(st));   // con cosecha, el paso ya te manda a vender
  }
  // 14/8 (dirección): en los pasos "juntá madera" el plan cubre el paso ENTERO — se
  // calculan las hachas que faltan para TODA la meta (1 tala = 1 uso) y se junta la plata
  // COMPLETA de una tanda, en vez de rebotar de a 10 en 10 (talar → rota → papa → craftear)
  if (st.res === "madera" && typeof toolCount === "function") {
    if (!(G.built && G.built.store)) return null;   // fase pre-Herrería: con las hachas de arranque alcanza
    const falta = Math.max(0, tutoNeed(st) - tutoTiene(st));
    const hachas = Math.max(0, falta - toolCount("axe"));
    if (hachas > 0) {
      const costo = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
      const plataNec = hachas * costo;
      if (G.plata >= plataNec) return { txt: "Crafteá tus " + hachas + " hacha" + (hachas > 1 ? "s" : "") + " de UNA (" + plataNec + " de plata" + (hachas >= 5 ? ", usá el botón ×5" : "") + ")",
        target: "store", panel: "ov-forge", ui: hachas >= 5 ? "[data-ctool5='axe']" : "[data-ctool='axe']", permite: ["crafttool"] };
      return tutoSubPlata("Te faltan " + hachas + " hachas (" + plataNec + " de plata): ", plataNec);
    }
    return null;   // hachas alcanzan para toda la meta: a talar
  }
  // 14/8 v2: planificador de PIEDRA como red de seguridad (el kit del adelanto ya entrega
  // los usos de pico al entrar al paso — esto solo salta si se drenaron, p.ej. picando
  // vetas de mineral). OJO: el pico NO se repara — a 0 usos se DESTRUYE (destroyPick); un
  // Pico de Piedra nuevo sale 3 madera + 10 plata por UN uso. La cadena: craftear picos →
  // sin plata, su plan → sin madera libre (la de la obra no se toca), talar.
  if (st.res === "piedra") {
    if (!(G.built && G.built.store)) return null;   // fase pre-Herrería: el pico de arranque alcanza
    const falta = Math.max(0, tutoNeed(st) - tutoTiene(st));
    const eq = (G.picks && G.picks.eq) || null;
    const usos = eq ? Math.floor((G.picks.dur && G.picks.dur[eq]) || 0) : 0;
    const picos = Math.max(0, falta - usos);   // picos de piedra a craftear (1 uso cada uno)
    if (picos <= 0) return null;               // el pico aguanta toda la meta: a picar
    const pd = (typeof PICK_DEF !== "undefined" && PICK_DEF.stone) || { cost: { madera: 3 }, plata: 10 };
    const plataNec = picos * (pd.plata || 10);
    const madNecT = picos * ((pd.cost && pd.cost.madera) || 3);
    let reservada = 0;
    if (st.dep && typeof obraDe === "function" && obraDe(st.dep) && typeof obraFalta === "function") {
      const f = obraFalta(st.dep).find(x => x[0] === "madera"); if (f) reservada = f[1];
    }
    const libre = Math.max(0, Math.floor(G.res.madera || 0) - reservada);
    if (libre >= madNecT && G.plata >= plataNec) return { txt: "Crafteá " + picos + " Pico" + (picos > 1 ? "s" : "") + " de Piedra (" + madNecT + " madera + " + plataNec + " de plata" + (picos >= 5 ? ", botón ×5" : "") + ")",
      target: "store", panel: "ov-forge", ui: picos >= 5 ? "[data-craft5='stone']" : "[data-craft='stone']", permite: ["craftpick", "mine", "chop", "crafttool"] };
    if (G.plata < plataNec) return tutoSubPlata("Para " + picos + " picos (" + plataNec + " de plata): ", plataNec);
    // plata alcanza pero falta madera LIBRE: talar (con hachas o su plan)
    const madFalta = madNecT - libre;
    const hachas = Math.max(0, madFalta - toolCount("axe"));
    if (hachas > 0) {
      const costoHacha = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
      const plataHachas = hachas * costoHacha;
      if (G.plata >= plataNec + plataHachas) return { txt: "Para los picos falta madera: crafteá " + hachas + " hacha" + (hachas > 1 ? "s" : "") + " (" + plataHachas + " de plata" + (hachas >= 5 ? ", botón ×5" : "") + ")",
        target: "store", panel: "ov-forge", ui: hachas >= 5 ? "[data-ctool5='axe']" : "[data-ctool='axe']", permite: ["crafttool", "chop", "craftpick", "mine"] };
      return tutoSubPlata("Para los picos y sus hachas (" + (plataNec + plataHachas) + " de plata): ", plataNec + plataHachas);
    }
    return { txt: "Talá " + madFalta + " árbol" + (madFalta > 1 ? "es" : "") + " — madera para los picos (lo de la obra no se toca)",
      target: "tree", permite: ["chop", "crafttool", "craftpick", "mine"] };
  }
  // 14/8 (sim escrita, traba 1): el paso del Hacha con 9 de plata era un muro de 9 min —
  // ahora tiene su sub de plata (meta 10) y la siembra del plan corre acelerada
  if (st.id === "crafttool") {
    const costo = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
    if (G.plata < costo) return tutoSubPlata("Para el Hacha (" + costo + " de plata): ", costo);
    return null;
  }
  const quiereTalar = st.id === "unlocknode" || st.id === "chest";
  if (quiereTalar && typeof toolCount === "function" && toolCount("axe") <= 0) {
    if (!(G.built && G.built.store)) return null;
    const plata = (TOOL_CRAFT && TOOL_CRAFT.axe && TOOL_CRAFT.axe.plata) || 10;
    if (G.plata < plata) return tutoSubPlata("Sin hachas (cuesta " + plata + " de plata): ", plata);
    return { txt: "Te quedaste sin hachas: crafteá una en la Herrería (" + plata + " de plata)",
      target: "store", panel: "ov-forge", ui: "[data-ctool='axe']", permite: ["crafttool"] };
  }
  return null;
}
function obraDe(t) { return G.obras && G.obras[t]; }
function obraColocar(t, col, row, vivo) {   // la llama la escena con la celda elegida
  if (!planoTengo(t)) return false;
  delete G.planos[t];
  // 13/8: el plano usado sale de la hotbar (entró solo al ganarlo)
  if (Array.isArray(G.hotbar)) G.hotbar = G.hotbar.map(h => (h && h.kind === "plano" && h.key === t) ? null : h);
  G.obras = G.obras || {}; G.obras[t] = { col, row };   // la posición queda para SIEMPRE (también construido)
  G.obraDep = G.obraDep || {}; G.obraDep[t] = G.obraDep[t] || {};
  if (typeof syncSlots === "function") syncSlots();
  if (typeof tutoEvent === "function") tutoEvent("place_" + t);   // 13/8: paso "colocá el plano" desglosado
  if (typeof saveFarm === "function") saveFarm(true);
  if (typeof refreshHotbar === "function") refreshHotbar(true);
  // 13/8: si la escena puede dibujar la obra EN VIVO ya no se reinicia (chau telón oscuro);
  // el reinicio con fundido queda solo de respaldo
  if (!vivo) reiniciarGranjaSuave();
  return true;
}
// el reinicio de escena reconstruye ~570 sprites y se sentía como un CONGELAMIENTO (13/8).
// Con el telón de 160 ms del fundido que ya existe, el mismo parpadeo se lee como transición.
function reiniciarGranjaSuave() {
  const fade = document.getElementById("fadeblk");
  const reiniciar = () => { if (window.FARM && window.FARM.scene) { try { window.FARM.scene.restart(); } catch (e) {} } };
  if (!fade) { reiniciar(); return; }
  fade.style.transitionDuration = "160ms";
  fade.classList.add("on");
  setTimeout(() => { reiniciar(); setTimeout(() => fade.classList.remove("on"), 120); }, 170);
}
// qué falta depositar: [recurso, falta, total, puesto] — el $Golden cuenta como recurso más
function obraFalta(t) {
  const b = BUILD_DEF[t], dep = (G.obraDep && G.obraDep[t]) || {}, out = [];
  for (const r in b.cost) { const f = b.cost[r] - (dep[r] || 0); if (f > 0) out.push([r, f, b.cost[r], dep[r] || 0]); }
  if (b.golden) { const f = b.golden - (dep.golden || 0); if (f > 0) out.push(["golden", f, b.golden, dep.golden || 0]); }
  return out;
}
function obraDepositar(t) {   // devuelve true si con este depósito quedó COMPLETA
  const b = BUILD_DEF[t]; if (!b || !obraDe(t)) return false;
  // 14/8: durante el tutorial manda el PASO, no el nivel — misma regla que la entrega del
  // plano (planosSync): con el embudo estricto no hay forma de subir de nivel para destrabar
  const tutoOn = G.tuto && !G.tuto.done;
  if (!tutoOn && b.lvl && G.level < b.lvl) { toast(b.label + " pide granja nivel " + b.lvl); return false; }
  G.obraDep = G.obraDep || {}; const dep = G.obraDep[t] = G.obraDep[t] || {};
  const puso = [];
  for (const [r, falta] of obraFalta(t)) {
    const tengo = r === "golden" ? G.golden : Math.floor(G.res[r] || 0);
    const n = Math.min(falta, tengo);
    if (n <= 0) continue;
    if (r === "golden") G.golden -= n; else G.res[r] -= n;
    dep[r] = (dep[r] || 0) + n;
    puso.push("+" + n + " " + (r === "golden" ? "$Golden" : (RES_LABEL[r] || r)));
  }
  if (!puso.length) {
    toast("Te falta: " + obraFalta(t).map(x => x[1] + " " + (x[0] === "golden" ? "$Golden" : (RES_LABEL[x[0]] || x[0]))).join(" · "));
    return false;
  }
  toast("Depositaste " + puso.join(" · "));
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm(true);
  return obraFalta(t).length === 0;
}
function obraConstruir(t) {   // la llama la escena cuando el depósito se completó
  const b = BUILD_DEF[t];
  G.built[t] = true;
  if (G.obraDep) delete G.obraDep[t];
  if (typeof tutoEvent === "function") tutoEvent("build_" + t);
  addXp("crafting", 20);
  log("¡Construiste " + b.label + "!", "gold"); toast("¡" + b.label + " construida!");
  if (window.celebrate) celebrate({ title: "¡CONSTRUIDA!", sub: b.label, big: false, reward: "Ya está funcionando" });
  refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
}

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
// ---- EDIFICIOS NIVEL 2 (recompensas de granja 17 / 21 / 27) ----
var EDIF2_HORNO = 40;    // % que se acorta el enfriamiento del Horno
var EDIF2_COCINA = 30;   // % que se acortan las cocciones
var EDIF2_COCINA_OLLA = 1;   // ollas extra de la Cocina
var EDIF2_ALTAR = 5;     // puntos de éxito extra en cada intento del Altar
function edif2(k) { return !!(G.edif2 && G.edif2[k]); }
function hornoCdMs() { return MAT_CD_MS * (edif2("horno") ? 1 - EDIF2_HORNO / 100 : 1); }
function cocinaFactor() { return edif2("cocina") ? 1 - EDIF2_COCINA / 100 : 1; }
function altarBonoExito() { return edif2("altar") ? EDIF2_ALTAR : 0; }
function matCdLeft(id) { G.matCd = G.matCd || {}; return Math.max(0, (G.matCd[id] || 0) - nowMs()); }
// crafteo en LOTE genérico: repite la acción hasta N veces y corta si ya no se puede (doc 2/8)
function craftLote(fn, id, n) {
  n = Math.max(1, n || 1);
  for (let i = 0; i < n; i++) {
    const antes = JSON.stringify([G.res, G.plata, G.golden, G.picks && G.picks.dur, G.weapons]);
    fn(id);
    if (JSON.stringify([G.res, G.plata, G.golden, G.picks && G.picks.dur, G.weapons]) === antes) break;   // no cambió nada: faltan materiales o hay enfriamiento
  }
}
function craftMat(id) {
  const md = MAT_DEF[id]; if (!md) return;
  const left = matCdLeft(id);
  if (left > 0) { toast(md.label + " en enfriamiento (" + Math.ceil(left / 1000) + "s)"); return; }
  if (!canAfford(md.cost)) { toast("Te faltan materiales"); return; }
  if (!roomForRes(id, 1)) { bagFull("craftear " + md.label); return; }
  if (typeof tutoPermite === "function" && !tutoPermite("mat")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(md.cost, 0, "fundir " + md.label)) return;   // guardia del tutorial (12/8)
  payCost(md.cost); G.res[id] = (G.res[id] || 0) + 1;
  G.matCd[id] = nowMs() + hornoCdMs();   // 14/8 v3: el horno ya no está en la cadena del tutorial — tiempo real siempre
  addXp("crafting", 3); log("Fundiste 1 " + md.label + " en el Horno.", "good"); toast("+1 " + md.label);
  if (typeof tutoEvent === "function") tutoEvent("mat");
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
// CURAR NO ES GRATIS (10/8). Antes, cada vez que la vida MÁXIMA subía se regalaba la
// diferencia como vida actual. Como se llama al equipar, alcanzaba con desequipar y volver a
// equipar un arma con Runa Guardiana (+120 de vida máx.) para curarse 120 de golpe, cuantas
// veces quisieras: la comida y el riesgo de la Zona Negra dejaban de existir.
// Ahora la vida máxima se recalcula igual, pero NO se regala vida. La única que cura sola es
// la subida de nivel de Combate, y eso lo hace addCombatXp a mano con curarPorNivel().
function applyCombatHp() {   // vida máxima = 100 + hitos de Combate (nivel 5 y 10)
  const want = 100 + combatHpBonus(combatInfo().lvl) + G.buffs.reduce((s, b) => s + (b.type === "hpmax" && b.on ? b.mult : 0), 0) + (typeof eqRunaVal === "function" && typeof armaEq === "function" ? eqRunaVal("guardiana") : 0) + (typeof armorBonoVal === "function" ? armorBonoVal("hpmax") : 0);
  if (G.hpMax !== want) { G.hpMax = want; G.hp = Math.min(G.hpMax, G.hp); }
}
// subir de nivel de Combate sí cura lo que sumó de vida máxima (es una recompensa, no un bucle)
function curarPorNivel(cuanto) { if (cuanto > 0) G.hp = Math.min(G.hpMax, (G.hp || 0) + cuanto); }
function addCombatXp(xp) {
  xp = Math.round(xp * combatXpMult());   // Guiso Campestre: +% XP de combate
  const before = combatInfo().lvl;
  G.combatXp = (G.combatXp || 0) + xp;
  const after = combatInfo().lvl;
  if (after > before) {
    const gano = combatHpBonus(after) - combatHpBonus(before);
    applyCombatHp();
    curarPorNivel(gano);   // el hito de nivel sí regala la vida que sumó
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
  if (sk === "farming" || sk === "mining" || sk === "fishing") recalcFarmLevel();   // la XP de granja y las tareas pueden habilitar el nivel
  if (typeof passEvent === "function") passEvent(sk);   // misiones del Pase de Batalla
  if (isOpen("ov-skills")) refreshSkills();
}
function addCookXp(amt) {
  amt = Math.round(amt * (1 + buffTotal("cookxp") / 100));   // Pan de Trigo: +% XP de cocina
  const before = cookLevel();
  G.skills.cooking = (G.skills.cooking || 0) + amt;
  const after = cookLevel();
  if (typeof passEvent === "function") passEvent("cooking");   // misión "cociná" del Pase
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
// DOC "2das mejoras" (4/8): la granja llega a NIVEL 50. Del 1 al 10 se sube solo con XP de cosecha;
// del 11 al 50 hace falta la XP Y cumplir TAREAS (plantar, talar, minar, matar, pescar, cocinar).
// 14/8 (dirección): los primeros 10 niveles ~2.5× más lentos — con la curva vieja el nivel
// 3 eran 4 papas y el 5 eran 24: los PLANOS llovían a la barra en los primeros 5 minutos.
// Ahora nivel 2 = 3 papas, nivel 3 = 10, nivel 5 = ~60 (o menos con cultivos mejores).
// Del 11 en adelante la tabla original del diseñador sigue igual.
var FARM_XP_LVLS = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000,
  17600, 25100, 33600, 43300, 54200, 66500, 80400, 96000, 114000, 134000,
  156000, 180000, 207000, 237000, 270000, 307000, 348000, 393000, 442000, 496000,
  555000, 619000, 689000, 765000, 848000, 938000, 1030000, 1130000, 1240000, 1360000,
  1490000, 1630000, 1780000, 1940000, 2110000, 2290000, 2480000, 2680000, 2890000, 3110000];
const FARM_NIVEL_MAX = 50;
// tareas por nivel: [tipo, clave, cantidad] · tipos: plantar/talar/minar/matar/pescar/cocinar
const FARM_TAREAS = {
  11: [["plantar","repollo",20],["talar",null,30]],
  12: [["minar","bronce",25],["matar","rata",25]],
  13: [["plantar","calabaza",25],["matar","larva",20]],
  14: [["talar",null,40],["matar","murcielago",20]],
  15: [["plantar","brocoli",30],["minar","hierro",30]],
  16: [["matar","baba",30],["pescar",null,20]],
  17: [["plantar","calabaza",35],["minar","bronce",35]],
  18: [["matar","arana",25],["matar","goblin",25],["talar",null,50]],
  19: [["cocinar",null,20],["minar","hierro",40]],
  20: [["plantar","calabaza",40],["matar","orco",30],["matar","rata",20]],
  21: [["plantar","girasol",30],["minar","oro",40]],
  22: [["matar","lancero",30],["talar",null,60]],
  23: [["matar","esqueleto",25],["pescar",null,30]],
  24: [["plantar","girasol",35],["minar","oro",30]],
  25: [["matar","golem",20],["cocinar",null,25]],
  26: [["plantar","trigo",25],["minar","oro",45]],
  27: [["matar","hombre_lobo",25],["talar",null,80]],
  28: [["minar","diamante",30],["matar","guerrero",30]],
  29: [["plantar","trigo",30],["pescar",null,40]],
  30: [["matar","troll",30],["matar","ogro",20],["minar","diamante",35]],
  31: [["plantar","trigo",35],["minar","diamante",40]],
  32: [["matar","ogro",30],["talar",null,100]],
  33: [["cocinar",null,40],["minar","diamante",45]],
  34: [["matar","espectro",25],["plantar","trigo",30]],
  35: [["minar","diamante",50],["matar","ogro",30]],
  36: [["plantar","maiz",30],["matar","espectro",30]],
  37: [["minar","netherita",20],["talar",null,120]],
  38: [["matar","demonio",25],["cocinar",null,50]],
  39: [["plantar","maiz",35],["minar","netherita",25]],
  40: [["matar","demonio",30],["minar","netherita",30]],
  41: [["plantar","maiz",40],["pescar",null,60]],
  42: [["matar","espectro",40],["matar","demonio",20],["minar","netherita",35]],
  43: [["minar","netherita",40],["talar",null,150]],
  44: [["matar","dragon",1],["plantar","maiz",40]],
  45: [["minar","netherita",45],["matar","demonio",30]],
  46: [["plantar","maiz",50],["matar","dragon",2]],
  47: [["minar","netherita",50],["cocinar",null,80]],
  48: [["matar","dragon",3],["minar","netherita",55]],
  49: [["plantar","maiz",60],["matar","demonio",50],["matar","dragon",5]],
  50: [["matar","dragon",5],["minar","netherita",70],["plantar","maiz",80]],
};
// recompensas: parcela (nº), cofre (+capacidad), edificio nivel 2, y cosméticos (título/decoración/emote/marco/skin/aura)
const FARM_UNLOCK = {
  2: "3ª parcela GRATIS", 3: "Horno básico disponible", 4: "4ª parcela GRATIS", 5: "Cocina disponible",
  6: "5ª parcela GRATIS", 7: "6ª parcela GRATIS", 8: "Cultivo Girasol", 9: "Cultivo Trigo", 10: "Cultivo Maíz",
  11: "Decoración de granja", 12: "7ª parcela", 13: "+10 de capacidad de cofre", 14: "Marco de perfil",
  15: "Título 'Granjero Experto'", 16: "Decoración", 17: "Horno nivel 2 (más rápido)", 18: "8ª parcela",
  19: "Emote", 20: "Título 'Maestro de Cultivos' + decoración exclusiva", 21: "Cocina nivel 2 (más rápida)",
  22: "Decoración", 23: "+10 de capacidad de cofre", 24: "Marco de perfil", 25: "9ª parcela + Título 'Veterano'",
  26: "Decoración", 27: "Altar de Runas nivel 2", 28: "Emote", 29: "Decoración",
  30: "Título 'Leyenda Naciente' + aura menor", 31: "Decoración", 32: "Marco de perfil", 33: "+15 de capacidad de cofre",
  34: "Decoración", 35: "10ª parcela + Título 'Amo de la Granja'", 36: "Decoración", 37: "Skin de herramienta",
  38: "Emote", 39: "Decoración", 40: "Título 'Señor de la Cosecha' + aura", 41: "Decoración", 42: "Marco de perfil",
  43: "Skin de granjero", 44: "Decoración", 45: "11ª parcela + Título 'Élite'", 46: "Decoración",
  47: "Skin de arma", 48: "Emote", 49: "Decoración",
  50: "12ª parcela + Título 'Leyenda de la Granja Dorada' + AURA DORADA + skin de granja legendaria",
};
const FARM_PARCELA = { 2:3, 4:4, 6:5, 7:6, 12:7, 18:8, 25:9, 35:10, 45:11, 50:12 };   // nivel → parcelas totales
const FARM_COFRE   = { 13:10, 23:10, 33:15 };                                          // nivel → capacidad extra de cofre
const FARM_EDIF2   = { 17:"horno", 21:"cocina", 27:"altar" };                          // nivel → edificio que sube a nivel 2

// ---- contadores de tareas (se guardan) ----
function statAdd(tipo, key, n) {
  G.stats = G.stats || {};
  const t = G.stats[tipo] = G.stats[tipo] || {};
  const k = key || "_";
  t[k] = (t[k] || 0) + (n || 1);
  // las tareas de nivel 11-50 se cumplen ACÁ (matar, cocinar, talar…), así que el nivel se revisa acá:
  // antes solo se revisaba con XP de cultivo/minería/pesca y los niveles de solo-combate quedaban trabados.
  if (typeof recalcFarmLevel === "function") recalcFarmLevel();
  if (typeof refreshBarn === "function" && isOpen("ov-barn")) refreshBarn();
}
function statGet(tipo, key) { return ((G.stats && G.stats[tipo] && G.stats[tipo][key || "_"]) || 0); }
function statBase(tipo, key) { return ((G.statsBase && G.statsBase[tipo] && G.statsBase[tipo][key || "_"]) || 0); }
function tareaProgreso(t) { return Math.max(0, statGet(t[0], t[1]) - statBase(t[0], t[1])); }   // cuenta desde que llegaste al nivel actual
function tareasDelNivel(nv) { return FARM_TAREAS[nv] || []; }
function tareasCumplidas(nv) { return tareasDelNivel(nv).every(t => tareaProgreso(t) >= t[2]); }
function snapshotTareas() { G.statsBase = JSON.parse(JSON.stringify(G.stats || {})); }
const TAREA_TXT = { plantar: "Plantar", talar: "Talar madera", minar: "Minar", matar: "Vencer", pescar: "Pescar", cocinar: "Cocinar platos" };
function tareaLabel(t) {
  const [tipo, key, n] = t;
  if (tipo === "plantar") return "Plantar " + n + " " + ((CROP_DEF[key] && CROP_DEF[key].label) || key);
  if (tipo === "minar")   return "Minar " + n + " de " + (RES_LABEL[key] || key);
  if (tipo === "matar")   return "Vencer " + n + " " + ((MONSTER_DEF[key] && MONSTER_DEF[key].label) || key);
  if (tipo === "talar")   return "Talar " + n + " de madera";
  if (tipo === "pescar")  return "Pescar " + n + " peces";
  if (tipo === "cocinar") return "Cocinar " + n + " platos";
  return tipo + " " + n;
}
function farmPuedeSubir() {   // ¿se puede pasar al nivel siguiente ahora mismo?
  const nv = G.level + 1;
  if (nv > FARM_NIVEL_MAX) return false;
  if ((G.skills.farming || 0) < (FARM_XP_LVLS[nv] || Infinity)) return false;
  return tareasCumplidas(nv);   // del 11 en adelante hay tareas; del 1 al 10 la lista está vacía
}
var _recalcFarm = false;
function recalcFarmLevel() {
  if (_recalcFarm) return;   // candado: subir de nivel refresca el HUD, y el HUD vuelve a llamar acá
  _recalcFarm = true;
  try { recalcFarmLevelInterno(); } finally { _recalcFarm = false; }
}
function recalcFarmLevelInterno() {
  let subio = false;
  while (farmPuedeSubir()) {
    G.level++; subio = true;
    const gift = FARM_UNLOCK[G.level] || "";
    if (FARM_PARCELA[G.level]) G.plotsOwned = Math.max(G.plotsOwned || 2, FARM_PARCELA[G.level]);
    if (FARM_COFRE[G.level]) G.chestCap = (G.chestCap || 0) + FARM_COFRE[G.level];
    if (FARM_EDIF2[G.level]) { G.edif2 = G.edif2 || {}; G.edif2[FARM_EDIF2[G.level]] = true; }
    if (gift && /Título|aura|AURA|Skin|Marco|Emote|Decoración/.test(gift)) { G.cosmeticos = G.cosmeticos || []; G.cosmeticos.push("Nivel " + G.level + ": " + gift); }
    snapshotTareas();   // las tareas del próximo nivel se cuentan desde cero
    log(`¡GRANJA NIVEL ${G.level}!` + (gift ? " Desbloqueaste: " + gift + "." : ""), "gold");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + G.level + "!", sub: "Granja", big: true, reward: gift || "" });
    else { toast("¡Granja nivel " + G.level + "!" + (gift ? " " + gift : "")); if (window.sfx) sfx("level"); }
    if (typeof window.onFarmLevelUp === "function") window.onFarmLevelUp(G.level, gift);
    if (window.farmScene && window.farmScene.refreshPlotLocks) { try { window.farmScene.refreshPlotLocks(); } catch (e) {} }   // la parcela regalada se abre en el acto
    if (typeof planosSync === "function") planosSync(false);   // 12/8: el nivel te regala el PLANO del edificio que toca
  }
  if (typeof refreshBarn === "function" && isOpen("ov-barn")) refreshBarn();
  refreshHud();
  if (subio && typeof saveFarm === "function") saveFarm(true);
}
function levelUp() { toast("El nivel sube cosechando (XP de Farmeo)"); }
function prestige() {
  if (G.level < FARM_NIVEL_MAX) { toast("Llegá a nivel " + FARM_NIVEL_MAX); return; }
  G.prestige++; G.level = 1;
  G.skills.farming = 0;            // si no se resetea, el próximo addXp volvía a nivel 10 de golpe
  G.stats = {}; G.statsBase = {};  // las tareas de nivel arrancan de cero otra vez
  for (const k in G.res) G.res[k] = 0;
  log(`Reinicio. Prestigio ${G.prestige}.`, "gold"); toast("Prestigio " + G.prestige + "!");
  if (typeof refreshBarn === "function") refreshBarn();
  refreshHud();
  if (typeof saveFarm === "function") saveFarm(true);
}

// --- minerales y picos ---
const ORE_ORDER = ["piedra","bronce","hierro","oro","diamante","netherita"];
const ORE_DEF = {
  piedra:   { tier:0, label:"Piedra",    emoji:"🪨", sprite:"node_stone",     cd:7200,  yield:1, price:6 },
  bronce:   { tier:1, label:"Bronce",    emoji:"🟫", sprite:"node_bronze",    cd:28800,  yield:1, price:12 },
  hierro:   { tier:2, label:"Hierro",    emoji:"⛓️", sprite:"node_iron",      cd:43200,  yield:1, price:15 },   // viernes (2): lo mina el Pico de Hierro
  oro:      { tier:3, label:"Oro",       emoji:"🟡", sprite:"node_gold",      cd:50400,  yield:1, price:30 },
  diamante: { tier:4, label:"Diamante",  emoji:"💎", sprite:"node_diamond",   cd:50400, yield:1, price:80 },
  netherita:{ tier:5, label:"Netherita", emoji:"🔶", sprite:"node_netherite", cd:50400, yield:1, price:200 },
};
const PICK_ORDER = ["stone","bronze","iron","gold","diamond","netherite"];
const PICK_DEF = {
  // modelo SFL puro (31/7): 1 uso por pico, costos baratos (material del tier anterior + madera + monedas)
  // costos "detalles viernes (2)"; el Pico de Bronce no figura en el doc y se interpola
  stone:    { tier:0, label:"Pico de Piedra",    mineTier:0, dur:1, cost:{madera:2},            plata:6,   sprite:"pick_stone" },   // 14/8: era 3 madera + 10
  bronze:   { tier:1, label:"Pico de Bronce",    mineTier:1, dur:1, cost:{madera:3,piedra:4},   plata:8,   sprite:"pick_bronze" },   // 14/8 rebalance (era 4+5+10)
  iron:     { tier:2, label:"Pico de Hierro",    mineTier:2, dur:1, cost:{madera:3,piedra:5},   plata:10,  sprite:"pick_iron" },
  gold:     { tier:3, label:"Pico de Oro",       mineTier:3, dur:1, cost:{madera:3,bronce:3},   plata:20,  sprite:"pick_gold" },   // 14/8: era 5 bronce + 35 (cadena del Altar)
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
  const pd = PICK_DEF[id]; if (!pd) return;
  if (pickCount(id) >= 99) { toast("Máximo 99 " + pd.label); return; }
  if (typeof tutoPermite === "function" && !tutoPermite("craftpick")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(pd.cost, pd.plata, "craftear " + pd.label)) return;   // guardia del tutorial (12/8)
  if (!canAfford(pd.cost)) { toast("Te faltan materiales"); return; }
  if (pd.plata && G.plata < pd.plata) { toast("Te falta plata"); return; }
  payCost(pd.cost); if (pd.plata) G.plata -= pd.plata;
  const first = !G.picks.owned[id];
  G.picks.owned[id] = true; G.picks.dur[id] = pickCount(id) + 1;
  if (first || !G.picks.eq) G.picks.eq = id;
  addXp("crafting", 10 + pd.tier * 4);
  if (typeof tutoEvent === "function") { tutoEvent("crafttool"); tutoEvent("craftpick"); }
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
// 14/8 (dirección): los picos NO se reparan — son apilables como las hachas (1 pico = 1
// picada, se craftean más). Reparar "el stock" ponía dur=1 y te DESTRUÍA la pila entera.
function repairPick(id) { toast("Los picos no se reparan — crafteá más en la Herrería"); }
function equipPick(id) { if (!G.picks.owned[id]){ toast("No lo tenés"); return; } G.picks.eq=id; log("Equipaste "+PICK_DEF[id].label+".");  toast("Equipado"); refreshForge(); refreshInv(); }

// --- herramientas (hacha + caña con durabilidad; el pico se maneja aparte) ---
const TOOL_DEF = {
  axe:   { label:"Hacha",            emoji:"🪓", sprite:"axe",         max:1, repair:{madera:6} },   // SFL puro: 1 uso = 1 talada
  rod:   { label:"Caña",             emoji:"🎣", sprite:"fishing_rod", max:1, repair:{madera:4} },   // SFL puro: 1 uso = 1 pesca
  sword: { label:"Espada de Hierro", emoji:"⚔️", sprite:"sword",       max:80, repair:{bronce:2} },
  sword_wood: { label:"Espada de Madera", emoji:"🗡️", sprite:"sword_wood", max:40, repair:{madera:2} },   // viernes (2): arma inicial
  bow:   { label:"Arco",             emoji:"🏹", sprite:"bow",         max:60, repair:{madera:5} },
};

// ================= TUTORIAL GUIADO (doc maestro 2/8 §3.2): micro-objetivos de los primeros minutos =================
// Cadena de metas cortas, cada una con tilde + sonido + celebración al final. "El cambio de mayor impacto del doc".
// CADENA de objetivos: cada paso deja al jugador con lo que necesita el siguiente.
//   txt   = meta ("#" se reemplaza por la cantidad real)
//   n     = repeticiones de la acción · res = paso de RECURSO (se cumple al TENER esa cantidad)
//   need  = cantidad exacta que pide el paso siguiente (sale de las recetas reales del juego)
//   target= a qué apunta la flecha en el mundo · panel/ui = qué botón se resalta dentro de la ventana
const TUTO_STEPS = [
  // 14/8 (dirección): el arranque enseña el ciclo COMPLETO en su orden natural — nacés con
  // 3 de plata (no con semillas): comprá → plantá → cosechá → vendé. Con eso el loop quedó
  // aprendido y no se vuelve a pedir: de acá en más la plata repetitiva llega de PREMIO.
  // 14/8 v4: los CUATRO pasos del arranque verifican CANTIDADES (3/3/3/3) — el capataz
  // no avanza hasta que compraste, plantaste, cosechaste y vendiste las TRES
  { id: "buyseed",   n: 3, txt: "Comprá 3 semillas de papa en el Mercado (tenés 3 de plata)", target: "market", panel: "ov-market", ui: "[data-buy='papa']" },
  { id: "plant",     n: 3, txt: "Plantá tus 3 papas en las parcelas",              target: "plot" },
  { id: "harvest",   n: 3, txt: "Cosechá tus 3 papas",                             target: "plot" },
  { id: "sell",      n: 3, txt: "Vendé tus 3 papas en el Mercado",                 target: "market", panel: "ov-market", ui: "#vb-papa" },
  // — la Herrería ya no viene hecha (10/8): es la primera construcción, y es barata a propósito —
  // 13/8 v2 (audio): el orden LÓGICO — primero se coloca el plano (la obra queda a la vista
  // con su cartel), DESPUÉS se juntan sus materiales, y al final se depositan. Lo depositado
  // cuenta para los pasos de "juntá" (campo dep), así depositar temprano no traba nada.
  { id: "place_store", n: 1, txt: "Colocá el PLANO de la Herrería (está en tu barra rápida)", target: "store", hot: "store" },
  { id: "wood_st",  res: "madera", dep: "store", need: () => BUILD_DEF.store.cost.madera || 5,
    txt: "Juntá # de madera talando árboles (para la obra de la Herrería)",        target: "tree" },
  { id: "stone_st", res: "piedra", dep: "store", need: () => BUILD_DEF.store.cost.piedra || 2,
    txt: "Juntá # de piedra picando rocas (para la obra de la Herrería)",          target: "rock" },
  { id: "build_store", n: 1, txt: "Depositá los materiales en la obra de la Herrería (clic encima)", target: "store" },
  // — cadena del Horno: plano → materiales de SU receta → depósito —
  { id: "place_horno", n: 1, txt: "Colocá el plano del Horno de Piedra (barra rápida)", target: "horno", hot: "horno" },
  { id: "wood",  res: "madera", dep: "horno", need: () => BUILD_DEF.horno.cost.madera || 10,
    txt: "Juntá # de madera talando árboles (para la obra del Horno)",             target: "tree" },
  { id: "stone", res: "piedra", dep: "horno", need: () => BUILD_DEF.horno.cost.piedra || 8,
    txt: "Juntá # de piedra picando rocas (para la obra del Horno)",               target: "rock" },
  { id: "build_horno", n: 1, txt: "Depositá los materiales en la obra del Horno (clic encima)", target: "horno" },
  // — el Hacha: la plata llega de ADELANTO al entrar (ya sabés ganarla — dirección 14/8) —
  { id: "crafttool", n: 1, txt: "Crafteá un Hacha en la Herrería",          target: "store", panel: "ov-forge", ui: "[data-ctool='axe']" },
  // ——— ETAPA 2: los sistemas nuevos (Cocina, Armas, Zona Negra, Pesca, Altar) ———
  { id: "place_cocina", n: 1, txt: "Colocá el plano de la Cocina (barra rápida)", target: "cocina", hot: "cocina" },
  { id: "woodc",  res: "madera", dep: "cocina", need: () => BUILD_DEF.cocina.cost.madera || 20,
    txt: "Juntá # de madera (la Cocina es tu primer PROYECTO: dejá cultivos girando y volvé)", target: "tree" },
  { id: "stonec", res: "piedra", dep: "cocina", need: () => BUILD_DEF.cocina.cost.piedra || 15,
    txt: "Juntá # de piedra (los nodos se recargan solos aunque no estés)",     target: "rock" },
  { id: "build_cocina", n: 1, txt: "Depositá los materiales en la obra de la Cocina (clic encima)", target: "cocina" },
  { id: "cook",     n: 1, txt: "Cociná tu primer plato: Papa Asada",   target: "cocina", panel: "ov-cocina", ui: "[data-cook='papa_asada']" },
  { id: "eat",      n: 1, txt: "Comé un plato desde la bolsa (te da un buff)" },
  // (14/8, reversión del capataz: la cadena TERMINA acá — el tutorial enseña LO BÁSICO de
  //  la granja. Armas, Zona Negra, minería avanzada y Altar se aprenden jugando: sus
  //  planos caen por nivel y cada sistema se presenta solo.)
];
/* 14/8: los 40 pasos agrupados en CAPÍTULOS reclamables — la guía opcional con forma de
   diario de misiones. Cada capítulo junta pasos consecutivos y deja una recompensa que se
   RECLAMA en el panel Objetivos (no cae sola): el que ignora la guía cobra igual cuando
   le pasa por encima jugando libre. */
/* 14/8 v2 (filosofía web3, dirección): los premios son INSUMOS, no moneda — cada plata
   regalada es emisión que termina en el P2P. La plata sale de vender lo producido; los
   capítulos pagan cosas que se USAN. El último paga una FICHA DE PARCELA (tierra). */
const TUTO_CAPS = [
  // 14/8 (reversión): el tutorial NO premia — enseña. Capítulos = progreso visible, nada más.
  { id: "cosecha",  label: "Tu primera cosecha", pasos: ["buyseed", "plant", "harvest", "sell"] },
  { id: "herreria", label: "La Herrería",        pasos: ["place_store", "wood_st", "stone_st", "build_store"] },
  { id: "horno",    label: "El Horno de Piedra", pasos: ["place_horno", "wood", "stone", "build_horno", "crafttool"] },
  { id: "cocina",   label: "La Cocina",          pasos: ["place_cocina", "woodc", "stonec", "build_cocina", "cook", "eat"] },
];

function capEstado(cap) {   // "hecho" | "activo" | "pendiente" (por el paso más avanzado de la cadena)
  const idxs = cap.pasos.map(id => tutoIdx(id)).filter(i => i >= 0);
  const fin = Math.max.apply(null, idxs);
  if (G.tuto && (G.tuto.done || (G.tuto.step || 0) > fin)) return "hecho";
  const ini = Math.min.apply(null, idxs);
  return (G.tuto && (G.tuto.step || 0) >= ini) ? "activo" : "pendiente";
}
function tutoNeed(st) { return st ? (typeof st.need === "function" ? st.need() : (st.n || 1)) : 0; }
function tutoTiene(st) {
  if (!st || !st.res) return 0;
  let n = Math.floor(st.res === "plata" ? G.plata : (G.res[st.res] || 0));
  // 13/8 v2: lo YA DEPOSITADO en la obra del paso cuenta — depositar temprano no traba el "juntá"
  if (st.dep && G.obraDep && G.obraDep[st.dep]) n += Math.floor(G.obraDep[st.dep][st.res] || 0);
  if (st.dep && G.built && G.built[st.dep]) n = Math.max(n, tutoNeed(st));   // construido = todo depositado
  return n;
}
function tutoTxt(st) { return st ? String(st.txt).replace("#", tutoNeed(st)) : ""; }

/* ============ GUARDIA DEL TUTORIAL (12/8): que nadie se rompa la cadena =============
   El jugador puede pasear tranquilo, pero NO fundirse lo que el objetivo ACTIVO
   necesita (pasó en pruebas: vender las papas y gastarse la plata en otra cosa dejaba
   la cadena trabada). No bloquea el juego entero: frena SOLO el gasto que haría
   imposible el objetivo de ahora, con un aviso 🎯 que devuelve al camino.
   Excepción clave: comprar SEMILLAS nunca se bloquea por plata — son el motor del
   loop que genera la plata que el objetivo pide. */
/* 14/8 (misma decisión): sin embudo, el guardia también se retira — reservar recursos era
   parte del tutor obligatorio. Queda el cuerpo por si dirección quiere reactivarlo. */
function tutoGuardia(res, n, motivo, extra) { return true; }
function _tutoGuardiaViejo(res, n, motivo, extra) {
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st || !n) return true;
  const nombre = r => r === "plata" ? "plata" : (RES_LABEL[r] || r);
  // 1) paso "juntá X de tal cosa": el gasto no puede bajarte de la meta
  if (st.res === res && !(res === "plata" && extra && extra.semilla)) {
    const need = tutoNeed(st);
    if (tutoTiene(st) - n < need) { toast("🎯 Objetivo: juntar " + need + " de " + nombre(res) + " — " + (motivo || "ese gasto") + " puede esperar"); return false; }
  }
  // 2) paso "comprá semillas de papa": esa plata está reservada (comprar papa SÍ vale)
  if (st.id === "buyseed" && res === "plata" && !(extra && extra.semilla === "papa")) {
    const precio = (CROP_DEF.papa && CROP_DEF.papa.seedCost) || 1;
    if (G.plata - n < precio) { toast("🎯 Guardá esa plata para las semillas de papa del objetivo"); return false; }
  }
  // 4) COLCHÓN anti-cero-absoluto (14/8): con nada plantado, sin semillas y sin cosecha,
  //    gastar la última plata te deja sin NINGUNA palanca económica (softlock detectado en
  //    simulación). La semilla en sí está exenta: comprarla ES la salida.
  if (res === "plata" && !(extra && extra.semilla)) {
    const min = (CROP_DEF.papa && CROP_DEF.papa.seedCost) || 1;
    const tieneAlgo = Object.keys(CROP_DEF).some(k => (G.res[k] || 0) > 0)
      || Object.keys(G.seeds || {}).some(k => (G.seeds[k] || 0) > 0)
      || (Array.isArray(G.plots) && G.plots.some(p => p && (p.state === "growing" || p.state === "ready")));
    if (!tieneAlgo && G.plata - n < min) { toast("🎯 Guardá al menos " + min + " de plata para semillas"); return false; }
  }
  // 3) pasos "colocá el plano", "construí X" y también los "juntá" de esa obra (st.dep):
  //    lo que la obra todavía espera queda reservado — ni reparaciones ni crafteos lo comen
  if (st.id && (st.id.indexOf("build_") === 0 || st.id.indexOf("place_") === 0 || st.dep)) {
    const t = st.dep || st.id.slice(6), b = BUILD_DEF[t];
    if (b && b.cost[res]) {
      const pend = (typeof obraDe === "function" && obraDe(t) && typeof obraFalta === "function")
        ? ((obraFalta(t).find(x => x[0] === res) || [0, 0])[1]) : b.cost[res];
      if (Math.floor(G.res[res] || 0) - n < pend) { toast("🎯 Esa " + nombre(res) + " está reservada para " + b.label + " — terminá esa obra primero"); return false; }
    }
  }
  return true;
}
// versión para recetas enteras: chequea cada material + la plata de una
function tutoGuardiaCosto(cost, plata, motivo) {
  if (typeof tutoGuardia !== "function") return true;
  for (const k in (cost || {})) if (!tutoGuardia(k, cost[k], motivo)) return false;
  if (plata && !tutoGuardia("plata", plata, motivo)) return false;
  return true;
}

/* ============ ACELERADOR DEL TUTORIAL (12/8): el objetivo no te hace esperar ========
   Mientras el objetivo ACTIVO necesita un timer, ESE timer corre acelerado — y solo
   ese. Si el paso pide madera, el árbol se recupera al toque pero las papas siguen a
   tiempo real (y al revés). Como los pasos de "juntá X" se completan SOLOS al llegar
   a la meta, la aceleración muere ahí: no hay ventana para farmear infinito. El
   candado anti-exploit que cierra el círculo: durante un "juntá X" tampoco se puede
   VENDER ese recurso por debajo de la meta (si no, vender para quedarse en 9/10
   mantenía el boost vivo para siempre). */
var TUTO_BOOST = 0.12;   // los timers del objetivo corren a ~1/8 del tiempo real
function tutoBoost(clase) {
  const st = (typeof tutoActivo === "function") ? tutoActivo() : null;
  if (!st) return 1;
  const mapa = {
    papa:  ["plant", "harvest", "sell", "buyseed"],   // el arranque entero fluye (silver/plant2 retirados)
    tree:  ["wood", "woodc", "wood_st", "wood_al", "unlockarm"],   // 14/8: los materiales de la forja de Armas también corren acelerados
    rock:  ["stone", "stonec", "stone_st", "stone_al", "unlockarm"],
    horno: ["mat"],
  };
  // 14/8 (dirección, decisión final): con la guía OPCIONAL los tiempos acelerados se
  // retiran — serían explotables jugando "con el objetivo puesto". Todos crecen igual.
  return 1;
  /* eslint-disable no-unreachable */
  if ((mapa[clase] || []).includes(st.id)) return TUTO_BOOST;
  return 1;
}
var TUTO_BOOST_DESVIO = 0.04;   // los cultivos del desvío corren a 1/25 (papa: ~22 s · cebolla: ~2 min)
var TUTO_REWARD_PLATA = 100;   // gran recompensa del cierre (editable)
// doc 2/8 §3.1: SOLO las semillas del starter pack crecen rápido (45 s). Las compradas o conseguidas
// después usan el tiempo normal del cultivo. 0 en el panel = sin excepción.
var FIRST_GROW_MS = 0;   // 14/8: APAGADO — la papa crece en 90 s de base (escalera nueva), sin trato especial
var FIRST_GROW_N = 3;        // cuántas semillas de arranque tienen ese trato (las 3 papas del inicio)
var TUTO_VER = 12;   // subir este número cuando cambie la CADENA de pasos (invalida progresos viejos) · v12 (14/8): reversión del capataz — 19 pasos de granja básica, sin premios
function tutoActivo() { return G.tuto && !G.tuto.done ? TUTO_STEPS[G.tuto.step] : null; }
// migración: si el guardado trae una cadena vieja, los pasos ya no significan lo mismo → se recalcula
function tutoMigrar() {
  if (!G.tuto) G.tuto = { step: 0, n: 0, done: false, v: TUTO_VER };
  if (G.tuto.v === TUTO_VER) return;
  G.tuto.v = TUTO_VER;
  if (G.tuto.done) return;
  G.tuto.step = 0; G.tuto.n = 0;   // vuelve al principio de la cadena nueva y salta solo lo ya hecho
  tutoAutoSkip();
}
// salta los pasos que el jugador YA cumplió (evita pedir cosas hechas o mentir con "ya tenés los materiales")
// ¿este paso ya está cumplido? Se saca aparte porque ahora se consulta en dos momentos:
// al migrar un guardado viejo Y cada vez que un paso pasa a ser el activo (9/8). Antes solo
// se miraba al migrar, así que si construías la Cocina ANTES de que el tutorial la pidiera,
// después te la pedía igual y no había manera de cumplirla.
function tutoHecho(st) {
  {
    let hecho = false;
    if (st.res) hecho = tutoTiene(st) >= tutoNeed(st);
    // 13/8: pasos "colocá el plano" — hechos si la obra ya está en el piso (o el edificio construido)
    else if (st.id && st.id.indexOf("place_") === 0) { const t = st.id.slice(6); hecho = !!((G.obras && G.obras[t]) || (G.built && G.built[t])); }
    // 14/8 v4: el 1er paso ("comprá tus 3 semillas") solo está hecho con las 3 (o si ya cosechó alguna vez)
    else if (st.id === "buyseed") hecho = (G.seeds && (G.seeds.papa || 0) >= 3) || !!G.firstCropDone;
    else if (st.id === "build_store")  hecho = !!(G.built && G.built.store);
    else if (st.id === "build_horno")  hecho = !!(G.built && G.built.horno);
    else if (st.id === "build_cocina") hecho = !!(G.built && G.built.cocina);
    else if (st.id === "build_altar")  hecho = !!(G.built && G.built.altar);
    else if (st.id === "crafttool") hecho = !!(G.built && G.built.horno);   // si ya construyó, el hacha quedó atrás
    else if (st.id === "cook")      hecho = (G.skills && G.skills.cooking > 0);
    else if (st.id === "eat")       hecho = (G.skills && G.skills.cooking > 0) && (G.buffs || []).length > 0;
    else if (st.id === "unlockarm") hecho = !!G.armasUnlocked;
    else if (st.id === "craftarm")  hecho = Object.keys(G.weapons || {}).length > 0;
    else if (st.id === "equiparm")  hecho = !!(G.gear && G.gear.arma);
    else if (st.id === "portal" || st.id === "kill" || st.id === "kill5") hecho = (G.combatXp || 0) > 0;
    else if (st.id === "fish")      hecho = (G.skills && G.skills.fishing > 0);
    else if (st.id === "upgrade")   hecho = Object.keys(G.weapons || {}).some(k => (G.weapons[k].plus || 0) > 0);
    else if (st.id === "mat")       hecho = MAT_ORDER.some(k => (G.res[k] || 0) > 0);
    else if (st.id === "craftpick") hecho = !!(G.picks && G.picks.owned && (G.picks.owned.bronze || G.picks.owned.iron || G.picks.owned.gold));
    else if (st.id === "mineore")   hecho = ["bronce","hierro","oro","diamante","netherita"].some(k => (G.res[k] || 0) > 0);
    else if (st.id === "dummy")     hecho = !!G.dummyUsedAt;
    else if (st.id === "unlocknode") hecho = ((G.treesOpen || [0]).length + (G.rocksOpen || [0]).length) > 2;
    else if (st.id === "chest")     hecho = (G.chests || []).length > 0;
    else if (st.id === "invexp")    hecho = (G.invExtra || 0) > 0;
    else if (st.id === "passclaim") hecho = !!(G.pass && (Object.keys(G.pass.claimF || {}).length || Object.keys(G.pass.claimV || {}).length));
    else if (st.id === "socket")    hecho = Object.keys(G.weapons || {}).some(k => Object.keys((G.weapons[k].sockets) || {}).some(sl => G.weapons[k].sockets[sl]));
    return hecho;
  }
}
/* 14/8 (dirección): el ADELANTO — ya aprendiste el loop de la plata (plantar → cosechar →
   vender), no hace falta repetirlo 20 veces por cada tanda de herramientas. Al ENTRAR a un
   paso de "juntá madera/piedra", el tutorial calcula las herramientas que faltan para la
   meta COMPLETA y acredita esa plata exacta:
   · madera → hachas faltantes × su precio (1 tala = 1 uso)
   · piedra → reparaciones faltantes × precio del hacha (reparar = 1 madera = 1 tala)
   En los pasos tempranos el kit de arranque alcanza → adelanto 0 (la primera vez se
   aprende, las repeticiones se pagan). Se otorga UNA vez por paso (G.tuto.adel). */
/* 14/8 v2 (dirección, tras el bloqueo de la cocina): el adelanto entrega las HERRAMIENTAS
   directamente, no la plata para comprarlas. El jugador ya aprendió a craftear — repetir
   la conversión plata→herramienta era otro bucle (y con los picos era un SOFTLOCK: el
   pico se DESTRUYE a 0 usos, no se repara; uno nuevo sale 3 madera + 10 plata por UN uso).
   · pasos de madera → hachas que falten para la meta completa
   · pasos de piedra → usos de pico (si el pico murió, revive el de piedra con esos usos)
   · crafttool → plata (esa ES la lección: craftear pagando)
   · unlockarm → la plata del desbloqueo + hachas/usos para sus materiales
   Marca nueva G.tuto.adelv (la vieja adel queda ignorada → los guardados trabados en un
   paso ya "cobrado" con la cuenta vieja RECIBEN el kit al entrar el fix). */
// (14/8, reversión: tutoAdelanto/kits eliminados — el tutorial no regala nada;
//  el set de arranque de herramientas volvió y el kit de emergencia en $G sigue en la Tienda)
function tutoAdelanto() {}
function tutoAutoSkip() {
  for (let i = 0; i < TUTO_STEPS.length + 2; i++) {
    const st = tutoActivo(); if (!st) return;
    if (!tutoHecho(st)) return;
    G.tuto.step++; G.tuto.n = 0;
    if (G.tuto.step >= TUTO_STEPS.length) { G.tuto.done = true; return; }
  }
}
// paso de RECURSO: se cumple solo cuando tenés la cantidad que pide la receta siguiente
function tutoCheckRes() {
  const st = tutoActivo();
  if (!st || !st.res) return;
  if (tutoTiene(st) >= tutoNeed(st)) tutoDone(st);
}
function tutoEvent(tipo) {
  const st = tutoActivo(); if (!st || st.res) return;
  const acepta = st.id === tipo;
  if (!acepta) return;
  G.tuto.n = (G.tuto.n || 0) + 1;
  if (G.tuto.n < st.n) { if (typeof tutoRefresh === "function") tutoRefresh(); return; }
  tutoDone(st);
}
function tutoDone(st) {
  // paso cumplido: tilde + sonido + avance automático (doc)
  if (st.pr) { G.plata += st.pr; log("Objetivo cumplido: +" + st.pr + " de plata.", "gold"); }
  if (typeof tutoCheck === "function") tutoCheck(tutoTxt(st) + (st.pr ? " (+" + st.pr + " plata)" : ""));
  if (window.sfx) sfx("level");
  G.tuto.step++; G.tuto.n = 0;
  if (G.tuto.step >= TUTO_STEPS.length) {
    G.tuto.done = true;
    log("¡Tutorial completo! Ya sabés lo básico — la granja es toda tuya.", "gold");
    if (window.celebrate) celebrate({ title: "¡GRANJA LISTA!", sub: "Tutorial completo", big: true });
    refreshHud();
  } else {
    tutoAutoSkip();   // si el paso nuevo ya estaba cumplido, no lo pide (9/8)
    if (G.tuto.done) { if (typeof tutoRefresh === "function") tutoRefresh(); return; }
    log("Nuevo objetivo: " + tutoTxt(TUTO_STEPS[G.tuto.step]) + ".", "good");
    if (typeof planosSync === "function") planosSync(false);   // 13/8: si el paso nuevo trae plano, cae ACÁ (con su celebración)
  }
  if (typeof tutoRefresh === "function") tutoRefresh();
  if (window.farmScene && window.farmScene.updateTutoArrow) try { window.farmScene.updateTutoArrow(); } catch (e) {}
  if (typeof saveFarm === "function") saveFarm();
}

// ================= PASE DE BATALLA (doc maestro 2/8): 30 niveles Free/VIP, estrellas por misiones =================
var PASS_STARS_LVL = 40;      // estrellas por nivel (diarias completas ≈ 35/día → 30 niveles en ~5 semanas)
var PASS_VIP_PRICE = 250;     // $Golden (doc: ~250 o 4,99 USD)
var PASS_LVL_GOLD = 15;       // comprar 1 nivel suelto con $Golden (para quien va tarde)
var PASS_STAR_DAILY = 10, PASS_STAR_BONUS = 5, PASS_STAR_WEEKLY = 40;
var PASS_VIP_BOOST = 1.2;     // perk VIP: +20% de estrellas (conveniencia, no poder)
// 14/8 (web3): el track FREE paga INSUMOS, no plata — cada plata regalada es emisión.
// Los valores reemplazan cada fila de plata por insumos de valor equivalente.
const PASS_FREE = [   // índice = nivel-1 (tabla del doc, plata→insumos 14/8)
  { res:["madera",20] }, { seed:["papa",5] }, { res:["madera",20] }, { seed:["zanahoria",8] }, { seed:["zanahoria",5] },
  { res:["piedra",25] }, { dish:["pan_trigo",3] }, { res:["lombriz",15] }, { seed:["cebolla",5] }, { pick:"bronze" },
  { res:["barra_piedra",3] }, { res:["madera",30] }, { seed:["repollo",5] }, { dish:["papa_asada",5] }, { ficha:1 },
  { res:["piedra",30] }, { seed:["calabacin",5] }, { res:["flecha",40] }, { dish:["estofado",1] }, { pick:"gold" },
  { res:["carne",10] }, { res:["madera",40] }, { seed:["brocoli",5] }, { res:["bronce",8] }, { ficha:1 },
  { res:["piedra",40] }, { seed:["maiz",5] }, { res:["esencia_runica",2] }, { dish:["banquete",1] }, { ficha:1, cos:"Título de Cosecha" },
];
// 14/8 (web3): el VIP paga COSMÉTICO + conveniencia (insumos ricos y algo de $Golden —
// devolución parcial de lo quemado al comprarlo), jamás plata ni poder: con economía
// compartida y P2P, el pay-to-win destruye el mercado que es el producto.
const PASS_VIP = [
  { seed:["cebolla",10], cos:"Marco Brote" }, { res:["madera",50] }, { golden:10 }, { cos:"Skin de Hacha Dorada" }, { dish:["papa_asada",8], cos:"Emote Saludo" },
  { res:["piedra",40] }, { golden:15 }, { cos:"Decoración: Farol Dorado" }, { seed:["repollo",8] }, { cos:"Skin de Granjero Cosechador Ámbar" },
  { res:["flecha",60] }, { golden:20 }, { cos:"Título Labrador" }, { res:["barra_piedra",5] }, { golden:30, cos:"Estatua de Trigo" },
  { seed:["calabaza",6] }, { cos:"Skin de Caña Reluciente" }, { golden:25 }, { res:["carne",20] }, { cos:"Mascota Pollito Dorado" },
  { res:["bronce",12] }, { golden:25 }, { cos:"Color de nombre Oro" }, { seed:["brocoli",6] }, { golden:40, cos:"Skin de Espada Filo Solar" },
  { res:["esencia_runica",3] }, { golden:30 }, { cos:"Decoración: Fuente Dorada" }, { ficha:1 }, { golden:50, cos:"Skin LEGENDARIA Monarca Dorado + Aura" },
];
const PASS_HITOS = { 1:"★", 5:"★", 10:"★★", 15:"★", 20:"★★", 25:"★", 30:"★★" };
const PASS_MISIONES = {   // una por pilar del juego (doc)
  cosechar: { label: "Cosechá # cultivos",        goals: [6, 10, 15] },
  minar:    { label: "Miná, talá o pescá # veces", goals: [8, 12, 18] },
  cocinar:  { label: "Cociná # platos",           goals: [2, 3, 5] },
  combatir: { label: "Pelea: # acciones de combate", goals: [5, 8, 12] },
  craftear: { label: "Crafteá # objetos",         goals: [2, 3, 5] },
};
const PASS_PILAR = { farming:"cosechar", mining:"minar", fishing:"minar", cooking:"cocinar", sword:"combatir", hacha:"combatir", mazo:"combatir", range:"combatir", crafting:"craftear" };
function passInit() {
  G.pass = G.pass || {};
  const p = G.pass;
  p.stars = p.stars || 0; p.vip = !!p.vip; p.claimF = p.claimF || {}; p.claimV = p.claimV || {}; p.cosmetics = p.cosmetics || [];
  const hoy = dayStamp(0);   // día LOCAL (antes era UTC: los contadores se reseteaban a las 21 h en Argentina)
  if (!p.daily || p.daily.date !== hoy) {   // 3 misiones diarias, una por pilar (rotan con la fecha)
    const pilares = Object.keys(PASS_MISIONES);
    const seed = Number(hoy.replace(/-/g, ""));
    const elegidos = [0, 1, 2].map(i => pilares[(seed + i * 7 + Math.floor(seed / 100) * i) % pilares.length]).filter((v, i, a) => a.indexOf(v) === i);
    for (const px of pilares) { if (elegidos.length >= 3) break; if (!elegidos.includes(px)) elegidos.push(px); }   // completa sin riesgo de bucle infinito
    p.daily = { date: hoy, bonus: false, mis: elegidos.map((k, i) => ({ k, goal: PASS_MISIONES[k].goals[i % 3], n: 0, ok: false })) };
  }
  const semana = (d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + 3 - (x.getDay() + 6) % 7); const w1 = new Date(x.getFullYear(), 0, 4); return x.getFullYear() + "-" + Math.round(((x - w1) / 86400000 + (w1.getDay() + 6) % 7 - 3) / 7 + 1); })(new Date());
  if (!p.weekly || p.weekly.week !== semana) {
    p.weekly = { week: semana, mis: [ { k: "cosechar", goal: 60, n: 0, ok: false }, { k: "combatir", goal: 40, n: 0, ok: false } ] };
  }
  return p;
}
function passLvl() { return Math.min(30, Math.floor(((G.pass && G.pass.stars) || 0) / PASS_STARS_LVL)); }
function passAddStars(n) {
  const p = passInit();
  const antes = passLvl();
  p.stars += Math.round(n * (p.vip ? PASS_VIP_BOOST : 1));
  const ahora = passLvl();
  if (ahora > antes) {
    log("¡Pase de Batalla nivel " + ahora + "! Reclamá tu recompensa en el Pase.", "gold");
    if (window.celebrate) celebrate({ title: "¡NIVEL " + ahora + "!", sub: "Pase de Batalla", big: !!PASS_HITOS[ahora], reward: "Recompensa lista para reclamar" });
  }
  if (typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
}
function passEvent(sk) {   // se dispara con cada acción que da XP: alimenta las misiones
  const pilar = PASS_PILAR[sk]; if (!pilar) return;
  const p = passInit(); let dirty = false;
  [...p.daily.mis, ...p.weekly.mis].forEach(m => {
    if (m.k !== pilar || m.ok) return;
    m.n++; dirty = true;
    if (m.n >= m.goal) {
      m.ok = true;
      const stars = p.weekly.mis.includes(m) ? PASS_STAR_WEEKLY : PASS_STAR_DAILY;
      toast("Misión cumplida: +" + stars + " estrellas"); log("Misión del Pase cumplida (+" + stars + " estrellas).", "good");
      passAddStars(stars);
      if (!p.daily.bonus && p.daily.mis.every(x => x.ok)) { p.daily.bonus = true; toast("¡Las 3 diarias! +" + PASS_STAR_BONUS + " estrellas"); passAddStars(PASS_STAR_BONUS); }
    }
  });
  if (dirty && typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
}
function passRewardStr(r) {
  const parts = [];
  if (r.plata) parts.push(r.plata + " plata");
  if (r.golden) parts.push(r.golden + " $Golden");
  if (r.res) parts.push(r.res[1] + " " + (RES_LABEL[r.res[0]] || r.res[0]));
  if (r.seed) parts.push(r.seed[1] + " semillas de " + (CROP_DEF[r.seed[0]] ? CROP_DEF[r.seed[0]].label : r.seed[0]));
  if (r.dish) parts.push(r.dish[1] + "× " + (RECIPE_DEF[r.dish[0]] ? RECIPE_DEF[r.dish[0]].label : r.dish[0]));
  if (r.pick) parts.push("1 " + PICK_DEF[r.pick].label);
  if (r.ficha) parts.push("Ficha de parcela (parcela GRATIS)");
  if (r.cos) parts.push(r.cos);
  return parts.join(" + ");
}
function passClaim(nv, vipTrack) {
  const p = passInit();
  if (nv > passLvl()) { toast("Todavía no llegaste al nivel " + nv); return; }
  if (vipTrack && !p.vip) { toast("Ese carril es del Pase VIP"); return; }
  const store = vipTrack ? p.claimV : p.claimF;
  if (store[nv]) { toast("Ya reclamaste ese nivel"); return; }
  const r = (vipTrack ? PASS_VIP : PASS_FREE)[nv - 1]; if (!r) return;
  store[nv] = true;
  if (r.plata) G.plata += r.plata;
  if (r.golden) G.golden += r.golden;
  if (r.res) G.res[r.res[0]] = (G.res[r.res[0]] || 0) + r.res[1];
  if (r.seed) G.seeds[r.seed[0]] = (G.seeds[r.seed[0]] || 0) + r.seed[1];
  if (r.dish) { G.dishes = G.dishes || {}; G.dishes[r.dish[0]] = (G.dishes[r.dish[0]] || 0) + r.dish[1]; }
  if (r.pick) { G.picks.owned[r.pick] = true; G.picks.dur[r.pick] = (G.picks.dur[r.pick] || 0) + 1; }
  if (r.ficha) { G.plotsOwned = Math.min(PLOT_MAX, (G.plotsOwned || 2) + 1); if (G.plotsOwned <= GF.PLOTS.length && window.farmScene && window.farmScene.refreshPlotLocks) { try { window.farmScene.refreshPlotLocks(); } catch (e) {} } if (typeof syncEditDeco === "function") syncEditDeco(); }
  if (r.cos) { p.cosmetics.push(r.cos); }
  log("Pase nivel " + nv + (vipTrack ? " (VIP)" : "") + ": recibiste " + passRewardStr(r) + ".", "gold");
  if (typeof tutoEvent === "function") tutoEvent("passclaim");
  toast("¡" + passRewardStr(r) + "!");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
  if (typeof saveFarm === "function") saveFarm(true);
}
function passBuyVip() {
  const p = passInit();
  if (p.vip) { toast("Ya tenés el Pase VIP"); return; }
  if (G.golden < PASS_VIP_PRICE) { toast("Te falta $Golden (" + PASS_VIP_PRICE + ")"); return; }
  G.golden -= PASS_VIP_PRICE; p.vip = true;
  log("¡Pase VIP activado! Carril dorado desbloqueado + " + Math.round((PASS_VIP_BOOST - 1) * 100) + "% de estrellas.", "gold");
  if (window.celebrate) celebrate({ title: "¡PASE VIP!", sub: "Pase de Batalla", big: true, reward: "Carril dorado + " + Math.round((PASS_VIP_BOOST - 1) * 100) + "% de estrellas" });
  refreshHud(); if (typeof refreshPass === "function" && isOpen("ov-pass")) refreshPass();
  if (typeof saveFarm === "function") saveFarm(true);
}
function passBuyLevel() {
  const p = passInit();
  if (passLvl() >= 30) { toast("El Pase ya está al máximo"); return; }
  if (G.golden < PASS_LVL_GOLD) { toast("Te falta $Golden (" + PASS_LVL_GOLD + ")"); return; }
  G.golden -= PASS_LVL_GOLD;
  passAddStars(PASS_STARS_LVL / (p.vip ? PASS_VIP_BOOST : 1));   // compensa el boost para dar exactamente 1 nivel
  refreshHud(); if (typeof saveFarm === "function") saveFarm(true);
}








// ================= COSMÉTICOS VISIBLES (los que no necesitan arte) =================
// Título junto al nombre, color de nombre, marco de perfil y aura del granjero.
// Se ganan en los niveles de granja, el pase y el cofre; acá se elige cuál lucir.
const COS_TITULOS = {
  "Granjero Experto": 15, "Maestro de Cultivos": 20, "Veterano": 25, "Leyenda Naciente": 30,
  "Amo de la Granja": 35, "Señor de la Cosecha": 40, "Élite": 45, "Leyenda de la Granja Dorada": 50,
  "Labrador": 0, "Madrugador": 0, "Título de Cosecha": 0,
};
const COS_COLORES = { oro: "#e0a63c", verde: "#5aa832", violeta: "#8a5cd6", celeste: "#3d9fd6", blanco: "#f2ead5" };
const COS_MARCOS = { brote: "Marco Brote", hoja: "Marco de Hoja", dorado: "Marco Dorado" };
function cosTengo(txt) { return (G.cosmeticos || []).some(c => String(c).toLowerCase().includes(String(txt).toLowerCase())); }
// títulos disponibles: los que ganaste (por texto del cosmético) 
function cosTitulosDisponibles() { return Object.keys(COS_TITULOS).filter(t => cosTengo(t)); }
function cosColoresDisponibles() {
  const out = ["blanco"];
  if (cosTengo("color de nombre oro")) out.push("oro");     // el oro sale SOLO del pase VIP (antes cualquier "color de nombre" lo habilitaba)
  if (cosTengo("color de nombre verde") || cosTengo("Madrugador")) out.push("verde");
  if (G.level >= 30) out.push("violeta");
  if (G.level >= 20) out.push("celeste");
  return [...new Set(out)];
}
function cosMarcosDisponibles() {
  const out = ["ninguno"];
  if (cosTengo("Marco")) out.push("brote");
  if (G.level >= 24) out.push("hoja");
  if (G.level >= 42) out.push("dorado");
  return out;
}
function cosAuraDisponible() { return cosTengo("aura") || G.level >= 30; }
// MASCOTA (10/8): la gallina "Pinta" que entrega el cofre de login. Es puro adorno —
// no produce nada ni se le puede dar de comer: pasea por la granja y te acompaña.
const COS_MASCOTAS = { gallina: { label: 'Gallina "Pinta"', sprite: "pet_gallina" } };
function cosMascotasDisponibles() {
  const out = ["ninguna"];
  if (cosTengo("Pinta") || cosTengo("mascota")) out.push("gallina");
  return out;
}
// SKINS (10/8): las últimas piezas del cofre y del nivel 50 que eran solo texto.
//   sombrero  -> Sombrero de paja brillante: lo lleva puesto el granjero en la granja
//   petalos   -> Camino de pétalos: al caminar vas dejando pétalos que se desvanecen
//   granjaOro -> Granja legendaria: valla dorada + chispas de oro flotando (nivel 50)
function cosSombreroDisponible() { return cosTengo("sombrero de paja"); }
function cosPetalosDisponible() { return cosTengo("pétalos") || cosTengo("petalos"); }
function cosGranjaOroDisponible() { return cosTengo("granja legendaria") || G.level >= 50; }
function cosElegido() {
  G.cosEq = G.cosEq || { titulo: "", color: "blanco", marco: "ninguno", aura: false };
  if (!G.cosEq.mascota) G.cosEq.mascota = "ninguna";   // guardados viejos no la traen
  if (G.cosEq.sombrero == null) { G.cosEq.sombrero = false; G.cosEq.petalos = false; G.cosEq.granjaOro = false; }   // guardados viejos
  return G.cosEq;
}
function cosSet(campo, valor) {
  const c = cosElegido();
  c[campo] = valor;
  if (campo === "aura" && valor && window.farmScene && window.farmScene.updateAura) { try { window.farmScene.updateAura(); } catch (e) {} }
  if (window.farmScene && window.farmScene.updateAura) { try { window.farmScene.updateAura(); } catch (e) {} }
  if (campo === "mascota" && window.farmScene && window.farmScene.syncMascota) { try { window.farmScene.syncMascota(); } catch (e) {} }
  if (window.farmScene && window.farmScene.updateSkins) { try { window.farmScene.updateSkins(); } catch (e) {} }   // sombrero / pétalos / granja legendaria (10/8)
  if (typeof refreshCosmeticos === "function" && isOpen("ov-cos")) refreshCosmeticos();
  if (typeof saveFarm === "function") saveFarm();
}
// nombre para mostrar en ranking, chat y plaza
function nombreLucido(nick) {
  const c = cosElegido();
  return (c.titulo ? "[" + c.titulo + "] " : "") + (nick || window.NICK || "Granjero");
}
function colorNombre() { return COS_COLORES[cosElegido().color] || COS_COLORES.blanco; }

// ================= MERCADO ENTRE JUGADORES (P2P) =================
// Publicás algo tuyo con un precio; otro jugador lo compra y vos cobrás cuando volvés al mercado.
// Comisión que se QUEMA (sumidero sano): sale del precio que cobra el vendedor.
var MARKET_FEE = 5;             // % de comisión
var MARKET_MAX_PUB = 10;        // publicaciones activas por jugador
const MARKET_KINDS = { res: "Recurso", seed: "Semilla", dish: "Plato", fish: "Pez", arm: "Arma" };
function mkTengo(kind, key) {
  if (kind === "res") return Math.floor(G.res[key] || 0);
  if (kind === "seed") return Math.floor(G.seeds[key] || 0);
  if (kind === "dish") return Math.floor((G.dishes && G.dishes[key]) || 0);
  if (kind === "fish") return Math.floor((G.fish && G.fish[key]) || 0);
  if (kind === "arm") return (G.weapons && G.weapons[key]) ? 1 : 0;
  return 0;
}
function mkSacar(kind, key, n) {
  if (mkTengo(kind, key) < n) return false;
  if (kind === "res") G.res[key] -= n;
  else if (kind === "seed") G.seeds[key] -= n;
  else if (kind === "dish") G.dishes[key] -= n;
  else if (kind === "fish") G.fish[key] -= n;
  else if (kind === "arm") { if (G.gear.arma === key) G.gear.arma = null; delete G.weapons[key]; }
  return true;
}
function mkPoner(kind, key, n, payload) {
  if (kind === "res") { if (!tryAddRes(key, n)) return false; }
  else if (kind === "seed") G.seeds[key] = (G.seeds[key] || 0) + n;
  else if (kind === "dish") { G.dishes = G.dishes || {}; G.dishes[key] = (G.dishes[key] || 0) + n; }
  else if (kind === "fish") { G.fish = G.fish || {}; G.fish[key] = (G.fish[key] || 0) + n; }
  else if (kind === "arm") {
    G.weapons = G.weapons || {};
    if (G.weapons[key]) return false;   // ya tenés una igual: NO se pisa (se perdían el +N, la durabilidad y las runas)
    G.weapons[key] = payload || { dur: (ARM_DEF[key] ? ARM_DEF[key].dur : 40) };
  }
  return true;
}
// PENDIENTES del mercado: si algo no entra en la bolsa (o ya tenés esa arma) NO se pierde,
// queda guardado y se reclama desde la ventana del Mercado cuando hagas lugar.
function mkPendAdd(kind, key, n, payload) {
  G.mkPend = G.mkPend || [];
  G.mkPend.push({ kind, item: key, qty: n, payload: payload || null });
  toast("Sin lugar — quedó pendiente en el Mercado");
  log("No entró en la bolsa: " + n + " × " + mkNombre(kind, key) + ". Hacé lugar y reclamalo desde el Mercado.", "bad");
}
function mkPendCount() { return (G.mkPend || []).length; }
function mkPendCobrar() {
  if (!G.mkPend || !G.mkPend.length) { toast("No tenés nada pendiente"); return 0; }
  const quedan = []; let dados = 0;
  for (const p of G.mkPend) { if (mkPoner(p.kind, p.item, p.qty, p.payload)) dados++; else quedan.push(p); }
  G.mkPend = quedan;
  if (dados) { log("Reclamaste " + dados + " entrega(s) pendiente(s) del Mercado.", "good"); toast("+" + dados + " entrega(s)"); }
  else toast("Sigue sin entrar — liberá espacio en la bolsa");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function" && isOpen("ov-p2p")) refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
  return dados;
}
// entrega segura: si no entra, va a pendientes (nunca se destruye)
function mkEntregar(kind, key, n, payload) { if (!mkPoner(kind, key, n, payload)) mkPendAdd(kind, key, n, payload); }
function mkNombre(kind, key) {
  if (kind === "arm") return (ARM_DEF[key] && ARM_DEF[key].label) || key;
  if (kind === "dish") return (RECIPE_DEF[key] && RECIPE_DEF[key].label) || key;
  if (kind === "fish") return (FISH_DEF[key] && FISH_DEF[key].label) || key;
  if (kind === "seed") return "Semilla de " + ((CROP_DEF[key] && CROP_DEF[key].label) || key);
  return (CROP_DEF[key] && CROP_DEF[key].label) || RES_LABEL[key] || key;
}
async function marketPublicar(kind, key, n, precio) {
  n = Math.max(1, Math.floor(n || 1)); precio = Math.max(1, Math.floor(precio || 1));
  if (!MARKET_KINDS[kind]) return;
  if (mkTengo(kind, key) < n) { toast("No tenés " + n + " de eso"); return; }
  const mias = await mkMine();
  if (mias.filter(r => !r.sold_to).length >= MARKET_MAX_PUB) { toast("Ya tenés " + MARKET_MAX_PUB + " publicaciones activas"); return; }
  const payload = (kind === "arm" && G.weapons[key]) ? JSON.parse(JSON.stringify(G.weapons[key])) : null;
  if (!mkSacar(kind, key, n)) { toast("No se pudo publicar"); return; }
  const fila = await mkPublish({ kind, item: key, qty: n, price: precio, payload, name: mkNombre(kind, key) });
  if (!fila) { mkEntregar(kind, key, n, payload); toast("No se pudo publicar — revisá tus publicaciones antes de reintentar"); return; }   // falló: te devolvemos lo tuyo
  log("Publicaste " + n + " × " + mkNombre(kind, key) + " por " + fmt(precio) + " de plata.", "gold");
  toast("Publicado");
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}
let mkBusy = false;   // un solo movimiento de mercado a la vez (el doble clic duplicaba/dejaba la plata en negativo)
async function marketComprar(fila) {
  if (!fila || mkBusy) return;
  if (fila.seller === (typeof UID === "string" ? UID : "")) { toast("Eso lo publicaste vos"); return; }
  if (G.plata < fila.price) { toast("Te falta plata (" + fmt(fila.price) + ")"); return; }
  if (fila.kind === "arm" && G.weapons && G.weapons[fila.item]) { toast("Ya tenés esa arma — no se puede tener dos iguales"); return; }
  mkBusy = true;
  const ok = await mkBuy(fila.id).catch(() => false);
  mkBusy = false;
  if (!ok) { toast("Se lo llevaron primero"); if (typeof refreshP2P === "function") refreshP2P(); return; }
  G.plata -= fila.price;
  mkEntregar(fila.kind, fila.item, fila.qty, fila.payload);   // si no entra en la bolsa, queda pendiente (no se pierde)
  log("Compraste " + fila.qty + " × " + (fila.name || mkNombre(fila.kind, fila.item)) + " a " + (fila.seller_name || "otro granjero") + " por " + fmt(fila.price) + " de plata.", "gold");
  toast("¡Comprado!");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}
async function marketCancelar(fila) {
  if (!fila || mkBusy) return;
  if (fila.seller !== (typeof UID === "string" ? UID : "")) { toast("Esa publicación no es tuya"); return; }
  mkBusy = true;
  const ok = await mkCancel(fila.id).catch(() => false);
  mkBusy = false;
  if (!ok) { toast("No se pudo retirar (¿ya se vendió?)"); if (typeof refreshP2P === "function") refreshP2P(); return; }
  mkEntregar(fila.kind, fila.item, fila.qty, fila.payload);   // si no entra en la bolsa, queda pendiente (no se pierde)
  log("Retiraste tu publicación de " + (fila.name || fila.item) + ".", "good"); toast("Retirado");
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}
async function marketCobrar(fila) {
  if (!fila || mkBusy) return;
  if (fila.seller !== (typeof UID === "string" ? UID : "")) { toast("Esa venta no es tuya"); return; }
  if (fila.paid) { toast("Esa venta ya la cobraste"); return; }
  mkBusy = true;
  const ok = await mkCollect(fila.id).catch(() => false);
  mkBusy = false;
  if (!ok) { toast("No se pudo cobrar"); if (typeof refreshP2P === "function") refreshP2P(); return; }
  const neto = Math.max(1, Math.round(fila.price * (1 - MARKET_FEE / 100)));
  G.plata += neto;
  log("Cobraste " + fmt(neto) + " de plata por " + (fila.name || fila.item) + " (comisión " + MARKET_FEE + "%).", "gold");
  toast("+" + fmt(neto) + " de plata");
  refreshHud();
  if (typeof refreshP2P === "function") refreshP2P();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ================= INCURSIONES: COMBATE DE UN CLIC (doc "Combate un clic vs jugado", 3/8) =================
// Mandás al granjero a una zona, tarda tiempo REAL (como las ollas de la Cocina) y vuelve con botín y XP.
// Gasta durabilidad del arma y estamina. Rinde menos que pelear a mano: el que juega, gana más.
var INC_RENDIMIENTO = 0.7;    // 70% de lo que rendiría esa misma media hora peleando
var INC_CUPO_DIA = 3;         // incursiones por día (0 = sin tope)
const INCURSIONES = {
  zn1: { label:"Zona Negra I",   min:10, mobs:["rata","murcielago","larva","baba","arana"],           poderRec:8 },
  zn2: { label:"Zona Negra II",  min:20, mobs:["goblin","orco","esqueleto","lancero","golem"],        poderRec:20 },
  zn3: { label:"Zona Negra III", min:30, mobs:["hombre_lobo","guerrero","troll","ogro","espectro"],   poderRec:35 },
  guarida: { label:"Guarida",    min:45, mobs:["demonio"],                                             poderRec:55 },
};
const INC_ORDER = ["zn1", "zn2", "zn3", "guarida"];
function incPoder() {   // poder de combate del jugador con lo que tiene equipado
  const id = armaEq(); if (!id) return 0;
  const w = ARM_DEF[id], lvl = skillInfo(G.skills[armSkillKey(w.tipo)] || 0).lvl;
  let p = (w.min + w.max) / 2 + Math.floor(lvl / 2);
  p *= 1 + upgDmg(armPlus(id)) / 100;
  p *= dmgMult();
  return Math.round(p);
}
function incCupoHoy() {
  const hoy = dayStamp(0);   // día LOCAL (antes era UTC: los contadores se reseteaban a las 21 h en Argentina)
  if (!G.incDia || G.incDia.date !== hoy) G.incDia = { date: hoy, n: 0 };
  return G.incDia;
}
function incActiva() { return G.incursion || null; }
function incFalta() { const i = incActiva(); return i ? Math.max(0, i.endAt - nowMs()) : 0; }
function incSalir(zona) {
  const z = INCURSIONES[zona]; if (!z) return;
  if (incActiva()) { toast("Ya hay una incursión en curso"); return; }
  const cupo = incCupoHoy();
  if (INC_CUPO_DIA && cupo.n >= INC_CUPO_DIA) { toast("Ya hiciste las " + INC_CUPO_DIA + " incursiones de hoy"); return; }
  const id = armaEq();
  if (!id) { toast("Necesitás un arma equipada"); return; }
  if ((G.weapons[id].dur || 0) <= 5) { toast("El arma está muy gastada — reparala en la Herrería"); return; }
  const poder = incPoder();
  if (poder <= 0) { toast("Tu arma no sirve para pelear"); return; }
  const ms = z.min * 60000;
  G.incursion = { zona, endAt: nowMs() + ms, total: ms, poder, arma: id };
  cupo.n++;
  log("Saliste de incursión a " + z.label + " (" + fmtSecs(z.min * 60) + "). Volvés con el botín.", "gold");
  toast("Incursión: " + z.label);
  refreshHud(); if (typeof refreshIncursion === "function" && isOpen("ov-incursion")) refreshIncursion();
  if (typeof saveFarm === "function") saveFarm(true);
}
// resuelve la incursión con los stats reales del bestiario
function incResolver() {
  const inc = incActiva(); if (!inc || nowMs() < inc.endAt) return null;
  const z = INCURSIONES[inc.zona];
  const mobs = z.mobs.map(k => MONSTER_DEF[k]);
  const vidaMedia = mobs.reduce((a, m) => a + m.hp, 0) / mobs.length;
  const defMedia = mobs.reduce((a, m) => a + (m.def || 0), 0) / mobs.length;
  const golpes = (z.min * 60) / (ATTACK_MS / 1000);                      // golpes posibles en el tiempo
  const dmgReal = Math.max(1, inc.poder - defMedia);
  let kills = Math.floor(golpes / Math.max(1, Math.ceil(vidaMedia / dmgReal)) * INC_RENDIMIENTO);
  // riesgo: si vas flojo, volvés herido y con menos botín
  const ratio = inc.poder / z.poderRec;
  let herido = 0, aviso = "";
  if (ratio < 0.5) { kills = 0; herido = Math.round(G.hpMax * 0.35); aviso = "Te superaron: volviste sin botín."; }
  else if (ratio < 1) { kills = Math.floor(kills * ratio); herido = Math.round(G.hpMax * 0.2); aviso = "Ibas justo de poder: volviste herido y con menos botín."; }
  // estamina y durabilidad: lo mismo que costaría pelear
  const costoStam = z.mobs.reduce((a, k) => a + stamCosto(k), 0) / z.mobs.length * kills;
  const stamDisp = (G.stam == null ? stamMax() : G.stam);
  if (costoStam > stamDisp) { kills = Math.floor(kills * (stamDisp / Math.max(1, costoStam))); aviso = (aviso ? aviso + " " : "") + "Se te acabó la estamina a mitad de camino."; }
  G.stam = Math.max(0, stamDisp - Math.round(Math.min(costoStam, stamDisp)));
  const w = G.weapons[inc.arma];
  if (w) w.dur = Math.max(0, w.dur - Math.min(kills, w.dur));
  // botín y XP con las tablas del bestiario
  const botin = {}; let xp = 0;
  for (let i = 0; i < kills; i++) {
    const m = mobs[Math.floor(Math.random() * mobs.length)];
    xp += m.xp;
    const loot = rollLoot(m);
    for (const k in loot) botin[k] = (botin[k] || 0) + loot[k];
  }
  // la plata es MONEDA, no un recurso de la bolsa: si entraba por tryAddRes se perdía (bug)
  if (botin.plata) { G.plata += botin.plata; }
  for (const k in botin) { if (k === "plata") continue; if (!tryAddRes(k, botin[k])) { botin[k] = 0; } }
  if (kills) { addXp(armSkillKey(ARM_DEF[inc.arma].tipo), Math.round(xp)); addCombatXp(Math.round(xp)); }
  if (herido) { G.hp = Math.max(1, G.hp - herido); }
  z.mobs.forEach(() => {});
  const partes = Object.keys(botin).filter(k => botin[k] > 0).map(k => "+" + botin[k] + " " + (RES_LABEL[k] || (CROP_DEF[k] && CROP_DEF[k].label) || k));
  G.incursion = null;
  const resumen = "Incursión a " + z.label + ": venciste " + kills + " criatura(s)" + (partes.length ? " · " + partes.join(" · ") : " · sin botín") + (xp ? " · +" + fmt(Math.round(xp)) + " XP" : "");
  log(resumen + (aviso ? " " + aviso : ""), kills ? "gold" : "bad");
  toast(kills ? "¡Volviste con " + kills + " victorias!" : "Volviste sin nada");
  if (kills && window.celebrate) celebrate({ title: "¡" + kills + " victorias!", sub: "Incursión a " + z.label, reward: partes.join(" · ") });
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshIncursion === "function" && isOpen("ov-incursion")) refreshIncursion();
  if (typeof saveFarm === "function") saveFarm(true);
  return { kills, botin, xp, herido, aviso };
}
function incTick() { if (incActiva() && nowMs() >= G.incursion.endAt) incResolver(); }

// ---- ENTRENAMIENTO OFFLINE DEL DUMMY ("detallitos (1)" punto 9) ----
// Dejás al granjero entrenando y al volver se cuenta el tiempo que pasó: XP del arma equipada.
var DUMMY_OFF_XP_H = 60;      // XP por hora de entrenamiento
var DUMMY_OFF_MAX_H = 8;      // tope de horas que acumula
// El primer MINUTO no cuenta (9/8). Antes el entrenamiento arrancaba a contar en el instante
// del clic, así que se podía clic → salir → cobrar → repetir, y sacar XP a puñados sin esperar
// nada. Ahora hay que dejarlo entrenando de verdad: hasta el minuto, no paga.
var DUMMY_OFF_ESPERA_MS = 60000;
function dummyEntrenando() { return !!(G.dummyTrain && G.dummyTrain.desde); }
// cuánto tiempo lleva entrenando que SÍ cuenta (0 mientras no pasó el minuto de espera)
function dummyMsUtiles() {
  if (!dummyEntrenando()) return 0;
  return Math.max(0, nowMs() - G.dummyTrain.desde - DUMMY_OFF_ESPERA_MS);
}
function dummyIniciar() {
  const aid = armaEq();
  if (!aid || ARM_DEF[aid].tipo === "arco") { toast("Equipá un arma cuerpo a cuerpo para entrenar"); return; }
  G.dummyTrain = { desde: nowMs(), arma: aid };
  if (typeof openOv === "function") openOv("ov-entrenando");   // tapa el juego: entrenar no es gratis
  log("Dejaste al granjero entrenando en el dummy. El primer minuto no cuenta; de ahí en más cobrás la XP del tiempo que pase, hasta " + DUMMY_OFF_MAX_H + " h.", "good");
  toast("Entrenando…");
  if (typeof saveFarm === "function") saveFarm(true);
}
function dummyCobrar() {
  if (!dummyEntrenando()) return null;
  const t = G.dummyTrain, horas = Math.min(DUMMY_OFF_MAX_H, dummyMsUtiles() / 3600000);
  const aid = ARM_DEF[t.arma] ? t.arma : armaEq();
  G.dummyTrain = null;
  if (!aid || horas <= 0) { toast("Tiene que entrenar al menos un minuto"); return null; }
  const xp = Math.round(horas * DUMMY_OFF_XP_H);
  const sk = armSkillKey(ARM_DEF[aid].tipo);
  addXp(sk, xp);
  log("Entrenamiento terminado: " + fmtDur(horas * 3600000) + " → +" + fmt(xp) + " XP de " + SKILL_NAME[sk] + ".", "gold");
  toast("+" + fmt(xp) + " XP de " + SKILL_NAME[sk]);
  if (typeof saveFarm === "function") saveFarm(true);
  return xp;
}

// ============ ADORNOS DE LA GRANJA (10/8, doc del diseñador) =======================
// Cosas para decorar: no dan ninguna ventaja, son para que la granja se vea linda y después
// poder hacer eventos de "la más bonita". Se compran en la Tienda, quedan en la bolsa de
// adornos y se colocan en la granja. El arte va en la Fase 6: por ahora se dibujan por código.
const DECO_ORDER = ["valla", "flores", "farol", "banco", "espantapajaros", "fuente", "estatua", "arbolito",
                    "espantapajaros_oro", "farolito"];   // los dos últimos NO se compran: salen del cofre
const DECO_DEF = {
  valla:          { label: "Valla de madera",   plata: 120,   golden: 0,  ds: "Un tramo de cerca para separar zonas." },
  flores:         { label: "Cantero de flores", plata: 200,   golden: 0,  ds: "Un cantero con flores de temporada." },
  farol:          { label: "Farol",             plata: 450,   golden: 0,  ds: "Da un aire de pueblo al camino." },
  banco:          { label: "Banco de plaza",    plata: 700,   golden: 0,  ds: "Para sentarse a mirar los cultivos." },
  espantapajaros: { label: "Espantapájaros",    plata: 1200,  golden: 0,  ds: "Clásico de granja. No espanta nada, es decorativo." },
  fuente:         { label: "Fuente de piedra",  plata: 4000,  golden: 0,  ds: "El centro de una granja ordenada." },
  estatua:        { label: "Estatua dorada",    plata: 0,     golden: 60, ds: "Para presumir. Se paga en $Golden." },
  arbolito:       { label: "Cerezo en flor",    plata: 0,     golden: 90, ds: "Un árbol ornamental. No se puede talar." },
  // 10/8: los dos adornos del COFRE DE LOGIN. No se venden: caen del cofre de 7 días y por eso
  // no aparecen en la Tienda. Antes eran una línea de texto en la lista de cosméticos y nada más.
  espantapajaros_oro: { label: "Espantapájaros dorado", cofre: 1, plata: 0, golden: 0, ds: "Coleccionable del cofre de login. No se compra." },
  farolito:           { label: "Farolito de luciérnagas", cofre: 1, plata: 0, golden: 0, ds: "Coleccionable del cofre de login. De noche titila." },
};
// alto en pantalla de cada adorno, en píxeles (el tile mide 42). El ancho sale solo,
// respetando la proporción del sprite. Con esto un farol no queda del porte de un árbol.
var DECO_ALTO = {
  valla: 24, flores: 24, farol: 56, banco: 26,
  espantapajaros: 48, fuente: 42, estatua: 36, arbolito: 46,   // fixs.docx #4 (11/8): fuente 30→42 y farol 40→56 (+40%)
  espantapajaros_oro: 48, farolito: 40,
};
var DECO_MAX = 40;   // cuántos adornos se pueden tener colocados a la vez
function decoTengo(id) { G.decoBolsa = G.decoBolsa || {}; return G.decoBolsa[id] || 0; }
function decoPuestos() { return (G.decos || []).length; }
function comprarDeco(id) {
  const d = DECO_DEF[id]; if (!d) return;
  if (d.cofre) { toast("Ese solo sale del cofre de login"); return; }   // no tiene precio: no se puede comprar
  if (G.tuto && !G.tuto.done) { toast("🎯 Los adornos se abren al terminar el tutorial — seguí el objetivo de arriba"); return; }   // embudo (13/8)
  if (d.plata && G.plata < d.plata) { toast("Te falta plata (" + fmt(d.plata) + ")"); return; }
  if (d.golden && G.golden < d.golden) { toast("Te falta $Golden (" + d.golden + ")"); return; }
  if (d.plata && typeof tutoGuardia === "function" && !tutoGuardia("plata", d.plata, "comprar adornos")) return;   // guardia del tutorial (12/8)
  if (d.plata) G.plata -= d.plata;
  if (d.golden) G.golden -= d.golden;
  G.decoBolsa = G.decoBolsa || {};
  G.decoBolsa[id] = (G.decoBolsa[id] || 0) + 1;
  log("Compraste " + d.label + ". Está en tu bolsa: colocalo desde el modo edición de la granja.", "gold");
  toast("+1 " + d.label + " — en tu bolsa (✏️ modo edición para ponerlo)");
  refreshHud(); if (typeof refreshMarket === "function" && isOpen("ov-market")) refreshMarket();
  if (typeof saveFarm === "function") saveFarm(true);
}
// coloca uno en la granja (lo llama la escena, que sabe dónde hay lugar)
function decoColocar(id, col, row) {
  if (decoTengo(id) <= 0) { toast("No te queda ninguno"); return false; }
  if (decoPuestos() >= DECO_MAX) { toast("Ya tenés " + DECO_MAX + " adornos puestos (el tope)"); return false; }
  G.decoBolsa[id]--;
  G.decos = G.decos || [];
  G.decos.push({ id, col, row });
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}
function decoSacar(i) {   // lo levanta y vuelve a la bolsa de adornos
  const d = (G.decos || [])[i]; if (!d) return false;
  G.decos.splice(i, 1);
  G.decoBolsa = G.decoBolsa || {};
  G.decoBolsa[d.id] = (G.decoBolsa[d.id] || 0) + 1;
  if (typeof saveFarm === "function") saveFarm(true);
  return true;
}

// ============ PARCELAS: pagar con PLATA o con $GOLDEN (10/8) =======================
// El doc pide que el jugador elija con qué pagar. La de $Golden se calcula desde la de plata
// con un cambio fijo, así el diseñador toca UN solo número y las dos quedan alineadas.
var PLOT_GOLDEN_CAMBIO = 900;   // cuántas de plata "vale" 1 $Golden a la hora de comprar parcelas
var PLOT_GOLDEN_MIN = 5;        // piso: sin esto la primera parcela salía 1 $Golden, o sea regalada
// TOPE 60 (Discord del diseñador 10/8): "12 es muy poco, que compre la gente a placer".
// Las primeras 12 son la grilla de siempre; de la 13 a la 60 cada una nace en una celda
// libre y se acomoda desde el modo edición, como cualquier objeto.
var PLOT_MAX = 60;
var PLOT_EXTRA_SUBA = 1.12;   // suba por parcela después de la 12 (la duplicación de antes hacía imposible la 60)
function plotUnlockGolden() { return Math.max(PLOT_GOLDEN_MIN, Math.ceil(plotUnlockCost() / PLOT_GOLDEN_CAMBIO)); }
// fix #17 del diseñador (11/8): la parcela comprada NO se tira sola al suelo — queda
// "pendiente" (plotsOwned > GF.PLOTS.length) y se coloca con clic desde el modo edición.
function parcelasPendientes() { return Math.max(0, (G.plotsOwned || 2) - GF.PLOTS.length); }
function parcelaColocar(col, row) {   // la llama la escena con la celda que eligió el jugador
  if (parcelasPendientes() <= 0) return false;
  G.layoutPlots = G.layoutPlots || {};
  G.layoutPlots[GF.PLOTS.length] = { col, row };   // la escena la levanta de acá al reiniciar
  if (typeof saveFarm === "function") saveFarm(true);
  reiniciarGranjaSuave();   // 13/8: con telón, no como congelamiento
  return true;
}
function comprarParcela(conGolden) {
  if ((G.plotsOwned || 2) >= PLOT_MAX) { toast("Ya tenés las " + PLOT_MAX + " parcelas"); return; }
  if (G.tuto && !G.tuto.done) { toast("🎯 Durante el tutorial las parcelas llegan solas al subir de nivel — seguí el objetivo"); return; }   // embudo (13/8)
  if (conGolden) {
    const c = plotUnlockGolden();
    if (G.golden < c) { toast("Te falta $Golden (" + c + ")"); return; }
    G.golden -= c;
  } else {
    const c = plotUnlockCost();
    if (G.plata < c) { toast("Te falta plata (" + fmt(c) + ")"); return; }
    if (typeof tutoGuardia === "function" && !tutoGuardia("plata", c, "comprar parcelas")) return;   // guardia del tutorial (12/8)
    G.plata -= c;
  }
  G.plotsOwned = Math.min(PLOT_MAX, (G.plotsOwned || 2) + 1);
  log("Desbloqueaste una parcela nueva. Ahora tenés " + G.plotsOwned + ".", "gold");
  if (G.plotsOwned > GF.PLOTS.length) {   // la 13 en adelante: se coloca a mano (#17)
    toast("¡Parcela nueva! Está en tu zona de edición: ✏️ ponela donde quieras");
    if (typeof syncEditDeco === "function") syncEditDeco();   // refresca el botón "Poner parcela"
  } else {
    toast("¡Parcela nueva!");
    if (window.farmScene && window.farmScene.refreshPlotLocks) { try { window.farmScene.refreshPlotLocks(); } catch (e) {} }
  }
  refreshHud(); if (typeof refreshMarket === "function" && isOpen("ov-market")) refreshMarket();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ============ GOD HAND: el cropper que siembra solo (10/8) =========================
// Se compra una vez con $Golden y queda para siempre. Mientras lo tengas, al volver al juego
// las parcelas que quedaron VACÍAS aparecen ya sembradas con la semilla que tenías elegida,
// gastando esas semillas, y el crecimiento cuenta desde que te fuiste — no desde ahora.
// No cosecha: cosechar sigue siendo tuyo. Solo te ahorra el paso aburrido.
var GODHAND_GOLDEN = 500;
function tengoGodHand() { return !!G.godHand; }
function comprarGodHand() {
  if (tengoGodHand()) { toast("Ya tenés la GOD HAND"); return; }
  if (G.tuto && !G.tuto.done) { toast("🎯 La GOD HAND se abre al terminar el tutorial — seguí el objetivo de arriba"); return; }   // embudo (13/8)
  if (G.golden < GODHAND_GOLDEN) { toast("Te falta $Golden (" + GODHAND_GOLDEN + ")"); return; }
  G.golden -= GODHAND_GOLDEN;
  G.godHand = true;
  log("Compraste la GOD HAND. De ahora en más, las parcelas vacías se siembran solas mientras no estás.", "gold");
  if (window.celebrate) celebrate({ title: "GOD HAND", sub: "Siembra automática", big: true, reward: "Las parcelas vacías se siembran solas" });
  refreshHud(); if (typeof refreshMarket === "function" && isOpen("ov-market")) refreshMarket();
  if (typeof saveFarm === "function") saveFarm(true);
}
/* ---- GOD HAND 2.0 (fixs.docx #19, 11/8): el cropper NFT completo -----------------
   Ya no siembra "lo que tengas elegido" y listo: tiene SU PROPIO inventario de 6
   espacios (50 semillas cada uno, 300 en total) y mientras no estás hace el ciclo
   entero en tus parcelas vacías: SIEMBRA → COSECHA → RESIEMBRA, y al volver te
   entrega todo lo producido junto. Cobra en plata por hora trabajada: la primera
   sale GODHAND_PLATA_HORA y cada una que sigue un 10% más. Trabaja hasta 24 h. */
var GODHAND_SLOTS = 6, GODHAND_CAP_SLOT = 50;            // 6 × 50 = 300 semillas
var GODHAND_PLATA_HORA = 100;                            // la primera hora
var GODHAND_SUBA_HORA = 1.10;                            // cada hora sale 10% más que la anterior
var GODHAND_MAX_H = 24;                                  // tope de trabajo por ausencia
function godHandInv() { if (!Array.isArray(G.ghInv) || G.ghInv.length !== GODHAND_SLOTS) G.ghInv = Array.from({ length: GODHAND_SLOTS }, () => null); return G.ghInv; }
function godHandTotal() { return godHandInv().reduce((a, s) => a + (s ? s.n : 0), 0); }
function godHandCostoHoras(h) { let c = 0, p = GODHAND_PLATA_HORA; for (let i = 0; i < h; i++) { c += Math.round(p); p *= GODHAND_SUBA_HORA; } return c; }
function godHandCargar(slot, key) {   // pasa semillas de tu bolsa al puño (hasta llenar el espacio)
  const inv = godHandInv(); if (slot < 0 || slot >= GODHAND_SLOTS || !CROP_DEF[key]) return;
  const s = inv[slot];
  if (s && s.key !== key && s.n > 0) { toast("Ese espacio ya tiene " + CROP_DEF[s.key].label); return; }
  const cabe = GODHAND_CAP_SLOT - (s ? s.n : 0), hay = Math.floor(G.seeds[key] || 0);
  const n = Math.min(cabe, hay);
  if (n <= 0) { toast(hay <= 0 ? "No tenés semillas de " + CROP_DEF[key].label : "Ese espacio está lleno"); return; }
  G.seeds[key] -= n;
  inv[slot] = { key, n: (s ? s.n : 0) + n };
  toast("+" + n + " " + CROP_DEF[key].label + " al GOD HAND");
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshGodHand === "function" && isOpen("ov-godhand")) refreshGodHand();
  if (typeof saveFarm === "function") saveFarm(true);
}
function godHandVaciar(slot) {   // devuelve las semillas del espacio a tu bolsa
  const inv = godHandInv(), s = inv[slot]; if (!s || !s.n) return;
  G.seeds[s.key] = (G.seeds[s.key] || 0) + s.n;
  inv[slot] = null;
  if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshGodHand === "function" && isOpen("ov-godhand")) refreshGodHand();
  if (typeof saveFarm === "function") saveFarm(true);
}
// La corre main.js al entrar, con los milisegundos que estuviste afuera.
function godHandSembrar(msAusente) {
  if (!tengoGodHand() || !Array.isArray(G.plots)) return 0;
  const inv = godHandInv();
  if (!godHandTotal()) return 0;
  const owned = Math.max(2, Math.min(GF.PLOTS.length, G.plotsOwned || 2));
  const libres = [];
  for (let i = 0; i < owned; i++) { const p = G.plots[i]; if (!p || p.state === "dry") libres.push(i); }
  if (!libres.length) return 0;
  const horasFuera = Math.min(GODHAND_MAX_H, Math.max(0, msAusente || 0) / 3600000);
  if (horasFuera < 0.02) return 0;
  const desde = nowMs() - Math.max(0, msAusente || 0);
  const prod = {}, usado = {};
  let horasTrabajadas = 0, ciclos = 0;
  for (const i of libres) {
    let t = horasFuera;   // horas de ausencia disponibles en ESTA parcela
    while (true) {
      const slot = inv.find(s => s && s.n > 0 && CROP_DEF[s.key]);
      if (!slot) break;
      const ghoras = (CROP_DEF[slot.key].grow * (typeof cdMult === "function" ? cdMult() : 1)) / 3600;
      if (ghoras <= t) {   // le da el tiempo: cosecha completa y sigue
        t -= ghoras; slot.n--; usado[slot.key] = (usado[slot.key] || 0) + 1; ciclos++;
        const n = Math.max(1, Math.round((CROP_DEF[slot.key].yield || 1) * yieldMult()));
        prod[slot.key] = (prod[slot.key] || 0) + n;
        horasTrabajadas = Math.max(horasTrabajadas, horasFuera - t);
      } else {   // no llega a otra cosecha: deja la parcela SEMBRADA creciendo desde ese momento
        slot.n--; usado[slot.key] = (usado[slot.key] || 0) + 1;
        const dur = CROP_DEF[slot.key].grow * 1000 * (typeof cdMult === "function" ? cdMult() : 1);
        const t0 = desde + (horasFuera - t) * 3600000;
        G.plots[i] = { state: "growing", cropKey: slot.key, readyAt: t0 + dur, growTotal: dur, witherAt: 0 };
        horasTrabajadas = horasFuera;
        break;
      }
    }
  }
  if (!ciclos && !Object.keys(usado).length) return 0;
  // lo cosechado entra directo (los buffs de yield del momento ya se aplicaron por cosecha)
  for (const k in prod) G.res[k] = (G.res[k] || 0) + prod[k];
  // el sueldo: por hora trabajada, cada una más cara que la anterior
  const horas = Math.max(1, Math.ceil(horasTrabajadas));
  const costo = Math.min(G.plata, godHandCostoHoras(horas));
  G.plata -= costo;
  const detalle = Object.keys(prod).map(k => "+" + prod[k] + " " + CROP_DEF[k].label).join(" · ");
  log("GOD HAND trabajó " + horas + " h mientras no estabas: " + ciclos + " cosecha(s)" + (detalle ? " — " + detalle : "") +
      ". Cobró " + fmt(costo) + " de plata. Semillas restantes: " + godHandTotal() + "/300.", "gold");
  if (window.celebrate && ciclos) celebrate({ title: "GOD HAND", sub: horas + " h de trabajo", big: false, reward: detalle || (ciclos + " cosechas") });
  if (typeof saveFarm === "function") saveFarm(true);
  if (typeof syncSlots === "function") syncSlots();
  return ciclos;
}

// ============ LA ZONA NEGRA, PARTIDA EN MAPAS (10/8, doc del diseñador) ============
// Antes era UN solo bosque con todos los monstruos repartidos por profundidad: la rata al
// lado del dragón. Ahora son cuatro mapas encadenados, cada uno con SU familia de bichos,
// su piso y su nivel de entrada. Se pasa de uno al otro por teleports, y para volver a la
// granja siempre se sale por la izquierda del primero.
//
//   pantano  →  piedra  →  fuego  →  guarida (el jefe)
//
// Cada mapa dice qué mobs viven ahí y con qué densidad. `x0` y `x1` son la franja del mapa
// (0 = entrada, 1 = fondo) donde puede aparecer ese bicho, y el número es cuántos hay.
const ZONA_ORDER = ["pantano", "piedra", "fuego", "guarida"];
const ZONA_DEF = {
  pantano: {
    label: "Pantano", lvl: 1,
    ds: "Agua estancada y bichos chicos. Por acá se empieza.",
    piso: [0x2f4a20, 0x2a431c], mata: 0x223a16, hierba: 0x3a5527,
    arboles: 28,
    mobs: [["rata", 0.08, 0.40, 4], ["murcielago", 0.20, 0.62, 4], ["larva", 0.35, 0.90, 4]],
  },
  piedra: {
    label: "Cañón de Piedra", lvl: 10,
    ds: "Roca pelada y cosas que sí pegan. Traé algo mejor que la espada de madera.",
    piso: [0x3b3a33, 0x35342e], mata: 0x2a2924, hierba: 0x4a4838,
    arboles: 14,
    mobs: [["baba", 0.08, 0.35, 3], ["arana", 0.20, 0.55, 3], ["goblin", 0.35, 0.70, 3],
           ["orco", 0.50, 0.85, 3], ["lancero", 0.65, 0.92, 2]],
  },
  fuego: {
    label: "Grietas de Fuego", lvl: 22,
    ds: "El suelo está caliente. Acá abajo se saca lo que vale de verdad.",
    piso: [0x4a2a20, 0x42251c], mata: 0x33170f, hierba: 0x6b3a22,
    arboles: 8,
    mobs: [["esqueleto", 0.08, 0.40, 3], ["golem", 0.25, 0.60, 3], ["hombre_lobo", 0.40, 0.75, 3],
           ["guerrero", 0.55, 0.88, 3], ["troll", 0.70, 0.94, 2]],
  },
  guarida: {
    label: "Guarida del Dragón", lvl: 35, clan: true,
    ds: "Antes del jefe hay una guardia de orcos. El dragón NO se hace solo.",
    piso: [0x2a2030, 0x241b2a], mata: 0x1a1420, hierba: 0x3d2f4a,
    arboles: 4,
    // guardia de orcos ADELANTE, el jefe al fondo
    mobs: [["guerrero", 0.10, 0.35, 4], ["lancero", 0.20, 0.45, 3], ["orco", 0.15, 0.50, 4],
           ["ogro", 0.45, 0.65, 2], ["espectro", 0.55, 0.72, 2], ["demonio", 0.62, 0.78, 2],
           ["dragon", 0.90, 0.96, 1]],
  },
};
function zonaActual() { return ZONA_DEF[GF.zona] ? GF.zona : "pantano"; }
function zonaSig(k) { const i = ZONA_ORDER.indexOf(k || zonaActual()); return i >= 0 ? ZONA_ORDER[i + 1] || null : null; }
function zonaAnt(k) { const i = ZONA_ORDER.indexOf(k || zonaActual()); return i > 0 ? ZONA_ORDER[i - 1] : null; }
// ¿tengo nivel de Combate para entrar? (el del doc: cada mapa pide más)
function zonaPuedeEntrar(k) {
  const z = ZONA_DEF[k]; if (!z) return false;
  const lvl = (typeof combatInfo === "function") ? combatInfo().lvl : 1;
  return lvl >= z.lvl;
}
// hasta dónde llegó el jugador: los teleports solo llevan a lo ya visitado o al siguiente
function zonaMarcarVisitada(k) {
  G.zonasVistas = G.zonasVistas || ["pantano"];
  if (k && G.zonasVistas.indexOf(k) < 0) { G.zonasVistas.push(k); if (typeof saveFarm === "function") saveFarm(true); }
}

// ---- ASALTO AL DRAGÓN: los números (10/8) ----
// El jefe del asalto NO es el dragón suelto del mapa: tiene su propia vida, compartida por
// todo el clan y guardada en Supabase. Estos números son los que ve la ventana de Clan.
var RAID_MIN_MIEMBROS = 3;    // cuántos hacen falta para abrir un asalto
var RAID_HP = 60000;          // vida compartida del Dragón (entre 3 son 20.000 cada uno)
var RAID_HORAS = 48;          // cuánto dura abierto
// botín COMPLETO del jefe: cada uno cobra su porción según el daño que aportó
var RAID_BOTIN = { plata: 12000, esencia_oscura: 40, diamante: 6, netherita: 2 };

// ---- ESENCIA OSCURA: el recurso que SOLO sale en la Zona Negra ----
// El doc pide "el nuevo recurso que se farmea solo en zona negra". No se compra, no se
// cultiva y no lo dan los animales: la única forma de tenerlo es bajar y pelear. Cada mapa
// suelta más que el anterior.
RES_LABEL.esencia_oscura = "Esencia oscura";
if (typeof RES_EMOJI !== "undefined") RES_EMOJI.esencia_oscura = "🌑";
var ESENCIA_POR_ZONA = { pantano: 0.10, piedra: 0.22, fuego: 0.40, guarida: 0.75 };
// se tira por cada monstruo vencido; devuelve cuánta cayó (0 casi siempre en el pantano)
// fixs.docx #1 (11/8): la esencia oscura la dan SOLO los mobs de nivel 10 a 12
// (araña y goblin hoy). Antes era por zona y caía de cualquier bicho de esa zona.
function rollEsencia(zona, esBoss, lvlMob) {
  if (!(lvlMob >= 10 && lvlMob <= 12)) return 0;
  const p = (ESENCIA_POR_ZONA[zona] || 0);
  let n = Math.floor(p);
  if (Math.random() < (p - n)) n++;
  return n;
}

// ============ VIAJE A LA ZONA NEGRA: enfriamiento + resumen (10/8) ==================
// Antes se entraba y salía de la Zona Negra sin ninguna fricción, y al volver no quedaba
// registro de qué habías sacado: el botín aparecía diluido en la bolsa. Ahora:
//   · al entrar se saca una FOTO del estado (recursos, plata, XP de combate, muertes)
//   · al volver se compara contra esa foto y sale un cuadro con lo que trajiste
//   · y arranca un enfriamiento antes de poder volver a entrar
var ZONA_CD_MIN = 3;          // minutos de descanso entre viaje y viaje
function zonaCdLeft() { return Math.max(0, (G.zonaCdHasta || 0) - nowMs()); }
function zonaMatados() {
  const m = (G.stats && G.stats.matar) || {};
  return Object.keys(m).reduce((s, k) => s + (m[k] || 0), 0);
}
function zonaEntrar() {
  const res = {};
  for (const k in G.res) res[k] = G.res[k] || 0;
  G.zonaViaje = { t: nowMs(), res, plata: G.plata || 0, golden: G.golden || 0,
                  combatXp: G.combatXp || 0, matados: zonaMatados(), hp: G.hp };
}
// devuelve el resumen del viaje (y lo cierra). null si no había viaje abierto.
function zonaSalir(derrotado) {
  const v = G.zonaViaje; G.zonaViaje = null;
  G.zonaCdHasta = nowMs() + ZONA_CD_MIN * 60000;
  if (!v) return null;
  const gan = {};
  for (const k in G.res) { const d = (G.res[k] || 0) - (v.res[k] || 0); if (d > 0) gan[k] = d; }
  return {
    min: Math.max(0, (nowMs() - v.t) / 60000),
    res: gan,
    plata: Math.max(0, (G.plata || 0) - v.plata),
    golden: Math.max(0, (G.golden || 0) - v.golden),
    xp: Math.max(0, (G.combatXp || 0) - v.combatXp),
    matados: Math.max(0, zonaMatados() - v.matados),
    derrotado: !!derrotado,
  };
}

// ================= EL ALTAR DE OFRENDAS ("2das mejoras", 4/8) =================
// Entregás recursos → se QUEMAN (salen del juego) → ganás Puntos de Ofrenda.
// El pozo del airdrop es FIJO y se reparte PROPORCIONAL: entregar más no crea más token,
// solo cambia tu porción. Nunca "X recurso = Y tokens" a tasa fija (esa es la impresora que hunde el precio).
var OFRENDA_POZO = 1000000;   // pozo fijo de $Golden reservado para el airdrop (referencia, editable)
const OFRENDA_PTS = {
  madera: 1, piedra: 1,
  bronce: 3, hierro: 5, oro: 10, diamante: 30, netherita: 120,
  papa: 1, zanahoria: 2, cebolla: 4, calabacin: 6, repollo: 10,
  calabaza: 15, brocoli: 25, girasol: 35, trigo: 50, maiz: 80,
};
const OFRENDA_ORDER = ["madera","piedra","bronce","hierro","oro","diamante","netherita",
  "papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz"];
function ofrendaPuntos() { return Math.floor(G.ofrendaPts || 0); }
function ofrendaValor(k) { return OFRENDA_PTS[k] || 0; }
function ofrendar(k, n) {
  n = Math.max(1, Math.floor(n || 1));
  if (!(G.built && G.built.ofrendas)) { toast("Primero construí el Altar de Ofrendas"); return; }
  const pts = ofrendaValor(k); if (!pts) { toast("Ese recurso no se puede ofrendar"); return; }
  const tengo = Math.floor(G.res[k] || 0);
  if (tengo < n) { toast("No tenés " + n + " de " + (RES_LABEL[k] || k)); return; }
  G.res[k] -= n;                      // se QUEMAN: no vuelven al juego
  const gana = pts * n;
  G.ofrendaPts = ofrendaPuntos() + gana;
  G.ofrendaLog = (G.ofrendaLog || 0) + n;
  statAdd("ofrendar", k, n);
  log("Ofrendaste " + n + " de " + (RES_LABEL[k] || k) + " → +" + fmt(gana) + " Puntos de Ofrenda (total " + fmt(ofrendaPuntos()) + ").", "gold");
  toast("+" + fmt(gana) + " puntos");
  if (window.celebrate && gana >= 500) celebrate({ title: "+" + fmt(gana), sub: "Puntos de Ofrenda", reward: "Total: " + fmt(ofrendaPuntos()) });
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshOfrendas === "function" && isOpen("ov-ofrendas")) refreshOfrendas();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ================= LA CURTIDURÍA: LAS 20 PIEZAS DE ARMADURA ("2das mejoras", 4/8) =================
// 4 sets × 5 piezas. Se craftean con el material del animal + plata (la pesada además pide hierro).
// Piezas sueltas = defensa parcial · set completo = bono de identidad.
const ARMOR_SLOTS = ["yelmo", "pecho", "pantalones", "botas", "guantes"];
const ARMOR_SLOT_LABEL = { yelmo:"Yelmo", pecho:"Pecho", pantalones:"Pantalones", botas:"Botas", guantes:"Guantes" };
const ARMOR_SETS = {
  fibra:    { label:"Armadura de Fibra",    animal:"alpaca", mat:"fibra",    tipo:"ligera",
    bono:{ txt:"+15% vel. ataque + 12% evasión", atkSpd:15, evade:12 },
    piezas:{ yelmo:{mat:2,plata:30,def:3}, pecho:{mat:4,plata:60,def:5}, pantalones:{mat:3,plata:45,def:4}, botas:{mat:2,plata:25,def:2}, guantes:{mat:1,plata:20,def:1} } },
  piel:     { label:"Armadura de Piel",     animal:"conejo", mat:"pelaje",   tipo:"vitalidad",
    bono:{ txt:"+2 HP/s de regeneración + 12% vel. de farmeo", regen:2, farm:12 },
    piezas:{ yelmo:{mat:2,plata:35,def:3}, pecho:{mat:5,plata:70,def:6}, pantalones:{mat:4,plata:55,def:5}, botas:{mat:2,plata:30,def:2}, guantes:{mat:2,plata:25,def:2} } },
  cuero:    { label:"Armadura de Cuero",    animal:"toro",   mat:"cuero",    tipo:"equilibrada",
    bono:{ txt:"+40 de vida máxima + 8% de defensa", hpmax:40, defPct:8 },
    piezas:{ yelmo:{mat:3,plata:55,def:5}, pecho:{mat:5,plata:100,def:8}, pantalones:{mat:4,plata:80,def:6}, botas:{mat:2,plata:40,def:3}, guantes:{mat:2,plata:35,def:3} } },
  colmillo: { label:"Armadura de Colmillo", animal:"jabali", mat:"colmillo", tipo:"pesada",
    bono:{ txt:"+20% de defensa y +10% de daño (−5% de velocidad)", defPct:20, dmgPct:10, spd:-5 },
    piezas:{ yelmo:{mat:2,hierro:5,plata:120,def:8}, pecho:{mat:3,hierro:8,plata:200,def:12}, pantalones:{mat:2,hierro:6,plata:150,def:9}, botas:{mat:1,hierro:4,plata:80,def:5}, guantes:{mat:1,hierro:3,plata:70,def:4} } },
};
const ARMOR_ORDER = ["fibra", "piel", "cuero", "colmillo"];
function armorKey(set, pieza) { return "arm_" + set + "_" + pieza; }
function armorTiene(set, pieza) { return !!(G.armor && G.armor[armorKey(set, pieza)]); }
function armorPuestas(set) { return ARMOR_SLOTS.filter(pz => armorTiene(set, pz)).length; }
function armorSetCompleto(set) { return armorPuestas(set) === ARMOR_SLOTS.length; }
function armorEquipado(set) { return G.armorEq === set; }
// defensa: suma de las piezas del set EQUIPADO (más las piezas viejas de loot, que siguen valiendo)
function armorDefensa() {
  const set = G.armorEq; if (!set || !ARMOR_SETS[set]) return 0;
  let d = 0;
  ARMOR_SLOTS.forEach(pz => { if (armorTiene(set, pz)) d += ARMOR_SETS[set].piezas[pz].def; });
  return d;
}
function armorBono() { const set = G.armorEq; return (set && armorSetCompleto(set)) ? ARMOR_SETS[set].bono : null; }
function armorBonoVal(campo) { const b = armorBono(); return (b && b[campo]) || 0; }
// set de Fibra completo: velocidad de ataque y evasión (antes el set entero no hacía nada)
function atkSpdMult() { return 1 + ((typeof eqRunaVal === "function" ? eqRunaVal("veloz") : 0) + armorBonoVal("atkSpd")) / 100; }
function evadeChance() { return armorBonoVal("evade") / 100; }   // 0..1
function craftArmor(set, pieza) {
  const sd = ARMOR_SETS[set]; if (!sd) return;
  if (!(G.built && G.built.curtiduria)) { toast("Necesitás la Curtiduría"); return; }
  if (armorTiene(set, pieza)) { toast("Ya tenés esa pieza"); return; }
  const p = sd.piezas[pieza]; if (!p) return;
  const falta = [];
  if ((G.res[sd.mat] || 0) < p.mat) falta.push(p.mat + " " + RES_LABEL[sd.mat]);
  if (p.hierro && (G.res.hierro || 0) < p.hierro) falta.push(p.hierro + " Hierro");
  if (G.plata < p.plata) falta.push(p.plata + " de plata");
  if (falta.length) { toast("Te falta: " + falta.join(" · ")); return; }
  G.res[sd.mat] -= p.mat;
  if (p.hierro) G.res.hierro -= p.hierro;
  G.plata -= p.plata;
  G.armor = G.armor || {};
  G.armor[armorKey(set, pieza)] = true;
  if (!G.armorEq) G.armorEq = set;
  addXp("crafting", 12);
  const completo = armorSetCompleto(set);
  log("Crafteaste " + ARMOR_SLOT_LABEL[pieza] + " de " + sd.label + " (+" + p.def + " de defensa)." + (completo ? " ¡SET COMPLETO: " + sd.bono.txt + "!" : ""), "gold");
  if (completo && window.celebrate) celebrate({ title: "¡SET COMPLETO!", sub: sd.label, big: true, reward: sd.bono.txt });
  else toast(ARMOR_SLOT_LABEL[pieza] + " lista");
  applyCombatHp();
  refreshHud(); if (typeof refreshCurtiduria === "function" && isOpen("ov-curtiduria")) refreshCurtiduria();
  if (isOpen("ov-equip")) refreshEquip();
  if (typeof saveFarm === "function") saveFarm(true);
}
function equiparSet(set) {
  if (!ARMOR_SETS[set] || !armorPuestas(set)) { toast("Todavía no tenés piezas de ese set"); return; }
  G.armorEq = set;
  applyCombatHp(); refreshHud();
  log("Te pusiste la " + ARMOR_SETS[set].label + " (" + armorDefensa() + " de defensa" + (armorSetCompleto(set) ? " · " + ARMOR_SETS[set].bono.txt : "") + ").", "good");
  toast(ARMOR_SETS[set].label);
  if (typeof refreshCurtiduria === "function" && isOpen("ov-curtiduria")) refreshCurtiduria();
  if (isOpen("ov-equip")) refreshEquip();
  if (typeof saveFarm === "function") saveFarm();
}

// ================= EL ESTABLO: ANIMALES Y MATERIALES ("2das mejoras", 4/8) =================
// Comprás el animal con $Golden → lo alimentás con su cultivo preferido → sube la felicidad →
// produce material cada cierto tiempo (más y mejor si está feliz) → con eso se craftea la armadura.
RES_LABEL.fibra = "Fibra";       RES_EMOJI.fibra = "🧵";
RES_LABEL.pelaje = "Pelaje";     RES_EMOJI.pelaje = "🧶";
RES_LABEL.cuero = "Cuero";       RES_EMOJI.cuero = "🟫";
RES_LABEL.colmillo = "Colmillo"; RES_EMOJI.colmillo = "🦷";
const ANIMAL_ORDER = ["alpaca", "conejo", "toro", "jabali"];
const ANIMAL_DEF = {
  alpaca: { label:"Alpaca", emoji:"🦙", golden:40,  mat:"fibra",    come:["trigo"],              cicloH:12, porCiclo:2, armadura:"fibra" },
  conejo: { label:"Conejo", emoji:"🐰", golden:40,  mat:"pelaje",   come:["zanahoria","repollo"], cicloH:12, porCiclo:2, armadura:"piel" },
  toro:   { label:"Toro",   emoji:"🐂", golden:60,  mat:"cuero",    come:["trigo","maiz"],        cicloH:16, porCiclo:2, armadura:"cuero" },
  jabali: { label:"Jabalí", emoji:"🐗", golden:100, mat:"colmillo", come:["calabaza","maiz"],     cicloH:20, porCiclo:1, armadura:"colmillo" },
};
var ESTABLO_COST = { madera: 50, piedra: 30, oro: 10 };   // edificio (doc)
var FELIZ_POR_COMIDA = 15;      // cuánta felicidad da alimentarlo con su cultivo preferido
var FELIZ_COMIDA_GENERICA = 8;  // Fixes.docx 14/8 #1: cualquier otro cultivo también alimenta, pero rinde menos
var FELIZ_BAJA_H = 1.5;         // cuánta felicidad pierde por hora sin comer
var FELIZ_MIN_PROD = 0.5;       // rendimiento mínimo con felicidad 0 (produce la mitad)
// ANIMALES REPETIDOS (10/8, pedido del diseñador). Antes cada tipo era UNO solo:
// G.animals[k] era un objeto y comprarAnimal rebotaba con "Ya tenés alpaca". Ahora
// G.animals[k] es una LISTA de bichos de ese tipo, y cada uno lleva su propia felicidad y su
// propio ciclo. Alimentar y recoger actúan sobre TODOS los del tipo de una: con 5 alpacas,
// cinco botones separados sería un castigo.
// Los guardados viejos (objeto suelto) se migran solos en save.js.
var ANIMAL_MAX = 5;        // cuántos se pueden tener de cada tipo
var ANIMAL_SUBE = 0.5;     // cada uno extra cuesta un 50% más que el anterior

function animalLista(k) {
  G.animals = G.animals || {};
  const v = G.animals[k];
  if (Array.isArray(v)) return v;
  // OJO: hay que GUARDAR la lista, no devolver una suelta. Devolviendo [] a secas, el push de
  // comprarAnimal caía en un array de descarte y la compra se perdía en silencio.
  G.animals[k] = v ? [v] : [];   // (v = guardado viejo, un solo bicho suelto)
  return G.animals[k];
}
function animalCant(k) { return animalLista(k).length; }
function animalDe(k) { return animalLista(k)[0] || null; }   // "¿tengo de este tipo?" (arma la armadura, el tutorial, etc.)
function animalPrecio(k) {
  const d = ANIMAL_DEF[k]; if (!d) return 0;
  return Math.round(d.golden * Math.pow(1 + ANIMAL_SUBE, animalCant(k)));
}
function animalFelizDe(a) {   // la felicidad baja sola con el tiempo
  if (!a) return 0;
  const h = (nowMs() - (a.comidoAt || a.desde || nowMs())) / 3600000;
  return Math.max(0, Math.min(100, Math.round((a.feliz || 0) - h * FELIZ_BAJA_H)));
}
// felicidad del tipo = promedio de los que tenés (es lo que muestra la ventana)
function animalFelicidad(k) {
  const l = animalLista(k); if (!l.length) return 0;
  return Math.round(l.reduce((s, a) => s + animalFelizDe(a), 0) / l.length);
}
function comprarAnimal(k) {
  const d = ANIMAL_DEF[k]; if (!d) return;
  if (!(G.built && G.built.establo)) { toast("Primero construí el Establo"); return; }
  const tengo = animalCant(k);
  if (tengo >= ANIMAL_MAX) { toast("Ya tenés " + ANIMAL_MAX + " " + d.label.toLowerCase() + " (el tope)"); return; }
  const precio = animalPrecio(k);
  if (G.golden < precio) { toast("Te falta $Golden (" + precio + ")"); return; }
  G.golden -= precio;
  animalLista(k).push({ desde: nowMs(), feliz: 50, comidoAt: nowMs(), prodAt: nowMs() });
  log("Compraste " + d.label + " por " + precio + " $Golden (ahora tenés " + animalCant(k) + "). Alimentalo con " + d.come.map(c => CROP_DEF[c].label).join(" o ") + ".", "gold");
  toast("¡" + d.label + " en el Establo!");
  if (!tengo && window.celebrate) celebrate({ title: "¡" + d.label.toUpperCase() + "!", sub: "Establo", reward: "Desbloquea la armadura de " + d.mat });
  refreshHud(); if (typeof refreshEstablo === "function" && isOpen("ov-establo")) refreshEstablo();
  if (window.farmScene && window.farmScene.syncAnimales) { try { window.farmScene.syncAnimales(); } catch (e) {} }   // aparece en la granja en el acto
  if (typeof saveFarm === "function") saveFarm(true);
}
// alimenta a TODOS los de ese tipo, uno por cultivo, hasta donde alcance
function alimentarAnimal(k) {
  const d = ANIMAL_DEF[k], l = animalLista(k); if (!d || !l.length) return;
  let dados = 0, gastado = {};
  for (const a of l) {
    // Fixes.docx 14/8 #1: siempre se puede alimentar — su cultivo PREFERIDO da la felicidad
    // entera; si no hay, aceptan CUALQUIER cultivo por un poco menos (antes la alpaca solo
    // comía trigo, que es de nivel alto, y los bichos se morían de hambre sin remedio)
    let cultivo = d.come.find(c => (G.res[c] || 0) > 0), preferido = true;
    if (!cultivo) { cultivo = Object.keys(CROP_DEF).find(c => (G.res[c] || 0) > 0); preferido = false; }
    if (!cultivo) break;
    G.res[cultivo] -= 1; gastado[cultivo] = (gastado[cultivo] || 0) + 1;
    a.feliz = Math.min(100, animalFelizDe(a) + (preferido ? FELIZ_POR_COMIDA : FELIZ_COMIDA_GENERICA));
    a.comidoAt = nowMs();
    statAdd("alimentar", k); dados++;
  }
  if (!dados) { toast("Necesitás algún cultivo — lo preferido de " + d.label + ": " + d.come.map(c => CROP_DEF[c].label).join(" o ")); return; }
  const qué = Object.keys(gastado).map(c => gastado[c] + " " + CROP_DEF[c].label).join(" + ");
  log("Alimentaste " + dados + " " + d.label + " con " + qué + ". Felicidad media: " + animalFelicidad(k) + "/100.", "good");
  toast(d.label + " · felicidad " + animalFelicidad(k));
  refreshHud(); if (typeof refreshEstablo === "function" && isOpen("ov-establo")) refreshEstablo();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof saveFarm === "function") saveFarm();
}
function animalListo(k) {   // ¿hay AL MENOS uno listo de este tipo?
  const d = ANIMAL_DEF[k]; if (!d) return false;
  return animalLista(k).some(a => nowMs() - (a.prodAt || 0) >= d.cicloH * 3600000);
}
// cuánto falta para el PRÓXIMO que va a estar listo
function animalFalta(k) {
  const d = ANIMAL_DEF[k], l = animalLista(k); if (!d || !l.length) return 0;
  return Math.min.apply(null, l.map(a => Math.max(0, d.cicloH * 3600000 - (nowMs() - (a.prodAt || 0)))));
}
function animalListos(k) {   // cuántos hay listos para cobrar
  const d = ANIMAL_DEF[k]; if (!d) return 0;
  return animalLista(k).filter(a => nowMs() - (a.prodAt || 0) >= d.cicloH * 3600000).length;
}
// cobra TODOS los que estén listos de ese tipo
function recogerAnimal(k) {
  const d = ANIMAL_DEF[k], l = animalLista(k); if (!d || !l.length) return;
  const listos = l.filter(a => nowMs() - (a.prodAt || 0) >= d.cicloH * 3600000);
  if (!listos.length) { toast("Todavía no produjo — faltan " + fmtDur(animalFalta(k))); return; }
  let total = 0;
  for (const a of listos) {
    const f = animalFelizDe(a);
    const n = Math.max(1, Math.round(d.porCiclo * (FELIZ_MIN_PROD + (1 - FELIZ_MIN_PROD) * f / 100)));   // feliz = ciclo completo
    if (!roomForRes(d.mat, total + n)) break;   // lo que no entra queda para el próximo viaje
    total += n; a.prodAt = nowMs();
  }
  if (!total) { bagFull("recoger " + RES_LABEL[d.mat]); return; }
  G.res[d.mat] = (G.res[d.mat] || 0) + total;
  addXp("farming", 20 * listos.length);
  log(d.label + " ×" + listos.length + " produjo " + total + " de " + RES_LABEL[d.mat] + " (felicidad media " + animalFelicidad(k) + "/100).", "gold");
  toast("+" + total + " " + RES_LABEL[d.mat]);
  refreshHud(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshEstablo === "function" && isOpen("ov-establo")) refreshEstablo();
  if (typeof saveFarm === "function") saveFarm(true);
}

// ================= ESTAMINA DE LA ZONA NEGRA ("2das mejoras", 4/8) =================
// Barra aparte de la vida, SOLO se gasta peleando en la Zona Negra. Le pone ritmo al combate
// y protege la economía de drops/carne/XP. Se recupera con el tiempo, comiendo y (con tope) con $Golden.
var STAM_BASE = 100;          // máximo a nivel 1 de Combate
var STAM_POR_NIVEL = 2;       // +2 de máximo por nivel de Combate
var STAM_TOPE = 250;          // tope duro del máximo
var STAM_REGEN_SEG = 180;     // 1 punto cada 3 min → de 0 a 100 en ~5 h
var STAM_GOLDEN = 5;          // $Golden por recarga completa
var STAM_RECARGAS_DIA = 3;    // tope diario de recargas premium (anti pay-to-win)
const STAM_COSTO = {          // costo por criatura (tabla del doc)
  rata: 4, murcielago: 4, larva: 4,
  baba: 6, babita: 3, arana: 6, goblin: 6, orco: 6, lancero: 6,
  esqueleto: 8, golem: 8, hombre_lobo: 8, guerrero: 8,
  troll: 10, ogro: 10,
  espectro: 12, demonio: 12,
  dragon: 20,
};
function stamMax() { return Math.min(STAM_TOPE, STAM_BASE + STAM_POR_NIVEL * (combatInfo().lvl - 1)); }
function stamCosto(key) { return STAM_COSTO[key] || 5; }
function stamTick() {   // 1 vez por segundo desde el HUD
  const mx = stamMax();
  if (G.stam == null) G.stam = mx;
  if (G.stam >= mx) { G.stamAcc = 0; return; }
  G.stamAcc = (G.stamAcc || 0) + 1;
  if (G.stamAcc >= STAM_REGEN_SEG) { G.stamAcc = 0; G.stam = Math.min(mx, G.stam + 1); }
}
function stamAdd(n) { const mx = stamMax(); G.stam = Math.max(0, Math.min(mx, (G.stam == null ? mx : G.stam) + n)); refreshHud(); }
function stamGastar(n) {   // devuelve false si no alcanza
  const mx = stamMax();
  if (G.stam == null) G.stam = mx;
  if (G.stam < n) return false;
  G.stam -= n; refreshHud(); return true;
}
function stamRecargasHoy() {
  const hoy = dayStamp(0);   // día LOCAL (antes era UTC: los contadores se reseteaban a las 21 h en Argentina)
  if (!G.stamRec || G.stamRec.date !== hoy) G.stamRec = { date: hoy, n: 0 };
  return G.stamRec;
}
function stamRecargar() {   // recarga premium con $Golden, con tope diario
  const r = stamRecargasHoy();
  if (r.n >= STAM_RECARGAS_DIA) { toast("Ya usaste las " + STAM_RECARGAS_DIA + " recargas de hoy"); return; }
  if (G.golden < STAM_GOLDEN) { toast("Te falta $Golden (" + STAM_GOLDEN + ")"); return; }
  G.golden -= STAM_GOLDEN; r.n++; G.stam = stamMax(); G.stamAcc = 0;
  log("Recargaste la estamina por " + STAM_GOLDEN + " $Golden (" + r.n + "/" + STAM_RECARGAS_DIA + " hoy).", "gold");
  toast("¡Estamina al máximo!");
  refreshHud(); if (typeof saveFarm === "function") saveFarm();
}

// ================= ALTAR DE RUNAS (doc maestro 2/8, estilo Silkroad) =================
// Eje 1: mejora del arma +1..+15 (lotería con % claro). Eje 2: runas de atributo en sockets.
var ALTAR_BREAK = 30;   // % de ROTURA al fallar +11..+15 SIN Runa de Protección (editable)
var UPG = [null,   // índice = nivel al que se intenta subir
  { ex:100, exP:100, dmg:8,   rp:1,  plata:10 },   { ex:100, exP:100, dmg:16,  rp:1,  plata:25 },
  { ex:95,  exP:100, dmg:25,  rp:1,  plata:50 },   { ex:90,  exP:100, dmg:34,  rp:2,  plata:90 },
  { ex:85,  exP:95,  dmg:44,  rp:2,  plata:150 },  { ex:75,  exP:85,  dmg:54,  rp:2,  plata:250 },
  { ex:65,  exP:75,  dmg:66,  rp:3,  plata:400 },  { ex:55,  exP:65,  dmg:78,  rp:3,  plata:600 },
  { ex:45,  exP:55,  dmg:92,  rp:4,  plata:900 },  { ex:38,  exP:48,  dmg:107, rp:4,  plata:1300 },
  { ex:30,  exP:40,  dmg:124, rp:5,  plata:1900 }, { ex:22,  exP:32,  dmg:143, rp:6,  plata:2700 },
  { ex:15,  exP:25,  dmg:164, rp:7,  plata:3800 }, { ex:9,   exP:19,  dmg:188, rp:8,  plata:5200 },
  { ex:5,   exP:15,  dmg:215, rp:10, plata:8000 },
];
function upgDmg(plus) { return plus > 0 && UPG[plus] ? UPG[plus].dmg : 0; }
function socketsOpen(plus) { return plus >= 12 ? 3 : plus >= 7 ? 2 : plus >= 3 ? 1 : 0; }   // ranuras: +3 / +7 / +12
const RUNA_ORDER = ["furia", "vamp", "perfo", "veloz", "sangrante", "guardiana", "fortuna", "dorada"];
const RUNA_TIPOS = {
  furia:     { label:"Runa de Furia",       buff:"Prob. de crítico",          vals:[3,5,8,12,18],     uni:"%" },
  vamp:      { label:"Runa Vampírica",      buff:"Robo de vida",              vals:[2,3,5,7,10],      uni:"%" },
  perfo:     { label:"Runa de Perforación", buff:"Ignora defensa",            vals:[8,14,20,28,40],   uni:"%" },
  veloz:     { label:"Runa Veloz",          buff:"Vel. de ataque",            vals:[4,7,10,14,20],    uni:"%" },
  sangrante: { label:"Runa Sangrante",      buff:"Sangrado al golpear (3 s)", vals:[1,2,3,4,6],       uni:"/s" },
  guardiana: { label:"Runa Guardiana",      buff:"Vida máxima",               vals:[15,30,50,80,120], uni:"" },
  fortuna:   { label:"Runa de Fortuna",     buff:"Suerte en drops",           vals:[5,8,12,18,25],    uni:"%" },
  dorada:    { label:"Runa Dorada",         buff:"$Golden por kill",          vals:[3,5,8,12,18],     uni:"%" },
};
const RUNA_ROMAN = ["", "I", "II", "III", "IV", "V"];
function runaKey(t, r) { return "runa_" + t + "_" + r; }
function runaVal(t, r) { return (RUNA_TIPOS[t] && RUNA_TIPOS[t].vals[r - 1]) || 0; }
function runaLabel(t, r) { return ((RUNA_TIPOS[t] && RUNA_TIPOS[t].label) || "Runa") + " " + (RUNA_ROMAN[r] || r); }   // tipo desconocido: no rompe el Altar
RUNA_ORDER.forEach(t => { for (let r = 1; r <= 5; r++) { RES_LABEL[runaKey(t, r)] = runaLabel(t, r); RES_EMOJI[runaKey(t, r)] = "🔹"; } });
RES_LABEL.esencia_runica = "Esencia rúnica";      RES_EMOJI.esencia_runica = "🔮";
RES_LABEL.runa_poder = "Runa de Poder";           RES_EMOJI.runa_poder = "💠";
RES_LABEL.polvo_suerte = "Polvo de Suerte";       RES_EMOJI.polvo_suerte = "✨";
RES_LABEL.runa_proteccion = "Runa de Protección"; RES_EMOJI.runa_proteccion = "🛡️";
const ALTAR_CRAFT = {   // crafteo de materiales en el Altar
  runa_poder:      { cost:{ esencia_runica:3, piedra:5 }, plata:20 },
  polvo_suerte:    { cost:{ esencia_runica:2 },           plata:30 },
  runa_proteccion: { cost:{ esencia_runica:5, oro:3 },    golden:5 },
};
var RUNA_CRAFT = { cost:{ esencia_runica:4, bronce:2 }, plata:50 };   // runa de atributo (rareza I)
const FUSE_GOLD = [0, 0, 2, 8, 25];   // $Golden para fusionar 3 runas → rareza II/III/IV/V
function armPlus(id) { return (G.weapons[id] && G.weapons[id].plus) || 0; }
function armSockets(id) { const w = G.weapons[id]; if (!w) return {}; w.sockets = w.sockets || {}; return w.sockets; }
function eqRunaVal(tipo) {   // valor total de un tipo de runa en el arma EQUIPADA
  const id = armaEq(); if (!id) return 0;
  const sk = armSockets(id); let v = 0;
  for (const s in sk) if (sk[s] && sk[s].t === tipo) v += runaVal(sk[s].t, sk[s].r);
  return v;
}
function altarRefresh() { if (typeof refreshAltar === "function" && isOpen("ov-altar")) refreshAltar(); refreshHud(); if (isOpen("ov-inv")) refreshInv(); if (typeof syncSlots === "function") syncSlots(); }
function upgradeWeapon(id, usarPolvo, usarProt) {
  const w = G.weapons[id]; if (!w || !ARM_DEF[id]) return;
  const next = (w.plus || 0) + 1;
  if (next > 15) { toast("Ya está en +15: el tope de tope"); return; }
  const u = UPG[next];
  const need = { runa_poder: u.rp };
  if (usarPolvo) need.polvo_suerte = 1;
  if (usarProt) need.runa_proteccion = 1;
  for (const k in need) if ((G.res[k] || 0) < need[k]) { toast("Te falta " + RES_LABEL[k] + " (" + need[k] + ")"); return; }
  if (G.plata < u.plata) { toast("Te falta plata (" + u.plata + ")"); return; }
  for (const k in need) G.res[k] -= need[k];
  G.plata -= u.plata;
  const chance = Math.min(100, (usarPolvo ? u.exP : u.ex) + altarBonoExito());   // el Altar nivel 2 suma puntos de éxito
  if (Math.random() * 100 < chance) {
    w.plus = next;
    const abre = socketsOpen(next) > socketsOpen(next - 1) ? " ¡Se abrió una ranura de runa!" : "";
    log("¡" + ARM_DEF[id].label + " subió a +" + next + "! Daño acumulado +" + u.dmg + "%." + abre, "gold");
    if (window.celebrate && (next >= 10 || abre)) celebrate({ title: "¡+" + next + "!", sub: ARM_DEF[id].label, big: next >= 10, reward: "+" + u.dmg + "% de daño" + abre });
    else toast("¡+" + next + "! (" + chance + "% de éxito)");
    if (window.sfx) sfx("level");
    if (typeof tutoEvent === "function") tutoEvent("upgrade");
  } else {
    if (next >= 11 && !usarProt && Math.random() * 100 < ALTAR_BREAK) {   // rotura: solo sin protección (el jugador ELIGE el riesgo)
      delete G.weapons[id];
      if (G.gear.arma === id) G.gear.arma = null;
      log("El intento a +" + next + " falló y " + ARM_DEF[id].label + " se ROMPIÓ. (Sin Runa de Protección)", "bad");
      toast("¡El arma se rompió!");
      applyCombatHp(); altarRefresh(); if (typeof saveFarm === "function") saveFarm(true);
      return;
    }
    if (next >= 6) { w.plus = Math.max(0, (w.plus || 0) - 1); log("Falló el intento a +" + next + " (" + chance + "%): el arma baja a +" + w.plus + ".", "bad"); toast("Falló: baja a +" + w.plus); }
    else { log("Falló el intento a +" + next + " (" + chance + "%). Solo se perdieron los materiales.", "bad"); toast("Falló el intento"); }
  }
  altarRefresh(); if (typeof saveFarm === "function") saveFarm(true);
}
function craftAltarItem(id) {
  const c = ALTAR_CRAFT[id]; if (!c) return;
  if (!canAfford(c.cost)) { toast("Te faltan materiales"); return; }
  if (c.plata && G.plata < c.plata) { toast("Te falta plata (" + c.plata + ")"); return; }
  if (c.golden && G.golden < c.golden) { toast("Te falta $Golden (" + c.golden + ")"); return; }
  payCost(c.cost); if (c.plata) G.plata -= c.plata; if (c.golden) G.golden -= c.golden;
  G.res[id] = (G.res[id] || 0) + 1;
  addXp("crafting", 6); log("Crafteaste 1 " + RES_LABEL[id] + ".", "good"); toast("+1 " + RES_LABEL[id]);
  altarRefresh();
}
function craftRunaI(tipo) {
  if (!RUNA_TIPOS[tipo]) return;
  if (!canAfford(RUNA_CRAFT.cost)) { toast("Te faltan materiales"); return; }
  if (G.plata < RUNA_CRAFT.plata) { toast("Te falta plata (" + RUNA_CRAFT.plata + ")"); return; }
  payCost(RUNA_CRAFT.cost); G.plata -= RUNA_CRAFT.plata;
  const k = runaKey(tipo, 1); G.res[k] = (G.res[k] || 0) + 1;
  addXp("crafting", 8); log("Crafteaste 1 " + runaLabel(tipo, 1) + ".", "good"); toast("+1 " + runaLabel(tipo, 1));
  altarRefresh();
}
function fuseRuna(tipo, r) {   // 3 runas de rareza r → 1 de rareza r+1 (muy Silkroad)
  if (r >= 5) return;
  const k = runaKey(tipo, r), gold = FUSE_GOLD[r];
  if ((G.res[k] || 0) < 3) { toast("Necesitás 3 " + runaLabel(tipo, r)); return; }
  if (gold && G.golden < gold) { toast("Te falta $Golden (" + gold + ")"); return; }
  G.res[k] -= 3; if (gold) G.golden -= gold;
  const k2 = runaKey(tipo, r + 1); G.res[k2] = (G.res[k2] || 0) + 1;
  addXp("crafting", 10); log("Fusionaste 3 " + runaLabel(tipo, r) + " en 1 " + runaLabel(tipo, r + 1) + ".", "gold"); toast("¡" + runaLabel(tipo, r + 1) + "!");
  altarRefresh();
}
function socketRuna(id, slot, tipo, r) {   // socketear DESTRUYE la runa anterior de esa ranura (doc)
  const w = G.weapons[id]; if (!w) return;
  if (slot > socketsOpen(w.plus || 0)) { toast("Esa ranura se abre a +" + (slot === 1 ? 3 : slot === 2 ? 7 : 12)); return; }
  const sk = armSockets(id);
  if (tipo === null) { sk[slot] = null; log("Vaciaste la ranura " + slot + " (la runa se destruyó).", "bad"); }
  else {
    const k = runaKey(tipo, r);
    if ((G.res[k] || 0) < 1) { toast("No tenés " + runaLabel(tipo, r)); return; }
    G.res[k] -= 1;
    if (sk[slot]) log("La " + runaLabel(sk[slot].t, sk[slot].r) + " anterior se destruyó al socketear encima.", "bad");
    sk[slot] = { t: tipo, r };
    log("Socketeaste " + runaLabel(tipo, r) + " (" + RUNA_TIPOS[tipo].buff + " +" + runaVal(tipo, r) + RUNA_TIPOS[tipo].uni + ").", "gold");
    toast("Runa socketeada");
    if (typeof tutoEvent === "function") tutoEvent("socket");
  }
  applyCombatHp();   // la Guardiana suma vida máxima
  altarRefresh(); if (typeof saveFarm === "function") saveFarm(true);
}

/* === ARMAS DOC MAESTRO 2/8: 4 tipos × 5 rarezas, daño aleatorio + buff por tipo ===
   Espada=Crítico (daño ×2) · Hacha=Perforación (ignora % def) · Mazo=Aturdir (el mob pierde su próximo golpe) · Arco=Sangrado (daño/s 3s, a distancia) */
const ARM_TIPOS = ["espada", "hacha", "mazo", "arco"];
const ARM_RAREZAS = ["madera", "piedra", "bronce", "oro", "diamante"];
const ARM_TIPO_DEF = {
  espada: { label: "Espada", buff: "crit",   buffLabel: "Crítico",     skill: "sword", sprite: "sword", primQ: 5, secQ: 3, repQ: 2, plata: [10, 25, 60, 140, 320] },
  hacha:  { label: "Hacha",  buff: "pierce", buffLabel: "Perforación", skill: "hacha", sprite: "axe",   primQ: 6, secQ: 3, repQ: 3, plata: [10, 30, 70, 170, 385] },
  mazo:   { label: "Mazo",   buff: "stun",   buffLabel: "Aturdir",     skill: "mazo",  sprite: "mazo", primQ: 8, secQ: 4, repQ: 4, plata: [15, 40, 90, 210, 480] },
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
  ARM_DEF[tipo + "_" + rar] = { tipo, rareza: rar, ri: i, sprite: "arm_" + tipo + "_" + rar, label: td.label + " " + ARM_RAR_LABEL[rar],
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
  if (typeof tutoPermite === "function" && !tutoPermite("craftarm")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(w.cost, w.plata, "forjar " + w.label)) return;   // guardia del tutorial (12/8)
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
  if (typeof tutoEvent === "function") tutoEvent("craftarm");
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
  atk *= 1 + upgDmg(armPlus(id)) / 100;                       // Altar: mejora +1..+15 (daño acumulado)
  let defEf = defensa || 0;
  const out = { id, tipo: w.tipo, crit: false, stun: false, bleed: 0, vamp: eqRunaVal("vamp") };
  if (w.tipo === "hacha") defEf = defEf * (1 - w.buffVal / 100);
  defEf = defEf * (1 - eqRunaVal("perfo") / 100);             // Runa de Perforación
  const critCh = (w.tipo === "espada" ? w.buffVal : 0) + eqRunaVal("furia");   // Runa de Furia: crítico en cualquier arma
  if (critCh && Math.random() * 100 < critCh) { atk *= 2; out.crit = true; }
  if (w.tipo === "mazo" && Math.random() * 100 < w.buffVal) out.stun = true;
  if (w.tipo === "arco") out.bleed = w.buffVal;
  out.bleed = Math.max(out.bleed, eqRunaVal("sangrante"));    // Runa Sangrante: sangrado en cualquier arma
  out.dmg = Math.max(1, Math.round((atk - defEf) * dmgMult() * playerDmgOutMult()));   // buff de comida y maldición de Flaqueza
  return out;
}

// --- LEGADO (espada/arco viejos): queda para migración de guardados; ya no se craftea ---
const SWORD_COST = { bronce: 12 };   // 100% metal (feedback del diseñador: nada de madera)
const SWORD_WOOD_COST = { madera: 5 };
// daño del jugador — viernes (2): SOLO con arma equipada (sin arma no hay ataque, devuelve 0)
function swordDmg() {   // legado: >0 si hay un arma CUERPO A CUERPO equipada y sana (el daño real sale de rollWeaponHit)
  const id = armaEq(); if (!id) return 0;
  const w = ARM_DEF[id]; if (w.tipo === "arco") return 0;
  return Math.round((w.min + w.max) / 2) + Math.floor(skillInfo(G.skills[armSkillKey(w.tipo)] || 0).lvl / 2);
}

// --- arco y flechas (combate a distancia; usa la skill Arco) ---
const BOW_COST = { madera: 12, bronce: 2 };
const ARROW_COST = { madera: 2, piedra: 1 };   // craftea 10 flechas
function craftArrows() {
  if (!canAfford(ARROW_COST)) { toast("Te faltan materiales"); return; }
  payCost(ARROW_COST); G.res.flecha = (G.res.flecha || 0) + 10;   // van a la bolsa, NO se autoequipan (detalles jueves)
  addXp("crafting", 3);
  log("Crafteaste 10 flechas — están en tu bolsa; equipalas en el panel de Equipo.", "good"); toast("+10 flechas en la bolsa"); forgeWork();
  refreshForge(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}
// viernes (2): la pestaña Armas de la Herrería se desbloquea pagando
const ARMAS_UNLOCK_COST = { madera: 15, piedra: 10 }; var ARMAS_UNLOCK_PLATA = 300;   // 14/8 rebalance: era 20+20+1000 (~100 min de papa aún con 8 parcelas, medido)
function unlockArmas() {
  if (G.armasUnlocked) return;
  if (!canAfford(ARMAS_UNLOCK_COST)) { toast("Te faltan materiales"); return; }
  if (G.plata < ARMAS_UNLOCK_PLATA) { toast("Te falta plata"); return; }
  payCost(ARMAS_UNLOCK_COST); G.plata -= ARMAS_UNLOCK_PLATA; G.armasUnlocked = true;
  log("Desbloqueaste la pestaña Armas de la Herrería.", "gold"); toast("¡Armas desbloqueadas!");
  if (typeof tutoEvent === "function") tutoEvent("unlockarm");
  refreshForge(); refreshHud(); if (typeof saveFarm === "function") saveFarm();
}
// viernes (2): desbloqueo progresivo de árboles y piedras (3/9/27/81/100) — se paga por CANTIDAD ya abierta, el orden es libre
const NODE_UNLOCK_COSTS = [3, 9, 27, 81, 100];
function treeUnlockCost() { return NODE_UNLOCK_COSTS[Math.min(NODE_UNLOCK_COSTS.length - 1, Math.max(0, (G.treesOpen || [0]).length - 1))]; }
function rockUnlockCost() { return NODE_UNLOCK_COSTS[Math.min(NODE_UNLOCK_COSTS.length - 1, Math.max(0, (G.rocksOpen || [0]).length - 1))]; }

// 12/8 (noche): las VETAS/PIEDRAS van sin fantasmas ni compra — todas a la vista y a
// todo color, y el freno es de NIVEL: al intentar picar una que todavía no corresponde,
// el juego te dice qué nivel de granja pide. Tabla por orden de aparición (números del
// diseñador; la 1ª siempre libre). Quien PAGÓ desbloqueos viejos los conserva.
// Los ÁRBOLES quedan con su sistema de siempre: retoño + desbloqueo pagando madera.
var NIVEL_ROCAS = [1, 3, 5, 8, 12, 16];
function nodoNivelReq(o) { return NIVEL_ROCAS[Math.min(o.lockIdx || 0, NIVEL_ROCAS.length - 1)] || 1; }
function nodoBloqueado(o) {
  if (!o || o.type !== "rock") return false;   // solo piedras/minerales: los árboles van por retoño+pago
  if ((G.rocksOpen || [0]).includes(o.lockIdx)) return false;
  return G.level < nodoNivelReq(o);
}
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
function gearDefTotal() { let d = 0; for (const s in G.gear) { const g = G.gear[s]; if (g && GEAR_DEF[g]) d += GEAR_DEF[g].def; } return d + (typeof armorDefensa === "function" ? armorDefensa() : 0); }
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
  papa_asada:         { label:"Papa Asada",             emoji:"🥔", sprite:"dish_papa_asada", res:{papa:1, madera:1},                                        lvl:1,  heal:10, buff:{type:"farm",    val:5},  cookS:180,  xp:8,  plata:5 },
  pure_papa:          { label:"Puré de Papa",           emoji:"🥣", sprite:"dish_pure_papa", res:{papa:2, cebolla:1, madera:1},                             lvl:2,  heal:13, buff:{type:"regen",   val:2},  cookS:240,  xp:10, plata:12 },
  sopa_zanahoria:     { label:"Sopa de Zanahoria",      emoji:"🍜", sprite:"dish_sopa_zanahoria", res:{zanahoria:2, cebolla:1, madera:1},                        lvl:2,  heal:15, buff:{type:"speed",   val:8},  cookS:240,  xp:10, plata:14 },
  ensalada_repollo:   { label:"Ensalada de Repollo",    emoji:"🥗", sprite:"dish_ensalada_repollo", res:{repollo:2, zanahoria:1, madera:1},                        lvl:3,  heal:17, buff:{type:"def",     val:6},  cookS:300, xp:14, plata:18 },
  calabacin_salteado: { label:"Calabacín Salteado",     emoji:"🥒", sprite:"dish_calabacin_salteado", res:{calabacin:2, cebolla:1, madera:1},                        lvl:3,  heal:18, buff:{type:"dmg",     val:6},  cookS:300, xp:14, plata:20 },
  pan_trigo:          { label:"Pan de Trigo",           emoji:"🍞", sprite:"dish_pan_trigo", res:{trigo:3, madera:2},                                       lvl:4,  heal:20, buff:{type:"cookxp",  val:10}, cookS:360, xp:18, plata:22 },
  salteado_brocoli:   { label:"Salteado de Brócoli",    emoji:"🥦", sprite:"dish_salteado_brocoli", res:{brocoli:2, calabacin:1, madera:2},                        lvl:5,  heal:23, buff:{type:"farm",    val:10}, cookS:360, xp:22, plata:28 },
  crema_calabaza:     { label:"Crema de Calabaza",      emoji:"🎃", sprite:"dish_crema_calabaza", res:{calabaza:2, cebolla:1, madera:2},                         lvl:5,  heal:25, buff:{type:"def",     val:10}, cookS:420, xp:24, plata:32 },
  tortilla_maiz:      { label:"Tortilla de Maíz",       emoji:"🌽", sprite:"dish_tortilla_maiz", res:{maiz:2, cebolla:1, madera:2},                             lvl:6,  heal:27, buff:{type:"dmg",     val:10}, cookS:420, xp:28, plata:38 },
  aceite_girasol:     { label:"Aceite de Girasol",      emoji:"🌻", sprite:"dish_aceite_girasol", res:{girasol:3, madera:2},                                     lvl:6,  heal:18, buff:{type:"luck",    val:10}, cookS:420, xp:26, plata:40 },
  guiso_campestre:    { label:"Guiso Campestre",        emoji:"🍲", sprite:"dish_guiso_campestre", res:{papa:1, zanahoria:1, repollo:1, cebolla:1, madera:3},     lvl:7,  heal:31, buff:{type:"combatxp",val:12}, cookS:480, xp:34, plata:55 },
  pan_maiz_trigo:     { label:"Pan de Maíz y Trigo",    emoji:"🥖", sprite:"dish_pan_maiz_trigo", res:{trigo:2, maiz:2, madera:3},                               lvl:8,  heal:34, buff:{type:"hpmax",   val:20}, cookS:480, xp:42, plata:80,  goldenP:1 },
  estofado_cosecha:   { label:"Estofado de la Cosecha", emoji:"🥘", sprite:"dish_estofado_cosecha", res:{calabaza:2, maiz:1, papa:1, zanahoria:1, madera:3},       lvl:9,  heal:37, buff:{type:"dmg",     val:15}, cookS:540, xp:52, plata:110, goldenP:2 },
  banquete_bosque:    { label:"Banquete del Bosque",    emoji:"🍱", sprite:"dish_banquete_bosque", res:{papa:1, zanahoria:1, repollo:1, brocoli:1, calabaza:1, madera:3}, lvl:10, heal:40, buff:{type:"feast", val:20}, cookS:600, xp:70, plata:180, goldenP:4 },
  // clásicas (siguen dándole uso al pescado y la carne)
  pescado_asado: { label:"Pescado asado", emoji:"🐟", sprite:"dish_pescado_asado", fish:{comun:1}, res:{madera:1}, lvl:1,
    heal:30, buff:{type:"yield",label:"Cosecha +10%",mult:1.10,dur:90}, cookS:240, xp:8, plata:15,
    desc:"Cura 30 · Cosecha +10% (1 min 30 s)" },
  estofado: { label:"Estofado de carne", emoji:"🍲", sprite:"dish_estofado", res:{carne:2, papa:1, madera:1}, lvl:3,
    heal:60, buff:{type:"cd",label:"Enfriamientos -15%",mult:0.85,dur:90}, cookS:300, xp:12, plata:30,
    desc:"Cura 60 · Enfriamientos -15% (1 min 30 s)" },
  banquete: { label:"Banquete del granjero", emoji:"🍗", sprite:"dish_banquete", fish:{raro:1}, res:{carne:2, calabaza:1, madera:1}, lvl:6,
    heal:9999, buff:{type:"yield",label:"Cosecha +20%",mult:1.20,dur:180}, cookS:420, xp:25, plata:60,
    desc:"Cura TODA la vida · Cosecha +20% (3 min)" },
};
// niveles de cocina 1-10 (tabla del doc, XP ACUMULADA por nivel) + maestría
var COOK_LVLS = [0, 0, 30, 80, 160, 300, 520, 850, 1300, 1900, 2700];
function cookLevelFromXp(xp) { let l = 1; for (let i = 2; i < COOK_LVLS.length; i++) if (xp >= COOK_LVLS[i]) l = i; return Math.min(10, l); }
function cookLevel() { return cookLevelFromXp(G.skills.cooking || 0); }
function cookPot(rlvl) { return Math.min(1.5, 1 + 0.02 * Math.max(0, cookLevel() - (rlvl || 1))); }   // Potencia = 1 + 2% por nivel sobre la receta, tope +50%
// ANTI "impresora de plata" (3/8): cocinar no puede valer más que sus ingredientes + un margen.
// Con COOK_PRICE_AUTO=1 el precio sale de lo que costó el plato, así el balance no se rompe
// aunque el diseñador cambie los precios de los cultivos. Con 0 manda la tabla del doc.
var FISH_VALOR = { comun: 20, raro: 60, epico: 150, legendario: 400 };   // cuánto "vale" cada pez al calcular el precio de un plato
var COOK_PRICE_AUTO = 1;     // 1 = precio calculado sobre ingredientes · 0 = precio fijo de la planilla
var COOK_MARGEN = 1.25;      // ganancia de cocinar sobre el valor de los ingredientes (+25%)
function dishValue(r) {      // cuánto valen los ingredientes de un plato
  let v = 0;
  if (r.res) for (const k in r.res) v += priceOf(k) * r.res[k];
  if (r.fish) for (const k in r.fish) v += (FISH_VALOR[k] || 25) * r.fish[k];
  return v;
}
function dishPrice(r) {      // precio base de venta (antes de la maestría)
  if (!COOK_PRICE_AUTO) return r.plata || 0;
  return Math.max(1, Math.round(dishValue(r) * COOK_MARGEN));
}
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
    case "stam": return "+" + v + " de estamina";
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
const COOK_MS = 180000;   // respaldo si una receta no trae tiempo propio (3 min)
// 3/8 (diseñador): los platos tardan MINUTOS y se pueden cocinar VARIOS a la vez (ollas en paralelo).
var COOK_SLOTS = 3;       // ollas simultáneas de la Cocina (editable en el panel)
function cookList() { if (!Array.isArray(G.cooking)) G.cooking = G.cooking ? [G.cooking] : []; return G.cooking; }
function cookSlots() { return COOK_SLOTS + (edif2("cocina") ? EDIF2_COCINA_OLLA : 0); }
function cookFree() { return Math.max(0, cookSlots() - cookList().length); }
function cook(id) {
  const r = RECIPE_DEF[id]; if (!r) return;
  if (typeof tutoPermite === "function" && !tutoPermite("cook")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (cookFree() <= 0) { toast("Las " + cookSlots() + " ollas están ocupadas"); return; }
  if (!canCook(id)) { toast("Te faltan ingredientes"); return; }
  if (!roomForDish(id)) { bagFull("cocinar " + r.label); return; }
  if (r.res) for (const k in r.res) G.res[k] -= r.res[k];
  if (r.fish) for (const k in r.fish) G.fish[k] -= r.fish[k];
  const ms = Math.max(1000, Math.round((r.cookS ? r.cookS * 1000 : COOK_MS) * cocinaFactor()));
  cookList().push({ id, endAt: nowMs() + ms, total: ms });
  log("Cocinando " + r.label + "… (" + fmtSecs(Math.round(ms / 1000)) + ")"); toast("Cocinando " + r.label);
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
  if (typeof saveFarm === "function") saveFarm();
}
// se llama cada segundo desde el HUD: cada olla que termina deja su plato en la bolsa
var _cocinando = false;   // candado anti-reentrada (ver abajo)
function checkCooking() {
  const lista = cookList();
  if (!lista.length) return;
  // CANDADO: dar el plato dispara XP y estadísticas, y eso vuelve a pasar por refreshHud(), que
  // llama de nuevo acá. Sin este candado se entraba en bucle infinito: la misma olla daba platos
  // una y otra vez hasta reventar la pila, y la partida quedaba con miles de platos y sin cargar.
  if (_cocinando) return;
  _cocinando = true;
  try {
    const t = nowMs(); let listos = 0;
    for (let i = lista.length - 1; i >= 0; i--) {
      if (t < lista[i].endAt) continue;
      const olla = lista[i];
      lista.splice(i, 1);          // PRIMERO se saca la olla, DESPUÉS se entrega: si algo vuelve
      listos++;                    // a entrar acá, esta olla ya no está y no se puede duplicar
      const r = RECIPE_DEF[olla.id];
      if (!r) continue;
      G.dishes = G.dishes || {};
      G.dishes[olla.id] = (G.dishes[olla.id] || 0) + 1;
      addXp("cooking", r.xp);
      log(r.emoji + " ¡" + r.label + " listo! Lo tenés en la bolsa.", "gold"); toast(r.emoji + " ¡" + r.label + " listo!");
      if (typeof tutoEvent === "function") tutoEvent("cook");
      statAdd("cocinar");
    }
    if (!listos) { if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking(); return; }
    if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
    if (typeof refreshCooking === "function" && isOpen("ov-cocina")) refreshCooking();
    if (typeof saveFarm === "function") saveFarm();
  } finally { _cocinando = false; }
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
  { const st = { guiso_campestre: 20, estofado_cosecha: 25, banquete_bosque: 40, estofado: 15, banquete: 30 }[id];
    if (st && typeof stamAdd === "function") { stamAdd(st); toast("+" + st + " de estamina"); } }
  if (id === "guiso_campestre" || id === "estofado_cosecha") { if (cleanseStates(["sangrado", "veneno", "quemadura"])) { log("El guiso limpió tus heridas (sangrado/veneno/quemadura).", "good"); toast("Heridas limpiadas"); } }
  if (id === "pan_trigo" || id === "pan_maiz_trigo") { if (cleanseStates(["flaqueza", "fragilidad"])) { log("El pan disipó las maldiciones.", "good"); toast("Maldiciones disipadas"); } }
  log(r.emoji + " Comiste " + r.label + ". " + dishDesc(r), "gold"); toast(r.emoji + " ¡Ñam!");
  if (typeof tutoEvent === "function") tutoEvent("eat");
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// vender platos en la Cocina (doc: la maestría sube el precio; nivel 8+ desbloquea venta en $Golden)
function sellDish(id, gold) {
  const r = RECIPE_DEF[id]; if (!r || !G.dishes || (G.dishes[id] || 0) <= 0) return;
  // 14/8 (playtest: vendió la Papa Asada en pleno "comé un plato" y quedó trabado):
  // vender platos también pasa por el embudo — es una VENTA como cualquier otra
  if (typeof tutoPermite === "function" && !tutoPermite("sell")) { tutoAviso(); return; }
  if (gold && !(r.goldenP && cookLevel() >= 8)) { toast("La venta en $Golden se desbloquea con Cocina nivel 8"); return; }
  G.dishes[id]--;
  if (gold) { G.golden += r.goldenP; log("Vendiste " + r.label + " por " + r.goldenP + " $Golden.", "gold"); toast("+" + r.goldenP + " $Golden"); }
  else { const v = Math.round(dishPrice(r) * cookPot(r.lvl)); G.plata += v; log("Vendiste " + r.label + " por " + v + " de plata.", "gold"); toast("+" + v + " de plata"); }
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
  if (G.plata < CHEST_PLATA) { toast("Te falta plata (" + CHEST_PLATA + ")"); return; }
  payCost(CHEST_COST); G.plata -= CHEST_PLATA;
  G.chests.push({ col: null, row: null, items: Array(CHEST_SLOTS + (G.chestCap || 0)).fill(null) });   // capacidad base + la ganada por niveles de granja
  addXp("crafting", 8);
  log("Crafteaste un cofre depósito — está en tu bolsa. Colocalo con un clic desde la bolsa.", "gold");
  toast("Cofre en la bolsa (" + G.chests.length + "/" + CHEST_MAX + ")"); forgeWork();
  if (typeof tutoEvent === "function") tutoEvent("chest");
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

// Formato CORTO para los carteles del mundo ("58m", "20h", "3d 5h", "45s"). El largo de fmtSecs
// ("58 min 52 s") no entra sobre una parcela de 42 px y los carteles de parcelas vecinas se pisaban.
// Sunflower Land usa exactamente esto: una unidad, o dos solo cuando hay días.
function fmtCorto(seg) {
  seg = Math.max(0, Math.round(seg));
  if (seg < 60) return seg + "s";
  const d = Math.floor(seg / 86400), h = Math.floor(seg % 86400 / 3600), m = Math.floor(seg % 3600 / 60);
  if (d) return d + "d" + (h ? " " + h + "h" : "");
  if (h) return h + "h";   // una sola unidad: el detalle fino ya lo cuenta la barrita
  return m + "m";
}

// --- bestiario (Fase D) — 6 tiers, de común a legendario ---
const MONSTER_ORDER = ["rata", "murcielago", "larva", "baba", "babita", "arana", "goblin", "orco", "lancero", "guerrero", "esqueleto", "golem", "hombre_lobo", "troll", "ogro", "espectro", "demonio", "dragon"];
const MONSTER_DEF = {
  rata:     { label:"Rata",           emoji:"🐀", sprite:"rata", size:30, hp:12,  def:0,  dmg:2,  xp:100,  spd:55, lvl:1, loot:{ carne:[1,1,0.55], plata:[3,3,1] } },
  larva:    { label:"Larva Venenosa", emoji:"🐛", sprite:"larva", size:38, hp:22,  def:1,  dmg:3,  xp:180,  spd:35, lvl:5, loot:{ carne:[1,2,0.50], plata:[5,5,1], flecha:[1,3,0.35] }, gearLoot:[["botas_cuero",0.08]] },
  orco:     { label:"Orco",           emoji:"👹", sprite:"orc", size:52, hp:60,  def:4,  dmg:8,  xp:500,  spd:60, lvl:15, hab:"enrage", loot:{ carne:[1,2,0.55], plata:[14,14,1], bronce:[1,2,0.35] }, gearLoot:[["casco_cuero",0.10],["escudo_madera",0.08]] },
  lancero:  { label:"Orco Lancero",   emoji:"🔱", sprite:"lancero", size:58, hp:90,  def:6,  dmg:10, xp:800,  spd:70, lvl:16, loot:{ carne:[2,3,0.60], plata:[20,20,1], bronce:[1,3,0.40], flecha:[2,6,0.45] }, gearLoot:[["pechera_cuero",0.10]] },
  guerrero: { label:"Orco Guerrero",  emoji:"👺", sprite:"guerrero", size:70, hp:115, def:8,  dmg:12, xp:1100, spd:65, lvl:20, loot:{ carne:[2,4,0.60], plata:[30,30,1], oro:[1,2,0.30] }, gearLoot:[["casco_hierro",0.10],["escudo_hierro",0.06]] },
  troll:    { label:"Trol",           emoji:"🧌", sprite:"troll", size:74, hp:140, def:10, dmg:14, xp:1400, spd:45, lvl:30, hab:"regen", loot:{ carne:[3,5,0.65], plata:[40,40,1], oro:[1,3,0.45], diamante:[1,1,0.12] }, gearLoot:[["pechera_hierro",0.15]] },
  // --- Bestiario ampliado (doc maestro 2/8): 15 criaturas + jefe; hab = habilidad (Nv 8+ del doc) ---
  murcielago: { label:"Murciélago", emoji:"🦇", sprite:"murcielago", size:26, hp:16, def:0, dmg:3, xp:130, spd:85, lvl:3, hab:"evade", evade:0.25, loot:{ plata:[4,4,1], carne:[1,1,0.35] } },
  baba:       { label:"Baba", emoji:"🫧", sprite:"baba", size:36, hp:35, def:2, dmg:4, xp:250, spd:40, lvl:7, hab:"split", loot:{ plata:[7,7,1] } },
  babita:     { label:"Babita", emoji:"🫧", sprite:"baba", size:22, hp:12, def:0, dmg:2, xp:50, spd:55, lvl:7, noRespawn:true, loot:{ plata:[2,2,1] } },
  arana:      { label:"Araña", emoji:"🕷️", sprite:"arana", size:40, hp:45, def:2, dmg:6, xp:340, spd:75, lvl:10, hab:"web", loot:{ plata:[9,9,1], flecha:[1,3,0.3] } },
  goblin:     { label:"Goblin", emoji:"👾", sprite:"goblin", size:44, hp:52, def:3, dmg:7, xp:430, spd:70, lvl:12, hab:"bleedhit", loot:{ plata:[11,11,1], bronce:[1,1,0.25] } },
  esqueleto:  { label:"Esqueleto Arquero", emoji:"💀", sprite:"esqueleto", size:48, hp:55, def:3, dmg:12, xp:640, spd:60, lvl:18, hab:"curseArrow", range:150, loot:{ plata:[18,18,1], flecha:[2,6,0.5] } },
  golem:      { label:"Golem de Piedra", emoji:"🗿", sprite:"golem", size:56, hp:120, def:13, dmg:10, xp:900, spd:35, lvl:22, hab:"golem", loot:{ plata:[24,24,1], piedra:[2,4,0.6], oro:[1,1,0.15] } },
  hombre_lobo:{ label:"Hombre Lobo", emoji:"🐺", sprite:"hombre_lobo", size:52, hp:130, def:6, dmg:16, xp:1300, spd:80, lvl:27, hab:"howl", loot:{ plata:[34,34,1], carne:[2,4,0.6] } },
  ogro:       { label:"Ogro", emoji:"🧟", sprite:"ogro", size:64, hp:190, def:12, dmg:19, xp:2000, spd:50, lvl:35, hab:"charge", loot:{ plata:[55,55,1], oro:[1,2,0.35] } },
  espectro:   { label:"Espectro", emoji:"👻", sprite:"espectro", size:50, hp:150, def:8, dmg:23, xp:2700, spd:70, lvl:40, hab:"phase", loot:{ plata:[70,70,1], diamante:[1,1,0.10] } },
  demonio:    { label:"Demonio Menor", emoji:"😈", sprite:"demonio", size:58, hp:250, def:16, dmg:27, xp:3900, spd:65, lvl:45, hab:"demon", loot:{ plata:[100,100,1], oro:[1,3,0.4], diamante:[1,1,0.15] } },
  dragon:     { label:"Dragón de las Cavernas", emoji:"🐉", sprite:"dragon", size:96, hp:900, def:28, dmg:42, xp:14000, spd:55, lvl:50, hab:"dragon", boss:true, loot:{ plata:[500,500,1], diamante:[1,3,0.8], netherita:[1,1,0.25] } },
};
// "detallitos (1)" punto 2: los mobs pegan y aguantan más. Multiplicadores globales editables:
var MOB_DMG_MULT = 1.3, MOB_DEF_MULT = 1.5;
MONSTER_ORDER.forEach(k => { const m = MONSTER_DEF[k];
  m.dmg = Math.max(1, Math.round(m.dmg * MOB_DMG_MULT));
  m.def = Math.round((m.def || 0) * MOB_DEF_MULT);
});
// combate (detalles 338): auto-ataque cada 2s, alcance del arco 4 celdas
const ATTACK_MS = 2000;
const MELEE_RANGE = GF.TILE * 1.35;
const BOW_RANGE = GF.TILE * 4;
// fixs.docx #2 (11/8): "bajar el porcentaje de drops en todos los mobs". UN número para el
// diseñador: multiplica la chance de TODOS los materiales. La plata garantizada no se toca
// (chance 1), así matar siempre paga algo pero los materiales salen menos seguido.
var DROP_CHANCE_MULT = 0.6;
function rollLoot(def) {
  const out = {};
  for (const k in def.loot) {
    const e = def.loot[k], a = e[0], b = e[1];
    let chance = (e.length > 2 ? e[2] : 1);
    if (chance < 1) chance *= DROP_CHANCE_MULT;   // #2: los no-garantizados caen menos
    if (Math.random() >= Math.min(1, chance * luckMult())) continue;   // suerte de la comida mejora los drops (detalles 338)
    let n = a + Math.floor(Math.random() * (b - a + 1));
    n = Math.round(n * (typeof chestBonus === "function" ? chestBonus() : 1));   // +1% de materiales por cofre colocado (el bono existía pero no se aplicaba)
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
const TOOL_CRAFT = { axe: { cost:{}, plata:6 }, rod: { cost:{ madera:3, piedra:1, oro:8 }, plata:0 } };   // 14/8 rebalance: hacha 6 (era 10) · caña con 8 de oro (era 15)
function craftTool(id, lote) {
  lote = Math.max(1, lote || 1);
  const tc = TOOL_CRAFT[id], td = TOOL_DEF[id]; if (!tc || !td) return;
  if (typeof tutoPermite === "function" && !tutoPermite("crafttool")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(tc.cost, tc.plata, "craftear " + td.label)) return;   // guardia del tutorial (12/8)
  if (lote > 1) {   // doc 2/8: crafteo en lote — la fricción es económica, no de clicks
    let hechas = 0;
    while (hechas < lote && toolCount(id) < 99 && canAfford(tc.cost) && G.plata >= tc.plata) { payCost(tc.cost); G.plata -= tc.plata; G.tools[id] = toolCount(id) + 1; hechas++; }
    if (!hechas) { toast("Te faltan materiales o plata"); return; }
    addXp("crafting", 5 * hechas); log("Crafteaste " + hechas + " × " + td.label + " (tenés " + G.tools[id] + ").", "good"); toast("+" + hechas + " " + td.label);
  if (typeof tutoEvent === "function") tutoEvent("crafttool");
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
var INV_BASE = 20, INV_MAX_ROWS = 6;   // 20 base (4 filas de 5, pedido del diseñador 30/7), ampliable +5 por fila hasta 50
// (es `var` y no `const` porque el MODO TESTEO la agranda: con la bolsa llena no se puede probar nada)
function invSlots() { return INV_BASE + (G.invRows || 0) * 5; }
function nextInvCost() {
  const r = G.invRows || 0;
  if (r >= INV_MAX_ROWS) return null;
  return { type: "plata", cost: 1000 * Math.pow(2, r) };   // 1000, 2000, 4000, 8000, 16000 (sumidero anti-inflación)
}
function expandInv() {
  const nc = nextInvCost();
  if (!nc) { toast("Bolsa al máximo"); return; }
  if (nc.type === "res") { if (!canAfford(nc.cost)) { toast("Te faltan minerales"); return; } if (typeof tutoGuardiaCosto === "function" && !tutoGuardiaCosto(nc.cost, 0, "ampliar la bolsa")) return; payCost(nc.cost); }
  else { if (G.plata < nc.cost) { toast("Te falta plata"); return; } if (typeof tutoGuardia === "function" && !tutoGuardia("plata", nc.cost, "ampliar la bolsa")) return; G.plata -= nc.cost; }
  G.invRows = (G.invRows || 0) + 1;
  log("Ampliaste la bolsa (+5 espacios).", "good"); toast("+5 espacios");
  if (typeof tutoEvent === "function") tutoEvent("invexp");
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

function tryAddRes(key, amt) {
  const b = G.res[key] || 0; G.res[key] = b + amt;
  if (canonicalStacks().length > invSlots()) { G.res[key] = b; return false; }
  syncSlots();
  if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshHotbar === "function") refreshHotbar();
  return true;
}

// --- casillas: todo es ítem (recursos/semillas apilan 99; herramientas/picos 1 c/u con durabilidad) ---
const ITEM_RES_ORDER = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz",
  "madera","piedra","bronce","hierro","oro","diamante","netherita","carne","flecha","lombriz",
  "tablon","barra_piedra","barra_bronce","barra_hierro","barra_oro",
  "fibra","pelaje","cuero","colmillo","esencia_runica","esencia_oscura"];   // los 3 cultivos nuevos y los materiales de Establo/Curtiduría/Altar también ocupan casilla
function descKey(d) { return d ? d.kind + ":" + d.key : ""; }
function canonicalStacks() {
  const list = [];
  ["axe", "rod"].forEach(k => { let n = toolCount(k); while (n > 0) { list.push({ kind: "tool", key: k }); n -= 99; } });   // apilables ×99
  // fixs.docx #9 (11/8): el arma EQUIPADA ya no ocupa lugar en la bolsa — vive en el panel de Equipo
  for (const id of ARM_ORDER) if (G.weapons && G.weapons[id] && G.gear.arma !== id) list.push({ kind: "arm", key: id });
  if (G.planos) for (const t in G.planos) if (G.planos[t]) list.push({ kind: "plano", key: t });   // blueprints (12/8): clic para colocarlos
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
  if (!G.hotbar.some(Boolean)) {   // 14/8 (reversión): vuelven los accesos de arranque
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
const SELLABLE = ["papa","zanahoria","cebolla","calabacin","repollo","calabaza","brocoli","girasol","trigo","maiz"];   // viernes (2): la carne no se vende
let marketCur = "plata";
function marketUnit(res) { return marketCur === "plata" ? priceOf(res) : priceOf(res)/10; }
function sellItem(res) {
  const inp = $("mq-"+res); let q = Math.floor(parseFloat(inp && inp.value) || 0);
  q = Math.max(0, Math.min(q, G.res[res]));
  if (q <= 0) { toast("Poné una cantidad"); return; }
  // candado anti-exploit (12/8): durante un "juntá X" no se puede VENDER ese recurso por
  // debajo de la meta — si no, vender para quedar en 9/10 mantenía el boost vivo infinito
  if (typeof tutoGuardia === "function" && !tutoGuardia(res, q, "vender " + (RES_LABEL[res] || res))) return;
  if (typeof tutoPermite === "function" && !tutoPermite("sell")) { tutoAviso(); return; }   // embudo estricto (13/8)
  if (marketCur === "plata") { const t=q*priceOf(res); G.plata+=t; G.res[res]-=q; log(`Vendiste ${q} ${RES_LABEL[res]} por ${t} de plata.`); toast("+"+t+" plata"); }
  else { const g=Math.floor(q*priceOf(res)/10); if (g<1){ toast("Muy poca cantidad para $Golden"); return; } G.res[res]-=q; G.golden+=g; log(`Vendiste ${q} ${RES_LABEL[res]} por ${g} $Golden.`,"gold"); toast("+"+g+" $Golden"); }
  if (window.sfx) sfx("coin");
  if (CROP_DEF[res] && typeof tutoEvent === "function") for (let i = 0; i < q; i++) tutoEvent("sell");   // 14/8 v4: un evento POR UNIDAD vendida — el capataz verifica cantidades
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
  if (typeof statAdd === "function") statAdd("pescar");
  if (typeof tutoEvent === "function") tutoEvent("fish");
  // fixs.docx #16 (11/8): pescar ya NO regala buffs — el pez va a la bolsa y los buffs
  // salen de COCINARLO (los platos con pescado ya los daban). La plata del común y el
  // premio del legendario se conservan: son botín, no buff.
  if (rar === "comun") { const p = 8 + Math.floor(Math.random() * 8); G.plata += p; log(`Pez común: +${p} plata.`); toast("+" + p + " "); }
  else if (rar === "raro") { log("Pez raro a la bolsa — cocinalo para sacarle un buff.", "good"); toast("¡Pez raro!"); }
  else if (rar === "epico") { log("Pez épico a la bolsa — cocinalo para sacarle un buff.", "good"); toast("¡Pez épico!"); }
  else { G.golden += 15; tryAddRes("oro", 1); log("¡Legendario! +15 y +1 Oro.", "gold"); toast("¡LEGENDARIO!"); }
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
}

// --- parcelas bloqueadas: costo de desbloquear la siguiente (200, 400, 800, ... plata) ---
var PLOT_UNLOCK_BASE = 200;
// hasta la 12: se duplica como siempre. De la 13 a la 60: sube PLOT_EXTRA_SUBA por parcela
// (con la duplicación, la 60 costaba 2^54 veces la base — imposible "a placer").
function plotUnlockCost() {
  const n = G.plotsOwned || 6;
  const hasta12 = PLOT_UNLOCK_BASE * Math.pow(2, Math.max(0, Math.min(n, 12) - 6));
  return Math.round(hasta12 * Math.pow(PLOT_EXTRA_SUBA, Math.max(0, n - 12)));
}

// --- cofre diario de login (racha de 7 días · anti-inflación: 80% insumos / 20% plata) ---
// "2das mejoras" (4/8): el cofre reparte SOLO cosas laterales — cosméticos soulbound y consumibles
// de un uso. NUNCA plata, minerales, herramientas, semillas, XP, fichas, runas, $Golden ni estrellas del pase.
const DAILY_REWARDS = [
  { cos: "Decoración chica de granja",             label: "Decoración chica para la granja" },
  { buffFarm: 5, buffMin: 60,                       label: "Bendición del Granjero: +5% velocidad de farmeo por 1 hora" },
  { dish: 2,                                        label: "2 platos ya cocinados" },
  { cos: "Emote o marco de perfil",                 label: "Emote o marco de perfil" },
  { carnada: 5,                                     label: "Carnada de pesca ×5" },
  { cos: "Cosmético sorpresa (de un set)",          label: "Cosmético sorpresa" },
  { coleccionable: true,                            label: "Coleccionable de la semana (rotativo)" },
];
// el día 7 entrega un cosmético EXCLUSIVO que rota cada semana (el gancho, sin tocar el balance)
const COLECCIONABLES = [
  "Espantapájaros dorado (decoración)",
  "Sombrero de paja brillante (skin)",
  'Gallina mascota "Pinta" (compañera)',
  "Farolito de luciérnagas (decoración animada)",
  "Camino de pétalos (skin de suelo)",
  'Título "Madrugador" + color de nombre verde',
];
function semanaISO(d) { const x = new Date(d || Date.now()); x.setHours(0,0,0,0); x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); const w1 = new Date(x.getFullYear(), 0, 4); return Math.round(((x - w1) / 86400000 + ((w1.getDay() + 6) % 7) - 3) / 7 + 1); }
function coleccionableDeLaSemana() { return COLECCIONABLES[semanaISO() % COLECCIONABLES.length]; }
// qué coleccionable del cofre entrega, además del texto, un ADORNO de verdad para la granja (10/8)
const COS_ADORNO = { "Espantapájaros dorado": "espantapajaros_oro", "Farolito de luciérnagas": "farolito" };
function darCosmetico(nombre) {
  G.cosmeticos = G.cosmeticos || [];
  G.cosmeticos.push(nombre + " (no vendible)");
  // los que son decoración van derecho a la bolsa de adornos: si no, quedaban como una línea
  // de texto en la lista de cosméticos y nunca se veían en la granja.
  const id = Object.keys(COS_ADORNO).find(k => String(nombre).indexOf(k) >= 0);
  if (id) {
    G.decoBolsa = G.decoBolsa || {};
    G.decoBolsa[COS_ADORNO[id]] = (G.decoBolsa[COS_ADORNO[id]] || 0) + 1;
    if (typeof syncEditDeco === "function") syncEditDeco();
  }
}

function dayStamp(off) { const d = new Date(Date.now() + (off || 0) * 86400000); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
// estado del cofre: ¿se puede reclamar hoy? ¿qué día de la racha toca? ¿se perdió la racha?
function dailyState() {
  const dd = G.daily || (G.daily = { day: 0, last: "" });
  if (dd.last === dayStamp(0)) return { claimable: false, day: dd.day, lost: false };
  // racha GENTIL (doc): si faltás un día no perdés nada, seguís donde quedaste
  const dia = (dd.day >= 7 || dd.day < 1) ? 1 : dd.day + 1;
  return { claimable: true, day: dia, lost: false };
}
const STREAK_RECOVER_COST = 0;   // legado: ya no hay racha que perder ni que recuperar
function claimDaily() {
  const st = dailyState();
  if (!st.claimable) { toast("Ya reclamaste hoy — volvé mañana"); return; }
  const r = DAILY_REWARDS[st.day - 1];
  let detalle = r.label;
  if (r.cos) darCosmetico(r.cos);
  if (r.coleccionable) { const c = coleccionableDeLaSemana(); darCosmetico(c); detalle = "Coleccionable de la semana: " + c; }
  if (r.buffFarm) addBuff("farm", "+" + r.buffFarm + "% vel. de farmeo", r.buffFarm, (r.buffMin || 60) * 60);
  if (r.dish) { G.dishes = G.dishes || {}; G.dishes.papa_asada = (G.dishes.papa_asada || 0) + r.dish; }
  if (r.carnada) G.res.lombriz = (G.res.lombriz || 0) + r.carnada;
  G.daily = { day: st.day, last: dayStamp(0) };
  log("Cofre diario " + st.day + "/7: " + detalle, "gold");
  toast("¡Reclamado! Día " + st.day + "/7");
  if (st.day === 7 && window.celebrate) celebrate({ title: "¡DÍA 7!", sub: "Cofre de recompensas", big: true, reward: detalle });
  refreshHud(); if (typeof syncSlots === "function") syncSlots(); if (isOpen("ov-inv")) refreshInv();
  if (typeof refreshDaily === "function") refreshDaily();
  if (typeof saveFarm === "function") saveFarm(true);
}


/* ================= MODO TESTEO (SOLO TIEMPOS) =====================================
   Comprime TODAS las esperas del juego a segundos y abre los cupos diarios, para que el
   diseñador pueda recorrer el juego entero (cultivos, cocina, animales, armaduras, pase,
   incursiones) sin esperar horas.

   10/8: ACÁ NO SE REGALA NADA. Antes también daba materiales, herramientas, picos, plata,
   $Golden, edificios, parcelas y nodos desbloqueados, y eso hacía imposible probar la
   progresión de verdad: no se sentía cuánto cuesta nada. Ahora el juego se juega igual que
   en la versión final y lo único distinto es que no hay que esperar.

   Importante: esto NO pisa la tabla del diseñador. Los valores reales siguen guardados en
   Supabase; acá solo se cambian los números EN MEMORIA, después de que el juego cargó los
   ajustes. Se apaga con GF.TESTEO = 0 en config.js y todo vuelve a los tiempos reales.

   Lo llama main.js, nunca balance.html: así el panel de balanceo sigue mostrando y guardando
   los valores REALES, y no hay forma de guardar sin querer los de testeo.                  */
function testSeg(seg) {
  const v = Math.round((seg || 0) / Math.max(1, TEST_DIV));
  return Math.max(TEST_MIN, Math.min(TEST_TOPE, v || TEST_MIN));
}
function aplicarTesteo() {
  if (!(window.GF && GF.TESTEO)) return false;

  // --- CULTIVOS: de 9 min / 24 h a unos segundos, respetando el orden entre ellos
  for (const k in CROP_DEF) CROP_DEF[k].growH = testSeg(CROP_DEF[k].growH * 3600) / 3600;
  if (typeof recomputeCropGrow === "function") recomputeCropGrow();
  FIRST_GROW_MS = 3000;                       // las 3 semillas del arranque, casi instantáneas
  SEED_DAILY_BASE = 999; SEED_DAILY_POR_NIVEL = 0;   // sin cupo diario de semillas

  // --- ÁRBOLES, PIEDRAS Y VETAS
  CD.tree = testSeg(CD.tree); CD.rock = testSeg(CD.rock);
  for (const k in ORE_DEF) ORE_DEF[k].cd = testSeg(ORE_DEF[k].cd);
  for (const k in CD_RAPIDO) CD_RAPIDO[k].seg = Math.max(2, Math.round(CD_RAPIDO[k].seg / TEST_DIV));

  // --- HERRERÍA, HORNO Y ALTAR
  MAT_CD_MS = 1000;
  for (let i = 0; i < ARM_CDS.length; i++) ARM_CDS[i] = 1;
  for (const id in ARM_DEF) ARM_DEF[id].cd = 1;
  DUMMY_CD_MS = 15000;

  // --- COCINA: las 14 recetas
  for (const k in RECIPE_DEF) RECIPE_DEF[k].cookS = testSeg(RECIPE_DEF[k].cookS);

  // --- ESTABLO: el ciclo de producción de cada animal
  for (const k in ANIMAL_DEF) ANIMAL_DEF[k].cicloH = testSeg(ANIMAL_DEF[k].cicloH * 3600) / 3600;
  FELIZ_BAJA_H = 0;   // no se ponen tristes mientras se prueba

  // --- COMBATE E INCURSIONES
  for (const k in INCURSIONES) INCURSIONES[k].min = 1;   // vuelven en 1 minuto
  INC_CUPO_DIA = 0;                                       // sin tope diario
  STAM_REGEN_SEG = 2;                                     // la estamina se llena sola enseguida
  STAM_RECARGAS_DIA = 99;

  // --- PASE DE BATALLA: para poder ver los 30 niveles
  PASS_STARS_LVL = 2;

  console.info("[Golden Farm] MODO TESTEO activo: SOLO tiempos comprimidos, no se regala nada. Poner GF.TESTEO = 0 para la versión final.");
  return true;
}
// DESTAPA-BOLSA: si una partida vieja quedó con más stacks de los que entran (le pasaba con el
// regalo de testeo, que ya no existe), lo que sobra queda ESCONDIDO: tirás algo y aparece el
// stack de atrás, como si el juego siguiera dando cosas. Esto lo recorta y solo actúa si de
// verdad no entra. Se deja para reparar los guardados que arrastran el problema.
function testeoDestapar() {
  if (!(window.GF && GF.TESTEO)) return false;
  if (typeof canonicalStacks !== "function" || canonicalStacks().length <= invSlots()) return false;
  let tocado = 0;
  for (const k in G.res) if (G.res[k] > 99) { G.res[k] = 99; tocado++; }
  CROP_ORDER.forEach(k => { if (G.seeds[k] > 50) { G.seeds[k] = 50; tocado++; } });
  if (typeof syncSlots === "function") syncSlots();
  if (tocado && typeof log === "function") log("MODO TESTEO: la bolsa estaba desbordada (" + tocado + " montones de más) y se recortó a 99 por recurso, para que puedas seguir juntando cosas.", "gold");
  return tocado > 0;
}
