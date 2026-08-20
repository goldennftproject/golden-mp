/* TODA CELDA SOMBREADA TIENE QUE TENER ALGO VISIBLE ENCIMA (20/8, dirección — tercera vez)
   "Esas celdas oscuras no tienen que estar. Las únicas celdas ocupadas tienen que ser las que
    tienen sprites cuando uno inicia la granja: el granero, los árboles, la roca, los minerales y
    las tres parcelas. Es como que ahí hay mapeado algo más de antes. Te lo pido cada vez y no lo
    estás arreglando."
   Tiene razón en las tres cosas, incluida la última. Mis dos intentos anteriores atacaron causas
   que ERAN reales —las posiciones fantasma del guardado, la caja cuadrada de la laguna— pero
   ninguno respondía a la pregunta de verdad, que es una sola y muy concreta:

     ¿QUÉ CELDA ESTÁ MARCADA COMO OCUPADA SIN QUE SE VEA NADA ENCIMA?

   Y no la respondí porque no la medí: iba mirando el código a ojo y arreglando lo que me parecía.
   Este test la mide. Arranca la escena ENTERA con una escena de mentira —los mismos objetos que
   crea el juego al empezar, con su visibilidad real— y después recorre celda por celda comparando
   las dos listas. Lo que sobre, sale con nombre y coordenada.
     node tools/test-celdas-vs-sprites.js                                                         */
const fs = require("fs"), vm = require("vm");

/* ---- escena de mentira: acepta todo y recuerda lo que le hacen a cada objeto ---- */
function enc(n, reg) {
  const o = { __t: n, width: 42, height: 42, displayWidth: 42, visible: true, texture: { key: n || "t" },
    frame: { width: 42, height: 42 }, x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0,
    originX: .5, originY: 1, active: true, scrollX: 0, scrollY: 0, zoom: 1, tilePositionX: 0, tilePositionY: 0 };
  const p = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (typeof k === "string" && k[0] === "_") return undefined;
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {} });
      if (k === "getSourceImage") return () => ({ width: 42, height: 42 });
      if (k === "setVisible") return v => { o.visible = v; return p; };
      if (k === "setAlpha") return v => { o.alpha = v; return p; };
      if (k === "setPosition") return (x, y) => { o.x = x; o.y = y; return p; };
      if (k === "setTexture") return kk => { o.texture = { key: kk }; return p; };
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
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { ctx[f] = () => {}; });
const GF = ctx.GF, G = ctx.G, T = GF.TILE;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* ---- la granja tal como la encuentra alguien que acaba de empezar ---- */
G.expansiones = 0; G.level = 1; G.built = { store: false }; G.obras = {}; G.layout = {};
G.decos = []; G.chests = []; G.planos = {}; G.plotsOwned = 3;
G.treesOpen = [0]; G.rocksOpen = [0]; G.skills = { mining: 0 };
GF.aplicarTerreno(0); GF.ocupCambio();

/* ---- se arranca la escena de verdad y se anota qué objeto queda VISIBLE ---- */
const esc = new ctx.FarmScene();
const creados = [];
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k, creados) });
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

console.log("\nLA ESCENA ARRANCA Y CREA SUS OBJETOS");
ok("create() llegó hasta el final", arranco);
ok("y la escena guardó su lista de objetos del mundo", Array.isArray(esc.objs) && esc.objs.length > 0,
  (esc.objs || []).length + " objetos");

console.log("\nQUÉ SE VE DE VERDAD EN UNA GRANJA RECIÉN EMPEZADA");
{
  const vistos = {};
  (esc.objs || []).forEach(o => {
    const seVe = !o.oculto && (!o.sprite || o.sprite.visible !== false);
    if (seVe) vistos[o.type] = (vistos[o.type] || 0) + 1;
  });
  console.log("      " + Object.keys(vistos).sort().map(k => k + "×" + vistos[k]).join(" · "));
}

/* Lo que se compara es SOLO el terreno que el jugador tiene y ve sombreado: el bucle del
   sombreado (dibujarOcupadas) recorre GF.terreno() y salta la banda de la cerca. Comparar fuera de
   ahí trae los nodos de las 16 expansiones futuras y no dice nada. */
const ter = GF.terreno();
const enVista = k => {
  const [c, r] = k.split(",").map(Number);
  return c >= ter.c0 && c < ter.c1 && r >= ter.r0 && r < ter.r1 && GF.tuyo(c, r) && !GF.enCerca(c, r);
};

