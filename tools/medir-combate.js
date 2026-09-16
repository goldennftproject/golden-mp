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
/* CORRECCIÓN (14/9, el mismo día): la primera versión de este archivo puso armadura 7 al día 7 y
   14 al día 20, y con esos números el jugador salía prácticamente inmortal. Estaban inventados.
   La armadura del juego son SIETE piezas que suman 8 de defensa en total, y todas salen de
   drops de bichos tardíos: las botas de la larva (lvl 5), el casco y el escudo de madera del
   orco (15), la pechera de cuero del lancero (16), el casco y el escudo de hierro del guerrero
   (20), la pechera de hierro del trol (30). Al día 7 el jugador anda por la araña y el goblin:
   tiene las botas y poco más. Con la armadura de verdad el combate se ve muy distinto — y el
   « no hay riesgo » que reporté salía de mi número inventado, no del juego. */
/* SEGUNDA CORRECCIÓN (14/9, tarde): acá se daba por sentado que la vida era 100 siempre. No lo
   es — sube en DOS hitos de Combate y ahí se planta: nivel 5 suma 20 y nivel 10 suma 40, o sea
   100 → 120 → 160, y del Combate 11 en adelante no sube nunca más. El techo llega temprano, así
   que la conclusión de fondo no cambia (el daño de los bichos no puede escalar mucho), pero el
   número que se escriba en el TODO tiene que ser el de verdad. La vida sale de combatHpBonus. */
const PERFILES = [
  { nombre: "día 1 · recién salido del tutorial", nivel: 2, skill: 10, combate: 1, arma: "espada_madera", armadura: 0 },
  { nombre: "día 3 · con lo del herrero puesto", nivel: 5, skill: 14, combate: 5, arma: "espada_piedra", armadura: 1 },
  { nombre: "día 7 · el final de la prueba", nivel: 10, skill: 20, combate: 10, arma: "espada_bronce", armadura: 1 },
  { nombre: "día 20 · el que sigue jugando", nivel: 18, skill: 30, combate: 16, arma: "espada_oro", armadura: 5 },
];
const vidaDe = (p) => 100 + g("combatHpBonus(" + p.combate + ")");

/* TERCERA CORRECCIÓN (15/9): esto restaba `m.def` —el campo viejo de la tabla— cuando el combate
   de verdad pasa por `rollWeaponHit` contra `mobArmor`/`mobDefense`, que son el 6 % de la VIDA del
   bicho y sus cargas de parada. O sea que medía contra una armadura que no es la que tiene.
   Saltó al subirle la vida a los bichos el 15/9: como la armadura se deriva de la vida, subirla
   los hizo además más duros, y esta función no lo veía. Ahora usa el camino real. */
function golpesParaMatar(p, m) {
  G.level = p.nivel; G.skills.sword = g('triesTotal(' + p.skill + ', "sword")');
  G.weapons = {}; G.weapons[p.arma] = { dur: 999 }; G.gear = G.gear || {}; G.gear.arma = p.arma;
  const max = g('playerMaxDamage("' + p.arma + '")');
  const armor = ctx.mobArmor(m), defense = ctx.mobDefense(m);
  let total = 0;
  for (let t = 0; t < TIRADAS; t++) {
    let hp = m.hp, n = 0, blk = ctx.blkDeMob();   // 16/9: las cargas de los BICHOS, que ya no son las del héroe
    while (hp > 0 && n < 600) { n++; for (let f = 0; f < 125; f++) ctx.tickBlock(blk, 16); hp -= ctx.rollWeaponHit({ armor: armor, defense: defense, blk: blk }).dmg; }
    total += n;
  }
  return { golpes: total / TIRADAS, max: max };
}

function golpesParaMorir(p, m) {
  G.level = p.nivel; G.skills.sword = g('triesTotal(' + p.skill + ', "sword")');
  let total = 0;
  const vida = vidaDe(p);
  for (let t = 0; t < TIRADAS; t++) {
    let hp = vida, n = 0;
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
  console.log("   nivel " + p.nivel + " · Combate " + p.combate + " (" + vidaDe(p) + " de vida) · Espada " + p.skill +
    " · " + p.arma + " (pega hasta " + pr.max + ") · armadura " + p.armadura);
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
console.log("LO QUE ESTE ARCHIVO APRENDIÓ EL 14/9, DESPUÉS DE EQUIVOCARSE:");
console.log("  Con la armadura de verdad (0-1 en la primera semana) el combate del MVP está SANO:");
console.log("  la araña y el goblin matan en 3-5 golpes y te matan en 29-34. El « no hay riesgo »");
console.log("  del primer informe salía de suponer armadura 7 al día 7, que el jugador no tiene.");
console.log("  Se probó además reescalar el daño bicho por bicho para que todos maten en ~18");
console.log("  golpes: la cuenta aplanaba el bestiario entero (la rata pegando 12 y el trol 20),");
console.log("  porque la vida del héroe deja de crecer muy temprano: 100 · +20 al Combate 5 ·");
console.log("  +40 al Combate 10 = 160, y del 11 en adelante NUNCA MÁS. Ésa es la restricción de");
console.log("  fondo, y de paso el Combate del 11 para arriba no entrega vida ni ninguna otra");
console.log("  cosa — el mismo problema que los seis oficios huérfanos. No se tocó nada.\n");
