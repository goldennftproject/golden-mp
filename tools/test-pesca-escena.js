/* PESCA v4 · LA PULSEADA SE MIDE EN EL AGUA, NO EN EL PANEL                            (28/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Este archivo existe por un reporte de la dirección que no era un bug y era peor que un bug:

     « la pesca está hecha con texto, en vez de un minijuego como antes… no tiene que ser un
       juego textual, tiene que ser algo escénico »
     « le das click y sale un cuadro no entendí jaja · es una pesca rara »

   Al cambiar la MECÁNICA de la v3 a la pulseada del documento me llevé puesta la PUESTA EN
   ESCENA, que nadie había pedido cambiar. Y el detalle que lo delata todo: la maquinaria del
   mundo —el corcho, el hilo, el chapuzón, el pez saltando a la mano— seguía escrita y viva en
   farm.js. Lo que hacía era tirar el corcho y DESTRUIRLO dos líneas después para abrir un panel.
   La escena estaba encendida y apagada en el mismo cuadro.

   POR QUÉ ESTE TEST NO PUEDE MEDIR FÓRMULAS
   La semana pasada un test mío daba verde midiendo lanceNeto() —una resta— mientras el juego no
   cobraba el peaje. La lección quedó escrita: un test que mide una fórmula en vez del juego no
   comprueba el juego. Acá pasa lo mismo un piso más arriba: comprobar que `L.tension` sube no
   dice NADA sobre si el jugador lo ve. La tensión estaba perfecta y era invisible.

   Así que esto no lee `L`. Corre los métodos de verdad de FarmScene contra un Phaser de mentira
   que ANOTA lo que se dibujó, y mide la imagen:
     · la panza del hilo se mide sobre los puntos que drawFishLine mandó dibujar
     · el avance del corcho, sobre dónde quedó el corcho
     · el apagón del linterna, sobre la opacidad que quedó puesta
   Si mañana alguien vuelve a dejar la escena apagada, la fórmula seguirá perfecta y esto no.
     node tools/test-pesca-escena.js                                                             */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

/* ── UN PHASER QUE ANOTA ─────────────────────────────────────────────────────────────────────
   El arnés compartido devuelve un proxy que acepta cualquier cosa: sirve para saber si algo
   revienta, no para saber qué dibujó. Acá hace falta lo segundo, así que los cuatro objetos que
   la pesca usa —elipse, zona, imagen y graphics— se escriben a mano y guardan su estado. */
