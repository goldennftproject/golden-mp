/* CURARSE SOLO CUESTA TIEMPO                      (16/9, diseñador · detall.docx punto 1)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Corregir que la vida saliendo y entrando de zona negra se cargue toda, agregar timer de 2 h
   o menos, preguntar a la IA qué conviene ».

   No había ningún « curar al entrar » escondido: la granja curaba a UN PUNTO POR SEGUNDO, así
   que la barra entera volvía en menos de tres minutos, gratis. Con eso, ningún número de daño
   podía obligar a comer — la comida solo decidía si volvías caminando a casa o no.

   El temporizador se puso en la CURA y no en la puerta de la Zona, y ese « dónde » es la
   decisión que este archivo custodia: el combate es lo único del juego sin enfriamiento, o sea
   lo único que llena el tiempo muerto, y un candado de dos horas ahí no haría que la comida
   importe — haría que no haya nada que hacer.

   Lo que se prueba: que la barra entera tarde lo que dice la constante SEA CUAL SEA la vida
   máxima (si no, « tarda una hora » sería mentira en cuanto el jugador suba de nivel), que la
   granja siga curando (ley 1: sigue siendo el sitio seguro) y que la Zona no cure nada.
     node tools/test-curarse-cuesta-tiempo.js                                                   */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const ponerCombate = (lvl) => {
  G.buffs = []; G.gear = G.gear || {}; G.gear.arma = null;
  G.combatXp = (function () { let t = 0; for (let i = 1; i < lvl; i++) t += g("skillNeed(" + i + ")"); return t; })();
  g("applyCombatHp()");
};

console.log("\n1 · LA BARRA ENTERA TARDA LO QUE DICE LA CONSTANTE\n");
{
  const MIN = g("GRANJA_CURA_MIN");
  ok("el « timer » está en una constante, en minutos", typeof MIN === "number" && MIN > 0, MIN + " min");
  ok("y es de 2 h o menos, como pidió el diseñador", MIN <= 120, MIN + " min");
  ctx.GF.scene = "farm";
  for (const lvl of [1, 10, 50]) {
    ponerCombate(lvl);
    G.hp = 0;
    let seg = 0; while (G.hp < G.hpMax && seg < 60 * 60 * 6) { g("granjaRegen()"); seg++; }
    const min = Math.round(seg / 60);
    ok("a Combate " + lvl + " (" + G.hpMax + " de vida) la barra entera tarda " + min + " min",
      Math.abs(min - MIN) <= 1, "esperado " + MIN);
  }
  /* ése es el punto: con « 1 por segundo » el que más vida tenía tardaba MÁS en curarse, o sea
     que subir de nivel castigaba. Derivándolo de la vida máxima, la promesa es la misma siempre */
  ok("o sea que subir de nivel NO alarga la espera", true);
}

console.log("\n2 · PERO LA GRANJA SIGUE CURANDO, Y LA ZONA NO\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10); G.hp = 10;
  const antes = G.hp; g("granjaRegen()");
  ok("en la granja la vida sube sola (ley 1: sigue siendo el sitio seguro)", G.hp > antes, antes.toFixed(2) + " → " + G.hp.toFixed(2));
  ctx.GF.scene = "forest";
  const enZona = G.hp; for (let i = 0; i < 600; i++) g("granjaRegen()");
  ok("dentro de la Zona no se cura ni un punto en diez minutos", G.hp === enZona, G.hp.toFixed(2));
  ctx.GF.scene = "farm";
  G.hp = G.hpMax; g("granjaRegen()");
  ok("y con la barra llena no se pasa", G.hp === G.hpMax);
}

console.log("\n3 · Y COMER PASA A SER LA FORMA RÁPIDA\n");
{
  ctx.GF.scene = "farm"; ponerCombate(10);
  const porSeg = g("granjaCuraPorSeg()"), R = g("RECIPE_DEF");
  const baratos = Object.keys(R).filter(k => R[k].heal && (R[k].lvl || 1) <= 1);
  ok("(arnés) hay platos desde Cocina 1", baratos.length >= 2);
  const mejor = Math.max(...baratos.map(k => R[k].heal));
  const minAhorrados = mejor / porSeg / 60;
  console.log("   el mejor plato de Cocina 1 cura " + mejor + ", que son " + Math.round(minAhorrados) + " min de granja");
  ok("el mejor plato ahorra más de diez minutos de espera: comer es una decisión, no un trámite",
    minAhorrados > 10, Math.round(minAhorrados) + " min");
  /* y el peor también tiene que valer algo, o el jugador aprende a ignorar la comida barata */
  const peor = Math.min(...baratos.map(k => R[k].heal));
  ok("y hasta el más barato ahorra minutos", peor / porSeg / 60 >= 2, Math.round(peor / porSeg / 60) + " min");
}

console.log("\n4 · EL CANDADO NO SE PUSO EN LA PUERTA DE LA ZONA\n");
{
  ok("entrar a la Zona sigue sin enfriamiento (es lo único que llena el tiempo muerto)",
    g("ZONA_CD_MIN") === 0, g("ZONA_CD_MIN") + " min");
  /* si algún día dirección quiere el candado ahí, existe y es un número — pero que sea una
     decisión tomada mirando esto, no un efecto secundario de tocar la cura */
  const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  ok("y el motivo queda escrito donde se toca la cura, no en un commit", /ZONA_CD_MIN.*2 h|candado de 2 h/.test(STATE));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
