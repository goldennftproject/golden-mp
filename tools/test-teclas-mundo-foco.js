/* E/ESPACIO RESPETAN EL FOCO DE LA INTERFAZ
   ==========================================
   Phaser recibe las teclas de acción aun cuando el navegador tiene un input/select enfocado.
   Eso no puede cosechar/interactuar/atacar detrás de un control HTML. La rueda contextual de
   PC también ocupa E/Espacio hasta que se elige una ficha; el panel de cuerpo sigue permitiendo
   pelear, como fue diseñado.
     node tools/test-teclas-mundo-foco.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx, elementos } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = nombre => vm.runInContext(nombre, ctx);
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases(abierta) {
  const datos = new Set(abierta ? ["show"] : []);
  return { add: c => datos.add(c), remove: c => datos.delete(c), contains: c => datos.has(c) };
}
const rueda = elementos.seedwheel || ctx.document.getElementById("seedwheel");
rueda.classList = clases(false);

function granja() {
  const esc = Object.create(g("FarmScene").prototype);
  let usos = 0, pesca = 0;
  Object.assign(esc, {
    action: null,
    nearestInteract: () => ({ type: "tree" }), interactWith: () => { usos++; },
    nearPond: () => false, tryFish: () => { pesca++; },
  });
  return { esc, usos: () => usos, pesca: () => pesca };
}
function bosque() {
  const esc = Object.create(g("ForestScene").prototype);
  let ataques = 0;
  Object.assign(esc, {
    porQueNoAtaca: () => null,
    nearestMonster: () => ({ key: "rata" }),
    setTarget: () => { ataques++; }, autoOn: false,
  });
  return { esc, ataques: () => ataques };
}
function foco(tag, extra) { return Object.assign({ tagName: tag }, extra || {}); }

console.log("\nLA GRANJA NO RECIBE E/ESPACIO DESDE UN CONTROL ACTIVO");
{
  ctx.GF.uiOpen = false; ctx.GF.editMode = false; ctx.GF.NO_WALK = false;
  ctx.innerWidth = 1280; rueda.classList.remove("show");
  const e = granja();
  ctx.document.activeElement = foco("INPUT");
  e.esc.doInteract();
  ok("escribir en un campo no usa el objeto cercano", e.usos() === 0 && e.pesca() === 0);

  const s = granja();
  ctx.document.activeElement = foco("SELECT");
  s.esc.doInteract();
  ok("elegir en un select tampoco actúa detrás de la tarjeta", s.usos() === 0);
}

console.log("\nLA RUEDA CONTEXTUAL DE PC CONSERVA LA DECISIÓN VISIBLE");
{
  ctx.document.activeElement = foco("BODY"); ctx.innerWidth = 1280; rueda.classList.add("show");
  const pc = granja(); pc.esc.doInteract();
  ok("E/Espacio no usan ni plantan mientras la rueda está abierta", pc.usos() === 0 && pc.pesca() === 0);

  ctx.innerWidth = 640;
  const movil = granja(); movil.esc.doInteract();
  ok("móvil conserva su ruta previa hasta la pasada táctil", movil.usos() === 1);

  ctx.innerWidth = 1280; rueda.classList.remove("show");
  const libre = granja(); libre.esc.doInteract();
  ok("al cerrar la rueda el gesto vuelve a funcionar", libre.usos() === 1);
}

console.log("\nEL BOSQUE RESPETA CHAT, CAMPOS Y SU PANEL DE APAREJOS");
{
  ctx.GF.uiOpen = false; ctx.document.activeElement = foco("INPUT");
  const campo = bosque(); campo.esc.tryAttack();
  ok("un campo activo no fija ni inicia un autoataque", campo.ataques() === 0 && campo.esc.autoOn === false);

  ctx.document.activeElement = foco("BODY"); ctx.GF.uiOpen = true;
  const chat = bosque(); chat.esc.tryAttack();
  ok("chat/aparejos que declaran UI abierta tampoco atacan", chat.ataques() === 0 && chat.esc.autoOn === false);

  ctx.GF.uiOpen = false;
  const cuerpo = bosque(); cuerpo.esc.tryAttack();
  ok("sin foco de control, el combate de Zona conserva E/Espacio", cuerpo.ataques() === 1 && cuerpo.esc.autoOn === true);
}

console.log("\nESCRIBIR TAMPOCO SECUESTRA WASD NI UNA PERSECUCIÓN YA INICIADA");
{
  /* La persecución se detiene ante una tecla manual real. Una A escrita en un input no es una
     orden de caminar: si se interpretara como tal, el enemigo marcado dejaría de seguirse. */
  ctx.document.activeElement = foco("INPUT"); ctx.GF.uiOpen = false;
  vm.runInContext("swordDmg = () => 1; modoPelea = () => 'seguir';", ctx);
  const esc = Object.create(g("ForestScene").prototype);
  const keys = {};
  ["left", "right", "up", "down", "aleft", "aright", "aup", "adown"].forEach(k => { keys[k] = { isDown: k === "left" }; });
  Object.assign(esc, {
    autoOn: true, action: null, target: { cx: 900, by: 0, dead: false }, hero: { x: 0, y: 0 },
    keys, hold: null, navOf: () => ({ lineFree: () => true }),
  });
  esc.autoChase(1000);
  ok("una A en el campo no corta la persecución ni se vuelve movimiento manual", !!esc.moveTarget && esc.moveTarget.x === 900, JSON.stringify(esc.moveTarget));
}

