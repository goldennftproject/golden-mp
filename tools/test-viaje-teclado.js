/* LA PUERTA DE LA ZONA TAMBIÉN SE USA CON TECLADO (PC)
   Las pilas de viaje son divs para que la cuadrícula de objetos no cambie, pero no pueden quedar
   como una isla exclusiva del mouse: Tab debe llegar, Enter/Espacio deben ejecutar la misma
   acción, y el refresco no debe perder el foco al sustituir el HTML.
   node tools/test-viaje-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const desde = (nombre) => UI.indexOf("function " + nombre + "(");
const cuerpo = (nombre, hasta) => {
  const ini = desde(nombre), fin = UI.indexOf(hasta, ini);
  return ini >= 0 && fin > ini ? UI.slice(ini, fin) : "";
};

const iniAttrs = desde("viajeAccionAttr"), finAttrs = desde("refreshViaje");
const iniAyudas = desde("activarAccionConTeclado"), finAyudas = desde("engancharViaje");
if (iniAttrs < 0 || finAttrs < 0 || iniAyudas < 0 || finAyudas < 0) throw new Error("No encontré las ayudas de teclado de viaje");
const ctx = { window: { innerWidth: 1280 }, Array, String,
  escapeHtml(s) { return String(s).replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },
};
vm.createContext(ctx);
vm.runInContext(UI.slice(iniAttrs, finAttrs), ctx);
vm.runInContext(UI.slice(iniAyudas, finAyudas), ctx);

function celda(dataset) {
  const oyentes = {};
  return {
    dataset: dataset || {},
    addEventListener(tipo, fn) { oyentes[tipo] = fn; },
    emitir(tipo, e) { oyentes[tipo](e); },
  };
}
function tecla(key, extra) {
  let prevenido = 0, detenido = 0;
  return Object.assign({ key, repeat: false, shiftKey: false,
    preventDefault() { prevenido++; }, stopPropagation() { detenido++; },
    resultado() { return { prevenido, detenido }; },
  }, extra || {});
}
function foco(dataset) {
  const llamadas = [];
  return { dataset: dataset || {}, focus(opciones) { llamadas.push(opciones || null); }, llamadas };
}
/* Esta parte usa DOM real: no alcanza con mirar que el manejador esté escrito; el evento tiene
   que atravesar el elemento, repintar la puerta y terminar con el foco en un nodo nuevo. */
