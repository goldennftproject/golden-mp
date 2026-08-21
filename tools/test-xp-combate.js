/* LA XP DE COMBATE, ANCLADA POR EL DISEÑADOR: LA RATA DA 5 (21/8)
   Dirección, vía Discord: "la exp está re subida, la rata da 100". Medido: con 100, UNA rata te
   ponía en Combate nivel 3 (la curva pide 89 acumulada) y cinco ratas daban el hito de vida del
   nivel 5. La tabla del bestiario venía del doc maestro del 2/8 y nunca se reconcilió con la
   curva 21×N^1.7.
   El diseñador fijó el ancla: LA RATA DA 5. Su forma (xp proporcional a la vida, con premio en
   los jefes) se conserva entera: todo el bestiario reescalado ÷20.
     node tools/test-xp-combate.js                                                                */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["toast", "log", "isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.saveFarm = () => {};
const G = ctx.G;
const MD = vm.runInContext("MONSTER_DEF", ctx);
const need = (n) => vm.runInContext("skillNeed(" + n + ")", ctx);
const acumulada = (nv) => { let a = 0; for (let n = 1; n < nv; n++) a += need(n); return a; };

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL ANCLA DEL DISEÑADOR");
ok("la rata da 5 XP", MD.rata.xp === 5, MD.rata.xp + "");
ok("y UNA rata ya no regala niveles: sigue siendo nivel 1", 5 < need(1), "nivel 2 pide " + need(1) + " y la rata da 5");
{
  const ratas5 = Math.ceil(acumulada(5) / MD.rata.xp), ratas10 = Math.ceil(acumulada(10) / MD.rata.xp);
  ok("el hito del nivel 5 cuesta trabajo de verdad", ratas5 >= 60, ratas5 + " ratas (antes: 5)");
  ok("y el del nivel 10 también", ratas10 >= 400, ratas10 + " ratas (antes: 34)");
}

console.log("\nLA FORMA DEL DISEÑADOR SE CONSERVA");
{
  /* la forma se mide contra LA TABLA ORIGINAL del diseñador: cada bicho debe conservar su ratio
     xp/hp de siempre dividido por 20 (el doc maestro iba de 7 a 18,6 → acá de 0,35 a 0,93; la
     babita, cría del split, siempre estuvo por debajo y lleva el piso de 3). */
  const ORIG = { rata: 100, murcielago: 130, larva: 180, baba: 250, babita: 50, arana: 340, goblin: 430,
    orco: 500, lancero: 800, guerrero: 1100, esqueleto: 640, golem: 900, hombre_lobo: 1300, troll: 1400,
    ogro: 2000, espectro: 2700, demonio: 3900, dragon: 14000 };
  const malas = [];
  for (const k in ORIG) {
    const esperado = Math.max(3, Math.round(ORIG[k] / 20));
    if (MD[k].xp !== esperado) malas.push(k + " (da " + MD[k].xp + ", la forma pide " + esperado + ")");
  }
  ok("los 18 bichos conservan EXACTA la forma del doc maestro, ÷20", !malas.length, malas.join(" · ") || "toda la tabla, desde el ancla de la rata");
  /* nota: la tabla NO es monótona ni por nivel ni por vida — y no debe serlo: el diseñador
     precia el PELIGRO (el esqueleto arquero y el espectro pagan por su habilidad, no por su
     vida). La comprobación de forma exacta de arriba ya clava los 18 valores. */
}

console.log("\nY LA XP SE COBRA DE VERDAD AL MATAR");
{
  G.combatXp = 0;
  ctx.addCombatXp(MD.rata.xp);
  ok("matar una rata suma exactamente 5", G.combatXp === 5, G.combatXp + "");
  for (let i = 0; i < 200; i++) ctx.addCombatXp(MD.rata.xp);
  const info = ctx.combatInfo();
  ok("doscientas ratas después, el nivel es coherente con la curva", info.lvl >= 4 && info.lvl <= 6,
    "nivel " + info.lvl + " con " + G.combatXp + " XP");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la rata da 5 y el bestiario entero respira con ella.\n");
process.exit(fallos ? 1 : 0);
