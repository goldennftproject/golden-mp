/* ¿ADÓNDE APUNTA LA FLECHA DE VERDAD? (20/8, dirección)
   "En la misión de abrir el menú y el Cobertizo para poner el plano, está bien que apuntes al botón
    del Cobertizo, pero también quiero que apuntes al del Menú, que sepa el jugador que tiene que
    entrar ahí primero."
   Todos los tests del tutorial hasta hoy leían TABLAS y TEXTOS. Ninguno abría el juego. Y la
   pregunta "¿adónde apunta la flecha?" no se puede contestar leyendo una tabla: depende del HTML
   real, de si el menú está desplegado, de si el botón existe con ese id y de una cadena de ifs en
   tutoHighlight. Este test carga public/index.html de verdad con jsdom, ejecuta config+state+ui
   encima y pregunta por el elemento al que la flecha va a parar en cada estado.
   Es el primer test del proyecto que ejecuta la interfaz en vez de leerla. La diferencia importa:
   la limpieza de fantasmas del guardado llevaba dos días "en verde" porque su test buscaba un
   comentario en el archivo, y en el juego no corría nunca.
     node tools/test-tuto-flecha.js                                                               */
const fs = require("fs");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) {
  console.log("\n  (saltado: falta jsdom — `npm install` lo trae como devDependency)\n");
  process.exit(0);
}
const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"),
  { runScripts: "outside-only", pretendToBeVisual: true, url: "https://golden.test/" });
const w = dom.window;
/* Phaser no hace falta: state.js y ui.js solo lo tocan al arrancar la escena. */
w.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: {}, Display: { Color: {} } };
const src = ["config", "state", "ui"].map(f => fs.readFileSync("public/game/" + f + ".js", "utf8")).join("\n;\n");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* Todo el sondeo corre DENTRO de la ventana: los `const` de los archivos del juego son de ámbito
   de script y desde fuera no se ven. Se devuelve un resumen en JSON. */
