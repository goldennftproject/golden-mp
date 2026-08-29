/* PESCA v4 · EL TRUCO DE CADA ESPECIE   (27/8, lo último del documento)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   En las tablas 1 a 5 la última columna de cada especie no es sabor: es una MECÁNICA.

     « Se infla: la tensión sube el doble mientras está inflado. »
     « Apaga la luz: durante un segundo no se ve la barra. »
     « Corta el hilo si aguantás más de 2 s seguidos. »
     « No tira: se hunde. La tensión sube sola y hay que recoger igual. »

   Las leí como notas de ambientación y durante tres tandas las diecinueve especies pelearon
   exactamente igual. Es la diferencia entre un minijuego con diecinueve peces y un minijuego con
   un pez y diecinueve nombres.

   ESTE ARCHIVO DEFIENDE DOS REGLAS QUE VALEN MÁS QUE LOS TRUCOS

   1) NINGÚN TRUCO PUEDE QUITAR PROGRESO. El capítulo 3 lo pone en mayúsculas —« EL PROGRESO
      NUNCA RETROCEDE »— y es lo que separa esta versión de la v2, donde un mal tramo borraba el
      bueno. Un truco puede subir la tensión, esconder la barra, cambiar el ritmo o cortar el
      hilo de golpe; lo que no puede, ninguno, es borrar lo ganado.

   2) TODOS AVISAN. Un truco que no se ve en pantalla no es dificultad, es una trampa. El jugador
      tiene que poder decir « ah, se infló », no « no sé qué pasó ».

   Las dos se comprueban abajo sobre las diecinueve especies, no sobre las que me acuerde.
     node tools/test-pesca-v4-trucos.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);
const PEZ = g("PEZ_DEF"), ORDEN = g("PEZ_ORDER"), TRUCO = g("TRUCO_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const DT = 0.05;

/* juega una pulseada entera con una estrategia dada y devuelve lo que pasó. La estrategia recibe
   el lance y decide si aprieta: así se pueden probar el codicioso, el prudente y el que sigue el
   aviso, que son los tres jugadores que este sistema tiene que distinguir. */
function pelear(id, estrategia, maxSeg) {
  const L = ctx.lanceArmar("junco", null, { banda: PEZ[id].banda, noche: true, sinPiedad: true });
  L.id = id; ctx.trucoArmar(L);
  const visto = { avisos: {}, oculta: 0, tensionMax: 0, progresoBajo: false };
  let t = 0, prev = 0;
  while (!L.roto && !L.listo && t < (maxSeg || 60)) {
    ctx.peleaTick(L, DT, estrategia(L, t));
    if (L.progreso < prev - 1e-9) visto.progresoBajo = true;
    prev = L.progreso;
    if (L.trAviso) visto.avisos[L.trAviso] = (visto.avisos[L.trAviso] || 0) + 1;
    if (L.oculta) visto.oculta++;
    visto.tensionMax = Math.max(visto.tensionMax, L.tension);
    t += DT;
  }
  return Object.assign(visto, { L, t, gano: !!L.listo, roto: !!L.roto });
}
const CODICIOSO = () => true;
const RITMO = (L, t) => Math.floor(t / 0.9) % 2 === 0;      // aprieta y suelta cada 0,9 s
const ATENTO = (L) => !(L.tirando || L.avisando);

console.log("\nCADA ESPECIE TIENE SU TRUCO, Y LO DICE");
{
  console.log("");
  const conTruco = ORDEN.filter(k => ctx.trucoDe(k));
  for (const k of conTruco) {
    console.log("    " + PEZ[k].label.padEnd(15) + PEZ[k].banda.padEnd(12) + ctx.trucoTxt(k));
  }
  console.log("");
  ok("hay al menos diez especies con truco propio", conTruco.length >= 10, conTruco.length + " de " + ORDEN.length);
  ok("cada truco tiene su texto para la pantalla",
    conTruco.every(k => ctx.trucoTxt(k) && ctx.trucoTxt(k).length > 12));
  ok("los tres legendarios tienen truco: son los que hay que aprender",
    ctx.pecesDeBanda("legendario").every(k => !!ctx.trucoDe(k)),
    ctx.pecesDeBanda("legendario").map(k => PEZ[k].label).join(", "));
  ok("y ningún truco apunta a una especie que no existe",
    Object.keys(TRUCO).every(k => !!PEZ[k]),
    Object.keys(TRUCO).filter(k => !PEZ[k]).join(", "));
}

