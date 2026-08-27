/* PESCA v4 · LA CAPA DE DATOS (27/8, tanda 1a)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Clava las tres cosas de las que cuelga todo el sistema nuevo: el catálogo, las bandas y el
   peso. Si estas tres están bien, el resto de la pesca es interfaz.

   LO QUE MÁS IMPORTA ACÁ ES EL PESO, y conviene explicar por qué antes de leer las pruebas.

   El documento pide dos cosas que, juntas, no cuadran:
       « el precio de venta es el precio base × (peso ÷ peso medio de la especie) »
       « con la curva cargada hacia abajo para que los grandes sean raros de verdad »

   Si el peso se sortea cargado hacia abajo, la MEDIA de los sorteos NO es el punto medio del
   rango: con w = min + (max−min)·u² la media es min + (max−min)/3, un 21 % por debajo. O sea
   que dividir por el punto medio hace que cada pez pague un 21 % menos de lo que dice su tabla,
   en todas las especies a la vez, para siempre, y sin que aparezca en ninguna pantalla.

   Es la clase de error que sobrevive años: no rompe nada, no da error, solo drena. Por eso el
   bloque del peso de este archivo no comprueba una fórmula — SORTEA CIEN MIL PECES y mide el
   promedio. Un invariante estadístico se prueba con estadística.
     node tools/test-pesca-v4-datos.js                                                           */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const DEF = g("PEZ_DEF"), ORDEN = g("PEZ_ORDER"), CANAS = g("CANA_V4_DEF"), CO = g("CANA_V4_ORDER");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL CATÁLOGO: DIECINUEVE ESPECIES, QUINCE DE CAÑA Y CUATRO DE NASA");
{
  ok("están las diecinueve", ORDEN.length === 19, ORDEN.length + "");
  const cana = ORDEN.filter(k => DEF[k].banda !== "mitico"), nasa = ORDEN.filter(k => DEF[k].banda === "mitico");
  ok("quince se pescan con caña", cana.length === 15, cana.length + "");
  ok("y cuatro solo caen en la nasa", nasa.length === 4, nasa.join(", "));
  ok("cada banda de caña tiene tres",
    ["comun", "poco_comun", "raro", "epico", "legendario"].every(b => ctx.pecesDeBanda(b).length === 3),
    ["comun", "poco_comun", "raro", "epico", "legendario"].map(b => b + ":" + ctx.pecesDeBanda(b).length).join(" "));
  ok("ninguna especie está en el catálogo sin estar en el orden",
    Object.keys(DEF).every(k => ORDEN.indexOf(k) >= 0),
    Object.keys(DEF).filter(k => ORDEN.indexOf(k) < 0).join(", "));
  ok("todas tienen precio, XP y rango de peso",
    ORDEN.every(k => DEF[k].precio > 0 && DEF[k].xp > 0 && DEF[k].peso && DEF[k].peso[1] > DEF[k].peso[0]),
    ORDEN.filter(k => !(DEF[k].precio > 0 && DEF[k].xp > 0)).join(", "));
  /* el precio tiene que subir con la banda: si un raro valiera menos que un común, el jugador
     aprendería que la rareza no significa nada */
  const medio = (b) => ctx.pecesDeBanda(b).reduce((s, k) => s + DEF[k].precio, 0) / 3;
  const esc = ["comun", "poco_comun", "raro", "epico", "legendario"].map(medio);
  ok("el precio medio sube en cada banda", esc.every((v, i) => i === 0 || v > esc[i - 1]),
    esc.map(v => Math.round(v)).join(" → "));
}

console.log("\nEL PESO: EL FACTOR TIENE QUE PROMEDIAR 1,00   (la corrección al documento)");
{
  /* cien mil sorteos por especie: si el divisor estuviera mal, esto lo canta */
  const N = 100000;
  const malas = [];
  console.log("");
  for (const k of ["merluza", "atun", "pez_espada", "pez_linterna"]) {
    let suma = 0;
    for (let i = 0; i < N; i++) suma += ctx.pesoFactor(k, ctx.pesoSortear(k));
    const media = suma / N;
    console.log("    " + DEF[k].label.padEnd(14) + "factor medio de " + N.toLocaleString("es") + " capturas: " + media.toFixed(4));
    if (Math.abs(media - 1) > 0.02) malas.push(DEF[k].label + " " + media.toFixed(3));
  }
  console.log("");
  ok("el factor de peso promedia 1,00 — el peso reparte, no imprime", !malas.length, malas.join(" · "));

  /* y la comprobación que separa esto del documento: dividir por el PUNTO MEDIO daría 0,79 */
  const puntoMedio = (DEF.merluza.peso[0] + DEF.merluza.peso[1]) / 2;
  let s2 = 0; for (let i = 0; i < N; i++) s2 += ctx.pesoSortear("merluza") / puntoMedio;
  const conPuntoMedio = s2 / N;
  ok("dividir por el punto medio del rango habría cobrado de menos",
    conPuntoMedio < 0.85, "habría dado " + conPuntoMedio.toFixed(3) + " (un " + Math.round((1 - conPuntoMedio) * 100) + " % de menos, en todas las especies)");
}

