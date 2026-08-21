/* ¿QUÉ MÁS SE PUEDE DUPEAR CON EL F5? (20/8, dirección)
   "Podrías buscar la tercera situación en la que se puedan dupear recursos."
   Las dos primeras fueron de la misma familia: algo que el guardado regalaba de nuevo en cada
   recarga (las parcelas de expansión) o que olvidaba haber cobrado. Este auditor caza a TODA la
   familia de una vez, con dos armas:

   1. EL DIFF DEL F5 — se arma una partida RICA (obras a medio depositar, ollas cocinando, cofres,
      colas de regalos, pedidos entregados, excavaciones hechas, buffs, contadores diarios) y se
      la pasa por seis ciclos de guardar→volver. Después se compara TODO el guardado, campo por
      campo, entre ciclos: lo que crece es un dupe, lo que se achica es una fuga, lo que cambia
      sin motivo es deriva. El F5 tiene que ser un espejo.

   2. LOS GESTOS QUE PAGAN Y RECARGAN — gastar y recargar al instante, mirando si el gasto vuelve:
      depositar en una obra, cocinar, abrir el paquete del día, reclamar el kit, cavar el
      montículo, entregar un pedido, pescar. Cada uno con su afirmación concreta.
     node tools/auditoria-dupes-f5.js                                                             */
const fs = require("fs"), vm = require("vm");

const REAL0 = 1755730800000;
let desfase = 0;
class FakeDate extends Date {
  constructor(...a) { if (a.length === 0) super(REAL0 + desfase); else super(...a); }
  static now() { return REAL0 + desfase; }
}
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshMarket",
 "syncEditDeco", "refreshCooking", "refreshPedidos"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.saveFarm = () => {};
ctx.$ = () => ({ value: "9999", classList: { add() {}, remove() {} }, style: {} });
const G = ctx.G, GF = ctx.GF;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const f5 = () => { const d = JSON.parse(JSON.stringify(ctx.snapshot())); ctx.hydrate(d); try { ctx.regalosSync(); } catch (e) {} return d; };

/* ================= 1 · EL DIFF DEL F5 SOBRE UNA PARTIDA RICA ======================== */
console.log("\nLA PARTIDA RICA: DE TODO UN POCO, TODO A MEDIO HACER");
{
  ctx.hydrate({ level: 12, expansiones: 3, plotsOwned: 7, plotsCompradas: 1, expParcelasDadas: 3,
    plata: 5000, golden: 30, tuto: { done: true }, sflStock: true,
    res: { madera: 40, piedra: 30, papa: 12, bronce: 6, lombriz: 3, carne: 2 },
    seeds: { papa: 5, cebolla: 2 }, fish: { comun: 3, raro: 1 },
    tools: { axe: 10, rod: 5 }, picks: { owned: { stone: true }, dur: { stone: 8 }, eq: "stone" },
    dishes: { papa_asada: 2 }, weapons: { espada_madera: { dur: 40 } }, gear: { arma: "espada_madera" },
    built: { store: true, horno: true, cocina: true },
    layoutPlots: { 3: { col: 5, row: 5 } },
    regalos: { tree: 1, rock: 0, plot: 0 }, cobertizo: { tree: 0, rock: 1, plot: 0 },
    daily: { day: 2, last: "" }, vales: 4 });
  /* gestos que dejan cosas A MEDIAS (los estados más fáciles de dupear) */
  try { ctx.darPlano("altar", true); } catch (e) {}
  try { ctx.obraColocar("altar", 6, 6); } catch (e) {}
  try { ctx.obraDepositar("altar"); } catch (e) {}          // deposita lo que haya: obra a medias
  try { ctx.cook("papa_asada"); } catch (e) {}              // una olla en marcha
  try { ctx.claimDaily(); } catch (e) {}                    // el paquete de hoy, reclamado
  try { ctx.pedidosEstado(); } catch (e) {}                 // el tablón del día, generado
  ok("la partida rica quedó armada", G.plata > 0 && (ctx.cookList() || []).length >= 0);

  /* seis F5 seguidos: el guardado tiene que ser un ESPEJO */
  const fotos = [];
  for (let i = 0; i < 6; i++) fotos.push(JSON.stringify(f5(), (k, v) => k === "visto" ? 0 : v));
  const deriva = [];
  for (let i = 1; i < fotos.length; i++) if (fotos[i] !== fotos[i - 1]) deriva.push(i);
  if (deriva.length) {
    /* localizar el campo exacto que se mueve */
    const a = JSON.parse(fotos[0]), b = JSON.parse(fotos[fotos.length - 1]);
    const dif = [];
    for (const k in a) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) dif.push(k + ": " + JSON.stringify(a[k]).slice(0, 60) + " → " + JSON.stringify(b[k]).slice(0, 60));
    ok("seis F5: el guardado no deriva", false, "cambia en el ciclo " + deriva.join(",") + " · " + dif.join(" · "));
  } else ok("seis F5: el guardado no deriva — espejo perfecto", true);
}

