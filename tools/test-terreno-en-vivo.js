/* EL TERRENO SE REHACE EN CALIENTE, SIN REINICIAR LA ESCENA (18/8)
   Dirección: "no se puede dejar de renderizar los árboles que toca, quitar la parte del corral
   que hay que quitar, y ya está?" — sí, y esto lo comprueba EJECUTANDO el código, no leyéndolo.
   Phaser va simulado: cada objeto devuelve un encadenable, así que si una de las cuatro piezas
   del terreno referencia algo que se quedó en create() al extraerla, esto peta.
     node tools/test-terreno-en-vivo.js                                                          */
const fs = require("fs"), vm = require("vm");

function encadenable(nombre) {
  const o = { __tipo: nombre, width: 42, height: 42, displayWidth: 42, x: 0, y: 0,
              scrollX: 0, scrollY: 0, zoom: 1, tilePositionX: 0, tilePositionY: 0, visible: true,
              texture: { key: nombre || "tex" }, frame: { width: 42, height: 42 }, scaleX: 1, scaleY: 1,
              alpha: 1, depth: 0, originX: 0.5, originY: 1, angle: 0, active: true };
  const px = new Proxy(o, { get(t, k) {
    if (k in t) return t[k];
    if (typeof k === "symbol") return undefined;
    // los campos privados del juego (_popTw, _entregando…) tienen que dar undefined si nadie los
    // puso: si devolviéramos una función, todo `if (obj._loQueSea)` daría verdadero y el código
    // entraría por ramas que en el juego real no toma.
    if (typeof k === "string" && k[0] === "_") return undefined;
    if (k === "getContext") return () => ctxCanvas();
    if (k === "getSourceImage") return () => ({ width: 42, height: 42 });
    return () => px;                       // TODO método devuelve el mismo objeto: encadena
  }, set(t, k, v) { t[k] = v; return true; } });
  return px;
}
const ctxCanvas = () => new Proxy({}, { get: () => () => {} });

const ctx = { console: { log(){}, warn(){}, error(){} }, Math, Date, JSON, Object, Array, Number,
  String, Boolean, Set, Map, isNaN, parseInt, parseFloat, performance: { now: () => 0 },
  setTimeout: () => 0, setInterval: () => 0, clearInterval(){}, requestAnimationFrame: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, addEventListener(){}, querySelectorAll: () => [], createElement: () => encadenable("el") };
ctx.Phaser = {
  Scene: class { constructor(){} },
  Math: { Clamp: (v,a,b) => Math.max(a, Math.min(b, v)), Between: (a) => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: {}, Display: { Color: {} },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/nav.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/farm.js", "utf8") + "\n;this.FarmScene = FarmScene;", ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.refreshHud = () => {}; ctx.saveFarm = () => {};
ctx.canAfford = () => true; ctx.payCost = () => {}; ctx.sfx = () => {}; ctx.celebrate = () => {};

const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => encadenable(k) });
esc.textures = { exists: () => true, get: () => encadenable("tex"), createCanvas: () => encadenable("canvas"),
                 addCanvas(){}, remove(){} };
esc.cameras = { main: encadenable("cam") };
esc.scale = { width: 1280, height: 720, on(){}, off(){} };
esc.tweens = { add: () => encadenable("tw") };
esc.input = { on(){}, keyboard: { on(){}, addKeys: () => ({}) } };
esc.events = { once(){}, on(){} };
esc.time = { addEvent: () => encadenable("ev") };
esc.anims = { exists: () => false, create(){}, generateFrameNumbers: () => [] };
esc.objs = []; esc.plots = []; esc.plotGrounds = [];

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const corre = (etq, fn) => { try { fn(); ok(etq, true); } catch (e) { ok(etq, false, e.message); } };

ctx.G.expansiones = 0;
ctx.GF.aplicarTerreno(0);
corre("dibujarCesped() corre suelto", () => esc.dibujarCesped());
corre("dibujarDecosCesped() corre suelto", () => esc.dibujarDecosCesped());
corre("dibujarGrilla() corre suelto", () => esc.dibujarGrilla());
corre("dibujarCerca() corre suelto", () => esc.dibujarCerca());

// y lo importante: que se puedan volver a llamar (sin fugas ni referencias muertas)
corre("y se pueden REHACER una segunda vez", () => {
  esc.dibujarCesped(); esc.dibujarDecosCesped(); esc.dibujarGrilla(); esc.dibujarCerca();
});
ok("el césped guarda su renderTexture para poder destruirlo", !!esc.cespedRT);
ok("las florcitas guardan el suyo", !!esc.decoG);
ok("la cerca guarda sus sprites", Array.isArray(esc.fenceSprites) && esc.fenceSprites.length > 0,
   (esc.fenceSprites||[]).length + " palos");

// la cerca tiene que CAMBIAR de forma al comprar terreno
const palos0 = esc.fenceSprites.length;
ctx.G.expansiones = 1; ctx.GF.aplicarTerreno(1);
corre("dibujarCerca() con el terreno nuevo", () => esc.dibujarCerca());
ok("la cerca abraza la forma nueva (cambia el nº de palos)", esc.fenceSprites.length !== palos0,
   palos0 + " → " + esc.fenceSprites.length);

