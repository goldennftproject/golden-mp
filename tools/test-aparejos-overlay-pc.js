/* APAREJOS NO QUEDA POR ENCIMA DE UN OVERLAY EN PC
   =================================================
   El panel de aparejos se muestra por encima de la hotbar, pero no debe capturar clics cuando
   Inventario, Equipo u otro overlay se abre mediante un atajo. En móvil no se altera todavía.
     node tools/test-aparejos-overlay-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function openOv(id) {");
const fin = UI.indexOf("// FUNDIDO A NEGRO", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró openOv");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function caso(ancho, abierto) {
  let cierres = 0, ruedas = 0, foco = 0;
  const clases = new Set();
  const overlay = { classList: { add: c => clases.add(c) } };
  const ctx = {
    window: { innerWidth: ancho }, GF: { esOcultoMvp: () => false },
    $: id => id === "ov-inv" ? overlay : null,
    hideSeedWheel: () => { ruedas++; },
    pescaAparejosAbierto: () => abierto,
    pescaAparejosCerrar: () => { cierres++; },
    enfocarOvPc: () => { foco++; }, OV_SFX: {}, OV_REFRESH: {}, Math,
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext('openOv("ov-inv")', ctx);
  return { cierres, ruedas, foco, abierto: clases.has("show") };
}

console.log("\nEN PC, UN OVERLAY CIERRA APAREJOS PRIMERO\n");
{
  const pc = caso(1280, true);
  ok("cierra el panel alto que capturaría clics", pc.cierres === 1, JSON.stringify(pc));
  ok("el overlay sigue abriéndose y toma foco", pc.abierto && pc.foco === 1, JSON.stringify(pc));
  ok("la rueda conserva su limpieza centralizada", pc.ruedas === 1, JSON.stringify(pc));
  const yaCerrado = caso(1280, false);
  ok("no ejecuta un cierre extra si Aparejos ya no está", yaCerrado.cierres === 0, JSON.stringify(yaCerrado));
}

console.log("\nMÓVIL CONSERVA EL FLUJO ACTUAL\n");
{
  const movil = caso(640, true);
  ok("no cierra Aparejos desde la ruta de overlays", movil.cierres === 0, JSON.stringify(movil));
  ok("tampoco altera la rueda táctil", movil.ruedas === 0, JSON.stringify(movil));
}

console.log("\nLA CAPA DEL PANEL JUSTIFICA EL CIERRE\n");
{
  ok("Aparejos vive por encima de los overlays normales", /#pesca4\{[\s\S]{0,220}z-index:70/.test(HTML) && /\.ov\{[\s\S]{0,110}z-index:var\(--ov-frente,10\)/.test(HTML));
  const open = UI.slice(ini, fin);
  ok("la puerta única lo resuelve sólo en escritorio", /window\.innerWidth > 640[\s\S]{0,220}pescaAparejosCerrar\(\)/.test(open));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: una ventana nueva no queda bajo Aparejos en PC.\n");
process.exit(fallos ? 1 : 0);
