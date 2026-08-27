/* ¿HAY ALGO QUE SE PUEDA TENER Y NO SE VEA EN LA BOLSA? (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Reporte del diseñador: « la caña nueva se compra pero no aparece en el bag ».
   Y no eran solo las cañas. Pesca v3 metió DOS clases de objeto nuevas y ninguna estaba en la
   bolsa:
     · las cañas (G.canas) — se craftean, se gastan, y eran invisibles
     · las NUEVE especies  — canonicalStacks recorría FISH_ORDER, el catálogo VIEJO de cuatro
       rarezas. Todo lo pescado desde la tanda 1 no se veía, no ocupaba lugar, y no se podía
       vender ni entregar en un pedido.

   Lo segundo es MÁS grave que lo reportado y nadie lo dijo, porque « no aparece » se confunde
   con « todavía no pesqué nada ». Un objeto que existe en el estado y no existe en la bolsa es
   un objeto que el jugador tiene y no puede usar.

   LA CAUSA DE FONDO, que es lo que este auditor vigila: `canonicalStacks()` estaba escrita como
   una lista de catálogos A MANO. Cada vez que alguien agrega contenido nuevo tiene que acordarse
   de venir hasta acá — y acordarse no es un mecanismo. Esto compara, para cada clase de objeto,
   lo que el jugador PUEDE tener contra lo que la bolsa sabe mostrar, y canta la diferencia.
     node tools/auditar-bolsa-completa.js                                                        */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G;
ctx.toast = () => {}; ctx.log = () => {};
const g = (n) => { try { return vm.runInContext(n, ctx); } catch (e) { return null; } };

let fallos = 0;
const linea = () => console.log("─".repeat(78));
console.log(""); linea();
console.log("  LO QUE SE PUEDE TENER  vs  LO QUE LA BOLSA MUESTRA");
linea();

/* limpia la granja: así lo único que hay en la bolsa es lo que le pongamos a propósito */
function vaciar() {
  G.res = {}; G.seeds = {}; G.fish = {}; G.dishes = {}; G.canas = {};
  G.picks = { owned: {}, dur: {}, eq: null };
  G.tools = { axe: 0, rod: 0 };
  G.weapons = {}; G.gear = G.gear || {}; G.gear.arma = null;
  G.chests = [];
}
/* ¿la bolsa ve este objeto, y sabe dibujarlo? */
function pruebaClase(nombre, claves, poner, quitar) {
  const faltan = [], mudos = [];
  for (const k of claves) {
    vaciar(); poner(k);
    const pila = ctx.canonicalStacks();
    const mio = pila.filter(s => s.key === k);
    if (!mio.length) { faltan.push(k); continue; }
    /* está en la bolsa: ¿el casillero sabe qué dibujar? Un casillero sin etiqueta es
       tan invisible para el jugador como no estar. */
    let v = null;
    try { v = ctx.itemView ? ctx.itemView(mio[0]) : null; } catch (e) { v = null; }
    if (!v || (!v.sprite && !v.emoji) || !v.label) mudos.push(k + (v ? " (sin " + (!v.label ? "etiqueta" : "dibujo") + ")" : " (revienta)"));
  }
  vaciar(); if (quitar) quitar();
  const total = claves.length;
  if (!faltan.length && !mudos.length) {
    console.log("  ✓  " + nombre.padEnd(26) + total + " de " + total + " se ven y se dibujan");
  } else {
    if (faltan.length) { console.log("  ✘  " + nombre.padEnd(26) + "NO ENTRAN EN LA BOLSA: " + faltan.join(", ")); fallos++; }
    if (mudos.length) { console.log("  ⚠  " + nombre.padEnd(26) + "entran pero no se dibujan: " + mudos.join(", ")); fallos++; }
  }
}

const ORD = (n) => g(n) || [];
pruebaClase("recursos", ORD("ITEM_RES_ORDER"), (k) => { G.res[k] = 5; });
pruebaClase("semillas", ORD("CROP_ORDER"), (k) => { G.seeds[k] = 5; });
/* 27/8: la Pesca v4 jubiló ESPECIE_ORDER y las cuatro rarezas de la v2. Una sola lista. */
pruebaClase("peces (Pesca v4)", ORD("PEZ_ORDER"), (k) => { G.fish[k] = 3; });
pruebaClase("platos", ORD("RECIPE_ORDER"), (k) => { G.dishes[k] = 2; });
pruebaClase("picos", ORD("PICK_ORDER"), (k) => { G.picks.owned[k] = true; G.picks.dur[k] = 4; });
pruebaClase("cañas de pescar", ORD("CANA_ORDER"), (k) => { G.canas[k] = 10; });

/* ── y la otra mitad: que el ESPACIO cuente lo mismo que la vista ─────────────────────────────
   roomForFish() decía « cualquiera de las cuatro » y recorría FISH_ORDER. Con nueve especies más,
   las nuevas ni contaban: la bolsa nunca se daba por llena y el pez entraba igual… a un casillero
   que no existía. Que la vista y el espacio miren catálogos distintos es el mismo bug con dos
   caras, así que se comprueban juntos. */
console.log("");
linea();
console.log("  Y EL ESPACIO CUENTA LO MISMO QUE LA VISTA");
linea();
{
  vaciar();
  G.invRows = 1;   // una bolsa chiquita, para que se llene rápido
  const cupo = ctx.invSlots();
  ORD("PEZ_ORDER").forEach(k => { G.fish[k] = 99; });
  const ocupa = ctx.canonicalStacks().length;
  console.log("  con las nueve especies a tope: " + ocupa + " casilleros, cupo " + cupo);
  const hayLugar = ctx.roomForFish();
  if (ocupa > cupo && hayLugar) {
    console.log("  ✘  la bolsa está pasada de cupo y roomForFish() dice que SÍ hay lugar");
    console.log("     (así es como un pez entra a un casillero que no existe y desaparece)");
    fallos++;
  } else {
    console.log("  ✓  roomForFish() y canonicalStacks() están de acuerdo");
  }
  vaciar(); delete G.invRows;
}

console.log("");
console.log(fallos
  ? "  " + fallos + " clase(s) de objeto que el jugador puede tener y la bolsa no muestra."
  : "  Todo lo que se puede tener se ve en la bolsa, se dibuja y ocupa su lugar.");
process.exit(fallos ? 1 : 0);
