/* EL RECUADRO DE EXPANSIÓN Y LOS NODOS DE LAS ÚLTIMAS SEIS                    (1/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dos frases del mismo mensaje, con captura de Sunflower Land adjunta:
     « Vamos a poner las expansiones así, un recuadro. Bien especificado. »
     « Y vamos a agregar más nodos, será a las últimas 6. Nodos de oro, hierro y bronce. »

   Lo que se custodia:
     · las expansiones 11-16 traen UN nodo mineral extra, ciclando bronce → hierro → oro dos
       veces — y el hierro, que no se regalaba en ninguna, entra al mapa;
     · una sola lista (GF.EXP_NODOS_EXTRA en config) hace las tres cosas: coloca el nodo en el
       mundo, lo cobra en el precio (una celda productiva más) y lo anuncia en el recuadro —
       la lección de EXP_CON_VETA, aplicada de entrada;
     · el recuadro: requisitos con tenés/pide en color, el nivel como primer requisito, los
       nodos que trae con su lámina, y un botón que dice por qué no cuando no.
     node tools/test-expansion-recuadro.js                                                     */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const GF = g("GF");

console.log("\nLAS ÚLTIMAS SEIS TRAEN SU NODO EXTRA — BRONCE, HIERRO Y ORO, EN ESCALERA");
{
  const E = GF.EXP_NODOS_EXTRA;
  ok("la lista cubre exactamente las expansiones 11 a 16",
    Object.keys(E).map(Number).sort((a, b) => a - b).join(",") === "11,12,13,14,15,16");
  ok("y ciclan bronce → hierro → oro, dos vueltas",
    [11, 12, 13, 14, 15, 16].map(n => E[n]).join(",") === "bronce,hierro,oro,bronce,hierro,oro");
  /* el MUNDO los tiene puestos: la lista no es un cartel, es lo que config colocó */
  for (const n of [11, 12, 13, 14, 15, 16]) {
    const puestos = GF.WORLD_OBJECTS.filter(o => o.exp === n - 1 && o.type === "ore" && o.ore === E[n]);
    ok("la expansión " + n + " tiene su veta de " + E[n] + " en el terreno", puestos.length >= 1);
  }
  ok("y el hierro entra al mapa por primera vez desde una expansión",
    GF.WORLD_OBJECTS.some(o => o.type === "ore" && o.ore === "hierro" && o.exp != null));
  /* la parcela de la expansión no cae encima del nodo nuevo (la lección de test-expansion-retro) */
  const choca = (GF.EXPANSIONES || []).some((b, i) => {
    if (!b || !b.parcela) return false;
    return GF.WORLD_OBJECTS.some(o => o.exp === i && o.type === "ore" &&
      Math.floor(o.x / GF.TILE - 0.5) === b.parcela.col && Math.floor(o.y / GF.TILE - 1) === b.parcela.row);
  });
  ok("ninguna parcela nace encima de una veta", !choca);
}

console.log("\nEL NODO EXTRA SE PAGA: una celda productiva más en la escalera de costos");
{
  const costos = ctx.expansionCostos();
  ok("hay " + costos.length + " costos derivados", costos.length === g("EXPANSION_MAX"));
  /* la celda extra encarece lo que viene DESPUÉS: la 12 se paga contra una granja que ya
     tiene el nodo de la 11. Se comprueba que el costo total en plata sombra sea mayor que
     el de un mundo sin extras (la fórmula multiplica horas × celdas × ancla). */
  const PRICE = g("PRICE");
  const plataDe = (c) => Object.keys(c).reduce((s, k) => s + (PRICE[k] || 1) * c[k], 0);
  ok("la 12 cuesta más que la 11, la 14 más que la 13 — la escalera sigue subiendo",
    plataDe(costos[11]) > plataDe(costos[10]) && plataDe(costos[13]) > plataDe(costos[12]));
  ok("y el cartel del mundo anuncia el nodo extra",
    ctx.expansionTrae(12).some(x => x.txt === "veta de hierro") &&
    ctx.expansionTrae(15).some(x => x.txt === "veta de hierro") &&
    ctx.expansionTrae(13).some(x => x.txt === "veta de oro"),
    ctx.expansionTraeTxt(12));
}

console.log("\nEL RECUADRO: REQUISITOS EN COLOR, NODOS CON LÁMINA, Y EL PORQUÉ EN EL BOTÓN");
{
  G.expansiones = 11; G.level = 1; G.res = {};   // la que toca es la 12 y no hay nada
  ctx.refreshExpandir();
  const reqs = ctx.document.getElementById("exd-reqs").innerHTML;
  const trae = ctx.document.getElementById("exd-trae").innerHTML;
  const btn = ctx.document.getElementById("exd-btn");
  ok("el nivel es el primer requisito", reqs.indexOf("Nivel de granja") >= 0);
  ok("cada material lleva su tenés/pide", /\d+\/\d+/.test(reqs));
  ok("lo que falta va marcado", reqs.indexOf("falta") >= 0);
  ok("los nodos de la expansión se listan con su lámina",
    trae.indexOf("+1 Veta de hierro") >= 0 && trae.indexOf("node_iron") >= 0, "la 12 trae hierro");
  ok("el botón apagado dice POR QUÉ (regla 9)",
    btn.disabled === true && /nivel/i.test(btn.textContent), btn.textContent);
  /* con todo en la mano, el botón invita */
  G.level = 99; const ex = ctx.expansionSiguiente();
  for (const k in ex.costo) G.res[k] = ex.costo[k] + 5;
  ctx.refreshExpandir();
  ok("con nivel y material, el botón dice Expandir y está vivo",
    btn.disabled === false && btn.textContent === "Expandir");
  /* y expande de verdad por esa puerta */
  const antes = G.expansiones;
  btn.onclick();
  ok("el clic compra la expansión", G.expansiones === antes + 1);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el recuadro especifica, y las últimas seis pagan con metal.\n");
process.exit(fallos ? 1 : 0);
