/* LAS EXPANSIONES YA COMPRADAS TIENEN QUE TENER SU PARCELA DENTRO (20/8, dirección)
   "Si hay algún jugador que ya tiene expansiones, debes colocarle los nodos y las parcelas que
    toquen a cada expansión. El diseñador tiene la 1 y la 2 y no tiene ni los nodos ni las parcelas
    en esos lugares."
   Y antes: "cuando uno expande se barren los árboles de esa zona, y dentro de ese espacio ya debe
   estar puesto el árbol y la parcela de cultivo".
   Se reprodujo su guardado —nivel 5, dos expansiones, nada colocado a mano— y salió que los NODOS
   sí aparecen (su existencia se deduce del número de expansiones) pero la PARCELA no: la entrega
   vive dentro de expansionComprar(), así que solo la recibe quien compra DESPUÉS de que ese código
   existiera. Quien ya había expandido se quedó sin ella para siempre.
   Este test comprueba las dos mitades: que la compra nueva entregue, y que la migración repare a
   quien ya había comprado.
     node tools/test-expansion-retro.js                                                           */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, info() {} }, Math, Date, JSON, Object, Array, Number,
  String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
ctx.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }) };
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "ensureHotbarDefaults",
 "syncCobertizo", "refreshDeco", "applyCombatHp", "tutoMigrar", "tutoSync"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/save.js", "utf8") + "\n;this.hydrate = hydrate;", ctx);
const GF = ctx.GF, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const dentroDe = (b, p) => p && p.col >= b.c0 && p.col < b.c1 && p.row >= b.r0 && p.row < b.r1;

console.log("\nEL BLOQUE RESERVA UNA CELDA PARA LA PARCELA");
{
  ok("las " + GF.EXPANSIONES.length + " expansiones reservan su celda",
    GF.EXPANSIONES.every(b => b && b.parcela), "una parcela arada por bloque");
  const fuera = GF.EXPANSIONES.filter(b => !dentroDe(b, b.parcela));
  ok("y la celda cae dentro de su propio bloque", !fuera.length, fuera.length + " fuera");
}

console.log("\nCOMPRAR AHORA: LA PARCELA APARECE PUESTA, NO EN EL BAÚL");
{
  G.level = 5; G.expansiones = 0; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
  G.built = {}; G.obras = {}; G.layout = {}; G.layoutPlots = {}; G.decos = []; G.chests = [];
  G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = { tree: 0, rock: 0, plot: 0 };
  G.res = { madera: 999, piedra: 999 }; G.plata = 99999;
  GF.aplicarTerreno(0); GF.ocupCambio();
  const b = GF.EXPANSIONES[0];
  ctx.expansionComprar();
  ok("la compra suma una parcela", G.plotsOwned === 4, "3 → " + G.plotsOwned);
  ok("y le fija posición dentro del bloque", dentroDe(b, G.layoutPlots[3]),
    JSON.stringify(G.layoutPlots[3]) + " · bloque " + b.c0 + "," + b.r0 + " a " + b.c1 + "," + b.r1);
  ok("sin pasar por el baúl", (G.regalos.plot || 0) === 0, "el terreno comprado viene con lo suyo puesto");
  /* Y los nodos del bloque, que sí funcionaban: se comprueban igual, para que si un día se rompen
     salte aquí y no en la partida de alguien. */
  const nodos = [];
  GF.WORLD_OBJECTS.forEach((o, i) => { if (o.exp === 0 && GF.objetoPresente(GF.COLLISIONS[i])) nodos.push(o.type); });
  ok("y el árbol y la roca del bloque están presentes", nodos.length >= 2, nodos.join(" · "));
}

console.log("\nY EL CASO DEL DISEÑADOR: YA HABÍA EXPANDIDO Y NO TENÍA NADA");
{
  /* Su guardado, tal cual: dos expansiones compradas antes de que existiera la entrega. */
  const guardado = { level: 5, expansiones: 2, plotsOwned: 3, treesOpen: [0], rocksOpen: [0],
    built: { store: false }, obras: {}, layout: {}, layoutPlots: {}, decos: [], chests: [],
    regalos: { tree: 0, rock: 0, plot: 0 }, cobertizo: { tree: 0, rock: 0, plot: 0 }, sflStock: true };
  GF.aplicarTerreno(2);
  ctx.hydrate(guardado);
  ok("después de cargar tiene 5 parcelas", G.plotsOwned === 5, "3 + una por expansión = " + G.plotsOwned);
  const puestas = Object.keys(G.layoutPlots).map(k => G.layoutPlots[k]);
  [0, 1].forEach(i => {
    const b = GF.EXPANSIONES[i];
    ok("el bloque " + (i + 1) + " tiene su parcela dentro", puestas.some(p => dentroDe(b, p)),
      puestas.map(p => p.col + "," + p.row).join(" · "));
  });
  ok("y no se le regalaron parcelas al baúl", (G.regalos.plot || 0) === 0,
    "van puestas en su bloque, no como premio a colocar");

  /* Idempotente: volver a cargar no puede darle más. Un migrador que se ejecuta dos veces y
     duplica es peor que el fallo que arregla. */
  const antes = G.plotsOwned;
  ctx.hydrate(Object.assign({}, guardado, { plotsOwned: G.plotsOwned, layoutPlots: G.layoutPlots }));
  ok("y cargar otra vez no le da más", G.plotsOwned === antes, antes + " → " + G.plotsOwned);
}

console.log("\nY SI LA CELDA RESERVADA ESTÁ OCUPADA, BUSCA OTRA DEL MISMO BLOQUE");
{
  const b = GF.EXPANSIONES[0];
  const guardado = { level: 5, expansiones: 1, plotsOwned: 3, treesOpen: [0], rocksOpen: [0],
    built: { store: false }, obras: {}, layout: {}, layoutPlots: {},
    decos: [{ id: "x", col: b.parcela.col, row: b.parcela.row }], chests: [],
    regalos: { tree: 0, rock: 0, plot: 0 }, cobertizo: { tree: 0, rock: 0, plot: 0 }, sflStock: true };
  GF.aplicarTerreno(1); GF.ocupCambio();
  ctx.hydrate(guardado);
  const puestas = Object.keys(G.layoutPlots).map(k => G.layoutPlots[k]);
  const suya = puestas.find(p => dentroDe(b, p));
  ok("igual recibe su parcela", !!suya, suya ? suya.col + "," + suya.row : "ninguna");
  ok("y no la pone encima del adorno", !suya || !(suya.col === b.parcela.col && suya.row === b.parcela.row),
    "la celda reservada estaba tomada");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ lo que compraste con el terreno está dentro del terreno\n");
process.exit(fallos ? 1 : 0);
