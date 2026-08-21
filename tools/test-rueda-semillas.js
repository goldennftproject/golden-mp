/* LA RUEDA DE SEMILLAS: EL CLIC IZQUIERDO PREGUNTA CUANDO HAY QUE ELEGIR (21/8, diseñador)
   Discord: "¿la función de plantar se la quitaste? Salían las opciones de las semillas al
   clickear la parcela… ahora planta la que tenga en la bag, y si tenés 2 planta la última.
   Debería preguntar cuál querés plantar."

   Lo investigado primero: la rueda del CLIC DERECHO nunca se rompió — vive intacta desde el 28/7
   y este test lo demuestra ejecutándola. Lo que el diseñador pedía es otra cosa, y ahora existe:

     · Con DOS O MÁS tipos plantables y sin elección hecha, el clic IZQUIERDO en parcela seca
       abre la rueda en vez de plantar la selección vieja en silencio.
     · Elegir (en la rueda, la bolsa o la hotbar) vale por la sesión: los clics siguientes
       plantan directo — sembrar doce parcelas no son veinticuatro clics.
     · Al recargar se vuelve a preguntar (la queja exacta: "llego y planta la última").
     · Con UN solo tipo planta directo, sin fricción — el tutorial no cambia.
     · Y las semillas EN BOLSA con el cultivo bloqueado (pase/cofres) ya no se esconden de la
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
G.tuto = { done: true }; G.plotsOwned = 6;   // parcelas de sobra: el test planta varias
G.seeds = { papa: 5, zanahoria: 5, repollo: 5 };
/* XP de Cultivo exacta: el nivel del repollo MENOS UNO — papa y zanahoria abiertas, repollo no */
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
const pl = esc.plots.find(p => p.state === "dry");
const clic = (o) => { avisos.length = 0; esc.interactWith(o); if (esc.action) esc.finishAction(); };

console.log("\nCON DOS TIPOS Y SIN ELECCIÓN: EL CLIC IZQUIERDO PREGUNTA");
{
  G.selSeed = "papa"; G.selSeedElegida = false;
  clic(pl);
  ok("la rueda se abre", rueda.classList.contains("show"));
  ok("y NO plantó nada en silencio", pl.state === "dry", "estado: " + pl.state);
  const activos = rueda.querySelectorAll(".swi[data-k]");
  ok("con las DOS semillas plantables", activos.length === 2, [...activos].map(e => e.dataset.k).join(","));
  const bloqueada = rueda.querySelector(".swi.bloq");
  ok("y el repollo EN BOLSA aparece apagado, con su motivo", !!bloqueada && /Cultivo nivel/.test(bloqueada.title),
    bloqueada ? "« " + bloqueada.title + " »" : "no aparece");
  ok("apagado de verdad: sin data-k, no elegible", !bloqueada.dataset.k);
}

console.log("\nELEGIR EN LA RUEDA VALE POR LA SESIÓN");
{
  const zana = [...rueda.querySelectorAll(".swi[data-k]")].find(e => e.dataset.k === "zanahoria");
  zana.onclick({ stopPropagation() {} });
  ok("eligió zanahoria", G.selSeed === "zanahoria" && G.selSeedElegida === true);
  ok("la rueda se cierra", !rueda.classList.contains("show"));
  const z0 = G.seeds.zanahoria;
  clic(pl);
  ok("el clic siguiente PLANTA directo (sin volver a preguntar)", pl.state === "growing" && G.seeds.zanahoria === z0 - 1,
    pl.state + " · semillas " + G.seeds.zanahoria);
  ok("y la rueda no se reabrió", !rueda.classList.contains("show"));
  const pl2 = esc.plots.find(p => p.state === "dry");
  clic(pl2);
  ok("la segunda parcela también planta directo", pl2.state === "growing");
}

console.log("\nLA RECARGA VUELVE A PREGUNTAR (la queja exacta)");
{
  G.selSeedElegida = false;   // lo que hace un F5: la elección no se guarda
  const pl3 = esc.plots.find(p => p.state === "dry");
  clic(pl3);
  ok("tras 'recargar', el primer clic pregunta otra vez", rueda.classList.contains("show") && pl3.state === "dry");
  ctx.hideSeedWheel();
}

console.log("\nCON UN SOLO TIPO: DIRECTO, SIN FRICCIÓN (el tutorial no cambia)");
{
  G.seeds = { papa: 2 }; G.selSeed = "papa"; G.selSeedElegida = false;
  const pl4 = esc.plots.find(p => p.state === "dry");
  clic(pl4);
  ok("planta sin rueda", pl4.state === "growing" && !rueda.classList.contains("show"), pl4.state);
}

console.log("\nY EL CLIC DERECHO SIGUE ABRIENDO LA RUEDA, COMO SIEMPRE");
{
  G.seeds = { papa: 2, zanahoria: 2 }; G.selSeedElegida = true;   // aunque ya haya elegido
  const pl5 = esc.plots.find(p => p.state === "dry");
  const pt = { worldX: pl5.cx, worldY: pl5.by, x: pl5.cx, y: pl5.by, isDown: true,
    rightButtonDown: () => true, rightButtonReleased: () => true, event: { clientX: 200, clientY: 200 } };
  (oyentes.pointerdown || []).forEach(f => f(pt));
  ok("clic derecho → rueda (para cambiar de cultivo cuando quieras)", rueda.classList.contains("show"));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: pregunta cuando hay que elegir, y no molesta cuando no.\n");
process.exit(fallos ? 1 : 0);
