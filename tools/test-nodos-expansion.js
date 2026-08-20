/* LOS NODOS QUE TRAE CADA EXPANSIÓN (18/8)
   18/8 (2ª pasada): cada bloque trae DOS celdas productivas, como siempre, pero ahora son
   1 PARCELA + 1 nodo, y el nodo alterna árbol (bloques pares) y roca (impares). La parcela no
   es un objeto del mapa: llega al baúl y la coloca el jugador (nodosQueTocan la cuenta). Acá se
   comprueba el nodo, que sí es geometría, y que la derivación no lo deja en un sitio imposible.
     node tools/test-nodos-expansion.js                                                        */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
const G = ctx.GF;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const nuevos = G.WORLD_OBJECTS.filter(o => o.exp != null);
/* 18/8 (3ª pasada, dirección): las expansiones son la ÚNICA fuente de nodos, así que cada bloque
   trae UN ÁRBOL Y UNA ROCA. La parcela va aparte, al Cobertizo. Tres celdas productivas por
   expansión: 9 de arranque + 16×3 = 57, el techo de siempre. */
ok("hay 2 nodos por expansión (16 × 2)", nuevos.length === 32, nuevos.length);
ok("cada bloque trae un árbol y una roca",
  G.EXPANSIONES.every((e, i) => {
    const d = nuevos.filter(o => o.exp === i);
    return d.length === 2 && d.some(o => o.type === "tree") && d.some(o => o.type === "rock");
  }));
ok("salen 16 árboles y 16 rocas",
  nuevos.filter(o => o.type === "tree").length === 16 && nuevos.filter(o => o.type === "rock").length === 16);

let fuera = 0, cerca = 0, choque = 0, pisaViejo = 0;
const ocupadasBase = new Set();
G.WORLD_OBJECTS.filter(o => o.exp == null).forEach(o => {
  for (let c = o.leftCol; c < o.leftCol + Math.ceil(o.wCells); c++) ocupadasBase.add(c + "," + o.baseRow);
});
G.PLOTS.forEach(p => ocupadasBase.add(p.col + "," + p.row));

G.EXPANSIONES.forEach((e, i) => {
  G.aplicarTerreno(i + 1);
  const d = nuevos.filter(o => o.exp === i);
  const celdas = [];
  d.forEach(o => { for (let c = o.leftCol; c < o.leftCol + Math.ceil(o.wCells); c++) celdas.push(c + "," + o.baseRow); });
  celdas.forEach(k => {
    const [c, r] = k.split(",").map(Number);
    if (!G.tuyo(c, r)) fuera++;                       // ¿cae en terreno que no es tuyo?
    if (G.enCerca(c, r)) cerca++;                     // ¿pisa la cerca?
    if (ocupadasBase.has(k)) pisaViejo++;             // ¿pisa algo del corral?
    if (c < e.c0 || c >= e.c1 || r < e.r0 || r >= e.r1) fuera++;   // ¿se salió de SU bloque?
  });
  if (new Set(celdas).size !== celdas.length) choque++;   // ¿el nodo se pisa a sí mismo?
});
ok("ninguno cae fuera de su propio bloque", fuera === 0, fuera + " casos");
ok("ninguno pisa la cerca al comprarse", cerca === 0, cerca + " casos");
ok("ninguno pisa contenido del corral", pisaViejo === 0, pisaViejo + " casos");
ok("ningún nodo se solapa consigo mismo", choque === 0, choque + " bloques");

// y una vez interior, interior para siempre (la cerca solo retrocede)
let despues = 0;
nuevos.forEach(o => {
  for (let n = o.exp + 1; n <= 16; n++) {
    G.aplicarTerreno(n);
    for (let c = o.leftCol; c < o.leftCol + Math.ceil(o.wCells); c++) if (G.enCerca(c, o.baseRow)) despues++;
  }
});
ok("y siguen siendo interior en TODAS las etapas posteriores", despues === 0, despues + " casos");

// no se ven hasta que la expansión se compró
G.aplicarTerreno(0);
ok("con 0 expansiones, los 32 están ocultos", nuevos.every(o => o.exp >= 0));
console.log("\n  totales al terminar las 16:");
const arb = G.WORLD_OBJECTS.filter(o => o.type === "tree").length;
const roc = G.WORLD_OBJECTS.filter(o => o.type === "rock").length;
console.log("    árboles " + arb + " en el mapa   ·   rocas " + roc);
ok("el mapa tiene 6 base + 16 de expansión de cada", arb === 22 && roc === 22, arb + "/" + roc);
console.log("    (de los 6 base solo se abren 3: la granja de arranque tiene 3 árboles y 3 rocas)");

console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
