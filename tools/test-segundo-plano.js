/* TODO TIENE QUE SEGUIR CORRIENDO EN SEGUNDO PLANO        (18/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Todo debe funcionar en segundo plano, o minimizado » — y, aclarado después, « cerrado no ».

   El enemigo tiene nombre: cuando una pestaña deja de verse, Chrome no la para del todo, la
   ESTRANGULA. Los intervalos bajan a uno por minuto y el bucle de dibujo directamente no corre.
   Contra eso no se pelea: se deja de depender de él.

   La regla, y es lo único que este archivo custodia: TODO RELOJ DEL JUEGO CUENTA TIEMPO REAL,
   NUNCA LLAMADAS. Un sistema que suma « un poquito cada vez que me llaman » da un resultado
   distinto según si el jugador estaba mirando o no — y eso es indefendible: el juego cambiaría
   de reglas según dónde tengas el ratón. Un sistema que mira el reloj da lo mismo lo llamen una
   vez por segundo, una por minuto o una sola vez al volver.

   Cómo se prueba sin navegador: se sustituye el reloj del juego por uno de mentira y se corre
   la MISMA media hora de dos maneras — como pestaña a la vista (1.800 llamadas de un segundo)
   y como pestaña de fondo estrangulada (30 llamadas de un minuto). Si los dos resultados no
   coinciden, es que ese sistema todavía cuenta latidos.
     node tools/test-segundo-plano.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

let _falso = Date.UTC(2026, 8, 18, 12, 0, 0);
vm.runInContext("(function(f){ nowMs = f; })", ctx)(() => _falso);
const avanzar = (seg) => { _falso += seg * 1000; };
const ponerCombate = (lvl) => {
  G.buffs = []; G.gear = G.gear || {}; G.gear.arma = null;
  G.combatXp = (function () { let t = 0; for (let i = 1; i < lvl; i++) t += g("skillNeed(" + i + ")"); return t; })();
  g("applyCombatHp()");
};
/* corre MEDIA HORA de reloj repartida en llamadas de `cada` segundos. `cada = 1` es la pestaña
   a la vista; `cada = 60` es exactamente lo que hace Chrome con una pestaña escondida. */
const correr = (fn, cada) => {
  vm.runInContext("_ultLatido = {};", ctx);   // cada corrida arranca con los latidos limpios
  g(fn);                                      // una llamada para FIJAR el punto de partida
  /* esa primera llamada no es un detalle del arnés: la primera vez que un reloj late no tiene
     con qué comparar, así que vale 1 s por convención. Si no se fijara el punto de partida
     antes de medir, la corrida de un minuto « perdería » ese primer minuto y las dos columnas
     no compararían lo mismo — que es justo lo que este archivo existe para detectar. */
  const pasos = Math.round(1800 / cada);
  for (let i = 0; i < pasos; i++) { avanzar(cada); g(fn); }
};

console.log("\n1 · LA CURA: MEDIA HORA ES MEDIA HORA, MIRES O NO\n");
{
  ctx.GF.scene = "farm"; G.zonaViaje = null; ponerCombate(10);
  G.hp = 0; correr("granjaRegen()", 1);   const alaVista = G.hp;
  G.hp = 0; correr("granjaRegen()", 60);  const deFondo = G.hp;
  ok("con la pestaña a la vista cura lo que tiene que curar", alaVista > 0, alaVista.toFixed(2));
  ok("y DE FONDO cura exactamente lo mismo (30 llamadas de un minuto)",
    Math.abs(alaVista - deFondo) < 0.01, alaVista.toFixed(2) + " vs " + deFondo.toFixed(2));
  /* éste es el fallo concreto que dirección reportó: antes del 18/9 « +1 por llamada » hacía
     que de fondo curara 60 veces menos. Se deja medido para que no vuelva disfrazado */
  ok("o sea: ya NO se cura 60 veces más lento de fondo", deFondo > alaVista * 0.99);
}

console.log("\n2 · LOS BUFFS DE REGENERACIÓN, LO MISMO\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10);
  const buff = () => { G.buffs = [{ type: "regen", mult: 2, until: _falso + 3600000 }]; G.hp = 0; };
  buff(); correr("buffTick()", 1);  const alaVista = G.hp;
  buff(); correr("buffTick()", 60); const deFondo = G.hp;
  ok("un buff de +2/s da lo prometido con la pestaña a la vista", alaVista > 0, alaVista.toFixed(1));
  ok("y lo mismo de fondo", Math.abs(alaVista - deFondo) < 0.01, alaVista.toFixed(1) + " vs " + deFondo.toFixed(1));
  /* lo que un buff promete es un contrato con el jugador: pagó por él (comida, tiempo o los dos).
     Que rinda menos por tener el juego en otra pestaña no es un detalle técnico, es no cumplir */
  ok("un buff pagado rinde igual mires o no", Math.abs(alaVista - deFondo) < 0.01);
}

console.log("\n3 · Y LOS QUE YA ESTABAN BIEN SIGUEN ESTÁNDO   (no se rompió nada al tocar)\n");
{
  /* la estamina y las incursiones nunca contaron llamadas: miran la hora contra un objetivo
     guardado. Por eso nunca dieron problema de fondo, y por eso se prueban acá — para que si
     alguien las « moderniza » a base de sumar por llamada, salte */
  const STATE = require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("la estamina se recarga mirando la hora, no sumando por llamada",
    /nowMs\(\) >= G\.stamFullAt/.test(STATE));
  ok("la incursión termina mirando la hora", /nowMs\(\) >= G\.incursion\.endAt/.test(STATE));
  /* y el entrenamiento del muñeco ya cobraba por tiempo transcurrido desde el 9/8 */
  ok("el entrenamiento del muñeco cuenta tiempo, no latidos", /function dummyMsUtiles/.test(STATE));
}

console.log("\n4 · EL LATIDO SE CONSUME AUNQUE NO TOQUE CURAR\n");
{
  /* si el reloj solo se pusiera al día cuando de verdad cura, el rato pasado en la Zona (o con
     la barra llena) se acumularía y se cobraría de golpe al volver a la granja: media hora
     peleando te curaría media hora de una. El latido se consume SIEMPRE */
  ctx.GF.scene = "forest"; G.zonaViaje = null; ponerCombate(10);
  vm.runInContext("_ultLatido = {};", ctx);
  avanzar(1); g("granjaRegen()");            // arranca el reloj estando en la Zona
  G.hp = 10;
  for (let i = 0; i < 30; i++) { avanzar(60); g("granjaRegen()"); }   // media hora peleando
  ok("media hora en la Zona no cura nada", G.hp === 10, "hp " + G.hp);
  ctx.GF.scene = "farm";
  avanzar(1); g("granjaRegen()");
  ok("y al volver a la granja NO se cobra esa media hora de golpe",
    G.hp - 10 < 1, "+" + (G.hp - 10).toFixed(3));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
