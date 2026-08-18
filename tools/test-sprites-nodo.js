/* EL SPRITE DE UN NODO DICE LA VERDAD EN CUALQUIER MOMENTO (18/8)
   Reporte del diseñador: "crecen antes de la hora... tiene que depender sí o sí del tiempo de
   enfriamiento". Antes el sprite cambiaba por EVENTO al cruzar un umbral, así que si la escena se
   reconstruía (volver del Bosque, F5) nacía entero y ya no había umbral que cruzar.
   Acá se recorre el enfriamiento entero y se comprueba que la textura sea función del tiempo.
     node tools/test-sprites-nodo.js                                                            */
const fs = require("fs"), vm = require("vm");
const noop = () => {};
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON, log: noop, toast: noop };
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") + "\n;window.__X={CD,ORE_DEF};", ctx, { filename: "state.js" });

// se extrae texNodo de la clase sin arrancar Phaser: se copia el cuerpo con un textures falso
const src = fs.readFileSync("public/game/farm.js", "utf8");
const cuerpo = src.slice(src.indexOf("  texNodo(o, t) {"), src.indexOf("  // La aplica si cambió"));
const HAY = new Set(fs.readdirSync("public/assets/farm").filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)));
const fn = new Function("nowMs", "return function(o,t){ const self=this; " +
  cuerpo.replace("  texNodo(o, t) {", "").replace(/\}\s*$/, "") + "}")(() => Date.now());
const escena = { textures: { exists: k => HAY.has(k) } };
const tex = (o, t) => fn.call(escena, o, t);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const casos = [
  ["árbol", { type: "tree", baseKey: "tree", rw: 84, w: 84 }, ctx.__X.CD.tree * 1000],
  ["roca",  { type: "rock", baseKey: "node_stone", rw: 42, w: 42 }, ctx.__X.CD.rock * 1000],
  ["veta de oro", { type: "ore", baseKey: "node_gold", rw: 42, w: 42 }, ctx.__X.ORE_DEF.oro.cd * 1000],
];
console.log("recurso        recién usado        a la mitad          ya listo");
for (const [nom, base, cd] of casos) {
  const t0 = 1000000;
  const o = Object.assign({}, base, { cdIni: t0, readyAt: t0 + cd });
  const a = tex(o, t0 + cd * 0.10);      // recién usado
  const b = tex(o, t0 + cd * 0.70);      // pasada la mitad
  const c = tex(o, t0 + cd + 1);         // listo
  console.log("  " + nom.padEnd(13) + a.key.padEnd(20) + b.key.padEnd(20) + c.key);
  ok(nom + ": recién usado NO se ve entero", a.key !== base.baseKey || a.alfa < 1);
  ok(nom + ": a la mitad se ve distinto que recién usado", b.key !== a.key || b.alfa !== a.alfa);
  ok(nom + ": listo vuelve al sprite entero y opaco", c.key === base.baseKey && c.alfa === 1);
  // y lo que importa: la textura es la MISMA se mire cuando se mire, no depende de haber estado
  let saltos = 0, prev = null;
  for (let i = 0; i <= 100; i++) { const k = tex(o, t0 + cd * i / 100).key; if (prev && k !== prev) saltos++; prev = k; }
  ok(nom + ": el sprite cambia pocas veces y siempre igual", saltos > 0 && saltos <= 3, saltos + " cambios en todo el enfriamiento");
}
// sin cdIni (guardados viejos) no puede reventar
const viejo = { type: "tree", baseKey: "tree", rw: 84, w: 84, readyAt: Date.now() + 60000 };
ok("un guardado sin cdIni no rompe", !!tex(viejo, Date.now()).key);
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
