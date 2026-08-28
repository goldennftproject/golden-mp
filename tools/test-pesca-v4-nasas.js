/* PESCA v4 · LAS NASAS Y LA CARNADA (27/8, tanda 2)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La mitad pasiva de la laguna: se cala, se cierra el navegador, se vuelve. Y el otro grifo, el
   que produce la carnada de la que cuelga el sistema entero.

   ESTE ARCHIVO EXISTE POR UN ERROR QUE CASI DEJO PASAR, y conviene tenerlo escrito.

   El documento dice « armarla cuesta 4 lombrices » y, dos líneas después, « si la nasa pesca,
   SIGUE PUESTA ». Lo leí como un pago único al calarla. Con esa lectura, una nasa de hierro rinde
   177 de plata por lombriz —contra los 9,92 que dice la tabla del propio documento— porque
   produce para siempre con un solo pago. Es exactamente la « ruta rota » que el capítulo 9 existe
   para impedir, y no lo vi leyendo: lo vio la tabla del invariante cuando la calculé.

   La lectura correcta la da la tabla 12: divide el valor de UN CICLO entre cuatro lombrices. Se
   paga POR CICLO. Volver a cebar cuesta otras cuatro.

   Un documento se puede leer de dos maneras; una tabla de invariantes, no. Por eso lo primero
   que se construyó de la Pesca v4 fue el invariante, y no el minijuego.
     node tools/test-pesca-v4-nasas.js                                                           */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate;", ctx);
const DEF = g("NASA_DEF"), ORDEN = g("NASA_ORDER"), TABLA = g("NASA_TABLA"), CEBO = g("PESCA_V4_NASA_CEBO");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const T0 = 1787900000000; let desfase = 0;
ctx.nowMs = () => T0 + desfase;
vm.runInContext("nowMs = window.nowMs;", ctx);
const adelantar = (ms) => { desfase += ms; };
function pescador(nv) {
  desfase = 0;
  let acc = 0; for (let k = 2; k <= nv; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc }; G.level = 9; G.tuto = { done: true };
  /* la bolsa se llena con lo que las nasas de la tabla 10 piden de verdad: fibra, bronce y
     cuero entraron cuando las mezclas pasaron a ser las del documento. */
  G.nasas = []; G.fish = {};
  G.res = { lombriz: 40, madera: 40, piedra: 20, tablon: 30, fibra: 20,
            barra_bronce: 10, barra_hierro: 10, cuero: 20 };
}

console.log("\nEL INVARIANTE DE LA LOMBRIZ, CON LAS NASAS DENTRO");
{
  console.log("\n    ruta                lombrices   neto por lombriz");
  const netos = [];
  for (const k of ["junco", "bambu", "hierro", "oro"]) {
    const n = ctx.lanceNeto(k); netos.push(n);
    console.log("    " + ("Caña de " + k).padEnd(20) + "1".padStart(6) + n.toFixed(2).padStart(16));
  }
  const nasas = [];
  for (const k of ORDEN) {
    const n = ctx.nasaPorLombriz(k); nasas.push(n);
    console.log("    " + DEF[k].label.padEnd(20) + String(CEBO).padStart(6) + n.toFixed(2).padStart(16));
  }
  console.log("");
  const todos = netos.concat(nasas);
  const disp = (Math.max(...todos) / Math.min(...todos) - 1) * 100;
  ok("toda ruta de la laguna paga entre 9 y 12 por lombriz",
    Math.min(...todos) > 9 && Math.max(...todos) < 12,
    Math.min(...todos).toFixed(2) + " a " + Math.max(...todos).toFixed(2));
  ok("la dispersión es la que promete el documento (22 %)", Math.abs(disp - 22) < 4, disp.toFixed(0) + " %");
  ok("las nasas pagan MENOS que cualquier caña — la pasiva paga tu ausencia, no tus manos",
    Math.max(...nasas) < Math.min(...netos), Math.max(...nasas).toFixed(2) + " < " + Math.min(...netos).toFixed(2));
  console.log("       → si la nasa pagara más, nadie tocaría el minijuego, que es el corazón");
  console.log("         del sistema. El 7 % de diferencia es justo el que hace falta.");
}

