/* AUDITORÍA DE ECONOMÍA (16/8) — lee los valores REALES de public/game/state.js y calcula:
   · valor por hora de cada fuente de producción (parcela vs árbol vs roca vs veta)
   · COSTO EFECTIVO de cada material (lo que cuesta producirlo, no lo que dice PRICE)
   · el precio de los edificios y del cofre medido en horas de reloj y en plata efectiva
   · desalineación de las dos curvas de XP (nivel de granja vs skill de Farmeo)
   · tipos de cambio de $Golden entre sistemas
   NO toca el juego: solo mide. El TABLÓN queda fuera (aún sin aprobar).
   Correr: node tools/auditoria-economia.js   (JSON_OUT=/ruta para volcar) */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { window: { NICK: "audit" }, GF: {}, console, Math, Date, JSON, Object, Array, String, Number,
  toast: () => {}, log: () => {}, isOpen: () => false, refreshHud: () => {}, saveFarm: () => {},
  localStorage: { getItem: () => null, setItem: () => {} } };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/game/state.js"), "utf8"), ctx, { filename: "state.js" });
// las tablas declaradas con `const` no quedan en globalThis: se extraen a mano desde adentro
vm.runInContext(`globalThis.__T = { CROP_DEF, ORE_DEF, ORE_ORDER, PICK_DEF, PICK_ORDER, PRICE, SELLABLE,
  BUILD_DEF, MAT_DEF, TOOL_CRAFT, TOOL_DEF, CHEST_COST, CHEST_PLATA, RECIPE_DEF, FARM_PARCELA };`, ctx);
const S = Object.assign({}, ctx, ctx.__T);

const r2 = n => Math.round(n * 100) / 100;
const out = {};

// ---------- 1) COSTO EFECTIVO de los materiales (lo que cuesta producir 1 unidad) ----------
// Hacha: solo plata. Pico de piedra: plata + madera (que a su vez cuesta hachas).
const costoHacha = S.TOOL_CRAFT.axe.plata;                       // plata por 1 tala
const costoMadera = costoHacha;                                   // 1 hacha = 1 madera
const picoP = S.PICK_DEF.stone;
const costoPico = picoP.plata + (picoP.cost.madera || 0) * costoMadera;
const costoPiedra = costoPico;                                    // 1 pico = 1 piedra
const costoMat = { madera: costoMadera, piedra: costoPiedra };
for (const k of S.ORE_ORDER) {   // minerales: el pico del tier correspondiente
  if (k === "piedra") continue;
  const pk = S.PICK_ORDER.find(p => S.PICK_DEF[p].mineTier === S.ORE_DEF[k].tier);
  const pd = pk ? S.PICK_DEF[pk] : null;
  if (!pd) continue;
  let c = pd.plata;
  for (const m in pd.cost) c += pd.cost[m] * (costoMat[m] || 0);
  costoMat[k] = c;   // aprox: los picos altos piden materiales que ya tienen costo calculado
}
out.costoEfectivo = {};
for (const k in costoMat) out.costoEfectivo[k] = { costoPlata: r2(costoMat[k]), precioPRICE: S.PRICE[k] || 0, seVende: S.SELLABLE.includes(k) };

// ---------- 2) VALOR POR HORA de cada fuente ----------
const horasNodo = { madera: S.CD.tree / 3600, piedra: S.CD.rock / 3600 };
for (const k in S.ORE_DEF) if (k !== "piedra") horasNodo[k] = S.ORE_DEF[k].cd / 3600;
out.porHora = { cultivos: [], nodos: [] };
for (const k in S.CROP_DEF) {
  const c = S.CROP_DEF[k];
  out.porHora.cultivos.push({ item: k, horas: c.growH, netoPorCiclo: c.price - c.seedCost,
    plataHora: r2((c.price - c.seedCost) / c.growH), xpHora: r2(c.xp / c.growH), lvlSkill: c.lvl });
}
for (const k in horasNodo) {
  const costo = costoMat[k] || 0, precio = S.PRICE[k] || 0;
  out.porHora.nodos.push({ item: k, horas: r2(horasNodo[k]), costoHerramienta: r2(costo),
    plataHoraSiSeVendiera: r2((precio - costo) / horasNodo[k]), seVende: S.SELLABLE.includes(k) });
}
// ancla implícita: la mediana de plata/hora de los cultivos (lo único que sí genera plata)
const ph = out.porHora.cultivos.map(c => c.plataHora).sort((a, b) => a - b);
out.ancla = { plataPorHoraCultivo: ph[Math.floor(ph.length / 2)], min: ph[0], max: ph[ph.length - 1] };

