/* AUDITORÍA COMPLETA (18/8, dirección: "cada sistema, cada recurso extraíble, cada nivel,
   recompensas, misiones del tablón... y fíjate si está balanceado").
   REGLA ÚNICA: el ancla. Una celda productiva rinde 20 plata/hora. Todo lo demás se mide contra
   eso. Nada de números escritos a mano acá: si una constante existe en el juego, se lee del juego.
     node tools/auditar-todo.js  [seccion]                                                        */
const fs = require("fs"), vm = require("vm");
const LOG = console.log;
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON, Object, Array, Number, String,
              Boolean, Set, Map, isNaN, parseInt, parseFloat, setTimeout: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") + "\n;this.X={" + [
  "CROP_DEF","CROP_ORDER","CD","PRICE","SELLABLE","ORE_DEF","ORE_ORDER","FISH_DEF","FISH_ORDER",
  "FISH_COST","FISH_CD","MONSTER_DEF","MONSTER_ORDER","ANIMAL_DEF","ANIMAL_ORDER","MAT_DEF",
  "BUILD_DEF","XP_BASE","XP_EXP","FARM_XP_LVLS","FARM_NIVEL_MAX","FARM_UNLOCK","FARM_PARCELA",
  "FARM_EXPANSION","EXPANSION_COSTO","FARM_COFRE","FARM_EDIF2","FARM_TAREAS","NIVEL_ARBOLES",
  "NIVEL_ROCAS","DAILY_REWARDS","PASS_FREE","PASS_VIP","PASS_LVL_GOLD","VALE_EN_PLATA","VALES_SHOP",
  "PED_POR_DIA","RECIPE_DEF","RECIPE_ORDER","COOK_PRICE_AUTO","ARM_DEF","ARM_ORDER","PICK_DEF",
  "TOOL_CRAFT","GOLDEN_EN_PLATA","EXPANSION_MAX","ZONA_DEF","GOLPES_TALAR","skillNeed","nodoXpMin",
  "SEED_POR_PARCELA","PLOT_MAX","DECO_DEF","RUNA_CRAFT","ALTAR_CRAFT","INV_BASE","FISH_VALOR","PICK_ORDER",
].map(k => k + ":typeof " + k + "!=='undefined'?" + k + ":null").join(",") + "};", ctx);
const X = ctx.X, GF = ctx.GF;
const ANCLA = 20;                                   // plata por celda productiva y por hora
const h = s => s / 3600;
const pad = (v, n) => String(v).padStart(n);
const pct = (v, ref) => (v / ref * 100).toFixed(0) + "%";
const hallazgos = [];
const nota = (grav, txt) => hallazgos.push([grav, txt]);
const veredicto = (v, ref, tol) => {
  const r = v / ref;
  if (r >= 1 - tol && r <= 1 + tol) return "ok  ";
  return r > 1 ? "ALTO" : "BAJO";
};
const sec = process.argv[2];
const corre = n => !sec || sec === n;

