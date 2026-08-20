/* ¿EL TUTORIAL DEJA JUGAR EN PARALELO, Y SE DA CUENTA SI YA LO HICISTE? (19/8, dirección)
   "Es muy estático y te hace hacer solo una cosa a la vez, cuando el jugador probablemente lo
    haga todo a la vez. Y si lo hace todo a la vez, ¿el tutorial detectará que ya lo hizo?"
   Son dos preguntas distintas y este test las separa:
     1. ¿EL JUEGO LO IMPIDE? No: el 14/8 se decidió que los objetivos son una guía opcional y
        tutoPermite devuelve siempre sí. Lo que se vigila acá es que siga siendo así — si alguien
        vuelve a enchufar el embudo, el juego pasa a bloquear talar mientras crece la papa.
     2. ¿SE DA CUENTA DE LO ADELANTADO? Los pasos de recurso leen la bolsa, así que la madera
        talada antes de tiempo ya cuenta; y los de acción tienen un detector de estado. Se prueba
        haciendo el trabajo ANTES y comprobando que el paso se salta solo.
     node tools/test-tutorial-paralelo.js                                                         */
const fs = require("fs"), vm = require("vm");
const SRC = fs.readFileSync("public/game/state.js", "utf8");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(SRC + "\n;this.X={TUTO_STEPS,TUTO_PERMISOS,CROP_DEF,CD,EXCAV_POR_DIA,BUILD_DEF};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const idx = id => X.TUTO_STEPS.findIndex(s => s.id === id);

console.log("\n1. EL JUEGO NO IMPIDE HACER VARIAS COSAS A LA VEZ");
{
  /* Ésta es la comprobación que de verdad importa, y es la que yo había estado midiendo mal: mi
     test anterior recorría TUTO_PERMISOS como si restringiera algo, cuando esa tabla es
     documentación desde el 14/8. Lo que hay que vigilar es la FUNCIÓN. */
  ok("tutoPermite no bloquea nada", /function tutoPermite\(tag\) \{ return true; \}/.test(SRC),
    "los objetivos son una guía, no un embudo");
  const gestos = ["chop", "mine", "fish", "excavar", "plant", "harvest", "sell", "buyseed", "cook", "obra"];
  X.TUTO_STEPS.forEach((s, i) => {
    G.tuto = { step: i, done: false };
    const bloqueado = gestos.filter(g => !ctx.tutoPermite(g));
    if (bloqueado.length) ok("paso " + (i + 1) + " · " + s.id, false, "bloquea " + bloqueado.join(", "));
  });
  ok("en los " + X.TUTO_STEPS.length + " pasos se puede talar, picar, cavar y pescar", true,
    "ningún paso estrangula la mano");
}

console.log("\n2. LO QUE HACÉS ADELANTADO CUENTA");
{
  /* El caso del jugador que, mientras espera las papas, se va a talar: cuando llegue el paso
     "juntá 8 de madera" ya la tiene, y el paso tiene que darse por hecho solo. */
  const paso = idx("wood_st");
  G.tuto = { step: paso, done: false }; G.res = { madera: 99 };
  const st = ctx.tutoActivo();
  ok("el paso de la madera lee la bolsa", ctx.tutoTiene(st) >= ctx.tutoNeed(st),
    "talaste antes: " + ctx.tutoTiene(st) + "/" + ctx.tutoNeed(st));
  ctx.tutoCheckRes();
  ok("y se cumple solo, sin pedirte que vuelvas a talar", (G.tuto.step || 0) > paso,
    "pasó al " + ((G.tuto.step || 0) + 1));

  /* Y los pasos de ACCIÓN: forjar el arma, equiparla, cavar, pescar, expandir, entregar. Si el
     jugador los hizo antes de que el cartel se lo pidiera, tutoAutoSkip los salta. */
  const adelantados = [
    ["craftarm", () => { G.weapons = { espada_madera: { dur: 80 } }; }],
    ["equiparm", () => { G.gear = { arma: "espada_madera" }; }],
    ["excavar",  () => { G.excav = { dia: "x", hechos: [0] }; }],
    ["fish",     () => { G.skills.fishing = 50; }],
    ["expandir", () => { G.expansiones = 1; }],
    ["editar",   () => { G.editVisto = true; }],
    ["pedido",   () => { G.stats = { pedido: { _: 1 } }; }],
  ];
  adelantados.forEach(([id, hacerlo]) => {
    const i = idx(id); if (i < 0) return;
    G.tuto = { step: i, done: false };
    hacerlo();
    const s2 = ctx.tutoActivo();
    ok("« " + (s2 ? s2.txt : id) + " » se salta si ya lo hiciste", ctx.tutoHecho(s2), id);
  });
}

console.log("\n3. Y EL CARTEL LO SUGIERE MIENTRAS ESPERÁS");
{
  /* Que se PUEDA no alcanza: el jugador nuevo lee un objetivo por vez y deduce que eso es todo
     lo que hay. La línea de "mientras tanto" solo aparece cuando el paso está esperando un reloj. */
  ok("existe la línea de sugerencia", typeof ctx.tutoMientras === "function");
  G.tuto = { step: idx("harvest"), done: false };
  G.plots = [{ state: "growing" }, { state: "growing" }, { state: "growing" }];
  G.excav = { dia: "x", hechos: [] }; G.tools = { axe: 10, rod: 5 }; G.res = {};
  const conEspera = ctx.tutoMientras();
  ok("con las papas creciendo, sugiere algo", !!conEspera, conEspera || "nada");

  /* Y CALLA cuando hay algo cosechable: el cartel no puede competir consigo mismo. */
  G.plots = [{ state: "ready" }, { state: "growing" }];
  ok("con una papa lista, se calla", !ctx.tutoMientras(), "primero cosechá");
  G.plots = [{ state: "dry" }];
  ok("y con las parcelas vacías, también", !ctx.tutoMientras(), "primero plantá");

  /* La sugerencia sigue el orden de lo que es GRATIS y está a mano: primero los montículos
     (tres por día, un clic, sin herramienta), después las herramientas. */
  G.plots = [{ state: "growing" }];
  G.excav = { dia: "x", hechos: [] };
  ok("primero manda a cavar, que es gratis", /montículo/i.test(ctx.tutoMientras() || ""), ctx.tutoMientras());
  G.excav = { dia: "x", hechos: [0, 1, 2] };
  ok("y con los montículos gastados, a talar", /talando|caña|vuelta/i.test(ctx.tutoMientras() || ""), ctx.tutoMientras());
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ se puede jugar en paralelo, cuenta lo adelantado y el cartel lo dice\n");
process.exit(fallos ? 1 : 0);
