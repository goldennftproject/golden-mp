/* EL PEZ CON SU PESO EN LA BOLSA — Y EL MOSTRADOR DONDE VENDERLO           (2/9, Discord)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección, con el « perfect » de Suren: « los peces en el bag deben dividirse por peso
   aunque sean de la misma especie ». Y su última pregunta del día: « los peces dicen (se
   venden por x cantidad de plata) pero ¿dónde se venden? » — hasta hoy, EN NINGÚN LADO: la
   bolsa prometía un precio que ninguna ventanilla pagaba.

   Este archivo custodia la obra completa: la clave especie@kg, la mudanza de guardados
   viejos, la venta en la Lonja al precio DEL PESO, las recetas que ahora sí se pueden
   cocinar con peces de la v4 (pedían claves fósiles), la Lonja que descuenta por especie,
   y el viaje por el F5.
     node tools/test-peces-por-peso.js                                                      */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA CLAVE LLEVA LA BALANZA");
{
  G.fish = {};
  const k1 = ctx.pezGuardar("merluza", 2.35), k2 = ctx.pezGuardar("merluza", 4.1), k3 = ctx.pezGuardar("merluza", 2.35);
  ok("dos merluzas de distinto kg son DOS pilas", k1 !== k2 && Object.keys(G.fish).length === 2, k1 + " · " + k2);
  ok("y dos del mismo kg, UNA pila de 2", k1 === k3 && G.fish[k1] === 2);
  ok("la especie se recupera de la clave", ctx.pezDeClave(k2).id === "merluza" && ctx.pezDeClave(k2).kg === 4.1);
  ok("la cuenta por especie suma todas las pilas", ctx.pezCuenta("merluza") === 3);
}

console.log("\nEL MOSTRADOR DE LA LONJA PAGA EL PESO, NO LA TABLA");
{
  const cotiza = (kg) => ctx.pezPrecio("merluza", kg);
  ok("el precio depende del kg", cotiza(4.1) > cotiza(2.35), cotiza(2.35) + " vs " + cotiza(4.1));
  G.plata = 0;
  const kChico = ctx.pezClave("merluza", 2.35), kGrande = ctx.pezClave("merluza", 4.1);
  const cobrado = ctx.pezVender(kGrande, 1);
  ok("vender la grande paga SU precio", cobrado === cotiza(4.1) && G.plata === cobrado, "+" + cobrado);
  ok("y la pila se descuenta (la vacía desaparece)", !G.fish[kGrande] && G.fish[kChico] === 2);
  ok("un fósil de la v2 no se vende en el mostrador", (() => { G.fish.comun = 1; const r = ctx.pezVender("comun", 1); delete G.fish.comun; return r === 0; })());
}

console.log("\nLAS RECETAS VUELVEN A PODER COCINARSE (pedían claves fósiles)");
{
  /* pescado_asado pide fish:{comun:1} — con la v4 la bolsa guarda especies, nunca « comun ».
     Ahora esa clave se lee como BANDA: cualquier pez común de la bolsa sirve, el más liviano
     primero (lo grande se guarda para la balanza). */
  G.fish = {};
  ctx.pezGuardar("merluza", 2.0); ctx.pezGuardar("merluza", 5.0);   // merluza es banda común
  const R = g("RECIPE_DEF").pescado_asado;
  ok("la banda « comun » del asado encuentra a la merluza", ctx.pezCuenta("comun") === 2);
  ok("y al cocinar se gasta la LIVIANA", (() => { ctx.pezSacar("comun", 1); return !G.fish[ctx.pezClave("merluza", 2.0)] && !!G.fish[ctx.pezClave("merluza", 5.0)]; })());
  ok("el fósil v2 también cuenta como su banda (los guardados viejos cocinan igual)",
    (() => { G.fish.comun = 1; const n = ctx.pezCuenta("comun"); delete G.fish.comun; return n === 2; })());
}

console.log("\nLA MUDANZA: EL CONTADOR VIEJO RECIBE SU BALANZA");
{
  G.fish = { merluza: 3, comun: 2 };                       // un guardado de antes del 2/9
  const movidos = ctx.pezMigrarPesos();
  const kMedio = ctx.pezClave("merluza", ctx.pezPesoMedio("merluza"));
  ok("las 3 merluzas pasan a una pila con el peso medio de la especie", movidos === 3 && G.fish[kMedio] === 3, kMedio);
  ok("el fósil v2 queda quieto (sigue siendo cocinable)", G.fish.comun === 2);
  ok("y correrla dos veces no toca nada (idempotente)", ctx.pezMigrarPesos() === 0 && G.fish[kMedio] === 3);
}

console.log("\nEL F5 Y LA BOLSA LLENA");
{
  /* ojo con el fósil: mudanzaPescaV4 (27/8) LIQUIDA las claves v2 a plata en cada carga —
     comun:2 no viaja como pez, viaja como 10 de plata. Es su comportamiento de siempre y es
     correcto; lo que este test custodia es que las pilas CON PESO pasen intactas. */
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  const pilas = Object.fromEntries(Object.entries(G.fish).filter(([k]) => k.includes("@")));
  const plata0 = G.plata || 0;
  G.fish = undefined; ctx.hydrate(snap);
  const pilas2 = Object.fromEntries(Object.entries(G.fish).filter(([k]) => k.includes("@")));
  ok("las pilas con peso sobreviven al F5 tal cual", JSON.stringify(pilas2) === JSON.stringify(pilas));
  ok("y el fósil v2 se liquidó a plata en la mudanza, como siempre", !G.fish.comun && (G.plata || 0) > plata0);
  ok("roomForFish pregunta por una pila NUEVA (cada captura puede serlo)",
    /__prueba@/.test(String(g("roomForFish"))));
}

console.log("\nY LA LETRA DE LA INTERFAZ");
{
  const fs = require("fs");
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("la Lonja tiene su pestaña Vender", /data-ltab="vender"/.test(HTML) && /lonjaPintaVender/.test(UI));
  ok("la captura entra con pezGuardar(r.id, r.kg)", /pezGuardar\(r\.id, r\.kg\)/.test(UI));
  ok("el tooltip dice DÓNDE se vende (la pregunta de dirección)", /se vende por " \+ precio \+ " de plata en la Lonja/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cada pez con su peso, y una ventanilla que por fin paga lo que el cartel promete.\n");
process.exit(fallos ? 1 : 0);
