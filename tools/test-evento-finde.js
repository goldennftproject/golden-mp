/* LA MISIÓN DE EVENTO DEL TABLÓN (22/8, dirección)
   « Están las misiones diarias, semanales, mensuales y las de EVENTO. Saldrían en el tablón
   y se verían diferentes. » Contratos:
     · solo existe de VIERNES A DOMINGO; el lunes desaparece, entregada o no;
     · es determinística dentro del finde (el F5 no la re-sortea) y cambia al finde siguiente;
     · el tema rota por semana y NUNCA pide algo que el jugador no produce (regla Hay Day);
     · paga con la vara de toda la escalera: plata 1,0× el valor, la ganancia en vales;
     · pide 2 días de producción (entre el semanal, 1, y el mensual, 3);
     · entregarla descuenta el stock exacto, paga una vez, y sobrevive al F5;
     · va ARRIBA de todo en el tablón y con su propio escalón ("evento").
     node tools/test-evento-finde.js                                                          */
const fs = require("fs"), vm = require("vm");

/* viernes 21/8/2026 12:00 local como "hoy" */
const VIERNES = new Date(2026, 7, 21, 12, 0, 0).getTime();
let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(VIERNES + desfase); } static now() { return VIERNES + desfase; } }

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshBarn", "recalcFarmLevel", "refreshPedidos", "sfx", "tutoEvent"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const DIA = 86400000;

G.tuto = { done: true };

console.log("\nLA VENTANA: VIERNES A DOMINGO, Y EL LUNES NO EXISTE");
{
  ok("el viernes la ventana está abierta", ctx.findeVentana());
  const filaV = ctx.pedidosTodos().find(x => x.escalon === "evento");
  ok("y el tablón cuelga la misión de evento", !!filaV, filaV && filaV.p.de);
  ok("con la llave \"E\" y ARRIBA de todo", filaV && filaV.i === "E" && ctx.pedidosTodos()[0].escalon === "evento");
  desfase += 2 * DIA;   // domingo
  ok("el domingo sigue colgada", !!ctx.pedidosTodos().find(x => x.escalon === "evento"));
  desfase += DIA;       // lunes
  ok("el lunes ya no está", !ctx.pedidosTodos().find(x => x.escalon === "evento"));
  ok("y entregarla el lunes contesta que no (no en silencio)", ctx.pedidoEntregar("E") === false);
  desfase = 0;
}

console.log("\nDETERMINÍSTICA EN EL FINDE, NUEVA AL FINDE SIGUIENTE");
{
  const a = JSON.stringify(ctx.pedidosEstado().pedEvento);
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));   // F5
  const b = JSON.stringify(ctx.pedidosEstado().pedEvento);
  ok("el F5 no la re-sortea", a === b);
  desfase += 7 * DIA;   // viernes siguiente
  const c = ctx.pedidosEstado().pedEvento;
  ok("al finde siguiente hay evento otra vez (tema de esa semana)", !!c, c && c.de);
  desfase = 0; ctx.pedidosEstado();   // volver a hoy
}

console.log("\nEL TEMA NUNCA PIDE LO QUE NO PRODUCÍS, Y PAGA CON LA VARA DE LA ESCALERA");
{
  const p = ctx.pedidosEstado().pedEvento;
  const pool = ctx.pedPool();
  ok("lo pedido está en el pool de HOY (regla Hay Day)", pool.some(x => x.tipo === p.tipo && x.key === p.key), p.key);
  ok("se presenta como evento (🎪 + tema)", /^🎪 /.test(p.de) && p.tipoEncargo === "evento", p.de);
  const base = pool.find(x => x.tipo === p.tipo && x.key === p.key);
  const unidad = base.val / base.n;
  ok("la plata es 1,0× el valor (±1 de redondeo)", Math.abs(p.plata - unidad * p.n) <= 1, p.plata + " por " + p.n);
  ok("pide DOS días de producción (mult 20 sobre la base diaria, con piso del vale)",
    p.n >= base.n * 20 || p.plata >= vm.runInContext("VALE_EN_PLATA", ctx), p.n + " (base " + base.n + ")");
  ok("los vales llevan la poda de los grandes (0,6)", p.vales >= 3, p.vales + " vales");
}

console.log("\nENTREGARLA: EXACTA, UNA VEZ, Y EL TRATO SOBREVIVE AL F5");
{
  const p = ctx.pedidosEstado().pedEvento;
  /* darle el stock justo */
  if (p.tipo === "res") G.res[p.key] = p.n + 2;
  else if (p.tipo === "fish") (G.fish = G.fish || {})[p.key] = p.n + 2;
  else (G.dishes = G.dishes || {})[p.key] = p.n + 2;
  const stock0 = ctx.pedidoStock(p), plata0 = G.plata, vales0 = G.vales || 0;
  ok("con stock, se entrega", ctx.pedidoEntregar("E") === true);
  ok("descuenta el stock exacto", ctx.pedidoStock(p) === stock0 - p.n);
  ok("paga la plata y los vales anunciados", G.plata === plata0 + p.plata && (G.vales || 0) === vales0 + p.vales);
  ok("no se entrega dos veces", ctx.pedidoEntregar("E") === false);
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  ok("tras el F5 sigue entregada", ctx.pedidosEstado().pedEvento.hecho === true);
}

console.log("\nY EL EVENTO NO PISA A LOS DEMÁS ESCALONES");
{
  const t = ctx.pedidosTodos();
  ok("siguen los 3 diarios + semanal + mensual + evento", t.length === 6,
    t.map(x => x.escalon).join(" · "));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el finde tiene su feria.\n");
process.exit(fallos ? 1 : 0);
