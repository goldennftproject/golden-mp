/* PESCA v4 · LOS TRES CEBOS (27/8, tanda 2b)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La lombriz, la larva de luz y el camarón. Lo que este archivo defiende no es que los números
   sean grandes, sino algo más raro: que DOS DE LOS TRES CEBOS NO CONVENGAN.

     · la larva cuesta 10 de plata y sube el valor esperado del lance exactamente 10;
     · el camarón cuesta 30 y aporta unos 4.

   Un cebo que siempre conviene no es una decisión: es un impuesto por no usarlo. Estos dos solo
   valen la pena cuando el jugador quiere algo que la plata no compra —un pez concreto para un
   pedido, o un récord—, y por eso las pruebas de acá abajo EXIGEN que el neto sea cero o
   negativo. Un test que pidiera lo contrario estaría peleándose con el diseño en vez de medirlo.

   DOS ERRORES MÍOS QUE ESTE ARCHIVO EXISTE PARA QUE NO VUELVAN

   1) « Borrar la banda común » lo implementé mandando ese 62 % a la banda poco común. Suena
      razonable y da un valor esperado de 14,64. El documento dice 20,60. Con 14,64 la larva
      PIERDE 5,66 por lance y nadie la usaría jamás: el cebo existiría sin existir. El reparto
      correcto es PROPORCIONAL entre las bandas que quedan, y da 20,59.

   2) Escribí que quedarse con el mayor de dos sorteos multiplica el peso por 1,5. Daría 1,5 si
      el peso mínimo de la especie fuera cero; como no lo es, el factor real es
      (min + R/2) ÷ (min + R/3). Medí y me salió 1,276 contra el 1,5 que yo había escrito con
      toda confianza diez minutos antes. Ahora se deriva por especie y se contrasta con el
      sorteo, que es la única forma de que una fórmula así no mienta.
     node tools/test-pesca-v4-cebos.js                                                           */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};
