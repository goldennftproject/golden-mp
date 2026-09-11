/* LA DEFENSA DE LOS MOBS Y EL DAÑO DEL JUGADOR — COMO TIBIA (TFS), SEGÚN EL DOC DEL DISEÑADOR  (11/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Defensa de los mobs de Tibia » (11/9): cada mob tiene defense (parada, solo con cargas) y
   armor (reducción fija); el golpe pasa por parada → armadura (Creature::blockHit); las cargas
   vuelven 1/s hasta 2; el jugador pega round(nivel/5 + ((skill/4+1)·(atk/3)·1,03)/factor) con
   golpe real normal_random(0, máx); el mob pega normal_random(0, máx) y pasa por la parada del
   jugador, (skill/4 + 2,23) · defArma · 0,15 · factorDefensa.
   Lo que este archivo custodia:
     1 · blockHit sigue el orden y los rangos del doc, con sus casos borde (armor par, 1..3);
     2 · las cargas: se gastan por golpe, vuelven una por segundo, tope 2;
     3 · el daño máximo del jugador es la fórmula del doc, con los ejemplos del doc;
     4 · la tirada real es normal (centrada, máximos raros) y el arco tiene su mínimo;
     5 · el mob pega normal_random(0, máx) y el héroe para con la fórmula de §4;
     6 · lo que es de Golden y no del doc — atk = min + max, armor 6 % del HP — está escrito y
         medido para que la Espada de Madera pegue de media lo de siempre.
     node tools/test-defensa-mobs.js                                                              */
