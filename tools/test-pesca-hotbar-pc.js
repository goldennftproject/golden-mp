/* LOS APAREJOS NO TAPAN LA HOTBAR EN PC
   =====================================
   Al abrir la caja de aparejos, la barra rápida puede contener comida o una herramienta que el
   jugador necesita ver. En escritorio el panel nace ocho píxeles sobre su rectángulo real y se
   adapta si se arrastra; móvil conserva su composición compacta.
     node tools/test-pesca-hotbar-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function placePescaAparejosPc() {");
const fin = UI.indexOf("function placeTuto()", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró placePescaAparejosPc");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function estilo() {
  return { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
}
function caso({ ancho, visible, hotbar }) {
  const style = estilo();
  const panel = { style, classList: { contains: c => c === "show" && visible } };
  const barra = hotbar && { getBoundingClientRect: () => hotbar };
  const ctx = { window: { innerWidth: ancho, innerHeight: 720 }, Math,
    $: id => ({ pesca4: panel, hotwrap: barra })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext("placePescaAparejosPc()", ctx);
  return style;
}

console.log("\nEN ESCRITORIO LOS APAREJOS NACEN ARRIBA DE LA HOTBAR\n");
{
  const base = caso({ ancho: 1280, visible: true, hotbar: { top: 632, width: 540, height: 78 } });
  ok("deja ocho píxeles reales entre ambos", base["--pesca4-bottom"] === "96px", base["--pesca4-bottom"]);

  const movida = caso({ ancho: 1280, visible: true, hotbar: { top: 500, width: 540, height: 78 } });
  ok("sigue una hotbar arrastrada", movida["--pesca4-bottom"] === "228px", movida["--pesca4-bottom"]);
}

console.log("\nMÓVIL Y PANEL CERRADO CONSERVAN LA BASE\n");
{
  const movil = caso({ ancho: 640, visible: true, hotbar: { top: 632, width: 540, height: 78 } });
  ok("móvil no recibe una variable de escritorio", !("--pesca4-bottom" in movil), JSON.stringify(movil));
  const cerrado = caso({ ancho: 1280, visible: false, hotbar: { top: 632, width: 540, height: 78 } });
  ok("al cerrar se limpia la posición temporal", !("--pesca4-bottom" in cerrado), JSON.stringify(cerrado));
}

console.log("\nEL CÁLCULO ESTÁ CONECTADO AL FLUJO REAL\n");
{
  ok("CSS aplica la variable sólo en escritorio",
    /@media\(min-width:641px\)\{#pesca4\{bottom:var\(--pesca4-bottom,16px\)\}\}/.test(HTML));
  const sync = (UI.match(/function syncRegistroPrompt\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("al mover la hotbar se recalcula con el resto del layout", /placePescaAparejosPc\(\);/.test(sync));
  const flujo = UI.slice(UI.indexOf("function pescaAparejosAbrir()"), UI.indexOf("function pescaAparejosAbierto()"));
  ok("abrir y cerrar los aparejos actualizan su posición",
    /el\.classList\.add\("show"\);\s*if \(typeof placePescaAparejosPc/.test(flujo) &&
    /el\.classList\.remove\("show"\);\s*if \(typeof placePescaAparejosPc/.test(flujo));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: los aparejos dejan los atajos visibles en PC.\n");
process.exit(fallos ? 1 : 0);
