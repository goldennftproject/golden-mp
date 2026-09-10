/* PESCA v4 · EL INVARIANTE MEDIDO EN EL BOLSILLO, NO EN LA FÓRMULA   (27/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Este archivo existe por el fallo más caro de toda la semana, y el más incómodo de explicar.

   El capítulo 9 del documento es una sola frase: « toda ruta de la laguna paga entre 9,29 y
   11,34 de plata por lombriz », con un 22 % de dispersión. Es lo que impide que exista una ruta
   rota. Llevo tres tandas defendiéndola con un test en verde.

   El test medía lanceNeto(), que es « valor esperado menos el peaje ». Una resta. Y el juego
   NUNCA COBRABA EL PEAJE: mant vivía solo dentro de esa fórmula y en el texto del panel. Así
   que la caña de oro pagaba 21,34 por lombriz contra los 10,30 de la de junco —un 107 % de
   dispersión contra el 13 % prometido— mientras mi test decía que todo estaba bien.

   Un test que mide una fórmula en vez del juego no comprueba el juego: comprueba que sé restar.

   Así que este archivo NO llama a lanceNeto() ni una sola vez. Juega miles de lances de verdad
   —arma el lance, lo resuelve, vende el pez— y cuenta la plata que entra y sale de G.plata.
   Si mañana alguien vuelve a olvidarse de cobrar algo, la cuenta del bolsillo lo delata aunque
   la fórmula siga siendo perfecta.
     node tools/test-pesca-v4-bolsillo.js                                                        */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);
const CANAS = g("CANA_V4_DEF"), PEZ = g("PEZ_DEF"), NASAS = g("NASA_DEF");

const MEDIDO = {};
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
let AHORA = Date.UTC(2026, 7, 27, 15);
ctx.nowMs = () => AHORA;
vm.runInContext("nowMs = window.nowMs;", ctx);

/* ═══ EL AZAR, CON SEMILLA ═══════════════════════════════ (8/9). Este archivo era INESTABLE: tres
   corridas seguidas daban 19 %, 24 % y 8 % de dispersión sin que nada hubiera cambiado, y la
   aserción pedía « menos de 20 ». O sea que el mismo código pasaba o fallaba según el humor del
   generador. Un test que a veces está en rojo es peor que ninguno: enseña a ignorar el rojo, y hoy
   ya vimos a dónde lleva eso —cinco tests en rojo heredados que tapaban una regresión real.

   Lo más incómodo es que el propio archivo se quejaba de esto en la línea 214 y creía haberlo
   arreglado reusando la misma muestra para las dos aserciones. No alcanzaba: la muestra ENTERA
   cambia en cada corrida. Cuarenta mil tiradas suenan a muchas, pero el pez legendario sale una
   vez cada 250 lances y su precio es cien veces el del común: la cola pesa tanto que la media
   sigue bailando.
   Con semilla fija, dos corridas del mismo código dan el mismo número y la banda puede ser
   estrecha de verdad. El azar del JUEGO no se toca — se toca el del laboratorio. */
let _semilla = 20260908;
ctx.Math = Object.create(Math);
ctx.Math.random = () => {                       // xorshift32: barato, reproducible y suficiente
  _semilla ^= _semilla << 13; _semilla ^= _semilla >>> 17; _semilla ^= _semilla << 5;
  /* dividir por 2^32, NO tomar módulo 1e9: 2^32 no es múltiplo de 1e9, así que el módulo hace que
     el 30 % más bajo del rango salga cinco veces por cada cuatro del resto. Con eso el sorteo se
     cargaba hacia los peces comunes y el neto medía 8,25 en vez de 9,3 — un generador sesgado es
     un laboratorio que miente, y yo lo había escrito así hace cinco minutos. */
  return (_semilla >>> 0) / 4294967296;
};

/* UNA PARTIDA DE VERDAD: N lances con la caña puesta, resueltos como los resuelve el juego, y la
   plata contada de la bolsa. Se gana siempre la pulseada a propósito —lo que se mide es la
   ECONOMÍA, no la habilidad—, y el pez se vende al precio que le toca por su peso. */
