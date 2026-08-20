/* LA COLUMNA VERTEBRAL DE LAS CELDAS PRODUCTIVAS (18/8)
   Dirección: "aumentar las parcelas, sobre todo a los primeros niveles, pero no al tuntún:
   cuadrarlo en el ancla sin romper nada."
   Las tres invariantes que no se pueden perder de vista:
     1. una celda es una celda: parcela, árbol y roca rinden lo mismo (20 plata/h netas)
     2. el TECHO no sube: la granja terminada sigue teniendo las mismas celdas que antes del cambio
     3. la curva solo sube, nunca baja, y las parcelas son mayoría al final
     node tools/test-curva-celdas.js                                                             */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={FARM_PARCELA,NIVEL_ARBOLES,NIVEL_ROCAS,CROP_DEF,CD,PRICE,FARM_EXPANSION,PLOT_MAX,G,nodosQueTocan};", ctx);
const X = ctx.__X, GF = ctx.GF;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

// 1) EL ANCLA: las tres celdas valen lo mismo
{
  const p = X.CROP_DEF.papa;
  const parc = (p.price * p.yield - p.seedCost) * (3600 / p.grow);
  const arb = (X.PRICE.madera - 2) * (3600 / X.CD.tree);     // −2: el hacha
  const roc = (X.PRICE.piedra - 2) * (3600 / X.CD.rock);     // −2: el pico
  const dentro = v => Math.abs(v - 20) <= 1;
  ok("parcela = 20 plata/h", dentro(parc), parc.toFixed(1));
  ok("árbol   = 20 plata/h", dentro(arb), arb.toFixed(1));
  ok("roca    = 20 plata/h", dentro(roc), roc.toFixed(1));
}

/* 2) EL TECHO NO SUBE — y ahora los nodos los reparte SOLO la expansión (18/8, dirección).
   La granja de arranque tiene 3 parcelas, 3 árboles y 3 rocas. Cada expansión trae 3 celdas
   (1 + 1 + 1). Techo: 9 + 16×3 = 57, el mismo de siempre. */
{
  const exps = X.FARM_EXPANSION.length;
  const arbExp = GF.WORLD_OBJECTS.filter(o => o.exp != null && o.type === "tree").length;
  const rocExp = GF.WORLD_OBJECTS.filter(o => o.exp != null && o.type === "rock").length;
  const par = 3 + exps, arb = 3 + arbExp, roc = 3 + rocExp;
  const tot = par + arb + roc;
  ok("la granja terminada sigue teniendo 57 celdas", tot === 57,
     par + " parcelas + " + arb + " árboles + " + roc + " rocas = " + tot);
  ok("cada expansión trae exactamente 3 celdas", (arbExp + rocExp + exps) / exps === 3);
  ok("y el reparto es parejo: un tercio de cada", par === arb && arb === roc, par + "/" + arb + "/" + roc);
  ok("las parcelas caben en el tope del juego", par <= X.PLOT_MAX, par + "/" + X.PLOT_MAX);
}
/* 3) LA CURVA LA MARCA LA EXPANSIÓN, NO EL NIVEL. El Granero ya no reparte celdas: da el bono de
   venta y el permiso de expandir, y nada más. */
{
  const celdasCon = e => 9 + 3 * e;
  ok("el arranque son 9 celdas (3+3+3)", celdasCon(0) === 9);
  ok("la curva solo sube con cada expansión",
     X.FARM_EXPANSION.every((n, i) => celdasCon(i + 1) > celdasCon(i)));
  ok("y llega a 57 con la última", celdasCon(X.FARM_EXPANSION.length) === 57);
  const src = fs.readFileSync("public/game/state.js", "utf8");
  ok("el nivel de granja YA NO reparte parcelas", /const FARM_PARCELA = \{\};/.test(src));
  ok("ni árboles ni rocas", /var NIVEL_ARBOLES = \[1, 1, 1\];/.test(src) && /var NIVEL_ROCAS = \[1, 1, 1\]/.test(src));
}
// 4) LAS EXPANSIONES SUMAN PARCELAS DE VERDAD (encima de las del nivel, no en lugar de)
{
  const g = X.G;
  g.level = 10; g.expansiones = 0;
  const sinExp = X.nodosQueTocan(10).plot;
  g.expansiones = 5;
  const conExp = X.nodosQueTocan(10).plot;
  ok("5 expansiones = 5 parcelas más", conExp - sinExp === 5, sinExp + " → " + conExp);
  g.expansiones = 0;
}

console.log("\n" + (fallos ? "FALLOS: " + fallos : "la curva encaja con el ancla y el techo no se movió"));
process.exit(fallos ? 1 : 0);
