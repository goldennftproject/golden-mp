/* ARRANCAR EL JUEGO DE VERDAD (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   EL AGUJERO QUE ESTE ARCHIVO TAPA, Y ES GRANDE.
   Las 94 pruebas de este proyecto cargan `config · nav · state · save` en un contexto de Node y
   comprueban REGLAS. Eso está bien y encontró cosas que ningún clic hubiera encontrado. Pero
   deja fuera exactamente la mitad del juego —ui.js, boot.js, farm.js, forest.js, plaza.js,
   main.js, update.js, unas veinte mil líneas— y con ella deja fuera la clase de fallo más
   vergonzosa que hay: la que se ve en el primer segundo.

   Un `refreshForge` que llama a una función que no existe no rompe ninguna prueba: rompe la
   Herrería del jugador. Y en este proyecto ya pasó dos veces que algo « estaba hecho » sin
   haberse ejecutado nunca (la limpieza de posiciones fantasma, el crafteo de +5).

   Esto carga los DOCE archivos en el mismo orden que el navegador, con un Phaser y un DOM de
   mentira, y reporta todo lo que revienta. No reemplaza a un navegador — reemplaza a NADIE, que
   es lo que había.
     node tools/arrancar-el-juego.js                                                             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");

/* ── el orden REAL, leído de index.html — no una copia a mano que envejece ─────────────────── */
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
const mFiles = HTML.match(/const files = \[([^\]]+)\]/);
if (!mFiles) { console.log("  No encontré la lista de scripts en index.html"); process.exit(1); }
const ARCHIVOS = mFiles[1].split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean);

let fallos = 0;
const problemas = [];
const linea = () => console.log("─".repeat(78));
const nota = (grave, quien, qué) => { problemas.push({ grave, quien, qué }); if (grave) fallos++; };

/* ── un Phaser de cartón ──────────────────────────────────────────────────────────────────────
   No simula el motor: simula su SUPERFICIE. Todo lo que el juego le pide devuelve un objeto que
   acepta cualquier cosa encadenada. Con eso alcanza para que las clases se definan y para que
   cualquier error de SINTAXIS o de nombre salga a la luz. */
function encadenable() {
  const o = new Proxy(function () {}, {
    get(t, k) {
      if (k === "then") return undefined;                 // que no lo confundan con una promesa
      if (k === Symbol.toPrimitive || k === "toString") return () => "";
      if (k in t) return t[k];
      return encadenable();
    },
    apply() { return encadenable(); },
    construct() { return encadenable(); },
    set() { return true; },
  });
  return o;
}
class EscenaFalsa {
  constructor() { this.sys = encadenable(); }
}
const Phaser = {
  Scene: EscenaFalsa,
  Game: function () { return encadenable(); },
  AUTO: 0, CANVAS: 1, WEBGL: 2,
  Math: { Between: (a, b) => a, FloatBetween: (a, b) => a, Clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
          Distance: { Between: () => 0 }, Linear: (a, b, t) => a + (b - a) * t, DegToRad: (d) => d * Math.PI / 180 },
  Geom: { Rectangle: function () { return encadenable(); }, Circle: function () { return encadenable(); } },
  Utils: { Array: { GetRandom: (a) => a && a[0] } },
  Display: { Color: { HexStringToColor: () => ({ color: 0 }), Interpolate: { ColorWithColor: () => ({ r: 0, g: 0, b: 0 }) } } },
  Input: { Keyboard: { KeyCodes: new Proxy({}, { get: () => 0 }) } },
  Scale: { RESIZE: 0, FIT: 1, CENTER_BOTH: 2 },
};

/* ── un DOM de cartón, con memoria ────────────────────────────────────────────────────────────
   Guarda los elementos por id: así, si el juego pide #forge-craft y lo pinta, podemos LEER lo
   que pintó. Eso convierte esto de « ¿revienta? » en « ¿y además dice algo? ». */
