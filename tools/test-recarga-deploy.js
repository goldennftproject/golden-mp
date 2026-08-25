/* NADIE LE RECARGA EL JUEGO AL JUGADOR (25/8, dirección)
   « Estaba sembrando, lo dejé sembrando, salí de casa, y cuando llegué estaba en el login. »
   El culpable no era el login: era esto. Cada deploy abría una cuenta atrás de 5 segundos y
   RECARGABA la pestaña, mirara alguien o no. La cuenta atrás solo sirve si hay alguien delante;
   con la pestaña sola es una recarga a traición — y una recarga a traición es justo la que
   después se encuentra con la puerta del apodo, porque le toca reabrir la sesión sin nadie que
   pueda reintentar. Deployando varias veces al día, esto no era un caso raro: era una lotería
   que el jugador jugaba cada vez que dejaba el juego abierto.
   Contratos:
     · con una partida EN CURSO no se recarga sola nunca — el cartel avisa y espera;
     · con la pestaña escondida ni se muestra: se guarda para cuando el jugador vuelva;
     · lo único que se recarga solo es lo que no tiene nada que perder (la pantalla de carga o
       la puerta del apodo, donde todavía no entró);
     · y el botón « Actualizar ahora » sigue estando, porque la decisión es del jugador.
     node tools/test-recarga-deploy.js                                                           */
const fs = require("fs");
const UPD = fs.readFileSync("public/game/update.js", "utf8");
const MAIN = fs.readFileSync("public/game/main.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nCON LA PARTIDA EN CURSO, NADIE RECARGA NADA");
{
  ok("el juego sabe si el jugador ya entró", /function juegoEnCurso\(\)/.test(UPD));
  ok("y lo sabe por una marca que pone el propio arranque", /window\.entered/.test(UPD) && /window\.entered = true;/.test(MAIN));
  ok("la recarga automática SOLO corre si NO hay partida", /if \(!juegoEnCurso\(\)\) \{ {3}\/\/ nadie está jugando/.test(UPD));
  ok("y sin cartel, tampoco recarga una partida en curso", /if \(!el\) \{ if \(!juegoEnCurso\(\)\) doReload\(\); return; \}/.test(UPD));
  /* la comprobación de fondo: NINGUNA llamada a doReload puede quedar suelta. Las tres que hay
     son el camino sin cartel, el final de la cuenta atrás (que solo corre sin partida) y el
     botón del jugador. Si aparece una cuarta sin acotar, esto se pone rojo. */
  const auto = (UPD.match(/doReload\(\)/g) || []).length;
  ok("las llamadas a doReload siguen siendo tres y acotadas", auto === 3, auto + " usos");
  ok("ninguna corre sin mirar antes si hay partida o si es el jugador quien pide",
    !/^\s*doReload\(\);\s*$/m.test(UPD), "sin recargas sueltas");
  ok("uno de ellos es el botón del jugador", /btn\.onclick = doReload/.test(UPD));
}

console.log("\nCON LA PESTAÑA ESCONDIDA, NI SE MUESTRA");
{
  ok("si nadie mira, se guarda para después", /if \(document\.hidden\) \{ pendiente = true; return; \}/.test(UPD));
  ok("y al volver a la pestaña se le avisa", /if \(pendiente\) \{ pendiente = false; showUpdate\(\); \}/.test(UPD));
  ok("sin gastar la cuenta atrás mientras tanto", UPD.indexOf("pendiente = true") < UPD.indexOf("let n = 5"));
}

console.log("\nEL CARTEL DICE LA VERDAD EN LOS DOS CASOS");
{
  ok("el texto se puede cambiar (tiene su propio hueco)", /class="updt"/.test(HTML));
  ok("con partida en curso, no promete una cuenta atrás que no va a correr",
    /t\.textContent = "Hay una versión nueva del juego\."/.test(UPD));
  ok("y el botón para actualizar sigue ahí", /id="updnow"/.test(HTML));
}

console.log("\nY EL PROGRESO SE GUARDA ANTES DE RECARGAR (lo de siempre)");
{
  ok("doReload guarda primero", /doReload\(\) \{\s*try \{ if \(typeof saveFarm === "function"\) saveFarm\(\); \}/.test(UPD));
  ok("y espera a que el guardado salga", /setTimeout\(\(\) => location\.reload\(\), 400\)/.test(UPD));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: la versión nueva se avisa, no se impone.\n");
process.exit(fallos ? 1 : 0);
