/* EL TABLÓN PAGA LO QUE LAS COSAS VALEN                      (8/9, auditoría general)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La regla es del 31/8, del barrido de imprentas, y está escrita en pedPool: « paga el valor
   EXACTO, 1,0× ». Aquel día se le quitó a los platos una prima ×2 que no tenía porqué. Los
   minerales se quedaron con la suya, y encima tasados con una tabla vieja.

   LO QUE PASABA, medido sobre 3.000 pedidos generados:
     · pedPool tasaba los minerales con ORE_DEF[k].price — {bronce:12, hierro:15, oro:30,
       diamante:80, netherita:200}— mientras el juego VENDE con PRICE: {160, 240, 280, 360, 480}.
       Seis Hierro pagaban 180 por 1.440 de valor real: el 12,5 %. Setenta y dos horas-celda de
       ancla a cambio de nada.
     · los platos, lo mismo un piso más abajo: r.plata es la planilla a mano y la venta usa
       dishPrice(r), que se DERIVA de los ingredientes. El pan de trigo vale 2.580 y su r.plata
       decía 22 — ratio 0,009. Y al revés, la papa asada pagaba 5 por 3 de valor: 1,667.
     · los trece cultivos, la madera y la piedra estaban PERFECTOS, y por el mismo motivo por el
       que los otros estaban rotos: esos sí preguntan a priceOf.

   Y el arreglo destapó la segunda mitad: al atar el mineral a priceOf, el « × 2 » que quedaba
   pasó a pagar el DOBLE del valor. Ese factor existía para compensar a ojo un precio demasiado
   barato — cuando se arregla el precio, la compensación se vuelve el error.

   Lo que este archivo custodia es UNA frase: el tablón no inventa precios, los pregunta.
     node tools/test-tablon-precios.js                                                        */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const ORE = g("ORE_DEF"), REC = g("RECIPE_DEF"), CROP = g("CROP_DEF");

/* se abre TODO para que el pool salga completo: minado de los cinco minerales, todas las recetas
   cocinadas alguna vez, y el nivel de Cultivo al techo para que ningún cultivo quede fuera. */
G.stats = {};
for (const k in ORE) if (k !== "piedra") ctx.statAdd("minar", k, 1);
for (const k in REC) ctx.statAdd("cocinar", k, 1);
G.dishes = {}; for (const k in REC) G.dishes[k] = 1;
/* el tablón solo pide platos si tenés la Cocina en pie — sin esto el pool sale sin ellos y el
   test aprobaría sin haber mirado la mitad de lo que vino a mirar. */
G.built = G.built || {}; G.built.cocina = 1;
G.skills = G.skills || {}; G.skills.farming = 1e9;
G.level = g("FARM_NIVEL_MAX");

/* CUÁNTO VALE DE VERDAD: se le pregunta a la misma función con la que el jugador COBRA cuando
   vende. Si este test tuviera su propia tabla de precios sería justamente el fallo que denuncia. */
const valeDeVerdad = (p) => {
  if (p.tipo === "dish") return ctx.dishPrice(REC[p.key]) * p.n;
  if (CROP[p.key]) return (CROP[p.key].price || 0) * (CROP[p.key].yield || 1) * p.n;
  return (ctx.priceOf(p.key) || 0) * p.n;
};

const pool = ctx.pedPool();

console.log("\nEL POOL TRAE LAS CUATRO FAMILIAS — si una falta, este test no prueba nada");
{
  const hay = (f) => pool.some(f);
  ok("cultivos", hay(p => !!CROP[p.key]), pool.filter(p => CROP[p.key]).length + " en el pool");
  ok("madera y piedra", hay(p => p.key === "madera") && hay(p => p.key === "piedra"));
  ok("los cinco minerales", pool.filter(p => ORE[p.key] && p.key !== "piedra").length === 5,
    pool.filter(p => ORE[p.key] && p.key !== "piedra").map(p => p.key).join(", "));
  ok("y los platos", hay(p => p.tipo === "dish"), pool.filter(p => p.tipo === "dish").length + " en el pool");
}

console.log("\nY CADA UNO PAGA EXACTAMENTE LO QUE VALE (1,0×)");
{
  let peor = 1, quien = "", detalle = "";
  const malos = [];
  for (const p of pool) {
    const v = valeDeVerdad(p);
    if (!v) { malos.push(p.key + " no tiene precio"); continue; }
    const r = p.val / v;
    if (Math.abs(Math.log(r)) > Math.abs(Math.log(peor))) {
      peor = r; quien = p.key; detalle = p.n + " × " + p.key + ": paga " + p.val + ", vale " + v;
    }
  }
  ok("ninguna pila del pool se desvía del valor real", Math.abs(peor - 1) < 0.02,
    peor === 1 ? "las " + pool.length + " pilas al 1,000" : "peor: " + detalle + " (×" + peor.toFixed(3) + ")");
  ok("y todas tienen precio", !malos.length, malos.join(" · "));
}

console.log("\nLOS DOS SITIOS DONDE EL PRECIO SE PREGUNTA, NO SE COPIA");
{
  const S = require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  /* SE MIRA EL CÓDIGO, NO LOS COMENTARIOS. La primera versión de este bloque buscaba el patrón
     viejo en el texto crudo y saltaba en rojo… por culpa de los comentarios que yo mismo acababa
     de escribir en pedPool citando el código que se retiró. Un medidor que confunde la
     documentación de un arreglo con el fallo que arregla es exactamente lo que esta auditoría
     vino a cazar, así que primero se quitan los comentarios y después se busca.
     Si alguien vuelve a escribir ORE_DEF[k].price o r.plata como VALOR del pedido, el tablón
     vuelve a tener su propia idea de lo que valen las cosas — y eso no suena hasta que alguien
     hace la cuenta a mano meses después. */
  const crudo = S.slice(S.indexOf("function pedPool"), S.indexOf("function pedidoGenerar"));
  const pp = crudo.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  ok("el mineral sale de priceOf", /priceOf\(k\)/.test(pp), "");
  ok("el plato sale de dishPrice", /dishPrice\(r\)/.test(pp), "");
  ok("y no queda ninguna prima × 2 escondida", !/\.price \|\| 6\) \* 2/.test(pp) && !/\(r\.plata \|\| 8\) \* 2/.test(pp));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el tablón no inventa precios, los pregunta.\n");
process.exit(fallos ? 1 : 0);
