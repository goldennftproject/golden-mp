/* ¿CUÁNTO SE AGUANTA SIN COMER? — el pedido del diseñador del 15/9                (15/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « El vampiro pega duro, yo le subiría unos porcentajes más, y le subiría a la rata unos
   porcentajes también, que yo deba usar comidas para curarme… que sea más necesario, así sea
   en los primeros niveles ».

   Para mover eso hace falta saber contra qué se mueve. La pregunta de verdad no es cuánto pega
   un bicho: es CUÁNTOS BICHOS SEGUIDOS aguanta el jugador antes de tener que comer. Ese número
   es el que decide si la comida es una mecánica o un adorno.

   Se simula una cadena de peleas con dados reales: el héroe pega cada ATTACK_MS y el bicho cada
   2 s, los dos pasando por las fórmulas de Tibia (parada + armadura). Se mata un bicho, se
   empieza el siguiente sin curarse —en la Zona la vida NO se regenera— y se cuenta hasta morir.

   Con un número de argumento se re-evalúa state.js con OTRO refuerzo de daño, para ver adónde
   llevaría subirlo antes de tocarlo:
     node tools/medir-comida.js          ← como está hoy
     node tools/medir-comida.js 4.5      ← qué pasaría con MOB_REFUERZO_LVL1 = 4,5             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");

const nuevo = parseFloat(process.argv[2]);
let reemplazos = null;
if (!isNaN(nuevo)) {
  const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  reemplazos = { "game/state.js": STATE.replace("var MOB_REFUERZO_LVL1 = 3;", "var MOB_REFUERZO_LVL1 = " + nuevo + ";") };
}
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ, reemplazos);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};

const MON = g("MONSTER_DEF"), TIRADAS = 2000;
const PERFILES = [
  { nombre: "día 1 · sale del tutorial", nivel: 2, skill: 10, combate: 1, arma: "espada_madera", armadura: 0, bichos: ["rata", "murcielago"] },
  { nombre: "día 3 · con lo del herrero", nivel: 5, skill: 14, combate: 5, arma: "espada_piedra", armadura: 1, bichos: ["rata", "murcielago", "larva"] },
  { nombre: "día 7 · el final de la prueba", nivel: 10, skill: 20, combate: 10, arma: "espada_bronce", armadura: 1, bichos: ["murcielago", "larva"] },
];
const vidaDe = (p) => 100 + g("combatHpBonus(" + p.combate + ")");

function montar(p) {
  G.level = p.nivel; G.skills.sword = g('triesTotal(' + p.skill + ', "sword")');
  G.weapons = {}; G.weapons[p.arma] = { dur: 999 }; G.gear = G.gear || {}; G.gear.arma = p.arma;
}
/* una pelea con dados: devuelve { segundos, vidaPerdida } */
function pelea(p, m, blkHeroe) {
  const armor = ctx.mobArmor(m), defense = ctx.mobDefense(m), defensa = g("heroDefensa(true)");
  const ATK = g("typeof ATTACK_MS !== 'undefined' ? ATTACK_MS : 2000");
  let hp = m.hp, blkMob = { blockCount: 2, blockTicks: 0 }, ms = 0, perdida = 0;
  while (hp > 0 && ms < 600000) {
    ms += ATK;
    for (let f = 0; f < ATK / 16; f++) { ctx.tickBlock(blkMob, 16); ctx.tickBlock(blkHeroe, 16); }
    hp -= ctx.rollWeaponHit({ armor: armor, defense: defense, blk: blkMob }).dmg;
    /* el bicho pega cada 2 s (forest.js: m.nextHit = t + 2000) */
    const r = ctx.blockHit(g("normalRandom(0, " + m.dmg + ")"), p.armadura, defensa, blkHeroe);
    perdida += typeof r === "number" ? r : r.dmg;
  }
  return { segundos: ms / 1000, perdida: perdida };
}

console.log("\n¿CUÁNTOS BICHOS SEGUIDOS SE MATAN SIN COMER?" + (reemplazos ? "   (probando MOB_REFUERZO_LVL1 = " + nuevo + ")" : ""));
console.log("refuerzo de daño del bicho de nivel 1: ×" + g("MOB_REFUERZO_LVL1") + "\n");
for (const p of PERFILES) {
  montar(p);
  const vida = vidaDe(p);
  console.log("──── " + p.nombre + " · " + vida + " de vida · " + p.arma + " · armadura " + p.armadura);
  for (const k of p.bichos) {
    const m = MON[k]; if (!m) continue;
    let matados = 0, seg = 0, perdidaPorPelea = 0;
    for (let t = 0; t < TIRADAS; t++) {
      let hp = vida, n = 0; const blk = { blockCount: 2, blockTicks: 0 };
      while (hp > 0 && n < 200) {
        const r = pelea(p, m, blk);
        hp -= r.perdida; seg += r.segundos; perdidaPorPelea += r.perdida;
        if (hp > 0) n++;                      // el que te mata no cuenta como matado
      }
      matados += n;
    }
    const porPartida = matados / TIRADAS, media = perdidaPorPelea / (matados + TIRADAS);
    console.log("   " + (m.label || k).padEnd(15) + "pega hasta " + String(m.dmg).padStart(3) +
      "   pierde " + media.toFixed(1).padStart(5) + " de vida por bicho   →  " +
      porPartida.toFixed(1).padStart(5) + " bichos con la vida llena   (" + Math.round(seg / TIRADAS / 60) + " min)");
  }
  console.log("");
}

/* qué cura la comida que el jugador TIENE a esa altura: si el plato cura 10 y perdés 5 por
   bicho, comer es un trámite; si perdés 40, es una decisión */
console.log("LO QUE CURA LA COMIDA DE LOS PRIMEROS NIVELES\n");
{
  const R = g("RECIPE_DEF");
  const platos = Object.keys(R).filter(k => R[k].heal && (R[k].lvl || 1) <= 3)
    .sort((a, b) => (R[a].lvl || 1) - (R[b].lvl || 1) || R[a].heal - R[b].heal);
  for (const k of platos.slice(0, 8)) {
    console.log("   " + R[k].label.padEnd(20) + "cura " + String(R[k].heal).padStart(3) +
      "   Cocina " + (R[k].lvl || 1) + "   " + Math.round((R[k].cookS || 0) / 60) + " min de olla");
  }
}
console.log("\nLA REGLA QUE SE MIRA: si con la vida llena entran MÁS DE 10 bichos seguidos, comer");
console.log("es decorado — el jugador vuelve a la granja y se cura gratis antes de necesitarlo.");
console.log("Entre 3 y 6 la comida es parte de salir a la Zona. Menos de 2 es un impuesto.\n");
