/* EL DÍA CICLA EN UTC (22/8, dirección)
   « El día tiene que ciclar en horario UTC — en Argentina, a las nueve de la noche. Es cuando
   se resetea el ciclo de 24 horas en los juegos web3. » Contratos:
     · dayStamp usa la fecha UTC: a las 23:50 UTC es un día y a las 00:10 UTC ya es OTRO,
       sin importar la zona horaria local;
     · TODO lo diario cuelga de dayStamp (paquete, goblin, tablón, pase) — se comprueba que
       al cruzar la medianoche UTC el goblin vuelve y el tablón renueva;
     · la ventana del evento del finde también mira el día UTC (getUTCDay);
     · el ciclo VISUAL día/noche queda aparte, con la hora LOCAL (el cielo es del jugador);
     · y la noche tiñe de azul (multiply) además de oscurecer — no un telón negro.
     node tools/test-dia-utc.js                                                                */
const fs = require("fs"), vm = require("vm");

/* 23:50 UTC del viernes 21/8/2026 */
const CASI_MEDIANOCHE = Date.UTC(2026, 7, 21, 23, 50, 0); let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(CASI_MEDIANOCHE + desfase); } static now() { return CASI_MEDIANOCHE + desfase; } }
FakeDate.UTC = Date.UTC;

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshBarn", "recalcFarmLevel", "syncSlots"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, SRC_STATE = fs.readFileSync("public/game/state.js", "utf8"), SRC_FARM = fs.readFileSync("public/game/farm.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA MEDIANOCHE ES LA UTC — 21:00 EN ARGENTINA");
{
  ok("a las 23:50 UTC el sello dice 21/8", ctx.dayStamp(0) === "2026-08-21", ctx.dayStamp(0));
  desfase = 20 * 60000;   // 00:10 UTC
  ok("20 minutos después ya es 22/8", ctx.dayStamp(0) === "2026-08-22", ctx.dayStamp(0));
  ok("y dayStamp no usa la fecha local en su cuerpo",
    /getUTCFullYear/.test(SRC_STATE.split("function dayStamp")[1].slice(0, 300)));
}

console.log("\nTODO LO DIARIO CRUZA JUNTO LA MEDIANOCHE UTC");
{
  desfase = 0; G.tuto = { done: true };
  /* el goblin hace su trato a las 23:50… */
  G.res.madera = 30; G.res.piedra = 5; G.goblin = { date: "" };
  ctx.goblinAceptar();
  ok("goblin: trato hecho antes de medianoche", !ctx.goblinEstado().disponible);
  const tablonHoy = ctx.pedidosEstado().dia;
  desfase = 20 * 60000;   // …y a las 00:10 UTC todo renueva
  ok("goblin: a las 00:10 UTC ya está de vuelta", ctx.goblinEstado().disponible);
  ok("tablón: la lista diaria renueva con el mismo reloj", ctx.pedidosEstado().dia !== tablonHoy,
    tablonHoy + " → " + ctx.pedidosEstado().dia);
  ok("evento del finde: la ventana mira getUTCDay",
    /getUTCDay/.test(SRC_STATE.split("function findeVentana")[1].slice(0, 120)));
  ok("(y el viernes 21/8 a las 23:50 UTC la ventana estaba abierta)", (() => { desfase = 0; const v = ctx.findeVentana(); desfase = 20 * 60000; return v; })());
}

console.log("\nEL CIELO ES DEL JUGADOR, EL CALENDARIO DEL JUEGO");
{
  const cielo = SRC_FARM.slice(SRC_FARM.indexOf("--- CIELO"), SRC_FARM.indexOf("--- CIELO") + 3000);
  /* 25/8 — LA CUENTA SE MUDÓ, LA REGLA NO. El `getHours()` ya no está en farm.js porque la
     definición de « es de noche » se centralizó en config.js (cieloDelMomento): había DOS ideas
     de noche —la del cielo y la que Pesca v3 necesitaba— y la segunda nunca existió, así que el
     calamar picaba a las tres de la tarde. Lo que este medidor tiene que exigir sigue siendo lo
     mismo: que el cielo sea del JUGADOR, o sea hora local y no UTC. Solo cambia dónde mirar. */
  const SRC_CONFIG = fs.readFileSync("public/game/config.js", "utf8");
  ok("el cielo se pinta desde la fuente única, no con su propia cuenta", /cieloDelMomento\(\)/.test(cielo));
  ok("y esa fuente sigue usando la hora LOCAL (el cielo es del jugador)",
    /getHours\(\)/.test(SRC_CONFIG.slice(SRC_CONFIG.indexOf("function cieloDelMomento"))),
    "config.js · cieloDelMomento");
  ok("la laguna lee la MISMA noche que el cielo — no puede haber dos",
    /const noche = esDeNoche\(\)/.test(SRC_FARM));
  ok("la noche tiene su capa de TINTE azul en multiply", /cieloTinte/.test(cielo) && /MULTIPLY/.test(SRC_FARM));
  ok("y la capa oscura bajó de fuerza para compensar (×0,78)", /alpha \* 0\.78/.test(cielo));
  const m = cielo.match(/0x9db2e6/);
  ok("el tinte es un azul de luna (0x9db2e6), no negro", !!m);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: a las 21:00 de Argentina, el mundo entero cambia de día.\n");
process.exit(fallos ? 1 : 0);