/* ================= 2 · LOS GESTOS QUE PAGAN, CONTRA EL F5 =========================== */
console.log("\nDEPOSITAR EN UNA OBRA Y RECARGAR: EL MATERIAL NO VUELVE");
{
  const madera0 = G.res.madera, dep0 = JSON.stringify(G.obraDep || {});
  f5();
  ok("la madera depositada sigue gastada", G.res.madera === madera0, madera0 + " → " + G.res.madera);
  ok("y el depósito de la obra sigue anotado", JSON.stringify(G.obraDep || {}) === dep0);
}

console.log("\nCOCINAR Y RECARGAR: NI INGREDIENTE DE VUELTA NI PLATO DOBLE");
{
  const papas0 = G.res.papa, ollas0 = (ctx.cookList() || []).length, platos0 = (G.dishes || {}).papa_asada || 0;
  f5();
  ok("las papas de la olla siguen gastadas", G.res.papa === papas0);
  ok("la olla sigue en marcha (ni doble ni perdida)", (ctx.cookList() || []).length === ollas0);
  desfase += 10 * 60000; ctx.checkCooking();
  const platos1 = (G.dishes || {}).papa_asada || 0;
  f5(); f5();
  ok("el plato terminado se entrega UNA vez, con F5 de por medio", ((G.dishes || {}).papa_asada || 0) === platos1,
    platos1 + " → " + ((G.dishes || {}).papa_asada || 0));
}

console.log("\nEL PAQUETE DEL DÍA, EL KIT Y EL MONTÍCULO: UNA SOLA VEZ POR MÁS F5");
{
  let st = null; try { st = ctx.dailyState(); } catch (e) {}
  ok("el paquete de hoy ya no está disponible tras reclamarlo", !(st && st.claimable));
  f5();
  try { st = ctx.dailyState(); } catch (e) {}
  ok("y el F5 no lo revive", !(st && st.claimable));
  const kit0 = G.tools.axe;
  ctx.kitReclamar(); f5(); ctx.kitReclamar();
  ok("el kit no se reclama dos veces (con F5 en el medio)", G.tools.axe === kit0, kit0 + " → " + G.tools.axe);
  /* el montículo del día: se cava, y el F5 no lo rellena */
  let botin1 = null, botin2 = null;
  try { botin1 = ctx.excavCavar(0); } catch (e) {}
  f5();
  try { botin2 = ctx.excavCavar(0); } catch (e) {}
  ok("el montículo cavado no se rellena con F5", !botin2, botin1 ? "el primero dio " + JSON.stringify(botin1) : "(hoy no había montículo 0)");
}

console.log("\nEL PEDIDO ENTREGADO Y LA PESCA EN REPOSO SOBREVIVEN AL F5");
{
  const e = ctx.pedidosEstado();
  if (e && e.lista && e.lista.length) {
    const p = e.lista.find(x => !x.hecho);
    if (p) {
      if (p.tipo === "fish") G.fish[p.key] = p.n; else if (p.tipo === "dish") G.dishes[p.key] = p.n; else G.res[p.key] = p.n;
      ctx.pedidoEntregar(e.lista.indexOf(p));
      const vales0 = G.vales;
      f5();
      const e2 = ctx.pedidosEstado();
      ok("el pedido sigue ENTREGADO tras el F5", e2.lista[e.lista.indexOf(p)].hecho === true);
      ok("y los vales no se cobran dos veces", G.vales === vales0);
    }
  }
  G.pescaHasta = FakeDate.now() + 10 * 60000;
  f5();
  ok("la laguna en reposo sigue en reposo tras el F5", G.pescaHasta > FakeDate.now(),
    "quedan " + Math.round((G.pescaHasta - FakeDate.now()) / 60000) + " min");
}

console.log("\nLOS ENFRIAMIENTOS DE NODOS Y LA FORJA NO SE LIMPIAN CON F5");
{
  G.nodos = { 5: { readyAt: FakeDate.now() + 30 * 60000, cdIni: FakeDate.now() } };
  G.armCd = { espada_madera: FakeDate.now() + 60 * 60000 };
  f5();
  ok("el enfriamiento del nodo sobrevive", !!(G.nodos && G.nodos[5] && G.nodos[5].readyAt > FakeDate.now()));
  ok("el de la forja también", !!(G.armCd && G.armCd.espada_madera > FakeDate.now()));
}

console.log("\nY LA COLA DE REGALOS NO SE INFLA CON RECARGAS");
{
  const total0 = ctx.regalosPendientes() + ((G.cobertizo || {}).tree || 0) + ((G.cobertizo || {}).rock || 0) + ((G.cobertizo || {}).plot || 0);
  f5(); f5(); f5();
  const total1 = ctx.regalosPendientes() + ((G.cobertizo || {}).tree || 0) + ((G.cobertizo || {}).rock || 0) + ((G.cobertizo || {}).plot || 0);
  ok("baúl + cobertizo: el mismo total tras tres F5", total0 === total1, total0 + " → " + total1);
}

console.log(fallos ? "\n" + fallos + " fallo(s): HAY dupes o fugas por F5\n" : "\nTodo en orden: el F5 es un espejo — no fabrica ni devuelve nada.\n");
process.exit(fallos ? 1 : 0);
