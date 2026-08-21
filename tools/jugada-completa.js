/* LA JUGADA COMPLETA: UN JUGADOR DEL MINUTO 1 HASTA DONDE EL JUEGO LO DEJE (20/8, dirección)
   "Voy a comenzar a testear el juego. Podrías hacer lo mismo: desde el minuto uno hasta lo
    último que pueda hacer el jugador, y ver que no haya fallos."

   Esto no es un test de una pieza: es UNA PARTIDA. Se arranca la escena real, se le da un reloj
   trucado (los minutos pasan cuando la partida lo pide) y un jugador incansable hace lo que haría
   uno de verdad: reclama el kit, compra semillas, planta, espera, cosecha, vende, tala, pica,
   pesca, abre el paquete diario, entrega pedidos, compra expansiones y parcelas, y sigue hasta
   agotar el mapa o las iteraciones.

   Después de CADA paso se revisan los invariantes: nada negativo, nada NaN, la bolsa dentro de
   su tope. Toda rareza queda anotada en la crónica con el minuto de juego en que pasó.
     node tools/jugada-completa.js            (crónica resumida)
     node tools/jugada-completa.js --todo     (crónica completa, paso a paso)                     */
const fs = require("fs"), vm = require("vm");
const VERBOSE = process.argv.includes("--todo");

/* ---------- el reloj trucado: los minutos pasan cuando la partida lo pide ---------- */
const REAL0 = 1755730800000;   // 21/8/2026 00:00 aprox: da igual, es el día 1 del jugador
let desfase = 0;
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(REAL0 + desfase); else super(...a); }
  static now() { return REAL0 + desfase; }
}

/* ---------- la escena de mentira (la misma de test-arrastrar-arbol) ---------- */
function enc(n, args) {
  const o = { __t: n, width: 42, height: 42, displayWidth: 42, displayHeight: 42, visible: true,
    texture: { key: n || "t" }, frame: { width: 42, height: 42, name: "" },
    x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, angle: 0,
    originX: .5, originY: 1, active: true, isCropped: false,
    scrollX: 0, scrollY: 0, zoom: 1, tilePositionX: 0, tilePositionY: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };
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
      if (k === "destroy") return () => { o.active = false; o.visible = false; return p; };
      if (k === "getBounds") return () => ({ x: o.x - o.width * o.scaleX / 2, y: o.y - o.height * o.scaleY,
        width: o.width * o.scaleX, height: o.height * o.scaleY });
      return () => p;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return p;
}

const avisos = [];
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
  setInterval: () => 0, clearInterval() {}, clearTimeout() {}, requestAnimationFrame: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [],
  querySelector: () => null, createElement: () => enc("el"), body: enc("body") };
ctx.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: (a, b) => Math.floor((a + b) / 2), Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: { Rectangle: class {} }, Display: { Color: {} } };
ctx.Phaser.Geom.Rectangle.Contains = (b, x, y) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
vm.createContext(ctx);
["config", "nav", "state", "save", "farm"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
vm.runInContext("this.FarmScene = FarmScene;", ctx);
ctx.toast = (t) => avisos.push(String(t));
ctx.log = (t) => avisos.push(String(t));
["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
 "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshMarket", "refreshDeco",
 "refreshBaul", "refreshPaquete", "refreshBuzon", "refreshPedidos", "syncEditDeco", "closeOv",
 "openOv", "askConfirm", "showSeedWheel", "alimentarUI", "refreshForge", "refreshCocina"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.saveFarm = () => {};   // sin red: el guardado se prueba aparte con snapshot()+hydrate()
/* $() es el acceso al DOM de la UI. sellItem() le pide la CANTIDAD al input del mercado: el
   jugador de esta partida siempre vende todo, así que el input de mentira dice "9999". */
ctx.$ = () => { const e = enc("dom"); e.value = "9999"; return e; };
const GF = ctx.GF, G = ctx.G, T = GF.TILE;
/* las tablas son const del script (no cuelgan de window): se piden al contexto */
const CROP_DEF = vm.runInContext("CROP_DEF", ctx);

/* ---------- la crónica y los invariantes ---------- */
const cronica = [], fallos = [], hallazgos = [];
const minuto = () => Math.round(desfase / 60000);
const dia = () => Math.floor(desfase / 86400000) + 1;
const anota = (txt) => { cronica.push("d" + dia() + " m" + minuto() + "  " + txt); if (VERBOSE) console.log("  " + cronica[cronica.length - 1]); };
const falla = (txt) => { fallos.push("d" + dia() + " m" + minuto() + "  " + txt); console.log("  !! " + fallos[fallos.length - 1]); };
/* hallazgo: no es un bug que rompa la partida, pero es algo que dirección querrá saber */
const hallazgo = (txt) => { hallazgos.push("d" + dia() + " m" + minuto() + "  " + txt); console.log("  ?? " + hallazgos[hallazgos.length - 1]); };

function sinNaN(obj, ruta, visto) {
  visto = visto || new Set(); if (visto.has(obj)) return; visto.add(obj);
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === "number" && !isFinite(v)) falla("NaN/Infinity en G." + ruta + k + " = " + v);
    else if (v && typeof v === "object") sinNaN(v, ruta + k + ".", visto);
  }
}
function invariantes(donde) {
  if (G.plata < 0) falla(donde + ": plata negativa (" + G.plata + ")");
  if (G.golden < 0) falla(donde + ": $Golden negativo (" + G.golden + ")");
  for (const k in G.seeds) if (G.seeds[k] < 0) falla(donde + ": semillas negativas de " + k);
  for (const k in G.res) if (G.res[k] < 0) falla(donde + ": recurso negativo " + k + " = " + G.res[k]);
  for (const k in G.tools) if (G.tools[k] < 0) falla(donde + ": herramienta negativa " + k);
  for (const k in (G.picks && G.picks.dur) || {}) if (G.picks.dur[k] < 0) falla(donde + ": picos negativos " + k);
  sinNaN({ plata: G.plata, golden: G.golden, res: G.res, seeds: G.seeds, skills: G.skills, level: G.level }, "");
}

