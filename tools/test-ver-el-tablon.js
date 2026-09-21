/* « VER EL TABLÓN » TIENE QUE IR AL TABLÓN                                   (22/9, dirección)
   Discord, 08:38: « cuando le das clic a "ver el tablón" no te manda al tablón ».
   El botón de la meta semanal (panel Objetivos) llevaba data-panel="ov-pedidos", igual que los
   del menú, pero solo los del menú se cableaban. Regla 9: un botón que no hace nada es peor que
   ninguno. Ahora cualquier botón con data-panel dentro de un panel abre ese panel, por
   delegación — y este test lo pulsa de verdad con un DOM.
     node tools/test-ver-el-tablon.js                                                          */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\nLECTURA\n");
ok("el botón existe y apunta al tablón", /data-panel="ov-pedidos">Ver el tablón</.test(UI));
ok("hay una puerta única por delegación para los data-panel que no son del menú",
  /closest\("button\[data-panel\]:not\(\.gmi\)"\)/.test(UI) && /document\.addEventListener\("click"/.test(UI));

console.log("\nEJECUCIÓN (jsdom)\n");
let JSDOM; try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.log("  (sin jsdom: se salta la ejecución)"); process.exit(fallos ? 1 : 0); }
const dom = new JSDOM('<body><div class="ov" id="ov-objetivos"><div id="objetivos-list"><div class="fbtns"><button class="green sm" data-panel="ov-pedidos">Ver el tablón</button></div></div></div><div class="ov" id="ov-pedidos"></div><div class="gmenu" id="gmenu"><button class="gmi" data-panel="ov-inv">Inv</button></div><div class="ov" id="ov-inv"></div></body>');
const { window } = dom; const document = window.document;
const abiertos = [];
/* se extrae SOLO el bloque de la delegación y se corre contra este DOM, con un openOv de mentira */
const ini = UI.indexOf('document.addEventListener("click", (ev) => {'), fin = UI.indexOf("});", ini) + 3;
const bloque = UI.slice(ini, fin);
new Function("document", "openOv", bloque)(document, (id) => abiertos.push(id));
document.querySelector('[data-panel="ov-pedidos"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
ok("el clic en « Ver el tablón » abre ov-pedidos", abiertos.join() === "ov-pedidos", abiertos.join() || "(nada)");
abiertos.length = 0;
document.querySelector(".gmi").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
ok("los del menú NO pasan por acá (tienen su propio cableado y el pliegue del menú)", abiertos.length === 0);

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ « Ver el tablón » va al tablón\n");
process.exit(fallos ? 1 : 0);
