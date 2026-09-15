/* LA ARMADURA SE GASTA, EL CONEJO COME MUCHO Y EL SUELO PESA        (14/9, dirección · Discord)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Tres decisiones de la misma tarde, las tres de dirección por Discord:

   1 · LA RACIÓN. « alimentar el conejo debería pedir 20 zanahorias en vez de 1 cada 24h ». El
       conejo come barato (8 de plata la zanahoria) y la alpaca caro (680 el trigo), así que con
       una unidad para todos el conejo costaba 85 veces menos por el mismo rinde. Ahora cada
       animal come `racion` unidades, y esa ración entra en el precio de su material.

   2 · LA ARMADURA NO ES ETERNA. « debe repararse con materiales de animales… porque sino los
       animales tienen 1 solo uso y ya no tiene sentido ». Cada golpe recibido gasta una pieza;
       a cero deja de dar defensa pero NO se rompe (ley 1: no se pierde progreso); reparar cuesta
       la mitad del material, proporcional a lo que falte; y crear cuesta ×1,5 para que esa mitad
       sea la mitad de algo.

   3 · EL SUELO PESA. Del tercer documento de Tibia se adoptó el terreno y NO la rejilla (la razón,
       medida, está en GF.SUELO en config.js). Cada zona tiene su suelo y la granja queda igual.
     node tools/test-armadura-y-raciones.js                                                     */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · LA RACIÓN: EL QUE COME BARATO, COME MUCHO\n");
{
  const A = g("ANIMAL_DEF"), C = g("CROP_DEF"), P = g("PRICE"), ANCLA = 24 * 20;
  ok("el conejo come 20 y los otros 1", A.conejo.racion === 20 && A.alpaca.racion === 1 && A.toro.racion === 1 && A.jabali.racion === 1);
  for (const k in A) {
    const a = A[k], barata = a.come.map(c => C[c].price).sort((x, y) => x - y)[0];
    const dia = barata * a.racion, rinde = P[a.mat] * a.porCiclo;
    ok("  " + a.label + ": un día cuesta " + dia + " y rinde " + rinde + " → cae en el ancla", rinde - dia === ANCLA, String(rinde - dia));
  }
  /* el punto de la ración: que el conejo deje de ser el chollo. Antes su día costaba 8 contra los
     680 de la alpaca — 85 veces menos por exactamente el mismo rinde. */
  const dia = (k) => g("ANIMAL_DEF." + k + ".come").map(c => g("CROP_DEF")[c].price).sort((x, y) => x - y)[0] * g("ANIMAL_DEF." + k + ".racion");
  ok("la distancia entre el más barato y el más caro bajó de 85x a menos de 8x",
    dia("alpaca") / dia("conejo") < 8, "hoy " + (dia("alpaca") / dia("conejo")).toFixed(1) + "x");

  G.animals = { conejo: [{ feliz: 100, prodAt: 0, comidoAt: 0 }] };
  G.res = { zanahoria: 19 };
  ok("con 19 zanahorias el conejo NO come (la ración es entera o nada)", g('alimentarUno("conejo", 0, true)') === 0 && G.res.zanahoria === 19);
  G.res = { zanahoria: 20 };
  ok("con 20 sí come, y se las lleva todas", g('alimentarUno("conejo", 0, true)') === 1 && G.res.zanahoria === 0);
}

