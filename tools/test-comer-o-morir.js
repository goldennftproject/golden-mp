/* COMER TIENE QUE HACER FALTA, Y ENTRAR TIENE QUE SER POSIBLE            (15/9, diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Que yo deba usar comidas para curarme… que sea más necesario, así sea en los primeros
   niveles ». La subida de daño se puede pedir en porcentajes, pero lo que decide si el pedido
   se cumplió es otra cosa: CUÁNTOS BICHOS SEGUIDOS aguanta el jugador antes de tener que
   curarse. En la Zona la vida no se regenera sola, así que ese número es la mecánica entera.

   Este archivo custodia la banda por los dos lados, que es lo que nadie mira cuando sube un
   número: si entran demasiados, la comida es decorado; si entra menos de uno, el bicho no se
   puede pelear y el pedido se pasó de largo. Al probarlo con ×4,5 el murciélago mataba al
   jugador del día 1 en UNA pelea — por eso el techo de acá abajo existe.

   Se simula con dados reales (fórmulas de Tibia completas: parada, armadura y las cargas).
   Los números que se miran de cerca están en tools/medir-comida.js.
     node tools/test-comer-o-morir.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

const MON = g("MONSTER_DEF");
/* cuántos bichos seguidos se matan con la vida llena, sin curarse */
function bichosPorVida(perfil, key, tiradas) {
  const p = perfil, m = MON[key];
  G.level = p.nivel; G.skills.sword = g('triesTotal(' + p.skill + ', "sword")');
  G.weapons = {}; G.weapons[p.arma] = { dur: 999 }; G.gear = G.gear || {}; G.gear.arma = p.arma;
  const vida = 100 + g("combatHpBonus(" + p.combate + ")");
  const armor = ctx.mobArmor(m), defense = ctx.mobDefense(m), defensa = g("heroDefensa(true)");
  let matados = 0;
  for (let t = 0; t < tiradas; t++) {
    let hp = vida, n = 0; const blk = { blockCount: 2, blockTicks: 0 };
    while (hp > 0 && n < 300) {
      let mhp = m.hp; const bm = { blockCount: 2, blockTicks: 0 };
      while (mhp > 0) {
        for (let f = 0; f < 125; f++) { ctx.tickBlock(bm, 16); ctx.tickBlock(blk, 16); }   // 2 s de frames
        mhp -= ctx.rollWeaponHit({ armor: armor, defense: defense, blk: bm }).dmg;
        hp -= ctx.blockHit(g("normalRandom(0, " + m.dmg + ")"), p.armadura, defensa, blk).dmg;
      }
      if (hp > 0) n++;
    }
    matados += n;
  }
  return matados / tiradas;
}
const DIA1 = { nivel: 2, skill: 10, combate: 1, arma: "espada_madera", armadura: 0 };
const DIA3 = { nivel: 5, skill: 14, combate: 5, arma: "espada_piedra", armadura: 1 };

console.log("\n1 · EL DÍA 1 SE PUEDE ENTRAR (el techo del pedido)\n");
{
  const rata = bichosPorVida(DIA1, "rata", 300), murci = bichosPorVida(DIA1, "murcielago", 300);
  console.log("   el jugador del día 1 mata " + rata.toFixed(1) + " ratas o " + murci.toFixed(1) + " murciélagos con la vida llena");
  /* 15/9 (tarde) — el suelo BAJÓ a propósito. Pedía 3,5 ratas, o sea « la primera franja del
     pantano se limpia de un tirón »; esa tarde dirección quitó la parada a las armas de madera
     (« si la de madera no debería tener parada xD ») y con eso la cuenta cayó a 2,8. No es una
     regresión: es exactamente lo que se pidió dos mensajes antes —« que yo deba usar comidas
     para curarme »—, y limpiar cuatro ratas sin comer era justo lo contrario.
     Lo que el suelo custodia ahora es que la pelea no sea una moneda al aire: con la vida llena
     tienen que entrar DOS bichos de entrada, para que morir sea siempre consecuencia de seguir
     peleando y nunca de haber entrado. */
  ok("con la vida llena entran al menos dos ratas: la pelea no es una moneda al aire", rata >= 2, rata.toFixed(1));
  ok("y un murciélago no te mata de una sola pelea (entrar no puede ser mortal)", murci > 1.15, murci.toFixed(1));
}

console.log("\n2 · Y COMER HACE FALTA (el piso del pedido)\n");
{
  const rata1 = bichosPorVida(DIA1, "rata", 300);
  ok("el día 1 no se hacen diez ratas de un tirón", rata1 <= 8, rata1.toFixed(1));
  const murci3 = bichosPorVida(DIA3, "murcielago", 300);
  console.log("   el del día 3, con piedra y una pieza de armadura, hace " + murci3.toFixed(1) + " murciélagos");
  ok("y al día 3 el murciélago sigue pidiendo una parada para comer", murci3 <= 12, murci3.toFixed(1));
}

console.log("\n3 · Y LA COMIDA DE ESOS NIVELES ALCANZA PARA ALGO\n");
{
  const R = g("RECIPE_DEF");
  const baratos = Object.keys(R).filter(k => R[k].heal && (R[k].lvl || 1) <= 1);
  ok("hay platos curativos desde Cocina 1 (si no, el pedido es imposible de cumplir)", baratos.length >= 2,
    baratos.map(k => R[k].label + " +" + R[k].heal).join(" · "));
  const mejor = Math.max(...baratos.map(k => R[k].heal));
  ok("y el mejor de ellos cura más de lo que cuesta un bicho del pantano", mejor >= MON.murcielago.dmg * 2,
    "cura " + mejor + ", el murciélago pega hasta " + MON.murcielago.dmg);
}

console.log("\n4 · LA CURVA SIGUE SIENDO UNA CURVA, NO UN ESCALÓN\n");
{
  ok("el refuerzo se apaga hacia arriba: el bicho de nivel 50 no se toca", g("mobRefuerzoDmg(50)") === 1);
  let baja = true;
  for (let l = 2; l <= 50; l++) if (g("mobRefuerzoDmg(" + l + ")") > g("mobRefuerzoDmg(" + (l - 1) + ")")) baja = false;
  ok("y baja parejo, sin cortes secos (el corte seco invirtió goblin y orco en su día)", baja);
  /* el refuerzo NO puede reordenar la tabla del diseñador: lo que estaba parejo o en orden en
     `dmgBase` tiene que seguir parejo o en orden después de multiplicarlo y redondearlo */
  let respeta = true;
  const orden = g("MONSTER_ORDER");
  for (let i = 1; i < orden.length; i++) {
    const a = MON[orden[i - 1]], b = MON[orden[i]];
    if (a.lvl < b.lvl && b.dmgBase >= a.dmgBase && b.dmg < a.dmg) {
      respeta = false; console.log("      " + orden[i - 1] + " y " + orden[i] + ": la tabla decía " +
        a.dmgBase + "/" + b.dmgBase + " y quedaron " + a.dmg + "/" + b.dmg);
    }
  }
  ok("el refuerzo no reordena la tabla del diseñador (el redondeo invirtió murciélago y larva)", respeta);
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
