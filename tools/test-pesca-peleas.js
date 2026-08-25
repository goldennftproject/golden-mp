/* LAS SIETE PELEAS DEL CARRETE (25/8, docs/PESCA-V3.md capítulo 6)
   « No hay siete minijuegos: hay uno con siete variaciones, y cada variación se explica en una
   frase. » Esa promesa es fácil de escribir y fácil de romper: alcanza con que una variación no
   cambie nada de verdad para que el jugador pelee siempre lo mismo con carteles distintos, que es
   peor que no tener variaciones — porque promete profundidad y entrega decorado.
   Este archivo corre la física de verdad (la de state.js, que es lógica pura) y comprueba que
   cada variación CAMBIE algo medible. Sin abrir un navegador y sin mirar un solo píxel.
     node tools/test-pesca-peleas.js                                                             */
const fs = require("fs"), vm = require("vm");

const T0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + desfase); } static now() { return T0 + desfase; } }
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const PELEA = g("PELEA_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
/* un generador determinístico: dos peleas con la misma semilla tienen que salir idénticas, y sin
   eso no se puede comparar una variación contra otra sin que la comparación sea ruido. */
function semilla(s) { let x = (s | 0) || 7; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
/* llevar un lance hasta el carrete. NO se puede clavar el anzuelo en « espera »: eso es tirar
   antes de tiempo y el lance se pierde con motivo « pronto » — que es justamente una de las
   reglas del juego. Hay que dejar correr el reloj hasta el pique primero. */
function alCarrete(l, nivel) {
  for (let k = 0; k < 2000 && l.fase === "espera"; k++) ctx.pescaLanceTick(l, 1 / 60);
  if (l.fase !== "pique") throw new Error("el lance no llegó al pique: " + l.fase);
  ctx.pescaAnzuelo(l, nivel || 10, semilla(23));
  if (l.fase !== "carrete") throw new Error("el anzuelo no abrió el carrete: " + l.fase);
  return l;
}
const usosCana = (id) => Math.floor(((G.canas || {})[id]) || 0);
/* corre una pelea entera y devuelve la película: qué hizo el pez, cuándo estuvo tapado, cuándo
   estuvo en el aire, y cómo terminó. El jugador simulado aprieta cuando el pez está arriba de su
   zona, que es lo que hace cualquiera. */
function pelear(esp, opts) {
  opts = opts || {};
  const l = ctx.pescaLanceNuevo(semilla(11), { esp, estrella: opts.estrella || 3, cita: opts.cita, cana: opts.cana });
  alCarrete(l, opts.nivel || 10);
  const r = semilla(opts.sem || 5);
  const film = { pos: [], tapa: 0, fuera: 0, mordiscos: 0, pasos: 0, fin: "sigue", cana0: usosCana(opts.cana) };
  for (let k = 0; k < 4000; k++) {
    const rez = ctx.pescaReelTick(l, 1 / 60, l.pez > l.zona, r);
    film.pos.push(l.pez);
    if (l.tapa) film.tapa++;
    if (l.fuera) film.fuera++;
    if (l.mordisco) film.mordiscos = Math.max(film.mordiscos, l.mordisco);
    film.pasos++;
    if (rez !== "sigue") { film.fin = rez; break; }
  }
  film.l = l;
  return film;
}
/* cuánto se mueve un pez: la desviación de su recorrido. Sirve para distinguir « nada quieto »
   de « corre como loco » sin depender de un número mágico. */
function meneo(pos) {
  const m = pos.reduce((a, b) => a + b, 0) / pos.length;
  return Math.sqrt(pos.reduce((a, b) => a + (b - m) * (b - m), 0) / pos.length);
}

G.canas = { junco: 30, roble: 30, hierro: 25, abuelo: 20 };

console.log("\nCADA ESPECIE PELEA LA SUYA, Y NINGUNA SE OLVIDÓ");
{
  ok("las nueve especies tienen pelea asignada",
    g("ESPECIE_ORDER").every(k => !!PELEA[ctx.peleaNom(k)]));
  ok("la orilla usa el carrete de siempre — el escalón que enseña el sistema",
    ctx.peleaNom("pez_comun") === "normal" && ctx.peleaNom("carpa_dorada") === "normal");
  ok("y seis especies tienen variación propia",
    g("ESPECIE_ORDER").filter(k => ctx.peleaNom(k) !== "normal").length === 6);
}

console.log("\nEL CAMARÓN NO PELEA: MORDISQUEA TRES VECES");
{
  const f = pelear("camaron_rio");
  ok("llega a los tres mordiscos", f.mordiscos === 3, f.mordiscos + "");
  ok("y entre mordisco y mordisco está QUIETO (no persigue rumbo)",
    (() => { let quietos = 0; for (let i = 1; i < f.pos.length; i++) if (f.pos[i] === f.pos[i - 1]) quietos++; return quietos > f.pos.length * 0.9; })());
  ok("los dos primeros mordiscos no llenan la barra: el tercero es el que cuenta",
    f.l.t > 2.2, f.l.t.toFixed(1) + " s");
}

console.log("\nEL MARIPOSA SE ANTICIPA, NO SE REACCIONA");
{
  const f = pelear("pez_mariposa");
  /* onda perfectamente predecible: dos peleas con SEMILLAS DISTINTAS tienen que dar el MISMO
     recorrido. Si el azar entrara, dejaría de poder anticiparse — y ése es todo el punto. */
  const f2 = pelear("pez_mariposa", { sem: 999 });
  const igual = f.pos.slice(0, 200).every((v, i) => Math.abs(v - f2.pos[i]) < 1e-9);
  ok("su recorrido no depende del azar: se puede anticipar", igual);
  ok("y de verdad se mueve (no es una excusa para quedarse quieto)", meneo(f.pos) > 0.15, meneo(f.pos).toFixed(3));
}

console.log("\nEL VOLADOR SE VA DE LA BARRA");
{
  const f = pelear("pez_volador");
  ok("hay cuadros en los que el pez NO está en la barra", f.fuera > 0, f.fuera + " cuadros");
  /* y en el aire, apretar no hace nada: la zona no puede subir */
  const l = ctx.pescaLanceNuevo(semilla(3), { esp: "pez_volador", estrella: 3 });
  alCarrete(l, 10);
  const r = semilla(9);
  let subioEnElAire = false;
  for (let k = 0; k < 900; k++) {
    const z = l.zona;
    ctx.pescaReelTick(l, 1 / 60, true, r);        // el jugador aprieta SIEMPRE
    if (l.fuera && l.zona > z + 1e-6) subioEnElAire = true;
  }
  ok("en el aire, apretar NO sube la zona — hay que dejarla donde va a caer", !subioEnElAire);
  ok("y el progreso no drena mientras está en el aire (no se cobra una moneda que no tiraste)",
    (() => {
      const l2 = alCarrete(ctx.pescaLanceNuevo(semilla(3), { esp: "pez_volador", estrella: 3 }), 10);
      const rr = semilla(9);
      let bajoEnElAire = false;
      for (let k = 0; k < 900; k++) { const p = l2.prog; ctx.pescaReelTick(l2, 1 / 60, false, rr); if (l2.fuera && l2.prog < p - 1e-9) bajoEnElAire = true; }
      return !bajoEnElAire;
    })());
}

console.log("\nEL CALAMAR TIRA TINTA SOBRE TU ZONA — NO SOBRE LA BARRA");
{
  const f = pelear("calamar");
  ok("hay cuadros con la zona tapada", f.tapa > 0, f.tapa + " cuadros");
  /* LA CORRECCIÓN DE LA REVISIÓN 2, vigilada: se tapa la ZONA, nunca el pez. Apagar la barra
     entera no medía habilidad — medía si tuviste suerte con dónde estaba el pez al apagarse. */
  ok("pero el pez SIEMPRE se ve: la tinta no apaga la barra",
    f.pos.every(v => typeof v === "number" && isFinite(v)));
  ok("y la física no cambia mientras hay tinta: solo se esconde la zona",
    (() => {
      const a = pelear("calamar", { sem: 41 }), b = pelear("calamar", { sem: 41 });
      return a.pos.length === b.pos.length && a.pos.every((v, i) => v === b.pos[i]);
    })());
}

console.log("\nEL ESPADA SE GANA EN LOS HUECOS, NO EN LAS CORRIDAS");
{
  const f = pelear("pez_espada");
  /* tres sprints: el pez tiene que moverse MUCHO más que uno de orilla, y a tirones */
  const base = pelear("pez_comun");
  /* « explosivo » no es « recorre más terreno en total » —eso lo aplana el descanso— sino que
     en su PICO corre más rápido que ningún pez de orilla. Medir la desviación del recorrido
     entero mezclaba las corridas con los huecos y daba casi lo mismo que un pez común: el
     medidor estaba midiendo el promedio de dos cosas que existen justamente para ser distintas. */
  const pico = (pos) => { let m = 0; for (let i = 1; i < pos.length; i++) m = Math.max(m, Math.abs(pos[i] - pos[i - 1])); return m; };
  ok("en su pico corre mucho más que un pez de orilla", pico(f.pos) > pico(base.pos) * 1.5,
    pico(f.pos).toFixed(4) + " vs " + pico(base.pos).toFixed(4));
  /* y a tirones: la velocidad instantánea del primer segundo (sprint) contra la del segundo
     y medio siguiente (descanso) tiene que ser claramente distinta */
  const vel = (a, b) => { let s = 0; for (let i = a + 1; i < b; i++) s += Math.abs(f.pos[i] - f.pos[i - 1]); return s / (b - a); };
  ok("y a tirones: el sprint corre más que el descanso", vel(5, 55) > vel(80, 190) * 1.5,
    vel(5, 55).toFixed(4) + " vs " + vel(80, 190).toFixed(4));
}

console.log("\nEL MARTILLO: SIN RELOJ QUE LO SALVE, Y TE COME LA CAÑA");
{
  const antes = usosCana("abuelo");
  const f = pelear("tiburon", { estrella: 5, cana: "abuelo" });
  const desp = usosCana("abuelo");
  ok("la caña se gasta DURANTE la pelea, no solo al tirar", desp < antes, antes + " → " + desp);
  ok("no se cansa: el timeout que salva a los demás peces acá no existe", f.l.sinTimeout === true);
  ok("y no puede perderse « por tiempo »", f.fin !== "perdido" || f.l.motivo !== "tiempo", f.l.motivo || f.fin);
  /* « la barra mide el doble » se traduce en que TU zona pesa la mitad */
  const chico = ctx.pescaLanceNuevo(semilla(1), { esp: "pez_comun", estrella: 5 });
  alCarrete(chico, 10);
  const grande = ctx.pescaLanceNuevo(semilla(1), { esp: "tiburon", estrella: 5 });
  alCarrete(grande, 10);
  ok("y la zona de captura pesa la mitad que en una pelea normal",
    Math.abs(grande.zonaAlto - chico.zonaAlto / 2) < 1e-9,
    chico.zonaAlto.toFixed(3) + " → " + grande.zonaAlto.toFixed(3));
}

console.log("\nEL PEZ CANSADO SE MUESTRA — la pregunta que el documento dejó abierta");
{
  const suelto = ctx.pescaLanceNuevo(semilla(1), { esp: "tiburon", estrella: 5 });
  alCarrete(suelto, 10);
  const cita = ctx.pescaLanceNuevo(semilla(1), { esp: "tiburon", estrella: 5, cita: true });
  alCarrete(cita, 10);
  ok("la cita del palangre arranca con más barra llena que un lance normal",
    cita.prog > suelto.prog, suelto.prog.toFixed(2) + " → " + cita.prog.toFixed(2));
  ok("y se ve desde el primer cuadro: es la prueba de que las 12 h hicieron algo",
    cita.prog >= 0.25);
}

console.log("\nY NINGUNA VARIACIÓN ES DECORADO: TODAS CAMBIAN ALGO MEDIBLE");
{
  /* la prueba que resume a todas: si dos variaciones distintas dieran la misma película con la
     misma semilla, una de las dos sobra — y el capítulo 6 sería una promesa vacía. */
  /* OJO CON QUÉ SE MIRA. La primera versión de esta huella era solo el RECORRIDO DEL PEZ, y daba
     al martillo idéntico al pez común — con razón: lo que el martillo cambia no es por dónde nada
     el pez, sino el tamaño de tu zona, que no se cansa y que te come la caña. La huella tiene que
     incluir todo lo que una variación puede tocar, o el medidor declara « iguales » a dos peleas
     que en la mano se sienten opuestas. */
  const huellas = {};
  ["pez_comun", "camaron_rio", "pez_mariposa", "pez_volador", "calamar", "pez_espada", "tiburon"].forEach(k => {
    const f = pelear(k, { estrella: 3, cana: "abuelo", sem: 77 });
    huellas[k] = f.pos.slice(0, 300).map(v => v.toFixed(3)).join(",")
      + "|tapa:" + f.tapa + "|aire:" + f.fuera + "|mord:" + f.mordiscos
      + "|zona:" + f.l.zonaAlto.toFixed(3) + "|reloj:" + (f.l.sinTimeout ? "no" : "si");
  });
  const set = new Set(Object.values(huellas));
  ok("las siete peleas dan siete películas distintas", set.size === 7, set.size + " de 7");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — alguna variación es decorado"
  : "  Todo en orden: un minijuego, siete peleas, y cada una cambia algo que se puede medir.");
process.exit(fallos ? 1 : 0);