const elementos = {};
function elemento(id) {
  if (elementos[id]) return elementos[id];
  const el = {
    id, _html: "", tagName: "DIV", nodeName: "DIV", style: new Proxy({}, { get: () => "", set: () => true }),
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {}, children: [], value: "", textContent: "", checked: false, disabled: false,
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    appendChild(c) { this.children.push(c); return c; }, removeChild() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    /* querySelector devuelve un elemento, NO null. Con null, cualquier panel que haga
       `card.querySelector(".x").innerHTML = …` explota acá y no en el navegador — otro fallo
       inventado por el arnés. Lo que sí queremos cazar es el panel que no encuentra su propio
       contenedor en el HTML real, y para eso está la comprobación de ids de más abajo. */
    querySelector: (sel) => elemento(String(id) + " " + String(sel)),
    querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
    focus() {}, blur() {}, click() {}, insertAdjacentHTML() {}, scrollIntoView() {},
  };
  elementos[id] = el; return el;
}
const documento = {
  getElementById: (id) => elemento(id),
  querySelector: () => null, querySelectorAll: () => [],
  createElement: (t) => { const e = elemento("__nuevo_" + Math.random()); e.tagName = String(t).toUpperCase(); e.nodeName = e.tagName; return e; },
  createTextNode: () => ({}), addEventListener() {}, removeEventListener() {},
  body: elemento("body"), head: elemento("head"), documentElement: elemento("html"),
  readyState: "complete", hidden: false, visibilityState: "visible",
  fonts: { ready: Promise.resolve() },
};

/* ── el contexto: un navegador mínimo pero honesto ───────────────────────────────────────────
   Todo lo que NO esté acá y el juego use va a explotar, y eso es exactamente lo que queremos.  */
const guardado = {};
const ctx = {
  console: {
    log() {},
    warn: (...a) => nota(false, "console.warn", a.join(" ").slice(0, 160)),
    error: (...a) => nota(true, "console.error", a.join(" ").slice(0, 160)),
    info() {}, debug() {}, table() {}, group() {}, groupEnd() {},
  },
  Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, WeakMap, WeakSet,
  Symbol, Promise, RegExp, Error, TypeError, Proxy, Reflect, Intl,
  isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, escape: encodeURIComponent,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  performance: { now: () => 0 },
  Phaser, document: documento,
  localStorage: { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; }, clear() { for (const k in guardado) delete guardado[k]; } },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { search: "", href: "http://localhost/", hostname: "localhost", protocol: "http:", pathname: "/", reload() {}, replace() {} },
  navigator: { userAgent: "node", onLine: true, language: "es", clipboard: { writeText: () => Promise.resolve() } },
  history: { replaceState() {}, pushState() {} },
  URLSearchParams, URL, TextEncoder, TextDecoder,
  fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve("") }),
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  alert() {}, confirm: () => true, prompt: () => null,
  screen: { width: 1280, height: 720 },
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  Image: function () { return { addEventListener() {}, set src(v) {}, get src() { return ""; } }; },
  Audio: function () { return { play: () => Promise.resolve(), pause() {}, addEventListener() {} }; },
  AudioContext: function () { return encadenable(); },
  supabase: { createClient: () => encadenable() },
  Colyseus: encadenable(),
  GOLDEN_SERVER: "",
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.top = ctx; ctx.parent = ctx;
ctx.webkitAudioContext = ctx.AudioContext;
vm.createContext(ctx);

console.log("");
linea();
console.log("  ARRANCAR EL JUEGO — los " + ARCHIVOS.length + " archivos, en el orden de index.html");
linea();

/* ── FASE 1 · ¿se ejecutan los doce sin reventar? ─────────────────────────────────────────── */
const cargados = [];
for (const rel of ARCHIVOS) {
  const abs = path.join(RAIZ, "public", rel);
  if (!fs.existsSync(abs)) { console.log("  ✘  " + rel + " — NO EXISTE, y index.html lo pide"); nota(true, rel, "index.html lo pide y no está en disco"); continue; }
  const src = fs.readFileSync(abs, "utf8");
  try {
    vm.runInContext(src, ctx, { filename: rel });
    cargados.push(rel);
    console.log("  ✓  " + rel.padEnd(18) + (src.split("\n").length + " líneas").padStart(12));
  } catch (e) {
    console.log("  ✘  " + rel + " — " + e.message);
    nota(true, rel, e.message);
  }
}

