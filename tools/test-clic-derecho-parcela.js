/* EL CLIC DERECHO EN LA PARCELA CONTESTA SIEMPRE (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Reporte del diseñador: « tiene semillas de papa y de ciruela en la bolsa, y al hacer clic
   derecho en la parcela NO sale el selector de semillas. A mí, con solo papa, sí me sale. »

   La pista apuntaba a las semillas, y era una casualidad. Se comprobó primero lo obvio —armar la
   rueda con una semilla, con dos, con nueve— y funciona en todos los casos. El problema estaba
   una capa más arriba:

       if (pl.state === "dry" && typeof showSeedWheel === "function") showSeedWheel(…);
       return;

   Una sola condición, y CUATRO estados más (growing · ready · locked · withered) que salían por
   ese `return` sin decir una palabra. El que más parcelas tiene es el que más veces le da clic
   derecho a una que ya tiene algo plantado — por eso le pasaba al diseñador y no a Golden. La
   correlación con la bolsa era ruido; la causa era el estado de la parcela.

   Y desde afuera, « no pasa nada » es indistinguible de « está roto ». Es la regla 9 de la casa:
   toda acción del jugador contesta algo. Este archivo la clava para los cinco estados.
     node tools/test-clic-derecho-parcela.js                                                     */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* ── 1 · LA RUEDA, que era la sospechosa y resultó inocente ────────────────────────────────── */
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G;
const avisos = [];
ctx.toast = (t) => avisos.push(String(t));
ctx.log = () => {};

console.log("\nLA RUEDA SE ARMA CON CUALQUIER BOLSA   (la sospecha original, descartada)");
{
  const rueda = ctx.document.getElementById("seedwheel").querySelector(".swc");
  const probar = (semillas) => {
    G.seeds = Object.assign({}, semillas);
    rueda.innerHTML = ""; avisos.length = 0;
    let err = null;
    try { ctx.showSeedWheel(10, 10, { cx: 0, by: 0, state: "dry" }); } catch (e) { err = e.message; }
    return { err, n: ((rueda.innerHTML || "").match(/class="swi/g) || []).length };
  };
  const una = probar({ papa: 5 });
  const dos = probar({ papa: 5, ciruela: 3 });
  const todas = probar({ papa: 5, ciruela: 3, cereza: 2, remolacha: 1, zanahoria: 9 });
  ok("con una sola semilla, la rueda se arma", !una.err && una.n > 1, una.err || una.n + " ítems");
  ok("con papa Y ciruela también — que era lo que se sospechaba", !dos.err && dos.n > una.n,
    dos.err || dos.n + " ítems");
  ok("y con cinco tipos distintos, igual", !todas.err && todas.n > dos.n, todas.err || todas.n + " ítems");
  const vacia = probar({});
  ok("sin semillas no se arma, pero LO DICE", vacia.n === 0 && /Tienda/.test(avisos[0] || ""), avisos[0] || "(mudo)");
}

/* ── 2 · LA CAUSA DE VERDAD: los cinco estados de la parcela ───────────────────────────────── */
console.log("\nEL CLIC DERECHO CONTESTA EN LOS CINCO ESTADOS   (la causa real)");
{
  const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
  /* el bloque del clic derecho sobre parcelas */
  const i = FARM.indexOf("for (const pl of this.plots) {");
  const bloque = FARM.slice(i, i + 2600);
  ok("« dry » sigue abriendo la rueda — el camino bueno no se tocó",
    /pl\.state === "dry"/.test(bloque) && /showSeedWheel\(/.test(bloque));
  const estados = ["growing", "ready", "locked", "withered"];
  estados.forEach(e => {
    const re = new RegExp('pl\\.state === "' + e + '"[\\s\\S]{0,260}?toast\\(');
    ok("« " + e + " » ya no sale en silencio: contesta", re.test(bloque));
  });
  ok("y un estado desconocido se delata en vez de morir callado",
    /console\.warn\("clic derecho en parcela con estado desconocido/.test(bloque));
  /* la prueba de fondo: NINGÚN camino de este bloque termina en un return pelado */
  const salidas = (bloque.match(/\n\s+return;/g) || []).length;
  const habla = (bloque.match(/toast\(|showSeedWheel\(/g) || []).length;
  ok("hay al menos una respuesta por cada salida del bloque", habla >= salidas,
    habla + " respuestas / " + salidas + " salidas");
}

console.log("\nY CON UNA VENTANA ABIERTA TAMPOCO SE QUEDA MUDO");
{
  /* el camino más probable del reporte: abre la bolsa para mirar las semillas y desde ahí le da
     clic derecho a la parcela. Un clic nacido DENTRO de un panel ya lo filtró clicDeInterfaz,
     así que si llegó hasta acá fue sobre el mundo — intencional, y merece respuesta. */
  const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
  const j = FARM.indexOf("if (GF.uiOpen) {");
  ok("con un panel abierto, el clic derecho dice qué hacer", j > 0 &&
    /if \(GF\.uiOpen\) \{[\s\S]{0,200}?toast\(/.test(FARM.slice(j, j + 260)));
  ok("pero se calla si estás escribiendo en el chat (ahí el clic no es para el mundo)",
    /!GF\.typing/.test(FARM.slice(j, j + 260)));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el clic derecho todavía tiene caminos mudos"
  : "  Todo en orden: el clic derecho contesta en los cinco estados y con la ventana abierta.");
process.exit(fallos ? 1 : 0);
