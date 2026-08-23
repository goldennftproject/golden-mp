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
  /* uno lleno y otro con hambre: alimenta SOLO al que la necesita */
  G.animals[dos[1]].forEach(a => { a.feliz = 20; a.comidoAt = FakeDate.now(); });
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
