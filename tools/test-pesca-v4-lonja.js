/* PESCA v4 · LA LONJA, LAS ESCAMAS, LOS TÍTULOS Y EL RANKING   (27/8, tanda 3)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El sumidero de la pesca. Sin esto los peces se acumulan sin destino.

   LO QUE MÁS IMPORTA ACÁ ES UNA SOLA LÍNEA, y conviene explicar por qué antes de leerla:

       « el pedido de marea NUNCA puede pagar menos que vender los peces sueltos »

   Derivé el pago del pedido de « 3,3 % de un día de granja » y el CONTENIDO del pedido de una
   lista de bandas aparte. Las dos cuentas eran razonables y ninguna de las dos hablaba con la
   otra. La primera tirada de prueba pidió « 1 Pez gota » —un legendario de 700 de plata— y la
   Lonja pagaba 32. Entregar un legendario costaba 668 de plata.

   Y no era un caso raro de los bordes: de quince mareas medidas, siete pagaban menos de ×2 y una
   pagaba ×0,05. El sistema entero está construido para enseñar que « los peces sueltos se venden,
   los peces RAROS se entregan », y estaba enseñando exactamente lo contrario.

   Son dos derivaciones correctas que producen un sistema roto porque nadie las hizo mirarse. Es
   la misma forma del error que lleva toda la semana apareciendo, con otra cara.
     node tools/test-pesca-v4-lonja.js                                                           */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);
const PEZ = g("PEZ_DEF"), MAREAS = g("LONJA_MAREAS"), TIENDA = g("LONJA_TIENDA");
const T_ORDER = g("TITULO_PESCA_ORDER"), T_DEF = g("TITULO_PESCA_DEF");
const LONJA_ESCALON = g("LONJA_ESCALON");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let AHORA = Date.UTC(2026, 7, 27, 15, 0, 0);
ctx.nowMs = () => AHORA;
vm.runInContext("nowMs = window.nowMs;", ctx);
const enTiempo = (t) => { AHORA = t; };
function pescador(nv, exp, canas) {
  let acc = 0; for (let k = 2; k <= nv; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };
  G.level = Math.max(nv, 5); G.expansiones = exp || 0;
  G.canas = canas || { junco: 1 };
  G.fish = {}; G.res = { lombriz: 20, tablon: 40, barra_piedra: 20 };
  G.coins = 500; G.escamasLonja = 0; G.lonja = null; G.nasaPlanos = {}; G.built = {};
  G.pescaStats = {}; G.lonjaEntregados = 0; G.torneo = null; G.tituloPesca = null;
}

console.log("\nUN DÍA DE GRANJA, Y LOS CUATRO ESCALONES");
{
  console.log("\n    granja  celdas   día de granja   marea   Capitán     mes   torneo");
  for (const [nv, exp] of [[5, 1], [10, 5], [14, 9], [21, 16]]) {
    pescador(nv, exp);
    console.log("    " + String(nv).padStart(6) + String(ctx.celdasProductivas()).padStart(8) +
      String(ctx.diaDeGranja()).padStart(16) + String(ctx.lonjaPaga("marea")).padStart(8) +
      String(ctx.lonjaPaga("capitan")).padStart(10) + String(ctx.lonjaPaga("mes")).padStart(8) +
      String(ctx.lonjaPaga("torneo")).padStart(9));
  }
  console.log("");
  pescador(10, 5);
  ok("el Capitán paga un día entero", ctx.lonjaPaga("capitan") === ctx.diaDeGranja());
  ok("la captura del mes, tres días", ctx.lonjaPaga("mes") === ctx.diaDeGranja() * 3);
  ok("y el torneo, dos", ctx.lonjaPaga("torneo") === ctx.diaDeGranja() * 2);
  /* la propiedad que importa: la Lonja NO es un grifo nuevo, es el mismo con otra llave */
  const suben = [[5, 1], [10, 5], [14, 9], [21, 16]].map(([nv, e]) => { pescador(nv, e); return ctx.diaDeGranja(); });
  ok("y todo sube con la granja: la Lonja no es una fuente nueva de plata",
    suben.every((v, i) => i === 0 || v > suben[i - 1]), suben.join(" → "));
}

