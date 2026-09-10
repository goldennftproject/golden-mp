/* EL PASE ES UNA ESCALERA, NO UNA BOLSA DE NÚMEROS          (9/9, recomendación 6)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   LO QUE HABÍA. Los treinta escalones del carril gratuito, medidos en plata sombra:
       nivel  2 →     10        nivel  7 →  7.740        nivel 14 →     15
       nivel 22 →    480        nivel 27 →  6.000        ×774 entre el más flojo y el más rico
   Y sin ningún orden: el 7 pagaba más que los otros veintinueve juntos y el 14 pagaba quince.
   Un pase le pide UNA cosa al diseño —que subir valga más que no subir— y ésta no la cumplía.

   LA CAUSA NO ERAN LOS NÚMEROS, ERA QUIÉN LOS ESCRIBÍA. La tabla fijaba CANTIDADES a mano
   (« 3 Pan de Trigo ») en una economía donde los precios se derivan y se mueven. Tres panes eran
   baratos el día que se escribió esa fila; hoy un pan cuesta 2.580 porque dishPrice sale de sus
   ingredientes. La fila no cambió; el suelo debajo, sí. Es el mismo fallo que el tablón tenía con
   los minerales y la Caña de Hierro con su presupuesto.

   LA REGLA NUEVA: LA TABLA DICE QUÉ, EL CÓDIGO DICE CUÁNTO. Cada escalón paga UNA HORA de la
   granja que el jugador tiene A ESA ALTURA — la vara de las expansiones. Y « esa altura » no se
   estima: se deriva del reloj de la propia curva de niveles, porque el tiempo de un nivel es su
   XP dividida por las celdas que la producen.

   LO QUE ESTE ARCHIVO CUSTODIA:
     1 · el pase sube, escalón a escalón, y ningún premio se dispara;
     2 · el $Golden NO se deriva (la auditoría del 18/8 lo dejó clavado para que el VIP no se
         autofinanciara — derivarlo reabriría ese agujero por la puerta de atrás);
     3 · y donde el objeto elegido no da la altura de su nivel, el juego lo DICE en vez de
         taparlo con un recorte silencioso.
     node tools/test-premios-del-pase.js                                                       */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const FREE = g("PASS_FREE"), VIP = g("PASS_VIP"), NIV = g("PASE_NIVELES");
const CROP = g("CROP_DEF"), REC = g("RECIPE_DEF"), PRICE = g("PRICE");
const unidad = (r) => r.res ? (CROP[r.res[0]] ? CROP[r.res[0]].price : (PRICE[r.res[0]] != null ? PRICE[r.res[0]] : ctx.matValor(r.res[0])))
  : r.seed ? ((CROP[r.seed[0]] || {}).seed || (CROP[r.seed[0]] || {}).price || 0)
  : r.dish ? ctx.dishPrice(REC[r.dish[0]]) : 0;
const paga = (r) => { const u = unidad(r); return u ? u * (r.res || r.seed || r.dish)[1] : 0; };

console.log("\nLA ESCALERA SUBE: CADA ESCALÓN VALE MÁS QUE EL ANTERIOR");
{
  const metas = [];
  for (let n = 1; n <= NIV; n++) metas.push(ctx.paseValorDelEscalon(n));
  let baja = null;
  for (let i = 1; i < metas.length; i++) if (metas[i] < metas[i - 1]) baja = i + 1;
  console.log("\n    pase   granja   celdas   lo que paga el escalón");
  for (const n of [1, 10, 20, NIV]) console.log("   " + String(n).padStart(5) + String(ctx.paseNivelDeGranja(n)).padStart(9) +
    String(ctx.paseCeldas(n)).padStart(9) + String(ctx.paseValorDelEscalon(n)).padStart(25));
  console.log("");
  ok("la vara del pase nunca baja", !baja, baja ? "baja en el " + baja : metas[0] + " → " + metas[metas.length - 1]);
  ok("y sube de verdad de punta a punta", metas[NIV - 1] / metas[0] > 3,
    "×" + (metas[NIV - 1] / metas[0]).toFixed(1) + " del primero al último");
}