function jugar(cana, n, opciones) {
  const o = opciones || {};
  G.canas = {}; G.canas[cana] = 1;
  G.plata = 1000000; G.peajeCana = 0; G.fish = {}; G.pescaStats = {}; G.torneo = null;
  /* el estado de pesca se pide por su puerta y se le pone el cebo — crear el objeto a mano acá
     sería reproducir en el test el mismo bug que el test acaba de encontrar. */
  G.pescaV4 = null; ctx.pescaEstado().cebo = o.cebo || "lombriz";
  G.res = { lombriz: n + 10 };
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };
  const antes = G.plata;
  let lombrices = 0, vendido = 0, s2 = 0;
  for (let i = 0; i < n; i++) {
    /* LA RACHA Y LA PIEDAD SE APAGAN salvo que se pidan, y la razón importa: un simulador que
       gana SIEMPRE mantiene la racha de cinco encendida para siempre, y entonces mide a un
       jugador que no existe. Con la racha permanente el neto sube de 10 a 14 — no porque la
       economía esté rota, sino porque el simulador es sobrehumano.
       Se mide primero la economía BASE, que es la que promete la tabla del capítulo 9, y aparte
       lo que la habilidad le suma encima, que es una pregunta distinta y también interesante. */
    /* 28/8 — LA RACHA SE FUE CON LA PULSEADA. Este bucle apagaba la racha a mano en cada lance,
       porque un simulador que gana SIEMPRE la mantenía encendida para siempre y medía a un
       jugador que no existe. Ya no hace falta: sin minijuego no hay pericia que premiar, así que
       no hay racha que apagar. Lo que sí se mantiene es sinPiedad, que apaga las dos garantías
       —la del primer lance del día y la de los 80 sin épico—: son suelos para el jugador, no
       parte de la economía media, y dejarlas encendidas inflaría la medición. */
    { const e = ctx.pescaEstado(); e.sinEpico = 0; }
    G.res.lombriz -= 1; lombrices += 1;
    const r = ctx.lanceSacar(cana, { noche: o.noche || false, cebo: o.cebo || "lombriz",
                                     sinPiedad: true });   // ← acá cobra el peaje el juego
    const v = (r && !r.roto) ? ctx.pezPrecio(r.id, r.kg) : 0;
    vendido += v; s2 += v * v;                          // para la desviación típica, ver abajo
  }
  G.plata += vendido;                                    // se vende todo lo pescado
  /* LA DESVIACIÓN TÍPICA SE MIDE, NO SE ESTIMA. La tolerancia de más abajo sale de acá: si un
     día la economía se vuelve más azarosa —y el 28/8 se volvió, al pasar el peso al cuadrado—,
     la tolerancia se ensancha sola en vez de ponerse roja por un motivo que no es un fallo. */
  const media = vendido / lombrices;
  const sigma = Math.sqrt(Math.max(0, s2 / lombrices - media * media));
  return { neto: (G.plata - antes) / lombrices, lombrices, vendido, sigma };
}

