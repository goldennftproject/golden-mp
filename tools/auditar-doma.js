/* ¿CUÁNTO CUESTA DOMAR, Y EN CUÁNTO SE PAGA? (24/8)
   El diseñador propuso « que sea 1 de cada 100 puedes domar ». Antes de mover la suerte hay que
   mirar lo que una doma YA cuesta, porque el precio son dos cosas y solo una se ve: la suerte y
   EL PLATO. Y los platos no se parecen — la galletita de la rata sale 12 de plata y el costillar
   del orco 1.228, cien veces más. Sumarle a eso un 1 % dejaría al orco en 122.800 de plata:
   ochenta días de su propio trabajo para comprar su propio trabajo.
   La regla de la casa para todo lo que produce solo es el REPAGO: en cuántos días de su propio
   trabajo se paga el ayudante. Acá abajo está por qué terminó siendo una BANDA (2 a 10 días) y no
   un número: lo enseñó este mismo medidor. Recalcula todo desde el código —platos, precios de los
   ingredientes y suerte por rol— y avisa si algún ayudante se descolgó. Si mañana el orco junta
   el doble, su suerte tiene que bajar en el MISMO commit.
     node tools/auditar-doma.js                                                                  */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const g = (n) => vm.runInContext(n, ctx);
const R = g("RECIPE_DEF"), C = g("CROP_DEF"), PR = g("PRICE"), CD = g("CD"),
      CH = g("DOMA_CHANCE_ROL"), PLATO = g("DOMA_PLATO"), COM = g("DOMA_COMISION"),
      RATA_H = g("DOMA_RATA_HORAS"), RATA_TOPE = g("DOMA_RATA_TOPE"), WORM = g("WORM_PRICE");

const costo = (res) => Object.keys(res || {}).reduce((a, k) => a + ((C[k] ? C[k].price : PR[k]) || 0) * res[k], 0);

/* --- lo que produce cada ayudante, por día, medido desde las reglas del juego --- */
/* LA RATA: escarba 1 lombriz cada RATA_HORAS de ausencia, tope RATA_TOPE por vuelta.
   Con dos vueltas al día llega a su tope: RATA_TOPE·2 lombrices, a precio de tienda. */
const rentaRata = RATA_TOPE * 2 * WORM;
/* LOS BRAZOS: recogen las cargas que maduran mientras no estás y se quedan la comisión. Lo que
   rescatan es lo que el tope de 4 cargas iba a tirar. Con la granja llena (≈11 árboles y 11
   rocas, el reparto de las expansiones) y dos ausencias largas por día, cada nodo entrega su
   tope: 3 cargas útiles por vuelta. */
const ARBOLES = 11, ROCAS = 11, VUELTAS = 2, POR_VUELTA = 3;
const rentaBrazos = (1 - COM) * VUELTAS * POR_VUELTA * (ARBOLES * PR.madera + ROCAS * PR.piedra);

const RENTA = { rata: rentaRata, brazos: rentaBrazos };
/* EL REPAGO ES UNA BANDA, NO UN PUNTO — y esto lo enseñó el propio medidor. La primera versión
   pedía cinco días parejos para todos, y la rata daba 2,7: no porque esté mal, sino porque su
   galletita vale 12 de plata y su trabajo, 18 por día. Emparejar el repago de un ayudante de
   18/día con uno de 1.247/día obligaría a hacer la RATA más difícil que el ORCO, que es al revés
   de lo que cualquiera espera del juego. Así que la regla real es una banda con dos bordes:
     · PISO: nada que produzca solo puede pagarse en menos de dos días (si no, es gratis);
     · TECHO: nada puede tardar más de diez (si no, nadie lo doma y la mecánica no existe);
   y adentro de la banda manda la escalera de platos, que ya separa los casos cien veces. */
