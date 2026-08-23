/* PESCA v2 — EL SISTEMA DE FISHING FRENZY (22/8, dirección)
   « Investígalo y cópialo. Lo único que sacaría es mantener presionado para tirar más lejos:
   con un clic simplemente tirás, porque cada tirada es un gusano. »
   Contratos de la lógica pura (state.js — la escena solo la dibuja):
     · el lance sortea la rareza con LA MISMA tabla que goFishing (60/25/12/3) y goFishing
       respeta esa rareza: la dificultad que peleás es el premio que cobrás;
     · espera → pique a los 1,6-4,2 s; hay 1 s para clavar; muy pronto o muy tarde = perdido;
     · en el carrete, con el pez adentro el progreso sube y afuera baja; llena gana, vacía pierde;
     · la zona de captura CRECE con el nivel de Pesca y los peces raros son más nerviosos;
     · un lance perdido NO toca la economía (ni gusano, ni caña, ni reloj): el ancla no se mueve;
     · ganar cobra por goFishing: el MISMO gusano, uso de caña, reloj y XP auditados de siempre.
     node tools/test-pesca-frenzy.js                                                            */
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
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "refreshBarn", "recalcFarmLevel", "tutoEvent", "avisoAccion"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const rndDe = (vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };   // rnd guionado

console.log("\nEL SORTEO DEL LANCE ES EL DE SIEMPRE — Y EL PREMIO COINCIDE CON LA PELEA");
{
  ok("0,10 → común",      ctx.pescaLanceNuevo(rndDe([0.10, 0.5])).rar === "comun");
  ok("0,70 → raro",       ctx.pescaLanceNuevo(rndDe([0.70, 0.5])).rar === "raro");
  ok("0,90 → épico",      ctx.pescaLanceNuevo(rndDe([0.90, 0.5])).rar === "epico");
  ok("0,99 → legendario", ctx.pescaLanceNuevo(rndDe([0.99, 0.5])).rar === "legendario");
  /* goFishing respeta la rareza del lance */
  G.tuto = { done: true }; G.res.lombriz = 5; G.tools = G.tools || {}; G.picks = G.picks || {};
  if (typeof ctx.toolAdd === "function") ctx.toolAdd("rod", 5); else G.tools.rod = 5;
  G.pescaHasta = 0; G.fish = { comun: 0, raro: 0, epico: 0, legendario: 0 };
  ctx.goFishing("legendario");
  ok("goFishing(\"legendario\") entrega EL legendario, no un re-sorteo", G.fish.legendario === 1,
    JSON.stringify(G.fish));
}

console.log("\nLA ESPERA Y EL PIQUE: 1 SEGUNDO PARA CLAVAR");
{
  const l = ctx.pescaLanceNuevo(rndDe([0.1, 0.5]));   // biteEn = 1,6 + 0,5·2,6 = 2,9 s
  ok("nace esperando", l.fase === "espera" && l.biteEn > 1.5 && l.biteEn < 4.3, l.biteEn.toFixed(2) + " s");
  ctx.pescaLanceTick(l, 1.0);
  ok("al segundo sigue esperando", l.fase === "espera");
  ok("clavar ANTES de las burbujas pierde el lance", ctx.pescaAnzuelo(l) === "perdido" && l.motivo === "pronto");
  const l2 = ctx.pescaLanceNuevo(rndDe([0.1, 0.5]));
  ctx.pescaLanceTick(l2, 3.0);
  ok("a los 3 s (pasado su biteEn) hay burbujas", l2.fase === "pique");
  ctx.pescaLanceTick(l2, 1.2);
  ok("dejar pasar el segundo de ventana también lo pierde", l2.fase === "perdido" && l2.motivo === "tarde");
  const l3 = ctx.pescaLanceNuevo(rndDe([0.1, 0.5]));
  ctx.pescaLanceTick(l3, 3.0);
  ok("clavar EN la ventana abre el carrete", ctx.pescaAnzuelo(l3, 1, rndDe([0.5, 0.5])) === "carrete" && l3.prog === 0.4);
}

