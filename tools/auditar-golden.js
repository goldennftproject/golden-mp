/* LOS GRIFOS DE $GOLDEN (18/8)
   1 $Golden = GOLDEN_EN_PLATA de plata. Cada sitio que ENTREGA $Golden es una imprenta, así que
   todos tienen que tener techo o derivar de un valor. Los dos que ya estaban bien (sellItem y
   plotUnlockGolden) derivan; los rotos eran los que tenían el número escrito a mano.
     node tools/auditar-golden.js                                                                */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;window.__X={GOLDEN_EN_PLATA,PASS_VIP,PASS_FREE,PASS_VIP_PRICE,PASS_LVL_GOLD,RUNA_ORO_TOPE,RECIPE_DEF,FISH_CD,EMERG_GOLDEN,dishPrice,cookPot};",
  ctx, { filename: "state.js" });
const X = ctx.__X, GP = X.GOLDEN_EN_PLATA;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("1 $Golden = " + GP + " de plata\n");

// --- el pase ---
const devuelve = X.PASS_VIP.reduce((a, r) => a + (r.golden || 0), 0);
console.log("PASE VIP: cuesta " + X.PASS_VIP_PRICE + " y devuelve " + devuelve + " $Golden (" +
  Math.round(100 * devuelve / X.PASS_VIP_PRICE) + "%)");
ok("el pase no se autofinancia", devuelve < X.PASS_VIP_PRICE * 0.5,
  Math.round(100 * devuelve / X.PASS_VIP_PRICE) + "% (antes 98%)");
const rentables = X.PASS_VIP.map((r, i) => ({ i: i + 1, g: r.golden || 0 })).filter(x => x.g > X.PASS_LVL_GOLD);
ok("ningún nivel devuelve más de lo que cuesta comprarlo", rentables.length === 0,
  rentables.length ? rentables.map(x => "nv" + x.i + " +" + x.g).join(", ") : "(antes 7 niveles)");

// --- la runa dorada ---
ok("la Runa Dorada tiene tope diario", (X.RUNA_ORO_TOPE || 0) > 0,
  X.RUNA_ORO_TOPE + " $G/día = " + (X.RUNA_ORO_TOPE * GP) + " de plata (antes sin techo)");

// --- la pesca ---
ok("la pesca tiene enfriamiento", (X.FISH_CD || 0) > 0, X.FISH_CD / 60 + " min");
const src = fs.readFileSync("public/game/state.js", "utf8");
const pescaGolden = /Legendario[^\n]*G\.golden \+=/.test(src);
ok("el pez legendario ya no imprime $Golden", !pescaGolden);

// --- vender platos en $Golden ---
let peor = 0, peorN = "";
for (const k in X.RECIPE_DEF) {
  const r = X.RECIPE_DEF[k]; if (!r.goldenP) continue;
  const enPlata = Math.round(X.dishPrice(r) * 1);
  const derivado = Math.max(1, Math.floor(enPlata / GP));
  const ratio = (derivado * GP) / Math.max(1, enPlata);
  if (ratio > peor) { peor = ratio; peorN = r.label; }
}
ok("vender platos en $Golden ya no es arbitraje", peor <= 1.6,
  "el peor es " + peorN + " a x" + peor.toFixed(1) + " (antes x3,3)");

// --- el kit de emergencia ---
console.log("\nKIT DE EMERGENCIA (sigue caro a propósito: es un rescate, no un negocio)");
for (const k in X.EMERG_GOLDEN || {}) console.log("   " + k + ": " + X.EMERG_GOLDEN[k] + " $G = " + (X.EMERG_GOLDEN[k] * GP) + " de plata");

console.log("\n" + (fallos ? "FALLOS: " + fallos : "todos los grifos con techo"));
process.exit(fallos ? 1 : 0);