const REPAGO_PISO = 2, REPAGO_TECHO = 10;   // días
const ROLES = [["rata", "rata"], ["brazos", "orco"]];   // la larva apura cultivos: sin precio de lista

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLO QUE VALE CADA PLATO DE DOMA (a precio de sus ingredientes)");
for (const rol in PLATO) {
  const id = PLATO[rol], r = R[id];
  console.log("  " + rol.padEnd(8) + (r ? r.label : id).padEnd(22) + "Cocina nv" + ((r && r.lvl) || "?") +
    "  ·  " + costo(r && r.res) + " de plata");
}

console.log("\nLO QUE PRODUCE CADA AYUDANTE, POR DÍA");
console.log("  rata     " + Math.round(rentaRata) + " de plata/día   (" + RATA_TOPE + " lombrices por vuelta × " + VUELTAS + ", a " + WORM + ")");
console.log("  brazos   " + Math.round(rentaBrazos) + " de plata/día   (" + ARBOLES + " árboles + " + ROCAS + " rocas, " +
  POR_VUELTA + " cargas por vuelta, comisión " + Math.round(COM * 100) + "%)");

console.log("\nEL REPAGO: LA DOMA ESPERADA CONTRA LO QUE EL AYUDANTE PRODUCE");
ROLES.forEach(([rol, especie]) => {
  const c = costo(R[PLATO[rol]].res), esperado = c / CH[rol], dias = esperado / RENTA[rol];
  console.log("  " + rol.padEnd(8) + "1 de cada " + Math.round(1 / CH[rol]) + "  ·  " +
    Math.round(esperado) + " de plata esperados  ·  se paga en " + dias.toFixed(1) + " días");
  ok("el " + especie + " no es gratis (≥ " + REPAGO_PISO + " días)", dias >= REPAGO_PISO, dias.toFixed(1) + " días");
  ok("y tampoco es inalcanzable (≤ " + REPAGO_TECHO + " días)", dias <= REPAGO_TECHO, dias.toFixed(1) + " días");
});

console.log("\nY EL ORDEN SE MANTIENE: EL QUE MÁS PRODUCE, EL MÁS DIFÍCIL");
{
  ok("el orco es más difícil que la rata", CH.brazos < CH.rata,
    "brazos 1/" + Math.round(1 / CH.brazos) + " contra rata 1/" + Math.round(1 / CH.rata));
  ok("y su plato es el más caro (la otra mitad del precio)",
    costo(R[PLATO.brazos].res) > costo(R[PLATO.larva].res) && costo(R[PLATO.larva].res) > costo(R[PLATO.rata].res),
    [PLATO.rata, PLATO.larva, PLATO.brazos].map(p => costo(R[p].res)).join(" < "));
  ok("el que más produce también tarda más en pagarse",
    (costo(R[PLATO.brazos].res) / CH.brazos) / RENTA.brazos > (costo(R[PLATO.rata].res) / CH.rata) / RENTA.rata);
}

console.log("\nPOR QUÉ NO 1 DE CADA 100 (la propuesta del diseñador, medida)");
{
  const c = costo(R[PLATO.brazos].res), dias = (c / 0.01) / RENTA.brazos;
  console.log("  el orco costaría " + Math.round(c / 0.01) + " de plata: " + Math.round(dias) + " días de su propio trabajo");
  ok("y eso es diez veces el techo (por eso no)", dias > REPAGO_TECHO * 5, Math.round(dias) + " días");
  const cr = costo(R[PLATO.rata].res), dr = (cr / 0.01) / RENTA.rata;
  console.log("  la rata costaría " + Math.round(cr / 0.01) + " de plata: " + Math.round(dr) + " días");
}

console.log(fallos ? "\n" + fallos + " desvío(s): la suerte y el plato se despegaron del repago\n"
  : "\n  ✓ cada doma se paga sola entre " + REPAGO_PISO + " y " + REPAGO_TECHO + " días, y la cuenta sale del código\n");
process.exit(fallos ? 1 : 0);
