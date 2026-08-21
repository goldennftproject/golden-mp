/* LA RUEDA DE SEMILLAS: EL CLIC DERECHO LA ABRE, EL IZQUIERDO PLANTA COMO SIEMPRE (21/8)
   Reporte del diseñador, aclarado por dirección: "con doce semillas en el inventario, el clic
   DERECHO plantaba la última de la lista en vez de abrir la ruedita".

   El bug real, cazado: pt.rightButtonDown() lee pointer.buttons, y según navegador/versión de
   Phaser ese estado puede llegar SIN ACTUALIZAR durante el propio pointerdown del botón derecho.
   Cuando pasa, el clic derecho cae en la rama izquierda, arma clickHit + hold, y el disparo del
   update ("un clic = un golpe, sin esperar a soltar") PLANTA la semilla seleccionada — sin rueda.
   La armadura: se mira TAMBIÉN el evento nativo del DOM (button === 2), que sí es fiable, en el
   pointerdown y en el pointerup.

   El reparto de clics queda como siempre fue:
     · clic IZQUIERDO en parcela seca → planta la semilla seleccionada, directo;
     · clic DERECHO → la rueda para elegir;
     · y las semillas EN BOLSA con el cultivo bloqueado (pase/cofres) ya no se esconden de la
       rueda: salen apagadas con su « Cultivo nivel X ». Esconderlas parecía un bug.

   Escena real + DOM real (jsdom): se clickea de verdad y se mira qué pasa.
     node tools/test-rueda-semillas.js                                                            */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

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

const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"));
const oyentes = {};
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; },
  setInterval: () => 0, clearInterval() {}, clearTimeout() {}, requestAnimationFrame: () => 0,
  document: dom.window.document, Image: dom.window.Image };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: { Rectangle: class {} }, Display: { Color: {} } };
ctx.Phaser.Geom.Rectangle.Contains = (b, x, y) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
vm.createContext(ctx);
["config", "nav", "state", "ui", "farm"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
vm.runInContext("this.FarmScene = FarmScene;", ctx);
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = t => avisos.push(String(t));
["isOpen", "refreshInv", "syncSlots", "refreshHud", "saveFarm", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "alimentarAnimal"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, GF = ctx.GF, doc = dom.window.document;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* jugador con papa Y zanahoria plantables + repollo EN BOLSA pero bloqueado */
G.tuto = { done: true }; G.plotsOwned = 6;
G.seeds = { papa: 5, zanahoria: 5, repollo: 5 };
const CD = vm.runInContext("CROP_DEF", ctx);
{
  const objetivo = CD.repollo.lvl - 1;
  let xp = 0;
  for (let n = 1; n < objetivo; n++) xp += vm.runInContext("skillNeed(" + n + ", 'farming')", ctx);
  G.skills = Object.assign({}, G.skills, { farming: xp });
}
ok("(escenario) papa y zanahoria abiertas, repollo bloqueado",
  ctx.cropUnlocked("papa") && ctx.cropUnlocked("zanahoria") && !ctx.cropUnlocked("repollo"),
  "farming xp " + G.skills.farming);
GF.aplicarTerreno(0); GF.ocupCambio();

const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k, a) });
esc.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"), addCanvas() {}, remove() {}, getPixelAlpha: () => 255 };
esc.cameras = { main: enc("cam") }; esc.scale = { width: 1280, height: 720, on() {}, off() {} };
esc.tweens = { add: (cfg) => { if (cfg && cfg.onComplete) { try { cfg.onComplete(); } catch (e) {} } return enc("tw"); }, addCounter: () => enc("tw"), killTweensOf() {} };
esc.input = { on(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); }, off() {},
  keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
  mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {},
  activePointer: { worldX: 0, worldY: 0, x: 0, y: 0, event: { clientX: 300, clientY: 300 } } };
esc.events = { once() {}, on() {}, off() {} };
esc.time = { addEvent: () => enc("ev"), delayedCall: (ms, fn) => { try { fn && fn(); } catch (e) {} return enc("ev"); } };
esc.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
esc.sound = { add: () => enc("s") }; esc.physics = { add: { existing() {} } }; esc.game = { canvas: enc("cv") };
esc.create();

const rueda = doc.getElementById("seedwheel");
const clic = (o) => { avisos.length = 0; esc.interactWith(o); if (esc.action) esc.finishAction(); };

