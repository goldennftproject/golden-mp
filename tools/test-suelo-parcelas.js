/* EL SUELO DE UNA PARCELA DICE LA VERDAD (18/8)
   Reporte: un cuadrado de tierra clara asomando detrás de una parcela. Era la textura del parche
   silvestre de una parcela BLOQUEADA, que no se debería ver.
   Causa: dos cambios de días distintos que se contradecían — el 13/8 le ponía esa textura "a todo
   color" y el 16/8 le puso setVisible(false) delante. Quedaron los dos.
   Esto comprueba que ya no queda ninguna asignación que le ponga textura de bloqueada a un suelo.
     node tools/test-suelo-parcelas.js                                                            */
const fs = require("fs");
const src = fs.readFileSync("public/game/farm.js", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

ok("nadie le pone la textura de parcela bloqueada a un suelo",
  !/setTexture\(\s*["']plot_blocked["']/.test(src),
  /setTexture\(\s*["']plot_blocked["']/.test(src) ? "todavía aparece" : "");
ok("existe una sola función que decide cómo se ve el suelo",
  (src.match(/pintarSueloParcela\s*\(pl, bloqueada\)/g) || []).length === 1);
const usos = (src.match(/this\.pintarSueloParcela\(/g) || []).length;
ok("y la usan todos los sitios que tocaban el suelo", usos >= 3, usos + " llamadas");
// el único setVisible sobre un suelo tiene que estar DENTRO de pintarSueloParcela: si aparece
// suelto en otro sitio, volvimos a tener dos verdades sobre lo mismo
const sueltos = (src.match(/\.ground\.setVisible\(/g) || []).length;
const dentro = /pintarSueloParcela\(pl, bloqueada\) \{[\s\S]{0,400}?\.ground\.setVisible\(/.test(src);
ok("solo la función decide si el suelo se ve", sueltos === 1 && dentro,
  sueltos + " asignaciones de visibilidad" + (dentro ? ", dentro de la función" : ", FUERA de la función"));
ok("la escena repinta los suelos al terminar de armarse",
  /refreshPlotLocks\(\);\s*\}\s*catch/.test(src) || /try \{ this\.refreshPlotLocks\(\)/.test(src));
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
