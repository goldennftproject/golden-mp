/* AUDITORÍA DE LA PESCA v4, ANTES DE ESCRIBIR UNA LÍNEA (27/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El documento « pesca nueva.docx » propone tirar la pesca actual y poner otra. Sus cifras dicen
   estar « ancladas y verificadas por script », y en su §7 deja un aviso honesto:

       « Los valores que usé para armar esas mezclas —madera 10, tablón 35, barra de hierro 130,
         barra de oro 280, cuero 55, fibra 25— están derivados del ancla, no leídos del código.
         Antes de clavar las recetas hay que sacar la tabla real. »

   Esto hace exactamente eso, y de paso comprueba el resto de los invariantes que el documento
   promete. La regla de la casa que se está aplicando: NINGÚN número entra al juego sin que una
   herramienta lo haya contrastado con el ancla. Un documento que dice « verificado por script »
   y no trae el script es un documento que dice « confía ».

   QUÉ SE MIDE
     1 · los materiales, contra PRICE y MAT_DEF del código
     2 · las recetas de cañas y nasas, contra su propio presupuesto
     3 · el invariante de la lombriz (toda ruta paga ~10 de plata por lombriz)
     4 · las tablas de rareza (que sumen 100 y que solo se mueva lo que el documento dice)
     5 · el factor de peso (que su promedio sea 1,00 y no toque el ancla)
     6 · los ciclos de nasa contra el ancla de 2 h
     7 · la vara de La Lonja contra la del tablón que ya existe

   NO decide si el diseño es bueno. Decide si sus números cierran.
     node tools/auditar-pesca-v4.js                                                              */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

const ANCLA = g("ANCLA_PLATA_HORA"), PRICE = g("PRICE"), MAT = g("MAT_DEF");
/* el valor de un material en plata sombra: los brutos vienen de PRICE, los fabricados de su receta */
function val(k) {
  if (PRICE[k] != null) return PRICE[k];
  const m = MAT[k];
  if (!m) return null;
  return Object.keys(m.cost).reduce((s, x) => s + (val(x) || 0) * m.cost[x], 0);
}

let avisos = 0, graves = 0;
const linea = () => console.log("─".repeat(80));
const ok = (n, c, d) => { if (!c) avisos++; console.log((c ? "  ok   " : "  ⚠     ") + n + (d ? "   " + d : "")); };
const duro = (n, c, d) => { if (!c) graves++; console.log((c ? "  ok   " : "  ✗ GRAVE ") + n + (d ? "   " + d : "")); };
const pct = (a, b) => Math.round((a - b) / b * 100);

console.log("\n" + "═".repeat(80));
console.log("  AUDITORÍA · GOLDEN FARM · PESCA v4      (ancla: " + ANCLA + " de plata por hora)");
console.log("═".repeat(80));

console.log("\n1 · LOS MATERIALES QUE EL DOCUMENTO SUPONE");
{
  const supone = { madera: 10, tablon: 35, barra_hierro: 130, barra_oro: 280, cuero: 55, fibra: 25 };
  console.log("\n  material          el doc    el código    desvío");
  const rotos = [];
  for (const k in supone) {
    const real = val(k), d = real == null ? null : pct(real, supone[k]);
    console.log("  " + k.padEnd(16) + String(supone[k]).padStart(7) + String(real == null ? "—" : real).padStart(12) +
      (d == null ? "     ?" : (d > 0 ? "+" : "") + d + " %").padStart(10));
    if (real != null && Math.abs(d) > 25) rotos.push(k + " (" + (d > 0 ? "+" : "") + d + " %)");
  }
  console.log("");
  duro("los precios supuestos coinciden con los del código", !rotos.length, rotos.join(" · "));
}