function objBase(o) {
  return Object.assign(o, {
    muerto: false,
    setDepth() { return this; }, setOrigin() { return this; }, setScale() { return this; },
    setStrokeStyle(w, c, a) { this.trazoAlpha = a; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setSize(w, h) { this.width = w; this.height = h; return this; },
    setFillStyle(c, a) { this.fillColor = c; this.fillAlpha = a; return this; },
    setAlpha(a) { this.alpha = a; return this; },
    setInteractive() { this.interactivo = true; return this; },
    setVisible() { return this; },
    on(ev, fn) { (this.manejadores[ev] = this.manejadores[ev] || []).push(fn); return this; },
    emitir(ev) { (this.manejadores[ev] || []).forEach(f => f()); },
    destroy() { this.muerto = true; },
  });
}
function nuevaEscena() {
  const dibujados = [];
  const nuevo = (tipo, x, y, w, h, color, alpha) => {
    const o = objBase({ tipo, x, y, width: w, height: h, fillColor: color, fillAlpha: alpha,
                        alpha: 1, manejadores: {} });
    dibujados.push(o); return o;
  };
  /* el graphics guarda la POLILÍNEA: es lo único que permite medir la panza del hilo sin
     recalcularla, que sería volver a medir mi propia fórmula. */
  const graficos = objBase({
    tipo: "graphics", manejadores: {}, puntos: [], grosor: 0, color: 0, alpha: 0,
    clear() { this.puntos = []; return this; },
    lineStyle(w, c, a) { this.grosor = w; this.color = c; this.alpha = a; return this; },
    beginPath() { return this; },
    moveTo(x, y) { this.puntos.push({ x, y }); return this; },
    lineTo(x, y) { this.puntos.push({ x, y }); return this; },
    strokePath() { return this; },
  });
  const tweens = [];
  /* FarmScene se declara con `class`, y una clase NO se cuelga del objeto global — vive en el
     ámbito léxico del contexto. Por eso se pide con runInContext y no con ctx.FarmScene, que da
     undefined y parece que el archivo no se hubiera cargado. */
  const esc = Object.create(g("FarmScene").prototype);
  Object.assign(esc, {
    dibujados, graficos, tweens, sacudidas: [], demoras: [],
    actScale: 1, facing: "east", action: null, objs: [], plots: [],
    hero: objBase({ tipo: "hero", x: 40, y: 200, manejadores: {},
                    anims: { isPlaying: false, currentAnim: null, stop() {} },
                    play(k) { this.animJugada = k; }, setTexture(k) { this.textura = k; } }),
    bobber: null, bobberTween: null, fishLine: null, fishBar: null,
    sombrasEl: [], pescaPez: null, pescaP0: null,
    add: {
      ellipse: (x, y, w, h, c, a) => nuevo("ellipse", x, y, w, h, c, a),
      rectangle: (x, y, w, h, c, a) => nuevo("rect", x, y, w, h, c, a),
      circle: (x, y, r, c, a) => nuevo("circle", x, y, r * 2, r * 2, c, a),
      image: (x, y, k) => Object.assign(nuevo("image", x, y, 8, 8, 0, 1), { textura: k }),
      zone: (x, y, w, h) => nuevo("zone", x, y, w, h, 0, 0),
      graphics: () => graficos,
    },
    /* el tween se resuelve YA: lo que se prueba es dónde termina cada cosa, no la interpolación
       (que es de Phaser y no es mía). Los de repeat -1 solo se anotan: son vaivenes que no
       terminan nunca, y "aplicar su final" no querría decir nada. */
    tweensAplicar(cfg) {
      tweens.push(cfg);
      if (cfg.repeat === -1) return objBase({ tipo: "tween", manejadores: {}, stop() {} });
      const t = cfg.targets;
      ["x", "y", "alpha", "width", "height", "angle"].forEach(k => { if (cfg[k] != null && t) t[k] = cfg[k]; });
      if (cfg.onComplete) cfg.onComplete();
      return objBase({ tipo: "tween", manejadores: {}, stop() {} });
    },
    make: { graphics: () => objBase({ tipo: "g2", manejadores: {}, fillStyle() { return this; },
             fillCircle() { return this; }, fillRect() { return this; }, generateTexture() { return this; } }) },
    textures: { exists: () => true },
    cameras: { main: { shake(d, i) { esc.sacudidas.push({ d, i }); } } },
    time: { delayedCall: (ms, fn) => { esc.demoras.push({ ms, fn }); return { remove() {} }; } },
    input: { activePointer: { worldX: 0, worldY: 0 } },
    anims: { exists: () => true },
    splashAt() {}, splashSparkle() {}, updatePrompt() {}, pondDist: () => 0,
  });
  esc.tweens = { add: (cfg) => esc.tweensAplicar(cfg) };
  ctx.window.farmScene = esc;
  return esc;
}
function partidaLimpia() {
  G.res = { lombriz: 500 }; G.plata = 100000; G.fish = {}; G.pescaStats = {}; G.torneo = null;
  G.canas = { junco: 1 }; G.pescaV4 = null; G.amarres = [];
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };
  ctx.pescaEstado().cebo = "lombriz";
}
/* LA PANZA REAL: cuánto CUELGA el hilo dibujado por debajo de la recta que une sus dos extremos.
   Se mide sobre los puntos que se mandaron dibujar, no sobre la cuenta que los produjo.

   DOS VECES ME EQUIVOQUÉ DE METRO ANTES DE ACERTAR, y las dos merecen quedar escritas porque
   las dos daban rojo con el juego sano:

   1) Proyectando sobre el eje x —`t = (p.x − a.x) / (b.x − a.x)`—. Ese denominador se va a cero
      cuando el corcho cae casi encima del granjero, y como la sombra elegida nace en un sitio
      sorteado del agua, eso pasaba una de cada seis veces. Un test intermitente es peor que no
      tenerlo: enseña a volver a correrlo hasta que salga verde, y el día que falle de verdad
      nadie le va a creer.
   2) Midiendo la distancia PERPENDICULAR a la cuerda. Estable, sí, pero mide otra cosa: un hilo
      no cuelga perpendicular a sí mismo, cuelga hacia abajo. Con la cuerda casi vertical la
      perpendicular tiende a cero y el test acusaba de invisible a una comba que se ve perfecta.

   Lo correcto es la caída VERTICAL, y con el parámetro de la curva en vez de la x: drawFishLine
   emite doce tramos a paso constante, así que el punto i es exactamente t = i/12. Sin divisiones
   que puedan explotar. */
