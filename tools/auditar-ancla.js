/* ¿TODO CUELGA DEL ANCLA? (18/8)
   Dirección: "que todo este balance haya quedado anclado a la fórmula, a la columna vertebral".
   El ancla es UNA frase: UNA CASILLA QUE PRODUCE RINDE 20 DE PLATA POR HORA.
   Este script recorre TODOS los números de la economía y mide cuánto se desvía cada uno. No opina:
   compara contra la fórmula y muestra el desvío.
     node tools/auditar-ancla.js                                                                */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.COOK_PRICE_AUTO=typeof COOK_PRICE_AUTO!==\"undefined\"?COOK_PRICE_AUTO:1;window.COOK_MARGEN=typeof COOK_MARGEN!==\"undefined\"?COOK_MARGEN:1.25;window.__X={CROP_DEF,ORE_DEF,PRICE,CD,PICK_DEF,BUILD_DEF,MAT_DEF,EXPANSION_COSTO,FARM_EXPANSION,ARM_DEF,ANIMAL_DEF,RECIPE_DEF,GOLDEN_EN_PLATA," +
  "CROP_ORDER,XP_ACCION,TOOL_CRAFT,SEED_POR_PARCELA:typeof SEED_POR_PARCELA!=='undefined'?SEED_POR_PARCELA:null};",
  ctx, { filename: "state.js" });
const X = ctx.__X, GF = ctx.GF, ANCLA = 20;
let avisos = 0, filas = 0;
const pct = (real, debe) => debe ? (100 * (real - debe) / debe) : 0;
function linea(nombre, real, debe, unidad, tol) {
  filas++;
  const d = pct(real, debe), malo = Math.abs(d) > (tol == null ? 5 : tol);
  if (malo) avisos++;
  console.log((malo ? "  !! " : "  ok " ) + nombre.padEnd(34) +
    (Math.round(real * 10) / 10 + " " + unidad).padStart(16) +
    (Math.round(debe * 10) / 10 + "").padStart(10) +
    ((d >= 0 ? "+" : "") + d.toFixed(0) + "%").padStart(8));
}

console.log("=== 1. LOS CULTIVOS · cada uno tiene que rendir 20 de plata por hora ===");
console.log("                                            rinde       debe   desvío");
for (const k in X.CROP_DEF) {
  const c = X.CROP_DEF[k];
  linea(c.label, (c.price - c.seedCost) / c.growH, ANCLA, "plata/h");
}

/* 18/8 — VARA CAMBIADA POR DECISIÓN, NO PARA TAPAR ROJOS.
   Esta sección medía "100 XP por hora", o sea XP proporcional al RELOJ. Dirección retiró esa
   regla: "que la experiencia esté ligada al tiempo que tarda algo en crecer es una inconsistencia
   muy abrupta". La XP pasa a medir GESTOS, escalados por el escalón del material. Así que lo que
   hay que comprobar ya no es XP/hora: es que cada cultivo pague su escalón, ni más ni menos.
   Dejo la vara vieja calculada al lado para que se vea qué se cambió y cuánto. */
console.log("\n=== 1b. LA XP DE LOS CULTIVOS · cada uno paga su ESCALÓN (18/8) ===");
console.log("                                            da          debe   desvío");
X.CROP_ORDER.forEach((k, i) => {
  const c = X.CROP_DEF[k];
  linea(c.label + " (escalón " + (i + 1) + ")", c.xp, X.XP_ACCION * (i + 1), "XP");
});
console.log("   nota: con la vara VIEJA (XP proporcional al reloj) esto daba de 200 a 5 XP/h");
console.log("         según el cultivo — la dispersión que motivó el cambio.");

