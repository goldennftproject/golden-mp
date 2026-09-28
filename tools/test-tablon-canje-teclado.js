/* TABLÓN: LAS TARJETAS DE VALES NO DEPENDEN DEL MOUSE
   Sólo los canjes posibles entran al Tab. Enter/Espacio usan el canje habitual y, como éste
   repinta la lista, el foco sigue en el mismo premio o en el botón de volver.
     node tools/test-tablon-canje-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniTablon = UI.indexOf("function pdIcono(");
const finTablon = UI.indexOf("/* (pdSeccionPesca", iniTablon);
if (iniAccion < 0 || finAccion < 0 || iniTablon < 0 || finTablon < 0) throw new Error("No encontré el Tablón o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nSÓLO LOS CANJES POSIBLES SON CONTROLES\n");
{
  const fn = UI.slice(iniTablon, finTablon);
  ok("una tarjeta disponible declara botón, Tab y nombre", /data-pd-canje=.*role=\"button\" tabindex=\"0\" aria-label/.test(fn) && /Canjear /.test(fn));
  ok("el atajo usa la puerta común de Enter/Espacio", /activarAccionConTeclado\(el, \(\) => valesCanjear\(el\.dataset\.pdCanje\)\)/.test(fn));
  ok("el foco se restaura en escritorio con un fallback visible", /function enfocarCanjeTablonPc/.test(fn) && /opciones\.find/.test(fn) && /data-pd-vista="pedidos"/.test(fn) && /window\.innerWidth <= 640/.test(fn));
}

console.log("\nENTER Y ESPACIO CANJEAN UNA VEZ Y NO PIERDEN EL RECORRIDO\n");
{
  const dom = new JSDOM('<!doctype html><div id="pd-lista"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const mundo = [], canjes = [];
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { vales: 2 }, _pdVista: "canje", $: id => dom.window.document.getElementById(id),
    VALES_SHOP: [{ id: "hachas", sprite: null, emoji: "🪓" }, { id: "picos", sprite: null, emoji: "⛏️" }],
    valeCosto: id => id === "hachas" ? 1 : 4, valeLabel: id => id === "hachas" ? "Fardo de hachas" : "Fardo de picos",
    pedidosEstado: () => ({}), escapeHtml: s => String(s), GF: { spr: s => s },
    valesCanjear: id => { canjes.push(id); ctx.G.vales -= ctx.valeCosto(id); ctx.refreshPedidos(); },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniTablon, finTablon), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.refreshPedidos();
  let hachas = dom.window.document.querySelector('[data-pd-canje="hachas"]');
  const picos = dom.window.document.querySelector(".pd-canje:not([data-pd-canje])");
  ok("el premio alcanzable nombra su costo y el inaccesible no inventa parada de Tab", hachas.getAttribute("role") === "button" && hachas.tabIndex === 0 && hachas.getAttribute("aria-label") === "Canjear Fardo de hachas por 1 vale" && !!picos && picos.getAttribute("role") === null && picos.getAttribute("tabindex") === null);

  hachas.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  hachas.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  hachas.dispatchEvent(repetida);
  hachas = dom.window.document.querySelector('[data-pd-canje="hachas"]');
  ok("Enter canjea una vez, bloquea la repetición y conserva el mismo premio", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && canjes.join(",") === "hachas" && dom.window.document.activeElement === hachas);

  hachas.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  hachas.dispatchEvent(espacio);
  const volver = dom.window.document.querySelector('[data-pd-vista="pedidos"]');
  ok("si ese canje ya no alcanza, Espacio deja el foco en Volver", espacio.defaultPrevented && mundo.length === 0 && canjes.join(",") === "hachas,hachas" && dom.window.document.activeElement === volver);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarCanjeTablonPc({ querySelectorAll() { return []; }, querySelector() { return { focus() { focosMovil++; } }; } }, "hachas");
  ok("móvil no recibe foco programático tras canjear", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el canje de vales funciona con mouse o teclado y conserva una acción útil en foco.\n");
process.exit(fallos ? 1 : 0);