/* ---------- nace el jugador ----------
   OJO: el jugador NUEVO no pasa por hydrate — sin fila en la nube, loadFarm no lo llama y
   valen los defaults de state.js. Llamar hydrate({}) aquí fue el primer error de este arnés:
   simulaba un guardado viejo vacío, cuya migración da el kit por reclamado a propósito. */
const esc = new ctx.FarmScene();
esc.add = new Proxy({}, { get: (t, k) => (...a) => enc(k, a) });
esc.textures = { exists: () => true, get: () => enc("tex"), createCanvas: () => enc("c"), addCanvas() {}, remove() {}, getPixelAlpha: () => 255 };
esc.cameras = { main: enc("cam") }; esc.scale = { width: 1280, height: 720, on() {}, off() {} };
esc.tweens = { killTweensOf() {}, add: (cfg) => { if (cfg && cfg.onComplete) { try { cfg.onComplete(); } catch (e) {} } return enc("tw"); }, addCounter: () => enc("tw") };
esc.input = { on() {}, off() {}, keyboard: { on() {}, off() {}, addKeys: () => new Proxy({}, { get: () => enc("k") }), addKey: () => enc("k") },
  mouse: { disableContextMenu() {} }, setDefaultCursor() {}, setTopOnly() {}, activePointer: { worldX: 0, worldY: 0, x: 0, y: 0 } };
esc.events = { once() {}, on() {}, off() {} };
esc.time = { now: 0, addEvent: () => enc("ev"), delayedCall: (ms, fn) => { try { fn && fn(); } catch (e) {} return enc("ev"); } };
esc.anims = { exists: () => false, create() {}, generateFrameNumbers: () => [] };
esc.sound = { add: () => enc("s") }; esc.physics = { add: { existing() {} } }; esc.game = { canvas: enc("cv") };
try { esc.create(); } catch (e) { falla("create() reventó: " + e.message); }

/* ---------- los gestos del jugador ---------- */
let tickRoto = false;
function avanzar(min) {
  desfase += min * 60000;
  /* el TICK REAL del juego es quien pasa los cultivos de "growing" a "ready" (farm.js, update):
     se lo llama de verdad — si revienta con los stubs, eso también es un dato. */
  try { esc.update(desfase, 120); } catch (e) { if (!tickRoto) { tickRoto = true; falla("update() del tick reventó: " + e.message); } }
}
/* el clic del jugador: la puerta real + la resolución real. Los tweens del arnés completan al
   instante, así que startAction puede haber terminado sola: se instrumenta la PUERTA, no el
   estado de después. */
let _gateOK = false;
const _startActionReal = esc.startAction.bind(esc);
esc.startAction = (k, o) => { _gateOK = true; return _startActionReal(k, o); };
function tocar(o) {
  avisos.length = 0; _gateOK = false;
  try { esc.interactWith(o); } catch (e) { falla("interactWith(" + (o.type || "?") + ") reventó: " + e.message); return false; }
  if (esc.action) {
    try { esc.finishAction(); } catch (e) { falla("finishAction(" + (o.type || "?") + ") reventó: " + e.message); esc.action = null; return false; }
  }
  return _gateOK;
}
function pescar() {   // la laguna no es un objeto: se pesca con tryFish, como el clic real
  avisos.length = 0; _gateOK = false;
  const p = GF.POND, cx = (p.col + p.cols / 2) * T, cy = (p.row + p.rows / 2) * T;
  try { esc.tryFish(cx, cy); } catch (e) { falla("tryFish reventó: " + e.message); return false; }
  if (esc.action) { try { esc.finishAction(); } catch (e) { falla("finishAction(fish) reventó: " + e.message); esc.action = null; return false; } }
  return _gateOK;
}
const arboles = () => esc.objs.filter(o => o.type === "tree" && !o.oculto && !o.locked);
const rocas = () => esc.objs.filter(o => (o.type === "rock" || o.type === "ore") && !o.oculto && !o.locked);
const monticulos = () => esc.objs.filter(o => o.type === "excav" && !o.oculto);
const parcelasSecas = () => esc.plots.filter(p => p.state === "dry");
const parcelasListas = () => esc.plots.filter(p => p.state === "ready");

