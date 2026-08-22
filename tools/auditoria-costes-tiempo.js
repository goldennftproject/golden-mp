/* ¿CUÁNTOS DÍAS REALES CUESTA CADA EXPANSIÓN Y CADA EDIFICIO? (21/8, dirección)
   "Revisa los valores de cada expansión y cada edificio, y fíjate si están bien o los
    abaratarías. Hace falta una auditoría."

   La vara: convertir cada coste a DÍAS DEL JUGADOR REAL — el de 3 visitas al día, con los
   relojes actuales y los nodos que de verdad tiene en esa etapa. No lo que el ancla teórica
   produce: lo que ese jugador junta.

   Producción real por día (3 visitas, cada nodo se cosecha 1 vez por visita porque sus relojes
   de 30-40 min ya vencieron entre visita y visita):
     · madera  = árboles × 3 × 1        (árboles = 3 del corral + 1 por expansión hecha)
     · piedra  = rocas × 3 × 1 + veta de piedra × 3 × 1
     · mineral = su ÚNICA veta × picadas/día × 2   (picadas/día = min(3, 24h/reloj de la veta))
   Los materiales procesados (tablón, bloques, barras) se convierten: 3 crudos = 1 procesado.

   El coste en días de una compra = su material CUELLO DE BOTELLA (no la suma: se juntan en
   paralelo). Se compara contra la escala que el propio diseño declaró (0,7 h y 2 h las dos
   primeras abaratadas; de ~1,5 a ~6 días de granja las demás).
     node tools/auditoria-costes-tiempo.js                                                        */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const RL = vm.runInContext("RES_LABEL", ctx);
const OD = vm.runInContext("ORE_DEF", ctx);
const MAT = vm.runInContext("MAT_DEF", ctx);
const BD = vm.runInContext("BUILD_DEF", ctx);
const NIV = vm.runInContext("FARM_EXPANSION", ctx);
const costos = ctx.expansionCostos();
const VISITAS = 3;

/* producción diaria de cada material CRUDO, con `exp` expansiones hechas.
   21/8 — CARGAS: el nodo pasado acumula hasta 4 relojes (NODO_CARGAS_MAX). Con 3 visitas al día
   los huecos son de ~8 h, mucho más que las 2 h / 2 h 40 que tarda en llenarse: cada visita
   cosecha el nodo LLENO. Producción por visita = el tope de cargas. */
const CARGAS = vm.runInContext("NODO_CARGAS_MAX", ctx);
function porDia(exp) {
  const arboles = 3 + exp, rocas = 3 + exp;
  const p = { madera: arboles * VISITAS * CARGAS, piedra: (rocas + 1 /* veta de piedra */) * VISITAS * CARGAS };
  for (const k of ["bronce", "hierro", "oro", "diamante", "netherita"]) {
    /* las vetas de mineral quedaron APARTADAS de las cargas (dirección, 21/8): reloj simple.
       El jugador de 3 visitas cosecha los relojes que alcanza a ver vencidos, con yield 2. */
    const picadas = Math.min(VISITAS, Math.floor(24 / (OD[k].cd / 3600)));
    p[k] = 1 * Math.max(1, picadas) * (OD[k].yield || 1);   // una única veta de cada mineral
  }
  return p;
}
/* un coste (con procesados) → días del jugador real; devuelve además el cuello de botella */
function dias(cost, exp) {
  const prod = porDia(exp);
  const crudo = {};
  for (const k in cost) {
    if (MAT[k]) { const base = Object.keys(MAT[k].cost)[0]; crudo[base] = (crudo[base] || 0) + cost[k] * MAT[k].cost[base]; }
    else crudo[k] = (crudo[k] || 0) + cost[k];
  }
  let peor = 0, quien = "-";
  for (const k in crudo) {
    const d = crudo[k] / (prod[k] || 0.0001);
    if (d > peor) { peor = d; quien = crudo[k] + " " + (RL[k] || k) + " a " + (prod[k] || 0) + "/día"; }
  }
  return { d: peor, quien, crudo };
}
const f = (n) => n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;

console.log("\n=== EXPANSIONES · días del jugador real (3 visitas/día) vs escala del diseño ===\n");
console.log("  #   nivel   días REALES   diseño      cuello de botella");
/* la escala declarada del diseño: 0,7h y 2h las dos primeras; ~1,5 → ~6 días las demás */
const disenio = (i) => i === 0 ? 0.03 : i === 1 ? 0.08 : 1.5 + (6 - 1.5) * Math.pow((i - 2) / 13, 0.9);
let peores = [];
for (let i = 0; i < 16; i++) {
  const r = dias(costos[i], i);
  const d0 = disenio(i);
  const factor = r.d / d0;
  const marca = factor > 2 ? "  ←" + f(factor) + "× lo diseñado" : "";
  console.log("  " + String(i + 1).padStart(2) + "   " + String(NIV[i]).padStart(3) + "     " +
    String(f(r.d)).padStart(6) + "      " + String(f(d0)).padStart(5) + "      " + r.quien + marca);
  if (factor > 2) peores.push({ n: i + 1, factor });
}

console.log("\n=== EDIFICIOS · días del jugador real en el momento en que se abren ===\n");
console.log("  edificio            días REALES   cuello de botella");
/* expansiones que un jugador lleva al nivel del edificio (las que su nivel permite) */
const expAlNivel = (lvl) => NIV.filter(n => n <= lvl).length;
for (const id in BD) {
  const b = BD[id];
  const exp = Math.min(16, expAlNivel(b.lvl || 1));
  const r = dias(b.cost || {}, exp);
  console.log("  " + (b.label + "                    ").slice(0, 18) + "  " + String(f(r.d)).padStart(6) + "      " + r.quien);
}

console.log("\n(los edificios del tutorial —Herrería, Horno, Cocina— se juzgan aparte: su reloj es el del primer día)");
process.exit(0);
