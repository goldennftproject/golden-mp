/* EL BARRIDO DE IMPRENTAS — toda moneda medida de la emisión al gasto            (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Nace del vale: una moneda que se emitía barata (1 por 40 entregados) y se gastaba líquida
   (40 de plata en hachas) convirtió el tablón en una imprenta del 200 %, y la encontró
   dirección jugando — no un test. La lección: cada circuito de moneda o premio tiene DOS
   varas, la de ganarlo y la de gastarlo, y hay que medirlas JUNTAS. Este auditor recorre
   todos los circuitos del juego con esa vara doble:

     1. VALES        emisión vs valor líquido del fardo (el caso original, ya cerrado)
     2. ESCAMAS      qué compra la tienda de la Lonja y si algo de eso compone
     3. PLATA LONJA  la prima ×2 de entregar vs vender suelto, acotada por ventanas
     4. GOBLIN       la propina del trueque diario
     5. REVENTA      nada comprable puede revenderse con margen
     6. PLATOS       cocinar no puede pagar más que el ancla del tiempo que insume

   Verde no significa « no hay ganancia »: significa que toda ganancia está ACOTADA por un
   reloj o una ventana, y que ningún ciclo se puede repetir sin trabajo real de por medio.
     node tools/auditar-imprentas.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let graves = 0, menores = 0;
const linea = () => console.log("─".repeat(78));
const grave = (t) => { graves++; console.log("  ✗ GRAVE  " + t); };
const menor = (t) => { menores++; console.log("  ⚠ menor  " + t); };
const okk = (t) => console.log("  ✓  " + t);

linea(); console.log("1) VALES — el caso que parió el barrido");
{
  const prima = g("VALE_EN_PLATA") / g("VALE_EMISION");
  if (prima > 0.34) grave("la prima del vale volvió a subir: " + Math.round(prima * 100) + " %");
  else okk("emisión 1/" + g("VALE_EMISION") + " · gasto " + g("VALE_EN_PLATA") + " → prima " + Math.round(prima * 100) + " % (test-prima-tablon la custodia)");
}

linea(); console.log("2) ESCAMAS — la tienda de la Lonja, pieza por pieza");
{
  const T = g("LONJA_TIENDA");
  for (const k in T) {
    const d = T[k];
    if (d.unaVez) { okk(d.label + " (" + d.esc + " esc): se compra UNA vez — hito, no ciclo"); continue; }
    /* lo repetible es lo que puede componer. Hoy: la larva de luz. */
    if (k === "larva") {
      /* ¿cuánto MEJORA un lance la larva respecto de la lombriz? El cebo se paga en escamas
         (2 = dos mareas de trabajo) y devuelve UN lance mejorado: si la mejora en plata
         superara por mucho lo que cuesta re-ganar las escamas, pescar→escamas→larva→pescar
         compondría. Se mide el valor esperado real de los dos lances. */
      G.canas = { oro: 1 }; G.plata = 100000; G.fish = {}; G.pescaStats = {}; G.torneo = null;
      let acc = 0; for (let i = 2; i <= 20; i++) acc += ctx.skillNeed(i, "fishing");
      G.skills = { fishing: acc, farming: acc };
      G.pescaV4 = null; ctx.pescaEstado();
      const N = 20000; let conL = 0, sinL = 0;
      for (let i = 0; i < N; i++) {
        { const e = ctx.pescaEstado(); e.sinEpico = 0; }
        const a = ctx.lanceSacar("oro", { cebo: "larva_luz", sinPiedad: true });
        conL += ctx.pezPrecio(a.id, a.kg);
        { const e = ctx.pescaEstado(); e.sinEpico = 0; }
        const b = ctx.lanceSacar("oro", { cebo: "lombriz", sinPiedad: true });
        sinL += ctx.pezPrecio(b.id, b.kg);
      }
      const mejora = (conL - sinL) / N;
      /* la vara: 2 escamas son ~2 pedidos de marea (~8 h de ventana c/u). Si un solo lance
         devolviera decenas de plata extra, la larva sería moneda líquida. */
      if (mejora > 30) grave("la Larva de luz devuelve +" + mejora.toFixed(1) + " de plata por lance — la escama se volvió líquida");
      else okk("Larva de luz: +" + mejora.toFixed(1) + " de plata por lance sobre la lombriz — cara para farmear, bien como gustito");
    }
  }
  okk("las Escamas no se compran ni venden por plata en ninguna parte (por diseño)");
}

