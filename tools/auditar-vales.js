/* ¿PAGA EL TABLÓN LO QUE UN VALE VALE? (26/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección: « esto no está balanceado, ¿cierto? con 1 vale pude obtener 40 semillas de cereza ».

   Fui a medirlo y el resultado fue el contrario del que se sospechaba. Un vale son 40 de plata
   —decidido el 18/8— y la EMISIÓN respeta esa vara. Al gastarlos, en cambio:

       Fardo de 10 hachas     1 vale (40)  →  20 de plata en hachas      ← la mitad
       Fardo de 10 picos      1 vale (40)  →  20 de plata en picos       ← la mitad
       Lata de 6 lombrices    1 vale (40)  →  18 de plata en lombrices   ← la mitad
       Sobre de semillas      2 vales (80) →  80 de plata en semillas    ← correcto

   El sobre NO era el exploit: era el ÚNICO premio bien tasado, y al lado de tres malos negocios
   parecía un chollo. Vale la pena guardar la lección: lo que llama la atención suele ser lo
   único que está bien; lo torcido no se nota porque no molesta a nadie.

   POR QUÉ SE TORCIERON, que es lo que este archivo vigila. El 18/8 se derivó el PRECIO de un
   contenido escrito a mano (« 10 hachas »), y `valesDe` tiene un piso de un vale: cualquier
   fardo que valga menos de 60 de plata redondea a un vale entero y el jugador paga de más.
   El sobre se salvó porque ahí se derivaron LAS DOS PUNTAS. Ahora todos hacen lo mismo.

   LA REGLA
       Todo premio del tablón tiene que entregar, por vale que cuesta, aproximadamente lo que un
       vale vale. Ni la mitad (robo) ni el doble (fuga).
     node tools/auditar-vales.js                                                                 */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const VALE = g("VALE_EN_PLATA"), C = g("CROP_DEF"), SHOP = g("VALES_SHOP");

/* CUÁNTO SE PERMITE DESVIARSE, y por qué no es cero: no se puede partir una semilla ni media
   lombriz, así que el redondeo siempre deja unos puntos. ±20 % es el margen que tolera el
   redondeo de las unidades más caras sin dejar pasar un x2. */
const TOL = 0.20;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function jugador(nivelCultivo) {
  let acc = 0; for (let k = 2; k <= nivelCultivo; k++) acc += ctx.skillNeed(k, "farming");
  G.skills = { farming: acc }; G.level = Math.max(1, nivelCultivo); G.tuto = { done: true };
}
/* lo que ENTREGA un premio, en plata */
function entrega(id) {
  if (id === "semillas") { const k = ctx.valeMejorCultivo(); return ctx.valeSemillasN() * ((C[k] || C.papa).seedCost || 1); }
  return ctx.valeFardoN(id) * ctx.valeUnidad(id);
}

console.log("\nLO QUE ENTREGA CADA PREMIO CONTRA LO QUE COBRA");
{
  jugador(1);
  console.log("");
  for (const it of SHOP) {
    const cuesta = ctx.valeCosto(it.id), da = entrega(it.id), porVale = da / cuesta;
    const bien = Math.abs(porVale - VALE) / VALE <= TOL;
    ok(ctx.valeLabel(it.id).padEnd(38) + cuesta + " v → " + Math.round(da) + " de plata",
      bien, Math.round(porVale) + " por vale (el vale son " + VALE + ")");
  }
}

console.log("\nY EN TODOS LOS NIVELES DE CULTIVO   (el sobre cambia con tu mejor cultivo)");
{
  const malos = [];
  for (let nv = 1; nv <= 20; nv++) {
    jugador(nv);
    for (const it of SHOP) {
      const cuesta = ctx.valeCosto(it.id), porVale = entrega(it.id) / cuesta;
      if (Math.abs(porVale - VALE) / VALE > TOL)
        malos.push("Cultivo " + nv + " · " + ctx.valeLabel(it.id) + " → " + Math.round(porVale) + " por vale");
    }
  }
  ok("ningún premio se desvía más de un " + Math.round(TOL * 100) + " % en ningún nivel",
    !malos.length, malos.slice(0, 6).join("\n           "));
}

console.log("\nLA EMISIÓN USA LA MISMA VARA QUE EL GASTO   (era el agujero del 18/8)");
{
  /* el tablón paga `valesDe(valor del pedido)`. Si emitiera con una vara y cobrara con otra,
     la fuga vuelve sola: da igual cuántos casos se persigan de a uno. */
  const SRC = require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok("el pedido emite sus vales con valesDe()", /vales:\s*valesDe\(/.test(SRC));
  ok("y no hay ningún premio con su precio escrito a mano",
    !/valeCosto[\s\S]{0,400}?return\s+[2-9]\s*;/.test(SRC));
  /* la comprobación redonda: emitir y gastar tienen que cancelarse */
  const val = 200;
  const emite = ctx.valesDe(val);
  ok("un pedido de " + val + " de plata paga " + emite + " vales, que son " + (emite * VALE) + " de plata",
    Math.abs(emite * VALE - val) / val <= TOL, emite + " vales");
}

console.log("\nLAS ETIQUETAS NO MIENTEN   (decían « 10 hachas » con un número a mano)");
{
  jugador(1);
  for (const it of SHOP) {
    if (it.id === "semillas") continue;
    const n = ctx.valeFardoN(it.id), etq = ctx.valeLabel(it.id);
    ok("« " + etq + " » nombra las " + n + " que entrega", etq.indexOf(String(n)) >= 0, etq);
  }
  /* y que el catálogo ya no lleve el número pegado: si vuelve, vuelve la mentira */
  ok("VALES_SHOP ya no guarda etiquetas con cantidades", SHOP.every(it => !it.label),
    SHOP.map(it => it.label).filter(Boolean).join(", "));
}

const linea = () => console.log("─".repeat(78));
console.log(""); linea();
console.log(fallos
  ? "  " + fallos + " desvío(s): el tablón no paga lo que un vale vale"
  : "  ✓ cada vale entrega ~" + VALE + " de plata, en todos los premios y en todos los niveles");
linea();
process.exit(fallos ? 1 : 0);
