/* LA ZONA NEGRA NO SE PARA AL CAMBIAR DE PESTAÑA        (18/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Haz que todo zona negra también funcione en segundo plano o minimizado » + « no quiero que
   sea idle o automático, solo quiero que el juego no se pare ».

   Las dos frases juntas son el diseño entero, y la distancia entre ellas es todo el juego:
   la pelea EMPEZADA sigue (los golpes se dan, se reciben, el bicho muere o te mata), pero al
   terminar NO se encadena otro bicho. Nadie sube de nivel dejando la pestaña abierta.

   Lo que custodia este archivo es EL FRENO, no el motor. El motor —que el combate corra— solo
   se puede comprobar jugando, porque necesita Phaser, el canvas y un bicho de verdad. Lo que sí
   se puede custodiar sin navegador, y es lo que puede hacer daño, es cuándo NO tiene que correr:

     · con la pestaña a la vista (ahí manda el bucle normal; dos motores a la vez sería el caos);
     · fuera de la Zona Negra (la granja no tiene nada que seguir haciendo sin vos);
     · sin una pelea empezada — ÉSTA es la que impide el idle;
     · y si el paso revienta, que se apague solo en vez de insistir. Esto toca el mismo update
       que lleva una semana congelándose: un juego que sigue en segundo plano está bueno, uno
       que se rompe por seguir en segundo plano no.
     node tools/test-zona-de-fondo.js                                                          */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const MAIN = fs.readFileSync(path.join(RAIZ, "public/game/main.js"), "utf8");
const CONF = fs.readFileSync(path.join(RAIZ, "public/game/config.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const paso = (MAIN.match(/function pasoDeFondo\(\) \{([\s\S]*?)\n\}/) || [])[1] || "";

console.log("\n1 · HAY INTERRUPTOR, Y APAGARLO DEVUELVE EL JUEGO DE ANTES\n");
{
  const m = CONF.match(/GF\.ZONA_FONDO = (\d);/);
  ok("existe GF.ZONA_FONDO", !!m, m && ("= " + m[1]));
  ok("y está encendido", m && m[1] === "1");
  ok("el metrónomo ni se crea con la bandera apagada", /!GF\.ZONA_FONDO\) return;/.test(MAIN));
  /* esto toca el update que viene congelándose: el interruptor no es un lujo, es la primera
     cosa que hay que poder apagar a las 3 de la mañana sin entender el código */
  ok("y el motivo queda escrito en config.js", /ZONA NO SE PARA EN SEGUNDO PLANO/.test(CONF));
  ok("incluido « apagá esto primero si vuelven las congeladas »", /si vuelven las congeladas/.test(CONF));
}

console.log("\n2 · SOLO CORRE CUANDO TIENE QUE CORRER\n");
{
  ok("(arnés) se aisló el cuerpo del paso", !!paso, paso.length + " car.");
  ok("con la pestaña a la vista NO corre (manda el bucle normal)",
    /visibilityState === "visible"\) \{ _fondoUlt = 0; return; \}/.test(paso));
  ok("fuera de la Zona Negra tampoco", /GF\.scene !== "forest"\) \{ _fondoUlt = 0; return; \}/.test(paso));
  ok("ni si la escena no está viva", /isActive\(\)/.test(paso));
  ok("y no dibuja: llama al paso LÓGICO, no al de Phaser", /sc\.updateReal\(/.test(paso) && !/sc\.render/.test(paso));
}

console.log("\n3 · Y NO ES IDLE: SIN PELEA EMPEZADA, NO PASA NADA\n");
{
  /* la línea que convierte « que no se pare » en algo que no es un juego idle. El auto-ataque
     necesita un objetivo, y un objetivo solo lo fija el clic derecho del jugador: cuando el
     bicho muere no hay quien marque el siguiente, y esto se detiene solo. */
  ok("hace falta auto-ataque encendido y un objetivo VIVO",
    /!sc\.autoOn \|\| !sc\.target \|\| sc\.target\.dead\) \{ _fondoUlt = 0; return; \}/.test(paso));
  ok("y el motivo está escrito donde se decide, no en un commit",
    /idle que dirección no quiere/.test(MAIN));
  /* si alguien mañana « mejora » esto buscando objetivo solo, el juego cambia de género sin que
     nadie lo haya decidido. Que salte acá */
  ok("no hay ninguna búsqueda de objetivo nuevo en el paso de fondo",
    !/sc\.target =/.test(paso) && !/autoOn = true/.test(paso));
}

console.log("\n4 · UN LATIDO TARDE NO TELETRANSPORTA NADA\n");
{
  const maxPaso = (MAIN.match(/var FONDO_PASO_MAX = (\d+);/) || [])[1];
  const maxPasos = (MAIN.match(/var FONDO_PASOS_MAX = (\d+);/) || [])[1];
  ok("el delta que se pasa de una vez tiene tope", !!maxPaso && Number(maxPaso) <= 500, maxPaso + " ms");
  ok("y el tiempo se recupera en pasos chicos, no de un salto",
    /while \(falta > 0 && pasos < FONDO_PASOS_MAX\)/.test(paso));
  ok("con un tope de pasos por latido (recuperar diez minutos de una sería peor que no hacerlo)",
    !!maxPasos && Number(maxPasos) <= 100, maxPasos + " pasos");
  ok("el primer latido solo fija el punto de partida, no simula nada",
    /if \(!_fondoUlt\) \{ _fondoUlt = t; return; \}/.test(paso));
}

console.log("\n5 · EL FRENO DE MANO   (esto toca el update que viene congelándose)\n");
{
  ok("el paso va dentro de un try", /try \{ pasoDeFondo\(\); \} catch/.test(MAIN));
  ok("los fallos se cuentan", /function fondoFallo/.test(MAIN));
  ok("y tras unos cuantos seguidos el metrónomo se APAGA solo",
    /_fondoErr >= FONDO_ERR_MAX && _fondoWorker/.test(MAIN) && /terminate\(\)/.test(MAIN));
  ok("un paso bueno perdona los tropiezos anteriores (un fallo aislado no lo mata)",
    /_fondoErr = 0;/.test(paso));
  ok("no inunda la consola: avisa al primero y al último", /_fondoErr === 1 \|\| _fondoErr === FONDO_ERR_MAX/.test(MAIN));
  /* y lo más importante: si el navegador no da workers, NO puede impedir jugar */
  ok("sin Web Worker el juego sigue normal, solo sin segundo plano",
    /sin Web Worker: la Zona no correrá en segundo plano/.test(MAIN) &&
    /catch \(e\) \{[\s\S]{0,400}?return;\s*\n  \}/.test(MAIN));
}

console.log("\n6 · Y NO SE PELEA CON EL VIGÍA DE LAS CONGELADAS\n");
{
  /* el vigía del bucle solo actúa con la pestaña A LA VISTA, y este metrónomo solo actúa con la
     pestaña ESCONDIDA. No pueden pisarse — pero queda medido, porque si alguien toca una de las
     dos condiciones, el vigía empezaría a recargarle la partida a gente que está jugando bien */
  ok("(arnés) el vigía del bucle solo mira con la pestaña visible",
    /document\.visibilityState !== "visible"\) \{ ultimoFrame = -1; return; \}/.test(MAIN));
  ok("y el metrónomo solo actúa con la pestaña escondida",
    /visibilityState === "visible"\) \{ _fondoUlt = 0; return; \}/.test(paso));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
