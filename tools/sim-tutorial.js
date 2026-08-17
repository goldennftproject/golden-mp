/* SIMULADOR DEL TUTORIAL que LEE EL JUEGO (16/8).
   A diferencia de los sim-tuto anteriores (que copiaban las tablas a mano y se
   desincronizaban a los dos días), este carga public/game/state.js y usa los valores
   REALES: CROP_DEF, BUILD_DEF, TOOL_CRAFT, PICK_DEF, CD, KIT_INICIAL, seedDailyMax…
   Responde tres cosas: ¿la cadena CIERRA (nunca se traba)?, ¿cuánto tarda?, ¿con qué
   márgenes de plata y herramientas?
   Correr: node tools/sim-tutorial.js */
const fs = require("fs"), vm = require("vm"), path = require("path");
const noop = () => {};
const ctx = { window: { NICK: "sim" }, GF: { spr: () => "" }, console, Math, Date, JSON, Object, Array, String, Number,
  toast: noop, log: noop, sfx: null, isOpen: () => false, refreshHud: noop, saveFarm: noop, celebrate: null,
  refreshForge: noop, forgeWork: noop, syncSlots: noop, refreshInv: noop, refreshHotbar: noop, refreshSeedShop: noop,
  uiRefreshAfterBreak: noop, localStorage: { getItem: () => null, setItem: () => {} } };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/game/state.js"), "utf8"), ctx, { filename: "state.js" });
vm.runInContext(`globalThis.__T = { CROP_DEF, BUILD_DEF, TOOL_CRAFT, PICK_DEF, RECIPE_DEF, TUTO_STEPS, KIT_INICIAL };`, ctx);
const T = ctx.__T, G = ctx.window.G;

const PAPA = T.CROP_DEF.papa;
// comparación: PAPA_MIN / PAPA_PRECIO / PAPA_XP permiten correr la MISMA cadena con los
// valores viejos (PAPA_MIN=9 PAPA_PRECIO=3 node tools/sim-tutorial.js)
if (process.env.PAPA_MIN) PAPA.growH = parseFloat(process.env.PAPA_MIN) / 60;
if (process.env.PAPA_PRECIO) PAPA.price = parseFloat(process.env.PAPA_PRECIO);
const CD = ctx.CD;                               // { tree, rock } en segundos
const HACHA = T.TOOL_CRAFT.axe.plata;
const PICO = { plata: T.PICK_DEF.stone.plata, madera: T.PICK_DEF.stone.cost.madera || 0 };
const NEED = { store: T.BUILD_DEF.store.cost, horno: T.BUILD_DEF.horno.cost, cocina: T.BUILD_DEF.cocina.cost };
const COOK_S = T.RECIPE_DEF.papa_asada.cookS;
const COOK_RES = T.RECIPE_DEF.papa_asada.res;

// --- estado del jugador ---
let t = 0, plata = 3, madera = 0, piedra = 0, papas = 0, seeds = 0, platos = 0;
let hachas = T.KIT_INICIAL.axe, picos = T.KIT_INICIAL.pico;
let arboles = [0, 0], rocas = [0, 0];            // 2 árboles + 2 rocas abiertos de arranque
let plots = [0, 0, 0];                            // 3 parcelas: hora en que están listas (0 = vacía)
let compras = 0, vendidas = 0, talas = 0, picadas = 0, hachasCraft = 0, picosCraft = 0;
let reservaPapas = 1;   // cuántas papas NO se venden (la fija el paso en curso)
let trabado = null;
const filas = [];
const cupo = () => { G.plotsOwned = 3; return ctx.seedDailyMax(); };
const fmt = s => s < 90 ? Math.round(s) + " s" : s < 5400 ? (s / 60).toFixed(1) + " min" : (s / 3600).toFixed(1) + " h";

function tick(dt) {   // avanza el mundo: cosecha y replanta papa mientras haya plata y cupo
  const fin = t + dt;
  while (t < fin) {
    t += 5;
    for (let i = 0; i < plots.length; i++) {
      if (plots[i] && plots[i] <= t) { papas++; plots[i] = 0; }
      if (!plots[i]) {
        if (seeds <= 0 && plata >= PAPA.seedCost && compras < cupo()) { plata -= PAPA.seedCost; seeds++; compras++; }
        if (seeds > 0) { seeds--; plots[i] = t + PAPA.growH * 3600; }
      }
    }
    // jugador racional: vende el EXCEDENTE y con esa plata sigue comprando semillas. La
    // reserva la fija cada paso (el 3 pide juntar 3 papas: ahí no se vende nada).
    if (papas > reservaPapas) { plata += (papas - reservaPapas) * PAPA.price; vendidas += papas - reservaPapas; papas = reservaPapas; }
    if (t > 86400 * 3) { trabado = trabado || "más de 3 días"; return; }   // candado anti-cuelgue
  }
}
function venderHasta(meta, reserva) {   // vende papas (dejando `reserva`) hasta juntar `meta` de plata
  let vueltas = 0;
  while (plata < meta) {
    if (papas > (reserva || 0)) { papas--; plata += PAPA.price; vendidas++; }
    else { tick(30); if (++vueltas > 20000) { trabado = trabado || ("sin plata para " + meta); return; } }
  }
}
function talar(n) {
  let vueltas = 0;
  while (madera < n) {
    if (hachas <= 0) { venderHasta(HACHA, 1); if (trabado) return; plata -= HACHA; hachas++; hachasCraft++; }
    const i = arboles.findIndex(a => a <= t);
    if (i < 0) { tick(Math.max(5, Math.min(...arboles) - t)); if (++vueltas > 20000) { trabado = "talando"; return; } continue; }
    hachas--; madera++; talas++; arboles[i] = t + CD.tree; tick(5);
  }
}
function picar(n) {
  let vueltas = 0;
  while (piedra < n) {
    if (picos <= 0) {
      if (PICO.madera > 0 && madera < PICO.madera) { talar(PICO.madera - madera); if (trabado) return; }
      venderHasta(PICO.plata, 1); if (trabado) return;
      plata -= PICO.plata; madera -= PICO.madera; picos++; picosCraft++;
    }
    const i = rocas.findIndex(r => r <= t);
    if (i < 0) { tick(Math.max(5, Math.min(...rocas) - t)); if (++vueltas > 20000) { trabado = "picando"; return; } continue; }
    picos--; piedra++; picadas++; rocas[i] = t + CD.rock; tick(5);
  }
}
const paso = (txt, fn) => { if (trabado) return; const ini = t; fn(); filas.push([txt, t - ini, t]); };

