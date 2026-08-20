/* LAS EXPANSIONES, DERIVADAS DE UNA FÓRMULA (18/8, dirección)
   "Ten en cuenta que quizás mañana pongamos más expansiones de las que tenemos hoy."
   Hoy los NIVELES están escritos a mano y los COSTES pegados de una derivación vieja: añadir la
   17ª obliga a rehacer las dos tablas con los dedos. Acá se derivan las dos de N, así que subir
   de 16 a 24 es cambiar un número.
   MODELO NUEVO: la expansión es la ÚNICA fuente de nodos, y trae 3 celdas productivas
   (1 parcela + 1 árbol + 1 roca). Los relojes NO se tocan.
     node tools/derivar-expansiones.js [N]                                                        */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={FARM_NIVEL_MAX,FARM_XP_LVLS,PRICE,MAT_DEF,CD,ORE_DEF,CROP_DEF};",ctx);
const X=ctx.X, ANCLA=20;
const N = +(process.argv[2] || 16);

/* ---------- 1. EN QUÉ NIVEL SE ABRE CADA UNA ----------
   La primera en el 3 (cuando el jugador ya vendió su primera cosecha y entiende el ciclo) y la
   última en el tope. En medio, una curva suave: al principio seguidas para que se note el ritmo,
   al final espaciadas porque cada una cuesta más. */
const NIV_MIN = 3, NIV_MAX = X.FARM_NIVEL_MAX;
const nivelDe = i => Math.round(NIV_MIN + (NIV_MAX - NIV_MIN) * Math.pow(i / (N - 1), 1.25));
const niveles = [];
for (let i = 0; i < N; i++) {
  let n = nivelDe(i);
  if (i && n <= niveles[i - 1]) n = niveles[i - 1] + 1;      // nunca dos en el mismo nivel
  niveles.push(Math.min(n, NIV_MAX));
}

/* ---------- 2. CUÁNTO CUESTA ----------
   No se eligen unidades: se elige cuántas HORAS de la granja que el jugador YA TIENE debe costar
   cada una, y se traduce a material con la producción real de ese momento. Así el coste sube solo
   cuando la granja crece, y ninguna expansión es un muro. */
const HORAS_1 = 2, HORAS_N = 30;                              // de 2 h la primera a 30 h la última
const horasDe = i => HORAS_1 + (HORAS_N - HORAS_1) * Math.pow(i / (N - 1), 0.9);

/* Qué materiales pide cada tramo: madera y piedra siempre; los minerales entran por tercios. */
const mineralDe = i => {
  const t = i / (N - 1);
  if (t < 0.20) return [];
  if (t < 0.40) return ["bronce"];
  if (t < 0.60) return ["bronce", "hierro"];
  if (t < 0.75) return ["hierro", "oro"];
  if (t < 0.90) return ["oro", "diamante"];
  return ["diamante", "netherita"];
};
const valMat = k => { if (X.PRICE[k] != null) return X.PRICE[k];
  const m = (X.MAT_DEF || {})[k]; if (!m) return 0;
  return Object.keys(m.cost || {}).reduce((a, j) => a + valMat(j) * m.cost[j], 0); };

const costos = [];
let celdas = 9;                                               // 3 parcelas + 3 árboles + 3 rocas
LOG("LAS " + N + " EXPANSIONES, DERIVADAS\n");
LOG("  nº  nivel  celdas  horas  coste (material)                             plata");
let totalPlata = 0, totalHoras = 0;
for (let i = 0; i < N; i++) {
  const h = horasDe(i);
  const plata = h * celdas * ANCLA;                           // lo que la granja produce en esas horas
  const mins = mineralDe(i);
  // el reparto: la mitad del valor en madera+piedra, la otra mitad entre los minerales del tramo
  const partes = [["madera", mins.length ? 0.30 : 0.55], ["piedra", mins.length ? 0.30 : 0.45]]
    .concat(mins.map(m => [m, 0.40 / mins.length]));
  const c = {};
  partes.forEach(([k, f]) => { const u = Math.max(1, Math.round(plata * f / valMat(k))); if (u) c[k] = u; });
  const real = Object.keys(c).reduce((a, k) => a + valMat(k) * c[k], 0);
  costos.push(c); totalPlata += real; totalHoras += h;
  LOG("  " + String(i + 1).padStart(2) + String(niveles[i]).padStart(7) + String(celdas + 3).padStart(8) +
      String(Math.round(h)).padStart(7) + "  " +
      Object.keys(c).map(k => c[k] + " " + k).join(" + ").padEnd(44) +
      String(Math.round(real).toLocaleString("es")).padStart(9));
  celdas += 3;
}
LOG("\n  techo de celdas: " + celdas + "   ·   total: " + Math.round(totalPlata).toLocaleString("es") +
    " de plata  =  " + Math.round(totalHoras) + " h de granja");
LOG("  ingresos al final: " + celdas * ANCLA + " plata/h  (arranque: 180)");

/* ---------- 3. COMPROBACIONES ---------- */
LOG("\nCOMPROBACIONES");
const ok = (t, c, d) => LOG("  " + (c ? "ok  " : "FALLA") + " " + t + (d ? "   " + d : ""));
ok("los niveles solo suben y no se repiten", niveles.every((v, i) => i === 0 || v > niveles[i - 1]));
ok("la primera cae en el nivel " + niveles[0] + " y la última en el " + niveles[N - 1],
   niveles[0] >= 2 && niveles[N - 1] <= X.FARM_NIVEL_MAX);
ok("el coste en plata siempre sube", costos.every((c, i) => i === 0 ||
   Object.keys(c).reduce((a, k) => a + valMat(k) * c[k], 0) >
   Object.keys(costos[i-1]).reduce((a, k) => a + valMat(k) * costos[i-1][k], 0)));
ok("ninguna cuesta más de 40 h de la granja de ese momento", horasDe(N - 1) <= 40,
   Math.round(horasDe(N - 1)) + " h la última");
ok("todas caben en la escalera de niveles del Granero", niveles[N-1] <= X.FARM_NIVEL_MAX);
LOG("\n  para probar otro número:  node tools/derivar-expansiones.js 24");
