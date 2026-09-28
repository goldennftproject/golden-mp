/* BAÚL: LOS PREMIOS PENDIENTES SE RECLAMAN SIN MOUSE
   Las fichas que van al Cobertizo son botones reales. Enter/Espacio toma una por vez y, al
   reemplazar la ficha animada, el foco sigue en el siguiente premio o en cerrar el Baúl.
     node tools/test-baul-regalos-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniBaul = UI.indexOf("function baulRegalosHtml(");
const finBaul = UI.indexOf("/* ---- EL PAQUETE DEL DÍA", iniBaul);
if (iniAccion < 0 || finAccion < 0 || iniBaul < 0 || finBaul < 0) throw new Error("No encontré el Baúl o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLOS PREMIOS DEL BAÚL EXPLICAN A DÓNDE VAN\n");
{
  const fn = UI.slice(iniBaul, finBaul);
  ok("cada premio pendiente es un botón con el destino dicho", /data-regalo=.*role=\"button\" tabindex=\"0\" aria-label/.test(fn) && /va al Cobertizo para elegir dónde colocarlo/.test(fn));
  ok("la miniatura decorativa no duplica el nombre", /<img src=.* alt=\"\" draggable=\"false\"/.test(fn));
  ok("Enter/Espacio reutilizan el reclamo y el foco continúa sólo en PC", /activarAccionConTeclado\(el, \(\) => reclamarRegaloBaul\(el, true\)\)/.test(fn) && /function enfocarSiguienteRegaloBaulPc/.test(fn) && /window\.innerWidth <= 640/.test(fn));
}

console.log("\nENTER Y ESPACIO RECLAMAN UNO POR VEZ Y SIGUEN EL RECORRIDO\n");
{
  const dom = new JSDOM('<!doctype html><div id="ov-baul" class="show"><button class="close" data-close="ov-baul">×</button><div id="baul-sub"></div><div id="baul-items"></div><img id="baul-img"><div id="baul-nota"></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const timers = [], mundo = [], reclamos = [];
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { kitReclamado: true, regalos: { tree: 1, rock: 1, plot: 0 } }, $: id => dom.window.document.getElementById(id),
    GF: { spr: s => s }, escapeHtml: s => String(s),
    regalosPendientes: () => Object.values(ctx.G.regalos).reduce((n, x) => n + x, 0),
    regaloReclamar: tipo => { if (!ctx.G.regalos[tipo]) return false; reclamos.push(tipo); ctx.G.regalos[tipo]--; return true; },
    setTimeout: fn => { timers.push(fn); return timers.length; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniBaul, finBaul), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));

  ctx.refreshBaul();
  let tree = dom.window.document.querySelector('[data-regalo="tree"]');
  ok("la primera ficha se alcanza por Tab y nombra el Cobertizo", tree.getAttribute("role") === "button" && tree.tabIndex === 0 && tree.getAttribute("aria-label") === "Reclamar Retoño: va al Cobertizo para elegir dónde colocarlo" && tree.querySelector("img").getAttribute("alt") === "" && /Cobertizo/.test(dom.window.document.getElementById("baul-nota").textContent));

  tree.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  tree.dispatchEvent(enter);
  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  tree.dispatchEvent(repetida);
  ok("Enter inicia un único reclamo y no llega al mundo", enter.defaultPrevented && repetida.defaultPrevented && mundo.length === 0 && timers.length === 1 && reclamos.length === 0);
  timers.shift()(); timers.shift()();
  let rock = dom.window.document.querySelector('[data-regalo="rock"]');
  ok("la ficha volada deja el foco en el siguiente premio", reclamos.join(",") === "tree" && !!rock && dom.window.document.activeElement === rock);

  rock.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  rock.dispatchEvent(espacio);
  timers.shift()(); timers.shift()();
  const cerrar = dom.window.document.querySelector("[data-close=\"ov-baul\"]");
  ok("el último premio usa Espacio y continúa en Cerrar", espacio.defaultPrevented && mundo.length === 0 && reclamos.join(",") === "tree,rock" && dom.window.document.activeElement === cerrar);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarSiguienteRegaloBaulPc({ querySelector() { return { focus() { focosMovil++; } }; } });
  ok("móvil no recibe foco programático tras reclamar", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: los premios del Baúl se reclaman con mouse o teclado y llevan al siguiente paso visible.\n");
process.exit(fallos ? 1 : 0);
