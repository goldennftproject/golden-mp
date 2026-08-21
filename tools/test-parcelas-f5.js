/* CADA F5 REGALABA UNA PARCELA (20/8, dirección — en vivo, con captura)
   "Hay otro bug: están apareciendo parcelas de la nada, esta es la 2da. Cada F5 recibo una."

   La causa: la migración que entrega las parcelas de expansiones atrasadas preguntaba
   « ¿hay una parcela tuya DENTRO del bloque? ». Pero mover la parcela regalada a otro lado es un
   gesto legítimo (dirección lo dijo el 19/8: "si la querés en otro lado, la arrastrás") — y en
   cuanto salía del bloque, CADA RECARGA veía el bloque vacío y regalaba otra.

   El arreglo: la entrega se decide por CONTABILIDAD, no por posición.
      esperadas = 3 de nacimiento + 1 por expansión con parcela + compradas + fichas del pase.
   Este test EJECUTA el ciclo del F5 (hydrate → snapshot → hydrate…) con los gestos reales del
   jugador de por medio: mover la parcela, comprar una, cobrar una ficha, cargar un guardado con
   fantasmas de este mismo bug.
     node tools/test-parcelas-f5.js                                                               */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["toast", "log", "isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshMarket", "syncEditDeco"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.saveFarm = () => {};
const G = ctx.G, GF = ctx.GF;
const B = GF.EXPANSIONES;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const f5 = (d) => { ctx.hydrate(JSON.parse(JSON.stringify(d))); return JSON.parse(JSON.stringify(ctx.snapshot())); };

console.log("\nEL CASO DE LA CAPTURA: PARCELAS MOVIDAS FUERA DE SU BLOQUE");
{
  /* dos expansiones, sus dos parcelas regaladas y MOVIDAS al corral (el gesto legítimo) */
  let d = { level: 5, expansiones: 2, plotsOwned: 5, plotsCompradas: 0, tuto: { done: true },
    layoutPlots: { 3: { col: 5, row: 5 }, 4: { col: 6, row: 5 } }, sflStock: true };
  const hist = [];
  for (let i = 0; i < 4; i++) { d = f5(d); hist.push(G.plotsOwned); }
  ok("cuatro F5 seguidos: las parcelas NO se multiplican", hist.every(h => h === 5), hist.join(" → "));
  ok("y las movidas siguen donde el jugador las dejó",
    G.layoutPlots[3] && G.layoutPlots[3].col === 5 && G.layoutPlots[4] && G.layoutPlots[4].col === 6);
}

console.log("\nEL GUARDADO DEL DISEÑADOR: LOS FANTASMAS DEL BUG SE RECORTAN");
{
  /* su estado tras el bug: 2 legítimas de expansión (movidas) + 2 fantasmas regalados por los F5 */
  let d = { level: 5, expansiones: 2, plotsOwned: 7, plotsCompradas: 0, tuto: { done: true },
    layoutPlots: { 3: { col: 5, row: 5 }, 4: { col: 6, row: 5 },
                   5: { col: B[0].parcela.col, row: B[0].parcela.row }, 6: { col: B[1].parcela.col, row: B[1].parcela.row } },
    sflStock: true };
  d = f5(d);
  ok("los 2 fantasmas se recortan: 7 → 5", G.plotsOwned === 5, G.plotsOwned + " parcelas");
  ok("y sus posiciones se borran", !G.layoutPlots[5] && !G.layoutPlots[6]);
  ok("las 2 legítimas quedan intactas", !!G.layoutPlots[3] && !!G.layoutPlots[4]);
  const hist = [];
  for (let i = 0; i < 3; i++) { d = f5(d); hist.push(G.plotsOwned); }
  ok("y después, estable", hist.every(h => h === 5), hist.join(" → "));
}

console.log("\nLA ENTREGA LEGÍTIMA SIGUE FUNCIONANDO");
{
  /* jugador viejo: expansiones compradas ANTES de que existiera la entrega — le faltan */
  let d = { level: 5, expansiones: 2, plotsOwned: 3, tuto: { done: true }, layoutPlots: {}, sflStock: true };
  d = f5(d);
  ok("las 2 que faltaban se entregan: 3 → 5", G.plotsOwned === 5, G.plotsOwned + "");
  const dentro = (p, b) => p && p.col >= b.c0 && p.col < b.c1 && p.row >= b.r0 && p.row < b.r1;
  ok("y quedan DENTRO de sus bloques", dentro(G.layoutPlots[3], B[0]) && dentro(G.layoutPlots[4], B[1]));
  d = f5(d);
  ok("el F5 siguiente no regala más", G.plotsOwned === 5);
}

console.log("\nLAS COMPRADAS Y LAS FICHAS CUENTAN EN EL LIBRO MAYOR");
{
  let d = { level: 5, expansiones: 1, plotsOwned: 4, plotsCompradas: 0, tuto: { done: true },
    layoutPlots: { 3: { col: B[0].parcela.col, row: B[0].parcela.row } }, sflStock: true };
  d = f5(d);
  /* compra una en tienda: plotsOwned y plotsCompradas suben JUNTAS */
  G.plata = 500; ctx.comprarParcela();
  ok("compra: 4 → 5 y compradas = 1", G.plotsOwned === 5 && G.plotsCompradas === 1);
  d = JSON.parse(JSON.stringify(ctx.snapshot()));
  d = f5(d);
  ok("el F5 no se la come ni regala otra", G.plotsOwned === 5 && G.plotsCompradas === 1, G.plotsOwned + " · compradas " + G.plotsCompradas);
  /* la Ficha de parcela del pase también suma en el libro */
  G.plotsOwned++; G.plotsFicha = (G.plotsFicha || 0) + 1;   // lo que hace el cobro de la ficha
  d = JSON.parse(JSON.stringify(ctx.snapshot()));
  d = f5(d);
  ok("la parcela de la ficha sobrevive al F5", G.plotsOwned === 6 && G.plotsFicha === 1, G.plotsOwned + " · fichas " + G.plotsFicha);
}

console.log("\nY EL GUARDADO SIN CONTADOR (PRE-HOY) DEDUCE SIN CONTAR REGALOS COMO COMPRAS");
{
  let d = { level: 5, expansiones: 2, plotsOwned: 6, tuto: { done: true },
    layoutPlots: { 3: { col: B[0].parcela.col, row: B[0].parcela.row }, 4: { col: B[1].parcela.col, row: B[1].parcela.row }, 5: { col: 7, row: 7 } }, sflStock: true };
  d = f5(d);
  ok("6 tenidas − 3 nacimiento − 2 regalo = 1 comprada", G.plotsCompradas === 1, "compradas " + G.plotsCompradas);
  ok("y no se recorta nada: la cuenta cierra", G.plotsOwned === 6);
}

console.log("\nLA FLAG DE DIRECCIÓN: « una vez entregado, no se vuelve a entregar »");
{
  /* guardado CON flag: la flag manda y la contabilidad ni se mira. plotsOwned puede ser lo que
     sea (fichas, compras, historia rara): NADA se recorta y NADA se regala. */
  let d = { level: 9, expansiones: 2, plotsOwned: 11, plotsCompradas: 1, expParcelasDadas: 2,
    tuto: { done: true }, layoutPlots: { 3: { col: 5, row: 5 }, 4: { col: 6, row: 5 } }, sflStock: true };
  const hist = [];
  for (let i = 0; i < 3; i++) { d = f5(d); hist.push(G.plotsOwned + "/" + G.expParcelasDadas); }
  ok("con la flag al día, el F5 no toca nada", hist.every(h => h === "11/2"), hist.join(" → "));

  /* flag atrasada (compró una expansión en un cliente viejo): se entrega SOLO la pendiente */
  d = { level: 9, expansiones: 3, plotsOwned: 11, plotsCompradas: 1, expParcelasDadas: 2,
    tuto: { done: true }, layoutPlots: {}, sflStock: true };
  d = f5(d);
  ok("flag 2 con 3 expansiones: entrega LA pendiente y marca", G.plotsOwned === 12 && G.expParcelasDadas === 3,
    G.plotsOwned + " parcelas · flag " + G.expParcelasDadas);
  d = f5(d);
  ok("y el F5 siguiente ya no entrega", G.plotsOwned === 12 && G.expParcelasDadas === 3);

  /* y expansionComprar marca la flag al entregar */
  G.plata = 0; G.res = Object.assign({}, G.res); G.level = 99;
  const ex = ctx.expansionSiguiente();
  Object.keys(ex.costo).forEach(k => { G.res[k] = ex.costo[k] + 5; });
  const flagAntes = G.expParcelasDadas, ownedAntes = G.plotsOwned;
  ctx.expansionComprar();
  ok("expansionComprar entrega y sube la flag", G.expParcelasDadas === flagAntes + 1 && G.plotsOwned === ownedAntes + 1,
    "flag " + flagAntes + " → " + G.expParcelasDadas);
  d = JSON.parse(JSON.stringify(ctx.snapshot()));
  d = f5(d);
  ok("y tras guardar y volver, sigue todo en su sitio", G.expParcelasDadas === flagAntes + 1 && G.plotsOwned === ownedAntes + 1);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la posición ya no es el libro mayor.\n");
process.exit(fallos ? 1 : 0);