console.log("\nCADA CICLO CIERRA CON SU ANCLA   (2 h × 20 × pasiva + coste ÷ ciclos de vida)");
{
  console.log("\n    nasa               ancla   valor/ciclo   desvío");
  const malas = [];
  for (const k of ORDEN) {
    const a = ctx.nasaAncla(k), v = ctx.nasaValorCiclo(k), d = (v - a) / a * 100;
    console.log("    " + DEF[k].label.padEnd(19) + a.toFixed(1).padStart(6) + v.toFixed(1).padStart(12) + (Math.round(d) + " %").padStart(9));
    if (Math.abs(d) > 3) malas.push(DEF[k].label + " " + Math.round(d) + " %");
  }
  console.log("");
  ok("las tres cierran con menos de un 3 %", !malas.length, malas.join(" · "));
  /* la basura del mar se DERIVA: es lo que hace falta para que el ciclo cierre. En la de hierro
     esa cuenta da cero —su ancla ya cierra con los peces solos— y ahí manda la regla 9 por encima
     de la aritmética: una nasa que se rompe y no devuelve NADA es una acción muda. Se le da el
     mínimo de todos modos, y el 1 % que eso desvía es el precio de que el jugador sepa qué pasó. */
  ok("ninguna nasa rota deja al jugador con las manos vacías",
    ORDEN.every(k => { const b = ctx.nasaBasura(k); return b.piedra >= 1 && b.madera >= 1; }),
    ORDEN.map(k => { const b = ctx.nasaBasura(k); return k + " " + b.piedra + "🪨+" + b.madera + "🪵"; }).join(" · "));
  console.log("       → el documento decía « 2-4 piedra y 2-4 madera », que con SUS precios valía");
  console.log("         30 y cerraba. Con los reales vale 81, y las tres nasas rendían de un 10 a");
  console.log("         un 32 % de más. Una fuga que nadie ve, porque « me trajo madera » no suena");
  console.log("         a exploit.");
}

console.log("\nLAS TABLAS SUMAN 100 — ningún ciclo puede terminar en silencio");
{
  const malas = ORDEN.filter(k => Math.abs(Object.keys(TABLA[k]).reduce((s, x) => s + TABLA[k][x], 0) - 100) > 0.01);
  ok("las tres tablas suman exactamente 100 %", !malas.length, malas.join(" · "));
  ok("el calamar sale un 3 % con la nasa de mimbre — la lectura correcta del « 1 % » pedido",
    TABLA.mimbre.calamar_v4 === 3, TABLA.mimbre.calamar_v4 + " %");
  ok("y la de mimbre se rompe el 40 % de las veces: el azar duele, no bloquea",
    TABLA.mimbre.rota === 40);
  ok("la de hierro se rompe mucho menos", TABLA.hierro.rota < TABLA.mimbre.rota / 3,
    TABLA.hierro.rota + " % vs " + TABLA.mimbre.rota + " %");
}

console.log("\nCALAR, ESPERAR Y LEVANTAR");
{
  pescador(1);
  ok("a Pesca 1 hay un hueco de nasa", ctx.nasaCupo() === 1, ctx.nasaCupo() + "");
  ok("y solo la de mimbre está abierta",
    ORDEN.filter(ctx.nasaAbierta).join(",") === "mimbre", ORDEN.filter(ctx.nasaAbierta).join(","));
  const lomb = G.res.lombriz, mad = G.res.madera;
  ok("calar una cuesta " + CEBO + " lombrices y su material", ctx.nasaCalar("mimbre") === true);
  ok("se cobraron las lombrices", G.res.lombriz === lomb - CEBO, lomb + " → " + G.res.lombriz);
  ok("y el material", G.res.madera === mad - DEF.mimbre.cost.madera, mad + " → " + G.res.madera);
  ok("no se puede levantar antes de tiempo", ctx.nasaCobrar(0) === null);
  ok("con el hueco ocupado no entra otra", ctx.nasaCalar("mimbre") === false);

  adelantar(g("NASA_HORAS") * 3600e3 + 1000);
  ok("pasadas las " + g("NASA_HORAS") + " h está lista", ctx.nasasParte()[0].lista === true);
  const r = ctx.nasaCobrar(0);
  ok("y levantarla resuelve el ciclo", !!r, r);
  if (r !== "rota") {
    ok("si pescó, el mítico entra en la bolsa", (G.fish[r] || 0) === 1, r);
    ok("y la nasa SIGUE puesta", ctx.nasas().length === 1);
  } else {
    ok("si no pescó, la nasa se rompe y deja basura", ctx.nasas().length === 0 && G.res.piedra > 20 - 1);
  }
}

console.log("\nY VOLVER A CEBAR CUESTA OTRAS CUATRO   (la línea que sostiene el invariante)");
{
  /* se fuerza una nasa que SIEMPRE pesca, para medir el rearme sin depender del azar */
  pescador(12);
  const orig = TABLA.mimbre.rota; TABLA.mimbre.rota = 0;
  TABLA.mimbre.camaron = 100; TABLA.mimbre.cangrejo = 0; TABLA.mimbre.langosta = 0; TABLA.mimbre.calamar_v4 = 0;
  try {
    G.res.lombriz = CEBO * 2;
    ctx.nasaCalar("mimbre");
    ok("quedan " + CEBO + " lombrices para el rearme", G.res.lombriz === CEBO, G.res.lombriz + "");
    adelantar(g("NASA_HORAS") * 3600e3 + 1000);
    ctx.nasaCobrar(0);
    ok("al pescar se vuelve a cebar y se cobran otras " + CEBO, G.res.lombriz === 0, G.res.lombriz + "");
    ok("y la nasa sigue calada", ctx.nasas().length === 1);
    /* y sin lombrices, se levanta sola y lo DICE — una nasa que desaparece sin explicación es un bug */
    adelantar(g("NASA_HORAS") * 3600e3 + 1000);
    const mad = G.res.madera;
    ctx.nasaCobrar(0);
    ok("sin lombrices para cebar, la nasa se levanta", ctx.nasas().length === 0);
    ok("y devuelve su material", G.res.madera === mad + DEF.mimbre.cost.madera, mad + " → " + G.res.madera);
  } finally {
    TABLA.mimbre.rota = orig; TABLA.mimbre.camaron = 27; TABLA.mimbre.cangrejo = 18;
    TABLA.mimbre.langosta = 12; TABLA.mimbre.calamar_v4 = 3;
  }
}

