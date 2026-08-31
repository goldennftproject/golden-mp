/* LAS ESCAMAS SE OBTIENEN EN EL TABLERO                                        (31/8, Suren)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La frase es suya y es corta: « las escamas se obtienen en el tablero ». El tablero es el
   tablón de pedidos del pueblo — el que ya existía. La Lonja como tablón aparte, con su
   pestaña de pedidos en el muelle, la monté yo: dos tableros de pedidos en un juego es uno
   de más, y el jugador que aprendió dónde se entregan los encargos no tiene por qué aprender
   un segundo sitio para los de pesca.

   La mudanza es de PARED, no de maquinaria: lonjaPedido, lonjaCapitan, lonjaMesPedido, la
   báscula del torneo y lonjaEntregarEscalon siguen viviendo en state.js con sus sellos
   deterministas y sus relojes (test-pesca-v4-lonja los mide). Lo que cambia es de dónde
   cuelgan los papelitos: del tablón, junto a los encargos de Doña Rosa. La Lonja queda como
   tienda de canje de Escamas y vitrina de títulos — que es lo que un mercado de pescado ES.
     node tools/test-escamas-tablon.js                                                       */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL TABLÓN CUELGA LOS PEDIDOS DE PESCA");
{
  /* una partida que pesca: caña, skill y una marea en curso */
  G.canas = { junco: 1 }; G.plata = 1000; G.fish = {}; G.res = { lombriz: 10 };
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };
  G.lonja = null;
  const p = ctx.lonjaPedido();
  ok("la marea sigue existiendo — la maquinaria no se movió", !!p && !!p.id);
  ctx.refreshPedidos();
  const html = ctx.document.getElementById("pd-lista").innerHTML;
  ok("el tablón pinta la sección de pesca", html.indexOf("Pedidos de pesca") >= 0);
  ok("con al menos un escalón entregable por su botón", html.indexOf("data-lent=") >= 0);
  ok("y dice dónde se canjean las Escamas", html.indexOf("se canjean en la Lonja") >= 0);
}

console.log("\nY LA ENTREGA POR ESA PUERTA PAGA LO DE SIEMPRE");
{
  const p = ctx.lonjaPedido();
  if (p && p.tipo === "peso") { p.hechos = p.n; }               // la de peso se cumple pescando
  else if (p) { G.fish[p.id] = p.n; }                          // la normal, juntando en la bolsa
  const plata0 = G.plata, esc0 = ctx.escamasLonja();
  ok("la entrega del escalón funciona desde el tablón", ctx.lonjaEntregarEscalon("marea") === true);
  ok("paga su plata", G.plata > plata0, plata0 + " → " + G.plata);
  ok("y su Escama — la moneda de la pesca sale del tablero", ctx.escamasLonja() === esc0 + 1);
}

console.log("\nLA LONJA QUEDA COMO TIENDA, NO COMO SEGUNDO TABLÓN");
{
  const html = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  ok("la pestaña Pedido ya no existe en la Lonja", html.indexOf('data-ltab="pedido"') < 0);
  ok("la Tienda y los Títulos siguen", html.indexOf('data-ltab="tienda"') >= 0 && html.indexOf('data-ltab="titulos"') >= 0);
  const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("lonjaPintaPedido se fue con la pestaña", !/function lonjaPintaPedido/.test(ui));
  ok("y la Lonja abre en la tienda por defecto", /LONJA_TAB = "tienda"/.test(ui));
  /* la fila del escalón sigue viva porque ahora la pinta el tablón */
  ok("lonjaFilaEscalon sigue: el tablón la usa", /function lonjaFilaEscalon/.test(ui) && /pdSeccionPesca/.test(ui));
  /* y el clic de entrega del tablón conoce a los pedidos de pesca */
  ok("la delegación del tablón atiende data-lent", /data-lent/.test(ui.slice(ui.indexOf("ov-pedidos"))));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: un solo tablón, y las Escamas salen de él.\n");
process.exit(fallos ? 1 : 0);
