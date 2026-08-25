/* LOS SILENCIOS DEL RATÓN (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   `auditar-silencios.js` recorre funciones CON NOMBRE (cook, craftMat, domaAlimentar…) y desde
   el 24/8 vigila que ninguna acción del jugador termine sin decir nada. Funciona, y encontró
   cosas. Pero tiene un punto ciego del tamaño de medio juego:

       this.input.on("pointerdown", (pt) => { … })
       boton.onclick = () => { … }

   Todo lo que el jugador toca CON EL RATÓN vive en manejadores anónimos, y ahí el auditor no
   entra: no tienen nombre que buscar.

   OJO CON LA HISTORIA QUE ESTABA ESCRITA ACÁ. La primera versión de este archivo decía « por ese
   agujero pasó el bug del clic derecho del 25/8 ». Fui a comprobarlo restaurando el bug en una
   copia, y NO lo cazaba. La frase era bonita y falsa, que es la peor combinación.
   El bug tenía otra forma, y por eso hizo falta una segunda regla:

       if (pl.state === "dry") showSeedWheel(…);
       return;                       ← se llega acá con los otros CUATRO estados, en silencio

   La regla de la ventana miraba las líneas anteriores, encontraba `showSeedWheel` y daba el
   return por cubierto. Pero esa llamada está DENTRO de un `if`: cuando la condición no se cumple
   —que es el caso interesante— no se ejecuta nadie y el return sale mudo.
   Se llama LA RAMA NO TOMADA, y es la forma más común de silencio que existe.

   Esto recorre los manejadores de evento, encuentra sus salidas MUDAS y las cuenta contra una
   línea base, igual que su hermano mayor.

   QUÉ NO ES UN SILENCIO, y hace falta decirlo para que la lista se pueda leer:
     · el filtro de arriba de todo — `if (clicDeInterfaz(pt)) return;` no es « el jugador hizo
       algo y no pasó nada »: es « este evento no es mío ». Por eso las primeras líneas de cada
       manejador no cuentan.
     · la delegación — `boton.onclick = () => craftPick(id)` contesta a través del delegado.
     · el manejador de una sola línea, que es siempre una de las dos cosas de arriba.
     node tools/auditar-silencios-del-raton.js                                                    */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");

const ARCHIVOS = ["public/game/farm.js", "public/game/ui.js", "public/game/forest.js", "public/game/plaza.js"];
/* QUÉ CUENTA COMO CONTESTAR — y acá hay una diferencia importante con el auditor hermano.
   Aquel mira funciones de lógica, donde la respuesta es siempre un mensaje. Estos manejadores
   son del MUNDO, y ahí la respuesta suele ser visual: la cámara se mueve, el objeto se coloca,
   el granjero camina hacia el árbol. Eso NO es silencio — el jugador ve perfectamente que su
   clic hizo algo.
   La primera versión de este archivo solo conocía el texto y cantó quince falsos positivos de
   los cuales trece eran cámara y arrastre. Un auditor con esa proporción no se lee a la tercera
   vez, y a partir de ahí ya no protege nada. Así que la regla es « ¿el jugador percibe algo? »,
   con las cuatro formas en que este juego contesta: */
const HABLA = new RegExp([
  /* 1 · con palabras */      "toast\\(|log\\(|avisoAccion|bagFull|tutoAviso|askConfirm|console\\.warn",
  /* 2 · con un efecto */     "celebrate|premioFx|puffFx|sfx\\(|senalChapa|barraGolpes|destelloFx|golpeFx",
  /* 3 · con una ventana */   "openOv|mostrarEleccion|showSeedWheel|pantallaNoSePudo|pescaPanel",
  /* 4 · con el MUNDO, que es la que faltaba: la cámara se mueve, el objeto se coloca, el
         granjero camina. El clic se ve, aunque nadie escriba una línea de texto. */
  "startAction|interactWith|colocarEn|holdSeek|levantarAdorno|cancelarColocar|dibujarOcupadas" +
  "|fitCamera|scroll[XY]|this\\.hold\\s*=|moveTarget|iniciarColocar|setVisible|classList" +
  /* …y el arrastre que termina bien: el adorno o la laguna se MUEVEN a la celda nueva. Eso el
     jugador lo ve con total claridad; pedirle además un cartel sería ruido. */
  "|syncAdornos|setPosition|rebuildCollisions|syncNodos|syncPlots|lanceHold|pescaTerminar" +
  "|finishAction|pedidoEntregar|cancelarColocar",
].join("|"));
/* cuántas líneas del principio de un manejador son « filtro » y no acción */
const CABECERA = 6;
/* LÍNEA BASE — TRES, y las tres explicadas. Una línea base sin explicar es un número que crece:
   al tercer « bueno, subilo uno » ya no mide nada. Estas son las que quedan, y las tres son
   decisiones, no descuidos:

     farm.js · el `return` que cierra el recorrido de parcelas del clic derecho
       Es el « le diste clic derecho al pasto ». No hay nada ahí y no hay nada que decir; un
       aviso cada vez que alguien hace clic al vacío es ruido, no información. (Las CINCO
       salidas que sí eran del jugador —las de la parcela— se arreglaron el 25/8.)

     farm.js · `this.clickPond = …; return` en la granja de un clic (GF.NO_WALK)
       No es una salida: es la MITAD de una interacción. Este manejador apunta a qué se tocó y
       la respuesta llega al SOLTAR, en el pointerup. Contestar acá sería contestar dos veces.

     farm.js · `if (GF.uiOpen) { if (!GF.typing) toast(…); return; }`
       El silencio es a propósito y está en el `!GF.typing`: si el jugador está escribiendo en
       el chat, ese clic no es para el mundo y saltarle un cartel encima sería peor que callarse.

   Si este número sube, hay un clic nuevo que no contesta. Se mira, no se sube. */
