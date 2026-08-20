/* LA PARCELA SE COMPRA CON PLATA, CADA UNA UN 10% MÁS CARA (20/8, dirección + diseñador)
   "Las parcelas se den con las expansiones, y sumado a eso que se consigan con plata, y que cada
    parcela cueste un poco más que la anterior. Lo de $Golden lo dejamos para cuando tenga sentido
    venderlo así."

   Segunda vuelta (20/8, más tarde): "que el precio solo se vea afectado por las compras. Si yo
   adquiero una parcela por expansión, que no le afecte al precio de las que se venden."
   La primera versión miraba plotsOwned y entonces convenía comprar ANTES de expandir: el orden
   importaba. Ahora el precio mira G.plotsCompradas, un contador propio.

   Tres reglas, y este test EJECUTA las tres — no lee el código:
     1. El precio arranca en 200 (10 horas del ancla) y sube 10% por parcela COMPRADA.
     2. Las parcelas regaladas por expansión NO tocan el precio: tu compra n°k cuesta lo mismo
        la hagas cuando la hagas.
     3. En la tienda no queda ningún botón de parcela en $Golden.
     node tools/test-precio-parcelas.js                                                           */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0 };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null };
vm.createContext(ctx);
["config", "nav", "state"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = t => avisos.push(String(t));
["refreshHud", "saveFarm", "refreshMarket", "isOpen", "syncEditDeco", "refreshInv", "syncSlots"].forEach(f => { ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA CURVA: 200 DE BASE, +10% POR PARCELA COMPRADA");
{
  G.plotsOwned = 3; G.plotsCompradas = 0;
  ok("la primera compra sale 200", ctx.plotUnlockCost() === 200, ctx.plotUnlockCost() + " plata = 10 h del ancla");
  G.plotsCompradas = 1;
  ok("la segunda sale 220 (+10%)", ctx.plotUnlockCost() === 220, ctx.plotUnlockCost() + "");
  let previo = 0;
  let monotona = true, suave = true;
  for (let k = 0; k < 57; k++) {
    G.plotsCompradas = k;
    const c = ctx.plotUnlockCost();
    if (c <= previo) monotona = false;
    if (previo && c / previo > 1.11) suave = false;   // nunca salta más del 10% (+ redondeo)
    previo = c;
  }
  ok("las 57 compras posibles suben SIEMPRE", monotona);
  ok("y ninguna salta más del 10%", suave, "sin escalones sorpresa");
  G.plotsCompradas = 40;   // el peor caso real: 60 − 3 de nacimiento − 16 de expansión − 1
  ok("la última compra posible queda alcanzable", ctx.plotUnlockCost() < 15000, ctx.plotUnlockCost() + " plata: cara, no imposible");
}

console.log("\nLA EXPANSIÓN NO TOCA EL PRECIO DE LA TIENDA");
{
  /* La regla de dirección, literal: "si yo adquiero una parcela por expansión, que no le afecte
     al precio de las que se venden". El orden comprar/expandir deja de importar. */
  G.plotsCompradas = 2; G.plotsOwned = 5;
  const antes = ctx.plotUnlockCost();
  G.plotsOwned = 9;   // llegaron CUATRO parcelas de expansiones
  const despues = ctx.plotUnlockCost();
  ok("con 4 parcelas regaladas de por medio, la tienda pide lo mismo", antes === despues,
    antes + " = " + despues + " plata");
}

console.log("\nCOMPRAR DE VERDAD: PAGA, SUMA Y AVISA");
{
  G.plotsOwned = 3; G.plotsCompradas = 0; G.tuto = { done: true }; G.plata = 1000; G.golden = 0;
  avisos.length = 0;
  ctx.comprarParcela();
  ok("descuenta el precio exacto", G.plata === 800, "1000 − 200 = " + G.plata);
  ok("y suma la parcela Y el contador de compradas", G.plotsOwned === 4 && G.plotsCompradas === 1);
  ok("y avisa", avisos.some(a => /[Pp]arcela/.test(a)), avisos.join(" · "));
  /* sin plata: rechaza ANTES de cobrar */
  G.plata = 10; avisos.length = 0;
  ctx.comprarParcela();
  ok("sin plata no cobra ni suma", G.plata === 10 && G.plotsOwned === 4 && G.plotsCompradas === 1);
  ok("y dice qué falta", avisos.some(a => /falta plata/i.test(a)), avisos.join(" · "));
  /* comprarParcela ya no acepta pagar con $Golden: aunque alguien llame con el argumento viejo,
     cobra plata igual — no hay camino que descuente G.golden. */
  G.plata = 1000; G.golden = 99; avisos.length = 0;
  ctx.comprarParcela(true);
  ok("el argumento viejo de $Golden ya no existe: cobra plata igual", G.golden === 99 && G.plata < 1000,
    "$Golden intacto (" + G.golden + ") · plata cobrada");
}

console.log("\nY EL GUARDADO VIEJO DEDUCE SUS COMPRAS UNA SOLA VEZ");
{
  /* Los guardados de antes no traen plotsCompradas. La migración deduce: de las que tenés,
     3 son de nacimiento y las de expansión son regalo — el resto salió de la tienda.
     Se ejecuta hydrate() con un guardado armado a mano, como haría el jugador al volver. */
  vm.runInContext(fs.readFileSync("public/game/save.js", "utf8"), ctx);
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const regalo = (() => { let r = 0; for (let i = 0; i < 2; i++) if (ctx.GF.EXPANSIONES && ctx.GF.EXPANSIONES[i] && ctx.GF.EXPANSIONES[i].parcela) r++; return r; })();
  /* jugador viejo: 2 expansiones y 7 parcelas — 3 de nacimiento + las regaladas + el resto comprado */
  G.plotsCompradas = undefined;
  ctx.hydrate({ plotsOwned: 7, expansiones: 2, sflStock: true, layoutPlots: { 3: { col: 2, row: 2 } } });
  const esperado = Math.max(0, (G.plotsOwned || 3) - 3 - regalo);
  ok("deduce las compradas descontando nacimiento y expansiones", G.plotsCompradas === esperado,
    G.plotsOwned + " tenidas − 3 − " + regalo + " de expansión = " + G.plotsCompradas + " compradas");
  /* y si el guardado YA trae el contador, se respeta tal cual */
  ctx.hydrate({ plotsOwned: 7, plotsCompradas: 1, expansiones: 2, sflStock: true });
  ok("y si el guardado ya lo trae, no lo pisa", G.plotsCompradas === 1, "guardado dice 1 → queda 1");
}

console.log("\nY EN LA TIENDA NO QUEDA BOTÓN DE $GOLDEN PARA PARCELAS");
{
  /* La tienda arma su HTML con data-plot="…": si reapareciera el botón de $Golden, reaparece
     la cadena. Es una comprobación sobre la plantilla, pero la función ya se ejecutó arriba. */
  const UI = fs.readFileSync("public/game/ui.js", "utf8");
  ok("no hay data-plot=\"golden\"", !/data-plot="golden"/.test(UI), "vuelve cuando el token tenga valor");
  ok("y el de plata sigue", /data-plot="plata"/.test(UI));
  ok("plotUnlockGolden no quedó vivo en ningún archivo del juego",
    !["config", "nav", "state", "farm", "ui", "save"].some(f => /plotUnlockGolden\s*\(/.test(fs.readFileSync("public/game/" + f + ".js", "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ""))));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: una curva, dos caminos, una moneda.\n");
process.exit(fallos ? 1 : 0);
