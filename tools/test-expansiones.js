/* COMPRAR LAS 16 EXPANSIONES, DE PUNTA A PUNTA (18/8)
   Comprueba la cadena entera: que el nivel frene, que el material frene, que al comprar la granja
   crezca de verdad, y que no se pueda pasar del tope.
     node tools/test-expansiones.js                                                             */
const fs = require("fs"), vm = require("vm");
const noop = () => {};
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON,
  log: noop, toast: noop, refreshHud: noop, saveFarm: noop, sfx: null, celebrate: null,
  isOpen: () => false, syncSlots: noop, refreshInv: noop, setTimeout: noop,
  document: { getElementById: () => null } };   // reiniciarGranjaSuave toca el DOM: sin telón, se reinicia y ya
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={G,expansionSiguiente,expansionComprar,EXPANSION_MAX,FARM_EXPANSION};",
  ctx, { filename: "state.js" });
const X = ctx.__X, G = X.G, GF = ctx.GF;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

// --- los frenos ---
G.expansiones = 0; G.level = 1;
for (const k in G.res) G.res[k] = 9999;
ok("sin el nivel no deja comprar", X.expansionComprar() === false && G.expansiones === 0);
G.level = 3;
for (const k in G.res) G.res[k] = 0;
ok("con el nivel pero sin material tampoco", X.expansionComprar() === false && G.expansiones === 0);

// --- comprar las 16, una por una, comprobando que la granja crece ---
console.log("\n  #  nivel   granja antes -> después   celdas");
let previo = GF.terreno(0).mias.size, creceSiempre = true, pagaSiempre = true;
for (let i = 0; i < 16; i++) {
  const e = X.expansionSiguiente();
  G.level = e.nivel;
  for (const k in e.costo) G.res[k] = e.costo[k];        // JUSTO lo que cuesta, ni uno más
  const antes = GF.terreno(G.expansiones).mias.size;
  const comprado = X.expansionComprar();
  const ahora = GF.terreno(G.expansiones).mias.size;
  if (!comprado || ahora !== antes + GF.BLOQUE * GF.BLOQUE) creceSiempre = false;
  for (const k in e.costo) if (Math.round(G.res[k]) !== 0) pagaSiempre = false;   // pagó exacto
  if (i % 5 === 0 || i === 15)
    console.log("  " + String(e.n).padStart(2) + String(e.nivel).padStart(7) + "   " +
      String(antes).padStart(6) + " -> " + String(ahora).padStart(6) + "   +" + (ahora - antes));
  previo = ahora;
}
console.log("");
ok("cada compra suma un bloque de 5x5", creceSiempre);
ok("cada compra descuenta el material exacto", pagaSiempre);
ok("al final son las 16", G.expansiones === 16);
ok("la granja terminó en 625 celdas", GF.terreno(16).mias.size === 625, GF.terreno(16).mias.size + " celdas");
ok("no se puede pasar del tope", X.expansionSiguiente() === null && X.expansionComprar() === false);

// --- el terreno resultante sigue siendo coherente ---
GF.aplicarTerreno(16);
let pisan = 0;
GF.WORLD_OBJECTS.forEach(o => { for (let c = o.leftCol; c < o.leftCol + Math.ceil(o.wCells); c++) if (GF.enCerca(c, o.baseRow)) pisan++; });
ok("con las 16, nada del contenido pisa la cerca", pisan === 0);
ok("el mundo final mide 25x25", GF.COLS === 25 && GF.ROWS === 25, GF.COLS + "x" + GF.ROWS);
ok("el origen se corrió a negativo", GF.ORIG_X < 0 && GF.ORIG_Y < 0, "(" + GF.ORIG_X + "," + GF.ORIG_Y + ")");

console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