console.log("\nLA LÍNEA QUE ESTE ARCHIVO EXISTE PARA DEFENDER");
{
  pescador(12, 5, { junco: 1, bambu: 1, hierro: 1 });
  console.log("\n    marea                pide                 suelto    paga      ×");
  let peor = 99, peorTxt = "";
  const vistos = {};
  for (let d = 0; d < 12; d++) for (let m = 0; m < 3; m++) {
    enTiempo(Date.UTC(2026, 7, 15 + d, MAREAS[m].h + 1, 0, 0));
    G.lonja = null;
    const p = ctx.lonjaPedido(); if (!p) continue;
    vistos[PEZ[p.id].banda] = (vistos[PEZ[p.id].banda] || 0) + 1;
    const su = ctx.lonjaSuelto(p), pg = ctx.lonjaPaga("marea", su), x = ctx.lonjaMultiplicador();
    if (x < peor) { peor = x; peorTxt = p.n + " " + PEZ[p.id].label; }
    if (d < 4) console.log("    " + MAREAS[p.idx].label.padEnd(20) + (p.n + " " + PEZ[p.id].label).padEnd(20) +
      String(su).padStart(6) + String(pg).padStart(8) + ("×" + x).padStart(7));
  }
  console.log("");
  ok("en 36 mareas, NINGUNA paga menos que vender suelto", peor >= 2,
    "el peor fue ×" + peor + " (" + peorTxt + ")");
  console.log("       → sin el suelo, « 1 Pez gota » pagaba 32 contra 700 de venta: entregar un");
  console.log("         legendario costaba 668 de plata, y el sistema enseñaba lo contrario de");
  console.log("         lo que quiere enseñar.");
  ok("y la marea NUNCA pide épicos ni legendarios",
    !vistos.epico && !vistos.legendario,
    Object.keys(vistos).map(b => b + " " + vistos[b]).join(" · "));
  console.log("       → vence en 8 h y un legendario sale uno de cada mil lances. Para eso están");
  console.log("         el Capitán (una semana) y la Captura del mes, que es por qué hay cuatro");
  console.log("         escalones y no uno.");
}

console.log("\nLAS TRES MAREAS Y SU RELOJ   (todo en UTC, como el reset diario)");
{
  const casos = [[5, 2, "la noche de ayer sigue corriendo antes de las 06"],
                 [7, 0, "el alba"], [13, 0, "el alba, hasta las 14"],
                 [15, 1, "la siesta"], [21, 1, "la siesta, hasta las 22"], [23, 2, "la noche"]];
  const malas = casos.filter(([h, idx]) => ctx.lonjaMareaIdx(Date.UTC(2026, 7, 27, h)) !== idx);
  ok("cada hora del día cae en su marea", !malas.length,
    malas.map(c => c[0] + "h → " + ctx.lonjaMareaIdx(Date.UTC(2026, 7, 27, c[0])) + " (esperaba " + c[1] + ")").join(" · "));
  /* el sello cambia con la marea y NO con el F5: apretar recargar no re-sortea el pedido */
  const s1 = ctx.lonjaMareaSello(Date.UTC(2026, 7, 27, 7)), s2 = ctx.lonjaMareaSello(Date.UTC(2026, 7, 27, 13, 59));
  ok("dentro de una marea el sello no cambia", s1 === s2, s1);
  ok("y cambia al entrar la siguiente",
    ctx.lonjaMareaSello(Date.UTC(2026, 7, 27, 14, 1)) !== s1);
  ok("la marea de la noche no se parte en la medianoche",
    ctx.lonjaMareaSello(Date.UTC(2026, 7, 27, 23)) === ctx.lonjaMareaSello(Date.UTC(2026, 7, 28, 3)),
    "23:00 y 03:00 son la misma marea");
  const dur = ctx.lonjaMareaVenceEn(Date.UTC(2026, 7, 27, 15));
  ok("dura " + g("LONJA_MAREA_DUR_H") + " h desde que entra",
    Math.abs(dur - 7 * 3600e3) < 1000, Math.round(dur / 3600e3 * 10) / 10 + " h a la hora de haber entrado");
  /* la marea de la noche llega a la noche de la laguna; las otras dos, no */
  ok("solo la marea de la noche puede pedir peces nocturnos",
    !MAREAS[0].noche && !MAREAS[1].noche && MAREAS[2].noche);
}

