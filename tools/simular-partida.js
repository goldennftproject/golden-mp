/* LA PARTIDA ENTERA, DEL 1 AL 50 — tiempo activo, tiempo muerto, plata y XP (19/8, dirección)
   "Teniendo en cuenta los tiempos en los que el jugador juega y los tiempos en los que pasa muerto,
    también revisa ganancia, experiencia, plata, todo. Que el balance esté anclado a la fórmula."

   Cómo está modelado, para que se pueda discutir el modelo y no solo el resultado:
     · El jugador entra N VECES AL DÍA (por defecto 3). Entre sesión y sesión no toca nada: eso es
       el tiempo muerto de verdad, no el que pasa mirando crecer una papa.
     · En cada sesión hace lo que haría cualquiera: cosecha lo que esté listo, replanta, tala y
       pica lo que haya reverdecido, recoge el establo y vende.
     · Al plantar ELIGE EL CULTIVO QUE LLEGA JUSTO para la próxima sesión — que es lo que hace un
       jugador real y lo que el ancla permite, porque todos los cultivos rinden lo mismo por hora.
     · Compra la expansión en cuanto le alcanza, porque es la única fuente de nodos.
   Cada gesto cuesta lo mismo que en medir-tutorial: 0,8 s el clic, 2 s cambiar de nodo, 4 s abrir
   un panel. Las acciones del juego duran 0 s desde que se quitó la animación.

     node tools/simular-partida.js [sesiones-por-dia]                                              */
const fs = require("fs"), vm = require("vm");
const LOG = console.log;
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={CD,CROP_DEF,CROP_ORDER,ORE_DEF,ORE_ORDER,PRICE,MAT_DEF,FARM_XP_LVLS,FARM_NIVEL_MAX," +
  "FARM_EXPANSION,EXPANSION_COSTO,XP_ACCION,XP_ANIMAL,XP_PEZ,ANIMAL_DEF,ANIMAL_ORDER,skillNeed,skillInfo," +
  "TOOL_CRAFT,GOLPES_TALAR,GOLPES_MINAR};", ctx);
const X = ctx.X, ANCLA = 20;
const SES = +(process.argv[2] || 3);                 // sesiones por día
const S_CLIC = 0.8, S_VIAJE = 2, S_PANEL = 4;        // lo que cuesta EN MANO cada gesto

const val = k => { if (X.PRICE[k] != null) return X.PRICE[k]; const m = (X.MAT_DEF || {})[k];
  if (!m) return 0; return Object.keys(m.cost || {}).reduce((a, j) => a + val(j) * m.cost[j], 0); };
const fmtH = s => s < 3600 ? Math.round(s / 60) + " min" : s < 3600 * 48 ? (s / 3600).toFixed(1) + " h" : (s / 86400).toFixed(1) + " días";
const pct = (a, b) => (a / b * 100).toFixed(1) + "%";

/* EL CULTIVO QUE ELIGE: el más largo que quepa en el hueco hasta la próxima sesión. Si ninguno cabe
   —el hueco es más corto que la papa— planta la papa igual y la recoge en la siguiente. */
function cultivoPara(huecoS, nivelCultivo) {
  const abiertos = X.CROP_ORDER.filter(k => X.CROP_DEF[k].lvl <= nivelCultivo);
  let mejor = abiertos[0];
  abiertos.forEach(k => { if (X.CROP_DEF[k].grow <= huecoS && X.CROP_DEF[k].grow > X.CROP_DEF[mejor].grow) mejor = k; });
  return mejor;
}
expansionCostosSeguro();
function expansionCostosSeguro() { try { ctx.expansionCostos(); } catch (e) {} }

/* UNA SESIÓN DURA ALGO. Modelar la sesión como un instante castigaba injustamente a los cultivos
   cortos: la papa tarda 3 minutos, así que quien se queda diez minutos la cosecha tres veces. El
   jugador entra, hace lo que puede mientras está, y al irse deja plantado lo que llegue para la
   próxima vez. */
