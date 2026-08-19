/* EL CARTEL DE EXPANSIÓN SOLO CON EL CURSOR ENCIMA (18/8)
   Dirección: "en vez de mostrar permanentemente el cartel de nivel bloqueado, que solo pasando el
   cursor por encima se iluminen los árboles que van a desaparecer y aparezca el cartelito".
   No se puede arrancar Phaser acá, así que se comprueba sobre el código que la lógica esté puesta.
     node tools/test-cartel-expansion.js                                                          */
const fs = require("fs");
const src = fs.readFileSync("public/game/farm.js", "utf8");
const fn = src.slice(src.indexOf("dibujarExpansion() {"), src.indexOf("  // pathfinding A*"));
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

ok("el bloque reacciona al cursor", /zona\.on\("pointerover"/.test(fn) && /zona\.on\("pointerout"/.test(fn));
ok("al pasar por encima se ilumina el lote (se ve qué árboles se van)",
  /setFillStyle\(col, on \? 0\.3/.test(fn));
ok("el cartel nace oculto si todavía no lo podés pagar",
  /expCartel\.forEach\(o => o\.setVisible\(puede\)\)/.test(fn));
ok("y se muestra con el cursor encima", /setVisible\(on \|\| puede\)/.test(fn));
ok("pasar del lote al cartel no lo esconde", /chapa\.on\("pointerover"/.test(fn));
ok("las estacas siguen siempre visibles (marcan el lote, no molestan)",
  !/estaca|expCartel\.push\(this\.add\.rectangle\(x, y, 4, 11/.test(fn.replace(/\/\*[\s\S]*?\*\//g, "")) );
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
