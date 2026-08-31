/* CADA TABLERO CON SU OFICIO: EL DEL PUEBLO NO PIDE PECES              (25/8 · 27/8 · 31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La vida entera de este archivo es la historia de esa frontera:
     · 25/8 — nació porque el tablón pedía « comun », un pez de un catálogo jubilado.
     · 27/8 — se reescribió para la v4: el tablón pedía de las tres bandas bajas.
     · 31/8, mediodía — Suren dijo « las escamas se obtienen en el tablero » y los pedidos de
       pesca de la Lonja se mudaron ENTEROS al tablón del pueblo.
     · 31/8, tarde — dirección lo vio andando y decidió lo contrario, con la frontera dicha
       completa: « en el tablón de pesca quedan mejores… que sea solo de pesca y en el tablero
       del pueblo solo se pidan cosechas, maderas y minerales. »

   Así que la regla final es CADA TABLERO CON SU OFICIO, y este archivo la custodia por los dos
   lados: el tablón del pueblo no pide ni un pez (ni en diarias, ni en grandes, ni en el evento
   del finde), y la Lonja — que pide peces con criterio de pesca: bandas alcanzables, umbrales
   de peso, ventanas — conserva su pestaña de pedidos y sus cuatro escalones.
     node tools/test-tablon-pesca.js                                                             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function pescador(nv) {
  let acc = 0; for (let k = 2; k <= nv; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc }; G.level = 9; G.tuto = { done: true };
  G.canas = { junco: 1, oro: 1 }; G.built = { cocina: true };
}

console.log("\nEL TABLÓN DEL PUEBLO: COSECHAS, MADERAS Y MINERALES — Y NI UN PEZ");
{
  pescador(20);   // pesca al techo y la mejor caña: si algún pez se colara, acá se colaría
  const pool = ctx.pedPool();
  ok("el pool del tablón no ofrece peces ni con Pesca 20 y caña de oro",
    !pool.some(p => p.tipo === "fish"), pool.filter(p => p.tipo === "fish").map(p => p.key).join(", "));
  ok("y sigue ofreciendo lo suyo: cultivos, madera y piedra",
    pool.some(p => p.tipo === "res"));
  /* los tres escalones grandes salen del MISMO pool, así que sin peces en el pool no hay
     pez posible en el semanal, el mensual ni el evento — pero el evento además elegía por
     TEMA, y el tema de pesca tiene que haberse ido con los peces */
  const temas = g("EVENTO_TEMAS").map(t => t.id);
  ok("el finde ya no tiene el tema « Torneo de Pesca » — el torneo DE VERDAD vive en la Lonja",
    temas.indexOf("pesca") < 0, temas.join(" · "));
  ok("los otros temas del finde siguen enteros",
    ["cosecha", "lenia", "cantera", "festin"].every(t => temas.indexOf(t) >= 0));
}

console.log("\nY LA LONJA ES EL TABLERO DE LA PESCA, CON SU PESTAÑA Y SUS CUATRO ESCALONES");
{
  const html = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  ok("la pestaña Pedido está en la Lonja", html.indexOf('data-ltab="pedido"') >= 0);
  const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("lonjaPintaPedido volvió y la Lonja abre en ella",
    /function lonjaPintaPedido/.test(ui) && /LONJA_TAB = "pedido"/.test(ui));
  ok("y el tablón del pueblo ya no pinta sección de pesca", !/pdSeccionPesca\(\)/.test(ui));
  /* la maquinaria: una marea en curso, entregable, que paga su plata y su Escama */
  G.plata = 1000; G.fish = {}; G.lonja = null;
  const p = ctx.lonjaPedido();
  ok("hay pedido de marea", !!p && !!p.id);
  if (p && p.tipo === "peso") p.hechos = p.n; else if (p) G.fish[p.id] = p.n;
  const esc0 = ctx.escamasLonja(), plata0 = G.plata;
  ok("se entrega en la Lonja", ctx.lonjaEntregarEscalon("marea") === true);
  ok("paga su plata y su Escama", G.plata > plata0 && ctx.escamasLonja() === esc0 + 1);
  ok("y los cuatro escalones existen", ["marea", "capitan", "mes", "torneo"].every(k => !!g("LONJA_ESCALON")[k]));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el pueblo pide granja, la Lonja pide pesca.\n");
process.exit(fallos ? 1 : 0);
