/* ¿CÓMO SE SIENTE UNA PELEA? — golpes para matar y golpes para morir           (14/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Desde el 11/9 el combate corre con las dos fórmulas de Tibia que pidió Dirección: el daño sale
   de `playerMaxDamage` (nivel + skill + arma) y el golpe del mob pasa por `blockHit` (parry +
   armadura). Los tests custodian que las fórmulas estén BIEN COPIADAS; esto mide otra cosa:
   qué se siente al otro lado de la pantalla.

   Dos números por bicho, los únicos que importan:
     · GOLPES PARA MATAR — cuántas veces hay que pegarle. Menos de 2 es trivial; más de ~12 es
       un muro (el jugador se aburre antes de que se muera).
     · GOLPES PARA MORIR — cuántos te tiene que pegar él a vos. Menos de 4 es injusto; más de
       ~25 significa que el bicho no es una amenaza y la pelea es una formalidad.
   Se simula con dados reales (mil peleas por casilla), no con el promedio de la fórmula.
     node tools/medir-combate.js                                                                */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};

const MON = g("MONSTER_DEF"), ARM = g("ARM_DEF");
const TIRADAS = 1000;

/* El perfil del jugador en cada momento de la primera semana. El skill de arma sale de los
   intentos: a los golpes que de verdad habrá dado a esa altura, no a los que podría dar. */
const PERFILES = [
  { nombre: "día 1 · recién salido del tutorial", nivel: 2, skill: 10, arma: "espada_madera", armadura: 0 },
  { nombre: "día 3 · con lo del herrero puesto", nivel: 5, skill: 14, arma: "espada_piedra", armadura: 3 },
  { nombre: "día 7 · el final de la prueba", nivel: 10, skill: 20, arma: "espada_bronce", armadura: 7 },
  { nombre: "día 20 · el que sigue jugando", nivel: 18, skill: 30, arma: "espada_oro", armadura: 14 },
];

function golpesParaMatar(p, m) {
  G.level = p.nivel; G.skills.sword = g('triesTotal(' + p.skill + ', "sword")');
  G.weapons = {}; G.weapons[p.arma] = { dur: 999 }; G.gear = G.gear || {}; G.gear.arma = p.arma;
  const max = g('playerMaxDamage("' + p.arma + '")');
  let total = 0;
  for (let t = 0; t < TIRADAS; t++) {
    let hp = m.hp, n = 0;
    while (hp > 0 && n < 400) { hp -= Math.max(1, Math.round(g("normalRandom(0, " + max + ")")) - (m.def || 0)); n++; }
    total += n;
  }
  return { golpes: total / TIRADAS, max: max };
}

function golpesParaMorir(p, m) {
  G.level = p.nivel; G.skills.sword = g('triesTotal(' + p.skill + ', "sword")');
  let total = 0;
  for (let t = 0; t < TIRADAS; t++) {
    let hp = 100, n = 0;
    while (hp > 0 && n < 400) {
      const crudo = g("normalRandom(0, " + m.dmg + ")");
      /* el héroe para con el escudo y absorbe con la armadura: la misma cuenta que hurtHero */
      const rec = g("blockHit(" + crudo + ", " + p.armadura + ", heroDefensa(true), null)");
      hp -= Math.max(0, typeof rec === "number" ? rec : (rec && rec.dmg) || 0); n++;
      if (n > 300) break;
    }
    total += n;
  }
  return total / TIRADAS;
}

const DEL_MVP = ["rata", "murcielago", "larva", "baba", "arana", "goblin", "orco"];
for (const p of PERFILES) {
  console.log("\n──── " + p.nombre + " ────");
  const pr = golpesParaMatar(p, MON.rata);
  console.log("   nivel " + p.nivel + " · Espada " + p.skill + " · " + p.arma + " (pega hasta " + pr.max + ") · armadura " + p.armadura);
  console.log("   bicho          vida   golpes para matar    golpes para morir    veredicto");
  for (const k of DEL_MVP) {
    const m = MON[k]; if (!m) continue;
    const matar = golpesParaMatar(p, m).golpes, morir = golpesParaMorir(p, m);
    let v = "ok";
    if (matar < 2) v = "trivial";
    else if (matar > 12) v = "MURO";
    if (morir < 4) v = (v === "ok" ? "" : v + " · ") + "LETAL";
    else if (morir > 40) v = (v === "ok" ? "" : v + " · ") + "no molesta";
    console.log("   " + m.label.padEnd(14) + String(m.hp).padStart(5) + String(matar.toFixed(1)).padStart(18) +
      String(morir.toFixed(0)).padStart(21) + "    " + v);
  }
}
console.log("\nUn bicho sano mata en 3-10 golpes y te mata a vos en 6-25. Fuera de esa banda, o es");
console.log("un saco de arena o es un muro — y en el MVP solo importan los siete de arriba.\n");