function panzaDibujada(pts) {
  if (pts.length < 3) return 0;
  const a = pts[0], n = pts.length - 1, b = pts[n];
  let max = 0;
  for (let i = 1; i < n; i++) max = Math.max(max, pts[i].y - (a.y + (b.y - a.y) * (i / n)));
  return max;
}

console.log("\nTOCAR EL AGUA SACA TRES SOMBRAS AL AGUA   (no una fila de botones)");
let esc;
{
  partidaLimpia();
  esc = nuevaEscena();
  ctx.pescaV4Abrir();
  const P4 = g("P4");
  ok("el lance arranca eligiendo sombra", !!P4 && P4.fase === "sombras", P4 && P4.fase);
  ok("hay TRES sombras, no entre una y tres", esc.sombrasEl.length === 3, esc.sombrasEl.length + " sombras");
  const tipos = esc.sombrasEl.map(s => s.t);
  ok("y las tres son distintas", new Set(tipos).size === 3, tipos.join(", "));
  console.log("       → sombrasNuevas() sorteaba entre 1 y 3 CON repetición: la mitad de las veces");
  console.log("         ofrecía una sola, o tres iguales. Elegir la sombra es lo que inclina la");
  console.log("         banda del pez — una elección entre tres cosas idénticas no es una elección.");
  const R = esc.pescaRect();
  const fuera = esc.sombrasEl.filter(s => s.el.x < R.x1 - 1 || s.el.x > R.x2 + 1 || s.el.y < R.y1 - 1 || s.el.y > R.y2 + 1);
  ok("las tres nacen dentro de la laguna", !fuera.length, fuera.length + " fuera del agua");
  /* el tamaño es lo ÚNICO que las distingue, así que tiene que distinguirlas de verdad */
  const anchoDe = (t) => esc.sombrasEl.find(s => s.t === t).el.width;
  ok("la grande se ve más grande que la chica, sin decirlo",
    anchoDe("grande") > anchoDe("mediana") && anchoDe("mediana") > anchoDe("chica"),
    [anchoDe("chica"), anchoDe("mediana"), anchoDe("grande")].join(" < ") + " px de ancho");
  ok("y cada una se puede tocar", esc.sombrasEl.every(s => s.zn.interactivo));
  ok("todavía no hay corcho en el agua: se tira a una sombra, no al agua", !esc.bobber);
}

console.log("\nSE TIRA A LA SOMBRA ELEGIDA, Y LAS OTRAS SE VAN");
{
  const grande = esc.sombrasEl.find(s => s.t === "grande");
  const dx = grande.el.x, dy = grande.el.y;
  grande.zn.emitir("pointerdown");                       // el jugador toca esa sombra
  const P4 = g("P4");
  ok("el lance pasa a esperar el pique", P4.fase === "espera", P4.fase);
  ok("y se guardó la sombra elegida — es la que inclina la banda", P4.sombra === "grande", P4.sombra);
  ok("el corcho voló al agua", !!esc.bobber);
  ok("y cayó donde estaba la sombra", Math.abs(esc.bobber.x - dx) < 2 && Math.abs(esc.bobber.y - dy) < 2,
    "(" + Math.round(esc.bobber.x) + ", " + Math.round(esc.bobber.y) + ")");
  ok("las otras dos sombras se fueron", esc.sombrasEl.length === 0);
  ok("y no quedaron zonas de clic huérfanas en el agua",
    !esc.dibujados.some(o => o.tipo === "zone" && !o.muerto));
  console.log("       → una zona de clic que sobrevive a su dibujo es un trozo de agua que hace");
  console.log("         algo y no se ve: el peor tipo de fantasma, porque nadie lo reporta.");
}

