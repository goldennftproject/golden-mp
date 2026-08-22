/* LAS CARGAS DE LOS NODOS: EL ÁRBOL PASADO NO SE DESPERDICIA (21/8, dirección)
   "Para los que no pueden hacer guardia: si el árbol se pasa crecido 30 minutos más, al talarlo
    da 2 maderas en vez de 1. Si se pasa 2 horas, da 4."

   La regla: 1 carga por cada reloj PROPIO extra vencido, tope 4. Árbol (30 min) lleno a las 2 h;
   roca y veta de piedra (40 min) llenas a las 2 h 40. Un golpe cosecha todo. Vetas de mineral NO
   acumulan. XP y desgaste de herramienta van por acción, no por carga.

   Se prueba con la ESCENA REAL y el reloj trucado: se tala de verdad (3 golpes) y se cuenta lo
   que cae en la bolsa, la XP y el hacha.
     node tools/test-cargas-nodos.js                                                              */
const fs = require("fs"), vm = require("vm");

/* ---------- reloj trucado ---------- */
const REAL0 = 1755730800000;
let desfase = 0;
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(REAL0 + desfase); else super(...a); }
  static now() { return REAL0 + desfase; }
}

/* ---------- escena de mentira (la de jugada-completa) ---------- */
function enc(n, args) {
  const o = { __t: n, width: 42, height: 42, displayWidth: 42, visible: true, texture: { key: n || "t" },
    frame: { width: 42, height: 42, name: "" }, x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0,
    angle: 0, originX: .5, originY: 1, active: true, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };
  if (args && typeof args[0] === "number") { o.x = args[0]; o.y = args[1]; }
  const p = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (typeof k === "string" && k[0] === "_") return undefined;
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {} });
      if (k === "getSourceImage") return () => ({ width: 42, height: 42 });
      if (k === "setVisible") return v => { o.visible = v; return p; };
      if (k === "getBounds") return () => ({ x: o.x - 21, y: o.y - 42, width: 42, height: 42 });
      return () => p;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return p;
}
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; },
  setInterval: () => 0, clearInterval() {}, clearTimeout() {}, requestAnimationFrame: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [],
  querySelector: () => null, createElement: () => enc("el"), body: enc("body") };
ctx.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: { Rectangle: class {} }, Display: { Color: {} } };
ctx.Phaser.Geom.Rectangle.Contains = (b, x, y) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
vm.createContext(ctx);
["config", "nav", "state", "save", "farm"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
vm.runInContext("this.FarmScene = FarmScene;", ctx);
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "syncSlots", "refreshHud", "saveFarm", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshMarket"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.$ = () => { const e = enc("dom"); e.value = "9999"; return e; };
const G = ctx.G, GF = ctx.GF, CD = vm.runInContext("CD", ctx);
const GOLPES = vm.runInContext("GOLPES_TALAR", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* jugador armado */
G.tuto = { done: true };
G.tools = { axe: 50 };
G.picks = { eq: "wood", owned: { wood: true }, dur: { wood: 500 } };
GF.aplicarTerreno(16); GF.ocupCambio();   // mapa completo: hay vetas de todo

const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k, a) });
esc.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"), addCanvas() {}, remove() {}, getPixelAlpha: () => 255 };
esc.cameras = { main: enc("cam") }; esc.scale = { width: 1280, height: 720, on() {}, off() {} };
esc.tweens = { add: (cfg) => { if (cfg && cfg.onComplete) { try { cfg.onComplete(); } catch (e) {} } return enc("tw"); }, addCounter: () => enc("tw"), killTweensOf() {} };
esc.input = { on() {}, off() {}, keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
  mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {},
  activePointer: { worldX: 0, worldY: 0, x: 0, y: 0, event: { clientX: 300, clientY: 300 } } };
esc.events = { once() {}, on() {}, off() {} };
esc.time = { addEvent: () => enc("ev"), delayedCall: (ms, fn) => { try { fn && fn(); } catch (e) {} return enc("ev"); } };
esc.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
esc.sound = { add: () => enc("s") }; esc.physics = { add: { existing() {} } }; esc.game = { canvas: enc("cv") };
esc.create();

const min = (m) => m * 60000;
/* corta el nodo con los golpes que pida y devuelve lo que sumó a la bolsa */
function cosechar(o, res, kind) {
  const antes = G.res[res] || 0;
  for (let g = 0; g < GOLPES; g++) { esc.action = { kind, o }; esc.finishAction(); }
  return (G.res[res] || 0) - antes;
}
/* deja el nodo cortado AHORA y avanza el reloj `pasadoMin` más allá de su crecimiento */
function plantar(o, cdSeg, pasadoMin) {
  o.cdIni = ctx.Date.now(); o.readyAt = o.cdIni + cdSeg * 1000; o.golpes = 0;
  desfase += cdSeg * 1000 + min(pasadoMin);
}