// y el camino completo, que es lo que corre al comprar
ctx.G.expansiones = 0; ctx.GF.aplicarTerreno(0);
esc.rebuildCollisions = () => {};
esc.limiteVista = () => ({ x1: -100, y1: -100, x2: 800, y2: 800 });
esc.refreshPlotLocks = () => {};
esc.popFx = () => {};
esc.syncNodos = () => {};
esc.dibujarExpansion = () => {};
esc.fitCamera = () => {};
ctx.G.expansiones = 1;
let vivo = null;
corre("expandirEnVivo() completo", () => { vivo = esc.expandirEnVivo(ctx.GF.EXPANSIONES[0]); });
ok("...y devuelve true (si diera false, caería al telón)", vivo === true);
ok("el buscador de caminos se invalida (tenía el mapa viejo)", esc._nav === null);

/* Y LO QUE DE VERDAD IMPORTA: que create() siga corriendo entero después de sacarle las 131
   líneas. Si al extraerlas se hubiera quedado una referencia colgando, revienta acá. */
{
  const esc2 = new ctx.FarmScene();
  esc2.add = new Proxy({}, { get: (t, k) => (...a) => encadenable(k) });
  esc2.textures = { exists: () => true, get: () => encadenable("tex"),
                    createCanvas: () => encadenable("canvas"), addCanvas(){}, remove(){} };
  esc2.cameras = { main: encadenable("cam") };
  esc2.scale = { width: 1280, height: 720, on(){}, off(){} };
  esc2.tweens = { add: () => encadenable("tw"), addCounter: () => encadenable("tw") };
  esc2.input = { on(){}, off(){}, keyboard: { on(){}, off(){}, addKeys: () => new Proxy({}, { get: () => encadenable("key") }), addKey: () => encadenable("k"),
                   createCursorKeys: () => ({}) },
                 mouse: { disableContextMenu(){} }, setDefaultCursor(){}, setTopOnly(){},
                 activePointer: { worldX: 0, worldY: 0, x: 0, y: 0 } };
  esc2.events = { once(){}, on(){}, off(){} };
  esc2.time = { addEvent: () => encadenable("ev"), delayedCall: () => encadenable("ev") };
  esc2.anims = { exists: () => false, create(){}, generateFrameNumbers: () => [] };
  esc2.sound = { add: () => encadenable("snd") };
  esc2.physics = { add: { existing(){} } };
  esc2.game = { canvas: encadenable("canvas") };
  ctx.G.expansiones = 0;
  let err = null;
  try { esc2.create(); } catch (e) { err = e; }
  ok("create() corre entero tras la extracción", !err, err ? (err.message + " · " + String(err.stack).split("\n")[1] || "").trim() : "");
  if (!err) {
    ok("...y deja el césped, las florcitas, la grilla y la cerca puestos",
       !!esc2.cespedRT && !!esc2.decoG && !!esc2.gridG && Array.isArray(esc2.fenceSprites) && esc2.fenceSprites.length > 0,
       "cerca: " + (esc2.fenceSprites || []).length + " palos");

    /* 18/8 — LA PARCELA VA DONDE TOCÓ EL JUGADOR (reporte: "se ha plantado en el centro de la
       granja, como si fuera una posición por defecto"). Se prueba con la ESCENA de verdad, que es
       donde estaba el fallo: los datos ya guardaban bien la celda, pero refreshPlotLocks dibujaba
       la parcela en su sitio de fábrica porque solo se mudaba si su celda estaba ocupada. */
    const owned = ctx.G.plotsOwned || 3;
    const antes = ctx.GF.PLOTS[owned] ? { c: ctx.GF.PLOTS[owned].col, r: ctx.GF.PLOTS[owned].row } : null;
    ctx.G.cobertizo = { tree: 0, rock: 0, plot: 1 };
    const DEST = { col: 8, row: 9 };
    ctx.regaloColocar("plot", DEST.col, DEST.row);
    esc2.colocarRegaloEnVivo("plot");
    const p = ctx.GF.PLOTS[owned];
    ok("la parcela nueva queda en la celda que tocó el jugador",
       p && p.col === DEST.col && p.row === DEST.row,
       "de fábrica " + (antes ? antes.c + "," + antes.r : "?") + " → quedó " + (p ? p.col + "," + p.row : "?") +
       " (pedida " + DEST.col + "," + DEST.row + ")");
    const obj = esc2.plots && esc2.plots[owned];
    ok("...y su sprite se mueve con ella",
       obj && Math.round(obj.cx) === Math.round((DEST.col + 0.5) * ctx.GF.TILE),
       obj ? ("cx=" + Math.round(obj.cx)) : "sin objeto");
    ok("...y deja de estar bloqueada", obj && obj.state !== "locked", obj ? obj.state : "?");
  }
}
console.log("\n" + (fallos ? "FALLOS: " + fallos : "el terreno se rehace en caliente sin reiniciar la escena"));
process.exit(fallos ? 1 : 0);
