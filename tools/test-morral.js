/* EL MORRAL DE CAZA — la hunting bag                      (8/9, dirección, modelo de Tibia)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Nos vamos a crear unas hunting bag — esa hunting bag es la que vamos a perder, no lo que
   carguemos en el inventario ». Y después: « investigalo en Google ». Se investigó antes de
   escribir una línea: en Tibia designás una mochila como contenedor de botín y lo que sacás
   del CADÁVER va ahí, no al bolso general. Eso es exactamente lo que hace este morral.

   La mitad del trabajo ya estaba hecha desde el 31/8 —el bicho muerto deja un cuerpo con
   brillo que hay que revisar y saquear a mano—, así que la hunting bag entera cabe en cambiar
   el destino del botín. Este archivo custodia esa decisión y las tres reglas que la sostienen:
   cupo chico (la tensión), lo que no entra se queda en el cuerpo (nada se evapora), y se vacía
   sola al volver a la granja (es la mochila del campo, no una tarea).
     node tools/test-morral.js                                                                */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const CUPO = g("MORRAL_CUPO");

console.log("\nEL MORRAL TIENE CUPO, Y ESE CUPO ES LA MECÁNICA");
{
  G.morral = [];
  ok("nace vacío", ctx.morralVacio() && ctx.morralPilas() === 0);
  ok("cabe " + CUPO + " pilas — chico a propósito", CUPO >= 4 && CUPO <= 12, String(CUPO));
  for (let i = 0; i < CUPO; i++) ctx.morralMeter("res", "mat" + i, 1);
  ok("se llena con " + CUPO + " cosas distintas", ctx.morralLleno() && ctx.morralPilas() === CUPO);
  ok("y la siguiente NO entra — ese rebote es la decisión « ¿vuelvo o sigo? »",
    ctx.morralMeter("res", "otra_cosa", 1) === false);
  ok("pero apilar en algo que YA está sigue entrando: no gasta hueco nuevo",
    ctx.morralMeter("res", "mat0", 5) === true && ctx.morral()[0].n === 6);
}

console.log("\nLO QUE NO ENTRA SE QUEDA EN EL CUERPO — nada se evapora");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("el botín del cuerpo va al MORRAL, no a la bolsa", /const ok = morralMeter\(d\.kind \|\| "res", d\.k, d\.n\)/.test(FOREST));
  ok("y lo que rebota vuelve a la lista del cuerpo", /if \(!ok\) quedan\.push\(d\)/.test(FOREST));
  ok("con su aviso, que dice el porqué y el cupo", /Morral lleno \(" \+ MORRAL_CUPO \+ "\)/.test(FOREST));
  ok("la plata también entra al morral — si fuera a la billetera sería imposible de perder",
    !/else if \(d\.k === "plata"\) \{ G\.plata \+= d\.n/.test(FOREST));
}

console.log("\nSE VACÍA SOLO AL VOLVER A LA GRANJA");
{
  G.morral = []; G.res.carne = 0; G.plata = 0; G.invRows = 6;
  ctx.morralMeter("res", "carne", 3);
  ctx.morralMeter("res", "plata", 50);
  const r = ctx.morralDescargar(true);
  ok("lo del morral pasa a la bolsa", Math.floor(G.res.carne) === 3, "carne " + G.res.carne);
  ok("y la plata a la billetera", G.plata === 50, "plata " + G.plata);
  ok("el morral queda vacío", ctx.morralVacio(), JSON.stringify(G.morral));
  ok("descargarlo vacío no rompe nada", ctx.morralDescargar(true).movidas === 0);

  /* si la bolsa está llena, lo que no entra SE QUEDA en el morral — no se borra */
  G.morral = []; G.invRows = 0; G.res = {};
  const ITEM = g("ITEM_RES_ORDER");
  for (let i = 0; i < ctx.invSlots() + 5 && i < ITEM.length; i++) G.res[ITEM[i]] = 99;   // bolsa a tope
  ctx.morralMeter("res", ITEM[ITEM.length - 1], 1);
  const antes = ctx.morralPilas();
  ctx.morralDescargar(true);
  ok("con la bolsa llena, lo que no entra sigue en el morral", ctx.morralPilas() === antes, ctx.morralPilas() + " pila(s)");
}

console.log("\nY SOBREVIVE AL F5 — un refresco no es morir");
{
  G.morral = [{ kind: "res", k: "colmillo", n: 4 }, { kind: "res", k: "plata", n: 120 }];
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  ok("el snapshot lo lleva", Array.isArray(snap.morral) && snap.morral.length === 2);
  G.morral = undefined;
  ctx.hydrate(snap);
  ok("y vuelve igual", ctx.morralPilas() === 2 && ctx.morral()[0].n === 4, JSON.stringify(G.morral));
  ctx.hydrate(Object.assign({}, snap, { morral: [{ k: null, n: 0 }, "basura"] }));
  ok("un guardado corrupto lo deja vacío en vez de romperlo", ctx.morralPilas() === 0);
}

console.log("\nLA VUELTA A LA GRANJA LO DESCARGA — sin tarea extra para el jugador");
{
  const ST = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("zonaSalir lo vuelca antes de calcular la ganancia del viaje",
    /const morralIba = morralPilas\(\);\s*\n\s*if \(morralIba\) morralDescargar\(true\);/.test(ST));
  ok("y el resumen del viaje sabe cuántas pilas traía", /morral: morralIba,/.test(ST));
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("el panel solo se ve DENTRO de la zona", /GF\.scene === "forest"/.test(UI) && /function refreshMorral/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el botín viaja en el morral, y el morral es lo que está en juego.\n");
process.exit(fallos ? 1 : 0);
