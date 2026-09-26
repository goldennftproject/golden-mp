/* LOS AVISOS DE RECURSOS LIBERAN EL REGISTRO EN PC BAJO
   ======================================================
   Siete chips vivos caben en la columna de flujo. En 480 px de alto esa columna centrada puede
   cruzar el Registro abierto. El historial no debe perderse detrás de información efímera:
   movemos la columna completa al hueco más cercano, sin tocar la composición móvil.
     node tools/test-flujo-registro-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const desde = UI.indexOf("function rectsSeCruzan");
const hasta = UI.indexOf("function initUniversalDrag", desde);
if (desde < 0 || hasta < 0) throw new Error("No se encontró el bloque de layout");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function rect(left, top, width, height) { return { left, top, width, height, right: left + width, bottom: top + height }; }
function estilo() { return { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } }; }
function caso({ ancho = 760, alto = 480, flujoW = 220, flujoH = 164, registro, hud, repisa, previo }) {
  const style = estilo(); if (previo) Object.assign(style, previo);
  const flujo = { style, getBoundingClientRect() {
    const centro = Number.parseFloat(style["--flujo-top"]) || alto / 2;
    return rect(10, centro - flujoH / 2, flujoW, flujoH);
  } };
  const logpanel = registro && { getBoundingClientRect: () => registro };
  const hudbar = hud && { getBoundingClientRect: () => hud };
  const hudFlot = repisa && { getBoundingClientRect: () => repisa };
  const ctx = { window: { innerWidth: ancho, innerHeight: alto }, Math,
    $: id => ({ flujo, logpanel, hudbar, "hud-flot": hudFlot })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(desde, hasta), ctx);
  vm.runInContext("placeFlujoPc()", ctx);
  return { style, flujo: flujo.getBoundingClientRect(), registro };
}
function cruzan(a, b, margen) {
  const m = margen || 0;
  return a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
}

console.log("\nEL FLUJO NO ESCRIBE SOBRE EL REGISTRO EN PC BAJO\n");
{
  const bajo = caso({ registro: rect(10, 258, 340, 212), hud: rect(0, 0, 760, 42) });
  ok("sube al hueco sobre el Registro con ocho píxeles de aire", bajo.style["--flujo-top"] === "168px", bajo.style["--flujo-top"]);
  ok("la columna completa deja libre el historial", !cruzan(bajo.flujo, bajo.registro, 8), JSON.stringify(bajo.flujo));

  const lejos = caso({ registro: rect(400, 258, 340, 212), hud: rect(0, 0, 760, 42) });
  ok("si no cruzan, conserva el centro habitual", !("--flujo-top" in lejos.style), JSON.stringify(lejos.style));
}

console.log("\nHUD Y MÓVIL CONSERVAN SUS LÍMITES\n");
{
  const repisa = caso({ registro: rect(10, 258, 340, 212), hud: rect(0, 0, 760, 42), repisa: rect(250, 45, 300, 38) });
  ok("no mete la columna debajo de una repisa alta si no queda una franja completa", !("--flujo-top" in repisa.style), JSON.stringify(repisa.style));

  const movil = caso({ ancho: 640, registro: rect(10, 258, 340, 212), hud: rect(0, 0, 640, 42), previo: { "--flujo-top": "168px" } });
  ok("móvil limpia cualquier posición temporal de escritorio", !("--flujo-top" in movil.style), JSON.stringify(movil.style));
}

console.log("\nLOS CAMBIOS VIVOS VUELVEN A MEDIR\n");
{
  ok("al nacer o retirarse un chip, se actualiza su posición", /caja\.appendChild\(el\);[\s\S]*?placeFlujoPc\(\)/.test(UI) &&
    /function flujoQuitar\([\s\S]*?placeFlujoPc\(\)/.test(UI));
  const sync = (UI.match(/function syncRegistroPrompt\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("mover o abrir Registro también reubica los chips", /placeFlujoPc\(\);/.test(sync));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el flujo sigue visible y el Registro se mantiene legible en PC.\n");
process.exit(fallos ? 1 : 0);
