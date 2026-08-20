/* EN EL TERRENO NUEVO SE PUEDE PONER LO MISMO QUE EN EL VIEJO (20/8, dirección)
   "Al momento de expandir un bloque, no se puede poner nada en las celdas nuevas de ese bloque,
    en modo edición."
   Medido antes de tocar nada: tras comprar el bloque 1, el mapa de ocupación decía que había 7
   celdas libres y el modo edición rechazaba 6. Otra vez dos reglas para la misma pregunta —
   colocar desde el Cobertizo preguntaba al mapa, y mover en edición se lo calculaba por su cuenta.
   La regla, una sola: si el mapa dice que la celda está libre, se puede poner ahí. Da igual si
   llegaste por el Cobertizo o arrastrando.
     node tools/test-mover-en-expansion.js                                                        */
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

function escena() {
  const e = new ctx.FarmScene();
  e.add = new Proxy({}, { get: (t, k) => (...a) => enc(k) });
  e.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"), addCanvas() {}, remove() {} };
  e.cameras = { main: enc("cam") }; e.scale = { width: 1280, height: 720, on() {}, off() {} };
  e.tweens = { add: () => enc("tw"), addCounter: () => enc("tw") };
  e.input = { on() {}, off() {}, keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
    mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {}, activePointer: { worldX: 0, worldY: 0, x: 0, y: 0 } };
  e.events = { once() {}, on() {}, off() {} };
  e.time = { addEvent: () => enc("ev"), delayedCall: (m, f) => { if (f) f(); return enc("ev"); } };
  e.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
  e.sound = { add: () => enc("s") }; e.physics = { add: { existing() {} } }; e.game = { canvas: enc("cv") };
  try { e.create(); } catch (err) { console.log("      (create: " + err.message + ")"); }
  ctx.FARM = e; GF.scene = "farm";
  return e;
}
function partida(exp) {
  G.level = 60; G.expansiones = 0; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
  G.built = {}; G.obras = {}; G.layout = {}; G.layoutPlots = {}; G.decos = []; G.chests = []; G.planos = {};
  G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = { tree: 0, rock: 0, plot: 0 }; G.skills = {};
  G.res = { madera: 99999, piedra: 99999, bronce: 9999, hierro: 9999, oro: 9999, diamante: 9999, netherita: 9999 };
  G.plata = 9999999;
  GF.aplicarTerreno(0); GF.ocupCambio();
  const e = escena();
  for (let i = 0; i < exp; i++) ctx.expansionComprar();
  GF.aplicarTerreno(G.expansiones); GF.ocupCambio();
  return e;
}

console.log("\nEL BLOQUE RECIÉN COMPRADO: LAS DOS VÍAS DICEN LO MISMO");
{
  const esc = partida(1);
  const b = GF.EXPANSIONES[0];
  const libres = [], discrepan = [];
  for (let r = b.r0; r < b.r1; r++) for (let c = b.c0; c < b.c1; c++) {
    if (!GF.tuyo(c, r) || GF.enCerca(c, r) || GF.celdaOcupada(c, r)) continue;
    libres.push(c + "," + r);
    /* Vía 1: colocar desde el Cobertizo. Vía 2: arrastrar en modo edición. */
    const porAdorno = esc.celdaLibreAdorno(c, r, -1);
    const porArrastre = !esc.placeBlocked({ type: "tree", w: T, cx: 0, by: 0, i: -1 }, c, r + 1, 1);
    if (!porAdorno || !porArrastre) discrepan.push(c + "," + r + (porAdorno ? "" : " (adorno)") + (porArrastre ? "" : " (arrastre)"));
  }
  ok("el bloque tiene celdas libres", libres.length > 0, libres.length + ": " + libres.join(" "));
  ok("y en TODAS deja poner, por las dos vías", !discrepan.length,
    discrepan.join(" · ") || "el mapa manda, se llegue por donde se llegue");
}

console.log("\nY LO QUE SÍ TIENE QUE SEGUIR RECHAZANDO");
{
  const esc = partida(1);
  const b = GF.EXPANSIONES[0];
  /* Encima de la roca del bloque: ocupada de verdad. */
  const roca = GF.WORLD_OBJECTS.find(o => o.type === "rock" && o.exp === 0);
  ok("encima de la roca del bloque, no", esc.placeBlocked({ type: "tree", w: T, i: -1 }, roca.leftCol, roca.baseRow, 1),
    "la celda está ocupada");
  /* En la franja de la cerca, tampoco. */
  let cerca = null;
  const ter = GF.terreno();
  for (let r = ter.r0; r < ter.r1 && !cerca; r++) for (let c = ter.c0; c < ter.c1 && !cerca; c++)
    if (GF.tuyo(c, r) && GF.enCerca(c, r)) cerca = { c, r };
  ok("en la franja de la cerca, tampoco", esc.placeBlocked({ type: "tree", w: T, i: -1 }, cerca.c, cerca.r + 1, 1));
  /* Y fuera del terreno que poseés, menos. */
  ok("y fuera de tu terreno, menos", esc.placeBlocked({ type: "tree", w: T, i: -1 }, ter.c0 - 8, ter.r0 + 2, 1));
  /* Pero un objeto NO se estorba a sí mismo al moverlo un poco. */
  const suyo = (esc.objs || []).find(o => o.type === "rock" && o.exp === 0);
  if (suyo) ok("y un objeto no se bloquea a sí mismo", !esc.placeBlocked(suyo, roca.leftCol, roca.baseRow, 1),
    "moverlo a donde ya está tiene que valer");
}

console.log("\nY AL EXPANDIR EN CALIENTE, LOS NODOS APARECEN SIN RECARGAR");
{
  /* Este lo destapó el arreglo de esta tarde. expandirEnVivo recorre this.objs buscando `o.exp`
     para destapar el árbol y la roca del bloque recién comprado — y ese campo NO se copiaba del
     objeto del mundo al de la escena. Mientras toda expansión caía al telón negro no se notaba:
     la escena se rehacía entera y los nodos salían por otra vía. En cuanto el dibujado en caliente
     empezó a ejecutarse de verdad, los nodos se quedaban invisibles hasta recargar la página. */
  const esc = partida(1);
  const suyos = (esc.objs || []).filter(o => o.exp === 0);
  ok("los objetos de la escena saben de qué bloque vienen", suyos.length >= 2,
    suyos.length + " con exp=0 (antes: 0, el campo no se copiaba)");
  const tapados = suyos.filter(o => o.oculto || (o.sprite && o.sprite.visible === false));
  ok("y el árbol y la roca se destapan al comprar", !tapados.length,
    tapados.map(o => o.type).join(" · ") || "visibles sin recargar");
}

console.log("\nY EN LAS DIECISÉIS, LA MISMA REGLA");
{
  const esc = partida(16);
  const mal = [];
  GF.EXPANSIONES.forEach((b, i) => {
    for (let r = b.r0; r < b.r1; r++) for (let c = b.c0; c < b.c1; c++) {
      if (!GF.tuyo(c, r) || GF.enCerca(c, r) || GF.celdaOcupada(c, r)) continue;
      if (esc.placeBlocked({ type: "tree", w: T, cx: 0, by: 0, i: -1 }, c, r + 1, 1))
        mal.push("bloque " + (i + 1) + " celda " + c + "," + r);
    }
  });
  ok("ninguna celda libre de los 16 bloques se rechaza", !mal.length,
    mal.slice(0, 5).join(" · ") || "el terreno comprado se usa entero");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ si el mapa dice que está libre, se puede poner — por las dos vías\n");
process.exit(fallos ? 1 : 0);
