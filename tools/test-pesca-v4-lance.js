/* PESCA v4 · EL LANCE (27/8, tanda 1b)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Toda la pesca cabe en un botón. Mantener o soltar. »

   Este archivo no comprueba que las funciones devuelvan lo que dicen: SIMULA JUGADORES. Cinco
   estrategias distintas pelean miles de peces y se mide qué le pasa a cada una. Es la única
   forma de contestar antes de que nadie juegue las dos preguntas que deciden si el diseño sirve:

       ¿se puede perder?      (si no, no hay tensión y el botón sobra)
       ¿se puede ganar?       (si el legendario es imposible, es contenido decorativo)

   Y sobre todo la tercera, que es la que el documento pone en el centro:

       ¿SE PIERDE POR CODICIA O POR MALA SUERTE?

   Porque de eso depende que el jugador diga « casi lo tenía » y vuelva a tirar, o diga « esto no
   es para mí » y cierre. La v2 perdía por reflejos y por drenaje: dos formas de perder que el
   jugador no controla. Acá el único camino a perder tiene que ser haber apretado de más.

   LAS CINCO ESTRATEGIAS
     · el CODICIOSO   nunca suelta
     · el MIEDOSO     suelta en cuanto ve el aviso
     · el BUENO       suelta durante el tirón, aprieta el resto
     · el TARDÍO      suelta medio segundo tarde — el que « reacciona mal »
     · el AZAROSO     suelta al azar, sin mirar
     node tools/test-pesca-v4-lance.js                                                           */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const DT = 1 / 30;   // treinta cuadros por segundo, como el juego

/* cada estrategia recibe el estado y decide si aprieta */
const JUGADORES = {
  codicioso: () => true,
  miedoso:   (L) => !L.avisando && !L.tirando,
  bueno:     (L) => !L.tirando,
  /* el TARDÍO es el MIEDOSO viendo la pantalla con 0,4 s de retraso — el perfil del jugador
     « malo de dedos ». Mi primera versión de este jugador estaba mal escrita: no reaccionaba
     tarde, apenas soltaba, así que era el codicioso con otro nombre y perdía siempre. Un
     jugador simulado mal escrito no mide al jugador: mide mi descuido. */
  tardio:    (L, mem) => {
    mem.hist = mem.hist || [];
    mem.hist.push({ t: L.t, quiere: !L.avisando && !L.tirando });
    while (mem.hist.length > 1 && L.t - mem.hist[0].t > 0.4) mem.hist.shift();
    return mem.hist[0].quiere;
  },
  /* el DISTRAÍDO va 1,2 s tarde: se come el aviso ENTERO y medio tirón. Es el jugador que
     está mirando otra cosa, no el que tiene malos dedos. */
  distraido: (L, mem) => {
    mem.h2 = mem.h2 || [];
    mem.h2.push({ t: L.t, quiere: !L.avisando && !L.tirando });
    while (mem.h2.length > 1 && L.t - mem.h2[0].t > 1.2) mem.h2.shift();
    return mem.h2[0].quiere;
  },
  azaroso:   () => Math.random() < 0.6,
};
function pelear(banda, jugador, semilla) {
  G.pescaV4 = { racha: 0, sinEpico: 0, primeroDelDia: ctx.hoyClave(), records: {} };
  const L = ctx.lanceArmar("junco", null, { banda, sinPiedad: true, noche: banda === "legendario" });
  const mem = {};
  let t = 0;
  while (!L.listo && !L.roto && t < 90) { ctx.peleaTick(L, DT, JUGADORES[jugador](L, mem)); t += DT; }
  return { gano: !!L.listo, t, L };
}
function tasa(banda, jugador, n) {
  let ganadas = 0, suma = 0;
  for (let i = 0; i < n; i++) { const r = pelear(banda, jugador); if (r.gano) { ganadas++; suma += r.t; } }
  return { pct: ganadas / n, seg: ganadas ? suma / ganadas : 0 };
}

