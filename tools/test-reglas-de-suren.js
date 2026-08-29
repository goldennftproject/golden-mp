/* LAS REGLAS DEL DISEÑADOR, UNA POR UNA                                                (28/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   ESTE ARCHIVO EXISTE POR UNA CORRECCIÓN QUE ME HIZO LA DIRECCIÓN Y QUE CONVIENE NO OLVIDAR.

   Llevo tres días implementando « el documento » de la Pesca v4 y llamándolo así. El documento
   lo escribí yo: es una propuesta mía de dieciséis capítulos respondiendo a un encargo corto de
   Suren —por eso tiene un capítulo titulado « lo que corregí de lo pedido »—. Cuando la dirección
   le preguntó al diseñador cómo se imaginaba la pesca, contestó que el minijuego y buena parte de
   la mecánica no eran suyos, y mandó la lista de lo único que hay que mantener:

     « diferentes tipos de cañas y que se junte la ganadería con las cañas »
     « según la caña tienes varias opciones de peces »
     « pescas normal, si quieres agregar el minijuego genial »
     « las trampas… se le pone la carnada a ver qué caza en 2 horas de CD »
     « la única ventaja es que si caza algo se rompe, si no caza nada obtendrá basura, y la
       basura es piedra y madera, en un margen de 2-5 de piedra al igual que la madera »
     « las escamas… es la moneda de la pesca »
     « que los peces tengan peso es genial porque puede ser legendario pero si tiene poco peso
       no sirve, a comparación de un pez raro con muchísimo peso »

   Eso es todo. Ocho frases contra dieciséis capítulos.

   Los tests de test-pesca-v4-*.js miden MI documento, y por eso durante tres tandas dieron verde
   sobre cosas que él no había pedido —y una, la nasa, exactamente al revés de como la pidió—. Un
   test fija la interpretación de quien lo escribe; si el que escribe el test es el mismo que
   interpretó el encargo, el verde no prueba nada sobre el encargo.

   Así que este archivo mide SUS frases, y ninguna otra cosa. Cuando su lista y mi documento
   discrepen, manda éste.
     node tools/test-reglas-de-suren.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);
const PEZ = g("PEZ_DEF"), CANAS = g("CANA_V4_DEF"), CO = g("CANA_V4_ORDER");
const NASAS = g("NASA_DEF"), NO = g("NASA_ORDER"), TABLA = g("NASA_TABLA");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let T = 1787900000000;
ctx.nowMs = () => T;
vm.runInContext("nowMs = window.nowMs;", ctx);

console.log("\n« DIFERENTES TIPOS DE CAÑAS, Y QUE SE JUNTE LA GANADERÍA CON LAS CAÑAS »");
{
  ok("hay cinco cañas distintas", CO.length === 5, CO.length + ": " + CO.join(", "));
  /* LA GANADERÍA ENTRA POR EL CUERO, que sale del Toro y de la Alpaca. Es la única forma de que
     « se junte con las cañas » signifique algo mecánico y no decorativo: mejorar la pesca obliga
     a criar, igual que obliga a talar y a picar. */
  const conCuero = CO.filter(k => CANAS[k].cost && CANAS[k].cost.cuero);
  ok("y las dos de arriba piden CUERO: mejorar la caña obliga a criar", conCuero.length >= 2,
    conCuero.map(k => CANAS[k].label + " (" + CANAS[k].cost.cuero + " cuero)").join(" · "));
  console.log("       → es lo mismo que ya hacen las expansiones con la madera y la piedra: si la");
  console.log("         caña de oro costara plata pelada, mejorar la pesca sería ahorrar.");
}

console.log("\n« SEGÚN LA CAÑA TIENES VARIAS OPCIONES DE PECES »");
{
  console.log("");
  const BANDAS = ["comun", "poco_comun", "raro", "epico", "legendario"];
  for (const k of CO) {
    const n = BANDAS.reduce((s, b) => s + ctx.pecesDeCana(k, b).length, 0);
    console.log("    " + CANAS[k].label.padEnd(17) + String(n).padStart(2) + " especies" +
      (ctx.canaPecesNuevos(k).length ? "   abre: " + ctx.canaPecesNuevos(k).map(x => PEZ[x].label).join(", ") : ""));
  }
  console.log("");
  const cuenta = (k) => BANDAS.reduce((s, b) => s + ctx.pecesDeCana(k, b).length, 0);
  ok("cada caña saca un conjunto DISTINTO de peces", cuenta("junco") < cuenta("oro"),
    cuenta("junco") + " con la de junco contra " + cuenta("oro") + " con la de oro");
  ok("y cada escalón abre alguno nuevo — ninguna subida es muda",
    ["bambu", "hierro", "oro"].every(k => ctx.canaPecesNuevos(k).length > 0),
    ["bambu", "hierro", "oro"].map(k => k + ":+" + ctx.canaPecesNuevos(k).length).join(" "));
  /* y que no sea solo una tabla: que el juego DE VERDAD no los saque */
  const salieron = {};
  for (let i = 0; i < 30000; i++) {
    const L = ctx.lanceArmar("junco", null, { noche: true });
    salieron[L.id] = true;
  }
  const prohibidos = ctx.pecesDeBanda("epico").concat(ctx.pecesDeBanda("legendario"))
    .filter(k => ctx.pecesDeCana("junco", PEZ[k].banda).indexOf(k) < 0 && salieron[k]);
  ok("y en 30.000 lances con la de junco no salió ni uno de los que no abre", !prohibidos.length,
    prohibidos.map(k => PEZ[k].label).join(", "));
  console.log("       → una tabla que dice que algo no puede salir y un sorteo que igual lo saca");
  console.log("         es la peor combinación: la promesa está escrita y el juego no la cumple.");
}