console.log("\nEL CARRETE: ADENTRO LLENA, AFUERA DRENA");
{
  const quieto = () => 0.99;   // rnd alto: el pez casi no cambia de rumbo
  const l = ctx.pescaLanceNuevo(rndDe([0.1, 0.5]));
  ctx.pescaLanceTick(l, 3.0); ctx.pescaAnzuelo(l, 1, rndDe([0.5]));
  l.rumbo = 0.5; l.pez = 0.5; l.zona = 0.5;   // pez y zona alineados
  let r = "sigue", vueltas = 0;
  while (r === "sigue" && vueltas++ < 500) {
    // sostener la zona sobre el pez: apretar si está abajo, soltar si está arriba
    r = ctx.pescaReelTick(l, 1 / 30, l.zona < l.pez, quieto);
  }
  ok("siguiendo al pez, el lance se GANA", r === "gana", vueltas + " frames (" + (vueltas / 30).toFixed(1) + " s)");
  const l2 = ctx.pescaLanceNuevo(rndDe([0.1, 0.5]));
  ctx.pescaLanceTick(l2, 3.0); ctx.pescaAnzuelo(l2, 1, rndDe([0.5]));
  l2.pez = 0.9; l2.zona = 0.1; l2.rumbo = 0.9;   // pez arriba, zona abandonada abajo
  r = "sigue"; vueltas = 0;
  while (r === "sigue" && vueltas++ < 500) r = ctx.pescaReelTick(l2, 1 / 30, false, quieto);
  ok("sin seguirlo, el pez se ESCAPA", r === "perdido" && l2.motivo === "escapo", (vueltas / 30).toFixed(1) + " s");
}

console.log("\nEL OFICIO SE SIENTE EN LAS MANOS Y LA RAREZA EN LOS NERVIOS");
{
  ok("la zona de captura crece con el nivel de Pesca",
    ctx.pescaZonaAlto(10) > ctx.pescaZonaAlto(1),
    (ctx.pescaZonaAlto(1) * 100).toFixed(0) + "% → " + (ctx.pescaZonaAlto(10) * 100).toFixed(0) + "%");
  ok("y tiene techo (no se vuelve trivial)", ctx.pescaZonaAlto(99) <= 0.40);
  const D = vm.runInContext("PESCA2_DIF", ctx);
  ok("cada rareza es más rápida que la anterior",
    D.comun.vel < D.raro.vel && D.raro.vel < D.epico.vel && D.epico.vel < D.legendario.vel);
  ok("y más nerviosa", D.comun.nervio < D.raro.nervio && D.epico.nervio < D.legendario.nervio);
}

console.log("\nUN LANCE PERDIDO NO TOCA LA ECONOMÍA — EL ANCLA NI SE ENTERA");
{
  G.res.lombriz = 3; G.pescaHasta = 0;
  const peces0 = JSON.stringify(G.fish);
  const l = ctx.pescaLanceNuevo(rndDe([0.1, 0.5]));
  ctx.pescaAnzuelo(l);   // muy pronto → perdido
  ok("el gusano sigue en la bolsa", G.res.lombriz === 3);
  ok("la laguna no entró en reposo", ctx.pescaCdLeft() === 0);
  ok("y no apareció ningún pez", JSON.stringify(G.fish) === peces0);
  /* ganar cobra por el camino auditado de siempre */
  const xp0 = (G.skills && G.skills.fishing) || 0;
  ctx.goFishing("comun");
  ok("ganar consume EL gusano", G.res.lombriz === 2);
  ok("y arranca el reloj de 15 min", ctx.pescaCdLeft() > 0);
  ok("y paga la XP de Pesca de siempre", ((G.skills && G.skills.fishing) || 0) > xp0);
}

console.log("\nY CADA FINAL CONTESTA ALGO (un clic nunca es mudo)");
{
  const A = vm.runInContext("PESCA2_AVISO", ctx);
  ok("pronto / tarde / escapó / tiempo tienen su frase",
    ["pronto", "tarde", "escapo", "tiempo"].every(k => A[k] && A[k].length > 8));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: « rarer fish move faster and more erratically — good luck, anglers ».\n");
process.exit(fallos ? 1 : 0);
