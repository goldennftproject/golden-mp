/* MARCADORES INDIVIDUALES DEL ESTABLO (20/9)
   El mundo tiene que repetir las cuatro verdades del Establo sin mezclar animales de una especie:
   hambre / comió esperando / comió listo / ciclo terminado con hambre. También custodia que el
   clic y el tooltip no vuelvan a perder el índice del animal. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
let reloj = 1_800_000_000_000, fallos = 0;
ctx.nowMs = () => reloj;
vm.runInContext("nowMs = window.nowMs;", ctx);
const ok = (n, c) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n); };
const d = g("ANIMAL_DEF.alpaca"), ciclo = d.cicloH * 3600000;

G.animals = { alpaca: [
  { prodAt: reloj, comidoAt: 0 },                         // hambre, esperando
  { prodAt: reloj, comidoAt: reloj },                     // comió, esperando
  { prodAt: reloj - ciclo, comidoAt: reloj - ciclo + 1 }, // comió, listo
  { prodAt: reloj - ciclo, comidoAt: 0 }                  // listo, con hambre
] };
const estadoMundo = (idx) => JSON.parse(g("JSON.stringify(FarmScene.prototype.estadoAnimalMundo.call({}, { k: 'alpaca', idx: " + idx + " }))"));
const promptMundo = (idx) => g("FarmScene.prototype.promptText.call({ estadoAnimalMundo: FarmScene.prototype.estadoAnimalMundo }, { type: 'animal', k: 'alpaca', idx: " + idx + " })");
const e0 = estadoMundo(0), e1 = estadoMundo(1), e2 = estadoMundo(2), e3 = estadoMundo(3);

console.log("\nESTADOS INDIVIDUALES\n");
ok("1: hambre mientras el ciclo corre", e0.hambriento && !e0.listo && !e0.cobrable);
ok("2: comió y espera sin recompensa", !e1.hambriento && !e1.listo && !e1.cobrable);
ok("3: comió y terminó: sí da material", !e2.hambriento && e2.listo && e2.cobrable);
ok("4: terminó con hambre: no da material", e3.hambriento && e3.listo && !e3.cobrable);
ok("el tooltip de hambre pide comida", /tiene hambre: dale/.test(promptMundo(0)));
ok("el tooltip de espera conserva el tiempo", /vuelve en/.test(promptMundo(1)));
ok("el tooltip listo invita a recoger", /Recoger Fibra/.test(promptMundo(2)));
ok("el tooltip tardío aclara alimentar antes de recoger", /antes de recoger/.test(promptMundo(3)));

console.log("\nCABLEADO DEL MUNDO\n");
const farm = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
const boot = fs.readFileSync(path.join(RAIZ, "public/game/boot.js"), "utf8");
ok("cada sprite conserva su índice", /\{ k, idx: n, spr, marca, marcaHambre/.test(farm));
ok("la marca de material deriva de cobrable individual", /a\.marca\.setVisible\(st\.cobrable\)/.test(farm));
ok("la marca de hambre tiene prioridad individual", /a\.marcaHambre\.setVisible\(st\.hambriento\)/.test(farm));
ok("el tick ya no usa animalListo por especie", !/animalListo\(a\.k\)/.test(farm));
ok("hover y clic preservan el índice", /idx: an\.idx/.test(farm));
ok("clic izquierdo recoge sólo el animal señalado", /recogerUno\(o\.k, st\.idx\)/.test(farm));
ok("clic derecho alimenta sólo el animal señalado", /alimentarUno\(an\.k, an\.idx\)/.test(farm));
ok("se precarga el icono universal de alimento", /animal_feed_marker\.png\?v=1/.test(boot));

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
