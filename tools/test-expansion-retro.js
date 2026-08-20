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

console.log("\nLAS DIECISÉIS, UNA POR UNA: ¿CADA BLOQUE ENTREGA LO SUYO?");
{
  /* 20/8, dirección: "hay que asegurarse de que las expansiones realmente estén dando los nodos y
     las parcelas en CADA UNA de las expansiones."
     Comprobar la 1 y la 2 no dice nada de la 16. Se compran las dieciséis en orden, y después de
     cada compra se mira el bloque recién abierto: su árbol, su roca y su parcela. */
  G.level = 60; G.expansiones = 0; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
  G.built = {}; G.obras = {}; G.layout = {}; G.layoutPlots = {}; G.decos = []; G.chests = [];
  G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = { tree: 0, rock: 0, plot: 0 };
  GF.aplicarTerreno(0); GF.ocupCambio();

  const fallan = { compra: [], arbol: [], roca: [], parcela: [], fuera: [], encima: [], cerca: [] };
  for (let i = 0; i < GF.EXPANSIONES.length; i++) {
    G.res = { madera: 99999, piedra: 99999, bronce: 9999, hierro: 9999, oro: 9999, diamante: 9999, netherita: 9999 };
    G.plata = 9999999;
    const e = ctx.expansionSiguiente();
    const b = e.bloque, n = e.n;
    if (!ctx.expansionComprar()) { fallan.compra.push(n); continue; }
    /* El terreno se re-aplica al comprar, pero eso lo hace la ESCENA al reiniciarse y aquí no hay
       escena. Sin esto, enCerca() seguiría contestando sobre el corral viejo —donde el bloque nuevo
       ni siquiera existe— y las dieciséis parcelas salían "en la cerca". Un test que no reproduce
       el estado real inventa fallos: ya me pasó tres veces hoy. */
    GF.aplicarTerreno(G.expansiones); GF.ocupCambio();

    /* El árbol y la roca del bloque: presentes y dentro. */
    const suyos = [];
    GF.WORLD_OBJECTS.forEach((o, k) => {
      if (o.exp !== i) return;
      const pres = GF.objetoPresente(GF.COLLISIONS[k] || { tipo: o.type, exp: o.exp, i: k });
      const dentro = o.leftCol >= b.c0 && o.leftCol < b.c1 && (o.baseRow - 1) >= b.r0 && (o.baseRow - 1) < b.r1;
      if (pres && dentro) suyos.push(o.type);
      if (pres && !dentro) fallan.fuera.push(n + ":" + o.type);
    });
    if (!suyos.includes("tree")) fallan.arbol.push(n);
    if (!suyos.includes("rock")) fallan.roca.push(n);

    /* Y la parcela: colocada, dentro del bloque, tuya, y no encima de otra cosa. */
    const par = Object.keys(G.layoutPlots).map(k => G.layoutPlots[k])
      .find(p => p && p.col >= b.c0 && p.col < b.c1 && p.row >= b.r0 && p.row < b.r1);
    if (!par) { fallan.parcela.push(n); continue; }
    if (GF.enCerca(par.col, par.row)) fallan.cerca.push(n + " en " + par.col + "," + par.row);
    /* ¿Cayó encima del árbol o la roca del propio bloque? */
    const choca = GF.WORLD_OBJECTS.some((o, k) => o.exp === i &&
      par.col >= o.leftCol && par.col < o.leftCol + Math.max(1, Math.ceil(o.wCells || 1)) &&
      par.row === o.baseRow - 1);
    if (choca) fallan.encima.push(n + " en " + par.col + "," + par.row);
  }

  ok("las " + GF.EXPANSIONES.length + " se pueden comprar", !fallan.compra.length, fallan.compra.join(", "));
  ok("las " + GF.EXPANSIONES.length + " traen su ÁRBOL", !fallan.arbol.length, fallan.arbol.join(", ") || "una por bloque, presente y dentro");
  ok("las " + GF.EXPANSIONES.length + " traen su ROCA", !fallan.roca.length, fallan.roca.join(", ") || "una por bloque, presente y dentro");
  ok("las " + GF.EXPANSIONES.length + " traen su PARCELA colocada", !fallan.parcela.length, fallan.parcela.join(", ") || "arada y dentro del bloque");
  ok("ningún nodo de expansión cae fuera de su bloque", !fallan.fuera.length, fallan.fuera.join(" · "));
  ok("ninguna parcela cae en la franja de la cerca", !fallan.cerca.length, fallan.cerca.join(" · "));
  ok("ni encima del árbol o la roca de su propio bloque", !fallan.encima.length, fallan.encima.join(" · "));
  ok("y al final tiene 3 + 16 = 19 parcelas", G.plotsOwned === 19, G.plotsOwned + " parcelas");
  ok("sin haber pasado ninguna por el baúl", (G.regalos.plot || 0) === 0,
    "el terreno comprado viene con lo suyo puesto");
}

