/* COSTE DE LOS EDIFICIOS, DERIVADO DEL ANCLA (18/8)
   Antes: números a ojo. Medido, había un factor 25 entre el más barato y el más caro, y el
   MÁS CARO del juego (Altar de Runas, 9,8 días de granja) estaba disponible desde el nivel 1.

   Regla nueva, la misma que las expansiones: un edificio cuesta N DÍAS DE LA GRANJA QUE TENÉS
   CUANDO SE ABRE. N es el único número de diseño; las cantidades salen solas.

   Dos decisiones de diseño que van con esto:
   · FUERA EL ORO de las recetas. Era más de la mitad del coste de los cuatro caros, ataba el
     Establo al nivel 6 con un mineral que a ese nivel no rinde, e impedía que el oro pudiera
     llegar por expansión (el Establo quedaba inconstruible 14 niveles).
   · Los edificios de segundo nivel se pagan en TABLONES y BLOQUES. Sunflower llama a esto la
     trampa nº2 —"recursos para hacer más recursos, ¿pero para qué sirve el resultado?"— y
     nosotros caíamos de lleno: tablón, bloques de piedra y barra de hierro no los gastaba NADIE.
     Ahora son el material de obra, que es para lo que existen.
     node tools/costear-edificios.js                                                          */
const SES = 3;
function cosechasDia(cd) {
  const h = cd / 3600, hueco = 14 / (SES - 1);
  let n = 0, u = -99;
  for (let i = 0; i < SES; i++) { const t = i * hueco; if (t - u >= h) { n++; u = t; } }
  return n + 1;
}
/* 18/8: estos precios estaban ESCRITOS A MANO acá, que es justo el error que este script existe
   para cazar. Ahora se leen del juego: si cambia un reloj, el coste de los edificios se recalcula
   solo en vez de quedar clavado en los números de ayer. */
const fs2 = require("fs"), vm2 = require("vm");
const c2 = { console: { log(){}, warn(){} }, Math, Date, JSON }; c2.window = c2;
vm2.runInNewContext(fs2.readFileSync("public/game/config.js", "utf8"), c2, { filename: "config.js" });
vm2.runInNewContext(fs2.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__P={PRICE,MAT_DEF,CD,NIVEL_ARBOLES,NIVEL_ROCAS};", c2, { filename: "state.js" });
const P = Object.assign({}, c2.__P.PRICE);
for (const m in c2.__P.MAT_DEF) { let v = 0; for (const k in c2.__P.MAT_DEF[m].cost) v += c2.__P.MAT_DEF[m].cost[k] * (P[k] || 0); P[m] = v; }
const CDreal = c2.__P.CD;
const NA = [1,1,3,4,6,8], NR = [1,1,4,6,9,12];
const PAR = { 2:4, 4:5, 6:6, 7:7, 12:8, 18:9, 25:10, 35:11, 45:12, 50:13 };
function prodDia(l) {                      // valor en plata que produce la granja en un día
  const arb = NA.filter(n => n <= l).length, roc = NR.filter(n => n <= l).length;
  let par = 3; for (const k in PAR) if (l >= +k) par = PAR[k];
  return (par * 2 + arb * cosechasDia(CDreal.tree) * (CDreal.tree/3600) + roc * cosechasDia(CDreal.rock) * (CDreal.rock/3600)) * 20;
}
// edificio · nivel · días de granja · en qué se paga
const PLAN = [
  ["Herrería",          "store",      1, 0.4, ["madera","piedra"]],
  ["Horno de Piedra",   "horno",      3, 0.5, ["madera","piedra"]],
  ["Cocina",            "cocina",     5, 0.5, ["madera","piedra"]],
  ["Establo",           "establo",    6, 1.5, ["tablon","barra_piedra"]],
  ["Altar de Runas",    "altar",      7, 2.0, ["tablon","barra_piedra"]],
  ["Curtiduría",        "curtiduria", 8, 2.5, ["tablon","barra_piedra"]],
  ["Altar de Ofrendas", "ofrendas",  10, 3.0, ["tablon","barra_piedra","barra_hierro"]],
];
console.log("edificio             nivel   dias   receta derivada                                  vale   real");
const OUT = {};
for (const [label, id, lvl, dias, mats] of PLAN) {
  const meta = prodDia(lvl) * dias;
  const c = {};
  let resto = meta;
  // el material más caro primero, y el más barato ajusta el resto
  const orden = mats.slice().sort((a, b) => P[b] - P[a]);
  orden.forEach((m, i) => {
    if (i === orden.length - 1) { c[m] = Math.max(1, Math.round(resto / P[m])); }
    else { c[m] = Math.max(1, Math.floor(resto * (i === 0 ? 0.35 : 0.4) / P[m])); resto -= c[m] * P[m]; }
  });
  const vale = Object.keys(c).reduce((a, k) => a + c[k] * P[k], 0);
  OUT[id] = c;
  console.log(label.padEnd(21) + String(lvl).padStart(4) + dias.toFixed(1).padStart(7) + "   " +
    Object.keys(c).map(k => c[k] + " " + k).join(" + ").padEnd(46) +
    String(Math.round(vale)).padStart(6) + (vale / prodDia(lvl)).toFixed(1).padStart(7) + " d");
}
console.log("\nJSON:", JSON.stringify(OUT));