const arbol = esc.objs.find(o => o.type === "tree" && !o.locked);
const roca = esc.objs.find(o => o.type === "rock" && !o.locked);
const vetaPiedra = esc.objs.find(o => o.type === "ore" && o.ore === "piedra" && !o.locked);
const vetaBronce = esc.objs.find(o => o.type === "ore" && o.ore === "bronce" && !o.locked);
ok("(escenario) árbol, roca, veta de piedra y veta de bronce a mano",
  !!arbol && !!roca && !!vetaPiedra && !!vetaBronce);

console.log("\nEL ÁRBOL QUE SE PASA, ACUMULA — Y A LAS 2 HORAS ESTÁ LLENO");
{
  plantar(arbol, CD.tree, 0);
  ok("recién crecido: 1 madera (el guardián no gana de más)", cosechar(arbol, "madera", "chop") === 1);
  plantar(arbol, CD.tree, 30);
  ok("pasado 30 min (un reloj extra): 2 maderas", cosechar(arbol, "madera", "chop") === 2);
  plantar(arbol, CD.tree, 60);
  ok("pasado 1 h: 3 maderas", cosechar(arbol, "madera", "chop") === 3);
  plantar(arbol, CD.tree, 120);
  ok("pasado 2 h: 4 maderas — lleno", cosechar(arbol, "madera", "chop") === 4);
  plantar(arbol, CD.tree, 12 * 60);
  ok("pasado 12 h: sigue dando 4 (el tope evita el AFK infinito)", cosechar(arbol, "madera", "chop") === 4);
  plantar(arbol, CD.tree, 29);
  ok("pasado 29 min (reloj extra sin vencer): todavía 1", cosechar(arbol, "madera", "chop") === 1);
}

console.log("\nLA XP Y EL HACHA VAN POR ACCIÓN, NO POR CARGA");
{
  plantar(arbol, CD.tree, 0);
  let xp0 = G.skills.tala || 0, ax0 = G.tools.axe;
  cosechar(arbol, "madera", "chop");
  const xpJusto = (G.skills.tala || 0) - xp0, axJusto = ax0 - G.tools.axe;
  plantar(arbol, CD.tree, 120);
  xp0 = G.skills.tala || 0; ax0 = G.tools.axe;
  cosechar(arbol, "madera", "chop");
  ok("talar un árbol LLENO da la misma XP que uno recién crecido", (G.skills.tala || 0) - xp0 === xpJusto,
    ((G.skills.tala || 0) - xp0) + " vs " + xpJusto);
  ok("y gasta el mismo hacha (1 uso)", ax0 - G.tools.axe === axJusto && axJusto === 1);
}

console.log("\nLA ROCA VA A SU RELOJ: +1 CADA 40 MIN, LLENA A LAS 2 H 40");
{
  plantar(roca, CD.rock, 0);
  ok("recién crecida: 1 piedra", cosechar(roca, "piedra", "mine") === 1);
  plantar(roca, CD.rock, 40);
  ok("pasada 40 min: 2 piedras", cosechar(roca, "piedra", "mine") === 2);
  plantar(roca, CD.rock, 30);
  ok("pasada 30 min (menos que SU reloj): todavía 1", cosechar(roca, "piedra", "mine") === 1);
  plantar(roca, CD.rock, 160);
  ok("pasada 2 h 40: 4 — llena", cosechar(roca, "piedra", "mine") === 4);
}

console.log("\nLA VETA DE PIEDRA VA CON LAS ROCAS; LAS DE MINERAL NO ACUMULAN");
{
  plantar(vetaPiedra, CD.rock, 160);
  ok("veta de piedra pasada 2 h 40: 4", cosechar(vetaPiedra, "piedra", "mine") === 4);
  const OD = vm.runInContext("ORE_DEF", ctx);
  plantar(vetaBronce, OD.bronce.cd, 24 * 60);
  ok("veta de bronce pasada 24 h: da lo suyo de siempre (yield fijo, sin cargas)",
    cosechar(vetaBronce, "bronce", "mine") === 1, "+" + (G.res.bronce || 0));
}

console.log("\nY LAS CARGAS SOBREVIVEN AL F5 (viven en readyAt, que ya viaja al guardado)");
{
  plantar(arbol, CD.tree, 120);
  const foto = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(foto);   // el F5: mismo reloj, misma verdad
  ok("tras recargar, el árbol lleno sigue dando 4", ctx.nodoCargas(arbol, CD.tree) === 4);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el árbol le guarda la madera al que no pudo venir.\n");
process.exit(fallos ? 1 : 0);