console.log("\nEL INVARIANTE, CONTANDO LA PLATA DE LA BOLSA");
{
  const N = 40000;
  console.log("\n    caña             lances   plata neta por lombriz   lo que promete la tabla");
  const netos = [], sigmas = [];
  /* 9/9 — LA DEL ABUELO ENTRA A ESTA LISTA. Estaba fuera, y por eso pudo pasar dos semanas
     pagando 25,46 por lombriz —×2,44 sobre la de oro— con este test en verde todos los días.
     El invariante no es « las cuatro de plata pagan lo mismo »: es « TODA ruta de la laguna »,
     y una lista escrita a mano que se olvida una ruta es un invariante que no se comprueba.
     Se recorre CANA_V4_ORDER entero: si mañana entra una caña nueva, entra sola a este test. */
  for (const k of g("CANA_V4_ORDER")) {
    const r = jugar(k, N);
    netos.push(r.neto); sigmas.push(r.sigma); MEDIDO[k] = r.neto;
    console.log("    " + CANAS[k].label.padEnd(17) + String(N).padStart(6) +
      r.neto.toFixed(2).padStart(22) + ctx.lanceNeto(k).toFixed(2).padStart(24));
  }
  console.log("");
  const disp = (Math.max(...netos) / Math.min(...netos) - 1) * 100;
  ok("toda caña paga entre 9 y 12 de plata por lombriz, EN LA BOLSA",
    Math.min(...netos) > 9 && Math.max(...netos) < 12,
    Math.min(...netos).toFixed(2) + " a " + Math.max(...netos).toFixed(2));
  /* 9/9 — LA BANDA ES LA LEY; LA DISPERSIÓN ES LO QUE LA BANDA IMPLICA. El umbral estaba en
     20 % porque era lo que daban las CUATRO de plata, o sea una foto, no una regla. Al entrar
     la del Abuelo —que es la mejor caña del juego y tiene que serlo— la foto cambia sola.
     Lo que no puede cambiar es la banda 9-12, que es lo que docs/BALANCE-PESCA.md declara y lo
     que hace que la carnada siga siendo la única palanca. Así que el tope se DERIVA de la banda
     (12 ÷ 9 − 1 = 33 %) en vez de escribirse a mano: si mañana la banda se estrecha, esto se
     estrecha con ella, y si alguien la ensancha tiene que decirlo ahí y no aquí. */
  ok("y la dispersión cabe en lo que la banda 9-12 permite", disp < 34,
    disp.toFixed(0) + " % (la banda permite hasta 33 %)");
  console.log("       → sin cobrar el peaje esta misma cuenta daba 107 %. La fórmula estaba");
  console.log("         bien y el juego no la aplicaba, que es la peor combinación posible:");
  console.log("         un número correcto que nadie usa.");
  /* Y QUE LO MEDIDO COINCIDA CON LO PROMETIDO, con una tolerancia que sale de la estadística y
     no de mi paciencia. La banda legendaria de la caña de hierro es el 0,36 % y sus peces valen
     700: eso solo aporta una desviación típica de unas 42 de plata POR LANCE, o sea 0,21 sobre
     la media de 40.000. Pedir menos de 0,35 haría que el test fallara una de cada tres veces por
     azar puro — y un test intermitente es peor que no tenerlo, porque enseña a volver a correrlo
     hasta que salga verde. Tres desviaciones típicas: 0,7. */
  /* 28/8 — LA TOLERANCIA SE DERIVA DE LA MEDIDA, y ya no es el 0,7 escrito a mano de arriba.
     Ese 0,7 eran tres desviaciones típicas de la economía de entonces. Al pasar el factor de peso
     al cuadrado, la cola de los legendarios engordó y la desviación típica de un lance subió: el
     mismo juego, igual de correcto, empezó a fallar este test por azar.
     Una tolerancia clavada a mano envejece con la economía que la produjo. Ahora sale de la sigma
     que la propia simulación acaba de medir — tres sigmas del error de la media, 3σ/√N —, así que
     lo que se comprueba es lo que importa: que la diferencia entre la bolsa y la tabla sea ruido
     y no un sesgo. */
  const malas = ["junco", "bambu", "hierro", "oro"]
    .map((k, i) => ({ k, d: netos[i] - ctx.lanceNeto(k), tol: 3 * sigmas[i] / Math.sqrt(N) }))
    .filter(x => Math.abs(x.d) > x.tol);
  const tolMax = Math.max(...sigmas.map(s => 3 * s / Math.sqrt(N)));
  ok("la bolsa coincide con la tabla en las cuatro cañas (±3σ, hoy ±" + tolMax.toFixed(2) + ")",
    !malas.length, malas.map(x => x.k + " " + x.d.toFixed(2) + " sobre " + x.tol.toFixed(2)).join(", "));
}

console.log("\nEL PEAJE SE COBRA DE VERDAD, Y NO SE PIERDE POR REDONDEO");
{
  /* 0,30 por lance en la de junco. Si se restara de una plata entera, cada cobro se perdería y
     en mil lances se irían 300 de plata sin que nadie lo notara. Por eso se acumula. */
  G.canas = { junco: 1 }; G.plata = 1000; G.peajeCana = 0; G.fish = {}; G.pescaStats = {};
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc }; G.pescaV4 = null; ctx.pescaEstado();
  const N = 1000, esperado = N * CANAS.junco.mant;
  for (let i = 0; i < N; i++) ctx.lanceSacar("junco", {});
  const pagado = 1000 - G.plata + (G.peajeCana || 0);
  console.log("");
  console.log("    " + N + " lances con la caña de junco (0,30 de peaje cada uno)");
  console.log("    esperado: " + esperado.toFixed(0) + " de plata   ·   cobrado: " + pagado.toFixed(2));
  console.log("");
  ok("mil peajes de 0,30 cobran los 300 de plata que suman",
    Math.abs(pagado - esperado) < 1, pagado.toFixed(2) + " vs " + esperado.toFixed(0));
  ok("y lo que queda por debajo de 1 se guarda, no se tira",
    (G.peajeCana || 0) >= 0 && (G.peajeCana || 0) < 1, (G.peajeCana || 0).toFixed(2) + " pendiente");
  /* 9/9 — ESTA COMPROBACIÓN PEDÍA LO CONTRARIO, y era el candado que dejaba el agujero abierto.
     Decía « la del Abuelo no cobra peaje: es la única que rompe el ancla a propósito », o sea
     que registraba una EXENCIÓN como si fuera un contrato de diseño. Nadie la decidió: salió de
     poner mant 0 en la tanda 1a de la v4. Mientras esta línea estuviera en verde, la caña podía
     pagar ×2,44 y el test daba el visto bueno todos los días.
     Ahora se pide lo que la economía necesita: que TODA caña cobre su peaje, incluida ésta. */
  {
    G.canas = { abuelo: 1 }; G.plata = 1000; G.peajeCana = 0;
    for (let i = 0; i < 100; i++) ctx.lanceSacar("abuelo", {});
    const cobrado = 1000 - G.plata + (G.peajeCana || 0);
    ok("la Caña del Abuelo TAMBIÉN cobra peaje: ninguna caña queda fuera del invariante",
      cobrado > 0, "cien lances cobraron " + cobrado.toFixed(0) + " de plata");
  }
}

