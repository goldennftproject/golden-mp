/* CONTEXTOS DEL MUNDO SOBRE TARJETAS DE ESCRITORIO
   =================================================
   Las tarjetas normales de PC dejan que el mundo siga andando. Eso no autoriza a abrir otra
   interfaz contextual (rueda, aparejos o cuerpo) POR ENCIMA: la primera pulsación sobre la
   tarjeta inferior se perdería cerrando la de arriba. Se prueba la puerta compartida, el estado
   del cadáver y que móvil conserve su flujo.
     node tools/test-contextos-sobre-overlay-pc.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");

const desde = (texto, inicio) => {
  const i = UI.indexOf(texto, inicio || 0);
  if (i < 0) throw new Error("No se encontró: " + texto);
  return i;
};
const iniPuerta = desde("function anyOvOpen()");
const finPuerta = desde("const OV_REFRESH", iniPuerta);
const iniPesca = desde("function pescaAparejosAbrir()");
const finPesca = desde("function pescaAparejosCerrar()", iniPesca);
const iniRueda = desde("function showSeedWheel(");
const finRueda = desde("function hideSeedWheel()", iniRueda);
const iniEleccion = desde("function mostrarEleccion(");
const finEleccion = desde("/* ═══ EL MODO EDICIÓN", iniEleccion);
if (finPuerta < 0 || finPesca < 0 || finRueda < 0 || finEleccion < 0) throw new Error("No se pudo recortar la puerta contextual");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases() {
  const datos = new Set();
  return { add: c => datos.add(c), remove: c => datos.delete(c), contains: c => datos.has(c) };
}
function entorno(ancho, abierta) {
  const avisos = [];
  const ruedaCentro = { style: {}, innerHTML: "", querySelectorAll: () => [] };
  const rueda = { classList: clases(), querySelector: () => ruedaCentro };
  const aparejos = { classList: clases() };
  let pintados = 0, colocados = 0;
  const document = {
    querySelector: sel => sel === ".ov.show" && abierta ? {} : null,
    addEventListener() {}, removeEventListener() {},
  };
  const ctx = {
    window: { innerWidth: ancho, innerHeight: 720 }, document, Math,
    $: id => ({ seedwheel: rueda, pesca4: aparejos })[id] || null,
    toast: t => avisos.push(String(t)),
    pescaV4Pintar: () => { pintados++; }, placePescaAparejosPc: () => { colocados++; },
    GF: { spr: () => "" }, G: { seeds: { papa: 2 } },
    CROP_ORDER: ["papa"], CROP_DEF: { papa: { label: "Papa", emoji: "🥔", grow: 10, lvl: 1 } },
    cropUnlocked: () => true, fmtSecs: n => String(n), seedWheelCenterPc: (x, y) => ({ x, y }),
    setTimeout: () => 0,
  };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniPuerta, finPuerta) + UI.slice(iniPesca, finPesca) + UI.slice(iniRueda, finRueda) + UI.slice(iniEleccion, finEleccion), ctx);
  return { ctx, avisos, rueda, aparejos, pintados: () => pintados, colocados: () => colocados };
}

console.log("\nEN PC UNA TARJETA IMPIDE ABRIR OTRA INTERFAZ CONTEXTUAL");
{
  const e = entorno(1280, true);
  ok("la puerta reconoce un overlay abierto sólo en escritorio", vm.runInContext("hayOvPcAbierto()", e.ctx) === true);
  vm.runInContext("showSeedWheel(120, 160, {})", e.ctx);
  ok("la rueda de semillas no se monta sobre la tarjeta", !e.rueda.classList.contains("show") && /semillas/i.test(e.avisos.at(-1) || ""), e.avisos.join(" · "));
  vm.runInContext("pescaAparejosAbrir()", e.ctx);
  ok("los aparejos tampoco toman la capa alta", !e.aparejos.classList.contains("show") && e.pintados() === 0 && /aparejos/i.test(e.avisos.at(-1) || ""), e.avisos.join(" · "));
  let elegida = 0;
  e.ctx.elegida = () => { elegida++; };
  vm.runInContext('mostrarEleccion("Elegí", [{ k:"a", txt:"A" }], elegida)', e.ctx);
  ok("la rueda reutilizada no ejecuta una elección de respaldo", !e.rueda.classList.contains("show") && elegida === 0 && /elegir/i.test(e.avisos.at(-1) || ""), e.avisos.join(" · "));
}

console.log("\nMÓVIL MANTIENE SU COMPOSICIÓN ACTUAL");
{
  const e = entorno(640, true);
  ok("la misma tarjeta no activa la puerta en móvil", vm.runInContext("hayOvPcAbierto()", e.ctx) === false);
  vm.runInContext("showSeedWheel(120, 160, {})", e.ctx);
  ok("la rueda se sigue abriendo al toque", e.rueda.classList.contains("show") && e.avisos.length === 0);
  vm.runInContext("pescaAparejosAbrir()", e.ctx);
  ok("los aparejos siguen abriéndose en móvil", e.aparejos.classList.contains("show") && e.pintados() === 1 && e.colocados() === 1 && e.ctx.GF.uiOpen === true);
}

console.log("\nREVISAR UN CUERPO NO CAMBIA SU ESTADO DETRÁS DE UNA TARJETA");
{
  const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
  const g = nombre => vm.runInContext(nombre, ctx);
  const avisos = [];
  ctx.toast = m => avisos.push(String(m));
  vm.runInContext("toast = window.toast; hayOvPcAbierto = () => true;", ctx);
  const esc = Object.create(g("ForestScene").prototype);
  let brillos = 0, abre = 0;
  esc.cuerpoAlAlcance = () => true;
  esc.apagarBrillos = () => { brillos++; };
  esc.abrirCuerpo = () => { abre++; };
  const cuerpo = { label: "Rata", drops: [{ k: "carne", n: 1 }], revisado: false };
  esc.revisarCuerpo(cuerpo);
  ok("no marca el cuerpo como revisado ni apaga sus brillos", !cuerpo.revisado && brillos === 0 && abre === 0 && /ventana/i.test(avisos.at(-1) || ""), avisos.join(" · "));

  const directo = Object.create(g("ForestScene").prototype);
  directo._cuerpoAbierto = null;
  directo.abrirCuerpo(cuerpo);
  ok("un llamador directo tampoco puede montar el panel sobre la tarjeta", directo._cuerpoAbierto === null);

  avisos.length = 0;
  vm.runInContext("hayOvPcAbierto = () => false;", ctx);
  esc.revisarCuerpo(cuerpo);
  ok("sin overlay la revisión conserva su camino normal", cuerpo.revisado && brillos === 1 && abre === 1 && avisos.length === 0);
}

console.log("\nLA PUERTA ESTÁ EN LOS PUNTOS REALES DE APERTURA");
{
  const revisar = FOREST.slice(FOREST.indexOf("  revisarCuerpo(c) {"), FOREST.indexOf("  /* la ventanita del cuerpo", FOREST.indexOf("  revisarCuerpo(c) {")));
  const abrir = FOREST.slice(FOREST.indexOf("  abrirCuerpo(c) {"), FOREST.indexOf("  cerrarCuerpo()", FOREST.indexOf("  abrirCuerpo(c) {")));
  ok("semillas y aparejos se protegen desde sus puertas de UI", /function showSeedWheel\([\s\S]{0,140}hayOvPcAbierto\(\)/.test(UI) && /function pescaAparejosAbrir\(\)[\s\S]{0,140}hayOvPcAbierto\(\)/.test(UI) && /showSeedWheel\(pt\.event\.clientX/.test(FARM));
  ok("la comprobación del cuerpo sucede antes de mutar revisado", revisar.indexOf("hayOvPcAbierto") >= 0 && revisar.indexOf("hayOvPcAbierto") < revisar.indexOf("if (!c.revisado)") && /abrirCuerpo\(c\) \{[\s\S]{0,330}hayOvPcAbierto/.test(abrir));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: una tarjeta de PC no deja nacer un contexto del mundo encima.\n");
process.exit(fallos ? 1 : 0);
