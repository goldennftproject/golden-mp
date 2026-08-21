/* LA TARJETA DEL PAQUETE NO CAMBIA DE TAMAÑO AL ABRIRLO (20/8, dirección)
   "Cuando abro el paquete, la interfaz cambia de tamaño. Ninguna interfaz debería cambiar de
    tamaño cuando se interactúa con algo de la propia interfaz."

   Las dos causas del salto, medidas en la tarjeta real:
     1. el botón "¡A la bolsa!" entraba con display:none → visible: aparecía una FILA nueva;
     2. la notita pasaba de una línea ("¿Qué habrá hoy?") a un premio de dos.
   La regla del arreglo: EL ESPACIO SE RESERVA SIEMPRE. El botón se esconde con visibility (sigue
   ocupando su fila) y la nota reserva dos líneas con min-height.

   jsdom no calcula layout, así que el tamaño no puede medirse en píxeles — pero el CAMBIO de
   tamaño sí puede medirse por lo que lo causa: se ejecuta refreshPaquete() en sus dos estados,
   se simula el toque que abre el paquete, y se comprueba que ningún estado saca o mete elementos
   del layout (display) ni deja a la nota sin su altura mínima.
     node tools/test-paquete-tamano.js                                                            */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("public/index.html", "utf8");
const dom = new JSDOM(html);
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setInterval: () => 0, clearInterval() {},
  document: dom.window.document, Image: dom.window.Image };
/* los setTimeout se guardan para dispararlos a mano: el shake del paquete abre tras 800 ms */
const timers = [];
ctx.setTimeout = (fn) => { timers.push(fn); return timers.length; };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
vm.createContext(ctx);
["config", "nav", "state", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "closeOv"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, doc = dom.window.document;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const btn = doc.getElementById("paq-abrir"), nota = doc.getElementById("paq-nota"), img = doc.getElementById("paq-img");
const enLayout = (el) => dom.window.getComputedStyle(el).display !== "none";

console.log("\nLA TARJETA RESERVA SU ESPACIO DESDE EL HTML");
ok("la nota tiene altura mínima para dos líneas", /min-height/.test(nota.getAttribute("style") || ""),
  "el premio largo no la agranda");
ok("la imagen tiene altura fija", /height:\s*118px/.test(img.getAttribute("style") || ""),
  "cambiar de paquete cerrado a abierto no mueve nada");

console.log("\nESTADO 1: PAQUETE POR ABRIR");
{
  G.daily = { day: 0, last: "" };   // nunca reclamó: el de hoy está disponible
  ctx.refreshPaquete();
  ok("el botón está oculto PERO en el layout", btn.style.visibility === "hidden" && enLayout(btn),
    "visibility:" + btn.style.visibility + " · display:" + (btn.style.display || "(vacío)"));
}

console.log("\nSE TOCA EL PAQUETE: EL TEMBLOR, Y AL ABRIR…");
{
  img.onpointerdown({ preventDefault() {} });
  ok("el toque programó la apertura", timers.length > 0, timers.length + " timer(s)");
  timers.forEach(fn => fn());   // pasa el temblor: el paquete se abre de verdad (claimDaily corre)
  ok("el premio se cobró", (G.daily.day || 0) >= 1, "día " + G.daily.day);
  ok("el botón APARECE sin entrar al layout: solo cambia visibility",
    btn.style.visibility === "visible" && enLayout(btn) && btn.style.display !== "none",
    "la fila ya estaba reservada — la tarjeta mide lo mismo");
  ok("y la nota sigue con su min-height", /min-height/.test(nota.getAttribute("style") || ""));
}

console.log("\nESTADO 2: YA ABIERTO (al volver a entrar)");
{
  ctx.refreshPaquete();
  ok("el botón vuelve a esconderse SIN salir del layout", btn.style.visibility === "hidden" && enLayout(btn),
    "visibility:" + btn.style.visibility);
}

console.log("\nY EN NINGÚN ESTADO SE TOCÓ display DEL BOTÓN");
{
  /* la regla de fondo: refreshPaquete no puede volver a esconder con display — eso es lo que
     cambia el tamaño. Se mira el código vivo de la función, sin comentarios. */
  const UI = fs.readFileSync("public/game/ui.js", "utf8");
  const i0 = UI.indexOf("function refreshPaquete("), i1 = UI.indexOf("function refreshPedidos(");
  const fn = UI.slice(i0, i1).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("refreshPaquete no usa btn.style.display", !/btn\.style\.display/.test(fn),
    "solo visibility: la fila del botón es fija");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la tarjeta mide lo mismo cerrada, temblando y abierta.\n");
process.exit(fallos ? 1 : 0);
