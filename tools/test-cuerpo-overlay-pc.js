/* EL BOTÍN NO QUEDA POR ENCIMA DE UNA VENTANA EN PC
   ==================================================
   La tarjeta del cadáver necesita estar sobre la hotbar de la Zona, pero Inventario/Equipo no
   pueden aparecer debajo. La salida compartida cierra el cuerpo de verdad y móvil no cambia.
     node tools/test-cuerpo-overlay-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const FOREST = fs.readFileSync("public/game/forest.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function openOv(id) {");
const fin = UI.indexOf("// FUNDIDO A NEGRO", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró la puerta de overlays");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases(abierto) {
  const set = new Set(abierto ? ["show"] : []);
  return { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c) };
}
function caso(ancho, cuerpoAbierto, compartir) {
  let cierres = 0, focos = 0, respaldo = 0;
  const overlay = { classList: clases(false) };
  const cuerpo = { classList: clases(cuerpoAbierto) };
  const ctx = {
    window: { innerWidth: ancho }, GF: { esOcultoMvp: () => false }, Math,
    $: id => ({ "ov-inv": overlay, "cuerpo-panel": cuerpo })[id] || null,
    hideSeedWheel() {}, pescaAparejosAbierto: () => false, pescaAparejosCerrar() {},
    cerrarCuerpoPanelPc: undefined, enfocarOvPc: () => { focos++; }, OV_SFX: {}, OV_REFRESH: {},
  };
  if (compartir) ctx.window.cerrarCuerpoPanel = () => { cierres++; cuerpo.classList.remove("show"); };
  ctx.placeCuerpoPanelPc = () => { respaldo++; };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext('openOv("ov-inv")', ctx);
  return { cierres, focos, respaldo, cuerpoAbierto: cuerpo.classList.contains("show"), overlayAbierto: overlay.classList.contains("show") };
}

console.log("\nPC CIERRA EL CUERPO ANTES DE ABRIR INVENTARIO\n");
{
  const pc = caso(1280, true, true);
  ok("usa la salida de ForestScene y borra el botín visible", pc.cierres === 1 && !pc.cuerpoAbierto, JSON.stringify(pc));
  ok("Inventario sigue tomando el foco", pc.overlayAbierto && pc.focos === 1, JSON.stringify(pc));
  const seguro = caso(1280, true, false);
  ok("una transición sin callback aun oculta el panel", !seguro.cuerpoAbierto && seguro.respaldo === 1, JSON.stringify(seguro));
}

console.log("\nMÓVIL Y LA REFERENCIA DE ESCENA CONSERVAN SU CONTRATO\n");
{
  const movil = caso(640, true, true);
  ok("móvil no cierra el botín desde un overlay", movil.cierres === 0 && movil.cuerpoAbierto, JSON.stringify(movil));
  ok("ForestScene registra y libera la misma salida temporal",
    /this\._cerrarCuerpoUi = \(\) => this\.cerrarCuerpo\(\);[\s\S]{0,100}window\.cerrarCuerpoPanel = this\._cerrarCuerpoUi/.test(FOREST) &&
    /window\.cerrarCuerpoPanel === this\._cerrarCuerpoUi\) delete window\.cerrarCuerpoPanel/.test(FOREST));
}

console.log("\nLA JERARQUÍA VISUAL EXIGE ESE CIERRE\n");
{
  ok("el botín alto y los overlays normales se distinguen", /#cuerpo-panel\{[\s\S]{0,180}z-index:70/.test(HTML) && /\.ov\{[\s\S]{0,110}z-index:var\(--ov-frente,10\)/.test(HTML));
  ok("la puerta central sólo cierra el cuerpo en PC", /window\.innerWidth > 640[\s\S]{0,180}cerrarCuerpoPanelPc\(\)/.test(UI.slice(ini, fin)));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el botín no captura una ventana nueva en PC.\n");
process.exit(fallos ? 1 : 0);