// ---- LA CADENA REAL (los 20 pasos de TUTO_STEPS) ----
paso("0 Abrí el baúl (kit de bienvenida)", () => tick(10));
paso("1 Comprá 3 semillas de papa", () => { while (seeds < 3 && plata >= PAPA.seedCost && compras < cupo()) { plata -= PAPA.seedCost; seeds++; compras++; } tick(10); });
paso("2 Plantá las 3 papas", () => { for (let i = 0; i < 3; i++) if (seeds > 0) { seeds--; plots[i] = t + PAPA.growH * 3600; } tick(5); });
paso("3 Cosechá las 3 papas", () => { reservaPapas = 3; let v = 0; while (papas < 3) { tick(10); if (++v > 20000) { trabado = "esperando la cosecha"; return; } } });
paso("4 Vendé las 3 papas", () => { for (let i = 0; i < 3 && papas > 0; i++) { papas--; plata += PAPA.price; vendidas++; } reservaPapas = 1; tick(10); });
paso("5 Colocá el plano de la Herrería", () => tick(20));
paso("6 Juntá " + NEED.store.madera + " madera", () => talar(NEED.store.madera));
paso("7 Juntá " + NEED.store.piedra + " piedra", () => picar(NEED.store.piedra));
paso("8 Depositá y construí la Herrería", () => { madera -= NEED.store.madera; piedra -= NEED.store.piedra; tick(15); });
paso("9 Colocá el plano del Horno", () => tick(20));
paso("10 Juntá " + NEED.horno.madera + " madera", () => talar(NEED.horno.madera));
paso("11 Juntá " + NEED.horno.piedra + " piedra", () => picar(NEED.horno.piedra));
paso("12 Depositá y construí el Horno", () => { madera -= NEED.horno.madera; piedra -= NEED.horno.piedra; tick(15); });
paso("13 Crafteá un Hacha (" + HACHA + " de plata)", () => { venderHasta(HACHA, 1); if (trabado) return; plata -= HACHA; hachas++; hachasCraft++; tick(10); });
paso("14 Colocá el plano de la Cocina", () => tick(20));
paso("15 Juntá " + NEED.cocina.madera + " madera", () => talar(NEED.cocina.madera));
paso("16 Juntá " + NEED.cocina.piedra + " piedra", () => picar(NEED.cocina.piedra));
paso("17 Depositá y construí la Cocina", () => { madera -= NEED.cocina.madera; piedra -= NEED.cocina.piedra; tick(15); });
paso("18 Cociná una Papa Asada", () => {
  const pideMadera = COOK_RES.madera || 0, pidePapa = COOK_RES.papa || 0;
  if (pideMadera > madera) { talar(pideMadera - madera); if (trabado) return; }
  let v = 0; while (papas < pidePapa) { tick(15); if (++v > 20000) { trabado = "sin papa para cocinar"; return; } }
  papas -= pidePapa; madera -= pideMadera; tick(COOK_S + 15); platos++;
});
paso("19 Comé el plato", () => { platos--; tick(10); });

// ---- informe ----
console.log("SIMULADOR DEL TUTORIAL — valores leídos del juego (state.js)");
console.log("Papa: " + (PAPA.growH * 60).toFixed(1) + " min · semilla " + PAPA.seedCost + " · venta " + PAPA.price + " · " + PAPA.xp + " XP");
console.log("Árbol " + fmt(CD.tree) + " · Roca " + fmt(CD.rock) + " · Hacha " + HACHA + " plata · Pico " + PICO.plata + " plata" + (PICO.madera ? " + " + PICO.madera + " madera" : "") +
  " · Kit " + T.KIT_INICIAL.axe + " hachas / " + T.KIT_INICIAL.pico + " picos · Cupo " + cupo() + " semillas/día\n");
console.log("PASO".padEnd(42) + "TARDA".padStart(9) + "ACUMULADO".padStart(12));
for (const [txt, dur, acc] of filas) console.log(txt.padEnd(42) + fmt(dur).padStart(9) + fmt(acc).padStart(12));
console.log("\n" + (trabado ? "✗ LA CADENA SE TRABA: " + trabado : "✓ LA CADENA CIERRA — el tutorial se puede terminar sin quedarse sin nada"));
console.log("Duración total: " + fmt(t) + "   (" + (t / 3600).toFixed(1) + " horas de reloj)");
console.log("Al terminar: " + plata + " plata · " + madera + " madera · " + piedra + " piedra · " + hachas + " hachas · " + picos + " picos · " + papas + " papas");
console.log("Consumo: " + talas + " talas · " + picadas + " picadas · " + compras + " semillas (cupo " + cupo() + ") · " + vendidas + " papas vendidas" +
  " · crafteó " + hachasCraft + " hachas y " + picosCraft + " picos");
