/* LAS CIFRAS DEL GDD, SACADAS DEL JUEGO                                (9/9, revisión 6)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El subtítulo del GDD dice « estado real del código ». Esa frase solo vale si alguien la
   comprueba, y hasta hoy las tablas del documento se escribían a mano leyendo el código — que es
   exactamente el fallo que este proyecto lleva una semana persiguiendo en otros sitios.
   Este medidor imprime, EJECUTANDO el juego, todas las tablas que el GDD afirma. Se corre antes
   de escribir una revisión y se pega lo que salga.
     node tools/gdd-cifras.js                                                                   */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

const tit = (t) => console.log("\n" + "═".repeat(78) + "\n  " + t + "\n" + "═".repeat(78));
const fila = (...c) => console.log("| " + c.join(" | ") + " |");

tit("EL ANCLA Y LAS CONSTANTES QUE MANDAN");
{
  const v = (n) => { try { return g(n); } catch (e) { return "—"; } };
  [["ancla (plata por celda-hora)", "ANCLA_PLATA_HORA"], ["expansiones", "EXPANSION_MAX"],
   ["techo de granja", "FARM_NIVEL_MAX"], ["XP del nivel 50 (objetivo)", "FARM_XP_TECHO"],
   ["parcelas máximas", "PLOT_MAX"], ["$Golden en plata", "GOLDEN_EN_PLATA"],
   ["un vale en plata", "VALE_EN_PLATA"], ["lombrices por día", "LOMBRICES_POR_DIA"],
   ["enfriamiento de la Zona (min)", "ZONA_CD_MIN"], ["ración del establo (plata)", "RACION_PLATA"],
   ["felicidad por ración", "FELIZ_POR_RACION"], ["cupo del establo", "ESTABLO_CUPO_MAX"],
   ["venta libre de platos", "DISH_VENTA_LIBRE"], ["horas-celda que paga el pase", "PASE_HORAS"],
  ].forEach(([t, k]) => console.log("  " + t.padEnd(34) + String(v(k))));
  console.log("  " + "reloj del árbol / de la roca".padEnd(34) + (g("CD").tree / 60) + " min / " + (g("CD").rock / 60) + " min");
}

tit("CULTIVOS — la columna plata/h tiene que dar 20 en todas las filas");
{
  const C = g("CROP_DEF"), O = g("CROP_ORDER") || Object.keys(C);
  /* los campos son seedCost / growH / yield / price — no `seed` ni `min`. La primera versión de
     este medidor los leyó mal y la columna que existe para PROBAR la coherencia salió en NaN:
     un medidor que imprime NaN al menos se delata, pero si hubiera leído un campo parecido y
     equivocado habría escrito trece filas falsas con toda confianza. */
  fila("Cultivo", "Nivel", "Semilla", "Minutos", "Precio", "Gana", "Plata/h", "XP");
  const orden = Object.keys(C).sort((a, b) => (C[a].growH - C[b].growH));
  for (const k of orden) {
    const c = C[k]; if (!c) continue;
    const gana = c.price * (c.yield || 1) - c.seedCost, ph = gana / c.growH;
    fila(c.label, c.lvl, c.seedCost, Math.round(c.growH * 60), c.price, gana, ph.toFixed(1), c.xp);
  }
}

tit("MINERALES — dos llaves: el pico y el nivel de Minería");
{
  const O = g("ORE_DEF");
  fila("Mineral", "Categoría", "Nivel de Minería", "Precio", "Reloj (h)", "Rinde");
  for (const k in O) fila(O[k].label, O[k].tier != null ? O[k].tier : "—", ctx.oreNivelReq(k), ctx.priceOf(k), (O[k].cd / 3600).toFixed(1), O[k].yield);
}

tit("OFICIOS — el techo se deriva del contenido");
{
  fila("Oficio", "Techo", "Escalones que abre", "Lo último que abre");
  g("SKILL_DEFS").forEach(d => {
    let l = []; try { l = ctx.oficioAbre(d[0]); } catch (e) {}
    const ult = l.length ? l[l.length - 1][1] : "— NADA —";
    fila(g("SKILL_NAME")[d[0]] || d[0], ctx.oficioTecho(d[0]), l.length, ult);
  });
  console.log("\n  sin contenido: " + (ctx.oficiosSinContenido().join(", ") || "ninguno"));
}

tit("LA CURVA DE GRANJA — derivada de las celdas desde el nivel 11");
{
  const XP = g("FARM_XP_LVLS"), FE = g("FARM_EXPANSION");
  const celdas = (l) => 9 + 3 * FE.filter(x => x <= l).length;
  fila("Nivel", "XP acumulada", "Escalón", "Celdas", "XP por celda");
  for (const l of [2, 5, 9, 10, 11, 20, 30, 40, 50])
    fila(l, XP[l], XP[l] - XP[l - 1], celdas(l), ((XP[l] - XP[l - 1]) / celdas(l)).toFixed(1));
}

tit("EXPANSIONES — nivel y coste, los dos derivados");
{
  const FE = g("FARM_EXPANSION"), CO = ctx.expansionCostos();
  const VETA = (() => { try { return g("GF.EXP_CON_VETA") || []; } catch (e) { return []; } })();
  fila("#", "Nivel", "Coste", "¿veta?");
  FE.forEach((nv, i) => {
    const c = CO[i] || {};
    const txt = Object.keys(c).map(k => c[k] + " " + ((g("RES_LABEL") || {})[k] || k)).join(" + ");
    fila(i + 1, nv, txt, VETA.indexOf(i + 1) >= 0 ? "bronce + oro" : "");
  });
}

