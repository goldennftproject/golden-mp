/* EL ÁLBUM DE LA GRANJA (23/8)
   Los logros premian VOLUMEN; el álbum premia VARIEDAD: la primera vez de cada cosa.
   Contratos:
     · seis familias (cultivos, peces, platos, minerales, animales, bestiario) y todas las
       piezas del juego adentro — si mañana se agrega un cultivo, aparece solo;
     · se lee de contadores que YA existen: cero estado nuevo que guardar (y por eso el F5
       no puede perder la colección, ni una partida vieja empieza vacía);
     · la primera vez revela la lámina, y las demás veces no cambian nada;
     · el progreso total y el de cada familia cuadran.
     node tools/test-album.js                                                                  */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshBarn", "recalcFarmLevel", "syncSlots"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;
const CROP_ORDER = vm.runInContext("CROP_ORDER", ctx), FISH_ORDER = vm.runInContext("FISH_ORDER", ctx),
      RECIPE_ORDER = vm.runInContext("RECIPE_ORDER", ctx), ORE_ORDER = vm.runInContext("ORE_ORDER", ctx),
      ANIMAL_ORDER = vm.runInContext("ANIMAL_ORDER", ctx), MONSTER_ORDER = vm.runInContext("MONSTER_ORDER", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const fam = (id) => ctx.albumLista().find(f => f.id === id);
const limpio = () => { G.stats = {}; G.res = {}; G.fish = {}; G.dishes = {}; G.animals = {}; };

console.log("\nEL ÁLBUM ENTERO: SEIS FAMILIAS Y TODAS LAS PIEZAS DEL JUEGO");
{
  limpio();
  const l = ctx.albumLista();
  ok("son 6 familias", l.length === 6, l.map(f => f.id).join(" "));
  ok("cultivos: las " + CROP_ORDER.length + " semillas", fam("cultivos").total === CROP_ORDER.length);
  ok("peces: los " + FISH_ORDER.length, fam("peces").total === FISH_ORDER.length);
  ok("platos: las " + RECIPE_ORDER.length + " recetas", fam("platos").total === RECIPE_ORDER.length);
  ok("minerales: los " + ORE_ORDER.length, fam("minerales").total === ORE_ORDER.length);
  ok("animales: los " + ANIMAL_ORDER.length, fam("animales").total === ANIMAL_ORDER.length);
  ok("bestiario: los " + MONSTER_ORDER.length + " bichos", fam("bestiario").total === MONSTER_ORDER.length);
  const p = ctx.albumProgreso();
  ok("de cero, el álbum arranca vacío", p.hechas === 0 && p.pct === 0, JSON.stringify(p));
  ok("y el total es la suma de las seis familias",
    p.total === CROP_ORDER.length + FISH_ORDER.length + RECIPE_ORDER.length + ORE_ORDER.length + ANIMAL_ORDER.length + MONSTER_ORDER.length,
    String(p.total));
  ok("cada pieza trae nombre para la lámina", ctx.albumLista().every(f => f.piezas.every(x => x.nom && x.nom.length > 1)));
}

console.log("\nLA PRIMERA VEZ REVELA — Y LAS DEMÁS NO CAMBIAN NADA");
{
  limpio();
  ctx.statAdd("cosechar", "papa", 1);
  ok("cosechar una papa revela la papa", fam("cultivos").piezas.find(p => p.k === "papa").visto);
  ok("y solo esa (el resto sigue en silueta)", fam("cultivos").hechas === 1);
  const antes = ctx.albumProgreso().hechas;
  for (let i = 0; i < 20; i++) ctx.statAdd("cosechar", "papa", 1);
  ok("veinte papas más no revelan nada nuevo", ctx.albumProgreso().hechas === antes);
  /* cada familia con su acción real */
  ctx.statAdd("pescar", "epico", 1);
  ok("pescar un épico revela el épico", fam("peces").piezas.find(p => p.k === "epico").visto);
  ctx.statAdd("cocinar", RECIPE_ORDER[3], 1);
  ok("cocinar un plato revela su lámina", fam("platos").hechas === 1);
  ctx.statAdd("minar", "bronce", 1);
  ok("picar bronce revela el bronce", fam("minerales").piezas.find(p => p.k === "bronce").visto);
  ctx.statAdd("matar", MONSTER_ORDER[2], 1);
  ok("vencer un bicho lo mete en el bestiario", fam("bestiario").hechas === 1);
  ctx.statAdd("alimentar", ANIMAL_ORDER[0], 1);
  ok("alimentar un animal lo revela", fam("animales").hechas === 1);
}

console.log("\nSIN ESTADO NUEVO: LO QUE TENÉS EN LA BOLSA YA CUENTA");
{
  limpio();
  G.res.diamante = 3;
  ok("un diamante en la bolsa revela el diamante (aunque el contador esté en cero)",
    fam("minerales").piezas.find(p => p.k === "diamante").visto);
  G.fish.legendario = 1;
  ok("un pez legendario en la bolsa revela su lámina", fam("peces").piezas.find(p => p.k === "legendario").visto);
  G.dishes[RECIPE_ORDER[0]] = 1;
  ok("un plato en la bolsa revela su receta", fam("platos").piezas.find(p => p.k === RECIPE_ORDER[0]).visto);
  /* y sobrevive al F5 sin guardar nada propio */
  const antes = JSON.stringify(ctx.albumProgreso());
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  ok("tras el F5 el álbum es el mismo", JSON.stringify(ctx.albumProgreso()) === antes, antes);
  ok("y el guardado NO lleva un campo 'album' (se deriva, no se guarda)",
    !Object.prototype.hasOwnProperty.call(ctx.snapshot(), "album"));
}

console.log("\nEL PROGRESO CUADRA");
{
  limpio();
  CROP_ORDER.forEach(k => ctx.statAdd("cosechar", k, 1));
  ok("con todos los cultivos, esa familia está completa", fam("cultivos").hechas === fam("cultivos").total);
  const p = ctx.albumProgreso();
  const suma = ctx.albumLista().reduce((a, f) => a + f.hechas, 0);
  ok("el total del álbum es la suma de las familias", p.hechas === suma, p.hechas + " = " + suma);
  ok("y el porcentaje sale de esa cuenta", p.pct === Math.round(p.hechas / p.total * 100), p.pct + "%");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la colección espera sus láminas.\n");
process.exit(fallos ? 1 : 0);
