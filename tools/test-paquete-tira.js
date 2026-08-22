/* LA TIRA DEL PAQUETE DICE LO QUE TRAE (22/8, dirección — auditoría del arranque, propuesta C)
   "El día 7 del paquete es invisible el día 1 — un gancho que no se ve no engancha."
   El contrato: los 7 paquetitos llevan su premio en el tooltip (el del día 7 nombra el
   coleccionable EXCLUSIVO de la semana), y debajo de la tira hay una línea fija que lo
   anuncia desde el primer día. La tarjeta no cambia de tamaño (regla de UI).
     node tools/test-paquete-tira.js                                                            */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"));
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; }, setInterval: () => 0, clearInterval() {},
  document: dom.window.document, Image: dom.window.Image, location: { search: "", hash: "" } };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
vm.createContext(ctx);
["config", "nav", "state", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
 "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "saveFarm"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const doc = dom.window.document, G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL JUGADOR DEL DÍA 1 VE LA SEMANA ENTERA — VISTA PREVIA EN CUADRITOS, SIN HOVER");
{
  G.daily = { day: 0, last: "" };   // día 1, sin cobrar
  ctx.refreshPaquete();
  const cards = [...doc.querySelectorAll("#paq-racha .paq-card")];
  ok("hay 7 cuadritos, uno por día", cards.length === 7, cards.length + "");
  const numerados = cards.filter((c, i) => c.textContent.includes("Día " + (i + 1)));
  ok("cada uno dice su día ADENTRO (nada de tooltips)", numerados.length === 7, numerados.length + " de 7");
  const CORTOS = ["Decoración", "farmeo", "platos", "Emote", "Carnada", "Sorpresa"];
  const conPremio = cards.filter((c, i) => i < 6 && c.textContent.includes(CORTOS[i]));
  ok("los días 1-6 muestran su premio a la vista", conPremio.length === 6, conPremio.length + " de 6");
  const col = vm.runInContext("coleccionableDeLaSemana()", ctx);
  const col0 = col.replace(/\s*\(.*$/, "");
  ok("el día 7 muestra el coleccionable EXCLUSIVO, destacado", cards[6].textContent.includes(col0) && cards[6].textContent.includes("✨"),
    "« " + cards[6].textContent.trim() + " »");
  ok("y bajo la tira, la línea con el nombre completo", 
    doc.getElementById("paq-siete") && doc.getElementById("paq-siete").textContent.includes(col),
    "« " + (doc.getElementById("paq-siete") || {}).textContent + " »");
}

console.log("\nY LA TARJETA NO CAMBIA DE TAMAÑO (la línea nueva tiene altura fija)");
{
  const siete = doc.getElementById("paq-siete");
  ok("la línea del día 7 reserva su altura (min-height)", /min-height/.test(siete.getAttribute("style") || ""));
  /* tras cobrar, la línea sigue ahí — la estructura no se mueve */
  G.daily = { day: 3, last: vm.runInContext("dayStamp(0)", ctx) };   // ya abrió hoy
  ctx.refreshPaquete();
  ok("con el paquete ya abierto, los 7 cuadritos y la línea siguen presentes",
    doc.querySelectorAll("#paq-racha .paq-card").length === 7 && doc.getElementById("paq-siete").textContent.length > 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el gancho del día 7 se ve desde el día 1.\n");
process.exit(fallos ? 1 : 0);
