/* CADA OFICIO ABRE SU ESCALÓN (18/8)
   Dirección: "la skill de cultivo te desbloquea las semillas; la minería, poder minar diferentes
   minerales. Está bien que la tala de por sí no te desbloquee nada."
   Desde que las EXPANSIONES son la única fuente de nodos, los oficios se quedaron sin trabajo si no
   abren el material. Este test vigila las puertas nuevas (minería, ganadería) y la que
   ya existía (cultivo), y que sigan siendo escaleras: un escalón por nivel, siempre hacia arriba y
   alcanzables. La TALA y la PESCA no aparecen: sus oficios son una medida, no una puerta.
     node tools/test-escalones-oficio.js                                                          */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={ORE_ORDER,ORE_DEF,ANIMAL_ORDER,ANIMAL_DEF,CROP_ORDER,CROP_DEF,PICK_ORDER,PICK_DEF,SKILL_DEFS,skillNeed,CD};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const acum = (n, sk) => { let a = 0; for (let i = 1; i < n; i++) a += X.skillNeed(i, sk); return a; };
const subir = (sk, lvl) => { G.skills[sk] = acum(lvl, sk); };

console.log("\nMINERÍA — abre los minerales");
{
  subir("mining", 1);
  const abiertos = X.ORE_ORDER.filter(k => ctx.oreUnlocked(k));
  ok("a nivel 1 solo la piedra", abiertos.length === 1 && abiertos[0] === "piedra", abiertos.join(", "));
  const req = X.ORE_ORDER.map(k => ctx.oreNivelReq(k));
  ok("los 6 minerales caen en 6 niveles distintos", new Set(req).size === req.length, req.join(","));
  ok("y la escalera solo sube", req.every((v, i) => i === 0 || v > req[i - 1]));
  subir("mining", Math.max.apply(null, req));
  ok("con la skill al tope están los 6", X.ORE_ORDER.every(k => ctx.oreUnlocked(k)));
  /* LAS DOS PUERTAS NO SE PISAN. El pico sigue mandando sobre lo que la herramienta aguanta (y con
     ello el coste que sostiene el ancla); la skill manda sobre lo que sabés hacer. Si un mineral
     pidiera un pico que ni existe, la puerta de la skill sería decorativa. */
  const topePico = Math.max.apply(null, X.PICK_ORDER.map(p => X.PICK_DEF[p].mineTier));
  ok("todo mineral con puerta de skill tiene un pico que lo alcanza",
    X.ORE_ORDER.every(k => X.ORE_DEF[k].tier <= topePico));
}

console.log("\nGANADERÍA — abre los animales");
{
  const req = X.ANIMAL_ORDER.map(k => ctx.animalNivelReq(k));
  ok("los " + X.ANIMAL_ORDER.length + " animales caen en niveles distintos", new Set(req).size === req.length, req.join(","));
  ok("y la escalera solo sube", req.every((v, i) => i === 0 || v > req[i - 1]));
  subir("ganaderia", 1);
  ok("a nivel 1 solo el primero", X.ANIMAL_ORDER.filter(k => ctx.animalUnlocked(k)).length === 1);
  subir("ganaderia", Math.max.apply(null, req));
  ok("con la skill al tope están todos", X.ANIMAL_ORDER.every(k => ctx.animalUnlocked(k)));
  /* NADIE SE QUEDA SIN NADA QUE HACER: el primer escalón de cada oficio está en el nivel 1, o el
     jugador abre el establo/la caña y se encuentra una lista entera en gris. */
  ok("cultivo, minería y ganadería arrancan con un escalón abierto",
    X.CROP_DEF.papa.lvl === 1 && ctx.oreNivelReq("piedra") === 1 && ctx.animalNivelReq(X.ANIMAL_ORDER[0]) === 1);
}

console.log("\nLA TALA Y LA PESCA NO SON PUERTAS");
{
  /* La madera es plana por DECISIÓN: sin rarezas ni derivados. La Pesca es distinto — ahí se
     probó a cerrar las rarezas y hubo que deshacerlo: con un tiro que cuesta 15 y un común que
     vale 5, cualquier recorte por arriba deja la laguna por debajo de su coste (a Pesca 1 daba
     −40 plata/h). Las dos quedan como oficios que MIDEN la práctica.
     Este test existe para que nadie vuelva a poner la puerta sin volver a hacer la cuenta. */
  ok("no hay ninguna función que cierre madera por nivel de tala",
    typeof ctx.maderaUnlocked !== "function");
  ok("ni ninguna que cierre peces por nivel de pesca",
    typeof ctx.pezUnlocked !== "function" && typeof ctx.pezNivelReq !== "function");
  ok("y el sorteo de la laguna no mira ninguna skill",
    !/pezUnlocked|nivelOficio\("fishing"\)/.test(require("fs").readFileSync("public/game/state.js", "utf8").split("function goFishing")[1].slice(0, 2000)));
}

console.log("\nLOS OFICIOS QUE ABREN ALGO SIGUEN SIENDO ALCANZABLES");
{
  /* 19/8: los ritmos ya no se copian a mano acá — se le preguntan al juego (skillRitmo), que es la
     misma cuenta que usa la curva de XP. Antes esta línea llevaba "ganaderia: 60" inventado, y por
     eso el test daba por bueno que el toro estaba a 30 h cuando de verdad estaba a 15 días. Una
     regla escrita a mano en la herramienta que mide es la forma más silenciosa de mentirse. */
  const REF = 3 * 3600 / X.CD.tree * 10;
  const horas = {}; ["mining", "ganaderia", "farming"].forEach(k => horas[k] = REF * ctx.skillRitmo(k));
  const tope = {
    mining: Math.max.apply(null, X.ORE_ORDER.map(k => ctx.oreNivelReq(k))),
    ganaderia: ctx.animalNivelReq(X.ANIMAL_ORDER[X.ANIMAL_ORDER.length - 1]),
    farming: X.CROP_DEF.maiz.lvl
  };
  Object.keys(tope).forEach(sk => {
    const h = acum(tope[sk], sk) / horas[sk];
    ok("el último escalón de " + sk + " está a " + h.toFixed(1) + " h de práctica", h > 0 && h < 24 * 30,
      "nivel " + tope[sk]);
  });
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ cada oficio abre su escalón\n");
process.exit(fallos ? 1 : 0);