function cicloCultivo() {   // comprar si falta, plantar todo, esperar, cosechar todo, vender todo
  const ck = G.selSeed || "papa", cd = CROP_DEF[ck];
  const secas = parcelasSecas();
  const faltan = Math.max(0, secas.length - (G.seeds[ck] || 0));
  if (faltan > 0) { try { ctx.buySeed(ck, faltan); } catch (e) { falla("buySeed reventó: " + e.message); } }
  let plantadas = 0;
  for (const p of secas) { if ((G.seeds[ck] || 0) <= 0) break; if (tocar(p)) plantadas++; }
  const growMin = cd ? Math.ceil(cd.grow / 60) + 1 : 6;
  avanzar(growMin);
  let cosechadas = 0;
  for (const p of parcelasListas()) if (tocar(p)) cosechadas++;
  let vendidas = 0;
  for (const k in G.res) if (CROP_DEF[k] && (G.res[k] || 0) > 0) { const n = G.res[k]; try { ctx.sellItem(k); vendidas += n; } catch (e) { falla("sellItem(" + k + ") reventó: " + e.message); } }
  return { plantadas, cosechadas, vendidas };
}

/* =================================================================================== */
console.log("\n=== LA PARTIDA ===\n");
invariantes("nacimiento");
anota("Nace: plata " + G.plata + " · parcelas " + (G.plotsOwned || 0) + " · nivel " + (G.level || 1) + " · tutorial " + (G.tuto && G.tuto.done ? "hecho" : "activo"));

/* 1 — EL KIT DE BIENVENIDA */
try { ctx.kitReclamar(); anota("Kit reclamado: hachas " + G.tools.axe + " · picos " + ((G.picks.dur || {}).stone || 0) + " · cañas " + G.tools.rod); }
catch (e) { falla("kitReclamar reventó: " + e.message); }
invariantes("kit");

/* 2 — EL PRIMER CICLO DE CULTIVO (el corazón del tutorial) */
{
  const r = cicloCultivo();
  anota("Primer ciclo: plantó " + r.plantadas + ", cosechó " + r.cosechadas + ", vendió " + r.vendidas + " → plata " + ctx.fmt(Math.floor(G.plata)));
  if (r.plantadas === 0) falla("el jugador nuevo no pudo plantar NADA (¿semillas? ¿guardas del tutorial?)  avisos: " + avisos.join(" · "));
  if (r.plantadas > 0 && r.cosechadas === 0) falla("plantó pero no pudo cosechar tras esperar el crecimiento");
  invariantes("primer ciclo");
}

/* 3 — TALAR Y PICAR (con el kit) */
{
  const a = arboles()[0];
  if (!a) falla("no hay ningún árbol talable en la granja inicial");
  else {
    let madera0 = G.res.madera || 0, golpes = 0;
    while (golpes < 10 && (G.res.madera || 0) === madera0) { if (!tocar(a)) break; golpes++; }
    if ((G.res.madera || 0) > madera0) anota("Taló el árbol en " + golpes + " golpes: +" + ((G.res.madera || 0) - madera0) + " madera");
    else falla("no consiguió madera tras " + golpes + " golpes  avisos: " + avisos.join(" · "));
  }
  const r = rocas().find(x => x.type === "rock");
  if (!r) falla("no hay ninguna roca picable en la granja inicial");
  else {
    let p0 = G.res.piedra || 0, golpes = 0;
    while (golpes < 10 && (G.res.piedra || 0) === p0) { if (!tocar(r)) break; golpes++; }
    if ((G.res.piedra || 0) > p0) anota("Picó la roca en " + golpes + " golpes: +" + ((G.res.piedra || 0) - p0) + " piedra");
    else falla("no consiguió piedra tras " + golpes + " golpes  avisos: " + avisos.join(" · "));
  }
  /* y la veta de BRONCE con el pico del kit: tiene que RECHAZAR con motivo claro */
  const veta = rocas().find(x => x.type === "ore" && x.ore === "bronce");
  if (veta) { if (tocar(veta)) falla("la veta de bronce se dejó picar con el Pico de Piedra"); else anota("La veta de bronce rechazó el pico del kit: « " + avisos.join(" · ") + " »"); }
  invariantes("nodos");
}

