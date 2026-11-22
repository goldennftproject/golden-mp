/* DOMA Y TAREAS DE LA GRANJA
   La criatura activa trabaja con objetivos reales mientras tiene comida. Contratos:
     · se abre en granja 10; antes, ningún bicho te sigue (ni con suerte);
     · una criatura por especie, con un solo ayudante activo y descanso opcional;
     · come 1 carne = 24 h de trabajo (panza tope 3 días); con hambre NO trabaja;
     · resuelve los mismos recursos con la granja abierta o al volver de una ausencia;
     · se queda el 30% de comisión, determinístico, y el jugador cobra primero;
     · deja una carga en el nodo y descuenta con nodoGastarCarga:
       el reloj sigue corriendo, el F5 no duplica;
     · minerales afuera (sin cargas, 21/8); bolsa llena = para de juntar sin perder nada;
     · al cargar, el turno espera a que el mapa tenga sus montículos, nodos y parcelas.
     node tools/test-doma.js                                                                   */
const fs = require("fs"), vm = require("vm");

const T0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + desfase); } static now() { return T0 + desfase; } }

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.location = { hash: "", search: "" };
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
if (!vm.runInContext("GF.MVP === 1 && domaActiva()", ctx)) throw Error("La doma debe funcionar con el MVP activo");
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = t => avisos.push(String(t));
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "refreshBarn", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, H = 3600000;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA PUERTA: GRANJA 10 Y EL PLATO FAVORITO DE CADA ESPECIE");
{
  G.level = 9; ctx.domaCargar({}); G.dishes = { bocado_domador: 5, galletita_cereza: 5, papilla_remolacha: 5 };
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
  ok("con Costillar y mala suerte (0,5 ≥ 1 de 6): se lo come y se va", ctx.domaIntentar("orco", () => 0.5) === false && G.dishes.bocado_domador === 4);
  ok("con Costillar y suerte: el orco te sigue a casa", ctx.domaIntentar("orco", () => 0.001) === true && G.doma.bicho === "orco");
  ok("y ese intento también costó su plato", G.dishes.bocado_domador === 3);
  ok("un segundo orco no gasta otro plato", ctx.domaIntentar("orco", () => 0.001) === false && G.dishes.bocado_domador === 3);
  const R = vm.runInContext("RECIPE_DEF", ctx);
  ok("la escalera de platos sigue al valor del ayudante: galletita 4 · papilla 7 · costillar 10",
    R.galletita_cereza.lvl === 4 && R.papilla_remolacha.lvl === 7 && R.bocado_domador.lvl === 10);
  /* v4: el COSTO sigue al valor — la fórmula que delató el bollito de 1.740 queda de guardia */
  const C = vm.runInContext("CROP_DEF", ctx), PR = vm.runInContext("PRICE", ctx);
  const costo = (res) => Object.keys(res).reduce((a, k) => a + ((C[k] ? C[k].price : PR[k]) || 0) * res[k], 0);
  const cg = costo(R.galletita_cereza.res), cp = costo(R.papilla_remolacha.res), cc = costo(R.bocado_domador.res);
  ok("y el coste también: galletita < papilla < costillar", cg < cp && cp < cc, cg + " < " + cp + " < " + cc);
  ok("la galletita es calderilla (≤ 30) y el costillar pesa (≥ 300)", cg <= 30 && cc >= 300);
  ok("y cada descripción nombra a su criatura ('le encanta')",
    /orco/i.test(R.bocado_domador.desc) && /RATA/i.test(R.galletita_cereza.desc) && /LARVA/i.test(R.papilla_remolacha.desc));
}

