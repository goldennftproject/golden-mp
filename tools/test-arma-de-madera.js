/* EL ESCALÓN DE MADERA ES « UN PALO » PARA LAS TRES ARMAS                    (22/9, dirección)
   Discord: « usé un hacha por primera vez y le quité media vida a la rata con skill de inicio…
   con hacha de madera no debería ». Medido: el hacha de madera pegaba 62 % más que la espada.
   Contratos: espada, hacha y mazo de madera tiran lo mismo (3-5) y no llevan bono de tipo;
   desde piedra cada una recupera su identidad; el arco no cambia; y contra la rata del día 1
   ninguna de las tres pega media vida ni en su mejor tirada.
     node tools/test-arma-de-madera.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\nLAS TABLAS\n");
const MM = g("ARM_MINMAX"), BV = g("ARM_BUFFVAL");
ok("espada, hacha y mazo de madera tiran 3-5", ["espada", "hacha", "mazo"].every(t => MM[t][0][0] === 3 && MM[t][0][1] === 5));
ok("y sin bono de tipo en madera", ["espada", "hacha", "mazo"].every(t => BV[t][0] === 0));
ok("desde piedra, cada una tiene lo suyo", MM.hacha[1][1] > MM.espada[1][1] && BV.hacha[1] > 0 && BV.mazo[1] > 0 && BV.espada[1] > 0);
ok("el arco no cambió", MM.arco[0][0] === 2 && MM.arco[0][1] === 4 && BV.arco[0] === 1);

console.log("\nCONTRA LA RATA DEL DÍA 1 (nivel 1, skill 1, 3.000 golpes por arma)\n");
G.weapons = { hacha_madera: { dur: 50 }, espada_madera: { dur: 50 }, mazo_madera: { dur: 50 } }; G.gear = G.gear || {}; G.combatXp = 0; G.skills = G.skills || {}; G.buffs = [];
const hp = g("MONSTER_DEF.rata.hp"), ar = g("mobArmor(MONSTER_DEF.rata)"), df = g("mobDefense(MONSTER_DEF.rata)");
const medias = {};
for (const id of ["espada_madera", "hacha_madera", "mazo_madera"]) {
  G.gear.arma = id;
  let tot = 0, mx = 0; const n = 3000;
  for (let i = 0; i < n; i++) { const r = g("rollWeaponHit({armor:" + ar + ",defense:" + df + ",blk:{blockCount:2}})"); tot += r.dmg; mx = Math.max(mx, r.dmg); }
  medias[id] = tot / n;
  ok(id + ": ni la mejor tirada llega a media rata", mx * 2 < hp, "máx " + mx + " · rata " + hp);
}
const vals = Object.values(medias);
ok("las tres pegan parecido (medias a menos del 10 % entre sí)", Math.max(...vals) / Math.min(...vals) < 1.10, vals.map(v => v.toFixed(2)).join(" · "));

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ en madera, las tres armas son un palo\n");
process.exit(fallos ? 1 : 0);