console.log("\n2 · LAS RECETAS CONTRA SU PROPIO PRESUPUESTO");
{
  /* el presupuesto es el número que el documento declara intocable; la mezcla es lo que se
     recalcula. Así que se compara mezcla contra presupuesto, no al revés. */
  const recetas = [
    ["Caña de Junco",  30,   { madera: 3 },                                  5],
    ["Caña de Bambú",  400,  { madera: 24, fibra: 4 },                       60],
    ["Caña de Hierro", 1000, { tablon: 6, barra_hierro: 4, cuero: 3 },       105],
    ["Caña de Oro",    2000, { tablon: 10, barra_oro: 4, cuero: 6 },         200],
    ["Nasa de mimbre", null, { madera: 4, fibra: 1 },                        0],
    ["Nasa reforzada", null, { madera: 6, fibra: 2, barra_bronce: 1 },       0],
    ["Nasa de hierro", null, { tablon: 8, cuero: 2, barra_hierro: 2 },       0],
  ];
  console.log("\n  pieza              presupuesto   cuesta de verdad   factor");
  const malas = [];
  for (const [nom, pres, mezcla, plata] of recetas) {
    const cuesta = Object.keys(mezcla).reduce((s, k) => s + (val(k) || 0) * mezcla[k], 0) + plata;
    const f = pres ? cuesta / pres : null;
    console.log("  " + nom.padEnd(18) + String(pres == null ? "—" : pres).padStart(11) +
      String(Math.round(cuesta)).padStart(19) + (f == null ? "      —" : ("×" + f.toFixed(1)).padStart(9)));
    if (f != null && (f > 1.15 || f < 0.85)) malas.push(nom + " ×" + f.toFixed(1));
  }
  console.log("");
  duro("cada receta cabe en su presupuesto (±15 %)", !malas.length, malas.join(" · "));
  console.log("       (el propio documento lo anticipa: « si alguno está corrido, las mezclas se");
  console.log("        recalculan solas contra el presupuesto, que es el número que no se toca »)");
}

console.log("\n3 · EL INVARIANTE DE LA LOMBRIZ   — el capítulo 9, que sostiene todo");
{
  /* « Toda ruta de la laguna paga entre 9,29 y 11,34 de plata por lombriz. » */
  const rutas = [
    ["Caña de Junco", 1, 10.00], ["Caña de Bambú", 1, 10.45],
    ["Caña de Hierro", 1, 10.98], ["Caña de Oro", 1, 11.34],
    ["Nasa de mimbre", 4, 37.15], ["Nasa reforzada", 4, 41.07], ["Nasa de hierro", 4, 39.68],
  ];
  console.log("\n  ruta               lombrices    neto    por lombriz");
  const porLombriz = rutas.map(([n, l, neto]) => {
    const v = neto / l;
    console.log("  " + n.padEnd(18) + String(l).padStart(7) + String(neto.toFixed(2)).padStart(9) + v.toFixed(2).padStart(13));
    return v;
  });
  const min = Math.min(...porLombriz), max = Math.max(...porLombriz);
  const disp = (max / min - 1) * 100;
  console.log("");
  ok("la dispersión entre rutas es la que promete el documento (22 %)",
    Math.abs(disp - 22) < 4, "medida: " + disp.toFixed(0) + " %  (" + min.toFixed(2) + " a " + max.toFixed(2) + ")");
  ok("ninguna ruta se dispara respecto de la más floja", max / min < 1.35, "×" + (max / min).toFixed(2));
  ok("las nasas pagan MENOS que la caña (la pasiva no puede ganarle a las manos)",
    Math.max(porLombriz[4], porLombriz[5], porLombriz[6]) < Math.max(porLombriz[0], porLombriz[1], porLombriz[2], porLombriz[3]));
}