console.log("\nLA REGLA DURA: NINGÚN TRUCO QUITA PROGRESO");
{
  /* las diecinueve especies, con tres jugadores distintos cada una. Si un truco cualquiera
     restara progreso en cualquier momento, esto lo caza. */
  const malas = [];
  for (const k of ORDEN) {
    for (const est of [CODICIOSO, RITMO, ATENTO]) {
      const r = pelear(k, est, 40);
      if (r.progresoBajo) malas.push(PEZ[k].label);
    }
  }
  ok("en 19 especies × 3 jugadores, el progreso nunca baja", !malas.length,
    [...new Set(malas)].join(", "));
  console.log("       → « EL PROGRESO NUNCA RETROCEDE. Se puede estancar, nunca vaciarse. »  Es");
  console.log("         la línea que separa esta versión de la v2, donde un mal tramo borraba el");
  console.log("         bueno, y ningún truco nuevo puede tener permiso para saltársela.");
}

console.log("\nEL PEZ GLOBO SE INFLA   (la tensión sube el doble, y se avisa)");
{
  /* con el jugador de RITMO y no con el codicioso: el codicioso revienta en dos segundos contra
     cualquier pez, así que la pelea no dura lo bastante para que el globo se infle, y las dos
     medidas —con truco y sin truco— dan 100 de tensión.
     Un test que compara dos cosas y las dos topan no compara nada: da verde y no distingue. */
  /* SE MIDE LA PROPORCIÓN Y PROMEDIADA, no los cuadros de UNA pelea.
     La primera versión pedía « más de 15 cuadros inflado » y fallaba 3 de cada 40 veces: la
     duración de la pulseada se sortea, así que una pelea corta de 117 cuadros daba 11 y otra de
     304 daba 88. El test no medía el truco — medía cuánto había durado esa pelea.
     Un test intermitente es peor que no tenerlo: enseña a volver a correrlo hasta que salga
     verde, y el día que falle de verdad nadie le va a creer. */
  const muestras = Array.from({ length: 30 }, () => pelear("pez_globo", RITMO, 40));
  const prop = muestras.reduce((s, x) => s + (x.avisos["inflado"] || 0) / (x.t / DT), 0) / muestras.length;
  const r = muestras[0];
  ok("pasa entre un 15 y un 55 % de la pelea inflado", prop > 0.15 && prop < 0.55,
    Math.round(prop * 100) + " % del lance, promediado sobre 30 peleas");
  ok("y mientras está inflado la tensión sube al doble",
    ctx.trucoDe("pez_globo").tensionX === 2);
  /* la comparación que SÍ distingue: cuántas veces gana el mismo jugador contra el mismo pez,
     con su truco y sin él. Cien peleas de cada, que es lo que hace falta para que el azar de los
     tirones no decida el resultado. */
  const gana = (n) => { let g = 0; for (let i = 0; i < n; i++) if (pelear("pez_globo", RITMO, 40).gano) g++; return g; };
  const con = gana(100);
  const orig = TRUCO.pez_globo; delete TRUCO.pez_globo;
  const sin = gana(100);
  TRUCO.pez_globo = orig;
  console.log("");
  console.log("    el mismo jugador contra el mismo pez, 100 peleas de cada:");
  console.log("      con su truco .... " + con + " capturas");
  console.log("      sin su truco .... " + sin + " capturas");
  console.log("");
  ok("con su truco se captura MENOS: el globo es de verdad más duro", con < sin,
    con + " contra " + sin + " de 100");
}

console.log("\nEL PEZ LINTERNA APAGA LA LUZ   (y por debajo el lance sigue corriendo)");
{
  const r = pelear("pez_linterna", RITMO, 40);
  ok("apaga la barra alguna vez", r.oculta > 0, r.oculta + " cuadros a oscuras");
  ok("pero no la mayor parte del tiempo: es un susto, no una venda",
    r.oculta / (r.t / DT) < 0.45, Math.round(r.oculta / (r.t / DT) * 100) + " % del lance");
  /* lo que importa: el progreso avanza mientras está apagada */
  const L = ctx.lanceArmar("junco", null, { banda: "epico", sinPiedad: true });
  L.id = "pez_linterna"; ctx.trucoArmar(L);
  let avanzoAOscuras = false, antes = 0;
  for (let t = 0; t < 30 && !L.listo && !L.roto; t += DT) {
    antes = L.progreso;
    ctx.peleaTick(L, DT, true);
    if (L.oculta && L.progreso > antes) avanzoAOscuras = true;
  }
  ok("se OCULTA, no se congela: a oscuras el lance sigue avanzando", avanzoAOscuras);
  console.log("       → congelar sería un respiro; ocultar es incomodidad. El documento pide");
  console.log("         « durante un segundo no se ve la barra », no « no pasa nada ».");
}

