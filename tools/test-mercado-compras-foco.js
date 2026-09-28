/* MERCADO: COMPRAR NO EXPULSA EL RECORRIDO DE TECLADO
   La pestaña Comprar se reconstruye después de cada operación. Comprueba que el gesto de
   Enter/Espacio conserva la acción equivalente en PC, usa una salida visible si se agota y no
   cambia el foco táctil en móvil.
     node tools/test-mercado-compras-foco.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("var SEED_SHOP_FOCO_PC");
const fin = UI.indexOf("/* ---- granja (nivel) ---- */", ini);
if (ini < 0 || fin < 0) throw new Error("No encontré la compra del Mercado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL MERCADO REPONE FOCO SÓLO DESPUÉS DE COMPRAR CON TECLADO\n");
{
  const tramo = UI.slice(ini, fin);
  ok("guarda el tipo de compra antes de la acción", /seedShopGuardarFocoPc\(ev, "buy", b\.dataset\.buy\)/.test(tramo) && /seedShopGuardarFocoPc\(ev, "emerg", b\.dataset\.emerg\)/.test(tramo) && /seedShopGuardarFocoPc\(ev, "cont", b\.dataset\.cont\)/.test(tramo));
  ok("prefiere la misma compra, otra disponible y la pestaña visible", /const mismo = caja\.querySelector/.test(tramo) && /acciones\.find\(b => !b\.disabled\)/.test(tramo) && /\.shoptab\[data-shop='buy'\]/.test(tramo));
  ok("móvil no recibe foco programático", /window\.innerWidth <= 640/.test(tramo));
}

console.log("\nUNA COMPRA SIGUE EN SU BOTÓN O EN COMPRAR\n");
{
  const dom = new JSDOM('<!doctype html><button id="antes">Antes</button><div id="ov-market"><button class="shoptab active" data-shop="buy">Comprar</button><div id="seed-shop"></div></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { plata: 4, golden: 0, res: { lombriz: 0 }, seeds: { papa: 0, zanahoria: 0 } },
    CROP_ORDER: ["papa", "zanahoria"],
    CROP_DEF: {
      papa: { label: "Papa", lvl: 1, seedCost: 2, grow: 60, emoji: "🥔" },
      zanahoria: { label: "Zanahoria", lvl: 2, seedCost: 3, grow: 90, emoji: "🥕" }
    },
    $: id => dom.window.document.getElementById(id), seedBuysToday: () => ({ count: 0 }), seedDailyMax: () => 99,
    cropUnlocked: () => true, fmt: n => String(n), fmtSecs: n => String(n) + " s", itemIcon: () => "", coinIc: () => "",
    tutoHighlight() {}
  };
  ctx.buySeed = (k, qty) => {
    const costo = ctx.CROP_DEF[k].seedCost * Math.max(1, Math.floor(qty || 1));
    if (ctx.G.plata < costo) return false;
    ctx.G.plata -= costo; ctx.G.seeds[k] += 1; ctx.refreshSeedShop(); return true;
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  ctx.refreshSeedShop();

  let papa = dom.window.document.querySelector('[data-buy="papa"]');
  papa.focus(); papa.onclick({ detail: 0 });
  papa = dom.window.document.querySelector('[data-buy="papa"]');
  ok("la compra posible conserva Papa en foco", ctx.G.plata === 2 && dom.window.document.activeElement === papa);

  papa.onclick({ detail: 0 });
  const tab = dom.window.document.querySelector(".shoptab[data-shop='buy']");
  ok("al quedar sin saldo, el foco cae en la pestaña Comprar", ctx.G.plata === 0 && dom.window.document.activeElement === tab);

  const antes = dom.window.document.getElementById("antes");
  antes.focus();
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  vm.runInContext('SEED_SHOP_FOCO_PC = { atributo: "buy", valor: "papa" };', ctx);
  ctx.seedShopReponerFocoPc(dom.window.document.getElementById("seed-shop"));
  ok("móvil conserva el foco táctil que ya tenía", dom.window.document.activeElement === antes);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: comprar en Mercado mantiene el recorrido de teclado en PC.\n");
process.exit(fallos ? 1 : 0);
