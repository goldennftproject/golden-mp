/* LA PUERTA DE LA ZONA NEGRA: CARGAR ANTES DE SALIR        (8/9 tarde, dirección, tanda 2)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « esa bag es la que vamos a llenar para ir a zona negra: comidas, runas, flechas, espadas, lo
   que el usuario decida ».

   Hasta hoy el portal era un botón de confirmar y entrabas con TODO tu patrimonio encima sin
   haberlo decidido. Ahora hay un umbral, y el umbral es la mecánica: es donde el jugador elige
   cuánto está dispuesto a perder.

   Lo que custodia este archivo es que el traspaso sea HONESTO en los dos sentidos. Un panel que
   mueve cosas entre dos sitios tiene una forma clásica de fallar —duplicar o evaporar— y las dos
   son silenciosas: nadie mira la suma total. Por eso casi todo lo de acá cuenta ANTES y DESPUÉS,
   y compara. Y por eso « Volver » se prueba tanto como « Entrar »: cancelar es la operación que
   nadie prueba y la que más caro sale cuando se rompe.
     node tools/test-puerta-zona.js                                                            */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t)); ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const limpio = () => {
  G.cont = null; G.conts = { bag: 2, backpack: 1 };
  G.res = { carne: 10, flecha: 30 }; G.seeds = { papa: 5 }; G.dishes = { papa_asada: 4 };
  G.plata = 0; G.invRows = 6; G.slots = []; avisos.length = 0;
};

console.log("\nELEGIR CON QUÉ SALÍS — y arrepentirse no puede costar nada");
{
  limpio();
  ok("sin elegir no llevás nada", ctx.contLlevado() === null);
  ok("elegir la mochila la saca de los guardados",
    ctx.viajeElegir("backpack") === true && ctx.contsTengo("backpack") === 0 && ctx.contLlevado().c === "backpack");
  /* cambiar de idea: la mochila tiene que volver ANTES de contar la bolsa, o cambiar fallaría */
  ok("cambiar a la bolsa devuelve la mochila a la granja",
    ctx.viajeElegir("bag") === true && ctx.contsTengo("backpack") === 1 && ctx.contLlevado().c === "bag");
  ok("elegir la que ya llevás no hace nada raro",
    ctx.viajeElegir("bag") === true && ctx.contsTengo("bag") === 1, "bolsas guardadas: " + ctx.contsTengo("bag"));
  G.conts = { bag: 0, backpack: 0 }; G.cont = null;
  ok("y una que no tenés no se puede elegir — con su aviso",
    ctx.viajeElegir("backpack") === false && avisos.some(a => /no ten[eé]s/i.test(a)), avisos.join(" · "));
}

console.log("\nCARGAR: LO QUE ENTRA SALE DE LA GRANJA, NI SE DUPLICA NI SE EVAPORA");
{
  limpio(); ctx.viajeElegir("backpack");
  const raiz = ctx.contLlevado();
  ctx.viajeCargar("res", "flecha", 20);
  ok("las flechas pasan al contenedor", ctx.contContar(raiz, "res", "flecha") === 20);
  ok("y SE DESCUENTAN de la granja — la suma no cambia",
    Math.floor(G.res.flecha) === 10 && ctx.contContar(raiz, "res", "flecha") + Math.floor(G.res.flecha) === 30,
    "granja " + G.res.flecha + " · llevás " + ctx.contContar(raiz, "res", "flecha"));
  ctx.viajeCargar("dish", "papa_asada", 2);
  ok("la comida también — que es lo único con lo que se cura uno allá",
    ctx.contContar(raiz, "dish", "papa_asada") === 2 && G.dishes.papa_asada === 2);
  /* dirección: « lo que el usuario decida ». Sin lista blanca: llevarse semillas a una cacería
     es una mala idea, pero es SU mala idea. Una lista blanca envejece sola. */
  ok("y las semillas, aunque no sirvan de nada allá: es su decisión",
    ctx.viajeCargar("seed", "papa", 5) === 5 && Math.floor(G.seeds.papa) === 0);
  ok("no se puede cargar más de lo que tenés", ctx.viajeCargar("res", "carne", 999) === 10 && Math.floor(G.res.carne) === 0);
  ok("ni algo que no tenés", ctx.viajeCargar("res", "diamante", 1) === 0);
}

console.log("\nBAJAR: Y EN EL SENTIDO CONTRARIO TAMPOCO SE PIERDE NADA");
{
  limpio(); ctx.viajeElegir("bag");
  ctx.viajeCargar("res", "flecha", 30);
  ok("bajar devuelve a la granja", ctx.viajeBajar("res", "flecha", 10) === 10 && Math.floor(G.res.flecha) === 10);
  ok("y descuenta del contenedor", ctx.contContar(ctx.contLlevado(), "res", "flecha") === 20);
  ok("bajar de más baja lo que hay, no revienta", ctx.viajeBajar("res", "flecha", 999) === 20 && Math.floor(G.res.flecha) === 30);
  ok("y el contenedor queda vacío", ctx.contPilas(ctx.contLlevado()) === 0);
}

