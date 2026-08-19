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
/* 2ª pasada: "no quiero que haya líneas de puntos grises... solo debe aparecer cuando pasó el
   cursor encima". En reposo el lote tiene que ser INVISIBLE del todo. */
ok("en reposo el relleno del lote es 0 (sin tinte gris sobre el bosque)",
  /setFillStyle\(col, on \? 0\.34 : 0\)/.test(fn));
ok("en reposo el borde del lote es 0 (sin recuadro gris)",
  /setStrokeStyle\(on \? 3 : 2, col, on \? 1 : 0\)/.test(fn) &&
  /this\.add\.rectangle\(x0 \+ w \/ 2, y0 \+ h \/ 2, w, h, col, 0\)/.test(fn));
ok("las estacas nacen ocultas (eran la 'línea de puntos')",
  /estacas\.forEach\(o => \{ o\.setVisible\(false\)/.test(fn));
ok("y se encienden con el cursor", /estacas\.forEach\(o => \{ try \{ o\.setVisible\(on\)/.test(fn));
ok("la zona NO se oculta con setVisible (perdería el hover)",
  !/zona\.setVisible\(/.test(fn));
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
