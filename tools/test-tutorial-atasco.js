/* ¿PUEDE EL TUTORIAL QUEDARSE ATASCADO? (18/8)
   Reproduce el caso del diseñador: guardado con el kit ya reclamado y el tutorial en el paso 0.
   El paso del baúl no se puede cumplir (kitReclamar sale por el guard) y, como tutoEvent descarta
   lo que no sea del paso activo, comprar/plantar/cosechar no cuenta nada y no se avisa de nada.
     node tools/test-tutorial-atasco.js                                                        */
const fs = require("fs"), vm = require("vm");
function cargar() {
  const noop = () => {};
  const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON,
    log: noop, toast: noop, refreshHud: noop, saveFarm: noop, sfx: null, celebrate: null,
    refreshSeedShop: noop, refreshInv: noop, refreshHotbar: noop, isOpen: () => false,
    tutoRefresh: noop, tutoCheck: noop, syncSlots: noop };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
  vm.runInNewContext(fs.readFileSync("public/game/state.js", "utf8") +
    "\n;window.__X={G,TUTO_STEPS,tutoMigrar,tutoActivo,tutoEvent,tutoHecho,buySeed,TUTO_VER};",
    ctx, { filename: "state.js" });
  return ctx.__X;
}
let fallos = 0;
function caso(nombre, preparar, esperado) {
  const X = cargar();
  preparar(X.G, X);
  X.tutoMigrar();
  const st = X.tutoActivo();
  const id = st ? st.id : "(tutorial terminado)";
  const ok = id === esperado;
  if (!ok) fallos++;
  console.log((ok ? "  ok   " : "  FALLA") + "  " + nombre.padEnd(52) + "paso activo: " + id +
    (ok ? "" : "   (se esperaba: " + esperado + ")"));
}

console.log("EL CASO DEL DISEÑADOR\n");
caso("guardado viejo: el kit consta reclamado, tuto en el paso 0",
  g => { g.kitReclamado = true; g.tuto = { step: 0, n: 0, done: false, v: 13 }; }, "buyseed");
caso("...y además ya tiene las 3 papas compradas",
  g => { g.kitReclamado = true; g.seeds = { papa: 3 }; g.tuto = { step: 0, n: 0, done: false, v: 13 }; }, "plant");

console.log("\nQUE NO SE ROMPA LO QUE FUNCIONABA\n");
caso("partida nueva de verdad: nada reclamado",
  g => { g.kitReclamado = false; g.tuto = { step: 0, n: 0, done: false, v: 13 }; }, "kit");
caso("veterano con el tutorial terminado",
  g => { g.kitReclamado = true; g.tuto = { step: 0, n: 0, done: true, v: 13 }; }, "(tutorial terminado)");
caso("guardado de una version vieja del tutorial",
  g => { g.kitReclamado = true; g.tuto = { step: 7, n: 0, done: false, v: 1 }; }, "buyseed");

console.log("\nLA COMPRA CUENTA UNA VEZ DESATASCADO\n");
{
  const X = cargar();
  X.G.kitReclamado = true; X.G.plata = 3;
  X.G.tuto = { step: 0, n: 0, done: false, v: 13 };
  X.tutoMigrar();
  const antes = X.tutoActivo().id;
  X.buySeed("papa", 3);
  const ahora = X.tutoActivo() ? X.tutoActivo().id : "(fin)";
  const ok = antes === "buyseed" && ahora === "plant";
  if (!ok) fallos++;
  console.log((ok ? "  ok   " : "  FALLA") + "  comprar 3 papas avanza el paso" .padEnd(52) +
    antes + " -> " + ahora);
}
console.log("\n" + (fallos ? "FALLOS: " + fallos : "todo en verde"));
process.exit(fallos ? 1 : 0);