console.log("\n¿QUIÉN GANA Y QUIÉN PIERDE?   (500 peleas por casilla)");
{
  const bandas = ["comun", "raro", "legendario"];
  console.log("\n  jugador        " + bandas.map(b => b.padEnd(16)).join(""));
  const r = {};
  for (const j of Object.keys(JUGADORES)) {
    r[j] = {};
    let fila = "  " + j.padEnd(15);
    for (const b of bandas) { const x = tasa(b, j, 500); r[j][b] = x; fila += (Math.round(x.pct * 100) + " %").padEnd(16); }
    console.log(fila);
  }
  console.log("");
  /* LO QUE SE ESPERA DE CADA UNO, y por qué. Estas expectativas son la TERCERA versión: las dos
     primeras pedían que el jugador que reacciona tarde sufriera, y la simulación me hizo ver que
     eso es exactamente lo que el documento NO quiere. El aviso de medio segundo existe para que
     una reacción tardía se absorba: si castigara igual, volveríamos al test de reflejos de la v2.
     Un test que exige lo contrario de lo que el diseño busca no mide el diseño: lo pelea. */
  ok("el CODICIOSO no captura nada — apretar sin pensar no es una estrategia",
    r.codicioso.comun.pct < 0.05, Math.round(r.codicioso.comun.pct * 100) + " % en común");
  ok("el que suelta en el tirón captura siempre en las bandas bajas",
    r.bueno.comun.pct > 0.9, Math.round(r.bueno.comun.pct * 100) + " %");
  ok("y también saca el legendario: jugando bien no se pierde por azar",
    r.bueno.legendario.pct > 0.9, Math.round(r.bueno.legendario.pct * 100) + " %");
  ok("el MIEDOSO también gana — ceder de más cuesta tiempo, no el pez",
    r.miedoso.comun.pct > 0.9, Math.round(r.miedoso.comun.pct * 100) + " %");
  ok("el que reacciona 0,4 s tarde TAMBIÉN gana: para eso está el aviso",
    r.tardio.comun.pct > 0.9, Math.round(r.tardio.comun.pct * 100) + " %");
  ok("pero el DISTRAÍDO, que se come el aviso entero, pierde de verdad",
    r.distraido.comun.pct < 0.6, Math.round(r.distraido.comun.pct * 100) + " % en común");
  ok("el AZAROSO saca comunes pero NUNCA un legendario",
    r.azaroso.legendario.pct < 0.15,
    "común " + Math.round(r.azaroso.comun.pct * 100) + " % · legendario " + Math.round(r.azaroso.legendario.pct * 100) + " %");
  console.log("       → el contenido alto es lo que separa a quien mira la pantalla de quien no.");
}

console.log("\nSE PIERDE POR CODICIA, NO POR REFLEJOS   (la promesa del documento)");
{
  /* el TARDÍO reacciona medio segundo tarde, que es el perfil del jugador « malo de dedos ».
     Si el sistema lo castigara como al codicioso, seguiría siendo un test de reflejos. */
  const tardio = tasa("comun", "tardio", 500), dist = tasa("comun", "distraido", 500);
  ok("el que reacciona 0,4 s tarde SIGUE capturando",
    tardio.pct > 0.75, Math.round(tardio.pct * 100) + " %");
  ok("y el que va 1,2 s tarde, no — la diferencia es MIRAR, no la velocidad del dedo",
    dist.pct < tardio.pct - 0.3, "distraído " + Math.round(dist.pct * 100) + " % vs tardío " + Math.round(tardio.pct * 100) + " %");
  console.log("       → reaccionar tarde cuesta tensión, no el pez. Perder tiene UN camino:");
  console.log("         apretar de más. El documento lo pide y acá está medido.");
  ok("el aviso nunca baja de " + g("PELEA_AVISO_MIN") + " s en ninguna banda",
    Object.keys(g("PELEA_V4")).every(b => g("PELEA_V4")[b].aviso >= g("PELEA_AVISO_MIN")),
    Object.keys(g("PELEA_V4")).map(b => g("PELEA_V4")[b].aviso).join(" · "));
}

console.log("\nEL PROGRESO NUNCA RETROCEDE   (la línea que define el sistema)");
{
  G.pescaV4 = null;
  const L = ctx.lanceArmar("junco", null, { banda: "raro", sinPiedad: true });
  let maxVisto = 0, bajo = false;
  for (let i = 0; i < 1200; i++) {
    ctx.peleaTick(L, DT, Math.random() < 0.5);
    if (L.progreso < maxVisto - 1e-9) bajo = true;
    maxVisto = Math.max(maxVisto, L.progreso);
    if (L.roto || L.listo) break;
  }
  ok("en mil doscientos ticks al azar, el progreso no bajó ni una vez", !bajo,
    "máximo alcanzado: " + Math.round(maxVisto * 100) + " %");
  /* y ceder tiene que soltar tensión de verdad, o ceder no sería una opción */
  const M = ctx.lanceArmar("junco", null, { banda: "raro", sinPiedad: true });
  for (let i = 0; i < 30; i++) ctx.peleaTick(M, DT, true);
  const conTension = M.tension, prog = M.progreso;
  for (let i = 0; i < 30; i++) ctx.peleaTick(M, DT, false);
  ok("ceder baja la tensión", M.tension < conTension, Math.round(conTension) + " → " + Math.round(M.tension));
  ok("y el progreso se queda EXACTAMENTE donde estaba", Math.abs(M.progreso - prog) < 1e-9,
    Math.round(prog * 100) + " % → " + Math.round(M.progreso * 100) + " %");
}

console.log("\nCUÁNTO DURA UN LANCE   (el documento pide ~20 s de clic a pez en la bolsa)");
{
  const b = tasa("comun", "miedoso", 400), l = tasa("legendario", "miedoso", 400);
  const pique = (g("PIQUE_ESPERA")[0] + g("PIQUE_ESPERA")[1]) / 2;
  ok("un común ronda los 20 segundos contando el pique",
    b.seg + pique > 8 && b.seg + pique < 24, (b.seg + pique).toFixed(1) + " s");
  ok("y un legendario es una pelea larga, como promete", l.seg > b.seg * 1.8,
    l.seg.toFixed(1) + " s vs " + b.seg.toFixed(1) + " s");
  ok("la ventana para clavar es de " + g("PIQUE_VENTANA") + " s — la v2 daba uno",
    g("PIQUE_VENTANA") >= 2, g("PIQUE_VENTANA") + " s");
}

