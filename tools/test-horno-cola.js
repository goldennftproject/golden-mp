/* EL HORNO ES UNA COLA, NO UN COOLDOWN (24/8, tres reportes de dirección)
     « tablones y bloques aparecen en el inventario sin terminar el cd »
     « su cd es muy bajo »  ·  « el craft de +5 en el horno de piedra no funciona »
   Los tres salían de lo mismo: craftMat entregaba el material EN EL ACTO y ponía un
   enfriamiento para el clic siguiente. Contratos del horno nuevo:
     · fundir COBRA los insumos y NO entrega nada todavía: la pieza va al fuego;
     · el material entra a la bolsa cuando VENCE su reloj, ni un segundo antes;
     · los tiempos salen del reloj del NODO que da el ingrediente, partido por las tres bocas
       del horno (24/8 v2, dirección: « puede ser simultáneo, pero mucho más que 2 minutos »);
     · el ×5 encola de verdad hasta llenar el horno — y el botón dice cuántos van a entrar;
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

console.log("\nLOS TIEMPOS SALEN DEL RELOJ DE SU NODO, DIVIDIDO POR LAS TRES BOCAS");
{
  /* 24/8 v2 (dirección: « puede ser simultáneo, pero debería durar mucho más que 2 minutos »).
     La regla: el reloj del horno es el del nodo que da su ingrediente, partido por las 3 bocas.
     Árbol 30 min → tablón 10. Roca 40 min → bloque 13. Las vetas de metal son de horas, así que
     ahí se corta y sigue la escalera de siempre, un escalón por tier. */
  const CD = vm.runInContext("CD", ctx);
  ok("el tablón sale del reloj del árbol ÷ 3", MAT_CD_S.tablon === Math.round(CD.tree / 3 / 10) * 10,
    MAT_CD_S.tablon + " s (árbol " + CD.tree + " s)");
  ok("el bloque de piedra, del reloj de la roca ÷ 3", MAT_CD_S.barra_piedra === Math.round(CD.rock / 3 / 10) * 10,
    MAT_CD_S.barra_piedra + " s (roca " + CD.rock + " s)");
  ok("y las barras suben con su escalón", MAT_CD_S.barra_bronce > MAT_CD_S.barra_piedra &&
    MAT_CD_S.barra_hierro > MAT_CD_S.barra_bronce && MAT_CD_S.barra_oro > MAT_CD_S.barra_hierro,
    [MAT_CD_S.barra_bronce, MAT_CD_S.barra_hierro, MAT_CD_S.barra_oro].join(" < "));
  ok("ninguno baja de 10 minutos", Object.keys(MAT_CD_S).every(k => MAT_CD_S[k] >= 600));
  /* el piso que puso la dirección: ni con el Horno nivel 2 (−40 %) puede bajar de 2 minutos */
  const E2 = vm.runInContext("EDIF2_HORNO", ctx);
  const masRapido = Math.min.apply(null, Object.keys(MAT_CD_S).map(k => MAT_CD_S[k])) * (1 - E2 / 100);
  ok("y con el Horno nivel 2 el más rápido sigue arriba de 2 min", masRapido > 120, Math.round(masRapido) + " s");
}

console.log("\nEL HORNO NUNCA ES EL CUELLO DE BOTELLA (por eso puede pesar tanto)");
{
  /* la palanca real es el mineral, no el fuego: un tablón se come 3 maderas y un árbol repone
     1 cada 30 min. Si algún día el horno se acercara al reloj del nodo, esto avisa. */
  const CD = vm.runInContext("CD", ctx), MAT_DEF = vm.runInContext("MAT_DEF", ctx);
  const juntar = 3 * CD.tree;   // segundos de árbol para las 3 maderas de UN tablón
  ok("juntar la madera de un tablón tarda mucho más que fundirlo",
    juntar > MAT_CD_S.tablon * 5, Math.round(juntar / 60) + " min de árbol contra " + (MAT_CD_S.tablon / 60) + " min de fuego");
  ok("y el bloque de piedra, igual", 3 * CD.rock > MAT_CD_S.barra_piedra * 5);
  ok("cada pieza se cobra 3 unidades", Object.keys(MAT_DEF).every(k => Object.keys(MAT_DEF[k].cost).every(m => MAT_DEF[k].cost[m] === 3)));
}

console.log("\nFUNDIR COBRA Y NO ENTREGA: LA PIEZA VA AL FUEGO");
{
  limpio();
  const mad0 = G.res.madera;
  ctx.craftMat("tablon");
  ok("cobró las 3 maderas", G.res.madera === mad0 - 3, mad0 + " → " + G.res.madera);
  ok("y NO puso el tablón en la bolsa", !(G.res.tablon > 0), "tablon: " + (G.res.tablon || 0));
  ok("la pieza está al fuego", ctx.hornoList().length === 1);
  ok("con su reloj entero", Math.abs(ctx.hornoFalta(ctx.hornoList()[0]) - MAT_CD_S.tablon * 1000) < 1500,
    Math.round(ctx.hornoFalta(ctx.hornoList()[0]) / 1000) + " s");
  /* el tick a falta de diez segundos no entrega nada */
  desfase += MAT_CD_S.tablon * 1000 - 10000;
  ctx.checkHorno();
  ok("a diez segundos del final sigue al fuego (no entrega antes de tiempo)", !(G.res.tablon > 0) && ctx.hornoList().length === 1);
  desfase += 15000;
  ctx.checkHorno();
  ok("vencido el reloj, el tablón entra a la bolsa", Math.floor(G.res.tablon || 0) === 1);
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
  desfase += MAT_CD_S.tablon * 1000 + 20000;   // el reloj sale de la tabla, no de un número a mano
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
