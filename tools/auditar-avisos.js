/* ¿ALGÚN NODO TE DEJA EMPEZAR PARA NEGÁRTELO DESPUÉS? (19/8 · reescrito el 20/8)
   Dirección, 19/8: "tiro la caña igual, la barra carga, y después me dice que la laguna está en
   reposo. Tiene que parar antes."

   La regla que vigila este auditor no ha cambiado:

     TODA razón por la que una acción puede fallar tiene que comprobarse ANTES de empezarla.

   Lo que cambió es CÓMO se cumple, y por eso el auditor se reescribió entero. Antes cada entrada al
   juego llevaba sus comprobaciones copiadas a mano, y este archivo iba puerta por puerta buscando
   las cuatro líneas. Ese diseño ya me falló dos veces: el 19/8 arreglé una de las dos puertas de la
   pesca y este auditor —que entonces miraba UNA— me dio verde. Después lo corregí para que las
   contara todas, y seguía siendo un auditor que comprobaba copias.

   Desde el 20/8 hay UNA función, puedeAccion() en state.js, que contesta « ¿puedo? » y devuelve por
   qué no. Así que la comprobación se vuelve mucho más simple y mucho más fuerte:

     1. TODA llamada a startAction("X") tiene que ir precedida de puedeAccion("X").
     2. TODAS las razones viven dentro de puedeAccion, ninguna suelta por ahí.
     3. Y el aviso del enfriamiento sale del MISMO rótulo que se ve al pasar el cursor.

   Con eso ya no hay « puertas » que auditar una por una: hay una regla y un sitio donde vive.
     node tools/auditar-avisos.js                                                                 */
const fs = require("fs");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const STATE = fs.readFileSync("public/game/state.js", "utf8");
let avisos = 0;
const ok = (n, c, d) => { if (!c) avisos++; console.log((c ? "  ok  " : "  !!  ") + n.padEnd(46) + (d || "")); };

/* Toda LLAMADA (con `this.` delante) a startAction, con el trozo de código que la precede. */
function puertasDe(nombre, ventana) {
  const out = [], V = ventana || 900;
  const re = new RegExp('this\\.startAction\\("' + nombre + '"', "g");
  let m; while ((m = re.exec(FARM))) out.push(FARM.slice(Math.max(0, m.index - V), m.index));
  return out;
}
const ACCIONES = ["fish", "chop", "mine", "plant", "harvest"];

