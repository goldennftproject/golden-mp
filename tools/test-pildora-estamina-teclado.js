/* LA RECARGA DE ESTAMINA TAMBIÉN ES ACCESIBLE DESDE EL HUD
   La píldora visible abre una confirmación de gasto. Enter/Espacio deben llegar a la misma
   confirmación, no al mapa de Phaser, y el refresco del HUD no puede duplicar la acción.
   node tools/test-pildora-estamina-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado"), finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniPildora = UI.indexOf("function bindStamPill"), finPildora = UI.indexOf("function refreshStam", iniPildora);
if (iniAccion < 0 || finAccion < 0 || iniPildora < 0 || finPildora < 0) throw new Error("No encontré la píldora de estamina o su acción de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA PÍLDORA DECLARA QUE ABRE UNA CONFIRMACIÓN");
{
  const pildora = HTML.match(/<div class="pill cpill" id="stampill"[^>]*>/);
  const attrs = pildora ? pildora[0] : "";
  ok("tiene rol y entrada de Tab", /role="button"/.test(attrs) && /tabindex="0"/.test(attrs));
  ok("nombra la recarga y la confirma como diálogo", /aria-label="Recargar estamina"/.test(attrs) && /aria-haspopup="dialog"/.test(attrs) && /aria-controls="ov-confirm"/.test(attrs));
  ok("la acción usa la puerta común de teclado", /activarAccionConTeclado\(pill, recargar\)/.test(UI.slice(iniPildora, finPildora)));
}

console.log("\nMOUSE, ENTER Y ESPACIO LLEGAN A LA MISMA CONFIRMACIÓN");
{
  const dom = new JSDOM('<!doctype html><div id="stampill" role="button" tabindex="0"></div>', { pretendToBeVisual: true });
  const confirmaciones = [], avisos = [], mundo = [];
  const ctx = { window: dom.window, document: dom.window.document, String,
    G: { stam: 6 }, STAM_GOLDEN: 4, STAM_RECARGAS_DIA: 3,
    stamRecargar() {}, stamRecargasHoy: () => ({ n: 1 }), stamMax: () => 10,
    askConfirm(...args) { confirmaciones.push(args); }, toast(txt) { avisos.push(txt); },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniPildora, finPildora), ctx);
  const pill = dom.window.document.getElementById("stampill");
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.bindStamPill();

  pill.click();
  ok("clic conserva la confirmación de recarga", confirmaciones.length === 1 && /Recargar la estamina/.test(confirmaciones[0][0]));
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  pill.dispatchEvent(enter);
  ok("Enter abre la misma confirmación y no llega al mundo", confirmaciones.length === 2 && enter.defaultPrevented && mundo.length === 0);
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  pill.dispatchEvent(espacio);
  ok("Espacio evita scroll y abre una sola confirmación", confirmaciones.length === 3 && espacio.defaultPrevented && mundo.length === 0);
  pill.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true }));
  ok("mantener Enter no duplica el gasto", confirmaciones.length === 3);
  ctx.bindStamPill();
  pill.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  ok("un refresh posterior no apila listeners", confirmaciones.length === 4);

  ctx.G.stam = 10; pill.click();
  ok("llena conserva el aviso en vez de pedir un gasto inútil", confirmaciones.length === 4 && /ya está llena/.test(avisos[0] || ""));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la recarga de estamina funciona desde el HUD con mouse y teclado.\n");
process.exit(fallos ? 1 : 0);