const DEF = g("CEBO_V4_DEF"), ORDEN = g("CEBO_V4_ORDER"), PEZ = g("PEZ_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const VE = (cebo) => ctx.lanceValorEsperado("junco", { cebo: cebo });

console.log("\nEL CATÁLOGO");
{
  ok("son tres", ORDEN.length === 3, ORDEN.join(", "));
  ok("cada uno dice de qué bolsa sale",
    ORDEN.every(k => DEF[k].bolsa === "res" || DEF[k].bolsa === "fish"),
    ORDEN.map(k => k + ":" + DEF[k].bolsa).join(" "));
  ok("el camarón sale de la bolsa de PECES, no de la de recursos",
    DEF.camaron.bolsa === "fish" && DEF.camaron.k === "camaron");
  console.log("       → « un mítico que solo se vende es un número; un mítico que además decide");
  console.log("         tu próximo lance es una elección ».");
  ok("y los tres explican qué hacen", ORDEN.every(k => DEF[k].txt && DEF[k].txt.length > 20));
}

console.log("\nQUÉ LE HACE CADA CEBO A LA TABLA DE RAREZA");
{
  console.log("\n    cebo         común  poco común   raro   épico  legendario");
  for (const k of ORDEN) {
    const t = ctx.bandaTabla("junco", false, k);
    console.log("    " + DEF[k].label.padEnd(13) +
      ["comun", "poco_comun", "raro", "epico", "legendario"].map(b => (t[b] || 0).toFixed(2).padStart(8)).join(""));
  }
  console.log("");
  const malas = ORDEN.filter(k => {
    const t = ctx.bandaTabla("junco", false, k);
    return Math.abs(Object.keys(t).reduce((s, b) => s + t[b], 0) - 100) > 0.01;
  });
  ok("las tres tablas siguen sumando 100 %", !malas.length, malas.join(" · "));
  const lar = ctx.bandaTabla("junco", false, "larva_luz");
  ok("la larva deja la común en cero", lar.comun === 0, lar.comun + " %");
  ok("y ninguna banda queda en negativo",
    ORDEN.every(k => { const t = ctx.bandaTabla("junco", false, k); return Object.keys(t).every(b => t[b] >= -0.001); }));
  const base = ctx.bandaTabla("junco", false, "lombriz"), cam = ctx.bandaTabla("junco", false, "camaron");
  ok("el camarón duplica la legendaria",
    Math.abs(cam.legendario - base.legendario * 2) < 0.001,
    base.legendario + " % → " + cam.legendario + " %");
}

console.log("\nEL PESO QUE GARANTIZA EL CAMARÓN   (derivado y medido, para que no puedan discrepar)");
{
  console.log("\n    especie        derivado   sorteado (20.000 lances)");
  const malas = [];
  for (const k of ["merluza", "atun", "pez_espada", "pez_linterna"]) {
    const der = ctx.pesoFactorEsperado(k, "camaron");
    let s = 0; for (let i = 0; i < 20000; i++) s += ctx.pesoFactor(k, ctx.pesoDelLance(k, { cebo: "camaron" }));
    const med = s / 20000;
    console.log("    " + PEZ[k].label.padEnd(16) + der.toFixed(3).padStart(8) + med.toFixed(3).padStart(14));
    if (Math.abs(der - med) > 0.02) malas.push(PEZ[k].label);
  }
  console.log("");
  ok("la fórmula coincide con el sorteo en todas las especies", !malas.length, malas.join(" · "));
  /* 28/8 — ACÁ DECÍA « y NO es el 1,5 que yo había escrito a mano », y la comprobación era que
     el número se apartara de 1,5. Con el factor de peso al cuadrado el valor real subió a 1,48 y
     esto se puso rojo… por acercarse a la cifra equivocada por el motivo correcto. Casualidad
     pura: el 1,5 de entonces salía de suponer que el peso mínimo era cero, y este 1,48 sale de
     elevar al cuadrado. Dos cuentas distintas que dan casi lo mismo.
     Que un test dependa de que dos números NO coincidan es frágil por definición. Lo que hay que
     defender es lo de siempre: que la fórmula y el sorteo digan lo mismo —eso ya está arriba— y
     que el factor no sea una constante disfrazada, o sea que cambie de especie a especie.

     Y AL ESCRIBIRLO APRENDÍ ALGO QUE NO SABÍA: el factor no depende del tamaño del pez, sino de
     la PROPORCIÓN entre su peso mínimo y su rango. Merluza (0,4–1,8), atún (2–9) y pez espada
     (20–90) dan los tres exactamente 1,484 porque los tres tienen min/rango = 0,286 — cosa del
     documento, que armó los rangos con la misma proporción sin proponérselo. Elegí esas tres
     para demostrar que el factor variaba y demostré lo contrario.
     Así que se comparan especies con proporciones DISTINTAS, que es lo que había que hacer. */
  const porEspecie = ["merluza", "pez_linterna", "pez_globo"].map(k => ctx.pesoFactorEsperado(k, "camaron"));
  ok("y no es una constante: depende de cada rango de peso",
    Math.max(...porEspecie) - Math.min(...porEspecie) > 0.02,
    porEspecie.map(x => x.toFixed(3)).join(" · ") + " — manda la proporción mínimo/rango");
  ok("sin camarón, el peso no se toca", ctx.pesoFactorEsperado("atun", "lombriz") === 1);
  /* y lo que hace que el récord siga siendo un récord: el cebo corre la curva, no pone el techo */
  let topes = 0;
  for (let i = 0; i < 5000; i++) if (ctx.pesoDelLance("atun", { cebo: "camaron" }) > PEZ.atun.peso[1] * 0.99) topes++;
  ok("el camarón NO regala el máximo: sigue habiendo que tener suerte",
    topes / 5000 < 0.05, Math.round(topes / 5000 * 100) + " % de capturas al tope");
}

console.log("\nLO QUE DEFIENDE ESTE ARCHIVO: QUE DOS DE LOS TRES NO CONVENGAN");
{
  const base = VE("lombriz");
  console.log("\n    cebo           cuesta   valor esperado   aporta    NETO");
  const netos = {};
  for (const k of ORDEN) {
    const c = k === "camaron" ? 30 : (DEF[k].plata || 0);
    const v = VE(k); netos[k] = v - base - c;
    console.log("    " + DEF[k].label.padEnd(15) + String(c).padStart(6) + v.toFixed(2).padStart(15) +
      (v - base).toFixed(2).padStart(9) + netos[k].toFixed(2).padStart(9));
  }
  console.log("");
  /* 28/8 — los dos números clavados de acá (10,30 la base y 20,60 la larva) eran del documento y
     valían mientras TODA caña pudiera sacar TODA especie. Con la escalera de especies que pidió
     el diseñador, la de junco ya no llega a siete de ellas y su base cae a 9,59; la larva, que
     borra la banda común repartiendo proporcionalmente, la sigue hasta 18,71.
     Lo que hay que defender no era el 20,60: era que la larva SUBA CASI EXACTAMENTE LO QUE
     CUESTA, o sea que no dé beneficio sino control. Eso se comprueba abajo y sigue en pie. */
  ok("la larva casi dobla el lance: borra la banda común",
    VE("larva_luz") > base * 1.8, base.toFixed(2) + " → " + VE("larva_luz").toFixed(2));
  ok("y queda ANCLADA: lo que sube es casi exactamente lo que cuesta",
    Math.abs(netos.larva_luz) < 1, netos.larva_luz.toFixed(2) + " de neto");
  console.log("       → si el reparto fuera « todo a poco común » la larva perdería más de 5 por");
  console.log("         lance: un cebo que existe sin existir. El reparto proporcional es lo que");
  console.log("         la convierte en una decisión — se usa cuando falta un pez, no para ganar.");
  ok("el camarón aporta unos 5, como dice el documento",
    VE("camaron") - base > 3 && VE("camaron") - base < 7, (VE("camaron") - base).toFixed(2));
  ok("y PIERDE plata, que es exactamente lo que tiene que hacer",
    netos.camaron < -20, netos.camaron.toFixed(2) + " de neto");
  console.log("       → « el camarón se quema cuando vas por el récord de pez espada, y esa es");
  console.log("         una decisión de orgullo, no de contabilidad ».");
  ok("ningún cebo convierte la laguna en una imprenta",
    ORDEN.every(k => netos[k] < 1), ORDEN.map(k => netos[k].toFixed(1)).join(" · "));
}

console.log("\nEL INVARIANTE DE LA LOMBRIZ SIGUE INTACTO   (los cebos no lo tocan)");
{
  const netos = ["junco", "bambu", "hierro", "oro"].map(k => ctx.lanceNeto(k));
  const nasas = g("NASA_ORDER").map(k => ctx.nasaPorLombriz(k));
  const todos = netos.concat(nasas);
  const disp = (Math.max(...todos) / Math.min(...todos) - 1) * 100;
  ok("las siete rutas siguen entre 8,5 y 12", Math.min(...todos) > 8.5 && Math.max(...todos) < 12,
    Math.min(...todos).toFixed(2) + " a " + Math.max(...todos).toFixed(2));
  ok("y ninguna se despega: menos de un 25 % entre la mejor y la peor", disp < 25, disp.toFixed(0) + " %");
  console.log("       → los cebos son decisiones DENTRO del lance; el ancla la sigue fijando");
  console.log("         la lombriz, y por eso sigue siendo la única palanca que hay que tocar.");
}

console.log("\nPONER, COBRAR Y QUEDARSE SIN");
{
  G.res = { lombriz: 5, larva_luz: 2 }; G.fish = { camaron: 1 }; G.plata = 100; G.pescaV4 = {};
  ok("sin elegir nada, el cebo es la lombriz", ctx.ceboPuesto() === "lombriz");
  ok("tengo las tres cosas", ORDEN.every(ctx.ceboTengo), ORDEN.filter(k => !ctx.ceboTengo(k)).join(","));
  G.pescaV4.cebo = "larva_luz";
  ctx.ceboCobrar("larva_luz");
  ok("cobrar una larva la saca de los RECURSOS", G.res.larva_luz === 1, G.res.larva_luz + "");
  ctx.ceboCobrar("camaron");
  ok("y cobrar el camarón lo saca de la bolsa de PECES", (G.fish.camaron || 0) === 0);
  ok("con la bolsa vacía, el camarón deja de estar disponible", !ctx.ceboTengo("camaron"));
  /* comprar larvas: el único cebo que se compra */
  const antes = G.plata, larvas = G.res.larva_luz;
  ok("una larva cuesta 10 de plata", ctx.larvaComprar(1) === true);
  ok("se cobra", G.plata === antes - 10, antes + " → " + G.plata);
  ok("y entra en la bolsa", G.res.larva_luz === larvas + 1);
  G.plata = 3;
  ok("sin plata no se compra, y se dice por qué", ctx.larvaComprar(1) === false);
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — los cebos todavía no son decisiones"
  : "  Todo en orden: dos de los tres cebos no convienen, y ésa es la idea.");
process.exit(fallos ? 1 : 0);
