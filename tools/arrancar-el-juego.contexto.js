/* EL NAVEGADOR DE CARTÓN — compartido (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Un Phaser y un DOM de mentira, suficientes para que los doce archivos del juego se ejecuten
   fuera del navegador. Vive en su propio archivo porque lo usan DOS herramientas
   (arrancar-el-juego y auditar-nombres-sueltos) y dos copias de un arnés son dos arneses que
   envejecen distinto — la misma razón por la que en el juego no hay dos tablas de precios.

   No simula el motor: simula su SUPERFICIE. Todo lo que el juego le pide a Phaser devuelve un
   objeto que acepta cualquier cosa encadenada. Con eso alcanza para que las clases se definan y
   para que cualquier error de sintaxis o de nombre salga a la luz.

   `arrancar(RAIZ)` devuelve { ctx, ARCHIVOS, elementos, problemas, cargados }.               */
const fs = require("fs"), path = require("path"), vm = require("vm");

function construir(problemas, elementos) {
  const nota = (grave, quien, q) => problemas.push({ grave, quien, "qué": q });
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
  /* `elementos` llega por parámetro: quien arranca el juego quiere poder LEER lo que cada
     panel pintó, y eso solo funciona si el mapa de elementos es el mismo de los dos lados. */
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


  return { ctx, elemento };
}

function arrancar(RAIZ) {
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  const m = HTML.match(/const files = \[([^\]]+)\]/);
  if (!m) throw new Error("no encontré la lista de scripts en index.html");
  const ARCHIVOS = m[1].split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean);

  const problemas = [];
  const elementos = {};
  /* `elementos` llega por parámetro: quien arranca el juego quiere poder LEER lo que cada
     panel pintó, y eso solo funciona si el mapa de elementos es el mismo de los dos lados. */
  const { ctx } = construir(problemas, elementos);
  const cargados = [];
  for (const rel of ARCHIVOS) {
    const abs = path.join(RAIZ, "public", rel);
    if (!fs.existsSync(abs)) { problemas.push({ grave: true, quien: rel, "qué": "index.html lo pide y no está en disco" }); continue; }
    const src = fs.readFileSync(abs, "utf8");
    try { vm.runInContext(src, ctx, { filename: rel }); cargados.push({ rel, lineas: src.split("\n").length }); }
    catch (e) { problemas.push({ grave: true, quien: rel, "qué": e.message }); }
  }
  return { ctx, ARCHIVOS, elementos, problemas, cargados, HTML };
}
module.exports = { arrancar };
