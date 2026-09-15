/* LA VIDA SUBE CON EL NIVEL, Y NADIE PIERDE LA QUE TENÍA        (15/9, diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « ¿Agregamos vida por nivel? Y la ponemos como barra roja ».

   Era el agujero más grande del combate a largo plazo, y estaba medido desde el 14/9 en
   medir-combate.js: la vida subía en el Combate 5 (+20) y en el 10 (+40) y DESPUÉS NUNCA MÁS.
   Se quedaba en 160 para siempre mientras el bestiario seguía subiendo, así que todo el riesgo
   tenía que salir del daño de los bichos — lo único que no puede escalar mucho sin volverse
   injusto.

   Lo que este archivo custodia son las dos cosas que un cambio así puede romper en silencio:
     1 · LEY 1 — nadie puede despertarse con menos vida máxima de la que tenía ayer. La recta
         nueva tiene que ir por encima de los dos escalones viejos en TODOS los niveles.
     2 · que la pendiente siga DERIVÁNDOSE de los hitos que el diseñador ya había aprobado, y no
         sea un número escrito a mano que envejezca en silencio.
     node tools/test-vida-por-nivel.js                                                          */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

/* la curva VIEJA, escrita acá a propósito: es contra lo que hay que comparar para la ley 1 */
const vidaVieja = (l) => 100 + (l >= 5 ? 20 : 0) + (l >= 10 ? 40 : 0);
const vidaNueva = (l) => 100 + g("combatHpBonus(" + l + ")");

console.log("\n1 · LEY 1: NADIE PIERDE VIDA MÁXIMA\n");
{
  const perdedores = [];
  for (let l = 1; l <= 150; l++) if (vidaNueva(l) < vidaVieja(l)) perdedores.push(l);
  ok("en ningún nivel del 1 al 150 la vida nueva es menor que la vieja", perdedores.length === 0, perdedores.join(","));
  ok("el nivel 1 arranca igual que siempre (100)", vidaNueva(1) === 100, vidaNueva(1));
  ok("y en el 10, donde estaba el techo viejo, no baja", vidaNueva(10) >= vidaVieja(10), vidaNueva(10) + " vs " + vidaVieja(10));
}

console.log("\n2 · Y AHORA NO SE FRENA NUNCA\n");
{
  let sube = true, plana = [];
  for (let l = 2; l <= 150; l++) { if (vidaNueva(l) <= vidaNueva(l - 1)) { sube = false; plana.push(l); } }
  ok("cada nivel de Combate da más vida que el anterior", sube, plana.slice(0, 8).join(","));
  ok("el nivel 11 ya no es el final de nada (antes daba lo mismo que el 10)",
    vidaNueva(11) > vidaNueva(10) && vidaVieja(11) === vidaVieja(10), vidaNueva(11) + " contra " + vidaVieja(11));
  console.log("      nivel  10 → " + vidaNueva(10) + "   ·   20 → " + vidaNueva(20) +
    "   ·   50 → " + vidaNueva(50) + "   (antes: 160 en los tres)");
}

console.log("\n3 · LA PENDIENTE SALE DE LOS HITOS, NO DE UN NÚMERO A MANO\n");
{
  const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("COMBAT_HP_NIVEL se calcula a partir de COMBAT_HP5 y COMBAT_HP10",
    /COMBAT_HP_NIVEL = Math\.round\(\(COMBAT_HP5 \+ COMBAT_HP10\) \/ 9\)/.test(STATE), g("COMBAT_HP_NIVEL") + " por nivel");
  ok("y es la misma que implicaban los dos escalones (60 de vida repartidos del 1 al 10)",
    Math.abs(g("COMBAT_HP_NIVEL") * 9 - (g("COMBAT_HP5") + g("COMBAT_HP10"))) <= 4,
    g("COMBAT_HP_NIVEL") * 9 + " contra " + (g("COMBAT_HP5") + g("COMBAT_HP10")));
  /* si dirección mueve los hitos, la recta se mueve con ellos: eso es lo que hace que esto no
     envejezca en silencio como envejecieron el cofre y los cosméticos con el techo 50 */
  const { ctx: c2 } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ, {
    "game/state.js": STATE.replace("var COMBAT_HP5 = 20, COMBAT_HP10 = 40;", "var COMBAT_HP5 = 40, COMBAT_HP10 = 80;"),
  });
  /* « el doble ± el redondeo »: 120/9 da 13,3 y 60/9 da 6,7, así que exigir exactamente el doble
     sería exigir que dos redondeos caigan del mismo lado — un test que falla por aritmética y no
     por un error de verdad es un test que se termina apagando. */
  ok("con hitos del doble, la vida por nivel también es el doble (±1 por el redondeo)",
    Math.abs(vm.runInContext("COMBAT_HP_NIVEL", c2) - g("COMBAT_HP_NIVEL") * 2) <= 1,
    vm.runInContext("COMBAT_HP_NIVEL", c2) + " contra " + g("COMBAT_HP_NIVEL") * 2);
}

console.log("\n4 · Y LA VIDA MÁXIMA DE VERDAD LA USA\n");
{
  G.buffs = []; G.gear = G.gear || {}; G.gear.arma = null;
  for (const lvl of [1, 10, 25]) {
    G.combatXp = g("triesTotal ? 0 : 0") || 0;
    /* se fuerza el nivel por la XP acumulada, que es de donde sale combatInfo() */
    G.combatXp = (function () { let t = 0; for (let i = 1; i < lvl; i++) t += g("skillNeed(" + i + ")"); return t; })();
    g("applyCombatHp()");
    ok("a Combate " + g("combatInfo().lvl") + " la vida máxima es " + G.hpMax,
      G.hpMax === vidaNueva(g("combatInfo().lvl")), "esperada " + vidaNueva(g("combatInfo().lvl")));
  }
  ok("subir de nivel sigue curando lo que suma (es premio, no bucle)", g("typeof curarPorNivel") === "function");
}

console.log("\n5 · LA BARRA ROJA DEL HUD\n");
{
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("el HUD tiene corazón, relleno y número", /hpcor/.test(HTML) && /id="hp-fill"/.test(HTML) && /id="s-hp"/.test(HTML));
  ok("el relleno es rojo", /\.hpfill\{[^}]*#e03a3a/.test(HTML));
  ok("y se rellena desde la vida de verdad, no a ojo", /\(G\.hp \|\| 0\) \/ max/.test(UI));
  ok("refreshHud la actualiza (si no, se quedaría fija al 100 %)", /refreshVidaBarra\(\)/.test(UI));
  ok("y por debajo de un cuarto avisa sola", /classList\.toggle\("bajo"/.test(UI) && /\.hpfill\.bajo\{/.test(HTML));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
