/* LA COCINA COCINA DE A UNO (26/8, diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « vamos a corregir que no se cocina en simultáneo todos a la vez… se cocina solo el primero,
     al terminar el 2do, y sigue la secuencia ».

   Es un cambio de DISEÑO, no un arreglo: el 3/8 el mismo diseñador había pedido lo contrario
   («los platos se pueden cocinar VARIOS a la vez»). Cambiar de idea es legítimo; lo que no se
   puede es que el juego quede a medio camino entre las dos ideas.

   CÓMO ESTÁ RESUELTO, porque de eso depende lo que hay que vigilar.
   No hay un estado « cocinando / esperando » ni un turno que haya que hacer avanzar. Cada plato
   guarda su HORA DE FIN, y al encolarlo esa hora se calcula desde la del último de la fila. La
   fila entera es, entonces, tres relojes puestos en hora — y un reloj no se olvida de correr.

   Eso importa por una razón concreta: EL JUGADOR CIERRA EL JUEGO. Con una máquina de turnos
   habría que despertarla al volver y hacerla avanzar paso a paso (y si el paso se ejecuta una
   vez por segundo, volver de tres horas serían diez mil pasos o un plato solo). Con horas de
   fin, volver de tres horas es exactamente lo mismo que estar mirando: checkCooking recoge todo
   lo vencido, en orden, y ya está. La mitad de este archivo prueba justamente eso.
     node tools/test-cocina-fila.js                                                              */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const REC = g("RECIPE_DEF");
const min = (ms) => Math.round(ms / 6000) / 10;

/* EL RELOJ SE CONGELA. Primero lo dejé corriendo (hora real + un desfase) y una comprobación
   salió en rojo por dos milisegundos: entre encolar y medir, el reloj de verdad había avanzado.
   Un test que depende de lo que tarde la máquina en ejecutar tres líneas no mide el juego, mide
   la máquina — y falla al azar, que es la peor clase de fallo porque enseña a ignorarlo. */
const T0 = 1787800000000;
let desfase = 0;
ctx.nowMs = () => T0 + desfase;
vm.runInContext("nowMs = window.nowMs;", ctx);
const adelantar = (ms) => { desfase += ms; };

function cocinera() {
  desfase = 0;
  G.cooking = []; G.dishes = {}; G.skills = { cooking: 9000 };
  G.res = { papa: 99, carne: 99, madera: 99, piedra: 99 };
  G.fish = {}; G.built = { cocina: true }; G.tuto = { done: true }; G.edif2 = {};
}

console.log("\nTRES PLATOS NO ARRANCAN A LA VEZ: EL SEGUNDO ESPERA AL PRIMERO");
{
  cocinera();
  ctx.cook("papa_asada"); ctx.cook("papa_asada"); ctx.cook("papa_asada");
  const q = ctx.cookList().slice().sort((a, b) => a.endAt - b.endAt);
  ok("las tres entran en la fila", q.length === 3, q.length + "");
  const dur = q[0].total;
  ok("la primera está al fuego ahora mismo", !ctx.cookEsperando(q[0]));
  ok("la segunda espera su turno", ctx.cookEsperando(q[1]));
  ok("y la tercera también", ctx.cookEsperando(q[2]));
  ok("la segunda termina justo cuando la primera + su receta",
    q[1].endAt === q[0].endAt + dur, min(q[1].endAt - q[0].endAt) + " min de diferencia");
  ok("y la tercera, otra receta después", q[2].endAt === q[1].endAt + dur);
  ok("o sea que tres platos de " + min(dur) + " min tardan " + min(dur * 3) + ", no " + min(dur),
    q[2].endAt - ctx.nowMs() === dur * 3, min(q[2].endAt - ctx.nowMs()) + " min");
}

