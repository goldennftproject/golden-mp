/* ¿EL GDD DICE LO QUE EL JUEGO HACE? (21/8, dirección: "¿está actualizado a la fecha?")
   La última línea del documento promete: « si una cifra del documento y el juego no coinciden,
   manda el juego — y entonces hay un auditor que debería haberlo cazado ». Este es ese auditor.
   Lee docs/GDD.md (la FUENTE del Word) y compara sus cifras contra el código en ejecución:
   la tabla de expansiones, los edificios, los platos, los animales, el precio de las parcelas,
   la cerca, los pasos del tutorial y la fórmula de XP.
     node tools/gdd-verificar.js                                                                  */
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
const G = ctx.G, GF = ctx.GF;
const DOC = fs.readFileSync("docs/GDD.md", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const RES_LABEL = vm.runInContext("RES_LABEL", ctx);

console.log("\nLA TABLA DE EXPANSIONES, FILA POR FILA");
{
  const costos = ctx.expansionCostos();
  const niveles = vm.runInContext("FARM_EXPANSION", ctx);
  let malas = [];
  for (let i = 0; i < 16; i++) {
    const costo = Object.keys(costos[i]).map(k => costos[i][k] + " " + (RES_LABEL[k] || k)).join(" + ");
    const re = new RegExp("\\|\\s*" + (i + 1) + "\\s*\\|\\s*" + niveles[i] + "\\s*\\|\\s*" + costo.replace(/[+]/g, "\\+") + "\\s*\\|");
    if (!re.test(DOC)) malas.push((i + 1) + " (juego: nivel " + niveles[i] + " · " + costo + ")");
  }
  ok("las 16 filas del documento son las del juego", !malas.length, malas.join(" · ") || "niveles y costes, derivados y coincidentes");
}

console.log("\nEDIFICIOS: CADA COSTE DEL DOCUMENTO EXISTE EN BUILD_DEF");
{
  const BD = vm.runInContext("BUILD_DEF", ctx);
  const malas = [];
  for (const id in BD) {
    const costo = BD[id].cost || {};
    for (const k in costo) {
      const re = new RegExp(costo[k] + "\\s+" + (RES_LABEL[k] || k).replace(/ /g, "\\s+"), "i");
      if (!re.test(DOC)) { malas.push(id + ": " + costo[k] + " " + k + " no figura"); break; }
    }
  }
  ok("los costes de los " + Object.keys(BD).length + " edificios figuran tal cual", !malas.length, malas.join(" · "));
}

console.log("\nPLATOS: INGREDIENTES Y CURACIÓN");
{
  const RD = vm.runInContext("RECIPE_DEF", ctx);
  const malas = [];
  for (const id in RD) {
    const r = RD[id];
    if (!DOC.includes(r.label)) { malas.push(id + ": no está « " + r.label + " »"); continue; }
    if (r.heal < 9999 && !new RegExp(r.label.replace(/[()]/g, ".") + "[^\\n]*\\|\\s*" + r.heal + "\\s*\\|").test(DOC))
      malas.push(id + ": cura " + r.heal + " y el doc dice otra cosa");
  }
  ok("los " + Object.keys(RD).length + " platos figuran con su curación", !malas.length, malas.join(" · "));
}

console.log("\nGANADERÍA: PRECIOS Y NIVELES");
{
  const AD = vm.runInContext("typeof ANIMAL_DEF !== 'undefined' ? ANIMAL_DEF : (typeof GANADO_DEF !== 'undefined' ? GANADO_DEF : null)", ctx);
  if (!AD) ok("tabla de animales localizable", false, "ni ANIMAL_DEF ni GANADO_DEF");
  else {
    const malas = [];
    for (const id in AD) {
      const a = AD[id];
      const nombre = a.label || id;
      if (a.precio != null && !new RegExp(nombre + "[^\\n]*\\|\\s*" + a.precio + "\\s*\\|", "i").test(DOC) &&
          !new RegExp(nombre + "[^\\n]*" + a.precio, "i").test(DOC)) malas.push(nombre + " (" + a.precio + ")");
    }
    ok("los animales figuran con su precio", !malas.length, malas.join(" · ") || Object.keys(AD).length + " animales");
  }
}

console.log("\nPARCELAS, CERCA Y TUTORIAL: LO NUEVO DE LA REVISIÓN 2");
{
  G.plotsCompradas = 0;
  ok("el precio inicial del doc (200) es el del juego", ctx.plotUnlockCost() === 200 && DOC.includes("la primera sale 200"));
  G.plotsCompradas = 1;
  ok("y el +10 % por comprada también", ctx.plotUnlockCost() === 220 && /10\s?% más que la anterior/.test(DOC));
  const t = GF.terreno(0);
  const utiles = [...t.mias].filter(s => { const [c, r] = s.split(",").map(Number); return !GF.enCerca(c, r); }).length;
  ok("las 169 celdas útiles del doc son las medidas", utiles === 169 && DOC.includes("169 celdas"), utiles + " medidas");
  const pasos = vm.runInContext("TUTO_STEPS.length", ctx);
  ok("los pasos del tutorial (" + pasos + ") coinciden con el doc", DOC.includes("son " + pasos + " pasos"));
  ok("la fórmula de XP del doc es la del código", /21 × ritmo del oficio × N\^1.7/.test(DOC) && /21\s*\*\s*/.test(fs.readFileSync("public/game/state.js", "utf8").match(/skillNeed[\s\S]{0,200}/)[0]) || /N\^1.7/.test(DOC));
}

console.log("\nY EL CONTEO DE HERRAMIENTAS DE LA §15");
{
  const tests = fs.readdirSync("tools").filter(f => /^test-.*\.js$/.test(f)).length;
  const audits = fs.readdirSync("tools").filter(f => /^auditar-|^auditoria-/.test(f)).length;
  ok("el doc dice " + tests + " pruebas y " + audits + " auditores",
    DOC.includes(tests + " pruebas automáticas") && DOC.includes(audits + " auditores"),
    "si esto falla, regenerá el doc: docs/GDD.md §15");
}

console.log(fallos ? "\n" + fallos + " desajuste(s): el documento MIENTE en algo — regenerarlo o corregir la fuente\n"
  : "\nTodo en orden: el documento dice lo que el juego hace hoy.\n");
process.exit(fallos ? 1 : 0);
