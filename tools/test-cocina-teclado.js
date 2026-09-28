/* EL RECETARIO DE COCINA SE RECORRE CON TECLADO (PC)
   Las recetas son casillas visuales, no botones HTML. Deben conservar la grilla pero ofrecer
   Tab, Enter/Espacio, un nombre que describa la receta y foco útil después de repintarse.
   node tools/test-cocina-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado"), finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniCocina = UI.indexOf("var _ckSel"), finCocina = UI.indexOf("function tutoRefresh", iniCocina);
if (iniAccion < 0 || finAccion < 0 || iniCocina < 0 || finCocina < 0) throw new Error("No encontré el recetario o su acción de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function escapeHtml(s) { return String(s).replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function cocinaDom() {
  const dom = new JSDOM('<!doctype html><div id="ck-grid"></div><div id="ck-cola"></div><div id="ck-detalle"></div><div id="ck-nivel"></div><div id="ck-ollas"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { value: 1280, configurable: true });
  const documento = dom.window.document;
  const ctx = {
    window: dom.window, document: documento, Array, String, Math,
    G: { skills: { cooking: 0 }, dishes: {}, res: {}, fish: {} },
    GF: { spr: () => "" },
    RECIPE_ORDER: ["sopa", "estofado"],
    RECIPE_DEF: {
      sopa: { label: "Sopa", emoji: "🍲", lvl: 1, cookS: 8, xp: 1 },
      estofado: { label: "Estofado", emoji: "🥘", lvl: 2, cookS: 12, xp: 2 },
    },
    COOK_LVLS: [],
    $: id => documento.getElementById(id),
    cookLevel: () => 1, cookList: () => [], cookSlots: () => 0, nowMs: () => 0, edif2: () => false,
    fmt: n => String(n), fmtSecs: n => String(n) + " s", fmtCorto: n => String(n), cookEsperando: () => false,
    dishPrice: () => 0, cookPot: () => 1, cocinaFactor: () => 1, dishDesc: () => "", cookFree: () => 1,
    canCook: () => true, cookFaltaTxt: () => "", isOpen: () => false, cocinaRecoger() {}, cook() {}, sellDish() {},
    setTimeout: () => 0, escapeHtml,
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniCocina, finCocina), ctx);
  ctx.refreshCookingV2();
  return { dom, documento, ctx };
}

console.log("\nLAS RECETAS TIENEN SEMÁNTICA SIN CAMBIAR LA GRILLA");
{
  const cocina = cocinaDom(), recetas = Array.from(cocina.documento.querySelectorAll("[data-ckrec]"));
  ok("cada receta se alcanza con Tab como botón", recetas.length === 2 && recetas.every(el => el.getAttribute("role") === "button" && el.tabIndex === 0));
  ok("cada casilla nombra la receta para lector de pantalla", recetas.every(el => /^Seleccionar receta: /.test(el.getAttribute("aria-label") || "")));
  ok("la selección se anuncia con aria-pressed", recetas.find(el => el.dataset.ckrec === "sopa").getAttribute("aria-pressed") === "true" && recetas.find(el => el.dataset.ckrec === "estofado").getAttribute("aria-pressed") === "false");
  ok("una receta cerrada explica el nivel que pide", /requiere nivel 2/.test(recetas.find(el => el.dataset.ckrec === "estofado").getAttribute("aria-label") || ""));
}

console.log("\nESPACIO Y ENTER ELIGEN SIN DISPARAR EL MUNDO");
{
  const cocina = cocinaDom(), mundo = [];
  cocina.dom.window.addEventListener("keydown", e => mundo.push(e.key));
  const estofado = cocina.documento.querySelector('[data-ckrec="estofado"]');
  const espacio = new cocina.dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  estofado.dispatchEvent(espacio);
  const elegido = cocina.documento.querySelector('[data-ckrec="estofado"]');
  ok("Espacio selecciona una receta", elegido.getAttribute("aria-pressed") === "true" && /Estofado/.test(cocina.documento.getElementById("ck-detalle").textContent));
  ok("el gesto cancela scroll y no llega a Phaser", espacio.defaultPrevented && mundo.length === 0);
  ok("al repintar, el foco queda en la receta nueva", cocina.documento.activeElement === elegido);

  const sopa = cocina.documento.querySelector('[data-ckrec="sopa"]');
  sopa.dispatchEvent(new cocina.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  ok("Enter vuelve a usar el mismo camino de selección", cocina.documento.querySelector('[data-ckrec="sopa"]').getAttribute("aria-pressed") === "true");

  const repetida = cocina.documento.querySelector('[data-ckrec="estofado"]');
  repetida.dispatchEvent(new cocina.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true }));
  ok("mantener Enter no cambia receta por accidente", cocina.documento.querySelector('[data-ckrec="sopa"]').getAttribute("aria-pressed") === "true");
}

console.log("\nEL ENLACE QUEDA JUNTO A LA GRILLA DINÁMICA");
{
  const v2 = UI.slice(iniCocina, finCocina);
  ok("la plantilla conserva data-ckrec y suma rol/tabindex", /data-ckrec="' \+ id \+ '" role="button" tabindex="0"/.test(v2));
  ok("el handler usa la misma puerta de teclado", /activarAccionConTeclado\(el, \(\) => \{ elegir\(\); enfocarRecetaCocina\(grid, id\); \}\)/.test(v2));
  ok("la restauración de foco sólo actúa en PC", /window\.innerWidth <= 640/.test(v2) && /preventScroll: true/.test(v2));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el recetario se puede elegir sin mouse y sin tocar el mundo detrás.\n");
process.exit(fallos ? 1 : 0);
