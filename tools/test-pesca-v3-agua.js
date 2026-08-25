/* LAS SEÑALES SE VEN, Y EL CLIC LLEGA HASTA EL COBRO (25/8, Pesca v3 · tanda 1)
   La lógica ya estaba medida en test-pesca-v3.js. Esto mide la otra mitad: que el agua DIBUJE
   lo que la lógica dice, que el clic en una señal recorra el circuito entero —cobrar la
   carnada, armar el lance con su especie, pelear, y cobrar la especie correcta— y que nada de
   eso pida un solo píxel de arte nuevo.
   Es una prueba de LECTURA sobre farm.js y ui.js, como las de la flecha del tutorial y los
   botones: no hay navegador acá, pero sí se puede exigir que las piezas estén atadas entre sí.
     node tools/test-pesca-v3-agua.js                                                            */
const fs = require("fs");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ST = fs.readFileSync("public/game/state.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL AGUA DIBUJA UNA SEÑAL POR CARGA, SIN ARTE NUEVO");
{
  ok("hay un dibujante de señales", /senalesDibujar\(\) \{/.test(FARM));
  ok("pregunta a la lógica, no inventa la lista", /const lista = pescaSenales\(\);/.test(FARM));
  /* la exigencia de fondo: NADA de arte. Ondas, emoji y estrellas — formas y texto. */
  const bloque = FARM.slice(FARM.indexOf("senalesDibujar() {"), FARM.indexOf("senalChapa("));
  ok("la onda es un círculo dibujado", /this\.add\.circle\(/.test(bloque));
  ok("el ícono de la familia es su emoji", /this\.add\.text\(0, -2, fam\.icono/.test(bloque));
  ok("las estrellas son texto", /"★"\.repeat\(s\.estrella\)/.test(bloque));
  ok("y NO pide ningún sprite nuevo", !/this\.add\.image\(|GF\.spr\(/.test(bloque),
    "ni un archivo de imagen");
  ok("la onda respira (tween, no un cuadro quieto)", /this\.tweens\.add\(\{ targets: onda/.test(bloque));
  ok("y la señal flota", /targets: g, y: p\.y - 3/.test(bloque));
}

console.log("\nNO BAILAN NI SE REHACEN DE GUSTO");
{
  ok("el sitio de cada señal es determinístico por su índice", /senalPos\(i\) \{/.test(FARM) && /const ang = \(i \* 2\.399\)/.test(FARM));
  ok("y solo se repintan si cambió la lista (firma)", /if \(this\._senalFirma === firma\) return;/.test(FARM));
  ok("al repintar se destruye lo viejo (sin fugas de tweens)", /this\._senales\.forEach\(o => \{ try \{ o\.destroy\(\)/.test(FARM));
}

console.log("\nLA SEÑAL DICE QUÉ TRAE ANTES DE QUE TIRES (regla 9 en el agua)");
{
  ok("al pasar por encima aparece una chapa", /g\.on\("pointerover"/.test(FARM) && /senalChapa\(/.test(FARM));
  ok("con la especie y sus estrellas", /e\.emoji \+ " " \+ e\.label \+ " " \+ "★"\.repeat\(s\.estrella\)/.test(FARM));
  ok("y con la carnada que hace falta — o el motivo por el que no podés",
    /puede\.ok \? "con " \+ c\.emoji \+ " " \+ c\.label/.test(FARM) && /"⚠ " \+ puede\.toast/.test(FARM));
  /* 25/8 (tanda 2): y además con qué CAÑA se va a pelear y CÓMO ESTÁ la familia — lo segundo es
     lo que hace visible la memoria de la laguna, que si no el jugador nunca se enteraría. */
  ok("y con la caña que va a usar", /cana \? " · " \+ cana\.label : ""/.test(FARM));
  ok("y con cómo está esa familia (la memoria de la laguna, a la vista)",
    /presionTxt\(s\.fam\)/.test(FARM));
  ok("la chapa NO usa el cartel de abajo (que el update pisa cada cuadro)",
    /No usa el cartel de abajo/.test(FARM));
  ok("y se va al sacar el cursor", /g\.on\("pointerout", \(\) => this\.senalChapa\(null\)\)/.test(FARM));
}

console.log("\nEL CIRCUITO ENTERO: CLIC → CARNADA → LANCE → COBRO");
{
  ok("clicar una señal llama a tirarASenal", /this\.tirarASenal\(i\)/.test(FARM));
  ok("y el clic no se escapa al mundo (el panel se queda el clic)",
    /if \(ev && ev\.stopPropagation\) ev\.stopPropagation\(\)/.test(FARM));
  ok("tirar cobra la carnada y la carga en la LÓGICA, no en el dibujo", /pescaSenalGastar\(i\)/.test(FARM));
  ok("si la lógica dice que no, no se tira", /if \(!s\) return;/.test(FARM));
  ok("el lance nace con la señal", /pescaLanceNuevo\(null, o && o\.senal\)/.test(FARM));
  ok("y el aviso nombra el pez al que le tiraste", /Le tiraste a " \+ e\.emoji/.test(FARM));
  ok("ganar cobra la ESPECIE, no la rareza vieja",
    /goFishing\(l && l\.esp \? \{ esp: l\.esp, estrella: l\.estrella \} : rar\)/.test(FARM));
  ok("perder deja la escama", /if \(l && l\.esp && typeof pescaPerdido === "function"\) pescaPerdido\(l\)/.test(FARM));
  ok("y después de pelear el agua se repinta", /this\._senalFirma = null; this\.senalesDibujar\(\);/.test(FARM));
}

console.log("\nEL AGUA SE PONE AL DÍA SOLA");
{
  ok("las señales aparecen AL LLEGAR a la granja", /el agua reparte sus señales AL LLEGAR/.test(FARM));
  ok("y siguen madurando mientras jugás", /this\._senalUltimo = this\.time\.now;/.test(FARM));
  ok("sin repintar en cada cuadro", /> 2000\)/.test(FARM));
}

console.log("\nEL MONTÍCULO PREGUNTA, CON LA RUEDA QUE YA EXISTÍA");
{
  ok("el clic en el montículo abre la elección", /mostrarEleccion\("¿Qué buscás en la tierra\?"/.test(FARM));
  ok("pero SOLO desde que el grillo se abre (Pesca 5)", /const grilloAbierto = \(typeof familiaAbierta === "function"\) && familiaAbierta\("superficie"\);/.test(FARM),
    "una elección de una sola opción es un peaje, no una elección");
  ok("y son lombriz o grillo, con su familia dicha", /carnada de ORILLA/.test(FARM) && /carnada de SUPERFICIE/.test(FARM));
  ok("lo elegido llega a la lógica", /excavCavar\(o\.idx, this\._excavCarnada\)/.test(FARM));
  ok("la rueda vive en ui.js y reusa #seedwheel", /function mostrarEleccion\(/.test(UI) && /\$\("seedwheel"\)/.test(UI));
  ok("cerrar sin elegir también contesta", /toast\("No cavaste nada"\)/.test(UI));
  ok("y no deja el escuchador colgado", /document\.removeEventListener\("pointerdown", fuera, true\)/.test(UI));
}

console.log("\nY LA LÓGICA SIGUE SIENDO LA DUEÑA DE LAS REGLAS");
{
  /* la separación que hace que todo esto se pueda medir sin navegador: farm.js dibuja y
     pregunta; state.js decide. Si un día una regla se cuela en el dibujo, esto lo delata. */
  ok("el precio lo decide state.js", /function especiePrecio\(/.test(ST) && !/function especiePrecio\(/.test(FARM));
  ok("la XP también", /function especieXp\(/.test(ST) && !/function especieXp\(/.test(FARM));
  ok("y quién puede tirarle a qué, también", /function pescaPuedeSenal\(/.test(ST) && !/function pescaPuedeSenal\(/.test(FARM));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: el agua se lee de un vistazo, y lo que promete es lo que cobra.\n");
process.exit(fallos ? 1 : 0);
