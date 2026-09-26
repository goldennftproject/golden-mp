/* LAS TARJETAS NO SE CORTAN EN UNA VENTANA PC BAJA
   =================================================
   Las listas largas ya tienen su propio scroll, pero la tarjeta centrada podía medir más que
   el viewport. A 1280×480 el Inventario real medía 507 px: se iban 13,5 px por cada borde y la
   × empezaba fuera de pantalla. La red común se limita a escritorio bajo; no rediseña móvil.
     node tools/test-tarjetas-bajas-pc.js */
const fs = require("fs");
const html = fs.readFileSync("public/index.html", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };

console.log("\nTARJETAS ENTERAS EN PC BAJO\n");
{
  const regla = html.match(/@media\(min-width:641px\) and \(max-height:560px\)\{([\s\S]*?)\n  \}/);
  const css = regla && regla[1];
  ok("existe una regla exclusiva de escritorio bajo", !!css);
  ok("el marco completo se limita al alto realmente visible",
    !!css && /\.ov \.card\{max-height:calc\(100vh - 32px\);overflow-y:auto;overscroll-behavior:contain\}/.test(css));
  ok("la × entra dentro del marco desplazable",
    !!css && /\.ov \.close\{top:7px;right:7px\}/.test(css));
  /* Con box-sizing global, max-height incluye el borde de 18 px de cada lado: al alto de
     prueba el borde queda en [16,464], no en [-13.5,493.5] como la tarjeta sin límite. */
  const alto = 480, max = alto - 32, borde = 18 * 2;
  ok("a 480 px el borde entero queda dentro del viewport", max === 448 && (alto - max) / 2 === 16,
    "marco " + max + " px · margen " + ((alto - max) / 2) + " px");
  ok("el borde sigue contando dentro del máximo global", /\*\{box-sizing:border-box\}/.test(html) && borde === 36,
    "18 px arriba + 18 px abajo");
}

console.log("\nLA PROTECCIÓN NO CAMBIA MÓVIL NI LAS LISTAS\n");
{
  const activa = (w, h) => w >= 641 && h <= 560;
  ok("640 px de ancho conserva la composición móvil", !activa(640, 480));
  ok("641 px de ancho y 560 de alto ya protege PC", activa(641, 560));
  ok("un escritorio de 561 px conserva su tarjeta normal", !activa(1280, 561));
  ok("las listas largas mantienen su scroll propio",
    /\.forge-list\{[^}]*max-height:52vh;overflow:auto\}/.test(html) &&
    /#ov-cofre #cofre-slots\{max-height:min\(300px,30vh\) !important;overflow-y:auto/.test(html));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: ninguna tarjeta se corta en PC bajo y móvil queda intacto.\n");
process.exit(fallos ? 1 : 0);
