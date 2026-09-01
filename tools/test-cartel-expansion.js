/* EL LOTE DE EXPANSIÓN: NO EXISTE HASTA QUE TENÉS EL NIVEL (18/8 · 20/8)
   Dirección, 18/8: "en vez de mostrar permanentemente el cartel de nivel bloqueado, que solo
   pasando el cursor por encima se iluminen los árboles que van a desaparecer y aparezca el
   cartelito". Y 2ª pasada: "no quiero que haya líneas de puntos grises".
   Dirección, 20/8: "lo de expandir a nivel tres sale antes de ser nivel tres. Que se demuestre que
   se puede expandir cuando sea el nivel que se pueda expandir. Antes no tiene por qué mostrar eso".

   20/8 — ESTE TEST SE REESCRIBIÓ ENTERO, y el motivo importa. Leía el CÓDIGO con expresiones
   regulares: mientras la línea existiera, verde. Hoy encontramos dos fallos que un test así no
   puede ver —una migración que corría antes de tiempo y un paso que apuntaba a una ventana
   inexistente— así que ahora se EJECUTA dibujarExpansion() con una escena de mentira y se cuenta
   qué dibujó. Si no dibuja nada, no hay nada que ver: eso es lo que se mide.
     node tools/test-cartel-expansion.js                                                          */
const fs = require("fs"), vm = require("vm");

/* Objeto de Phaser de mentira: acepta cualquier método encadenado y anota lo que le hacen. */
function stub(tipo, reg) {
  const o = { __tipo: tipo, visible: true, alfaRelleno: null, handlers: {}, width: 0, height: 0 };
  const p = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (k === "setVisible") return v => { t.visible = v; return p; };
      if (k === "setFillStyle") return (c, a) => { t.alfaRelleno = a; return p; };
      if (k === "on") return (ev, fn) => { t.handlers[ev] = fn; return p; };
      if (k === "destroy") return () => { t.destruido = true; };
      return () => p;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  reg.push(o);
  return p;
}
function escenaFalsa(reg) {
  return {
    /* los textos guardan su CADENA (tercer argumento de add.text): así se puede preguntar qué
       dice la chapa, no solo cuántos objetos dibujó */
    add: new Proxy({}, { get: (t, k) => (...a) => { const s = stub(k, reg); if (k === "text") reg[reg.length - 1].texto = a[2]; return s; } }),
    tweens: { add: () => stub("tween", []) },
  };
}