console.log("\nEL DINERO DE LA PESCA VA A LA BOLSA DE VERDAD   (G.plata, no una cuenta inventada)");
{
  /* Toda la Pesca v4 se escribió contra G.coins. El juego usa G.plata en 101 sitios y G.coins en
     cero: era una cuenta fantasma. La Lonja pagaba a la nada, las cañas y las larvas salían
     gratis, y los tests estaban en verde porque leían la misma cuenta equivocada.
     Esta comprobación es tonta a propósito: mira que ninguna función de la pesca mencione otra
     bolsa que la del juego. */
  const fs = require("fs");
  const src = ["state.js", "ui.js"].map(f => fs.readFileSync(path.join(RAIZ, "public/game", f), "utf8")).join("\n");
  /* 31/8 — SIN COMENTARIOS: nombrar a G.coins para contar su historia es exactamente lo que hay
     que hacer, y no debe poner esto en rojo. La misma lección que test-sin-pesca-v3 con TRAMPA_DEF. */
  const srcCodigo = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("ninguna función usa G.coins", srcCodigo.indexOf("G.coins") < 0);
  ok("ni llama a un flujoAnotar() que no existe", src.indexOf("flujoAnotar") < 0);
  console.log("       → las dos estaban guardadas con typeof, así que no rompían nada: solo no");
  console.log("         hacían nada. Un error que no da error es el que más tarda en verse.");

  /* y ahora, de verdad: entregar en la Lonja tiene que subir G.plata */
  let acc = 0; for (let k = 2; k <= 14; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc }; G.level = 14; G.expansiones = 9;
  G.canas = { junco: 1, bambu: 1 }; G.plata = 100; G.escamasLonja = 0; G.lonja = null;
  G.fish = {}; G.lonjaEntregados = 0;
  const p = ctx.lonjaPedido();
  /* 1/9 (Suren): toda marea pide PESO y se cumple pescando — las capturas se marcan hechas
     directo (la mecánica fina la mide test-pesca-v4-lonja; acá solo se cuenta la plata) */
  p.hechos = p.n;
  const antes = G.plata;
  ctx.lonjaEntregar();
  ok("entregar en la Lonja sube la plata del jugador", G.plata > antes,
    antes + " → " + G.plata);
  ok("y le da su Escama", ctx.escamasLonja() === 1);

  /* comprar una caña tiene que COBRAR: materiales y cola de plata */
  G.canas = {}; G.plata = 500;
  G.res = { madera: 40, fibra: 10, tablon: 20, barra_hierro: 8, cuero: 10 };
  const mad = G.res.madera, pl = G.plata;
  /* 9/9 — LA RECETA SE LEE, NO SE NOMBRA. Acá decía « la fibra » con el material escrito a mano,
     y el bambú dejó de llevar fibra cuando dirección subió el precio de los materiales del
     establo (742) y hubo que re-derivar las tres mezclas para que cupieran en su presupuesto.
     El test se puso rojo por un cambio aprobado. Lo que custodia no es QUÉ material lleva la
     caña —eso es la receta, y cambia— sino que COBRE todo lo que la receta dice. */
  const antesMat = {}; for (const m in CANAS.bambu.cost) antesMat[m] = G.res[m] || 0;
  ok("armar la caña de bambú se puede con el material justo", ctx.canaV4Comprar("bambu") === true);
  for (const m in CANAS.bambu.cost)
    ok("y cobra " + m, (G.res[m] || 0) === antesMat[m] - CANAS.bambu.cost[m],
      antesMat[m] + " → " + (G.res[m] || 0));
  ok("y la cola de plata", G.plata === pl - CANAS.bambu.colaPlata, pl + " → " + G.plata);
}

