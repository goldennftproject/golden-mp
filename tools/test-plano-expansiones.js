/* EL PLANO DE LA GRANJA: TODAS LAS EXPANSIONES, DE UN VISTAZO Y CASI SIN TEXTO (20/8, dirección)
   "Debería mostrar todas las expansiones con lo que se desbloquea en cada una. En el mapa, solo
    llegado el nivel. Pero tendría que haber otra forma de informárselo al jugador. ¿Cuál?"
   La respuesta: un plano esquemático en Mercado → Adornos con los 16 bloques en su posición real.
   Nivel + tres iconos por bloque; verde lo tuyo, dorado lo comprable, apagado lo que viene.

   Este test renderiza la tienda DE VERDAD con jsdom y le pregunta al DOM lo que vería el jugador:
   ¿están los 16 bloques? ¿en posiciones distintas y sin solaparse con la granja? ¿el estado de
   cada uno es el correcto para este nivel? ¿y la información es icónica, no un parrafazo?
     node tools/test-plano-expansiones.js                                                         */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

const dom = new JSDOM('<div id="deco-shop"></div>');
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
  document: dom.window.document };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};   // ui.js engancha el resize de la ventana
ctx.Image = dom.window.Image;   // la precarga de sprites del correo usa new Image()
vm.createContext(ctx);
["config", "nav", "state", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, GF = ctx.GF;
/* FARM_EXPANSION es const del script: no cuelga de window — se pide al contexto */
const NIVELES = vm.runInContext("FARM_EXPANSION", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* jugador con 2 expansiones compradas y nivel para la tercera */
G.expansiones = 2; G.level = NIVELES[2]; G.res = {}; G.plotsOwned = 5; G.plata = 0; G.golden = 0;
G.decos = []; G.decoBolsa = {}; G.tuto = { done: true };
ctx.refreshDeco();
const box = dom.window.document.getElementById("deco-shop");
const bloques = [...box.querySelectorAll('div[title^="Expansión"]')];

console.log("\nEL PLANO ESTÁ EN LA TIENDA, CON SUS 16 BLOQUES");
ok("hay 16 bloques dibujados", bloques.length === 16, bloques.length + " bloques");
{
  const pos = new Set(bloques.map(b => b.style.left + "|" + b.style.top));
  ok("cada uno en una posición distinta", pos.size === 16, pos.size + " posiciones");
  /* y ninguno pisa la granja: la base va de (0,0) a (15,15) del plano, los bloques la rodean */
  const CEL = 11, base = { x0: 5 * GF.BLOQUE, y0: 5 * GF.BLOQUE };   // la base arranca en la celda (5,5) del lienzo (0−(−5))
  const dentroBase = bloques.filter(b => {
    const x = parseInt(b.style.left), y = parseInt(b.style.top);
    return x >= 5 * CEL && x < (5 + GF.COLS_BASE) * CEL && y >= 5 * CEL && y < (5 + GF.ROWS_BASE) * CEL;
  });
  ok("y ninguno pisa la granja base", dentroBase.length === 0, "el anillo rodea, no tapa");
}

console.log("\nCADA BLOQUE DICE SU ESTADO — Y EL ESTADO ES EL CORRECTO");
{
  const compradas = bloques.filter(b => /ya es tuya/.test(b.title));
  ok("las 2 compradas se marcan como tuyas", compradas.length === 2, compradas.map(b => b.title.slice(0, 12)).join(" · "));
  ok("y llevan la palomita, no el nivel", compradas.every(b => b.textContent.includes("✓") && !/Nv/.test(b.textContent)));
  const doradas = bloques.filter(b => b.style.border.includes("255, 213, 74") || /ffd54a/i.test(b.style.border));
  ok("exactamente UNA está dorada: la que ya podés comprar", doradas.length === 1,
    doradas.length + " (la n°3, con nivel " + G.level + ")");
  ok("y es la expansión 3", doradas.length === 1 && /Expansión 3 /.test(doradas[0].title));
  const futuras = bloques.filter(b => !/ya es tuya/.test(b.title) && b !== doradas[0]);
  ok("las 13 futuras muestran su nivel de apertura", futuras.length === 13 && futuras.every(b => /Nv \d+/.test(b.textContent)));
  const niveles = futuras.map(b => parseInt(b.textContent.match(/Nv (\d+)/)[1]));
  ok("y los niveles salen de FARM_EXPANSION, no a mano",
    niveles.every(n => NIVELES.includes(n)), niveles.join(" "));
}

console.log("\nLA INFORMACIÓN ES ICÓNICA: SE VE, NO SE LEE");
{
  const sinComprar = bloques.filter(b => !/ya es tuya/.test(b.title));
  ok("cada bloque sin comprar trae los 3 iconos: árbol, roca y parcela",
    sinComprar.every(b => ["tree", "node_stone", "plot"].every(k => [...b.querySelectorAll("img")].some(im => im.src.includes(k)))));
  ok("dentro del bloque no hay más texto que el nivel",
    sinComprar.every(b => b.textContent.trim().replace(/Nv \d+/, "").trim() === ""),
    "el detalle vive en el tooltip, no en el plano");
  /* el detalle completo está al alcance (title), para quien lo quiera */
  ok("el tooltip cuenta el premio completo", sinComprar.every(b => /1 árbol, 1 roca y 1 parcela/.test(b.title)));
}

console.log("\nY EL MAPA DEL JUEGO NO CAMBIÓ: EL LOTE SIGUE SIN EXISTIR HASTA EL NIVEL");
{
  /* la regla de dirección en farm.js sigue intacta: el corte por nivel, arriba del todo */
  const FARM = fs.readFileSync("public/game/farm.js", "utf8");
  ok("dibujarExpansion corta por nivel antes de dibujar", /const falta = \(G\.level \|\| 1\) < ex\.nivel;[\s\S]{0,1800}?if \(falta\) return;/.test(FARM));
  ok("y no quedó ningún fantasma del intento anterior", !/FANTASMAS DEL PREMIO/.test(FARM), "revertido entero");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el plano informa, el mapa se calla.\n");
process.exit(fallos ? 1 : 0);
