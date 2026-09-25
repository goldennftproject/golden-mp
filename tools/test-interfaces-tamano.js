/* NINGUNA INTERFAZ DEL RINCÓN CAMBIA DE TAMAÑO AL INTERACTUAR (20/8, dirección)
   "Ninguna interfaz debería cambiar de tamaño cuando se interactúa con algo de la propia
    interfaz." El paquete ya tiene su test (test-paquete-tamano); acá van las otras tres
   pantallas de la misma plantilla, cada una con su causa de salto encontrada en la revisión:

     BAÚL    el subtítulo se vaciaba al abrir el kit y colapsaba su línea (~17 px);
     BUZÓN   la carta y la pila entraban donde estaban los sobres, sin reservar altura,
             y el estado también se vaciaba;
     TABLÓN  las vistas "pedidos" y "canje" comparten contenedor con alturas distintas.

   La regla del arreglo es la misma del paquete: EL ESPACIO SE RESERVA SIEMPRE — min-height en lo
   que se vacía, la misma reserva para vistas que se alternan, y para listas de largo variable el
   patrón que el juego ya usa en el Mercado y la Herrería: altura fija con scroll interno.

   jsdom no calcula layout: el tamaño no se mide en píxeles, se miden las RESERVAS (los estilos
   que lo determinan) y se ejecutan los refresh reales en cada estado para comprobar que ninguno
   las pisa ni saca contenedores del layout.
     node tools/test-interfaces-tamano.js                                                         */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("public/index.html", "utf8");
const dom = new JSDOM(html);
const timers = [];
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setInterval: () => 0, clearInterval() {},
  document: dom.window.document, Image: dom.window.Image };
