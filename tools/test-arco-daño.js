/* EL ARCO NO PEGA MÁS QUE LA ESPADA: PEGA DE LEJOS                              (26/9, diseñador)
   « habría que revisar el daño del arco a ver si tiene mucho » · « con bajarle el daño al arco
   sería lo que falta ». Medido (tools/medir-arco.js): el arco de madera era la única arma de
   madera con su identidad puesta —sangrado que no pasa por armadura ni parada— y le pegaba a la
   rata un 27 % más que la espada; piedra y bronce la igualaban golpe a golpe, y encima de lejos.
   Contratos: madera es un palo también para el arco (3-5, sin sangrado); desde piedra el arco
   queda por debajo de la espada golpe a golpe (con el sangrado contado) en todos los escalones;
   el sangrado sigue existiendo desde piedra; y un arco de madera no deja sangrando al bicho.
     node tools/test-arco-daño.js                                                              */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const MM = g("ARM_MINMAX"), BV = g("ARM_BUFFVAL"), RAR = g("ARM_RAREZAS"), MON = g("MONSTER_DEF");

console.log("\nLAS TABLAS\n");
ok("el arco de madera tira 3-5 como las otras tres", MM.arco[0][0] === 3 && MM.arco[0][1] === 5);
ok("y sin sangrado: madera es un palo para los CUATRO", BV.arco[0] === 0 && ["espada", "hacha", "mazo"].every(t => BV[t][0] === 0));
ok("desde piedra el sangrado existe y sube", BV.arco.slice(1).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), BV.arco.join());
ok("y el arco nunca tira más que la espada del mismo escalón", RAR.every((r, i) => MM.arco[i][1] <= MM.espada[i][1]));

/* jugador del escalón: nivel/skill de cuando se forja esa rareza */
const PERFIL = [{ nivel: 2, skill: 10, bicho: "rata" }, { nivel: 5, skill: 14, bicho: "rata" }, { nivel: 10, skill: 20, bicho: "larva" },
  { nivel: 16, skill: 26, bicho: "goblin" }, { nivel: 22, skill: 32, bicho: "golem" }];
function montar(tipo, i) {
  const id = tipo + "_" + RAR[i], p = PERFIL[i], sk = g('armSkillKey("' + tipo + '")');
  G.level = p.nivel; let acc = 0; for (let k = 2; k <= p.nivel; k++) acc += g("skillNeed(" + k + ")"); G.combatXp = acc;
  G.skills[sk] = g('triesTotal(' + p.skill + ', "' + sk + '")');
  G.weapons = {}; G.weapons[id] = { dur: 999 }; G.gear = G.gear || {}; G.gear.arma = id; G.buffs = [];
  return id;
}
function media(m, N) {   // daño medio por golpe, con los dos tics de sangrado que caben antes del golpe siguiente
  const armor = ctx.mobArmor(m), defense = ctx.mobDefense(m); let tot = 0; const blk = { blockCount: 2, blockTicks: 0 };
  for (let i = 0; i < N; i++) { for (let f = 0; f < 125; f++) ctx.tickBlock(blk, 16); const r = ctx.rollWeaponHit({ armor, defense, blk }); tot += r.dmg + 2 * (r.bleed || 0); }
  return tot / N;
}

console.log("\nGOLPE A GOLPE, CON EL SANGRADO CONTADO (3.000 tiradas por arma)\n");
RAR.forEach((r, i) => {
  const m = MON[PERFIL[i].bicho];
  montar("espada", i); const e = media(m, 3000);
  montar("arco", i); const a = media(m, 3000);
  const tope = i === 0 ? 1.08 : 0.95;   // madera: iguales (mismo palo); desde piedra: por debajo
  ok(r.padEnd(8) + " contra " + PERFIL[i].bicho.padEnd(6) + " espada " + e.toFixed(1) + " · arco " + a.toFixed(1) + " (" + Math.round(100 * a / e - 100) + " %)", a <= e * tope);
});

console.log("\nEL ARCO DE MADERA NO DEJA SANGRANDO\n");
{
  montar("arco", 0); const r = ctx.rollWeaponHit({ armor: 1, defense: 1, blk: { blockCount: 2 } });
  ok("la tirada de madera trae sangrado 0", r && !r.bleed, r && r.bleed);
  montar("arco", 1); const r2 = ctx.rollWeaponHit({ armor: 1, defense: 1, blk: { blockCount: 2 } });
  ok("la de piedra sí (1/s)", r2 && r2.bleed === 1, r2 && r2.bleed);
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ el arco pega de lejos, no más fuerte\n");
process.exit(fallos ? 1 : 0);
