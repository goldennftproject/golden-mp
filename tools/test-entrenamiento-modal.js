/* EL ENTRENAMIENTO BLOQUEA TAMBIÉN EL TECLADO
   ============================================
   La capa `.bloquea` ya interceptaba el ratón. Esta prueba impide que M, I, números o Escape
   sigan llegando al juego detrás de ella, y conserva Tab/Enter/Espacio para terminar de entrenar.
     node tools/test-entrenamiento-modal.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const iniOpen = UI.indexOf("function openOv(id) {");
const finOpen = UI.indexOf("function cerrarCuerpoPanelPc()", iniOpen);
const iniKeys = UI.indexOf("  const KEYS = { i:");
const finKeys = UI.indexOf("\n\n  refreshHud();", iniKeys);
if (iniOpen < 0 || finOpen < 0 || iniKeys < 0 || finKeys < 0) throw new Error("No se encontró el bloqueo de entrenamiento");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases() {
  const datos = new Set();
  return { add: n => datos.add(n), remove: n => datos.delete(n), contains: n => datos.has(n) };
}

console.log("\nABRIR ENTRENAMIENTO DEJA EL FOCO EN SU ÚNICA SALIDA\n");
{
  const entrenando = { classList: clases() };
  let foco = 0, enfocado = 0;
  const ctx = {
    window: { innerWidth: 1280 }, GF: {}, OV_SFX: {}, OV_REFRESH: {},
    $: id => ({ "ov-entrenando": entrenando, "entr-fin": { focus() { foco++; } } })[id] || null,
    enfocarOvPc() { enfocado++; }, hideSeedWheel() {}, pescaAparejosAbierto() { return false; },
    pescaAparejosCerrar() {}, cerrarCuerpoPanelPc() {},
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniOpen, finOpen), ctx);
  vm.runInContext('openOv("ov-entrenando")', ctx);
  ok("muestra la capa bloqueante", entrenando.classList.contains("show"));
  ok("enfoca Dejar de entrenar y cobrar", foco === 1, String(foco));
  ok("conserva el foco visual de overlays", enfocado === 1, String(enfocado));
}

console.log("\nLOS ATAJOS NO ATRAVIESAN LA CAPA BLOQUEANTE\n");
{
  let listener = null, bloqueante = {}, menu = 0, cierres = 0;
  const window = { innerWidth: 1280, addEventListener(tipo, fn) { if (tipo === "keydown") listener = fn; } };
  const ctx = {
    window,
    document: { querySelector: sel => sel === ".ov.bloquea.show" ? bloqueante : null, addEventListener() {} },
    controlDeTecladoActivo() { return false; }, selectorContextualPcAbierto() { return false; },
    toggleMenu() { menu++; }, closeAllOv() { cierres++; }, hideSeedWheel() {}, isOpen() { return false; },
    pescaAparejosAbierto() { return false; }, cerrarCuerpoPanelPc() { return false; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniKeys, finKeys), ctx);
  const enviar = (key, target) => {
    let prevenido = 0;
    listener({ key, target, preventDefault() { prevenido++; } });
    return prevenido;
  };
  const fuera = { closest: () => null };
  ok("M no abre el menú detrás del entrenamiento", enviar("m", fuera) === 1 && menu === 0);
  ok("Escape no cierra ni toca otras ventanas", enviar("Escape", fuera) === 1 && cierres === 0);
  const boton = { closest: sel => sel === ".ov.bloquea.show" ? bloqueante : null };
  ok("Enter del botón de entrenamiento queda libre para su click nativo", enviar("Enter", boton) === 0 && menu === 0);
  bloqueante = null;
  ok("sin entrenamiento M conserva su atajo habitual", enviar("m", fuera) === 1 && menu === 1);
}

console.log("\nEL BLOQUEO VISUAL TAMBIÉN TAPA LA GUÍA EN PC\n");
ok("la capa bloqueante llega por delante de la flecha tutorial", /@media\(min-width:641px\)\{\.ov\.bloquea\.show\{z-index:81\}\}/.test(HTML));
ok("sigue debajo de las pantallas de recuperación", /#fadeblk\{[^}]*z-index:900/.test(HTML) && /<div id="ctx-perdido"[^>]*z-index:130/.test(HTML));

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: entrenar bloquea ratón y teclado hasta terminarlo.\n");
process.exit(fallos ? 1 : 0);
