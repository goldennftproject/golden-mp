/* EL TABLÓN PIDE PECES QUE EXISTEN (27/8 — reescrito para la Pesca v4)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Este archivo nació el 25/8 porque el tablón pedía « comun », una rareza del catálogo de la v2
   que ya nadie pescaba. La Pesca v4 jubiló ese catálogo Y el de la v3, así que el mismo archivo
   volvería a medir peces que no existen — el error que vino a cazar, cometido por él mismo.

   LA REGLA NO CAMBIA, y es la del capítulo 11 del documento de pesca:
       « la Lonja solo pide lo que el jugador YA puede pescar. Un pedido imposible no frustra:
         enseña que el tablón miente, y a partir de ahí el jugador deja de leerlo. »

   Lo que cambia es cómo se decide « puede ». En la v3 había familias y carnadas que abrían
   especies; en la v4 hay BANDAS, y lo que las mueve es la caña. Así que el tablón pide de las
   tres bandas bajas y nada más: un épico al 0,75 % no es un encargo, es una lotería.
     node tools/test-tablon-pesca.js                                                             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const PEZ = g("PEZ_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function pescador(nv) {
  let acc = 0; for (let k = 2; k <= nv; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc }; G.level = 9; G.tuto = { done: true };
  G.canas = { junco: 1 }; G.built = { cocina: true };
}
const peces = () => ctx.pedPool().filter(p => p.tipo === "fish");

console.log("\nEL TABLÓN PIDE DEL CATÁLOGO QUE EXISTE HOY");
{
  pescador(20);
  const p = peces();
  ok("pide peces de la Pesca v4", p.length > 0 && p.every(x => !!PEZ[x.key]),
    p.map(x => x.key).filter(k => !PEZ[k]).join(",") || p.length + " peces");
  ok("y ninguno del catálogo jubilado (comun · raro · epico · legendario)",
    p.every(x => ["comun", "raro", "epico", "legendario"].indexOf(x.key) < 0));
  ok("cada pedido vale lo que valen sus peces",
    p.every(x => Math.abs(x.val - PEZ[x.key].precio * x.n) < 1.01),
    p.map(x => x.key + ":" + x.val).slice(0, 3).join(" "));
}

console.log("\nY SOLO DE LAS BANDAS QUE SE PUEDEN SACAR   (la regla dura del capítulo 11)");
{
  pescador(20);
  const p = peces();
  ok("nada de bandas altas: un épico al 0,75 % no es un encargo",
    p.every(x => ["epico", "legendario"].indexOf(PEZ[x.key].banda) < 0),
    p.filter(x => ["epico", "legendario"].indexOf(PEZ[x.key].banda) >= 0).map(x => x.key).join(","));
  ok("ni míticos, que salen de nasa y todavía no existen",
    p.every(x => PEZ[x.key].banda !== "mitico"));
  ok("los baratos se piden en tanda y los caros sueltos",
    p.filter(x => PEZ[x.key].precio <= 5).every(x => x.n === 3) &&
    p.filter(x => PEZ[x.key].precio > 12).every(x => x.n === 1));
}

console.log("\nCADA PEDIDO SE LLAMA POR SU NOMBRE");
{
  pescador(20);
  const nombres = peces().map(p => ctx.pedidoLabel(p));
  ok("ningún pedido se llama solo « Pescado »", nombres.every(n => n !== "Pescado"), nombres.join(" · "));
  ok("y cada uno trae su lámina", peces().every(p => !!ctx.pedidoSprite(p)));
  console.log("       → antes iban todos a FISH_DEF, que solo conocía cuatro rarezas, así que el");
  console.log("         tablón pedía « 3 Pescado » y el jugador no sabía qué ir a buscar.");
}

console.log("\nEL TEMA DEL TORNEO SIGUE EXISTIENDO EN EL TABLÓN");
{
  const TEMAS = g("EVENTO_TEMAS");
  const torneo = TEMAS.find(t => t.id === "pesca");
  ok("« El Torneo de Pesca » es uno de los temas del fin de semana", !!torneo, torneo && torneo.label);
  pescador(20);
  ok("y tiene encargos que ofrecer", ctx.pedPool().filter(torneo.f).length > 0,
    ctx.pedPool().filter(torneo.f).length + " encargos");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el tablón todavía pide lo que no se puede dar"
  : "  Todo en orden: el tablón pide peces que existen, con su nombre y a su precio.");
process.exit(fallos ? 1 : 0);
