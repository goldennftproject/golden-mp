/* ESPACIO EN UN BOTÓN NO INTERACTÚA CON EL MUNDO
   Tab + Espacio debe activar exclusivamente el botón HTML enfocado. Phaser escucha Espacio
   como interactuar/atacar, así que el evento se detiene en document sin cancelar su acción
   nativa; E/WASD fuera de esa activación conservan el mundo.
   node tools/test-espacio-boton-ui.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf('  document.addEventListener("keydown", (e) => {', UI.indexOf('const KEYS = { i:'));
const fin = UI.indexOf('  window.addEventListener("keydown", (e) => {', ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró la puerta de activación HTML");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let listener = null;
const ctx = { document: { addEventListener(tipo, fn) { if (tipo === "keydown") listener = fn; } } };
vm.createContext(ctx);
vm.runInContext(UI.slice(ini, fin), ctx);
function tecla(key, selector) {
  let detenido = 0, prevenido = 0;
  listener({ key, target: { closest: s => s === "button, a, [role=button]" ? selector : null },
    stopPropagation() { detenido++; }, preventDefault() { prevenido++; } });
  return { detenido, prevenido };
}

console.log("\nEL BOTÓN RECIBE SU ESPACIO, EL MUNDO NO");
{
  const espacio = tecla(" ", { tagName: "BUTTON" });
  ok("Espacio en botón no llega a los oyentes del mundo", espacio.detenido === 1);
  ok("pero no cancela el click nativo del botón", espacio.prevenido === 0);
  ok("Enter en enlace o botón conserva su gesto propio", tecla("Enter", { tagName: "A" }).detenido === 1);
  ok("E fuera de la activación sigue siendo del mundo", tecla("e", { tagName: "BUTTON" }).detenido === 0);
  ok("Espacio sobre el canvas sigue siendo del mundo", tecla(" ", null).detenido === 0);
  ok("la puerta de document se registra antes que el teclado global", ini < UI.indexOf('  window.addEventListener("keydown", (e) => {', ini));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: activar un botón no usa ni ataca por detrás.\n");
process.exit(fallos ? 1 : 0);
