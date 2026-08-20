/* EL JUGADOR QUE SE VA A HACER OTRA COSA MIENTRAS CRECEN LAS PAPAS (19/8, dirección)
   "Si el jugador se pone a talar, a picar, a juntar los montículos o a pescar mientras la misión
    del tutorial sigue siendo cosechar patatas, ¿luego detecta que ya lo hizo?"
   Los tests anteriores probaban cada paso POR SEPARADO, que es más fácil y menos parecido a la
   realidad. Éste reproduce la escena entera: cuenta nueva, papas plantadas, y en esos tres minutos
   el jugador se va a talar, picar, cavar y pescar. Después se recorre la cadena entera y se mira
   cuáles pasos se dan por hechos solos y cuáles le vuelven a pedir lo que ya hizo.
   La diferencia importa: un paso que reaparece después de haberlo cumplido es de lo que más
   desconcierta a un jugador nuevo — le dice que el juego no lo estaba mirando.
     node tools/test-tutorial-desvio.js                                                           */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "refreshForge", "refreshEquip",
 "applyCombatHp", "tutoAviso", "syncCobertizo"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={TUTO_STEPS,TUTO_CAPS,EXCAV_POR_DIA,BUILD_DEF,XP_PEZ,CROP_DEF};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* ---- LA ESCENA: cuenta nueva, paso "cosechá tus 3 papas", y el jugador se va por ahí ---- */
G.tuto = { step: X.TUTO_STEPS.findIndex(s => s.id === "harvest"), done: false, n: 0 };
G.plots = [{ state: "growing" }, { state: "growing" }, { state: "growing" }];
G.res = {}; G.skills = { farming: 0, mining: 0, tala: 0, fishing: 0, ganaderia: 0, cooking: 0,
  crafting: 0, sword: 0, hacha: 0, mazo: 0, range: 0 };
G.excav = { dia: "hoy", hechos: [] };

console.log("\nMIENTRAS CRECEN LAS PAPAS, EL JUGADOR SE VA A…");
{
  /* Taló 20 y picó 10 — más de lo que el tutorial le va a pedir para la Herrería y el Horno. */
  G.res.madera = 20; G.res.piedra = 10; G.skills.tala = 200; G.skills.mining = 100;
  console.log("      taló 20 de madera y picó 10 de piedra");
  /* Cavó los tres montículos del día: tres lombrices. */
  G.excav.hechos = [0, 1, 2]; G.res.lombriz = 3;
  console.log("      cavó los " + X.EXCAV_POR_DIA + " montículos");
  /* Y tiró la caña una vez. */
  G.skills.fishing = X.XP_PEZ; G.fish = { comun: 1 }; G.res.lombriz = 2;
  console.log("      y pescó un pez");
  ok("el paso activo sigue siendo el suyo", (ctx.tutoActivo() || {}).id === "harvest",
    "irse a hacer otra cosa no lo mueve de lugar");
}

