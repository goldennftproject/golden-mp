/* LAS CARGAS DE LOS NODOS: EL ÁRBOL PASADO NO SE DESPERDICIA (21/8, dirección)
   "Para los que no pueden hacer guardia: si el árbol se pasa crecido 30 minutos más, guarda
    2 maderas. Si se pasa 2 horas, guarda 4." Y la segunda vuelta, del mismo día: "cortar cuatro
   cargas de un hachazo está mal — tiene que VERSE que das cuatro hachazos, y consumirte cuatro
   hachas".

   Y el RITMO FINAL (22/8, dictado clic a clic por dirección): los CORTES SUAVES pagan una carga
   cada uno (+1 madera, −1 hacha); el CORTE PROFUNDO no da ni consume nada; el TOCÓN paga la
   última. Árbol de 4: suave(+1) · suave(+1) · suave(+1) · profundo(nada) · tocón(+1) — 5 clics,
   4 maderas, 4 hachas. El de 1 carga, el clásico: suave · profundo · tocón(+1). Vetas de
   mineral NO acumulan.

   Se prueba con la ESCENA REAL y el reloj trucado: se golpea de verdad, golpe a golpe, y se mira
   en cuál cae cada madera, cuántas hachas se gastan y cuándo cae el tocón.
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
/* UN golpe: devuelve la madera/piedra que soltó ese golpe en concreto */
function golpe(o, res, kind) {
  const antes = G.res[res] || 0;
  esc.action = { kind, o }; esc.finishAction();
  return (G.res[res] || 0) - antes;
}
/* golpea hasta que el nodo caiga (o 30 golpes): devuelve el patrón golpe-a-golpe y el total */
function vaciar(o, res, kind) {
  const patron = [];
  for (let g = 0; g < 30 && (o.readyAt || 0) <= ctx.Date.now(); g++) patron.push(golpe(o, res, kind));
  return { patron: patron.join(""), total: patron.reduce((a, b) => a + b, 0), golpes: patron.length };
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

/* ¿el nodo se puede talar/picar YA (reloj vencido)? */
const talable = (o) => (o.readyAt || 0) <= ctx.Date.now();

console.log("\nEL NODO VIRGEN NACE LLENO — EL REGALITO DE BIENVENIDA (22/8)");
{
  /* nunca talados: sin reloj (readyAt 0). Un árbol parado desde siempre tiene su madera adentro */
  ok("(escenario) el árbol y la roca arrancan vírgenes", !arbol.readyAt && !roca.readyAt);
  let r = vaciar(arbol, "madera", "chop");
  ok("el PRIMER árbol de la partida: suave·suave·suave·profundo·tocón — 4 maderas",
    r.total === 4 && r.patron === "11101", r.patron);
  ok("y el virgen se consume: al caer, el árbol entra al ciclo normal para siempre",
    arbol.readyAt > ctx.Date.now());
  r = vaciar(roca, "piedra", "mine");
  ok("la roca virgen igual: 4 piedras en 5 clics", r.total === 4 && r.patron === "11101", r.patron);
  r = vaciar(vetaBronce, "bronce", "mine");
  ok("la veta de MINERAL virgen NO: una picada de 2 y a dormir (siguen apartadas)",
    r.patron === "002" && !talable(vetaBronce), r.patron);
  vetaBronce.readyAt = 0; vetaBronce.cdIni = 0;   // se re-virginiza solo para no ensuciar la sección de vetas de abajo
}

console.log("\nEL RITMO FINAL: ÁRBOL LLENO = 5 CLICS, 4 MADERAS, 4 HACHAS (el profundo es mudo)");
{
  plantar(arbol, CD.tree, 0);
  let r = vaciar(arbol, "madera", "chop");
  ok("con 1 carga, el ciclo es el de siempre: corte → corte → tocón(+1)", r.patron === "001" && !talable(arbol), r.patron);
  plantar(arbol, CD.tree, 120);   // lleno: 4 cargas
  const ax0 = G.tools.axe;
  r = vaciar(arbol, "madera", "chop");
  ok("con 4 cargas: los suaves pagan, el profundo calla, el tocón cierra",
    r.patron === "11101", "clics: " + r.patron + " (suave+1 · suave+1 · suave+1 · profundo nada · tocón+1)");
  ok("5 clics, 4 maderas", r.golpes === 5 && r.total === 4, r.golpes + " clics, " + r.total + " maderas");
  ok("y 4 hachas (1 por madera, nada gratis)", ax0 - G.tools.axe === 4, ax0 - G.tools.axe + " hachas");
  ok("al caer el tocón arranca su reloj", !talable(arbol));
}

console.log("\nEL TOPE Y EL RELOJ PROPIO");
{
  plantar(arbol, CD.tree, 12 * 60);   // 12 h pasado: el tope corta en 4
  let r = vaciar(arbol, "madera", "chop");
  ok("pasado 12 h: guarda 4 y ni una más (el tope evita el AFK infinito)", r.total === 4 && r.patron === "11101", r.patron);
  plantar(arbol, CD.tree, 30);
  r = vaciar(arbol, "madera", "chop");
  ok("pasado 30 min (un reloj extra): suave+1 · profundo mudo · tocón+1",
    r.total === 2 && r.patron === "101", r.patron);
  plantar(arbol, CD.tree, 29);
  r = vaciar(arbol, "madera", "chop");
  ok("pasado 29 min (reloj extra sin vencer): el ciclo clásico de 1", r.patron === "001", r.patron);
}

console.log("\nLA XP MIDE GESTOS: CADA MADERA PAGA SU XP DE TALADO");
{
  plantar(arbol, CD.tree, 0);
  let xp0 = G.skills.tala || 0;
  vaciar(arbol, "madera", "chop");
  const xpJusto = (G.skills.tala || 0) - xp0;
  plantar(arbol, CD.tree, 120);
  xp0 = G.skills.tala || 0;
  vaciar(arbol, "madera", "chop");
  ok("vaciar un árbol lleno (4 maderas) paga 4 veces la XP de un talado", (G.skills.tala || 0) - xp0 === 4 * xpJusto,
    ((G.skills.tala || 0) - xp0) + " vs 4×" + xpJusto);
}

console.log("\nLA ROCA VA A SU RELOJ DE 40 MIN — Y CADA PIEDRA CUESTA UN PICO");
{
  plantar(roca, CD.rock, 0);
  let r = vaciar(roca, "piedra", "mine");
  ok("recién crecida: ciclo clásico y a dormir", r.patron === "001" && !talable(roca), r.patron);
  plantar(roca, CD.rock, 40);
  r = vaciar(roca, "piedra", "mine");
  ok("pasada 40 min: 2 piedras (paga · mudo · rompe)", r.total === 2 && r.patron === "101", r.patron);
  plantar(roca, CD.rock, 30);
  r = vaciar(roca, "piedra", "mine");
  ok("pasada 30 min (menos que SU reloj): 1 sola", r.patron === "001", r.patron);
  plantar(roca, CD.rock, 160);
  const pk0 = G.picks.dur.wood;
  r = vaciar(roca, "piedra", "mine");
  ok("pasada 2 h 40: llena — 4 piedras en 5 clics", r.total === 4 && r.patron === "11101", r.patron);
  ok("que costaron 4 picos", pk0 - G.picks.dur.wood === 4, pk0 - G.picks.dur.wood + " picos");
}

console.log("\nLA VETA DE PIEDRA VA CON LAS ROCAS; LAS DE MINERAL QUEDAN APARTADAS (dirección, 21/8)");
{
  plantar(vetaPiedra, CD.rock, 160);
  let r = vaciar(vetaPiedra, "piedra", "mine");
  ok("veta de piedra pasada 2 h 40: 4 piedras en 5 clics", r.total === 4 && r.patron === "11101", r.patron);
  const OD = vm.runInContext("ORE_DEF", ctx);
  plantar(vetaBronce, OD.bronce.cd, 0);
  r = vaciar(vetaBronce, "bronce", "mine");
  ok("bronce recién crecido: ciclo clásico con SU rendimiento de 2 (el ancla del 18/8)",
    r.patron === "002" && !talable(vetaBronce), r.patron);
  plantar(vetaBronce, OD.bronce.cd, 5 * 24 * 60);   // 5 días pasada: da igual — NO acumula
  const pk0 = G.picks.dur.wood;
  r = vaciar(vetaBronce, "bronce", "mine");
  ok("pasada 5 DÍAS: sigue dando una sola picada de 2 y a dormir (sin cargas, por decisión)",
    r.patron === "002" && !talable(vetaBronce), r.patron);
  ok("y costó 1 pico", pk0 - G.picks.dur.wood === 1, pk0 - G.picks.dur.wood + " pico");
}

console.log("\nY LAS CARGAS SOBREVIVEN AL F5 (viven en readyAt, que ya viaja al guardado)");
{
  plantar(arbol, CD.tree, 120);
  golpe(arbol, "madera", "chop");   // clic 1: +1, quedan 3
  const foto = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(foto);   // el F5 a mitad de vaciado: ni regala ni se come cargas
  ok("tras recargar, al árbol a medio vaciar le quedan 3 exactas", ctx.nodoCargas(arbol, CD.tree) === 3,
    ctx.nodoCargas(arbol, CD.tree) + "");
  const r = vaciar(arbol, "madera", "chop");
  ok("y se cobran las 3, ni una más (suave·suave·profundo·tocón)", r.total === 3 && r.patron === "1101", r.patron + " → " + r.total + " maderas");
}

console.log("\nEL BUG DEL ÁRBOL INFINITO (22/8, dirección en vivo): EL F5 NO RELLENA EL NODO");
{
  /* El ciclo COMPLETO del jugador real, con la escena recreada de por medio — que era el agujero:
     syncNodos descartaba los relojes del pasado (el almacén de las cargas), así que recargar
     devolvía el nodo VIRGEN — lleno otra vez. Madera infinita a fuerza de F5. */
  plantar(arbol, CD.tree, 120);          // lleno: 4 cargas
  golpe(arbol, "madera", "chop");        // clic 1: +1, quedan 3
  esc.syncNodos();                       // el autosave de verdad pasa por acá
  const foto = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(foto);
  /* la escena se RECREA (F5 o viaje de zona): los nodos renacen leyendo G.nodos */
  const esc2 = new ctx.FarmScene();
  esc2.add = esc.add; esc2.textures = esc.textures; esc2.cameras = esc.cameras; esc2.scale = esc.scale;
  esc2.tweens = esc.tweens; esc2.input = esc.input; esc2.events = esc.events; esc2.time = esc.time;
  esc2.anims = esc.anims; esc2.sound = esc.sound; esc2.physics = esc.physics; esc2.game = esc.game;
  esc2.create();
  const arbol2 = esc2.objs.find(o => o.i === arbol.i);
  ok("tras recrear la escena, el árbol drenado NO renace virgen", (arbol2.readyAt || 0) > 0, "readyAt " + arbol2.readyAt);
  ok("le quedan las 3 cargas exactas, no 4", ctx.nodoCargas(arbol2, CD.tree) === 3, ctx.nodoCargas(arbol2, CD.tree) + "");
  let total = 0;
  for (let g = 0; g < 30 && (arbol2.readyAt || 0) <= ctx.Date.now(); g++) {
    const antes = G.res.madera || 0; esc2.action = { kind: "chop", o: arbol2 }; esc2.finishAction();
    total += (G.res.madera || 0) - antes;
  }
  ok("se cobran las 3 y el árbol CAE (nada de madera infinita)", total === 3 && (arbol2.readyAt || 0) > ctx.Date.now(),
    total + " maderas · readyAt " + (((arbol2.readyAt || 0) > ctx.Date.now()) ? "en el futuro" : "SIGUE VENCIDO"));
  /* y el nodo CRECIDO sin drenar tampoco pierde su acumulado al recargar */
  plantar(roca, CD.rock, 80);            // 2 relojes extra: 3 cargas
  esc.syncNodos();
  ok("(bonus) el acumulado sin drenar también viaja al guardado ahora",
    !!(G.nodos && Object.keys(G.nodos).some(k => /rock/.test(k))), Object.keys(G.nodos || {}).join(" · ").slice(0, 60));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el árbol le guarda la madera al que no pudo venir.\n");
process.exit(fallos ? 1 : 0);
