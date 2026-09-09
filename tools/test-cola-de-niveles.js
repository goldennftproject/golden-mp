/* LA COLA DE NIVELES SE DERIVA, Y CUESTA LO MISMO EN TIEMPO            (9/9, recomendación 5)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   EL VALLE DEL NIVEL 11. La cola aplanada del 8/9 dejaba esto:
       nivel 10 → 5.000 de XP        nivel 11 → 700
   El escalón más caro de la partida y, justo detrás, uno al 14 % de su precio. Medido con el
   simulador a 3 sesiones/día: el nivel 10 costaba 2,4 DÍAS y el 11 costaba 0,3. Ocho veces más
   fácil de golpe, una sola vez, y después cuarenta niveles subiendo despacio hasta 4.800 — o
   sea que el juego se hundía y volvía a salir.

   LA RECOMENDACIÓN QUE YO HABÍA ESCRITO ERA MALA, y este archivo existe en parte para que no
   vuelva. Decía « que la cola arranque en los 5.000 del nivel 10 y decaiga hasta cerrar en el
   techo ». La razón que cierra esa cuenta es 0,949: 5.000 en el 11 y 650 en el 50, mientras la
   granja TRIPLICA lo que produce por hora. El nivel 50 acabaría costando el 5 % del tiempo del
   11. Cambiar un precipicio al principio por un derrumbe al final no es arreglar nada.

   EL ERROR ERA MEDIR EN PUNTOS. Un escalón no se siente en XP: se siente en TIEMPO, y el tiempo
   es el escalón dividido por lo que tu granja produce — que crece con las celdas. Así que la
   cola se deriva como las expansiones: paso ∝ celdas productivas de ese nivel. El resultado es
   que los cuarenta niveles cuestan las mismas horas-celda (50,0 a 52,4) en vez de ir de 33 a 84.

   LO QUE ESTE ARCHIVO CUSTODIA, en tres frases:
     1 · los diez primeros niveles son de dirección (14/8) y no se tocan;
     2 · la cola se DERIVA de las celdas, no se escribe — y se deriva DESPUÉS de que exista
         FARM_EXPANSION, que es la trampa en la que caí el 8/9 con derivarTareasDeMinado();
     3 · el mes es la ley y el techo es el número que cede: si la forma cambia, se re-mide el
         techo, no al revés.
     node tools/test-cola-de-niveles.js                                                        */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const XP = g("FARM_XP_LVLS"), FE = g("FARM_EXPANSION"), MAX = g("FARM_NIVEL_MAX");
const OBJETIVO = g("FARM_XP_TECHO");
const celdas = (l) => 9 + 3 * FE.filter(n => n <= l).length;
const paso = (l) => XP[l] - XP[l - 1];

console.log("\nLA TABLA EXISTE ENTERA — la derivación corrió, y corrió a tiempo");
{
  ok("hay un punto por nivel, del 0 al " + MAX, XP.length === MAX + 1, XP.length + " puntos");
  ok("y ninguno quedó sin derivar", XP.every(v => typeof v === "number" && isFinite(v)),
    XP.filter(v => typeof v !== "number").length + " sin número");
  /* la trampa del 8/9: derivarTareasDeMinado() vivía pegada a su tabla, ORE_DEF se definía 4.500
     líneas más abajo, el catch se comió el ReferenceError y los números quedaron IDÉNTICOS a los
     de antes. Nada se puso en rojo. Si esta derivación se adelanta, la cola sale escrita a mano
     y el largo delata: se quedaría en 11 puntos. */
  ok("la cola se derivó de verdad y no se quedó en el nivel 10", XP.length > 11,
    "el último es el " + (XP.length - 1));
}

console.log("\nLOS DIEZ PRIMEROS SON DE DIRECCIÓN (14/8) Y NO SE TOCAN");
{
  const CABEZA = [0, 0, 25, 90, 225, 550, 1250, 2750, 5500, 9000, 14000];
  ok("los once primeros puntos siguen siendo los suyos",
    CABEZA.every((v, i) => XP[i] === v), XP.slice(0, 11).join(", "));
}

console.log("\nCADA NIVEL DE LA COLA CUESTA LO MISMO EN HORAS DE GRANJA");
{
  const ritmo = [];
  for (let l = 11; l <= MAX; l++) ritmo.push(paso(l) / celdas(l));
  const min = Math.min(...ritmo), max = Math.max(...ritmo);
  console.log("\n    nivel   celdas   escalón   XP por celda");
  for (const l of [11, 20, 30, 40, MAX]) console.log("   " + String(l).padStart(6) + String(celdas(l)).padStart(9) +
    String(paso(l)).padStart(10) + (paso(l) / celdas(l)).toFixed(1).padStart(15));
  console.log("");
  /* ésta es LA propiedad. Antes iba de 33 (nivel 11) a 84 (nivel 50): dos niveles y medio de
     diferencia en cuánto tarda cada uno, escondidos en una tabla que parecía suave. */
  ok("la cola entera cuesta las mismas horas-celda (±10 %)", max / min < 1.10,
    min.toFixed(1) + " a " + max.toFixed(1) + " XP por celda  (×" + (max / min).toFixed(3) + ")");
}

console.log("\nY NINGÚN NIVEL CUESTA MENOS QUE EL ANTERIOR");
{
  const bajan = [];
  for (let l = 12; l <= MAX; l++) if (paso(l) < paso(l - 1)) bajan.push(l + " (" + paso(l - 1) + "→" + paso(l) + ")");
  /* sale gratis SI se redondea el escalón: los escalones son proporcionales a las celdas, las
     celdas no bajan nunca, y los niveles que comparten celdas comparten escalón exacto.
     Redondear el ACUMULADO en cambio lo rompía en ocho sitios — probado, medido y descartado. */
  ok("la cola nunca da un escalón más barato que el de antes", !bajan.length, bajan.join(" · "));
  ok("y el salto del 10 al 11 ya no es un precipicio del 86 %",
    paso(11) / paso(10) > 0.20, "el 11 cuesta el " + Math.round(paso(11) / paso(10) * 100) + " % del 10 (antes: 14 %)");
  console.log("       → sigue siendo un escalón, y no se puede quitar con aritmética: quedan");
  console.log("         " + (OBJETIVO - XP[10]).toLocaleString("es") + " de XP para " + (MAX - 10) + " niveles. Lo alto que es lo deciden");
  console.log("         los diez primeros, que son de dirección.");
}

console.log("\nEL TECHO CEDE ANTE EL MES, NO AL REVÉS");
{
  ok("el techo real cae cerca del objetivo derivado", Math.abs(XP[MAX] - OBJETIVO) / OBJETIVO < 0.02,
    XP[MAX].toLocaleString("es") + " contra el objetivo de " + OBJETIVO.toLocaleString("es"));
  console.log("       → el resto del redondeo se lo lleva el techo a propósito. Un mes no se mide");
  console.log("         con cuatro cifras significativas; un nivel con un pico del 13 %, sí se ve.");
  console.log("       → medido con el simulador (3 sesiones/día, hasta el 50): 29,7 días.");
  console.log("         Si esta tabla cambia de forma, se vuelve a medir ESO — no se conserva el número.");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la cola se deriva de las celdas y cada nivel cuesta lo mismo en tiempo.\n");
process.exit(fallos ? 1 : 0);
