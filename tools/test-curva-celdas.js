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

// 2) EL TECHO NO SUBE
{
  const exps = X.FARM_EXPANSION.length;
  let parNivel = 3; for (const k in X.FARM_PARCELA) if (50 >= +k) parNivel = X.FARM_PARCELA[k];
  const arbExp = GF.WORLD_OBJECTS.filter(o => o.exp != null && o.type === "tree").length;
  const rocExp = GF.WORLD_OBJECTS.filter(o => o.exp != null && o.type === "rock").length;
  const par = parNivel + exps, arb = X.NIVEL_ARBOLES.length + arbExp, roc = X.NIVEL_ROCAS.length + rocExp;
  const tot = par + arb + roc;
  ok("la granja terminada sigue teniendo 57 celdas", tot === 57, par + " parcelas + " + arb + " árboles + " + roc + " rocas = " + tot);
  ok("las parcelas son mayoría al final", par / tot >= 0.5, Math.round(100 * par / tot) + "%");
  ok("cada expansión trae exactamente 2 celdas", (arbExp + rocExp + exps) / exps === 2);
  ok("las parcelas caben en el tope del juego", par <= X.PLOT_MAX, par + "/" + X.PLOT_MAX);
}

// 3) LA CURVA SOLO SUBE
{
  const cel = l => { let p = 3; for (const k in X.FARM_PARCELA) if (l >= +k) p = X.FARM_PARCELA[k];
    return p + X.NIVEL_ARBOLES.filter(n => n <= l).length + X.NIVEL_ROCAS.filter(n => n <= l).length; };
  let sube = true, baja = "";
  for (let l = 2; l <= 60; l++) if (cel(l) < cel(l - 1)) { sube = false; baja = "nivel " + l; }
  ok("la curva por nivel nunca retrocede", sube, baja);
  ok("el nivel 1 arranca con 9 celdas (3+3+3)", cel(1) === 9, cel(1) + "");
  ok("en el nivel 10 ya hay 22 (antes hacían falta 12 niveles)", cel(10) >= 22, cel(10) + "");
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
