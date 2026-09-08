/* LOS CONTENEDORES: BOLSA DE 8, MOCHILA DE 20, ANIDADAS   (8/9 tarde, dirección, corrigiéndome)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « el morral es solo un objeto, una bolsa de ocho huecos. En cambio la bolsa sería el
   inventario de por sí ». Y era exacto: en Tibia la Backpack (20) es el inventario que llevás
   puesto y la Bag (8) es un objeto que va DENTRO, y los dos se compran, se llevan y se pierden.

   Este archivo sustituye a test-morral.js, que describía el modelo de la mañana —una lista plana
   que aparecía sola al cruzar el portal—. No lo parcheé a propósito: un test que describe una
   mecánica jubilada no se arregla, se reemplaza, o queda documentando algo que ya no existe.

   Lo que hay que proteger acá son cuatro decisiones, no el código:
     1. el ÁRBOL tiene fondo: dos niveles, no infinitos (una muñeca rusa no se puede vaciar)
     2. apilar no gasta hueco, en ningún nivel — si no, el cupo miente
     3. lo que no entra NO se evapora: se queda donde estaba
     4. un F5 no es morir (regla de la casa: solo se resetea borrando caché)
     node tools/test-contenedores.js                                                          */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const DEF = g("CONT_DEF");

console.log("\nDOS CONTENEDORES, Y SUS HUECOS SON LA MECÁNICA");
{
  ok("la bolsa tiene 8 huecos — el volumen de la Bag de Tibia", DEF.bag.huecos === 8);
  ok("la mochila tiene 20 — el de la Backpack", DEF.backpack.huecos === 20);
  /* los precios cuelgan del ancla (20 plata/celda-hora) y esa dependencia es lo que se protege:
     si mañana se mueve el ancla, estos números tienen que moverse con ella o quedan sueltos. */
  const ancla = 20;
  ok("la bolsa vale una hora-parcela: perderla nunca te deja a pie", DEF.bag.plata === ancla, DEF.bag.plata + " plata");
  ok("y la mochila diez: es una inversión, y duele", DEF.backpack.plata === ancla * 10, DEF.backpack.plata + " plata");
}

console.log("\nEL ÁRBOL TIENE FONDO: UNA BOLSA DENTRO DE LA MOCHILA, Y AHÍ SE ACABA");
{
  const mochila = ctx.contCrear("backpack");
  const bolsa = ctx.contCrear("bag");
  ok("la bolsa entra en la mochila", ctx.contMeterBolsa(mochila, bolsa) === true);
  ok("y suma sus huecos: 20 − 1 ocupado + 8 = 27 libres", ctx.contLibres(mochila) === 27, ctx.contLibres(mochila) + " libres");
  const nieta = ctx.contCrear("bag");
  ok("pero una bolsa DENTRO de esa bolsa no entra — dos niveles y se acabó",
    ctx.contMeterBolsa(bolsa, ctx.contCrear("bag")) === true && ctx.contMeterBolsa(mochila, bolsa) === false);
  ok("el tope de profundidad está escrito, no improvisado", g("CONT_PROF_MAX") === 2);
  void nieta;
}

console.log("\nEL CUPO SE RESPETA, Y APILAR NO LO GASTA");
{
  const b = ctx.contCrear("bag");
  for (let i = 0; i < 8; i++) ctx.contMeter(b, "res", "mat" + i, 1);
  ok("ocho cosas distintas lo llenan", ctx.contLleno(b) && ctx.contPilas(b) === 8);
  ok("y la novena NO entra — ese rebote es la decisión « ¿vuelvo o sigo? »",
    ctx.contMeter(b, "res", "otra_cosa", 1) === false);
  ok("pero apilar en algo que YA está sigue entrando: no gasta hueco nuevo",
    ctx.contMeter(b, "res", "mat0", 5) === true && ctx.contContar(b, "res", "mat0") === 6);

  /* el desborde a la bolsa anidada: la raíz llena pero el árbol todavía tiene sitio */
  const m = ctx.contCrear("backpack");
  ctx.contMeterBolsa(m, ctx.contCrear("bag"));
  for (let i = 0; i < 19; i++) ctx.contMeter(m, "res", "x" + i, 1);
  /* ojo con la cuenta: contAplanar NO cuenta la bolsa como pila, cuenta lo que hay adentro. Lo
     que se comprueba acá es DÓNDE cayó, que es lo que decide la mecánica. */
  const dentro = m.items.find(e => e && e.c === "bag");
  ok("con la mochila llena, lo nuevo baja a la bolsa de adentro",
    ctx.contMeter(m, "res", "desborde", 1) === true && dentro.items.some(e => e.k === "desborde"),
    JSON.stringify(dentro.items));
  ok("y cuando ya no cabe en ningún lado, contesta que no",
    (() => { for (let i = 0; i < 8; i++) ctx.contMeter(m, "res", "y" + i, 1); return ctx.contMeter(m, "res", "ultimo", 1); })() === false);
}

