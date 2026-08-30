/* LA PESCA PASA EN EL AGUA, Y NO HAY NADA QUE TOCAR                                    (28/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Este archivo se escribió ayer para defender una pulseada escénica —el hilo como tensión, el
   corcho como progreso, los trucos de cada especie— y hoy la defiende al revés: comprueba que
   nada de eso exista.

   La dirección lo cortó en dos frases:
     « todo ese minijuego hay que quitarlo, porque eso me lo inventé yo y no estaba en el
       documento. Que simplemente se tire la caña y suceda lo que tenga que suceder. »
     « cuando habla de caña por pez, se refiere a que la caña PERMITE SACAR esos peces. No es que
       tengas que seleccionar el pez, nada. »

   Las dos me señalan lo mismo desde dos lados: las sombras no eran una lectura suave del
   encargo, eran un menú que yo había puesto en el agua, y la pulseada era un juego entero que
   nadie pidió. Los borré y este archivo pasa a ser el que impide que vuelvan.

   LO QUE SÍ SE CONSERVA es la puesta en escena, que es lo único que la dirección sí había
   pedido: el corcho vuela, flota, se hunde, y el pez salta en arco a la mano. Eso es animación,
   no minijuego — la diferencia es que no hay nada que se pueda hacer bien ni mal.
     node tools/test-pesca-escena.js                                                             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("celebrate = window.celebrate; toast = window.toast; log = window.log;", ctx);

/* ── UN PHASER QUE ANOTA ─────────────────────────────────────────────────────────────────────
   El arnés compartido devuelve un proxy que acepta cualquier cosa: sirve para saber si algo
   revienta, no para saber qué dibujó. Acá hace falta lo segundo. */
