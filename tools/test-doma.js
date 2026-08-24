/* LA DOMA v1 (22/8, dirección — GDD §13.1: el tiempo offline)
   Un monstruo domado atiende los nodos mientras el jugador está desconectado. Contratos:
     · se abre en granja 10; antes, ningún bicho te sigue (ni con suerte);
     · un bicho a la vez, solo especies con sprite de granja, chance 8%;
     · come 1 carne = 24 h de trabajo (panza tope 3 días); con hambre NO trabaja;
     · SOLO recoge cargas maduradas EN TU AUSENCIA (ventana visto→ahora∩comida) — jamás
       reemplaza al jugador presente;
     · se queda el 30% de comisión, determinístico, y el jugador cobra primero;
     · deja SIEMPRE una carga en el nodo (la del que vuelve) y dren a como nodoGastarCarga:
       el reloj sigue corriendo, el F5 no duplica;
     · minerales afuera (sin cargas, 21/8); bolsa llena = para de juntar sin perder nada;
     · el turno corre en hydrate: cargar la partida ES volver a casa.
     node tools/test-doma.js                                                                   */
const fs = require("fs"), vm = require("vm");

const T0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + desfase); } static now() { return T0 + desfase; } }

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = t => avisos.push(String(t));
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "refreshBarn", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, H = 3600000;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA PUERTA: GRANJA 10, EL PLATO FAVORITO DE CADA UNO, Y UN BICHO A LA VEZ");
{
  G.level = 9; G.doma = null; G.dishes = { bocado_domador: 5, galletita_cereza: 5, papilla_remolacha: 5 };
  ok("a granja 9 ni el 0,001 doma", ctx.domaIntentar("orco", () => 0.001) === false && G.dishes.bocado_domador === 5);
  /* 24/8 — EL "NO" TIENE QUE HABLAR. El diseñador reportó: « intento tomar una rata con la
     Galletita y no sale nada, ni si falla ni si acierta ». Cortaba en silencio por nivel. */
  ok("y con el plato en la mano, el aviso DICE que falta granja " + 10,
    avisos.some(a => /granja 10/i.test(a)), avisos.join(" · "));
  ok("sin gastar el plato (no hubo intento, no se cobra)", G.dishes.bocado_domador === 5);
  avisos.length = 0;
  G.level = 10;
  ok("el dragón no se doma (y no gasta plato)", ctx.domaIntentar("dragon", () => 0.001) === false && G.dishes.bocado_domador === 5);
  ok("al orco NO se lo doma con la galletita de la rata: pide SU Costillar",
    (G.dishes.bocado_domador = 0, ctx.domaIntentar("orco", () => 0.001) === false && G.dishes.galletita_cereza === 5));
  G.dishes.bocado_domador = 5;
  ok("con Costillar y mala suerte (0,5 ≥ 25%): se lo come y se va", ctx.domaIntentar("orco", () => 0.5) === false && G.dishes.bocado_domador === 4);
  ok("con Costillar y suerte: el orco te sigue a casa", ctx.domaIntentar("orco", () => 0.001) === true && G.doma.bicho === "orco");
  ok("y ese intento también costó su plato", G.dishes.bocado_domador === 3);
  ok("y no hay segundo bicho (ni gasta más platos)", ctx.domaIntentar("troll", () => 0.001) === false && G.dishes.bocado_domador === 3);
  const R = vm.runInContext("RECIPE_DEF", ctx);
  ok("la escalera de platos sigue al valor del ayudante: galletita 4 · papilla 7 · costillar 10",
    R.galletita_cereza.lvl === 4 && R.papilla_remolacha.lvl === 7 && R.bocado_domador.lvl === 10);
  /* v4: el COSTO sigue al valor — la fórmula que delató el bollito de 1.740 queda de guardia */
  const C = vm.runInContext("CROP_DEF", ctx), PR = vm.runInContext("PRICE", ctx);
  const costo = (res) => Object.keys(res).reduce((a, k) => a + ((C[k] ? C[k].price : PR[k]) || 0) * res[k], 0);
  const cg = costo(R.galletita_cereza.res), cp = costo(R.papilla_remolacha.res), cc = costo(R.bocado_domador.res);
  ok("y el costo también: galletita < papilla < costillar", cg < cp && cp < cc, cg + " < " + cp + " < " + cc);
  ok("la galletita es calderilla (≤ 30) y el costillar pesa (≥ 300)", cg <= 30 && cc >= 300);
  ok("y cada descripción nombra a su bicho ('le encanta')",
    /orco/i.test(R.bocado_domador.desc) && /RATA/i.test(R.galletita_cereza.desc) && /LARVA/i.test(R.papilla_remolacha.desc));
}

