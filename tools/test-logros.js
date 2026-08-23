/* LOGROS (22/8, dirección — « los logros es una idea, exactamente »)
   Pestaña 🏆 del menú: metas por sistema en tres tiers (bronce/plata/oro) + únicos de las
   primeras horas. Contratos:
     · los premios cuelgan del ancla: 5/20/80 = 15 min · 1 h · 4 h de 20 plata/hora;
     · el total repartible está ACOTADO (≈1.000 de plata): condimento, no fuente de ingreso;
     · los contadores son los de G.stats — la acción real mueve el logro, nada se cuenta aparte;
     · cobrar paga UNA vez, exige haber llegado, y lo cobrado sobrevive al F5;
     · nada de duplicados: ningún único repite el bronce de una escalera;
     · las metas de bronce se alcanzan en la primera sesión larga (dirección: enganchar temprano).
     node tools/test-logros.js                                                                  */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshBarn", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA TABLA: ANCLADA, ACOTADA Y SIN DUPLICADOS");
{
  const PREMIO = vm.runInContext("LOGRO_PREMIO", ctx), DEF = vm.runInContext("LOGRO_DEF", ctx), UNI = vm.runInContext("LOGRO_UNICOS", ctx);
  ok("los premios son 15 min / 1 h / 4 h del ancla (5/20/80)", JSON.stringify(PREMIO) === "[5,20,80]", JSON.stringify(PREMIO));
  const total = DEF.length * (PREMIO[0] + PREMIO[1] + PREMIO[2]) + UNI.length * PREMIO[0];
  ok("el total repartible no pasa de 1.200 de plata (hoy: " + total + ")", total <= 1200);
  const monot = DEF.every(d => d.tiers[0] < d.tiers[1] && d.tiers[1] < d.tiers[2]);
  ok("cada escalera sube (bronce < plata < oro)", monot);
  const ids = DEF.map(d => d.id).concat(UNI.map(u => u.id));
  ok("ningún id se repite", new Set(ids).size === ids.length);
  ok("los únicos no duplican bronces: ni goblin ni expandir están entre los únicos",
    !UNI.some(u => /goblin|exp/.test(u.id)));
}

console.log("\nLA ACCIÓN REAL MUEVE EL LOGRO (contadores de G.stats)");
{
  G.stats = {}; G.logros = {};
  for (let i = 0; i < 10; i++) ctx.statAdd("cosechar", "papa", 1);
  const fila = ctx.logroLista().find(f => f.id === "cosechar");
  ok("10 cosechas llenan el bronce de 🌾", fila.n === 10 && fila.tiers[0].cobrable, fila.n + "/" + fila.tiers[0].meta);
  ok("la plata del mismo logro sigue en camino", !fila.tiers[1].cobrable);
  /* el trato del goblin cuenta solo */
  G.tuto = { done: true }; G.res.madera = 30; G.res.piedra = 5; G.goblin = { date: "" };
  ctx.goblinAceptar();
  ok("un trato con el goblin llena su bronce (meta 1)",
    ctx.logroLista().find(f => f.id === "goblin").tiers[0].cobrable);
}

console.log("\nCOBRAR: UNA VEZ, CON LA META CUMPLIDA, Y SOBREVIVE AL F5");
{
  const p0 = G.plata;
  const r = ctx.logroCobrar("cosechar:0");
  ok("cobrar el bronce paga 5", r.ok && G.plata === p0 + 5, "+" + (G.plata - p0));
  const r2 = ctx.logroCobrar("cosechar:0");
  ok("no se cobra dos veces", !!(r2 && r2.error), r2 && r2.error);
  const r3 = ctx.logroCobrar("cosechar:1");
  ok("la plata (100) no se cobra con 10", !!(r3 && r3.error), r3 && r3.error);
  const r4 = ctx.logroCobrar("no-existe");
  ok("una llave inventada no paga", !!(r4 && r4.error));
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  ok("tras el F5, el bronce sigue cobrado", !!(ctx.logroCobrados()["cosechar:0"]));
  ok("y el contador de pendientes lo sabe (goblin y únicos esperan)", ctx.logroPendientes() >= 1, ctx.logroPendientes() + " pendientes");
}

console.log("\nLOS ÚNICOS DE LAS PRIMERAS HORAS");
{
  G.firstCropDone = true;
  const u = ctx.logroLista().find(f => f.id === "u_cosecha");
  ok("«tu primera cosecha» se enciende con la bandera real (G.firstCropDone)", u.tiers[0].cobrable);
  const t = ctx.logroLista().find(f => f.id === "u_tuto");
  ok("«terminar el tutorial» lee G.tuto.done", t.tiers[0].cobrable);
  const pl0 = G.plata;
  ctx.logroCobrar("u_cosecha");
  ok("un único paga como un bronce (5)", G.plata === pl0 + 5);
}

console.log("\nY EL BRONCE LLEGA EN LA PRIMERA SESIÓN (dirección: enganchar temprano)");
{
  const DEF = vm.runInContext("LOGRO_DEF", ctx);
  const tempranos = DEF.filter(d => ["cosechar", "talar", "minar", "goblin", "expandir"].includes(d.id));
  ok("las metas de bronce del arranque son chicas (≤10)", tempranos.every(d => d.tiers[0] <= 10),
    tempranos.map(d => d.id + ":" + d.tiers[0]).join(" "));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la vitrina espera sus trofeos.\n");
process.exit(fallos ? 1 : 0);