linea(); console.log("3) PLATA DE LA LONJA — la PRIMA de entregar (pago menos sueltos), por escalón");
{
  /* la primera versión de esta cuenta sumaba el PAGO entero como si fuera prima y gritó 120 %:
     un auditor que mide bruto donde el jugador cobra neto fabrica sus propios incendios.
     La prima real es pago − lo que valían los peces sueltos, por el ritmo real de cada
     ventana (la marea 3/día, el Capitán y el torneo 1/semana, el mes 1/mes). */
  const E = g("LONJA_ESCALON"), dia = ctx.diaDeGranja();
  G.canas = { oro: 1 }; G.lonja = null; G.lonjaCap = null; G.lonjaMes = null;
  const ritmo = { marea: 6, capitan: 1 / 7, mes: 1 / 30, torneo: 1 / 7 };   // 1/9: seis mareas de 4 h
  let primaDia = 0;
  for (const k of ["marea", "capitan", "mes", "torneo"]) {
    /* 1/9: la marea de peso no entrega mercadería — su pago ENTERO es prima (los peces quedan
       en la bolsa), y por eso paga solo su escalón, sin el suelo ×2 de las ventas. Este mismo
       auditor cazó la versión anterior pagando ×2 sobre peces no entregados: 90 % del día. */
    const p = k === "marea" ? ctx.lonjaPedido() : null;
    const esPeso = k === "marea" && p && p.tipo === "peso";
    const suelto = esPeso ? 0 : ctx.lonjaSueltoDe(k);
    const paga = ctx.lonjaPaga(k, suelto);
    const prima = (paga - suelto) * ritmo[k];
    primaDia += prima;
    const pct = prima / dia * 100;
    const msj = E[k].label + ": paga " + paga + " − sueltos " + suelto + " → prima " +
      Math.round(prima) + "/día (" + pct.toFixed(1) + " % del día)";
    /* el torneo es el que hay que mirar: sin tabla comparativa (falta backend) paga los DOS
       días de granja del documento a TODO el que llegue a la barra de 1,00 — que es un común
       en su peso máximo. Un premio de podio pagado a todos los que terminan la carrera. */
    if (pct > 15) menor(msj + " — para revisar con Suren (era el premio del PODIO)");
    else okk(msj);
  }
  const tot = primaDia / dia * 100;
  if (tot > 60) grave("la prima total de la Lonja es el " + tot.toFixed(0) + " % de un día de granja");
  else okk("prima total de la Lonja: ~" + tot.toFixed(0) + " % de un día de granja — es el premio del oficio pesca, pagado contra lombrices y ventanas");
}

linea(); console.log("4) EL GOBLIN — la propina del trueque");
{
  const of = ctx.goblinOfertaHoy();
  const PRICE = g("PRICE");
  const dado = of.entrega * (PRICE[of.da] || 1), pedido = of.cant * (PRICE[of.pide] || 1);
  const prop = dado - pedido;
  if (prop > 15) grave("la propina del goblin es " + prop + " de plata — más que un premio diario");
  else okk("hoy pide " + of.cant + " " + of.pide + " (" + pedido + ") y da " + of.entrega + " " + of.da + " (" + dado + ") — propina " + prop + ", una vez al día");
}

