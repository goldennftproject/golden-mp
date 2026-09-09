/* NADA SE PIERDE SIN QUE EL JUGADOR BORRE CACHÉ        (8/9, auditoría general)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Ley de dirección, verbatim:
     « el único motivo por el cual se debe resetear una partida es cuando se actualiza borrando
       caché. Si el jugador no borra caché, entonces no tiene por qué resetearse en la partida. »

   La auditoría general encontró CUATRO caminos que la violaban. Los cuatro son de la misma
   familia —algo que existía deja de existir en silencio— y ninguno tenía un medidor encima:

     1 · mudanzaPescaV4 hacía `G.canas = { junco: 1 }` sin bandera de « ya migrado ». Su único
         return temprano es `if (!G.fish)`, y G.fish siempre existe, así que corría en TODOS los
         hydrate. El jugador compraba la Caña de Oro y la perdía al recargar.
     2 · sanearCont reconstruía cada pila como {kind, k, n} y tiraba el `w`: la durabilidad, el
         +N y las runas del arma, y los kg del pez. Un F5 te devolvía un arma de fábrica.
     3 · tumbaCaer hacía lo mismo al morir. Lo que llevabas PUESTO conservaba su ficha (equipoCaido
         sí la lleva) y lo que llevabas GUARDADO volvía del cuerpo reparado y sin mejoras.
     4 · viajeSoltar ignoraba lo que devuelve viajePoner y después hacía G.cont = null: con la
         bolsa llena, todo lo que no cupo desaparecía sin un toast ni una línea de log.

   Por qué ninguna herramienta los vio: auditoria-dupes-f5 hace `hydrate(snapshot())` sobre el G
   VIVO, así que cualquier campo que el snapshot olvide sigue estando ahí y da el F5 por bueno; y
   test-no-perder-granja es un regex sobre el texto de save.js, no ejecuta nada. Este test SÍ
   ejecuta, y las pruebas 1 y 2 recrean el estado como lo haría una recarga de verdad.
     node tools/test-no-perder-nada.js                                                        */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t)); ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const FICHA = { dur: 60, mas: 2, runas: ["fuego"] };
const conBackpack = () => { G.conts = { backpack: 1 }; G.cont = null; G.tumba = null; ctx.viajeElegir("backpack"); return ctx.contLlevado(); };

console.log("\n1 · LAS CAÑAS NO SE BORRAN AL CARGAR LA PARTIDA");
{
  G.fish = {}; G.canas = { junco: 1, bambu: 1, hierro: 1, oro: 1 };
  ctx.mudanzaPescaV4();
  ok("las cuatro cañas de la v4 siguen ahí", Object.keys(G.canas).length === 4, JSON.stringify(G.canas));
  ctx.mudanzaPescaV4(); ctx.mudanzaPescaV4();
  ok("y tras tres cargas seguidas, también", Object.keys(G.canas).length === 4, JSON.stringify(G.canas));
  /* la mudanza SIGUE haciendo su trabajo cuando de verdad hay algo viejo que mudar: si esto se
     rompe, un guardado de agosto se queda con cañas que la bolsa v4 no sabe dibujar. */
  G.canas = { cana_bambu_v3: 3 }; ctx.mudanzaPescaV4();
  ok("pero una caña del catálogo VIEJO sí se muda al junco",
    JSON.stringify(G.canas) === '{"junco":1}', JSON.stringify(G.canas));
}

console.log("\n2 · EL GUARDADO NO DEGRADA LO QUE LLEVÁS EN EL CONTENEDOR");
{
  conBackpack();
  ctx.contMeter(ctx.contLlevado(), "arm", "espada_bronce", 1, { w: FICHA }, 1);
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  const tras = ctx.contAplanar(ctx.contLlevado()).find(e => e.k === "espada_bronce");
  ok("la espada vuelve con su durabilidad, su +N y sus runas",
    !!(tras && tras.w && tras.w.mas === 2 && tras.w.dur === 60 && tras.w.runas), JSON.stringify(tras));
  /* y la copia es PROFUNDA: un guardado corrupto no puede dejar dos pilas compartiendo la misma
     ficha, porque reparar una repararía la otra. */
  tras.w.dur = 1;
  ok("y su ficha es suya, no una referencia compartida", FICHA.dur === 60, "el original quedó en " + FICHA.dur);
}

