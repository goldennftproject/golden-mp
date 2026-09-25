/* LA BARRA DE EDICIÓN RESPETA LA HOTBAR ARRASTRADA EN PC
   =======================================================
   La posición normal del modo edición es intencional. Sólo si una hotbar movida la invade, la
   barra se eleva ocho píxeles sobre su rectángulo real. Móvil conserva el flujo original.
     node tools/test-editbar-hotbar-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function placeEditbarPc() {");
const fin = UI.indexOf("function placeTuto()", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró placeEditbarPc");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function estilo(valor) {
  const s = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  if (valor) s["--editbar-bottom"] = valor;
  return s;
}
function caso({ ancho, visible, editbar, hotbar, previo }) {
  const style = estilo(previo);
  const barra = { style, classList: { contains: c => c === "show" && visible }, getBoundingClientRect: () => editbar };
  const atajos = hotbar && { getBoundingClientRect: () => hotbar };
  const ctx = { window: { innerWidth: ancho, innerHeight: 720 }, Math,
    $: id => ({ editbar: barra, hotwrap: atajos })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext("placeEditbarPc()", ctx);
  return style;
}

const editBase = { left: 400, right: 880, top: 562, bottom: 598, width: 480, height: 36 };
const hotBase = { left: 370, right: 910, top: 632, bottom: 710, width: 540, height: 78 };

console.log("\nEN PC LA BARRA CONSERVA SU POSICIÓN SI NO HAY CRUCE\n");
{
  const base = caso({ ancho: 1280, visible: true, editbar: editBase, hotbar: hotBase });
  ok("la hotbar de fábrica no mueve la edición", !("--editbar-bottom" in base), JSON.stringify(base));
  const viejo = caso({ ancho: 1280, visible: true, editbar: editBase, hotbar: hotBase, previo: "228px" });
  ok("una elevación vieja se limpia al dejar de cruzarse", !("--editbar-bottom" in viejo), JSON.stringify(viejo));
}

console.log("\nUNA HOTBAR ARRASTRADA LIBERA LOS CONTROLES DE EDICIÓN\n");
{
  const cruzada = caso({ ancho: 1280, visible: true, editbar: editBase,
    hotbar: { left: 370, right: 910, top: 560, bottom: 638, width: 540, height: 78 } });
  ok("la barra sube ocho píxeles sobre la hotbar", cruzada["--editbar-bottom"] === "168px", cruzada["--editbar-bottom"]);
  const masArriba = caso({ ancho: 1280, visible: true, editbar: editBase,
    hotbar: { left: 370, right: 910, top: 500, bottom: 578, width: 540, height: 78 } });
  ok("sigue la nueva posición arrastrada", masArriba["--editbar-bottom"] === "228px", masArriba["--editbar-bottom"]);
}

console.log("\nMÓVIL Y EDICIÓN CERRADA QUEDAN INTACTOS\n");
{
  const movil = caso({ ancho: 640, visible: true, editbar: editBase, hotbar: { left: 370, right: 910, top: 560, bottom: 638, width: 540, height: 78 } });
  ok("móvil no recibe una variable de escritorio", !("--editbar-bottom" in movil), JSON.stringify(movil));
  const cerrado = caso({ ancho: 1280, visible: false, editbar: editBase, hotbar: hotBase, previo: "228px" });
  ok("al salir de edición se limpia la posición temporal", !("--editbar-bottom" in cerrado), JSON.stringify(cerrado));
}

console.log("\nEL CÁLCULO ESTÁ CONECTADO AL FLUJO REAL\n");
{
  ok("CSS aplica la variable sólo en escritorio",
    /@media\(min-width:641px\)\{#editbar\{bottom:var\(--editbar-bottom,122px\)\}\}/.test(HTML));
  const sync = (UI.match(/function syncRegistroPrompt\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("drag y resize recalculan la barra", /placeEditbarPc\(\);/.test(sync));
  const flujo = UI.slice(UI.indexOf("window.setEditMode ="), UI.indexOf("const doFarmReset"));
  ok("entrar y salir de edición actualizan la posición", /eb\.classList\.toggle\("show", on\);\s*if \(typeof placeEditbarPc/.test(flujo));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la barra de edición no tapa los atajos en PC.\n");
process.exit(fallos ? 1 : 0);
