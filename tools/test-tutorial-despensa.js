/* ¿EL TUTORIAL PIDE PLATOS QUE NO SE PUEDEN COCINAR? (26/8 — reporte del diseñador)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « me deja vender la papa pero no me deja seleccionar el estofado q me indica la flecha amarilla »

   Lo que pasaba, y por qué es un fallo de familia y no un descuido suelto:

     paso 4   « Vendé tus 3 papas en el Mercado »        → la despensa queda en cero
     paso 19  « Cociná tu primer plato: Papa Asada »     → pide papa ×1
     paso 22  « Cazá hasta traer 1 de carne »            → garantiza la CARNE, derivada de la receta
     paso 23  « Cociná un Estofado con lo que cazaste »  → pide carne ×1 + PAPA ×1 + madera ×1

   O sea: el tutorial le vacía la despensa al jugador y cuatro pasos después le señala con una
   flecha amarilla algo que no puede hacer. El paso 22 fue escrito con cuidado —su número sale de
   `RECIPE_DEF.estofado.res.carne`, para que receta y objetivo no se separen nunca— y aun así
   miró UN ingrediente de tres. Un derivado parcial da más confianza que un número a mano y
   protege igual de poco.

   La parte que lo volvió irreportable: el botón decía « Faltan ingredientes ». Cierto, inútil, y
   por la regla 9 de la casa casi peor que callarse — contesta sin informar, así que el jugador no
   distingue « me falta una papa » de « el juego está roto ». El diseñador reportó lo segundo.

   ESTE ARCHIVO VIGILA TRES COSAS
     1 · todo paso que señale una receta la DECLARA (st.receta), para que el texto pueda mirarla
     2 · con la despensa vacía, el objetivo y el botón NOMBRAN lo que falta
     3 · ningún paso del tutorial pide un plato que el jugador no pueda conseguir nunca

   Lo que este archivo NO puede prometer: que el jugador tenga los ingredientes al llegar. Eso es
   una decisión de diseño (el tutorial le enseña a vender, y volver a plantar es parte del bucle).
   Lo que sí exige es que, cuando no los tenga, el juego se lo diga.
     node tools/test-tutorial-despensa.js                                                        */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const PASOS = g("TUTO_STEPS"), REC = g("RECIPE_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const vaciar = () => { G.res = {}; G.fish = {}; G.dishes = {}; G.skills = { cooking: 24 }; };

console.log("\nTODO PASO QUE SEÑALA UNA RECETA, LA DECLARA");
{
  /* el paso apunta con `ui: "[data-cook='estofado']"`. Si no declara además `receta`, el texto
     del objetivo no puede mirar la despensa y vuelve a prometer lo que no se puede cumplir. */
  const señalan = PASOS.filter(s => /data-cook='([a-z_]+)'/.test(String(s.ui || "")));
  ok("hay pasos que señalan una receta", señalan.length >= 2, señalan.length + "");
  const mudos = señalan.filter(s => !s.receta);
  ok("y todos declaran cuál es", !mudos.length, mudos.map(s => s.id).join(", "));
  const cruzados = señalan.filter(s => s.receta !== String(s.ui).match(/data-cook='([a-z_]+)'/)[1]);
  ok("y la declarada es la MISMA que señala la flecha", !cruzados.length,
    cruzados.map(s => s.id + ": señala " + s.ui + " y declara " + s.receta).join(" · "));
  ok("todas las recetas declaradas existen",
    señalan.every(s => !!REC[s.receta]), señalan.map(s => s.receta).join(", "));
}

console.log("\nCON LA DESPENSA VACÍA, EL OBJETIVO NOMBRA LO QUE FALTA");
{
  vaciar();
  for (const s of PASOS.filter(x => x.receta)) {
    const t = ctx.tutoTxt(s);
    const r = REC[s.receta];
    const ingredientes = Object.keys(r.res || {}).concat(Object.keys(r.fish || {}));
    ok("« " + s.id + " » dice qué le falta", /te falta/i.test(t), t);
    /* y los nombra TODOS, no solo el primero: al Estofado le faltan tres cosas distintas */
    const nombrados = ingredientes.filter(k => {
      const lab = (g("RES_LABEL")[k] || k);
      return t.indexOf(lab) >= 0;
    });
    ok("   …y nombra los " + ingredientes.length + " ingredientes que le faltan",
      nombrados.length === ingredientes.length, nombrados.join(", ") + "  ·  " + t);
  }
}

console.log("\nEL BOTÓN DE COCINAR TAMBIÉN — « Faltan ingredientes » no es una respuesta");
{
  vaciar();
  ok("cookFaltaTxt nombra el ingrediente que falta",
    /Papa/.test(ctx.cookFaltaTxt("papa_asada")), ctx.cookFaltaTxt("papa_asada"));
  const est = ctx.cookFaltaTxt("estofado");
  ok("y con tres faltantes los enumera en una línea",
    /Carne/.test(est) && /Papa/.test(est) && /Madera/.test(est), est);
  /* la concordancia importa: « te falta 1 Papa » vs « te faltan 2 Papas ». Un objetivo mal
     escrito se lee como un juego descuidado, y el tutorial es la primera impresión. */
  ok("« te falta » en singular cuando es una sola unidad", /^Te falta [^n]/.test(ctx.cookFaltaTxt("papa_asada")),
    ctx.cookFaltaTxt("papa_asada"));
  G.res = { papa: 5 };
  ok("y cuando alcanza, no dice nada", ctx.cookFaltaTxt("papa_asada") === "", "«" + ctx.cookFaltaTxt("papa_asada") + "»");
  ok("y el objetivo vuelve a su texto limpio",
    ctx.tutoTxt(PASOS.find(s => s.id === "cook")) === "Cociná tu primer plato: Papa Asada",
    ctx.tutoTxt(PASOS.find(s => s.id === "cook")));
}

console.log("\nY ESO LLEGA AL BOTÓN DE VERDAD   (tener el dato no es mostrarlo)");
{
  /* La lección del 26/8, aprendida el mismo día con el panel del camino: se puede tener la
     función perfecta y no llamarla desde la interfaz. Este bloque PINTA la Cocina y lee el
     botón — sin él, borrar la llamada en ui.js deja la suite en verde. */
  vaciar();
  vm.runInContext('_ckSel = "estofado";', ctx);
  ctx.refreshCookingV2();
  const det = ctx.document.getElementById("ck-detalle");
  const txt = (det.innerHTML || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  ok("la Cocina pinta el detalle del Estofado", /Estofado/.test(txt), txt.length + " caracteres");
  ok("y el botón NO dice el genérico « Faltan ingredientes »", txt.indexOf("Faltan ingredientes") < 0);
  ok("dice qué falta, por su nombre", /Papa/.test(txt) && /Carne/.test(txt),
    (txt.match(/Te falta[^<]*/) || ["(nada)"])[0].trim());
}

console.log("\nNINGÚN PASO PIDE UN PLATO INALCANZABLE");
{
  /* Que falte un ingrediente HOY es normal: se planta y listo. Lo que no puede pasar es que el
     tutorial pida una receta cerrada por nivel de oficio, porque de eso no se sale plantando. */
  for (const s of PASOS.filter(x => x.receta)) {
    const r = REC[s.receta];
    ok("« " + s.id + " » pide una receta de Cocina " + (r.lvl || 1) + ", que es la que se tiene al llegar",
      (r.lvl || 1) <= 1, r.lvl + "");
    const deOtroOficio = Object.keys(r.res || {}).filter(k => {
      const c = g("CROP_DEF")[k];
      return c && (c.lvl || 1) > 1;
    });
    ok("   …y sus cultivos son de Cultivo 1, que el tutorial ya enseñó",
      !deOtroOficio.length, deOtroOficio.join(", "));
  }
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el tutorial sigue señalando cosas que no explica"
  : "  Todo en orden: si falta un ingrediente, el objetivo y el botón lo dicen por su nombre.");
process.exit(fallos ? 1 : 0);
