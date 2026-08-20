/* ¿ALGÚN NODO TE DEJA EMPEZAR PARA NEGÁRTELO DESPUÉS? (19/8, dirección)
   "Tiro la caña igual, la barra carga, y después me dice que la laguna está en reposo. Tiene que
    parar antes."
   Tenía razón y era un caso único: la comprobación del descanso vivía dentro de goFishing(), que
   corre al TERMINAR el lanzamiento. Los demás nodos avisan antes de mover un dedo.
   Este auditor busca esa forma de error en todos lados a la vez. La regla es simple y vale para
   cualquier juego con acciones que tardan:

     TODA razón por la que una acción puede fallar tiene que comprobarse ANTES de empezarla.

   Si una comprobación solo existe al final, el jugador paga el gesto y la espera para recibir un
   "no". Y lo peor es que no parece un fallo del juego: parece que el juego se burla.
     node tools/auditar-avisos.js                                                                 */
const fs = require("fs");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const STATE = fs.readFileSync("public/game/state.js", "utf8");
let avisos = 0;
const ok = (n, c, d) => { if (!c) avisos++; console.log((c ? "  ok  " : "  !!  ") + n.padEnd(46) + (d || "")); };

/* El bloque que interesa es el del CLIC, o sea todo lo que pasa justo antes de startAction("fish").
   Ojo con el ancla: la primera versión de esto partía el archivo por `if (o.type === "fish")` y
   caía en la línea 486, que es un `continue` del bucle de sprites — nada que ver. El resultado
   fueron cuatro "fallos" inventados sobre un código que estaba bien. Se busca hacia ATRÁS desde la
   llamada real. */
const iFish = FARM.indexOf('startAction("fish"');
const antesDeEmpezar = iFish < 0 ? "" : FARM.slice(Math.max(0, iFish - 1400), iFish);

console.log("\nLA LAGUNA (el caso que reportó dirección)\n");
{
  ok("el descanso se comprueba ANTES de tirar la caña", /pescaCdLeft\(\)/.test(antesDeEmpezar),
    "y no dentro de goFishing, que corre al final");
  ok("la caña, también", /toolDur\("rod"\)/.test(antesDeEmpezar));
  ok("la carnada, también", /lombriz/.test(antesDeEmpezar));
  ok("y el sitio en la bolsa", /roomForFish\(\)/.test(antesDeEmpezar));
  /* Y que se vea SIN hacer clic: el rótulo del cursor tiene que decir el descanso, como ya lo
     dicen el árbol ("Vuelve en 4:12") y la roca. */
  const rotulo = FARM.split('if (o.type === "fish") {')[1] || "";
  ok("el rótulo del cursor anuncia el reposo", /descansa|reposo/i.test(rotulo.slice(0, 500)),
    "sin tener que probar para enterarse");
}

console.log("\nLOS DEMÁS NODOS: ¿AVISAN ANTES?\n");
{
  /* El enfriamiento de árboles, rocas y vetas se comprueba en una sola línea compartida, antes de
     cualquier startAction: `if (nowMs() < o.readyAt) { toast(this.promptText(o)); return; }` */
  ok("árbol, roca y veta: el enfriamiento frena el clic",
    /if \(nowMs\(\) < o\.readyAt\) \{ toast\(this\.promptText\(o\)\); return; \}/.test(FARM),
    "una sola guardia para los tres");
  ok("y el rótulo dice cuánto falta", /Vuelve en " \+ fmtSecs\(secs\)/.test(FARM),
    "el árbol y la roca ya lo hacían");
  /* La bolsa llena: cosechar y plantar lo comprueban antes (bagFull) — si no, la cosecha se
     perdería después de la animación. */
  ok("cosechar comprueba la bolsa antes", /if \(!roomForRes\(ck\)\) \{ bagFull/.test(FARM));
  ok("y la veta, su pico antes de picar", /no puede con " \+ od\.label/.test(FARM),
    "el pico decide qué mineral toca");
}

console.log("\nY LO QUE SIGUE COMPROBÁNDOSE AL FINAL (por diseño)\n");
{
  /* No todo lo del final es un error. Hay cosas que SOLO se saben al terminar y está bien que
     estén ahí; lo que no puede haber es una razón CONOCIDA de antemano escondida en el final. */
  const fin = FARM.split("finishAction()")[1] || "";
  const tardias = [];
  if (/tryAddRes\(/.test(fin.slice(0, 4000))) tardias.push("bolsa llena al guardar el recurso");
  console.log("      " + (tardias.join(" · ") || "nada"));
  ok("la bolsa al final es una red, no la única guardia",
    /roomForRes|roomForFish|bagFull/.test(antesDeEmpezar) || /bagFull/.test(FARM),
    "el aviso temprano ya existe; tryAddRes solo evita perder el recurso");
}

console.log("\nY LOS TEXTOS MANDAN AL SITIO CORRECTO\n");
{
  /* La carnada: el aviso decía solo "compralas en la Tienda" cuando lo más cercano y gratis son
     los montículos — el mismo error que teníamos en el tutorial. */
  ok("el aviso de la carnada nombra los montículos", /cavá un montículo/.test(FARM),
    "es gratis y está a diez metros");
  /* Y el de la caña distingue al que todavía no abrió el baúl del que se quedó sin cañas. */
  ok("y el de la caña distingue al que no abrió el kit", /kitReclamado \? "Tu kit de bienvenida/.test(FARM));
}

console.log("\n" + (avisos ? "  " + avisos + " AVISOS — hay acciones que se niegan tarde\n"
                            : "  ✓ toda acción que puede fallar avisa antes de empezar\n"));
process.exit(0);