/* El juego, sin Phaser: solo hace falta el estado y la geometría. */
const ctx = { console: { log() {}, warn() {}, info() {} }, Math, Date, JSON, Object, Array, Number,
  String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0;
vm.createContext(ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "askConfirm"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8"), ctx);
const GF = ctx.GF, G = ctx.G;

/* Se extrae el método del archivo y se ata al contexto del juego: así corre el código REAL, con
   sus llamadas a expansionSiguiente(), canAfford() y GF.TILE. */
const src = fs.readFileSync("public/game/farm.js", "utf8");
const i0 = src.indexOf("  dibujarExpansion() {");
const i1 = src.indexOf("  // pathfinding A*");
const cuerpo = src.slice(i0, i1);
vm.runInContext("this.__dibujar = function () { const o = { " + cuerpo + " }; return o.dibujarExpansion; }();", ctx);
const dibujar = ctx.__dibujar;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

function pintar(nivel, recursos) {
  G.expansiones = 0; G.level = nivel; G.res = Object.assign({}, G.res, recursos || {});
  GF.aplicarTerreno(0);
  const reg = [];
  const esc = escenaFalsa(reg);
  esc._expFirma = null;
  dibujar.call(esc);
  return { reg, esc };
}

const ex = ctx.expansionSiguiente();
console.log("\nLA PRIMERA EXPANSIÓN PIDE NIVEL " + ex.nivel);

console.log("\nPOR DEBAJO DEL NIVEL: EL LOTE SE MUESTRA IGUAL, CON SU REQUISITO EN LA CHAPA (22/8)");
{
  /* 22/8 (dirección, revierte al 20/8): "la próxima expansión se tiene que mostrar aunque el
     jugador no tenga el nivel — al pasar el cursor, con el nivel requerido y toda la info". */
  for (let lv = 1; lv < ex.nivel; lv++) {
    const { reg } = pintar(lv, {});
    ok("nivel " + lv + ": el lote se dibuja (con hover)", reg.length > 0 && reg.some(o => o.handlers && o.handlers.pointerover),
      reg.length + " objetos");
    const textos = reg.filter(o => o.__tipo === "text").map(o => o.texto || "");
    ok("  · la chapa dice el nivel que pide y el que tenés",
      textos.some(t => new RegExp("Granja nivel " + ex.nivel).test(t) && new RegExp("tenés " + lv).test(t)),
      "« " + (textos.find(t => /Granja nivel/.test(t)) || "") + " »");
    /* 26/8: el premio ya no es una cadena fija. El cartel lo DERIVA de lo que la expansión trae
       de verdad (expansionTraeTxt), porque siete de las dieciséis traen además vetas de bronce y
       oro y el texto a mano se las comía. Así que acá se contrasta contra la misma función, no
       contra tres palabras escritas: si se clavan las palabras, se vuelve a medir el catálogo de
       ayer — que es como este mismo test daba verde mientras el cartel mentía. */
    ok("  · y conserva el costo y el premio completos",
      textos.some(t => /Madera/.test(t)) &&
      textos.some(t => t === (ctx.expansionTraeTxt ? ctx.expansionTraeTxt(ex.n) : "")),
      textos.filter(t => /Trae/.test(t)).join(" | "));
  }
  /* en reposo sigue limpio: la chapa nace oculta (solo hover) porque sin nivel nunca "se puede pagar" */
  const { reg } = pintar(1, {});
  const chapa = reg.find(o => o.__tipo === "text" && /EXPANDIR/.test(o.texto || ""));
  ok("en reposo el bosque sigue limpio: la chapa nace oculta y la enciende el cursor",
    !!chapa && chapa.visible === false);
}

console.log("\nCON EL NIVEL JUSTO: EL LOTE APARECE");
{
  const { reg } = pintar(ex.nivel, {});
  ok("se dibuja el lote", reg.length > 0, reg.length + " objetos");
  const zona = reg.find(o => o.handlers && o.handlers.pointerover);
  ok("y responde al cursor", !!zona);
  ok("las estacas nacen ocultas (eran la 'línea de puntos' gris)",
    reg.filter(o => o.__tipo === "rectangle" && o.visible === false).length > 0);
  /* En reposo el lote es invisible del todo: relleno 0. Se comprueba disparando el hover. */
  zona.handlers.pointerout();
  ok("en reposo el relleno del lote es 0", zona.alfaRelleno === 0, String(zona.alfaRelleno));
  zona.handlers.pointerover();
  ok("y con el cursor encima se ilumina", zona.alfaRelleno > 0, String(zona.alfaRelleno));
}

console.log("\nLA CHAPA DICE LO QUE DESBLOQUEA, DEBAJO DEL COSTO");
{
  /* Dirección, 20/8: "en la chapa donde está el costo, abajo debería decir lo que te desbloquea". */
  const { reg } = pintar(ex.nivel, {});
  const textos = reg.filter(o => o.__tipo === "text").map(o => o.texto || "");
  /* Dirección, 2ª pasada: "la información de las celdas no es importante, pero la de los nodos
     y la parcela sí" — el premio nombra los tres, y a las celdas ni las menciona. */
  ok("hay una línea con lo que trae, derivada de la expansión que toca",
    textos.some(t => /^Trae /.test(t) && /parcela/.test(t) && /árbol/.test(t) && /roca/.test(t)),
    textos.filter(t => /Trae/.test(t)).join(" | ") || textos.join(" | "));
  ok("y no habla de celdas", !textos.some(t => /celdas/.test(t)), "eso se ve solo al expandir");
  const iCosto = textos.findIndex(t => /\d+\/\d+/.test(t)), iPremio = textos.findIndex(t => /Trae/.test(t));
  ok("y va DESPUÉS del costo, como pidió dirección", iCosto >= 0 && iPremio > iCosto);
}

console.log("\nLAS EXPANSIONES VAN EN ORDEN: NIVEL *Y* LAS ANTERIORES HECHAS");
{
  /* Dirección, 20/8: "si soy nivel 5 pero no hice la expansión del nivel 3, no se me tiene que
     mostrar la del 5 — van por orden". Con nivel de sobra y CERO expansiones hechas, lo único
     que puede dibujarse es el bloque 1: se comprueba con la geometría, no con la fe. */
  G.expansiones = 0; G.level = 99; G.res = {};
  GF.aplicarTerreno(0);
  const reg = []; const esc = escenaFalsa(reg); esc._expFirma = null; dibujar.call(esc);
  const ex99 = ctx.expansionSiguiente();
  ok("con nivel 99 y 0 hechas, la que se ofrece es la n°1", ex99.n === 1 && ex99.bloque === GF.EXPANSIONES[0],
    "expansión " + ex99.n + " · nivel " + ex99.nivel);
  ok("y algo se dibuja (el nivel sobra)", reg.length > 0, reg.length + " objetos");
  /* la compra pasa por la MISMA función: no hay camino para saltarse una */
  const S = fs.readFileSync("public/game/state.js", "utf8");
  ok("expansionComprar compra expansionSiguiente(), no un índice suelto",
    /function expansionComprar\(\) \{\s*\n?\s*const e = expansionSiguiente\(\);/.test(S));
}

console.log("\nY UNA VEZ QUE SUBÍS, SE REDIBUJA SOLO");
{
  /* La firma del cartel incluye G.level: sin eso, el lote no aparecería hasta recargar la página
     — y el jugador sube de nivel y no ve nada nuevo. */
  ok("la firma del redibujado mira el nivel", /const firma = !ex \? "-" : \[ex\.n, G\.level/.test(src),
    "subir de nivel hace aparecer el lote sin recargar");
}

console.log("\nY EL CÓDIGO NO SE QUEDÓ CON RAMAS MUERTAS");
{
  /* Al cortar por nivel, todo lo que decía "si te falta nivel" dejó de tener sentido. Dejarlo
     sería la clase de mentira que hoy nos costó dos fallos: código que describe un caso al que
     ya no se llega. */
  /* Se miran las CADENAS que ve el jugador, no los comentarios que explican por qué se fueron —
     el mismo tropiezo que tuvo el test de los textos del tutorial: se marcaba a sí mismo por citar
     el texto viejo dentro de una explicación. */
  const vivo = cuerpo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("no quedan carteles de 'terreno bloqueado'", !/terreno bloqueado/.test(vivo));
  ok("ni el aviso de 'se abre en el nivel' al hacer clic", !/se abre en el nivel/.test(vivo));
  /* 1/9: el clic ya no compra NI avisa por toast — abre el recuadro de expansión (dirección,
     con captura de Sunflower), que es quien explica el nivel, los costos y los nodos. */
  ok("y el clic abre el recuadro, que es quien explica", /openOv\("ov-expandir"\)/.test(cuerpo));
}

console.log("\n" + (fallos ? "  ✗ " + fallos + " fallas\n" : "  ✓ la próxima expansión siempre se muestra, y la chapa dice qué le falta\n"));
process.exit(fallos ? 1 : 0);
