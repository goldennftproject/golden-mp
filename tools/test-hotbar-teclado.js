/* HOTBAR DE ESCRITORIO: LOS DIEZ ATAJOS TAMBIÉN SE RECORREN CON TAB
   Los números 1–0 siguen siendo el camino rápido, pero no reemplazan que cada casilla diga qué
   contiene y responda a Enter/Espacio. Como se repinta al elegir, el foco debe quedar en la
   misma posición sólo en PC; el flujo táctil no se mueve.
     node tools/test-hotbar-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniHotbar = UI.indexOf("function hotItemExists");
const finHotbar = UI.indexOf("function aLaBarra", iniHotbar);
if (iniAccion < 0 || finAccion < 0 || iniHotbar < 0 || finHotbar < 0) throw new Error("No encontré la hotbar o su puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA TIRA DECLARA SUS DIEZ ACCESOS DIRECTOS\n");
{
  const fn = UI.slice(iniHotbar, finHotbar);
  ok("la hotbar se anuncia como grupo", /id="hotbar" role="group" aria-label="Accesos rápidos"/.test(HTML));
  ok("cada casilla tiene rol, Tab, nombre, estado y número de atajo", /function hotCellAttrs\(d, i, v\)/.test(fn) &&
    /role="button" tabindex="0" aria-label=/.test(fn) && /aria-pressed=/.test(fn) && /aria-keyshortcuts=/.test(fn));
  ok("el foco sólo se restaura en escritorio", /function hotbarSlotEnFoco/.test(fn) && /function enfocarHotbarPc/.test(fn) && /window\.innerWidth <= 640/.test(fn));
  ok("el listener reutiliza la misma puerta segura de Enter/Espacio", /activarAccionConTeclado\(c, seleccionar\)/.test(fn));
}

console.log("\nESPACIO ELIGE UNA CASILLA SIN INTERACTUAR EL MUNDO\n");
{
  const dom = new JSDOM('<!doctype html><div id="hotbar" role="group" aria-label="Accesos rápidos"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const avisos = [], mundo = [];
  const G = { hotbar: [{ kind: "res", key: "madera" }, null, null, null, null, null, null, null, null, null], hotSel: 1,
    picks: { owned: {}, eq: null }, res: {}, seeds: {}, fish: {}, dishes: {}, planos: {} };
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, dndActive: false, G,
    $: id => dom.window.document.getElementById(id), ensureHotbarDefaults() {}, syncSlots() {}, enZona: () => false,
    llevoTengo: () => 1, fmt: n => String(n), itemView: d => ({ label: d.kind === "res" ? "Madera" : d.key }), itemIcon: () => "<span>🌲</span>", durBar: () => "",
    toolLost: () => false, bindZoneDnD() {}, toast: texto => avisos.push(texto), escapeHtml: texto => String(texto).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniHotbar, finHotbar), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.refreshHotbar(true);

  const box = dom.window.document.getElementById("hotbar");
  const celdas = [...box.querySelectorAll("[data-slot]")];
  ok("las diez casillas son alcanzables y nombran tanto objeto como hueco", celdas.length === 10 && celdas.every(c => c.getAttribute("role") === "button" && c.tabIndex === 0) &&
    /Atajo 1: Madera/.test(celdas[0].getAttribute("aria-label") || "") && /Atajo 2: Hueco vacío \(seleccionado\)/.test(celdas[1].getAttribute("aria-label") || "") &&
    celdas[0].getAttribute("aria-keyshortcuts") === "1" && celdas[9].getAttribute("aria-keyshortcuts") === "0");

  const origen = celdas[0];
  origen.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  origen.dispatchEvent(espacio);
  const reemplazo = box.querySelector('[data-slot="0"]');
  ok("Espacio usa la selección habitual, cancela scroll y no llega al mundo", G.hotSel === 0 && espacio.defaultPrevented && mundo.length === 0 && /Madera/.test(avisos[0] || ""));
  ok("el redibujo conserva la posición enfocada en PC", reemplazo !== origen && dom.window.document.activeElement === reemplazo && reemplazo.getAttribute("aria-pressed") === "true");

  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  reemplazo.dispatchEvent(repetida);
  ok("mantener Enter no repite la selección ni se filtra al mundo", G.hotSel === 0 && repetida.defaultPrevented && mundo.length === 0 && avisos.length === 1);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarHotbarPc({ querySelector: () => ({ focus() { focosMovil++; } }) }, "0");
  ok("móvil no recibe foco programático al repintar", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la hotbar de PC conserva sus atajos y ahora también se puede recorrer sin mouse.\n");
process.exit(fallos ? 1 : 0);
