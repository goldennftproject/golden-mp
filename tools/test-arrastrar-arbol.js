/* EL ÁRBOL NO SE PARTE EN DOS AL ARRASTRARLO (20/8, dirección)
   "Cuando quiero mover un árbol crecido, lo arrastro y la copa queda en el lugar dibujado, como si
    se partiera en dos el árbol."

   Y es literal: un árbol crecido NO es un dibujo, son dos. copaArmar() recorta el mismo sprite en
   tronco (abajo, quieto) y copa (arriba, que es la que mece el viento). El arrastre del modo edición
   movía o.sprite y o.shadow — nadie movía o.copa.

   Peor todavía: copaArmar() se saltaba el trabajo si la "clave" no había cambiado, y esa clave mira
   la textura y la escala pero NO la posición. O sea que la copa no volvía a su tronco ni al soltar:
   se quedaba huérfana hasta que algo cambiara la textura del árbol.

   Este test hace el gesto de verdad: arranca la escena, deja que el viento parta el árbol, y
   entonces dispara pointerdown, pointermove y pointerup sobre él como haría un ratón. Después
   pregunta lo único que importa: ¿dónde quedó la copa?
     node tools/test-arrastrar-arbol.js                                                           */
const fs = require("fs"), vm = require("vm");

/* ---- sprite de mentira que SÍ recuerda dónde está, qué recorte tiene y si lo destruyeron ---- */
/* Los argumentos del add.image(x, y, …) se GUARDAN. Sin esto todos los sprites nacían en 0,0, el
   cursor no acertaba a ninguno y el test daba cinco fallos que no eran del juego sino míos. */
function enc(n, args) {
  const o = { __t: n, width: 42, height: 42, displayWidth: 42, displayHeight: 42, visible: true,
    texture: { key: n || "t" }, frame: { width: 42, height: 42, name: "" },
    x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, angle: 0,
    originX: .5, originY: 1, active: true, isCropped: false, destruido: false,
    scrollX: 0, scrollY: 0, zoom: 1, tilePositionX: 0, tilePositionY: 0, now: 0 };
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
      if (k === "setAngle") return v => { o.angle = v; return p; };
      if (k === "setDepth") return v => { o.depth = v; return p; };
      if (k === "setPosition") return (x, y) => { o.x = x; o.y = y; return p; };
      if (k === "setScale") return (a, b) => { o.scaleX = a; o.scaleY = b === undefined ? a : b; return p; };
      if (k === "setOrigin") return (a, b) => { o.originX = a; o.originY = b === undefined ? a : b; return p; };
      if (k === "setTexture") return kk => { o.texture = { key: kk }; return p; };
      if (k === "setCrop") return (...a) => { o.isCropped = a.length > 0; return p; };
      if (k === "destroy") return () => { o.destruido = true; return p; };
      /* getBounds tiene que devolver una caja REAL: es lo que usa hitsSprite para decidir qué
         agarró el cursor. Con la caja de mentira de siempre (un proxy que dice que sí a todo) el
         clic agarraba cualquier cosa y el test no habría estado midiendo el arrastre del árbol. */
      if (k === "getBounds") return () => ({ x: o.x - o.width * o.scaleX / 2, y: o.y - o.height * o.scaleY,
        width: o.width * o.scaleX, height: o.height * o.scaleY });
      return () => p;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return p;
}
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [],
  querySelector: () => null, createElement: () => enc("el") };
ctx.Phaser = { Scene: class {},
  Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 },
  Geom: { Rectangle: class { }, },
  Display: { Color: {} } };
ctx.Phaser.Geom.Rectangle.Contains = (b, x, y) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
vm.createContext(ctx);
["config", "nav", "state", "farm"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
vm.runInContext("this.FarmScene = FarmScene;", ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo",
 "alimentarAnimal", "showSeedWheel"].forEach(f => { ctx[f] = () => {}; });
const GF = ctx.GF, G = ctx.G, T = GF.TILE;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

G.expansiones = 0; G.level = 5; G.built = { store: false }; G.obras = {}; G.layout = {};
G.decos = []; G.chests = []; G.planos = {}; G.plotsOwned = 3;
G.treesOpen = [0]; G.rocksOpen = [0]; G.skills = { mining: 0 };
GF.aplicarTerreno(0); GF.ocupCambio();

/* ---- la escena, con los eventos del ratón CAPTURADOS para poder dispararlos ---- */
const oyentes = {};
const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k, a) });
esc.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"),
  addCanvas() {}, remove() {}, getPixelAlpha: () => 255 };
esc.cameras = { main: enc("cam") }; esc.scale = { width: 1280, height: 720, on() {}, off() {} };
esc.tweens = { add: () => enc("tw"), addCounter: () => enc("tw") };
esc.input = { on(ev, fn) { (oyentes[ev] || (oyentes[ev] = [])).push(fn); }, off() {},
  keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
  mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {},
  activePointer: { worldX: 0, worldY: 0, x: 0, y: 0 } };