var MIN_SESION = 12 * 60;

function simular(sesionesDia, tope, minSesion, cargasTope, loteOn, doma) {
  /* LA DOMA (idea de dirección, 19/8): un bicho domado ATIENDE la granja mientras no estás. Ojo con
     lo que hace exactamente, porque de eso depende que el ancla aguante: NO produce nada nuevo —
     RECOGE lo que el nodo ya produjo y que hoy se tira. Su techo es, por construcción, el ancla:
     ni con cien bichos podés sacar más de lo que tus celdas dan.
     Se le paga con una parte de lo que junta (doma.corte), que es el sumidero, y no aparece hasta
     cierto nivel de granja (doma.desde), porque al principio rompería el aprendizaje del bucle. */
  const dur = minSesion == null ? MIN_SESION : minSesion;
  /* CARGAS ACUMULADAS: el "¿y si...?" que se prueba abajo. Con cargasTope=1 el juego es el de hoy —
     el árbol solo guarda UNA tala por más que tardes en volver. Con un tope mayor, el nodo va
     juntando cargas mientras no estás, hasta ese máximo. El reloj NO se toca: sigue tardando 30
     minutos en dar cada una. */
  const TOPE = cargasTope || 1;
  /* RECOGER EN LOTE: si el nodo guarda 16 cargas y hay que darle 3 clics a cada una, volver del
     trabajo es un castigo de 300 clics. En lote, un clic se lleva todo lo que el nodo juntó — que
     es como ya funciona "alimentar a todos" en el establo. */
  const lote = !!loteOn;
  const hueco = 86400 / sesionesDia;
  let t = 0, activo = 0, plata = 0, cosechas = 0;
  /* El ancla no es un número fijo: son 20 plata/hora POR CELDA, y las celdas van creciendo. Compararse
     contra el promedio final infla el techo y hace parecer peor de lo que es. Se acumula hora a hora
     con las celdas que el jugador tenía en ese momento. */
  let ancla = 0;
  let xpFarm = 0, xpTala = 0, xpMin = 0;
  let nivel = 1, exps = 0;
  let parcelas = 3, arboles = 3, rocas = 3;
  const res = { madera: 0, piedra: 0 };
  let libreArb = 0, libreRoc = 0;
  let plantadoEn = -1, cultivo = null;
  const hitos = [];
  const nivelDe = xp => { let n = 1; while (X.FARM_XP_LVLS[n + 1] != null && xp >= X.FARM_XP_LVLS[n + 1]) n++; return n; };
  const nivelCultivo = () => X.skillInfo(xpFarm, "farming").lvl;
  const cosechar = ahora => {
    if (plantadoEn < 0 || ahora < plantadoEn + X.CROP_DEF[cultivo].grow) return 0;
    const c = X.CROP_DEF[cultivo];
    plata += parcelas * (c.price * (c.yield || 1) - c.seedCost);
    xpFarm += parcelas * c.xp; cosechas++; plantadoEn = -1;
    return parcelas;
  };
  const plantar = (ahora, ventana) => {
    cultivo = cultivoPara(ventana, nivelCultivo());
    plantadoEn = ahora; return parcelas;
  };

  for (let s = 0; s < sesionesDia * 400 && nivel < tope; s++) {
    const t0 = s * hueco; t = t0 + dur;
    let clics = 0, clicsLote = 0;
    clics += cosechar(t0);                                   // lo que dejó plantado la vez pasada
    // los nodos: una carga por sesión (su reloj es más largo que la sesión) o las que quepan
    const domando = doma && nivel >= doma.desde;
    const topeReal = domando ? Math.floor(hueco / X.CD.tree) + 1 : TOPE;   // el bicho recoge cada vez que hay
    const cargas = (libre, cd) => Math.max(0, Math.min(topeReal, Math.floor((t0 + dur - libre) / cd) + (t0 + dur >= libre ? 0 : -1) + 1));
    const corte = domando ? (1 - doma.corte) : 1;
    { const c = cargas(libreArb, X.CD.tree);
      /* LA XP NO LA JUNTA EL BICHO. La regla que ya rige todo el juego es que la experiencia mide
         LA PRÁCTICA, así que lo que recoge el domado da material pero no oficio: nadie sube de
         nivel durmiendo. Si esto no fuera así, la doma subiría Tala y Minería sola y las puertas
         de material se abrirían sin que el jugador toque un árbol. */
      if (c > 0) { res.madera += arboles * c * corte; xpTala += arboles * (domando ? 1 : c) * X.XP_ACCION;
        clics += domando ? arboles * X.GOLPES_TALAR : arboles * c * X.GOLPES_TALAR; clicsLote += arboles * X.GOLPES_TALAR; libreArb = t0 + dur + X.CD.tree; } }
    { const c = cargas(libreRoc, X.CD.rock);
      if (c > 0) { res.piedra += rocas * c * corte; xpMin += rocas * (domando ? 1 : c) * X.XP_ACCION;
        clics += domando ? rocas * X.GOLPES_MINAR : rocas * c * X.GOLPES_MINAR; clicsLote += rocas * X.GOLPES_MINAR; libreRoc = t0 + dur + X.CD.rock; } }
    /* MIENTRAS ESTÁ: si el cultivo que tiene abierto crece en menos de lo que le queda de sesión,
       lo planta y lo cosecha ahí mismo, tantas veces como entre. Esto es lo que salva al jugador
       de nivel bajo, que solo tiene papas de 3 minutos. */
    let dentro = t0;
    for (;;) {
      const c = X.CROP_DEF[cultivoPara(t0 + dur - dentro, nivelCultivo())];
      if (!c || dentro + c.grow > t0 + dur) break;
      clics += plantar(dentro, t0 + dur - dentro);
      dentro += c.grow;
      clics += cosechar(dentro);
    }
    if (plantadoEn < 0) clics += plantar(t0 + dur, hueco);   // al irse, deja lo que llegue para la próxima

    const antes = nivel; nivel = nivelDe(xpFarm);
    if (nivel > antes) hitos.push([t, "granja nivel " + nivel]);
    while (exps < X.FARM_EXPANSION.length && X.FARM_EXPANSION[exps] <= nivel) {
      const c = X.EXPANSION_COSTO[exps] || {};
      const faltaMat = Object.keys(c).some(k => (k === "madera" || k === "piedra") && (res[k] || 0) < c[k]);
      const enPlata = Object.keys(c).reduce((a, k) => a + (k === "madera" || k === "piedra" ? 0 : c[k] * val(k)), 0);
      if (faltaMat || plata < enPlata) break;
      Object.keys(c).forEach(k => { if (k === "madera" || k === "piedra") res[k] -= c[k]; });
      plata -= enPlata;
      exps++; parcelas++; arboles++; rocas++;
      hitos.push([t, "expansión " + exps + " (" + (9 + 3 * exps) + " celdas)"]);
    }
    ancla += (9 + 3 * exps) * ANCLA * (hueco / 3600);
    activo += (lote ? clicsLote + (clics - clicsLote > 0 ? 0 : 0) : clics) * S_CLIC + Math.min(clics, 20) * S_VIAJE + 2 * S_PANEL;
  }
  const enCofre = res.madera * val("madera") + res.piedra * val("piedra");
  return { t, activo, plata, enCofre, ancla, nivel, exps, parcelas, arboles, rocas, cosechas,
    xpFarm, xpTala, xpMin, hitos, celdas: 9 + 3 * exps };
}