/* ── FASE 2 · ¿el estado inicial es coherente? ────────────────────────────────────────────── */
console.log("");
linea();
console.log("  EL ESTADO DE UNA GRANJA RECIÉN NACIDA");
linea();
const G = ctx.G;
const chequear = (nom, cond, det) => {
  console.log((cond ? "  ✓  " : "  ✘  ") + nom + (det ? "   " + det : ""));
  if (!cond) nota(true, nom, det || "");
};
if (!G) { chequear("existe G", false, "state.js no llegó a definirlo"); }
else {
  chequear("la bolsa tiene todas las claves de ITEM_RES_ORDER",
    (() => {
      const falta = (vm.runInContext("ITEM_RES_ORDER", ctx) || []).filter(k => G.res[k] === undefined);
      return falta.length ? falta.join(", ") : true;
    })() === true,
    (() => { const f = (vm.runInContext("ITEM_RES_ORDER", ctx) || []).filter(k => G.res[k] === undefined); return f.length ? "faltan: " + f.join(", ") : ""; })());
  chequear("y toda clave de G.res tiene etiqueta para el jugador",
    (() => {
      const L = vm.runInContext("RES_LABEL", ctx);
      const sin = Object.keys(G.res).filter(k => !L[k] && !(vm.runInContext("CROP_DEF", ctx) || {})[k]);
      return !sin.length;
    })(),
    (() => { const L = vm.runInContext("RES_LABEL", ctx); const C = vm.runInContext("CROP_DEF", ctx) || {};
             const s = Object.keys(G.res).filter(k => !L[k] && !C[k]); return s.length ? "sin nombre: " + s.join(", ") : ""; })());
}

/* ── FASE 3 · ¿las ventanas PINTAN algo, o revientan? ─────────────────────────────────────────
   Ésta es la parte que ninguna prueba de este proyecto hacía. Se llama a cada refresh de la
   interfaz con una granja de verdad y se mira que (a) no explote y (b) escriba algo. Un panel
   que devuelve cadena vacía es un panel en blanco para el jugador. */
console.log("");
linea();
console.log("  LAS VENTANAS: ¿pintan, o se quedan en blanco?");
linea();
const PANELES = [
  ["refreshHud", null], ["refreshInv", "inv-slots"], ["refreshForge", "forge-craft"],
  ["refreshCookingV2", "ck-grid"], ["refreshHorno", null], ["refreshPedidos", "pd-lista"],
  ["refreshAlbum", "album-list"], ["refreshLogros", "logros-list"], ["refreshEstablo", "establo-list"],
  ["syncSlots", null], ["refreshSeedShop", null], ["refreshSkills", null],
  ["refreshMarket", null], ["refreshCobertizo", "cob-slots"],
];
/* una granja con cosas: sin esto muchos paneles salen legítimamente vacíos y no probarían nada */
if (G) {
  G.plata = 5000; G.level = 12;
  G.skills = { farming: 9000, tala: 9000, mining: 9000, fishing: 30000, ganaderia: 9000, cooking: 9000, crafting: 9000 };
  Object.keys(G.res).forEach(k => { G.res[k] = 50; });
  G.canas = { junco: 30, roble: 30, hierro: 25, abuelo: 20 };
  G.trampas = { nasa: 3, red: 3, palangre: 3 };
  G.amarres = [null, null, null];
  G.fish = { pez_comun: 5, calamar: 4 };
  G.tools = { axe: 20, rod: 20 };
  /* OJO: G.picks tiene TRES campos (owned · dur · eq) y pisarlo con solo `dur` deja al juego
     leyendo `owned.stone` de un undefined. Me pasó al escribir esto y me costó cinco minutos
     creer que era un bug del juego: un fixture que miente sobre la forma del estado produce
     fallos que no existen, y ésos son más caros que los de verdad porque se arreglan « bien ». */
  G.picks.owned = { stone: true, bronze: true, iron: true, gold: true };
  G.picks.dur = { stone: 10, bronze: 10, iron: 10, gold: 10 };
  G.picks.eq = "stone";
}
let pintados = 0, mudos = [];
for (const [fn, idSalida] of PANELES) {
  if (typeof ctx[fn] !== "function") { console.log("  ·  " + fn.padEnd(20) + "no existe (puede ser normal)"); continue; }
  try {
    ctx[fn]();
    pintados++;
    if (idSalida) {
      const html = (elementos[idSalida] || {})._html || "";
      if (html.length < 20) { mudos.push(fn + " → #" + idSalida); console.log("  ⚠  " + fn.padEnd(20) + "corrió pero #" + idSalida + " quedó casi vacío (" + html.length + " car.)"); }
      else console.log("  ✓  " + fn.padEnd(20) + "pintó " + html.length + " caracteres en #" + idSalida);
    } else console.log("  ✓  " + fn.padEnd(20) + "corrió sin romperse");
  } catch (e) {
    console.log("  ✘  " + fn.padEnd(20) + e.message);
    nota(true, fn, e.message);
  }
}
mudos.forEach(m => nota(false, "panel casi vacío", m));