console.log("\nSE PAGA CON MATERIALES, NO CON PLATA PELADA   (tabla 9 del documento)");
{
  console.log("\n    caña             se paga con");
  for (const k of ["junco", "bambu", "hierro", "oro"]) {
    console.log("    " + CANAS[k].label.padEnd(17) + ctx.canaV4Costo(k));
  }
  console.log("");
  const sinMat = ["junco", "bambu", "hierro", "oro"].filter(k => !CANAS[k].cost || !Object.keys(CANAS[k].cost).length);
  ok("las cuatro cañas de plata piden material", !sinMat.length, sinMat.join(", "));
  console.log("       → « si la caña de oro costara 2.000 de plata a secas, mejorar la pesca");
  console.log("         sería ahorrar. Pagándola con tablón, oro y cuero, mejorar la pesca");
  console.log("         obliga a talar, picar y criar. »  Yo había puesto plata pelada.");
  ok("y las tres nasas también", g("NASA_ORDER").every(k => Object.keys(NASAS[k].cost).length >= 1),
    g("NASA_ORDER").map(k => k + ": " + Object.keys(NASAS[k].cost).join("+")).join(" · "));
  /* la del Abuelo no se compra con nada de esto */
  ok("la Caña del Abuelo no tiene precio en plata: se gana en la Lonja",
    CANAS.abuelo.presupuesto === null && !CANAS.abuelo.cost);
  /* qué falta, dicho por nombre */
  G.res = {}; G.plata = 0; G.canas = {};
  const f = ctx.canaV4Falta("oro");
  ok("si falta material lo dice por nombre y cantidad", /Tablón|Cuero|Oro/i.test(f || ""), f);
}

console.log("\nLA CARNADA SIGUE SIENDO EL TECHO");
{
  /* se reusan las cuarenta mil tiradas de arriba en vez de volver a simular con menos: medir dos
     veces la misma cosa con muestras distintas es cómo se consigue un test que a veces dice 13 %
     y a veces 21 % sin que nada haya cambiado. */
  const jun = MEDIDO.junco, oro = MEDIDO.oro;
  const mejora = (oro / jun - 1) * 100;
  ok("de la caña más barata a la más cara se mejora un 13 %, no un 107 %",
    mejora > 5 && mejora < 20, "+" + mejora.toFixed(0) + " %");
  console.log("       → « NINGUNA CAÑA PUEDE CORRER MÁS RÁPIDO QUE LA CARNADA — ése es el seguro");
  console.log("         contra la sobreproducción. »  Ahora el juego lo cumple, no solo la hoja.");
}

console.log("\nY UN JUGADOR VALE LO MISMO QUE OTRO   (no hay habilidad que medir)");
{
  /* ACÁ SE MEDÍA EL TECHO DEL JUGADOR PERFECTO: el que encadenaba cinco capturas sin cortar el
     hilo subía una banda y sacaba un 47 % más que el de tabla. Era el número más interesante del
     archivo y ya no existe — sin pulseada no hay quien falle, así que no hay dos jugadores.

     Lo que queda por comprobar es lo contrario, y no es menos importante: que dos partidas
     distintas con la misma caña paguen lo mismo. Si dieran distinto, sería que quedó viva alguna
     memoria entre lances que nadie puso ahí a propósito. */
  const N = 30000;
  const a = jugar("junco", N).neto, b = jugar("junco", N).neto;
  console.log("");
  console.log("    dos partidas de " + N + " lances con la misma caña:");
  console.log("      " + a.toFixed(2) + " y " + b.toFixed(2) + " de plata por lombriz");
  console.log("");
  ok("dos partidas iguales pagan lo mismo: no queda memoria escondida entre lances",
    Math.abs(a - b) < 0.5, "diferencia de " + Math.abs(a - b).toFixed(3));
  console.log("       → la única memoria que SÍ queda es la deliberada: el récord por especie, las");
  console.log("         dos garantías (primer lance del día y ochenta sin épico) y la presión de");
  console.log("         la laguna. Todas ésas se apagan arriba con sinPiedad para medir la base.");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la plata del bolsillo no cuadra con la de la tabla"
  : "  Todo en orden: el invariante se cumple en la bolsa, no solo en la fórmula.");
process.exit(fallos ? 1 : 0);
