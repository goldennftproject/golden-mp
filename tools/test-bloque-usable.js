/* TODO LO QUE TRAE UN BLOQUE SE PUEDE USAR EL MISMO DÍA (20/8, dirección)
   "Cuando yo expando un bloque del bosque, tengo que poder interactuar con TODO lo que me da ese
    bloque. Expandí en el nivel 3 y la piedra me dice que necesito granja nivel 1 — soy nivel 3."
   El fallo concreto ya está arreglado (la roca de expansión se medía con la escalera de rocas, a la
   que no pertenece). Pero la regla que dio dirección es más ancha que la roca, así que se prueba
   ancha: se compran las dieciséis expansiones, y después de cada compra se comprueba que el árbol,
   la roca y la parcela de ESE bloque se puedan usar ya — con la escena arrancada de verdad, que es
   la que decide qué está oculto y qué está bloqueado.

   La regla, dicha una vez: lo que viene dentro del terreno que pagaste no tiene más peaje.
     node tools/test-bloque-usable.js                                                             */
const fs = require("fs"), vm = require("vm");
function enc(n) {
  const o = { __t: n, width: 42, height: 42, displayWidth: 42, visible: true, texture: { key: n || "t" },
    frame: { width: 42, height: 42 }, x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0,
    originX: .5, originY: 1, active: true, scrollX: 0, scrollY: 0, zoom: 1, tilePositionX: 0, tilePositionY: 0 };
  const p = new Proxy(o, { get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (typeof k === "string" && k[0] === "_") return undefined;
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {} });
      if (k === "getSourceImage") return () => ({ width: 42, height: 42 });
      if (k === "setVisible") return v => { o.visible = v; return p; };
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
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo",
 "closeOv", "refreshDeco"].forEach(f => { ctx[f] = () => {}; });
const GF = ctx.GF, G = ctx.G, T = GF.TILE;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* Un jugador con herramientas y semillas: lo único que debe frenarlo es el nivel del nodo. */
function equipar() {
  G.kitReclamado = true; G.tools = { axe: 50, rod: 50 };
  G.picks = { owned: { stone: true }, dur: { stone: 50 }, eq: "stone" };
  G.res = { madera: 99999, piedra: 99999, bronce: 9999, hierro: 9999, oro: 9999, diamante: 9999, netherita: 9999, lombriz: 9 };
  G.seeds = { papa: 99 }; G.selSeed = "papa"; G.plata = 9999999;
  /* La bolsa, con sitio de sobra. Ojo: la primera versión de esto llenaba la mochila con ocho
     recursos a 99.999 para poder pagar las expansiones, y después puedeAccion decía que no —
     ¡por bolsa llena! Correcto por parte del juego, y un fallo inventado por parte del test:
     medía la mochila cuando quería medir el nivel del nodo. */
  G.invRows = (typeof ctx.INV_MAX_ROWS === "number") ? ctx.INV_MAX_ROWS : 12;
  G.slots = []; G.fish = {};
}
/* Y para las comprobaciones de « ¿puedo?» se vacía lo que no hace falta: pagar la expansión y
   tener sitio para lo que saques son dos cosas distintas y no pueden estorbarse. */
function bolsaLibre() { G.res = { lombriz: 9 }; }

