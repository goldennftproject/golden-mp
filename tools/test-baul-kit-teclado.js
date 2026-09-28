/* BAÚL: EL KIT DE BIENVENIDA TAMBIÉN SE ABRE CON TECLADO
   La imagen es un control sólo mientras hay kit. Enter/Espacio usan su animación habitual y,
   al reclamarlo, se eliminan tanto semántica como handlers residuales.
     node tools/test-baul-kit-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniBaul = UI.indexOf("function baulRegalosHtml(");
const finBaul = UI.indexOf("/* ---- EL PAQUETE DEL DÍA", iniBaul);
if (iniAccion < 0 || finAccion < 0 || iniBaul < 0 || finBaul < 0) throw new Error("No encontré el Baúl o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL BAÚL GRANDE SÓLO ES UN CONTROL MIENTRAS QUEDA KIT\n");
{
  const fn = UI.slice(iniBaul, finBaul);
  ok("el kit obtiene rol, Tab y nombre de acción", /img\.setAttribute\("role", "button"\)/.test(fn) && /img\.setAttribute\("tabindex", "0"\)/.test(fn) && /Abrir y reclamar el kit de bienvenida/.test(fn));
  ok("la imagen usa la puerta común de Enter/Espacio", /activarAccionConTeclado\(img, alTocar\)/.test(fn));
  ok("al quedar vacío se quitan semántica y handlers", /function desactivarAccionBaul/.test(fn) && /desactivarAccionBaul\(img\)/.test(fn) && /img\.onpointerdown = null; img\.onclick = null/.test(fn));
}

console.log("\nENTER Y ESPACIO RECLAMAN UNA VEZ, SIN DEJAR UNA IMAGEN MUERTA EN TAB\n");
{
  const dom = new JSDOM('<!doctype html><div id="ov-baul" class="show"><button data-close="ov-baul">×</button><div id="baul-sub"></div><div id="baul-items"></div><img id="baul-img" alt=""><div id="baul-nota"></div></div>', { pretendToBeVisual: true });
  const timers = [], mundo = [];
  let reclamos = 0;
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { kitReclamado: false, regalos: { tree: 0, rock: 0, plot: 0 } }, $: id => dom.window.document.getElementById(id),
    GF: { spr: s => s }, KIT_INICIAL: { axe: 2, pico: 1 }, escapeHtml: s => String(s), regalosPendientes: () => 0,
    kitReclamar: () => { reclamos++; ctx.G.kitReclamado = true; },
    setTimeout: fn => { timers.push(fn); return timers.length; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniBaul, finBaul), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.refreshBaul();
  const img = dom.window.document.getElementById("baul-img");
  ok("el kit se anuncia como acción", img.getAttribute("role") === "button" && img.tabIndex === 0 && img.getAttribute("aria-label") === "Abrir y reclamar el kit de bienvenida");

  img.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  img.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  img.dispatchEvent(repetida);
  ok("Enter inicia una única apertura y no llega al mundo", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && timers.length === 1 && reclamos === 0);
  timers.shift()();
  while (timers.length) timers.shift()();
  ok("al terminar, reclama y deja la imagen sin acción residual", reclamos === 1 && img.getAttribute("role") === null && img.getAttribute("tabindex") === null && img.getAttribute("aria-label") === null && img._accionTeclado === null && img.onclick === null && img.onpointerdown === null);

  ctx.G.kitReclamado = false; ctx.refreshBaul();
  img.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  img.dispatchEvent(espacio);
  ok("Espacio vuelve a usar la misma apertura y evita scroll", espacio.defaultPrevented && mundo.length === 0 && timers.length === 1 && reclamos === 1);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el kit del Baúl se abre con mouse o teclado y la imagen deja de ser control al reclamarlo.\n");
process.exit(fallos ? 1 : 0);