console.log("\nENTREGAR");
{
  pescador(12, 5, { junco: 1, bambu: 1 });
  enTiempo(Date.UTC(2026, 7, 27, 15));
  const p = ctx.lonjaPedido();
  ok("hay pedido", !!p, p ? p.n + " " + PEZ[p.id].label : "");
  ok("sin los peces no se entrega, y se dice cuántos faltan", ctx.lonjaEntregar() === false);
  G.fish[p.id] = p.n + 2;
  const monedas = G.coins, esc = ctx.escamasLonja(), suelto = ctx.lonjaSuelto(p), paga = ctx.lonjaPaga("marea", suelto);
  ok("con los peces, se entrega", ctx.lonjaEntregar() === true);
  ok("se cobran EXACTAMENTE los pedidos, no los que tengas", G.fish[p.id] === 2, G.fish[p.id] + " de sobra");
  ok("paga la plata que dice el panel", G.coins === monedas + paga, "+" + paga);
  ok("y una Escama", ctx.escamasLonja() === esc + 1);
  ok("no se puede entregar dos veces la misma marea", ctx.lonjaEntregar() === false);
  ok("y queda contado para el título de Maestro de la Lonja", G.lonjaEntregados === 1);
}

console.log("\nLAS ESCAMAS Y SU TIENDA");
{
  pescador(14, 9, { junco: 1, bambu: 1 });
  ok("no se compran con plata: solo salen de la Lonja",
    typeof ctx.escamasDar === "function" && !/coins/.test(String(ctx.escamasDar)));
  G.escamasLonja = 20;
  ok("un plano que no podés pagar dice cuántas Escamas faltan",
    /faltan 20 Escamas/.test(ctx.lonjaTiendaFalta("plano_hierro") || ""), ctx.lonjaTiendaFalta("plano_hierro"));
  ok("comprar el plano de la nasa reforzada gasta 15", ctx.lonjaComprar("plano_reforzada") === true);
  ok("y quedan 5", ctx.escamasLonja() === 5, ctx.escamasLonja() + "");
  ok("no se compra dos veces, y lo dice", ctx.lonjaComprar("plano_reforzada") === false);
  ok("el plano es lo que ABRE la nasa: sin él, el nivel no alcanza",
    ctx.nasaAbierta("reforzada") && !ctx.nasaAbierta("hierro"));
  /* la Caña del Abuelo pide algo que la plata no compra */
  G.escamasLonja = 200;
  ok("la Caña del Abuelo pide además haber pescado un legendario",
    /legendario/.test(ctx.lonjaTiendaFalta("cana_abuelo") || ""), ctx.lonjaTiendaFalta("cana_abuelo"));
  /* un legendario DE VERDAD, sacado del catálogo. Mi primera versión puso « pez_linterna », que
     es épico: el test fallaba y el código estaba bien. Un dato de prueba inventado a ojo miente
     igual que un número inventado a ojo. */
  G.pescaStats = { vistos: {} };
  G.pescaStats.vistos[ctx.pecesDeBanda("legendario")[0]] = 1;
  ok("con uno en el álbum, se puede", ctx.lonjaTiendaFalta("cana_abuelo") === null);
  ok("y cuesta 120", ctx.lonjaComprar("cana_abuelo") === true && ctx.escamasLonja() === 80);
  ok("la caña entra en el juego", (G.canas || {}).abuelo === 1);
  /* la regla 9 en toda la tienda: ningún botón apagado sin motivo */
  pescador(14, 9);
  const mudos = g("LONJA_TIENDA_ORDER").filter(k => {
    const f = ctx.lonjaTiendaFalta(k);
    return f !== null && (typeof f !== "string" || f.length < 4);
  });
  ok("ningún artículo se puede quedar apagado sin decir por qué", !mudos.length, mudos.join(", "));
}