console.log("\nY CON UN BICHO YA EN CASA, TAMBIÉN LO DICE");
{
  avisos.length = 0;
  const antes = G.dishes.bocado_domador;
  ok("no doma un segundo", ctx.domaIntentar("troll", () => 0.001) === false);
  ok("y avisa que ya tenés uno", avisos.some(a => /ya ten[eé]s/i.test(a)), avisos.join(" · "));
  ok("sin gastar el plato", G.dishes.bocado_domador === antes);
}

console.log("\nLA PANZA: 1 CARNE = 24 H, TOPE 3 DÍAS, SIN CARNE NO HAY TRATO");
{
  G.res.carne = 0;
  ok("sin carne no come", !!ctx.domaAlimentar().error);
  G.res.carne = 5;
  ok("come 1 carne", ctx.domaAlimentar().ok === true && Math.floor(G.res.carne) === 4);
  ok("y trabaja 24 h", Math.abs(G.doma.comidaHasta - (FakeDate.now() + 24 * H)) < 1000);
  ctx.domaAlimentar(); ctx.domaAlimentar();
  ok("la panza guarda hasta 3 días", !!ctx.domaAlimentar().error, "carne restante " + G.res.carne);
}

console.log("\nEL TURNO: SOLO LO MADURADO EN TU AUSENCIA, COMISIÓN 30%, EL NODO SIGUE VIVO");
{
  /* un árbol con reloj de 2 h que quedó VACÍO al irte (readyAt = ahora+2h)… y te vas 10 h:
     maduran 4 relojes (t+2,4,6,8h) pero el tope de cargas es 4 → recoge cargas-1 = 3 */
  const ahora0 = FakeDate.now();
  G.doma = { bicho: "orco", desde: ahora0, comidaHasta: ahora0 + 72 * H, cont: 0, ultimo: null };
  G.nodos = { "tree:10,10": { readyAt: ahora0 + 2 * H, cdIni: ahora0, halfAt: 0 } };
  G.res.madera = 0;
  desfase = 10 * H;
  const parte = ctx.domaTrabajar(ahora0);
  ok("recogió 3 cargas del árbol (dejó 1 esperándote)", parte && (parte.madera + parte.fee) === 3,
    JSON.stringify(parte));
  ok("el jugador cobró primero (comisión al final del ciclo de 10)", parte.madera === 3 && parte.fee === 0);
  const rec = G.nodos["tree:10,10"];
  const cargasAhora = Math.min(4, 1 + Math.max(0, Math.floor((FakeDate.now() - rec.readyAt) / (rec.readyAt - rec.cdIni))));
  ok("el nodo quedó con 1 carga y el reloj corriendo", cargasAhora === 1, cargasAhora + " cargas");
  const otra = ctx.domaTrabajar(ahora0);
  ok("correr el turno DOS veces no duplica (ya está drenado)", otra === null);
}

console.log("\nCON HAMBRE NO TRABAJA — Y CON VOS ADENTRO, TAMPOCO");
{
  const ahora0 = FakeDate.now();
  G.doma.comidaHasta = ahora0 - 1;   // panza vacía desde antes de irte
  G.nodos = { "tree:11,11": { readyAt: ahora0 + 2 * H, cdIni: ahora0 } };
  desfase += 10 * H;
  ok("hambriento: el turno no junta nada", ctx.domaTrabajar(ahora0) === null);
  ok("y domaHambriento() lo delata para el tinte gris", ctx.domaHambriento() === true);
  /* cargas maduradas ANTES de irte (visto DESPUÉS de la maduración): no son suyas */
  const ahora1 = FakeDate.now();
  G.doma.comidaHasta = ahora1 + 72 * H;
  G.nodos = { "tree:12,12": { readyAt: ahora1 - 8 * H, cdIni: ahora1 - 10 * H } };   // 4 cargas viejas
  ok("lo madurado con vos presente no se toca (visto = ahora)", ctx.domaTrabajar(ahora1) === null);
}

