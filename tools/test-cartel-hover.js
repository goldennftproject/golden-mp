/* EL CARTEL DE ACCIÓN NO SALE VACÍO, Y CUANDO ALGO NO ENTRA DICE POR QUÉ (18/8 · reescrito 20/8)
   Dirección, 18/8: "cuando paso el cursor por debajo de las tres parcelas iniciales aparece el
   cuadradito con una leyenda vacía. Eso creo que ha quedado de antes."
   No había quedado de antes: las parcelas BLOQUEADAS de la fila siguiente seguían captando el
   cursor y devolvían un texto vacío.

   20/8 — ESTE TEST SE REESCRIBIÓ ENTERO, y el motivo es el mismo que el de la limpieza de esta
   tarde. Tenía veintiuna comprobaciones y las veintiuna eran EXPRESIONES REGULARES SOBRE EL CÓDIGO:
   buscaban que existiera cierta línea escrita de cierta manera. Un test así es verde mientras nadie
   reformatee, y ciego a si el juego hace lo que dice. De los cuatro fallos que dirección encontró
   hoy, tres estaban tapados por tests de esta clase.
   Ahora se arranca la escena de verdad y se le PREGUNTA: ¿qué texto sale sobre esta parcela? ¿y
   sobre la de al lado, que no es suya? ¿qué dice el juego cuando intento poner la Herrería encima
   de un árbol, o pegada a la cerca?
     node tools/test-cartel-hover.js                                                              */
const fs = require("fs"), vm = require("vm");

function enc(n) {
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
      return () => p;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return p;
}
const avisos = [];
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
/* Se capturan los avisos que ve el jugador: es lo que este test mide. */
ctx.toast = (t) => avisos.push(String(t));
ctx.log = (t) => avisos.push("[registro] " + String(t));
["isOpen", "refreshInv", "syncSlots", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { ctx[f] = () => {}; });
const GF = ctx.GF, G = ctx.G, T = GF.TILE;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
/* La celda de un objeto se saca igual que en el mapa de ocupación: desde su BORDE IZQUIERDO, no
   redondeando el centro. Con Math.round(cx/T) una roca centrada en la celda 10 daba 11 —el centro
   cae justo en el límite— y el test preguntaba por una celda vacía, concluía que el juego dejaba
   construir encima de una roca, y se inventaba dos fallos. */
const celdaDe = (o) => {
  const an = Math.max(1, Math.round((o.w || T) / T));
  return { c: Math.round((o.cx - an * T / 2) / T), r: Math.round(o.by / T) - 1 };
};

G.expansiones = 0; G.level = 1; G.built = { store: false }; G.obras = {}; G.layout = {};
G.decos = []; G.chests = []; G.planos = {}; G.plotsOwned = 3;
G.treesOpen = [0]; G.rocksOpen = [0];
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
let arranco = true;
try { esc.create(); } catch (e) { arranco = false; console.log("      (create: " + e.message + ")"); }

console.log("\nLA ESCENA ARRANCA");
ok("create() llega hasta el final", arranco);
ok("y hay parcelas dibujadas", Array.isArray(esc.plots) && esc.plots.length > 0, (esc.plots || []).length + " parcelas");