/* ---------- 1. LO QUE SE EXTRAE ---------- */
if (corre("extraccion")) {
LOG("\n═══ 1. TODO LO QUE SE EXTRAE ═══");
LOG("   regla: valor de lo que da ÷ horas de su reloj = 20 plata/h  (una celda es una celda)\n");

LOG("   CULTIVOS  (precio de venta − semilla, por hora)");
X.CROP_ORDER.forEach(k => {
  const c = X.CROP_DEF[k];
  const porH = (c.price * c.yield - c.seedCost) / h(c.grow);
  const v = veredicto(porH, ANCLA, 0.12);
  LOG("     " + v + " " + (c.label + " ").padEnd(12, ".") + pad((c.grow/60).toFixed(0)+" min", 9) +
      pad(porH.toFixed(1), 8) + " plata/h   " + pct(porH, ANCLA));
  if (v !== "ok  ") nota(v === "ALTO" ? 2 : 2, "Cultivo " + c.label + ": " + porH.toFixed(1) + " plata/h (ancla 20)");
});

LOG("\n   NODOS DEL CORRAL  (valor del material − herramienta, por hora)");
[["Árbol", X.CD.tree, X.PRICE.madera, 1, X.TOOL_CRAFT.axe.plata],
 ["Roca",  X.CD.rock, X.PRICE.piedra, 1, (X.PICK_DEF.stone||{}).plata || 2]].forEach(([n,cd,p,y,tool]) => {
  const porH = (p * y - tool) / h(cd);
  LOG("     " + veredicto(porH, ANCLA, 0.12) + " " + (n + " ").padEnd(12, ".") + pad((cd/60)+" min", 9) +
      pad(porH.toFixed(1), 8) + " plata/h   " + pct(porH, ANCLA));
});

LOG("\n   VETAS DE MINERAL  (el pico que hace falta se descuenta)");
/* OJO — MI QUINTA REGLA ROTA DE LA SEMANA (18/8). La primera versión de esto buscaba el pico
   por un campo `ore` que PICK_DEF no tiene, se quedaba con 2 de coste por defecto y decía que las
   cinco vetas rendían el 199% del ancla. El pico de oro no cuesta 2: cuesta ~el valor de un oro,
   que es justo lo que hace que una veta de 14 h con yield 2 rinda 20/h y no 40.
   El mapa mineral→pico se lee igual que en auditar-ancla.js, que es el que estaba bien. */
const PICK_DE = { piedra: "stone", bronce: "bronze", hierro: "iron", oro: "gold",
                  diamante: "diamond", netherita: "netherite" };
X.ORE_ORDER.forEach(k => {
  const o = X.ORE_DEF[k];
  const pd = X.PICK_DEF[PICK_DE[k]] || X.PICK_DEF.stone;
  let costoPico = pd.plata || 0;
  for (const m in pd.cost || {}) costoPico += pd.cost[m] * (X.PRICE[m] || 0);
  costoPico /= (pd.dur || 1);
  const precio = X.PRICE[k] != null ? X.PRICE[k] : o.price;
  const porH = (precio * o.yield - costoPico) / h(o.cd);
  const v = veredicto(porH, ANCLA, 0.15);
  LOG("     " + v + " " + (o.label + " ").padEnd(12, ".") + pad((o.cd/3600).toFixed(1)+" h", 9) +
      pad(porH.toFixed(1), 8) + " plata/h   " + pct(porH, ANCLA) +
      "   (da " + o.yield + "×" + precio + " − " + Math.round(costoPico) + " de pico)");
  if (v !== "ok  ") nota(2, "Veta de " + o.label + ": " + porH.toFixed(1) + " plata/h (ancla 20)");
});

LOG("\n   PESCA  (lo que paga DE VERDAD, leído del sorteo de state.js)");
/* OJO: FISH_VALOR NO es lo que paga la pesca — es lo que vale el pez cuando lo COCINÁS. Medir con
   esa tabla daba 208 plata/h, que era mi sexta regla rota de la semana. El pago real está escrito
   en el sorteo: el común paga plata, el raro y el épico dan un pez (que vale al cocinarlo) y el
   legendario da 2 de ORO. Y el coste real no es una constante: es UNA lombriz más UNA caña, y las
   herramientas tienen un uso. */
{
  const P = { comun: 0.60, raro: 0.25, epico: 0.12, legendario: 0.03 };   // el sorteo: r<0.60/0.85/0.97
  const plataComun = Math.max(1, Math.round(20 * (X.FISH_CD || 900) / 3600));
  const margen = (typeof X.COOK_PRICE_AUTO !== "undefined" && X.COOK_PRICE_AUTO) ? 1.25 : 1;
  const pago = {
    comun: plataComun,
    raro: ((X.FISH_VALOR||{}).raro || 0) * margen,
    epico: ((X.FISH_VALOR||{}).epico || 0) * margen,
    legendario: 2 * (X.PRICE.oro || 0),                 // tryAddRes("oro", 2)
  };
  const costoCana = (X.TOOL_CRAFT.rod ? (X.TOOL_CRAFT.rod.plata || 0) +
      Object.keys(X.TOOL_CRAFT.rod.cost||{}).reduce((a,k)=>a+(X.PRICE[k]||0)*X.TOOL_CRAFT.rod.cost[k],0) : 0);
  const costoTiro = 3 /* WORM_PRICE */ + costoCana;
  X.FISH_ORDER.forEach(k => LOG("     " + (X.FISH_DEF[k].label + " ").padEnd(16, ".") +
    pad((P[k]*100).toFixed(0) + "%", 6) + "  paga " + pad(Math.round(pago[k]), 6) +
    (k === "legendario" ? "  (2 de oro)" : k === "comun" ? "  (plata directa)" : "  (el pez, al cocinarlo)")));
  const esperado = X.FISH_ORDER.reduce((a, k) => a + P[k] * pago[k], 0);
  const neto = esperado - costoTiro;
  const porH = neto / h(X.FISH_CD || 900);
  const v = veredicto(porH, ANCLA, 0.25);
  LOG("     ─────────────────────────────────────────────────────");
  LOG("     tiro medio: " + esperado.toFixed(0) + " − " + costoTiro + " (1 lombriz + 1 caña) = " +
      neto.toFixed(0) + " cada " + ((X.FISH_CD||900)/60) + " min");
  LOG("     " + v + " " + porH.toFixed(0) + " plata/h   " + pct(porH, ANCLA) + "  (ancla " + ANCLA + ")");
  if (v !== "ok  ") {
    nota(1, "LA PESCA rinde " + porH.toFixed(0) + " plata/h (" + pct(porH, ANCLA) + " del ancla). " +
      "El grueso es el LEGENDARIO: 3% de 2 oro = " + Math.round(P.legendario * pago.legendario) +
      " de los " + esperado.toFixed(0) + " del tiro medio. Con la caña a " + ((X.FISH_CD||900)/60) +
      " min, el tiro medio debería pagar " + Math.round(ANCLA * h(X.FISH_CD||900) + costoTiro) + ".");
    nota(2, "Sugerencia anclada: el legendario a 1 oro y el enfriamiento a " +
      Math.round((esperado - costoTiro) / ANCLA * 60) + " min dejarían la pesca en el ancla sin tocar las probabilidades.");
  }
}
}

