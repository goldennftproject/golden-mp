/* LA PRIMERA HORA: ¿QUÉ HACE EL JUGADOR, MINUTO A MINUTO? (18/8, dirección)
   "Entre esas cosas que tenías para hacer, solo te vas a quedar haciendo patatas cada dos minutos
   porque el resto del tiempo no hay más nada."
   Se cuenta cada acción de la primera hora y de qué tipo es. Lo que importa no es cuánto rinde:
   es CUÁNTAS VECES el juego le da algo distinto que hacer.
     node tools/medir-primera-hora.js                                                            */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={CROP_DEF,CD,ORE_DEF};", ctx, { filename: "state.js" });
const X = ctx.__X;

function primeraHora(op) {
  const ev = [];
  const push = (t, tipo) => { if (t <= 60) ev.push({ t, tipo }); };
  // parcelas
  for (let p = 0; p < op.par; p++) for (let t = op.crop; t <= 60; t += op.crop) push(t, "cultivo");
  // árboles, con desfase opcional
  for (let a = 0; a < op.arb; a++) {
    const off = op.desfase ? (a * op.tree / op.arb) : 0;
    for (let t = off + op.tree; t <= 60; t += op.tree) push(t, "árbol");
    if (op.desfase && off > 0) push(off, "árbol");    // el desfase adelanta la primera
  }
  for (let r = 0; r < op.roc; r++) {
    const off = op.desfase ? (r * op.rock / op.roc) : 0;
    for (let t = off + op.rock; t <= 60; t += op.rock) push(t, "roca");
    if (op.desfase && off > 0) push(off, "roca");
  }
  ev.sort((a, b) => a.t - b.t);
  const cont = {}; ev.forEach(e => cont[e.tipo] = (cont[e.tipo] || 0) + 1);
  // el hueco más largo sin NADA
  let peor = 0, ant = 0;
  ev.forEach(e => { peor = Math.max(peor, e.t - ant); ant = e.t; });
  peor = Math.max(peor, 60 - ant);
  const noCultivo = ev.filter(e => e.tipo !== "cultivo").length;
  return { total: ev.length, cont, peor, pctCultivo: 100 * (cont["cultivo"] || 0) / ev.length, noCultivo };
}

const BASE = { par: 3, arb: 2, roc: 2, crop: X.CROP_DEF.papa.growH * 60, tree: X.CD.tree / 60, rock: X.CD.rock / 60 };
console.log("Hoy: papa " + BASE.crop + " min · árbol " + BASE.tree + " min · roca " + BASE.rock + " min");
console.log("La relación entre el reloj más rápido y el más lento es de 1 a " + Math.round(BASE.rock / BASE.crop) + "\n");

const OPCIONES = [
  ["HOY", BASE],
  ["A · relojes más cortos (árbol 20, roca 30) y menos por golpe", Object.assign({}, BASE, { tree: 20, rock: 30 })],
  ["B · los 6 árboles y 6 rocas desde el principio", Object.assign({}, BASE, { arb: 6, roc: 6 })],
  ["C · mismos nodos y relojes, pero DESFASADOS", Object.assign({}, BASE, { desfase: true })],
  ["B+C · seis de cada uno Y desfasados", Object.assign({}, BASE, { arb: 6, roc: 6, desfase: true })],
];
console.log("opción                                            acciones   de cultivo   de nodo   el peor hueco");
for (const [nom, op] of OPCIONES) {
  const r = primeraHora(op);
  console.log("  " + nom.padEnd(48) + String(r.total).padStart(6) + (r.pctCultivo.toFixed(0) + "%").padStart(13) +
    String(r.noCultivo).padStart(10) + (r.peor.toFixed(0) + " min").padStart(16));
}
console.log("\n  'de nodo' es lo que NO es plantar papa: es la variedad real de la primera hora.");