const path = require("path"), vm = require("vm"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const N = 3000;

console.log("\n1 · CREATURE::BLOCKHIT — PARADA, DESPUÉS ARMADURA\n");
{
  let parados = 0, absorb = 0, minD = 99, maxD = -1;
  for (let i = 0; i < N; i++) { const r = ctx.blockHit(10, 0, 6, { blockCount: 2 }); if (r.parado) parados++; else { minD = Math.min(minD, r.dmg); maxD = Math.max(maxD, r.dmg); } }
  ok("defense 6 sin armadura: resta entre 3 y 6 (nunca para un 10)", parados === 0 && minD === 4 && maxD === 7, minD + ".." + maxD);
  for (let i = 0; i < N; i++) { const r = ctx.blockHit(3, 0, 6, { blockCount: 2 }); if (r.parado) parados++; }
  ok("y un golpe de 3 contra defense 6 se PARA siempre", parados === N);
  ok("sin cargas no hay parada: el golpe solo pasa por la armadura", !ctx.blockHit(3, 0, 6, { blockCount: 0 }).parado);
  let mn = 99, mx = -1;
  for (let i = 0; i < N; i++) { const r = ctx.blockHit(20, 8, 0, null); mn = Math.min(mn, r.dmg); mx = Math.max(mx, r.dmg); }
  ok("armor 8 (par): resta entre 4 y 6 (armor − 2)", mn === 14 && mx === 16, mn + ".." + mx);
  mn = 99; mx = -1;
  for (let i = 0; i < N; i++) { const r = ctx.blockHit(20, 7, 0, null); mn = Math.min(mn, r.dmg); mx = Math.max(mx, r.dmg); }
  ok("armor 7 (impar): resta entre 3 y 6 (armor − 1)", mn === 14 && mx === 17, mn + ".." + mx);
  ok("armor 1..3 resta exactamente 1", ctx.blockHit(5, 1, 0, null).dmg === 4 && ctx.blockHit(5, 3, 0, null).dmg === 4);
  ok("armor 0 no resta", ctx.blockHit(5, 0, 0, null).dmg === 5);
  for (let i = 0; i < N; i++) { const r = ctx.blockHit(1, 3, 0, null); if (r.absorbido) absorb++; }
  ok("un golpe de 1 contra armor 3 queda ABSORBIDO (0, no parado)", absorb === N && !ctx.blockHit(1, 3, 0, null).parado);
  ok("el orden es parada → armadura: un golpe parado ya no ve la armadura", (() => { const r = ctx.blockHit(2, 50, 6, { blockCount: 2 }); return r.parado && !r.absorbido; })());
}

console.log("\n2 · LAS CARGAS DE BLOQUEO (§2.1)\n");
{
  const m = { blockCount: 2, blockTicks: 0 };
  ctx.blockHit(100, 0, 6, m); ctx.blockHit(100, 0, 6, m);
  ok("dos golpes gastan las dos cargas", m.blockCount === 0);
  const r = ctx.blockHit(100, 0, 6, m);
  ok("el tercero no se para (solo armadura)", !r.parado && r.dmg === 100 && m.blockCount === 0);
  ctx.tickBlock(m, 400); ok("a los 400 ms no vuelve ninguna", m.blockCount === 0);
  ctx.tickBlock(m, 600); ok("al segundo vuelve una", m.blockCount === 1);
  ctx.tickBlock(m, 1000); ctx.tickBlock(m, 1000); ctx.tickBlock(m, 1000);
  ok("y nunca pasa de 2", m.blockCount === 2);
  ok("un mob nuevo arranca con 2 (blockCount ausente = lleno)", (() => { const n = {}; ctx.blockHit(1, 0, 6, n); return n.blockCount === 1; })());
}

console.log("\n3 · EL DAÑO MÁXIMO DEL JUGADOR (§3.1)\n");
{
  G.weapons = { espada_madera: { dur: 99 }, espada_bronce: { dur: 99 }, arco_madera: { dur: 99 } }; G.gear = G.gear || {}; G.gear.arma = "espada_madera";
  G.combatXp = 0; G.skills.sword = 0;
  ok("skill 10, Espada de Madera (atk 8 = 3 + 5), nivel 1: round(0,2 + 3,5·2,667·1,03) = 10", g('playerMaxDamage("espada_madera")') === 10, g('playerMaxDamage("espada_madera")'));
  /* el ejemplo del doc: Lv 8, sword 25, arma atk 24 → 61. Se reproduce metiendo esos números */
  const f = (level, skill, atk) => Math.round(level / 5 + ((skill / 4 + 1) * (atk / 3) * 1.03) / 1.0);
  ok("la fórmula reproduce el ejemplo del doc: Lv 8, sword 25, atk 24 → 61", f(8, 25, 24) === 61, f(8, 25, 24));
  ok("y el otro: Lv 50, sword 70, atk 40 → 264", f(50, 70, 40) === 264, f(50, 70, 40));
  G.skills.sword = g('triesTotal(30, "sword")');
  ok("subir el skill se nota: a skill 30 la misma espada pega máximo 24 (8,5 · 2,667 · 1,03)", g('playerMaxDamage("espada_madera")') === 24);
  ok("el factor es 1,0 (Golden no tiene modos: siempre ofensivo)", g("TIBIA_FACTOR_ATK") === 1);
  ok("atk del arma = min + max de la tabla del compendio", g("ARM_ATK.espada").join() === "8,12,18,28,42" && g("ARM_ATK.arco").join() === "6,8,14,20,32");
  ok("y la defensa del arma es 0,8 · atk", g('armDefV("espada_madera")') === 6 && g('armDefV("espada_diamante")') === 34);
}

console.log("\n4 · LA TIRADA REAL: NORMAL, CENTRADA, MÁXIMOS RAROS\n");
{
  let s = 0, top = 0, mn = 99, mx = -1;
  for (let i = 0; i < N; i++) { const v = ctx.normalRandom(0, 100); s += v; if (v >= 95) top++; mn = Math.min(mn, v); mx = Math.max(mx, v); }
  ok("media ≈ 50", Math.abs(s / N - 50) < 3, (s / N).toFixed(1));
  ok("los máximos son raros (≥ 95 en menos del 5 %)", top / N < 0.05, (top / N * 100).toFixed(1) + " %");
  ok("nunca sale del rango", mn >= 0 && mx <= 100);
  G.gear.arma = "arco_madera"; G.skills.range = 0; G.combatXp = g("FARM_XP_LVLS[10] * 20") || 99999;
  const lvl = g("combatInfo().lvl"); let bajo = 0;
  for (let i = 0; i < N; i++) { const r = ctx.rollWeaponHit({ armor: 0, defense: 0, blk: null }); if (r.dmg < Math.ceil(lvl * 0.2)) bajo++; }
  ok("con arco contra un mob el mínimo es ceil(nivel · 0,2)   nivel " + lvl, bajo === 0, bajo);
  G.combatXp = 0;
}

console.log("\n5 · CÓMO PEGA EL MOB Y CÓMO PARA EL HÉROE (§4)\n");
{
  G.gear.arma = "espada_madera"; G.skills.sword = 0;
  const d = ctx.heroDefensa(false);
  ok("defensa del héroe con Espada de Madera a skill 10: (2,5 + 2,23) · 6 · 0,15 = 4,26", Math.abs(d - 4.257) < 0.01, d.toFixed(3));
  ok("atacando (ofensivo) la mitad", Math.abs(ctx.heroDefensa(true) - d / 2) < 0.001);
  const forest = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("el golpe básico del mob es normal_random(0, máx) y FÍSICO", /this\.hurtHero\(normalRandom\(0, Math\.round\(m\.def\.dmg \* \(m\.dmgMult \|\| 1\)\)\), true\)/.test(forest));
  ok("y pasa por blockHit del lado del héroe (parada con sus cargas + armadura de las piezas)", /blockHit\(dmg, gearDefTotal\(\) \* \(1 - playerDefLossMult\(\)\), heroDefensa\(atacando\), this\.heroBlk\)/.test(forest));
  ok("las habilidades (pisotón, llamarada…) NO son físicas: siguen por el camino viejo", /this\.hurtHero\(20\); this\.applyState\("quemadura"/.test(forest) && /this\.hurtHero\(45\)/.test(forest));
  ok("las cargas del héroe y de cada bicho se regeneran en update()", /tickBlock\(this\.heroBlk, deltaMs\)/.test(forest) && /for \(const m of this\.monsters\) if \(!m\.dead\) tickBlock\(m, deltaMs\)/.test(forest));
  ok("« Parado » y « Absorbido » se muestran (doc §6)", /"Parado" : "Absorbido"/.test(forest) && /floatHero\("Parada"/.test(forest) && /floatHero\("Absorbido"/.test(forest));
  ok("el `dmg` de la tabla es el MÁXIMO del mob (literal, decisión del 11/9)", /normalRandom\(0, Math\.round\(m\.def\.dmg/.test(forest));
}

console.log("\n6 · LO QUE ES DE GOLDEN: LA ESCALA\n");
{
  const M = g("MONSTER_DEF");
  ok("armor = defense = 6 % del HP, mínimo 1 (rata 1, orco 4, trol 8, demonio 15)",
    ctx.mobArmor(M.rata) === 1 && ctx.mobArmor(M.orco) === 4 && ctx.mobArmor(M.troll) === 8 && ctx.mobArmor(M.demonio) === 15 && ctx.mobDefense(M.troll) === 8);
  ok("un bicho con armor/defense escritos manda sobre la regla", ctx.mobArmor({ hp: 1000, armor: 3 }) === 3 && ctx.mobDefense({ hp: 1000, defense: 2 }) === 2);
  G.gear.arma = "espada_madera"; G.skills.sword = 0; G.combatXp = 0;
  let s = 0; for (let i = 0; i < N; i++) s += ctx.rollWeaponHit({ armor: 0, defense: 0, blk: null }).dmg;
  ok("la Espada de Madera a skill 10 pega de media ~5 (ayer, 4): la escala no se movió", s / N > 4 && s / N < 6, (s / N).toFixed(2));
  let golpes = 0;
  for (let i = 0; i < 300; i++) { let hp = M.rata.hp, m = { blockCount: 2 }; let n = 0; while (hp > 0 && n < 99) { n++; hp -= ctx.rollWeaponHit({ armor: ctx.mobArmor(M.rata), defense: ctx.mobDefense(M.rata), blk: m }).dmg; ctx.tickBlock(m, 2000); } golpes += n; }
  ok("una rata cae en ~4 golpes (ayer 3,3)", golpes / 300 > 3 && golpes / 300 < 5, (golpes / 300).toFixed(1));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
