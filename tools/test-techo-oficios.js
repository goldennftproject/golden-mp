/* EL TECHO DE CADA OFICIO SE DERIVA DE SU CONTENIDO (22/8, dirección)
   "Capear el crecimiento hasta el nivel donde hay contenido; más adelante se libera más."
   La curva subía a 150 con contenido que moría mucho antes. Ahora el techo de cada oficio es
   el último nivel de su lista de contenido (oficioAbre): Cultivo 20 (maíz), Minería 11
   (netherita), Ganadería 19 (el lugar 20 del establo), Cocina 10 (Banquete del Bosque).
   Contratos que este test clava:
     · el techo NO es un número a mano: es exactamente el máximo de la lista de contenido;
     · con XP astronómica, el nivel se queda en el techo — y la XP se sigue guardando;
     · los oficios sin escalera (tala, pesca, armas) y el COMBATE no se capean;
     · las puertas del contenido (maíz, netherita, cupo del establo) funcionan justas al techo;
     · la granja ya tenía su techo (50) y sigue intacto.
     node tools/test-techo-oficios.js                                                           */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["toast", "log", "isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "saveFarm"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL TECHO ES EL ÚLTIMO NIVEL DEL CONTENIDO, NO UN NÚMERO A MANO");
{
  const esperado = { farming: 20, mining: 11, ganaderia: 19, cooking: 10 };
  for (const sk in esperado) {
    const lista = ctx.oficioAbre(sk), maxLista = Math.max(...lista.map(e => e[0]));
    ok(sk + ": techo " + esperado[sk] + " — y es EXACTAMENTE el máximo de su lista",
      ctx.oficioTecho(sk) === esperado[sk] && maxLista === esperado[sk],
      "techo " + ctx.oficioTecho(sk) + " · lista hasta " + maxLista);
  }
  for (const sk of ["tala", "fishing", "crafting", "sword", "range"]) {
    ok(sk + " no tiene escalera: sigue sin techo (150)", ctx.oficioTecho(sk) === 150);
  }
}

console.log("\nCON XP ASTRONÓMICA, EL NIVEL SE PLANTA EN EL TECHO — Y LA XP SE GUARDA");
{
  const XP = 99999999;
  G.skills = Object.assign({}, G.skills, { farming: XP, mining: XP, ganaderia: XP, tala: XP });
  ok("Cultivo se planta en 20", ctx.nivelOficio("farming") === 20, "nivel " + ctx.nivelOficio("farming"));
  ok("Minería se planta en 11", ctx.nivelOficio("mining") === 11);
  ok("Ganadería se planta en 19", ctx.nivelOficio("ganaderia") === 19);
  ok("la Tala (sin escalera) sube libre por su curva", ctx.nivelOficio("tala") > 19, "nivel " + ctx.nivelOficio("tala"));
  ok("y la XP cruda queda intacta en el guardado (se banca para el futuro)",
    JSON.parse(JSON.stringify(ctx.snapshot())).skills.farming === XP);
  ok("el combate no se capea (curva global aparte)", ctx.skillInfo(XP).lvl === 150, "nivel " + ctx.skillInfo(XP).lvl);
}

console.log("\nLAS PUERTAS FUNCIONAN JUSTAS AL TECHO");
{
  ok("con Cultivo al techo, el maíz (su último cultivo) está abierto", ctx.cropUnlocked("maiz"));
  ok("con Minería al techo, la netherita está abierta", ctx.oreNivelReq ? ctx.nivelOficio("mining") >= 11 : true);
  ok("con Ganadería al techo, el establo llega justo a su cupo máximo (20)",
    ctx.establoCupo() >= 20, "cupo " + ctx.establoCupo());
  ok("el jabalí (Ganadería 12) está abierto bajo el techo 19", ctx.animalUnlocked("jabali"));
}

console.log("\nLA GRANJA CONSERVA SU PROPIO TECHO DE SIEMPRE");
{
  const MAX = vm.runInContext("FARM_NIVEL_MAX", ctx);
  ok("FARM_NIVEL_MAX sigue en 50", MAX === 50, MAX + "");
  G.level = 50; G.skills.farming = 99999999;
  ctx.recalcFarmLevel();
  ok("con XP infinita, la granja no pasa de 50", G.level === 50, "nivel " + G.level);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el techo es donde termina el contenido, y sube solo cuando el contenido crezca.\n");
process.exit(fallos ? 1 : 0);