console.log("\nCADA PUERTA PREGUNTA A LA MISMA FUNCIÓN\n");
{
  let total = 0;
  const mal = [];
  ACCIONES.forEach(acc => {
    const puertas = puertasDe(acc);
    total += puertas.length;
    puertas.forEach((p, i) => {
      if (!new RegExp('puedeAccion\\("' + acc + '"').test(p)) mal.push(acc + " puerta " + (i + 1));
    });
    if (!puertas.length) mal.push(acc + ": no se empieza desde ningún sitio (¿se renombró?)");
  });
  ok("hay " + total + " sitios donde se empieza una acción", total >= 6);
  ok("y los " + total + " preguntan antes a puedeAccion()", !mal.length, mal.join(" · ") || "una sola regla, un solo sitio");
  /* Y que nadie se salte el aviso: si preguntás y no avisas, el clic no hace nada y el jugador
     cree que el juego se colgó. */
  /* Se cuentan LLAMADAS, no menciones: el comentario que explica la función contaba como una
     pregunta más y el auditor se acusaba a sí mismo — la misma tontería que ya me pasó contando
     puertas de pesca. */
  const preguntas = (FARM.match(/= puedeAccion\(/g) || []).length;
  const avisosF = (FARM.match(/avisoAccion\(/g) || []).length;
  ok("cada pregunta va con su aviso", avisosF >= preguntas, preguntas + " preguntas · " + avisosF + " avisos");
}

console.log("\nY TODAS LAS RAZONES VIVEN DENTRO DE ESA FUNCIÓN\n");
{
  const i0 = STATE.indexOf("function puedeAccion(");
  const i1 = STATE.indexOf("function avisoAccion(");
  ok("puedeAccion() existe y está antes de avisoAccion()", i0 > 0 && i1 > i0);
  const fn = STATE.slice(i0, i1);
  const EXIGE = [
    [/pescaCdLeft\(\)/, "el reposo de la laguna"],
    [/toolDur\("rod"\)/, "la caña"],
    [/lombriz/, "la carnada"],
    [/roomForFish\(\)/, "sitio para el pez"],
    [/toolDur\("axe"\)/, "el hacha"],
    /* 24/8: las dos razones del pico —tenerlo y que su categoría alcance— dejaron de estar
       sueltas en la puerta y viven DENTRO de picoParaNodo(), que además elige cuál usar. Sigue
       habiendo una sola verdad; ahora tiene nombre. */
    [/picoParaNodo\(/, "el pico (tenerlo y que alcance)"],
    [/picoQueHaceFalta\(/, "y decir CUÁL falta"],
    [/oreUnlocked/, "el nivel de Minería"],
    [/roomForRes\(/, "sitio en la bolsa"],
    [/o\.readyAt/, "el enfriamiento del nodo"],
    [/cropUnlocked/, "el nivel del cultivo"],
    [/G\.seeds\[/, "tener la semilla"],
  ];
  const falta = EXIGE.filter(([re]) => !re.test(fn)).map(x => x[1]);
  ok("y contempla las " + EXIGE.length + " razones", !falta.length, falta.join(" · ") || "de la caña al nivel de Minería");
  /* El orden importa: el enfriamiento primero, porque es la razón más frecuente y la peor de
     descubrir al final. */
  ok("el enfriamiento se mira antes que la herramienta",
    fn.indexOf("o.readyAt") < fn.indexOf('toolDur("axe")'), "lo más frecuente, primero");
}

console.log("\nY NINGUNA RAZÓN SE QUEDÓ SUELTA POR AHÍ\n");
{
  /* Ésta es la comprobación que impide volver al modelo viejo. Si alguien vuelve a escribir la
     regla a mano en una entrada, aparece aquí. Se mira el bloque del clic, no el archivo entero:
     farm.js usa toolDur en sitios legítimos (el aviso de « se rompió el hacha », por ejemplo). */
  /* El bloque del clic es interactWith(), no "clickObj" — que era como lo llamaba yo de memoria.
     Buscar por un nombre que no existe devuelve una cadena vacía, y una cadena vacía pasa todas
     las comprobaciones de « no contiene X ». Un auditor que no encuentra lo que audita tiene que
     FALLAR, no dar verde: por eso se comprueba primero que el bloque se localice. */
  const i0 = FARM.indexOf("  interactWith(o) {");
  const i1 = FARM.indexOf("  startAction(kind, o) {");
  const clic = i0 > 0 && i1 > i0 ? FARM.slice(i0, i1) : "";
  ok("el bloque del clic se localiza", !!clic, clic.length + " caracteres");
  const sueltas = [];
  [[/toolDur\("rod"\)/, "la caña"], [/toolDur\("axe"\)/, "el hacha"], [/pescaCdLeft\(\)/, "el reposo"],
   [/roomForFish\(\)/, "sitio para el pez"], [/G\.picks\.dur\[/, "el desgaste del pico"],
   [/oreNivelReq\(/, "el nivel de Minería"]].forEach(([re, nom]) => { if (re.test(clic)) sueltas.push(nom); });
  ok("no quedan comprobaciones copiadas en el clic", !sueltas.length,
    sueltas.join(" · ") || "todas pasan por puedeAccion");
}

console.log("\nEL AVISO Y EL RÓTULO DICEN LO MISMO\n");
{
  /* El caso concreto de dirección: el rótulo del cursor tiene que anunciar el reposo SIN hacer
     clic, y el aviso al hacer clic tiene que decir exactamente eso. */
  ok("el rótulo del cursor anuncia el reposo de la laguna", /La laguna descansa/.test(FARM),
    "se ve antes de probar");
  ok("y el enfriamiento del nodo usa ese mismo rótulo",
    /puedeAccion\("mine", o, rot\)/.test(FARM) && /const rot = \(x\) => this\.promptText\(x\)/.test(FARM),
    "una cadena, generada una vez");
  ok("el aviso de la carnada nombra los montículos", /cavá un montículo/.test(STATE),
    "es gratis y está a diez metros");
  ok("y el de la herramienta distingue al que no abrió el kit", /function sinKitTxt/.test(STATE));
}

console.log("\nY LO QUE SIGUE COMPROBÁNDOSE AL FINAL (por diseño)\n");
{
  /* No todo lo del final es un error: hay cosas que solo se saben al terminar. Lo que no puede
     haber es una razón CONOCIDA de antemano escondida ahí. */
  const fin = FARM.split("finishAction()")[1] || "";
  const tardias = [];
  if (/tryAddRes\(/.test(fin.slice(0, 4000))) tardias.push("bolsa llena al guardar el recurso");
  console.log("      " + (tardias.join(" · ") || "nada"));
  ok("la bolsa al final es una red, no la única guardia", /bagFull/.test(STATE),
    "el aviso temprano ya existe; tryAddRes solo evita perder el recurso");
  /* Y goFishing, que es el final de la pesca, pregunta a la misma función en vez de repetirla. */
  /* 23/8: buscaba la firma EXACTA "function goFishing()", y el 22/8 la pesca v2 le sumó un
     parámetro (rarForzada). El indexOf devolvía -1, el slice medía el final del archivo y el
     auditor gritaba en falso. Se busca el nombre, no la firma. */
  const _gfAt = STATE.indexOf("function goFishing");
  const gf = _gfAt < 0 ? "" : STATE.slice(_gfAt, _gfAt + 900);
  ok("goFishing usa puedeAccion, no su propia copia", /puedeAccion\("fish"/.test(gf));
}

console.log("\n" + (avisos ? "  " + avisos + " AVISOS — hay acciones que se niegan tarde\n"
                            : "  ✓ una sola regla por acción, y se comprueba antes de empezar\n"));
process.exit(0);
