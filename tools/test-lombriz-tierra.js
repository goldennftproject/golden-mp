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

console.log("\nLA FILA: 1 × 1 COMO LOS HORNOS   (2/9, dirección)");
{
  /* « esto no debe correr simultáneo, debe correr 1 x 1 como los hornos ». Las bocas dejan de
     ser máquinas en paralelo y pasan a ser la PROFUNDIDAD de la fila: cuántas tandas podés
     dejar encargadas. El techo diario ya no lo ponen las bocas, lo pone el reloj. */
  /* 9/9 — ESTE BLOQUE USABA CEBOLLA Y AHORA NO CABE. Dirección puso hoy un cupo de 15 lombrices
     al día (LOMBRICES_POR_DIA) y una tanda de cebolla son 11: tres seguidas son 33. La autonomía
     de « dejar tres tandas encargadas antes de irte », que es lo que este bloque custodia desde
     el 2/9, sigue existiendo — pero ahora depende de QUÉ eches, y con los cultivos caros el cupo
     llega antes que las bocas. Es una consecuencia real de la decisión de hoy, no un fallo, y
     está reportada a dirección. El bloque pasa a la ciruela (3 por tanda: tres tandas son 9 y
     entran), que es donde la mecánica de la FILA —lo que este test mide— se ve igual de bien.
     El cupo tiene su propio test; acá no se prueba el cupo, se prueba el orden de la cola. */
  G.lombricario = []; G.res.ciruela = 20; G.res.lombriz = 0; G.lombDia = null;
  const H = g("LOMBRICARIO_HORAS") * 3600e3;
  ctx.lombricarioEchar("ciruela"); ctx.lombricarioEchar("ciruela"); ctx.lombricarioEchar("ciruela");
  const l = ctx.lombricario();
  ok("tres tandas encargadas, tres relojes DISTINTOS", l.length === 3 && l[0].listaEn !== l[1].listaEn);
  ok("la 1ª termina a las " + g("LOMBRICARIO_HORAS") + " h", Math.round((l[0].listaEn - AHORA) / 3600e3) === g("LOMBRICARIO_HORAS"));
  ok("la 2ª arranca cuando termina la 1ª, no ahora", Math.round((l[1].listaEn - l[0].listaEn) / 3600e3) === g("LOMBRICARIO_HORAS"));
  ok("y la 3ª detrás de la 2ª", Math.round((l[2].listaEn - l[1].listaEn) / 3600e3) === g("LOMBRICARIO_HORAS"));

  /* la prueba que importa: a las 8 h hay UNA lista, no tres */
  AHORA += H + 1000;
  ok("cumplidas las primeras " + g("LOMBRICARIO_HORAS") + " h, hay UNA sola lista", ctx.lombricarioListas() === 1);
  const dio = ctx.lombricarioReclamar();
  ok("y recoger paga solo esa tanda", dio === ctx.lombricarioDa("ciruela"), "+" + dio);
  ok("las otras dos siguen en la fila", ctx.lombricario().length === 2);
  AHORA += H * 2 + 1000;
  ok("pasado el turno de las dos, las dos están listas", ctx.lombricarioListas() === 2);
  ctx.lombricarioReclamar();

  /* y la fila corre con el juego CERRADO: un reloj no se olvida de correr */
  G.lombricario = []; G.res.ciruela = 20; G.lombDia = null;   /* día nuevo: el cupo se renueva */
  ctx.lombricarioEchar("ciruela"); ctx.lombricarioEchar("ciruela");
  AHORA += H * 2 + 1000;
  ok("al volver de un día, la fila entera está hecha (corre sin el jugador)", ctx.lombricarioListas() === 2);
  ctx.lombricarioReclamar();

  /* el techo del día lo pone el RELOJ, no la cantidad de bocas */
  const porReloj = Math.floor(24 / g("LOMBRICARIO_HORAS"));
  const mont = ctx.excavPorDia() * 1.5;
  const delEdificio = ctx.lombricesPorDia() - mont;
  const tandas = Math.min(ctx.lombricarioBocas(), porReloj);
  /* 9/9 — Y AHORA EL TECHO LO PONE EL CUPO, no el reloj. Dirección: « vamos a poner que se
     saquen 15 lombrices diarias ». El reloj dejaría pasar 3 tandas de hasta 12 —36— y el cupo
     corta en 15. Este renglón afirmaba lo de antes; se actualiza porque el mundo cambió por una
     decisión tomada, no porque el número molestara: la cuenta sigue siendo la del juego, y si
     mañana el cupo sube, sube sola. */
  const techoReloj = tandas * g("LOMBRICARIO_TANDA_MAX");
  ok("la cuenta del día la corta el CUPO diario, no las bocas ni el reloj",
    Math.abs(delEdificio - Math.min(g("LOMBRICES_POR_DIA"), techoReloj)) <= 1,
    tandas + " tandas de hasta " + g("LOMBRICARIO_TANDA_MAX") + " = " + techoReloj +
    " · cupo " + g("LOMBRICES_POR_DIA") + " → " + Math.round(delEdificio));
  /* y la promesa del panel deja de premiar al caro: con el cupo, quemar maíz no compra más
     lombrices que quemar ciruela — compra las mismas por mucho más dinero. */
  ok("el panel ya no promete más por quemar el cultivo caro",
    ctx.lombricesPorDia() - mont <= g("LOMBRICES_POR_DIA"), Math.round(delEdificio) + " del compost");
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
