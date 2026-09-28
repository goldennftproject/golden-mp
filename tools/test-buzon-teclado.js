/* BUZÓN: LOS SOBRES NUEVOS NO DEPENDEN DEL MOUSE
   Un sobre nuevo entra al recorrido de Tab, Enter/Espacio lo abre una sola vez y, después de la
   animación, el foco pasa a la decisión visible de la carta.
     node tools/test-buzon-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniBuzon = UI.indexOf("function enfocarAccionCartaBuzonPc");
const finBuzon = UI.indexOf("function refreshSeedShop", iniBuzon);
if (iniAccion < 0 || finAccion < 0 || iniBuzon < 0 || finBuzon < 0) throw new Error("No encontré el Buzón o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLOS SOBRES NUEVOS EXPLICAN QUE ABREN UNA CARTA\n");
{
  const fn = UI.slice(iniBuzon, finBuzon);
  ok("cada sobre nuevo es un botón alcanzable y con nombre", /data-bz-idx=.*role=\"button\" tabindex=\"0\" aria-label/.test(fn) && /Abrir carta de/.test(fn));
  ok("la imagen decorativa no duplica el nombre del sobre", /sobre_carta\.png\?v=1\" alt=\"\"/.test(fn));
  ok("Enter/Espacio pasan por la puerta común", /activarAccionConTeclado\(el, abrir\)/.test(fn));
  ok("la carta continúa el foco sólo al abrir desde teclado", /function enfocarAccionCartaBuzonPc/.test(fn) && /if \(desdeTeclado\) enfocarAccionCartaBuzonPc\(carta\)/.test(fn) && /window\.innerWidth <= 640/.test(fn));
  ok("el doble evento pointer/click no programa dos aperturas", /let abriendo = false/.test(fn) && /if \(abriendo\) return/.test(fn));
}

console.log("\nENTER Y ESPACIO ABREN UNA CARTA Y DEJAN SU PRÓXIMA ACCIÓN EN FOCO\n");
{
  const dom = new JSDOM('<!doctype html><div id="ov-buzon" class="show"><img id="bz-img"><div id="bz-sobres"></div><div id="bz-carta"></div><div id="bz-pila"></div><div id="bz-estado"></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const timers = [], mundo = [];
  let cartas = [{ id: "bienvenida", de: "Mara", titulo: "Bienvenida", txt: "Una carta.", panel: "ov-market", btn: "Ver tienda" }];
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { buzonArchivo: [] }, _bzVista: "sobres", _bzCartaAbierta: null, $: id => dom.window.document.getElementById(id),
    buzonCartas: () => cartas, dayStamp: () => "2026-09-27", escapeHtml: s => String(s),
    setTimeout: fn => { timers.push(fn); return timers.length; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniBuzon, finBuzon), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.refreshBuzon();
  let sobre = dom.window.document.querySelector("[data-bz-idx]");
  ok("el sobre se alcanza por Tab y nombra a quien escribe", sobre.getAttribute("role") === "button" && sobre.tabIndex === 0 && sobre.getAttribute("aria-label") === "Abrir carta de Mara" && sobre.querySelector("img").getAttribute("alt") === "");

  sobre.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  sobre.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  sobre.dispatchEvent(repetida);
  ok("Enter abre una vez, bloquea repetición y no llega al mundo", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && timers.length === 1);
  timers.shift()();
  let accion = dom.window.document.querySelector("[data-bz-acc]");
  ok("al desplegar carta con acción, el foco llega a esa acción", !!accion && dom.window.document.activeElement === accion);

  cartas = [{ id: "nota", de: "Lía", titulo: "Nota", txt: "Sin panel." }];
  vm.runInContext('_bzVista = "sobres"; _bzCartaAbierta = null;', ctx);
  ctx.refreshBuzon();
  sobre = dom.window.document.querySelector("[data-bz-idx]");
  sobre.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  sobre.dispatchEvent(espacio);
  ok("Espacio usa la misma apertura y evita scroll", espacio.defaultPrevented && mundo.length === 0 && timers.length === 1);
  timers.shift()();
  accion = dom.window.document.querySelector("[data-bz-leida]");
  ok("sin panel, el foco continúa en “Leída”", !!accion && dom.window.document.activeElement === accion);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarAccionCartaBuzonPc({ querySelector() { return { focus() { focosMovil++; } }; } });
  ok("móvil no recibe foco programático al abrir", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: los sobres nuevos del Buzón se abren con mouse o teclado y continúan en su carta.\n");
process.exit(fallos ? 1 : 0);