tit("GANADERÍA — 24 h y +1 de material (dirección, 9/9)");
{
  const A = g("ANIMAL_DEF"), O = g("ANIMAL_ORDER");
  /* el precio NO está en la ficha: se deriva (animalPrecio) y además SUBE con cada animal que ya
     tengas. Leer `a.price` daba una columna vacía — el campo no existe. */
  const CROP = g("CROP_DEF");
  fila("Animal", "Nivel", "Primero cuesta", "Material", "Vale", "Ciclo (h)", "Por ciclo", "Come");
  for (const k of O) {
    const a = A[k];
    fila(a.label, ctx.animalNivelReq(k), ctx.animalPrecio(k), (g("RES_LABEL") || {})[a.mat] || a.mat,
      ctx.priceOf(a.mat), a.cicloH, ctx.animalPorCiclo(k),
      (a.come || []).map(c => (CROP[c] || {}).label || c).join(" o "));
  }
  console.log("\n  una ración cuesta " + g("RACION_PLATA") + " de plata y da " + g("FELIZ_POR_RACION") + " de felicidad");
  console.log("  cada animal comprado encarece al siguiente de su especie un " + Math.round(g("ANIMAL_SUBE") * 100) + " %");
}

tit("PESCA v4 — las cañas: una puerta y un peaje");
{
  const D = g("CANA_V4_DEF"), O = g("CANA_V4_ORDER");
  fila("Caña", "Nivel", "Presupuesto", "Mezcla", "Cola de plata", "Peaje por lance", "Neto por lombriz");
  for (const k of O) {
    const d = D[k];
    const mez = d.cost ? Object.keys(d.cost).map(x => d.cost[x] + " " + ((g("RES_LABEL") || {})[x] || x)).join(" + ") : "120 Escamas";
    fila(d.label, d.lvl, d.presupuesto == null ? "—" : d.presupuesto, mez, d.colaPlata || 0, d.mant, ctx.lanceNeto(k).toFixed(2));
  }
  const N = g("NASA_DEF"), NO = g("NASA_ORDER");
  console.log("");
  fila("Nasa", "Nivel", "Coste", "Horas");
  for (const k of NO) {
    const n = N[k];
    fila(n.label, n.lvl, Object.keys(n.cost).map(x => n.cost[x] + " " + ((g("RES_LABEL") || {})[x] || x)).join(" + "), n.horas || "—");
  }
}

tit("EL PASE — cada escalón paga una hora de la granja de esa altura");
{
  fila("Escalón", "Granja", "Celdas", "Lo que paga", "Premio");
  const FREE = g("PASS_FREE");
  for (const n of [1, 5, 10, 15, 20, 25, 30])
    fila(n, ctx.paseNivelDeGranja(n), ctx.paseCeldas(n), ctx.paseValorDelEscalon(n), ctx.passRewardStr(FREE[n - 1]));
  const d = ctx.paseDesviados();
  console.log("\n  escalones cuyo objeto no da su altura: " + (d.length ? d.map(x => x.nivel + " (×" + x.factor + ")").join(" · ") : "ninguno"));
}

tit("QUÉ ENTREGA CADA NIVEL DE GRANJA — jugable contra adorno (ley 3)");
{
  let jug = 0; const mudos = [];
  for (let n = 2; n <= g("FARM_NIVEL_MAX"); n++) {
    const cos = ctx.farmCosmetico(n).split(" + ").filter(Boolean);
    const util = ctx.farmUnlockTxt(n).split(" + ").filter(p => !/precio de venta/.test(p) && cos.indexOf(p) < 0);
    if (util.length) jug++; else mudos.push(n);
  }
  console.log("  niveles que entregan algo JUGABLE: " + jug + " de " + (g("FARM_NIVEL_MAX") - 1));
  console.log("  niveles que solo dan el bono de venta (+ adorno): " + mudos.length);
  console.log("  cuáles: " + mudos.join(", "));
}

tit("HERRAMIENTAS DE VERIFICACIÓN");
{
  const fs = require("fs");
  const t = fs.readdirSync(path.join(RAIZ, "tools")).filter(f => f.endsWith(".js"));
  /* LAS MISMAS DOS EXPRESIONES QUE USA gdd-verificar.js, y no otras parecidas. La primera versión
     de esto contaba solo `auditar-` y se dejaba fuera los cuatro `auditoria-`: dos medidores del
     mismo proyecto dando 20 y 24 para la misma pregunta. Da igual cuál de los dos tenga razón —
     lo que no puede ser es que cada uno cuente a su manera, porque entonces el que escriba el
     documento elige sin saberlo cuál de los dos números publica. Manda el verificador, que es el
     que después comprueba el documento. */
  const es = (re) => t.filter(f => re.test(f)).length;
  console.log("  archivos en tools/: " + t.length);
  console.log("    pruebas (test-*):   " + es(/^test-.*\.js$/));
  console.log("    auditores (auditar-* y auditoria-*): " + es(/^auditar-|^auditoria-/));
  console.log("    el resto (medidores, simuladores, generadores): " +
    (t.length - es(/^test-.*\.js$/) - es(/^auditar-|^auditoria-/)));
}

console.log("");