console.log("\nEL PIQUE SE VE EN EL CORCHO");
{
  const P4 = g("P4");
  P4.espera = 0.001;
  ctx.pescaV4Paso(0.05);
  ok("pasada la espera, pica", P4.fase === "pique", P4.fase);
  const vaiven = esc.tweens.filter ? null : null;
  ok("el corcho se hunde a golpes (un vaivén que no termina)",
    !!esc.bobberTween, "tween de repeat -1 sobre el corcho");
  ok("y el agua hace ondas", esc.dibujados.some(o => o.tipo === "ellipse" && o.trazoAlpha > 0));
}

console.log("\nLA TENSIÓN ES LA PANZA DEL HILO   (medida sobre lo que se dibujó)");
{
  ctx.pescaV4Clavar();
  const P4 = g("P4");
  ok("clavar engancha", P4.fase === "pelea" && !!P4.L);
  console.log("");
  console.log("    tensión del lance     panza del hilo dibujado");
  const panzas = [];
  for (const ten of [0, 25, 50, 75, 100]) {
    P4.L.tension = ten; P4.L.progreso = 0; P4.L.tirando = false; P4.L.oculta = false; P4.L.trAviso = "";
    esc.pescaDibujar(0.016, 1);
    const p = panzaDibujada(esc.graficos.puntos);
    panzas.push(p);
    console.log("    " + String(ten).padStart(8) + " %" + p.toFixed(2).padStart(24) + " px");
  }
  console.log("");
  ok("a más tensión, menos panza — SIEMPRE", panzas.every((p, i) => i === 0 || p < panzas[i - 1]),
    panzas.map(p => p.toFixed(1)).join(" → "));
  ok("con el hilo flojo la panza se ve de lejos", panzas[0] > 15, panzas[0].toFixed(1) + " px");
  ok("y al límite el hilo está recto", panzas[4] < 4, panzas[4].toFixed(1) + " px");
  /* LA COMPROBACIÓN QUE DE VERDAD IMPORTA, y la que cazó el primer fallo: que el RECORRIDO sea
     grande. La primera versión iba de 86,9 px a 84,6 — monótona, correcta, y un 2,6 % de cambio
     que nadie iba a ver nunca. Un indicador que se mueve poco no es un indicador tenue: es un
     indicador que no está. */
  ok("y el recorrido del hilo es casi entero: se ve, no se deduce", panzas[4] / panzas[0] < 0.15,
    "el hilo tenso tiene un " + Math.round(panzas[4] / panzas[0] * 100) + " % de la panza del flojo");
  console.log("       → antes este mismo número daba 97 %. La cuenta era correcta y la imagen no");
  console.log("         se movía, que es el fallo del peaje otra vez con otra cara.");
  /* Y LA MISMA TENSIÓN TIENE QUE VERSE IGUAL DESDE CUALQUIER ORILLA. Este es el segundo fallo
     que encontró este archivo, y era más sutil: con la comba anclada al corcho, la panza salía
     de la CAÍDA entre la caña y el agua. Pescando de cerca daba 1,5 px y de lejos 88. La misma
     tensión, dos lecturas — o sea, ninguna. */
  const panzaDesde = (hx, hy) => {
    esc.hero.x = hx; esc.hero.y = hy;
    const P = g("P4"); P.L.tension = 0; P.L.progreso = 0;
    esc.pescaDibujar(0.016, 1);
    return panzaDibujada(esc.graficos.puntos);
  };
  const orillas = [panzaDesde(40, 200), panzaDesde(120, 430), panzaDesde(300, 500), panzaDesde(90, 470)];
  const disp = Math.max(...orillas) - Math.min(...orillas);
  ok("y la misma tensión se ve igual desde cualquier orilla", disp < 1.5,
    orillas.map(p => p.toFixed(1)).join(" · ") + " px desde cuatro sitios distintos");
  esc.hero.x = 40; esc.hero.y = 200;
  /* y el color, que es el segundo aviso: el jugador va a estar mirando el corcho, no el hilo */
  const colorA = (ten) => { const P = g("P4"); P.L.tension = ten; esc.pescaDibujar(0.016, 1); return esc.graficos.color; };
  const cFlojo = colorA(10), cMedio = colorA(65), cAlto = colorA(95);
  ok("y el hilo cambia de color al acercarse al corte",
    cFlojo !== cMedio && cMedio !== cAlto,
    "0x" + cFlojo.toString(16) + " → 0x" + cMedio.toString(16) + " → 0x" + cAlto.toString(16));
  console.log("       → dos avisos para lo mismo, a propósito y no por descuido: en la pulseada el");
  console.log("         jugador mira el corcho, no el hilo. Si el único aviso fuera la panza, el");
  console.log("         corte llegaría sin que nadie lo hubiera visto venir.");
}

