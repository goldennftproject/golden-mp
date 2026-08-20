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

console.log("\n3. Y EL CARTEL LO INTERCALA MIENTRAS ESPERÁS");
{
  /* Que se PUEDA no alcanza: el jugador nuevo lee un objetivo por vez y deduce que eso es todo lo
     que hay. Pero tampoco va una segunda línea —dirección: "no queda bien"—: es UNA línea que se
     turna entre el objetivo, con su cuenta atrás, y lo que se puede hacer ahora mismo. */
  ok("el juego sabe cuánto falta", typeof ctx.tutoEsperaSeg === "function");
  ok("y qué se puede hacer mientras", typeof ctx.tutoMientras === "function");

  G.tuto = { step: idx("harvest"), done: false };
  const ahora = Date.now();
  G.plots = [{ state: "growing", readyAt: ahora + 100000 }, { state: "growing", readyAt: ahora + 180000 }];
  ok("con las papas creciendo, hay cuenta atrás", ctx.tutoEsperaSeg() > 0,
    "faltan " + ctx.tutoEsperaSeg() + " s");
  ok("y mide la que llega ANTES, no la más lenta", Math.abs(ctx.tutoEsperaSeg() - 100) <= 2,
    "la primera en " + ctx.tutoEsperaSeg() + " s");
  G.plots = [{ state: "ready" }, { state: "growing", readyAt: ahora + 90000 }];
  ok("con una papa lista, no hay espera que anunciar", ctx.tutoEsperaSeg() === 0,
    "eso no es esperar, es trabajo pendiente");
  G.plots = [{ state: "dry" }];
  ok("y con las parcelas vacías, tampoco", ctx.tutoEsperaSeg() === 0);

  /* LA RONDA SOLO OFRECE LO QUE ESTÁ DISPONIBLE. Ésta es la parte que pidió dirección: "cada paso
     detecta si los anteriores están hechos o no". Nada de listas fijas. */
  G.plots = [{ state: "growing", readyAt: ahora + 120000 }];
  G.excav = { dia: "x", hechos: [] }; G.tools = { axe: 5, rod: 3 }; G.res = {};
  G.picks = { eq: null, dur: {} }; G.pescaHasta = 0; G.built = {}; G.gear = {};
  let m = ctx.tutoMientras();
  ok("con los montículos sin cavar, los ofrece", m.some(t => /montículo/i.test(t)), m.join(" · "));
  ok("y con hacha, ofrece talar", m.some(t => /talando/i.test(t)));
  ok("pero sin lombriz no manda a pescar", !m.some(t => /caña/i.test(t)), "la caña sin cebo es un viaje al pedo");
  ok("ni a picar sin pico equipado", !m.some(t => /roca/i.test(t)));

  G.excav = { dia: "x", hechos: [0, 1, 2] };
  m = ctx.tutoMientras();
  ok("con los tres montículos del día cavados, deja de nombrarlos", !m.some(t => /montículo/i.test(t)), m.join(" · "));

  G.res = { lombriz: 2 }; G.pescaHasta = 0;
  ok("con cebo y la laguna libre, ya ofrece pescar", ctx.tutoMientras().some(t => /caña/i.test(t)));
  G.pescaHasta = ahora + 600000;
  ok("y con la laguna descansando, la calla", !ctx.tutoMientras().some(t => /caña/i.test(t)),
    "el enfriamiento también cuenta");

  G.tools = { axe: 0, rod: 0 }; G.res = {}; G.excav = { dia: "x", hechos: [0, 1, 2] };
  G.picks = { eq: null, dur: {} }; G.built = {}; G.gear = {};
  ok("y si de verdad no hay nada que hacer, no inventa", ctx.tutoMientras().length === 0,
    "mejor callarse que mandar a hacer algo imposible");

  /* Y el objetivo nunca desaparece: es el primero de la ronda. */
  const UI = fs.readFileSync("public/game/ui.js", "utf8");
  ok("el objetivo es el primer turno de la ronda", /turno === 0/.test(UI) && /listo en/.test(UI),
    "y lleva la cuenta atrás pegada");
  ok("la segunda línea se fue", !/tuto-mientras/.test(UI), "una sola línea, como pidió dirección");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ se puede jugar en paralelo, cuenta lo adelantado y el cartel lo dice\n");
process.exit(fallos ? 1 : 0);
