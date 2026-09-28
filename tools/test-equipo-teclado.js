/* EQUIPO: ARMA Y MUNICIÓN RESPONDEN IGUAL CON MOUSE O TECLADO
   Dentro de Equipo sólo estas dos ranuras cambian algo; las demás son lectura. Las dos deben
   anunciar la acción, dejarse alcanzar con Tab y usar Enter/Espacio sin activar el mundo.
     node tools/test-equipo-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniEquipo = UI.indexOf("function refreshEquip()");
const finEquipo = UI.indexOf("function refreshDaily", iniEquipo);
if (iniAccion < 0 || finAccion < 0 || iniEquipo < 0 || finEquipo < 0) throw new Error("No encontré Equipo o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nSÓLO LAS RANURAS QUE ACTÚAN SE PRESENTAN COMO BOTONES\n");
{
  const fn = UI.slice(iniEquipo, finEquipo);
  ok("arma y munición reciben rol y Tab", /id="eq-arma" role="button" tabindex="0"/.test(HTML) && /id="eq-municion" role="button" tabindex="0"/.test(HTML));
  ok("casco y escudo informativos no se convierten por error en botones", !/id="eq-casco" role="button"/.test(HTML) && !/id="eq-escudo" role="button"/.test(HTML));
  ok("la etiqueta dinámica explica la decisión y munición expone su estado", /armaEl\.setAttribute\("aria-label"/.test(fn) && /munEl\.setAttribute\("aria-label"/.test(fn) && /aria-pressed/.test(fn));
  ok("PC distingue visualmente las dos ranuras accionables", /@media\(min-width:641px\)\{#eq-arma,#eq-municion\{cursor:pointer\}/.test(HTML));
  ok("ambas usan la misma puerta de Enter/Espacio", /activarAccionConTeclado\(armaEl, cambiarArma\)/.test(fn) && /activarAccionConTeclado\(munEl, cambiarMunicion\)/.test(fn));
}

console.log("\nENTER Y ESPACIO CONSERVAN LA ACCIÓN Y EL FOCO\n");
{
  const dom = new JSDOM(`<!doctype html>
    <div id="eq-grid"></div><div id="eq-def"></div>
    <div id="eq-casco"></div><div id="eq-armadura"></div><div id="eq-botas"></div><div id="eq-escudo"></div>
    <div id="eq-pantalones"></div><div id="eq-guantes"></div>
    <div id="eq-arma" role="button" tabindex="0"></div><div id="eq-municion" role="button" tabindex="0" aria-pressed="false"></div>`, { pretendToBeVisual: true });
  const avisos = [], mundo = [], tutorial = [];
  const G = { gear: { arma: null, municion: null, casco: null, armadura: null, botas: null, escudo: null }, armorEq: null };
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, G,
    $: id => dom.window.document.getElementById(id), GF: { spr: s => "/sprites/" + s + ".png" },
    GEAR_DEF: {}, ARM_DEF: { sword: { label: "Espada", sprite: "sword", tipo: "espada" } }, ARM_TIPO_DEF: {},
    ARMOR_SETS: {}, ARMOR_ORDER: [], ARMOR_SLOTS: [], ARMOR_SLOT_LABEL: { guantes: "Guantes", pantalones: "Pantalones" },
    armorTiene: () => false, armorPuestas: () => 0, armorEquipado: () => false, armorSetCompleto: () => false,
    gearDefTotal: () => 0, fmt: n => String(n), llevoTengo: () => 3, armasAMano: () => ["sword"], enZona: () => false,
    toast: texto => avisos.push(texto), tutoEvent: paso => tutorial.push(paso), syncSlots() {}, saveFarm() {}, refreshHud() {},
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniEquipo, finEquipo), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.refreshEquip();

  const arma = dom.window.document.getElementById("eq-arma"), municion = dom.window.document.getElementById("eq-municion");
  ok("las etiquetas iniciales cuentan qué hará cada ranura", arma.getAttribute("aria-label") === "Equipar arma" && municion.getAttribute("aria-label") === "Equipar munición: 3 flechas" && municion.getAttribute("aria-pressed") === "false");

  arma.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  arma.dispatchEvent(enter);
  ok("Enter equipa el arma, no llega al mundo y conserva el foco", G.gear.arma === "sword" && enter.defaultPrevented && mundo.length === 0 &&
    dom.window.document.activeElement === arma && /Espada equipada\. Cambiar arma/.test(arma.getAttribute("aria-label") || "") && tutorial[0] === "equiparm");

  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  arma.dispatchEvent(repetida);
  ok("mantener Enter no vuelve a ciclar el arma", G.gear.arma === "sword" && repetida.defaultPrevented && mundo.length === 0 && avisos.length === 1);

  municion.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  municion.dispatchEvent(espacio);
  ok("Espacio equipa las flechas sin filtrarse al mundo", G.gear.municion === true && espacio.defaultPrevented && mundo.length === 0 &&
    dom.window.document.activeElement === municion && municion.getAttribute("aria-pressed") === "true" && /3 flechas equipadas/.test(municion.getAttribute("aria-label") || ""));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: las decisiones activas de Equipo funcionan con mouse, Tab y teclado.\n");
process.exit(fallos ? 1 : 0);