console.log("\nEL CLIC IZQUIERDO PLANTA DIRECTO, COMO SIEMPRE — AUNQUE HAYA VARIOS TIPOS");
{
  G.selSeed = "papa";
  const pl = esc.plots.find(p => p.state === "dry");
  const papas0 = G.seeds.papa;
  clic(pl);
  ok("planta la semilla seleccionada sin preguntar", pl.state === "growing" && G.seeds.papa === papas0 - 1,
    pl.state + " · papas " + G.seeds.papa);
  ok("y la rueda NO se abre", !rueda.classList.contains("show"));
}

console.log("\nEL CLIC DERECHO ABRE LA RUEDA (el gesto de siempre, ya blindado)");
{
  const pl = esc.plots.find(p => p.state === "dry");
  const pt = { worldX: pl.cx, worldY: pl.by, x: pl.cx, y: pl.by, isDown: true,
    rightButtonDown: () => true, rightButtonReleased: () => true, event: { button: 2, buttons: 2, clientX: 200, clientY: 200 } };
  (oyentes.pointerdown || []).forEach(f => f(pt));
  ok("la rueda se abre", rueda.classList.contains("show"));
  ok("y no plantó nada", pl.state === "dry", pl.state);
  const activos = rueda.querySelectorAll(".swi[data-k]");
  ok("con las DOS semillas plantables", activos.length === 2, [...activos].map(e => e.dataset.k).join(","));
  const bloqueada = rueda.querySelector(".swi.bloq");
  ok("y el repollo EN BOLSA aparece apagado, con su motivo", !!bloqueada && /Cultivo nivel/.test(bloqueada.title),
    bloqueada ? "« " + bloqueada.title + " »" : "no aparece");
  ok("apagado de verdad: sin data-k, no elegible", !!bloqueada && !bloqueada.dataset.k);
  /* elegir en la rueda cambia la selección */
  const zana = [...activos].find(e => e.dataset.k === "zanahoria");
  zana.onclick({ stopPropagation() {} });
  ok("elegir en la rueda cambia la selección", G.selSeed === "zanahoria");
  ok("y la rueda se cierra", !rueda.classList.contains("show"));
  const z0 = G.seeds.zanahoria;
  clic(pl);
  ok("el clic izquierdo siguiente planta la elegida", pl.state === "growing" && G.seeds.zanahoria === z0 - 1);
}

console.log("\nEL NAVEGADOR TRAICIONERO: rightButtonDown() MIENTE y el evento nativo dice la verdad");
{
  /* el bug exacto del diseñador: pointer.buttons sin actualizar → rightButtonDown() false en el
     pointerdown del derecho. Antes de la armadura, ese clic armaba clickHit + hold y el disparo
     del update PLANTABA la selSeed sin enseñar la rueda: "con 12 semillas planta la última". */
  ctx.hideSeedWheel();
  const pl = esc.plots.find(p => p.state === "dry");
  const traidor = { worldX: pl.cx, worldY: pl.by, x: pl.cx, y: pl.by, isDown: true,
    rightButtonDown: () => false,               // ← Phaser miente
    rightButtonReleased: () => false,
    event: { button: 2, buttons: 2, clientX: 200, clientY: 200 } };   // ← el DOM no
  (oyentes.pointerdown || []).forEach(f => f(traidor));
  ok("el clic derecho 'mentiroso' abre la RUEDA igual", rueda.classList.contains("show"));
  ok("no armó clickHit (el disparo del update no puede plantar)", !esc.clickHit, String(esc.clickHit));
  ok("ni hold (tampoco el golpe-sin-soltar)", !esc.hold);
  ok("y la parcela sigue seca", pl.state === "dry", pl.state);
  ctx.hideSeedWheel();
  /* y el pointerup del derecho tampoco resuelve un clickHit rancio */
  esc.clickHit = pl; esc.hold = { t0: 0, active: false };
  (oyentes.pointerup || []).forEach(f => { try { f(traidor); } catch (e) {} });
  ok("el pointerup del derecho no planta un clickHit viejo", pl.state === "dry", pl.state);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: izquierdo planta, derecho pregunta — y ningún navegador lo confunde.\n");
process.exit(fallos ? 1 : 0);
