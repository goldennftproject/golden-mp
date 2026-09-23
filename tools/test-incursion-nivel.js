/* LA INCURSIÓN RESPETA EL NIVEL DEL CUARTO, COMO A PIE                        (23/9, diseñador)
   « pasar al 2.º cuarto de Zona Negra pide nivel 10; no tiene sentido que por tener una espada
     de hierro pueda ir a la zona 2 siendo nivel 6. Que en la incursión de un clic deba tener
     nivel 10, lo mismo para las otras: que se respete el nivel ».
   Una sola tabla: cada incursión apunta a un cuarto (INCURSIONES[k].zona) y pide el nivel de
   Combate que ZONA_DEF le pide al que entra caminando.
     node tools/test-incursion-nivel.js                                                       */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map,
  isNaN, isFinite, parseInt, parseFloat, performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "refreshIncursion", "recalcFarmLevel", "tutoEvent", "statAdd"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const INC = g("INCURSIONES"), ZONA = g("ZONA_DEF"), ORDER = g("INC_ORDER");
function nivelCombate(l) { let acc = 0; for (let k = 2; k <= l; k++) acc += ctx.skillNeed(k); G.combatXp = acc; return ctx.combatInfo().lvl; }
function conEspadaDeHierro() {
  G.weapons = { espada_hierro: { dur: 100 } }; G.armaEq = "espada_hierro";
  if (typeof ctx.equipArma === "function") try { ctx.equipArma("espada_hierro"); } catch (e) {}
  G.incursion = null; G.incDia = null; G.tuto = { done: true }; avisos.length = 0;
}

console.log("\nUNA SOLA TABLA DE NIVELES\n");
{
  ok("cada incursión apunta a un cuarto que existe", ORDER.every(k => INC[k].zona && ZONA[INC[k].zona]), ORDER.map(k => k + "→" + INC[k].zona).join(" "));
  ok("y pide el nivel de ese cuarto", ORDER.every(k => ctx.incNivelReq(k) === (ZONA[INC[k].zona].lvl || 1)),
    ORDER.map(k => k + ":" + ctx.incNivelReq(k)).join(" "));
  ok("el 2.º cuarto pide 10, como dijo el diseñador", ctx.incNivelReq("zn2") === 10);
}

console.log("\nNIVEL 6 CON ESPADA DE HIERRO: ZONA I SÍ, ZONA II NO\n");
{
  conEspadaDeHierro();
  ok("(el arnés dejó Combate en 6)", nivelCombate(6) === 6, ctx.combatInfo().lvl);
  ok("la puerta a pie y la de la incursión dicen lo mismo", ctx.incPuedeNivel("zn1") === ctx.zonaPuedeEntrar("pantano") && ctx.incPuedeNivel("zn2") === ctx.zonaPuedeEntrar("piedra"));
  ok("Zona I se puede", ctx.incPuedeNivel("zn1") === true);
  ok("Zona II no", ctx.incPuedeNivel("zn2") === false);
  ctx.incSalir("zn2");
  ok("salir a Zona II rebota y dice el nivel que pide", !G.incursion && avisos.some(t => /Combate 10/.test(t)), avisos[avisos.length - 1]);
  ok("y no gastó el cupo del día", !G.incDia || G.incDia.n === 0);
}

console.log("\nCON NIVEL 10, ZONA II SE ABRE (LO DEMÁS SIGUE IGUAL)\n");
{
  conEspadaDeHierro(); nivelCombate(10);
  ok("Zona II ya se puede por nivel", ctx.incPuedeNivel("zn2") === true);
  ok("Zona III todavía no (pide " + ctx.incNivelReq("zn3") + ")", ctx.incPuedeNivel("zn3") === false);
  ok("la Guarida tampoco (pide " + ctx.incNivelReq("guarida") + ")", ctx.incPuedeNivel("guarida") === false);
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ la incursión pide el mismo nivel que la puerta del cuarto\n");
process.exit(fallos ? 1 : 0);
