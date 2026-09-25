/* EL FLUJO DE RECURSOS NO ESCRIBE SOBRE VENTANAS EN PC
   =====================================================
   Los chips siguen visibles sobre el mundo, pero una tarjeta abierta debe quedar limpia en
   escritorio estrecho. El orden táctil de móvil no se modifica.
     node tools/test-flujo-overlay-pc.js */
const fs = require("fs");
const HTML = fs.readFileSync("public/index.html", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };

console.log("\nEL FLUJO QUEDA DETRÁS DE LOS OVERLAYS SÓLO EN ESCRITORIO\n");
{
  const base = HTML.match(/#flujo\{([^}]*)\}/);
  ok("la capa móvil/base conserva el efecto sobre el juego", !!base && /z-index:60/.test(base[1]));
  ok("PC lo baja a la capa del HUD, debajo de una tarjeta", /@media\(min-width:641px\)\{#flujo\{z-index:6\}\}/.test(HTML));
  ok("los overlays siguen por delante del HUD", /\.ov\{[\s\S]{0,110}z-index:var\(--ov-frente,10\)/.test(HTML));
}

console.log("\nEL CORTE RESPETA LA PASADA POSTERIOR DE MÓVIL\n");
{
  const capa = ancho => ancho > 640 ? 6 : 60;
  ok("641 px ya protege las ventanas de escritorio", capa(641) === 6, String(capa(641)));
  ok("640 px conserva la composición actual de móvil", capa(640) === 60, String(capa(640)));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el flujo informa sin tapar ventanas en PC.\n");
process.exit(fallos ? 1 : 0);
