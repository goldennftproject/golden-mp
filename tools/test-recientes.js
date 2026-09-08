/* LOS TRES ÚLTIMOS USADOS, EN LA TIRA DE LA DERECHA              (8/9, dirección, con captura)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Agregar a mano derecha medio: los últimos 3 ítems que se usen, así se puede ver cuántos
   quedan y no hay que ir a la bolsa a revisar si tengo o no ».

   Lo que este archivo custodia no es la tira —eso es CSS— sino DE DÓNDE SALE LA LISTA: de la
   misma foto de la bolsa que alimenta el flujo desde el 26/8. Lo que bajó, se usó. Esa es la
   decisión que hay que proteger: si mañana alguien la reemplaza por llamadas puestas a mano en
   cada acción, la tira se queda muda el día que aparezca una acción nueva y nadie se acuerde
   de avisarle. Una regla derivada no se olvida de nada.
     node tools/test-recientes.js                                                             */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA LISTA GUARDA LOS TRES ÚLTIMOS, SIN REPETIR");
{
  G.recientes = [];
  ctx.recientesUsar("tool", "axe");
  ctx.recientesUsar("pick", "stone");
  ctx.recientesUsar("res", "lombriz");
  ok("los tres entran, el último primero", G.recientes.join(",") === "res:lombriz,pick:stone,tool:axe", G.recientes.join(" · "));
  ctx.recientesUsar("tool", "axe");
  ok("volver a usar algo lo sube al frente y NO lo duplica",
    G.recientes.join(",") === "tool:axe,res:lombriz,pick:stone", G.recientes.join(" · "));
  ctx.recientesUsar("seed", "papa");
  ok("un cuarto empuja al más viejo fuera", G.recientes.length === 3 && G.recientes[0] === "seed:papa" && G.recientes.indexOf("pick:stone") < 0,
    G.recientes.join(" · "));
  ctx.recientesUsar("arm", "espada_madera"); ctx.recientesUsar("cana", "junco");
  ok("armas y cañas no entran — se tienen, no se gastan", G.recientes.indexOf("arm:espada_madera") < 0 && G.recientes.indexOf("cana:junco") < 0);
}

console.log("\nY DICE CUÁNTOS QUEDAN, DE LA FAMILIA QUE SEA");
{
  G.res.lombriz = 7; G.seeds.papa = 4; G.tools.axe = 32;
  G.picks.owned = Object.assign({}, G.picks.owned, { stone: true });
  G.picks.dur = Object.assign({}, G.picks.dur, { stone: 28 });
  G.dishes = { papa_asada: 2 };
  ok("recursos", ctx.recientesCant("res", "lombriz") === 7);
  ok("semillas", ctx.recientesCant("seed", "papa") === 4);
  ok("herramientas", ctx.recientesCant("tool", "axe") === 32);
  ok("picos", ctx.recientesCant("pick", "stone") === 28);
  ok("platos", ctx.recientesCant("dish", "papa_asada") === 2);
  /* el pez lleva su peso en la clave desde el 2/9: la cuenta tiene que sumar TODAS sus pilas */
  G.fish = {}; ctx.pezGuardar("merluza", 2.0); ctx.pezGuardar("merluza", 5.0);
  ok("y los peces suman sus pilas con peso", ctx.recientesCant("fish", "merluza") === 2);
  ok("lo que no se cuenta contesta 0, no revienta", ctx.recientesCant("arm", "espada_madera") === 0);
}

console.log("\nLA LISTA SALE DEL USO REAL — no de llamadas puestas a mano");
{
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("se alimenta del flujo de la bolsa (lo que BAJÓ, se usó)",
    /cambios\.forEach\(c => \{ if \(c\.d < 0 && typeof recientesUsar/.test(UI));
  ok("y el único sitio que la escribe es ese — sin sembrar llamadas por el código",
    (UI.match(/recientesUsar\(/g) || []).length === 1);
  const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("la tira vive al borde derecho, a media altura", /#recientes\{[^}]*right:8px[^}]*top:50%/.test(HTML));
  ok("y no se le puede hacer clic — es un recordatorio, no un control", /#recientes\{[^}]*pointer-events:none/.test(HTML));
  ok("en cero se apaga y avisa en rojo", /\.rec\.vacio\{/.test(HTML) && /\.rec\.vacio \.rn\{/.test(HTML));
}

console.log("\nY SOBREVIVE AL F5");
{
  G.recientes = ["tool:axe", "res:lombriz", "seed:papa"];
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  ok("el snapshot la lleva", Array.isArray(snap.recientes) && snap.recientes.length === 3);
  G.recientes = undefined;
  ctx.hydrate(snap);
  ok("y el hydrate la devuelve igual", (G.recientes || []).join(",") === "tool:axe,res:lombriz,seed:papa", (G.recientes || []).join(" · "));
  ctx.hydrate(Object.assign({}, snap, { recientes: "basura" }));
  ok("un guardado corrupto no la rompe: queda vacía", Array.isArray(G.recientes) && G.recientes.length === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: lo que usaste está a la vista, con cuánto te queda.\n");
process.exit(fallos ? 1 : 0);