LOG("\n════ LA PARTIDA ENTERA · " + SES + " sesiones al día ════\n");
const r = simular(SES, 21);
const dias = r.t / 86400;
LOG("  hasta granja nivel " + r.nivel + " (" + r.exps + " expansiones, " + r.celdas + " celdas)");
LOG("  tiempo real .............. " + fmtH(r.t) + "  (" + dias.toFixed(1) + " días)");
LOG("  CON LAS MANOS EN EL JUEGO  " + fmtH(r.activo) + "   " + pct(r.activo, r.t));
LOG("  tiempo muerto ............ " + fmtH(r.t - r.activo) + "   " + pct(r.t - r.activo, r.t));
LOG("  o sea, " + (r.activo / (dias || 1) / 60).toFixed(0) + " min de juego al día repartidos en " + SES + " sesiones");

LOG("\n──── LA GANANCIA CONTRA EL ANCLA ────\n");
{
  const horas = r.t / 3600;
  const real = (r.plata + r.enCofre) / horas;
  LOG("  produjo " + Math.round(r.plata + r.enCofre).toLocaleString("es") + " de valor en " + fmtH(r.t));
  LOG("  el ancla, contando las celdas que tenía en cada momento, daba " + Math.round(r.ancla).toLocaleString("es"));
  LOG("  o sea que cobró el " + pct(r.plata + r.enCofre, r.ancla) + " de lo que su granja podía dar");
  LOG("  (" + real.toFixed(0) + " plata/hora reales contra " + (r.ancla / horas).toFixed(0) + " del ancla)");
  LOG("");
  LOG("  el desglose de por qué:");
  const hCult = r.t / 3600, cultH = r.plata / hCult;
  LOG("    cultivos ....... " + (r.plata / hCult).toFixed(0) + " plata/h con " + r.parcelas + " parcelas · el ancla pide " + r.parcelas * ANCLA);
  LOG("    árboles+rocas .. " + (r.enCofre / hCult).toFixed(0) + " plata/h con " + (r.arboles + r.rocas) + " nodos · el ancla pide " + (r.arboles + r.rocas) * ANCLA);
}