console.log("\nEL CARTEL: ¿QUÉ TEXTO SALE SOBRE CADA COSA?");
{
  /* La pregunta de dirección, hecha al juego en vez de al código. */
  const tuya = (esc.plots || []).find(p => p.state !== "locked");
  const ajena = (esc.plots || []).find(p => p.state === "locked");
  ok("sobre una parcela tuya sale un texto útil", !!tuya && !!esc.promptText(tuya),
    tuya ? "« " + esc.promptText(tuya) + " »" : "no hay ninguna");
  ok("y sobre una que todavía no es tuya, NADA", !ajena || esc.promptText(ajena) === "",
    ajena ? "« " + esc.promptText(ajena) + " »" : "(a este nivel no hay bloqueadas)");

  /* Y los nodos, que son los que más rótulo tienen que dar. */
  const arbol = (esc.objs || []).find(o => o.type === "tree" && !o.oculto);
  const roca = (esc.objs || []).find(o => o.type === "rock" && !o.oculto);
  ok("el árbol dice qué se hace con él", !!arbol && /tala/i.test(esc.promptText(arbol)),
    arbol ? "« " + esc.promptText(arbol) + " »" : "");
  ok("la roca, también", !!roca && /pic/i.test(esc.promptText(roca)),
    roca ? "« " + esc.promptText(roca) + " »" : "");
  /* Con el enfriamiento corriendo, el rótulo tiene que decir CUÁNTO falta — es la información que
     evita el clic inútil. */
  if (arbol) {
    const antes = arbol.readyAt;
    arbol.readyAt = ctx.nowMs() + 5 * 60000;
    ok("y con el reloj corriendo dice cuánto falta", /vuelve en/i.test(esc.promptText(arbol)),
      "« " + esc.promptText(arbol) + " »");
    arbol.readyAt = antes;
  }
  /* La laguna: el caso que dirección reportó dos veces. El rótulo tiene que anunciar el reposo. */
  const lag = (esc.objs || []).find(o => o.type === "fish");
  if (lag) {
    G.pescaHasta = ctx.nowMs() + 7 * 60000;
    ok("la laguna en reposo lo dice en el rótulo", /descansa|reposo/i.test(esc.promptText(lag)),
      "« " + esc.promptText(lag) + " »");
    G.pescaHasta = 0;
  }
}

console.log("\nCUANDO ALGO NO ENTRA, EL JUEGO DICE POR QUÉ");
{
  /* huellaColocar() es quien decide. Se le pregunta por tres sitios distintos y se mira que el
     motivo sea concreto: « no se puede construir » a secas no le sirve a nadie. */
  esc.placing = { id: "store", tipo: "store", ancho: 3 };
  const ter = GF.terreno();

  /* 1) una celda libre en medio del terreno */
  let libre = null;
  for (let r = ter.r0 + 2; r < ter.r1 - 2 && !libre; r++)
    for (let c = ter.c0 + 2; c < ter.c1 - 4 && !libre; c++)
      if (GF.tuyo(c, r) && !GF.enCerca(c, r) && !GF.celdaOcupada(c, r) &&
          !GF.celdaOcupada(c + 1, r) && !GF.celdaOcupada(c + 2, r)) libre = { c, r };
  ok("hay sitio libre para la Herrería", !!libre, libre ? libre.c + "," + libre.r : "ninguno");
  if (libre) {
    const hu = esc.huellaColocar(libre.c, libre.r);
    ok("y ahí el juego dice que sí", hu.libre, hu.motivo || "libre");
  }

  /* 2) encima de algo que SÍ se ve: tiene que decir QUÉ estorba.
     Ojo con elegir el estorbo: el único árbol abierto al nivel 1 cae en la franja de la cerca, así
     que el motivo que salía era el de la cerca y el test se quejaba de un mensaje correcto. Se
     busca un objeto visible cuya celda esté DENTRO del terreno útil. */
  const estorbo = (esc.objs || []).find(o => {
    if (o.oculto || (o.sprite && o.sprite.visible === false)) return false;
    if (!["tree", "rock", "ore", "market", "barn"].includes(o.type)) return false;
    const { c, r } = celdaDe(o);
    return GF.tuyo(c, r) && !GF.enCerca(c, r) && !!GF.celdaOcupada(c, r);
  });
  ok("hay algo visible dentro del terreno para probar el estorbo", !!estorbo,
    estorbo ? estorbo.type : "ninguno");
  if (estorbo) {
    const { c, r } = celdaDe(estorbo);
    const hu = esc.huellaColocar(c, r);
    ok("encima de " + estorbo.type + " dice que no", !hu.libre, hu.motivo || "(dijo que sí)");
    ok("…y nombra lo que estorba, no un « no » a secas",
      !!hu.motivo && hu.motivo.length > 12 && !/^no se puede/i.test(hu.motivo), hu.motivo);
  }

  /* 3) en la franja de la cerca: el motivo tiene que explicarla, no soltar un « no » */
  let cerca = null;
  for (let r = ter.r0; r < ter.r1 && !cerca; r++)
    for (let c = ter.c0; c < ter.c1 && !cerca; c++)
      if (GF.tuyo(c, r) && GF.enCerca(c, r)) cerca = { c, r };
  if (cerca) {
    const hu = esc.huellaColocar(cerca.c, cerca.r);
    ok("en la franja de la cerca dice que no", !hu.libre);
    ok("…y explica que es de la cerca", !!hu.motivo && /cerca/i.test(hu.motivo), hu.motivo);
  }

  /* 4) y el rechazo deja traza en el registro, que es la norma de la casa: sin consola. */
  if (estorbo) {
    avisos.length = 0;
    const { c, r } = celdaDe(estorbo);
    try { esc.colocarEn(c * T + 4, r * T + 4); } catch (e) {}
    ok("el rechazo avisa al jugador", avisos.some(a => !a.startsWith("[registro]")), avisos[0] || "(nada)");
    ok("…y deja la traza en el Registro", avisos.some(a => a.startsWith("[registro]")),
      (avisos.find(a => a.startsWith("[registro]")) || "(nada)").slice(0, 90));
  }
  esc.placing = null;
}