w.eval(src + `
window.__sondeo = function (idPaso) {
  const G2 = G;
  G2.tuto = { step: TUTO_STEPS.findIndex(s => s.id === idPaso), done: false, n: 0 };
  G2.planos = { store: 1, horno: 1, cocina: 1 }; G2.built = {}; G2.obras = {};
  G2.cobertizo = {}; G2.decos = []; G2.chests = []; G2.regalos = [];
  const st = tutoActivo();
  const out = { id: st.id, txt: st.txt, panel: st.panel, ui: st.ui, target: st.target || null };
  /* Se intercepta tutoFlechaUI para saber a QUÉ elemento se le pide apuntar, sin depender de
     posiciones en píxeles (jsdom no maqueta). */
  const orig = window.tutoFlechaUI;
  let ultimo = null;
  window.tutoFlechaUI = function (el) { ultimo = el ? (el.id || el.getAttribute("data-panel") || el.className) : null; };
  const menu = document.getElementById("gmenu");
  menu.classList.add("collapsed");    tutoHighlight(); out.conMenuCerrado = ultimo;
  menu.classList.remove("collapsed"); tutoHighlight(); out.conMenuAbierto  = ultimo;
  window.tutoFlechaUI = orig;
  out.hayMenuBtn = !!document.getElementById("menu-btn");
  out.hayItemCobertizo = !!document.querySelector('.gmi[data-panel="ov-cobertizo"]');
  return JSON.stringify(out);
};
/* La lista también se saca desde dentro: los \`const\` del juego no salen de este ámbito. */
window.__pasosDePanel = function () {
  return JSON.stringify(TUTO_STEPS.filter(s => s.panel && !s.target).map(s => s.id));
};
/* 20/8 — EL CATÁLOGO, VALIDADO. El tutorial nombra la interfaz con cadenas sueltas: un panel
   ("ov-market") y un selector dentro ("[data-buy='papa']"). Nadie comprobaba ninguna de las dos, y
   así se coló ov-deco, una ventana que no existe en el HTML.
   El catálogo ya existía y no lo estábamos usando: OV_REFRESH, en ui.js, dice qué función dibuja
   cada panel. Con eso se puede hacer lo que faltaba — PINTAR el panel y mirar si el botón aparece.
   Un selector que apunta a un botón que ya no se dibuja es exactamente el mismo fallo que el panel
   inventado, solo que un nivel más adentro y más difícil de ver. */
window.__validarDestinos = function () {
  const out = [];
  /* Un estado en el que TODO lo que el tutorial señala debería existir: con plata, con semillas,
     con el plano en el Cobertizo y las recetas al alcance. Si aun así el botón no aparece, es que
     el selector está mal. */
  G.plata = 9999; G.golden = 50; G.level = 20;
  Object.keys(CROP_DEF).forEach(k => { G.seeds[k] = 5; G.res[k] = 5; });
  G.res.madera = 99; G.res.piedra = 99; G.res.carne = 5;
  G.planos = { store: 1, horno: 1, cocina: 1 }; G.built = { store: true, horno: true, cocina: true };
  G.obras = {}; G.decos = []; G.chests = []; G.cobertizo = { tree: 0, rock: 0, plot: 0 };
  G.skills = G.skills || {}; G.skills.cooking = 99999; G.skills.crafting = 99999;
  G.weapons = {}; G.gear = {}; G.dishes = { papa_asada: 1 }; G.cooking = [];
  TUTO_STEPS.forEach(function (s) {
    if (!s.panel || !s.ui) return;
    /* El selector del último paso se crea al llegar a él: no es una nota diaria que exista
       durante toda la cadena. El arnés debe pintar el mismo estado que el jugador verá. */
    if (s.id === "pedido") { G.tuto = { step: TUTO_STEPS.indexOf(s), done: false, n: 0 }; G.pedidos = null; }
    const cont = document.getElementById(s.panel);
    if (!cont) { out.push({ id: s.id, panel: s.panel, ui: s.ui, estado: "el panel no existe" }); return; }
    try { if (OV_REFRESH[s.panel]) OV_REFRESH[s.panel](); } catch (e) {
      out.push({ id: s.id, panel: s.panel, ui: s.ui, estado: "al pintarlo: " + e.message }); return;
    }
    out.push({ id: s.id, panel: s.panel, ui: s.ui, estado: cont.querySelector(s.ui) ? "ok" : "el botón no aparece" });
  });
  return JSON.stringify(out);
};
/* La Cocina tiene una transición propia: « Cocinar » no completa el paso, porque el plato sigue
   en la olla. Este sondeo pinta ambas variantes y verifica la flecha real, no sólo la tabla.
   jsdom no calcula offsetParent; se lo prestamos sólo al destino que estamos inspeccionando
   para que tutoHighlight llegue a la misma rama que usaría con una ventana visible. */
window.__sondeoCocinaTutorial = function (lista) {
  G.tuto = { step: TUTO_STEPS.findIndex(s => s.id === "cook"), done: false, n: 0 };
  G.res = Object.assign({}, G.res, { papa: 3 }); G.dishes = {};
  G.cooking = [{ id: "papa_asada", endAt: Date.now() + 180000, total: 180000, listo: !!lista }];
  const ov = document.getElementById("ov-cocina");
  ov.classList.add("show"); if (OV_REFRESH["ov-cocina"]) OV_REFRESH["ov-cocina"]();
  const sub = tutoSub() || {}, destino = sub.ui ? ov.querySelector(sub.ui) : null;
  if (destino) try { Object.defineProperty(destino, "offsetParent", { configurable: true, value: document.body }); } catch (e) {}
  const orig = window.tutoFlechaUI;
  let flecha = null;
  window.tutoFlechaUI = function (el) { flecha = el ? (el.id || el.className) : null; };
  tutoHighlight(); window.tutoFlechaUI = orig;
  ov.classList.remove("show");
  return JSON.stringify({ txt: sub.txt || "", panel: sub.panel || null, ui: sub.ui || null,
    existe: !!destino, flecha: flecha });
};
/* Después de recoger, «comer» tiene que continuar por las tres paradas visibles: Menú,
   Inventario y una casilla de plato. La última sí depende de que syncSlots lo haya dibujado. */
window.__sondeoComerTutorial = function () {
  G.tuto = { step: TUTO_STEPS.findIndex(s => s.id === "eat"), done: false, n: 0 };
  G.dishes = { papa_asada: 1 }; G.cooking = []; G.slots = [];
  if (typeof syncSlots === "function") syncSlots();
  const inv = document.getElementById("ov-inv"), menu = document.getElementById("gmenu");
  if (OV_REFRESH["ov-inv"]) OV_REFRESH["ov-inv"]();
  const st = tutoActivo(), plato = inv.querySelector(".slot.k-dish");
  if (plato) try { Object.defineProperty(plato, "offsetParent", { configurable: true, value: document.body }); } catch (e) {}
  const orig = window.tutoFlechaUI;
  let ultimo = null;
  window.tutoFlechaUI = function (el) { ultimo = el ? (el.id || el.getAttribute("data-panel") || el.className) : null; };
  menu.classList.add("collapsed"); tutoHighlight(); const cerrado = ultimo;
  menu.classList.remove("collapsed"); tutoHighlight(); const abierto = ultimo;
  inv.classList.add("show"); if (OV_REFRESH["ov-inv"]) OV_REFRESH["ov-inv"]();
  const platoVisible = inv.querySelector(".slot.k-dish");
  if (platoVisible) try { Object.defineProperty(platoVisible, "offsetParent", { configurable: true, value: document.body }); } catch (e) {}
  tutoHighlight(); const dentro = ultimo;
  window.tutoFlechaUI = orig;
  inv.classList.remove("show"); menu.classList.add("collapsed");
  return JSON.stringify({ txt: st.txt, panel: st.panel || null, ui: st.ui || null,
    hayPlato: !!platoVisible, cerrado: cerrado, abierto: abierto, dentro: dentro });
};
/* El cierre no puede depender de un lote aleatorio del tablón. Se pinta la nota efímera con la
   mochila vacía y se comprueba la flecha real dentro del panel, que es el último tramo de guía. */
window.__sondeoPedidoTutorial = function () {
  G.tuto = { step: TUTO_STEPS.findIndex(s => s.id === "pedido"), done: false, n: 0 };
  G.pedidos = null; G.res = {}; G.fish = {}; G.dishes = {};
  const ov = document.getElementById("ov-pedidos");
  ov.classList.add("show"); if (OV_REFRESH["ov-pedidos"]) OV_REFRESH["ov-pedidos"]();
  const st = tutoActivo(), destino = st.ui ? ov.querySelector(st.ui) : null;
  if (destino) try { Object.defineProperty(destino, "offsetParent", { configurable: true, value: document.body }); } catch (e) {}
  const orig = window.tutoFlechaUI;
  let flecha = null;
  window.tutoFlechaUI = function (el) { flecha = el ? (el.getAttribute("data-pd-entregar") || el.id || el.className) : null; };
  tutoHighlight(); window.tutoFlechaUI = orig;
  const notas = ov.querySelectorAll(".pd-nota");
  ov.classList.remove("show");
  return JSON.stringify({ txt: st.txt, panel: st.panel || null, ui: st.ui || null,
    existe: !!destino, flecha: flecha, soloNota: notas.length === 1 });
};
window.__panelesDePasos = function () {
  return JSON.stringify(TUTO_STEPS.filter(s => s.panel).map(function (s) {
    const p = document.getElementById(s.panel);
    return { id: s.id, panel: s.panel, ui: s.ui || null,
      existePanel: !!p, dentro: !!(p && s.ui && p.querySelector(s.ui)) };
  }));
};
/* La venta de las tres papas termina el arranque. La UI no puede sugerir $Golden: una unidad
   necesita un lote mucho mayor. Este sondeo pinta la ventana real con la moneda equivocada. */
window.__sondeoVentaTutorial = function () {
  const paso = TUTO_STEPS.findIndex(s => s.id === "sell");
  G.tuto = { step: paso, done: false, n: 0 };
  G.res = Object.assign({}, G.res, { papa: 3 });
  marketCur = "golden"; refreshMarket();
  const golden = document.querySelector('.curbtn[data-cur="golden"]'), papa = document.getElementById("vb-papa"), nota = document.getElementById("mkt-cur-note");
  const tutorial = { moneda: marketCur, goldenBloqueado: !!(golden && golden.disabled),
    nota: nota ? nota.textContent : "", notaVisible: !!(nota && nota.classList.contains("show")),
    papaHabilitada: !!(papa && !papa.disabled) };
  G.tuto = { done: true }; marketCur = "golden"; refreshMarket();
  const goldenNormal = document.querySelector('.curbtn[data-cur="golden"]'), papaNormal = document.getElementById("vb-papa");
  const normal = { moneda: marketCur, goldenBloqueado: !!(goldenNormal && goldenNormal.disabled),
    papaBloqueada: !!(papaNormal && papaNormal.disabled), textoPapa: papaNormal ? papaNormal.textContent : "" };
  return JSON.stringify({ tutorial: tutorial, normal: normal });
};`);

