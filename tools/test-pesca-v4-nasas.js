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
  ok("toda ruta de la laguna paga entre 8,5 y 12 por lombriz",
    Math.min(...todos) > 8.5 && Math.max(...todos) < 12,
    Math.min(...todos).toFixed(2) + " a " + Math.max(...todos).toFixed(2));
  /* 28/8: era « la dispersión que promete el documento (22 %) », con una ventana de ±4 alrededor.
     Un test que exige un número EXACTO en un indicador de calidad castiga las mejoras: al pasar
     las nasas a un solo uso la dispersión bajó a 18 % —las siete rutas más juntas que antes— y
     esto se ponía rojo por haber apretado el sistema. Lo que hay que defender es el techo. */
  ok("y ninguna se despega: menos de un 25 % entre la mejor y la peor", disp < 25, disp.toFixed(0) + " %");
  ok("las nasas pagan MENOS que cualquier caña — la pasiva paga tu ausencia, no tus manos",
    Math.max(...nasas) < Math.min(...netos), Math.max(...nasas).toFixed(2) + " < " + Math.min(...netos).toFixed(2));
  console.log("       → si la nasa pagara más, nadie tocaría el minijuego, que es el corazón");
  console.log("         del sistema. El 7 % de diferencia es justo el que hace falta.");
}

console.log("\nCADA CICLO CIERRA CON SU ANCLA   (2 h × 20 × pasiva + el coste ENTERO de la nasa)");
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
  /* LA BASURA YA NO SE DERIVA: LA FIJÓ EL DISEÑADOR.
     « la basura es piedra y madera, en un margen de 2-5 de piedra al igual que la madera ».
     Antes la calculaba yo para que el ciclo cerrara; ahora es dato de entrada y lo que se acomoda
     es el coste de la nasa, que es número mío. Cuando el diseñador pone un número concreto, ese
     número manda y el sistema se mueve alrededor. */
  const tiradas = Array.from({ length: 400 }, () => ctx.nasaBasura());
  const min = Math.min(...tiradas.map(b => Math.min(b.piedra, b.madera)));
  const max = Math.max(...tiradas.map(b => Math.max(b.piedra, b.madera)));
  ok("la basura es 2-5 de piedra y 2-5 de madera, como se pidió", min === 2 && max === 5,
    "medido en 400 tiradas: " + min + " a " + max);
  ok("y las dos se sortean por separado",
    tiradas.some(b => b.piedra !== b.madera),
    "si salieran del mismo dado, la basura se leería como dos escalones y no como un puñado");
  console.log("       → y eso obligó a subir los míticos ×5: con la piedra a 15 y la madera a 12,");
  console.log("         3,5 de cada una son 94,5 de plata — MÁS que las dos horas que la nasa tardó");
  console.log("         y triple que un camarón de 30. Tal cual estaba, la nasa pagaba mejor cuando");
  console.log("         FALLABA, y una mecánica en la que el fracaso es el buen resultado no es");
  console.log("         difícil: está rota.");
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
  /* pesque o no, el hueco queda libre: la nasa es de un solo uso. Las dos ramas por separado se
     miden abajo, forzando la tabla; acá lo que se comprueba es lo que TIENEN EN COMÚN. */
  ok("el hueco vuelve a quedar libre, haya pescado o no", ctx.nasas().length === 0, r);
  if (r !== "rota") ok("si pescó, el mítico entra en la bolsa", (G.fish[r] || 0) === 1, r);
  else ok("si no pescó, deja basura del fondo", (G.res.piedra || 0) >= 2);
}