console.log("\nY EL SOMBREADO SOLO EXISTE MIENTRAS LLEVÁS ALGO EN LA MANO");
{
  /* Se comprueba el comportamiento, no la línea: sin nada en la mano el gráfico queda apagado. */
  esc.placing = null;
  esc.dibujarOcupadas();
  ok("sin nada en la mano, el sombreado está apagado", !esc.ocupG || esc.ocupG.visible === false);
  esc.placing = { id: "store", tipo: "store", ancho: 3 };
  esc.dibujarOcupadas();
  ok("y con el plano en la mano, encendido", !!esc.ocupG && esc.ocupG.visible !== false);
  esc.placing = null;
  esc.dibujarOcupadas();
  ok("y al soltar se apaga otra vez", !esc.ocupG || esc.ocupG.visible === false);
}

console.log("\nLO ÚNICO QUE SE SIGUE MIRANDO EN EL CÓDIGO (y con motivo)");
{
  /* Quedan dos invariantes ESTRUCTURALES: no son comportamiento observable, son « de dónde sale la
     respuesta ». Ejecutarlas no las probaría; leerlas, sí. */
  const src = fs.readFileSync("public/game/farm.js", "utf8");
  ok("el sombreado lee el MISMO mapa que decide, no una copia",
    /if \(!GF\.celdaOcupada\(c, r\)\) continue;/.test(src), "una sola verdad");
  ok("y blockedAt ya no decide sobre la rejilla (es para caminar)",
    !/if \(GF\.blockedAt\(x, y, 6\)\) return false;/.test(src));

  /* 24/8 — EL CARTEL DESAPARECÍA BAJO EL CURSOR (reporte de dirección: « ves la expansión y
     los recursos que pide y suele desaparecer; hay que darle F5 »). La firma del cartel incluye
     cuánto material tenés, así que juntar una madera más mientras mirás el lote lo destruye y lo
     rehace OCULTO — y como el puntero no se movió, no llega un pointerover nuevo. */
  const dib = src.slice(src.indexOf("dibujarExpansion() {"), src.indexOf("dibujarExpansion() {") + 9000);
  ok("al rehacer el cartel se comprueba si el cursor YA está dentro",
    /activePointer/.test(dib) && /resaltar\(true\)/.test(dib), "el estado no depende de un evento que no vuelve");
  ok("y esa comprobación usa coordenadas del MUNDO (no de pantalla)",
    /worldX/.test(dib) && /worldY/.test(dib));
}

console.log("\n" + (fallos ? "  ✗ " + fallos + " fallas\n" : "  ✓ el cartel solo sale cuando hay algo que decir, y el « no » viene con su motivo\n"));
process.exit(fallos ? 1 : 0);