console.log("\n=== 2. LOS NODOS · lo mismo, descontando la herramienta ===");
console.log("                                            rinde       debe   desvío");
{
  const hAxe = (X.TOOL_CRAFT.axe.plata || 0);
  linea("Árbol", (X.PRICE.madera - hAxe) / (X.CD.tree / 3600), ANCLA, "plata/h");
  linea("Roca", (X.PRICE.piedra - (X.PICK_DEF.stone.plata || 0)) / (X.CD.rock / 3600), ANCLA, "plata/h");
  const PICK = { bronce: "bronze", hierro: "iron", oro: "gold", diamante: "diamond", netherita: "netherite" };
  for (const k in PICK) {
    const pd = X.PICK_DEF[PICK[k]];
    let c = pd.plata || 0;
    for (const m in pd.cost || {}) c += pd.cost[m] * (X.PRICE[m] || 0);
    const Y = X.ORE_DEF[k].yield || 1;
    linea("Veta de " + k + " (da " + Y + ")", (Y * X.PRICE[k] - c / (pd.dur || 1)) / (X.ORE_DEF[k].cd / 3600), ANCLA, "plata/h");
  }
}

console.log("\n=== 3. EL PRECIO SOMBRA DE CADA MATERIAL · horas x 20 + herramienta ===");
console.log("                                            vale       debe   desvío");
linea("Madera", X.PRICE.madera, ANCLA * (X.CD.tree / 3600) + (X.TOOL_CRAFT.axe.plata || 0), "");
linea("Piedra", X.PRICE.piedra, ANCLA * (X.CD.rock / 3600) + (X.PICK_DEF.stone.plata || 0), "");

console.log("\n=== 4. LOS EDIFICIOS · días de granja al nivel en que se abren ===");
{
  const SES = 3, cos = cd => { const h = cd / 3600, q = 14 / (SES - 1); let n = 0, u = -99;
    for (let i = 0; i < SES; i++) { const t = i * q; if (t - u >= h) { n++; u = t; } } return n + 1; };
  const NA = [1,1,3,4,6,8], NR = [1,1,4,6,9,12], PAR = {2:4,4:5,6:6,7:7,12:8,18:9,25:10,35:11,45:12,50:13};
  const prod = l => { const a = NA.filter(n => n <= l).length, r = NR.filter(n => n <= l).length;
    let p = 3; for (const k in PAR) if (l >= +k) p = PAR[k];
    // 18/8: los relojes se LEEN del juego. Estaban escritos a mano y al acortar el árbol
    // este auditor daba a los siete edificios un 55% por debajo — el fallo era suyo, no de ellos.
    return (p * 2 + a * cos(X.CD.tree) * (X.CD.tree/3600) + r * cos(X.CD.rock) * (X.CD.rock/3600)) * ANCLA; };
  const P = Object.assign({}, X.PRICE);
  for (const m in X.MAT_DEF) { let v = 0; for (const k in X.MAT_DEF[m].cost) v += X.MAT_DEF[m].cost[k] * (P[k] || 0); P[m] = v; }
  const ESPERADO = { store: 0.4, horno: 0.5, cocina: 0.5, establo: 1.5, altar: 2.0, curtiduria: 2.5, ofrendas: 3.0 };
  console.log("                                            días       debe   desvío");
  for (const k in X.BUILD_DEF) {
    const b = X.BUILD_DEF[k]; let v = 0;
    for (const m in b.cost) v += b.cost[m] * (P[m] || 0);
    linea(b.label, v / prod(b.lvl || 1), ESPERADO[k] || 1, "d", 12);
  }
}

console.log("\n=== 5. LAS EXPANSIONES · el coste sube y nunca baja ===");
{
  const P = Object.assign({}, X.PRICE);
  let prev = 0, sube = true;
  X.EXPANSION_COSTO.forEach((c, i) => {
    let v = 0; for (const k in c) v += c[k] * (P[k] || 0);
    if (v < prev * 0.9) sube = false;
    if (i % 5 === 0 || i === 15)
      console.log("     expansión " + String(i + 1).padStart(2) + "  nivel " + String(X.FARM_EXPANSION[i]).padStart(2) +
        "   " + Math.round(v).toLocaleString("es").padStart(9) + " de plata en material");
    prev = v;
  });
  filas++; if (!sube) avisos++;
  console.log((sube ? "  ok " : "  !! ") + "el coste crece a lo largo de las 16");
}