console.log("\nEL RELOJ QUE USA ES EL DEL JUEGO, NO UNO INVENTADO");
{
  /* si esto se descuelga, la altura del pase deja de tener que ver con la granja del jugador y
     todo lo demás de este archivo mide una escalera que no está apoyada en ningún lado.
     Contraste con el simulador del día: nivel 10 al 29 % del mes, nivel 21 al 51 %. */
  const frac = (l) => {
    const XP = g("FARM_XP_LVLS"), FE = g("FARM_EXPANSION"), MAX = g("FARM_NIVEL_MAX");
    const celdas = (x) => 9 + 3 * FE.filter(y => y <= x).length;
    let t = 0, hasta = 0;
    for (let x = 2; x <= MAX; x++) { t += (XP[x] - XP[x - 1]) / celdas(x); if (x === l) hasta = t; }
    return hasta / t;
  };
  ok("el nivel 10 de granja cae cerca del 29 % del mes que midió el simulador",
    Math.abs(frac(10) - 0.29) < 0.06, (frac(10) * 100).toFixed(0) + " %");
  ok("y el 21, cerca del 51 %", Math.abs(frac(21) - 0.51) < 0.08, (frac(21) * 100).toFixed(0) + " %");
  ok("el pase arranca en una granja chica y termina en la grande",
    ctx.paseNivelDeGranja(1) < 10 && ctx.paseNivelDeGranja(NIV) === g("FARM_NIVEL_MAX"),
    "granja " + ctx.paseNivelDeGranja(1) + " → " + ctx.paseNivelDeGranja(NIV));
}

console.log("\nNINGÚN PREMIO SE DISPARA — el 7 pagaba más que los otros veintinueve juntos");
{
  const valores = FREE.map(paga).filter(v => v > 0);
  const total = valores.reduce((a, b) => a + b, 0);
  const mayor = Math.max(...valores);
  ok("ningún escalón se lleva más del 15 % del carril entero", mayor / total < 0.15,
    "el más rico paga " + Math.round(mayor) + " de " + Math.round(total) + " (" + Math.round(mayor / total * 100) + " %)");
  /* el total apenas se movió: esto redistribuye, no infla. Si algún día sube de golpe, alguien
     convirtió « ordenar el pase » en « regalar más », que no es lo mismo. */
  ok("y el carril no se volvió más caro que antes de ordenarlo", total < 30000,
    Math.round(total) + " de plata sombra en los 30 escalones (antes: ~20.300)");
}

console.log("\nEL $GOLDEN NO SE DERIVA — el candado del 18/8 sigue puesto");
{
  const suma = VIP.reduce((s, r) => s + (r.golden || 0), 0);
  ok("el carril VIP sigue devolviendo exactamente 60 $Golden", suma === 60, suma + " $G");
  console.log("       → cuesta 250 y devuelve 60 (24 %). En su día devolvía 245 sobre 250 y");
  console.log("         comprar niveles sueltos daba ganancia: una imprenta de moneda premium.");
  ok("y ningún nivel suelto devuelve más de lo que cuesta comprarlo",
    VIP.every(r => (r.golden || 0) <= g("PASS_LVL_GOLD")), "tope " + g("PASS_LVL_GOLD") + " $G");
}

console.log("\nY LO QUE NO CUADRA, SE DICE EN VOZ ALTA");
{
  const fuera = ctx.paseDesviados();
  console.log("");
  for (const x of fuera) console.log("    nivel " + String(x.nivel).padStart(2) + "  paga " + String(x.paga).padStart(5) +
    " de " + String(x.meta).padStart(5) + "  (×" + x.factor + ")   " + x.que);
  console.log("");
  /* 9/9 — ESTO PEDÍA « seis o menos », y era lo correcto MIENTRAS la decisión estuviera abierta:
     cuatro escalones daban un objeto que valía 2 o valía 2.580, y ninguna cantidad legible daba
     su altura. Se cambió el OBJETO en tres (papa→calabaza, pan de trigo→sopa, papa asada→guiso)
     y en el cuarto —las flechas, que son de un escalón de combate— se subió el tope de la pila.
     Ya no queda ninguno, así que el test pide lo que hay: CERO. Dejarlo en « seis o menos »
     sería guardar sitio para seis fallos futuros. */
  ok("todos los escalones caen en su altura", !fuera.length,
    fuera.length + " de " + NIV + " fuera del ±35 %");
  console.log("       → si esto vuelve a subir, es que un objeto nuevo del pase vale demasiado");
  console.log("         poco o demasiado para su escalón. El arreglo es cambiar el OBJETO por");
  console.log("         otro de su familia, no la cantidad: la cantidad ya la deriva el código.");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el pase sube, no imprime, y dice dónde no llega.\n");
process.exit(fallos ? 1 : 0);
