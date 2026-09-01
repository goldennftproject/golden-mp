/* LA LOMBRIZ SOLO NACE DE LA TIERRA                                     (1/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Tres frases de Discord, las tres del mismo minuto:
     « será que quitamos las lombrices de allí? porque hay un vale que da lombrices »
     « el lombricero debe tener listas las lombrices, no mandarlas al bag »
     « solo quisiera que se obtengan por los montículos que salen en la granja y quemando
       cultivos… y buscar una dinámica que mientras más alto sea el cultivo da más lombrices »

   Lo que este archivo custodia, en orden:
     · el COMPOST POR VALOR: lombrices = valor quemado ÷ precio sombra de la lombriz (3).
       La ratio es constante — ningún cultivo es « el truco » — pero el caro rinde más POR
       BOCA, que es exactamente la dinámica pedida;
     · el RECLAMO EN EL EDIFICIO: lo listo no cae a la bolsa — espera con su « ! », como el
       Horno y la Cocina (regla #127);
     · y las PUERTAS CERRADAS: ni el vale, ni el pase, ni la tienda dan lombrices. Montículos
       y compost, nada más.
     node tools/test-lombriz-tierra.js                                                         */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let AHORA = Date.UTC(2026, 8, 1, 15);
ctx.nowMs = () => AHORA;
vm.runInContext("nowMs = window.nowMs;", ctx);

console.log("\nEL COMPOST PAGA POR VALOR — MÁS ALTO EL CULTIVO, MÁS LOMBRICES");
{
  const CROP = g("CROP_DEF"), PIDE = g("LOMBRICARIO_PIDE"), WP = g("WORM_PRICE");
  ok("dos papas dan 1 lombriz", ctx.lombricarioDa("papa") === 1,
    "2 × " + CROP.papa.price + " de plata ÷ " + WP);
  ok("dos cebollas dan bastantes más", ctx.lombricarioDa("cebolla") > ctx.lombricarioDa("papa") * 3,
    ctx.lombricarioDa("cebolla") + " lombrices");
  /* la dinámica pedida, medida en TODA la escalera: nunca un cultivo más caro da menos */
  const orden = g("CROP_ORDER").slice().sort((a, b) => (CROP[a].price || 0) - (CROP[b].price || 0));
  let monotona = true;
  for (let i = 1; i < orden.length; i++)
    if (ctx.lombricarioDa(orden[i]) < ctx.lombricarioDa(orden[i - 1])) monotona = false;
  ok("« mientras más alto sea el cultivo, da más lombrices » — en toda la escalera", monotona);
  /* la ratio: hasta el tope de la boca, quemar vale ~lo mismo por plata (±redondeo) — ningún
     cultivo es « el truco ». POR ENCIMA del tope la ratio EMPEORA a propósito: la boca de 8 h
     no se agranda porque le eches un maíz entero (LOMBRICARIO_TANDA_MAX, el freno que evita
     que el veterano queme el granero y la laguna pase de oficio a imprenta). Lo que no puede
     pasar NUNCA es una ratio mejor que el precio sombra: eso sí sería fabricar lombrices. */
  const TOPE = g("LOMBRICARIO_TANDA_MAX");
  const ratios = orden.map(k => (PIDE * CROP[k].price) / ctx.lombricarioDa(k));
  ok("ninguna ratio baja del precio sombra (" + WP + ") — no se fabrican lombrices baratas",
    ratios.every(r => r >= WP * 0.6), ratios.map(r => r.toFixed(1)).join(" · "));
  const sinTope = orden.filter(k => (PIDE * CROP[k].price) / WP < TOPE);
  ok("y hasta el tope de la boca la ratio es pareja (~" + WP + ")",
    sinTope.every(k => { const r = (PIDE * CROP[k].price) / ctx.lombricarioDa(k); return r >= WP * 0.6 && r <= WP * 1.4; }));
  ok("el tope existe y una boca jamás da más de " + TOPE,
    orden.every(k => ctx.lombricarioDa(k) <= TOPE));
  /* QUIÉN ELIGE: EL JUGADOR (dirección, segunda vuelta del mismo día): « quizás quiera vender
     el cultivo más caro en otro lugar ». El juego ofrece la lista con la cuenta a la vista;
     echar sin decir cuál es un error, no un default. */
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "farming");
  G.skills = { farming: acc, fishing: acc };
  G.res.papa = 10; G.res.cebolla = 10;
  const lista = ctx.lombricarioCultivos();
  ok("la lista ofrece TODO lo que tenga stock, no una elección hecha",
    lista.indexOf("papa") >= 0 && lista.indexOf("cebolla") >= 0);
  ok("echar sin elegir cultivo no echa nada", ctx.lombricarioEchar() === false);
  G.lombricario = [];
  ok("y el jugador puede quemar el BARATO aunque tenga el caro — la elección es suya",
    ctx.lombricarioEchar("papa") === true && ctx.lombricario()[0].cultivo === "papa");
}

console.log("\nLO LISTO ESPERA EN EL EDIFICIO   (« no mandarlas al bag »)");
{
  G.lombricario = []; G.res.lombriz = 0; G.res.cebolla = 10;
  ok("se echa una tanda", ctx.lombricarioEchar("cebolla") === true);
  const antes = G.res.lombriz;
  AHORA += (g("LOMBRICARIO_HORAS") + 1) * 3600e3;   // pasa el reloj
  ctx.lombricarioCheck();                             // el mirón viejo, que ANTES entregaba solo
  ok("cumplido el reloj, la bolsa sigue igual: nada cae solo", G.res.lombriz === antes);
  ok("la boca sigue ocupada — lo listo espera", ctx.lombricario().length === 1);
  ok("y el edificio lo anuncia hacia afuera", ctx.pendienteDe("lombricario") === 1);
  ok("sumando al « ! » general", ctx.hayPendientes() >= 1);
  const dio = ctx.lombricarioReclamar();
  ok("recoger entrega lo prometido al echar", dio === ctx.lombricarioDa("cebolla") && G.res.lombriz === antes + dio,
    "+" + dio);
  ok("y libera la boca", ctx.lombricario().length === 0 && ctx.pendienteDe("lombricario") === 0);
  /* la tanda de ANTES del 1/9 no traía n: paga las 3 de la regla vieja — sin resetear a nadie */
  G.lombricario = [{ cultivo: "papa", listaEn: AHORA - 1000 }];
  ok("una tanda vieja (sin n guardado) paga las 3 de su época", ctx.lombricarioReclamar() === 3);
}

console.log("\nLAS OTRAS PUERTAS, CERRADAS   (montículos y compost, nada más)");
{
  ok("la tienda de vales ya no tiene Lata de lombrices",
    !g("VALES_SHOP").some(it => it.id === "lombrices"));
  ok("el pase de batalla tampoco regala lombrices",
    !g("PASS_FREE").some(r => r.res && r.res[0] === "lombriz"));
  const src = ["state.js", "ui.js"].map(f => fs.readFileSync(path.join(RAIZ, "public/game", f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")).join("\n");
  ok("buyWorm se fue: la lombriz no se compra en ninguna parte", !/function buyWorm/.test(src));
  ok("WORM_PRICE queda: es el precio SOMBRA que tasa el compost", typeof g("WORM_PRICE") === "number");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la lombriz nace de la tierra, y se recoge donde nació.\n");
process.exit(fallos ? 1 : 0);
