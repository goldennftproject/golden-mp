/* ¿SIGUEN BALANCEADAS LAS EXPANSIONES? (18/8)
   Los costes se derivaron con "cuántos DÍAS DE GRANJA debe costar cada una", de 4 a 12. Después
   cambiaron cosas que los afectan —las vetas pasaron a dar 2 por picada, los cultivos largos se
   re-anclaron— así que hay que volver a medir contra la producción de HOY.
     node tools/auditar-costo-expansiones.js                                                    */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={EXPANSION_COSTO,FARM_EXPANSION,ORE_DEF,CD,PRICE,NIVEL_ARBOLES,NIVEL_ROCAS,FARM_PARCELA};",
  ctx, { filename: "state.js" });
const X = ctx.__X;
/* 19/8 — REGLA ROTA, ARREGLADA: desde que las expansiones se DERIVAN (EXPANSION_MAX), la tabla
   EXPANSION_COSTO nace vacía y la rellena expansionCostos() la primera vez que el juego la pide.
   Este auditor la leía antes de eso, así que llevaba días recorriendo un array vacío e imprimiendo
   "más barata 99 días · más cara 0" sin que saltara ninguna alarma. Un auditor mudo es peor que no
   tenerlo: parece que mide. */
if (typeof ctx.expansionCostos === "function") ctx.expansionCostos();
if (!X.EXPANSION_COSTO.length) { console.log("  !! EXPANSION_COSTO sigue vacía: el auditor no puede medir nada"); process.exit(1); }
const SES = 3;
function cosechasDia(cd) { const h = cd / 3600, q = 14 / (SES - 1); let n = 0, u = -99;
  for (let i = 0; i < SES; i++) { const t = i * q; if (t - u >= h) { n++; u = t; } } return n + 1; }

// cuánto de CADA recurso produce la granja en un día, al nivel L (con lo que el nivel te dio)
function prodDia(L, expHechas) {
  const arb = X.NIVEL_ARBOLES.filter(n => n <= L).length + expHechas;   // +1 árbol por expansión
  const roc = X.NIVEL_ROCAS.filter(n => n <= L).length + expHechas;     // +1 roca por expansión
  const p = {};
  p.madera = arb * cosechasDia(X.CD.tree);
  p.piedra = roc * cosechasDia(X.CD.rock);
  /* 19/8: faltaba la NETHERITA en esta lista, y las expansiones 15 y 16 la piden. El auditor
     dividía por cero y cantaba "14.000 días" como si la última expansión fuera imposible. Hay una
     veta de netherita en la granja desde siempre: el que estaba mal era el auditor. */
  for (const k of ["bronce", "hierro", "oro", "diamante", "netherita"]) {
    const d = X.ORE_DEF[k];
    p[k] = 1 * cosechasDia(d.cd) * (d.yield || 1);   // 1 veta de cada mineral
  }
  return p;
}
console.log("  #  nivel   lo que cuesta, en DÍAS de la granja que tenés   el recurso que tarda más");
let peor = 0, mejor = 99, suma = 0;
X.EXPANSION_COSTO.forEach((c, i) => {
  const L = X.FARM_EXPANSION[i], pd = prodDia(L, i);
  let dias = 0, cuello = "";
  for (const k in c) {
    const d = c[k] / Math.max(0.001, pd[k] || 0);
    if (d > dias) { dias = d; cuello = k; }
  }
  peor = Math.max(peor, dias); mejor = Math.min(mejor, dias); suma += dias;
  if (i % 3 === 0 || i === 15)
    console.log(String(i + 1).padStart(3) + String(L).padStart(6) + "   " +
      dias.toFixed(1).padStart(6) + " días" + "".padEnd(22) + cuello +
      " (" + c[cuello] + " y producís " + (pd[cuello] || 0).toFixed(1) + "/día)");
});
/* 20/8 — LA MEDIDA QUE FALTABA: NO ES CUÁNTO CUESTA, ES CUÁNTO ESPERÁS MIRÁNDOLA.
   Dirección: "¿el coste de las expansiones es el correcto o había que abaratarlo?"
   Este auditor contestaba con "días de acopio", y con eso parecía que todo estaba bien: de 1,4 a
   11,3 días, dentro del objetivo. Pero el jugador no vive el acopio en el vacío: vive la distancia
   entre el día en que el juego le ABRE la expansión (y se la anuncia como recompensa del nivel) y
   el día en que puede pagarla. Esa distancia es la que duele, y no se veía.
   Los días de nivel salen del simulador de partida a 3 sesiones/día. Si mañana cambia la curva de
   XP, esta tabla se queda vieja — por eso están escritos aquí con su fecha y no escondidos. */
const NIVEL_DIA = { 3: 0.0, 5: 1.0, 7: 4.0, 9: 9.0, 12: 17.7, 15: 27.7, 18: 38.7, 21: 53.0 };
console.log("\n  la espera de verdad: del día que se abre al día que se puede pagar\n");
console.log("   #  nivel   se abre   se paga   ESPERA");
let peorEspera = 0;
X.EXPANSION_COSTO.forEach((c, i) => {
  const L = X.FARM_EXPANSION[i], abre = NIVEL_DIA[L];
  if (abre == null) return;   // más allá del nivel 21 el simulador no llega: no se inventa
  const pd = prodDia(L, i);
  let ac = 0; for (const k in c) { const d = c[k] / (pd[k] || 0.0001); if (d > ac) ac = d; }
  const esp = Math.max(0, ac - abre);
  peorEspera = Math.max(peorEspera, esp);
  console.log("  " + String(i + 1).padStart(2) + "     " + String(L).padStart(2) +
    "   " + abre.toFixed(1).padStart(6) + "   " + Math.max(abre, ac).toFixed(1).padStart(6) +
    "   " + (esp > 0.4 ? esp.toFixed(1) + " días" : "—  manda el nivel"));
});
console.log("\n  " + (peorEspera > 1.5
  ? "!! la peor espera es de " + peorEspera.toFixed(1) + " días: el juego promete terreno que no se puede tomar"
  : "✓ ninguna espera pasa de día y medio — el nivel es la puerta, no el material"));

console.log("\n  más barata " + mejor.toFixed(1) + " días · más cara " + peor.toFixed(1) +
  " días · media " + (suma / 16).toFixed(1) + " · relación x" + (peor / mejor).toFixed(1));
console.log("\n  (se mide por el recurso que MÁS tarda: de nada sirve tener la madera si falta el oro)");
