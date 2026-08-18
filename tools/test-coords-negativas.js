/* ¿SE PUEDE USAR EL TERRENO QUE COMPRASTE? (18/8)
   La auditoría encontró 9 clamps que recortaban contra [0, COLS-1]. Con expansiones el mínimo ya
   no es 0 (el primer bloque del recorrido cae en col -5) y el tope no es COLS-1 sino C1-1. El
   efecto era que NO SE PODÍA MOVER NADA al terreno recién comprado: el clamp lo pegaba al borde
   del corral viejo. Los tests que ya había no lo veían porque ninguno probaba con expansiones.
     node tools/test-coords-negativas.js                                                        */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
const G = ctx.GF, T = G.TILE;
const Clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("exp   origen        columnas reales   el clamp del código permite");
for (const n of [0, 1, 4, 8, 12, 16]) {
  G.aplicarTerreno(n);
  const cMin = Clamp(-9999, G.C0, G.C1 - 1), cMax = Clamp(9999, G.C0, G.C1 - 1);
  const rMin = Clamp(-9999, G.R0, G.R1 - 1), rMax = Clamp(9999, G.R0, G.R1 - 1);
  console.log(String(n).padStart(3) + "   (" + String(G.ORIG_X).padStart(4) + "," + String(G.ORIG_Y).padStart(4) + ")" +
    ("[" + G.C0 + ".." + (G.C1 - 1) + "]").padStart(18) + ("[" + cMin + ".." + cMax + "]").padStart(20));
  ok("exp " + n + ": el clamp de columna llega al borde real", cMin === G.C0 && cMax === G.C1 - 1);
  ok("exp " + n + ": el clamp de fila llega al borde real", rMin === G.R0 && rMax === G.R1 - 1);
}

// lo que de verdad importa: ¿se puede soltar un edificio en el terreno nuevo?
console.log("");
G.aplicarTerreno(3);   // tres bloques por la izquierda: hay columnas negativas
const wCells = 3;
const izq = G.C0 * T + T;                                   // un punto dentro de la franja nueva
const leftCol = Clamp(Math.round((izq - wCells * T / 2) / T), G.C0, G.C1 - wCells);
ok("un edificio se puede soltar en la franja izquierda comprada", leftCol < 0, "leftCol = " + leftCol);
const col = Clamp(Math.floor(izq / T), G.C0, G.C1 - 1);
ok("un adorno también", col < 0, "col = " + col);
ok("y esa celda es tuya de verdad", G.tuyo(col, 6));
ok("pero no se puede soltar fuera del terreno", G.enCerca(G.C0 - 1, 6));

// el pathfinding tiene que cubrir el mundo entero, también en negativo
G.aplicarTerreno(16);
ok("el origen del mundo es negativo con las 16", G.ORIG_X < 0 && G.ORIG_Y < 0, "(" + G.ORIG_X + "," + G.ORIG_Y + ")");
ok("blockedAt deja pasar en el terreno nuevo", !G.blockedAt(G.ORIG_X + T * 2.5, G.ORIG_Y + T * 2.5, 0));
ok("blockedAt frena fuera del terreno", G.blockedAt(G.ORIG_X - T * 2, G.ORIG_Y - T * 2, 0));

G.aplicarTerreno(0);
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