console.log("\nLAS GUARDIAS ESTÁN ANTES DE TODA ACCIÓN DE ESCENA");
{
  const doInteract = FARM.slice(FARM.indexOf("  doInteract() {"), FARM.indexOf("  interactWith(o) {", FARM.indexOf("  doInteract() {")));
  const atacar = FOREST.slice(FOREST.indexOf("  tryAttack() {"), FOREST.indexOf("  /* ── LA PERSECUCIÓN", FOREST.indexOf("  tryAttack() {")));
  const moverGranja = FARM.slice(FARM.indexOf("  updateReal(time, deltaMs) {"), FARM.indexOf("  updatePrompt() {", FARM.indexOf("  updateReal(time, deltaMs) {")));
  const moverBosque = FOREST.slice(FOREST.indexOf("  updateReal(time, deltaMs) {"), FOREST.indexOf("  updatePrompt() {", FOREST.indexOf("  updateReal(time, deltaMs) {")));
  const chase = FOREST.slice(FOREST.indexOf("  autoChase(t) {"), FOREST.indexOf("  // auto-ataque", FOREST.indexOf("  autoChase(t) {")));
  ok("granja corta foco y rueda antes de comprobar el mundo", doInteract.indexOf("controlDeTecladoActivo") >= 0 && doInteract.indexOf("selectorContextualPcAbierto") >= 0 && doInteract.indexOf("selectorContextualPcAbierto") < doInteract.indexOf("if (GF.NO_WALK)"));
  ok("bosque corta UI/foco antes de consultar monstruos", atacar.indexOf("GF.uiOpen") >= 0 && atacar.indexOf("controlDeTecladoActivo") >= 0 && atacar.indexOf("controlDeTecladoActivo") < atacar.indexOf("this.porQueNoAtaca"));
  ok("ambas escenas leen WASD sólo si el teclado del mundo está libre", /const tecladoMundoOcupado/.test(moverGranja) && /if \(!GF\.NO_WALK && !tecladoMundoOcupado\)[\s\S]{0,260}k\.left\.isDown/.test(moverGranja) && /const tecladoMundoOcupado/.test(moverBosque) && /if \(!tecladoMundoOcupado\) \{[\s\S]{0,260}k\.left\.isDown/.test(moverBosque));
  ok("la persecución tampoco confunde una letra escrita con una orden manual", /const manual = \(!tecladoMundoOcupado/.test(chase));
}

ctx.document.activeElement = foco("BODY"); ctx.GF.uiOpen = false; ctx.innerWidth = 1280; rueda.classList.remove("show");
console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: E/Espacio ya no atraviesan una decisión o un campo de interfaz.\n");
process.exit(fallos ? 1 : 0);
