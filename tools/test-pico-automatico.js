/* EL PICO SE ELIGE SOLO (24/8, dirección)
   « Que las herramientas sean únicas: piedra para piedra, oro para oro, que no haya que
   señalar el pico a usar sino que se ajuste con clic en el recurso. » Contratos:
     · cada nodo usa SU pico exacto — « El pico pica lo que su nombre indica » (Suren, 31/8):
       ya no hay fallback, picar piedra jamás gasta el pico de oro (140 de plata sombra);
     · clicar oro agarra el de oro sin equipar nada; si no lo tenés, el aviso dice CUÁL falta;
     · el nivel de Minería se comprueba ANTES que la herramienta (si no sabés, no importa
       qué pico tengas);
     · lo que se GASTA es el pico elegido, no el "equipado" — la caja registradora y la
       puerta miran lo mismo;
     · y el pico de oro pide PLATA sin mover el ancla (presupuesto 140 desde el +1 de los nodos).
     node tools/test-pico-automatico.js                                                        */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
ctx.toast = () => {}; ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshForge", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;
const PICK_DEF = vm.runInContext("PICK_DEF", ctx), PRICE = vm.runInContext("PRICE", ctx),
      ORE_DEF = vm.runInContext("ORE_DEF", ctx), CD = vm.runInContext("CD", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const conPicos = (lista) => {
  G.picks = { owned: {}, dur: {}, eq: null };
  lista.forEach(id => { G.picks.owned[id] = true; G.picks.dur[id] = 5; });
  G.picks.eq = lista[lista.length - 1] || null;   // el "equipado" queda en el ÚLTIMO a propósito
};
const roca = { type: "rock" }, vetaOro = { type: "ore", ore: "oro" }, vetaBronce = { type: "ore", ore: "bronce" };

console.log("\nEL MÁS BARATO QUE SIRVA — NUNCA EL CARO");
{
  G.tuto = { done: true }; G.skills = G.skills || {};
  conPicos(["stone", "bronze", "gold"]);
  ok("para una roca elige el de piedra (aunque el equipado sea el de oro)",
    ctx.picoParaNodo(roca) === "stone", ctx.picoParaNodo(roca) + " · equipado: " + G.picks.eq);
  ok("para el oro elige el de oro", ctx.picoParaNodo(vetaOro) === "gold");
  ok("para el bronce elige el de bronce, no el de oro", ctx.picoParaNodo(vetaBronce) === "bronze");
  /* 31/8 (today.docx de Suren): « El pico pica lo que su nombre indica ». Antes había un
     fallback —sin el de piedra, la roca usaba el siguiente que sirviera— y eso permitía
     gastar el pico de oro en una roca de 20. Ahora el match es EXACTO: cada pico pica
     solo lo suyo, y si no tenés el que toca, no se pica. */
  conPicos(["gold"]);
  ok("el de oro NO pica la roca: cada pico pica solo lo suyo (Suren 31/8)", ctx.picoParaNodo(roca) === null);
  conPicos([]);
  ok("sin picos, no hay ninguno", ctx.picoParaNodo(roca) === null);
}

console.log("\nEL AVISO DICE CUÁL FALTA, NO UN GENÉRICO");
{
  conPicos(["stone"]);
  ok("el que hace falta para el oro es el de oro", ctx.picoQueHaceFalta(vetaOro) === "gold");
  ok("y para una roca, el de piedra", ctx.picoQueHaceFalta(roca) === "stone");
  G.skills.mining = 99999;   // que la skill no sea la que corta
  G.kitReclamado = true;     // sin esto el aviso del kit pisa a todos (y hace bien: es el primer consejo)
  const p = ctx.puedeAccion("mine", vetaOro);
  ok("con solo el de piedra, picar oro se niega", !p.ok);
  ok("y el aviso nombra el Pico de Oro", /Pico de Oro/.test(p.toast || ""), p.toast);
}

console.log("\nY LA SKILL TIENE SU PROPIA PUERTA (con el pico en la mano)");
{
  conPicos(["stone", "bronze", "gold", "diamond", "netherite"]);
  G.skills.mining = 0;   // sin nivel para el oro, pero CON el pico
  const p = ctx.puedeAccion("mine", vetaOro);
  ok("con el pico correcto pero sin nivel, se niega", !p.ok);
  ok("y el aviso habla de MINERÍA, no del pico", /Miner/i.test(p.toast || ""), p.toast);
}

console.log("\nSE GASTA EL PICO ELEGIDO (la puerta y la caja miran lo mismo)");
{
  const FARM = fs.readFileSync("public/game/farm.js", "utf8");
  const gastos = FARM.split("\n").filter(l => /G\.picks\.dur\[pk/.test(l)).length;
  ok("hay " + gastos + " puntos donde se gasta un pico", gastos >= 3);
  ok("y NINGUNO usa ya equippedPick()",
    !/const pk2? = equippedPick\(\)/.test(FARM), "todos preguntan picoParaNodo(o)");
  const ST = fs.readFileSync("public/game/state.js", "utf8");
  const bloque = ST.slice(ST.indexOf('if (tipo === "mine")'), ST.indexOf('if (tipo === "mine")') + 1400);
  ok("la puerta de minar también usa picoParaNodo", /picoParaNodo\(o\)/.test(bloque));
}

console.log("\nEL PICO DE ORO PIDE PLATA — Y EL ANCLA NO SE MUEVE");
{
  const gd = PICK_DEF.gold;
  ok("ahora cuesta plata", (gd.plata || 0) > 0, gd.plata + " de plata");
  const mats = Object.keys(gd.cost).reduce((a, m) => a + (PRICE[m] || 0) * gd.cost[m], 0);
  const total = mats + gd.plata;
  const od = ORE_DEF.oro, h = (od.cd || CD.rock) / 3600, yld = od.yield || 1;
  const neto = (yld * PRICE.oro - total) / h;
  /* 31/8: los nodos pasaron a +1 (today.docx) y para que picar no rindiera CERO se bajaron
     las TRES patas a la vez: yield, cd y pico, todo a la mitad. El presupuesto del pico de
     oro es ahora 140 —la mitad del 280 de antes— y el neto sigue clavado en su ancla. */
  ok("y su presupuesto es la mitad del de antes (140, por el +1 de los nodos)", total === 140, mats + " en materiales + " + gd.plata + " de plata = " + total);
  ok("así que la picada de oro sigue rindiendo 20/h EXACTO", Math.abs(neto - 20) < 0.5, neto.toFixed(1) + " plata/h");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: clic en el recurso, el pico correcto sale solo.\n");
process.exit(fallos ? 1 : 0);
