/* ¿EL PANTANO DEJA GANANCIA CON EL ARMA DE SU TIER? (18/8)
   Es la puerta de entrada al combate: si da pérdida, el primer contacto del jugador con la Zona
   Negra destruye valor. Se mide con la Espada de Madera, que es el arma que tiene ahí.
     node tools/auditar-combate-entrada.js                                                       */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={MONSTER_DEF,ARM_DEF,PRICE,ATTACK_MS};", ctx, { filename: "state.js" });
const X = ctx.__X, P = X.PRICE, ANCLA = 20;
const a = X.ARM_DEF.espada_madera;
let repU = 0; for (const k in a.repair) repU += a.repair[k] * (P[k] || 0); repU /= a.dur;
const dmg = (a.min + a.max) / 2;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("Espada de Madera: " + dmg + " de daño · " + repU.toFixed(2) + " de desgaste por golpe\n");
console.log("bicho            golpes   desgaste   deja   NETO   por hora");
let perdida = 0, largos = 0;
["rata", "murcielago", "larva", "baba", "arana"].forEach(k => {
  const m = X.MONSTER_DEF[k]; if (!m) return;
  const golpes = Math.ceil(m.hp / Math.max(1, dmg - (m.def || 0)));
  const coste = golpes * repU;
  let v = 0; for (const r in m.loot || {}) { const [x, y, p] = m.loot[r]; v += ((x + y) / 2) * p * (r === "plata" ? 1 : (P[r] || 0)); }
  const neto = v - coste, seg = golpes * (X.ATTACK_MS / 1000);
  if (neto <= 0) perdida++;
  if (golpes > 14) largos++;
  console.log("  " + m.label.padEnd(16) + String(golpes).padStart(5) + coste.toFixed(1).padStart(11) +
    v.toFixed(1).padStart(8) + (neto >= 0 ? "  +" : "  ") + neto.toFixed(1).padStart(5) +
    (neto * 3600 / seg).toFixed(0).padStart(11));
});
ok("ningún bicho de entrada da pérdida", perdida === 0, perdida + " de 5 (antes 4 de 5)");
ok("ninguno se hace eterno con el arma de entrada", largos === 0, largos + " pasan de 14 golpes");
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