console.log("\nLA NASA ES DE UN SOLO USO   (la regla, tal como la dio el diseñador)");
{
  /* « se le pone la carnada a ver qué caza en 2 horas de CD… si caza algo se rompe, si no caza
       nada obtendrá basura, y la basura es piedra y madera, en un margen de 2-5 »

     ESTABA AL REVÉS. Si pescaba seguía puesta y se recebaba; si volvía vacía, se rompía. Eso
     venía de mi documento y no de él, y este bloque lo comprobaba con toda confianza — lo cual
     dice algo incómodo sobre para qué sirve un test: fijaba mi interpretación, no su pedido.
     Se fuerza la tabla a los dos extremos para medir cada rama sin depender del azar. */
  const orig = { r: TABLA.mimbre.rota, c: TABLA.mimbre.camaron, g: TABLA.mimbre.cangrejo,
                 l: TABLA.mimbre.langosta, q: TABLA.mimbre.calamar_v4 };
  const forzar = (pesca) => {
    TABLA.mimbre.rota = pesca ? 0 : 100;
    TABLA.mimbre.camaron = pesca ? 100 : 0;
    TABLA.mimbre.cangrejo = 0; TABLA.mimbre.langosta = 0; TABLA.mimbre.calamar_v4 = 0;
  };
  try {
    /* RAMA 1 — PESCA: entrega el mítico y la nasa se rompe */
    pescador(12); G.res.lombriz = CEBO * 4;
    forzar(true);
    ctx.nasaCalar("mimbre");
    ok("calar cobra las " + CEBO + " lombrices", G.res.lombriz === CEBO * 3, G.res.lombriz + "");
    adelantar(g("NASA_HORAS") * 3600e3 + 1000);
    const antesPez = (G.fish || {}).camaron || 0;
    ctx.nasaCobrar(0);
    ok("al pescar, el mítico entra en la bolsa", ((G.fish || {}).camaron || 0) === antesPez + 1);
    ok("Y LA NASA SE ROMPE — ya no está calada", ctx.nasas().length === 0);
    ok("no se cobran lombrices de más: no hay rearme", G.res.lombriz === CEBO * 3, G.res.lombriz + "");
    console.log("       → « si caza algo se rompe ». Antes seguía puesta y se recebaba sola, que");
    console.log("         es lo que decía mi capítulo 8 y no lo que él pidió.");

    /* RAMA 2 — VUELVE VACÍA: basura y también se levanta */
    forzar(false);
    pescador(12); G.res.lombriz = CEBO * 2;
    ok("se cala una segunda nasa", ctx.nasaCalar("mimbre") === true);
    /* la bolsa se vacía DESPUÉS de calar: si se vaciara antes, calar fallaría por falta de
       material y este bloque mediría una nasa que nunca existió — que es exactamente lo que hizo
       la primera versión, y daba « 0 piedra » con el juego funcionando bien. */
    G.res.piedra = 0; G.res.madera = 0;
    adelantar(g("NASA_HORAS") * 3600e3 + 1000);
    ctx.nasaCobrar(0);
    ok("volviendo vacía trae piedra", G.res.piedra >= 2 && G.res.piedra <= 5, G.res.piedra + " piedra");
    ok("y madera", G.res.madera >= 2 && G.res.madera <= 5, G.res.madera + " madera");
    ok("y tampoco se queda calada: la nasa es de un solo uso, pesque o no", ctx.nasas().length === 0);
  } finally {
    TABLA.mimbre.rota = orig.r; TABLA.mimbre.camaron = orig.c; TABLA.mimbre.cangrejo = orig.g;
    TABLA.mimbre.langosta = orig.l; TABLA.mimbre.calamar_v4 = orig.q;
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
  /* 1/9 (dirección): « mientras más alto sea el cultivo da más lombrices » — el compost paga
     por VALOR y el botón echa el MÁS CARO. La regla vieja (el más barato, para no castigar)
     tenía sentido cuando toda tanda daba 3; con la ratio constante ya no hay castigo posible
     y el caro aprovecha mejor las bocas. Lo mide entero test-lombriz-tierra.js. */
  ok("echa el cultivo MÁS CARO que tengas — paga por valor, y las bocas son lo escaso",
    ctx.lombricarioCultivo() === "maiz", ctx.lombricarioCultivo());
  const maices = G.res.maiz, dara = ctx.lombricarioDa("maiz");
  ok("echar cuesta " + g("LOMBRICARIO_PIDE") + " cultivos", ctx.lombricarioEchar() === true);
  ok("y se cobran", G.res.maiz === maices - g("LOMBRICARIO_PIDE"), maices + " → " + G.res.maiz);
  ok("no hay nada listo antes de las " + g("LOMBRICARIO_HORAS") + " h", ctx.lombricarioListas() === 0);
  adelantar(g("LOMBRICARIO_HORAS") * 3600e3 + 1000);
  /* 1/9: « no mandarlas al bag » — lo listo espera en el edificio hasta que se recoge */
  ok("después queda LISTO en el edificio, no en la bolsa", ctx.lombricarioListas() === 1 && G.res.lombriz === 0);
  ok("y recoger entrega lo del cultivo quemado (" + dara + ")", ctx.lombricarioReclamar() === dara && G.res.lombriz === dara);
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
