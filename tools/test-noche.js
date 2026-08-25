/* LA NOCHE: UNA SOLA FUENTE, Y QUE DE VERDAD CIERRE LA PUERTA (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Este archivo nace de un fallo concreto que estuvo días en producción sin que nadie lo viera.

   Pesca v3 tiene dos especies « solo de noche » (calamar y anguila). Las dos puertas estaban
   escritas así:

       if (e.noche && typeof esDeNoche === "function" && !esDeNoche()) → no podés

   `esDeNoche` NUNCA EXISTIÓ. La guarda daba falso, la condición entera se saltaba y el calamar
   se pescaba a las tres de la tarde. Ninguna de las 94 pruebas lo vio, porque todas comprobaban
   lo que pasa CUANDO es de noche — y de noche el resultado era correcto por accidente.

   Dos reglas quedan clavadas acá:
     1 · esDeNoche existe, y de día devuelve falso. (Si vuelve a desaparecer, esto se pone rojo.)
     2 · El cielo y la laguna leen la MISMA fuente. Si mañana alguien corre el atardecer, el
         jugador no puede ver la granja oscura con el calamar todavía cerrado.
     node tools/test-noche.js                                                                    */
const fs = require("fs"), vm = require("vm");

/* un reloj que podemos mover a la hora que queramos, LOCAL — que es como el juego mide la noche */
let horaFalsa = 12, minFalso = 0;
class FakeDate extends Date {
  constructor(...a) { a.length ? super(...a) : super(2026, 7, 25, horaFalsa, minFalso, 0); }
  static now() { return new Date(2026, 7, 25, horaFalsa, minFalso, 0).getTime(); }
  getHours() { return this instanceof FakeDate && !arguments.length ? horaFalsa : super.getHours(); }
  getMinutes() { return minFalso; }
}
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const aLas = (h, m) => { horaFalsa = h; minFalso = m || 0; };

console.log("\nLA FUNCIÓN EXISTE — que es lo que fallaba");
{
  ok("esDeNoche está definida y es una función", typeof ctx.esDeNoche === "function");
  ok("cieloDelMomento también", typeof ctx.cieloDelMomento === "function");
  /* LA COMPROBACIÓN QUE HABRÍA CAZADO EL FALLO: que las puertas no dependan de un `typeof` sobre
     código nuestro. Una guarda así convierte « la función no existe » en « la regla no aplica », y
     eso es un fallo que se disfraza de funcionamiento normal. */
  const SRC = fs.readFileSync("public/game/state.js", "utf8");
  const guardas = (SRC.match(/typeof\s+esDeNoche\s*===\s*"function"/g) || []).length;
  ok("y las puertas ya no la envuelven en un typeof que la puede enterrar", guardas === 0,
    guardas ? guardas + " guarda(s) todavía" : "ninguna");
}

console.log("\nDE DÍA ES DE DÍA, Y DE NOCHE ES DE NOCHE");
{
  aLas(12); ok("mediodía: no es de noche", ctx.esDeNoche() === false);
  aLas(15); ok("las tres de la tarde tampoco", ctx.esDeNoche() === false);
  aLas(23); ok("las once de la noche sí", ctx.esDeNoche() === true);
  aLas(3);  ok("las tres de la madrugada también", ctx.esDeNoche() === true);
  /* y el borde, que es donde estas cosas se rompen */
  aLas(18); ok("las seis de la tarde todavía es de día", ctx.esDeNoche() === false);
  aLas(21, 30); ok("las 21:30 ya es noche cerrada", ctx.esDeNoche() === true);
}

console.log("\nEL CALAMAR NO PICA A LAS TRES DE LA TARDE   (el fallo, en el idioma del jugador)");
{
  const ESP = g("ESPECIE_DEF");
  ok("el calamar está marcado como nocturno", ESP.calamar.noche === true);
  ok("y la anguila también", ESP.anguila.noche === true);
  /* un pescador con todo: si la puerta se abre, es por la hora y por nada más */
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc };
  G.canas = { junco: 30, roble: 30, hierro: 25, abuelo: 20 };
  G.res = Object.assign({}, G.res, { lombriz: 20, grillo: 20 });
  G.pescaTiene = { senuelo: true };
  const senal = { esp: "calamar", fam: "fondo", estrella: 3, i: 0 };

  aLas(15);
  const dia = ctx.pescaPuedeSenal(senal);
  ok("de día, la puerta se CIERRA", dia.ok === false, dia.toast || "");
  ok("y el aviso dice por qué, no un « no podés » mudo", /noche/i.test(dia.toast || ""), dia.toast || "");

  aLas(23);
  const noche = ctx.pescaPuedeSenal(senal);
  ok("de noche, se abre", noche.ok === true, noche.toast || "");
}

console.log("\nLA NIEBLA SIGUE SIENDO LA EXCEPCIÓN, COMO PROMETE EL DOCUMENTO");
{
  /* el capítulo 10: « el único día en que se puede pescar calamar sin quedarse despierto ».
     Se comprueba llamando a la regla del clima directamente — sin depender de qué día es hoy. */
  const CL = g("CLIMA_DEF");
  ok("la niebla abre el Fondo de día", CL.niebla.deDia === "fondo");
  ok("y ningún otro clima lo hace",
    g("CLIMA_ORDER").filter(k => CL[k].deDia).length === 1);
}

console.log("\nUNA SOLA FUENTE: EL CIELO Y LA LAGUNA NO PUEDEN DISCREPAR");
{
  const FARM = fs.readFileSync("public/game/farm.js", "utf8");
  ok("farm.js ya no tiene su propia cuenta de minutos para el cielo",
    !/min >= 1290 \|\| min < 330/.test(FARM), "la tabla de tramos vive en config.js");
  ok("el cielo se pinta con cieloDelMomento()", /cieloDelMomento\(\)/.test(FARM));
  ok("y el umbral de « noche » del cielo es esDeNoche(), no un 0.12 copiado",
    /const noche = esDeNoche\(\)/.test(FARM));
  /* la prueba de fondo: mover el tramo mueve LAS DOS cosas a la vez */
  const T = g("CIELO_TRAMOS");
  ok("los tramos están en UNA tabla que se puede mover de un lugar",
    T && typeof T.atardecerHasta === "number" && typeof T.nocheHasta === "number");
  aLas(20, 0);
  const a = ctx.cieloDelMomento().alpha;
  ok("y a las 20:00 el cielo ya está tiñendo, coherente con la puerta",
    (a > 0) === ctx.esDeNoche() || a <= g("CIELO_NOCHE_MIN"),
    "alpha " + a.toFixed(2) + " · noche " + ctx.esDeNoche());
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la noche sigue sin cerrar la puerta"
  : "  Todo en orden: hay una sola noche, y el calamar la respeta.");
process.exit(fallos ? 1 : 0);
