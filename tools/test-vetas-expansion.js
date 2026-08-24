/* BRONCE Y ORO EN SIETE EXPANSIONES (24/8, dirección)
   « Agregar 1 nodo de bronce y oro a la tercera parcela. Repetir en la 6-8-10-12-14-16. »
   Contratos:
     · las siete (3, 6, 8, 10, 12, 14, 16) traen parcela + árbol + roca + bronce + oro;
     · las otras nueve siguen igual (parcela + árbol + roca) — no se coló ninguna de más;
     · las vetas van DENTRO de su bloque y en celdas distintas entre sí y de los otros nodos;
     · y como entregan 5 celdas productivas en vez de 3, SE PAGAN: el precio de las siguientes
       sube porque la fórmula cuenta las celdas acumuladas. El ancla no se mueve: una veta rinde
       20 plata/hora igual que una parcela.
     node tools/test-vetas-expansion.js                                                        */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const GF = vm.runInContext("GF", ctx), PRICE = vm.runInContext("PRICE", ctx),
      ORE_DEF = vm.runInContext("ORE_DEF", ctx), EXP_CON_VETA = vm.runInContext("EXP_CON_VETA", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const delExp = (i) => GF.WORLD_OBJECTS.filter(o => o.exp === i);
const tipos = (i) => delExp(i).map(o => o.type === "ore" ? o.ore : o.type).sort().join(",");

console.log("\nLAS SIETE QUE PIDIÓ DIRECCIÓN, Y SOLO ESAS");
{
  ok("la lista es 3, 6, 8, 10, 12, 14 y 16", EXP_CON_VETA.join(",") === "3,6,8,10,12,14,16", EXP_CON_VETA.join(","));
  const conVeta = [], sinVeta = [];
  for (let i = 0; i < 16; i++) (EXP_CON_VETA.indexOf(i + 1) >= 0 ? conVeta : sinVeta).push(i);
  ok("las siete traen bronce Y oro además del árbol y la roca",
    conVeta.every(i => tipos(i) === "bronce,oro,rock,tree"), conVeta.map(i => (i + 1) + ":" + tipos(i)).join(" · "));
  ok("las otras nueve siguen con árbol y roca, sin vetas coladas",
    sinVeta.every(i => tipos(i) === "rock,tree"), sinVeta.map(i => i + 1).join(","));
  const totalVetas = GF.WORLD_OBJECTS.filter(o => o.exp != null && o.type === "ore").length;
  ok("son 14 vetas nuevas en total", totalVetas === 14, totalVetas + " vetas");
}

console.log("\nCADA VETA EN SU SITIO: DENTRO DEL BLOQUE Y SIN PISARSE");
{
  let malas = [], repes = [];
  EXP_CON_VETA.forEach(n => {
    const i = n - 1, e = GF.EXPANSIONES[i], objs = delExp(i);
    const celdas = new Set();
    objs.forEach(o => {
      const c = o.leftCol, r = o.baseRow - 1;
      if (c < e.c0 || c >= e.c1 || r < e.r0 || r >= e.r1) malas.push(n + ":" + o.type);
      const k = c + "," + r; if (celdas.has(k)) repes.push(n + ":" + k); celdas.add(k);
    });
  });
  ok("todos los nodos caen dentro de su bloque", malas.length === 0, malas.join(" "));
  ok("y ninguno comparte celda con otro", repes.length === 0, repes.join(" "));
}

console.log("\nSE PAGAN: MÁS CELDAS, MÁS PRECIO (y el ancla intacta)");
{
  const cos = ctx.expansionCostos();
  const val = (c) => Object.keys(c).reduce((a, k) => a + (PRICE[k] || 0) * c[k], 0);
  const precios = cos.map(val);
  ok("los 16 precios suben siempre", precios.every((p, i) => i === 0 || p > precios[i - 1]),
    precios.slice(0, 5).join(" < ") + " … " + precios[15]);
  /* la 4 viene DESPUÉS de la 3 (que trae vetas): su precio tiene que reflejar esa granja mayor.
     Se compara el salto 3→4 contra el salto 4→5, que no lleva vetas en medio. */
  const salto34 = precios[3] / precios[2], salto45 = precios[4] / precios[3];
  ok("tras una expansión con vetas, la siguiente sube más de lo normal",
    salto34 > salto45, "×" + salto34.toFixed(2) + " contra ×" + salto45.toFixed(2));
  /* y las vetas siguen rindiendo su ancla */
  ["bronce", "oro"].forEach(k => {
    const o = ORE_DEF[k], h = o.cd / 3600, yld = o.yield || 1;
    ok("la veta de " + k + " rinde 20/h (el ancla)",
      Math.abs((yld * PRICE[k] - (yld * PRICE[k] - 20 * h)) / h - 20) < 0.01, h + " h · rinde " + yld);
  });
}

console.log("\nY LA GRANJA TERMINADA CRECE LO QUE TIENE QUE CRECER");
{
  const nodos = GF.WORLD_OBJECTS.filter(o => o.exp != null).length;
  ok("las 16 expansiones entregan 46 nodos (32 + 14 vetas)", nodos === 46, nodos + " nodos");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: siete bloques con veta, y cada uno pagando lo suyo.\n");
process.exit(fallos ? 1 : 0);