console.log("\nGASTAR SALE DEL CONTENEDOR — es la única puerta dentro de la Zona");
{
  const m = ctx.contCrear("backpack");
  const b = ctx.contCrear("bag"); ctx.contMeterBolsa(m, b);
  ctx.contMeter(m, "res", "flecha", 10);
  ok("cuenta lo que llevás", ctx.contContar(m, "res", "flecha") === 10);
  ok("gastar de menos funciona", ctx.contGastar(m, "res", "flecha", 4) === true && ctx.contContar(m, "res", "flecha") === 6);
  ok("gastar de más NO gasta nada — no deja medio pago", ctx.contGastar(m, "res", "flecha", 99) === false && ctx.contContar(m, "res", "flecha") === 6);
  ctx.contGastar(m, "res", "flecha", 6);
  ok("la pila en cero libera el hueco de verdad", ctx.contContar(m, "res", "flecha") === 0 && ctx.contPilas(m) === 0);
  /* lo que está en una bolsa anidada también se gasta: el jugador no distingue dónde lo guardó */
  ctx.contMeter(b, "res", "flecha", 3);
  ok("y alcanza lo que esté dentro de una bolsa anidada", ctx.contGastar(m, "res", "flecha", 3) === true);
}

console.log("\nVACIAR A LA GRANJA, AL VOLVER — y lo que no entra no se borra");
{
  G.res = {}; G.plata = 0; G.golden = 0; G.invRows = 6; G.conts = {};
  const m = ctx.contCrear("backpack");
  ctx.contMeterBolsa(m, ctx.contCrear("bag"));
  ctx.contMeter(m, "res", "carne", 3);
  ctx.contMeter(m, "res", "plata", 50);
  ctx.contMeter(m, "res", "golden", 2);
  ctx.contDescargar(m, true);
  ok("el botín pasa a la bolsa", Math.floor(G.res.carne) === 3, "carne " + G.res.carne);
  ok("la plata a la billetera", G.plata === 50, "plata " + G.plata);
  /* 8/9 (dirección): « sí, entran al contenedor » — las monedas se ganan allá y se pierden allá */
  ok("y los golden también", G.golden === 2, "golden " + G.golden);
  ok("el contenedor queda vacío de botín", ctx.contPilas(m) === 0);
  ok("pero la bolsa anidada sobrevive: es un objeto tuyo, no envoltorio",
    m.items.length === 1 && m.items[0].c === "bag");

  G.res = {}; G.invRows = 0;
  const ITEM = g("ITEM_RES_ORDER");
  for (let i = 0; i < ctx.invSlots() + 5 && i < ITEM.length; i++) G.res[ITEM[i]] = 99;   // bolsa a tope
  const m2 = ctx.contCrear("bag");
  ctx.contMeter(m2, "res", ITEM[ITEM.length - 1], 1);
  ctx.contDescargar(m2, true);
  ok("con la bolsa de la granja llena, lo que no entra SIGUE en el contenedor", ctx.contPilas(m2) === 1);
}

console.log("\nSE COMPRAN, Y SE VEN EN LA BOLSA COMO CUALQUIER OBJETO");
{
  G.conts = {}; G.plata = 1000;
  ok("comprar descuenta y entrega", ctx.comprarCont("bag") === true && ctx.contsTengo("bag") === 1 && G.plata === 1000 - DEF.bag.plata);
  G.plata = 0;
  ok("sin plata no se compra", ctx.comprarCont("backpack") === false && ctx.contsTengo("backpack") === 0);
  ok("un contenedor inventado no existe", ctx.comprarCont("mochilon") === false);
  const cuentas = ctx.bolsaCuentas().filter(x => x.kind === "cont");
  ok("y el que tenés aparece en la bolsa de la granja", cuentas.length === 1 && cuentas[0].key === "bag" && cuentas[0].n === 1);
  /* el que llevás PUESTO no está en la granja: si contara en las dos, se duplicaría a la vista */
  ok("el que llevás puesto NO cuenta como guardado", ctx.contsTengo("bag") === 1 && ctx.contLlevado() === null);
}

