/* MUELLE DE COMBATE: CONTROLES RÁPIDOS DE ESCRITORIO
   El muñeco de la Zona no detiene el juego: es un muelle persistente. Por eso su acceso a
   Equipo y las casillas que de verdad pueden mover una pieza tienen que funcionar por Tab,
   Enter/Espacio y conservar el foco tras redibujarse. Móvil mantiene su toque compacto.
     node tools/test-muelle-combate-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniCombate = UI.indexOf("function enfocarControlCombate");
const finCombate = UI.indexOf("function refreshMorral", iniCombate);
if (iniAccion < 0 || finAccion < 0 || iniCombate < 0 || finCombate < 0) {
  throw new Error("No encontré las acciones de teclado del muelle de combate");
}

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL MUELLE SEPARA EQUIPO DE LAS CASILLAS RÁPIDAS\n");
{
  const fn = UI.slice(iniCombate, finCombate);
  ok("Equipo es un botón nativo explícito", /<button class="cb-def cb-eq-open" id="cb-eq-open"/.test(fn));
  ok("el muñeco de escritorio no queda como un botón que contiene otros botones",
    /window\.innerWidth <= 640 && eq\) eq\.onclick = abrirEquipo/.test(fn));
  ok("una casilla sólo entra en Tab si puede mover una pieza", /movible \? ' role="button" tabindex="0" aria-label="'/.test(fn));
  ok("PC muestra el acceso separado y móvil conserva el muñeco compacto",
    /@media\(min-width:641px\)\{\.cb-doll\{cursor:default\}\.cb-eq-open\{display:block\}\}/.test(HTML) &&
    /@media\(max-width:640px\)\{\.cb-eq-open\{display:none\}\}/.test(HTML));
}

console.log("\nTAB, ENTER Y ESPACIO MUEVEN UNA PIEZA SIN FILTRARSE AL MUNDO\n");
{
  const dom = new JSDOM('<!doctype html><div id="combate"></div><div id="morral"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const abiertas = [], avisos = [], mundo = [];
  const G = { gear: { casco: "casco_cuero", armadura: null, botas: null, escudo: null, arma: null, municion: null }, weapons: {}, res: {}, modoPelea: "perseguir", armorEq: null };
  const GF = { scene: "forest", spr: nombre => "/sprites/" + nombre + ".png" };
  dom.window.GF = GF;
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array,
    G, GF, $: id => dom.window.document.getElementById(id),
    GEAR_DEF: { casco_cuero: { label: "Casco de cuero", def: 2, sprite: "casco_cuero" } },
    ARM_DEF: {}, ARM_TIPO_DEF: {}, ARMOR_SLOTS: [], ARMOR_SETS: {}, ARMOR_DUR_MAX: 100, ARMOR_SLOT_LABEL: {},
    escapeHtml: v => String(v), fmt: v => String(v), durArmaHtml: () => "",
    gearDefTotal: () => G.gear.casco ? 2 : 0,
    gearAMano: slot => !G.gear[slot] && slot === "casco" ? ["casco_cuero"] : [],
    gearGuardar: slot => { G.gear[slot] = null; return true; },
    gearPonerse: clave => { G.gear.casco = clave; return true; },
    modoPelea: () => G.modoPelea,
    modoPeleaSet: modo => { G.modoPelea = modo; ctx.refreshCombate(); },
    llevoTengo: () => 0, ubicarMuelleCombatePC() {}, refreshMorral() {}, refreshHud() {},
    isOpen: () => false, saveFarm() {}, toast: txt => avisos.push(txt), openOv: id => abiertas.push(id),
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniCombate, finCombate), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.refreshCombate();

  const caja = dom.window.document.getElementById("combate");
  const casco = caja.querySelector('[data-gslot="casco"]');
  const inactivas = ["armadura", "botas", "escudo"].map(slot => caja.querySelector('[data-gslot="' + slot + '"]'));
  ok("sólo la casilla que puede actuar es parada de Tab", casco.getAttribute("role") === "button" && casco.tabIndex === 0 &&
    /Guardar Casco de cuero/.test(casco.getAttribute("aria-label") || "") && inactivas.every(el => !el.getAttribute("role") && el.tabIndex < 0));
  ok("el botón Equipo abre el panel de siempre", caja.querySelector("#cb-eq-open").tagName === "BUTTON" && (caja.querySelector("#cb-eq-open").click(), abiertas.length === 1 && abiertas[0] === "ov-equip"));

  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  casco.dispatchEvent(repetida);
  ok("mantener Enter no guarda la pieza dos veces", G.gear.casco === "casco_cuero" && mundo.length === 0);

  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  casco.dispatchEvent(espacio);
  const cascoNuevo = caja.querySelector('[data-gslot="casco"]');
  ok("Espacio guarda la pieza, evita scroll y no llega al mundo", G.gear.casco === null && espacio.defaultPrevented && mundo.length === 0 && /Casco de cuero al contenedor/.test(avisos[0] || ""));
  ok("después del redibujo el foco vuelve a la misma casilla equivalente", dom.window.document.activeElement === cascoNuevo && cascoNuevo.getAttribute("role") === "button");

  const parado = caja.querySelector('[data-modo="parado"]');
  parado.click();
  ok("al cambiar de modo el foco no se pierde con el redibujo", G.modoPelea === "parado" && dom.window.document.activeElement === caja.querySelector('[data-modo="parado"]'));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el muelle de combate de PC responde con mouse y teclado sin interrumpir el juego.\n");
process.exit(fallos ? 1 : 0);