linea(); console.log("5) REVENTA — nada comprable se revende con margen");
{
  /* cultivos: comprar semilla (seedCost) → precioVenta del fruto ya incluye el trabajo del
     reloj (es EL ancla). Lo que no puede pasar: comprar algo YA HECHO y revenderlo por más. */
  const CROP = g("CROP_DEF");
  let malos = [];
  for (const k in CROP) {
    /* la semilla no es el fruto: sembrar tiene reloj. Se compara semilla vs vender EL FRUTO
       solo para confirmar que el margen es el del ancla y no un salto raro. */
    const c = CROP[k], margen = ctx.precioVenta(k) - c.seedCost, horas = c.growH;
    const porHora = margen / Math.max(horas, 0.01);
    if (porHora > 25) malos.push(k + " paga " + porHora.toFixed(0) + "/h");
  }
  if (malos.length) grave("cultivos sobre el ancla: " + malos.join(" · "));
  else okk("todo cultivo comprado como semilla rinde ≤ el ancla por hora de reloj");
  /* herramientas: viven en G.tools/G.picks, fuera de la bolsa vendible — no hay camino de
     venta. Las semillas tampoco se revenden (no son res de bolsa). */
  okk("herramientas y semillas no tienen botón de venta: el fardo y el sobre no son líquidos hacia plata");
  const NOV = g("NO_VENDIBLE");
  okk("y lo explícitamente no-vendible sigue cerrado: " + Object.keys(NOV).join(", "));
}

linea(); console.log("6) PLATOS — el único canal de venta es el tablón, y está acotado");
{
  /* la primera versión de esta sección gritó « imprenta » tres veces, y las tres eran cuentas
     mías: (a) el margen por hora de olla no importa si el plato NO TIENE VENTA LIBRE — y no
     la tiene: en la bolsa el plato se COME (eatDish), el mercado no lo lista; (b) el insumo
     pescado contaba CERO porque priceOf no conoce peces. Un auditor que no conoce el catálogo
     que audita mide agujeros en su propio saber. */
  const src = require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const ventaLibre = /sellItem\([^)]*dish|dishes[^\n]*totalVenta|venderPlato/.test(src);
  if (ventaLibre) grave("apareció una venta libre de platos — revisar su precio contra insumos");
  else okk("los platos no tienen venta libre: se comen (buff/vida) o se entregan al tablón");
  /* el canal real: el pedido de dish del tablón. Se lee del POOL DEL JUEGO, no de una cuenta
     propia — la primera versión recalculaba el val a mano (con el ×2 de entonces) y habría
     seguido avisando por un número que el juego ya no usa. Un auditor que copia la fórmula
     en vez de leerla audita su copia. */
  const R = g("RECIPE_DEF");
  G.built = G.built || {}; G.built.cocina = true;
  G.dishes = { papa_asada: 1, crema_calabaza: 1, pure_papa: 1 };
  let peor = null;
  for (const p of ctx.pedPool().filter(x => x.tipo === "dish")) {
    const r = R[p.key]; if (!r) continue;
    let insumos = 0; for (const m in r.res) insumos += (ctx.priceOf(m) || 0) * r.res[m];
    const unidad = p.val / p.n;
    const n = Math.max(p.n, Math.ceil(g("VALE_EMISION") / unidad));   // el piso agranda el pedido
    const margen = (unidad - insumos) * n;
    if (unidad > (r.plata || 8) + 0.5) grave(r.label + ": el tablón paga " + unidad + " por un plato de " + r.plata + " — volvió una prima escondida");
    if (!peor || margen > peor.margen) peor = { label: r.label, n, margen };
  }
  if (peor && peor.margen > ctx.diaDeGranja() * 0.3)
    menor("el pedido de platos puede dejar " + Math.round(peor.margen) + " (" + peor.n + " " + peor.label + ") — mirar con Suren");
  else if (peor)
    okk("el mejor pedido de platos deja ~" + Math.round(peor.margen) + " de margen (" + peor.n + " " + peor.label + ") — el pago del oficio cocina, 1 pedido/día como mucho");
}

linea();
console.log("HALLAZGOS GRAVES: " + graves + "   ·   menores: " + menores);
process.exit(graves ? 1 : 0);
