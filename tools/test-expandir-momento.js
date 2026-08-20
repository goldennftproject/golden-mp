/* EL MOMENTO DE EXPANDIR TIENE QUE VERSE (20/8, dirección)
   "Lo que daría al momento de expandir un bloque de la granja es la transición y el movimiento de
    cámara que sucede cuando me vayan a expandir."
   Lo medido antes de tocar nada: el viaje YA existía —expandirEnVivo hacía un pan de 760 ms hasta
   el bloque— pero el jugador no lo veía nunca, por dos motivos que se sumaban:
     · el Mercado se quedaba ABIERTO encima del mundo (la compra se hace desde su pestaña Adornos);
     · y justo después salía la celebración a pantalla completa: 2.600 ms de fogonazo y confeti.
   O sea, 760 ms de cámara debajo de 2.600 ms de telón. Pagabas tu expansión y veías un cartel.
   Este test comprueba el ORDEN, que es lo único que importaba: primero se despeja la pantalla,
   después viaja la cámara, y la celebración espera a que llegue.
     node tools/test-expandir-momento.js                                                          */
const fs = require("fs"), vm = require("vm");
const STATE = fs.readFileSync("public/game/state.js", "utf8");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* ---- se ejecuta la compra con una escena de mentira que anota el ORDEN de los hechos ---- */
const orden = [];
const ctx = { console: { log() {}, warn() {}, info() {} }, Math, Date, JSON, Object, Array, Number,
  String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
ctx.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }) };
["isOpen", "refreshInv", "syncSlots", "log", "refreshHud", "saveFarm", "sfx", "tutoRefresh",
 "tutoCheck", "refreshSeedShop", "refreshHotbar", "ensureHotbarDefaults", "syncCobertizo",
 "refreshDeco", "applyCombatHp"].forEach(f => { ctx[f] = () => {}; });
ctx.toast = () => orden.push("toast");
ctx.celebrate = () => orden.push("celebración");
ctx.closeOv = (id) => orden.push("cerrar " + id);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(STATE, ctx);
const GF = ctx.GF, G = ctx.G;

/* La escena falsa. OJO CON LA FORMA, que aquí estuvo el fallo más caro del día:
   farm.js hace `window.FARM = this`, o sea que FARM ES LA ESCENA. La primera versión de este test
   montaba `FARM = { scene: esc }` —copiando la suposición equivocada del código en vez de lo que
   hace el juego— y por eso daba verde mientras en la partida real toda expansión caía al telón
   negro. Un arnés que reproduce el error que quiere cazar no prueba nada.
   Se monta como lo monta el juego, y punto. */
let panDur = 0;
ctx.FARM = {
  expandirEnVivo(bloque, alLlegar) {
    orden.push("cámara viaja");
    panDur = 900;
    orden.push("cámara llega");
    if (alLlegar) alLlegar();
    return true;
  },
  /* Y el ScenePlugin, que es lo que de verdad cuelga de `.scene` y solo sirve para reiniciar. */
  scene: { restart() { orden.push("TELÓN: la escena se rehace entera"); } }
};

G.level = 60; G.expansiones = 0; G.plotsOwned = 3; G.treesOpen = [0]; G.rocksOpen = [0];
G.built = {}; G.obras = {}; G.layout = {}; G.layoutPlots = {}; G.decos = []; G.chests = [];
G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = { tree: 0, rock: 0, plot: 0 };
G.res = { madera: 9999, piedra: 9999 }; G.plata = 999999;
GF.aplicarTerreno(0); GF.ocupCambio();
ctx.expansionComprar();

console.log("\nEL ORDEN DE LOS HECHOS AL COMPRAR");
console.log("      " + orden.join("  →  "));
{
  const iCerrar = orden.findIndex(x => x.indexOf("cerrar ov-market") === 0);
  const iViaje = orden.indexOf("cámara viaja");
  const iFiesta = orden.indexOf("celebración");
  ok("se cierra el Mercado", iCerrar >= 0, "estaba encima del mundo");
  ok("y se cierra ANTES de que la cámara viaje", iCerrar >= 0 && iCerrar < iViaje);
  ok("la cámara viaja al bloque nuevo", iViaje >= 0);
  ok("y la celebración espera a que LLEGUE", iFiesta > iViaje,
    "antes tapaba el viaje con 2,6 s de confeti");
  ok("el viaje dura lo suficiente para verse", panDur >= 700, panDur + " ms");
  /* Y LO QUE REPORTÓ DIRECCIÓN: que NO se rehaga la escena entera. El telón es el respaldo, no el
     camino normal — si aparece aquí, el jugador está viendo la pantalla negra en cada expansión. */
  ok("y la escena NO se rehace entera", orden.indexOf("TELÓN: la escena se rehace entera") < 0,
    "el dibujado en caliente es el camino normal, el telón es el respaldo");
}

console.log("\nY LA LÍNEA QUE LO ROMPÍA, VIGILADA");
{
  /* `window.FARM` es la escena. Pedirle `.scene` devuelve el ScenePlugin de Phaser, que tiene
     restart() pero no los métodos de la escena — y como restart() SÍ existe, el fallo se disfraza
     de "funciona": la granja se rehace y el jugador ve el telón. Se vigila que no vuelva. */
  const cuerpo = STATE.slice(STATE.indexOf("function expansionComprar()"), STATE.indexOf("const FARM_COFRE"));
  const vivo = cuerpo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("expansionComprar toma la escena, no el ScenePlugin", !/window\.FARM && window\.FARM\.scene/.test(vivo),
    "window.FARM YA es la escena");
  ok("y llama a expandirEnVivo sobre ella", /window\.FARM;[\s\S]{0,200}expandirEnVivo/.test(vivo));
}

console.log("\nY SI NO HAY ESCENA, LA CELEBRACIÓN NO SE PIERDE");
{
  /* Un festejo diferido que depende de un aviso de cámara puede no llegar nunca: si la escena no
     existe, o el pan se interrumpe, el jugador se queda sin la celebración de algo que pagó. */
  orden.length = 0;
  ctx.FARM = null;
  G.expansiones = 0; G.plotsOwned = 3; G.layoutPlots = {};
  G.res = { madera: 9999, piedra: 9999 }; G.plata = 999999;
  ctx.expansionComprar();
  ok("sin escena, igual se celebra", orden.indexOf("celebración") >= 0, orden.join(" → "));
}

console.log("\nY EL RESPALDO DENTRO DE LA ESCENA");
{
  /* En el juego el aviso es `camerapancomplete`. Si ese evento no llegara, hay un plazo de
     respaldo y una bandera para que el festejo salga UNA vez: ni cero ni dos. */
  const fn = FARM.slice(FARM.indexOf("expandirEnVivo(bloque, alLlegar)"), FARM.indexOf("dibujarBosque() {"));
  ok("expandirEnVivo recibe el aviso de llegada", /expandirEnVivo\(bloque, alLlegar\)/.test(FARM));
  ok("escucha el final del viaje", /camerapancomplete/.test(fn));
  ok("y tiene plazo de respaldo por si no llega", /delayedCall\(DUR \+ /.test(fn));
  ok("con bandera para no celebrar dos veces", /let hecho = false/.test(fn) && /if \(hecho\) return; hecho = true/.test(fn));
  ok("y el bloque nuevo se enciende al llegar", /const destello = /.test(fn),
    "si no, no sabés cuál de todo lo que ves acabás de comprar");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ se despeja, se viaja, se llega, y ahí se celebra\n");
process.exit(fallos ? 1 : 0);