/* ---------- 2. NIVELES ---------- */
if (corre("niveles")) {
LOG("\n═══ 2. NIVELES ═══");
LOG("   ¿cuánto trabajo pide cada nivel y qué entrega a cambio?\n");
LOG("   nivel   XP granja    horas de granja*   qué te da");
const horasDe = xp => {
  // una celda produce 20 plata/h; la XP de cultivo sale de plantar+cosechar
  const c = X.CROP_DEF.papa, porCiclo = 5 + c.xp, ciclosH = 3600 / c.grow;
  return xp / (porCiclo * ciclosH * 3);      // con 3 parcelas, que es el arranque
};
for (let n = 2; n <= 20; n++) {
  const xp = X.FARM_XP_LVLS[n]; if (xp == null) continue;
  const dice = [];
  if (X.FARM_UNLOCK[n]) dice.push(X.FARM_UNLOCK[n]);
  if (X.FARM_COFRE[n]) dice.push("+" + X.FARM_COFRE[n] + " de cofre");
  if (X.FARM_EDIF2[n]) dice.push(X.FARM_EDIF2[n] + " nivel 2");
  const exp = X.FARM_EXPANSION.indexOf(n); if (exp >= 0) dice.push("expansión " + (exp + 1));
  LOG("     " + pad(n, 3) + pad(xp, 11) + pad(horasDe(xp).toFixed(1) + " h", 16) + "   " + (dice.join(" · ") || "—"));
}
LOG("     * con las 3 parcelas de arranque, plantando sin parar. Con más parcelas, proporcional.");
LOG("\n   NIVELES SIN NADA QUE DAR (el jugador sube y no pasa nada):");
const vacios = [];
for (let n = 2; n <= X.FARM_NIVEL_MAX; n++) {
  if (X.FARM_UNLOCK[n] || X.FARM_COFRE[n] || X.FARM_EDIF2[n] || X.FARM_EXPANSION.includes(n)) continue;
  let par = 3; for (const k in X.FARM_PARCELA) if (n >= +k) par = X.FARM_PARCELA[k];
  let parAnt = 3; for (const k in X.FARM_PARCELA) if (n - 1 >= +k) parAnt = X.FARM_PARCELA[k];
  const arb = X.NIVEL_ARBOLES.filter(v => v === n).length, roc = X.NIVEL_ROCAS.filter(v => v === n).length;
  if (par === parAnt && !arb && !roc) vacios.push(n);
}
LOG("     " + (vacios.length ? vacios.join(", ") : "ninguno"));
if (vacios.length) nota(2, "Hay " + vacios.length + " niveles de granja que no entregan NADA: " + vacios.slice(0, 20).join(", ") + (vacios.length > 20 ? "…" : ""));
/* LA CURVA DE HABILIDAD, MEDIDA CON UNA GRANJA COMPLETA (no con un árbol suelto).
   La XP de artesanía sale de talar: cada tala da los MINUTOS del reloj (nodoXpMin), así que un
   árbol de 30 min da 30 XP cada media hora = 60 XP/h. Con los 14 árboles de la granja terminada,
   840 XP/h — y eso es el techo absoluto, jugando sin parar 24 h al día. */
LOG("\n   CURVA DE HABILIDAD (XP_BASE " + X.XP_BASE + " · exponente " + X.XP_EXP + ")");
const arbolesFin = X.NIVEL_ARBOLES.length + GF.WORLD_OBJECTS.filter(o => o.exp != null && o.type === "tree").length;
const xpHora = arbolesFin * X.nodoXpMin(X.CD.tree) / h(X.CD.tree);
LOG("     techo de XP: " + arbolesFin + " árboles × " + X.nodoXpMin(X.CD.tree) + " XP cada " +
    (X.CD.tree/60) + " min = " + xpHora.toFixed(0) + " XP/h jugando SIN PARAR");
LOG("     nivel        XP acumulada        h sin parar        traducido");
[2,5,10,15,20,25,30,40,60,100,150].forEach(n => {
  let acc = 0; for (let i = 1; i < n; i++) acc += X.skillNeed(i);
  const hs = acc / xpHora;
  const trad = hs < 48 ? (hs.toFixed(0) + " horas")
             : hs < 24*365 ? (hs/24).toFixed(0) + " días"
             : (hs/24/365).toFixed(0) + " AÑOS";
  LOG("     " + pad(n, 5) + pad(acc.toLocaleString("es"), 20) + pad(Math.round(hs).toLocaleString("es"), 15) + "        " + trad);
});
{
  let acc40 = 0; for (let i = 1; i < 40; i++) acc40 += X.skillNeed(i);
  const anios40 = acc40 / xpHora / 24 / 365;
  if (anios40 > 1) nota(1, "La CURVA DE HABILIDAD no llega a 150: el comentario del código dice " +
    "'nivel 40 = 360 h' y medido con la granja TERMINADA (" + arbolesFin + " árboles, " + xpHora.toFixed(0) +
    " XP/h) el nivel 40 pide " + anios40.toFixed(1) + " años sin parar. El exponente " + X.XP_EXP +
    " es el que rompe: cada nivel pide " + X.XP_EXP + " veces más que lineal.");
  /* ¿QUÉ EXPONENTE haría falta? Se resuelve por búsqueda, no a ojo: el que deja el nivel 40 en las
     360 h que el propio código dice que quería, y se comprueba qué costaría entonces el 150. */
  const acumCon = (e, n) => { let a = 0; for (let i = 1; i < n; i++) a += Math.round(X.XP_BASE * Math.pow(i, e)); return a; };
  let mejor = null;
  for (let e = 1.00; e <= 3.0; e += 0.01) {
    const hs = acumCon(e, 40) / xpHora;
    if (mejor === null || Math.abs(hs - 360) < Math.abs(mejor.hs - 360)) mejor = { e, hs };
  }
  const h150 = acumCon(mejor.e, 150) / xpHora;
  nota(2, "Con exponente " + mejor.e.toFixed(2) + " (hoy " + X.XP_EXP + ") el nivel 40 cae en " +
    mejor.hs.toFixed(0) + " h — las 360 que pedía el diseño — y el 150 en " +
    (h150 / 24 / 365).toFixed(1) + " años sin parar, que sigue siendo mucho pero ya es una meta y no un muro.");
}
LOG("\n   NIVEL DE GRANJA — el tramo alto (tope " + X.FARM_NIVEL_MAX + ")");
{
  const c = X.CROP_DEF.papa, xpPorParcelaHora = (5 + c.xp) * 3600 / c.grow;
  let parFin = 3; for (const k in X.FARM_PARCELA) parFin = X.FARM_PARCELA[k];
  parFin += X.FARM_EXPANSION.length;
  const xpH = xpPorParcelaHora * parFin;
  LOG("     con las " + parFin + " parcelas de la granja terminada: " + xpH.toFixed(0) + " XP/h de cultivo");
  [20, 30, 40, X.FARM_NIVEL_MAX].forEach(n => {
    const xp = X.FARM_XP_LVLS[n]; if (xp == null) return;
    const hs = xp / xpH;
    LOG("     nivel " + pad(n, 3) + ": " + pad(xp.toLocaleString("es"), 14) + " XP  =  " +
        pad(Math.round(hs).toLocaleString("es"), 8) + " h  =  " + (hs/24).toFixed(0) + " días sin parar");
  });
}
}

