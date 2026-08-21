/* EL LOTE DE EXPANSIÓN ENSEÑA SU PREMIO EN FANTASMA, SIN TEXTO (20/8, diseñador)
   "Que se muestre de alguna forma lo que se conseguiría con cada expansión — pero no sé cómo
    mostrarla en el juego sin tener que recurrir siempre a texto."

   La forma: el árbol, la roca y la parcela del bloque ya existen en la escena con su posición
   definitiva (ocultos, esperando la compra). Al pasar el cursor por el lote se dibujan ahí mismo,
   semitransparentes. Ves la mercancía donde va a estar; no la lees.

   Este test arranca la escena de verdad, dispara el pointerover del lote como haría el ratón, y
   pregunta: ¿aparecieron los fantasmas? ¿en las MISMAS celdas donde van a nacer los nodos? ¿se
   esconden al salir? ¿y nacen a la vista cuando ya podés pagar, como la chapa dorada?
     node tools/test-fantasmas-expansion.js                                                       */
const fs = require("fs"), vm = require("vm");

function enc(n, args, reg) {
  const o = { __t: n, __ev: {}, width: 42, height: 42, displayWidth: 42, displayHeight: 42, visible: true,
    texture: { key: n || "t" }, frame: { width: 42, height: 42, name: "" },
    x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, angle: 0, interactivo: false,
    originX: .5, originY: 1, active: true, isCropped: false,
    scrollX: 0, scrollY: 0, zoom: 1, tilePositionX: 0, tilePositionY: 0 };
  if (args && typeof args[0] === "number" && typeof args[1] === "number") { o.x = args[0]; o.y = args[1]; }
  if (args && typeof args[2] === "string") o.texture = { key: args[2] };
  const p = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (typeof k === "string" && k[0] === "_") return undefined;
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {} });
      if (k === "getSourceImage") return () => ({ width: 42, height: 42 });
      if (k === "setVisible") return v => { o.visible = v; return p; };
      if (k === "setAlpha") return v => { o.alpha = v; return p; };
      if (k === "setDepth") return v => { o.depth = v; return p; };
      if (k === "setPosition") return (x, y) => { o.x = x; o.y = y; return p; };
      if (k === "setScale") return (a, b) => { o.scaleX = a; o.scaleY = b === undefined ? a : b; return p; };
      if (k === "setOrigin") return (a, b) => { o.originX = a; o.originY = b === undefined ? a : b; return p; };
      if (k === "setDisplaySize") return (ww, hh) => { o.displayWidth = ww; o.displayHeight = hh; return p; };
      if (k === "setInteractive") return () => { o.interactivo = true; return p; };
      /* los eventos se GUARDAN para poder dispararlos: es el ratón de este test */
      if (k === "on") return (ev, fn) => { (o.__ev[ev] = o.__ev[ev] || []).push(fn); return p; };
      if (k === "emit") return (ev, ...a) => { (o.__ev[ev] || []).forEach(f => f(...a)); return p; };
      if (k === "destroy") return () => { o.visible = false; o.active = false; return p; };
      return () => p;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  if (reg) reg.push(o);
  return p;
}
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [],
  querySelector: () => null, createElement: () => enc("el") };
ctx.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: {}, Display: { Color: {} } };
vm.createContext(ctx);
["config", "nav", "state", "farm"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
vm.runInContext("this.FarmScene = FarmScene;", ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "askConfirm"].forEach(f => { ctx[f] = () => {}; });
const GF = ctx.GF, G = ctx.G, T = GF.TILE;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* nivel de sobra para que el lote 1 exista, y SIN material: el cartel y los fantasmas nacen ocultos */
G.expansiones = 0; G.level = 99; G.built = { store: false }; G.obras = {}; G.layout = {};
G.decos = []; G.chests = []; G.planos = {}; G.plotsOwned = 3; G.res = {};
G.treesOpen = [0]; G.rocksOpen = [0]; G.skills = { mining: 0 };
GF.aplicarTerreno(0); GF.ocupCambio();

const creados = [];
const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k, a, creados) });
esc.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"), addCanvas() {}, remove() {} };
esc.cameras = { main: enc("cam") }; esc.scale = { width: 1280, height: 720, on() {}, off() {} };
esc.tweens = { add: () => enc("tw"), addCounter: () => enc("tw") };
esc.input = { on() {}, off() {}, keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
  mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {}, activePointer: { worldX: 0, worldY: 0, x: 0, y: 0 } };