console.log("\nEL PROGRESO ES EL CORCHO ACERCÁNDOSE A LA ORILLA");
{
  const P4 = g("P4");
  P4.L.tension = 30; P4.L.tirando = false; P4.L.oculta = false;
  const dist = (pr) => { P4.L.progreso = pr; esc.pescaDibujar(0.016, 1);
                         return Math.hypot(esc.bobber.x - esc.hero.x, esc.bobber.y - esc.hero.y); };
  const d0 = dist(0), d5 = dist(0.5), d1 = dist(1);
  console.log("");
  console.log("    progreso 0 %  → el corcho está a " + d0.toFixed(0) + " px del granjero");
  console.log("    progreso 50 % → " + d5.toFixed(0) + " px");
  console.log("    progreso 100 %→ " + d1.toFixed(0) + " px");
  console.log("");
  ok("el corcho se acerca a medida que se recoge", d0 > d5 && d5 > d1, [d0, d5, d1].map(x => x.toFixed(0)).join(" > "));
  ok("pero no llega a la mano: el último tramo lo hace el pez saltando", d1 > 8, d1.toFixed(0) + " px al 100 %");
  /* EL TIRÓN: el corcho pega un salto hacia el agua. Se compara contra el MISMO progreso sin
     tirón — si no, estaríamos midiendo el avance y no el tirón. */
  P4.L.progreso = 0.5; P4.L.tirando = false; esc.pescaDibujar(0.016, 1);
  const quieto = { x: esc.bobber.x, y: esc.bobber.y };
  P4.L.tirando = true;
  let saltoMax = 0;
  for (let i = 0; i < 20; i++) { esc.pescaDibujar(0.016, 1); saltoMax = Math.max(saltoMax, Math.hypot(esc.bobber.x - quieto.x, esc.bobber.y - quieto.y)); }
  ok("en el tirón el corcho pega un salto hacia el agua", saltoMax > 2, saltoMax.toFixed(1) + " px de salto");
}

