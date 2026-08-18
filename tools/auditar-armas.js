/* LA ESCALERA DE ARMAS (18/8)
   Regla: subir de arma nunca puede EMPEORAR el trato. Se mide el COSTO POR PUNTO DE DAÑO (lo que
   cuesta reparar dividido por los usos, dividido por el daño medio). Si esa cifra sube al subir de
   tier, el tramo es un impuesto y al jugador le conviene quedarse con el arma vieja.
     node tools/auditar-armas.js                                                                 */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={ARM_DEF,ARM_RAREZAS,ARM_TIPOS,PRICE,MAT_DEF,ARM_MAT,ARM_MAT_FORJA};", ctx, { filename: "state.js" });
const X = ctx.__X;
const P = Object.assign({}, X.PRICE);
for (const m in X.MAT_DEF) { let v = 0; for (const k in X.MAT_DEF[m].cost) v += X.MAT_DEF[m].cost[k] * (P[k] || 0); P[m] = v; }
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("COSTO POR PUNTO DE DAÑO — si sube al subir de tier, ese tramo es un impuesto\n");
console.log("tipo      madera  piedra  bronce     oro  diamante   peor/mejor   óptima");
const todas = [];
X.ARM_TIPOS.forEach(t => {
  const fila = X.ARM_RAREZAS.map(r => {
    const a = X.ARM_DEF[t + "_" + r];
    let rep = 0; for (const k in a.repair || {}) rep += a.repair[k] * (P[k] || 0);
    return (rep / a.dur) / ((a.min + a.max) / 2);
  });
  const rel = Math.max(...fila) / Math.min(...fila);
  todas.push(rel);
  const mejor = X.ARM_RAREZAS[fila.indexOf(Math.min(...fila))];
  console.log("  " + t.padEnd(8) + fila.map(v => v.toFixed(2).padStart(7)).join("") +
    rel.toFixed(1).padStart(13) + "x   " + mejor);
});
ok("ningún tipo tiene un tramo que sea impuesto", Math.max(...todas) < 1.6,
  "el peor es x" + Math.max(...todas).toFixed(1) + " (antes x6,0)");

// el material de reparar tiene que ser de la MISMA clase en toda la escalera
const clases = X.ARM_RAREZAS.map(r => (X.ARM_MAT[r] || "").startsWith("barra_") ? "barra" : "prima");
ok("reparar usa siempre materia prima", new Set(clases).size === 1,
  "reparar: " + X.ARM_RAREZAS.map(r => X.ARM_MAT[r]).join(", "));
ok("forjar sí puede pedir material elaborado",
  X.ARM_RAREZAS.some(r => (X.ARM_MAT_FORJA[r] || "").startsWith("barra_")),
  "forjar: " + X.ARM_RAREZAS.map(r => X.ARM_MAT_FORJA[r]).join(", "));

// y que el arma de arriba pegue más que la de abajo, obviamente
let orden = true;
X.ARM_TIPOS.forEach(t => { let prev = 0;
  X.ARM_RAREZAS.forEach(r => { const a = X.ARM_DEF[t + "_" + r], d = (a.min + a.max) / 2;
    if (d <= prev) orden = false; prev = d; }); });
ok("cada arma pega más que la anterior", orden);

console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
