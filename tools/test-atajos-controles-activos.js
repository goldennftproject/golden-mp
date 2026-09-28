/* ATAJOS Y CONTROLES NATIVOS ACTIVOS
   ==================================
   Una tarjeta puede contener SELECTs generados (God Hand, runas) además de inputs. Mientras uno
   está activo, M/Escape pertenecen al control y no al juego; de lo contrario una elección abre
   el menú o cierra su propia tarjeta. La cantidad modal conserva su Escape intencional.
     node tools/test-atajos-controles-activos.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAyudas = UI.indexOf("function controlDeTecladoActivo(");
const finAyudas = UI.indexOf("const OV_REFRESH", iniAyudas);
const ini = UI.indexOf("  const KEYS = { i:");
const fin = UI.indexOf("\n\n  refreshHud();", ini);
if (iniAyudas < 0 || finAyudas < 0 || ini < 0 || fin < 0) throw new Error("No se encontró el teclado principal");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function entorno({ cantidad = false, ruedaAbierta = false } = {}) {
  let listener = null, menu = 0, cantidadCerrada = 0, prevenidos = 0;
  const rueda = { classList: { contains: c => c === "show" && ruedaAbierta } };
  const ctx = {
    window: { innerWidth: 1280, addEventListener(tipo, fn) { if (tipo === "keydown") listener = fn; } },
    document: { querySelector: () => null, addEventListener() {} }, P4: null,
    $: id => id === "seedwheel" ? rueda : null,
    isOpen: id => id === "ov-cuanto" && cantidad,
    cerrarConfirmacionLocal: () => false,
    cerrarCantidadLocal: () => { cantidadCerrada++; return cantidad; },
    pescaAparejosAbierto: () => false, cerrarCuerpoPanelPc: () => false,
    pescaV4Cerrar() {}, pescaAparejosCerrar() {}, closeAllOv() {}, hideSeedWheel() {},
    toggleMenu: () => { menu++; }, hotSelect() {}, closeOv() {}, openOv() {},
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAyudas, finAyudas) + UI.slice(ini, fin), ctx);
  const tecla = (key, target) => listener({ key, target, preventDefault() { prevenidos++; } });
  return { tecla, menu: () => menu, cantidadCerrada: () => cantidadCerrada, prevenidos: () => prevenidos };
}

console.log("\nLOS CONTROLES NATIVOS CONSERVAN SUS TECLAS");
{
  const e = entorno();
  e.tecla("m", { tagName: "INPUT" });
  ok("un input sigue aislando los atajos", e.menu() === 0 && e.prevenidos() === 0);
  e.tecla("m", { tagName: "SELECT" });
  ok("un select no abre Menú mientras se elige", e.menu() === 0 && e.prevenidos() === 0);
  e.tecla("Escape", { tagName: "OPTION", closest: sel => sel === "select, [contenteditable]" ? {} : null });
  ok("Escape sobre una opción no cierra la tarjeta detrás", e.cantidadCerrada() === 0 && e.prevenidos() === 0);
  e.tecla("m", { tagName: "SPAN", isContentEditable: false, closest: sel => sel === "select, [contenteditable]" ? {} : null });
  ok("un editor futuro también conserva su teclado", e.menu() === 0 && e.prevenidos() === 0);
}

console.log("\nLA EXCEPCIÓN DE CANTIDAD Y EL JUEGO NORMAL SIGUEN VIVOS");
{
  const cantidad = entorno({ cantidad: true });
  cantidad.tecla("Escape", { tagName: "INPUT" });
  ok("Escape del número sigue cerrando sólo la cantidad", cantidad.cantidadCerrada() === 1);

  const mundo = entorno();
  mundo.tecla("m", { tagName: "CANVAS" });
  ok("M desde el mundo sigue abriendo/cerrando el menú", mundo.menu() === 1 && mundo.prevenidos() === 1);

  const rueda = entorno({ ruedaAbierta: true });
  rueda.tecla("E", { tagName: "CANVAS" });
  ok("E sobre la rueda contextual no llega a Phaser ni al mundo", rueda.menu() === 0 && rueda.prevenidos() === 1);
}

console.log("\nLA IMPLEMENTACIÓN CUBRE SELECT, OPTION Y EDITORES");
ok("la guardia compartida cubre select, option y editores", /function controlDeTecladoActivo\(elemento\)[\s\S]{0,460}tag === "SELECT"[\s\S]{0,220}tag === "OPTION"[\s\S]{0,220}closest\("select, \[contenteditable\]"/.test(UI));

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: los atajos no atraviesan controles nativos activos.\n");
process.exit(fallos ? 1 : 0);