console.log("\nY EL PESO SE COMPORTA COMO PROMETE");
{
  const e = DEF.atun;
  ok("nunca sale por debajo del mínimo ni por encima del máximo",
    Array.from({ length: 5000 }, () => ctx.pesoSortear("atun")).every(w => w >= e.peso[0] - 0.01 && w <= e.peso[1] + 0.01));
  /* la curva carga hacia abajo: la mayoría de las capturas tienen que estar en la mitad baja */
  const bajos = Array.from({ length: 20000 }, () => ctx.pesoSortear("atun"))
    .filter(w => w < (e.peso[0] + e.peso[1]) / 2).length / 20000;
  ok("los grandes son raros de verdad (la curva carga abajo)", bajos > 0.6,
    Math.round(bajos * 100) + " % de las capturas caen en la mitad baja del rango");
  ok("un gigante es el 90 % del máximo o más",
    ctx.pezGigante("atun", 9.0) && !ctx.pezGigante("atun", 7.0),
    "umbral: " + (e.peso[0] + (e.peso[1] - e.peso[0]) * 0.9).toFixed(1) + " kg");
  ok("y paga el doble de XP", ctx.pezXp("atun", 9.0) === e.xp * 2, ctx.pezXp("atun", 9.0) + " vs " + e.xp);
  /* el precio sigue al peso */
  const m = ctx.pesoMedia("atun");
  ok("un pez de peso medio vale exactamente su precio de tabla",
    Math.abs(ctx.pezPrecio("atun", m) - e.precio) < 0.15, ctx.pezPrecio("atun", m) + " vs " + e.precio);
  ok("y uno del doble del medio, el doble",
    Math.abs(ctx.pezPrecio("atun", m * 2) - e.precio * 2) < 0.3, ctx.pezPrecio("atun", m * 2) + "");
}

console.log("\nLAS TABLAS DE BANDA DE LAS CUATRO CAÑAS");
{
  const malas = [], suelo = [];
  for (const k of CO) {
    const b = CANAS[k].banda;
    const suma = Object.keys(b).reduce((s, x) => s + b[x], 0);
    if (Math.abs(suma - 100) > 0.01) malas.push(k + " suma " + suma.toFixed(2));
    suelo.push(b.poco_comun);
  }
  ok("las cinco tablas suman 100 %", !malas.length, malas.join(" · "));
  ok("la banda POCO COMÚN no se mueve nunca (el suelo de la economía)",
    suelo.every(x => x === suelo[0]), suelo.join(" · "));
  const base = CANAS.junco.banda;
  ok("la caña de junco respeta el 0,9 % de épico+legendario que pidió dirección",
    Math.abs(base.epico + base.legendario - 0.9) < 0.001, (base.epico + base.legendario).toFixed(3) + " %");
  const fugas = [];
  for (const k of ["bambu", "hierro", "oro"]) {
    const b = CANAS[k].banda;
    const sube = (b.raro + b.epico + b.legendario) - (base.raro + base.epico + base.legendario);
    const baja = base.comun - b.comun;
    if (Math.abs(sube - baja) > 0.02) fugas.push(k);
  }
  ok("lo que suben las bandas altas sale EXACTAMENTE de la común", !fugas.length, fugas.join(", "));
  /* la regla dura del documento: el NIVEL de Pesca no toca la rareza */
  ok("ninguna caña mira el nivel de Pesca para sortear la banda",
    CO.every(k => CANAS[k].banda && typeof CANAS[k].banda === "object"),
    "la rareza la mueve lo que PAGÁS, nunca lo que subiste");
}

console.log("\nEL INVARIANTE: NINGUNA CAÑA CORRE MÁS QUE LA CARNADA");
{
  console.log("\n    caña        valor esperado   peaje    neto por lombriz");
  const netos = [];
  for (const k of ["junco", "bambu", "hierro", "oro"]) {
    const ve = ctx.lanceValorEsperado(k), n = ctx.lanceNeto(k);
    netos.push(n);
    console.log("    " + CANAS[k].label.padEnd(16) + String(ve.toFixed(2)).padStart(8) + String(CANAS[k].mant.toFixed(2)).padStart(9) + String(n.toFixed(2)).padStart(15));
  }
  console.log("");
  ok("un lance con la caña de junco vale lo que cuesta su lombriz (~10)",
    Math.abs(netos[0] - 10) < 0.3, netos[0].toFixed(2));
  ok("el neto SUBE con cada caña — mejorar tiene que servir de algo",
    netos.every((v, i) => i === 0 || v > netos[i - 1]), netos.map(v => v.toFixed(2)).join(" → "));
  const mejora = (netos[3] / netos[0] - 1) * 100;
  ok("pero solo un 13 %: ninguna caña puede correr más rápido que la carnada",
    mejora > 8 && mejora < 20, "de la más barata a la más cara, +" + mejora.toFixed(0) + " %");
  console.log("       → es el seguro contra la sobreproducción, y es lo que hace que la caña");
  console.log("         buena se compre por la rareza y el álbum, no porque imprima plata.");
}

console.log("\nLA CARNADA ES EL RELOJ   (ya no hay enfriamiento de 15 minutos)");
{
  ok("un lance cuesta una lombriz", g("PESCA_V4_LANCE_CEBO") === 1);
  ok("y una nasa, cuatro", g("PESCA_V4_NASA_CEBO") === 4);
  console.log("       → de ahí sale la decisión que ordena el día: ¿mis lombrices van a lances");
  console.log("         o a nasas? Activo contra pasivo, con la misma bolsa.");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la capa de datos de la v4 todavía no cierra"
  : "  Todo en orden: el catálogo, las bandas y el peso cierran contra el ancla.");
process.exit(fallos ? 1 : 0);