console.log("\nY LA REPARACIÓN, TAMBIÉN PARA LAS DIECISÉIS");
{
  /* El caso extremo del arreglo retroactivo: alguien que compró las dieciséis antes de que la
     entrega existiera. Si la migración solo supiera reparar las primeras, el jugador avanzado
     —el que más terreno pagó— sería el peor servido. */
  GF.aplicarTerreno(16);
  ctx.hydrate({ level: 60, expansiones: 16, plotsOwned: 3, treesOpen: [0], rocksOpen: [0],
    built: { store: false }, obras: {}, layout: {}, layoutPlots: {}, decos: [], chests: [],
    regalos: { tree: 0, rock: 0, plot: 0 }, cobertizo: { tree: 0, rock: 0, plot: 0 }, sflStock: true });
  ok("recupera las 16 parcelas de golpe", G.plotsOwned === 19, "3 → " + G.plotsOwned);
  const puestas = Object.keys(G.layoutPlots).map(k => G.layoutPlots[k]);
  const sinParcela = [];
  GF.EXPANSIONES.forEach((b, i) => { if (!puestas.some(p => dentroDe(b, p))) sinParcela.push(i + 1); });
  ok("y cada bloque tiene la suya dentro", !sinParcela.length, sinParcela.join(", ") || "los 16 servidos");
  /* Y ninguna encima de otra: dos parcelas en la misma celda sería peor que ninguna. */
  const claves = puestas.map(p => p.col + "," + p.row);
  ok("sin dos parcelas en la misma celda", new Set(claves).size === claves.length,
    claves.length + " parcelas, " + new Set(claves).size + " celdas distintas");
}

console.log("\nY LA ROCA QUE VIENE CON EL BLOQUE SE PUEDE PICAR");
{
  /* 20/8, dirección: "la expansión del nivel 3 me dio una piedra que al picarla dice que necesito
     granja nivel 1. Y soy nivel 3."
     La roca de un bloque comprado NO pertenece a la escalera de rocas: su peaje fue el terreno.
     Pero se la medía con la escalera igual, y como su número de orden es el 4º y rocksOpen solo
     tiene la 0, salía bloqueada — anunciando un nivel que el jugador ya tenía. */
  G.level = 3; G.rocksOpen = [0]; G.treesOpen = [0]; G.expansiones = 1;
  const rocaBase = GF.WORLD_OBJECTS.find(o => o.type === "rock" && o.exp == null);
  const rocaExp = GF.WORLD_OBJECTS.find(o => o.type === "rock" && o.exp === 0);
  ok("hay una roca de la escalera y una del bloque", !!rocaBase && !!rocaExp);
  ok("la roca que vino con el bloque NO está bloqueada",
    !ctx.nodoBloqueado({ type: "rock", exp: 0, lockIdx: 3 }), "el peaje fue comprar el terreno");
  /* Y la escalera sigue funcionando para las suyas: no se abrió la puerta de par en par. */
  ok("pero la 2ª roca de la escalera sigue esperando su nivel",
    ctx.nodoBloqueado({ type: "rock", exp: null, lockIdx: 1 }), "rocksOpen = [0]");
  ok("y la 1ª, que sí es tuya, no", !ctx.nodoBloqueado({ type: "rock", exp: null, lockIdx: 0 }));
  /* La numeración: farm.js no puede contar los nodos de expansión, o vuelve el desfase. */
  const FARM2 = fs.readFileSync("public/game/farm.js", "utf8");
  ok("y farm.js numera solo los nodos de la escalera",
    /o\.exp == null && o\.type === "rock"\) lockIdx = __rockN\+\+/.test(FARM2),
    "una sola numeración, la misma que config.js");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ lo que compraste con el terreno está dentro del terreno\n");
process.exit(fallos ? 1 : 0);
