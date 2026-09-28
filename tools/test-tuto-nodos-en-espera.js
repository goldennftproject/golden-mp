/* TUTORIAL: UN NODO EN ENFRIAMIENTO SIGUE TENIENDO UNA SALIDA
   Cuando todos los árboles o rocas elegibles descansan, la guía conserva su progreso, orienta a
   una tarea agrícola posible y vuelve sola al recurso. No abre el juego.
     node tools/test-tuto-nodos-en-espera.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const STATE = fs.readFileSync("public/game/state.js", "utf8");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL ESTADO SÓLO DESVÍA CUANDO EL NODO ESTÁ DESCANSANDO\n");
{
  const ini = STATE.indexOf("function tutoSubNodoEnEspera");
  const fin = STATE.indexOf("function tutoSub()", ini);
  if (ini < 0 || fin < 0) throw new Error("No encontré el subestado de nodos");
  let descanso = true;
  const ctx = {
    window: { farmScene: { nodoGuiaEnEspera: () => descanso } }, Math, Object, Array, String,
    G: { plots: [{ state: "ready" }], seeds: {}, res: { papa: 0 } },
    CROP_DEF: { papa: { label: "Papa", price: 3 } }
  };
  vm.createContext(ctx);
  vm.runInContext(STATE.slice(ini, fin), ctx);
  const paso = { target: "tree", res: "madera" };

  let sub = ctx.tutoSubNodoEnEspera(paso);
  ok("con una cosecha lista señala una parcela útil", sub && sub.esperaNodo && sub.target === "plot" && sub.guiaPlot === "ready" && /Madera/.test(sub.txt));

  ctx.G = { plots: [{ state: "dry" }], seeds: { papa: 3 }, res: { papa: 0 } };
  sub = ctx.tutoSubNodoEnEspera(paso);
  ok("con semillas guía a plantar, no a un árbol agotado", sub && sub.target === "plot" && sub.guiaPlot === "dry" && /plantá/.test(sub.txt));

  ctx.G = { plots: [{ state: "dry" }], seeds: {}, res: { papa: 2 } };
  sub = ctx.tutoSubNodoEnEspera(paso);
  ok("con cosecha en bolsa guía a vender", sub && sub.target === "market" && sub.panel === "ov-market" && sub.ui === "#vb-papa");

  ctx.G = { plots: [{ state: "growing" }], seeds: {}, res: { papa: 0 } };
  sub = ctx.tutoSubNodoEnEspera({ target: "rock", res: "piedra" });
  ok("si sólo hay cultivos creciendo, los señala sin mostrar reloj", sub && sub.target === "plot" && sub.guiaPlot === "growing" && !/\d+\s*(min|seg|s)\b/i.test(sub.txt));

  descanso = false;
  ok("al volver un nodo, el subestado desaparece solo", ctx.tutoSubNodoEnEspera(paso) === null);
}

console.log("\nLA ESCENA DISTINGUE ENFRIAMIENTO DE UN GESTO A MEDIAS\n");
{
  const ini = FARM.indexOf("  nodoGuiaEnEspera(target)");
  const fin = FARM.indexOf("  // flecha del tutorial", ini);
  if (ini < 0 || fin < 0) throw new Error("No encontré la lectura de nodos de la guía");
  const metodo = FARM.slice(ini, fin).replace(/^\s*nodoGuiaEnEspera\(target\)/, "function nodoGuiaEnEspera(target)");
  let ahora = 100;
  const ctx = { nowMs: () => ahora, nodoBloqueado: () => false };
  vm.createContext(ctx);
  vm.runInContext(metodo, ctx);
  const escena = { objs: [{ type: "tree", readyAt: 220 }, { type: "tree", readyAt: 260 }] };
  ok("todos los árboles en enfriamiento activan el mensaje", ctx.nodoGuiaEnEspera.call(escena, "tree") === true);
  escena.objs[1].readyAt = 0;
  ok("un árbol listo impide el desvío", ctx.nodoGuiaEnEspera.call(escena, "tree") === false);
  escena.objs = [{ type: "tree", readyAt: 0, golpes: 1 }];
  ok("un árbol a medio cortar no se vende como descanso", ctx.nodoGuiaEnEspera.call(escena, "tree") === false);
  const tramo = FARM.slice(ini, FARM.indexOf("  updateTutoArrow()", ini) + 2400);
  ok("la flecha usa la misma lectura y respeta la parcela sugerida", /this\.nodoGuiaUsable\(o, ahora, eqPk\)/.test(tramo) && /st\.guiaPlot === "ready"/.test(tramo) && /st\.guiaPlot === "dry"/.test(tramo));
}

console.log("\nEL HUD CONSERVA EL AVANCE DEL OBJETIVO\n");
{
  const ini = UI.indexOf("function tutoRefresh()");
  const fin = UI.indexOf("// 13/8 (audio): la guía DENTRO", ini);
  if (ini < 0 || fin < 0) throw new Error("No encontré el HUD del tutorial");
  const dom = new JSDOM('<!doctype html><div id="tuto" class="hidden"><b id="tuto-txt"></b><span id="tuto-n"></span></div>');
  const paso = { id: "wood_st", res: "madera", target: "tree" };
  const ctx = {
    window: dom.window, document: dom.window.document, Math, Object, Array, String,
    G: { tuto: { n: 0 } }, guiaActiva: () => paso,
    tutoSub: () => ({ esperaNodo: true, txt: "Madera: plantá 2 semillas mientras vuelven los árboles", target: "plot" }),
    tutoNeed: () => 8, tutoTiene: () => 3, tutoTxt: () => "Juntá madera", tutoHighlight() {}, placeTuto() {}, placeToast() {}
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  ctx.tutoRefresh();
  ok("el mensaje explica la salida y el contador sigue visible", dom.window.document.getElementById("tuto-txt").textContent.includes("plantá") && dom.window.document.getElementById("tuto-n").textContent.trim() === "3/8");

  ctx.tutoSub = () => ({ txt: "Crafteá un hacha", target: "store" });
  ctx.tutoRefresh();
  ok("los subobjetivos ordinarios conservan su presentación previa", dom.window.document.getElementById("tuto-n").textContent === "");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el tutorial no se apaga cuando los nodos descansan.\n");
process.exit(fallos ? 1 : 0);
