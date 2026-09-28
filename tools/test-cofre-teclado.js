/* COFRE: TRANSFERIR PILAS TAMBIÉN SE HACE CON TECLADO EN PC
   Las dos columnas se reconstruyen después de guardar o sacar. La identidad que conserva el
   foco es kind/key, no el índice visual, porque la bolsa se reordena cuando una pila cambia.
     node tools/test-cofre-teclado.js */
const fs = require("fs"), vm = require("vm"), { JSDOM } = require("jsdom");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const iniAccion = UI.indexOf("function activarAccionConTeclado");
const finAccion = UI.indexOf("function enfocarAccionViaje", iniAccion);
const iniCofre = UI.indexOf("function focoCofrePc");
const finCofre = UI.indexOf("/* ---- cocina", iniCofre);
if (iniAccion < 0 || finAccion < 0 || iniCofre < 0 || finCofre < 0) throw new Error("No encontré el Cofre o la puerta de teclado");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLAS PILAS ACCIONABLES DECLARAN QUÉ TRANSFIEREN\n");
{
  const fn = UI.slice(iniCofre, finCofre);
  ok("las pilas del cofre y de la bolsa son botones con nombre", /data-wd=.*role="button" tabindex="0" aria-label=/.test(fn) && /data-dp=.*role="button" tabindex="0" aria-label=/.test(fn));
  ok("la misma puerta cubre guardar y sacar", /activarAccionConTeclado\(el, retirar\)/.test(fn) && /activarAccionConTeclado\(el, guardar\)/.test(fn));
  ok("el foco recuerda el objeto y busca primero su lado opuesto", /kind: celda\.dataset\.ckind/.test(fn) && /iguales\(destino\)/.test(fn));
  ok("móvil no recibe foco programático", /window\.innerWidth <= 640/.test(fn));
}

console.log("\nESPACIO Y ENTER TRANSFIEREN UNA VEZ Y CONTINÚAN EN LA PILA EQUIVALENTE\n");
{
  const dom = new JSDOM('<!doctype html><div id="cofre-info"></div><div id="cofre-slots"></div><div id="cofre-inv"></div><button id="cofre-pickup"></button>', { pretendToBeVisual: true });
  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 1280 });
  dom.window.chestOpen = 0;
  const mundo = [];
  const G = { chests: [{ items: [{ kind: "res", key: "madera", n: 4 }, null, null] }],
    res: { madera: 2, piedra: 3 }, seeds: {}, fish: {}, dishes: {} };
  const etiquetas = { madera: "Madera", piedra: "Piedra" };
  const ctx = {
    window: dom.window, document: dom.window.document, String, Math, Array, Object, G,
    $: id => dom.window.document.getElementById(id), ITEM_RES_ORDER: ["madera", "piedra"], CROP_ORDER: [], RECIPE_ORDER: [],
    chestBonus: () => 1, pecesDeLaBolsa: () => [], itemView: d => ({ label: etiquetas[d.key] || d.key }), itemIcon: () => "<span>📦</span>", fmt: n => String(n),
    escapeHtml: s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
    chestWithdraw(ci, si) {
      const pila = G.chests[ci].items[si]; if (!pila) return;
      G.res[pila.key] = (G.res[pila.key] || 0) + pila.n; G.chests[ci].items[si] = null; ctx.refreshChest();
    },
    chestDeposit(ci, kind, key) {
      const n = G.res[key] || 0; if (!n) return;
      let pila = G.chests[ci].items.find(s => s && s.kind === kind && s.key === key);
      if (!pila) { const i = G.chests[ci].items.indexOf(null); if (i < 0) return; pila = G.chests[ci].items[i] = { kind, key, n: 0 }; }
      pila.n += n; G.res[key] = 0; ctx.refreshChest();
    },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniAccion, finAccion), ctx);
  vm.runInContext(UI.slice(iniCofre, finCofre), ctx);
  dom.window.addEventListener("keydown", e => mundo.push(e.key));
  ctx.refreshChest();

  const box = dom.window.document.getElementById("cofre-slots"), inv = dom.window.document.getElementById("cofre-inv");
  const maderaCofre = box.querySelector('[data-wd="0"]'), vacio = box.children[1], maderaBolsa = inv.querySelector('[data-ckey="madera"]');
  ok("las pilas se alcanzan por Tab y los huecos no", maderaCofre.getAttribute("role") === "button" && maderaCofre.tabIndex === 0 && /Sacar Madera del cofre/.test(maderaCofre.getAttribute("aria-label") || "") &&
    maderaBolsa.getAttribute("role") === "button" && /Guardar Madera en el cofre/.test(maderaBolsa.getAttribute("aria-label") || "") && !vacio.getAttribute("role") && vacio.tabIndex < 0);

  maderaCofre.focus();
  const espacio = new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  maderaCofre.dispatchEvent(espacio);
  const maderaDestino = inv.querySelector('[data-ckind="res"][data-ckey="madera"]');
  ok("Espacio retira la pila, cancela scroll y no llega al mundo", G.chests[0].items[0] === null && G.res.madera === 6 && espacio.defaultPrevented && mundo.length === 0);
  ok("tras retirar, el foco continúa en esa misma pila dentro de la bolsa", dom.window.document.activeElement === maderaDestino && /Guardar Madera/.test(maderaDestino.getAttribute("aria-label") || ""));

  const piedraBolsa = inv.querySelector('[data-ckind="res"][data-ckey="piedra"]');
  piedraBolsa.focus();
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  piedraBolsa.dispatchEvent(enter);
  const piedraDestino = box.querySelector('[data-ckind="res"][data-ckey="piedra"]');
  ok("Enter guarda la otra pila y sigue su equivalente en el cofre", G.res.piedra === 0 && enter.defaultPrevented && mundo.length === 0 && dom.window.document.activeElement === piedraDestino && /Sacar Piedra/.test(piedraDestino.getAttribute("aria-label") || ""));

  const repetida = new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, repeat: true });
  piedraDestino.dispatchEvent(repetida);
  ok("mantener Enter no retira la pila de nuevo", G.chests[0].items[0].key === "piedra" && repetida.defaultPrevented && mundo.length === 0);

  Object.defineProperty(dom.window, "innerWidth", { configurable: true, value: 640 });
  let focosMovil = 0;
  ctx.enfocarCofrePc({ querySelectorAll() { return []; }, querySelector() { return { focus() { focosMovil++; } }; } }, { querySelectorAll() { return []; }, querySelector() { return { focus() { focosMovil++; } }; } }, { lado: "cofre", kind: "res", key: "piedra", indice: "0" });
  ok("en móvil no se fuerza el foco luego de un toque", focosMovil === 0);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el Cofre se recorre y transfiere pilas con mouse o teclado en PC.\n");
process.exit(fallos ? 1 : 0);
