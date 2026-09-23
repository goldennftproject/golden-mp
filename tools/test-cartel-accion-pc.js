/* EL CARTEL DE PC SOLO PROMETE [E] CUANDO SIRVE
   =================================================
   El modo con granjero que camina anuncia la tecla de acción junto al objeto cercano. Este
   arnés corre updatePrompt() de verdad con un DOM mínimo y prueba que comparte las mismas
   puertas que interactWith(): una negativa se explica, pero no se anuncia como acción.
     node tools/test-cartel-accion-pc.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const prompt = {
  textContent: "", clases: new Set(),
  classList: { add(c) { prompt.clases.add(c); }, remove(c) { prompt.clases.delete(c); } },
};
const getAntes = ctx.document.getElementById;
ctx.document.getElementById = id => id === "prompt" ? prompt : getAntes(id);
Object.assign(ctx.GF, { uiOpen: false, editMode: false, NO_WALK: false });

function escena() {
  const esc = Object.create(g("FarmScene").prototype);
  Object.assign(esc, {
    action: null, placing: null, editHl: null,
    objetivo: null, agua: false,
    cargasBadge() {},
    nearestInteract() { return this.objetivo; },
    nearPond() { return this.agua; },
    promptText(o) { return o && o.texto || "Acción"; },
  });
  return esc;
}
function pinta(esc) {
  prompt.textContent = ""; prompt.clases.clear();
  esc.updatePrompt();
  return prompt.textContent;
}
function puerta(fn) { vm.runInContext("puedeAccion = " + fn.toString(), ctx); }

console.log("\nLA TECLA SOLO APARECE CUANDO LA PUERTA DA OK");
{
  const esc = escena();
  esc.objetivo = { type: "tree", readyAt: 0, texto: "Talar madera" };
  puerta(() => ({ ok: false, toast: "No tenés hacha — craftéala en la Herrería" }));
  let txt = pinta(esc);
  ok("un árbol sin hacha muestra el remedio", txt === "No tenés hacha — craftéala en la Herrería", txt);
  ok("y no finge que [E] vaya a talar", !/\[E\]/.test(txt), txt);

  puerta(() => ({ ok: false, bag: "talar" }));
  txt = pinta(esc);
  ok("una bolsa llena usa el mismo texto que el rechazo", txt === "Bolsa llena — no podés talar", txt);
  ok("y tampoco añade una tecla muerta", !/\[E\]/.test(txt), txt);

  puerta(() => ({ ok: true }));
  txt = pinta(esc);
  ok("si la acción sí puede empezar, conserva [E]", txt === "Talar madera  ·  [E]", txt);
}

console.log("\nLOS ESTADOS INFORMATIVOS NO PARECEN BOTONES");
{
  const esc = escena();
  esc.objetivo = { type: "plot", state: "growing", texto: "Creciendo…" };
  const txt = pinta(esc);
  ok("un cultivo creciendo conserva su estado", txt === "Creciendo…", txt);
  ok("pero sin [E] que solo diría 'Todavía está creciendo'", !/\[E\]/.test(txt), txt);
}

console.log("\nLA PESCA DICE EL CEBO REAL Y RESPETA SU PUERTA");
{
  const esc = escena();
  esc.objetivo = null; esc.agua = true;
  vm.runInContext('ceboPuesto = () => "larva_luz"; lanceExtraPrecio = () => 5;', ctx);
  G.res.larva_luz = 2;
  const pesca = esc.textoPescaPC();
  ok("anuncia la carnada seleccionada, no siempre una lombriz", /1 larva de luz · tenés 2/.test(pesca), pesca);
  ok("y hace visible el recargo cuando ya se acabó el cupo", /\+5 plata por cupo/.test(pesca), pesca);

  puerta(() => ({ ok: false, toast: "Tu caña está rota — reparala en Aparejos" }));
  const txt = pinta(esc);
  ok("una caña rota se explica antes de pulsar", txt === "Tu caña está rota — reparala en Aparejos", txt);
  ok("sin ofrecer [E] a una pesca rechazada", !/\[E\]/.test(txt), txt);
}

console.log("\nLA SIEMBRA DE PC NOMBRA LO QUE REALMENTE VA A PLANTAR");
{
  const esc = escena();
  const anterior = { sel: G.selSeed, seeds: G.seeds, hotbar: G.hotbar, hotSel: G.hotSel };
  G.selSeed = "sin_semilla"; G.seeds = { papa: 1 }; G.hotbar = []; G.hotSel = 0;
  vm.runInContext("cropUnlocked = () => true;", ctx);
  const ck = esc.semillaParaPlantar();
  const txt = esc.textoPromptPC({ type: "plot", state: "dry" });
  ok("elige la primera semilla que la acción real también elegirá", ck === "papa", ck);
  ok("el cartel dice Papa en vez de una selección agotada", txt === "Plantar Papa", txt);
  ok("mirar el cartel no cambia todavía la semilla elegida", G.selSeed === "sin_semilla", G.selSeed);
  G.selSeed = anterior.sel; G.seeds = anterior.seeds; G.hotbar = anterior.hotbar; G.hotSel = anterior.hotSel;
}

ctx.document.getElementById = getAntes;
console.log(fallos ? "\n" + fallos + " fallo(s) — el cartel todavía promete acciones imposibles.\n" : "\nTodo en orden: en PC el cartel anticipa la acción real y reserva [E] para cuando sirve.\n");
process.exit(fallos ? 1 : 0);