esc.events = { once() {}, on() {}, off() {} };
esc.time = { addEvent: () => enc("ev"), delayedCall: () => enc("ev") };
esc.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
esc.sound = { add: () => enc("s") }; esc.physics = { add: { existing() {} } }; esc.game = { canvas: enc("cv") };
let arranco = true;
try { esc.create(); } catch (e) { arranco = false; console.log("      (create: " + e.message + ")"); }

console.log("\nLA ESCENA ARRANCA CON EL LOTE 1 DISPONIBLE");
ok("create() llegó hasta el final", arranco);
const ex = ctx.expansionSiguiente();
ok("hay un lote siguiente y su bloque tiene parcela reservada", !!(ex && ex.bloque && ex.bloque.parcela));

/* los fantasmas son los únicos objetos al 0,55 de alfa */
const fantasmas = creados.filter(o => o.alpha === 0.55);
const dentro = (x, y) => x >= ex.bloque.c0 * T && x <= ex.bloque.c1 * T && y >= ex.bloque.r0 * T && y <= ex.bloque.r1 * T;

console.log("\nEL PREMIO ESTÁ DIBUJADO, PERO EN REPOSO NO SE VE");
{
  ok("hay al menos 3 fantasmas: árbol, roca y parcela", fantasmas.length >= 3,
    fantasmas.length + " (" + fantasmas.map(f => f.texture.key).join(" · ") + ")");
  ok("sin material, nacen ocultos — el bosque queda limpio", fantasmas.every(f => !f.visible));
  ok("y todos caen DENTRO del bloque que se compra", fantasmas.every(f => dentro(f.x, f.y)));
  /* y son los sprites de verdad, en las celdas de verdad: las mismas donde van a nacer los nodos */
  const nodos = esc.objs.filter(o => o.exp === ex.i);
  ok("cada nodo oculto del bloque tiene su fantasma en la MISMA posición",
    nodos.length > 0 && nodos.every(n => fantasmas.some(f => f.x === n.cx && f.y === n.by)),
    nodos.length + " nodos esperando");
  const pl = ex.bloque.parcela;
  ok("y la parcela reservada también", fantasmas.some(f => f.x === (pl.col + 0.5) * T && f.y === (pl.row + 0.5) * T));
}

console.log("\nEL CURSOR LOS ENCIENDE, Y AL SALIR SE APAGAN");
{
  /* la zona interactiva del lote: el rectángulo interactivo que cubre el bloque */
  const zona = creados.find(o => o.__t === "rectangle" && o.interactivo && o.__ev.pointerover && dentro(o.x, o.y));
  ok("el lote tiene su zona con pointerover", !!zona);
  if (zona) {
    (zona.__ev.pointerover || []).forEach(f => f());
    ok("cursor encima: los fantasmas aparecen", fantasmas.every(f => f.visible));
    (zona.__ev.pointerout || []).forEach(f => f());
    ok("cursor afuera: se esconden", fantasmas.every(f => !f.visible));
  }
}

console.log("\nY CUANDO YA PODÉS PAGAR, NACEN A LA VISTA — COMO LA CHAPA DORADA");
{
  Object.keys(ex.costo).forEach(k => { G.res[k] = ex.costo[k] + 5; });
  esc._expFirma = null;               // forzar el redibujo, como haría el refresco del HUD
  esc.dibujarExpansion();
  const fant2 = creados.filter(o => o.alpha === 0.55 && o.active !== false);
  ok("con el material completo, el premio se ve sin pasar el cursor", fant2.length >= 3 && fant2.every(f => f.visible),
    fant2.length + " fantasmas a la vista: la chapa te llama y se ve QUÉ comprás");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el premio se ve, no se lee.\n");
process.exit(fallos ? 1 : 0);
