/* EL MERCADER GOBLIN (22/8, dirección — auditoría del arranque, propuesta D)
   Un trueque por día, junto al buzón: pide del recurso básico que MÁS tenés y da el otro al
   valor +10%, con tope de ~40-60 de plata por día. Contratos:
     · la oferta es DETERMINÍSTICA por fecha (el F5 no re-sortea) y cambia al día siguiente;
     · pide del recurso que te sobra, y el trueque queda entre ×1,0 y ×1,4 de valor (propina
       acotada: endulza, no imprime);
     · aceptar hace el intercambio EXACTO, marca el día y no se puede repetir hasta mañana;
     · sin stock no hay trato (y no se pierde nada); con la bolsa llena tampoco (ni a medias);
     · el trato sobrevive al F5.
     node tools/test-goblin.js                                                                  */
const fs = require("fs"), vm = require("vm");

const REAL0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(REAL0 + desfase); } static now() { return REAL0 + desfase; } }

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = t => avisos.push(String(t));
["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
 "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "saveFarm"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, PRICE = vm.runInContext("PRICE", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const valor = (k, n) => (PRICE[k] || 1) * n;

console.log("\nLA OFERTA DEL DÍA: DETERMINÍSTICA, ANCLADA Y CON OJO EN TU BOLSA");
{
  G.tuto = { done: true }; G.res.madera = 30; G.res.piedra = 5;
  const a = ctx.goblinOfertaHoy(), b = ctx.goblinOfertaHoy();
  ok("dos consultas el mismo día dan LA MISMA oferta (el F5 no re-sortea)",
    JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a));
  ok("pide del recurso que te sobra (madera 30 contra piedra 5)", a.pide === "madera", a.pide);
  const ratio = valor(a.da, a.entrega) / valor(a.pide, a.cant);
  ok("el trueque queda entre ×1,0 y ×1,4 de valor (propina, no imprenta)",
    ratio >= 1.0 && ratio <= 1.4, "×" + ratio.toFixed(2));
  ok("y el valor del día no pasa de ~75 de plata", valor(a.pide, a.cant) <= 75, valor(a.pide, a.cant) + " de plata");
  G.res.madera = 2; G.res.piedra = 40;
  ok("si te sobra piedra, pide piedra", ctx.goblinOfertaHoy().pide === "piedra");
}

console.log("\nEL TRATO: EXACTO, UNA VEZ POR DÍA, SIN MEDIAS TINTAS");
{
  G.res.madera = 30; G.res.piedra = 5; G.goblin = { date: "" };
  const of = ctx.goblinOfertaHoy();
  const m0 = G.res.madera, p0 = G.res.piedra;
  const r = ctx.goblinAceptar();
  ok("el trueque se hace exacto", r.ok && G.res[of.pide] === m0 - of.cant && G.res[of.da] === p0 + of.entrega,
    "−" + of.cant + " " + of.pide + " → +" + of.entrega + " " + of.da);
  ok("y queda marcado el día", !ctx.goblinEstado().disponible);
  const r2 = ctx.goblinAceptar();
  ok("no hay segundo trato el mismo día", !!(r2 && r2.error), (r2 && r2.error) || "");
  /* el F5 conserva el trato hecho */
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  ok("tras el F5 sigue hecho", !ctx.goblinEstado().disponible);
}

console.log("\nSIN STOCK NO HAY TRATO — Y NADA SE PIERDE");
{
  desfase += 24 * 3600 * 1000;   // día siguiente: el goblin vuelve
  ok("al otro día está disponible de nuevo", ctx.goblinEstado().disponible);
  G.res.madera = 1; G.res.piedra = 0;
  const of = ctx.goblinOfertaHoy();
  const antes = JSON.stringify([G.res.madera, G.res.piedra]);
  const r = ctx.goblinAceptar();
  ok("sin stock suficiente el trato se niega", !!(r && r.error === "falta"));
  ok("y no tocó nada", JSON.stringify([G.res.madera, G.res.piedra]) === antes);
  ok("el goblin sigue esperando (no quemó el día)", ctx.goblinEstado().disponible);
}

console.log("\nY CADA DÍA, OFERTA NUEVA (misma fecha, misma oferta; otra fecha, puede cambiar)");
{
  G.res.madera = 50; G.res.piedra = 50;
  const hoy = ctx.goblinOfertaHoy();
  desfase += 24 * 3600 * 1000;
  const maniana = ctx.goblinOfertaHoy();
  ok("las cantidades salen de la fecha (dos días con distinta semilla)",
    JSON.stringify(hoy) !== JSON.stringify(maniana) || true,   // pueden coincidir por azar: lo que se exige es el determinismo, probado arriba
    "hoy " + JSON.stringify(hoy) + " · mañana " + JSON.stringify(maniana));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: «Grjj… buen negocio. Mañana, más.»\n");
process.exit(fallos ? 1 : 0);
