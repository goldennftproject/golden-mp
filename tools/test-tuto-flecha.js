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
  G.weapons = {}; G.gear = {}; G.dishes = {};
  TUTO_STEPS.forEach(function (s) {
    if (!s.panel || !s.ui) return;
    const cont = document.getElementById(s.panel);
    if (!cont) { out.push({ id: s.id, panel: s.panel, ui: s.ui, estado: "el panel no existe" }); return; }
    try { if (OV_REFRESH[s.panel]) OV_REFRESH[s.panel](); } catch (e) {
      out.push({ id: s.id, panel: s.panel, ui: s.ui, estado: "al pintarlo: " + e.message }); return;
    }
    out.push({ id: s.id, panel: s.panel, ui: s.ui, estado: cont.querySelector(s.ui) ? "ok" : "el botón no aparece" });
  });
  return JSON.stringify(out);
};
window.__panelesDePasos = function () {
  return JSON.stringify(TUTO_STEPS.filter(s => s.panel).map(function (s) {
    const p = document.getElementById(s.panel);
    return { id: s.id, panel: s.panel, ui: s.ui || null,
      existePanel: !!p, dentro: !!(p && s.ui && p.querySelector(s.ui)) };
  }));
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

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ la flecha va Menú → Cobertizo, el cartel dice lo mismo, y el botón está ahí\n");
process.exit(fallos ? 1 : 0);