/* 4 — CAVAR MONTÍCULOS Y PESCAR */
{
  for (const m of monticulos().slice(0, 3)) tocar(m);   // las lombrices de la carnada salen de acá
  anota("Cavó montículos: lombrices " + (G.res.lombriz || 0) + " · " + avisos.slice(-1).join(""));
  const peces0 = Object.keys(G.fish || {}).reduce((s, k) => s + (G.fish[k] || 0), 0);
  if (pescar()) {
    const peces1 = Object.keys(G.fish || {}).reduce((s, k) => s + (G.fish[k] || 0), 0);
    if (peces1 > peces0) anota("Pescó: " + JSON.stringify(G.fish));
    else falla("la pesca terminó sin pez y sin aviso claro  avisos: " + avisos.join(" · "));
    if (!(G.pescaHasta > FakeDate.now())) falla("tras pescar, la laguna NO quedó en reposo");
    if (pescar()) falla("pudo pescar DE NUEVO con la laguna en reposo");
    else anota("La laguna en reposo rechazó el segundo intento: « " + avisos.join(" · ") + " »");
  } else anota("La pesca no arrancó: « " + avisos.join(" · ") + " »");
  invariantes("pesca");
}

/* 5 — EL TUTORIAL, JUGADO PASO A PASO (la cadena entera, con las funciones reales) */
{
  const TUTO = vm.runInContext("TUTO_STEPS", ctx);
  const obraDe = { place_store: "store", place_horno: "horno", place_cocina: "cocina" };
  const buildDe = { build_store: "store", build_horno: "horno", build_cocina: "cocina" };
  const celdaLibre = () => {
    const t = GF.terreno();
    for (let r = t.r0; r < t.r1; r++) for (let c = t.c0; c < t.c1; c++)
      if (GF.tuyo(c, r) && !GF.enCerca(c, r) && !GF.celdaOcupada(c, r)) return { c, r };
    return null;
  };
  let trampaAvisada = false;
  const reponer = () => {   // el jugador repone: hacha 2 de plata, pico con craftPick — y si el embudo lo encierra, el kit de emergencia
    let guarda = 0;
    while ((G.tools.axe || 0) < 4 && guarda++ < 12) {
      const antes = G.tools.axe || 0;
      if (G.plata >= 20) { avisos.length = 0; try { ctx.craftTool("axe", 10); } catch (e) {} }
      else cultivarPapasVender(6);
      if ((G.tools.axe || 0) === antes && G.plata < 20) {
        /* sin hachas, sin plata, y el paso no deja vender: la trampa. La única salida REAL es el
           kit de emergencia en $Golden — se usa, y queda anotada como hallazgo. */
        if (!trampaAvisada) {
          trampaAvisada = true;
          hallazgo("TRAMPA del embudo en « " + (TUTO[G.tuto.step] || {}).id + " »: el paso solo permite " + JSON.stringify(vm.runInContext("TUTO_PERMISOS", ctx)[(TUTO[G.tuto.step] || {}).id] || []) + " — el hacha cuesta 2 de plata y la plata sale de VENDER papas, que este paso prohíbe. Las 35 hachas del kit dan 35 maderas y el tutorial pide ~40. Salida única: kit de emergencia en $Golden (craftarm tuvo este mismo arreglo el 19/8; wood/stone/woodc/stonec no)");
        }
        avisos.length = 0; try { ctx.comprarEmergencia("axe"); } catch (e) {}
        if (!avisos.some(a => /\+\d+ hachas/.test(a))) { break; }
      }
    }
    guarda = 0;
    while (((G.picks.dur || {}).stone || 0) < 4 && guarda++ < 12) {
      const antes = (G.picks.dur || {}).stone || 0;
      avisos.length = 0; try { ctx.craftPick("stone"); } catch (e) {}
      if (((G.picks.dur || {}).stone || 0) === antes) {
        if (G.plata < 30) cultivarPapasVender(6);
        if (((G.picks.dur || {}).stone || 0) === antes && G.plata < 10) { try { ctx.comprarEmergencia("pick"); } catch (e) {} break; }
      }
    }
  };
  const cultivarPapasVender = (n) => { cultivarPapas(n); avisos.length = 0; try { ctx.sellItem("papa"); } catch (e) {} };
  const juntar = (res, n) => {
    let guarda = 0;
    while ((G.res[res] || 0) < n && guarda++ < 150) {
      reponer();
      let hizo = false;
      if (res === "madera") for (const a of arboles()) { if (FakeDate.now() < (a.readyAt || 0)) continue; const antes = G.res.madera || 0; for (let g = 0; g < 4; g++) if (!tocar(a)) break; if ((G.res.madera || 0) > antes) { hizo = true; break; } }
      if (res === "piedra") for (const r2 of rocas()) { if (r2.type !== "rock") continue; if (FakeDate.now() < (r2.readyAt || 0)) continue; const antes = G.res.piedra || 0; for (let g = 0; g < 4; g++) if (!tocar(r2)) break; if ((G.res.piedra || 0) > antes) { hizo = true; break; } }
      if (!hizo) avanzar(25);
      ctx.tutoCheckRes();
    }
  };
  const comprarPapas = (cuantas) => {   // compra lo que la plata alcance (el lote entero se rechaza si no llega)
    const precio = CROP_DEF.papa.seedCost || 1;
    const puede = Math.max(0, Math.min(cuantas, Math.floor(G.plata / precio)));
    if (puede > 0) ctx.buySeed("papa", puede);
    else ctx.buySeed("papa", 1);   // sin plata: que juegue la semilla fiada del día
  };
  const cultivarPapas = (n) => {
    let vueltasCP = 0;
    while ((G.res.papa || 0) < n && vueltasCP++ < 25) {
      const secas = parcelasSecas();
      if ((G.seeds.papa || 0) < secas.length) comprarPapas(secas.length - (G.seeds.papa || 0));
      if (!(G.seeds.papa || 0)) {   // cupo diario agotado o sin plata: el jugador vuelve mañana
        avanzar(24 * 60);
        comprarPapas(Math.max(1, parcelasSecas().length));
        if (!(G.seeds.papa || 0)) break;
      }
      for (const pl of secas) tocar(pl);
      avanzar(6);
      for (const pl of parcelasListas()) tocar(pl);
    }
  };
  let vueltas = 0, atasco = 0, pasoPrevio = -1;
  while (!G.tuto.done && vueltas++ < 120) {
    const st = TUTO[G.tuto.step]; if (!st) break;
    if (G.tuto.step === pasoPrevio) { if (++atasco > 6) { falla("TUTORIAL ATASCADO en « " + st.id + " »: " + (st.txt || "") + "  avisos: " + avisos.join(" · ")); break; } }
    else { atasco = 0; pasoPrevio = G.tuto.step; if (VERBOSE) anota("tutorial → " + st.id); }
    try {
      if (st.id === "kit") { ctx.kitReclamar(); }
      else if (st.id === "buyseed") { ctx.buySeed("papa", 3); }
      else if (st.id === "plant") { for (const pl of parcelasSecas()) { if (!(G.seeds.papa || 0)) ctx.buySeed("papa", 1); tocar(pl); } avanzar(6); }
      else if (st.id === "harvest") { avanzar(6); for (const pl of parcelasListas()) tocar(pl); }
      else if (st.id === "sell") { cultivarPapas(3); avisos.length = 0; ctx.sellItem("papa"); }
      else if (obraDe[st.id]) {
        const t = obraDe[st.id];
        if (ctx.planosSync) try { ctx.planosSync(true); } catch (e) {}
        const cel = celdaLibre();
        if (!cel) falla("no queda celda libre para colocar la obra de " + t);
        else { avisos.length = 0; ctx.obraColocar(t, cel.c, cel.r); if (!(G.obras && G.obras[t])) falla("obraColocar(" + t + ") no colocó  avisos: " + avisos.join(" · ")); }
      }
      else if (st.res && st.id !== "hunt") { juntar(st.res, (typeof st.need === "function") ? st.need() : (st.need || 1)); ctx.tutoCheckRes(); }
      else if (buildDe[st.id]) {
        const t = buildDe[st.id];
        juntar("madera", (ctx.obraFalta(t) || {}).madera || 0); juntar("piedra", (ctx.obraFalta(t) || {}).piedra || 0);
        let g = 0, fin = false;
        while (g++ < 8 && !fin) { avisos.length = 0; fin = !!ctx.obraDepositar(t); if (!fin && !Object.keys(ctx.obraFalta(t) || {}).length) fin = true; }
        if (fin) ctx.obraConstruir(t);
        if (!(G.built && G.built[t])) falla("la obra de " + t + " no llegó a construirse  falta: " + JSON.stringify(ctx.obraFalta(t)) + "  avisos: " + avisos.join(" · "));
        else anota("Construyó " + t);
      }
      else if (st.id === "craftarm") {
        juntar("madera", 6);
        avisos.length = 0; ctx.craftWeapon("espada_madera");
        if (!(G.weapons || {}).espada_madera && avisos.some(a => /falta plata/i.test(a)) && (G.res.madera || 0) >= 5) {
          hallazgo("el paso del tutorial dice « Forjá una Espada de Madera (5 de madera) » pero la espada TAMBIÉN pide 10 de plata — el texto no lo cuenta y el jugador choca con « Te falta plata »");
          let g = 0; while (G.plata < 10 && g++ < 25) { cultivarPapas(3); avisos.length = 0; try { ctx.sellItem("papa"); } catch (e) {} }
          avisos.length = 0; ctx.craftWeapon("espada_madera");
        }
        if (!(G.weapons || {}).espada_madera) falla("craftWeapon(espada_madera) no forjó ni con plata  avisos: " + avisos.join(" · "));
      }
      else if (st.id === "equiparm") { G.gear.arma = "espada_madera"; ctx.tutoEvent("equiparm"); }   // el gesto del panel de Equipo
      else if (st.id === "cook") { cultivarPapas(2); avisos.length = 0; ctx.cook("papa_asada"); avanzar(30); ctx.checkCooking(); if (!(G.skills.cooking > 0)) { falla("cocinar la Papa Asada no dio XP de cocina  avisos: " + avisos.join(" · "));
          console.log("      [sonda] papa=" + (G.res.papa||0) + " seeds=" + (G.seeds.papa||0) + " plata=" + G.plata + " secas=" + parcelasSecas().length + " listas=" + parcelasListas().length + " estados=" + esc.plots.map(x=>x.state).join(",") + " stacks=" + ctx.canonicalStacks().length + "/" + ctx.invSlots() + " ollas=" + JSON.stringify(ctx.cookList())); } }
      else if (st.id === "eat") { if (!((G.dishes || {}).papa_asada > 0)) { cultivarPapas(2); ctx.cook("papa_asada"); avanzar(30); ctx.checkCooking(); } avisos.length = 0; ctx.eatDish("papa_asada"); }
      else if (st.id === "portal") { const po = esc.objs.find(o => o.type === "portal"); if (po) { if (!tocar(po)) { anota("El portal rechazó el cruce: « " + avisos.join(" · ") + " »"); ctx.tutoEvent("portal"); } } else { anota("(el portal vive en otra escena: se cruza simulado)"); ctx.tutoEvent("portal"); } }
      else if (st.id === "hunt") { const n = (typeof st.need === "function") ? st.need() : 1; G.res.carne = Math.max(G.res.carne || 0, n); anota("(caza simulada: la Zona es otra escena — +" + n + " carne)"); ctx.tutoCheckRes(); }
      else if (st.id === "estofado") {
        /* la receta real: carne (de la caza, frontera de esta simulación) + papa + madera */
        const rec = vm.runInContext("RECIPE_DEF", ctx).estofado.res || {};
        for (const k in rec) {
          if (k === "carne") G.res.carne = Math.max(G.res.carne || 0, rec[k]);
          else if (CROP_DEF[k]) cultivarPapas(rec[k]);
          else juntar(k, rec[k]);
        }
        avisos.length = 0; ctx.cook("estofado"); avanzar(45); ctx.checkCooking();
      }
      else if (st.id === "expandir") {
        let guarda = 0;
        while (guarda++ < 60) { const ex = ctx.expansionSiguiente(); if (!ex) break;
          if ((G.level || 1) >= ex.nivel && ctx.canAfford(ex.costo)) { ctx.expansionComprar(); break; }
          cicloCultivo(); juntar("madera", (ex.costo.madera || 0)); juntar("piedra", (ex.costo.piedra || 0)); }
      }
      else if (st.id === "editar") { G.editVisto = true; ctx.tutoAutoSkip(); }   // el gesto del botón de Config
      else if (st.id === "excavar") { let ok = false; for (const m of monticulos()) if (tocar(m)) { ok = true; break; } if (!ok) { avanzar(24 * 60); for (const m of monticulos()) if (tocar(m)) break; } }
      else if (st.id === "fish") { if (!pescar()) { avanzar(16); if (!pescar()) anota("La pesca del tutorial no salió: « " + avisos.join(" · ") + " »"); } }
      else if (st.id === "pedido") {
        const e = ctx.pedidosEstado();
        if (e && e.lista && e.lista.length) {
          const pd = e.lista.find(x => !x.hecho) || e.lista[0];
          if (pd.tipo === "fish") G.fish[pd.key] = Math.max(G.fish[pd.key] || 0, pd.n);
          else if (pd.tipo === "dish") G.dishes[pd.key] = Math.max((G.dishes || {})[pd.key] || 0, pd.n);
          else G.res[pd.key] = Math.max(G.res[pd.key] || 0, pd.n);
          anota("(el encargo pide " + pd.n + " de " + pd.key + " — se juntan y se entregan)");
          ctx.pedidoEntregar(e.lista.indexOf(pd));
        }
      }
      else { anota("tutorial: paso « " + st.id + " » sin gesto en el arnés — se intenta el autoskip"); }
    } catch (e) { falla("el paso « " + st.id + " » del tutorial reventó: " + e.message); break; }
    ctx.tutoAutoSkip(); ctx.tutoCheckRes();
  }
  if (G.tuto.done) anota("TUTORIAL COMPLETO en " + vueltas + " vueltas (m" + minuto() + ") · plata " + ctx.fmt(Math.floor(G.plata)) + " · nivel " + G.level);
  invariantes("tutorial");
}

