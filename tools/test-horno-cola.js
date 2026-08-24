/* EL HORNO ES UNA COLA, NO UN COOLDOWN (24/8, tres reportes de dirección)
     « tablones y bloques aparecen en el inventario sin terminar el cd »
     « su cd es muy bajo »  ·  « el craft de +5 en el horno de piedra no funciona »
   Los tres salían de lo mismo: craftMat entregaba el material EN EL ACTO y ponía un
   enfriamiento para el clic siguiente. Contratos del horno nuevo:
     · fundir COBRA los insumos y NO entrega nada todavía: la pieza va al fuego;
     · el material entra a la bolsa cuando VENCE su reloj, ni un segundo antes;
     · los tiempos son de minutos (dirección: 3 min el tablón) y suben por escalón;
     · el ×5 encola de verdad hasta llenar el horno;
     · el horno tiene lugares: lleno, avisa y no cobra;
     · fundir y cerrar el navegador funciona (la cola viaja en el guardado y el tick
       la cobra al volver);
     · con la bolsa llena la pieza NO se pierde: se queda al fuego esperando lugar.
     node tools/test-horno-cola.js                                                             */
const fs = require("fs"), vm = require("vm");

const T0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + desfase); } static now() { return T0 + desfase; } }

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshHorno", "bagFull", "recalcFarmLevel", "tutoEvent"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;
const MAT_CD_S = vm.runInContext("MAT_CD_S", ctx), HORNO_SLOTS = vm.runInContext("HORNO_SLOTS", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const limpio = () => { G.tuto = { done: true }; G.horno = []; G.res = { madera: 99, piedra: 99, bronce: 99 }; G.invRows = 20; avisos.length = 0; };

console.log("\nLOS TIEMPOS SON DE MINUTOS, Y SUBEN POR ESCALÓN");
{
  ok("el tablón tarda 3 minutos (lo que pidió dirección)", MAT_CD_S.tablon === 180, MAT_CD_S.tablon + " s");
  ok("el bloque de piedra, lo mismo", MAT_CD_S.barra_piedra === 180);
  ok("y las barras suben con su escalón", MAT_CD_S.barra_bronce > MAT_CD_S.tablon &&
    MAT_CD_S.barra_hierro > MAT_CD_S.barra_bronce && MAT_CD_S.barra_oro > MAT_CD_S.barra_hierro,
    [MAT_CD_S.barra_bronce, MAT_CD_S.barra_hierro, MAT_CD_S.barra_oro].join(" < "));
  ok("ninguno baja de 3 minutos", Object.keys(MAT_CD_S).every(k => MAT_CD_S[k] >= 180));
}

console.log("\nFUNDIR COBRA Y NO ENTREGA: LA PIEZA VA AL FUEGO");
{
  limpio();
  const mad0 = G.res.madera;
  ctx.craftMat("tablon");
  ok("cobró las 3 maderas", G.res.madera === mad0 - 3, mad0 + " → " + G.res.madera);
  ok("y NO puso el tablón en la bolsa", !(G.res.tablon > 0), "tablon: " + (G.res.tablon || 0));
  ok("la pieza está al fuego", ctx.hornoList().length === 1);
  ok("con su reloj de 3 min", Math.abs(ctx.hornoFalta(ctx.hornoList()[0]) - 180000) < 1500,
    Math.round(ctx.hornoFalta(ctx.hornoList()[0]) / 1000) + " s");
  /* el tick a mitad de camino no entrega nada */
  desfase += 170000;
  ctx.checkHorno();
  ok("a los 170 s sigue al fuego (no entrega antes de tiempo)", !(G.res.tablon > 0) && ctx.hornoList().length === 1);
  desfase += 15000;
  ctx.checkHorno();
  ok("pasados los 3 min, el tablón entra a la bolsa", Math.floor(G.res.tablon || 0) === 1);
  ok("y el horno queda libre", ctx.hornoList().length === 0);
}

console.log("\nEL ×5 ENCOLA DE VERDAD (el bug del botón que no hacía nada)");
{
  limpio();
  ctx.craftLote(ctx.craftMat, "tablon", 5);
  ok("puso " + HORNO_SLOTS + " al fuego (los lugares del horno)", ctx.hornoList().length === HORNO_SLOTS,
    ctx.hornoList().length + " piezas");
  ok("y cobró solo lo que encoló", G.res.madera === 99 - 3 * HORNO_SLOTS, "madera " + G.res.madera);
  ok("el horno lleno avisa", avisos.some(a => /lleno/i.test(a)), avisos.join(" · "));
  const mad = G.res.madera;
  ctx.craftMat("tablon");
  ok("y con el horno lleno NO cobra", G.res.madera === mad);
}

console.log("\nFUNDIR Y CERRAR EL NAVEGADOR: LA COLA VIAJA Y SE COBRA AL VOLVER");
{
  limpio();
  ctx.craftMat("barra_bronce");
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  ok("la cola va en el guardado", Array.isArray(snap.horno) && snap.horno.length === 1);
  desfase += 60 * 60000;   // una hora afuera
  ctx.hydrate(snap);
  ok("tras el F5 la cola sigue ahí", ctx.hornoList().length === 1 || Math.floor(G.res.barra_bronce || 0) === 1);
  ctx.checkHorno();
  ok("y el tick la cobra al volver", Math.floor(G.res.barra_bronce || 0) === 1, "bronce: " + (G.res.barra_bronce || 0));
}

console.log("\nCON LA BOLSA LLENA LA PIEZA ESPERA — NO SE PIERDE");
{
  limpio();
  ctx.craftMat("tablon");
  desfase += 200000;
  /* llenar la bolsa DE VERDAD: invSlots() = 20 base + filas, así que hacen falta 20 pilas
     distintas (poner invRows en 0 no la llena — eso solo saca las filas compradas). */
  G.invRows = 0;   // sin filas compradas: 20 espacios base
  const ITEMS = vm.runInContext("ITEM_RES_ORDER", ctx);
  ITEMS.forEach(k => { if (k !== "tablon") G.res[k] = 5; });
  const CROPS = vm.runInContext("CROP_ORDER", ctx);
  G.seeds = {}; CROPS.forEach(k => G.seeds[k] = 5);
  ok("(la bolsa quedó llena para la prueba)", !ctx.roomForRes("tablon", 1),
    ctx.canonicalStacks().length + " pilas para " + ctx.invSlots() + " espacios");
  ctx.checkHorno();
  ok("no entrega y la deja al fuego", ctx.hornoList().length === 1 && !(G.res.tablon > 0));
  G.seeds = {}; vm.runInContext("ITEM_RES_ORDER", ctx).forEach(k => { if (k !== "madera") G.res[k] = 0; }); G.invRows = 20;
  ctx.checkHorno();
  ok("con lugar otra vez, la entrega", Math.floor(G.res.tablon || 0) === 1 && ctx.hornoList().length === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el horno cocina, no castiga.\n");
process.exit(fallos ? 1 : 0);