console.log("\nEL FAROL DE LA LAGUNA   (las 60 Escamas tienen que hacer algo)");
{
  pescador(20, 9);
  const cupoAntes = ctx.nasaCupo();
  G.escamasLonja = 100; G.res.tablon = 40; G.res.barra_piedra = 20;
  ok("el Farol se compra con Escamas Y material", ctx.lonjaComprar("farol") === true);
  ok("suma un hueco de nasa DE VERDAD, aunque estuvieras en el tope",
    ctx.nasaCupo() === cupoAntes + 1, cupoAntes + " → " + ctx.nasaCupo());
  console.log("       → sin mover también el tope, las 60 Escamas comprarían un hueco que el");
  console.log("         tope ya te estaba quitando: la peor compra posible, la que no hace nada");
  console.log("         y no lo dice.");
  enTiempo(Date.UTC(2026, 7, 27, 6, 30));
  ok("y alarga la noche una hora", ctx.esDeNocheAhora());
  G.built.farol_laguna = false;
  ok("sin Farol, a las 06:30 ya es de día", !ctx.esDeNocheAhora());
}

console.log("\nLA NOCHE, EN UTC   (un solo reloj en todo el juego)");
{
  pescador(10, 5); G.built = {};
  const h = [[1, true], [5, true], [6, false], [15, false], [23, false]];
  const malas = h.filter(([hh, esp]) => ctx.esDeNocheAhora(Date.UTC(2026, 7, 27, hh)) !== esp);
  ok("de 00 a 06 UTC es de noche, y el resto no", !malas.length,
    malas.map(x => x[0] + "h").join(" · "));
  console.log("       → estaba con getHours(), o sea la hora LOCAL, mientras el reset diario, las");
  console.log("         mareas y el torneo van todos en UTC. Un jugador en Tokio tenía su noche");
  console.log("         nueve horas antes que la « Marea de la noche », y el pedido nocturno le");
  console.log("         pedía un pez gato que no podía picar.");
}

console.log("\nLOS DIEZ TÍTULOS");
{
  pescador(1, 0);
  ok("son diez", T_ORDER.length === 10);
  ok("cada uno dice qué mide", T_ORDER.every(k => T_DEF[k].mide && T_DEF[k].mide.length > 10));
  /* LA PROPIEDAD: ninguno da plata. El día que un título pague algo deja de ser un título. */
  ok("NINGUNO da plata, ni Escamas, ni nada material",
    T_ORDER.every(k => { const d = T_DEF[k];
      return d.plata == null && d.escamas == null && d.premio == null && d.dar == null; }));
  console.log("       → « dan una etiqueta que los demás ven, que es exactamente lo que hace que");
  console.log("         se persigan ». Un título con premio se calcula; uno sin premio se quiere.");
  ok("a Pesca 1 solo está el primero",
    ctx.titulosPescaGanados().join(",") === "pies_mojados", ctx.titulosPescaGanados().join(","));
  /* cada uno pide DOS cosas: nivel y hecho. El nivel solo sería tiempo; el hecho solo, suerte. */
  pescador(20, 16);
  ok("con nivel 20 pero sin hacer nada, solo se ganan los que no piden hechos",
    ctx.titulosPescaGanados().length < 3, ctx.titulosPescaGanados().join(","));
  G.pescaStats = { capturas: 30, nasas: 25, gigantes: 5,
    vistos: {} };
  g("PEZ_ORDER").forEach(k => { G.pescaStats.vistos[k] = 1; });
  G.lonjaEntregados = 60;
  ok("con todo hecho y nivel 20, se ganan los diez",
    ctx.titulosPescaGanados().length === 10, ctx.titulosPescaGanados().length + "/10");
  ok("el vigente por defecto es el último ganado",
    ctx.tituloPescaVigente() === "senor_laguna", ctx.tituloPescaVigente());
  G.tituloPesca = "nasero";
  ok("pero el jugador puede llevar el que quiera", ctx.tituloPescaVigente() === "nasero");
  G.tituloPesca = "domador"; G.pescaStats.vistos = {};
  ok("y si deja de cumplirlo, el juego no lo deja llevar uno que no ganó",
    ctx.tituloPescaVigente() !== "domador", ctx.tituloPescaVigente());
  /* el texto de progreso: un requisito sin progreso es un requisito, con progreso es una meta */
  pescador(4, 0); G.pescaStats = { capturas: 11 };
  ok("los requisitos muestran el progreso, no solo el número",
    /11\/25/.test(ctx.tituloPescaPideTxt("cebador")), ctx.tituloPescaPideTxt("cebador"));
}

