/* LA TIENDA DE MEJORAS · las palancas de comodidad se COMPRAN (18/8, dirección)
   "Y si mejor todo eso lo utilizamos para su dinero o cualquier otra utilidad, y que el Granero
   lo único que haga es aumentar el bono y permitir expandir, y ya."
   El precedente ya existe: la BOLSA se compra con plata y el coste se dobla (1.000 → 32.000).
   Acá se extiende ese patrón a las demás palancas, con el mismo criterio: cada paso cuesta el
   doble que el anterior, y el primero se ancla a HORAS DE PRODUCCIÓN de la granja del momento en
   que es razonable comprarlo. Ninguna crea plata por hora: quitan fricción.
     node tools/derivar-mejoras.js                                                                */
const fs=require("fs"),vm=require("vm");
const LOG=console.log;
const ctx={console:{log(){},warn(){}},Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map,isNaN,parseInt,parseFloat};
ctx.window=ctx;ctx.globalThis=ctx;ctx.setTimeout=()=>0;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("public/game/state.js","utf8")+
 "\n;this.X={INV_BASE,INV_MAX_ROWS,SEED_POR_PARCELA,COOK_SLOTS,EXCAV_POR_DIA,PED_POR_DIA,PED_DESCARTE_MIN,STAM_RECARGAS_DIA,STAM_BASE,INC_CUPO_DIA,DUMMY_OFF_MAX_H,CHEST_MAX};",ctx);
const X=ctx.X, ANCLA=20;

/* cada palanca: base, cuánto sube por paso, cuántos pasos, y las HORAS de producción que debe
   costar el PRIMER paso (el resto se dobla). Las horas salen de cuánto molesta hoy la carencia. */
const MEJORAS = [
  ["Bolsa",              X.INV_BASE,           "+5 huecos",        6, 5.5],
  ["Cupo de semillas",   X.SEED_POR_PARCELA,   "+8 por parcela",   5, 4],
  ["Ollas de cocina",    X.COOK_SLOTS,         "+1 olla",          3, 8],
  ["Montículos al día",  X.EXCAV_POR_DIA,      "+1 al día",        3, 6],
  ["Pedidos al día",     X.PED_POR_DIA,        "+1 al día",        2, 10],
  ["Espera de descarte", X.PED_DESCARTE_MIN,   "−5 min",           4, 3],
  ["Recargas de stamina",X.STAM_RECARGAS_DIA,  "+1 al día",        3, 6],
  ["Stamina máxima",     X.STAM_BASE,          "+25",              4, 4],
  ["Incursiones al día", X.INC_CUPO_DIA,       "+1 al día",        2, 12],
  ["Dummy sin conexión", X.DUMMY_OFF_MAX_H,    "+4 h",             3, 6],
];
/* La granja de referencia crece: se compra la mejora N cuando ya tenés N expansiones más o menos.
   Producción = celdas × 20, empezando en 9 celdas. */
const celdasEn = paso => 9 + 3 * Math.min(paso * 2, 16);

LOG("LA TIENDA DE MEJORAS · todo se compra, nada se regala\n");
LOG("  mejora                 hoy → tope     pasos   coste de cada paso (plata)");
let total = 0;
MEJORAS.forEach(([nom, base, sube, pasos, h0]) => {
  const costos = [];
  for (let i = 0; i < pasos; i++) {
    const prod = celdasEn(i) * ANCLA;
    const c = Math.round(h0 * Math.pow(2, i) * prod / 100) * 100;   // redondeado a centenas
    costos.push(c); total += c;
  }
  const inc = parseFloat(sube.replace(/[^\d.-]/g, "")) || 0;
  const tope = /−/.test(sube) ? base - inc * pasos : base + inc * pasos;
  LOG("  " + nom.padEnd(22) + (base + " → " + tope).padEnd(14) +
      String(pasos).padStart(4) + "    " + costos.map(c => c.toLocaleString("es")).join(" · "));
});
LOG("\n  TOTAL de la tienda: " + total.toLocaleString("es") + " de plata");

/* comparación con el otro sumidero */
LOG("\nLOS DOS SUMIDEROS DEL JUEGO");
const expans = 205660;
LOG("   expansiones ....... " + expans.toLocaleString("es"));
LOG("   tienda de mejoras . " + total.toLocaleString("es"));
LOG("   juntos ............ " + (expans + total).toLocaleString("es") + " de plata que hay que quemar");
LOG("\n   = " + Math.round((expans + total) / (57 * ANCLA)) + " h de una granja terminada");
LOG("   = " + Math.round((expans + total) / (57 * ANCLA) / 24) + " días de juego sin parar");

LOG("\nY EL GRANERO SE QUEDA CON DOS COSAS, LAS DOS CONTINUAS:");
LOG("   · +1,5% al margen de venta por nivel  (al 50: +73,5%)");
LOG("   · el permiso para comprar la expansión que toque");
LOG("   nada de tablas de 50 premios que rellenar. Sube de nivel = ganás más y podés crecer más.");