LOG("\n──── POR QUÉ LOS NODOS SE QUEDAN CORTOS ────\n");
{
  /* Acá está el hallazgo de fondo. El ancla se calculó suponiendo que cada nodo se recoge EN CUANTO
     está listo. Un cultivo sí se adapta —plantás el que llega justo para tu próxima sesión— pero un
     árbol tiene un reloj FIJO de 30 minutos: si entrás 3 veces al día, 45 de sus 48 cargas diarias
     se pierden. No es un número mal puesto: es que el reloj fijo y la sesión larga no encajan. */
  const cargasDia = k => 86400 / X.CD[k];
  ["tree", "rock"].forEach(k => {
    const posibles = cargasDia(k), reales = Math.min(posibles, SES);
    LOG("    " + (k === "tree" ? "árbol" : "roca") + " (" + (X.CD[k] / 60) + " min): " +
      posibles.toFixed(0) + " cargas al día si estás encima · " + reales + " si entrás " + SES + " veces  → " +
      pct(reales, posibles) + " de su ancla");
  });
  LOG("");
  LOG("    el cultivo NO tiene ese problema: elegís el que dura lo que dura tu ausencia,");
  LOG("    y como todos rinden 20/hora, no perdés nada por entrar poco.");
}

LOG("\n──── LA XP, MEDIDA EN LO MISMO ────\n");
{
  const h = r.t / 3600;
  const l = sk => X.skillInfo(sk === "farming" ? r.xpFarm : sk === "tala" ? r.xpTala : r.xpMin, sk).lvl;
  LOG("    Cultivo  nivel " + String(l("farming")).padStart(2) + "   " + (r.xpFarm / h).toFixed(0).padStart(5) + " XP/h");
  LOG("    Tala     nivel " + String(l("tala")).padStart(2) + "   " + (r.xpTala / h).toFixed(0).padStart(5) + " XP/h");
  LOG("    Minería  nivel " + String(l("mining")).padStart(2) + "   " + (r.xpMin / h).toFixed(0).padStart(5) + " XP/h");
  LOG("    granja   nivel " + String(r.nivel).padStart(2));
  LOG("");
  LOG("    (los tres oficios tienen que quedar cerca: si uno se dispara, su escalera se abre sola");
  LOG("     mientras las otras dos se quedan atrás)");
}