console.log("\nEL RANKING SEMANAL: PESO RELATIVO, NUNCA ABSOLUTO");
{
  pescador(14, 9);
  const merluzaEnorme = PEZ.merluza.peso[1];             // una merluza en su tope
  const espadaRaquitico = PEZ.pez_espada.peso[0] * 1.02;  // un pez espada casi mínimo
  const pm = ctx.torneoPuntos("merluza", merluzaEnorme), pe = ctx.torneoPuntos("pez_espada", espadaRaquitico);
  console.log("");
  console.log("    Merluza de " + merluzaEnorme.toFixed(1) + " kg (su tope) ....... " + pm.toFixed(2) + " puntos");
  console.log("    Pez espada de " + espadaRaquitico.toFixed(1) + " kg (casi el mínimo) .. " + pe.toFixed(2) + " puntos");
  console.log("");
  ok("una merluza descomunal puntúa más que un pez espada raquítico", pm > pe,
    pm.toFixed(2) + " > " + pe.toFixed(2));
  console.log("       → ésa es LA razón de puntuar por peso relativo. El jugador de nivel 4 puede");
  console.log("         aparecer en la tabla la semana que tiene suerte, y ésa es la única forma");
  console.log("         de que un ranking en un juego de granja no sea un muro.");
  ok("el multiplicador de banda sí premia la rareza a igualdad de peso relativo",
    ctx.torneoPuntos("pez_espada", PEZ.pez_espada.peso[1]) > ctx.torneoPuntos("merluza", PEZ.merluza.peso[1]));
  ok("nada puntúa por encima de su multiplicador de banda",
    ctx.torneoPuntos("merluza", PEZ.merluza.peso[1] * 5) <= g("TORNEO_MULT").comun + 0.001,
    "un peso imposible no rompe la tabla");
  /* la ventana */
  ok("el torneo es de viernes a domingo", ctx.torneoAbierto(Date.UTC(2026, 7, 28)) &&
    ctx.torneoAbierto(Date.UTC(2026, 7, 29)) && ctx.torneoAbierto(Date.UTC(2026, 7, 30)));
  ok("y está cerrado de lunes a jueves",
    ![31, 1, 2, 3].some((d, i) => ctx.torneoAbierto(Date.UTC(2026, 7 + (i ? 1 : 0), d))));
  /* se guarda LA MEJOR, no la suma */
  enTiempo(Date.UTC(2026, 7, 28, 12));
  G.torneo = null;
  ctx.torneoAnotar("merluza", PEZ.merluza.peso[1]);
  const alta = G.torneo.pts;
  ctx.torneoAnotar("merluza", PEZ.merluza.peso[0]);
  ok("se guarda la MEJOR captura de la semana, no la suma", G.torneo.pts === alta,
    "sumar premiaría al que más tiempo tiene; la mejor premia al que tuvo la mejor tarde");
  enTiempo(Date.UTC(2026, 7, 25, 12));
  G.torneo = null;
  ok("fuera de la ventana no se anota nada", ctx.torneoAnotar("merluza", 9) === null);
  ok("y los premios bajan del 1.º al 10.º",
    ctx.torneoPremio(1) === 25 && ctx.torneoPremio(10) === 3 && ctx.torneoPremio(11) === 0,
    "25 → 3, y nada del 11 en adelante");
}

