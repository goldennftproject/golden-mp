/* EL NIVEL 4 YA NO ES MUDO (22/8, dirección — auditoría del arranque, propuesta B)
   El tutorial regala 3 niveles en 12 minutos y el nivel 4 —el primero que el jugador gana
   solo, a ~8 horas— no abría NADA: el subidón moría en seco. Ahora premia con 3 vales del
   tablón, la moneda del bucle que el tutorial acaba de enseñar. Contratos:
     · subir al nivel 4 POR EL CAMINO REAL entrega los vales (y una sola vez);
     · el cartel de premios del nivel 4 los anuncia;
     · los vales sobreviven al guardado;
     · el nivel 5 no regala vales (solo el 4 está en la tabla, por ahora).
     node tools/test-premio-nivel4.js                                                           */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["toast", "log", "isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "saveFarm", "refreshBarn"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL CARTEL DEL NIVEL 4 ANUNCIA EL PREMIO");
{
  const txt = ctx.farmUnlockTxt(4);
  ok("dice los vales del tablón", /\+3 vales del tablón/.test(txt), "« " + txt + " »");
  ok("el nivel 5 no los promete (anuncia su expansión)", !/vales/.test(ctx.farmUnlockTxt(5)), "« " + ctx.farmUnlockTxt(5) + " »");
}

console.log("\nSUBIR AL NIVEL 4 POR EL CAMINO REAL ENTREGA LOS VALES");
{
  G.tuto = { done: true }; G.level = 3; G.vales = 0;
  G.skills = Object.assign({}, G.skills, { farming: vm.runInContext("FARM_XP_LVLS[4]", ctx) });
  ctx.recalcFarmLevel();
  ok("la granja sube a 4", G.level === 4, "nivel " + G.level);
  ok("y llegan exactamente 3 vales", G.vales === 3, G.vales + "");
  ctx.recalcFarmLevel();
  ok("re-chequear el nivel no los duplica", G.vales === 3, G.vales + "");
}

console.log("\nLOS VALES SOBREVIVEN AL GUARDADO Y EL 5 NO REGALA MÁS");
{
  const foto = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(foto);
  ok("tras el F5, los 3 vales siguen", G.vales === 3, G.vales + "");
  G.skills.farming = vm.runInContext("FARM_XP_LVLS[5]", ctx);
  ctx.recalcFarmLevel();
  ok("subir a 5 no suma vales (su premio es la expansión 2)", G.level === 5 && G.vales === 3,
    "nivel " + G.level + " · vales " + G.vales);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el primer nivel ganado a pulso ya trae premio.\n");
process.exit(fallos ? 1 : 0);