LOG("\n──── ¿Y SI LOS NODOS ACUMULARAN CARGAS? ────\n");
{
  /* La propuesta: el reloj se queda EXACTAMENTE como está (30 y 40 minutos, que es lo que pidió
     dirección), pero el nodo guarda lo que produjo mientras no estabas, hasta un tope. Así el
     tiempo muerto deja de tirarse a la basura y el ancla se cumple sin obligar a nadie a vivir
     dentro del juego. El tope es el que decide cuánto se puede "ahorrar": 16 cargas son 8 horas
     de árbol, o sea justo el hueco de quien entra tres veces al día. */
  LOG("  tope de cargas   plata/hora   % del ancla   días al nivel 20   min de juego/día");
  [1, 4, 8, 16, 24].forEach(tp => {
    const q = simular(SES, 21, null, tp);
    const ql = simular(SES, 21, null, tp, true);
    const real = (q.plata + q.enCofre) / (q.t / 3600);
    LOG("  " + (tp === 1 ? "1 (hoy)" : String(tp)).padStart(14) + String(real.toFixed(0)).padStart(13) +
      pct(q.plata + q.enCofre, q.ancla).padStart(14) + String((q.t / 86400).toFixed(1)).padStart(19) +
      (String((q.activo / (q.t / 86400) / 60).toFixed(0)) + " / " + (ql.activo / (ql.t / 86400) / 60).toFixed(0)).padStart(18));
  });
  LOG("");
  LOG("  (la última columna son los minutos de juego al día: clic a clic / recogiendo en lote)");
}

LOG("\n──── ¿Y SI UN BICHO DOMADO ATENDIERA LOS NODOS? ────\n");
{
  /* El bicho no fabrica nada: recoge lo que el nodo ya dio. Por eso su techo es el ancla y no hay
     forma de romperla por arriba. Lo que se prueba acá es DESDE QUÉ NIVEL conviene que aparezca —
     si llega muy pronto, el jugador nunca aprende el bucle a mano — y QUÉ PARTE se queda él. */
  LOG("  aparece en   se queda   plata/hora   % del ancla   días al nivel 20   min/día");
  [[1, 0.3], [5, 0.3], [10, 0.3], [10, 0.5], [15, 0.3], [99, 0]].forEach(([desde, corte]) => {
    const q = simular(SES, 21, null, 1, false, desde > 50 ? null : { desde, corte });
    const real = (q.plata + q.enCofre) / (q.t / 3600);
    LOG("  " + (desde > 50 ? "nunca (hoy)" : "granja " + desde).padStart(12) +
      (desde > 50 ? "—" : Math.round(corte * 100) + "%").padStart(11) +
      String(real.toFixed(0)).padStart(13) + pct(q.plata + q.enCofre, q.ancla).padStart(14) +
      String((q.t / 86400).toFixed(1)).padStart(19) +
      String((q.activo / (q.t / 86400) / 60).toFixed(0)).padStart(10));
  });
}

LOG("\n──── EL MISMO JUEGO CON OTROS HÁBITOS ────\n");
LOG("  sesiones/día   días al nivel 20   min de juego/día   plata/hora   % del ancla");
[1, 2, 3, 6, 12, 48].forEach(n => {
  const q = simular(n, 21);
  const real = (q.plata + q.enCofre) / (q.t / 3600);
  LOG("  " + String(n).padStart(11) + String((q.t / 86400).toFixed(1)).padStart(19) +
    String((q.activo / (q.t / 86400) / 60).toFixed(0)).padStart(19) +
    String(real.toFixed(0)).padStart(13) + pct(q.plata + q.enCofre, q.ancla).padStart(13));
});

LOG("\n──── LOS HITOS DE LA PARTIDA (" + SES + " sesiones/día) ────\n");
r.hitos.slice(0, 26).forEach(h => LOG("    " + fmtH(h[0]).padStart(10) + "   " + h[1]));
LOG("");
