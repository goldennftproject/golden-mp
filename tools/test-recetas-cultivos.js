/* LA COCINA SINCRONIZADA CON LOS CULTIVOS (22/8, auditoría integral)
   El hallazgo grave: al pasar los cultivos a dos carriles, las recetas quedaron pidiendo
   ingredientes de la escalera vieja (el Puré, Cocina 2, pedía cebolla — Cultivo 10, dos días
   y medio). REGLA que este test vigila para siempre: ninguna receta pide un cultivo de nivel
   MAYOR que el suyo — las dos escaleras miden sus niveles en las mismas horas, así que basta
   comparar número contra número. Además:
     · el techo de la Cocina se deriva del contenido y ahora es 16, gemelo del de Cultivo;
     · toda VERDURA tiene al menos una receta (las frutas —ciruela, cereza— quedan como
       cultivo de venta hasta que haya arte de mermeladas: decisión anotada);
     · las recetas del arranque (nivel < 4) siguen sin pedir madera (auditoría E del 16/8);
     · la carta «la granja es tuya» espera en el buzón al terminar el tutorial, una sola vez.
     node tools/test-recetas-cultivos.js                                                       */
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
["isOpen", "refreshHud", "saveFarm", "refreshBuzon"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, R = vm.runInContext("RECIPE_DEF", ctx), C = vm.runInContext("CROP_DEF", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nNINGUNA RECETA PIDE UN CULTIVO QUE TODAVÍA NO EXISTE");
{
  let malas = [];
  for (const id in R) {
    const r = R[id];
    for (const k in (r.res || {})) if (C[k] && C[k].lvl > r.lvl) malas.push(r.label + " (cocina " + r.lvl + ") pide " + k + " (cultivo " + C[k].lvl + ")");
  }
  ok("las " + Object.keys(R).length + " recetas respetan la regla", malas.length === 0, malas.join(" · "));
}

console.log("\nTODA RECETA SE VE EN LA COCINA (el bug del 23/8)");
{
  /* Dirección: «el diseñador no ve los platillos». Los tres platos de doma estaban en
     RECIPE_DEF y NO en RECIPE_ORDER — la lista que dibuja la ventana —, así que existían
     para el código y no para el jugador. Ahora la lista se DERIVA; este contrato lo vigila. */
  const RO = vm.runInContext("RECIPE_ORDER", ctx);
  const invisibles = Object.keys(R).filter(id => RO.indexOf(id) < 0);
  ok("ninguna receta queda fuera de la lista que ve el jugador", invisibles.length === 0, invisibles.join(", "));
  ok("y la lista no inventa recetas que no existen", RO.every(id => !!R[id]));
  ok("sin repetidos", new Set(RO).size === RO.length);
  ok("los tres platos de doma están a la vista",
    ["galletita_cereza", "papilla_remolacha", "bocado_domador"].every(id => RO.indexOf(id) >= 0));
}

console.log("\nLA ESCALERA DE LA COCINA, ENTERA Y CON EL TECHO GEMELO");
{
  const lvls = Object.values(R).map(r => r.lvl);
  ok("hay recetas del nivel 1 al 16", Math.min(...lvls) === 1 && Math.max(...lvls) === 16,
    [...new Set(lvls)].sort((a, b) => a - b).join(" "));
  ok("el techo de Cocina se derivó solo a 16", ctx.oficioTecho("cooking") === 16, ctx.oficioTecho("cooking"));
  ok("y sigue gemelo del de Cultivo", ctx.oficioTecho("cooking") === ctx.oficioTecho("farming"));
  const primeras = Object.values(R).filter(r => r.lvl === 1);
  ok("el nivel 1 conserva sus tres fuentes (huerta, laguna, caza)", primeras.length === 3,
    primeras.map(r => r.label).join(" · "));
}

console.log("\nTODA VERDURA COCINA — Y EL ARRANQUE SIGUE SIN QUEMAR MADERA");
{
  const enReceta = new Set(); for (const id in R) for (const k in (R[id].res || {})) enReceta.add(k);
  const frutas = ["ciruela", "cereza"];   // decisión 22/8: frutas de venta hasta que haya arte
  const sinUso = Object.keys(C).filter(k => !enReceta.has(k) && !frutas.includes(k));
  ok("toda verdura aparece en al menos una receta", sinUso.length === 0, sinUso.join(", ") || "");
  // el Estofado de carne queda exento: es la receta de la CAZA (19/8) y su madera es la leña
  // del guiso — decisión anterior a esta regla, que aplica a las recetas simples de la huerta.
  const conMadera = Object.keys(R).filter(id => id !== "estofado" && R[id].lvl < 4 && (R[id].res || {}).madera);
  ok("ninguna receta simple de la huerta (nivel < 4) pide madera (auditoría E)", conMadera.length === 0,
    conMadera.map(id => R[id].label).join(", "));
}

console.log("\nLA CARTA DEL FINAL DEL TUTORIAL — UNA SOLA VEZ");
{
  G.tuto = { done: true }; G.buzonLeidas = {};
  const cartas = ctx.buzonCartas();
  const c = cartas.find(x => x.id === "granjatuya");
  ok("al terminar el tutorial llega «la granja es tuya»", !!c);
  ok("y presenta logros, paquete y goblin", c && /LOGROS/.test(c.txt) && /PAQUETE/.test(c.txt) && /GOBLIN/.test(c.txt));
  ctx.buzonLeer("granjatuya");
  ok("leída una vez, no vuelve", !ctx.buzonCartas().some(x => x.id === "granjatuya"));
  G.tuto = { done: false, step: 3 };
  ok("y en pleno tutorial no aparece", (G.buzonLeidas = {}, !ctx.buzonCartas().some(x => x.id === "granjatuya")));
}

console.log("\nY EL KIT DE EMERGENCIA YA NO IMPRIME FUERA DEL CUPO");
{
  G.tuto = { done: true }; G.golden = 10; G.seeds = G.seeds || {};
  const sb0 = ctx.seedBuysToday().count;
  ctx.comprarEmergencia("seed");
  ok("las semillas del kit cuentan en el libro del cupo", ctx.seedBuysToday().count > sb0,
    sb0 + " → " + ctx.seedBuysToday().count);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cada receta llega con sus ingredientes debajo del brazo.\n");
process.exit(fallos ? 1 : 0);