console.log("\nEL CUPO CRECE CON EL OFICIO   (el mismo patrón que el establo)");
{
  const filas = [1, 4, 8, 12, 16, 20].map(nv => { pescador(nv); return nv + ":" + ctx.nasaCupo(); });
  ok("un hueco al empezar y uno más cada cuatro niveles, tope 5",
    filas.join(" ") === "1:1 4:2 8:3 12:4 16:5 20:5", filas.join(" "));
}

console.log("\nDE DÓNDE SALEN LAS LOMBRICES");
{
  /* « montículos: 3 por día, más 1 por cada 4 expansiones » */
  const m = [0, 4, 8, 12, 16].map(e => { G.expansiones = e; return e + ":" + ctx.excavPorDia(); });
  ok("los montículos crecen con el terreno", m.join(" ") === "0:3 4:4 8:5 12:6 16:7", m.join(" "));
  console.log("       → la carnada es el reloj de la laguna: si no creciera con la granja, la");
  console.log("         pesca se quedaría quieta mientras todo lo demás avanza.");

  /* el Lombricario */
  G.level = 12; G.built = { lombricario: true };
  let acc = 0; for (let k = 2; k <= 10; k++) acc += ctx.skillNeed(k, "farming");
  G.skills = { farming: acc, fishing: acc };
  ok("el Lombricario se abre con Cultivo " + g("LOMBRICARIO_LVL"), ctx.lombricarioAbierto());
  ok("y tiene 1 boca + una cada 5 de Cultivo, tope " + g("LOMBRICARIO_BOCAS_MAX"),
    ctx.lombricarioBocas() === 3, ctx.lombricarioBocas() + " bocas a Cultivo 10");
  G.res = { papa: 10, maiz: 4, lombriz: 0 };
  ok("echa el cultivo MÁS BARATO que tengas — quemar el caro por descuido sería un castigo mudo",
    ctx.lombricarioCultivo() === "papa", ctx.lombricarioCultivo());
  const papas = G.res.papa;
  ok("echar cuesta " + g("LOMBRICARIO_PIDE") + " cultivos", ctx.lombricarioEchar() === true);
  ok("y se cobran", G.res.papa === papas - g("LOMBRICARIO_PIDE"), papas + " → " + G.res.papa);
  ok("no da nada antes de las " + g("LOMBRICARIO_HORAS") + " h", ctx.lombricarioCheck() === 0);
  adelantar(g("LOMBRICARIO_HORAS") * 3600e3 + 1000);
  ok("y después da " + g("LOMBRICARIO_DA") + " lombrices", ctx.lombricarioCheck() === g("LOMBRICARIO_DA"));
  ok("que entran en la bolsa", G.res.lombriz === g("LOMBRICARIO_DA"), G.res.lombriz + "");
}

console.log("\nLA CURVA DE LA LAGUNA: SUBE Y DESPUÉS BAJA, Y ASÍ HAY QUE DEJARLA");
{
  console.log("\n    granja   lombrices/día   la laguna da   % del ingreso del día");
  const filas = [[5, 1, 450], [10, 5, 1200], [14, 9, 2100], [21, 16, 3940]];
  const pcts = [];
  for (const [nv, exp, prod] of filas) {
    const cult = Math.max(1, Math.round(nv / 2));
    let acc = 0; for (let k = 2; k <= cult; k++) acc += ctx.skillNeed(k, "farming");
    G.level = nv; G.expansiones = exp; G.skills = { farming: acc, fishing: acc };
    G.built = { lombricario: cult >= g("LOMBRICARIO_LVL") };
    const l = ctx.lombricesPorDia(), plata = l * 10, pct = plata / prod * 100;
    pcts.push(pct);
    console.log("    " + String(nv).padStart(5) + String(l).padStart(14) + String(Math.round(plata)).padStart(15) + (pct.toFixed(1) + " %").padStart(22));
  }
  console.log("");
  ok("la laguna es en torno al 10 % del ingreso al empezar", Math.abs(pcts[0] - 10) < 3, pcts[0].toFixed(1) + " %");
  ok("pica cuando se abre el Lombricario", pcts[1] > pcts[0], pcts[1].toFixed(1) + " %");
  ok("y baja en el veterano — condimento, no ingreso", pcts[3] < pcts[1] * 0.65, pcts[3].toFixed(1) + " %");
  console.log("       → « la pesca es el INGRESO del jugador de la primera semana y el CONDIMENTO");
  console.log("         del veterano ». La curva del documento, reproducida.");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la mitad pasiva de la laguna todavía no cierra"
  : "  Todo en orden: las nasas pagan su ausencia, y la carnada sigue siendo el reloj.");
process.exit(fallos ? 1 : 0);