console.log("\nLOS TRUCOS SE VEN, QUE ERA TODO EL PUNTO");
{
  const P4 = g("P4");
  P4.L.tirando = false; P4.L.progreso = 0.4; P4.L.tension = 40;
  /* EL PEZ GLOBO se infla: la sombra de abajo crece */
  P4.L.trAviso = ""; esc.pescaDibujar(0.016, 1);
  const normal = esc.pescaPez.width;
  P4.L.trAviso = "inflado"; esc.pescaDibujar(0.016, 1);
  const inflado = esc.pescaPez.width;
  ok("el pez globo se INFLA a la vista", inflado > normal * 1.3,
    normal.toFixed(0) + " px → " + inflado.toFixed(0) + " px de ancho");
  /* EL PEZ LINTERNA apaga la luz: hilo y corcho casi invisibles, y el lance sigue corriendo */
  P4.L.trAviso = ""; esc.pescaDibujar(0.016, 1);
  const claroCorcho = esc.bobber.alpha, claroHilo = esc.graficos.alpha;
  P4.L.oculta = true; esc.pescaDibujar(0.016, 1);
  ok("el linterna apaga el corcho", esc.bobber.alpha < claroCorcho * 0.25,
    claroCorcho.toFixed(2) + " → " + esc.bobber.alpha.toFixed(2) + " de opacidad");
  ok("y apaga el hilo", esc.graficos.alpha < claroHilo * 0.25,
    claroHilo.toFixed(2) + " → " + esc.graficos.alpha.toFixed(2));
  /* lo que importa de verdad: SE APAGA, NO SE CONGELA */
  const antes = { x: esc.bobber.x, y: esc.bobber.y };
  P4.L.progreso = 0.8; esc.pescaDibujar(0.016, 1);
  ok("pero por debajo el lance SIGUE: a oscuras el corcho igual avanza",
    Math.hypot(esc.bobber.x - antes.x, esc.bobber.y - antes.y) > 1,
    "no sabés dónde estás, y seguís");
  P4.L.oculta = false;
}

console.log("\nY SE PUEDE SALIR   (lo que el cuadro viejo no dejaba hacer)");
{
  ok("estamos pescando", !!g("P4"));
  ctx.pescaV4Cerrar();
  ok("cerrar deja P4 en nada", !g("P4"));
  ok("y el agua limpia: ni corcho…", !esc.bobber);
  ok("…ni sombras…", (esc.sombrasEl || []).length === 0);
  ok("…ni el pez de abajo", !esc.pescaPez);
  ok("y la acción del mundo se suelta: el granjero puede volver a caminar", !esc.action);
  console.log("       → pescaV4Cerrar() existía desde el 27/8 y NO SE LLAMABA DESDE NINGÚN LADO.");
  console.log("         Ni botón, ni Escape (el panel no era una .ov, así que closeAllOv no lo");
  console.log("         veía), ni clic afuera. Se abría tocando el agua y se quedaba puesto para");
  console.log("         siempre: « le das click y sale un cuadro no entendí ».");
}

console.log("\nY NO QUEDA MINIJUEGO EN EL HTML");
{
  const fs = require("fs");
  const html = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  /* los ids de las dos barras y del botón: si vuelven, es que volvió el panel */
  const IDOS = ["p4-prog", "p4-tens", "p4-aviso", "p4-btn", "p4-agua", "p4-pie", "p4-sombra", "p4-oval"];
  const vivos = IDOS.filter(k => html.indexOf(k) >= 0);
  ok("las barras, el botón y las sombras de HTML ya no están en el marcado", !vivos.length, vivos.join(", "));
  ok("ni ui.js los pinta", !IDOS.some(k => ui.indexOf('"' + k + '"') >= 0));
  ok("los aparejos SÍ siguen: cebos, cañas y nasas",
    ["p4-cebos", "p4-canas", "p4-nasas"].every(k => html.indexOf(k) >= 0));
  ok("y ahora tienen salida propia", html.indexOf("p4-cerrar") >= 0, "el botón ✕ que nunca hubo");
  /* UN SOLO RELOJ: la pulseada no puede tener su propio bucle.
     SIN COMENTARIOS, y esto lo aprendí acá mismo por segunda vez en dos días: la primera versión
     daba rojo porque el único `requestAnimationFrame` de toda esa zona está DENTRO del comentario
     que explica que ya no hay ninguno. Un test que prohíbe nombrar lo que se quitó obliga a
     borrar la única explicación de por qué el código es como es — la misma trampa en la que cayó
     test-sin-pesca-v3 con TRAMPA_DEF. */
  const zona = ui.slice(ui.indexOf("PESCA v4"), ui.indexOf("function refreshHud"))
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("y la pulseada no se corre con un requestAnimationFrame aparte",
    !/requestAnimationFrame/.test(zona),
    "corre con el reloj de la escena, que es uno solo");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la pesca todavía tiene algo que se lee en vez de verse"
  : "  Todo en orden: la pulseada pasa en el agua y se mide en el agua.");
process.exit(fallos ? 1 : 0);
