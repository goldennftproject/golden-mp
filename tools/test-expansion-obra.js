/* LA EXPANSIÓN TARDA: SE PAGA AHORA, LA CERCA SE ABRE DESPUÉS                (20/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Discord, 20:19: « algo que podemos agregar… es que en las expansiones no sea instantánea, que
   duren 10 minutos y se vaya incrementando… mayor expansión mayor tiempo ».

   Contratos:
     · pagar NO abre la cerca: deja una OBRA con hora de fin = ahora + 10 min × número;
     · mientras dura, no se puede pagar otra, y la brújula lo dice;
     · el tick no entrega antes de hora y entrega en cuanto se cumple (una sola vez);
     · la obra viaja en el guardado y, si terminó con el juego cerrado, se entrega al volver;
     · GF.EXP_OBRA = 0 devuelve la compra instantánea de siempre.
     node tools/test-expansion-obra.js                                                          */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
let _falso = Date.UTC(2026, 8, 20, 12, 0, 0);
vm.runInContext("(function(f){ nowMs = f; })", ctx)(() => _falso);
const avanzar = (min) => { _falso += min * 60000; };
const avisos = [];
ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t));
ctx.closeOv = () => {}; ctx.window.sfx = null;
/* la entrega en vivo necesita la escena; acá basta con que la llamen */
let entregas = 0;
ctx.window.FARM = { expandirEnVivo: (b, festejar) => { entregas++; if (festejar) festejar(); return true; } };
ctx.window.celebrate = () => {};

function listoParaComprar() {
  const e = g("expansionSiguiente()");
  G.level = Math.max(G.level || 1, e.nivel);
  G.res = G.res || {}; for (const k in e.costo) G.res[k] = e.costo[k] + 3;
  return e;
}

console.log("\n1 · PAGAR DEJA UNA OBRA, NO UNA EXPANSIÓN\n");
{
  ok("la bandera está puesta", ctx.GF.EXP_OBRA === 1, "GF.EXP_OBRA = " + ctx.GF.EXP_OBRA);
  ok("y la primera tarda 10 minutos", g("expansionObraMin(1)") === 10, g("expansionObraMin(1)") + " min");
  ok("la 2ª 20 y la 16ª 160: « mayor expansión, mayor tiempo »", g("expansionObraMin(2)") === 20 && g("expansionObraMin(16)") === 160);
  G.expansiones = 0;
  const e = listoParaComprar();
  const madera = G.res.madera;
  const r = g("expansionComprar()");
  ok("expansionComprar contesta que sí (se cobró)", r === true);
  ok("y cobró los materiales", G.res.madera === madera - e.costo.madera, "madera " + madera + " → " + G.res.madera);
  ok("pero la cerca NO se abrió todavía", (G.expansiones || 0) === 0, "expansiones = " + G.expansiones);
  ok("hay una obra con hora de fin a 10 min", G.expObra && G.expObra.hasta === _falso + 10 * 60000);
  ok("el jugador lo lee en el registro", avisos.some(a => /Obra en marcha/.test(a)), avisos.slice(-2).join(" | "));
  G.tuto = { done: true }; ctx.dailyState = () => ({ claimable: false }); ctx.cartaAbueloPendiente = () => false; const bj = g("brujula()");
  ok("y la brújula lo dice", !!(bj && /en obra/.test(bj.txt)), bj && bj.txt);
}

console.log("\n2 · MIENTRAS DURA, NI SE ENTREGA NI SE PAGA OTRA\n");
{
  listoParaComprar();
  avisos.length = 0;
  ok("no deja pagar otra", g("expansionComprar()") === false && /en obra/.test(avisos.join(" ")), avisos.join(" | "));
  avanzar(9);
  ok("a los 9 minutos el tick no entrega", g("expansionObraTick()") === false && (G.expansiones || 0) === 0);
  avanzar(1);
  ok("a los 10, sí", g("expansionObraTick()") === true && G.expansiones === 1, "expansiones = " + G.expansiones);
  ok("por la puerta de siempre (expandirEnVivo con el bloque)", entregas === 1);
  ok("y la obra desaparece", !G.expObra);
  ok("un segundo tick no entrega dos veces", g("expansionObraTick()") === false && G.expansiones === 1);
  ok("y la parcela llegó, como siempre", (G.expParcelasDadas || 0) === 1);
}

console.log("\n3 · LA OBRA VIAJA EN EL GUARDADO Y TERMINA CON EL JUEGO CERRADO\n");
{
  listoParaComprar();
  g("expansionComprar()");
  const snap = g("snapshot()");
  ok("snapshot lleva la obra", snap.expObra && snap.expObra.hasta === G.expObra.hasta);
  const copia = JSON.parse(JSON.stringify(snap));
  delete G.expObra;
  avanzar(25);                        // la 2ª tarda 20: « cerraste el juego y volviste »
  g("hydrate")(copia);
  ok("hydrate la recupera", G.expObra && G.expObra.n === 2);
  ok("y el primer tick al volver la entrega", g("expansionObraTick()") === true && G.expansiones === 2, "expansiones = " + G.expansiones);
  const sinObra = JSON.parse(JSON.stringify(g("snapshot()")));
  G.expObra = { i: 9, n: 10, hasta: 1 };
  g("hydrate")(sinObra);
  ok("un guardado sin obra la limpia (no queda una obra fantasma)", !G.expObra);
}

console.log("\n4 · CON LA BANDERA APAGADA, INSTANTÁNEA COMO ANTES\n");
{
  ctx.GF.EXP_OBRA = 0;
  listoParaComprar();
  const antes = G.expansiones;
  ok("compra y abre en el acto", g("expansionComprar()") === true && G.expansiones === antes + 1 && !G.expObra);
  ctx.GF.EXP_OBRA = 1;
}

console.log("\n5 · LA CARA: el botón del panel dice cuánto tarda (lectura de código)\n");
{
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("el botón anuncia la obra antes de pagar", /"Expandir · obra de "/.test(UI));
  ok("y en obra muestra el reloj y queda apagado", /"En obra · " \+ expansionObraTxt\(\)/.test(UI) && /btn\.disabled = true; btn\.onclick = null;/.test(UI));
  ok("el HUD llama al tick cada segundo", /expansionObraTick\(\)/.test(UI.slice(UI.indexOf("setInterval(() => { if (typeof buffTick"))));
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ la expansión se paga ahora y se abre cuando termina la obra\n");
process.exit(fallos ? 1 : 0);
