/* CADA PLANO LO ABRE QUIEN LO ALIMENTA (19/8, dirección: "lo recomendado")
   La regla, que es la que hace que esto sea decidible y no opinable:
     · un edificio que ABRE un oficio no puede pedir ese oficio (sería circular);
     · un edificio que PROCESA lo de otro oficio se le pide AL OFICIO QUE LO ALIMENTA.
   Este test vigila las tres cosas que pueden romperse en silencio: que ningún plano quede detrás de
   una puerta que necesita el propio edificio para abrirse, que el TUTORIAL siga entregando los suyos
   por paso (y no por skill, o el jugador nuevo se queda encerrado), y que ningún edificio se quede
   sin puerta de ningún tipo.
     node tools/test-planos-oficio.js                                                             */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={BUILD_DEF,PLANO_NIVEL,PLANO_OFICIO,PLANO_PASO,FARM_EDIF2,EDIF2_OFICIO,TUTO_STEPS,SKILL_DEFS,skillNeed,CROP_DEF};", ctx);
/* El juego avisa por pantalla cuando cae un plano: acá no hay pantalla, así que se le prestan las
   funciones de UI que toca. Son ganchos de aviso, no de lógica — no cambian ninguna puerta. */
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx"].forEach(f => { if (typeof ctx[f] !== "function") ctx[f] = () => {}; });
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const acum = (n, sk) => { let a = 0; for (let i = 1; i < n; i++) a += X.skillNeed(i, sk); return a; };
const subir = (sk, lvl) => { G.skills[sk] = acum(lvl, sk); };

console.log("\nLAS DOS PUERTAS, SIN HUÉRFANOS NI DOBLES");
{
  const todos = Object.keys(X.BUILD_DEF);
  const sinPuerta = todos.filter(t => !X.PLANO_NIVEL[t] && !X.PLANO_OFICIO[t]);
  ok("todo edificio tiene una puerta", !sinPuerta.length, sinPuerta.join(", ") || todos.length + " edificios");
  const dobles = todos.filter(t => X.PLANO_NIVEL[t] && X.PLANO_OFICIO[t]);
  /* Si un plano estuviera en las dos tablas, el nivel de granja lo regalaría por la espalda y la
     puerta del oficio no serviría de nada — el fallo sería invisible porque el jugador RECIBE el
     plano igual, solo que antes de tiempo. */
  ok("ninguno está en las dos tablas a la vez", !dobles.length, dobles.join(", "));
  ok("el Granero se queda con 3 planos", Object.keys(X.PLANO_NIVEL).length === 3, Object.keys(X.PLANO_NIVEL).join(", "));
  ok("y 4 se mudaron a su oficio", Object.keys(X.PLANO_OFICIO).length === 4, Object.keys(X.PLANO_OFICIO).join(", "));
}

console.log("\nNADA CIRCULAR: ningún edificio se pide a sí mismo");
{
  /* El mapa de qué oficio ARRANCA en cada edificio. Si el plano de la Cocina pidiera Cocina, o el
     del Establo pidiera Ganadería, el jugador no podría abrirlo NUNCA: para subir ese oficio hace
     falta el edificio que el oficio cierra. Es el error que hace que un modelo así se caiga. */
  const ARRANCA = { cocina: "cooking", establo: "ganaderia", store: "crafting" };
  const malos = Object.keys(X.PLANO_OFICIO).filter(t => ARRANCA[t] === X.PLANO_OFICIO[t][0]);
  ok("ningún plano pide el oficio que ese mismo edificio abre", !malos.length, malos.join(", "));
  ok("la Cocina nivel 2 SÍ puede pedir Cocina", X.EDIF2_OFICIO.cocina && X.EDIF2_OFICIO.cocina[0] === "cooking",
    "no es circular: mejorar a quien ya practica");
}