console.log("\nUNA CRIATURA POR ESPECIE, UN SOLO AYUDANTE ACTIVO");
{
  avisos.length = 0;
  const antes = G.dishes.bocado_domador;
  ok("puede domar un trol con un orco en casa", ctx.domaIntentar("troll", () => 0.001) === true);
  ok("el orco sigue activo y el trol queda disponible", G.doma === G.domas.orco && !!G.domas.troll);
  ok("el plato se consume una vez", G.dishes.bocado_domador === antes - 1);
  ok("puede pasar el trol a activo", ctx.domaElegir("troll").ok && G.doma === G.domas.troll);
  ok("una especie que no tiene no reemplaza la actual", !!ctx.domaElegir("rata").error && G.doma === G.domas.troll);
  ctx.GF.scene = "forest";
  ok("la selección se hace en la granja", !!ctx.domaElegir(null).error);
  ctx.GF.scene = "farm";
  ok("puede dejar a todos descansando", ctx.domaElegir(null).ok && G.doma === null);
  ok("domar una especie estando en descanso conserva la elección", ctx.domaIntentar("larva", () => 0) && G.doma === null && !!G.domas.larva);
  ok("no gasta otro plato con la misma especie descansando", !ctx.domaIntentar("larva", () => 0) && G.dishes.papilla_remolacha === 4);
  const foto = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.domaCargar({});
  ctx.hydrate(foto);
  ok("la carga recupera la colección con todos en descanso", Object.keys(G.domas).length === 3 && G.doma === null);
  ok("la comida de cada criatura sigue guardada", G.domas.troll.comidaHasta === foto.domaColeccion.criaturas.troll.comidaHasta);
  ok("puede elegir a la larva al volver a abrir", ctx.domaElegir("larva").ok && G.doma.bicho === "larva");
  const activa = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.domaCargar({});
  ctx.hydrate(activa);
  ok("la carga recupera la especie elegida", G.domaActivaKey === "larva" && G.doma === G.domas.larva);
  ok("la colección y su alias coinciden al volver a guardar", JSON.stringify(ctx.snapshot().doma) === JSON.stringify(ctx.snapshot().domaColeccion.criaturas.larva));
  ok("cargar separa los registros que se pueden modificar", G.doma !== activa.domaColeccion.criaturas.larva);
  ctx.domaCargar({ doma: { bicho: "rata", desde: T0 - 24 * H, comidaHasta: T0 + 24 * H, cont: 4 } });
  ok("la partida anterior conserva su rata y su comida", G.domaActivaKey === "rata" && G.doma.cont === 4 && Object.keys(G.domas).length === 1);
  ctx.domaElegir(null);
  ctx.domaElegir("rata");
  ctx.domaPrepararRegreso({ visto: T0 - 12 * H });
  ok("la recién activada no cobra horas de descanso", !G._domaPendiente);
}

console.log("\nEL PLATO VIAJA EN EL CONTENEDOR EQUIPADO");
{
  G.level = 10; ctx.domaCargar({}); G.dishes.galletita_cereza = 5;
  ctx.GF.scene = "forest";
  G.cont = ctx.contCrear("backpack");
  const bolsa = ctx.contCrear("bag");
  ctx.contMeter(bolsa, "dish", "galletita_cereza", 2);
  ctx.contMeterBolsa(G.cont, bolsa);
  const restantes = () => ctx.llevoTengo("dish", "galletita_cereza");
  ctx.GF.DOMA_ACTIVA = false;
  ok("puede pausarse sola y no gastar el plato", !ctx.domaIntentar("rata", () => 0) && restantes() === 2);
  ctx.GF.DOMA_ACTIVA = true;
  G.level = 9;
  ok("el nivel insuficiente no cobra en la Zona", !ctx.domaIntentar("rata", () => 0) && restantes() === 2);
  G.level = 10;
  ok("un intento fallido sólo consume un plato llevado", !ctx.domaIntentar("rata", () => .99) && restantes() === 1);
  ok("el intento acertado consume el último y registra la rata", ctx.domaIntentar("rata", () => 0) && restantes() === 0 && G.doma.bicho === "rata");
  ok("la despensa sigue intacta", G.dishes.galletita_cereza === 5);
  ctx.domaCargar({});
  ok("con el plato sólo en la granja no hay intento", !ctx.domaIntentar("rata", () => 0) && G.dishes.galletita_cereza === 5);
  G.cont = null;
  ctx.GF.scene = "farm";
  ctx.domaCargar({ doma: { bicho: "orco", comidaHasta: FakeDate.now() + 24 * H, cont: 0 } });
}

console.log("\nLA PANZA: 1 CARNE = 24 H, TOPE 3 DÍAS, SIN CARNE NO HAY TRATO");
{
  /* 24/8 (diseñador: « la domé y tiene hambre · mi dios, pobrecita »): nacía con la panza en
     cero, o sea hambriento desde el primer segundo — el premio llegaba pidiendo. Y encima
     acababa de comerse el plato que le diste para domarlo. Ese plato cuenta como su primer día. */
  ok("no nace con hambre: el plato de la doma le paga el primer día",
    !ctx.domaHambriento() && Math.abs(G.doma.comidaHasta - (FakeDate.now() + 24 * H)) < 1000);
  G.res.carne = 0;
  ok("sin carne no come", !!ctx.domaAlimentar().error);
  G.res.carne = 5;
  const antesPanza = G.doma.comidaHasta;
  ok("come 1 carne", ctx.domaAlimentar().ok === true && Math.floor(G.res.carne) === 4);
  ok("y cada carne suma 24 h a lo que ya tenía", Math.abs(G.doma.comidaHasta - (antesPanza + 24 * H)) < 1000,
    Math.round((G.doma.comidaHasta - FakeDate.now()) / H) + " h de panza");
  ctx.domaAlimentar();
  ok("la panza guarda hasta 3 días", !!ctx.domaAlimentar().error, "carne restante " + G.res.carne);
}