console.log("\nY AHORA LA PREGUNTA: ¿QUÉ CELDA ESTÁ OCUPADA SIN NADA ENCIMA?");
{
  /* Se arma el índice de lo que la escena dibuja: para cada objeto visible, las celdas que cubre.
     Es la misma cuenta que hace el mapa de ocupación (ancho en celdas, fila de la base), pero
     partiendo de los objetos que SOBREVIVIERON al create — que es lo que el jugador ve. */
  const cubiertas = new Set();
  (esc.objs || []).forEach(o => {
    const seVe = !o.oculto && (!o.sprite || o.sprite.visible !== false);
    if (!seVe) return;
    /* Los montículos del día NO reservan celda a propósito: se cavan, desaparecen y no tienen que
       estorbar para construir. Se ven y no ocupan, y está bien que sea así. */
    if (o.type === "excav") return;
    /* El objeto de la escena no lleva `wCells` (eso vive en WORLD_OBJECTS): se deduce del ancho
       dibujado, igual que hace el arrastre en modo edición. Con el fallback a 1 el Mercado cubría
       una sola de sus dos celdas y el test se inventaba una celda huérfana. */
    const an = Math.max(1, Math.round((o.w || T) / T));
    const lc = Math.round((o.cx - an * T / 2) / T), br = Math.round(o.by / T);
    for (let k = 0; k < an; k++) cubiertas.add((lc + k) + "," + (br - 1));
  });
  /* Las parcelas y la laguna no están en esa lista (no son "objetos del mundo") y se ven igual. */
  for (let i = 0; i < GF.parcelasTuyas(); i++) { const p = GF.PLOTS[i]; if (p) cubiertas.add(p.col + "," + p.row); }

  const mapa = GF.ocupacion();
  const huerfanas = [];
  mapa.forEach((v, k) => {
    if (v.tipo === "laguna" || v.tipo === "parcela") return;   // agua y tierra arada: se ven solas
    if (!enVista(k)) return;                                   // fuera del sombreado: no se ve ni se toca
    if (!cubiertas.has(k)) huerfanas.push(k + " → " + v.tipo + (v.i != null ? " #" + v.i : ""));
  });
  ok("ninguna celda ocupada está vacía a la vista", !huerfanas.length,
    huerfanas.join(" · ") || mapa.size + " celdas, todas con su dibujo");

  /* Y al revés, que también rompe: algo que se ve y no reserva su celda deja poner un edificio
     encima. */
  const invisibles = [...cubiertas].filter(k => !mapa.has(k) && enVista(k));
  ok("y nada visible se queda sin reservar su celda", !invisibles.length,
    invisibles.join(" · ") || "las dos listas coinciden");
}

console.log("\nLAS DOS REGLAS DE LAS ROCAS TIENEN QUE DECIR LO MISMO");
{
  /* Acá había DOS funciones opinando sobre si una roca existe, que es el patrón que nos viene
     rompiendo cosas toda la semana:
       · el DIBUJO usaba nodoBloqueado({type:"rock", lockIdx})
       · el MAPA DE OCUPACIÓN usa objetoPresente(), que mira G.rocksOpen
     Si discrepan en un solo índice, esa roca es una celda oscura sin piedra encima. */
  const mal = [];
  let lockIdx = -1;
  GF.WORLD_OBJECTS.forEach((o, i) => {
    if (o.type !== "rock") return;
    /* El número de orden lo lleva config.js SOLO para las rocas que no vienen de una expansión
       (las de expansión tienen su propio freno). Contarlas todas me dio un desfase y un "fallo"
       que no existía: el contador del test tiene que ser el mismo que el del juego. */
    if (o.exp != null) return;
    lockIdx++;
    const dibujo = !(typeof ctx.nodoBloqueado === "function" && ctx.nodoBloqueado({ type: "rock", lockIdx }));
    const mapa = GF.objetoPresente(GF.COLLISIONS[i] || { tipo: o.type, i });
    if (dibujo !== mapa) mal.push("roca #" + lockIdx + ": dibujo=" + dibujo + " mapa=" + mapa);
  });
  ok("dibujo y mapa coinciden en todas las rocas", !mal.length, mal.join(" · ") || "una sola verdad");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ lo que ocupa una celda se ve, y lo que se ve ocupa su celda\n");
process.exit(fallos ? 1 : 0);