console.log("\nEL HTML DE VERDAD TIENE LAS DOS PARADAS");
{
  const s = JSON.parse(w.__sondeo("place_store"));
  ok("existe el botón ☰ Menú", s.hayMenuBtn, "#menu-btn");
  ok("y dentro, la entrada del Cobertizo", s.hayItemCobertizo, '.gmi[data-panel="ov-cobertizo"]');
}

console.log("\nLA FLECHA RECORRE LA CADENA: MENÚ → COBERTIZO");
{
  ["place_store", "place_horno", "place_cocina"].forEach(id => {
    const s = JSON.parse(w.__sondeo(id));
    /* Con el menú cerrado, el jugador no puede ver la entrada del Cobertizo: la flecha tiene que
       estar en el botón que lo despliega, o le está señalando algo invisible. */
    ok("« " + id + " » con el menú cerrado apunta al ☰ Menú", s.conMenuCerrado === "menu-btn", s.conMenuCerrado);
    /* Y en cuanto se despliega, baja a la entrada del Cobertizo. */
    ok("   …y al desplegarlo, al Cobertizo", s.conMenuAbierto === "ov-cobertizo", s.conMenuAbierto);
  });
}

console.log("\nY EL CARTEL DICE LAS DOS PARADAS, NO SOLO EL DESTINO");
{
  /* Éste es el pedido de dirección. La flecha ya hacía la cadena bien; lo que fallaba era que el
     cartel decía "Abrí el Cobertizo" mientras la flecha señalaba un botón que se llama "Menú".
     El jugador no tiene por qué saber que uno está dentro del otro. */
  ["place_store", "place_horno", "place_cocina"].forEach(id => {
    const s = JSON.parse(w.__sondeo(id));
    ok("« " + s.txt + " » nombra el Menú", /men[úu]/i.test(s.txt));
    ok("   …y el Cobertizo", /cobertizo/i.test(s.txt));
  });
}