function puertaDom() {
  const dom = new JSDOM('<!doctype html><div id="viaje-cuerpo"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { value: 1280, configurable: true });
  const documento = dom.window.document, cuerpo = documento.getElementById("viaje-cuerpo");
  let vista = "inicio";
  const movimientos = [];
  const pintar = () => {
    if (vista === "movida") {
      cuerpo.innerHTML = '<div id="destino" class="vj-s" draggable="true" data-vbaja="res|flecha" role="button" tabindex="0"></div><button id="vj-cerrar"></button><button id="vj-entrar"></button>';
      return;
    }
    if (vista === "sinBolsa") {
      cuerpo.innerHTML = '<button id="vj-cerrar"></button><button id="vj-entrar"></button>';
      return;
    }
    if (vista === "contenedor") {
      cuerpo.innerHTML = '<div id="contenedor-nuevo" class="vj-cont" data-vcont="backpack" role="button" tabindex="0"></div><button id="vj-cerrar"></button><button id="vj-entrar"></button>';
      return;
    }
    cuerpo.innerHTML = '<div id="contenedor" class="vj-cont" data-vcont="backpack" role="button" tabindex="0"></div>' +
      '<div id="subir" class="vj-s" draggable="true" data-vsube="res|flecha" role="button" tabindex="0"></div>' +
      '<div id="bolsa" class="vj-s bolsa" data-vbolsa="0" role="button" tabindex="0"></div>' +
      '<button id="vj-cerrar"></button><button id="vj-entrar"></button>';
  };
  const juego = {
    window: dom.window, document: documento, Array, String, dndActive: false,
    $(id) { return documento.getElementById(id); },
    refreshViaje: pintar, refreshHud() {}, syncSlots() {},
    viajeElegir() { vista = "contenedor"; return true; },
    viajeTengo() { return 3; }, contContar() { return 3; }, contLlevado() { return {}; },
    viajeCargar(kind, key, n) { movimientos.push({ kind, key, n }); vista = "movida"; return true; },
    viajeBajar() { vista = "movida"; return true; },
    viajeBajarBolsa() { vista = "sinBolsa"; return true; },
    itemView() { return { label: "Flechas" }; }, viajeNombre(v, k) { return (v && v.label) || k; },
    pedirCuanto() {}, closeOv() {}, viajeSoltar() {}, desenfocarAlCerrar() {}, viajeEntrar() {},
  };
  vm.createContext(juego);
  vm.runInContext(UI.slice(iniAyudas, desde("refreshRecientes")), juego);
  pintar(); juego.engancharViaje(cuerpo);
  return { dom, documento, juego, movimientos };
}

console.log("\nLAS CASILLAS DINÁMICAS CONSERVAN SEMÁNTICA DE BOTÓN");
{
  const attrs = ctx.viajeAccionAttr ? ctx.viajeAccionAttr("vsube", "res|flecha", 'Pasar "Flecha"') : "";
  ok("un atributo de viaje incluye dato, rol y tabulación", /data-vsube="res\|flecha"/.test(attrs) && /role="button"/.test(attrs) && /tabindex="0"/.test(attrs));
  ok("el nombre accesible se escapa antes de entrar al HTML", /aria-label="Pasar &quot;Flecha&quot;"/.test(attrs));
  const pinta = cuerpo("refreshViaje", "/* el nombre pelado");
  ["vcont", "vsube", "vbaja", "vbolsa"].forEach(dato =>
    ok("la salida " + dato + " se vuelve alcanzable", pinta.includes('viajeAccionAttr("' + dato + '"')));
  ok("su foco visible usa el mismo anillo que los botones", /\[role=button\]:focus-visible/.test(HTML));
}

console.log("\nENTER Y ESPACIO ACTIVAN SÓLO LA CASILLA ENFOCADA");
{
  const b = celda({}), llamadas = [];
  ctx.activarAccionConTeclado(b, e => llamadas.push(!!e.shiftKey));
  const enter = tecla("Enter", { shiftKey: true }); b.emitir("keydown", enter);
  ok("Enter replica la acción y conserva Shift", llamadas.length === 1 && llamadas[0] === true);
  ok("Enter no deja que el gesto llegue al mundo", enter.resultado().prevenido === 1 && enter.resultado().detenido === 1);
  const espacio = tecla(" "); b.emitir("keydown", espacio);
  ok("Espacio también replica la acción", llamadas.length === 2);
  const repetida = tecla("Enter", { repeat: true }); b.emitir("keydown", repetida);
  ok("mantener una tecla no abre dos veces el selector ni se filtra al mundo", llamadas.length === 2 && repetida.resultado().prevenido === 1 && repetida.resultado().detenido === 1);
  const ajena = tecla("e"); b.emitir("keydown", ajena);
  ok("las demás teclas siguen siendo del juego", llamadas.length === 2 && ajena.resultado().detenido === 0);
}

console.log("\nREPINTAR DEVUELVE EL FOCO A UNA ACCIÓN ÚTIL");
{
  const misma = foco({ vsube: "res|flecha" }), contraparte = foco({ vbaja: "res|flecha" }), entrar = foco({});
  const caja = {
    querySelectorAll(sel) { return sel === "[data-vsube]" ? [misma] : sel === "[data-vbaja]" ? [contraparte] : []; },
    querySelector(sel) { return sel === "#vj-entrar" ? entrar : null; },
  };
  ctx.window.innerWidth = 1280;
  ctx.enfocarAccionViaje(caja, [["vsube", "res|flecha"], ["vbaja", "res|flecha"]]);
  ok("si la pila sigue, vuelve a la misma", misma.llamadas.length === 1 && contraparte.llamadas.length === 0);

  const soloDestino = foco({ vbaja: "res|flecha" }), entrarDos = foco({});
  const cajaSinOrigen = {
    querySelectorAll(sel) { return sel === "[data-vbaja]" ? [soloDestino] : []; },
    querySelector(sel) { return sel === "#vj-entrar" ? entrarDos : null; },
  };
  ctx.enfocarAccionViaje(cajaSinOrigen, [["vsube", "res|flecha"], ["vbaja", "res|flecha"]]);
  ok("si se movió toda, continúa en su contraparte", soloDestino.llamadas.length === 1);

  const entrarSolo = foco({});
  const cajaVacia = { querySelectorAll() { return []; }, querySelector(sel) { return sel === "#vj-entrar" ? entrarSolo : null; } };
  ctx.enfocarAccionViaje(cajaVacia, [["vsube", "res|flecha"]]);
  ok("sin pila equivalente, cae en Entrar", entrarSolo.llamadas.length === 1);

  ctx.window.innerWidth = 640;
  const movil = foco({ vsube: "res|flecha" });
  ctx.enfocarAccionViaje({ querySelectorAll() { return [movil]; }, querySelector() { return null; } }, [["vsube", "res|flecha"]]);
  ok("móvil no recibe foco programático", movil.llamadas.length === 0);
}

console.log("\nEN EL DOM REAL, LA ACCIÓN NO SE FILTRA A PHASER");
{
  const puerta = puertaDom(), mundo = [];
  puerta.dom.window.addEventListener("keydown", e => mundo.push(e.key));
  const espacio = new puerta.dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true, shiftKey: true });
  puerta.documento.getElementById("subir").dispatchEvent(espacio);
  ok("Shift + Espacio mueve toda la pila real", puerta.movimientos.length === 1 && puerta.movimientos[0].n === 3 && puerta.movimientos[0].key === "flecha");
  ok("el gesto real cancela scroll y no llega al mundo", espacio.defaultPrevented && mundo.length === 0);
  ok("tras mover toda la pila, enfoca su nuevo destino", puerta.documento.activeElement === puerta.documento.getElementById("destino"));

  const conContenedor = puertaDom();
  conContenedor.documento.getElementById("contenedor").dispatchEvent(new conContenedor.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  ok("Enter elige el contenedor y enfoca su versión repintada", conContenedor.documento.activeElement === conContenedor.documento.getElementById("contenedor-nuevo"));

  const conBolsa = puertaDom();
  conBolsa.documento.getElementById("bolsa").dispatchEvent(new conBolsa.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  ok("si una bolsa desaparece, el foco cae en Entrar", conBolsa.documento.activeElement === conBolsa.documento.getElementById("vj-entrar"));
}

console.log("\nLA PUERTA ENLAZA EL TECLADO CON CADA ACCIÓN EXISTENTE");
{
  const puerta = cuerpo("engancharViaje", "function refreshRecientes");
  ok("elegir contenedor tiene el mismo enlace", /activarAccionConTeclado\(b, elegir\)/.test(puerta));
  ok("subir y bajar pilas lo reciben", /activarAccionConTeclado\(b, subir\)/.test(puerta) && /activarAccionConTeclado\(b, bajar\)/.test(puerta));
  ok("sacar una bolsa también lo recibe", /activarAccionConTeclado\(b, bajarBolsa\)/.test(puerta));
  ok("el repintado restaura foco después del HUD", /enfocarAccionViaje\(caja, preferencias\);/.test(puerta));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la puerta de la Zona se puede recorrer sin mouse.\n");
process.exit(fallos ? 1 : 0);