console.log("\n3 · AL MORIR, EL ARMA CAE AL CUERPO CON SU FICHA");
{
  conBackpack(); G.weapons = {};
  ctx.contMeter(ctx.contLlevado(), "arm", "espada_bronce", 1, { w: { dur: 60, mas: 2, runas: ["fuego"] } }, 1);
  ctx.tumbaCaer("bosque", 5, 5, () => 0.99);   // 0.99: ninguna pieza del equipo cae, solo el contenedor
  const arma = ((G.tumba && G.tumba.items) || []).find(e => e.k === "espada_bronce");
  ok("la espada llega a la tumba entera, no de fábrica",
    !!(arma && arma.w && arma.w.mas === 2 && arma.w.dur === 60), JSON.stringify(arma));
}

console.log("\n4 · CON LA BOLSA LLENA, EL BOTÍN NO SE TIRA — Y SE DICE");
{
  conBackpack();
  ctx.contMeter(ctx.contLlevado(), "res", "esencia_oscura", 17, null, 1);
  /* la bolsa se llena DE VERDAD, una pila por hueco. Fingirlo con invRows = 0 no funciona:
     invSlots() no lo mira, y el primer intento de este test « aprobó » por eso. */
  G.res = {}; G.seeds = {}; G.dishes = {}; G.fish = {};
  const ORD = g("ITEM_RES_ORDER");
  for (let i = 0; i < ORD.length && ctx.invSlots() - ctx.canonicalStacks().length > 0; i++) {
    if (ORD[i] !== "esencia_oscura") G.res[ORD[i]] = 1;
    ctx.syncSlots();
  }
  ok("(control) no queda un hueco libre en la bolsa",
    ctx.canonicalStacks().length >= ctx.invSlots(), ctx.canonicalStacks().length + " pilas de " + ctx.invSlots());

  avisos.length = 0;
  const antes = ctx.contContar(ctx.contLlevado(), "res", "esencia_oscura");
  const quedaron = ctx.viajeSoltar();
  ok("las 17 esencias siguen siendo del jugador",
    ctx.contLlevado() && ctx.contContar(ctx.contLlevado(), "res", "esencia_oscura") === antes,
    "antes " + antes + " · ahora " + (ctx.contLlevado() ? ctx.contContar(ctx.contLlevado(), "res", "esencia_oscura") : "SIN CONTENEDOR"));
  ok("y viajeSoltar dice cuántas pilas no entraron", typeof quedaron === "number" && quedaron > 0, String(quedaron));

  /* con sitio, se vacía entero y el contenedor vuelve a los guardados: el camino normal no se
     rompió por arreglar el excepcional. */
  G.res = {}; ctx.syncSlots();
  const r2 = ctx.viajeSoltar();
  ok("con sitio se vacía entero y el contenedor vuelve a los guardados", r2 === true && !ctx.contLlevado());
  ok("y las esencias están en la bolsa", Math.floor(G.res.esencia_oscura || 0) === 17, String(G.res.esencia_oscura));
}

console.log("\nY LA VUELTA DE LA ZONA LO CUENTA — un silencio acá es la regla 9 al revés");
{
  conBackpack();
  ctx.contMeter(ctx.contLlevado(), "res", "esencia_oscura", 17, null, 1);
  G.res = {}; G.seeds = {}; G.dishes = {}; G.fish = {};
  const ORD = g("ITEM_RES_ORDER");
  for (let i = 0; i < ORD.length && ctx.invSlots() - ctx.canonicalStacks().length > 0; i++) {
    if (ORD[i] !== "esencia_oscura") G.res[ORD[i]] = 1;
    ctx.syncSlots();
  }
  G.zonaViaje = { t: ctx.nowMs(), res: {}, plata: G.plata || 0 };
  avisos.length = 0;
  ctx.zonaSalir(false);
  ok("al volver con la bolsa llena, el juego avisa de que quedó algo",
    avisos.some(a => /contenedor|Bolsa llena/i.test(a)), avisos.join(" · ").slice(0, 120));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: nada desaparece sin que el jugador borre caché.\n");
process.exit(fallos ? 1 : 0);
