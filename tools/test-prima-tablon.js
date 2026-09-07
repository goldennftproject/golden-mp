/* EL TABLÓN NO ES UNA IMPRENTA: LA PRIMA SE MIDE EN PLATA LÍQUIDA               (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El reporte de dirección que parió este archivo: « pude completar 12… y 12×20 hachas son 240
   de madera… y no costó mucho, solo pocos recursos ». Medido, tenía razón y era peor: el
   pedido pagaba el valor exacto en plata (bien) MÁS 1 vale por cada 40 entregados, y desde que
   los fardos entregan valor pleno (26/8) un vale ES 40 de plata líquida — 20 hachas a 2, que
   se compran con plata pelada. El tablón devolvía el DOSCIENTOS por ciento de lo entregado.

   La historia en dos actos, porque es la lección: los fardos a media tasa de antes del 26/8
   —lo que dirección reportó como precio roto— eran el sumidero FUNCIONANDO. Al arreglarlos,
   la fuga se mudó a la emisión, donde nadie miraba. Cuando dos varas comparten un número, se
   puede arreglar una rompiendo la otra sin que ningún test parpadee.

   La regla nueva (dirección, 31/8): GASTAR un vale vale 40 —el fardo es honesto y transparente—
   pero GANARLO cuesta 160 de plata entregada. Prima del 25 % (50 % el primero del día, que
   paga doble a propósito). Este archivo mide la prima DE PUNTA A PUNTA: lo que entra al
   pedido contra lo que sale en plata más el valor líquido de los vales.
     node tools/test-prima-tablon.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLAS DOS VARAS EXISTEN Y NO SON LA MISMA");
{
  /* 2/9 (dirección, la captura del fardo de 20): el vale baja a 20 de plata sombra y la
     emisión queda en 160 — misma cantidad de vales por misión, cada vale rinde la mitad.
     La prima real del tablón pasa del 25 % al 12,5 %. */
  ok("un vale gastado vale 20", g("VALE_EN_PLATA") === 20);
  ok("y ganarlo cuesta 160 de mercadería — ocho veces más", g("VALE_EMISION") === 160);
  /* el fardo sigue honesto: si esto baja, volvemos al « precio roto » del 26/8 */
  const fardo = ctx.valeFardoN("hachas") * ctx.valeUnidad("hachas");
  ok("el fardo de hachas entrega el valor entero del vale", fardo === 20, fardo + " de plata en hachas");
  ok("o sea 10 hachas, no 20 — lo que pidió dirección", ctx.valeFardoN("hachas") === 10);
}

console.log("\nLA PRIMA, MEDIDA EN CADA PEDIDO DEL DÍA");
{
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "farming");
  G.skills = { farming: acc, fishing: acc }; G.level = 9; G.tuto = { done: true }; G.built = { cocina: true };
  G.pedidos = null;
  const e = ctx.pedidosEstado();
  ok("hay pedidos que medir", e.lista.length >= 3);
  for (const p of e.lista) {
    /* la prima es TODO lo que devuelve por encima del valor entregado: la plata paga 1,0×
       (neutral), así que la prima entera son los vales, contados a su valor líquido de 40 */
    const prima = p.vales * g("VALE_EN_PLATA") / p.plata;
    ok(p.n + " " + p.key + " paga prima del " + Math.round(prima * 100) + " % (tope 17 %)",
      prima > 0 && prima <= 0.17, p.plata + " de plata + " + p.vales + " vale(s)");
  }
  /* y ningún pedido queda por debajo del respaldo de su vale: el mínimo de 1 vale sobre un
     pedido chico era la otra puerta de la imprenta (un pedido de 40 con vale de 40 = 100 %) */
  ok("todo pedido vale al menos lo que respalda su vale", e.lista.every(p => p.plata >= g("VALE_EMISION") * 0.95),
    e.lista.map(p => p.plata).join(" · "));
}

console.log("\nY EL BUCLE DE LAS HACHAS, CERRADO");
{
  /* el ciclo del reporte: entregar madera → vales → fardos de hachas → talar → re-entregar.
     2/9: con el vale a 20, cada vuelta devuelve 160 (plata) + 20 (fardo) = 180 por 160
     entregados en mercadería + trabajo de talar con reloj de cargas. Prima 12,5 %. */
  const porVale = g("VALE_EMISION");
  const devuelve = porVale + g("VALE_EN_PLATA");
  ok("cada 160 entregados devuelven 180 — prima 12,5 %, no 200 %",
    Math.round((devuelve / porVale - 1) * 1000) === 125, devuelve + " por " + porVale);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el tablón premia entregar, pero ya no imprime.\n");
process.exit(fallos ? 1 : 0);