/* ---------- 3. RECOMPENSAS ---------- */
if (corre("premios")) {
LOG("\n═══ 3. RECOMPENSAS ═══");
const valorDe = (r) => {   // cuánto vale, en plata, una entrada de recompensa
  let v = 0, det = [];
  if (r.res) { v += (X.PRICE[r.res[0]] || 0) * r.res[1]; det.push(r.res[1] + " " + r.res[0]); }
  if (r.seed) { const c = X.CROP_DEF[r.seed[0]]; v += (c ? c.seedCost : 0) * r.seed[1]; det.push(r.seed[1] + " sem. " + r.seed[0]); }
  if (r.plata) { v += r.plata; det.push(r.plata + " plata"); }
  if (r.golden) { v += r.golden * (X.GOLDEN_EN_PLATA || 0); det.push(r.golden + " $Golden"); }
  if (r.vales) { v += r.vales * (X.VALE_EN_PLATA || 0); det.push(r.vales + " vales"); }
  return { v, det: det.join(" + ") || (r.cos ? "cosmético" : (r.label || "—")) };
};
const suma = (lista) => lista.reduce((a, r) => a + valorDe(r).v, 0);
const dia = ANCLA * 9 * 24;   // lo que produce la granja de arranque (9 celdas) en un día
LOG("   referencia: la granja de arranque (9 celdas) produce " + dia.toLocaleString("es") + " plata al día\n");
LOG("     PASE gratis (todas las recompensas): " + pad(suma(X.PASS_FREE).toLocaleString("es"), 10) + " plata");
LOG("     PASE VIP    (todas las recompensas): " + pad(suma(X.PASS_VIP).toLocaleString("es"), 10) + " plata");
const dr = suma(X.DAILY_REWARDS);
LOG("     RACHA diaria (los " + X.DAILY_REWARDS.length + " días):        " + pad(dr.toLocaleString("es"), 10) +
    " plata  =  " + (dr / X.DAILY_REWARDS.length / dia * 100).toFixed(1) + "% de un día de granja");
const golds = X.PASS_VIP.reduce((a, r) => a + (r.golden || 0), 0) + X.PASS_FREE.reduce((a, r) => a + (r.golden || 0), 0);
LOG("     $Golden que emite el pase entero:  " + pad(golds, 10) + "  (= " + (golds * (X.GOLDEN_EN_PLATA||0)).toLocaleString("es") + " plata)");
if (suma(X.PASS_VIP) > dia * 30) nota(1, "El pase VIP emite más que 30 días de granja");

LOG("\n   TABLÓN DE PEDIDOS  (¿paga más de lo que pide?)");
LOG("     " + X.PED_POR_DIA + " pedidos diarios + 1 semanal + 1 mensual");
LOG("     el pago se calcula como el VALOR del pedido (neutro) + vales; el ×2 del primero del día");
LOG("     es el único regalo. Los vales valen " + X.VALE_EN_PLATA + " plata cada uno en la tienda de canje.");
}

