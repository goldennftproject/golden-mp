/* LONJA: VENDER, ENTREGAR Y COMPRAR NO EXPULSAN EL TECLADO
   Las acciones nativas ya reciben Enter/Espacio; al rehacer el cuerpo, el foco debe continuar
   en su reemplazo, otra acción disponible o la pestaña actual. No abre el juego.
     node tools/test-lonja-acciones-foco.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("var LONJA_TAB =");
const fin = UI.indexOf("function tituloLonjaEnFoco", ini);
if (ini < 0 || fin < 0) throw new Error("No encontré las acciones de la Lonja");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA LONJA GUARDA FOCO SÓLO CUANDO LA ACCIÓN NACE DEL TECLADO\n");
{
  const tramo = UI.slice(ini, fin);
  ok("las tres rutas guardan y restauran su acción", /lonjaGuardarFocoPc\(ev, "vender"/.test(tramo) && /lonjaReponerFocoPc\(caja, "vender", "pvend"\)/.test(tramo) && /lonjaGuardarFocoPc\(ev, "pedido"/.test(tramo) && /lonjaReponerFocoPc\(caja, "pedido", "lent"\)/.test(tramo) && /lonjaGuardarFocoPc\(ev, "tienda"/.test(tramo) && /lonjaReponerFocoPc\(caja, "tienda", "lcomp"\)/.test(tramo));
  ok("el foco busca la misma acción, luego una disponible y finalmente la pestaña", /String\(b\.dataset\[dato\]\) === foco\.valor && !b\.disabled/.test(tramo) && /botones\.find\(b => !b\.disabled\)/.test(tramo) && /\[data-ltab='" \+ LONJA_TAB \+ "'\]/.test(tramo));
  ok("móvil no recibe un foco impuesto", /window\.innerWidth <= 640/.test(tramo));
}

console.log("\nVENDER CONTINÚA EN LA MISMA PILA Y LUEGO EN LA PESTAÑA\n");
{
  const dom = new JSDOM('<!doctype html><div id="ov-lonja"><button data-ltab="vender">Vender</button></div><div id="lonja-cuerpo"></div>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, console,
    G: { fish: { "trucha@2": 2 } },
    pecesDeLaBolsa: () => Object.keys(ctx.G.fish).filter(k => ctx.G.fish[k] > 0),
    PEZ_DEF: { trucha: { label: "Trucha" } },
    pezDeClave: k => ({ id: k.split("@")[0], kg: 2 }), pezPrecio: () => 9,
    itemIcon: () => "", itemView: () => ({}), fmt: n => String(n),
    pezVender: k => { ctx.G.fish[k]--; if (ctx.G.fish[k] <= 0) delete ctx.G.fish[k]; },
    lonjaActivos: () => [], lonjaFilaEscalon: () => "", lonjaEntregarEscalon: () => false,
    LONJA_TIENDA_ORDER: [], LONJA_TIENDA: {}, lonjaTiendaFalta: () => null, lonjaTiendaTengo: () => false,
    lonjaComprar: () => false, RES_LABEL: {}
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  const caja = dom.window.document.getElementById("lonja-cuerpo");
  vm.runInContext('LONJA_TAB = "vender";', ctx);
  ctx.refreshLonja = () => ctx.lonjaPintaVender(caja);
  ctx.lonjaPintaVender(caja);

  let vender = caja.querySelector("[data-pvend]");
  vender.focus();
  vender.onclick({ detail: 0 });
  vender = caja.querySelector("[data-pvend]");
  ok("la primera venta por teclado conserva la misma pila en foco", !!vender && dom.window.document.activeElement === vender && ctx.G.fish["trucha@2"] === 1);

  vender.onclick({ detail: 0 });
  const pestaña = dom.window.document.querySelector("[data-ltab='vender']");
  ok("al vender la última pieza, el foco cae en la pestaña visible", !caja.querySelector("[data-pvend]") && dom.window.document.activeElement === pestaña);

  caja.innerHTML = '<button data-lcomp="red" disabled>roto</button><button data-lcomp="verde">seguir</button>';
  vm.runInContext('LONJA_FOCO_PC = { tab: "vender", tipo: "tienda", valor: "red" };', ctx);
  ctx.lonjaReponerFocoPc(caja, "tienda", "lcomp");
  ok("si la acción exacta se apaga, usa la siguiente disponible", dom.window.document.activeElement === caja.querySelector('[data-lcomp="verde"]'));

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  pestaña.focus();
  vm.runInContext('LONJA_FOCO_PC = { tab: "vender", tipo: "tienda", valor: "verde" };', ctx);
  ctx.lonjaReponerFocoPc(caja, "tienda", "lcomp");
  ok("móvil conserva el flujo táctil sin foco programático", dom.window.document.activeElement === pestaña);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: las acciones de la Lonja conservan el recorrido de teclado en PC.\n");
process.exit(fallos ? 1 : 0);