console.log("\nLOS MINERALES QUEDAN AFUERA Y EL TURNO CORRE EN HYDRATE");
{
  const ahora0 = FakeDate.now();
  G.doma = { bicho: "orco", desde: ahora0, comidaHasta: ahora0 + 72 * H, cont: 0, ultimo: null };
  G.nodos = { "ore:5,5": { readyAt: ahora0 + 2 * H, cdIni: ahora0 } };
  desfase += 10 * H;
  ok("una veta jamás entra al turno", ctx.domaTrabajar(ahora0) === null);
  /* hydrate con visto viejo dispara el turno */
  const ahora1 = FakeDate.now();
  G.nodos = { "tree:13,13": { readyAt: ahora1 + 2 * H, cdIni: ahora1 } };
  G.doma.comidaHasta = ahora1 + 72 * H;
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));   // visto = ahora1
  desfase += 10 * H;
  const madera0 = Math.floor(G.res.madera || 0);
  ctx.hydrate(snap);
  ok("cargar la partida ES volver: el bicho entrega su parte", Math.floor(G.res.madera || 0) > madera0,
    madera0 + " → " + Math.floor(G.res.madera || 0));
  ok("y el parte queda anotado para el hover", !!(G.doma.ultimo && G.doma.ultimo.at));
}

console.log("\nCADA BICHO, SU OFICIO: LA RATA ESCARBA Y LA LARVA ABONA (v3, dirección)");
{
  /* la rata: 1 lombriz cada 8 h cubiertas, tope 3 */
  const ahora0 = FakeDate.now();
  G.doma = { bicho: "rata", desde: ahora0, comidaHasta: ahora0 + 72 * H, cont: 0, ultimo: null };
  G.nodos = { "tree:20,20": { readyAt: ahora0 + 2 * H, cdIni: ahora0 } };   // árboles llenos que NO son lo suyo
  G.res.lombriz = 0; const madera1 = Math.floor(G.res.madera || 0);
  desfase += 20 * H;
  const pr = ctx.domaTrabajar(ahora0);
  ok("20 h afuera: la rata trae 2 lombrices (8 h cada una)", pr && pr.lombriz === 2, JSON.stringify(pr));
  ok("y NO toca los árboles (no es lo suyo)", Math.floor(G.res.madera || 0) === madera1);
  const ahora1 = FakeDate.now();
  G.doma.comidaHasta = ahora1 + 72 * H;
  desfase += 100 * H;
  ok("100 h afuera: tope de 3 por vuelta", ctx.domaTrabajar(ahora1).lombriz === 3);
  /* la larva: recorta el 15% de lo que le falta a cada cultivo creciendo */
  const ahora2 = FakeDate.now();
  G.doma = { bicho: "larva", desde: ahora2, comidaHasta: ahora2 + 72 * H, cont: 0, ultimo: null };
  G.plots = [{ state: "growing", cropKey: "maiz", readyAt: ahora2 + 34 * H, growTotal: 24 * H, witherAt: 0 },
             { state: "ready", cropKey: "papa", readyAt: 0, witherAt: 0 }];
  desfase += 10 * H;
  const antes = G.plots[0].readyAt;
  const pl = ctx.domaTrabajar(ahora2);
  ok("la larva abona el cultivo en crecimiento", pl && pl.abonados === 1, JSON.stringify(pl));
  const recorte = antes - G.plots[0].readyAt, falta = antes - FakeDate.now();
  ok("y le recorta el 15% de lo que le faltaba", Math.abs(recorte - falta * 0.15) < 2000,
    (recorte / H).toFixed(1) + " h de " + (falta / H).toFixed(1));
  ok("el cultivo LISTO no se toca (no hay nada que abonar)", G.plots[1].readyAt === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la granja ya no duerme sola.\n");
process.exit(fallos ? 1 : 0);
