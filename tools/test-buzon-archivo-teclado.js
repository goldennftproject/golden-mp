/* BUZÓN: ARCHIVO Y ACCIONES REALES TAMBIÉN SON USABLES SIN MOUSE
   La pila, el buzón que sólo conserva correo leído, la papelera y los botones de carta deben
   responder a Enter/Espacio, frenar el juego detrás y dejar un foco útil tras cada redibujo.
     node tools/test-buzon-archivo-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniBuzon = UI.indexOf("function enfocarAccionCartaBuzonPc");
const finBuzon = UI.indexOf("function refreshSeedShop", iniBuzon);
if (iniAccion < 0 || finAccion < 0 || iniBuzon < 0 || finBuzon < 0) throw new Error("No encontré la ruta de teclado del Buzón");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL ARCHIVO NO ESCONDE ACCIONES SÓLO DE RATÓN\n");
{
  const fn = UI.slice(iniBuzon, finBuzon);
  ok("pila y buzón sin correo nuevo se anuncian como acciones", /function activarEntradaBuzon/.test(fn) && /Abrir .*carta/.test(fn) && /activarEntradaBuzon\(img, "Abrir cartas leídas"/.test(fn));
  ok("las cartas archivadas dan nombre a la papelera", /data-bz-del=.*role="button" tabindex="0" aria-label/.test(fn) && /Borrar carta de/.test(fn));
  ok("las cuatro acciones pasan por la puerta común", /\[data-bz-acc\].*activarAccionConTeclado/.test(fn) && /\[data-bz-leida\].*activarAccionConTeclado/.test(fn) && /\[data-bz-del\].*activarAccionConTeclado/.test(fn) && /\[data-bz-volver\].*activarAccionConTeclado/.test(fn));
  ok("la pila lleva foco al contenido y borrar lo conserva", /function enfocarPilaBuzonPc/.test(fn) && /function enfocarBorradoBuzonPc/.test(fn) && /if \(desdeTeclado\) enfocarBorradoBuzonPc\(indice\)/.test(fn));
  ok("las miniaturas de papel son decorativas", /papel_carta\.png\?v=1" alt=""/.test(fn));
}

console.log("\nPILA, PAPELERA Y VOLVER MANTIENEN EL RECORRIDO EN PC\n");
{
  const dom = new JSDOM('<!doctype html><div id="ov-buzon" class="show"><img id="bz-img"><div id="bz-sobres"></div><div id="bz-carta"></div><div id="bz-pila"></div><div id="bz-estado"></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const mundo = [], leidas = [], aperturas = [], cierres = [];
  const cartas = [];
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { buzonArchivo: [
      { id: "nota-a", dia: "2026-09-26", de: "Lía", titulo: "Semillas", txt: "Guardá esto." },
      { id: "nota-b", dia: "2026-09-27", de: "Mara", titulo: "Cosecha", txt: "Otra nota." }
    ] },
    _bzVista: "sobres", _bzCartaAbierta: null, $: id => dom.window.document.getElementById(id),
    buzonCartas: () => cartas, dayStamp: () => "2026-09-28", escapeHtml: s => String(s),
    buzonLeer: id => { leidas.push(id); if (typeof ctx.refreshBuzon === "function") ctx.refreshBuzon(); },
    buzonBorrar: (id, dia) => { ctx.G.buzonArchivo = ctx.G.buzonArchivo.filter(a => !(a.id === id && a.dia === dia)); ctx.refreshBuzon(); },
    closeOv: id => cierres.push(id), openOv: id => aperturas.push(id)
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniBuzon, finBuzon), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.refreshBuzon();
  let pila = dom.window.document.getElementById("bz-pila");
  ok("la pila se alcanza, explica cuántas cartas abre y sus papeles no se leen dos veces", pila.getAttribute("role") === "button" && pila.tabIndex === 0 && /2 cartas leídas/.test(pila.getAttribute("aria-label")) && pila.querySelector("img").getAttribute("alt") === "");

  pila.focus();
  const enterPila = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  pila.dispatchEvent(enterPila);
  let carta = dom.window.document.getElementById("bz-carta");
  ok("Enter abre el archivo, bloquea el mundo y deja el contenido en foco", enterPila.defaultPrevented && mundo.length === 0 && ctx._bzVista === "pila" && carta.getAttribute("role") === "region" && dom.window.document.activeElement === carta);

  let borrar = dom.window.document.querySelector("[data-bz-del]");
  ok("cada papelera es una acción nominada", borrar.getAttribute("role") === "button" && borrar.tabIndex === 0 && /Borrar carta de/.test(borrar.getAttribute("aria-label")));
  borrar.focus();
  const espacioBorrar = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  borrar.dispatchEvent(espacioBorrar);
  borrar = dom.window.document.querySelector("[data-bz-del]");
  ok("Espacio borra una carta, no llega al mundo y continúa en la siguiente", espacioBorrar.defaultPrevented && mundo.length === 0 && ctx.G.buzonArchivo.length === 1 && dom.window.document.activeElement === borrar);

  const volver = dom.window.document.querySelector("[data-bz-volver]");
  volver.focus();
  const enterVolver = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  volver.dispatchEvent(enterVolver);
  pila = dom.window.document.getElementById("bz-pila");
  ok("Volver conserva la salida visible en foco", enterVolver.defaultPrevented && mundo.length === 0 && ctx._bzVista === "sobres" && dom.window.document.activeElement === pila);

  cartas.push({ id: "mercado", de: "Suren", titulo: "Mercado", txt: "Pasá a mirar.", panel: "ov-market", btn: "Ver mercado" });
  ctx.refreshBuzon();
  ctx._bzVista = "carta"; ctx._bzCartaAbierta = cartas[0]; ctx.refreshBuzon();
  const accion = dom.window.document.querySelector("[data-bz-acc]");
  accion.focus();
  const enterAccion = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  accion.dispatchEvent(enterAccion);
  ok("la acción principal de una carta también responde a Enter", enterAccion.defaultPrevented && mundo.length === 0 && leidas.length === 1 && cierres[0] === "ov-buzon" && aperturas[0] === "ov-market");

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarPilaBuzonPc({ focus() { focosMovil++; } });
  ok("móvil no recibe foco programático al abrir el archivo", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el archivo del Buzón funciona con mouse o teclado sin entregar acciones al juego detrás.\n");
process.exit(fallos ? 1 : 0);
