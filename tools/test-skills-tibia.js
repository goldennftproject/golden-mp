/* LAS ARMAS SUBEN POR INTENTOS — LA FÓRMULA DE TIBIA, TAL CUAL EL DOCUMENTO DEL DISEÑADOR   (11/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Fórmula de skills de Tibia » (11/9): cada golpe es un intento, acierte o no; los oficios de
   arma arrancan en 10; Tries(x → x+1) = A · b^(x − 10) con A = 50 (melee) / 25 (arco) y b = 1.1.
   Lo que este archivo custodia:
     1 · los ejemplos NUMÉRICOS del documento salen exactos con la fórmula del juego;
     2 · un golpe = un intento (melee al pegar, arco al disparar), y matar NO entrena el arma;
     3 · el skill entra directo en el daño (segundo doc; el detalle en test-defensa-mobs.js);
     4 · la migración (ley 1): la XP vieja conserva el nivel y la fracción de barra, y corre UNA vez;
     5 · el dummy sigue siendo entrenamiento offline, en intentos;
     6 · lo que se decidió NO adoptar sigue fuera: sin pérdida al morir, Pesca por XP.
     node tools/test-skills-tibia.js                                                              */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · LOS EJEMPLOS DEL DOCUMENTO, EXACTOS — CON LA A DEL DOCUMENTO\n");
/* 15/9 — dirección bajó la A de 50 a 20 (el motivo, medido, está en state.js junto a TRIES_DEF:
   con 50, llegar a Espada 30 el día 7 pedía 13,7 min de pelea PURA por día contra 16 min/día de
   juego total). Eso cambia la ESCALA, no la FÓRMULA — y este bloque existe para custodiar la
   fórmula, así que se le sigue preguntando por los ejemplos del documento alimentándole la A del
   documento. Si alguien rompe la curva, esto salta igual que antes; si dirección vuelve a mover
   la A, esto ni se entera, que es exactamente como tiene que ser. */
const conA = (A, x) => Math.round(A * Math.pow(g("TRIES_B"), x - g("TRIES_C")));
ok("Espada 10 → 11 = 50 golpes (con la A del doc)", conA(50, 10) === 50);
ok("Espada 50 → 51 ≈ 2.263", conA(50, 50) === 2263, conA(50, 50));
ok("Espada 100 → 101 ≈ 267.000 (el doc redondea; 50·1,1⁹⁰ = 265.651)", Math.abs(conA(50, 100) - 267000) / 267000 < 0.01, conA(50, 100));
ok("Arco 80 → 81 ≈ 19.700", Math.abs(conA(25, 80) - 19700) < 100, conA(25, 80));
ok("y la fórmula del juego es LA MISMA, solo con otra A", g('triesNeed(50, "sword")') === conA(g("TRIES_DEF.sword.A"), 50));
ok("b = 1.1 y c = 10 — la forma de la curva no se tocó", g("TRIES_B") === 1.1 && g("TRIES_C") === 10);

console.log("\n1b · LA A QUE USA EL JUEGO, Y LO QUE COMPRA   (decisión del 15/9)\n");
{
  const A = g("TRIES_DEF.sword.A"), ATK = g("ATTACK_MS") / 1000;
  ok("A = 20 en Espada, Hacha y Mazo; 10 en Arco", ["sword", "hacha", "mazo"].every(k => g('TRIES_DEF.' + k + '.A') === 20) && g("TRIES_DEF.range.A") === 10);
  ok("y se conserva la proporción melee/arco del documento (era 50/25)", A / g("TRIES_DEF.range.A") === 2);
  /* el pedido de dirección: « que al día 7 estén en 30 ». Esto lo comprueba en minutos de bosque
     por día, que es la unidad en la que se tomó la decisión. */
  const min = g('triesTotal(30, "sword")') / 7 * ATK / 60;
  ok("llegar a Espada 30 en 7 días pide unos 5,5 min de pelea por día (el simulador da 16 de juego)",
    min > 4 && min < 7, min.toFixed(1) + " min/día");
}
ok("los cuatro oficios de arma son de intentos, y ningún otro",
  ["sword", "hacha", "mazo", "range"].every(k => g('esOficioTries("' + k + '")')) &&
  ["farming", "tala", "mining", "fishing", "ganaderia", "cooking", "crafting"].every(k => !g('esOficioTries("' + k + '")')));
ok("con 0 intentos el arma está en nivel 10", g('skillInfo(0, "sword").lvl') === 10);
/* 15/9 — estos dos estaban escritos con la A de 50 metida a mano (« 49 / 50 » y « 50 + 55 »).
   Lo que custodian no es el número sino la REGLA: se sube al juntar el escalón entero, y el total
   para estar en un nivel es la SUMA de los escalones y no el atajo del documento. Ahora lo
   preguntan en función de la A que haya, así que sobreviven a la próxima vez que se mueva. */
{
  const primero = g('triesNeed(10, "sword")');
  ok("con un golpe menos que el primer escalón sigue en 10, y al completarlo pasa al 11",
    g('skillInfo(' + (primero - 1) + ', "sword").lvl') === 10 && g('skillInfo(' + primero + ', "sword").lvl') === 11,
    "el escalón 10→11 son " + primero + " golpes");
  const suma = g('triesNeed(10, "sword")') + g('triesNeed(11, "sword")');
  ok("el total para ESTAR en 12 es la SUMA de los dos escalones, no el atajo del doc",
    g('triesTotal(12, "sword")') === suma, suma + "");
}
ok("la barra del panel se mide en golpes", g('skillInfo(0, "sword").tries') === true && g('skillInfo(0, "farming").tries') == null);