/* 5b — EL PAQUETE DIARIO, TRES DÍAS SEGUIDOS */
{
  for (let d = 0; d < 3; d++) {
    let st = null; try { st = ctx.dailyState(); } catch (e) { falla("dailyState reventó: " + e.message); }
    if (st && st.claimable) { try { ctx.claimDaily(); anota("Paquete del día " + ((G.daily && G.daily.day) || "?") + " reclamado"); } catch (e) { falla("claimDaily reventó: " + e.message); } }
    else if (d === 0) falla("el primer paquete diario no estaba disponible al empezar");
    avanzar(24 * 60);
  }
  let st = null; try { st = ctx.dailyState(); } catch (e) {}
  if (st && !st.claimable) falla("tras avanzar un día, el paquete siguiente no está disponible");
  invariantes("paquete diario");
}

/* 6 — GRIND: ciclos de cultivo + nodos hasta donde el mapa dé (tope de iteraciones) */
{
  const TOPE = 260;
  let it = 0, nivelAntes = G.level || 1;
  const hitos = [];
  const reponerGrind = () => {
    if ((G.tools.axe || 0) < 3 && G.plata >= 20) { try { ctx.craftTool("axe", 10); } catch (e) {} }
    if (((G.picks.dur || {}).stone || 0) < 3 && G.plata >= 30) { try { ctx.craftPick("stone"); ctx.craftPick("stone"); ctx.craftPick("stone"); } catch (e) {} }
  };
  while (it++ < TOPE) {
    cicloCultivo();
    reponerGrind();
    for (const a of arboles()) if (FakeDate.now() >= (a.readyAt || 0)) { for (let g = 0; g < 4; g++) if (!tocar(a)) break; }
    for (const r of rocas()) if (FakeDate.now() >= (r.readyAt || 0)) { for (let g = 0; g < 4; g++) if (!tocar(r)) break; }
    for (const m of monticulos()) tocar(m);
    if (!(G.pescaHasta > FakeDate.now())) pescar();
    for (const k in G.res) if (CROP_DEF[k] && G.res[k] > 0) try { ctx.sellItem(k); } catch (e) { falla("sellItem(" + k + ") reventó: " + e.message); }
    /* la expansión, en cuanto el nivel y el material lo permitan */
    const ex = ctx.expansionSiguiente();
    if (ex && (G.level || 1) >= ex.nivel && ctx.canAfford(ex.costo)) {
      const antes = G.expansiones || 0, plotsAntes = G.plotsOwned || 0;
      try { ctx.expansionComprar(); } catch (e) { falla("expansionComprar " + ex.n + " reventó: " + e.message); }
      if ((G.expansiones || 0) === antes + 1) {
        anota("EXPANSIÓN " + ex.n + " comprada (nivel " + G.level + ") → parcelas " + G.plotsOwned + " · terreno " + GF.terreno().mias.size + " celdas");
        if ((G.plotsOwned || 0) !== plotsAntes + 1) falla("la expansión " + ex.n + " NO entregó su parcela (tenía " + plotsAntes + ", tiene " + G.plotsOwned + ")");
        const nuevos = esc.objs.filter(o => o.exp === ex.i);
        if (nuevos.length < 2) falla("la expansión " + ex.n + " no tiene sus 2 nodos en escena (hay " + nuevos.length + ")");
        else if (nuevos.some(o => o.oculto || (o.sprite && o.sprite.visible === false))) falla("la expansión " + ex.n + " dejó nodos ocultos tras comprarla");
      } else falla("expansionComprar " + ex.n + " no compró pese a nivel y material  avisos: " + avisos.join(" · "));
      invariantes("expansión " + ex.n);
    }
    /* una parcela de tienda de vez en cuando */
    if (it % 30 === 0 && G.plata > ctx.plotUnlockCost() * 3 && (G.plotsOwned || 0) < 60) {
      const antes = G.plotsOwned; avisos.length = 0;
      try { ctx.comprarParcela(); } catch (e) { falla("comprarParcela reventó: " + e.message); }
      if (G.plotsOwned === antes + 1) anota("Parcela comprada en tienda (n° compra " + G.plotsCompradas + ") → " + G.plotsOwned + " parcelas");
    }
    if ((G.level || 1) > nivelAntes) { hitos.push("nivel " + G.level + " en it " + it + " (m" + minuto() + ")"); nivelAntes = G.level; }
    if ((G.expansiones || 0) >= 16) break;
  }
  anota("GRIND terminado: " + (it - 1) + " iteraciones · nivel " + G.level + " · expansiones " + (G.expansiones || 0) + "/16 · plata " + ctx.fmt(Math.floor(G.plata)) + " · parcelas " + G.plotsOwned);
  anota("Hitos de nivel: " + (hitos.slice(0, 12).join(" · ") || "ninguno") + (hitos.length > 12 ? " …" : ""));
  if ((G.level || 1) < 3) falla("tras " + TOPE + " iteraciones el jugador sigue por debajo del nivel 3: la curva no arranca");
  invariantes("grind");
}

