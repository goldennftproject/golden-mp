/* EL ARRANQUE NO PUEDE COLGARSE PARA SIEMPRE (24/8, dirección: « se queda ahí »)
   La barra se quedaba clavada en 25 % — « Aplicando ajustes… » — sin fallar, sin avanzar y sin
   decir nada. Ese paso espera DOS cosas de red (el login y la lectura de la granja) y ninguna
   tenía reloj: una promesa que no resuelve deja la puerta de entrada colgada indefinidamente.
   Es la regla 9 aplicada al arranque, y es su peor versión, porque el jugador ni siquiera llegó
   a entrar para poder diagnosticarlo.
   Contratos:
     · las DOS esperas de red corren contra un reloj;
     · mientras espera, la pantalla cuenta los segundos en voz alta (el servidor gratis tarda en
       despertar y eso se dice, no se disimula);
     · si se pasa del tope NO sigue de largo: seguir sería jugar sobre una granja vacía y
       guardarla encima de la buena. Cae en la pantalla de "no se pudo cargar", que no escribe;
     · esa pantalla dice CUÁL de los dos pasos se colgó (login y lectura se arreglan en lados
       distintos: sin esa palabra el reporte del jugador no sirve);
     · y APAGA el texto de la puerta del apodo, que comparte cartel — si no, queda "elegí un
       apodo para entrar a tu granja" debajo de "no se pudo cargar tu granja".
     node tools/test-arranque-reloj.js                                                           */
const fs = require("fs");
const MAIN = fs.readFileSync("public/game/main.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const SAVE = fs.readFileSync("public/game/save.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLAS DOS ESPERAS DE RED CORREN CONTRA UN RELOJ");
{
  ok("hay un tope de espera declarado", /const ESPERA_MAX_S = (\d+)/.test(MAIN),
    (MAIN.match(/const ESPERA_MAX_S = (\d+)/) || [])[1] + " s");
  const tope = +(MAIN.match(/const ESPERA_MAX_S = (\d+)/) || [])[1];
  ok("el login corre contra el reloj", /await conReloj\(window\.SAVE_READY, "login"\)/.test(MAIN));
  ok("la lectura de la granja también", /await conReloj\(loadFarm\(\), "lectura de la granja"\)/.test(MAIN));
  ok("y el reloj es una carrera de verdad (Promise.race)", /Promise\.race\(\[/.test(MAIN));
  /* el tope tiene que darle lugar a los tres reintentos que loadFarm hace por su cuenta */
  const esperas = (SAVE.match(/sleepMs\(1200 \* \(intento \+ 1\)\)/g) || []).length;
  ok("loadFarm reintenta solo antes de rendirse", esperas >= 2, esperas + " esperas internas");
  ok("y el tope le deja lugar a esos reintentos", tope >= 30, tope + " s contra ~7 s de esperas + las idas y vueltas");
}

console.log("\nMIENTRAS ESPERA, LO DICE");
{
  ok("cuenta los segundos en la pantalla de carga", /Despertando el servidor… " \+ esperando \+ " s"/.test(MAIN));
  ok("pero no molesta en los primeros segundos", /if \(esperando >= \d\)/.test(MAIN));
  ok("y apaga el contador cuando termina, pase lo que pase", /finally \{ clearInterval\(reloj\); \}/.test(MAIN));
}

console.log("\nSI SE PASA DEL TOPE, NO SIGUE DE LARGO");
{
  ok("marca la carga como FALLIDA", /CARGA_FALLO = true/.test(MAIN));
  ok("y guarda POR QUÉ", /window\.CARGA_MOTIVO = m\[1\]/.test(MAIN));
  ok("el motivo sale del propio error, no de una suposición", /\/sin respuesta: \(\.\+\)\$\/\.exec/.test(MAIN));
  /* la garantía de fondo: con CARGA_FALLO el guardado queda bloqueado y no pisa la granja buena */
  ok("y con la carga fallida el guardado NO escribe", /CARGA_FALLO/.test(SAVE) && /CARGA_OK/.test(SAVE));
}

console.log("\nY LA PANTALLA NO SE CONTRADICE");
{
  const bloque = MAIN.slice(MAIN.indexOf("No se pudo cargar tu granja"), MAIN.indexOf("No se pudo cargar tu granja") + 1600);
  ok("apaga el texto de la puerta del apodo", /const vieja = g\.querySelector\("p"\); if \(vieja\) vieja\.style\.display = "none";/.test(bloque));
  ok("y esconde el campo del apodo", /getElementById\("nick"\); if \(n\) n\.style\.display = "none"/.test(bloque));
  ok("dice que la granja está a salvo", /Tu granja está a salvo/.test(bloque));
  ok("nombra el paso que se colgó", /window\.CARGA_MOTIVO \? "Se colgó en « " \+ window\.CARGA_MOTIVO/.test(bloque));
  ok("y ofrece reintentar", /b\.textContent = "Reintentar"/.test(bloque) && /location\.reload\(\)/.test(bloque));
  /* el cartel que se apaga es el que existe: si alguien lo cambia de etiqueta, esto avisa */
  const gate = HTML.slice(HTML.indexOf('id="gate"'), HTML.indexOf('id="gate"') + 400);
  ok("la puerta del apodo sigue teniendo su <p> (el que se apaga)", /<p>Elegí un apodo/.test(gate));
  ok("y su campo se llama nick", /id="nick"/.test(gate));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el arranque falla a tiempo y explicando, o no falla.\n");
process.exit(fallos ? 1 : 0);
