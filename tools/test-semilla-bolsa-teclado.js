/* BOLSA: ELEGIR SEMILLA DESDE TECLADO
   Sólo las semillas que se pueden plantar entran a Tab. Enter/Espacio reutilizan la selección
   habitual y el foco vuelve a la casilla que el repintado acaba de reemplazar.
     node tools/test-semilla-bolsa-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniBolsa = UI.indexOf("function invCellHtml(");
const finBolsa = UI.indexOf("/* ---- barra de accesos directos", iniBolsa);
if (iniAccion < 0 || finAccion < 0 || iniBolsa < 0 || finBolsa < 0) throw new Error("No encontré la Bolsa o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nSÓLO UNA SEMILLA QUE SE PUEDE PLANTAR ES UN CONTROL\n");
{
  const fn = UI.slice(iniBolsa, finBolsa);
  ok("la semilla elegible tiene nombre, Tab y estado seleccionado", /data-inv-seed=\"1\" role=\"button\" tabindex=\"0\" aria-label/.test(fn) && /Seleccionar semilla de/.test(fn) && /aria-pressed/.test(fn));
  ok("la decisión conserva foco por índice sólo en PC", /function semillaEnFocoBolsa/.test(fn) && /function enfocarSemillaBolsaPc/.test(fn) && /window\.innerWidth <= 640/.test(fn));
  ok("la semilla usa la puerta común sin convertir toda la bolsa", /querySelectorAll\("\[data-inv-seed\]"\)/.test(fn) && /activarAccionConTeclado\(c, \(\) => invCellClick/.test(fn));
}

console.log("\nENTER Y ESPACIO ELIGEN LA SEMILLA SIN FILTRARSE AL MUNDO\n");
{
  const dom = new JSDOM('<!doctype html><div id="inv-slots"></div><div id="inv-cap"></div><div id="inv-selseed"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const mundo = [], selecciones = [], avisos = [];
  let desbloqueada = true;
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { slots: [{ kind: "seed", key: "papa" }, { kind: "res", key: "madera" }, null], res: { madera: 3 }, seeds: { papa: 4 }, fish: {}, dishes: {}, selSeed: null },
    $: id => dom.window.document.getElementById(id), ITEM_RES_ORDER: ["madera"], CROP_ORDER: ["papa"], RECIPE_ORDER: [], PICK_ORDER: [],
    CROP_DEF: { papa: { label: "Papa", lvl: 1 } }, invSlots: () => 3, pecesDeLaBolsa: () => [], chestsInBag: () => 0,
    toolCount: () => 0, pickCount: () => 0, canonicalStacks: () => ctx.G.slots.filter(Boolean), fmt: n => String(n),
    itemView: d => ({ label: d.kind === "seed" ? "Papa (semilla)" : "Madera" }), itemIcon: () => "<span>•</span>", durBar: () => "", pickEqCls: () => "", rarezaDe: () => null,
    cropUnlocked: () => desbloqueada, toast: s => avisos.push(s), enZona: () => false, isOpen: () => true, GF: { spr: s => s },
    syncSlots() {}, renderInvExpand() {}, bindZoneDnD() {}, bindALaBarra() {}, refreshHotbar() {}, escapeHtml: s => String(s), dndActive: false,
  };
  ctx.selectSeed = k => { selecciones.push(k); ctx.G.selSeed = k; ctx.refreshInv(); };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniBolsa, finBolsa), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.refreshInv();
  let semilla = dom.window.document.querySelector("[data-inv-seed]");
  const recurso = dom.window.document.querySelector('[data-slot="1"]');
  ok("la semilla se anuncia y el recurso no se vuelve un botón falso", semilla.getAttribute("role") === "button" && semilla.tabIndex === 0 && semilla.getAttribute("aria-label") === "Seleccionar semilla de Papa (semilla)" && semilla.getAttribute("aria-pressed") === "false" && recurso.getAttribute("role") === null && recurso.getAttribute("tabindex") === null);

  semilla.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  semilla.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  semilla.dispatchEvent(repetida);
  semilla = dom.window.document.querySelector("[data-inv-seed]");
  ok("Enter selecciona una vez, bloquea repetición y conserva su foco", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && selecciones.join(",") === "papa" && semilla.getAttribute("aria-pressed") === "true" && dom.window.document.activeElement === semilla);

  ctx.G.selSeed = null; ctx.refreshInv();
  semilla = dom.window.document.querySelector("[data-inv-seed]");
  semilla.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  semilla.dispatchEvent(espacio);
  semilla = dom.window.document.querySelector("[data-inv-seed]");
  ok("Espacio sigue la misma selección y evita scroll", espacio.defaultPrevented && mundo.length === 0 && selecciones.join(",") === "papa,papa" && dom.window.document.activeElement === semilla && avisos.length === 2);

  desbloqueada = false; ctx.refreshInv();
  const bloqueada = dom.window.document.querySelector('[data-slot="0"]');
  ok("una semilla bloqueada no inventa una parada de Tab", bloqueada.getAttribute("data-inv-seed") === null && bloqueada.getAttribute("role") === null && bloqueada.getAttribute("tabindex") === null);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarSemillaBolsaPc({ querySelector() { return { focus() { focosMovil++; } }; } }, 0);
  ok("móvil no recibe foco programático tras seleccionar", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la Bolsa deja elegir semillas con mouse o teclado sin llenar Tab de casillas sin acción.\n");
process.exit(fallos ? 1 : 0);
