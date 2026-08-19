/* ¿EL COMBATE CUELGA DEL ANCLA? (18/8)
   Se mide cada bicho con el ARMA DE SU TRAMO DE NIVEL, no con la óptima: lo que importa es lo que
   le pasa al jugador que va con lo que le toca. Un bicho tiene que dejar lo que costó el desgaste
   del arma MÁS 20 por hora del tiempo que lleva matarlo.
     node tools/auditar-combate.js                                                                */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={MONSTER_DEF,ARM_DEF,ARM_RAREZAS,PRICE,ATTACK_MS};", ctx, { filename: "state.js" });
const X = ctx.__X, P = X.PRICE, ANCLA = 20;
const armaDe = l => l <= 10 ? "madera" : l <= 20 ? "piedra" : l <= 30 ? "bronce" : l <= 45 ? "oro" : "diamante";
const A = {}; X.ARM_RAREZAS.forEach(r => { const a = X.ARM_DEF["espada_" + r]; let rep = 0;
  for (const k in a.repair) rep += a.repair[k] * (P[k] || 0); A[r] = { dmg: (a.min + a.max) / 2, g: rep / a.dur }; });
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("bicho            nv  arma      def  golpes    neto   plata/hora");
let perdida = 0, largos = 0, defAlta = 0; const phs = [], netos = [];
Object.keys(X.MONSTER_DEF).forEach(k => {
  const m = X.MONSTER_DEF[k]; if (m.boss) return;
  const r = armaDe(m.lvl || 1), a = A[r];
  if ((m.def || 0) >= a.dmg) defAlta++;                       // la defensa no puede anular el arma
  const g = Math.ceil(m.hp / Math.max(1, a.dmg - (m.def || 0)));
  let v = 0; for (const res in m.loot || {}) { const [x, y, pp] = m.loot[res]; v += ((x + y) / 2) * pp * (res === "plata" ? 1 : (P[res] || 0)); }
  const neto = v - g * a.g, ph = neto * 3600 / (g * X.ATTACK_MS / 1000);
  phs.push(ph); netos.push(neto);
  if (neto < -1) perdida++;
  if (g > 40) largos++;
  console.log("  " + m.label.padEnd(16) + String(m.lvl).padStart(3) + "  " + r.padEnd(9) +
    String(m.def || 0).padStart(4) + String(g).padStart(8) + (neto >= 0 ? " +" : " ") + neto.toFixed(0).padStart(6) +
    ph.toFixed(0).padStart(13));
});
ok("ninguna defensa anula el arma de su tramo", defAlta === 0, defAlta + " bichos (antes 11)");
ok("ningún bicho pasa de 40 golpes", largos === 0, largos + " (antes hasta 250)");
ok("ninguno da pérdida con el arma de su tramo", perdida === 0, perdida + " de " + phs.length);
/* 18/8: la primera versión medía plata/HORA y marcaba en rojo a la rata y la babita. Era el
   criterio, no los bichos: en algo que muere en 6 segundos, redondear la plata a un entero se
   convierte en 500/h. Lo que importa es el NETO POR MUERTE, que es lo que el jugador ve. */
const dentro = netos.filter(v => Math.abs(v) <= 2).length;
ok("el neto por muerte cae junto al ancla", dentro === netos.length,
  dentro + "/" + netos.length + " dentro de ±2 de plata (antes de −1.183 a +294)");
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