// ---------- 3) EDIFICIOS: precio en horas de reloj y en plata efectiva ----------
out.edificios = [];
const nodosDe = { madera: 1, piedra: 1, bronce: 1, hierro: 1, oro: 1, diamante: 1, netherita: 1 };   // 1 nodo de cada mineral en el mapa
for (const id in S.BUILD_DEF) {
  const b = S.BUILD_DEF[id]; let plata = 0, horas = 0, detalle = [];
  for (const m in b.cost) {
    const n = b.cost[m];
    plata += n * (costoMat[m] || 0);
    horas += n * (horasNodo[m] || 0) / (nodosDe[m] || 1);
    detalle.push(n + " " + m);
  }
  out.edificios.push({ id, label: b.label, pide: detalle.join(" + "), lvl: b.lvl || "-", golden: b.golden || 0,
    plataEfectiva: Math.round(plata), horasUnNodo: Math.round(horas) });
}
out.cofre = { pide: "20 madera + 10 piedra + " + S.CHEST_PLATA + " plata",
  plataEfectiva: Math.round(20 * costoMadera + 10 * costoPiedra + S.CHEST_PLATA) };

// ---------- 4) LAS DOS CURVAS DE XP ----------
const acumSkill = L => { let s = 0; for (let l = 1; l < L; l++) s += S.skillNeed(l); return Math.round(s); };
out.curvas = { cultivos: [], granja: [] };
for (const k in S.CROP_DEF) out.curvas.cultivos.push({ cultivo: k, skillLvl: S.CROP_DEF[k].lvl, xpNecesaria: acumSkill(S.CROP_DEF[k].lvl) });
for (let n = 2; n <= 10; n++) out.curvas.granja.push({ nivel: n, xpNecesaria: S.FARM_XP_LVLS[n], parcelas: S.FARM_PARCELA[n] || "" });
// a la XP que completa el nivel 10 de GRANJA, ¿en qué nivel de skill está el jugador?
const xpGranja10 = S.FARM_XP_LVLS[10];
out.curvas.comparacion = { xpParaGranja10: xpGranja10, skillFarmeoConEsaXp: S.skillInfo(xpGranja10).lvl,
  xpParaMaiz: acumSkill(S.CROP_DEF.maiz.lvl), vecesMas: r2(acumSkill(S.CROP_DEF.maiz.lvl) / xpGranja10) };

// ---------- 5) LA CAÑA Y LA PESCA ----------
const rod = S.TOOL_CRAFT.rod;
let cañaPlata = rod.plata, cañaHoras = 0, cañaDet = [];
for (const m in rod.cost) { cañaPlata += rod.cost[m] * (costoMat[m] || 0); cañaHoras += rod.cost[m] * (horasNodo[m] || 0); cañaDet.push(rod.cost[m] + " " + m); }
out.caña = { pide: cañaDet.join(" + ") + (rod.plata ? " + " + rod.plata + " plata" : ""),
  plataEfectiva: Math.round(cañaPlata), horasDeNodo: Math.round(cañaHoras), kitInicial: S.KIT_INICIAL.rod };

// ---------- 6) TIPOS DE CAMBIO DE $GOLDEN ----------
out.golden = [
  // 20/8: la parcela dejo de venderse en $Golden (direccion: "lo dejamos para cuando tenga
  // sentido venderlo asi") — se compra solo con plata y ya no aparece entre los cambios.
  { sistema: "Kit de emergencia: hacha", ratio: r2(costoHacha / S.EMERG_GOLDEN.axe) + " plata = 1 $Golden" },
  { sistema: "Kit de emergencia: pico", ratio: r2(costoPico / S.EMERG_GOLDEN.pick) + " plata = 1 $Golden" },
  { sistema: "Kit de emergencia: semilla papa", ratio: r2(S.CROP_DEF.papa.seedCost / S.EMERG_GOLDEN.seed) + " plata = 1 $Golden" },
];

// ---------- 7) COCINA: ¿el plato vale más que sus insumos? ----------
out.cocina = [];
for (const id of ["papa_asada", "pure_papa", "sopa_zanahoria", "pescado_asado"]) {
  const rc = S.RECIPE_DEF[id]; if (!rc) continue;
  let ins = 0, det = [];
  for (const m in (rc.res || {})) { const v = S.CROP_DEF[m] ? S.CROP_DEF[m].price : (costoMat[m] || 0); ins += rc.res[m] * v; det.push(rc.res[m] + " " + m); }
  for (const f in (rc.fish || {})) { det.push(rc.fish[f] + " pez " + f); ins += Math.round(cañaPlata); }
  // OJO (16/8): el precio REAL de venta lo calcula dishPrice() = ingredientes × COOK_MARGEN
  // cuando COOK_PRICE_AUTO=1. El campo `plata` de la tabla es legado y engaña.
  const venta = ctx.dishPrice(rc);
  out.cocina.push({ plato: rc.label, insumos: det.join(" + "), valorInsumos: Math.round(ins), ventaPlato: venta,
    plataTablaLegado: rc.plata || 0, balance: Math.round(venta - ins) });
}