console.log("\n4 · LAS TABLAS DE RAREZA");
{
  const tablas = {
    "Caña de Junco":  [62.00, 27.00, 10.10, 0.750, 0.150],
    "Caña de Bambú":  [55.40, 27.00, 16.16, 1.200, 0.240],
    "Caña de Hierro": [46.60, 27.00, 24.24, 1.800, 0.360],
    "Caña de Oro":    [34.50, 27.00, 35.35, 2.625, 0.525],
  };
  const malas = [], pocoComun = [];
  for (const k in tablas) {
    const s = tablas[k].reduce((a, b) => a + b, 0);
    if (Math.abs(s - 100) > 0.01) malas.push(k + " suma " + s.toFixed(2));
    pocoComun.push(tablas[k][1]);
  }
  duro("las cuatro tablas suman 100 %", !malas.length, malas.join(" · "));
  ok("la banda POCO COMÚN no se mueve nunca (el suelo de la economía)",
    pocoComun.every(x => x === pocoComun[0]), pocoComun.join(" · "));
  /* « lo que sube sale siempre de la banda común » */
  const base = tablas["Caña de Junco"];
  const fugas = [];
  for (const k in tablas) {
    const t = tablas[k];
    const subeAlto = (t[2] + t[3] + t[4]) - (base[2] + base[3] + base[4]);
    const bajaComun = base[0] - t[0];
    if (Math.abs(subeAlto - bajaComun) > 0.02) fugas.push(k + ": alto +" + subeAlto.toFixed(2) + " vs común −" + bajaComun.toFixed(2));
  }
  duro("lo que suben las bandas altas sale exactamente de la común", !fugas.length, fugas.join(" · "));
  ok("la caña de junco respeta el 0,9 % de épico+legendario que pidió dirección",
    Math.abs((base[3] + base[4]) - 0.9) < 0.001, (base[3] + base[4]).toFixed(3) + " %");
}

console.log("\n5 · EL FACTOR DE PESO   — no puede mover el ancla");
{
  /* « precio = base × (peso ÷ peso medio) », y el promedio tiene que dar 1,00.
     El documento además dice « la curva cargada hacia abajo para que los grandes sean raros ».
     Esas dos cosas se contradicen si « peso medio » es el punto medio del rango: con una curva
     cargada hacia abajo, la MEDIA de los sorteos queda por debajo del punto medio. */
  const especies = [["Merluza", 0.4, 1.8], ["Atún", 2.0, 9.0], ["Pez espada", 20, 90]];
  console.log("\n  especie        rango        punto medio   media si la curva carga abajo (x²)");
  const desvios = [];
  for (const [n, a, b] of especies) {
    const medio = (a + b) / 2;
    /* si el peso se sortea con w = a + (b−a)·u² (curva cargada abajo), la media es a + (b−a)/3 */
    const mediaReal = a + (b - a) / 3;
    const d = pct(mediaReal, medio);
    console.log("  " + n.padEnd(14) + (a + " – " + b).padEnd(13) + medio.toFixed(2).padStart(11) + mediaReal.toFixed(2).padStart(20) + "   (" + d + " %)");
    desvios.push(d);
  }
  console.log("");
  ok("dividir por el PUNTO MEDIO no descuadra el precio esperado",
    desvios.every(d => Math.abs(d) < 5),
    "con curva cargada abajo el precio esperado queda " + desvios[0] + " % por debajo del base");
  console.log("       → si el sorteo carga hacia abajo, el divisor tiene que ser la MEDIA de la");
  console.log("         curva, no el punto medio del rango. Si no, cada pez vale ~11 % menos de");
  console.log("         lo que dice su tabla y la pesca entera cobra de menos sin que se note.");
}

console.log("\n6 · LOS CICLOS DE NASA CONTRA EL ANCLA");
{
  /* « el ancla de un ciclo es 2 h × 20 + el coste de la nasa repartido entre sus ciclos de vida » */
  const nasas = [
    ["Nasa de mimbre", { madera: 4, fibra: 1 },                  2.5, 45.15, 48.00],
    ["Nasa reforzada", { madera: 6, fibra: 2, barra_bronce: 1 }, 4.0, 58.57, 57.50],
    ["Nasa de hierro", { tablon: 8, cuero: 2, barra_hierro: 2 }, 8.3, 79.28, 79.60],
  ];
  console.log("\n  nasa              ancla del doc   ancla recalculada   valor/ciclo   desvío");
  const malas = [];
  for (const [n, mezcla, ciclos, valor, anclaDoc] of nasas) {
    const coste = Object.keys(mezcla).reduce((s, k) => s + (val(k) || 0) * mezcla[k], 0);
    const anclaReal = 2 * ANCLA + coste / ciclos;
    const d = pct(valor, anclaReal);
    console.log("  " + n.padEnd(18) + String(anclaDoc.toFixed(2)).padStart(12) + String(anclaReal.toFixed(2)).padStart(20) +
      String(valor.toFixed(2)).padStart(14) + ((d > 0 ? "+" : "") + d + " %").padStart(9));
    if (Math.abs(d) > 15) malas.push(n + " " + d + " %");
  }
  console.log("");
  duro("el valor por ciclo cierra con el ancla recalculada (±15 %)", !malas.length, malas.join(" · "));
}

