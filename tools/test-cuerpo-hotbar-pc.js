/* EL BOTÍN NO TAPA LOS ATAJOS EN PC
   =================================
   El cuerpo se abre durante el combate, cuando la hotbar todavía puede hacer falta para
   comida o arma. En escritorio debe nacer ocho píxeles por encima de la barra real; móvil
   conserva su posición compacta.
     node tools/test-cuerpo-hotbar-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const FOREST = fs.readFileSync("public/game/forest.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function placeCuerpoPanelPc() {");
const fin = UI.indexOf("function placeTuto()", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró placeCuerpoPanelPc");

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
    $: id => ({ "cuerpo-panel": panel, hotwrap: barra })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext("placeCuerpoPanelPc()", ctx);
  return style;
}

console.log("\nEN ESCRITORIO EL BOTÍN NACE ARRIBA DE LA HOTBAR\n");
{
  const base = caso({ ancho: 1280, visible: true, hotbar: { top: 632, width: 540, height: 78 } });
  ok("deja ocho píxeles reales entre ambos", base["--cuerpo-panel-bottom"] === "96px", base["--cuerpo-panel-bottom"]);

  const movida = caso({ ancho: 1280, visible: true, hotbar: { top: 500, width: 540, height: 78 } });
  ok("sigue una hotbar arrastrada", movida["--cuerpo-panel-bottom"] === "228px", movida["--cuerpo-panel-bottom"]);
}

console.log("\nMÓVIL Y PANEL CERRADO CONSERVAN LA BASE\n");
{
  const movil = caso({ ancho: 640, visible: true, hotbar: { top: 632, width: 540, height: 78 } });
  ok("móvil no recibe una variable de escritorio", !("--cuerpo-panel-bottom" in movil), JSON.stringify(movil));
  const cerrado = caso({ ancho: 1280, visible: false, hotbar: { top: 632, width: 540, height: 78 } });
  ok("al cerrar se limpia la posición temporal", !("--cuerpo-panel-bottom" in cerrado), JSON.stringify(cerrado));
}

console.log("\nEL CÁLCULO ESTÁ CONECTADO AL FLUJO REAL\n");
{
  ok("CSS aplica la variable sólo en escritorio",
    /@media\(min-width:641px\)\{#cuerpo-panel\{bottom:var\(--cuerpo-panel-bottom,16px\)\}\}/.test(HTML));
  const sync = (UI.match(/function syncRegistroPrompt\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("al mover la hotbar se recalcula con el resto del layout", /placeCuerpoPanelPc\(\);/.test(sync));
  const flujo = FOREST.slice(FOREST.indexOf("  abrirCuerpo(c) {"), FOREST.indexOf("  recogerCuerpo(c) {"));
  ok("abrir y cerrar el cuerpo actualizan su posición", /el\.classList\.add\("show"\);\s*if \(typeof placeCuerpoPanelPc/.test(flujo) &&
    /el\.classList\.remove\("show"\);\s*if \(typeof placeCuerpoPanelPc/.test(flujo));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el botín deja los atajos visibles en PC.\n");
process.exit(fallos ? 1 : 0);