console.log("\nEL TUTORIAL NO DEPENDE DE NINGUNA SKILL");
{
  /* Los planos de la cadena caen por PASO, no por puerta. Si esto se rompe, el jugador nuevo llega
     al paso "colocá el plano del Horno" sin tener el plano, y ahí se acaba la partida. */
  const enCadena = Object.keys(X.PLANO_PASO).filter(t => X.TUTO_STEPS.some(s => s.id === X.PLANO_PASO[t]));
  ok("los planos del tutorial caen por paso", enCadena.length >= 3, enCadena.join(", "));
  G.skills = { farming: 0, mining: 0, tala: 0, fishing: 0, ganaderia: 0, cooking: 0, crafting: 0, sword: 0, hacha: 0, mazo: 0, range: 0 };
  G.level = 1; G.planos = {}; G.built = {}; G.obras = {};
  G.tuto = { step: X.TUTO_STEPS.findIndex(s => s.id === "place_horno"), done: false };
  ctx.planosSync(true);
  ok("con TODAS las skills a cero, el plano del Horno llega en su paso", !!(G.planos && G.planos.horno));
  G.tuto.step = X.TUTO_STEPS.findIndex(s => s.id === "place_cocina");
  ctx.planosSync(true);
  ok("y el de la Cocina también", !!(G.planos && G.planos.cocina));
}

console.log("\nFUERA DEL TUTORIAL MANDA EL OFICIO");
{
  G.tuto = { step: 99, done: true };
  G.level = 50; G.planos = {}; G.built = {}; G.obras = {};
  G.skills = { farming: 0, mining: 0, tala: 0, fishing: 0, ganaderia: 0, cooking: 0, crafting: 0, sword: 0, hacha: 0, mazo: 0, range: 0 };
  ctx.planosSync(true);
  /* Con la granja al 50 y los oficios a cero: los tres del Granero llegan, los cuatro del oficio NO.
     Antes de este cambio llegaban los siete y el oficio no pintaba nada. */
  ok("con la granja al 50 y los oficios a 0 llegan solo los 3 del Granero",
    Object.keys(G.planos).sort().join(",") === Object.keys(X.PLANO_NIVEL).sort().join(","),
    Object.keys(G.planos).join(", "));
  Object.keys(X.PLANO_OFICIO).forEach(t => {
    const [sk, lvl] = X.PLANO_OFICIO[t];
    subir(sk, lvl); ctx.planosSync(true);
    ok("el plano de " + X.BUILD_DEF[t].label + " llega con " + sk + " " + lvl, !!G.planos[t]);
  });
}

console.log("\nLAS MEJORAS DE NIVEL 2");
{
  G.edif2 = {}; G.skills.mining = 0; G.skills.cooking = 0;
  ctx.edif2Sync(true);
  ok("a oficio cero, ninguna mejora", !Object.keys(G.edif2).length);
  subir("mining", X.EDIF2_OFICIO.horno[1]); ctx.edif2Sync(true);
  ok("Horno nivel 2 con Minería " + X.EDIF2_OFICIO.horno[1], !!G.edif2.horno);
  /* La Cocina lleva su propia tabla de niveles (COOK_LVLS), no la curva de oficios: si edif2Sync
     preguntara con skillInfo, la puerta se abriría a destiempo. nivelOficio() lo resuelve adentro. */
  G.skills.cooking = ctx.COOK_LVLS[X.EDIF2_OFICIO.cocina[1]]; ctx.edif2Sync(true);
  ok("Cocina nivel 2 con Cocina " + X.EDIF2_OFICIO.cocina[1], !!G.edif2.cocina,
    "leyendo la tabla propia de la Cocina");
  ok("el Altar sigue colgando del Granero", X.FARM_EDIF2[27] === "altar");
}

console.log("\nEL PANEL DE OFICIOS DICE QUÉ ESPERA");
{
  G.skills.mining = 0;
  const p = ctx.oficioProximo("mining");
  ok("Minería anuncia su próximo escalón", /Nv\. \d/.test(p), p);
  ok("y la Tala no anuncia nada (es una decisión)", ctx.oficioProximo("tala") === "");
  const tope = ctx.oficioAbre("mining").slice(-1)[0][0];
  subir("mining", tope + 1);
  ok("al agotar la escalera no promete humo", ctx.oficioProximo("mining") === "");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ cada plano lo abre quien lo alimenta\n");
process.exit(fallos ? 1 : 0);