console.log("\nEL PEZ ESPADA CORTA SI AGUANTÁS MÁS DE DOS SEGUNDOS");
{
  const codicioso = pelear("pez_espada", CODICIOSO, 40);
  ok("al que mantiene apretado le corta el hilo", codicioso.roto);
  ok("y le avisa antes de cortar", !!codicioso.avisos["¡soltá!"]);
  /* el reloj se REINICIA al soltar: no pide reflejos, pide ritmo */
  const conRitmo = pelear("pez_espada", (L, t) => Math.floor(t / 1.2) % 2 === 0, 60);
  ok("pero al que suelta cada segundo y pico no le corta por el aguante",
    !conRitmo.roto || conRitmo.L.tension >= g("PELEA_TENSION_MAX"),
    conRitmo.gano ? "lo captura" : "se le corta por tensión, no por aguante");
  console.log("       → el reloj se reinicia al soltar, así que el pez espada no premia los");
  console.log("         reflejos: premia no ser codicioso. Es el pez que enseña que « mantener");
  console.log("         apretado » no es una estrategia.");
}

console.log("\nEL PEZ GOTA NO TIRA: SE HUNDE");
{
  const r = pelear("pez_gota", ATENTO, 40);
  ok("no tira nunca", !r.L.tirando, "no hay tirones que soltar");
  ok("y la tensión sube igual, aunque no aprietes", r.tensionMax > 5,
    "hasta " + Math.round(r.tensionMax) + " sin apretar en el tirón");
  ok("se avisa de que se hunde", !!r.avisos["se hunde"]);
  console.log("       → al revés que todos los demás: acá el que espera pierde. Es el único pez");
  console.log("         contra el que la paciencia es el error.");
}

console.log("\nEL PEZ DRAGÓN TIENE TRES FASES");
{
  const r = pelear("pez_dragon", RITMO, 90);
  const fases = Object.keys(r.avisos).filter(a => a.indexOf("fase") === 0);
  ok("anuncia sus cambios de fase", fases.length >= 1, fases.join(" · "));
  ok("son tres y están definidas", ctx.trucoDe("pez_dragon").fases.length === 3);
  /* la tercera tiene que apretar más que la primera: si no, no hay progresión dentro del pez */
  const f = ctx.trucoDe("pez_dragon").fases;
  ok("y la última aprieta más que la primera", f[2].tensionX > f[0].tensionX,
    f[0].tensionX + " → " + f[2].tensionX);
  ok("solo aparece de noche", PEZ.pez_dragon.noche === true);
}

console.log("\nEL PEZ SAPO Y SU SALVA DE TRES");
{
  const r = pelear("pez_sapo", ATENTO, 60);
  const salvas = Object.keys(r.avisos).filter(a => a.indexOf("salva") === 0);
  ok("avisa en qué tirón de la salva va", salvas.length >= 1, salvas.sort().join(" · "));
  ok("la salva es de tres", ctx.trucoDe("pez_sapo").salva === 3);
}

console.log("\nLA LUBINA PESA EL DOBLE DE NOCHE   (el único truco que vive en el sorteo)");
{
  const N = 20000;
  let dia = 0, noche = 0;
  for (let i = 0; i < N; i++) {
    dia += ctx.pesoDelLance("lubina", { noche: false, cebo: "lombriz" });
    noche += ctx.pesoDelLance("lubina", { noche: true, cebo: "lombriz" });
  }
  dia /= N; noche /= N;
  console.log("");
  console.log("    de día ..... " + dia.toFixed(2) + " kg de media");
  console.log("    de noche ... " + noche.toFixed(2) + " kg de media   (×" + (noche / dia).toFixed(2) + ")");
  console.log("");
  ok("de noche pesa claramente más", noche > dia * 1.4, "×" + (noche / dia).toFixed(2));
  ok("pero NUNCA por encima del máximo de su especie",
    noche <= PEZ.lubina.peso[1], "tope " + PEZ.lubina.peso[1] + " kg");
  console.log("       → topar en el máximo no es un detalle: un pez fuera de su rango rompería");
  console.log("         el récord, el torneo y el álbum a la vez, porque los tres miden peso");
  console.log("         RELATIVO al rango de la especie.");
  ok("y de día pesa lo de siempre", Math.abs(dia - ctx.pesoMedia("lubina")) < 0.15,
    dia.toFixed(2) + " vs " + ctx.pesoMedia("lubina").toFixed(2));
}