console.log("\nEL KIT DE BIENVENIDA TRAE UNA — es la válvula de Tibia");
{
  /* « si perdés la mochila recibís una vacía »: sin contenedor no se cruza el portal, así que el
     juego no puede permitirse que la primera muerte te deje encerrado en la granja. */
  ok("el kit incluye la bolsa", (g("KIT_INICIAL").bag || 0) >= 1);
  const ST = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("y se entrega de verdad al reclamarlo", /contsSumar\("bag", KIT_INICIAL\.bag/.test(ST));
}

console.log("\nY SOBREVIVE AL F5 — un refresco no es morir");
{
  G.cont = { c: "backpack", items: [{ kind: "res", k: "colmillo", n: 4 }, { c: "bag", items: [{ kind: "res", k: "plata", n: 120 }] }] };
  G.conts = { bag: 2 };
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  ok("el snapshot lleva el árbol y los guardados", !!snap.cont && snap.cont.items.length === 2 && snap.conts.bag === 2);
  G.cont = undefined; G.conts = undefined;
  ctx.hydrate(snap);
  ok("y el hydrate lo devuelve entero, con la bolsa anidada adentro",
    ctx.contPilas(ctx.contLlevado()) === 2 && ctx.contLlevado().items[1].c === "bag", JSON.stringify(G.cont));
  ok("y los guardados también", ctx.contsTengo("bag") === 2);

  /* el saneado tiene que ser RECURSIVO: un guardado corrupto no puede meter una bolsa que no
     existe en el catálogo ni una muñeca rusa de profundidad infinita. */
  ctx.hydrate(Object.assign({}, snap, { cont: { c: "mochilon", items: [] } }));
  ok("un contenedor que no existe se descarta entero", ctx.contLlevado() === null);
  ctx.hydrate(Object.assign({}, snap, { cont: { c: "bag", items: [{ c: "bag", items: [{ c: "bag", items: [] }] }, { k: null, n: 0 }, "basura"] } }));
  const raiz = ctx.contLlevado();
  ok("la basura se cae y el anidado se corta en dos niveles",
    !!raiz && raiz.items.length === 1 && raiz.items[0].c === "bag" && raiz.items[0].items.length === 0, JSON.stringify(G.cont));
  ctx.hydrate(Object.assign({}, snap, { conts: { bag: -5, mochilon: 9 } }));
  ok("y un contador negativo o inventado no entra", ctx.contsTengo("bag") === 0 && ctx.contsTengo("mochilon") === 0);
}

console.log("\nLA MUDANZA: quien jugó con el morral de la mañana no pierde nada");
{
  /* regla de la casa (dirección, textual): « el único motivo por el cual se debe resetear una
     partida es cuando se actualiza borrando caché ». Una mecánica que cambia de forma no puede
     llevarse por delante el botín que el jugador ya tenía ganado. */
  G.res = {}; G.plata = 0; G.conts = {}; G.invRows = 6;
  ctx.hydrate({ morral: [{ kind: "res", k: "cuero", n: 5 }, { kind: "res", k: "plata", n: 30 }], kitReclamado: true });
  ok("lo que tenía en el morral aparece en la bolsa", Math.floor(G.res.cuero || 0) === 5, "cuero " + G.res.cuero);
  ok("y la plata en la billetera", G.plata === 30, "plata " + G.plata);
  ok("más una bolsa de regalo, para que el portal no se le cierre", ctx.contsTengo("bag") >= 1);

  G.conts = {}; G.res = {};
  ctx.hydrate({ kitReclamado: true });
  ok("y al que ya tenía el kit pero nunca vio el morral, también", ctx.contsTengo("bag") === 1);
  G.conts = {};
  ctx.hydrate({ conts: { bag: 0 } });
  ok("pero a quien ya está en el modelo nuevo no se le regala nada", ctx.contsTengo("bag") === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el contenedor es un objeto, tiene fondo, y no se evapora nada.\n");
process.exit(fallos ? 1 : 0);
