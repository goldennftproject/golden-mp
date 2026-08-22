/* EL ESTABLO CRECE CON EL OFICIO (22/8, dirección — opción A del hueco de Ganadería)
   La escalera abría animales en 1 · 4 · 8 · 12 y los niveles del medio no daban nada. Ahora el
   CUPO TOTAL del establo se deriva del nivel: 2 lugares al arrancar, +1 por nivel de Ganadería,
   techo 20. Este test COMPRA de verdad con comprarAnimal() y sube el oficio con XP real:
     · el jugador nuevo tiene 2 lugares y el tercero se le niega con motivo;
     · cada nivel de Ganadería abre exactamente un lugar más;
     · el tope de 5 por especie sigue mandando aunque el cupo sobre;
     · el guardado viejo con más animales que cupo NO pierde ninguno (y no compra hasta
       que el nivel lo alcance);
     · el panel de Oficios anuncia el lugar nuevo en cada nivel.
     node tools/test-cupo-establo.js                                                            */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
 "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshEstablo", "saveFarm"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
/* sube Ganadería hasta el nivel pedido con XP real de la curva */
function ganaderiaA(nivel) {
  let xp = 0;
  for (let n = 1; n < nivel; n++) xp += vm.runInContext("skillNeed(" + n + ", 'ganaderia')", ctx);
  G.skills = Object.assign({}, G.skills, { ganaderia: xp });
}
const compra = (k) => { avisos.length = 0; ctx.comprarAnimal(k); return avisos.join(" · "); };

/* jugador con establo construido y plata de sobra */
G.tuto = { done: true }; G.built = Object.assign({}, G.built, { establo: true }); G.plata = 999999;

console.log("\nEL JUGADOR NUEVO ARRANCA CON 2 LUGARES");
{
  ok("(escenario) Ganadería nivel 1, cupo 2", ctx.nivelOficio("ganaderia") === 1 && ctx.establoCupo() === 2,
    "nivel " + ctx.nivelOficio("ganaderia") + " · cupo " + ctx.establoCupo());
  compra("alpaca"); compra("alpaca");
  ok("las dos primeras alpacas entran", ctx.animalesTotal() === 2, ctx.animalesTotal() + "");
  const aviso = compra("alpaca");
  ok("la tercera se niega Y EXPLICA (lleno + qué nivel lo amplía)",
    ctx.animalesTotal() === 2 && /lleno/.test(aviso) && /Ganadería 2/.test(aviso), "« " + aviso + " »");
}

console.log("\nCADA NIVEL DEL OFICIO ABRE EXACTAMENTE UN LUGAR");
{
  ganaderiaA(2);
  ok("Ganadería 2: cupo 3", ctx.establoCupo() === 3);
  compra("alpaca");
  ok("y la tercera alpaca ahora sí entra", ctx.animalesTotal() === 3);
  ganaderiaA(4);
  ok("Ganadería 4: cupo 5 — y el conejo abre en el mismo nivel", ctx.establoCupo() === 5 && ctx.animalUnlocked("conejo"));
  compra("conejo"); compra("conejo");
  ok("dos conejos entran (5/5)", ctx.animalesTotal() === 5);
  const aviso = compra("conejo");
  ok("el sexto animal espera al nivel 5", /lleno/.test(aviso) && ctx.animalesTotal() === 5, "« " + aviso + " »");
}

console.log("\nEL TOPE POR ESPECIE SIGUE MANDANDO");
{
  ganaderiaA(12);
  ok("Ganadería 12: cupo 13 (lugares de sobra)", ctx.establoCupo() === 13);
  compra("alpaca"); compra("alpaca");   // 4ª y 5ª
  const aviso = compra("alpaca");       // 6ª: el tope de especie la corta
  ok("la sexta alpaca la corta el tope de especie (5), no el cupo",
    ctx.animalCant("alpaca") === 5 && /tope/.test(aviso), "« " + aviso + " »");
}

console.log("\nEL GUARDADO VIEJO NO PIERDE NADA");
{
  /* partida pre-cupo: 8 animales con Ganadería 4 (el cupo derivado sería 5).
     El conejo está ABIERTO al nivel 4 y su especie va 4/5: lo único que lo frena es el cupo. */
  const d = { level: 20, plata: 999999, tuto: { done: true }, built: { establo: true }, sflStock: true,
    skills: {}, animals: { alpaca: [{}, {}, {}, {}], conejo: [{}, {}, {}, {}] } };
  ctx.hydrate(JSON.parse(JSON.stringify(d)));
  G.plata = 999999; G.built.establo = true;
  ganaderiaA(4);
  ok("sus 8 animales siguen todos ahí", ctx.animalesTotal() === 8, ctx.animalesTotal() + "");
  ok("el cupo se estira a lo que ya tenía (8), no confisca", ctx.establoCupo() === 8);
  const aviso = compra("conejo");
  ok("pero no compra el noveno hasta que el nivel alcance", /lleno/.test(aviso) && ctx.animalesTotal() === 8, "« " + aviso + " »");
  ganaderiaA(8);
  ok("Ganadería 8: cupo 9, y el noveno entra", ctx.establoCupo() === 9 && (compra("conejo"), ctx.animalesTotal() === 9));
}

console.log("\nY EL PANEL DE OFICIOS LO ANUNCIA NIVEL A NIVEL");
{
  const abre = ctx.oficioAbre("ganaderia");
  const lugares = abre.filter(e => /lugar/.test(e[1]));
  ok("18 niveles anuncian su lugar nuevo (del 2 al 19)", lugares.length === 18 &&
    lugares[0][0] === 2 && lugares[lugares.length - 1][0] === 19, lugares.length + " anuncios");
  const nivel5 = abre.filter(e => e[0] === 5).map(e => e[1]).join(" · ");
  ok("el nivel 5 —el del hueco— ya no está mudo", /lugar/.test(nivel5), "Nv. 5: " + nivel5);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: ningún nivel de Ganadería vuelve a quedar mudo.\n");
process.exit(fallos ? 1 : 0);