console.log("\nLO MEJOR QUE SALIÓ DE ESTO: CADA LEGENDARIO CASTIGA UN HUECO DISTINTO");
{
  /* Ésta es la comprobación que más vale de todo el archivo, y no la busqué: apareció al medir.
     Se prueban tres jugadores incompletos contra los tres legendarios, y el resultado es una
     matriz donde NINGUNA fila gana entera salvo la última.

     No es que los peces sean « más difíciles »: es que cada uno mide otra cosa. El pez espada
     castiga al que aguanta —su reloj de 2 s no mira la tensión—, el pez gota castiga al que
     espera al tirón —no tira nunca, así que quien solo reacciona a tirones no suelta jamás—, y
     el dragón cambia de ritmo para que ninguna cadencia fija sirva las tres fases.

     Un minijuego donde una sola estrategia gana todo no tiene profundidad, tiene una solución.
     Éste tiene tres cerraduras y hacen falta dos llaves. */
  const N = 200;
  const jugadores = {
    "sigue los tirones":       (L) => !(L.tirando || L.avisando),
    "mira la tensión":         (L) => L.tension < 70,
    "las dos cosas":           (L) => !(L.tirando || L.avisando) && L.tension < 70,
  };
  const legendarios = ctx.pecesDeBanda("legendario");
  const tasa = (id, est) => {
    let ganadas = 0;
    for (let i = 0; i < N; i++) if (pelear(id, est, 90).gano) ganadas++;
    return ganadas / N * 100;
  };
  console.log("");
  console.log("    jugador                 " + legendarios.map(k => PEZ[k].label.padStart(13)).join(""));
  const tabla = {};
  for (const nm in jugadores) {
    tabla[nm] = legendarios.map(k => tasa(k, jugadores[nm]));
    console.log("    " + nm.padEnd(24) + tabla[nm].map(v => (v.toFixed(0) + " %").padStart(13)).join(""));
  }
  console.log("");
  ok("el que solo sigue los tirones NO puede con los tres",
    Math.min(...tabla["sigue los tirones"]) < 50,
    "se le escapa el que no tira nunca");
  ok("el que solo mira la tensión, tampoco",
    Math.min(...tabla["mira la tensión"]) < 50,
    "se le escapa el que corta por aguantar");
  ok("y el que hace las dos cosas gana a los tres",
    Math.min(...tabla["las dos cosas"]) > 80,
    tabla["las dos cosas"].map(v => v.toFixed(0) + " %").join(" · "));
  console.log("       → tres cerraduras y dos llaves. Un minijuego donde una sola estrategia gana");
  console.log("         todo no tiene profundidad: tiene una solución.");
}

console.log("\nY EL ANCLA NO SE MOVIÓ   (los trucos son dificultad, no economía)");
{
  /* la comprobación que cierra el capítulo: un truco cambia CÓMO se pelea, nunca cuánto paga.
     Si alguno tocara el precio o la banda, el invariante lo notaría. */
  const netos = ["junco", "bambu", "hierro", "oro"].map(k => ctx.lanceNeto(k));
  const nasas = g("NASA_ORDER").map(k => ctx.nasaPorLombriz(k));
  const todos = netos.concat(nasas);
  const disp = (Math.max(...todos) / Math.min(...todos) - 1) * 100;
  ok("las siete rutas siguen entre 8,5 y 12 por lombriz",
    Math.min(...todos) > 8.5 && Math.max(...todos) < 12,
    Math.min(...todos).toFixed(2) + " a " + Math.max(...todos).toFixed(2));
  ok("y ninguna se despega: menos de un 25 % entre la mejor y la peor", disp < 25, disp.toFixed(0) + " %");
  console.log("       → salvo la lubina, que pesa más de noche y por eso vale más de noche: es");
  console.log("         el único truco con efecto en plata, y está en el documento a propósito");
  console.log("         como premio por trasnochar.");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — los peces todavía no pelean cada uno a su manera"
  : "  Todo en orden: diecinueve peces y diecinueve maneras de perderlos.");
process.exit(fallos ? 1 : 0);