/* 7 — PEDIDOS DEL TABLÓN (abre al terminar el tutorial) */
{
  anota("Tutorial: " + (G.tuto && G.tuto.done ? "TERMINADO" : "sigue activo en el paso « " + ((G.tuto && G.tuto.step) || "?") + " »"));
  if (G.tuto && !G.tuto.done) falla("tras toda la partida el tutorial NO terminó — algún paso no se puede completar jugando");
  let e = null; try { e = ctx.pedidosEstado(); } catch (er) { falla("pedidosEstado reventó: " + er.message); }
  if (e && e.lista && e.lista.length) {
    const p = e.lista.find(x => !x.hecho) || e.lista[0];
    if (p.tipo === "fish") G.fish[p.key] = Math.max(G.fish[p.key] || 0, p.n);
    else if (p.tipo === "dish") G.dishes[p.key] = Math.max((G.dishes || {})[p.key] || 0, p.n);
    else G.res[p.key] = Math.max(G.res[p.key] || 0, p.n);   // el jugador junta lo pedido
    const vales0 = G.vales || 0;
    try { ctx.pedidoEntregar(e.lista.indexOf(p)); } catch (er) { falla("pedidoEntregar reventó: " + er.message); }
    if ((G.vales || 0) > vales0) anota("Pedido entregado: +" + ((G.vales || 0) - vales0) + " vales (tiene " + G.vales + ")");
    else falla("entregó el pedido y no cobró vales  avisos: " + avisos.join(" · "));
  } else falla("el tablón no tiene pedidos");
  invariantes("pedidos");
}

