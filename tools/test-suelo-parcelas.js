/* EL SUELO DE UNA PARCELA DICE LA VERDAD (18/8)
   Reporte: un cuadrado de tierra clara asomando detrás de una parcela. Era la textura del parche
   silvestre de una parcela BLOQUEADA, que no se debería ver.
   Causa: dos cambios de días distintos que se contradecían — el 13/8 le ponía esa textura "a todo
   color" y el 16/8 le puso setVisible(false) delante. Quedaron los dos.
   Esto comprueba que ya no queda ninguna asignación que le ponga textura de bloqueada a un suelo.
     node tools/test-suelo-parcelas.js                                                            */
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync("public/game/farm.js", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* 20/8 — Y AHORA SE EJECUTA, no solo se lee.
   Este test era cinco expresiones regulares sobre farm.js: comprobaban que existiera una función y
   que nadie escribiera cierta línea. Servía para vigilar la ESTRUCTURA —que haya una sola verdad
   sobre el suelo— pero no contestaba la pregunta del reporte: ¿se sigue viendo el cuadrado de
   tierra detrás de una parcela que no es tuya?
   Ahora se arranca la escena y se mira el suelo de cada parcela: las tuyas con su suelo a la vista,
   las que todavía no lo son con el suelo apagado. Las comprobaciones de estructura se quedan
   debajo, porque siguen valiendo para lo suyo. */
function enc(n) {
  const o = { __t: n, width: 42, height: 42, displayWidth: 42, visible: true, texture: { key: n || "t" },
    frame: { width: 42, height: 42 }, x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0,
    originX: .5, originY: 1, active: true, scrollX: 0, scrollY: 0, zoom: 1 };
  const p = new Proxy(o, { get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (typeof k === "string" && k[0] === "_") return undefined;
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {} });
      if (k === "getSourceImage") return () => ({ width: 42, height: 42 });
      if (k === "setVisible") return v => { o.visible = v; return p; };
      if (k === "setTexture") return kk => { o.texture = { key: kk }; return p; };
      return () => p;
    }, set(t, k, v) { t[k] = v; return true; } });
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
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { ctx[f] = () => {}; });
const G = ctx.G, GF = ctx.GF;
G.expansiones = 0; G.level = 1; G.built = {}; G.obras = {}; G.layout = {};
G.decos = []; G.chests = []; G.planos = {}; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
GF.aplicarTerreno(0); GF.ocupCambio();
const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k) });
esc.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"), addCanvas() {}, remove() {} };
esc.cameras = { main: enc("cam") }; esc.scale = { width: 1280, height: 720, on() {}, off() {} };
esc.tweens = { add: () => enc("tw"), addCounter: () => enc("tw") };
esc.input = { on() {}, off() {}, keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
  mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {}, activePointer: { worldX: 0, worldY: 0, x: 0, y: 0 } };
esc.events = { once() {}, on() {}, off() {} };
esc.time = { addEvent: () => enc("ev"), delayedCall: () => enc("ev") };
esc.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
esc.sound = { add: () => enc("s") }; esc.physics = { add: { existing() {} } }; esc.game = { canvas: enc("cv") };
try { esc.create(); } catch (e) { console.log("  (create: " + e.message + ")"); }

console.log("\nEL SUELO, MIRÁNDOLO");
{
  const tuyas = (esc.plots || []).filter(p => p.state !== "locked");
  const ajenas = (esc.plots || []).filter(p => p.state === "locked");
  ok("hay parcelas tuyas y parcelas que todavía no", tuyas.length > 0 && ajenas.length > 0,
    tuyas.length + " tuyas · " + ajenas.length + " por llegar");
  const sueloDe = (p) => (esc.plotGrounds || [])[p.i != null ? p.i : (esc.plots || []).indexOf(p)];
  const malTuyas = tuyas.filter(p => { const g = sueloDe(p); return g && g.visible === false; });
  ok("el suelo de las tuyas se ve", !malTuyas.length, malTuyas.length + " apagados");
  const malAjenas = ajenas.filter(p => { const g = sueloDe(p); return g && g.visible !== false; });
  ok("y el de las que no son tuyas, NO", !malAjenas.length,
    malAjenas.length ? malAjenas.length + " suelos asomando (el cuadrado de tierra del reporte)" : "sin cuadrados de tierra sueltos");
}

console.log("\nY LA ESTRUCTURA QUE LO GARANTIZA");
ok("nadie le pone la textura de parcela bloqueada a un suelo",
  !/setTexture\(\s*["']plot_blocked["']/.test(src),
  /setTexture\(\s*["']plot_blocked["']/.test(src) ? "todavía aparece" : "");
ok("existe una sola función que decide cómo se ve el suelo",
  (src.match(/pintarSueloParcela\s*\(pl, bloqueada\)/g) || []).length === 1);
const usos = (src.match(/this\.pintarSueloParcela\(/g) || []).length;
ok("y la usan todos los sitios que tocaban el suelo", usos >= 3, usos + " llamadas");
// el único setVisible sobre un suelo tiene que estar DENTRO de pintarSueloParcela: si aparece
// suelto en otro sitio, volvimos a tener dos verdades sobre lo mismo
const sueltos = (src.match(/\.ground\.setVisible\(/g) || []).length;
const dentro = /pintarSueloParcela\(pl, bloqueada\) \{[\s\S]{0,400}?\.ground\.setVisible\(/.test(src);
ok("solo la función decide si el suelo se ve", sueltos === 1 && dentro,
  sueltos + " asignaciones de visibilidad" + (dentro ? ", dentro de la función" : ", FUERA de la función"));
ok("la escena repinta los suelos al terminar de armarse",
  /refreshPlotLocks\(\);\s*\}\s*catch/.test(src) || /try \{ this\.refreshPlotLocks\(\)/.test(src));
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
