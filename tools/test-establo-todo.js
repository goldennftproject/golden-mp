/* LOS BOTONES «TODO» DEL ESTABLO (23/8, QoL)
   Con el cupo creciendo hasta 20 animales, alimentar y recoger especie por especie era un
   castigo. Contratos:
     · «Alimentar todo» alimenta a TODAS las especies con hambre, de una;
     · NO desperdicia: al que ya está en felicidad 100 no le da de comer;
     · «Recoger todo» cobra la producción lista de todas las especies a la vez;
     · sin hambrientos / sin nada listo, contestan (un clic nunca es mudo) y no tocan nada;
     · las funciones de una especie siguen intactas (los botones por fila no cambian).
     node tools/test-establo-todo.js                                                            */
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
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshEstablo", "bagFull", "celebrate", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, H = 3600000;
const ANIMAL_DEF = vm.runInContext("ANIMAL_DEF", ctx), ANIMAL_ORDER = vm.runInContext("ANIMAL_ORDER", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* dos especies con dos animales cada una, hambrientos y con la producción vencida */
function poblar(feliz, prodHaceH) {
  G.animals = {};
  const dos = ANIMAL_ORDER.slice(0, 2);
  dos.forEach(k => {
    const d = ANIMAL_DEF[k];
    G.animals[k] = [0, 1].map(() => ({
      desde: T0, feliz: feliz, comidoAt: FakeDate.now(),
      prodAt: FakeDate.now() - (prodHaceH != null ? prodHaceH : d.cicloH + 1) * H,
    }));
  });
  return dos;
}

console.log("\nALIMENTAR TODO: TODAS LAS ESPECIES DE UN CLIC");
{
  G.tuto = { done: true }; G.res = G.res || {};
  const dos = poblar(30);
  Object.keys(vm.runInContext("CROP_DEF", ctx)).forEach(c => G.res[c] = 0);
  // el PREFERIDO de cada especie, 2 de cada uno (con "cualquier cultivo" la alpaca sube 0,45:
  // la felicidad es proporcional al valor de lo que come, y eso ya lo cubre test-establo)
  dos.forEach(k => G.res[ANIMAL_DEF[k].come[0]] = 2);
  const f0 = dos.map(k => ctx.animalFelicidad(k));
  const r = ctx.establoAlimentarTodo();
  ok("alimentó a los 4 animales de las 2 especies", r.animales === 4, JSON.stringify(r));
  const f1 = dos.map(k => ctx.animalFelicidad(k));
  ok("y la felicidad subió en las dos", f1[0] > f0[0] && f1[1] > f0[1], f0.join("/") + " → " + f1.join("/"));
  ok("gastó justo lo que comieron, ni una unidad más",
    dos.every(k => Math.floor(G.res[ANIMAL_DEF[k].come[0]] || 0) === 0),
    dos.map(k => ANIMAL_DEF[k].come[0] + ":" + Math.floor(G.res[ANIMAL_DEF[k].come[0]] || 0)).join(" "));
  ok("y contestó con UN solo resumen del establo", avisos.filter(a => /🍽/.test(a)).length === 1, avisos.join(" · "));
}

console.log("\nNO DESPERDICIA: AL LLENO NO SE LE DA DE COMER");
{
  avisos.length = 0;
  const dos = poblar(100);           // los dos tipos a felicidad tope
  G.res.papa = 10;
  const r = ctx.establoAlimentarTodo();
  ok("no alimenta a nadie", (r.animales || 0) === 0);
  ok("y no gasta un solo cultivo", Math.floor(G.res.papa) === 10);
  void dos;
  ok("pero avisa (un clic nunca es mudo)", avisos.some(a => /hambre|cultivos/i.test(a)), avisos.join(" · "));
  /* 2/9 — DIETA ESTRICTA (dirección: « le acabo de dar alimentar todo y comió calabaza…
     debería ser solo trigo »): con hambre pero SOLO papa en la bolsa, NO come, y la papa
     queda intacta. La regla genérica del 14/8 quedó derogada. */
  G.animals[dos[1]].forEach(a => { a.feliz = 20; a.comidoAt = FakeDate.now(); });
  avisos.length = 0;
  const rEstricta = ctx.establoAlimentarTodo();
  ok("con hambre y solo papa en la bolsa, NO come (dieta estricta)",
    rEstricta.animales === 0 && Math.floor(G.res.papa) === 10, JSON.stringify(rEstricta));
  /* uno lleno y otro con hambre: alimenta SOLO al que la necesita — con SU comida */
  G.res[ANIMAL_DEF[dos[1]].come[0]] = 5;
  avisos.length = 0;
  const r2 = ctx.establoAlimentarTodo();
  ok("con uno lleno y otro con hambre, come solo el hambriento", r2.animales === 2 && r2.especies === 1,
    JSON.stringify(r2));
}

console.log("\nRECOGER TODO: LA PRODUCCIÓN DE TODAS LAS ESPECIES");
{
  avisos.length = 0;
  const dos = poblar(80);            // producción vencida en las dos
  dos.forEach(k => G.res[ANIMAL_DEF[k].mat] = 0);
  G.invRows = 20;                    // bolsa amplia: que no corte el reparto
  const r = ctx.establoRecogerTodo();
  ok("cobró las dos especies", r.total === 2, JSON.stringify(r));
  ok("y los materiales entraron a la bolsa", dos.every(k => (G.res[ANIMAL_DEF[k].mat] || 0) > 0),
    dos.map(k => ANIMAL_DEF[k].mat + ":" + G.res[ANIMAL_DEF[k].mat]).join(" "));
  // (puede colarse un toast de OTRO sistema — la XP de Ganadería desbloquea planos — y está bien)
  ok("un solo resumen para toda la cosecha", avisos.filter(a => /🧺/.test(a)).length === 1, avisos.join(" · "));
  avisos.length = 0;
  const r2 = ctx.establoRecogerTodo();
  ok("recién cobrado, no hay nada que recoger", (r2.total || 0) === 0);
  ok("y lo dice", avisos.some(a => /listo/i.test(a)), avisos.join(" · "));
}

console.log("\nCADA ANIMAL ES UNO   (8/9, dirección: « se alimentan por separado »)");
{
  /* « los animales se alimentan por separado, y el tiempo de la fibra es por separado — no
     juntás cada animal con su CD ». Los datos ya eran individuales; lo que agrupaba era la
     pantalla. Estas comprobaciones son las que atrapan una vuelta atrás. */
  const dos = poblar(50);
  const k = dos[0], d = ANIMAL_DEF[k];
  G.res[d.come[0]] = 10;
  const f0 = [ctx.animalFelizDe(G.animals[k][0]), ctx.animalFelizDe(G.animals[k][1])];

  ok("alimentar a UNO no toca al otro", (() => {
    ctx.alimentarUno(k, 0);
    return ctx.animalFelizDe(G.animals[k][0]) > f0[0] && ctx.animalFelizDe(G.animals[k][1]) === f0[1];
  })());
  ok("y gasta un solo cultivo", Math.floor(G.res[d.come[0]]) === 9);

  /* el reloj: cobrarle a uno reinicia SU ciclo y deja el del otro donde estaba */
  const listo0 = ctx.animalFaltaDe(k, 0) <= 0, listo1 = ctx.animalFaltaDe(k, 1) <= 0;
  ok("los dos arrancan listos (producción vencida)", listo0 && listo1);
  const dio = ctx.recogerUno(k, 0);
  ok("recoger a UNO paga lo suyo", dio > 0, "+" + dio);
  ok("y su reloj vuelve a empezar", ctx.animalFaltaDe(k, 0) > 0);
  ok("mientras el del otro sigue listo — relojes separados", ctx.animalFaltaDe(k, 1) <= 0);

  /* el rinde es el de SU felicidad, no el de la media: es lo que la pantalla vieja escondía.
     OJO con qué especie se mide: con porCiclo 1 la felicidad NO PUEDE cambiar el rinde —
     max(1, round(1 × 0,5)) sigue siendo 1—, así que hay que probarlo en una que dé más de una
     unidad por ciclo. Ese hallazgo tiene su propia comprobación abajo. */
  const kMulti = ANIMAL_ORDER.find(x => ctx.animalPorCiclo(x) > 1);
  if (kMulti) {
    G.animals[kMulti] = [0, 1].map(() => ({ desde: T0, feliz: 0, comidoAt: FakeDate.now(), prodAt: T0 }));
    G.animals[kMulti][0].feliz = 100;
    ok("un animal feliz rinde más que uno descuidado, aunque sean de la misma especie",
      ctx.animalRinde(kMulti, 0) > ctx.animalRinde(kMulti, 1),
      kMulti + ": " + ctx.animalRinde(kMulti, 0) + " vs " + ctx.animalRinde(kMulti, 1));
  }

  /* ── EL HALLAZGO DEL 8/9, dejado a la vista para que se decida y no se olvide ──────────
     Con porCiclo = 1 la felicidad no mueve el rinde: FELIZ_MIN_PROD (0,5) sobre una unidad
     redondea a 1 igual que la unidad entera. O sea que en TRES de las cuatro especies
     alimentar no cambia lo que producen — y el ancla del 19/8 se escribió justamente para
     que « alimentar siempre gane y descuidarlo nunca ». Este test no lo arregla (mover
     rindes es decisión de dirección y del diseñador): lo DELATA, con nombre y apellido. */
  const inertes = ANIMAL_ORDER.filter(x => ctx.animalPorCiclo(x) === 1);
  ok("AVISO — especies donde la felicidad no cambia el rinde (porCiclo 1)", true,
    inertes.length ? inertes.join(", ") + " → alimentarlas no altera lo que producen" : "ninguna");

  /* y la pantalla los pinta de a uno */
  const fs = require("fs");
  const UI = fs.readFileSync(require("path").join(__dirname, "..", "public/game/ui.js"), "utf8");
  ok("el establo pinta una fila POR ANIMAL", /for \(let i = 0; i < cant; i\+\+\)/.test(UI));
  ok("con el botón de ese animal, no el de la especie", /data-feed1=/.test(UI) && /data-take1=/.test(UI));
  ok("y ya no dice « media » en la felicidad de la fila", !/\(media\)/.test(UI));
}

console.log("\nY LOS BOTONES POR ESPECIE SIGUEN INTACTOS");
{
  avisos.length = 0;
  const dos = poblar(40);
  G.res[ANIMAL_DEF[dos[0]].come[0]] = 5;
  const dados = ctx.alimentarAnimal(dos[0]);
  ok("alimentarAnimal(k) sigue alimentando su especie", dados === 2, String(dados));
  ok("y sigue avisando por su cuenta", avisos.length >= 1);
  const n = ctx.recogerAnimal(dos[0]);
  ok("recogerAnimal(k) sigue cobrando su especie", n > 0, String(n));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: un clic y el establo entero atendido.\n");
process.exit(fallos ? 1 : 0);
