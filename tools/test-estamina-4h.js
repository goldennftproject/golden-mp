/* LA ESTAMINA SE LLENA ENTERA CADA 4 HORAS (24/8, dirección)
   « Que la estamina en zona negra se recargue full cada 4 horas. »
   Antes goteaba 1 punto cada 3 min pero SOLO con el juego abierto (el goteo vivía en el tick
   del HUD), así que cerrar la pestaña congelaba la barra — al revés de lo que un juego de
   relojes promete. Contratos:
     · en cuanto la barra baja del máximo arranca un reloj de 4 h;
     · al vencer, la estamina queda ENTERA (no gotea de a uno);
     · antes de las 4 h no sube ni un punto;
     · es RELOJ REAL: cerrar el navegador y volver funciona;
     · llena otra vez, el reloj se apaga (no queda una recarga fantasma pendiente);
     · gastar más NO reinicia el reloj: el que ya estaba corriendo manda.
     node tools/test-estamina-4h.js                                                            */
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
["isOpen", "refreshHud", "saveFarm", "refreshInv", "recalcFarmLevel"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, H = 3600000;
const STAM_FULL_H = vm.runInContext("STAM_FULL_H", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nCUATRO HORAS, Y SE LLENA ENTERA");
{
  ok("la ventana de recarga es de 4 h", STAM_FULL_H === 4, STAM_FULL_H + " h");
  G.combatXp = 0; G.stam = null; G.stamFullAt = 0;
  ctx.stamTick();
  const mx = ctx.stamMax();
  ok("de arranque, la estamina está llena", G.stam === mx, G.stam + "/" + mx);
  ok("y sin reloj corriendo", !G.stamFullAt);
  /* gastar arranca el reloj */
  ctx.stamGastar(30);
  ctx.stamTick();
  ok("al gastar, arranca el reloj de recarga", G.stamFullAt > 0);
  ok("que vence en 4 h", Math.abs(ctx.stamFullEn() - 4 * H) < 2000, (ctx.stamFullEn() / H).toFixed(2) + " h");
  const v0 = G.stam;
  /* a las 3h59 no subió NADA */
  desfase += 3 * H + 59 * 60000;
  ctx.stamTick();
  ok("a las 3 h 59 no subió ni un punto", G.stam === v0, G.stam + "/" + mx);
  desfase += 2 * 60000;
  ctx.stamTick();
  ok("pasadas las 4 h, queda ENTERA", G.stam === mx, G.stam + "/" + mx);
  ok("y el reloj se apaga", !G.stamFullAt);
}

console.log("\nGASTAR MÁS NO REINICIA EL RELOJ QUE YA CORRE");
{
  G.stam = ctx.stamMax(); G.stamFullAt = 0;
  ctx.stamGastar(10); ctx.stamTick();
  const vence = G.stamFullAt;
  desfase += 2 * H;
  ctx.stamGastar(10); ctx.stamTick();
  ok("tras gastar otra vez, sigue el reloj original", G.stamFullAt === vence,
    "faltan " + (ctx.stamFullEn() / H).toFixed(1) + " h");
  desfase += 2 * H + 60000;
  ctx.stamTick();
  ok("y al cumplirse, llena igual", G.stam === ctx.stamMax());
}

console.log("\nES RELOJ REAL: CERRAR EL NAVEGADOR NO CONGELA LA BARRA");
{
  G.stam = ctx.stamMax(); G.stamFullAt = 0;
  ctx.stamGastar(50); ctx.stamTick();
  const snap = JSON.parse(JSON.stringify(ctx.snapshot()));
  ok("el reloj viaja en el guardado", typeof snap.stamFullAt === "number" && snap.stamFullAt > 0);
  desfase += 5 * H;            // cinco horas con el juego CERRADO
  ctx.hydrate(snap);
  ctx.stamTick();              // el primer tick al volver
  ok("al volver, la estamina está llena", G.stam === ctx.stamMax(), G.stam + "/" + ctx.stamMax());
  ok("(y no hizo falta tener el juego abierto ni un segundo)", !G.stamFullAt);
}

console.log("\nY EL GOTEO VIEJO YA NO DECIDE NADA");
{
  const ST = fs.readFileSync("public/game/state.js", "utf8");
  const cuerpo = ST.slice(ST.indexOf("function stamTick"), ST.indexOf("function stamTick") + 700);
  ok("stamTick ya no suma de a un punto por segundos acumulados", !/G\.stam \+ 1/.test(cuerpo));
  ok("y decide por reloj (stamFullAt)", /stamFullAt/.test(cuerpo));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cuatro horas y la barra vuelve entera, mires o no.\n");
process.exit(fallos ? 1 : 0);