console.log("\nLA SUERTE POR ESPECIE SE CONSERVA");
{
  ok("la rata y la larva siguen en 1 de cada 4", ctx.domaChance("rata") === 0.25 && ctx.domaChance("larva") === 0.25);
  ok("orco, lancero, guerrero y trol siguen en 1 de cada 6", ["orco", "lancero", "guerrero", "troll"].every(bicho => ctx.domaChance(bicho) === 1 / 6));
  ok("el aviso muestra la probabilidad de cada especie", ctx.domaChanceTxt("rata") === "1 de cada 4" && ctx.domaChanceTxt("orco") === "1 de cada 6");
}

function prepararAyudante(bicho, comidaHasta = FakeDate.now() + 24 * H, cont = 0) {
  ctx.GF.scene = "farm";
  ctx.domaCargar({ doma: { bicho, desde: FakeDate.now() - 2 * H, comidaHasta, cont } });
}

console.log("\nRATA: VISITA LOS MONTÍCULOS QUE YA EXISTEN");
{
  prepararAyudante("rata");
  G.seeds.papa = 1;
  G.res.lombriz = 0;
  G.energiaGranja = { v: 1, actual: 0, at: FakeDate.now() };
  const dia = ctx.dayStamp(0);
  const primero = { type: "excav", idx: 0, dia }, segundo = { type: "excav", idx: 1, dia };
  const premio = ctx.excavBotin(0).n;
  ok("puede ir a un montículo apenas está visible", ctx.domaPuedeAtender(primero));
  ok("recoge el botín real sin usar energía de la granja", ctx.domaAtender(primero)?.n === premio && G.res.lombriz === premio && G.energiaGranja.actual === 0);
  ok("el montículo queda consumido también para el jugador", ctx.excavCavar(0) === null && G.excav.hechos.includes(0));
  ok("elige el otro montículo sin esperar ocho horas", ctx.domaAtender(segundo)?.res === "lombriz" && G.excav.hechos.includes(1));
  ok("deja los montículos del día anterior", ctx.domaAtender({ type: "excav", idx: 2, dia: ctx.dayStamp(-1) }) === null);
  ok("rechaza un montículo inexistente", ctx.domaAtender({ type: "excav", idx: 999, dia }) === null);
  const tercero = { type: "excav", idx: 2, dia };
  const intentaAñadir = ctx.tryAddRes;
  ctx.tryAddRes = () => false;
  ok("con la bolsa llena conserva el montículo", ctx.domaAtender(tercero) === null && !G.excav.hechos.includes(2));
  ctx.tryAddRes = intentaAñadir;
  G.seeds = {}; G.res = {}; G.plata = 0; G.plots = [];
  ok("la rata deja el montículo de rescate que entregaría una semilla", ctx.domaAtender(tercero) === null && !G.excav.hechos.includes(2));
  G.seeds.papa = 1;
  G.doma.comidaHasta = FakeDate.now();
  ok("al terminar la ración se detiene en el acto", ctx.domaHambriento() && ctx.domaAtender(tercero) === null);
  G.doma.comidaHasta += H;
  ctx.domaElegir(null);
  ok("ningún ayudante actúa si el jugador eligió descanso", ctx.domaAtender(tercero) === null);
}

console.log("\nÁRBOLES Y ROCAS: LA CARGA REAL QUEDA GUARDADA");
{
  prepararAyudante("orco");
  const ahora = FakeDate.now(), ciclo = ctx.CD.tree * 1000;
  G.energiaGranja = { v: 1, actual: 40, at: ahora };
  G.res.madera = 0;
  const nodo = { i: 0, type: "tree", readyAt: ahora - 3 * ciclo, cdIni: ahora - 4 * ciclo };
  ok("una veta de mineral no es una tarea del orco", !ctx.domaPuedeAtender({ ...nodo, type: "ore" }));
  ok("espera si el jugador ya está talando", !ctx.domaPuedeAtender({ ...nodo, golpes: 1 }));
  ok("espera a que haya una carga para él y otra para el jugador", !ctx.domaPuedeAtender({ ...nodo, readyAt: ahora, cdIni: ahora - ciclo }));
  ok("recoge tres cargas reales y deja una", [0, 1, 2].every(() => ctx.domaAtender(nodo)?.n === 1) &&
    ctx.nodoCargas(nodo, ctx.CD.tree) === 1 && G.res.madera === 3);
  ok("conserva la energía por unidad y el registro por nodo", G.energiaGranja.actual === 37 &&
    G.doma.trabajos[0].n === 3 && G.doma.trabajos[0].activaDesde === G.domaActivaDesde);
  G.doma.cont = 6;
  const comision = { ...nodo, readyAt: ahora - ciclo, cdIni: ahora - 2 * ciclo };
  ok("la séptima carga se usa como comisión", ctx.domaAtender(comision)?.n === 0 && G.res.madera === 3 &&
    ctx.nodoCargas(comision, ctx.CD.tree) === 1 && G.energiaGranja.actual === 37 && G.doma.cont === 7);
}

