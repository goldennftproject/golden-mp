/* ¿LOS HELPERS DE TERRENO DICEN LO MISMO QUE LA FÓRMULA VIEJA? (18/8)
   La regla del borde pasó de "el rectángulo empieza en 0,0" a "es tuya y tiene al lado algo que
   no lo es". Sin expansiones tienen que coincidir CELDA POR CELDA: si no, el refactor cambió el
   mapa sin querer.   node tools/test-terreno.js                                                */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
const G = ctx.GF;
let fallos = 0;
const chequeo = (nombre, ok, detalle) => {
  if (!ok) fallos++;
  console.log((ok ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
};

// 1) sin expansiones, enCerca tiene que dar lo mismo que la fórmula del rectángulo
G.expOwned = 0;
let dif = 0, ejemplo = "";
for (let c = -2; c < G.COLS_BASE + 2; c++) for (let r = -2; r < G.ROWS_BASE + 2; r++) {
  const viejo = c < 1 || r < 2 || c >= G.COLS_BASE - 1 || r >= G.ROWS_BASE - 1;
  if (G.enCerca(c, r) !== viejo) { dif++; if (!ejemplo) ejemplo = "(" + c + "," + r + ")"; }
}
chequeo("sin expansiones, enCerca = la fórmula vieja, celda por celda", dif === 0,
  dif ? dif + " diferencias, la primera en " + ejemplo : "");

// 2) el interior útil sigue siendo el mismo
const interior = [];
for (let c = 0; c < G.COLS_BASE; c++) for (let r = 0; r < G.ROWS_BASE; r++) if (!G.enCerca(c, r)) interior.push([c, r]);
const cs = interior.map(p => p[0]), rs = interior.map(p => p[1]);
chequeo("interior útil sigue siendo 13 x 12",
  (Math.max(...cs) - Math.min(...cs) + 1) === 13 && (Math.max(...rs) - Math.min(...rs) + 1) === 12,
  "cols " + Math.min(...cs) + "-" + Math.max(...cs) + " · filas " + Math.min(...rs) + "-" + Math.max(...rs));

// 3) ningún objeto ni parcela ni la laguna pisa la cerca
const fuera = [];
// los nodos que trae una expansión (o.exp) están fuera del terreno hasta que se compra: los
// comprueba tools/test-nodos-expansion.js, cada uno en la etapa que le toca
G.WORLD_OBJECTS.filter(o => o.exp == null).forEach(o => { for (let c = o.leftCol; c < o.leftCol + Math.ceil(o.wCells); c++)
  if (G.enCerca(c, o.baseRow)) fuera.push(o.type + " en (" + c + "," + o.baseRow + ")"); });
G.PLOTS.forEach((p, i) => { if (G.enCerca(p.col, p.row)) fuera.push("parcela " + i); });
for (let c = 0; c < G.POND.cols; c++) for (let r = 0; r < G.POND.rows; r++)
  if (G.enCerca(G.POND.col + c, G.POND.row + r)) fuera.push("laguna");
chequeo("nada del contenido pisa la cerca", fuera.length === 0, [...new Set(fuera)].slice(0, 4).join(" · "));

// 4) el terreno crece de forma coherente en las 17 etapas
console.log("\n  etapa   celdas   despejadas   recuadro");
let antes = 0, creceOk = true, cercaOk = true;
for (let n = 0; n <= 16; n++) {
  const t = G.terreno(n);
  if (t.mias.size <= antes && n > 0) creceOk = false;
  antes = t.mias.size;
  // toda celda de cerca tiene que ser tuya y tocar algo que no lo es
  G.expOwned = n;
  let mal = 0;
  t.mias.forEach(s => { const p = s.split(","), c = +p[0], r = +p[1];
    const borde = !G.tuyo(c - 1, r) || !G.tuyo(c + 1, r) || !G.tuyo(c, r + 1) || !G.tuyo(c, r - 1) || !G.tuyo(c, r - 2);
    if (G.enCerca(c, r) !== borde) mal++; });
  if (mal) cercaOk = false;
  if (n % 4 === 0 || n === 16)
    console.log("     " + String(n).padStart(2) + "   " + String(t.mias.size).padStart(6) +
      String(t.desp.size).padStart(13) + "   " + t.cols + "x" + t.rows +
      "  desde (" + t.c0 + "," + t.r0 + ")");
}
console.log("");
chequeo("el terreno crece en cada etapa", creceOk);
chequeo("la cerca es siempre el borde real, en las 17 etapas", cercaOk);
chequeo("al final son 625 celdas (25x25)", G.terreno(16).mias.size === 625);
chequeo("el aire de bosque sobrevive: hay césped más allá de la cerca",
  G.terreno(16).desp.size > G.terreno(16).mias.size,
  G.terreno(16).desp.size - G.terreno(16).mias.size + " celdas de anillo");

console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