console.log("\n2 · LA ARMADURA SE GASTA Y SE REPARA\n");
{
  const S = g("ARMOR_SETS"), SLOTS = g("ARMOR_SLOTS"), MAX = g("ARMOR_DUR_MAX");
  ok("crear cuesta ×1,5 y está escrito una sola vez", g("ARMOR_COSTE_MULT") === 1.5);
  ok("reparar entera cuesta la mitad del material", g("ARMOR_REPARA_PCT") === 0.5);

  G.built = { curtiduria: true }; G.armor = {}; G.armorDur = {}; G.armorEq = null;
  G.res = { pelaje: 999, hierro: 999 }; G.plata = 99999;
  SLOTS.forEach(pz => g('craftArmor("piel", "' + pz + '")'));
  ok("las cinco piezas nacen enteras", SLOTS.every(pz => g('armorDur("piel", "' + pz + '")') === MAX));
  const defLlena = g("armorDefensa()");
  ok("y el set completo da su defensa y su bono", defLlena > 0 && !!g("armorBono()"), defLlena + " de defensa");

  /* 15/9 (dirección, corrigiendo lo de ayer): « -1 por golpe SIMULTÁNEA ». El 14/9 un golpe
     gastaba UNA pieza (la más entera), así que el set aguantaba 500 golpes en vez de 100. Ahora
     el golpe se lo lleva la armadura entera, que es lo que la mecánica quería decir. */
  g("armorGastar(1)");
  ok("UN golpe gasta las cinco piezas a la vez, no una",
    SLOTS.every(pz => g('armorDur("piel", "' + pz + '")') === MAX - 1),
    SLOTS.map(pz => g('armorDur("piel", "' + pz + '")')).join("/"));
  ok("o sea que el set entero aguanta " + MAX + " golpes, no " + (MAX * SLOTS.length), true);

  /* 15/9 — MORIR: « reduce un 5 % de su durabilidad total con riesgo a romperse y desaparecer ».
     Dos castigos distintos: el 5 % es seguro, la rotura es azar y solo alcanza a lo que ya está
     en cero — romper una pieza sana sin aviso sería quitarle algo que todavía funcionaba. */
  {
    const antes = g('armorDur("piel", "pecho")');
    const r = g("armorAlMorir()");
    ok("morir se lleva el 5 % de la durabilidad total de cada pieza",
      g('armorDur("piel", "pecho")') === antes - Math.round(MAX * g("ARMOR_MUERTE_PCT")),
      antes + " → " + g('armorDur("piel", "pecho")'));
    ok("y con las piezas sanas no rompe ninguna", r.rotas.length === 0);
    /* con todo en cero, la rotura sí puede pasar — y lo que se rompe DESAPARECE */
    SLOTS.forEach(pz => { G.armorDur[g('armorKey("piel", "' + pz + '")')] = 0; });
    let rotas = 0, vueltas = 0;
    while (Object.keys(G.armor).length && vueltas++ < 500) rotas += g("armorAlMorir()").rotas.length;
    ok("con la armadura en cero, morir termina rompiéndola y la pieza se va", rotas === SLOTS.length,
      rotas + " piezas rotas en " + vueltas + " muertes");
    ok("y la probabilidad está escrita una sola vez", g("ARMOR_ROTURA_PCT") > 0 && g("ARMOR_ROTURA_PCT") <= 100, g("ARMOR_ROTURA_PCT") + " %");
  }

  /* se rehace el set para lo que sigue */
  G.armor = {}; G.armorDur = {}; G.res = { pelaje: 999, hierro: 999 }; G.plata = 99999;
  SLOTS.forEach(pz => g('craftArmor("piel", "' + pz + '")'));

  /* una pieza en cero: sin defensa, sin bono de set, pero SIGUE SIENDO TUYA (ley 1) */
  G.armorDur[g('armorKey("piel", "pecho")')] = 0;
  ok("la pieza gastada deja de dar defensa", g("armorDefensa()") < defLlena, g("armorDefensa()") + " < " + defLlena);
  ok("y el bono del set se apaga", !g("armorBono()"));
  ok("pero la pieza sigue siendo tuya — no se rompió (ley 1)", g('armorTiene("piel", "pecho")') === true);

  const c = g('armorReparaCosto("piel", "pecho")');
  ok("reparar la barra entera pide la mitad del material de crearla",
    c.mat === Math.max(1, Math.ceil(S.piel.piezas.pecho.mat * 0.5)), c.mat + " de " + S.piel.piezas.pecho.mat);
  G.armorDur[g('armorKey("piel", "pecho")')] = Math.round(MAX / 2);
  const mitad = g('armorReparaCosto("piel", "pecho")');
  ok("y reparar media barra cuesta menos que repararla entera", mitad.mat < c.mat, mitad.mat + " < " + c.mat);

  G.armorDur[g('armorKey("piel", "pecho")')] = 0;
  const antesMat = G.res.pelaje;
  ok("reparar devuelve la pieza a nueva y cobra el material", g('repararArmor("piel", "pecho")') === 1 &&
    g('armorDur("piel", "pecho")') === MAX && G.res.pelaje < antesMat);
  ok("con todo entero, el bono vuelve", !!g("armorBono()"));
  ok("una pieza entera no se puede reparar (no cobra de gusto)", g('armorReparaCosto("piel", "pecho")') === null);

  /* EL PUNTO DE TODO ESTO, en palabras de dirección: que el animal no tenga « 1 solo uso ».
     Con el set entero y en el bolsillo, el pelaje tiene que seguir haciendo falta. */
  G.armorDur[g('armorKey("piel", "yelmo")')] = 10;
  const vuelta = g('armorReparaCosto("piel", "yelmo")');
  ok("con el set ya crafteado, el material del animal SIGUE haciendo falta: hay a qué volver",
    !!vuelta && vuelta.mat > 0, vuelta ? vuelta.mat + " de pelaje para dejarlo nuevo" : "no pide nada");

  ok("la durabilidad viaja en el guardado", "armorDur" in g("snapshot()"));
  /* guardados viejos: sin armorDur, las piezas valen enteras — nadie se encuentra la armadura
     deshecha por una mecánica que no existía cuando guardó */
  G.armorDur = {};
  ok("un guardado viejo (sin durabilidad) tiene las piezas enteras", g('armorDur("piel", "pecho")') === MAX);
}

