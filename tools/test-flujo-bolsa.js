/* EL FLUJO DE LA BOLSA (26/8, dirección: « como en Sunflower »)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « al picar una piedra gastás un pico y se te suma uno de piedra… la manera de representar eso
     es +1 piedra, −1 pico, y sale en el margen izquierdo. Y eso con todo lo que consumís y
     sumás a tu bolsa. »

   LO QUE ESTE ARCHIVO PROTEGE, que no es el chip: es la DECISIÓN.

   Había dos maneras de construir esto. La obvia era poner un aviso en cada sitio que toca el
   inventario — más de doscientos —, y esa vía tiene un final que ya vimos dos veces esta semana:
   el que se olvide uno queda mudo para siempre (las cañas invisibles del 25/8, el Estofado de
   hoy). La otra es no avisar nada y RESTAR la bolsa consigo misma: lo que salga de esa resta es,
   por definición, todo lo que entró y salió.

   La segunda no se puede desincronizar, y ésa es la propiedad que hay que clavar: si mañana
   alguien agrega un objeto nuevo al juego SIN tocar una línea del flujo, el flujo tiene que
   contarlo igual. Este archivo lo comprueba inventando un recurso que el flujo no conoce.

   También clava que canonicalStacks() y bolsaCuentas() son la MISMA lista vista de dos maneras.
   Antes la lista de « qué hay en la bolsa » estaba escrita dentro de canonicalStacks, y el flujo
   habría tenido que repetirla — que es literalmente cómo nació el bug de las cañas.
     node tools/test-flujo-bolsa.js                                                              */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");
const RAIZ = path.join(__dirname, "..");
/* OJO: acá NO sirve el arnés de cartón de arrancar-el-juego. El flujo no escribe innerHTML como
   el resto de las vistas: CREA NODOS y los va apilando, justo para que cada chip conserve su
   animación de entrada y de salida (repintar el contenedor entero las cortaría todas). Eso pide
   un DOM de verdad, así que este archivo monta jsdom con el index.html real. */
