/* DEL CUERPO AL CONTENEDOR Y DEL CONTENEDOR AL CUERPO        (15/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Que todo sea equipable… desde el equipo a la bolsa y viceversa ».

   El arma ya sabía hacer ese viaje desde el 8/9 (armaCambiarLlevada); las piezas de loot no.
   Entraban por gainGear cuando caían de un bicho y se quedaban puestas: si caía una peor se
   vendía sola, y si caía una mejor no había dónde guardar la vieja.

   Un panel que mueve objetos entre dos sitios tiene una única forma grave de fallar, y es
   silenciosa: duplicar o evaporar. Nadie mira la suma total. Así que casi todo lo de acá cuenta
   ANTES y DESPUÉS y compara — el mismo criterio que test-puerta-zona.js. Y se prueba el caso
   que de verdad rompe: el contenedor lleno.
     node tools/test-equipo-ida-y-vuelta.js                                                    */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

/* cuántas piezas hay en TODO el universo del jugador: puestas + en el contenedor */
function censo() {
  const r = {};
  for (const s in (G.gear || {})) { const k = G.gear[s]; if (k && g("GEAR_DEF")[k]) r[k] = (r[k] || 0) + 1; }
  const raiz = g("contLlevado()");
  if (raiz) for (const e of g("contAplanar(contLlevado())")) if (e.kind === "gear") r[e.k] = (r[e.k] || 0) + e.n;
  return r;
}
const sumar = (c) => Object.values(c).reduce((a, b) => a + b, 0);
/* el censo se compara ORDENADO: al cambiar una pieza por otra las claves salen en otro orden y
   un JSON.stringify crudo cantaba una diferencia donde no la había */
const firma = (c) => Object.keys(c).sort().map(k => k + "=" + c[k]).join(" · ");

function montarZona(huecos) {
  ctx.GF.scene = "forest";
  G.gear = { casco: null, armadura: null, botas: null, escudo: null, arma: null, municion: false };
  G.cont = g('contCrear("' + (huecos === "grande" ? "backpack" : "bag") + '")');
}

console.log("\n1 · DENTRO DE LA ZONA, LA PIEZA VA Y VUELVE\n");
{
  montarZona();
  G.gear.casco = "casco_cuero";
  const antes = censo();
  ok("(arnés) arranca con el casco puesto y el contenedor vacío",
    sumar(antes) === 1 && g("contPilas(contLlevado())") === 0);

  ok("guardarla en el contenedor funciona", g('gearGuardar("casco")') === true);
  ok("y deja el hueco vacío", !G.gear.casco);
  ok("la pieza está AHORA en el contenedor", g('contContar(contLlevado(), "gear", "casco_cuero")') === 1);
  ok("nada se duplicó ni se evaporó", firma(censo()) === firma(antes), firma(censo()));

  ok("ponérsela otra vez funciona", g('gearPonerse("casco_cuero")') === true);
  ok("vuelve al hueco que le toca", G.gear.casco === "casco_cuero");
  ok("y ya no está en el contenedor (no quedó una copia)", g('contContar(contLlevado(), "gear", "casco_cuero")') === 0);
  ok("y la suma sigue siendo la misma", firma(censo()) === firma(antes), firma(censo()));
}

console.log("\n2 · CAMBIAR UNA POR OTRA ES UN INTERCAMBIO, NO UN REGALO\n");
{
  montarZona();
  G.gear.casco = "casco_cuero";
  g('contMeter(contLlevado(), "gear", "casco_hierro", 1)');
  const antes = censo();
  ok("(arnés) una puesta y una guardada", sumar(antes) === 2);
  ok("ponerse la de hierro funciona", g('gearPonerse("casco_hierro")') === true);
  ok("queda puesta la de hierro", G.gear.casco === "casco_hierro");
  ok("y la de cuero BAJÓ al contenedor (no desapareció)", g('contContar(contLlevado(), "gear", "casco_cuero")') === 1);
  ok("siguen siendo dos piezas en total", firma(censo()) === firma(antes), firma(censo()));
  ok("y cada una en su sitio, no las dos en el mismo", g("contContar(contLlevado(), 'gear', 'casco_hierro')") === 0);
}

console.log("\n3 · EL CONTENEDOR LLENO: NO SE HACE NADA, Y SE DICE\n");
{
  montarZona();
  G.gear.escudo = "escudo_madera";
  /* se llena la bolsa entera con pilas que no apilan con un escudo */
  for (let i = 0; i < 8; i++) g('contMeter(contLlevado(), "arm", "espada_madera", 1, { w: { dur: ' + (10 + i) + ' } })');
  ok("(arnés) la bolsa quedó llena", g("contLleno(contLlevado())"));
  const antes = censo();
  avisos.length = 0;
  ok("guardar la pieza falla (no hay hueco)", g('gearGuardar("escudo")') === false);
  ok("y el escudo SIGUE PUESTO: no se tiró al aire", G.gear.escudo === "escudo_madera");
  ok("nada cambió de sitio", firma(censo()) === firma(antes));
}

console.log("\n4 · Y EN LA GRANJA NO SE PUEDE: ALLÁ NO HAY DÓNDE GUARDARLA\n");
{
  montarZona();
  G.gear.botas = "botas_cuero";
  ctx.GF.scene = "farm";
  ok("guardar una pieza fuera de la Zona no hace nada", g('gearGuardar("botas")') === false);
  ok("y la pieza sigue puesta", G.gear.botas === "botas_cuero");
  ok("ponerse una tampoco", g('gearPonerse("casco_cuero")') === false);
  /* el motivo, para que nadie lo « arregle » sin querer: en la granja una pieza no puede estar
     en la bolsa — tryAddRes la equipa o la vende (state.js, kind === "gear"). */
  ok("(el motivo) en la granja una pieza suelta se equipa o se vende, no se guarda",
    g("typeof gainGear") === "function");
}

console.log("\n5 · LO QUE LLEVÁS PARA CADA HUECO\n");
{
  montarZona("grande");
  g('contMeter(contLlevado(), "gear", "casco_cuero", 1)');
  g('contMeter(contLlevado(), "gear", "casco_hierro", 1)');
  g('contMeter(contLlevado(), "gear", "escudo_madera", 1)');
  ok("gearAMano trae solo las del hueco pedido", g('gearAMano("casco")').length === 2, g('gearAMano("casco")').join(","));
  ok("y no mezcla huecos", g('gearAMano("escudo")').join(",") === "escudo_madera");
  ok("un hueco sin nada trae la lista vacía", g('gearAMano("armadura")').length === 0);
  ctx.GF.scene = "farm";
  ok("fuera de la Zona no hay nada « a mano » (no existe el concepto)", g('gearAMano("casco")').length === 0);
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
