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

/* TODAS las puertas, no una. La segunda versión de este auditor miraba el PRIMER sitio donde se
   llama a startAction("fish") y daba el trabajo por bueno — y había DOS: el clic sobre el objeto
   pesquero y el clic sobre el agua (tryFish, con cinco llamadores). Dirección lo encontró probando
   el juego después de que yo diera esto por cerrado.
   La lección va en el código del auditor porque es donde sirve: cuando una acción se puede empezar
   desde varios sitios, comprobar uno no dice nada del resto. */
function puertasDe(nombre, ventana) {
  /* Se buscan LLAMADAS, no menciones: `this.startAction("fish"` o `return this.startAction(...)`.
     Sin el `this.` delante, la propia frase de este comentario contaba como una puerta más y el
     auditor se acusaba a sí mismo — que es la versión tonta del mismo error que vino a cazar. */
  const out = []; const re = new RegExp('this\\.startAction\\("' + nombre + '"', "g");
  const V = ventana || 1400;
  let m; while ((m = re.exec(FARM))) out.push(FARM.slice(Math.max(0, m.index - V), m.index));
  return out;
}
const puertasFish = puertasDe("fish");

console.log("\nLA LAGUNA (el caso que reportó dirección)\n");
{
  ok("se puede empezar a pescar desde " + puertasFish.length + " sitios", puertasFish.length >= 2,
    "el objeto pesquero y el agua");
  const falla = [];
  puertasFish.forEach((puerta, i) => {
    const n = "puerta " + (i + 1);
    if (!/pescaCdLeft\(\)/.test(puerta)) falla.push(n + ": no mira el descanso");
    if (!/toolDur\("rod"\)/.test(puerta)) falla.push(n + ": no mira la caña");
    if (!/lombriz/.test(puerta)) falla.push(n + ": no mira la carnada");
    if (!/roomForFish\(\)/.test(puerta)) falla.push(n + ": no mira la bolsa");
  });
  ok("y las " + puertasFish.length + " comprueban las cuatro cosas antes", !falla.length,
    falla.join(" · ") || "descanso, caña, carnada y sitio");
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

console.log("\nY LA MISMA CUENTA DE PUERTAS PARA LAS DEMÁS ACCIONES\n");
{
  /* La lección de la laguna generalizada: no basta con que la guardia EXISTA, tiene que estar en
     TODAS las puertas por las que se entra a la acción. Se cuentan y se comprueban una por una.
     Si mañana alguien añade un segundo camino para talar —un atajo de teclado, el clic sostenido—
     y se olvida del hacha, salta acá y no en la partida del jugador. */
  const EXIGE = {
    chop:    [[/toolDur\("axe"\)/, "el hacha"], [/roomForRes\("madera"\)/, "la bolsa"], [/nowMs\(\) < o\.readyAt/, "el enfriamiento"]],
    mine:    [[/equippedPick\(\)/, "el pico"], [/roomForRes\(/, "la bolsa"], [/nowMs\(\) < o\.readyAt/, "el enfriamiento"]],
    plant:   [[/G\.selSeed/, "la semilla elegida"], [/seeds\[/, "tener esa semilla"]],
    harvest: [[/roomForRes\(ck\)/, "la bolsa"]],
  };
  Object.keys(EXIGE).forEach(acc => {
    /* Ventana ancha a propósito: el enfriamiento de árboles, rocas y vetas se comprueba UNA vez
       para los tres, arriba del reparto por tipo, y con 1400 caracteres quedaba justo fuera del
       recorte — un "fallo" del auditor, no del juego. Se mide desde donde empieza el reparto. */
    const puertas = puertasDe(acc, 2600);
    const falla = [];
    puertas.forEach((p, i) => EXIGE[acc].forEach(([re, nom]) => {
      if (!re.test(p)) falla.push("puerta " + (i + 1) + " no mira " + nom);
    }));
    ok(acc + ": " + puertas.length + " puerta(s), todas comprueban lo suyo", puertas.length > 0 && !falla.length,
      falla.join(" · ") || EXIGE[acc].map(x => x[1]).join(", "));
  });
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
    /bagFull/.test(FARM),
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