console.log("\nEL CASO EXACTO DE DIRECCIÓN: NIVEL 3, PRIMERA EXPANSIÓN");
{
  G.level = 3; G.expansiones = 0; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
  G.built = {}; G.obras = {}; G.layout = {}; G.layoutPlots = {}; G.decos = []; G.chests = []; G.planos = {};
  G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = { tree: 0, rock: 0, plot: 0 };
  G.skills = { farming: 0, mining: 0 };
  equipar();
  GF.aplicarTerreno(0); GF.ocupCambio();
  ok("la expansión 1 se compra al nivel 3", ctx.expansionComprar() === true);
  GF.aplicarTerreno(1); GF.ocupCambio();

  const roca = GF.WORLD_OBJECTS.find(o => o.type === "rock" && o.exp === 0);
  const arbol = GF.WORLD_OBJECTS.find(o => o.type === "tree" && o.exp === 0);
  ok("el bloque trae su roca y su árbol", !!roca && !!arbol);

  /* La roca, que es lo que reportó. Se pregunta por las DOS vías: la que decide el clic y la que
     escribe el rótulo del cursor. */
  ok("la roca del bloque NO está bloqueada por nivel",
    !ctx.nodoBloqueado({ type: "rock", exp: 0, lockIdx: undefined }), "el peaje fue el terreno");
  bolsaLibre();
  const pM = ctx.puedeAccion("mine", { type: "rock", exp: 0, readyAt: 0 });
  ok("y se puede picar", pM.ok, pM.toast || "sin excusas");

  /* El árbol. */
  ok("el árbol del bloque tampoco está bloqueado",
    !ctx.arbolBloqueado({ type: "tree", exp: 0, locked: false }));
  const pC = ctx.puedeAccion("chop", { type: "tree", exp: 0, readyAt: 0 });
  ok("y se puede talar", pC.ok, pC.toast || "");

  /* Y la parcela: tiene que ser tuya y plantable. */
  ok("la parcela del bloque es tuya", G.plotsOwned === 4, "3 → " + G.plotsOwned);
  const pP = ctx.puedeAccion("plant", { seed: "papa" });
  ok("y se puede plantar en ella", pP.ok, pP.toast || "");
}

console.log("\nY LA MISMA REGLA EN LAS DIECISÉIS, CON LA ESCENA ARRANCADA");
{
  /* Se compran todas y se arranca la escena: `oculto` y `locked` los pone create(), así que sin
     escena esta comprobación no valdría nada. */
  G.level = 60; G.expansiones = 16; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
  G.built = {}; G.obras = {}; G.layout = {}; G.layoutPlots = {}; G.decos = []; G.chests = []; G.planos = {};
  G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = { tree: 0, rock: 0, plot: 0 };
  G.skills = { farming: 0, mining: 0 };
  equipar();
  GF.aplicarTerreno(16); GF.ocupCambio();

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
  let arranco = true;
  try { esc.create(); } catch (e) { arranco = false; console.log("      (create: " + e.message + ")"); }
  ok("la escena arranca con las 16 compradas", arranco);

  const ocultos = [], bloqueados = [], sinRotulo = [];
  (esc.objs || []).forEach(o => {
    if (o.exp == null) return;                       // solo los que vinieron con un bloque
    const seVe = !o.oculto && (!o.sprite || o.sprite.visible !== false);
    if (!seVe) { ocultos.push("bloque " + (o.exp + 1) + ": " + o.type); return; }
    if (o.type === "rock" && ctx.nodoBloqueado(o)) bloqueados.push("bloque " + (o.exp + 1) + ": roca");
    if (o.type === "tree" && ctx.arbolBloqueado(o)) bloqueados.push("bloque " + (o.exp + 1) + ": árbol");
    /* Y el rótulo del cursor: si dijera « se habilita a granja nivel N », el jugador leería una
       condición que ya cumplió. Es el texto que vio dirección. */
    const txt = esc.promptText(o) || "";
    if (/se habilita a granja nivel/.test(txt)) sinRotulo.push("bloque " + (o.exp + 1) + ": " + o.type + " → « " + txt + " »");
  });
  ok("los 32 nodos de las 16 expansiones se ven", !ocultos.length, ocultos.slice(0, 4).join(" · ") || "árbol y roca por bloque");
  ok("ninguno está bloqueado por nivel", !bloqueados.length, bloqueados.slice(0, 4).join(" · ") || "el peaje fue el terreno");
  ok("y ninguno anuncia un nivel que ya tenés", !sinRotulo.length, sinRotulo.slice(0, 3).join(" · ") || "ningún rótulo con candado");

  /* Y la escalera propia sigue funcionando: no se abrió la puerta de par en par. */
  const escalera = GF.WORLD_OBJECTS.filter(o => o.type === "rock" && o.exp == null);
  const abiertas = escalera.filter((o, i) => !ctx.nodoBloqueado({ type: "rock", exp: null, lockIdx: i }));
  ok("pero las rocas de la escalera siguen con su regla", abiertas.length < escalera.length,
    abiertas.length + " abiertas de " + escalera.length + " (rocksOpen = [0])");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ lo que viene dentro del terreno que pagaste no tiene más peaje\n");
process.exit(fallos ? 1 : 0);