console.log("\n3 · EL SUELO PESA, Y LA GRANJA NO CAMBIÓ\n");
{
  const GF = g("GF");
  ok("la granja sigue exactamente como estaba", GF.sueloMult("granja") === 1);
  ok("el pantano se camina más pesado que el cañón de piedra", GF.sueloMult("pantano") < GF.sueloMult("piedra"));
  ok("las cuatro zonas tienen suelo propio (antes eran un 0,75 para todas)",
    ["pantano", "piedra", "fuego", "guarida"].every(z => GF.SUELO[z] > 0) &&
    new Set(["pantano", "piedra", "fuego", "guarida"].map(z => GF.SUELO[z])).size > 1);
  ok("un suelo que no existe no rompe nada: vale como normal", GF.sueloMult("no_existe") === 1);
  const forest = require("fs").readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("la Zona Negra usa el suelo de SU zona, no una constante", /GF\.sueloMult\(this\.zonaKey\)/.test(forest));
  /* lo que se decidió NO adoptar del documento, para que nadie lo dé por olvidado */
  ok("no se adoptó la rejilla: nadie encoló pasos de celda", !/TileWalker|stepDuration|ceil50/.test(forest));
}

/* ═══ 4 · LO QUE SOLO SE VE ABRIENDO EL JUEGO ════════════════════════════════════════════════
   ui.js necesita un DOM de verdad, así que la suite no lo ejecuta. Estos tres bugs aparecieron
   abriendo el juego en el navegador después de dar las tres mecánicas por terminadas — el mismo
   camino por el que ayer aparecieron el « /50 » del HUD y los cosméticos huérfanos. Se custodian
   leyendo el archivo, que es lo que se puede hacer sin DOM, pero se custodian. */
console.log("\n4 · LOS PANELES NO MIENTEN (bugs encontrados abriendo el juego)\n");
{
  const UI = require("fs").readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  /* el botón « Alimentar » se habilitaba con UNA unidad: con 7 zanahorias de 20 se veía verde,
     el jugador lo apretaba y le saltaba un aviso de que no le alcanza */
  ok("el botón de alimentar pide la ración entera, no una unidad suelta",
    /const tieneComida = d\.come\.some\(c => \(G\.res\[c\] \|\| 0\) >= racionDe\)/.test(UI));
  ok("y la fila del establo dice cuántas unidades come", /const come = d\.come\.map\(c => racion \+ " "/.test(UI));
  ok("y cuántas le faltan cuando no alcanza", /te faltan <b>' \+ faltan/.test(UI));
  /* el panel decía « ACTIVO » del bono con una pieza en cero, mientras armorBono() devolvía null */
  ok("el cartel del bono pregunta por el set SANO, no por tener las cinco piezas",
    /armorSetSano\(set\) : completo/.test(UI) && /sano \? ' — ACTIVO'/.test(UI));
  ok("y cuando está apagado lo dice en vez de callarse", /apagado: repará las piezas gastadas/.test(UI));

  /* 15/9 (dirección: « esta esencia golden hay que quitarla ») — el tooltip de la moneda del HUD
     decía « Esencia $Golden — se usa para pescar »: la llamaba Esencia, que no se llama así en
     ningún otro lado, y le inventaba un uso que no tiene. El $Golden va a los animales del
     establo, al kit de emergencia, a los adornos y al pase; a la pesca, nunca. */
  const HTML = require("fs").readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
  ok("la moneda del HUD se llama $Golden y no « Esencia »", !/title="Esencia \$Golden/.test(HTML));
  ok("y su cartel no le inventa un uso que no tiene", !/se usa para pescar/.test(HTML));
  ok("el ícono de la moneda tampoco dice Esencia", !/cur === "esencia" \? "Esencia"/.test(UI));
  /* y que de verdad NO se use para pescar, no solo que no lo diga */
  const ST = require("fs").readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  const canas = (g("CANA_V4_ORDER") || []).map(k => g("CANA_V4_DEF")[k] || {});
  ok("ninguna caña se paga con $Golden", canas.every(c => !c.golden), JSON.stringify(canas.map(c => c.golden)));
  void ST;
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
