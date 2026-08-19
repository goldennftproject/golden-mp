/* ¿PRICE SIGUE LA FÓRMULA? (17/8)
   El comentario de state.js dice:  valor = horas del reloj × 20 + costo de la herramienta.
   Los materiales no se venden, así que PRICE es la VARA con la que todo lo demás los valora:
   pedidos del tablón, recompensas, coste de expansiones. Si la vara está torcida, todo lo que
   cuelgue de ella sale torcido — y no se nota, porque no hay mercado que lo delate.
   El costo de la herramienta es RECURSIVO (el pico de oro se hace con bronce, que vale según
   esta misma tabla), así que se resuelve por iteración hasta que los números dejan de moverse.
     node tools/auditar-precio-sombra.js                                                     */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={PRICE,ORE_DEF,PICK_DEF,CD,TOOL_CRAFT,ORE_ORDER};", ctx, { filename: "state.js" });
const X = ctx.__X, ANCLA = 20;

// horas de reloj de cada material
const HORAS = { madera: X.CD.tree / 3600, piedra: X.CD.rock / 3600 };
X.ORE_ORDER.forEach(k => { if (k !== "piedra") HORAS[k] = X.ORE_DEF[k].cd / 3600; });
// qué herramienta hace falta para cada material, y qué cuesta esa herramienta
const HERRA = { madera: X.TOOL_CRAFT.axe, piedra: X.PICK_DEF.stone };
["bronce","hierro","oro","diamante","netherita"].forEach((k, i) => {
  HERRA[k] = X.PICK_DEF[["bronze","iron","gold","diamond","netherite"][i]];
});

let v = { madera: 36, piedra: 46 };   // semilla de la iteración
for (let it = 0; it < 60; it++) {
  const nv = {};
  for (const k in HORAS) {
    const h = HERRA[k] || { cost: {}, plata: 0 };
    let herr = h.plata || 0;
    for (const m in h.cost || {}) herr += (h.cost[m] || 0) * (v[m] || 0);
    nv[k] = HORAS[k] * ANCLA + herr;   // dur:1 → cada golpe consume una herramienta entera
  }
  v = nv;
}
console.log("material     reloj   ancla(h x20)   herramienta   FORMULA   PRICE de hoy   desvio");
let peor = 0;
for (const k of ["madera","piedra","bronce","hierro","oro","diamante","netherita"]) {
  const h = HERRA[k] || { cost:{}, plata:0 };
  let herr = h.plata || 0;
  for (const m in h.cost || {}) herr += (h.cost[m] || 0) * v[m];
  const f = Math.round(v[k]), p = X.PRICE[k], d = 100 * (p - f) / f;
  peor = Math.max(peor, Math.abs(d));
  console.log(k.padEnd(12) + (HORAS[k] + " h").padStart(6) + String(Math.round(HORAS[k]*ANCLA)).padStart(14) +
    String(Math.round(herr)).padStart(14) + String(f).padStart(10) + String(p).padStart(15) +
    (d >= 0 ? "  +" : "  ") + d.toFixed(0) + "%");
}
console.log("\ndesvio maximo: " + peor.toFixed(0) + "%");

/* ===== LO QUE ESE DESVÍO SIGNIFICA EN LA MESA ==========================================
   Los picos tienen dur:1 — un pico por picada. Así que picar un mineral CONSUME un pico
   entero, y ese pico se hace con el mineral del tier anterior. El costo se compone hacia
   arriba. La pregunta es si lo que sacás vale más que lo que gastaste.                   */
console.log("\n===== ¿CONVIENE PICAR? (con los PRICE de hoy, que son la vara del juego) =====");
console.log("mineral      vale   pico   da   cuesta/picada   neto por picada   el ancla dice   ok?");
const PICK = { bronce:"bronze", hierro:"iron", oro:"gold", diamante:"diamond", netherita:"netherite" };
for (const k of ["bronce","hierro","oro","diamante","netherita"]) {
  const pd = X.PICK_DEF[PICK[k]];
  let c = pd.plata || 0;
  for (const m in pd.cost || {}) c += pd.cost[m] * X.PRICE[m];
  const usos = pd.dur || 1, porUso = c / usos;
  const Y = (X.ORE_DEF[k] && X.ORE_DEF[k].yield) || 1;   // 18/8: la picada da Y unidades, no una
  const vale = X.PRICE[k], neto = Y * vale - porUso, debe = ANCLA * HORAS[k];
  const ok = Math.abs(neto - debe) / debe < 0.06;
  console.log(k.padEnd(12) + String(vale).padStart(6) + String(Math.round(c)).padStart(7) +
    String(Y).padStart(5) + String(Math.round(porUso)).padStart(16) +
    (neto >= 0 ? "  +" : "  ") + String(Math.round(neto)).padStart(13) +
    String(Math.round(debe)).padStart(16) + "   " + (ok ? "si" : "NO (" + (100*(neto-debe)/debe).toFixed(0) + "%)"));
}
console.log("\n(el ancla dice: horas del reloj x 20. Si el neto coincide, ese mineral rinde igual que una parcela)");
