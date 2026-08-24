/* LA BARRA DE VIDA VIAJA CON EL MOB (24/8, dirección)
   « Cuando atacas un mob en zona negra y te alejas, la vida queda en un lado y el mob por otro. »
   La causa: drawBar dibuja en coordenadas ABSOLUTAS (m.cx, m.by) pero solo se redibujaba
   cuando cambiaba LA VIDA — un mob herido que te persigue se movía sin que su barra se
   enterara. La optimización del 10/8 (no repintar 25 barras por frame) era correcta; le
   faltaba la mitad del estado.
   Este test lee el código porque la escena de la Zona Negra necesita Phaser: comprueba el
   CONTRATO —que la firma incluya la posición y que el bucle de movimiento repinte— y de paso
   simula la firma para probar que un mob que se mueve la invalida.
     node tools/test-barra-mob.js                                                              */
const fs = require("fs");
const FOREST = fs.readFileSync("public/game/forest.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const cuerpo = FOREST.slice(FOREST.indexOf("drawBar(m) {"), FOREST.indexOf("drawBar(m) {") + 1600);

console.log("\nLA FIRMA MIRA LA VIDA *Y* LA POSICIÓN");
{
  ok("drawBar sigue existiendo con su caché", /_barFirma/.test(cuerpo));
  ok("y la firma incluye dónde está el mob", /m\.cx/.test(cuerpo) && /m\.by/.test(cuerpo) && /firma =/.test(cuerpo));
  ok("la vida sigue en la firma (no se perdió lo que ya funcionaba)", /m\.hp/.test(cuerpo));
  ok("y se redondea para no repintar por subpíxeles", /Math\.round\(m\.cx/.test(cuerpo));
}

console.log("\nEL BUCLE DE MOVIMIENTO REPINTA LA BARRA");
{
  const i = FOREST.indexOf("m.spr.setPosition(m.cx, m.by).setDepth(m.by);");
  ok("el mob se reposiciona cada frame", i > 0);
  const despues = FOREST.slice(i, i + 500);
  ok("y justo ahí se repinta su barra", /this\.drawBar\(m\)/.test(despues));
  ok("solo si está HERIDO (los sanos no cuestan nada)", /m\.hp < m\.def\.hp/.test(despues));
  ok("y la barra recupera su profundidad al moverse", /m\.bar\.setDepth/.test(despues));
}

console.log("\nLA FIRMA, SIMULADA: MOVERSE LA INVALIDA");
{
  /* misma cuenta que el código: vida + posición redondeada a 2 px */
  const firma = (hp, max, cx, by) => hp + "/" + max + "@" + Math.round(cx / 2) + "," + Math.round(by / 2);
  const f0 = firma(50, 100, 300, 200);
  ok("quieto y con la misma vida: no repinta", firma(50, 100, 300, 200) === f0);
  ok("se movió 10 px: repinta", firma(50, 100, 310, 200) !== f0);
  ok("perdió vida sin moverse: repinta", firma(40, 100, 300, 200) !== f0);
  ok("tembló medio píxel: NO repinta (el ahorro se conserva)", firma(50, 100, 300.4, 200) === f0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la barra persigue al mob, no al recuerdo del golpe.\n");
process.exit(fallos ? 1 : 0);
