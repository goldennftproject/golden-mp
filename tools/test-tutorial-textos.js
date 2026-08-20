/* EL TUTORIAL NO PUEDE MANDARTE A UN SITIO DONDE LA COSA NO ESTÁ (19/8, dirección)
   "Me dice que coloque el plano de la Herrería desde la barra rápida. En realidad no está en mi
    barra rápida, está en el Cobertizo."
   Era un texto huérfano: el 18/8 los planos se mudaron al Cobertizo y planoAHotbar() quedó vacía,
   pero los tres carteles siguieron nombrando la barra. Mandar a alguien al lugar equivocado en su
   primer edificio es de los errores más caros que hay — el jugador no sabe si el juego está roto o
   si es él el que no entiende, y encima pasa en el minuto cinco.
   Este test ata el TEXTO al CÓDIGO: si mañana algo se muda otra vez de sitio, salta acá.
     node tools/test-tutorial-textos.js                                                           */
const fs = require("fs"), vm = require("vm");
const SRC = fs.readFileSync("public/game/state.js", "utf8");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(SRC + "\n;this.X={TUTO_STEPS,PLANO_PASO,BUILD_DEF,DECO_ORDER};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLOS PLANOS VIVEN EN EL COBERTIZO, Y EL TEXTO LO DICE");
{
  /* Primero la verdad del código: ¿dónde está el plano cuando te lo dan? */
  ok("planoAHotbar ya no pone nada en la barra", /function planoAHotbar\([^)]*\)\s*\{\s*\}/.test(SRC),
    "quedó vacía el 18/8");
  G.planos = { store: 1 }; G.decos = {}; G.chests = []; G.cobertizo = {};
  const enCob = (ctx.cobertizoItems() || []).some(i => i.kind === "plano" && i.key === "store");
  ok("y el Cobertizo sí lo tiene", enCob, "cobertizoItems() lo lista");

  /* Y ahora el texto: ningún paso de "colocá el plano" puede nombrar la barra rápida. */
  const pasos = X.TUTO_STEPS.filter(s => s.id && s.id.indexOf("place_") === 0);
  ok("hay " + pasos.length + " pasos de « colocá el plano »", pasos.length >= 3);
  pasos.forEach(s => {
    ok("« " + s.txt + " » no manda a la barra rápida", !/barra r[áa]pida/i.test(s.txt || ""));
    ok("   …y nombra el Cobertizo", /cobertizo/i.test(s.txt || ""), s.txt);
  });
}

console.log("\nY LA FLECHA VA AL MISMO SITIO QUE EL TEXTO");
{
  /* Un cartel que dice una cosa y una flecha que apunta a otra es peor que no tener flecha. */
  const pasos = X.TUTO_STEPS.filter(s => s.id && s.id.indexOf("place_") === 0);
  pasos.forEach(s => {
    ok("« " + s.id + " » apunta al panel del Cobertizo", s.panel === "ov-cobertizo", s.panel || "sin panel");
    ok("   …y adentro, al plano", s.ui === ".slot.k-plano", s.ui || "sin ui");
    /* Y NO puede llevar `target`: con un edificio en el mundo la flecha del menú se apaga y espera
       que el edificio ya exista… pero acá el edificio es justamente lo que todavía no se colocó. */
    ok("   …sin mandar al mundo, que es donde NO está", !s.target,
      s.target ? "target: " + s.target : "el edificio todavía no existe");
    /* Y el plano se dibuja con esa clase: si el panel cambiara de plantilla, la flecha apuntaría
       al vacío y nadie se enteraría. */
    ok("   …y el Cobertizo dibuja los planos con esa clase", /k-' \+ d\.kind/.test(UI) || /k-plano/.test(UI),
      "refreshCobertizo usa k-<kind>");
  });
}

console.log("\nEL AVISO DE CUANDO LLEGA EL PLANO, TAMBIÉN");
{
  /* El mismo error estaba en la entrega: "está en tu bolsa", "colocalo desde tu barra rápida". */
  /* Se miran las CADENAS que ve el jugador, no el comentario que explica por qué se cambiaron —
     la primera versión de esto leía el bloque entero y se marcaba a sí misma por citar el texto
     viejo dentro de una explicación. */
  const dar = SRC.split("function darPlano")[1].slice(0, 1200)
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("el aviso no dice « en tu bolsa »", !/en tu bolsa/i.test(dar));
  ok("ni « barra rápida »", !/barra r[áa]pida/i.test(dar));
  ok("y sí nombra el Cobertizo", /Cobertizo/.test(dar));
}

console.log("\nLA REGLA GENERAL: NINGÚN PASO NOMBRA UN SITIO QUE NO USA");
{
  /* Barrido de todos los pasos: si el texto nombra un sitio concreto, el paso tiene que apuntar
     ahí. Es la clase de error que se cuela cada vez que algo se muda de panel. */
  const SITIOS = [
    [/barra r[áa]pida/i, null,             "la barra rápida"],
    [/cobertizo/i,       "ov-cobertizo",   "el Cobertizo"],
    [/mercado/i,         "ov-market",      "el Mercado"],
    [/herrer[íi]a/i,     "ov-forge",       "la Herrería"],
    [/panel de equipo/i, "ov-equip",       "el panel de Equipo"],
  ];
  X.TUTO_STEPS.forEach((s, i) => {
    SITIOS.forEach(([re, panel, nom]) => {
      if (!re.test(s.txt || "")) return;
      if (panel === null) { ok("paso " + (i + 1) + " nombra " + nom, false, "ya nadie guarda nada ahí"); return; }
      /* Los pasos que nombran un edificio por su NOMBRE (forjá en la Herrería) apuntan a su panel;
         los que solo lo mencionan de paso (juntá madera para la obra de la Herrería) no. */
      /* Nombrar un edificio no siempre es mandarte a él: "el PLANO de la Herrería" habla del
         objeto, y el objeto está en el Cobertizo. Igual que "madera para la obra de la Herrería"
         habla del destino de la madera, no de un panel que haya que abrir. */
      if (s.panel && s.panel !== panel && !/para la obra|obra de|plano de|PLANO de/i.test(s.txt)) {
        ok("paso " + (i + 1) + " nombra " + nom + " pero apunta a " + s.panel, false, s.txt);
      }
    });
  });
  ok("ningún paso nombra un sitio equivocado", true, X.TUTO_STEPS.length + " textos revisados");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ el cartel y la flecha mandan al mismo sitio, y es donde está la cosa\n");
process.exit(fallos ? 1 : 0);
