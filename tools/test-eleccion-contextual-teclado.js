/* SELECTOR CONTEXTUAL: LAS OPCIONES DE CAMPO NO DEPENDEN DEL MOUSE
   La rueda genérica de montículos/trampas enfoca su primera decisión en PC. Enter/Espacio
   sigue exactamente el cierre y la elección existentes, sin convertir el centro decorativo.
     node tools/test-eleccion-contextual-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniEleccion = UI.indexOf("function enfocarOpcionEleccionPc");
const finEleccion = UI.indexOf("/* ═══ EL MODO EDICIÓN", iniEleccion);
if (iniAccion < 0 || finAccion < 0 || iniEleccion < 0 || finEleccion < 0) throw new Error("No encontré el selector contextual o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLAS OPCIONES REALES DEL ARO DECLARAN QUÉ ELIGEN\n");
{
  const fn = UI.slice(iniEleccion, finEleccion);
  ok("cada opción obtiene rol, Tab y una etiqueta completa", /data-elec=.*role=\"button\" tabindex=\"0\" aria-label/.test(fn) && /Elegir /.test(fn));
  ok("el centro sigue sin hacerse botón", /swi center/.test(fn) && !/swi center[^\n]*role=\"button\"/.test(fn));
  ok("la misma puerta cubre Enter/Espacio y el foco inicial sólo PC", /activarAccionConTeclado\(el, \(\) => elegir\(el\)\)/.test(fn) && /enfocarOpcionEleccionPc\(c\)/.test(fn) && /window\.innerWidth <= 640/.test(fn));
}

console.log("\nENTER Y ESPACIO ELIGEN UNA VEZ Y CIERRAN EL ARO\n");
{
  const dom = new JSDOM('<!doctype html><div id="seedwheel"><div class="swc"></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  Object.defineProperty(dom.window, "innerHeight", { configurable: true, value: 720 });
  const timers = [], mundo = [], elecciones = [];
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    $: id => dom.window.document.getElementById(id), hayOvPcAbierto: () => false, toast() {}, escapeHtml: s => String(s),
    setTimeout: fn => { timers.push(fn); return timers.length; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniEleccion, finEleccion), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  const opciones = [{ k: "lombriz", txt: "🪱 Lombriz", sub: "segura" }, { k: "grillo", txt: "🦗 Grillo", sub: "arriesgada" }];

  ctx.mostrarEleccion("Elegí carnada", opciones, k => elecciones.push(k));
  const rueda = dom.window.document.getElementById("seedwheel");
  let primera = dom.window.document.querySelector("[data-elec]");
  ok("se muestra, enfoca la primera opción y no focaliza el centro", rueda.classList.contains("show") && primera.getAttribute("role") === "button" && primera.tabIndex === 0 && primera.getAttribute("aria-label") === "Elegir 🪱 Lombriz — segura" && dom.window.document.activeElement === primera && dom.window.document.querySelector(".swi.center").getAttribute("role") === null);

  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  primera.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  primera.dispatchEvent(repetida);
  ok("Enter elige una vez, no llega al mundo y esconde el aro", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && elecciones.join(",") === "lombriz" && !rueda.classList.contains("show") && dom.window.document.querySelectorAll("[data-elec]").length === 0);

  ctx.mostrarEleccion("Elegí carnada", opciones, k => elecciones.push(k));
  primera = dom.window.document.querySelector("[data-elec]");
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  primera.dispatchEvent(espacio);
  ok("Espacio usa la misma elección y evita scroll", espacio.defaultPrevented && mundo.length === 0 && elecciones.join(",") === "lombriz,lombriz" && !rueda.classList.contains("show"));

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarOpcionEleccionPc({ querySelector() { return { focus() { focosMovil++; } }; } });
  ok("móvil no recibe foco programático al mostrar el aro", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el selector contextual se recorre con mouse o teclado y no filtra acciones al mundo.\n");
process.exit(fallos ? 1 : 0);