console.log("\nY CUANDO LA CADENA LLEGA A ESO, ¿SE LO PIDE OTRA VEZ?");
{
  /* Se recorre la cadena entera como la recorrería el jugador: en cada paso se le da la
     oportunidad al juego de darlo por hecho, y se anota si lo hizo. */
  /* OJO CON LA CONTABILIDAD, que la primera versión de este test la tuvo mal y me hizo "encontrar"
     dos fallos que no existían: tutoAutoSkip() no salta UN paso, salta TODOS los que estén hechos
     de corrido. Si se anota solo el paso que estaba activo al empezar la vuelta, los demás quedan
     sin registrar y parece que el juego se los volvió a pedir. Hay que mirar el ÍNDICE antes y
     después y contar todo el tramo. */
  const saltados = [], pedidos = [];
  for (let i = 0; i < X.TUTO_STEPS.length + 2; i++) {
    const st = ctx.tutoActivo(); if (!st) break;
    const antes = G.tuto.step;
    ctx.tutoAutoSkip(); ctx.tutoCheckRes(); ctx.tutoAutoSkip();
    const despues = G.tuto.step;
    if (despues > antes) {                      // el juego los dio por hechos: TODO el tramo
      for (let k = antes; k < Math.min(despues, X.TUTO_STEPS.length); k++) saltados.push(X.TUTO_STEPS[k].id);
      if (G.tuto.done || despues >= X.TUTO_STEPS.length) break;
      continue;
    }
    /* No se cumplió solo: se anota y se avanza a mano, como si el jugador lo hiciera. */
    pedidos.push(st.id);
    G.tuto.step++; G.tuto.n = 0;
    if (G.tuto.step >= X.TUTO_STEPS.length) break;
  }
  console.log("      se dieron por hechos: " + (saltados.join(", ") || "ninguno"));

  /* Lo que el jugador YA HIZO no puede volver a pedírsele. Éstos son los cuatro desvíos. */
  ok("no le vuelve a pedir la madera que ya talÓ", saltados.includes("wood_st"),
    "20 en la bolsa, la Herrería pide " + X.BUILD_DEF.store.cost.madera);
  ok("ni la piedra que ya picó", saltados.includes("stone_st"),
    "10 en la bolsa, la Herrería pide " + X.BUILD_DEF.store.cost.piedra);
  ok("ni cavar un montículo", saltados.includes("excavar"));
  ok("ni tirar la caña", saltados.includes("fish"));
  /* Y los que sí tiene que pedirle, porque no los hizo, siguen ahí. */
  ok("pero sigue pidiéndole construir la Herrería", pedidos.includes("build_store"),
    "eso no lo hizo y no se lo regala");
  ok("y forjar la espada", pedidos.includes("craftarm"));
}

console.log("\nEL CASO FEO: CAVAR SE OLVIDA AL DÍA SIGUIENTE");
{
  /* Los montículos se reinician cada día (excavEstado borra `hechos` al cambiar la fecha). Si el
     jugador cavó el lunes y llega al paso el miércoles, "ya cavaste hoy" es falso — y sin red,
     el juego le pediría algo que aprendió hace dos días. Por eso el detector mira TRES cosas. */
  G.tuto = { step: X.TUTO_STEPS.findIndex(s => s.id === "excavar"), done: false, n: 0 };
  G.excav = { dia: "otro-dia", hechos: [] };          // pasó el día: la cuenta volvió a cero
  G.res = { lombriz: 2 }; G.skills.fishing = 0;
  ok("con lombrices en la bolsa, lo da por sabido", ctx.tutoHecho(ctx.tutoActivo()),
    "las cavó ayer y le sobraron");
  G.res = {}; G.skills.fishing = X.XP_PEZ;
  ok("y si las gastó pescando, también", ctx.tutoHecho(ctx.tutoActivo()),
    "haber pescado prueba que consiguió carnada");
  G.res = {}; G.skills.fishing = 0;
  ok("solo se lo pide a quien de verdad nunca cavó", !ctx.tutoHecho(ctx.tutoActivo()));
}

console.log("\nY AL REVÉS: NADA SE REGALA POR ERROR");
{
  /* La otra mitad de la pregunta. Un detector demasiado generoso es igual de malo: saltea pasos
     que el jugador nunca hizo y lo deja sin aprender la mitad del juego. */
  G.tuto = { step: 0, done: false, n: 0 };
  G.res = {}; G.plots = []; G.excav = { dia: "hoy", hechos: [] };
  G.skills = { farming: 0, mining: 0, tala: 0, fishing: 0, ganaderia: 0, cooking: 0, crafting: 0,
    sword: 0, hacha: 0, mazo: 0, range: 0 };
  G.weapons = {}; G.gear = {}; G.expansiones = 0; G.editVisto = false; G.stats = {};
  G.built = {}; G.obras = {}; G.planos = {}; G.dishes = {}; G.kitReclamado = false;
  G.plotsOwned = 3; G.seeds = {}; G.firstCropDone = false; G.vales = 0; G.buffs = [];
  ctx.tutoAutoSkip();
  ok("una cuenta recién creada arranca en el paso 1", (G.tuto.step || 0) === 0,
    "« " + (ctx.tutoActivo() || {}).txt + " »");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ el juego estaba mirando: lo que hizo por su cuenta, cuenta\n");
process.exit(fallos ? 1 : 0);
