/* EL ESTABLO, ANCLADO Y EN PLATA (19/8, dirección)
   "Todo lo que la persona adquiera tiene que funcionar con plata. El $Golden lo veremos más
   adelante, porque no podemos determinar qué valor tendrá."
   Al ponerles precio en plata salió a la luz que los animales nunca estuvieron anclados, y que el
   precio en $Golden lo tapaba: pagabas 20.000 de plata por una alpaca y a partir de ahí imprimía
   50 plata/h — dos animales y medio de ancla. Encima, como con felicidad 0 igual producen la
   mitad, al que le daba trigo le convenía DESCUIDARLO.
   Este test vigila las tres cosas a la vez: que se paguen con plata, que cada animal rinda el
   ancla, y que alimentar sea siempre mejor que no hacerlo.
     node tools/test-establo.js                                                                   */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={ANIMAL_ORDER,ANIMAL_DEF,CROP_DEF,CROP_ORDER,FELIZ_MIN_PROD,FELIZ_BAJA_H,ANIMAL_SUBE,ANIMAL_MAX,ANIMAL_BRUTO_H};", ctx);
const X = ctx.X, G = ctx.G, SRC = fs.readFileSync("public/game/state.js", "utf8");
const ANCLA = 20;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nSE COMPRAN CON PLATA, NO CON $GOLDEN");
{
  /* El $Golden sigue escrito en ANIMAL_DEF a propósito: cuando salga el token se decidirá la
     equivalencia y volverá a servir. Lo que no puede es COBRARSE hoy. */
  const comprar = SRC.split("function comprarAnimal")[1].slice(0, 1600);   // 22/8: el cupo del establo sumó líneas arriba del descuento
  ok("comprar un animal descuenta plata", /G\.plata -= precio/.test(comprar));
  ok("y no toca el $Golden", !/G\.golden/.test(comprar));
  ok("el precio en $Golden sigue anotado para cuando exista el token",
    X.ANIMAL_ORDER.every(k => X.ANIMAL_DEF[k].golden > 0));
  X.ANIMAL_ORDER.forEach(k => {
    const p = ctx.animalPrecioBase(k), h = p / ANCLA;
    ok("la " + X.ANIMAL_DEF[k].label + " cuesta " + p + " de plata", p > 0 && h >= 12 && h <= 200,
      "se paga sola en " + h.toFixed(0) + " h");
  });
  /* Cada animal extra del mismo tipo sube: llenar el establo hasta el tope tiene que doler, o el
     establo se vuelve una impresora de material. */
  G.animals = { alpaca: [] };
  const p1 = ctx.animalPrecio("alpaca");
  G.animals.alpaca = [1, 2, 3, 4].map(() => ({}));
  ok("el quinto cuesta bastante más que el primero", ctx.animalPrecio("alpaca") > p1 * 3,
    p1 + " → " + ctx.animalPrecio("alpaca"));
  G.animals = {};
}

console.log("\nCADA ANIMAL RINDE EL ANCLA");
{
  X.ANIMAL_ORDER.forEach(k => {
    const neto = ctx.animalBrutoH(k) - ctx.animalRacionH(k);
    ok(X.ANIMAL_DEF[k].label + " a felicidad plena", Math.abs(neto - ANCLA) <= 1,
      neto.toFixed(1) + " plata/h");
  });
  ok("lo que produce por ciclo se DERIVA, no está escrito a mano",
    X.ANIMAL_ORDER.every(k => ctx.animalPorCiclo(k) >= 1),
    X.ANIMAL_ORDER.map(k => X.ANIMAL_DEF[k].label + " " + ctx.animalPorCiclo(k)).join(" · "));
}

console.log("\nALIMENTARLO SIEMPRE GANA (y descuidarlo, nunca)");
{
  X.ANIMAL_ORDER.forEach(k => {
    const cuidado = ctx.animalBrutoH(k) - ctx.animalRacionH(k);
    const descuidado = ctx.animalBrutoH(k) * X.FELIZ_MIN_PROD;      // felicidad 0: la mitad, y comida gratis
    ok("a la " + X.ANIMAL_DEF[k].label + " le conviene comer", cuidado > descuidado,
      cuidado.toFixed(1) + " contra " + descuidado.toFixed(1) + " descuidada");
  });
}

console.log("\nDA IGUAL CON QUÉ LO ALIMENTES: LA HORA CUESTA LO MISMO");
{
  /* Ésta es la regla que cierra el hueco: la felicidad que da un cultivo es proporcional a su
     valor. Si no lo fuera, alimentar con papa (2 de plata) sería regalado y el animal dejaría de
     costar lo que dice costar. Los cultivos caros se salen por arriba porque la felicidad tiene
     techo de 100 — y eso está bien: tirarle un maíz de 1.200 a una alpaca DEBE ser un derroche. */
  X.ANIMAL_ORDER.forEach(k => {
    /* "Normal" para CADA animal es el cultivo que no le llena la barra de una sentada. Un animal
       de ración barata (el conejo apenas gasta 0,3 plata/h) se llena con casi cualquier cosa, y a
       partir de ahí lo que sobra se tira: por eso la lista se calcula por animal y no a ojo. */
    const normales = X.CROP_ORDER.filter(c => ctx.felizDeComida(k, c, true) < 100);
    const costes = normales.map(c => X.FELIZ_BAJA_H / ctx.felizDeComida(k, c, true) * X.CROP_DEF[c].price);
    const dif = Math.max.apply(null, costes) / Math.min.apply(null, costes);
    ok("la " + X.ANIMAL_DEF[k].label + " cuesta lo mismo con cualquier cultivo normal", dif < 1.05,
      normales.length + " cultivos · de " + Math.min.apply(null, costes).toFixed(1) + " a " + Math.max.apply(null, costes).toFixed(1) + " plata/h");
  });
  const caro = X.FELIZ_BAJA_H / ctx.felizDeComida("alpaca", "maiz", true) * X.CROP_DEF.maiz.price;
  const normal = X.FELIZ_BAJA_H / ctx.felizDeComida("alpaca", "papa", true) * X.CROP_DEF.papa.price;
  ok("y tirarle el cultivo más caro sale peor", caro > normal, caro.toFixed(1) + " contra " + normal.toFixed(1));
}

console.log("\nLA PUERTA DE LA GANADERÍA ES ALCANZABLE");
{
  /* El ritmo de la Ganadería estuvo escrito a mano en 1 cuando lo real es 0,083: la Curtiduría
     pedía 1,9 días en vez de 3,8 h y el jabalí 47 días. Ahora sale de la producción real. */
  const xpH = 3 * ctx.XP_ANIMAL / X.ANIMAL_DEF.alpaca.cicloH;
  const acum = n => { let a = 0; for (let i = 1; i < n; i++) a += ctx.skillNeed(i, "ganaderia"); return a; };
  X.ANIMAL_ORDER.forEach(k => {
    const h = acum(ctx.animalNivelReq(k)) / xpH;
    ok("la " + X.ANIMAL_DEF[k].label + " se abre a las " + h.toFixed(1) + " h de establo", h < 24 * 7,
      "Ganadería " + ctx.animalNivelReq(k));
  });
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ el establo cuesta plata, rinde el ancla y premia cuidar\n");
process.exit(fallos ? 1 : 0);