console.log("\nY EL RESTO DE LOS PASOS DE PANEL, IGUAL");
{
  /* La regla general: si un paso manda a un panel que vive DENTRO del menú del juego y no tiene un
     edificio en el mundo al que apuntar, la flecha empieza por el menú. Si mañana alguien añade un
     paso así y se olvida, salta acá. */
  const paneles = JSON.parse(w.__pasosDePanel());
  console.log("      pasos que mandan a un panel sin edificio en el mundo: " + (paneles.join(", ") || "ninguno"));
  const malos = paneles.filter(id => {
    const s = JSON.parse(w.__sondeo(id));
    return s.conMenuCerrado !== "menu-btn";
  });
  ok("todos empiezan la cadena por el ☰ Menú", !malos.length, malos.join(", ") || paneles.length + " revisados");
}

console.log("\nY NINGÚN PASO MANDA A UNA VENTANA QUE NO EXISTE");
{
  /* La regla que faltaba, y la que encontró el fallo gordo del día: el paso « expandir » apuntaba
     a `ov-deco`, una ventana que no está en el HTML. La expansión se compra en el Mercado, pestaña
     Adornos. Con el panel inventado la flecha se quedaba clavada en el ☰ Menú para siempre: abrías
     el menú y seguía señalando el menú.
     Ninguna tabla podía delatar eso, porque la tabla se veía perfecta. Hace falta el HTML. */
  const info = JSON.parse(w.__panelesDePasos());
  const sinPanel = info.filter(x => !x.existePanel);
  ok("las " + info.length + " ventanas que nombra el tutorial existen en el HTML", !sinPanel.length,
    sinPanel.map(x => x.id + "→" + x.panel).join(", ") || "todas");
  /* El selector de dentro puede no existir todavía (las listas se dibujan al abrir el panel), así
     que esto se informa, no se falla — pero se informa, que es lo que no pasaba antes. */
  const sinUi = info.filter(x => x.existePanel && x.ui && !x.dentro).map(x => x.id + " → " + x.ui);
  console.log("      selectores que se dibujan al abrir el panel: " + (sinUi.join(", ") || "ninguno"));
}

