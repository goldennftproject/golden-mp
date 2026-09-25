/* EL AVISO DE GUARDADO DEJA LOS CONTROLES LIBRES EN PC
   =====================================================
   El estado breve de guardado no puede ocultar el muelle de la Zona Negra, una hotbar que se
   arrastró ni el cartel de interacción. Se mueve sólo en escritorio y vuelve al CSS base al
   desaparecer.
     node tools/test-saveind-zona-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function placeSaveIndPc() {");
const fin = UI.indexOf("function showSaving()", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró placeSaveIndPc");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
function estilo(previo) {
  const s = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  if (previo) Object.assign(s, previo);
  return s;
}
function nodo(r, visible, style) {
  return {
    style: style || estilo(),
    classList: { contains: c => c === "show" && !!visible },
    getBoundingClientRect: () => r,
  };
}
function caso({ ancho = 1280, alto = 720, save, combate, hotbar, prompt, saveVisible = true, promptVisible = false, previo }) {
  const style = estilo(previo);
  const ids = {
    saveind: nodo(save, saveVisible, style),
    combate: combate && nodo(combate, true),
    hotwrap: hotbar && nodo(hotbar, true),
    prompt: prompt && nodo(prompt, promptVisible),
  };
  const ctx = { window: { innerWidth: ancho, innerHeight: alto }, Math, $: id => ids[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext("placeSaveIndPc()", ctx);
  return style;
}

console.log("\nLA POSICIÓN NORMAL NO CAMBIA SIN UNA COLISIÓN\n");
{
  const style = caso({
    save: rect(1163, 678, 105, 30),
    hotbar: rect(370, 632, 540, 78),
  });
  ok("la esquina habitual conserva el CSS base", !("--saveind-right" in style) && !("--saveind-bottom" in style), JSON.stringify(style));
}

console.log("\nZONA BAJA: EL MUELLE Y LA HOTBAR QUEDAN LIBRES\n");
{
  const style = caso({
    ancho: 760, alto: 600,
    save: rect(643, 558, 105, 30),
    combate: rect(626, 280, 126, 312),
    hotbar: rect(110, 522, 540, 68),
  });
  ok("se corre al lado izquierdo del muelle", style["--saveind-right"] === "142px", style["--saveind-right"]);
  ok("si esa posición toca la hotbar, sube ocho píxeles", style["--saveind-bottom"] === "86px", style["--saveind-bottom"]);
}

console.log("\nEL PROMPT VISIBLE TAMBIÉN CONSERVA SU HUECO\n");
{
  const style = caso({
    ancho: 760, alto: 576,
    save: rect(643, 534, 105, 30),
    combate: rect(626, 280, 126, 288),
    hotbar: rect(110, 470, 540, 68),
    prompt: rect(280, 400, 260, 36), promptVisible: true,
  });
  ok("primero reserva muelle y hotbar", style["--saveind-right"] === "142px" && style["--saveind-bottom"] === "184px", JSON.stringify(style));
}

console.log("\nMÓVIL, AVISO CERRADO Y CSS\n");
{
  const previo = { "--saveind-right": "142px", "--saveind-bottom": "86px" };
  const movil = caso({ ancho: 640, alto: 600, save: rect(535, 558, 93, 30), previo });
  ok("móvil limpia cualquier posición temporal", !("--saveind-right" in movil) && !("--saveind-bottom" in movil), JSON.stringify(movil));
  const cerrado = caso({ ancho: 760, alto: 600, save: rect(643, 558, 105, 30), saveVisible: false, previo });
  ok("al ocultarse vuelve a la esquina de CSS", !("--saveind-right" in cerrado) && !("--saveind-bottom" in cerrado), JSON.stringify(cerrado));
  ok("las variables y el aviso pasivo existen sólo en escritorio",
    /@media\(min-width:641px\)\{#saveind\{right:var\(--saveind-right,12px\);bottom:var\(--saveind-bottom,12px\);pointer-events:none\}\}/.test(HTML));
}

console.log("\nEL CÁLCULO ESTÁ EN LOS CAMINOS REALES\n");
{
  const saving = UI.slice(UI.indexOf("function showSaving()"), UI.indexOf("/* ---- chat ----", UI.indexOf("function showSaving()")));
  ok("las tres variantes lo ubican después de escribir el texto", (saving.match(/placeSaveIndPc\(\)/g) || []).length >= 5);
  ok("los timeouts limpian la posición temporal", /classList\.remove\("show"\); if \(typeof placeSaveIndPc/.test(saving));
  const muelle = UI.slice(UI.indexOf("function ubicarMuelleCombatePC()"), UI.indexOf("function refreshCombate()", UI.indexOf("function ubicarMuelleCombatePC()")));
  ok("cambiar el muelle vuelve a medir el aviso", /reubicarAviso/.test(muelle) && /placeSaveIndPc/.test(muelle));
  ok("la aparición o cierre del prompt dispara una nueva medición", /prompt\._saveIndWatch[\s\S]*?placeSaveIndPc/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el guardado deja los controles visibles en PC.\n");
process.exit(fallos ? 1 : 0);