const dom = new JSDOM(fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8"), { runScripts: "outside-only" });
const W = dom.window;
const ctx = { console: { log(){}, warn(){}, error(){}, info(){} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat, RegExp, Error, Promise,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval(){}, clearTimeout(){},
  requestAnimationFrame: () => 0, document: W.document, Image: W.Image, Node: W.Node,
  HTMLElement: W.HTMLElement, MouseEvent: W.MouseEvent, Event: W.Event, getComputedStyle: W.getComputedStyle };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
ctx.Phaser = { Scene: class {}, Math: { Clamp: (v,a,b) => Math.max(a, Math.min(b, v)) }, BlendModes: {}, Geom: { Rectangle: class {} }, Display: { Color: {} } };
vm.createContext(ctx);
["config", "nav", "state", "save", "ui"].forEach(f => vm.runInContext(fs.readFileSync(path.join(RAIZ, "public/game/" + f + ".js"), "utf8"), ctx));
["saveFarm", "refreshHud", "refreshInv", "syncSlots", "celebrate", "sfx", "isOpen"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {};

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const cambios = () => ctx.flujoCambios();
const buscar = (l, kind, key) => l.find(x => x.kind === kind && x.key === key);
function bolsaLimpia() {
  G.res = {}; G.seeds = {}; G.fish = {}; G.dishes = {}; G.canas = {}; G.tools = {};
  G.weapons = {}; G.picks = { owned: {}, dur: {} }; G.gear = {}; G.plata = 0; G.golden = 0;
  ctx.flujoOlvidar(); cambios();          // primera foto: a partir de acá se cuenta
}

console.log("\nEL CASO QUE PIDIÓ DIRECCIÓN: picar una piedra");
{
  bolsaLimpia();
  G.picks.owned.stone = true; G.picks.dur.stone = 4;
  cambios();                                     // se asienta el pico en la foto
  G.res.piedra = 1; G.picks.dur.stone = 3;       // lo que hace un golpe de verdad
  const c = cambios();
  const piedra = buscar(c, "res", "piedra"), pico = buscar(c, "pick", "stone");
  ok("+1 Piedra", piedra && piedra.d === 1, piedra && String(piedra.d));
  ok("−1 pico", pico && pico.d === -1, pico && String(pico.d));
  ok("y nada más que eso", c.length === 2, c.map(x => x.kind + ":" + x.key + " " + x.d).join(" · "));
}

console.log("\nLAS CUATRO CARGAS DE UN ÁRBOL SE CUENTAN UNA A UNA");
{
  bolsaLimpia();
  G.tools.axe = 4;
  cambios();
  let total = 0;
  for (let k = 1; k <= 4; k++) {
    G.res.madera = k; G.tools.axe = 4 - k;
    const c = cambios();
    const m = buscar(c, "res", "madera"), h = buscar(c, "tool", "axe");
    if (m && m.d === 1 && h && h.d === -1) total++;
  }
  ok("las cuatro cargas dan +1 Madera y −1 Hacha cada una", total === 4, total + "/4");
  /* el agrupado (que cuatro chips seguidos sean uno que sube) es cosa de la interfaz, no de la
     resta: la resta tiene que seguir contando de a uno para no perder información. */
}

console.log("\nVENDER CUENTA LAS DOS MITADES   (dirección: « sí, las monedas también »)");
{
  bolsaLimpia();
  G.seeds = {}; G.res.papa = 3; G.plata = 0;
  cambios();
  G.res.papa = 0; G.plata = 9;
  const c = cambios();
  ok("−3 Papa", (buscar(c, "res", "papa") || {}).d === -3);
  ok("+9 Plata", (buscar(c, "moneda", "plata") || {}).d === 9);
  G.golden = 2;
  ok("y los $G también viajan", (buscar(cambios(), "moneda", "golden") || {}).d === 2);
}

console.log("\nAL ENTRAR NO DESFILA NADA   (la partida cargada no la hizo el jugador)");
{
  bolsaLimpia();
  G.res = { madera: 400, piedra: 300, hierro: 90 }; G.plata = 5000;
  ctx.flujoOlvidar();                              // lo que hace loadFarm al terminar
  const c = cambios();
  ok("después de olvidar, la primera mirada no cuenta nada", c.length === 0, c.length + " chips");
  G.res.madera = 401;
  ok("pero la siguiente sí", (buscar(cambios(), "res", "madera") || {}).d === 1);
}

console.log("\nLA PROPIEDAD QUE IMPORTA: un objeto NUEVO se cuenta sin tocar el flujo");
{
  /* Esto es el archivo entero. Se inventa un recurso que no existía cuando se escribió el flujo
     y se comprueba que aparece igual. Si algún día alguien vuelve a la vía de « pongo un aviso
     en cada sitio », este bloque se pone rojo — y ésa es toda la intención. */
  bolsaLimpia();
  const ORDEN = g("ITEM_RES_ORDER");
  const inventado = "mineral_inventado_" + Date.now();
  g("RES_LABEL")[inventado] = "Mineral Inventado";
  ORDEN.push(inventado);
  try {
    cambios();
    G.res[inventado] = 7;
    const c = cambios();
    ok("un recurso agregado al catálogo aparece en el flujo solo",
      (buscar(c, "res", inventado) || {}).d === 7,
      JSON.stringify(buscar(c, "res", inventado)));
  } finally { ORDEN.pop(); delete g("RES_LABEL")[inventado]; }
}

console.log("\nUNA SOLA LISTA, DOS VISTAS   (era donde nacían las cañas invisibles)");
{
  bolsaLimpia();
  G.res = { madera: 250 };                          // 250 = tres casillas de 99
  G.canas = { junco: 20 };                          // una caña con veinte usos = UNA casilla
  G.picks.owned.stone = true; G.picks.dur.stone = 5;
  const cuentas = ctx.bolsaCuentas(), casillas = ctx.canonicalStacks();
  ok("bolsaCuentas devuelve cantidades", (cuentas.find(x => x.key === "madera") || {}).n === 250);
  ok("canonicalStacks reparte 250 de madera en 3 casillas",
    casillas.filter(x => x.key === "madera").length === 3);
  ok("y una caña de 20 usos ocupa UNA casilla, no veinte",
    casillas.filter(x => x.kind === "cana").length === 1,
    casillas.filter(x => x.kind === "cana").length + "");
  /* la comprobación de fondo: las dos vistas hablan de los mismos objetos */
  const kA = cuentas.map(x => x.kind + ":" + x.key).sort().join(",");
  const kB = [...new Set(casillas.map(x => x.kind + ":" + x.key))].sort().join(",");
  ok("las dos vistas contienen exactamente los mismos objetos", kA === kB,
    kA === kB ? "" : kA + "  ≠  " + kB);
}

console.log("\nY LOS CHIPS LLEGAN A LA PANTALLA   (tener el dato no es mostrarlo)");
{
  bolsaLimpia();
  const caja = ctx.document.getElementById("flujo");
  ok("el contenedor existe en el index.html", !!caja);
  if (caja) {
    caja.innerHTML = "";
    G.picks.owned.stone = true; G.picks.dur.stone = 4; ctx.flujoTick();
    caja.innerHTML = "";
    G.res.piedra = 1; G.picks.dur.stone = 3;
    ctx.flujoTick();
    /* con un DOM de verdad se lee el TEXTO, no el HTML. Raspar etiquetas con una expresión
       regular se traga los atributos que llevan « > » adentro (el onerror del ícono lo lleva) y
       deja basura que después hay que interpretar: un medidor que necesita interpretación mide
       mal. textContent es lo que ve el jugador, y punto. */
    const chips = [...caja.querySelectorAll(".flch")];
    const txt = chips.map(c => c.textContent.replace(/\s+/g, " ").trim()).join(" · ");
    ok("pinta dos chips", chips.length === 2, chips.length + " · " + txt);
    ok("uno en verde (+) y otro en rojo (−)",
      chips.some(c => c.classList.contains("mas")) && chips.some(c => c.classList.contains("menos")), txt);
    ok("con los números y su signo", /\+1/.test(txt) && /-1/.test(txt), txt);
    ok("y cada uno nombra su objeto", /Piedra/.test(txt) && /Pico/.test(txt), txt);
    /* que NO robe clics: es información de paso encima del mundo. El fallo de la Cocina del 24/8
       fue por el otro lado (la ventana dejaba pasar el clic al mundo) y cuesta lo mismo evitarlo. */
    const css = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
    const bloque = css.slice(css.indexOf("#flujo{"), css.indexOf("#flujo{") + 260);
    ok("el flujo no puede robar un clic (pointer-events:none)", /pointer-events\s*:\s*none/.test(bloque));
  }
}

console.log("\nY ALGUIEN LO LLAMA   (una función perfecta que nadie invoca no existe)");
{
  /* Todo lo de arriba llama a flujoTick() a mano. Si mañana se borra el latido en ui.js, el
     flujo queda muerto en el juego y esta suite sigue en verde — que es exactamente el agujero
     que tuvo el panel del camino esta mañana.
     Se mira el código SIN COMENTARIOS: la primera versión de test-respaldo-local dio verde
     durante días porque creyó un comentario que la línea de abajo contradecía. */
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  /* nada de emparejar llaves con una expresión regular: el cuerpo lleva un try/catch dentro y
     `[^}]*` se corta en la primera llave interna. Se busca la llamada y el número que la cierra. */
  const latido = UI.match(/setInterval\([\s\S]{0,240}?flujoTick\(\)[\s\S]{0,80}?,\s*(\d+)\s*\)/);
  ok("ui.js programa un latido que llama a flujoTick", !!latido);
  ok("y late rápido — con un segundo de retraso ya no se siente respuesta al clic",
    latido && Number(latido[1]) <= 300, latido ? latido[1] + " ms" : "sin latido");
  /* y el olvido al cargar, que es lo que evita la lluvia de chips al entrar */
  const SAVE = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok("y loadFarm olvida la foto al terminar de cargar", /flujoOlvidar\(\)/.test(SAVE));
  {
  }
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — el flujo todavía no cuenta lo que pasa en la bolsa"
  : "  Todo en orden: la bolsa se cuenta sola, y lo hará también con lo que se agregue mañana.");
process.exit(fallos ? 1 : 0);