ctx.setTimeout = (fn) => { timers.push(fn); return timers.length; };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
vm.createContext(ctx);
["config", "nav", "state", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "closeOv", "openOv"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, doc = dom.window.document;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const enLayout = (el) => el && dom.window.getComputedStyle(el).display !== "none";

console.log("\nEL BAÚL: ABRIR EL KIT NO COLAPSA NADA");
{
  const sub = doc.getElementById("baul-sub"), items = doc.getElementById("baul-items"), img = doc.getElementById("baul-img");
  ok("el subtítulo reserva su línea", /min-height/.test(sub.getAttribute("style") || ""), "vaciarlo ya no lo colapsa");
  ok("la fila de items reserva su altura (CSS)", /#baul-items\{[^}]*min-height:52px/.test(html));
  ok("y la imagen del baúl es de altura fija", /height:\s*110px/.test(img.getAttribute("style") || ""));
  /* el flujo real: kit sin reclamar → tocar → temblor → reclamo. El estilo del sub sobrevive. */
  G.kitReclamado = false;
  ctx.refreshBaul();
  ok("con el kit a la vista hay items dibujados", items.innerHTML.length > 0);
  img.onpointerdown({ preventDefault() {} });
  timers.splice(0).forEach(fn => fn());   // temblor + reclamo + limpieza
  ok("tras abrir, el sub conserva su reserva", /min-height/.test(sub.getAttribute("style") || ""),
    "el texto se fue; la línea queda");
  ok("y la fila de items sigue en el layout", enLayout(items), "vacía pero con sus 52px de CSS");
}

console.log("\nEL BUZÓN: SOBRES, CARTA Y PILA COMPARTEN LA MISMA RESERVA");
{
  const estado = doc.getElementById("bz-estado"), img = doc.getElementById("bz-img");
  ok("el estado reserva su línea", /min-height/.test(estado.getAttribute("style") || ""));
  ok("los sobres reservan 86px (ya estaba)", /#bz-sobres\{[^}]*min-height:86px/.test(html));
  ok("la carta reserva LOS MISMOS 86px", /#bz-carta\{[^}]*min-height:86px/.test(html),
    "cambiar de vista no achica la tarjeta");
  ok("y la pila larga scrollea por dentro, no estira", /#bz-carta\{[^}]*max-height:52vh[^}]*overflow:auto/.test(html),
    "el patrón del Mercado");
  ok("la pila de la esquina es absoluta: no empuja el layout", /#bz-pila\{[^}]*position:absolute/.test(html));
  ok("y la imagen del buzón es de altura fija", /height:\s*96px/.test(img.getAttribute("style") || ""));
  /* las tres vistas se ejecutan de verdad y ninguna pisa las reservas */
  G.buzonArchivo = [{ id: "x", dia: "2026-08-19", de: "El pueblo", titulo: "Hola", txt: "..." }];
  ["sobres", "pila"].forEach(v => { vm.runInContext('_bzVista = "' + v + '"', ctx); ctx.refreshBuzon(); });
  ok("tras recorrer las vistas, el estado conserva su reserva", /min-height/.test(estado.getAttribute("style") || ""));
}

console.log("\nEL TABLÓN: PEDIDOS Y CANJE MIDEN LO MISMO");
{
  ok("la lista tiene ALTURA FIJA con scroll interno", /#pd-lista\{[^}]*height:min\(380px,55vh\)[^}]*overflow:auto/.test(html),
    "las dos vistas comparten contenedor: fija es la única garantía");
  /* las dos vistas se renderizan de verdad en el mismo contenedor */
  const lista = doc.getElementById("pd-lista");
  vm.runInContext('_pdVista = "pedidos"', ctx); ctx.refreshPedidos();
  const conNotas = lista.children.length;
  vm.runInContext('_pdVista = "canje"', ctx); ctx.refreshPedidos();
  const conCanje = lista.children.length;
  ok("ambas vistas dibujan contenido en el mismo contenedor", conNotas > 0 && conCanje > 0,
    conNotas + " notas · " + conCanje + " artículos de canje");
  ok("y el contenedor nunca sale del layout", enLayout(lista));
}

console.log("\nEL COFRE GRANDE NO EMPUJA LA BOLSA FUERA DE UNA PANTALLA PC");
{
  /* La capacidad se gana también en los cuatro niveles que antes quedaban mudos: el último
     cofre tiene 10 huecos base + todos esos premios, no la rejilla corta del arranque. */
  const cupo = vm.runInContext("CHEST_SLOTS + Object.values(FARM_COFRE).reduce((n, v) => n + v, 0)", ctx);
  const cofresAntes = G.chests, abiertoAntes = ctx.chestOpen;
  try {
    /* El bonus de materiales lo da el cofre ya colocado, no el que sigue guardado en la bolsa.
       El panel toma el mismo cálculo que la mecánica, así no puede prometer un porcentaje falso. */
    G.chests = [
      { col: 0, row: 0, items: Array(cupo).fill(null) },
      { col: null, row: null, items: Array(10).fill(null) }
    ]; ctx.chestOpen = 0;
    ctx.refreshChest();
    const slots = doc.getElementById("cofre-slots");
    ok("el cofre de nivel máximo puede mostrar 65 casillas", cupo === 65 && slots.children.length === cupo,
      cupo + " dibujadas: no se corta ni se inventa una capacidad menor");
    ok("la grilla grande se desplaza dentro de su propio espacio en PC",
      /#ov-cofre #cofre-slots\{max-height:min\(300px,30vh\) !important;overflow-y:auto;overscroll-behavior:contain\}/.test(html));
    ok("y la tarjeta tiene una segunda red para una pantalla baja",
      /#ov-cofre \.card\{max-height:calc\(100vh - 32px\);overflow-y:auto;overscroll-behavior:contain\}/.test(html));
    const info = doc.getElementById("cofre-info").textContent;
    ok("un cofre sin colocar no infla el bonus que anuncia el panel", /\+1%/.test(info) && !/\+2%/.test(info),
      info);
  } finally {
    G.chests = cofresAntes;
    if (abiertoAntes === undefined) delete ctx.chestOpen;
    else ctx.chestOpen = abiertoAntes;
  }
}

console.log("\nEL ÚLTIMO OVERLAY ABIERTO QUEDA AL FRENTE EN PC");
{
  /* Se abren en orden DOM inverso. Sin foco dinámico, Zona Negra queda detrás de «¿Cuántas?»
     solo porque aparece antes en el HTML, aunque sea la ventana que el jugador pidió después. */
  const anterior = doc.getElementById("ov-cuanto"), ultimo = doc.getElementById("ov-zonares");
  const movil = doc.getElementById("ov-confirm"), anchoAntes = ctx.innerWidth;
  const limpiar = el => { el.classList.remove("show"); el.style.removeProperty("--ov-frente"); };
  /* JSDOM conserva `var(--ov-frente,10)` como texto en zIndex; la variable sí es el valor que
     escribe el juego. La regla CSS de abajo comprueba que esa variable es la que pinta la capa. */
  const capa = el => Number(el.style.getPropertyValue("--ov-frente") || 10);
  ctx.innerWidth = 1280;
  try {
    [anterior, ultimo, movil].forEach(limpiar);
    ctx.openOv("ov-cuanto");
    const zAnterior = capa(anterior);
    ctx.openOv("ov-zonares");
    const zUltimo = capa(ultimo);
    ok("los dos overlays siguen abiertos", ctx.isOpen("ov-cuanto") && ctx.isOpen("ov-zonares"));
    ok("el último overlay abierto queda por delante del anterior", zUltimo > zAnterior,
      zAnterior + " → " + zUltimo);
    ctx.enfocarOvPc(anterior);
    const zReenfocado = capa(anterior), zQueQuedoDetras = capa(ultimo);
    ok("tocar una ventana visible la vuelve a traer al frente", zReenfocado > zQueQuedoDetras,
      zQueQuedoDetras + " → " + zReenfocado);
    /* Cantidad y confirmar no entran por openOv(): si no llaman al mismo foco, justamente los
       cuadros que piden una decisión delicada pueden quedar bajo la pantalla que los originó. */
    [anterior, ultimo, movil].forEach(limpiar);
    ctx.openOv("ov-zonares"); const zBase = capa(ultimo);
    ctx.pedirCuanto(2, "¿Cuántas?", "prueba", () => {}); const zCantidad = capa(anterior);
    ctx.askConfirm("¿Confirmás?", () => {}); const zConfirmar = capa(movil);
    ok("cantidad y confirmar también llegan al frente", zCantidad > zBase && zConfirmar > zCantidad,
      zBase + " → " + zCantidad + " → " + zConfirmar);
    [anterior, ultimo, movil].forEach(limpiar);
    ctx.innerWidth = 640;
    movil.classList.add("show"); ctx.enfocarOvPc(movil);
    ok("móvil no recibe una capa dinámica de escritorio", !movil.style.getPropertyValue("--ov-frente"));
    ok("el CSS conserva su capa base en móvil", /@media\(max-width:640px\)\{\.ov\{z-index:10\}\}/.test(html));
  } finally {
    [anterior, ultimo, movil].forEach(limpiar);
    ctx.innerWidth = anchoAntes;
  }
}

console.log("\nY LA REGLA DE FONDO, EN LAS CUATRO PANTALLAS DEL RINCÓN");
{
  /* ningún refresh del rincón esconde con display algo que ocupa fila: la lección del paquete */
  const UI = fs.readFileSync("public/game/ui.js", "utf8");
  const rincon = ["refreshBaul", "refreshPaquete", "refreshPedidos"].map(n => {
    const i0 = UI.indexOf("function " + n + "(");
    const fin = UI.indexOf("function ", i0 + 10);
    return UI.slice(i0, fin).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  }).join("\n");
  ok("baúl, paquete y tablón no esconden nada con display", !/\.style\.display\s*=/.test(rincon),
    "solo el buzón alterna display — y sus dos zonas reservan la misma altura");
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: las tarjetas del rincón miden lo mismo se toque lo que se toque.\n");
process.exit(fallos ? 1 : 0);
