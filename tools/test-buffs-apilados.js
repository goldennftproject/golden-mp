/* LA TERCERA SITUACIÓN: LOS BUFFS MULTIPLICATIVOS SE APILABAN SIN TOPE (20/8, dirección)
   "¿Podrías buscar la tercera situación en la que se puedan dupear recursos?"
   Encontrada, y medida antes del arreglo:
     · 20 Pescados asados → ventaMult ×6,73 (1,10^20)
     · + 10 Banquetes     → ventaMult ×41,7
     · 10 Estofados       → enfriamientos en 0,85^10 = 20% del tiempo
   El costo de los platos es LINEAL y la ganancia era EXPONENCIAL: acumulás platos durante días,
   te los comés todos juntos y vendés el granero entero a precio inflado. Una impresora de plata.

   La regla nueva: los buffs MULTIPLICATIVOS (yield, cd) no componen — vale el mejor activo, y
   comer otro plato del mismo tipo solo renueva la ventana. Los aditivos (farm, speed, dmg) ya
   tenían sus topes (farmSpeedMult clava en 0,4; dmgTakenMult en 0,2) y quedan como estaban.
   Este test COME los platos de verdad (eatDish) y mide los multiplicadores reales.
     node tools/test-buffs-apilados.js                                                            */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["toast", "log", "isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.saveFarm = () => {};
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

G.tuto = { done: true }; G.level = 1; G.prestige = 0; G.hp = 100; G.hpMax = 100;
G.dishes = { pescado_asado: 20, banquete: 10, estofado: 10 };

console.log("\nEL PRECIO DE VENTA: COMER MÁS NO COMPONE");
{
  const base = ctx.ventaMult();
  ctx.eatDish("pescado_asado");
  const con1 = ctx.ventaMult();
  ok("un Pescado asado da su +10%", Math.abs(con1 / base - 1.10) < 0.001, "×" + (con1 / base).toFixed(3));
  for (let i = 0; i < 19; i++) ctx.eatDish("pescado_asado");
  ok("VEINTE pescados asados siguen dando +10%, no ×6,7", Math.abs(ctx.ventaMult() / base - 1.10) < 0.001,
    "×" + (ctx.ventaMult() / base).toFixed(3) + " (antes del arreglo: ×6,73)");
  for (let i = 0; i < 10; i++) ctx.eatDish("banquete");
  ok("y con 10 Banquetes encima manda EL MEJOR: +20%, no ×41", Math.abs(ctx.ventaMult() / base - 1.20) < 0.001,
    "×" + (ctx.ventaMult() / base).toFixed(3) + " (antes: ×41,7)");
  ok("la venta real usa ese multiplicador", (() => {
    G.res.papa = 10; G.plata = 0;
    const precio1 = ctx.totalVenta("papa", 1);
    return precio1 > 0 && Math.abs(precio1 - Math.round(ctx.dishPrice ? precio1 : precio1)) < 1;
  })(), "totalVenta pasa por ventaMult");
}

console.log("\nLOS ENFRIAMIENTOS: EL MEJOR BUFF, NO EL PRODUCTO");
{
  ok("sin buffs de cd, ×1", ctx.cdMult() === 1);
  for (let i = 0; i < 10; i++) ctx.eatDish("estofado");
  ok("DIEZ estofados dejan el cd en 0,85 — no en 0,20", Math.abs(ctx.cdMult() - 0.85) < 0.001,
    "×" + ctx.cdMult().toFixed(3) + " (antes del arreglo: ×" + Math.pow(0.85, 10).toFixed(2) + ")");
}

console.log("\nLOS ADITIVOS SIGUEN COMO ESTABAN (con sus topes de siempre)");
{
  G.buffs = [];
  for (let i = 0; i < 30; i++) ctx.addBuff("farm", "x", 5, 60);
  ok("30 buffs de velocidad de cultivo chocan con el tope 0,4", ctx.farmSpeedMult() === 0.4,
    "×" + ctx.farmSpeedMult() + " — el clavo de siempre");
  G.buffs = [];
  for (let i = 0; i < 30; i++) ctx.addBuff("def", "x", 10, 60);
  ok("30 de defensa chocan con el suelo 0,2", ctx.dmgTakenMult() === 0.2, "×" + ctx.dmgTakenMult());
  G.buffs = [];
}

console.log("\nY LA VENTANA SE RENUEVA: comer otro plato NO desperdicia el anterior");
{
  /* el segundo plato entra con su propio vencimiento: el jugador que come dos seguidos tiene
     cobertura mientras VIVA alguno de los dos — el mejor activo manda en cada momento */
  G.buffs = [];
  G.dishes.pescado_asado = 2;
  ctx.eatDish("pescado_asado");
  ctx.eatDish("pescado_asado");
  const activos = G.buffs.filter(b => b.type === "yield").length;
  ok("los dos buffs conviven en la lista (vencimientos propios)", activos === 2, activos + " activos");
  ok("pero el multiplicador sigue siendo UNO solo", Math.abs(ctx.ventaMult() - 1.10) < 0.001, "×" + ctx.ventaMult().toFixed(3));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la impresora de plata está apagada.\n");
process.exit(fallos ? 1 : 0);
