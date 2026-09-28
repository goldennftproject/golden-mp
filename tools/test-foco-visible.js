/* EL TECLADO PUEDE VER DÓNDE ESTÁ (PC)
   Un jugador que navega por Tab no tiene el hover del mouse. Cada control nativo principal
   necesita una señal de foco legible sobre las tarjetas de madera, pero sólo con `:focus-visible`
   para no cambiar el acabado habitual de un clic.
   node tools/test-foco-visible.js */
const fs = require("fs");
const HTML = fs.readFileSync("public/index.html", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const regla = HTML.match(/button:focus-visible,[\s\S]*?\{[\s\S]*?\n\s*\}/);

console.log("\nEL FOCO DE TECLADO SE VE SIN CAMBIAR EL MOUSE");
{
  ok("hay una regla dedicada a :focus-visible", !!regla);
  const css = regla ? regla[0] : "";
  ["button", "a", "input", "textarea", "select"].forEach(tag =>
    ok(tag + " conserva un foco visible", css.includes(tag + ":focus-visible")));
  ok("las casillas con rol de botón comparten el foco visible", css.includes("[role=button]:focus-visible"));
  ok("el anillo usa borde oscuro y halo claro", /outline:\s*2px solid #2b1909/.test(css) && /box-shadow:\s*0 0 0 4px rgba\(255,227,138,\.9\)/.test(css));
  ok("no se aplica a :focus genérico", !/:focus(?!-visible)\b/.test(css));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: Tab deja una marca clara sin alterar el acabado del mouse.\n");
process.exit(fallos ? 1 : 0);
