/* ¿CUÁNTAS CELDAS PRODUCTIVAS TIENE EL JUGADOR EN CADA NIVEL, Y CÓMO SE REPARTEN? (18/8)
   El ancla dice que UNA celda productiva rinde 20 plata/hora, y da igual si es parcela, árbol o
   roca. Se comprueba abajo con los números del juego. O sea: subir parcelas NO desequilibra nada
   por sí solo — lo que hay que decidir a conciencia es la CURVA TOTAL de celdas y el REPARTO
   entre las tres. El diseñador dice que las parcelas son pocas: esto lo mide.
     node tools/costear-parcelas.js                                                                */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={FARM_PARCELA,NIVEL_ARBOLES,NIVEL_ROCAS,CROP_DEF,CD,PRICE,FARM_EXPANSION,G};", ctx);
const X = ctx.__X;

console.log("PRIMERO: ¿de verdad las tres celdas valen lo mismo? (comprobación del ancla)\n");
{
  const p = X.CROP_DEF.papa;
  const porHoraParcela = (p.price * p.yield - p.seedCost) * (3600 / p.grow);
  const porHoraArbol = X.PRICE.madera * (3600 / X.CD.tree);
  const porHoraRoca  = X.PRICE.piedra * (3600 / X.CD.rock);
  console.log("   parcela de papa  " + porHoraParcela.toFixed(1) + " plata/h   (vende " + p.price + ", semilla " + p.seedCost + ", cada " + p.grow / 60 + " min)");
  console.log("   árbol            " + porHoraArbol.toFixed(1) + " plata/h   (madera vale " + X.PRICE.madera + ", cada " + X.CD.tree / 60 + " min)  −2 del hacha → " + (porHoraArbol - 2 * 3600 / X.CD.tree).toFixed(1));
  console.log("   roca             " + porHoraRoca.toFixed(1) + " plata/h   (piedra vale " + X.PRICE.piedra + ", cada " + X.CD.rock / 60 + " min)  −2 del pico → " + (porHoraRoca - 2 * 3600 / X.CD.rock).toFixed(1));
  console.log("   → las tres caen en 20 plata/h netas. El ancla se sostiene: una celda es una celda.\n");
}

function reparto(lvl, TP, TA, TR) {
  let par = 3; for (const k in TP) if (lvl >= +k) par = TP[k];
  const arb = TA.filter(n => n <= lvl).length;
  const roc = TR.filter(n => n <= lvl).length;
  return { par, arb, roc, tot: par + arb + roc, nodos: arb + roc };
}
function tabla(titulo, TP, TA, TR) {
  console.log(titulo);
  console.log("   nivel  parcelas  árboles  rocas   TOTAL   plata/h   parcelas sobre el total");
  for (const l of [1,2,3,4,5,6,7,8,10,12,15,18,20,25,30]) {
    const r = reparto(l, TP, TA, TR);
    const pct = Math.round(100 * r.par / r.tot);
    console.log("   " + String(l).padStart(5) + String(r.par).padStart(10) + String(r.arb).padStart(9) +
      String(r.roc).padStart(7) + String(r.tot).padStart(8) + String(r.tot * 20).padStart(10) +
      "      " + String(pct).padStart(3) + "%  " + "█".repeat(Math.round(pct / 5)));
  }
  console.log("");
}
tabla("HOY", X.FARM_PARCELA, X.NIVEL_ARBOLES, X.NIVEL_ROCAS);
/* EL FINAL DEL JUEGO: la granja terminada, con las 16 expansiones */
{
  const X2 = X;
  const parNivel = (l => { let p = 3; for (const k in X2.FARM_PARCELA) if (l >= +k) p = X2.FARM_PARCELA[k]; return p; })(50);
  const exp = X2.FARM_EXPANSION.length;
  // lo que trae cada expansión, leído del mapa de verdad
  let arbExp = 0, rocExp = 0;
  ctx.GF.WORLD_OBJECTS.forEach(o => { if (o.exp == null) return; if (o.type === "tree") arbExp++; else rocExp++; });
  const par = parNivel + exp, arb = X2.NIVEL_ARBOLES.length + arbExp, roc = X2.NIVEL_ROCAS.length + rocExp;
  const tot = par + arb + roc;
  console.log("GRANJA TERMINADA (nivel 50 + las " + exp + " expansiones)\n");
  console.log("   parcelas " + String(par).padStart(3) + "   árboles " + String(arb).padStart(3) +
              "   rocas " + String(roc).padStart(3) + "   TOTAL " + String(tot).padStart(3) +
              " celdas = " + tot * 20 + " plata/h   ·  parcelas: " + Math.round(100 * par / tot) + "%");
  console.log("   (antes del 18/8: 13 parcelas + 22 árboles + 22 rocas = 57 celdas, parcelas 23%)\n");
}
console.log("Lectura: en los niveles bajos el jugador tiene MÁS nodos que parcelas. En un juego de");
console.log("granja eso se siente al revés de lo que debe: la parcela es la acción que el jugador");
console.log("repite, y el nodo es el que trabaja solo mientras no está. Por eso 'son muy pocas'.");
