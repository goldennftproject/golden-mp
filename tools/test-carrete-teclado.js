/* CARRETE DE PESCA: ESPACIO ES EL MISMO GESTO QUE MANTENER EL CLIC EN PC
   La tecla no puede actuar sobre un overlay/campo, no debe cortar un clic aún sostenido y se
   tiene que soltar al perder foco. No abre el juego: prueba el puente de entrada y su física.
     node tools/test-carrete-teclado.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("var P4 = null");
const fin = UI.indexOf("/* el pez ganó la pelea", ini);
if (ini < 0 || fin < 0) throw new Error("No encontré el carrete de pesca");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL CARRETE DECLARA SU ENTRADA DE TECLADO\n");
{
  const tramo = UI.slice(ini, fin);
  ok("la presión de teclado suma al clic sin reemplazarlo", /holdTeclado: false/.test(tramo) && /!!hold \|\| !!P4\.holdTeclado/.test(tramo));
  ok("la tecla tiene guardias para PC, decisiones, controles y botones", /function pescaV4CarreteTecladoDisponible/.test(tramo) && /window\.innerWidth <= 640/.test(tramo) && /selectorContextualPcAbierto/.test(tramo) && /ov-confirm/.test(tramo) && /controlDeTecladoActivo/.test(tramo) && /button, a, \[role=button\]/.test(tramo));
  ok("keyup, pérdida de foco y pestaña oculta sueltan la presión", /window\.addEventListener\("keyup", \(e\) => \{ pescaV4CarreteSoltarTecladoEnEvento\(e\); \}\)/.test(UI) && /window\.addEventListener\("blur", \(\) => \{ pescaV4CarreteSoltarAlPerderFoco\(\); \}\)/.test(UI) && /visibilitychange/.test(UI));
  ok("la ayuda visual distingue escritorio de toque", /pm-pie-pc/.test(HTML) && /mantené clic o Espacio: la zona sube/.test(HTML) && /pm-pie-touch/.test(HTML));
}

console.log("\nESPACIO SUBE LA ZONA SIN ENTREGAR EL MUNDO DETRÁS\n");
{
  let modal = false, selector = false, control = false, holds = [];
  const ctx = {
    window: { innerWidth: 1280 }, document: { activeElement: null, querySelector: () => null }, String, Math, Object, Array, console,
    selectorContextualPcAbierto: () => selector, isOpen: id => modal && id === "ov-confirm", pescaAparejosAbierto: () => false, controlDeTecladoActivo: () => control,
    carreteTick: (_carrete, _dt, hold) => { holds.push(hold); return null; },
    toast() {}, log() {}, refreshHud() {}, saveFarm() {}, syncSlots() {},
    pescaEscena: () => null
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext('P4 = { carrete: { zona: 1 }, holdTeclado: false };', ctx);

  const ev = { key: " ", prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
  const entra = ctx.pescaV4CarreteTecladoEnEvento(ev);
  ctx.pescaV4Paso(0.1, false);
  ok("Espacio activa el mismo hold, frena scroll y no necesita mouse", entra && ev.prevented && ev.stopped && holds.pop() === true);

  const suelta = { key: " ", prevented: false, preventDefault() { this.prevented = true; } };
  const sale = ctx.pescaV4CarreteSoltarTecladoEnEvento(suelta);
  ctx.pescaV4Paso(0.1, false);
  ok("soltar Espacio baja la zona", sale && suelta.prevented && holds.pop() === false);

  ctx.pescaV4Paso(0.1, true);
  ok("soltar Espacio no corta un clic físico todavía sostenido", holds.pop() === true);

  modal = true;
  const bloqueada = { key: " ", preventDefault() { throw new Error("No debía reclamar Espacio detrás de una decisión modal"); } };
  ok("una decisión modal conserva Espacio para su propia interfaz", ctx.pescaV4CarreteTecladoEnEvento(bloqueada) === false);
  vm.runInContext('P4.holdTeclado = true;', ctx);
  ctx.pescaV4Paso(0.1, false);
  ok("una tecla que quedó baja no se reanuda tras una decisión", holds.pop() === false && ctx.P4.holdTeclado === false);

  modal = false; selector = true;
  ok("el selector contextual conserva Espacio para elegir", ctx.pescaV4CarreteTecladoEnEvento({ key: " " }) === false);
  selector = false; control = true;
  ok("un campo activo tampoco inicia el carrete", ctx.pescaV4CarreteTecladoEnEvento({ key: " " }) === false);
  control = false; ctx.window.innerWidth = 640;
  ok("móvil conserva su gesto táctil", ctx.pescaV4CarreteTecladoEnEvento({ key: " " }) === false);
  ctx.window.innerWidth = 1280;
  ctx.window.farmScene = { lanceHold: true };
  vm.runInContext('P4.holdTeclado = true;', ctx);
  ctx.pescaV4CarreteSoltarAlPerderFoco();
  ok("perder foco siempre libera teclado y un clic que no llegó a soltar", ctx.P4.holdTeclado === false && ctx.window.farmScene.lanceHold === false);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: en PC el carrete entiende Espacio sin robar controles ni cambiar el gesto táctil.\n");
process.exit(fallos ? 1 : 0);
