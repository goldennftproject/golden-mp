/* LAS ARMAS SUBEN POR INTENTOS — LA FÓRMULA DE TIBIA, TAL CUAL EL DOCUMENTO DEL DISEÑADOR   (11/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Fórmula de skills de Tibia » (11/9): cada golpe es un intento, acierte o no; los oficios de
   arma arrancan en 10; Tries(x → x+1) = A · b^(x − 10) con A = 50 (melee) / 25 (arco) y b = 1.1.
   Lo que este archivo custodia:
     1 · los ejemplos NUMÉRICOS del documento salen exactos con la fórmula del juego;
     2 · un golpe = un intento (melee al pegar, arco al disparar), y matar NO entrena el arma;
     3 · el daño no cambió: nivel 10 pega como pegaba el 1 (nivel − 9 en tirada + nivel/2);
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

console.log("\n1 · LOS EJEMPLOS DEL DOCUMENTO, EXACTOS\n");
ok("Espada 10 → 11 = 50 golpes", g('triesNeed(10, "sword")') === 50);
ok("Espada 50 → 51 ≈ 2.263", g('triesNeed(50, "sword")') === 2263, g('triesNeed(50, "sword")'));
ok("Espada 100 → 101 ≈ 267.000 (el doc redondea; 50·1,1⁹⁰ = 265.651)", Math.abs(g('triesNeed(100, "sword")') - 267000) / 267000 < 0.01, g('triesNeed(100, "sword")'));
ok("Arco 80 → 81 ≈ 19.700", Math.abs(g('triesNeed(80, "range")') - 19700) < 100, g('triesNeed(80, "range")'));
ok("A = 50 en Espada, Hacha y Mazo; 25 en Arco", ["sword", "hacha", "mazo"].every(k => g('TRIES_DEF.' + k + '.A') === 50) && g("TRIES_DEF.range.A") === 25);
ok("b = 1.1 y c = 10", g("TRIES_B") === 1.1 && g("TRIES_C") === 10);
ok("los cuatro oficios de arma son de intentos, y ningún otro",
  ["sword", "hacha", "mazo", "range"].every(k => g('esOficioTries("' + k + '")')) &&
  ["farming", "tala", "mining", "fishing", "ganaderia", "cooking", "crafting"].every(k => !g('esOficioTries("' + k + '")')));
ok("con 0 intentos el arma está en nivel 10", g('skillInfo(0, "sword").lvl') === 10);
ok("con 49 sigue en 10 y con 50 pasa al 11", g('skillInfo(49, "sword").lvl') === 10 && g('skillInfo(50, "sword").lvl') === 11);
ok("el total para ESTAR en 12 es 50 + 55 (la suma de escalones, no el atajo del doc)", g('triesTotal(12, "sword")') === 105);
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
for (let i = 0; i < 49; i++) g('addTries("sword")');
ok("a los 50 golpes, Espada 11", g('skillInfo(G.skills.sword, "sword").lvl') === 11);

console.log("\n3 · EL DAÑO NO CAMBIÓ\n");
G.skills.sword = 0;
ok("nivel 10 recién arrancado pega como el 1 de antes (bono 0)", g('nivelArmaDmg("sword")') === 1 && Math.floor(g('nivelArmaDmg("sword")') / 2) === 0);
G.skills.sword = g('triesTotal(13, "sword")');
ok("nivel 13 = el viejo 4: bono +2", g('skillInfo(G.skills.sword, "sword").lvl') === 13 && Math.floor(g('nivelArmaDmg("sword")') / 2) === 2);
ok("Cultivo no lleva ese corrimiento", g('nivelArmaDmg("farming")') === g('skillInfo(G.skills.farming, "farming").lvl'));

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
