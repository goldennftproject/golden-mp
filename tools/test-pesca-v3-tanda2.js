/* PESCA v3 · TANDA 2 — EL AGUA SE ACUERDA (25/8, docs/PESCA-V3.md capítulos 3, 8 y 13)
   Con la tanda 1 medida (la curva de la granja no se movió y Pesca quedó alineada: 135 horas
   contra 113-123 de los otros oficios), entra la segunda. Tres piezas y un techo:
     · LAS CAÑAS son un LÍMITE, no un porcentaje. Cada una aguanta hasta cierta talla, escrito en
       la propia caña; si el pez pesa más, el hilo se corta y se pierde el lance, nunca plata.
       Y se elige sola, como los picos desde el 24/8: la más barata que aguante y de la que haya
       stock. La Caña del Abuelo jamás se gasta en una carpa de 1★.
     · LA MEMORIA DE LA LAGUNA: un contador por familia. Lo que exprimís escasea y lo que dejás
       descansar vuelve. Con un PISO que no se puede cruzar — el que solo pesca en la orilla no
       puede quedarse sin orilla, porque eso rompería la regla del primer escalón.
     · EL ÁLBUM CON ESTRELLAS: la lámina deja de ser « lo tenés / no lo tenés » y pasa a ser
       « cuánto lo dominás », con el estado intermedio de la escama.
     · Y LA ESCALERA DE PESCA, con su techo DERIVADO del contenido, como todos los demás oficios.
     node tools/test-pesca-v3-tanda2.js                                                          */
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
ctx.toast = (t) => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "recalcFarmLevel", "tutoEvent", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const CANA = g("CANA_DEF"), ORDEN = g("CANA_ORDER"), ESP = g("ESPECIE_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const conCanas = (...ids) => { G.canas = {}; ids.forEach(i => { G.canas[i] = 10; }); };

console.log("\nLAS CUATRO CAÑAS, COMO LA TABLA DEL DOCUMENTO");
{
  ok("son cuatro y en orden de precio", ORDEN.join(",") === "junco,roble,hierro,abuelo");
  ok("junco 2★ · nivel 1", CANA.junco.aguanta === 2 && CANA.junco.lvl === 1);
  ok("roble 3★ · nivel 7", CANA.roble.aguanta === 3 && CANA.roble.lvl === 7);
  ok("hierro 4★ · nivel 12", CANA.hierro.aguanta === 4 && CANA.hierro.lvl === 12);
  ok("del Abuelo 5★ · nivel 18", CANA.abuelo.aguanta === 5 && CANA.abuelo.lvl === 18);
  ok("cada una aguanta MÁS que la anterior",
    ORDEN.every((id, i) => i === 0 || CANA[id].aguanta > CANA[ORDEN[i - 1]].aguanta));
  ok("y se abre más tarde", ORDEN.every((id, i) => i === 0 || CANA[id].lvl > CANA[ORDEN[i - 1]].lvl));
  ok("la del Abuelo no se craftea: sale de la Lonja", CANA.abuelo.lonja === true);
}

console.log("\nLA CAÑA SE ELIGE SOLA — LA MÁS BARATA QUE AGUANTE (como los picos)");
{
  conCanas("junco", "roble", "hierro", "abuelo");
  ok("para 1★ agarra la de junco", ctx.canaParaEstrella(1) === "junco");
  ok("para 2★ también", ctx.canaParaEstrella(2) === "junco");
  ok("para 3★ sube a la de roble", ctx.canaParaEstrella(3) === "roble");
  ok("para 4★, la de hierro", ctx.canaParaEstrella(4) === "hierro");
  ok("y para 5★, la del Abuelo", ctx.canaParaEstrella(5) === "abuelo");
  /* la regla que hace que valga la pena: la cara NO se gasta en un pez chico */
  ok("teniendo TODAS, una carpa de 1★ nunca gasta la del Abuelo", ctx.canaParaEstrella(1) !== "abuelo");
  conCanas("abuelo");
  ok("pero si es la única que tenés, con esa se pesca", ctx.canaParaEstrella(1) === "abuelo");
  conCanas("junco");
  ok("sin caña que aguante, no hay ninguna", ctx.canaParaEstrella(4) === null);
  ok("y la que HARÍA falta se sabe igual", ctx.canaQueHaceFalta(4) === "hierro");
}

console.log("\nY EL AVISO NOMBRA LA CAÑA QUE FALTA, NO UN GENÉRICO");
{
  /* el calamar pide señuelo y noche: acá se mide LA CAÑA, así que lo demás se le da hecho */
  G.skills = { fishing: 99999 }; G.res.lombriz = 5; G.res.grillo = 5;
  G.pescaTiene = { senuelo: true }; conCanas("junco");
  const p = ctx.pescaPuedeSenal({ esp: "calamar", fam: "fondo", estrella: 4 });
  ok("un 4★ con caña de junco se niega", !p.ok);
  ok("y el aviso dice CUÁL hace falta", /Caña de hierro/.test(p.toast), p.toast);
  ok("y explica por qué: te corta el hilo", /corta el hilo/.test(p.toast));
  conCanas("junco", "hierro");
  const p2 = ctx.pescaPuedeSenal({ esp: "calamar", fam: "fondo", estrella: 4 });
  ok("con la de hierro, sí", p2.ok === true);
  ok("y viene dicho con cuál se va a pelear", p2.cana === "hierro", p2.cana);
}

console.log("\nTIRAR GASTA UN USO DE LA CAÑA QUE ELIGIÓ EL JUEGO");
{
  G.canas = { junco: 3, hierro: 2 };
  G.senales = [{ esp: "pez_comun", fam: "orilla", estrella: 1 }];
  G.pescaDesde = FakeDate.now() - 15 * 60 * 1000 * 3;
  G.res.lombriz = 5;
  ctx.pescaSenalGastar(0);
  ok("gastó la de junco, no la de hierro", G.canas.junco === 2 && G.canas.hierro === 2,
    "junco " + G.canas.junco + " · hierro " + G.canas.hierro);
  G.canas = { junco: 1 };
  G.senales = [{ esp: "pez_comun", fam: "orilla", estrella: 1 }];
  avisos.length = 0;
  ctx.pescaSenalGastar(0);
  ok("cuando se acaba, la caña desaparece", !G.canas.junco);
  ok("y te lo dice", avisos.some(a => /caña rota/i.test(a)), avisos.join(" · "));
}

console.log("\nLA MEMORIA DE LA LAGUNA: LO QUE EXPRIMÍS, ESCASEA");
{
  G.presion = null;
  ok("de entrada, todas las familias están descansadas", ctx.presionPeso("orilla") === 1);
  ok("y se lee « abundante »", ctx.presionTxt("orilla") === "abundante");
  for (let i = 0; i < 12; i++) ctx.presionSumar("orilla");
  ok("después de exprimirla, pesa menos en el sorteo", ctx.presionPeso("orilla") < 1,
    ctx.presionPeso("orilla").toFixed(2));
  ok("y se lee « escasa »", ctx.presionTxt("orilla") === "escasa");
  ok("pero NUNCA llega a cero — el primer escalón no se puede cerrar",
    ctx.presionPeso("orilla") >= g("PRESION_PESO_MIN"), "piso " + g("PRESION_PESO_MIN"));
  ok("y la presión tiene tope: el castigo tiene fondo", ctx.presionDe("orilla") === g("PRESION_TOPE"));
  for (let i = 0; i < 10; i++) ctx.presionSumar("orilla");
  ok("por más que sigas, no baja más", ctx.presionDe("orilla") === g("PRESION_TOPE"));
  /* y las otras familias no se contagian */
  ok("exprimir la orilla no toca la superficie", ctx.presionPeso("superficie") === 1);
}

console.log("\nY SE CURA SOLA CON EL TIEMPO, COMO TODO EN ESTE JUEGO");
{
  const antes = ctx.presionDe("orilla");
  desfase += g("PRESION_CURA_H") * 3600000 * 3;   // tres curas
  ok("tres ciclos después bajó tres puntos", ctx.presionDe("orilla") === antes - 3,
    antes + " → " + ctx.presionDe("orilla"));
  desfase += g("PRESION_CURA_H") * 3600000 * 50;  // una eternidad
  ok("y con el tiempo vuelve al equilibrio", ctx.presionDe("orilla") === 0);
  ok("sin pasarse a negativo", ctx.presionPeso("orilla") === 1);
}

console.log("\nPESCAR SUMA PRESIÓN A SU FAMILIA (el agua se acuerda sola)");
{
  G.presion = null; G.canas = { junco: 9 }; G.res.lombriz = 9;
  G.senales = [{ esp: "pez_comun", fam: "orilla", estrella: 1 }];
  G.pescaDesde = FakeDate.now() - 15 * 60 * 1000 * 4;
  ctx.pescaSenalGastar(0);
  ok("un lance a la orilla la marca", ctx.presionDe("orilla") === 1);
  ok("y no marca a las demás", ctx.presionDe("superficie") === 0);
}

console.log("\nLA ESCALERA DE PESCA, CON SU TECHO DERIVADO DEL CONTENIDO");
{
  const abre = ctx.oficioAbre("fishing");
  ok("Pesca por fin abre cosas", abre.length >= 5, abre.length + " escalones");
  ok("y el primero está en el nivel 1 (el primer escalón, abierto)", abre[0][0] === 1, "nv " + abre[0][0]);
  ok("las cuatro cañas están en la escalera",
    ORDEN.every(id => abre.some(e => e[1].indexOf(CANA[id].label) === 0)));
  ok("y el grillo también, en su nivel 5", abre.some(e => e[0] === 5 && /Grillo/.test(e[1])));
  /* el techo NO se escribe: sale del último escalón que hay. Hoy la caña del Abuelo (18); con el
     tiburón martillo de la tanda 3 subirá solo a 20. */
  const techo = ctx.oficioTecho("fishing");
  ok("el techo sale del último escalón, no de un número a mano", techo === Math.max.apply(null, abre.map(e => e[0])),
    "techo " + techo);
  ok("y hoy es 18, la Caña del Abuelo", techo === 18);
}

console.log("\nEL ÁLBUM CON ESTRELLAS: « CUÁNTO LO DOMINÁS », NO « LO TENÉS »");
{
  G.estrellaMax = { carpa_dorada: 3 }; G.vistos = { pez_mariposa: true };
  G.fish = { carpa_dorada: 1 }; G.stats = G.stats || {};
  const peces = ctx.albumLista().find(f => f.id === "peces");
  ok("la familia de peces existe", !!peces);
  const carpa = peces.piezas.find(p => p.k === "carpa_dorada");
  ok("la carpa está en el álbum", !!carpa);
  ok("con su mejor talla", carpa.est && carpa.est.max === 3, carpa.est && carpa.est.max);
  ok("y su tope, para saber cuánto te falta", carpa.est.tope === ESP.carpa_dorada.estrellas[1]);
  const mar = peces.piezas.find(p => p.k === "pez_mariposa");
  ok("el que se escapó queda « visto, no cobrado »", mar.escapo === true && mar.visto === false);
  ok("las cuatro especies nuevas están", ["pez_comun", "carpa_dorada", "pez_mariposa", "calamar"]
    .every(k => peces.piezas.some(p => p.k === k)));
  ok("y las cuatro rarezas viejas siguen (las partidas viejas no pierden su álbum)",
    ["comun", "raro", "epico", "legendario"].every(k => peces.piezas.some(p => p.k === k)));
}

console.log("\nTODO ESTO VIAJA EN EL GUARDADO");
{
  G.canas = { roble: 7 }; G.presion = { v: { orilla: 4 }, visto: FakeDate.now() };
  const snap = ctx.snapshot();
  ok("las cañas", snap.canas && snap.canas.roble === 7);
  ok("y la memoria de la laguna", snap.presion && snap.presion.v.orilla === 4);
  G.canas = {}; G.presion = null;
  ctx.hydrate(snap);
  ok("y vuelven tras el F5", G.canas.roble === 7 && ctx.presionDe("orilla") === 4);
}

console.log("\nEL PRIMER ESCALÓN SIGUE ABIERTO: NADIE LLEGA SIN CAÑA");
{
  G.canas = {}; G.tools = {};
  ctx.hydrate({});
  ok("quien llega sin nada recibe la de junco", (G.canas || {}).junco > 0, JSON.stringify(G.canas));
  ok("con sus usos completos", G.canas.junco >= CANA.junco.usos);
  G.canas = { hierro: 3 };
  ctx.hydrate({ canas: { hierro: 3 } });
  ok("pero al que ya tiene caña no se le regala otra", !G.canas.junco, JSON.stringify(G.canas));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: la caña pone el límite, y el agua se acuerda de lo que le sacaste.\n");
process.exit(fallos ? 1 : 0);