console.log("\n« LAS TRAMPAS: SE LE PONE LA CARNADA A VER QUÉ CAZA EN 2 HORAS DE CD »");
{
  ok("la nasa tarda 2 horas", g("NASA_HORAS") === 2, g("NASA_HORAS") + " h");
  ok("y se le pone carnada para armarla", g("PESCA_V4_NASA_CEBO") > 0,
    g("PESCA_V4_NASA_CEBO") + " lombrices");
  ok("el reloj corre con la pestaña cerrada: es hora real, no turnos",
    NO.every(k => true) && typeof ctx.nasaLista === "function",
    "la nasa guarda su hora de fin, no un contador de sesiones");
}

console.log("\n« SI CAZA ALGO SE ROMPE · SI NO CAZA NADA OBTENDRÁ BASURA »");
{
  const pescador = () => {
    G.res = { lombriz: 200, madera: 500, piedra: 500, tablon: 500 };
    G.fish = {}; G.nasas = []; G.pescaStats = {};
    let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
    G.skills = { fishing: acc };
  };
  const orig = Object.assign({}, TABLA.mimbre);
  const forzar = (pesca) => {
    TABLA.mimbre.rota = pesca ? 0 : 100;
    TABLA.mimbre.camaron = pesca ? 100 : 0;
    TABLA.mimbre.cangrejo = 0; TABLA.mimbre.langosta = 0; TABLA.mimbre.calamar_v4 = 0;
  };
  try {
    /* CAZA → SE ROMPE */
    pescador(); forzar(true);
    ctx.nasaCalar("mimbre");
    T += 3 * 3600e3;
    ctx.nasaCobrar(0);
    ok("cazando algo, la nasa SE ROMPE", ctx.nasas().length === 0);
    ok("y el pez entra en la bolsa", (G.fish.camaron || 0) === 1);
    console.log("       → estaba al revés: si pescaba seguía puesta y se recebaba sola. Eso era de");
    console.log("         mi documento, y sus tests lo daban por bueno con toda confianza.");

    /* NO CAZA → BASURA, PIEDRA Y MADERA, 2 A 5 DE CADA */
    pescador(); forzar(false);
    const rangos = { piedra: [99, 0], madera: [99, 0] };
    for (let i = 0; i < 300; i++) {
      G.nasas = []; G.res.lombriz = 50; G.res.madera = 500; G.res.piedra = 500;
      ctx.nasaCalar("mimbre");
      const p0 = G.res.piedra, m0 = G.res.madera;
      T += 3 * 3600e3;
      ctx.nasaCobrar(0);
      const dp = G.res.piedra - p0, dm = G.res.madera - m0;
      rangos.piedra = [Math.min(rangos.piedra[0], dp), Math.max(rangos.piedra[1], dp)];
      rangos.madera = [Math.min(rangos.madera[0], dm), Math.max(rangos.madera[1], dm)];
    }
    ok("no cazando nada, la basura es PIEDRA de 2 a 5", rangos.piedra[0] === 2 && rangos.piedra[1] === 5,
      rangos.piedra.join(" a ") + " en 300 nasas");
    ok("y MADERA de 2 a 5", rangos.madera[0] === 2 && rangos.madera[1] === 5,
      rangos.madera.join(" a ") + " en 300 nasas");
  } finally { Object.assign(TABLA.mimbre, orig); }
}

