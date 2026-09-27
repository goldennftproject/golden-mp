/* UNA VENTANA MOVIDA SIGUE RECUPERABLE AL ACHICAR EL ESCRITORIO
   ===============================================================
   Las tarjetas no guardan su posición entre sesiones, pero el jugador puede arrastrarlas a un
   borde y luego reducir la ventana. El resize tiene que reencajarlas aunque no tengan saveKey;
   de otro modo Mercado, Inventario o Misiones pueden quedar sin borde ni botón de cierre.
     node tools/test-arrastre-panel-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("const DRAG_EXCLUDE = ");
const fin = UI.indexOf("// el aviso de interacción", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró makeHoldDrag");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function tarjeta({ left = "", top = "", width = 400, height = 250 } = {}) {
  const handlers = {};
  return {
    style: { left, top }, offsetWidth: width, offsetHeight: height,
    classList: { add() {}, remove() {} },
    addEventListener(tipo, fn) { handlers[tipo] = fn; },
    _handlers: handlers,
  };
}
function entorno(ancho, alto) {
  const listeners = {};
  const window = {
    innerWidth: ancho, innerHeight: alto,
    addEventListener(tipo, fn) { (listeners[tipo] ||= []).push(fn); },
  };
  const ctx = { window, Math, parseFloat, localStorage: { getItem: () => null, setItem() {} } };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  return { ctx, window, listeners };
}

console.log("\nUNA TARJETA DE OVERLAY SIN POSICIÓN PERSISTENTE SE REENCAJA\n");
{
  const e = entorno(1280, 720), card = tarjeta({ left: "1040px", top: "420px" });
  vm.runInContext("makeHoldDrag", e.ctx)(card); // así se inicializan las .ov .card reales
  ok("registra resize aunque no reciba saveKey", !!(e.listeners.resize && e.listeners.resize.length), String((e.listeners.resize || []).length));
  e.window.innerWidth = 700; e.window.innerHeight = 576;
  e.listeners.resize.forEach(fn => fn());
  ok("recupera el borde derecho tras achicar la ventana", card.style.left === "296px", card.style.left);
  ok("y conserva un margen visible bajo la tarjeta", card.style.top === "322px", card.style.top);
}

console.log("\nUNA TARJETA CENTRADA NO RECIBE UNA POSICIÓN FANTASMA\n");
{
  const e = entorno(700, 576), card = tarjeta();
  vm.runInContext("makeHoldDrag", e.ctx)(card);
  e.listeners.resize.forEach(fn => fn());
  ok("sin top inline no fuerza left/top", card.style.left === "" && card.style.top === "", JSON.stringify(card.style));
}

console.log("\nLA INICIALIZACIÓN REAL CUBRE TODAS LAS TARJETAS\n");
{
  ok("initUniversalDrag sigue usando makeHoldDrag para cada .ov .card sin saveKey",
    /document\.querySelectorAll\("\.ov \.card"\)\.forEach\(c => makeHoldDrag\(c\)\)/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: una ventana arrastrada no se pierde al cambiar el tamaño de PC.\n");
process.exit(fallos ? 1 : 0);
