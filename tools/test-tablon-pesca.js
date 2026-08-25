/* EL TORNEO DE PESCA Y EL PEDIDO DE MAREA (25/8, docs/PESCA-V3.md capítulo 11)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El tablón pedía UN solo pez y del catálogo viejo:

       { tipo: "fish", key: "comun", n: 2, val: 12 }

   Una línea, una rareza que ya nadie pesca desde la tanda 1, y un valor escrito a mano que no
   cuelga del ancla. Con nueve especies eso significa que el Torneo de Pesca —uno de los cinco
   temas del fin de semana— repartía siempre el mismo encargo, y encima de algo que un jugador
   nuevo no obtiene nunca.

   LA REGLA DEL CAPÍTULO 11, que es lo que este archivo vigila:
       « la Lonja solo pide lo que el jugador YA puede pescar. Un pedido imposible no frustra:
         enseña que el tablón miente, y a partir de ahí el jugador deja de leerlo. »

   Y LA DISTINCIÓN QUE EL DOCUMENTO NO HACÍA, y que hizo falta escribir:
     · el TABLÓN dura un día o una semana → puede pedir calamar, porque el jugador espera a que
       anochezca. Usa especieAlcanzable (nivel, familia, caña).
     · la MAREA vence en SEIS HORAS → no puede pedir calamar de día, porque no da tiempo a
       esperar la noche. Usa especiePescable (lo anterior MÁS la hora).
   Mismo principio, dos ventanas de duración distinta.
     node tools/test-tablon-pesca.js                                                             */
const fs = require("fs"), vm = require("vm");

let horaFalsa = 12;
class FakeDate extends Date {
  constructor(...a) { a.length ? super(...a) : super(2026, 7, 25, horaFalsa, 0, 0); }
  static now() { return new Date(2026, 7, 25, horaFalsa, 0, 0).getTime(); }
  getHours() { return horaFalsa; }
  getMinutes() { return 0; }
}
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const ESP = g("ESPECIE_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function pescador(nv, canas, palangre) {
  let acc = 0; for (let k = 2; k <= nv; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: 0 };
  G.canas = canas; G.trampas = { palangre: palangre || 0 };
  G.pescaTiene = { senuelo: nv >= 9 };
  G.marea = null;
}
const peces = () => ctx.pedPool().filter(p => p.tipo === "fish");

console.log("\nEL TABLÓN YA NO PIDE UNA RAREZA QUE NADIE PESCA");
{
  pescador(20, { junco: 30, roble: 30, hierro: 25, abuelo: 20 }, 2);
  const p = peces();
  ok("ofrece las nueve especies al pescador completo", p.length === 9, p.length + "");
  ok("y NINGUNA es del catálogo viejo (comun · raro · epico · legendario)",
    p.every(x => !!ESP[x.key]), p.map(x => x.key).join(","));
  ok("el valor sale del ancla, no de un 12 escrito a mano",
    p.every(x => Math.abs(x.val - ctx.especiePrecio(x.key) * x.n) < 1.01),
    "martillo: " + (p.find(x => x.key === "tiburon") || {}).val + " · precio " + ctx.especiePrecio("tiburon"));
  ok("los de cadena corta se piden de a dos y los largos sueltos",
    p.filter(x => ESP[x.key].cadena <= 15).every(x => x.n === 2) &&
    p.filter(x => ESP[x.key].cadena > 15).every(x => x.n === 1));
}

console.log("\nY SOLO PIDE LO QUE EL JUGADOR PUEDE PESCAR   (la regla dura del capítulo 11)");
{
  pescador(1, { junco: 30 }, 0);
  const p1 = peces().map(x => x.key);
  ok("a Pesca 1 solo la orilla", p1.every(k => ESP[k].familia === "orilla"), p1.join(","));
  ok("y nunca el martillo, que abre en la 20", p1.indexOf("tiburon") < 0);

  pescador(5, { junco: 30, roble: 30 }, 0);
  ok("a Pesca 5 se suma la Superficie", peces().some(x => ESP[x.key].familia === "superficie"));

  pescador(12, { junco: 30, roble: 30, hierro: 25 }, 2);
  const p12 = peces().map(x => x.key);
  ok("a Pesca 12, con palangre, TODAVÍA no el espada (abre en la 15)", p12.indexOf("pez_espada") < 0, p12.join(","));

  /* la caña también es una puerta: sin una que aguante la talla mínima, no se puede pedir */
  pescador(20, { junco: 30 }, 2);   // solo junco: aguanta 2★
  const soloJunco = peces().map(x => x.key);
  ok("con caña de junco (2★) el tablón no pide un espada (3-5★)", soloJunco.indexOf("pez_espada") < 0);
  ok("ni un martillo (4-5★)", soloJunco.indexOf("tiburon") < 0, soloJunco.join(","));
}

console.log("\nLA MAREA SÍ MIRA LA HORA — el tablón no, y ésa es la diferencia");
{
  pescador(20, { junco: 30, roble: 30, hierro: 25, abuelo: 20 }, 2);
  horaFalsa = 15;                                    // pleno día
  const deDia = peces().map(x => x.key);
  ok("de DÍA el tablón sigue pudiendo pedir calamar — hay tiempo de esperar la noche",
    deDia.indexOf("calamar") >= 0);
  ok("pero especiePescable dice que ahora mismo no se puede", ctx.especiePescable("calamar") === false);
  ok("y especieAlcanzable dice que sí está a su alcance", ctx.especieAlcanzable("calamar") === true);

  horaFalsa = 23;                                    // de noche
  ok("de noche, las dos coinciden", ctx.especiePescable("calamar") === true);

  /* y el pedido de marea, que vence en 6 h, respeta la hora */
  horaFalsa = 15; G.marea = null;
  const m = ctx.mareaPedidos();
  ok("el pedido de marea NUNCA pide un pez nocturno de día",
    m.every(p => !ESP[p.esp].noche), m.map(p => p.esp).join(","));
  ok("y todo lo que pide se puede pescar en este momento",
    m.every(p => ctx.especiePescable(p.esp)));
  horaFalsa = 12;
}

console.log("\nEL TEMA DEL TORNEO SIGUE EXISTIENDO EN EL TABLÓN");
{
  const TEMAS = g("EVENTO_TEMAS");
  const torneo = TEMAS.find(t => t.id === "pesca");
  ok("« El Torneo de Pesca » es uno de los temas del fin de semana", !!torneo, torneo && torneo.label);
  pescador(20, { junco: 30, roble: 30, hierro: 25, abuelo: 20 }, 2);
  const suyos = ctx.pedPool().filter(torneo.f);
  ok("y ahora tiene NUEVE encargos posibles en vez de uno", suyos.length === 9, suyos.length + "");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el tablón todavía pide lo que no se puede dar"
  : "  Todo en orden: el tablón pide de las nueve, y solo lo que el jugador alcanza.");
process.exit(fallos ? 1 : 0);
