/* ¿PEGA DEMASIADO EL ARCO? — el pedido del diseñador del 26/9                          (27/9)
   « habría que revisar el daño del arco a ver si tiene mucho o qué ».
   Se mide con dados reales lo que cada arma le saca a un bicho POR GOLPE, contando lo que
   suma el sangrado del arco (buffVal por segundo durante 3 s ⇒ 2 tics antes del próximo golpe
   a 2 s de cadencia) y la tirada mínima a distancia (ceil(nivel × 0,2)). Se comparan los cinco
   escalones con el jugador que los usa (nivel de forja de cada rareza).
     node tools/medir-arco.js                                                              */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
/* para probar OTRA tabla del arco sin tocar state.js:
     ARCO_MINMAX="[[2,4],[3,5],[5,9],[8,12],[12,20]]" ARCO_BUFF="[0,2,3,4,6]" node tools/medir-arco.js */
let reemplazos = null;
if (process.env.ARCO_MINMAX || process.env.ARCO_BUFF) {
  let STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  if (process.env.ARCO_MINMAX) STATE = STATE.replace(/arco:\s+\[\[2,4\],\[3,5\],\[5,9\],\[8,12\],\[12,20\]\],/, "arco: " + process.env.ARCO_MINMAX + ",");
  if (process.env.ARCO_BUFF) STATE = STATE.replace(/arco: \[1,2,3,4,6\] \}/, "arco: " + process.env.ARCO_BUFF + " }");
  reemplazos = { "game/state.js": STATE };
}
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ, reemplazos);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
const MON = g("MONSTER_DEF"), N = 4000;
const ARM_TIPOS = g("ARM_TIPOS"), RAR = g("ARM_RAREZAS"), DEF = g("ARM_DEF");
const PERFILES = [   // quién usa cada escalón: nivel/skill del momento en que se forja
  { rar: "madera",   nivel: 2,  skill: 10, bichos: ["rata", "murcielago"] },
  { rar: "piedra",   nivel: 5,  skill: 14, bichos: ["rata", "murcielago", "larva"] },
  { rar: "bronce",   nivel: 10, skill: 20, bichos: ["murcielago", "larva", "goblin"] },
  { rar: "oro",      nivel: 16, skill: 26, bichos: ["goblin", "lobo"] },
  { rar: "diamante", nivel: 22, skill: 32, bichos: ["lobo", "golem"] },
];
function montar(tipo, p) {
  const id = tipo + "_" + p.rar, sk = g('armSkillKey("' + tipo + '")');
  G.level = p.nivel; G.combatXp = 0; let acc = 0; for (let k = 2; k <= p.nivel; k++) acc += g("skillNeed(" + k + ")"); G.combatXp = acc;
  G.skills[sk] = g('triesTotal(' + p.skill + ', "' + sk + '")');
  G.weapons = {}; G.weapons[id] = { dur: 999 }; G.gear = G.gear || {}; G.gear.arma = id; G.gear.municion = "flecha";
  return id;
}
function mediaPorGolpe(m) {
  const armor = ctx.mobArmor(m), defense = ctx.mobDefense(m);
  let tot = 0, blk = { blockCount: 2, blockTicks: 0 };
  for (let i = 0; i < N; i++) {
    for (let f = 0; f < 2000 / 16; f++) ctx.tickBlock(blk, 16);
    const r = ctx.rollWeaponHit({ armor, defense, blk });
    /* el Vuelo evasivo del murciélago solo esquiva el cuerpo a cuerpo (forest.hitMonster) */
    if (m.evade && r.tipo !== "arco" && Math.random() < m.evade) continue;
    tot += r.dmg + (r.bleed ? 2 * r.bleed : 0);   // el sangrado tic-a a 1 s y 2 s: dos tics por golpe a 2 s
  }
  return tot / N;
}
const out = [];
PERFILES.forEach(p => {
  console.log("\n" + p.rar.toUpperCase() + "  (nivel " + p.nivel + ", skill " + p.skill + ")");
  p.bichos.forEach(b => {
    const m = MON[b]; if (!m) return;
    const fila = {};
    ARM_TIPOS.forEach(t => { montar(t, p); fila[t] = mediaPorGolpe(m); });
    const ref = fila.espada;
    console.log("  " + b.padEnd(11) + " hp " + String(m.hp).padStart(4) + "   " +
      ARM_TIPOS.map(t => t.padEnd(6) + " " + fila[t].toFixed(1).padStart(5) + " (" + Math.round(100 * fila[t] / ref - 100) + "%)").join("   ") +
      "   golpes p/ matar: " + ARM_TIPOS.map(t => t[0] + Math.ceil(m.hp / fila[t])).join(" "));
    out.push({ rar: p.rar, bicho: b, fila });
  });
});
module.exports = out;