esc.events = { once() {}, on() {}, off() {} };
esc.time = { now: 0, addEvent: () => enc("ev"), delayedCall: () => enc("ev") };
esc.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
esc.sound = { add: () => enc("s") }; esc.physics = { add: { existing() {} } }; esc.game = { canvas: enc("cv") };
let arranco = true;
try { esc.create(); } catch (e) { arranco = false; console.log("      (create: " + e.message + ")"); }

const disparar = (ev, pt) => (oyentes[ev] || []).forEach(fn => fn(pt));
const puntero = (wx, wy) => ({ worldX: wx, worldY: wy, x: wx, y: wy, isDown: true,
  rightButtonDown: () => false, rightButtonReleased: () => false, event: { clientX: 0, clientY: 0 } });

console.log("\nLA ESCENA ARRANCA Y ESCUCHA EL RATÓN");
ok("create() llegó hasta el final", arranco);
ok("y quedaron enganchados los tres eventos del arrastre",
  !!(oyentes.pointerdown && oyentes.pointermove && oyentes.pointerup),
  Object.keys(oyentes).join(" · "));

/* ---- el árbol crecido, que es el que se parte ---- */
const arbol = (esc.objs || []).find(o => o.type === "tree" && !o.oculto && !o.locked);
console.log("\nUN ÁRBOL CRECIDO ESTÁ HECHO DE DOS DIBUJOS");
ok("hay un árbol crecido en la granja", !!arbol, arbol ? "en " + Math.round(arbol.cx / T) + "," + (Math.round(arbol.by / T) - 1) : "");
if (!arbol) { console.log("\nSin árbol no hay nada que medir.\n"); process.exit(1); }
arbol.readyAt = 0;                 // crecido: sin enfriamiento corriendo
esc.tickViento();
ok("el viento lo parte en copa y tronco", !!arbol.copa, "así se mece la copa sin doblar el tronco");
ok("y el tronco queda recortado", arbol.sprite.isCropped === true);

console.log("\nAL AGARRARLO, VUELVE A SER UN SOLO DIBUJO");
GF.editMode = true;
const x0 = arbol.cx, y0 = arbol.by;
disparar("pointerdown", puntero(x0, y0 - 8));
ok("el clic lo agarró", esc.dragObj === arbol);
ok("y la copa se guardó: el árbol está entero", !arbol.copa && arbol.sprite.isCropped === false,
  "un árbol que estás colocando no se mece");

console.log("\nMIENTRAS LO ARRASTRÁS, NO SE PARTE OTRA VEZ");
const destino = { cx: x0 + T * 2, by: y0 };
disparar("pointermove", puntero(destino.cx, destino.by));
esc.tickViento();                  // el viento sigue soplando: no puede volver a partirlo
ok("el sprite sigue al cursor", arbol.sprite.x === destino.cx && arbol.sprite.y === destino.by,
  "sprite en " + arbol.sprite.x + "," + arbol.sprite.y);
ok("y el viento lo deja en paz mientras está en la mano", !arbol.copa,
  "si acá aparece una copa, es la copa huérfana que ve dirección");

console.log("\nAL SOLTARLO, LA COPA VUELVE A SU TRONCO");
disparar("pointerup", puntero(destino.cx, destino.by));
ok("el árbol quedó en la celda nueva", arbol.cx !== x0,
  "de la columna " + Math.round(x0 / T) + " a la " + Math.round(arbol.cx / T));
esc.tickViento();
ok("el viento lo vuelve a partir", !!arbol.copa);
ok("y la copa está sobre SU tronco, no donde estaba antes",
  !!arbol.copa && arbol.copa.x === arbol.sprite.x,
  arbol.copa ? "copa en x=" + arbol.copa.x + " · tronco en x=" + arbol.sprite.x : "");

console.log("\nY SI EL ÁRBOL SE MUEVE POR CUALQUIER OTRO MOTIVO, LA COPA TAMBIÉN");
{
  /* Ésta es la causa de raíz, medida aparte del arrastre: copaArmar() se salteaba el trabajo
     cuando la clave no cambiaba, y la clave no incluye la posición. Cualquier cosa que mueva un
     árbol —una expansión, una migración del guardado— dejaba la copa atrás igual. */
  esc.tickViento();
  const antes = arbol.copa && arbol.copa.x;
  arbol.sprite.setPosition(arbol.sprite.x + T * 3, arbol.sprite.y);
  esc.tickViento();
  ok("la copa se vuelve a apoyar sobre el tronco movido",
    !!arbol.copa && arbol.copa.x === arbol.sprite.x,
    "antes en x=" + antes + " · ahora en x=" + (arbol.copa && arbol.copa.x) + " · tronco x=" + arbol.sprite.x);
  ok("y la profundidad acompaña", !!arbol.copa && Math.abs(arbol.copa.depth - (arbol.sprite.depth + 0.1)) < 1e-6);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el árbol se mueve de una pieza.\n");
process.exit(fallos ? 1 : 0);