console.log("\n2 · UN GOLPE ES UN INTENTO — Y MATAR NO ENTRENA\n");
G.skills.sword = 0; G.skills.range = 0;
g('addTries("sword")');
ok("un golpe suma un intento", G.skills.sword === 1);
g('addXp("sword", 500)');
ok("la XP de un kill NO toca la Espada", G.skills.sword === 1, G.skills.sword);
g('addXp("range", 500)');
ok("ni el Arco", G.skills.range === 0);
g('addXp("farming", 5)');
ok("pero Cultivo sigue subiendo por XP", G.skills.farming === 5);
{
  /* 15/9 — también estaba con el 50 a mano. Lo que importa es que al completar el primer escalón
     se sube, sea cual sea la A. */
  const primero = g('triesNeed(10, "sword")');
  for (let i = 1; i < primero; i++) g('addTries("sword")');
  ok("al completar el primer escalón (" + primero + " golpes), Espada 11",
    g('skillInfo(G.skills.sword, "sword").lvl') === 11, G.skills.sword + " intentos");
}

console.log("\n3 · EL SKILL ENTRA DIRECTO EN EL DAÑO (segundo doc: la fórmula de TFS)\n");
G.skills.sword = 0; G.weapons = { espada_madera: { dur: 99 } }; G.gear = G.gear || {}; G.gear.arma = "espada_madera";
ok("a skill 10 la Espada de Madera pega máximo 10", g('playerMaxDamage("espada_madera")') === 10, g('playerMaxDamage("espada_madera")'));
G.skills.sword = g('triesTotal(30, "sword")');
ok("y a skill 30, máximo 24: subir el skill se nota (doc §3.3)", g('playerMaxDamage("espada_madera")') === 24, g('playerMaxDamage("espada_madera")'));
ok("el detalle vive en test-defensa-mobs.js", require("fs").existsSync(path.join(RAIZ, "tools/test-defensa-mobs.js")));

console.log("\n4 · LA MIGRACIÓN (ley 1): nadie baja de nivel\n");
{
  const xpViejo = g('(function(){ let t = 0; for (let l = 1; l < 4; l++) t += skillNeed(l, "sword"); return t; })()') + 10;   // nivel 4 viejo, con 10 de XP dentro
  G.skills.sword = xpViejo; G.skills.range = 0; G.skills.hacha = 0; G.triesV = 0;
  const antes = g('skillInfoXp(G.skills.sword, "sword")');
  g("migrarSkillsATries()");
  const desp = g('skillInfo(G.skills.sword, "sword")');
  ok("Espada 4 (XP) pasa a Espada 13 (intentos)", antes.lvl === 4 && desp.lvl === 13, antes.lvl + " → " + desp.lvl);
  ok("y conserva la fracción de barra", Math.abs(desp.into / desp.need - antes.into / antes.need) < 0.02, (desp.into / desp.need).toFixed(3) + " ≈ " + (antes.into / antes.need).toFixed(3));
  ok("un arma sin XP queda en 10 con 0 intentos", G.skills.range === 0 && g('skillInfo(0, "range").lvl') === 10);
  ok("y se marca como migrado", G.triesV === 1);
  const t = G.skills.sword; g("migrarSkillsATries()");
  ok("migrar dos veces no cambia nada (idempotente)", G.skills.sword === t);
  ok("el guardado lleva la marca", "triesV" in g("snapshot()"));
}

console.log("\n5 · EL DUMMY ES EL ENTRENAMIENTO OFFLINE, EN INTENTOS\n");
{
  const src = require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("dummyCobrar entrena con addTries, no con addXp", /function dummyCobrar[\s\S]*?addTries\(sk, xp\)[\s\S]*?\n}/.test(src));
  ok("a 60 intentos por hora (uno por minuto) con el tope de horas de siempre", g("DUMMY_OFF_XP_H") === 60 && g("DUMMY_OFF_MAX_H") === 8);
}

console.log("\n6 · LO QUE SE DECIDIÓ NO ADOPTAR SIGUE FUERA\n");
{
  const forest = require("fs").readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("el golpe cuerpo a cuerpo cuenta ANTES del esquive (acierte o no)",
    /addTries\(armSkillKey\(ARM_DEF\[roll\.id\]\.tipo\), 1\);[\s\S]{0,200}m\.def\.evade/.test(forest));
  ok("el disparo cuenta al salir la flecha", /llevoGastar\("res", "flecha", 1\);\s*if \(typeof addTries === "function"\) addTries\("range", 1\)/.test(forest));
  ok("morir no toca los intentos (no hay pérdida del 10 %)", !/skills\[[^\]]+\]\s*\*=\s*0\.9|\* 0\.9\b.*skills/.test(forest + require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")));
  ok("Pesca sigue por XP", g('skillInfo(0, "fishing").lvl') === 1);
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