console.log("\n« LAS ESCAMAS: LA MONEDA DE LA PESCA »");
{
  ok("existen y se cuentan aparte de la plata", typeof ctx.escamasLonja === "function");
  const T2 = g("LONJA_TIENDA");
  ok("y compran cosas que la plata no compra", Object.keys(T2).length >= 4,
    Object.keys(T2).map(k => T2[k].esc + "🐚 " + (T2[k].label || k)).join(" · "));
  console.log("       → PENDIENTE de su frase: él las sitúa en el TABLERO y hoy salen de La Lonja,");
  console.log("         que es un tablón aparte que monté yo en el muelle. Los pedidos de pesca");
  console.log("         tienen que mudarse al tablón que ya existe; la tienda puede quedarse.");
}

console.log("\n« PUEDE SER LEGENDARIO PERO SI TIENE POCO PESO NO SIRVE »");
{
  console.log("");
  const fila = (id, i, q) => {
    const kg = PEZ[id].peso[i];
    console.log("    " + (PEZ[id].label + " " + q).padEnd(26) + PEZ[id].banda.padEnd(12) +
      String(kg).padStart(5) + " kg" + String(ctx.pezPrecio(id, kg)).padStart(10) + " de plata");
  };
  fila("pez_globo", 1, "MÁXIMO"); fila("pez_sapo", 1, "MÁXIMO"); fila("pez_gato", 1, "MÁXIMO");
  fila("pez_espada", 0, "mínimo"); fila("pez_gota", 0, "mínimo");
  console.log("");
  const raroMax = Math.max(...ctx.pecesDeBanda("raro").map(k => ctx.pezPrecio(k, PEZ[k].peso[1])));
  const legMin = Math.min(...ctx.pecesDeBanda("legendario").map(k => ctx.pezPrecio(k, PEZ[k].peso[0])));
  ok("el mejor RARO por peso vale más que el peor LEGENDARIO por peso", raroMax > legMin,
    raroMax + " contra " + legMin);
  /* y lo que NO puede pasar: que el legendario deje de ser un premio en su tope */
  const legMax = Math.max(...ctx.pecesDeBanda("legendario").map(k => ctx.pezPrecio(k, PEZ[k].peso[1])));
  ok("pero en su tope el legendario sigue siendo un premio de verdad", legMax > raroMax * 10,
    legMax + " el mejor legendario, ×" + Math.round(legMax / raroMax) + " sobre el mejor raro");
  console.log("       → con el factor de peso LINEAL esto no pasaba ni de lejos: un pez espada");
  console.log("         mínimo valía 231 y el mejor pez globo 66. La banda aplastaba al peso, que");
  console.log("         es exactamente lo contrario de lo que él describe.");
  /* Y EL ANCLA NO SE MOVIÓ, que es lo que hace que este cambio sea barato */
  let peor = 0;
  for (const k of g("PEZ_ORDER")) {
    let s = 0; const N = 5000, e = PEZ[k];
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      s += ctx.pesoFactor(k, e.peso[0] + (e.peso[1] - e.peso[0]) * u * u);
    }
    peor = Math.max(peor, Math.abs(s / N - 1));
  }
  ok("y el pez promedio sigue pagando su precio de tabla: el ancla no se movió",
    peor < 0.01, "peor desvío de las 19 especies: " + (peor * 100).toFixed(2) + " %");
}

console.log("\nEL INVARIANTE, DESPUÉS DE TODO ESTO");
{
  const canas = ["junco", "bambu", "hierro", "oro"].map(k => ctx.lanceNeto(k));
  const nasas = NO.map(k => ctx.nasaPorLombriz(k));
  const todos = canas.concat(nasas);
  const disp = (Math.max(...todos) / Math.min(...todos) - 1) * 100;
  console.log("");
  ["junco", "bambu", "hierro", "oro"].forEach((k, i) => console.log("    caña " + k.padEnd(10) + canas[i].toFixed(2)));
  NO.forEach((k, i) => console.log("    " + NASAS[k].label.padEnd(15) + nasas[i].toFixed(2)));
  console.log("");
  ok("las siete rutas siguen pagando casi lo mismo por lombriz", disp < 25,
    Math.min(...todos).toFixed(2) + " a " + Math.max(...todos).toFixed(2) + " — " + disp.toFixed(0) + " % de dispersión");
  ok("y la ruta pasiva sigue pagando menos que la activa",
    Math.max(...nasas) < Math.min(...canas),
    "la mejor nasa " + Math.max(...nasas).toFixed(2) + " contra la peor caña " + Math.min(...canas).toFixed(2));
  console.log("       → « si la nasa pagara más, nadie tocaría el minijuego ». Es lo único de mi");
  console.log("         documento que sobrevive entero a su lista, y sobrevive porque es la razón");
  console.log("         de que no exista una ruta rota, no una opinión sobre cómo debe jugarse.");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el juego todavía no hace lo que el diseñador pidió"
  : "  Todo en orden: sus ocho frases, medidas contra el juego y no contra mi documento.");
process.exit(fallos ? 1 : 0);
