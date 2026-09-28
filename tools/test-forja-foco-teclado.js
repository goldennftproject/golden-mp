/* HERRERÍA: CRAFTEAR NO EXPULSA EL RECORRIDO DE TECLADO
   La lista se repinta incluso varias veces durante un lote ×5. Comprueba que el último cuadro
   recupera el foco equivalente, usa la pestaña como salida y no modifica móvil.
     node tools/test-forja-foco-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("var FORGE_FOCO_PC");
const fin = UI.indexOf("function refreshForge()", ini);
if (ini < 0 || fin < 0) throw new Error("No encontré el foco de la Herrería");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA HERRERÍA GUARDA FOCO SÓLO PARA ENTER/ESPACIO\n");
{
  const tramo = UI.slice(ini, fin);
  ok("los refrescos de un lote se posponen hasta la última fila", /FORGE_FOCO_EN_ACCION/.test(tramo) && /finally \{ FORGE_FOCO_EN_ACCION = false; forgeReponerFocoPc/.test(tramo));
  ok("móvil no recibe foco programático", /window\.innerWidth <= 640/.test(tramo));
}

console.log("\nEL FOCO CONTINÚA EN LA ACCIÓN NUEVA O EN LA PESTAÑA\n");
{
  const dom = new JSDOM('<!doctype html><button id="antes">Antes</button><div id="ov-forge"><button class="close">×</button><button class="forgetab active" data-forge="armas">Armas</button><div id="forge-pane-armas"><button data-carm="espada_madera">Forjar</button></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const ctx = { window: dom.window, document: dom.window.document, Array, Object, String, console, $: id => dom.window.document.getElementById(id) };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  const card = dom.window.document.getElementById("ov-forge");
  const pane = dom.window.document.getElementById("forge-pane-armas");

  const forjar = pane.querySelector("[data-carm]");
  forjar.focus();
  ctx.forgeAccionConFocoPc({ detail: 0 }, ["[data-eqarm='espada_madera']", "[data-carm='espada_madera']"], () => {
    pane.innerHTML = '<button data-eqarm="espada_madera">Equipar</button>';
    ctx.forgeReponerFocoPc(card); // simula un refresh intermedio de state.js
  });
  ok("forjar deja listo Equipar si la arma no se autoequipa", dom.window.document.activeElement === pane.querySelector("[data-eqarm]"));

  ctx.forgeAccionConFocoPc({ detail: 0 }, ["#forge-arrows"], () => {
    pane.innerHTML = '<button id="forge-arrows">Craftear flechas</button>';
    ctx.forgeReponerFocoPc(card);
    pane.innerHTML = '<button id="forge-arrows">Craftear flechas</button>';
    ctx.forgeReponerFocoPc(card);
  });
  ok("un lote que repinta varias veces conserva el último botón equivalente", dom.window.document.activeElement === pane.querySelector("#forge-arrows"));

  ctx.forgeAccionConFocoPc({ detail: 0 }, ["[data-carm='espada_madera']"], () => { pane.innerHTML = ""; });
  const tab = card.querySelector(".forgetab.active");
  ok("si la acción desaparece, la pestaña activa es la salida visible", dom.window.document.activeElement === tab);

  const antes = dom.window.document.getElementById("antes");
  antes.focus();
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  vm.runInContext('FORGE_FOCO_PC = { selectores: ["#forge-arrows"] };', ctx);
  ctx.forgeReponerFocoPc(card);
  ok("móvil conserva el foco táctil previo", dom.window.document.activeElement === antes);
}

console.log("\nLAS ACCIONES REALES PASAN SU ORIGEN AL RECUPERADOR\n");
{
  const iniR = UI.indexOf("function refreshForge()");
  const finR = UI.indexOf("function refreshTools()", iniR);
  const tramo = UI.slice(iniR, finR);
  ok("craftear, lotes, armas y flechas usan la misma ruta", /\[data-craft\]/.test(tramo) && /\[data-ctool5\]/.test(tramo) && /\[data-carm\]/.test(tramo) && /forge-arrows5/.test(tramo) && (tramo.match(/forgeAccionConFocoPc/g) || []).length >= 12);
  ok("cada repintado ofrece restaurar el foco al finalizar", /forgeReponerFocoPc\(card\);/.test(tramo));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la Herrería conserva el recorrido de teclado en PC.\n");
process.exit(fallos ? 1 : 0);
