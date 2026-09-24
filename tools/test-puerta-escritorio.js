/* LA PUERTA DE ESCRITORIO ES PARTE DEL JUEGO
   El ingreso no puede volver a ser una tarjeta verde genérica ni arrastrar este rediseño a móvil.
     node tools/test-puerta-escritorio.js */
const fs = require("fs");
const html = fs.readFileSync("public/index.html", "utf8");
const inicio = html.indexOf("/* La puerta es la primera imagen de la granja.");
const fin = html.indexOf("/* ---- UI de madera", inicio);
if (inicio < 0 || fin < 0) throw new Error("No se encontró el estilo de la puerta de escritorio");
const css = html.slice(inicio, fin);

let fallos = 0;
function ok(nombre, condicion, detalle) {
  if (!condicion) fallos++;
  console.log((condicion ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
}

console.log("\nPUERTA DE ESCRITORIO: EL MISMO MUNDO VISUAL QUE LA GRANJA");
ok("todo el tratamiento vive detrás del corte de escritorio", /@media\(min-width:641px\)\{[\s\S]*#gate/.test(css));
ok("el fondo tiene profundidad, sin sumar una imagen pesada", /#gate\{overflow:hidden;background:[\s\S]*radial-gradient[\s\S]*linear-gradient/.test(css));
ok("la tarjeta usa el marco y la veta de madera existentes", /#gate \.gcard\{[\s\S]*wood_bg\.png[\s\S]*panel_wood\.png/.test(css));
ok("la tarjeta no puede escaparse en un escritorio angosto", /box-sizing:border-box;width:min\(440px,calc\(100vw - 72px\)\)/.test(css));
ok("los campos pasan a pergamino de alto contraste", /#gate input\{background:#faf3e2;border-color:#d9c290;color:#3d3424/.test(css));
ok("el brillo ambiental no intercepta clics", /#gate::before\{content:"";position:absolute;inset:0;pointer-events:none/.test(css));

console.log("\n" + (fallos ? "  ✗ " + fallos + " fallas\n" : "  ✓ la entrada de PC ya pertenece visualmente a Golden Farm\n"));
process.exit(fallos ? 1 : 0);
