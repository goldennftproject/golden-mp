/* PAQUETE DIARIO: LA IMAGEN QUE RECLAMA TAMBIÉN FUNCIONA CON TECLADO
   Mientras el paquete está disponible es un control; tras abrirlo deja de serlo y, si se abrió
   con teclado en PC, el foco continúa en “¡A la bolsa!”.
     node tools/test-paquete-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniPaquete = UI.indexOf("function desactivarPaqueteDiario");
const finPaquete = UI.indexOf("/* ---- TABLÓN", iniPaquete);
if (iniAccion < 0 || finAccion < 0 || iniPaquete < 0 || finPaquete < 0) throw new Error("No encontré el Paquete o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL PAQUETE SÓLO ES UN CONTROL MIENTRAS HAY ALGO QUE RECLAMAR\n");
{
  const fn = UI.slice(iniPaquete, finPaquete);
  ok("la imagen gana rol, Tab y nombre de acción", /img\.setAttribute\("role", "button"\)/.test(fn) && /img\.setAttribute\("tabindex", "0"\)/.test(fn) && /Abrir y reclamar el paquete del día/.test(fn));
  ok("al terminar se le quita semántica y acción", /function desactivarPaqueteDiario/.test(fn) && /desactivarPaqueteDiario\(img\)/.test(fn));
  ok("la imagen usa la puerta de Enter/Espacio", /activarAccionConTeclado\(img, alTocar\)/.test(fn));
  ok("el foco de teclado avanza al botón que aparece, sólo en PC", /function enfocarBotonPaquetePc/.test(fn) && /if \(desdeTeclado\) enfocarBotonPaquetePc\(btn\)/.test(fn) && /window\.innerWidth <= 640/.test(fn));
}

console.log("\nENTER Y ESPACIO RECLAMAN UNA VEZ Y DEJAN UN SIGUIENTE PASO CLARO\n");
{
  const dom = new JSDOM('<!doctype html><div id="paq-dia"></div><img id="paq-img" alt=""><div id="paq-racha"></div><div id="paq-siete"></div><div id="paq-nota"></div><button id="paq-abrir" style="visibility:hidden"></button>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const timers = [], mundo = [];
  let cobros = 0;
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { daily: { day: 0, last: "" } }, DAILY_REWARDS: [{ label: "Decoración" }],
    $: id => dom.window.document.getElementById(id), dailyState: () => ({ claimable: cobros === 0, day: 1 }),
    claimDaily: () => { cobros++; }, coleccionableDeLaSemana: () => "Farol exclusivo", escapeHtml: s => String(s), closeOv() {},
    setTimeout: fn => { timers.push(fn); return timers.length; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniPaquete, finPaquete), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  const img = dom.window.document.getElementById("paq-img"), btn = dom.window.document.getElementById("paq-abrir");
  ctx.refreshPaquete();
  ok("el paquete disponible se anuncia como acción", img.getAttribute("role") === "button" && img.tabIndex === 0 && img.getAttribute("aria-label") === "Abrir y reclamar el paquete del día" && /Elegí el paquete/.test(dom.window.document.getElementById("paq-nota").textContent));

  img.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  img.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  img.dispatchEvent(repetida);
  ok("Enter programa un solo reclamo y no llega al mundo", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && timers.length === 1 && cobros === 0);
  timers.shift()();
  ok("al terminar, reclama, inactiva la imagen y enfoca el siguiente botón", cobros === 1 && img.getAttribute("role") === null && img.getAttribute("tabindex") === null && btn.style.visibility === "visible" && dom.window.document.activeElement === btn);

  cobros = 0; ctx.refreshPaquete();
  img.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  img.dispatchEvent(espacio);
  ok("tras refrescar, Espacio sigue usando una sola acción vigente", espacio.defaultPrevented && mundo.length === 0 && timers.length === 1 && cobros === 0);
  timers.shift()();
  ok("Espacio también termina en el botón visible", cobros === 1 && dom.window.document.activeElement === btn);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarBotonPaquetePc({ focus() { focosMovil++; } });
  ok("móvil no recibe foco programático al abrir", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el Paquete diario se reclama con mouse o teclado y deja claro el siguiente paso.\n");
process.exit(fallos ? 1 : 0);
