/* EL MERCADO NO PUEDE COMERSE A SÍ MISMO EN 360 PX (22/9)
   Cuatro pestañas con borde pixelado y filas de icono + texto + cantidad + botón cabían bien en
   escritorio, pero en un teléfono dejaban el texto con 0 px de ancho. jsdom no calcula el layout
   de CSS, así que este contrato protege las reglas geométricas que lo corrigieron: grilla 2×2
   para las pestañas y dos renglones para cada fila. El playtest visual confirma los píxeles; esto
   evita que una limpieza futura borre el breakpoint sin que el test diga nada.
     node tools/test-mercado-movil.js */
const fs = require("fs");
const html = fs.readFileSync("public/index.html", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL MERCADO NORMAL TIENE UN LAYOUT PROPIO EN MÓVIL");
ok("el breakpoint estrecho existe y sólo toca #ov-market",
  /@media\(max-width:480px\)\{[\s\S]*?#ov-market \.shoptabs/.test(html));
ok("las cuatro pestañas pasan a una grilla de dos columnas",
  /#ov-market \.shoptabs\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(html));
ok("la unión decorativa de una sola fila se apaga dentro de la grilla",
  /#ov-market \.shoptab\.active::after\{display:none\}/.test(html));

console.log("\nLAS FILAS CONSERVAN TEXTO Y CONTROLES");
ok("cada fila se vuelve una grilla con columna de icono y columna de texto",
  /#ov-market \.mkt-row\{display:grid;grid-template-columns:54px minmax\(0,1fr\)/.test(html));
ok("la información recibe una columna real y no puede encogerse a cero",
  /#ov-market \.mkt-row \.minfo\{grid-column:2;grid-row:1;min-width:0\}/.test(html));
ok("cantidad y acción bajan al segundo renglón",
  /#ov-market \.mkt-row>input\{grid-column:1;grid-row:2/.test(html) &&
  /#ov-market \.mkt-row>button\{grid-column:2;grid-row:2;width:100%/.test(html));
ok("una compra sin selector de cantidad aprovecha todo el renglón",
  /#ov-market \.mkt-row>\.minfo\+button\{grid-column:1\/-1\}/.test(html));

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: en móvil el Mercado conserva pestañas, texto y acciones.\n");
process.exit(fallos ? 1 : 0);
