/* LA BOLSA ABIERTA NO PUEDE MENTIR (24/8, dirección)
   « Cuando vendes un objeto no se quita de la bolsa: hay que darle clic o cerrar y abrir la
   bolsa para que desaparezca. »
   La causa concreta: sellItem refrescaba el MERCADO y el HUD pero no la BOLSA (sellDish sí lo
   hacía). Pero el fallo es de una FAMILIA — cualquier función que toque G.res/seeds/fish/dishes
   y se olvide de avisar deja la bolsa dibujando lo que ya no está. Contratos:
     · vender DESCUENTA de verdad y repinta la bolsa en el acto;
     · y además hay una RED en refreshHud: con la bolsa abierta, si su contenido cambió por el
       motivo que sea, se repinta sola;
     · la red es barata: si nada cambió, no repinta (firma, no fuerza bruta);
     · con la bolsa cerrada no gasta nada.
     node tools/test-bolsa-vender.js                                                            */
const fs = require("fs"), vm = require("vm");

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
/* un DOM de mentira suficiente: el campo de cantidad del mercado y poco más */
const campos = {};
ctx.document = { getElementById: (id) => campos[id] || null, addEventListener() {},
  querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const G = ctx.G;

/* contadores de repintado */
let pintadas = 0, slots = 0, hotbar = 0, abierta = true;
ctx.refreshInv = () => { pintadas++; ctx.window._bolsaFirma = ctx.bolsaFirma ? ctx.bolsaFirma() : null; };
ctx.syncSlots = () => { slots++; };
ctx.refreshHotbar = () => { hotbar++; };
ctx.isOpen = (id) => (id === "ov-inv" ? abierta : false);
ctx.$ = (id) => campos[id] || null;   // el atajo que usa el juego para leer el DOM
["toast", "log", "refreshMarket", "refreshHud", "sfx", "saveFarm", "recalcFarmLevel", "tutoEvent",
 "bindTrash", "setTxt", "setNum", "refreshStam", "refreshCombatBar", "checkCooking", "checkHorno"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
/* la firma vive en ui.js: se carga aparte porque necesita el DOM falso */
vm.runInContext(fs.readFileSync("public/game/ui.js", "utf8").match(/function bolsaFirma[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(fs.readFileSync("public/game/ui.js", "utf8").match(/function syncBolsaAbierta[\s\S]*?\n}\n/)[0], ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nVENDER DESCUENTA Y REPINTA LA BOLSA EN EL ACTO");
{
  G.tuto = { done: true }; G.res.madera = 10; G.plata = 0;
  campos["mq-madera"] = { value: "4" };
  vm.runInContext("marketCur = 'plata'", ctx);
  pintadas = 0; slots = 0; hotbar = 0;
  ctx.sellItem("madera");
  ok("la madera bajó de 10 a 6", Math.floor(G.res.madera) === 6, String(G.res.madera));
  ok("y cobró la plata", G.plata > 0, G.plata + " de plata");
  ok("repintó la bolsa (el objeto vendido se va YA)", pintadas >= 1, pintadas + " repintados");
  ok("y también los slots y la barra rápida", slots >= 1 && hotbar >= 1, "slots " + slots + " · hotbar " + hotbar);
}

console.log("\nLA RED: LA BOLSA ABIERTA SE SINCRONIZA SOLA");
{
  abierta = true; ctx.refreshInv();   // parte de un estado ya pintado
  pintadas = 0;
  ctx.syncBolsaAbierta();
  ok("sin cambios, NO repinta (la red es barata)", pintadas === 0);
  G.res.piedra = (G.res.piedra || 0) + 7;   // algo cambió por fuera, sin avisar a nadie
  ctx.syncBolsaAbierta();
  ok("si el contenido cambió, repinta sola", pintadas === 1, pintadas + " repintados");
  ctx.syncBolsaAbierta();
  ok("y no repinta dos veces por lo mismo", pintadas === 1);
}

console.log("\nCON LA BOLSA CERRADA NO GASTA NADA");
{
  abierta = false; pintadas = 0;
  G.res.piedra = (G.res.piedra || 0) + 3;
  ctx.syncBolsaAbierta();
  ok("cerrada, no repinta", pintadas === 0);
  abierta = true;
  ctx.syncBolsaAbierta();
  ok("y al abrirla se pone al día de una", pintadas === 1);
}

console.log("\nLA FIRMA VE TODO LO QUE PUEDE ESTAR EN LA BOLSA");
{
  const f0 = ctx.bolsaFirma();
  G.seeds.papa = (G.seeds.papa || 0) + 1;
  ok("las semillas cuentan", ctx.bolsaFirma() !== f0);
  const f1 = ctx.bolsaFirma();
  G.fish = G.fish || {}; G.fish.merluza = (G.fish.merluza || 0) + 1;   /* 31/8: el pez de prueba es uno del catálogo v4 — "comun" era una clave de la pesca v1 que la bolsa ya no conoce */
  ok("los peces cuentan", ctx.bolsaFirma() !== f1);
  const f2 = ctx.bolsaFirma();
  G.dishes = G.dishes || {}; G.dishes.papa_asada = (G.dishes.papa_asada || 0) + 1;
  ok("los platos cuentan", ctx.bolsaFirma() !== f2);
  const f3 = ctx.bolsaFirma();
  G.plata += 1000;
  ok("y la plata NO (no está en la bolsa: no hace repintar de gusto)", ctx.bolsaFirma() === f3);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: lo que vendiste deja de estar, sin cerrar nada.\n");
process.exit(fallos ? 1 : 0);