/* ---------- 4. SUMIDEROS ---------- */
if (corre("sumideros")) {
LOG("\n═══ 4. SUMIDEROS · ¿dónde se quema lo que se produce? ═══\n");
/* 18/8: los materiales INTERMEDIOS (tablón, bloque, barras) no están en PRICE porque no se
   venden: se fabrican. Su valor es el de sus ingredientes. Sin esto, cuatro edificios —los que
   pagan en tablones y bloques— salían a coste CERO y el sumidero parecía la mitad de lo que es. */
const valorMat = k => {
  if (X.PRICE[k] != null) return X.PRICE[k];
  const m = (X.MAT_DEF || {})[k];
  if (!m) return 0;
  return Object.keys(m.cost || {}).reduce((a, j) => a + valorMat(j) * m.cost[j], 0);
};
const valorCosto = c => Object.keys(c || {}).reduce((a, k) => a + valorMat(k) * c[k], 0);
let tot = 0;
LOG("   EDIFICIOS");
for (const k in X.BUILD_DEF) { const v = valorCosto(X.BUILD_DEF[k].cost); tot += v;
  LOG("     " + (X.BUILD_DEF[k].label + " ").padEnd(24, ".") + pad(v.toLocaleString("es"), 10) + " plata"); }
LOG("   EXPANSIONES");
let te = 0; X.EXPANSION_COSTO.forEach((c, i) => { te += valorCosto(c); });
LOG("     las " + X.EXPANSION_MAX + " juntas" + " ".padEnd(13, ".") + pad(te.toLocaleString("es"), 10) + " plata");
tot += te;
LOG("   ARMAS Y ARMADURA");
let ta = 0; (X.ARM_ORDER || []).forEach(id => { const a = X.ARM_DEF[id]; ta += valorCosto(a && a.cost); });
LOG("     todas las armas" + " ".padEnd(10, ".") + pad(ta.toLocaleString("es"), 10) + " plata");
tot += ta;
LOG("\n   TOTAL que el juego pide quemar: " + tot.toLocaleString("es") + " plata");
LOG("   = " + (tot / (ANCLA * 57 * 24)).toFixed(0) + " días de una granja TERMINADA (57 celdas)");
LOG("   = " + (tot / (ANCLA * 9 * 24)).toFixed(0) + " días de la granja de arranque (9 celdas)");
}

/* ---------- RESUMEN ---------- */
LOG("\n" + "═".repeat(72));
if (!hallazgos.length) LOG("SIN HALLAZGOS: todo lo medido cae dentro de la tolerancia del ancla.");
else {
  const g1 = hallazgos.filter(x => x[0] === 1), g2 = hallazgos.filter(x => x[0] === 2);
  LOG("HALLAZGOS GRAVES: " + g1.length); g1.forEach(x => LOG("  · " + x[1]));
  LOG("HALLAZGOS MENORES: " + g2.length); g2.forEach(x => LOG("  · " + x[1]));
}