console.log("\nY EL BOTÓN AL QUE APUNTA EXISTE DE VERDAD (se pinta el panel y se busca)");
{
  /* Esto es lo que faltaba: comprobar el selector, no solo el panel. Se dibuja cada ventana con su
     propia función —la que el juego usa al abrirla— y se busca el botón. Si un día se renombra una
     receta o cambia la plantilla de una lista, la flecha apuntaría al vacío y el jugador se
     quedaría mirando un paso que no puede completar. */
  const r = JSON.parse(w.__validarDestinos());
  r.forEach(x => ok("« " + x.id + " » → " + x.panel + " " + x.ui, x.estado === "ok", x.estado));
  ok("los " + r.length + " destinos del tutorial existen", r.every(x => x.estado === "ok"));
}

console.log("\nLA COCINA CAMBIA LA GUÍA CUANDO EL PLATO YA NO SE COCINA");
{
  /* El mismo objetivo tiene dos acciones reales. Mientras la Papa Asada está al fuego, la
     flecha no puede seguir mandando al botón que la encolaría otra vez; cuando sale, tampoco
     puede dejar oculto el botón de Recoger que de verdad termina el paso. */
  const enOlla = JSON.parse(w.__sondeoCocinaTutorial(false));
  ok("mientras se cocina apunta a la fila", enOlla.panel === "ov-cocina" && enOlla.ui === "#ck-cola" &&
    enOlla.existe && enOlla.flecha === "ck-cola", JSON.stringify(enOlla));
  ok("y explica que la Papa Asada está en la olla", /papa asada.*olla|olla.*papa asada/i.test(enOlla.txt), enOlla.txt);

  const lista = JSON.parse(w.__sondeoCocinaTutorial(true));
  ok("cuando está lista apunta a Recoger", lista.panel === "ov-cocina" && lista.ui === "#ck-recoger" &&
    lista.existe && lista.flecha === "ck-recoger", JSON.stringify(lista));
  ok("y el texto nombra el estado y la acción", /está lista/i.test(lista.txt) && /recog/i.test(lista.txt), lista.txt);
}

console.log("\nCOMER RECORRE MENÚ → INVENTARIO → PLATO");
{
  const s = JSON.parse(w.__sondeoComerTutorial());
  ok("el paso de comer nombra Menú e Inventario", /men[úu]/i.test(s.txt) && /inventario/i.test(s.txt), s.txt);
  ok("y declara el panel y la casilla de plato", s.panel === "ov-inv" && s.ui === ".slot.k-dish" && s.hayPlato,
    JSON.stringify(s));
  ok("con el menú cerrado señala ☰ Menú", s.cerrado === "menu-btn", s.cerrado);
  ok("al abrirlo baja a Inventario", s.abierto === "ov-inv", s.abierto);
  ok("y dentro apunta al plato que se puede comer", /k-dish/.test(s.dentro || ""), s.dentro);
}

console.log("\nLA PRIMERA VENTA NO SE DESVÍA A $GOLDEN");
{
  const s = JSON.parse(w.__sondeoVentaTutorial());
  ok("el paso de vender fuerza Plata aunque antes estuviera $Golden", s.tutorial.moneda === "plata", JSON.stringify(s.tutorial));
  ok("$Golden se ve bloqueado y explica la ruta", s.tutorial.goldenBloqueado && s.tutorial.notaVisible && /plata/i.test(s.tutorial.nota), JSON.stringify(s.tutorial));
  ok("las tres papas conservan un botón de venta disponible", s.tutorial.papaHabilitada, JSON.stringify(s.tutorial));
  ok("al terminar el tutorial $Golden vuelve a estar disponible", s.normal.moneda === "golden" && !s.normal.goldenBloqueado, JSON.stringify(s.normal));
  ok("y una cantidad menor al mínimo se explica antes de hacer clic", s.normal.papaBloqueada && /mín\.|faltan/i.test(s.normal.textoPapa), JSON.stringify(s.normal));
}

console.log("\nEL TABLÓN TERMINA EL TUTORIAL SIN PEDIR UN LOTE ENTERO");
{
  const s = JSON.parse(w.__sondeoPedidoTutorial());
  ok("la nota de prueba es el único pedido visible", s.soloNota, JSON.stringify(s));
  ok("la flecha llega a la nota entregable", s.ui === '[data-pd-entregar="T"]' && s.existe && s.flecha === "T", JSON.stringify(s));
  ok("el cartel aclara que no consume materiales", /no pide materiales/i.test(s.txt), s.txt);
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ la flecha va Menú → Cobertizo, el cartel dice lo mismo, y el botón está ahí\n");
process.exit(fallos ? 1 : 0);