console.log("\n7 · LA VARA DE LA LONJA   — no puede ser un grifo nuevo");
{
  /* « la vara es la misma que la del tablón de semillas: diario 10 % de la producción del día
     repartido en tres, semanal un día, mensual tres días ». Se contrasta con lo que el tablón
     paga HOY, que es el número que ya está en el juego. */
  const prodDia = 3940;                                  // granja 21, del propio documento
  const esperado = { marea: prodDia * 0.10 / 3, semanal: prodDia, mensual: prodDia * 3 };
  const dice     = { marea: prodDia * 0.033, semanal: prodDia, mensual: 11820 };
  console.log("\n  escalón     la vara dice   el documento paga   desvío");
  const malas = [];
  for (const k in esperado) {
    const d = pct(dice[k], esperado[k]);
    console.log("  " + k.padEnd(12) + String(Math.round(esperado[k])).padStart(11) + String(Math.round(dice[k])).padStart(20) +
      ((d > 0 ? "+" : "") + d + " %").padStart(9));
    if (Math.abs(d) > 10) malas.push(k + " " + d + " %");
  }
  console.log("");
  ok("los tres escalones respetan la vara del tablón", !malas.length, malas.join(" · "));

  /* y el aviso del propio documento: « un jugador que vende su pez linterna está tirando 11.680 » */
  const linterna = 140, mensual = 11820;
  ok("el salto entre vender y entregar es grande a propósito (×84 declarado)",
    Math.abs(mensual / linterna - 84) < 2, "×" + (mensual / linterna).toFixed(0));
  console.log("       → es deliberado y está explicado, pero conviene tenerlo medido: un pedido");
  console.log("         mensual paga 84 lances. Si se puede repetir, ES la economía entera.");
}

console.log("\n8 · LA CARNADA COMO ÚNICO GRIFO");
{
  /* « Lombrices por día = producción diaria ÷ 100 », y la laguna queda en el 10 % del ingreso */
  const filas = [[5, 450, 4.5, 46], [10, 1200, 16.5, 170], [14, 2100, 24.0, 248], [21, 3940, 31.5, 325]];
  console.log("\n  granja   producción   lombrices doc   producción÷100   la laguna   % del ingreso");
  const malas = [];
  for (const [nv, prod, lomb, laguna] of filas) {
    const teorico = prod / 100;
    const p = laguna / prod * 100;
    console.log("  " + String(nv).padStart(5) + String(prod).padStart(13) + String(lomb.toFixed(1)).padStart(15) +
      String(teorico.toFixed(1)).padStart(17) + String(laguna).padStart(12) + (p.toFixed(1) + " %").padStart(15));
    if (Math.abs(lomb - teorico) / teorico > 0.6) malas.push("granja " + nv + ": " + lomb + " vs " + teorico.toFixed(1));
  }
  console.log("");
  ok("las lombrices por día siguen la regla « producción ÷ 100 »", !malas.length, malas.join(" · "));
  console.log("       → la regla es la palanca declarada del sistema. Si la tabla no la cumple,");
  console.log("         tocar « la carnada » deja de mover la laguna de forma predecible, que es");
  console.log("         justo lo que el capítulo 9 promete.");
}

console.log("");
linea();
if (graves) console.log("  " + graves + " problema(s) GRAVE(s) y " + avisos + " aviso(s): hay números que no cierran.");
else if (avisos) console.log("  Sin problemas graves. " + avisos + " aviso(s) para revisar con dirección.");
else console.log("  ✓ todas las cifras del documento cierran contra el código y el ancla.");
linea();
console.log("");
process.exit(0);   // es una AUDITORÍA: informa, no bloquea la suite
