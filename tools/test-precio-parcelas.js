/* LA PARCELA SE COMPRA CON PLATA, CADA UNA UN 10% MÁS CARA (20/8, dirección + diseñador)
   "Las parcelas se den con las expansiones, y sumado a eso que se consigan con plata, y que cada
    parcela cueste un poco más que la anterior. Lo de $Golden lo dejamos para cuando tenga sentido
    venderlo así."

   Tres reglas, y este test EJECUTA las tres — no lee el código:
     1. El precio arranca en 200 (10 horas del ancla) y sube 10% por parcela que ya tenés.
     2. Las parcelas regaladas por expansión también encarecen la siguiente compra: el precio
        mira plotsOwned, no "cuántas compraste". Los dos caminos comparten una sola cuenta.
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

console.log("\nLA CURVA: 200 DE BASE, +10% POR PARCELA");
{
  G.plotsOwned = 3;
  ok("con las 3 de nacimiento, la cuarta sale 200", ctx.plotUnlockCost() === 200, ctx.plotUnlockCost() + " plata = 10 h del ancla");
  G.plotsOwned = 4;
  ok("la quinta sale 220 (+10%)", ctx.plotUnlockCost() === 220, ctx.plotUnlockCost() + "");
  let previo = 0;
  let monotona = true, suave = true;
  for (let n = 3; n < 60; n++) {
    G.plotsOwned = n;
    const c = ctx.plotUnlockCost();
    if (c <= previo) monotona = false;
    if (previo && c / previo > 1.11) suave = false;   // nunca salta más del 10% (+ redondeo)
    previo = c;
  }
  ok("las 57 compras posibles suben SIEMPRE", monotona);
  ok("y ninguna salta más del 10%", suave, "sin escalones sorpresa");
  G.plotsOwned = 59;
  ok("la 60 (la última) queda alcanzable", ctx.plotUnlockCost() < 50000, ctx.plotUnlockCost() + " plata: cara, no imposible");
}

console.log("\nLOS DOS CAMINOS COMPARTEN LA CUENTA");
{
  /* Si una expansión te regala una parcela, la siguiente compra sale más cara: así el que
     expande y el que compra pagan curvas coherentes, sin tabla aparte. */
  G.plotsOwned = 5;
  const antes = ctx.plotUnlockCost();
  G.plotsOwned = 6;   // llegó la parcela de una expansión
  const despues = ctx.plotUnlockCost();
  ok("la parcela regalada por la expansión encarece la próxima compra", despues > antes,
    antes + " → " + despues + " plata");
}

console.log("\nCOMPRAR DE VERDAD: PAGA, SUMA Y AVISA");
{
  G.plotsOwned = 3; G.tuto = { done: true }; G.plata = 1000; G.golden = 0;
  avisos.length = 0;
  ctx.comprarParcela();
  ok("descuenta el precio exacto", G.plata === 800, "1000 − 200 = " + G.plata);
  ok("y suma la parcela", G.plotsOwned === 4);
  ok("y avisa", avisos.some(a => /[Pp]arcela/.test(a)), avisos.join(" · "));
  /* sin plata: rechaza ANTES de cobrar */
  G.plata = 10; avisos.length = 0;
  ctx.comprarParcela();
  ok("sin plata no cobra ni suma", G.plata === 10 && G.plotsOwned === 4);
  ok("y dice qué falta", avisos.some(a => /falta plata/i.test(a)), avisos.join(" · "));
  /* comprarParcela ya no acepta pagar con $Golden: aunque alguien llame con el argumento viejo,
     cobra plata igual — no hay camino que descuente G.golden. */
  G.plata = 1000; G.golden = 99; avisos.length = 0;
  ctx.comprarParcela(true);
  ok("el argumento viejo de $Golden ya no existe: cobra plata igual", G.golden === 99 && G.plata < 1000,
    "$Golden intacto (" + G.golden + ") · plata cobrada");
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
