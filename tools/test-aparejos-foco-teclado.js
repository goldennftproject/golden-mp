/* APAREJOS: R ABRE UNA GESTIÓN LISTA PARA RECORRER CON TAB
   Al llegar desde teclado, el cebo puesto recibe foco; si no hay cebo utilizable, lo recibe la
   salida. El clic derecho previo y móvil no ganan un foco impuesto.
     node tools/test-aparejos-foco-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const ini = UI.indexOf("function enfocarAparejosPc");
const fin = UI.indexOf("function pescaAparejosCerrar", ini);
if (ini < 0 || fin < 0) throw new Error("No encontré la apertura de Aparejos");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nR LLEGA A UN CONTROL VISIBLE DE APAREJOS\n");
{
  const tramo = UI.slice(ini, fin);
  ok("la entrada busca primero el cebo equipado y luego una salida", /classList\.contains\("puesto"\)/.test(tramo) && /\[data-p4cebo\]/.test(tramo) && /#p4-cerrar/.test(tramo));
  ok("el foco se pide sólo desde la entrada de teclado y sólo en PC", /function pescaAparejosAbrir\(desdeTeclado\)/.test(tramo) && /if \(desdeTeclado\) enfocarAparejosPc\(el\)/.test(tramo) && /window\.innerWidth <= 640/.test(tramo));
  ok("la escena manda el origen de teclado al abrir", /pescaAparejosAbrir\(true\)/.test(FARM));
}

console.log("\nEL FOCO NO QUEDA EN EL AGUA CUANDO SE ABRE CON R\n");
{
  const dom = new JSDOM('<!doctype html><button id="antes">Antes</button><div id="pesca4"><button id="p4-cerrar">✕</button><div id="p4-cebos"></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const ctx = {
    window: dom.window, document: dom.window.document, Array, Object, String, console,
    GF: {}, $: id => dom.window.document.getElementById(id), hayOvPcAbierto: () => false, toast() {}, placePescaAparejosPc() {}
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  ctx.pescaV4Pintar = () => { dom.window.document.getElementById("p4-cebos").innerHTML = '<button data-p4cebo="lombriz" class="puesto">Lombriz</button><button data-p4cebo="larva">Larva</button>'; };
  ctx.pescaAparejosCerrar = () => { dom.window.document.getElementById("pesca4").classList.remove("show"); ctx.GF.uiOpen = false; };
  ctx.pescaAparejosAbrir(true);
  let panel = dom.window.document.getElementById("pesca4");
  ok("en PC R muestra el panel y enfoca el cebo puesto", panel.classList.contains("show") && ctx.GF.uiOpen === true && dom.window.document.activeElement === panel.querySelector('[data-p4cebo="lombriz"]'));

  panel.classList.remove("show");
  ctx.pescaV4Pintar = () => { dom.window.document.getElementById("p4-cebos").innerHTML = ""; };
  ctx.pescaAparejosAbrir(true);
  ok("sin cebos visibles, el cierre queda como salida segura", dom.window.document.activeElement === dom.window.document.getElementById("p4-cerrar"));

  const antes = dom.window.document.getElementById("antes");
  antes.focus(); panel.classList.remove("show");
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  ctx.pescaAparejosAbrir(true);
  ok("móvil conserva su apertura sin foco programático", dom.window.document.activeElement === antes);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: Aparejos continúa el teclado de PC sin modificar móvil ni el clic derecho.\n");
process.exit(fallos ? 1 : 0);
