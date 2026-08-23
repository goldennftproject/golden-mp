/* LAS CARTAS DEL ABUELO (23/8, dirección — docs/LORE.md)
   El envío que revela el lore. Contratos:
     · son 10, del nivel 2 al 20, en orden estricto de nivel;
     · voz y medida de la biblia: 40-110 palabras, firman «Tu abuelo»;
     · se entregan DE A UNA (la más vieja sin leer) — subir seis niveles de golpe no
       inunda el buzón, y leer una hace aparecer la siguiente;
     · antes del nivel de cada carta, no existe; antes de terminar el tutorial, tampoco;
     · leídas viven PARA SIEMPRE en la pila (el resto del archivo sigue caducando a 7 días);
     · el F5 no las repite ni las pierde.
     node tools/test-cartas-abuelo.js                                                          */
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
["isOpen", "refreshHud", "saveFarm", "refreshBuzon", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, CARTAS = vm.runInContext("CARTAS_ABUELO", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const delAbuelo = () => ctx.buzonCartas().filter(c => String(c.id).indexOf("abuelo") === 0);

console.log("\nLA COLECCIÓN: 10 CARTAS, DEL 2 AL 20, CON LA VOZ DEL ABUELO");
{
  ok("son 10", CARTAS.length === 10);
  ok("del nivel 2 al 20, en orden estricto", CARTAS[0].nivel === 2 && CARTAS[9].nivel === 20 &&
    CARTAS.every((c, i) => i === 0 || c.nivel > CARTAS[i - 1].nivel), CARTAS.map(c => c.nivel).join(" "));
  const palabras = CARTAS.map(c => c.txt.split(/\s+/).length);
  ok("todas miden 40-110 palabras (un sobre, no un capítulo)", palabras.every(p => p >= 40 && p <= 110),
    palabras.join(" "));
  ok("todas firman «Tu abuelo»", CARTAS.every(c => /Tu abuelo\s*$/.test(c.txt)));
  ok("y cada una tiene título de sobre", CARTAS.every(c => c.titulo && c.titulo.length >= 3));   // «Grjj» es un sobre válido
}

console.log("\nLA ENTREGA: DE A UNA, POR NIVEL, Y NUNCA EN PLENO TUTORIAL");
{
  G.tuto = { done: false, step: 3 }; G.level = 10; G.buzonLeidas = {};
  ok("en pleno tutorial no llega ninguna", delAbuelo().length === 0);
  G.tuto = { done: true }; G.level = 1;
  ok("a granja 1 tampoco (la primera pide 2)", delAbuelo().length === 0);
  G.level = 10;   // saltó a 10: tiene SEIS ganadas (niveles 2,3,5,7,9,10)…
  const c1 = delAbuelo();
  ok("…pero el buzón entrega UNA sola: la más vieja", c1.length === 1 && c1[0].id === "abuelo1", c1.map(c => c.id).join());
  ctx.buzonLeer("abuelo1");
  ok("leída la primera, aparece la segunda", delAbuelo()[0] && delAbuelo()[0].id === "abuelo2");
  ["abuelo2", "abuelo3", "abuelo4", "abuelo5"].forEach(id => ctx.buzonLeer(id));
  ok("al día con las ganadas: queda la del nivel 10", delAbuelo()[0] && delAbuelo()[0].id === "abuelo6");
  ctx.buzonLeer("abuelo6");
  ok("y la del nivel 12 NO llega hasta ganársela", delAbuelo().length === 0);
  G.level = 12;
  ok("granja 12: llega «Grjj»", delAbuelo()[0] && delAbuelo()[0].titulo === "Grjj");
}

console.log("\nLA PILA: LAS DEL ABUELO NO CADUCAN — EL RESTO SIGUE CADUCANDO");
{
  /* una carta vieja común y una del abuelo, las dos con 30 días encima */
  const viejo = Date.now() - 30 * 86400000;
  G.buzonArchivo = [
    { id: "vieja_comun", de: "La Granja", titulo: "Aviso viejo", txt: "x", dia: "2026-07-20", ts: viejo },   // un id que nada re-genera hoy
    { id: "abuelo1", de: "Tu abuelo", titulo: "Si estás leyendo esto", txt: "x", dia: "2026-07-20", ts: viejo },
  ];
  ctx.buzonCartas();   // archiva y limpia
  ok("la carta común de 30 días se fue", !G.buzonArchivo.some(a => a.id === "vieja_comun"));
  ok("la del abuelo sigue ahí para releer", G.buzonArchivo.some(a => a.id === "abuelo1"));
  /* el F5 conserva leídas y archivo */
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  ok("tras el F5, lo leído sigue leído", !!G.buzonLeidas.abuelo1);
  ok("y la colección sobrevive", G.buzonArchivo.some(a => a.id === "abuelo1"));
}

console.log("\nY LA BIBLIA MANDA: CADA CARTA TOCA SU MECÁNICA");
{
  const t = {};
  CARTAS.forEach(c => t[c.n] = c.txt);
  ok("la del Altar habla del altar", /[Aa]ltar/.test(t[4]));
  ok("la de la laguna habla de los peces", /pece|pesca/i.test(t[5]));
  ok("la de la doma habla de comida", /plato|comida/i.test(t[6]));
  ok("la de Grjj nombra a Grjj", /Grjj/.test(t[7]));
  ok("la última nombra la Guarida y cierra el arco abierto", /Guarida/.test(t[10]) && /primera carta/.test(t[10]));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el Capataz sabrá cuándo.\n");
process.exit(fallos ? 1 : 0);