console.log("\nY SE ENTREGAN DE A UNO, EN ORDEN");
{
  cocinera();
  ctx.cook("papa_asada"); ctx.cook("estofado"); ctx.cook("papa_asada");
  const dur1 = ctx.cookList()[0].total;
  ctx.checkCooking();
  ok("recién encolados no hay ningún plato hecho", !Object.keys(G.dishes).length, JSON.stringify(G.dishes));

  /* 27/8 (diseñador) — EL PLATO YA NO CAE SOLO EN LA BOLSA: espera en la olla hasta que lo
     recogen. « cuando se crafteen deben reclamarse en el edificio, no ir directo a la bag ».
     El reloj sigue corriendo con el juego cerrado; lo que cambió es quién lo levanta. */
  adelantar(dur1 + 1000); ctx.checkCooking();
  ok("pasada la primera receta hay UN plato listo, esperando", ctx.pendienteDe("cocina") === 1,
    ctx.pendienteDe("cocina") + " listo(s)");
  ok("y todavía NO está en la bolsa", !(G.dishes.papa_asada > 0), JSON.stringify(G.dishes));
  ok("recogerlo lo pone en la bolsa", ctx.cocinaRecoger() === 1 && (G.dishes.papa_asada || 0) === 1);
  ok("y quedan dos en la fila", ctx.cookList().length === 2, ctx.cookList().length + "");
  ok("la que ahora está al fuego es el Estofado", !ctx.cookEsperando(ctx.cookList()[0]));
  ok("y el tercero sigue esperando", ctx.cookEsperando(ctx.cookList()[1]));

  adelantar(REC.estofado.cookS * 1000 + 1000); ctx.checkCooking(); ctx.cocinaRecoger();
  ok("después llega el Estofado", (G.dishes.estofado || 0) === 1, JSON.stringify(G.dishes));
  adelantar(dur1 + 1000); ctx.checkCooking(); ctx.cocinaRecoger();
  ok("y al final la segunda Papa Asada", (G.dishes.papa_asada || 0) === 2, JSON.stringify(G.dishes));
  ok("la fila queda vacía", ctx.cookList().length === 0);
}

console.log("\nLA FILA CORRE CON EL JUEGO CERRADO   (esto es lo que sostiene todo el diseño)");
{
  cocinera();
  ctx.cook("papa_asada"); ctx.cook("papa_asada"); ctx.cook("papa_asada");
  const finTodo = ctx.cookList().reduce((t, c) => Math.max(t, c.endAt), 0);
  /* el jugador cierra y vuelve TRES HORAS después: una sola pasada tiene que resolver la fila
     entera. Si hiciera falta un tick por turno, acá saldrían uno o dos platos y no tres. */
  adelantar(3 * 3600e3);
  ctx.checkCooking();
  ok("al volver de tres horas los TRES están listos", ctx.pendienteDe("cocina") === 3,
    ctx.pendienteDe("cocina") + " listos");
  ok("y una sola recogida se los lleva todos", ctx.cocinaRecoger() === 3 && (G.dishes.papa_asada || 0) === 3,
    JSON.stringify(G.dishes));
  ok("y la fila quedó vacía", ctx.cookList().length === 0);
  ok("sin haber tenido que despertar la fila paso a paso", true, "una sola pasada de checkCooking");

  /* y el caso intermedio: vuelve cuando iban dos */
  cocinera();
  ctx.cook("papa_asada"); ctx.cook("papa_asada"); ctx.cook("papa_asada");
  adelantar(ctx.cookList()[1].endAt - ctx.nowMs() + 1000);
  ctx.checkCooking();
  ok("volviendo a mitad de fila quedan listos exactamente los cumplidos",
    ctx.pendienteDe("cocina") === 2, ctx.pendienteDe("cocina") + " listos de 3");
  ctx.cocinaRecoger();
  ok("y salen los dos", (G.dishes.papa_asada || 0) === 2, JSON.stringify(G.dishes));
  ok("y el que faltaba sigue al fuego, no se pierde", ctx.cookList().length === 1);
  ok("y ese último ya arrancó (no quedó esperando a un plato que ya salió)",
    !ctx.cookEsperando(ctx.cookList()[0]));
}

console.log("\nEL TOPE DE LA FILA SIGUE SIENDO EL DE LAS OLLAS");
{
  cocinera();
  for (let i = 0; i < 5; i++) ctx.cook("papa_asada");
  ok("no se pueden encolar más de " + ctx.cookSlots(), ctx.cookList().length === ctx.cookSlots(),
    ctx.cookList().length + "");
  /* y los ingredientes de las que NO entraron no se cobran */
  ok("y a las que no entraron no se les cobró la papa", G.res.papa === 99 - ctx.cookSlots(),
    G.res.papa + " papas (se gastaron " + (99 - G.res.papa) + ")");
}

console.log("\nUNA SOLA OLLA SE COMPORTA COMO SIEMPRE   (no romper lo simple)");
{
  cocinera();
  ctx.cook("estofado");
  const c = ctx.cookList()[0];
  ok("arranca ya, sin esperar a nadie", !ctx.cookEsperando(c));
  ok("y tarda exactamente su receta", c.endAt - ctx.nowMs() === REC.estofado.cookS * 1000,
    min(c.endAt - ctx.nowMs()) + " min");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la Cocina todavía no respeta la fila"
  : "  Todo en orden: se cocina de a uno, en orden, y la fila corre aunque el juego esté cerrado.");
process.exit(fallos ? 1 : 0);
