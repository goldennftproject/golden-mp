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
  "\n;window.__X={CROP_DEF,ORE_DEF,PRICE,CD,PICK_DEF,BUILD_DEF,MAT_DEF,EXPANSION_COSTO,FARM_EXPANSION,ARM_DEF," +
  "TOOL_CRAFT,SEED_POR_PARCELA:typeof SEED_POR_PARCELA!=='undefined'?SEED_POR_PARCELA:null};",
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

console.log("\n=== 1b. LA XP DE LOS CULTIVOS · la regla es 100 XP por hora ===");
console.log("                                            da          debe   desvío");
for (const k in X.CROP_DEF) { const c = X.CROP_DEF[k]; linea(c.label, c.xp / c.growH, 100, "XP/h"); }

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
    return (p * 2 + a * cos(5400) * 1.5 + r * cos(7200) * 2) * ANCLA; };
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