// ---------- 8) CUPO DE SEMILLAS vs PARCELAS ----------
out.cupo = [];
for (let nv = 1; nv <= 10; nv++) {
  let parc = 3; for (const k in S.FARM_PARCELA) if (nv >= +k) parc = S.FARM_PARCELA[k];
  ctx.window.G.level = nv; ctx.window.G.plotsOwned = parc;   // el cupo real sale de la función del juego (G es const: se llega por window)
  const cupo = ctx.seedDailyMax();
  out.cupo.push({ nivel: nv, cupoDiario: cupo, parcelas: parc, siembrasPorParcela: r2(cupo / parc),
    papaCiclosDia: r2(24 / S.CROP_DEF.papa.growH), cupoAlcanzaHoras: r2(cupo / parc * S.CROP_DEF.papa.growH) });
}

// ---------- 9) LA REGLA DE ORO: ¿cuántos nodos financia una parcela? ----------
// Los cultivos son la ÚNICA fuente de plata; los nodos la consumen (herramientas).
// Mantener un nodo cuesta: costo de la herramienta ÷ horas de su reloj.
const ancla = out.ancla.plataPorHoraCultivo;
const mantArbol = costoMadera / horasNodo.madera, mantRoca = costoPiedra / horasNodo.piedra;
out.regla = { anclaParcela: ancla, mantArbolHora: r2(mantArbol), mantRocaHora: r2(mantRoca),
  arbolesPorParcela: r2(ancla / mantArbol), rocasPorParcela: r2(ancla / mantRoca),
  mantRocaSinMadera: r2(picoP.plata / horasNodo.piedra), rocasPorParcelaSinMadera: r2(ancla / (picoP.plata / horasNodo.piedra)) };
// ¿la escalera de nodos por nivel que ya está en el juego respeta la regla?
out.escalera = [];
for (let nv = 1; nv <= 10; nv++) {
  let parc = 3; for (const k in S.FARM_PARCELA) if (nv >= +k) parc = S.FARM_PARCELA[k];
  const arb = S.NIVEL_ARBOLES.filter(x => x <= nv).length, roc = S.NIVEL_ROCAS.filter(x => x <= nv).length;
  const ingreso = parc * ancla, gasto = arb * mantArbol + roc * mantRoca;
  out.escalera.push({ nivel: nv, parcelas: parc, arboles: arb, rocas: roc,
    ingresoHora: Math.round(ingreso), mantenimientoHora: Math.round(gasto), margen: Math.round(ingreso - gasto), ok: ingreso >= gasto });
}
// el escenario que probamos ayer: 10 + 10
const g1010 = 10 * mantArbol + 10 * mantRoca;
out.escenario1010 = { mantenimientoHora: Math.round(g1010), parcelasNecesarias: Math.ceil(g1010 / ancla), parcelasQueHay: 6 };

// ---------- salida ----------
const L = (t) => console.log(t);
L("=== COSTO EFECTIVO DE LOS MATERIALES (lo que cuesta producir 1) ===");
L("material".padEnd(12) + "cuesta".padStart(9) + "PRICE dice".padStart(12) + "  ¿se vende?");
for (const k in out.costoEfectivo) { const c = out.costoEfectivo[k];
  L(k.padEnd(12) + String(c.costoPlata).padStart(9) + String(c.precioPRICE).padStart(12) + "  " + (c.seVende ? "sí" : "NO")); }

L("\n=== VALOR POR HORA: CULTIVOS (la única fuente real de plata) ===");
L("cultivo".padEnd(12) + "horas".padStart(7) + "plata/h".padStart(9) + "xp/h".padStart(8) + "skill".padStart(7));
for (const c of out.porHora.cultivos) L(c.item.padEnd(12) + String(c.horas).padStart(7) + String(c.plataHora).padStart(9) + String(c.xpHora).padStart(8) + String(c.lvlSkill).padStart(7));
L("ANCLA IMPLÍCITA: mediana " + out.ancla.plataPorHoraCultivo + " plata/hora por parcela (rango " + out.ancla.min + "-" + out.ancla.max + ")");

L("\n=== VALOR POR HORA: NODOS (con el costo de su herramienta) ===");
L("nodo".padEnd(12) + "horas".padStart(7) + "herram.".padStart(9) + "plata/h*".padStart(10) + "  ¿se vende?");
for (const n of out.porHora.nodos) L(n.item.padEnd(12) + String(n.horas).padStart(7) + String(n.costoHerramienta).padStart(9) + String(n.plataHoraSiSeVendiera).padStart(10) + "  " + (n.seVende ? "sí" : "NO"));
L("* si se vendiera al precio de PRICE — hoy madera/piedra/minerales NO se venden");