console.log("\nLO QUE MUEVE LA RAREZA: LO QUE PAGÁS Y LO QUE HACÉS, NUNCA EL NIVEL");
{
  G.pescaV4 = { racha: 0, sinEpico: 0, primeroDelDia: ctx.hoyClave(), records: {} };
  const cuenta = (cana, n, op) => {
    const c = {};
    for (let i = 0; i < n; i++) {
      G.pescaV4.racha = 0; G.pescaV4.sinEpico = 0;
      const b = ctx.bandaSortear(cana, Object.assign({ sinPiedad: true, noche: false }, op || {}));
      c[b] = (c[b] || 0) + 1;
    }
    return c;
  };
  const j = cuenta("junco", 40000), o = cuenta("oro", 40000);
  const alto = (c) => ((c.epico || 0) + (c.legendario || 0)) / 40000 * 100;
  console.log("\n    caña de junco → épico+legendario: " + alto(j).toFixed(2) + " %   (la tabla dice 0,90)");
  console.log("    caña de oro   → épico+legendario: " + alto(o).toFixed(2) + " %   (la tabla dice 3,15)");
  console.log("");
  ok("la caña de junco sortea el 0,9 % que promete su tabla", Math.abs(alto(j) - 0.9) < 0.25, alto(j).toFixed(2) + " %");
  ok("y la de oro, el 3,15 %", Math.abs(alto(o) - 3.15) < 0.5, alto(o).toFixed(2) + " %");

  /* la noche duplica la banda legendaria, y lo que sube sale de la común */
  const dia = cuenta("junco", 40000, { noche: false }), noche = cuenta("junco", 40000, { noche: true });
  ok("de noche salen más legendarios que de día",
    (noche.legendario || 0) > (dia.legendario || 0) * 1.4,
    "día " + (dia.legendario || 0) + " · noche " + (noche.legendario || 0) + " de 40.000");

  /* LA RACHA: cinco seguidas suben una banda */
  G.pescaV4 = { racha: g("RACHA_PARA_SUBIR"), sinEpico: 0, primeroDelDia: ctx.hoyClave(), records: {} };
  const conRacha = ctx.bandaSortear("junco", { u: 0.1, sinPiedad: true, noche: false });   // u bajo = común
  ok("con la racha llena, un común se convierte en poco común", conRacha === "poco_comun", conRacha);

  /* LA MEMORIA DE LA LAGUNA: 80 lances sin épico y el siguiente lo es */
  G.pescaV4 = { racha: 0, sinEpico: g("PIEDAD_LANCES"), primeroDelDia: ctx.hoyClave(), records: {} };
  ok("a los " + g("PIEDAD_LANCES") + " lances sin épico, el siguiente lo es seguro",
    ctx.bandaSortear("junco", { u: 0.1, noche: false }) === "epico");

  /* EL PRIMER LANCE DEL DÍA: nunca común */
  G.pescaV4 = { racha: 0, sinEpico: 0, primeroDelDia: 0, records: {} };
  ok("el primer lance del día nunca sale común",
    ctx.bandaSortear("junco", { u: 0.1, noche: false }) !== "comun");
}

console.log("\nEL CIERRE: LA RACHA, LA PIEDAD Y EL RÉCORD");
{
  G.pescaV4 = { racha: 0, sinEpico: 10, primeroDelDia: 0, records: {} };
  const L = ctx.lanceArmar("junco", null, { banda: "comun", uPez: 0, uPeso: 0.9, sinPiedad: true, noche: false });
  L.listo = true;
  const r = ctx.lanceCerrar(L);
  ok("una captura devuelve pez, peso, plata y XP", r && r.id && r.kg > 0 && r.plata > 0 && r.xp > 0,
    r.id + " de " + r.kg + " kg → " + r.plata + " de plata, " + r.xp + " XP");
  ok("y es récord la primera vez", r.record === true);
  ok("la racha sube", ctx.pescaEstado().racha === 1, ctx.pescaEstado().racha + "");

  const L2 = ctx.lanceArmar("junco", null, { banda: "comun", uPez: 0, uPeso: 0.1, sinPiedad: true, noche: false });
  L2.listo = true;
  ok("un pez más chico NO es récord", ctx.lanceCerrar(L2).record === false);

  /* cortar el hilo rompe la racha, y ésa es toda la penalización: duele sin costar plata */
  const L3 = ctx.lanceArmar("junco", null, { banda: "comun", sinPiedad: true, noche: false });
  L3.roto = true;
  const r3 = ctx.lanceCerrar(L3);
  ok("cortar el hilo rompe la racha", ctx.pescaEstado().racha === 0);
  ok("y no cobra ninguna plata de castigo", !r3.plata, JSON.stringify(r3));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el lance todavía no se comporta como el documento pide"
  : "  Todo en orden: se puede perder, se puede ganar, y solo se pierde por codicia.");
process.exit(fallos ? 1 : 0);
