/* MERCADO: VENDER DESDE TECLADO NO ROMPE EL RECORRIDO
   state.js refresca toda la lista tras una venta. Este arnés comprueba que Enter/Espacio vuelven
   a la misma fila, a otra venta posible o a la moneda activa, sólo en escritorio.
     node tools/test-mercado-venta-foco.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("var MARKET_VENTA_FOCO_PC");
const fin = UI.indexOf("// tienda de semillas:", ini);
if (ini < 0 || fin < 0) throw new Error("No encontré la venta del Mercado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL MERCADO GUARDA FOCO SÓLO PARA VENTAS DE TECLADO\n");
{
  const tramo = UI.slice(ini, fin);
  ok("la venta guarda el recurso antes de llamar a estado", /marketGuardarVentaFocoPc\(ev, res\); sellItem\(res\)/.test(tramo));
  ok("la vuelta prefiere la misma fila, otra venta y la moneda activa", /const mismo = \$\("vb-" \+ res\)/.test(tramo) && /querySelectorAll\("\.vbtn"\)/.test(tramo) && /\.curbtn\.active/.test(tramo));
  ok("móvil no recibe foco programático", /window\.innerWidth <= 640/.test(tramo));
}

console.log("\nUNA VENTA SIGUE EN SU FILA O EN UNA SALIDA VISIBLE\n");
{
  const dom = new JSDOM('<!doctype html><button class="curbtn active" data-cur="plata">Plata</button><button class="curbtn" data-cur="golden">Golden</button><span id="mkt-cur-note"></span><div id="mkt-list"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { res: { madera: 2, piedra: 0 } }, SELLABLE: ["madera", "piedra"], RES_LABEL: { madera: "Madera", piedra: "Piedra" }, RES_EMOJI: {},
    marketCur: "plata", GOLDEN_EN_PLATA: 500, $: id => dom.window.document.getElementById(id),
    tutoActivo: () => null, ventaMinGolden: () => 1, ventaGolden: () => ({ plata: 500, golden: 1, resto: 0 }),
    totalVenta: (_res, q) => q * 10, precioVenta: () => 10, marketUnit: () => 10,
    fmt: n => String(n), fmtDec: n => String(n), itemIcon: () => "", resSprite: r => r,
    refreshSeedShop() {}, refreshDeco() {}, tutoHighlight() {}
  };
  ctx.sellItem = res => { ctx.G.res[res]--; if (ctx.G.res[res] < 0) ctx.G.res[res] = 0; ctx.refreshMarket(); };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  ctx.refreshMarket();

  let venta = dom.window.document.getElementById("vb-madera");
  venta.focus(); venta.onclick({ detail: 0 });
  venta = dom.window.document.getElementById("vb-madera");
  ok("la primera venta con teclado conserva Madera en foco", ctx.G.res.madera === 1 && dom.window.document.activeElement === venta);

  venta.onclick({ detail: 0 });
  const plata = dom.window.document.querySelector('.curbtn[data-cur="plata"]');
  ok("al agotar la fila, el foco cae en la moneda activa", ctx.G.res.madera === 0 && dom.window.document.activeElement === plata);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  plata.focus();
  vm.runInContext('MARKET_VENTA_FOCO_PC = "madera";', ctx);
  ctx.marketReponerVentaFocoPc(dom.window.document.getElementById("mkt-list"));
  ok("móvil conserva su foco táctil actual", dom.window.document.activeElement === plata);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: vender en Mercado mantiene el recorrido de teclado en PC.\n");
process.exit(fallos ? 1 : 0);