/* ── FASE 3b · ¿los ids que el código pinta EXISTEN en index.html? ───────────────────────────
   Ésta es la comprobación que de verdad vale, y la que el DOM de cartón no puede hacer sola:
   `$("lo-que-sea")` siempre devuelve algo acá, así que un panel que apunta a un id que nadie
   puso en el HTML corre perfecto en el arnés y sale en blanco en el navegador. Se compara contra
   el index.html de verdad. */
console.log("");
linea();
console.log("  LOS IDS QUE EL CÓDIGO PINTA, ¿ESTÁN EN index.html?");
linea();
const UI_SRC = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const idsEnHtml = new Set((HTML.match(/id="([^"]+)"/g) || []).map(s => s.slice(4, -1)));
/* solo los que se ESCRIBEN (innerHTML/textContent): un $("x") que solo se lee y se comprueba
   con `if (!x) return` es una guarda legítima, no un id roto. */
const escritos = new Set();
const reEsc = /\$\("([a-z0-9_-]+)"\)\s*\.(innerHTML|textContent)\s*=/gi; let mm;
while ((mm = reEsc.exec(UI_SRC))) escritos.add(mm[1]);
const huerfanos = [...escritos].filter(id => !idsEnHtml.has(id));
console.log("  ids que ui.js escribe sin comprobar: " + escritos.size);
if (!huerfanos.length) console.log("  ✓  todos existen en index.html");
else huerfanos.forEach(id => { console.log("  ✘  #" + id + " — ui.js le escribe y no está en el HTML"); nota(true, "id huérfano", "#" + id); });

/* ── FASE 4 · ¿los sprites que el juego pide están en disco? ─────────────────────────────────
   Un sprite que falta no rompe nada: deja un cuadrado rosa. Y por eso nadie lo ve hasta que lo
   ve el diseñador. */
console.log("");
linea();
console.log("  LOS SPRITES QUE EL JUEGO PIDE Y NO ESTÁN");
linea();
const ASSETS = path.join(RAIZ, "public/assets");
function existeAsset(rel) {
  const limpio = String(rel).split("?")[0].replace(/^assets\//, "");
  return fs.existsSync(path.join(ASSETS, limpio));
}
const catalogos = [
  ["RES_SPRITE", (v) => v], ["ESPECIE_DEF", (v) => v && v.sprite], ["CROP_DEF", (v) => v && v.sprite],
  ["ORE_DEF", (v) => v && v.sprite], ["ANIMAL_DEF", (v) => v && v.sprite],
  ["RECIPE_DEF", (v) => v && v.sprite], ["FISH_DEF", (v) => v && v.sprite],
];
let faltan = [];
for (const [nom, sacar] of catalogos) {
  let tabla; try { tabla = vm.runInContext(nom, ctx); } catch (e) { continue; }
  if (!tabla) continue;
  for (const k in tabla) {
    const s = sacar(tabla[k]); if (!s || typeof s !== "string") continue;
    if (!existeAsset("farm/" + s + ".png")) faltan.push(nom + "." + k + " → " + s + ".png");
  }
}
if (!faltan.length) console.log("  ✓  todos los sprites de los catálogos están en disco");
else {
  faltan.slice(0, 25).forEach(f => console.log("  ⚠  " + f));
  if (faltan.length > 25) console.log("     …y " + (faltan.length - 25) + " más");
  faltan.forEach(f => nota(false, "sprite ausente", f));
}

/* ── EL PARTE ────────────────────────────────────────────────────────────────────────────── */
console.log("");
linea();
console.log("  PARTE");
linea();
const graves = problemas.filter(p => p.grave), leves = problemas.filter(p => !p.grave);
console.log("  archivos que se ejecutaron: " + cargados.length + " de " + ARCHIVOS.length);
console.log("  ventanas que pintaron:      " + pintados + " de " + PANELES.length);
console.log("  problemas graves:           " + graves.length);
console.log("  avisos:                     " + leves.length);
if (graves.length) {
  console.log("");
  graves.forEach(p => console.log("  ✘  " + p.quien + " — " + p.qué));
}
console.log("");
console.log(fallos ? "  El juego NO arranca limpio." : "  El juego arranca: los doce archivos corren y las ventanas pintan.");
process.exit(fallos ? 1 : 0);
