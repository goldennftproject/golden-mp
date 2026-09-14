/* EL ESTABLO DESPUÉS DE LA LEY 4 — ¿conviene darle de comer?                          (14/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La ley 4 (11/9) cambió la pregunta del establo. Antes el animal tenía una barra de felicidad
   que bajaba sola y se rellenaba con raciones: la comida era un GASTO CONTINUO y parejo, y de
   ahí salía el precio de los cuatro materiales —

       precio = 24 h × (20 del ancla + lo que cuesta la ración por hora)

   — que es el cálculo que sigue vivo en `anclarMaterialesDelEstablo()`. Ahora la ley dice otra
   cosa: **una comida cada 24 h, y el animal que no come no da nada**. La comida ya no es una
   ración genérica: es UN CULTIVO CONCRETO, el suyo, y los cultivos no valen todos igual. La
   zanahoria del conejo vale 8 de plata; el maíz del toro, 1.200.

   Este archivo hace la cuenta que la ley volvió necesaria: por cada animal, lo que cuesta darle
   de comer un día contra lo que rinde ese día. El ancla de comparación es la de siempre: una
   parcela productiva da 20 de plata la hora, o sea 480 al día.
     node tools/medir-establo.js                                                                */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

const A = g("ANIMAL_DEF"), C = g("CROP_DEF"), PRICE = g("PRICE");
const ANCLA_DIA = 20 * 24;

console.log("\nEL PRECIO DE LOS MATERIALES, TAL COMO SE DESPEJA HOY\n");
console.log("   24 h × (20 del ancla + " + (g("FELIZ_BAJA_H") / g("FELIZ_POR_RACION") * g("RACION_PLATA")).toFixed(1) +
  " de ración/hora) = " + PRICE.fibra + " para los cuatro");
console.log("   OJO: esa ración por hora viene del modelo VIEJO (barra de felicidad). La ley 4 la");
console.log("   reemplazó por una comida diaria que cuesta lo que cuesta SU cultivo.\n");

console.log("LO QUE CUESTA UN DÍA DE ANIMAL CONTRA LO QUE RINDE\n");
console.log("   animal     come                  cuesta   rinde   margen/día   % del ancla (480)");
const filas = [];
for (const k in A) {
  const a = A[k];
  const opciones = a.come.map(c => ({ c: c, p: C[c] ? C[c].price : 0 })).sort((x, y) => x.p - y.p);
  const rinde = (PRICE[a.mat] || 0) * (a.porCiclo || 1);
  for (const o of opciones) {
    const margen = rinde - o.p;
    filas.push({ animal: k, come: o.c, cuesta: o.p, rinde: rinde, margen: margen });
    console.log("   " + (o === opciones[0] ? k : "").padEnd(11) + (o.c + " (" + o.p + ")").padEnd(22) +
      String(o.p).padStart(7) + String(rinde).padStart(8) + String(margen).padStart(13) +
      String(Math.round(margen / ANCLA_DIA * 100) + "%").padStart(14) +
      (margen < 0 ? "   ← DA PÉRDIDA" : ""));
  }
}

console.log("\nLO QUE SALTA A LA VISTA\n");
const peor = filas.slice().sort((a, b) => a.margen - b.margen)[0];
const mejor = filas.slice().sort((a, b) => b.margen - a.margen)[0];
console.log("   el mejor trato: " + mejor.animal + " con " + mejor.come + " → +" + mejor.margen + " al día (" +
  Math.round(mejor.margen / ANCLA_DIA * 100) + " % del ancla)");
console.log("   el peor trato:  " + peor.animal + " con " + peor.come + " → " + peor.margen + " al día");
console.log("   entre uno y otro hay " + Math.round(mejor.margen - peor.margen) + " de plata de diferencia POR EL MISMO GESTO:");
console.log("   darle de comer a un animal y esperar 24 h.\n");
if (peor.margen < 0) {
  console.log("   Hay al menos una comida que le CUESTA plata al jugador: el juego le pide un gesto");
  console.log("   («tiene hambre») que lo empobrece. Eso no es una decisión interesante, es una trampa.\n");
}

console.log("SI EL PRECIO SE RE-DESPEJARA CON LA LEY 4 (una comida suya cada 24 h)\n");
console.log("   precio = 24 h × 20 del ancla + lo que cuesta SU comida más barata\n");
console.log("   animal     material     precio de hoy   precio con la ley 4");
for (const k in A) {
  const a = A[k];
  const barata = a.come.map(c => (C[c] ? C[c].price : 0)).sort((x, y) => x - y)[0];
  console.log("   " + k.padEnd(11) + (a.mat || "").padEnd(13) + String(PRICE[a.mat]).padStart(13) +
    String(ANCLA_DIA + barata).padStart(22));
}
console.log("\n   Esto NO se aplica solo: cambia cuánto valen las armaduras del establo y es una");
console.log("   decisión de dirección. Se mide y se reporta.\n");