/* 8 — EL BUZÓN */
{
  let cartas = null; try { cartas = ctx.buzonCartas(); } catch (e) { falla("buzonCartas reventó: " + e.message); }
  if (cartas) anota("Buzón: " + cartas.length + " carta(s) hoy" + (cartas.length ? " — « " + cartas.map(c => c.titulo).join(" · ") + " »" : ""));
  invariantes("buzón");
}

/* 9 — GUARDAR Y VOLVER: el viaje completo del guardado */
{
  const antes = { plata: Math.floor(G.plata), level: G.level, exp: G.expansiones, plots: G.plotsOwned, compradas: G.plotsCompradas, golden: G.golden };
  let d = null;
  try { d = JSON.parse(JSON.stringify(ctx.snapshot())); } catch (e) { falla("snapshot() reventó: " + e.message); }
  if (d) {
    try { ctx.hydrate(d); } catch (e) { falla("hydrate(snapshot) reventó: " + e.message); }
    const despues = { plata: Math.floor(G.plata), level: G.level, exp: G.expansiones, plots: G.plotsOwned, compradas: G.plotsCompradas, golden: G.golden };
    for (const k in antes) if (antes[k] !== despues[k]) falla("el guardado PIERDE « " + k + " »: guardó " + antes[k] + ", volvió " + despues[k]);
    if (fallos.every(f => !f.includes("guardado"))) anota("Guardar y volver: " + JSON.stringify(despues) + " — sin pérdidas");
  }
  invariantes("guardado");
}

/* ---------- el parte final ---------- */
console.log("\n=== CRÓNICA (" + cronica.length + " entradas" + (VERBOSE ? "" : " — las claves") + ") ===");
(VERBOSE ? cronica : cronica.filter((c, i) => i < 8 || /TUTORIAL|EXPANSIÓN|GRIND|Hitos|Guardar|Construyó|encargo|Parcela comprada/.test(c))).forEach(c => console.log("  " + c));
if (hallazgos.length) { console.log("\n=== HALLAZGOS (para dirección y el diseñador) ==="); hallazgos.forEach(h => console.log("  " + h)); }
console.log("\n=== FALLOS ===");
if (!fallos.length) console.log("  ninguno: la partida entera se jugó sin romper nada");
else fallos.forEach(f => console.log("  " + f));
console.log("");
process.exit(fallos.length ? 1 : 0);