console.log("\nLARVA: ABONA CADA SIEMBRA UNA VEZ");
{
  prepararAyudante("larva");
  const ahora = FakeDate.now();
  const parcela = { type: "plot", i: 0, state: "growing", cropKey: "maiz", readyAt: ahora + 2 * H };
  ok("la larva aplica el 15 % al crecimiento pendiente", ctx.domaAtender(parcela)?.abonada &&
    parcela.readyAt === ahora + 2 * H * 0.85 && parcela.abonadaDoma === true);
  ok("la misma siembra no se abona dos veces", ctx.domaAtender(parcela) === null);
  ok("deja los cultivos ya maduros", ctx.domaAtender({ ...parcela, state: "ready", abonadaDoma: false }) === null);
  G.plots = [{ ...parcela }];
  ctx.produccionPausarEn({ type: "plot", i: 0 }, ahora, true);
  ok("pausar conserva el abono de la siembra", G.produccion.pausas["p:0"]?.estado.abonadaDoma === true);
  delete G.produccion.pausas["p:0"];
}

console.log("\nCON EL JUEGO CERRADO: TRABAJO REAL ANTES DE QUE TERMINE LA RACIÓN");
{
  const cambioDia = Date.parse("2025-08-22T00:00:00Z");
  desfase = cambioDia - H - T0;
  prepararAyudante("rata", cambioDia + H);
  G.seeds.papa = 1;
  G.res.lombriz = 0;
  G.excav = { dia: ctx.dayStamp(0), hechos: [0] };
  const guardado = JSON.parse(JSON.stringify(ctx.snapshot()));
  const diaAnterior = guardado.excav.dia;
  desfase += 3 * H;
  const diaActual = ctx.dayStamp(0);
  ctx.hydrate(guardado);
  ok("al cargar espera a los recursos reales de la granja", G.res.lombriz === 0 && !!G._domaPendiente);
  G.seeds.papa = 1;
  const granja = { nodos: [], parcelas: [], monticulos: dia => dia === diaAnterior ? [0, 1] : [2] };
  const esperadas = ctx.excavBotin(1, null, diaAnterior).n + ctx.excavBotin(2, null, diaActual).n;
  ok("recoge el pendiente de ayer y el que apareció hoy antes de quedarse sin comida",
    ctx.domaResolverAusencia(granja)?.excav && G.res.lombriz === esperadas && ctx.domaHambriento());
  ok("respeta los índices reales y marca el montículo de hoy", G.excav.dia === diaActual &&
    G.excav.hechos.length === 1 && G.excav.hechos[0] === 2);
  ok("el mismo regreso no vuelve a pagar", ctx.domaResolverAusencia(granja) === null && G.res.lombriz === esperadas);
  const confirmado = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(confirmado);
  ok("recargar el guardado con las lombrices no las vuelve a cobrar",
    ctx.domaResolverAusencia(granja) === null && G.res.lombriz === esperadas);
}

{
  const salida = FakeDate.now();
  prepararAyudante("orco", salida + 2 * H);
  G.res.madera = 0;
  G.energiaGranja = { v: 1, actual: 20, at: salida };
  const ciclo = ctx.CD.tree * 1000;
  const nodo = { i: 0, type: "tree", readyAt: salida, cdIni: salida - ciclo };
  desfase += 3 * H;
  ctx.domaPrepararRegreso({ visto: salida });
  const granja = { nodos: [nodo], parcelas: [], monticulos: () => [] };
  ok("al volver recoge de los ciclos ocurridos dentro de la ración, aunque ahora tenga hambre",
    ctx.domaResolverAusencia(granja)?.nodos && G.res.madera === 3 && G.doma.trabajos[0].at < G.doma.comidaHasta);
  ok("los ciclos posteriores a la ración quedan para el jugador", ctx.nodoCargas(nodo, ctx.CD.tree) > 1);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: tareas reales dentro y fuera de la granja.\n");
process.exit(fallos ? 1 : 0);