console.log("\nLAS BOLSAS SE ENGANCHAN A LA MOCHILA — no son carga, son huecos");
{
  limpio(); ctx.viajeElegir("backpack");
  const raiz = ctx.contLlevado();
  ok("una bolsa entra como bolsa, no como objeto",
    ctx.viajeCargar("cont", "bag", 1) === 1 && raiz.items.length === 1 && raiz.items[0].c === "bag");
  ok("y suma sus huecos: 20 − 1 + 8", ctx.contLibres(raiz) === 27, ctx.contLibres(raiz) + " libres");
  ok("sale de los guardados", ctx.contsTengo("bag") === 1);
  /* ojo: la mochila que llevás puesta YA no está en los guardados. Para probar el rechazo hay
     que tener otra de repuesto, o la función corta antes por no tener ninguna. */
  ctx.contsSumar("backpack", 1);
  avisos.length = 0;
  ok("una mochila dentro de otra NO entra — con su aviso",
    ctx.viajeCargar("cont", "backpack", 1) === 0 && avisos.some(a => /Solo las bolsas/i.test(a)), avisos.join(" · "));
  /* sacar la bolsa devuelve TAMBIÉN lo que tenía dentro: es el caso que se olvida */
  ctx.viajeCargar("res", "flecha", 30);
  const carneAntes = Math.floor(G.res.carne || 0);
  ctx.contMeter(raiz.items[0], "res", "carne", 7);
  ok("sacarla devuelve la bolsa Y lo que tenía dentro",
    ctx.viajeBajarBolsa(0) === true && ctx.contsTengo("bag") === 2 && Math.floor(G.res.carne) === carneAntes + 7,
    "carne " + G.res.carne + " (había " + carneAntes + ")");
}

console.log("\n« VOLVER » NO PUEDE COSTAR NADA — cancelar es lo que nadie prueba");
{
  limpio(); ctx.viajeElegir("backpack");
  ctx.viajeCargar("cont", "bag", 1);
  ctx.viajeCargar("res", "flecha", 30);
  ctx.viajeCargar("dish", "papa_asada", 4);
  ctx.viajeCargar("seed", "papa", 5);
  ctx.viajeSoltar();
  ok("todo vuelve a la granja tal como estaba",
    Math.floor(G.res.flecha) === 30 && G.dishes.papa_asada === 4 && Math.floor(G.seeds.papa) === 5,
    "flechas " + G.res.flecha + " · platos " + G.dishes.papa_asada + " · semillas " + G.seeds.papa);
  ok("los contenedores también, la anidada incluida",
    ctx.contsTengo("bag") === 2 && ctx.contsTengo("backpack") === 1 && ctx.contLlevado() === null,
    "bolsas " + ctx.contsTengo("bag") + " · mochilas " + ctx.contsTengo("backpack"));
}

console.log("\nY LA × HACE LO MISMO QUE « VOLVER » — una sola salida");
{
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  const iC = UI.indexOf("function closeOv");
  ok("cerrar la puerta por la × devuelve la carga",
    /ov-viaje" && typeof viajeSoltar === "function"[\s\S]{0,120}viajeSoltar\(\)/.test(UI.slice(iC, iC + 700)));
  /* pero el botón de ENTRAR no puede pasar por ahí, o saldrías con el contenedor vacío: ese es
     el error que este test existe para que no se cometa dos veces */
  const iE = UI.indexOf("const ent = $(\"vj-entrar\")");
  ok("pero « Entrar » NO pasa por closeOv: saldría con el contenedor vacío",
    !/closeOv\("ov-viaje"\)/.test(UI.slice(iE, iE + 420)) && /classList\.remove\("show"\)/.test(UI.slice(iE, iE + 420)));
}

console.log("\nEL PORTAL ABRE LA PUERTA, Y NO DEJA ENTRAR DE CUALQUIER FORMA");
{
  const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
  ok("el portal ya no entra directo: abre la puerta", /refreshViaje\(\);\s*\n\s*openOv\("ov-viaje"\)/.test(FARM));
  ok("sin ningún contenedor ni se abre — y se dice dónde se compran",
    /!contsTengo\("bag"\) && !contsTengo\("backpack"\)[\s\S]{0,180}se compran en la Tienda/.test(FARM));
  ok("entrar de verdad vuelve a comprobar el arma", /function viajeEntrar[\s\S]{0,700}armaEq\(\)\) \{ toast/.test(FARM));
  ok("y el enfriamiento, que pudo vencerse con el panel abierto",
    /function viajeEntrar[\s\S]{0,400}zonaCdLeft/.test(FARM));
  ok("salir con el contenedor vacío se permite, pero se avisa",
    /!contPilas\(raiz\)\) log\([\s\S]{0,90}curarte/.test(FARM));
}

console.log("\nAL VOLVER, EL CONTENEDOR VUELVE A LA GRANJA");
{
  limpio();
  ctx.viajeElegir("bag");
  ctx.viajeCargar("res", "flecha", 10);
  ctx.contMeter(ctx.contLlevado(), "res", "carne", 3);   // botín de la cacería
  ctx.zonaEntrar();
  const r = ctx.zonaSalir(false);
  ok("el botín y lo que sobró entran a la bolsa", Math.floor(G.res.carne) === 13 && Math.floor(G.res.flecha) === 30,
    "carne " + G.res.carne + " · flechas " + G.res.flecha);
  ok("y la bolsa vuelve a los guardados: en la granja no se lleva nada puesto",
    ctx.contLlevado() === null && ctx.contsTengo("bag") === 2, "bolsas " + ctx.contsTengo("bag"));
  ok("el resumen del viaje sigue saliendo", !!r && typeof r.min === "number");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el umbral pesa, y no se duplica ni se evapora nada al cruzarlo.\n");
process.exit(fallos ? 1 : 0);