const BASE = 3;

/* ── encontrar los manejadores: desde la flecha hasta su llave de cierre ─────────────────────
   Se emparejan llaves de verdad en vez de cortar por líneas, porque estos cuerpos anidan mucho
   (un pointerdown de farm.js tiene doscientas líneas y quince niveles). */
function cuerpos(src) {
  const out = [];
  const re = /(?:\.on\(\s*["'][a-z]+["']\s*,\s*|addEventListener\(\s*["'][a-z]+["']\s*,\s*|\.onclick\s*=\s*|\.oninput\s*=\s*|\.onchange\s*=\s*)(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length - 1, prof = 0, j = i;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "{") prof++;
      else if (c === "}") { prof--; if (!prof) break; }
    }
    if (j < src.length) out.push({ ini: m.index, cuerpo: src.slice(i + 1, j) });
    re.lastIndex = i + 1;   // que los anidados también se miren por su cuenta
  }
  return out;
}

let mudos = [], total = 0;
for (const rel of ARCHIVOS) {
  const abs = path.join(RAIZ, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, "utf8");
  const antesDe = (pos) => src.slice(0, pos).split("\n").length;   // número de línea real
  for (const h of cuerpos(src)) {
    const lineas = h.cuerpo.split("\n");
    if (lineas.length <= 2) continue;                    // una línea: delegación o filtro
    const linBase = antesDe(h.ini);
    lineas.forEach((l, k) => {
      if (k < CABECERA) return;                          // la cabecera es filtro, no acción
      if (!/^\s*(\}\s*)?return;\s*$/.test(l) && !/[;{]\s*return;\s*$/.test(l)) return;
      total++;
      const ventana = lineas.slice(Math.max(0, k - 4), k + 1).join("\n");
      if (!HABLA.test(ventana)) {
        mudos.push({ donde: rel + ":" + (linBase + k), txt: l.trim().slice(0, 66), tipo: "mudo" });
        return;
      }
      /* ── LA RAMA NO TOMADA ────────────────────────────────────────────────────────────────
         Si lo ÚNICO que habla en la ventana está dentro de un `if` de una línea, entonces el
         return se alcanza también cuando ese `if` NO se cumple — y por ese camino no habla
         nadie. Es exactamente la forma del bug del clic derecho, y la que la regla de la
         ventana daba por buena. */
      /* la propia línea del return cuenta: `toast("…"); return;` habla, y mirar solo las
         anteriores lo daba por mudo. */
      if (HABLA.test(l)) return;
      const previas = lineas.slice(Math.max(0, k - 4), k);
      const hablaSuelta = previas.some(p => HABLA.test(p) && !/^\s*(\}\s*)?(if|else|for|while)\b/.test(p.trim()));
      const soloEnUnIf = previas.some(p => /^\s*if\s*\(/.test(p) && HABLA.test(p) && !/\{\s*$/.test(p.trim()));
      /* …PERO un `if … else` donde el else también contesta NO es una rama no tomada: los dos
         caminos hablan. Sin esta línea el auditor cantaba justo los arreglos que acababa de
         hacer —`if (ad) levantar(); else toast(…)`— que es la forma más rápida de que alguien
         lo desactive. La cobertura la da el ELSE, no la cantidad de avisos. */
      const hayElse = previas.some(p => /^\s*(\}\s*)?else\b/.test(p.trim()));
      if (!hablaSuelta && soloEnUnIf && !hayElse) {
        mudos.push({ donde: rel + ":" + (linBase + k), txt: l.trim().slice(0, 66),
                     tipo: "rama no tomada" });
      }
    });
  }
}

const linea = () => console.log("─".repeat(78));
console.log(""); linea();
console.log("  ¿ALGÚN CLIC DEL JUGADOR TERMINA EN SILENCIO?");
linea();
console.log("  salidas de manejador revisadas: " + total);
console.log("  sin avisar nada:                " + mudos.length + "   (línea base: " + BASE + ")\n");
mudos.slice(0, 30).forEach(m => console.log("    · " + m.donde.padEnd(24) + (m.tipo === "mudo" ? "" : "[rama no tomada] ") + m.txt));
if (mudos.length > 30) console.log("      …y " + (mudos.length - 30) + " más");

if (mudos.length > BASE) {
  console.log("\n  !! HAY " + (mudos.length - BASE) + " SILENCIO(S) NUEVO(S) EN UN MANEJADOR DE EVENTO.");
  console.log("     Un clic que no contesta es indistinguible de un clic roto — así se reportó");
  console.log("     el « no me sale el selector de semillas », que eran cuatro estados mudos.");
  console.log("     Si de verdad es un filtro (« este evento no es mío »), movelo a la cabecera");
  console.log("     del manejador, que es donde van los filtros. NO subas la línea base.");
  process.exit(1);
}
console.log("\n  ✓ ningún clic nuevo se quedó callado" +
  (mudos.length < BASE ? "  (y hay " + (BASE - mudos.length) + " menos que la línea base: bajá BASE)" : ""));
