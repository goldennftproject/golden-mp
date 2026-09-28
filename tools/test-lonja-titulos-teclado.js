/* LONJA: LOS TÍTULOS GANADOS SE EQUIPAN SIN MOUSE
   Sólo los títulos que ya se ganaron se recorren con Tab. Enter/Espacio usa la equipación de
   siempre y el foco sigue en el mismo título después del repintado.
     node tools/test-lonja-titulos-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniTitulos = UI.indexOf("function tituloLonjaEnFoco");
const finTitulos = UI.indexOf("/* qué le falta a un título", iniTitulos);
if (iniAccion < 0 || finAccion < 0 || iniTitulos < 0 || finTitulos < 0) throw new Error("No encontré los títulos de la Lonja o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nSÓLO LOS TÍTULOS GANADOS SON ACCIONES\n");
{
  const fn = UI.slice(iniTitulos, finTitulos);
  ok("un título ganado anuncia que se puede usar", /data-ltit=.*role=\"button\" tabindex=\"0\" aria-label/.test(fn) && /Usar título de pesca/.test(fn) && /aria-pressed/.test(fn));
  ok("el foco se conserva por título sólo en PC", /function tituloLonjaEnFoco/.test(fn) && /function enfocarTituloLonjaPc/.test(fn) && /window\.innerWidth <= 640/.test(fn));
  ok("Enter/Espacio llegan a la misma equipación", /activarAccionConTeclado\(b, elegir\)/.test(fn));
}

console.log("\nENTER Y ESPACIO EQUIPAN EL TÍTULO SIN PERDER EL RECORRIDO\n");
{
  const dom = new JSDOM('<!doctype html><div id="lonja-cuerpo"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const mundo = [], avisos = [];
  const caja = dom.window.document.getElementById("lonja-cuerpo");
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { tituloPesca: "capitan" }, TITULO_PESCA_ORDER: ["capitan", "maestro", "mitico"],
    TITULO_PESCA_DEF: { capitan: { label: "Capitán" }, maestro: { label: "Maestro" }, mitico: { label: "Mítico" } },
    tituloPescaVigente: () => ctx.G.tituloPesca, tituloPescaGanado: k => k !== "mitico", tituloPescaPideTxt: k => "Requisito de " + k,
    refreshLonja: () => ctx.lonjaPintaTitulos(caja), toast: s => avisos.push(s), escapeHtml: s => String(s),
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniTitulos, finTitulos), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.lonjaPintaTitulos(caja);
  let capitan = dom.window.document.querySelector('[data-ltit="capitan"]');
  let maestro = dom.window.document.querySelector('[data-ltit="maestro"]');
  const mitico = Array.from(dom.window.document.querySelectorAll(".lonja-tit")).find(el => /Mítico/.test(el.textContent));
  ok("los ganados se alcanzan y el bloqueado no inventa parada de Tab", capitan.getAttribute("role") === "button" && capitan.getAttribute("aria-pressed") === "true" && maestro.getAttribute("role") === "button" && maestro.getAttribute("aria-pressed") === "false" && mitico.getAttribute("role") === null && mitico.getAttribute("tabindex") === null);

  maestro.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  maestro.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  maestro.dispatchEvent(repetida);
  maestro = dom.window.document.querySelector('[data-ltit="maestro"]');
  ok("Enter equipa una vez, no llega al mundo y conserva el foco", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && ctx.G.tituloPesca === "maestro" && dom.window.document.activeElement === maestro && maestro.getAttribute("aria-pressed") === "true" && avisos.length === 1);

  capitan = dom.window.document.querySelector('[data-ltit="capitan"]');
  capitan.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  capitan.dispatchEvent(espacio);
  capitan = dom.window.document.querySelector('[data-ltit="capitan"]');
  ok("Espacio usa la misma acción y actualiza el estado", espacio.defaultPrevented && mundo.length === 0 && ctx.G.tituloPesca === "capitan" && dom.window.document.activeElement === capitan && capitan.getAttribute("aria-pressed") === "true" && avisos.length === 2);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarTituloLonjaPc({ querySelectorAll() { return [{ dataset: { ltit: "capitan" }, focus() { focosMovil++; } }]; } }, "capitan");
  ok("móvil no recibe foco programático tras equipar", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: los títulos ganados de la Lonja funcionan con mouse o teclado y mantienen el foco al equiparse.\n");
process.exit(fallos ? 1 : 0);
