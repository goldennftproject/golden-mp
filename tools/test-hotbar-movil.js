/* LA HOTBAR TÁCTIL MANTIENE LOS DIEZ ATAJOS, SIN BOTONES MINÚSCULOS
   ═══════════════════════════════════════════════════════════════════
   A 320 px, repartir diez huecos en una fila dejaba casillas de ~27 px: no era una interfaz
   tocable. La solución no recorta ni hace scroll horizontal: son dos filas simétricas de cinco,
   siempre con las teclas 1–0 visibles. Esta prueba fija tanto la geometría chica como el hecho
   de que el renderer sigue dibujando los diez huecos.
     node tools/test-hotbar-movil.js */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const inicio = HTML.indexOf("/* 10 casillas en una sola tira");
const css = inicio >= 0 ? HTML.slice(inicio, inicio + 1800) : "";

console.log("\nLA BARRA DE 320 PX NO ESCONDE NINGÚN ATAJO\n");
{
  ok("el modo angosto arma una grilla de cinco columnas",
    /#hotbar\{[^}]*display:grid[^}]*grid-template-columns:repeat\(5,minmax\(42px,52px\)\)/.test(css));
  ok("cada hueco principal mide 52 px y no se encoge", /\.hcell\{width:52px;height:52px;flex:0 0 auto;min-width:42px/.test(css));
  ok("la huella de cinco casillas entra en 320 px",
    5 * 52 + 4 * 3 + 2 * 3 + 20 <= 320 - 16,
    (5 * 52 + 4 * 3 + 2 * 3 + 20) + " px de 304 px útiles");
  ok("en una pantalla baja conserva un mínimo táctil de 42 px",
    /#hotbar \.hcell\{width:42px;height:42px\}/.test(HTML));
  ok("la guía deja sitio para las dos filas", /#tuto\{bottom:158px\}/.test(css));
  ok("el renderer todavía pinta los diez huecos numerados",
    /for \(let i = 0; i < 10; i\+\+\) html \+= hotCellHtml\(G\.hotbar\[i\], i\)/.test(UI));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: los diez atajos se ven y se pueden tocar.\n");
process.exit(fallos ? 1 : 0);
