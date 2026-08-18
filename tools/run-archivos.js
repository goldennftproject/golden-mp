/* EJECUTA cada archivo del juego con Phaser stubbeado. node --check solo mira la sintaxis
   y ya nos dejó pasar un bloque huérfano entero (17/8).   node tools/run-archivos.js       */
const fs = require("fs"), vm = require("vm");
const noop = () => {};
const chain = new Proxy(function () {}, { get: (t, k) => (k === "then" ? undefined : chain), apply: () => chain, construct: () => chain });
const ctx = { console, Math, Date, JSON, setTimeout: noop, setInterval: noop, clearTimeout: noop,
  requestAnimationFrame: noop, localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: chain, navigator: { userAgent: "node" }, location: { search: "", href: "" },
  Image: class { set src(v) {} }, Audio: class { play() {} },
  addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false, addListener: noop, addEventListener: noop }),
  fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  Phaser: new Proxy({ Scene: class { constructor() {} }, Math, AUTO: 0, Scale: chain, Utils: chain,
    Geom: chain, Display: chain, Input: chain, Game: class {} }, { get: (t, k) => (k in t ? t[k] : chain) }) };
ctx.window = ctx; ctx.globalThis = ctx;
let fallos = 0;
for (const f of ["config.js", "state.js", "save.js", "farm.js", "forest.js"]) {
  try { vm.runInNewContext(fs.readFileSync("public/game/" + f, "utf8"), ctx, { filename: f }); console.log("  ok  " + f); }
  catch (e) { fallos++; console.log("  FALLA " + f + " -> " + e.message); }
}
// ui.js necesita un DOM de verdad: se comprueba aparte con node --check
try { new (require("vm").Script)(fs.readFileSync("public/game/ui.js", "utf8"), { filename: "ui.js" }); console.log("  ok  ui.js (sintaxis; necesita DOM real para ejecutarse)"); }
catch (e) { fallos++; console.log("  FALLA ui.js -> " + e.message); }
process.exit(fallos ? 1 : 0);