console.log("\nLO QUE SE ANOTA AL PESCAR   (si no se anota, ningún título se dispara nunca)");
{
  pescador(10, 5);
  enTiempo(Date.UTC(2026, 7, 26, 12));   // martes: fuera del torneo, para medir solo lo demás
  /* PESOS DE VERDAD, dentro del rango de cada especie. Mi primera versión anotó merluzas de 2 y
     3,5 kg — la merluza pesa de 0,4 a 1,8, así que las dos eran gigantes y el contador daba 3.
     El test fallaba y el código estaba bien: el dato inventado a ojo miente igual que el número
     inventado a ojo, y encima acusa al sitio equivocado. */
  const chica = PEZ.merluza.peso[0] * 1.1;
  const media = PEZ.merluza.peso[0] + (PEZ.merluza.peso[1] - PEZ.merluza.peso[0]) * 0.5;
  const atunGrande = PEZ.atun.peso[0] + (PEZ.atun.peso[1] - PEZ.atun.peso[0]) * 0.95;
  ctx.pescaAnotar("merluza", chica, false);
  ctx.pescaAnotar("merluza", media, false);
  ctx.pescaAnotar("atun", atunGrande, true);
  const st = G.pescaStats;
  ok("cuenta las capturas", st.capturas === 3, st.capturas + "");
  ok("cuenta las de nasa aparte", st.nasas === 1);
  ok("anota qué especies viste", Object.keys(st.vistos).sort().join(",") === "atun,merluza");
  ok("guarda el récord por especie, no el último", st.record.merluza === media, st.record.merluza.toFixed(2) + " kg");
  ok("y cuenta los gigantes, solo los gigantes", st.gigantes === 1,
    "un atún al 95 % de su rango sí; dos merluzas normales, no");
}