L("\n=== EDIFICIOS: precio real ===");
L("edificio".padEnd(20) + "pide".padEnd(32) + "plata efec.".padStart(12) + "h de 1 nodo".padStart(13) + "  nivel");
for (const e of out.edificios) L(e.label.padEnd(20) + e.pide.padEnd(32) + String(e.plataEfectiva).padStart(12) + String(e.horasUnNodo).padStart(13) + "   " + e.lvl);
L("Cofre: " + out.cofre.pide + " = " + out.cofre.plataEfectiva + " plata efectivas");

L("\n=== LAS DOS CURVAS DE XP (misma XP de farmeo, dos varas) ===");
L("Granja nivel 10 (todas las parcelas tempranas y edificios) pide " + out.curvas.comparacion.xpParaGranja10 + " XP.");
L("Con esa MISMA XP, el skill de Farmeo está en nivel " + out.curvas.comparacion.skillFarmeoConEsaXp + ".");
L("El maíz (skill 10) pide " + out.curvas.comparacion.xpParaMaiz + " XP = " + out.curvas.comparacion.vecesMas + "× la del nivel 10 de granja.");
L("cultivo".padEnd(12) + "skill".padStart(6) + "XP acumulada".padStart(14));
for (const c of out.curvas.cultivos) L(c.cultivo.padEnd(12) + String(c.skillLvl).padStart(6) + String(c.xpNecesaria).padStart(14));

L("\n=== LA CAÑA ===");
L("Cuesta " + out.caña.pide + " = " + out.caña.plataEfectiva + " plata efectivas = " + out.caña.horasDeNodo + " horas de nodo. El kit regala " + out.caña.kitInicial + ".");

L("\n=== $GOLDEN: un tipo de cambio por sistema ===");
for (const g of out.golden) L("  " + g.sistema.padEnd(32) + g.ratio);

L("\n=== COCINA: ¿el plato vale sus insumos? ===");
for (const c of out.cocina) L("  " + c.plato.padEnd(18) + c.insumos.padEnd(30) + " insumos " + String(c.valorInsumos).padStart(5) + " → venta " + String(c.ventaPlato).padStart(5) + "  balance " + (c.balance > 0 ? "+" : "") + c.balance + "   (tabla legado: " + c.plataTablaLegado + ")");

L("\n=== CUPO DE SEMILLAS vs PARCELAS ===");
L("nivel".padEnd(7) + "cupo".padStart(6) + "parcelas".padStart(10) + "siembras/parcela".padStart(18) + "horas que dura".padStart(16));
for (const c of out.cupo) L(String(c.nivel).padEnd(7) + String(c.cupoDiario).padStart(6) + String(c.parcelas).padStart(10) + String(c.siembrasPorParcela).padStart(18) + String(c.cupoAlcanzaHoras).padStart(16));

L("\n=== LA REGLA DE ORO: cuántos nodos financia UNA parcela ===");
L("  1 parcela produce " + out.regla.anclaParcela + " plata/hora (el ancla).");
L("  Mantener 1 árbol cuesta " + out.regla.mantArbolHora + " plata/hora → una parcela financia " + out.regla.arbolesPorParcela + " árboles.");
L("  Mantener 1 roca cuesta " + out.regla.mantRocaHora + " plata/hora → una parcela financia " + out.regla.rocasPorParcela + " rocas.");
L("  (Si el pico NO pidiera madera: " + out.regla.mantRocaSinMadera + " plata/hora → " + out.regla.rocasPorParcelaSinMadera + " rocas por parcela.)");
L("\n  REGLA: parcelas × " + ancla + "  ≥  árboles × " + r2(mantArbol) + " + rocas × " + r2(mantRoca));
L("nivel".padEnd(7) + "parc".padStart(5) + "árb".padStart(5) + "roc".padStart(5) + "ingreso/h".padStart(11) + "manten./h".padStart(11) + "margen".padStart(9) + "  ¿cierra?");
for (const e of out.escalera) L(String(e.nivel).padEnd(7) + String(e.parcelas).padStart(5) + String(e.arboles).padStart(5) + String(e.rocas).padStart(5) +
  String(e.ingresoHora).padStart(11) + String(e.mantenimientoHora).padStart(11) + String(e.margen).padStart(9) + "   " + (e.ok ? "SÍ" : "NO ✗"));
L("\n  Escenario probado ayer (10 árboles + 10 rocas): mantenimiento " + out.escenario1010.mantenimientoHora +
  " plata/hora → pide " + out.escenario1010.parcelasNecesarias + " parcelas y el jugador llega a tener " + out.escenario1010.parcelasQueHay + ".");

if (process.env.JSON_OUT) fs.writeFileSync(process.env.JSON_OUT, JSON.stringify(out, null, 1));
