/* LA PÍLDORA DE GRANJA NO ES SÓLO UN CLIC
   El HUD promete que su nivel abre las tareas. En PC esa promesa tiene que entrar en Tab y usar
   Enter/Espacio sin que Espacio termine interactuando con el mapa que está por detrás.
   node tools/test-pildora-granja-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado"), finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniPildora = UI.indexOf("function bindFarmPill"), finPildora = UI.indexOf("/* LOS EFECTOS DE LA COMIDA", iniPildora);
if (iniAccion < 0 || finAccion < 0 || iniPildora < 0 || finPildora < 0) throw new Error("No encontré la píldora de Granja o su acción de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA PÍLDORA SE ANUNCIA COMO ACCIÓN DE HUD");
{
  const pildora = HTML.match(/<div class="pill cpill" id="lvlpill"[^>]*>/);
  const attrs = pildora ? pildora[0] : "";
  ok("tiene rol y entrada de Tab", /role="button"/.test(attrs) && /tabindex="0"/.test(attrs));
  ok("nombra la acción y la ventana que abre", /aria-label="Abrir Granja y tareas"/.test(attrs) && /aria-controls="ov-barn"/.test(attrs));
  ok("el enlace reutiliza la puerta de teclado común", /activarAccionConTeclado\(pill, abrir\)/.test(UI.slice(iniPildora, finPildora)));
}

console.log("\nCLIC, ENTER Y ESPACIO ABREN UNA SOLA VEZ LA MISMA VENTANA");
{
  const dom = new JSDOM('<!doctype html><div id="lvlpill" role="button" tabindex="0"></div>', { pretendToBeVisual: true });
  const abiertas = [], mundo = [];
  const ctx = { window: dom.window, document: dom.window.document, String,
    openOv(id) { abiertas.push(id); },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniPildora, finPildora), ctx);
  const pill = dom.window.document.getElementById("lvlpill");
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.bindFarmPill();

  pill.click();
  ok("clic conserva la apertura original", abiertas.length === 1 && abiertas[0] === "ov-barn");
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  pill.dispatchEvent(enter);
  ok("Enter abre la misma ventana y no llega al mundo", abiertas.length === 2 && abiertas[1] === "ov-barn" && enter.defaultPrevented && mundo.length === 0);
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  pill.dispatchEvent(espacio);
  ok("Espacio también abre una vez, sin scroll ni interacción detrás", abiertas.length === 3 && espacio.defaultPrevented && mundo.length === 0);
  pill.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true }));
  ok("mantener la tecla no repite la apertura", abiertas.length === 3);
  ctx.bindFarmPill();
  pill.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  ok("los refrescos del HUD no duplican el listener", abiertas.length === 4);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la píldora de Granja funciona con mouse y teclado.\n");
process.exit(fallos ? 1 : 0);