console.log("\nLOS CUATRO ESCALONES, NO UNO   (tres eran tarifas sin puerta detrás)");
{
  pescador(14, 9, { junco: 1, bambu: 1, hierro: 1 });
  enTiempo(Date.UTC(2026, 7, 28, 15));   // viernes: el torneo abierto
  G.lonjaCap = null; G.lonjaMes = null; G.torneo = null; G.torneoCobrado = null;
  ctx.torneoAnotar("atun", PEZ.atun.peso[1]);
  const act = ctx.lonjaActivos();
  console.log("\n    escalón      vence en     pide                             suelto    paga      ×");
  for (const k of act) {
    const su = ctx.lonjaSueltoDe(k), pg = ctx.lonjaPaga(k, su), pz = ctx.lonjaPiezas(k);
    const txt = pz ? pz.map(x => x.n + " " + PEZ[x.id].label).join(" + ") : "tu mejor captura";
    console.log("    " + k.padEnd(12) + ctx.fmtDur(ctx.lonjaVenceEn(k)).padStart(9) + "   " +
      txt.padEnd(32) + String(su).padStart(6) + String(pg).padStart(8) +
      (su ? ("×" + Math.round(pg / su * 10) / 10) : "—").padStart(8));
  }
  console.log("");
  ok("los cuatro escalones están activos un viernes", act.length === 4, act.join(", "));
  ok("y salen ordenados por lo que caduca ANTES", act[0] === "marea",
    "el de marea vence en horas; la captura del mes, en semanas");
  console.log("       → mostrarlos al revés haría que el jugador de tres visitas se perdiera la");
  console.log("         marea por leer primero lo que puede esperar.");
  /* la propiedad que faltaba: los tres nuevos SE PUEDEN ENTREGAR */
  for (const k of ["capitan", "mes"]) {
    const pz = ctx.lonjaPiezas(k);
    ok("el " + LONJA_ESCALON[k].label + " pide algo concreto", !!pz && pz.length > 0,
      pz ? pz.map(x => x.n + " " + PEZ[x.id].label).join(" + ") : "NADA");
  }
  ok("el Capitán pide DOS bandas, no una",
    (() => { const p = ctx.lonjaCapitan(); return p && PEZ[p.a.id].banda !== PEZ[p.b.id].banda; })(),
    "pedir dos obliga a pescar con criterio en vez de repetir el lance que salga");
  ok("la captura del mes solo pide épicos o legendarios",
    ["epico", "legendario"].indexOf(PEZ[ctx.lonjaMesPedido().id].banda) >= 0,
    PEZ[ctx.lonjaMesPedido().id].label + " · " + PEZ[ctx.lonjaMesPedido().id].banda);
  console.log("       → es el único con un mes por delante, así que es el único que puede pedir");
  console.log("         un legendario sin que sea una pared.");

  /* entregar el Capitán, que es el que tiene dos piezas */
  const cap = ctx.lonjaCapitan();
  G.fish[cap.a.id] = cap.a.n; G.fish[cap.b.id] = cap.b.n + 3;
  const mon = G.coins, esc = ctx.escamasLonja(), paga = ctx.lonjaPaga("capitan", ctx.lonjaSueltoDe("capitan"));
  ok("con las dos piezas, se entrega", ctx.lonjaEntregarEscalon("capitan") === true);
  ok("se cobran las dos", (G.fish[cap.a.id] || 0) === 0 && (G.fish[cap.b.id] || 0) === 3);
  ok("paga lo que dice el panel", G.coins === mon + paga, "+" + paga);
  ok("y sus 6 Escamas", ctx.escamasLonja() === esc + 6);
  ok("no se entrega dos veces en la misma semana", ctx.lonjaEntregarEscalon("capitan") === false);

  /* el torneo: no pide peces, se presenta lo pescado */
  ok("el torneo no pide peces: se presenta el que ya sacaste", ctx.lonjaPiezas("torneo") === null);
  ok("y con una captura por encima de la barra, la báscula paga",
    ctx.lonjaFalta("torneo") === null, "un atún en su tope da " + ctx.torneoPuntos("atun", PEZ.atun.peso[1]).toFixed(2) + " puntos");
  ok("se cobra una vez por semana", ctx.lonjaEntregarEscalon("torneo") === true &&
    ctx.lonjaEntregarEscalon("torneo") === false);
  /* y con una captura floja, dice CUÁNTO le falta — no solo que no */
  G.torneo = null; G.torneoCobrado = null;
  ctx.torneoAnotar("merluza", PEZ.merluza.peso[0] * 1.05);
  ok("con una captura floja dice cuánto le falta a la báscula",
    /da .* de los/.test(ctx.lonjaFalta("torneo") || ""), ctx.lonjaFalta("torneo"));

  /* fuera del fin de semana el torneo no está */
  enTiempo(Date.UTC(2026, 7, 26, 15));
  ok("de lunes a jueves el torneo no aparece", ctx.lonjaActivos().indexOf("torneo") < 0,
    ctx.lonjaActivos().join(", "));

  /* NINGUNO puede pagar menos que vender suelto: el mismo suelo que la marea */
  enTiempo(Date.UTC(2026, 7, 28, 15));
  const flojos = ["marea", "capitan", "mes"].filter(k => {
    const su = ctx.lonjaSueltoDe(k); return su > 0 && ctx.lonjaPaga(k, su) < su * 2;
  });
  ok("los tres que piden peces respetan el suelo de ×2", !flojos.length, flojos.join(", "));
}

console.log("\nLA BOYA DE TROFEOS: 30 ESCAMAS QUE AHORA HACEN ALGO");
{
  pescador(14, 9);
  G.escamasLonja = 40;
  ok("se compra por 30 Escamas", ctx.lonjaComprar("boya") === true);
  ok("y a partir de ahí existe en la granja", !!(G.built || {}).boya_trofeos);
  const enMundo = (g("GF").WORLD_OBJECTS || []).filter(o => o.type === "boya").length;
  ok("está declarada en el mundo, no en un caso especial del renderizador", enMundo === 1, enMundo + "");
  console.log("       → antes se compraba y no aparecía en ninguna parte. Un jugador pagaba casi");
  console.log("         una semana de Lonja y no pasaba nada: peor que no haberla puesto, porque");
  console.log("         la tienda la promete.");
  /* la tabla que muestra */
  ctx.pescaAnotar("merluza", PEZ.merluza.peso[1], false);
  ok("guarda el récord que va a enseñar", (G.pescaStats.record || {}).merluza === PEZ.merluza.peso[1]);
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la Lonja todavía no cierra"
  : "  Todo en orden: los cuatro escalones se pueden cobrar, y entregar siempre gana.");
process.exit(fallos ? 1 : 0);
