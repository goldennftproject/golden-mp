/* COBERTIZO: ELEGIR UNA PIEZA PARA COLOCAR NO DEPENDE DEL MOUSE
   Las piezas del Cobertizo cierran el panel y entran intencionalmente al modo de colocación. La
   prueba protege que Enter/Espacio hagan esa misma transición sin que el juego reciba la tecla.
     node tools/test-cobertizo-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniCobertizo = UI.indexOf("function refreshCobertizo()");
const finCobertizo = UI.indexOf("function invCellClick", iniCobertizo);
if (iniAccion < 0 || finAccion < 0 || iniCobertizo < 0 || finCobertizo < 0) throw new Error("No encontré el Cobertizo o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLAS PIEZAS EXPLICAN QUE SE VAN A COLOCAR\n");
{
  const fn = UI.slice(iniCobertizo, finCobertizo);
  ok("cada pieza real es un botón alcanzable y con acción nombrada", /data-cob="' \+ i \+ '" role="button" tabindex="0" aria-label=/.test(fn) && /Colocar " \+ v\.label \+ " en la granja/.test(fn));
  ok("el título visual también dice qué ocurrirá", /elegir dónde colocarlo/.test(fn));
  ok("sólo PC agrega cursor y realce de hover", /@media\(min-width:641px\)\{#cob-slots \[data-cob\]\{cursor:pointer\}/.test(HTML));
  ok("la explicación inicial no presupone un gesto táctil", /Elegí una pieza para decidir dónde va/.test(HTML));
  ok("el handler reutiliza Enter/Espacio", /activarAccionConTeclado\(c, colocar\)/.test(fn));
}

console.log("\nENTER Y ESPACIO ENTRAN AL MISMO MODO DE COLOCACIÓN\n");
{
  const dom = new JSDOM('<!doctype html><div id="cob-slots"></div><div id="cob-pie"></div><b id="gm-cob"></b>', { pretendToBeVisual: true });
  const colocaciones = [], cierres = [], mundo = [];
  dom.window.farmScene = { iniciarColocar: (...args) => colocaciones.push(args) };
  const items = [{ kind: "plano", key: "casa" }];
  const ctx = {
    window: dom.window, document: dom.window.document, String, Array, G: {}, DECO_MAX: 20,
    $: id => dom.window.document.getElementById(id), cobertizoItems: () => items, cobertizoCuenta: () => items.length, decoPuestos: () => 2,
    itemView: () => ({ label: "Casa de madera" }), itemIcon: () => "<span>🏠</span>", escapeHtml: s => String(s),
    closeAllOv: () => cierres.push("cerrar"), toast() {}, isOpen: () => false, log() {},
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniCobertizo, finCobertizo), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.refreshCobertizo();
  const pieza = dom.window.document.querySelector("[data-cob]");
  ok("la pieza se anuncia como colocar Casa de madera", pieza.getAttribute("role") === "button" && pieza.tabIndex === 0 && pieza.getAttribute("aria-label") === "Colocar Casa de madera en la granja" && /elegir dónde colocarlo/.test(pieza.title));

  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  pieza.dispatchEvent(enter);
  ok("Enter inicia la misma colocación de plano y no llega al mundo", enter.defaultPrevented && mundo.length === 0 && cierres.length === 1 && colocaciones.length === 1 && colocaciones[0][0] === "obra" && colocaciones[0][1] === "casa");

  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  pieza.dispatchEvent(espacio);
  ok("Espacio usa la misma acción y evita scroll", espacio.defaultPrevented && mundo.length === 0 && cierres.length === 2 && colocaciones.length === 2);

  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  pieza.dispatchEvent(repetida);
  ok("mantener Enter no inicia una tercera colocación", repetida.defaultPrevented && mundo.length === 0 && colocaciones.length === 2);

  items.length = 0; ctx.refreshCobertizo();
  ok("el estado vacío no inventa una parada de Tab", dom.window.document.querySelectorAll("[data-cob]").length === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el Cobertizo deja claro qué se coloca y funciona con mouse o teclado.\n");
process.exit(fallos ? 1 : 0);
