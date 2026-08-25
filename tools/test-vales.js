/* ¿SIGUE EL EXPLOIT DE LOS VALES? (18/8)
   Medido en la auditoría: x800. Los vales se emitían por escalón y se gastaban a precio fijo, y el
   sobre de semillas daba el cultivo de mayor nivel. Entregabas 6 de plata en papas y sacabas 3.600
   en semillas de maíz.
     node tools/test-vales.js                                                                    */
const fs = require("fs"), vm = require("vm");
const noop = () => {};
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON, log: noop, toast: noop,
  refreshHud: noop, saveFarm: noop, isOpen: () => false, sfx: null, syncSlots: noop, refreshHotbar: noop };
ctx.window = ctx; ctx.window.NICK = "test";
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={G,CROP_DEF,VALES_SHOP,valeCosto,valesDe,VALE_EN_PLATA,priceOf,valeMejorCultivo,valeSemillasN,pedidoGenerar,TOOL_CRAFT,PICK_DEF,WORM_PRICE};",
  ctx, { filename: "state.js" });
const X = ctx.__X, G = X.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("QUE VALE UN VALE EN CADA PREMIO (deberian ser todos parecidos)\n");
console.log("premio                        cuesta   entrega (plata)   plata por vale");
const niveles = [1, 18];
for (const lvl of niveles) {
  G.level = lvl; G.skills = G.skills || {}; G.skills.farming = 999999;
  console.log("  --- con nivel de granja " + lvl + " (mejor cultivo: " + X.valeMejorCultivo() + ") ---");
  const ratios = [];
  X.VALES_SHOP.forEach(it => {
    const c = X.valeCosto(it.id);
    let entrega = 0;
    if (it.id === "hachas") entrega = 10 * (X.TOOL_CRAFT.axe.plata || 6);
    if (it.id === "picos") entrega = 10 * (X.PICK_DEF.stone.plata || 6);
    if (it.id === "lombrices") entrega = 6 * X.WORM_PRICE;
    if (it.id === "semillas") entrega = X.valeSemillasN() * X.CROP_DEF[X.valeMejorCultivo()].seedCost;
    const r = entrega / c;
    ratios.push(r);
    console.log("  " + it.label.slice(0, 28).padEnd(30) + String(c).padStart(6) + String(entrega).padStart(16) + r.toFixed(0).padStart(16));
  });
  const spread = Math.max(...ratios) / Math.min(...ratios);
  ok("nivel " + lvl + ": el spread de la tienda es razonable", spread < 3, "x" + spread.toFixed(1) + " (antes x133)");
}

// LA RUTA DEL EXPLOIT, tal cual la describió la auditoría
G.level = 18; G.skills.farming = 999999;
// el pedido MAS BARATO que el generador puede producir ahora
let papaVal = 1e9;
/* 25/8 — EL VALOR DEL PEDIDO ES EL QUE EL PEDIDO DECLARA, no uno re-derivado acá.
   Esta línea calculaba `q.n * (priceOf(q.key) || 1)`, y priceOf() devuelve 0 para CUALQUIER
   pez —los cuatro viejos y las nueve especies nuevas— porque el pescado no se vende en el
   mercado: se entrega y se cocina. Su precio vive en especiePrecio(). Así que el `|| 1` hacía
   que un encargo de dos peces valiera « 2 » y el exploit saltaba a x11.
   No saltó antes por casualidad: el pool solo ofrecía pescado si el jugador tenía caña, y este
   test no le pone ninguna. Al abrir el tablón a las nueve especies (25/8) el encargo entró y
   destapó que la cuenta estaba mal desde siempre.
   La regla: si el generador ya calculó cuánto vale un pedido, ése es el número. Recalcularlo
   con otra fórmula es tener dos verdades — que es justo lo que este proyecto no hace. */
for (let sd = 0; sd < 400; sd++) {
  const q = X.pedidoGenerar(sd);
  if (!q) continue;
  const v = (typeof q.plata === "number" && q.plata > 0) ? q.plata : q.n * (X.priceOf(q.key) || 1);
  papaVal = Math.min(papaVal, v);
}
const valesQueDa = X.valesDe(papaVal) * 2;          // x2 del primero del día
const cuestaSemillas = X.valeCosto("semillas");
const sacas = X.valeSemillasN() * X.CROP_DEF[X.valeMejorCultivo()].seedCost;
console.log("\nLA RUTA DEL EXPLOIT, con nivel 18 (maíz desbloqueado):");
console.log("  el pedido más barato posible vale " + Math.round(papaVal) + " de plata  ->  " + valesQueDa + " vales");
console.log("  el sobre de semillas cuesta " + cuestaSemillas + " vales y entrega " + sacas + " de plata");
const vueltas = valesQueDa / cuestaSemillas;
console.log("  o sea que con esos vales comprás " + vueltas.toFixed(3) + " sobres = " + Math.round(sacas * vueltas) + " de plata");
ok("la ruta ya no multiplica", (sacas * vueltas) / papaVal < 3,
  "x" + ((sacas * vueltas) / papaVal).toFixed(1) + " (antes x800)");
ok("un vale vale lo mismo se emita o se gaste", X.VALE_EN_PLATA > 0);

console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
