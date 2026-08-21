/* EL TUTORIAL TERMINA AVISANDO, TERMINE POR DONDE TERMINE (21/8, dirección vía Discord)
   "¿Cómo sé que el tutorial ha terminado?" — "¿Ya dejó de ponerte objetivos?" — "Creo que sí."
   — "Entonces está mal."

   Estaba mal de verdad: el tutorial tenía DOS finales. El paso a paso (tutoDone) celebraba con
   « ¡GRANJA LISTA! »; el autoskip —que corre EN CADA CARGA y salta los pasos ya cumplidos— ponía
   done=true y se callaba. Quien llegaba con los últimos pasos ya hechos (expandió, editó, pescó,
   tenía vales) veía los objetivos desaparecer sin una palabra. Es exactamente lo que le pasó al
   diseñador hoy.

   Ahora hay UN cierre (tutoTerminar) para los dos caminos. Este test ejecuta ambos:
     node tools/test-tuto-cierre.js                                                               */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const fiestas = [], registro = [];
ctx.celebrate = (c) => fiestas.push(c && c.title);
ctx.log = (t) => registro.push(String(t));
["toast", "isOpen", "refreshInv", "syncSlots", "refreshHud", "sfx", "tutoRefresh", "tutoCheck",
 "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshMarket", "syncEditDeco"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
ctx.saveFarm = () => {};
const G = ctx.G;
const TUTO = vm.runInContext("TUTO_STEPS", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL FINAL POR AUTOSKIP (el caso del diseñador): AHORA CELEBRA");
{
  /* un guardado parado en los últimos pasos, con TODOS ya cumplidos de antes:
     expandió (expansiones>0), editó (editVisto), cavó (lombriz), pescó (skill), entregó (vales) */
  fiestas.length = 0; registro.length = 0;
  ctx.hydrate({ level: 8, expansiones: 2, plotsOwned: 5, expParcelasDadas: 2, plotsCompradas: 0,
    tuto: { step: TUTO.findIndex(s => s.id === "expandir"), n: 0, done: false, v: 2 },
    editVisto: true, vales: 3, sflStock: true,
    res: { lombriz: 2 }, skills: { fishing: 40 },
    kitReclamado: true, built: { store: true, horno: true, cocina: true } });
  ok("el tutorial quedó terminado al cargar", !!(G.tuto && G.tuto.done));
  ok("y ESTA VEZ lo dijo: « ¡GRANJA LISTA! »", fiestas.includes("¡GRANJA LISTA!"), fiestas.join(" · ") || "(sin fiesta)");
  ok("con su línea en el registro", registro.some(t => /Tutorial completo/.test(t)));

  /* y no se repite: la próxima carga ya llega con done=true y no vuelve a festejar */
  fiestas.length = 0;
  ctx.hydrate(JSON.parse(JSON.stringify(ctx.snapshot())));
  ok("la carga siguiente no repite la fiesta", !fiestas.includes("¡GRANJA LISTA!"), fiestas.join(" · ") || "silencio, como corresponde");
}

console.log("\nEL FINAL PASO A PASO SIGUE CELEBRANDO IGUAL");
{
  fiestas.length = 0; registro.length = 0;
  G.tuto = { step: TUTO.length - 1, n: 0, done: false, v: 2 };   // parado en el último paso
  G.vales = 0;
  const ult = TUTO[TUTO.length - 1];
  vm.runInContext("tutoDone(TUTO_STEPS[TUTO_STEPS.length - 1])", ctx);
  ok("cumplir el último paso (« " + ult.id + " ») cierra el tutorial", !!G.tuto.done);
  ok("con la misma celebración", fiestas.includes("¡GRANJA LISTA!"), fiestas.join(" · "));
}

console.log("\nY LOS DOS CAMINOS COMPARTEN EL MISMO CIERRE (no hay dos textos que mantener)");
{
  const S = fs.readFileSync("public/game/state.js", "utf8");
  const llamadas = (S.match(/tutoTerminar\(\)/g) || []).length;
  ok("tutoTerminar() se llama desde ambos finales", llamadas >= 2, llamadas + " llamadas");
  const vivo = S.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("y la celebración vive en UN solo sitio", (vivo.match(/¡GRANJA LISTA!/g) || []).length === 1);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el tutorial siempre se despide.\n");
process.exit(fallos ? 1 : 0);