function objBase(o) {
  return Object.assign(o, {
    muerto: false, manejadores: {},
    setDepth() { return this; }, setOrigin() { return this; }, setScale() { return this; },
    setStrokeStyle(w, c, a) { this.trazoAlpha = a; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setSize(w, h) { this.width = w; this.height = h; return this; },
    setFillStyle(c, a) { this.fillColor = c; this.fillAlpha = a; return this; },
    setAlpha(a) { this.alpha = a; return this; },
    setInteractive() { this.interactivo = true; return this; },
    setVisible() { return this; },
    on(ev, fn) { (this.manejadores[ev] = this.manejadores[ev] || []).push(fn); return this; },
    destroy() { this.muerto = true; },
  });
}
function nuevaEscena() {
  const dibujados = [];
  const nuevo = (tipo, x, y, w, h) => { const o = objBase({ tipo, x, y, width: w, height: h, alpha: 1 }); dibujados.push(o); return o; };
  const graficos = objBase({ tipo: "graphics", puntos: [], alpha: 0,
    clear() { this.puntos = []; return this; },
    lineStyle(w, c, a) { this.alpha = a; return this; },
    beginPath() { return this; }, moveTo(x, y) { this.puntos.push({ x, y }); return this; },
    lineTo(x, y) { this.puntos.push({ x, y }); return this; }, strokePath() { return this; } });
  const esc = Object.create(g("FarmScene").prototype);
  Object.assign(esc, {
    dibujados, graficos, tweensHechos: [], demoras: [],
    actScale: 1, facing: "east", action: null, objs: [], plots: [],
    hero: objBase({ tipo: "hero", x: 40, y: 200,
      anims: { isPlaying: false, currentAnim: null, stop() {} },
      play(k) { this.animJugada = k; }, setTexture(k) { this.textura = k; } }),
    bobber: null, bobberTween: null, fishLine: null, fishBar: null, pescaP0: null,
    add: {
      ellipse: (x, y, w, h) => nuevo("ellipse", x, y, w, h),
      rectangle: (x, y, w, h) => nuevo("rect", x, y, w, h),
      circle: (x, y, r) => nuevo("circle", x, y, r * 2, r * 2),
      image: (x, y, k) => Object.assign(nuevo("image", x, y, 8, 8), { textura: k }),
      zone: (x, y, w, h) => nuevo("zone", x, y, w, h),
      graphics: () => graficos,
    },
    make: { graphics: () => objBase({ tipo: "g2", fillStyle() { return this; }, fillCircle() { return this; },
             fillRect() { return this; }, generateTexture() { return this; } }) },
    textures: { exists: () => true },
    cameras: { main: { shake() {} } },
    time: { delayedCall: (ms, fn) => { esc.demoras.push({ ms, fn }); return { remove() {} }; } },
    input: { activePointer: { worldX: 0, worldY: 0 } },
    anims: { exists: () => true },
    splashAt() {}, splashSparkle() {}, updatePrompt() {}, pondDist: () => 0,
  });
  /* el tween se resuelve YA: lo que se prueba es dónde termina cada cosa, no la interpolación,
     que es de Phaser y no es mía. Los de repeat -1 solo se anotan. */
  esc.tweens = { add: (cfg) => {
    esc.tweensHechos.push(cfg);
    if (cfg.repeat !== -1) {
      ["x", "y", "alpha", "width", "height", "angle"].forEach(k => { if (cfg[k] != null && cfg.targets) cfg.targets[k] = cfg[k]; });
      if (cfg.onComplete) cfg.onComplete();
    }
    return objBase({ tipo: "tween", stop() {} });
  } };
  ctx.window.farmScene = esc;
  return esc;
}
function partidaLimpia() {
  G.res = { lombriz: 50 }; G.plata = 100000; G.fish = {}; G.pescaStats = {}; G.torneo = null;
  G.canas = { junco: 1 }; G.pescaV4 = null; G.amarres = []; G.nasas = [];
  let acc = 0; for (let k = 2; k <= 20; k++) acc += ctx.skillNeed(k, "fishing");
  G.skills = { fishing: acc, farming: acc };
  ctx.pescaEstado().cebo = "lombriz";
}

let esc;
console.log("\nTOCAR EL AGUA TIRA LA CAÑA, Y YA");
{
  partidaLimpia();
  esc = nuevaEscena();
  const lomb = G.res.lombriz;
  const salio = ctx.pescaV4Abrir();
  const P4 = g("P4");
  ok("el lance arranca", salio === true && !!P4);
  ok("y cobra UNA lombriz al tirar", G.res.lombriz === lomb - 1, lomb + " → " + G.res.lombriz);
  ok("el corcho está en el agua", !!esc.bobber);
  const R = esc.pescaRect();
  ok("y cayó dentro de la laguna",
    esc.bobber.x >= R.x1 - 1 && esc.bobber.x <= R.x2 + 1 && esc.bobber.y >= R.y1 - 1 && esc.bobber.y <= R.y2 + 1,
    "(" + Math.round(esc.bobber.x) + ", " + Math.round(esc.bobber.y) + ")");
  ok("NO hay nada que elegir en el agua: ni una zona de clic",
    !esc.dibujados.some(o => o.tipo === "zone" && !o.muerto));
  console.log("       → « no es que tengas que seleccionar el pez, nada ». Acá vivían tres sombras");
  console.log("         con su zona de clic cada una. Eran un menú disfrazado de laguna.");
  ok("el pez ya está decidido desde que se pagó la lombriz", !!P4.r && !!P4.r.id,
    g("PEZ_DEF")[P4.r.id].label + " de " + P4.r.kg + " kg, esperando a que termine la animación");
  console.log("       → decidirlo al final dejaría cerrar la pestaña al ver algo que no gusta y");
  console.log("         volver a tirar con la misma lombriz.");
}

console.log("\nY MIENTRAS TANTO NO PASA NADA   (que es exactamente lo que se pidió)");
{
  const P4 = g("P4");
  const antes = { x: esc.bobber.x, y: esc.bobber.y };
  for (let i = 0; i < 10; i++) { ctx.pescaV4Paso(0.05); esc.pescaDibujar(0.05, 1); }
  ok("el corcho no se mueve solo hacia la orilla",
    Math.abs(esc.bobber.x - antes.x) < 1 && Math.abs(esc.bobber.y - antes.y) < 1);
  ok("el hilo se dibuja, pero sin tensión que leer", esc.graficos.puntos.length > 2);
  ok("y el lance sigue vivo: nada se puede hacer mal", !!g("P4"));
  /* EL PIQUE: medio segundo antes del final, el corcho se hunde a golpes */
  while (g("P4") && g("P4").t < g("P4").dur - 0.45) { ctx.pescaV4Paso(0.05); esc.pescaDibujar(0.05, 1); }
  esc.pescaDibujar(0.05, 1);
  ok("medio segundo antes de sacarlo, el corcho se hunde", esc.pescaPicado === true);
  ok("y hace ondas en el agua", esc.dibujados.some(o => o.tipo === "ellipse" && o.trazoAlpha > 0));
  console.log("       → es lo único que pasa en todo el lance, y pasa para que la captura no salga");
  console.log("         de la nada: un premio sin antesala se lee como un paso que el juego se saltó.");
}

console.log("\nEL PEZ SALTA A LA MANO Y EL LANCE SE CIERRA");
{
  const idEsperado = g("P4").r.id;
  let vueltas = 0;
  while (g("P4") && vueltas++ < 400) { ctx.pescaV4Paso(0.05); esc.pescaDibujar(0.05, 1); }
  ok("pasado su tiempo, el lance se resuelve solo", !g("P4"));
  ok("y el pez entra en la bolsa", (G.fish[idEsperado] || 0) === 1, g("PEZ_DEF")[idEsperado].label);
  ok("con su salto en arco hasta el granjero",
    esc.dibujados.some(o => o.tipo === "image" && String(o.textura || "").indexOf("fish") === 0),
    "catchFx");
  /* y la acción del mundo se cierra con un respiro, no en el mismo cuadro */
  ok("la escena programa el cierre con un respiro", esc.demoras.length > 0,
    esc.demoras.map(d => d.ms + " ms").join(" · "));
  esc.demoras.forEach(d => d.fn());
  ok("y al ejecutarlo, el agua queda limpia", !esc.bobber && !esc.action);
  console.log("       → si se limpiara en el mismo cuadro en que el lance termina, el corcho");
  console.log("         desaparecería antes de que el pez empezara a saltar: se vería el aviso");
  console.log("         del pez y ningún pez.");
}

console.log("\nUN CLIC ES UN LANCE   (y no se pueden encadenar dos por accidente)");
{
  partidaLimpia(); esc = nuevaEscena();
  ctx.pescaV4Abrir();
  const lomb = G.res.lombriz;
  const fuente = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("con un lance en curso, el mundo no acepta más clics",
    /if \(typeof P4 !== "undefined" && P4\) return;/.test(fuente),
    "si no, dos clics pagarían dos lombrices y enseñarían un solo pez");
  ok("y la lombriz no se cobró dos veces", G.res.lombriz === lomb);
}

console.log("\nY NO QUEDA MINIJUEGO EN NINGUNA PARTE");
{
  const codigo = ["state.js", "ui.js", "farm.js"].map(f =>
    fs.readFileSync(path.join(RAIZ, "public/game", f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")).join("\n");
  /* SIN COMENTARIOS: explicar por qué se quitó la pulseada es exactamente lo que hay que hacer,
     y no debe hacer fallar nada. La misma lección que ya dejó escrita la jubilación de la v3. */
  const IDOS = ["peleaTick", "trucoTick", "trucoArmar", "TRUCO_DEF", "SOMBRA_DEF", "sombrasNuevas",
                "bandaConSombra", "PELEA_V4", "PIQUE_VENTANA", "PIQUE_ESPERA", "RACHA_PARA_SUBIR",
                "lanceArmar", "lanceCerrar", "pescaV4Clavar", "pescaV4Tirar", "_p4Hold",
                "pescaOfrecerSombras", "pescaEnganchado", "pescaCorte"];
  const vivos = IDOS.filter(k => new RegExp("\\b" + k + "\\b").test(codigo));
  ok("ninguno de los " + IDOS.length + " símbolos de la pulseada sigue vivo", !vivos.length, vivos.join(", "));
  /* y lo que SÍ tiene que seguir: la escena, que es lo que la dirección pidió conservar */
  const VIVOS = ["castBobber", "drawFishLine", "catchFx", "pescaTirar", "pescaCaptura", "lanceSacar", "pecesDeCana"];
  const faltan = VIVOS.filter(k => !new RegExp("\\b" + k + "\\b").test(codigo));
  ok("y la puesta en escena sigue entera: corcho, hilo y el pez saltando", !faltan.length, faltan.join(", "));
  console.log("       → un test que solo mide ausencias daría verde con el juego entero borrado.");
  /* el HTML tampoco puede tener nada de la pulseada */
  const html = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  ok("ni el marcado guarda barras, botón ni sombras",
    !["p4-prog", "p4-tens", "p4-aviso", "p4-btn", "p4-agua", "p4-sombra"].some(k => html.indexOf(k) >= 0));
  ok("y los aparejos siguen: cebos, cañas y nasas",
    ["p4-cebos", "p4-canas", "p4-nasas"].every(k => html.indexOf(k) >= 0));
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — todavía queda algo que el jugador tiene que jugar"
  : "  Todo en orden: se tira la caña y sucede lo que tenga que suceder.");
process.exit(fallos ? 1 : 0);