console.log("\n=== 5b. LOS ANIMALES · no se pueden medir todavía ===");
{
  // 18/8: la primera versión de esto medía (material x precio − comida) / horas y daba a los cuatro
  // animales en pérdida brutal. Era la VARA la que estaba rota: fibra, pelaje, cuero y colmillo NO
  // TIENEN PRECIO en la tabla PRICE, así que valían 0. Es el mismo agujero que tenían los minerales
  // hasta hoy: si un material no tiene precio sombra, ningún sistema puede valorarlo y cualquier
  // medición sobre él miente. Se deja marcado, no medido.
  const sinPrecio = [];
  for (const k in X.ANIMAL_DEF) { const a = X.ANIMAL_DEF[k];
    if (X.PRICE[a.mat] == null) sinPrecio.push(a.mat); }
  filas++; if (sinPrecio.length) avisos++;
  console.log((sinPrecio.length ? "  !! " : "  ok ") + "los materiales de los animales tienen precio".padEnd(34) +
    (sinPrecio.length ? "FALTAN: " + [...new Set(sinPrecio)].join(", ") : "todos"));
}

console.log("\n=== 5c. LA COCINA · se paga sola por construcción ===");
{
  /* 18/8 — ACÁ HABÍA UNA MEDICIÓN FALSA, y conviene que quede escrita.
     La primera versión comparaba los ingredientes contra `r.plata` y marcaba 8 platos como
     RUINOSOS: el Pan de Maíz y Trigo "perdía" 3.788. Era mentira. El juego NO USA `r.plata`:
     con COOK_PRICE_AUTO=1 (state.js) el precio lo calcula dishPrice() como
     ingredientes x COOK_MARGEN, y COOK_MARGEN vale 1,25. O sea que TODO plato vende un 25% por
     encima de lo que costó, por construcción, y no puede destruir valor aunque cambien los
     precios de los cultivos — que es exactamente para lo que se hizo así.
     `r.plata` es la planilla vieja, viva solo si alguien pone COOK_PRICE_AUTO=0.
     Segunda vez en el día que una vara rota da un desbalance inventado (la otra fueron los
     animales). Por eso ahora la auditoría comprueba PRIMERO que el número que mira sea el que
     el juego usa de verdad. */
  filas++;
  const auto = ctx.COOK_PRICE_AUTO !== 0;
  if (!auto) avisos++;
  console.log((auto ? "  ok " : "  !! ") + "el precio del plato sale de sus ingredientes".padEnd(34) +
    (auto ? "sí, x" + (ctx.COOK_MARGEN || 1.25) + " — no puede dar pérdida" : "NO: manda la planilla fija r.plata"));
}

console.log("\n=== 6. LOS MATERIALES INTERMEDIOS · ¿los gasta alguien? ===");
{
  for (const m in X.MAT_DEF) {
    const usos = [];
    for (const b in X.BUILD_DEF) if ((X.BUILD_DEF[b].cost || {})[m]) usos.push(X.BUILD_DEF[b].label);
    for (const p in X.PICK_DEF) if ((X.PICK_DEF[p].cost || {})[m]) usos.push(X.PICK_DEF[p].label);
    for (const a in X.ARM_DEF) if ((X.ARM_DEF[a].cost || {})[m]) usos.push(X.ARM_DEF[a].label);   // 18/8: faltaban las armas
    filas++; if (!usos.length) avisos++;
    console.log((usos.length ? "  ok " : "  !! ") + X.MAT_DEF[m].label.padEnd(34) +
      (usos.length ? usos.length + " recetas lo gastan" : "NADIE LO GASTA"));
  }
}

console.log("\n" + "=".repeat(72));
console.log(avisos ? avisos + " de " + filas + " números NO cuelgan del ancla (marcados con !!)"
                   : "los " + filas + " números cuelgan del ancla");
