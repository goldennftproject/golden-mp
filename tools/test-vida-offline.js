/* LA VIDA SE RECUPERA AUNQUE NO ESTÉS        (18/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Todo debe funcionar en segundo plano y minimizado, y la vida debe recuperarse aun offline ».

   Era una incoherencia nuestra, y de las que se notan jugando: los cultivos crecen mientras no
   estás —el juego mira el reloj al volver y pone el mundo al día— pero la vida solo subía con
   la pestaña abierta. Resultado: el que CERRABA el juego volvía como lo dejó, y el que dejaba
   la pestaña abierta sin jugar volvía curado. El juego premiaba tener una pestaña abierta, que
   es exactamente lo contrario de lo que queremos de un juego que se juega a ratos.

   Curar una ausencia es legítimo porque la cura es UNA CUENTA DE TIEMPO, igual que un cultivo:
   no hay azar, ni decisiones, ni nada que simular. Una hora ausente tiene que dar lo mismo que
   una hora con la pestaña abierta sin tocar nada — y eso es lo primero que se prueba acá.

   Y el agujero que este archivo existe para tapar: SI SE CURARA LA AUSENCIA DENTRO DE LA ZONA,
   cerrar el navegador sería la forma barata de curarse gratis en el sitio donde no hay cura. La
   comida dejaría de importar, que es justo lo que el 16/9 costó una tarde arreglar.
     node tools/test-vida-offline.js                                                           */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const H = (h) => h * 3600 * 1000;
/* 18/9 — reloj de mentira, igual que en test-curarse-cuesta-tiempo: desde que la cura cuenta
   tiempo real (para que funcione con la pestaña de fondo), llamar a granjaRegen() en un bucle
   no avanza nada. Acá hace falta porque este archivo compara los DOS caminos —mirando y
   ausente— y esa comparación solo vale si los dos miden lo mismo: segundos. */
let _falso = Date.UTC(2026, 8, 18, 12, 0, 0);
vm.runInContext("(function(f){ nowMs = f; })", ctx)(() => _falso);
const avanzar = (seg) => { _falso += seg * 1000; };
const ponerCombate = (lvl) => {
  G.buffs = []; G.gear = G.gear || {}; G.gear.arma = null;
  G.combatXp = (function () { let t = 0; for (let i = 1; i < lvl; i++) t += g("skillNeed(" + i + ")"); return t; })();
  g("applyCombatHp()");
};

console.log("\n1 · UNA HORA AUSENTE = UNA HORA CON LA PESTAÑA ABIERTA\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10); G.zonaViaje = null;
  /* el mismo tiempo por los dos caminos: segundo a segundo (la pestaña abierta) y de un saque
     (la vuelta de una ausencia). Si dieran distinto, el jugador tendría un motivo para elegir
     cómo dejar el juego, y ese motivo no debería existir */
  G.hp = 0;
  for (let s = 0; s < 1800; s++) { avanzar(1); g("granjaRegen()"); }
  const mirando = G.hp;
  G.hp = 0;
  const curado = g("granjaRegenAusente(" + (1800 * 1000) + ")");
  ok("media hora mirando y media hora ausente curan lo mismo",
    Math.abs(mirando - G.hp) < 0.01, mirando.toFixed(2) + " vs " + G.hp.toFixed(2));
  ok("y la función devuelve cuánto curó, para poder contárselo al jugador",
    Math.abs(curado - G.hp) < 0.01, curado.toFixed(2));
}

console.log("\n2 · NO SE PASA DE LA BARRA, NI CON UNA AUSENCIA LARGUÍSIMA\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10); G.zonaViaje = null;
  G.hp = 1;
  g("granjaRegenAusente(" + H(500) + ")");
  ok("500 horas fuera no pasan de la vida máxima", G.hp === G.hpMax, G.hp + "/" + G.hpMax);
  const extra = g("granjaRegenAusente(" + H(10) + ")");
  ok("y con la barra llena no cura nada (ni un decimal de más)", extra === 0 && G.hp === G.hpMax);
}

console.log("\n3 · EL AGUJERO: AUSENTARSE DENTRO DE LA ZONA NO CURA\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10);
  G.hp = 5;
  G.zonaViaje = { t: Date.now(), pos: null };   // quedó un viaje abierto: la ausencia fue ALLÁ
  const curado = g("granjaRegenAusente(" + H(3) + ")");
  ok("con un viaje abierto, tres horas fuera curan CERO", curado === 0 && G.hp === 5, "hp " + G.hp);
  /* …y la prueba de que la reja es el viaje y no otra cosa: se cierra y cura igual que siempre */
  G.zonaViaje = null;
  const luego = g("granjaRegenAusente(" + H(3) + ")");
  ok("cerrado el viaje, la misma ausencia sí cura", luego > 0, "+" + luego.toFixed(1));
  /* el porqué, para el que lea esto dentro de seis meses: dentro de la Zona no se cura ni con
     la pestaña abierta (test-curarse-cuesta-tiempo). Si la ausencia curara, cerrar el navegador
     sería el botón de curarse gratis en el único sitio donde curarse cuesta comida. */
  ok("(arnés) y dentro de la Zona tampoco cura con la pestaña abierta", (() => {
    ctx.GF.scene = "forest"; G.hp = 5; for (let i = 0; i < 300; i++) { avanzar(1); g("granjaRegen()"); }
    const q = G.hp; ctx.GF.scene = "farm"; return q === 5;
  })());
}

console.log("\n4 · LOS BORDES\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10); G.zonaViaje = null;
  G.hp = 10;
  ok("una ausencia de cero no hace nada", g("granjaRegenAusente(0)") === 0);
  ok("ni una de medio segundo (se cuenta en segundos enteros)", g("granjaRegenAusente(500)") === 0);
  ok("un valor raro no rompe ni resta vida", g("granjaRegenAusente(-99999)") === 0 && G.hp === 10);
  ok("y sin argumento tampoco", g("granjaRegenAusente()") === 0 && G.hp === 10);
}

console.log("\n5 · Y SUBIR DE NIVEL NO ALARGA LA ESPERA TAMPOCO ACÁ\n");
{
  /* la cura por segundo se deriva de la vida máxima, así que la barra entera tarda lo mismo a
     cualquier nivel. Eso vale para la pestaña abierta y tiene que valer para la ausencia */
  const MIN = g("GRANJA_CURA_MIN");
  for (const lvl of [1, 25]) {
    ctx.GF.scene = "farm"; ponerCombate(lvl); G.zonaViaje = null; G.hp = 0;
    g("granjaRegenAusente(" + (MIN * 60 * 1000) + ")");
    ok("a Combate " + lvl + ", " + MIN + " min de ausencia llenan la barra entera",
      Math.abs(G.hp - G.hpMax) < 0.5, G.hp.toFixed(1) + "/" + G.hpMax);
  }
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
