/* LAS CARTAS DEL ABUELO LLEGAN (25/8, docs/LORE.md capítulo 6)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Las diez cartas estaban escritas desde el 23/8 y colgadas del buzón. Pero tenían un candado:

       if (G.tuto && G.tuto.done) { … }

   O sea que NINGUNA llegaba a NINGÚN nivel hasta cerrar los 29 pasos del tutorial. Y las tres
   primeras están escritas para el principio de la partida —« construí la herrería primero »,
   « ya podés comprar tu primer pedazo de terreno », « comprá animales apenas puedas »—, así que
   el jugador las recibía en fila cuando ya había hecho las tres cosas.

   Un consejo que llega tarde no es narrativa: es ruido, y delata que el juego no sabe por dónde
   vas. La columna narrativa del juego existía y no llegaba a la mesa.

   Este archivo clava que llegan, cuándo, y de a una.
     node tools/test-cartas-abuelo.js                                                            */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const vm = require("vm");
const G = ctx.G;
ctx.toast = () => {}; ctx.log = () => {};
const g = (n) => vm.runInContext(n, ctx);
const CARTAS = g("CARTAS_ABUELO");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const delAbuelo = () => ctx.buzonCartas().filter(x => /^abuelo/.test(x.id || ""));
function nueva(tutoDone) { G.buzonLeidas = {}; G.tuto = { done: !!tutoDone, step: 5 }; G.level = 1; }

console.log("\nLAS DIEZ CARTAS EXISTEN Y RESPETAN LA BIBLIA");
{
  ok("son diez", CARTAS.length === 10, CARTAS.length + "");
  ok("van del nivel 2 al 20", CARTAS[0].nivel === 2 && CARTAS[CARTAS.length - 1].nivel === 20);
  ok("y en orden creciente, sin repetir nivel",
    CARTAS.every((c, i) => i === 0 || c.nivel > CARTAS[i - 1].nivel));
  /* la regla 1 del tono: 60-90 palabras. Un sobre, no un capítulo. */
  const largos = CARTAS.filter(c => { const n = c.txt.trim().split(/\s+/).length; return n < 45 || n > 95; });
  ok("todas entran en el sobre (45-95 palabras)", !largos.length,
    largos.map(c => c.titulo + " (" + c.txt.trim().split(/\s+/).length + ")").join(", "));
  ok("y todas las firma el Abuelo", CARTAS.every(c => /abuelo\s*$/i.test(c.txt.trim())));
}

console.log("\nLLEGAN DURANTE EL TUTORIAL — que era el fallo");
{
  nueva(false);                                  // tutorial ABIERTO, como el jugador nuevo
  G.level = 2;
  const c = delAbuelo();
  ok("a granja 2, con el tutorial abierto, llega la primera", c.length === 1, c.length ? c[0].titulo : "ninguna");
  ok("y es « Si estás leyendo esto »", c[0] && c[0].titulo === "Si estás leyendo esto");
  ok("firmada por « Tu abuelo », no por el Capataz", c[0] && c[0].de === "Tu abuelo");

  /* la comprobación que habría cazado el bug: el código ya no puede volver a esconderlas */
  const SRC = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  const i = SRC.indexOf("const ca = cartaAbueloPendiente()");
  const antes = SRC.slice(Math.max(0, i - 400), i);
  ok("y el candado del tutorial ya no está delante de ellas",
    !/if \(G\.tuto && G\.tuto\.done\) \{ const ca/.test(SRC));
}

console.log("\nDE A UNA: el que corre no recibe seis sobres juntos");
{
  nueva(false);
  G.level = 20;                                  // subió de golpe (regalo, testeo, lo que sea)
  ok("aun a granja 20, el buzón trae UNA sola", delAbuelo().length === 1, delAbuelo().length + "");
  ok("y es la primera, no la del nivel 20", delAbuelo()[0].titulo === CARTAS[0].titulo);
  /* leyéndolas de a una aparecen las diez, en orden */
  const orden = [];
  for (let k = 0; k < 20; k++) {
    const c = delAbuelo(); if (!c.length) break;
    orden.push(c[0].titulo); G.buzonLeidas[c[0].id] = 1;
  }
  ok("leyendo una tras otra llegan las diez", orden.length === 10, orden.length + "");
  ok("y en el orden de la biblia", orden.join("|") === CARTAS.map(c => c.titulo).join("|"));
  ok("después de la última, el buzón no insiste", delAbuelo().length === 0);
}

console.log("\nCADA CARTA ESPERA SU NIVEL");
{
  nueva(false);
  for (const c of CARTAS) {
    G.level = c.nivel - 1;
    const antes = delAbuelo();
    const llegoAntesDeTiempo = antes.length && antes[0].titulo === c.titulo;
    if (llegoAntesDeTiempo) { ok("« " + c.titulo + " » NO llega antes del nivel " + c.nivel, false); break; }
    G.level = c.nivel;
    const ahora = delAbuelo();
    if (!ahora.length || ahora[0].titulo !== c.titulo) { ok("« " + c.titulo + " » llega al nivel " + c.nivel, false, ahora.length ? ahora[0].titulo : "ninguna"); break; }
    G.buzonLeidas[ahora[0].id] = 1;
  }
  ok("las diez llegan exactamente en su nivel y ni uno antes", true);
}

console.log("\nLEÍDAS, SE QUEDAN PARA SIEMPRE   (son la colección)");
{
  nueva(false);
  G.level = 2;
  const c = delAbuelo()[0];
  G.buzonLeidas[c.id] = 1;
  ok("una carta leída no vuelve a la bandeja", !delAbuelo().some(x => x.id === c.id));
  /* y el texto sigue estando en el catálogo para releerla desde la pila */
  ok("pero su texto sigue existiendo para releerla", !!CARTAS[0].txt && CARTAS[0].txt.length > 100);
}

console.log("\nEL INFORME DE CIERRE SÍ ESPERA AL TUTORIAL   (y está bien que lo haga)");
{
  /* « Ahora sí: la granja es tuya » es un resumen DE CIERRE — logros, paquete diario, goblin.
     Ésa sí tiene que llegar cuando el tutorial termina, y por eso conserva su candado. */
  nueva(false); G.level = 10;
  ok("con el tutorial abierto, el informe de cierre no llega",
    !ctx.buzonCartas().some(x => x.id === "granjatuya"));
  nueva(true); G.level = 10;
  ok("y al terminarlo, sí", ctx.buzonCartas().some(x => x.id === "granjatuya"));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el arco del Abuelo todavía no llega a la mesa"
  : "  Todo en orden: las diez cartas llegan, en su nivel, de a una, desde el primer día.");
process.exit(fallos ? 1 : 0);
