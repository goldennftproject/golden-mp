/* CADA HERRAMIENTA TIENE UN USO, Y EL JUEGO LO ENSEÑA (20/8, dirección)
   "Revisa que todo, que cada herramienta, todo se enseña correctamente."
   La norma de la casa es vieja: «las herramientas tienen un uso, esa es una norma». Pero una
   herramienta puede cumplirla y aun así estar mal puesta. Son cuatro preguntas distintas y este
   test las hace por separado, herramienta por herramienta:

     1. ¿DE DÓNDE SALE LA PRIMERA?  o viene en el kit, o se forja con algo que ya tenés.
     2. ¿PARA QUÉ SIRVE?            tiene que haber una acción que la exija (si no, es adorno).
     3. ¿SE ENSEÑA?                 algún paso del tutorial la pone en la mano.
     4. ¿SE PUEDE VOLVER?           cuando se rompe hay camino de vuelta SIN necesitarla.

   La cuarta es la que de verdad importa y la que nadie mira: un juego donde la última hacha se
   rompe y la siguiente hacha necesita madera es un juego terminado para ese jugador, y encima
   parece culpa suya. Acá se prueba de la única manera honesta: dejando la cuenta a cero y viendo
   si hay salida.
     node tools/test-herramientas.js                                                              */
const fs = require("fs"), vm = require("vm");
const SRC = fs.readFileSync("public/game/state.js", "utf8");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "tutoRefresh", "tutoCheck", "refreshSeedShop", "refreshHotbar", "refreshForge", "refreshEquip",
 "applyCombatHp", "tutoAviso", "syncCobertizo", "ensureHotbarDefaults"].forEach(f => { ctx[f] = () => {}; });
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(SRC + "\n;this.X={TOOL_DEF,TOOL_CRAFT,PICK_DEF,KIT_INICIAL,TUTO_STEPS,ARM_DEF,ARMA_ENTRADA," +
  "CROP_DEF,EXCAV_POR_DIA};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* La ficha de cada herramienta: qué acción la exige y con qué palabra la nombra el juego. */
const HERR = [
  { id: "axe",  nom: "Hacha",  usa: /toolDur\("axe"\) <= 0/,        abre: "talar",   kit: "axe",  paso: /tal[áa]|madera/i },
  { id: "rod",  nom: "Caña",   usa: /toolDur\("rod"\) <= 0/,        abre: "pescar",  kit: "rod",  paso: /ca[ñn]a|pesc/i },
  { id: "pico", nom: "Pico",   usa: /equippedPick\(\)/,             abre: "picar",   kit: "pico", paso: /pic[áa]|piedra/i },
];

console.log("\n1. DE DÓNDE SALE LA PRIMERA");
{
  HERR.forEach(h => ok("la primera " + h.nom + " viene en el kit", (X.KIT_INICIAL[h.kit] || 0) > 0,
    X.KIT_INICIAL[h.kit] + " usos, gratis, en el baúl"));
  /* La espada no viene en el kit: se forja. Pero tiene que ser forjable el primer día, con lo que
     deja un árbol — si no, la Zona Negra queda detrás de un muro y el tutorial manda a un sitio
     cerrado. */
  const esp = X.ARM_DEF[X.ARMA_ENTRADA];
  ok("la Espada de Madera se forja el primer día", !!esp && (esp.lvl || 1) <= 1,
    (esp.cost.madera || 0) + " de madera" + (esp.plata ? " + " + esp.plata + " de plata" : ""));
  ok("y con madera que un solo árbol ya da", (esp.cost.madera || 0) <= 5, esp.cost.madera + " de madera");
}

console.log("\n2. PARA QUÉ SIRVE CADA UNA (si nada la exige, es un adorno)");
{
  /* 20/8: las guardias se mudaron de farm.js a puedeAccion() en state.js, así que se busca en los
     dos. Lo que importa no es en qué archivo está escrito, sino que EXISTA una razón por la que la
     herramienta hace falta — y eso además se prueba ejecutándolo en el punto 6. */
  const TODO = SRC + FARM;
  HERR.forEach(h => ok("sin " + h.nom + " no se puede " + h.abre, h.usa.test(TODO),
    "la acción la comprueba antes de empezar"));
  /* Y la espada: sin arma equipada no se entra a la Zona Negra. */
  ok("sin arma no se entra a la Zona Negra", /gear.*arma|armaEquipada|G\.gear\.arma/.test(SRC + FARM),
    "el combate exige lo que la Herrería vende");
}

console.log("\n3. EL TUTORIAL PONE CADA UNA EN LA MANO");
{
  const textos = X.TUTO_STEPS.map(s => s.txt || "").join(" | ");
  HERR.forEach(h => ok("algún paso enseña " + h.nom, h.paso.test(textos)));
  ok("y algún paso enseña la espada", /espada/i.test(textos));
  /* Y el kit se abre en el primer paso: si no, el jugador empieza con las manos vacías y el
     segundo paso ya le pide algo que no puede hacer. */
  ok("el paso 1 es abrir el baúl del kit", X.TUTO_STEPS[0].id === "kit", X.TUTO_STEPS[0].txt);
}

console.log("\n4. EL CALLEJÓN SIN SALIDA: SE ROMPIÓ TODO Y NO QUEDA NADA");
{
  /* La escena más fea posible: sin herramientas, sin recursos, sin semillas, sin plata y sin
     cultivos en la tierra. ¿Hay camino de vuelta? Se recorre en el orden en que lo recorrería el
     jugador y se anota el primer eslabón que se rompa. */
  G.tools = {}; G.picks = { owned: {}, dur: {}, eq: null }; G.res = {}; G.seeds = {};
  G.plata = 0; G.golden = 0; G.plots = [{ state: "dry" }, { state: "dry" }, { state: "dry" }];
  G.kitReclamado = true; G.built = { store: 1 };

  /* Eslabón 1: los montículos. Son lo único gratis del juego —sin herramienta, sin enfriamiento,
     tres por día— y por eso son el suelo del que nadie puede caerse. */
  ok("quedan " + X.EXCAV_POR_DIA + " montículos gratis por día", X.EXCAV_POR_DIA >= 1,
    "sin herramienta y sin plata");
  const botin = ctx.excavBotin(0);
  ok("y dan algo con lo que empezar", !!botin && !!(botin.res || botin.seed), botin.res || botin.seed);

  /* Eslabón 2: el hacha. Si costara madera, la cadena se muerde la cola —para talar hace falta
     hacha y para el hacha hace falta madera— y ahí se acaba la partida. */
  const ta = X.TOOL_CRAFT.axe;
  ok("el Hacha NO cuesta madera", !(ta.cost && ta.cost.madera), "si costara, sin hacha no habría hacha");
  ok("cuesta " + ta.plata + " de plata y nada más", Object.keys(ta.cost || {}).length === 0);

  /* Eslabón 3: el pico base, igual. */
  const pk = X.PICK_DEF.stone;
  ok("el Pico de Piedra tampoco cuesta madera", !(pk.cost && pk.cost.madera),
    pk.plata + " de plata");

  /* Eslabón 4: la caña SÍ cuesta madera, y está bien: para entonces ya tenés hacha. Lo que hay
     que comprobar es el orden — que la caña nunca sea el único camino hacia la madera. */
  const tr = X.TOOL_CRAFT.rod;
  ok("la Caña cuesta madera, pero la madera no depende de la caña", (tr.cost.madera || 0) > 0,
    "hacha → madera → caña, en ese orden");

  /* Eslabón 5: LA PLATA, que es donde estaba el agujero de verdad y no tiene nada que ver con las
     herramientas. Por diseño solo se venden CULTIVOS —ni madera, ni minerales, ni lombrices— y las
     semillas se compran con plata. Así que un jugador a cero de las dos cosas no está lento: está
     terminado. La única válvula que había cobraba $Golden, o sea que hoy no existe.
     La comprobación es literal: se pone la cuenta a cero y se pregunta si el juego devuelve algo
     con lo que volver a empezar. */
  ok("con todo a cero, el juego se da cuenta", ctx.granjaAtascada(),
    "0 de plata, 0 semillas, tierra vacía y nada vendible");
  const rescate = ctx.excavBotin(0);
  ok("y el montículo devuelve una semilla, no carnada", rescate.seed === "papa", rescate.txt);
  ok("con eso vuelve a haber cultivo, que es de donde sale la plata",
    (X.CROP_DEF.papa.price || 0) > 0, "papa → " + X.CROP_DEF.papa.price + " de plata");

  /* Y la otra mitad: que el suelo NO se pueda usar como fuente. Con una sola semilla en la bolsa
     el montículo tiene que volver a dar lombriz, o sería una imprenta de papas. */
  G.seeds = { papa: 1 };
  ok("con una semilla en la bolsa, ya no rescata", !ctx.granjaAtascada() && ctx.excavBotin(0).res === "lombriz",
    "el suelo no es un ingreso");
  G.seeds = {}; G.plots = [{ state: "growing" }];
  ok("ni con algo creciendo en la tierra", !ctx.granjaAtascada());
  G.plots = [{ state: "dry" }]; G.res = { papa: 1 };
  ok("ni con algo vendible en la bolsa", !ctx.granjaAtascada());
  G.res = {}; G.plata = 99;
  ok("ni con plata para comprar semillas", !ctx.granjaAtascada());
}

console.log("\n5. Y CUANDO SE ROMPE, EL JUEGO LO DICE Y DICE DÓNDE ARREGLARLO");
{
  /* Romperse en silencio es peor que romperse: el jugador hace clic, no pasa nada, y no sabe si
     el juego se colgó. Cada rotura tiene que avisar Y nombrar el sitio. */
  ok("el hacha rota avisa y manda a la Herrería", /hacha se rompió[\s\S]{0,60}Herrería/i.test(FARM));
  ok("la caña rota, también", /caña se rompió[\s\S]{0,60}Herrería/i.test(SRC));
  /* Y el pico no se repara: se destruye. Que el aviso lo diga, porque es distinto de las otras. */
  ok("el pico se destruye y hay una función para eso", /function destroyPick/.test(SRC));
  /* Los avisos de "no tenés X" distinguen al que nunca abrió el kit del que se quedó sin: son dos
     problemas con dos soluciones opuestas (ir al baúl vs. ir a la Herrería). */
  /* 20/8: antes esto se escribía tres veces (hacha, pico, caña) y se contaban las copias. Ahora
     es UNA función, sinKitTxt(), y lo que se cuenta es cuántas razones la usan. Contar copias era
     medir el síntoma; esto mide la regla. */
  const usos = (SRC.match(/sinKitTxt\(/g) || []).length - 1;   // -1: la definición
  ok("el aviso del kit es una sola función, usada " + usos + " veces", /function sinKitTxt/.test(SRC) && usos >= 3,
    "hacha, pico y caña dicen lo mismo");
  ok("y distingue « nunca lo abriste » de « se te acabó »", /kitReclamado \?/.test(SRC),
    "son dos problemas con soluciones opuestas: el baúl o la Herrería");
}

console.log("\n6. LA PUERTA ÚNICA: puedeAccion() CONTESTA POR TODAS LAS ENTRADAS");
{
  /* 20/8 — el primero de los cuatro arreglos de estructura. Hasta hoy las razones por las que una
     acción puede fallar estaban copiadas en cada sitio desde donde se entra, y por eso el fallo de
     la laguna sobrevivió a su propio arreglo. Ahora hay UNA función; esto la ejecuta caso por caso.
     Se prueba el NO y también el SÍ: una guardia que dice que no siempre es tan inútil como una
     que nunca lo dice. */
  const base = () => {
    G.kitReclamado = true; G.tools = { axe: 5, rod: 5 };
    G.picks = { owned: { stone: true }, dur: { stone: 5 }, eq: "stone" };
    G.res = { lombriz: 3 }; G.fish = {}; G.seeds = { papa: 3 }; G.selSeed = "papa";
    G.pescaHasta = 0; G.skills = { farming: 0, mining: 0 }; G.invRows = 4; G.slots = [];
  };

  base();
  ok("con todo en regla, se puede pescar", ctx.puedeAccion("fish", { type: "fish" }).ok);
  ok("…talar", ctx.puedeAccion("chop", { type: "tree", readyAt: 0 }).ok);
  ok("…picar piedra", ctx.puedeAccion("mine", { type: "rock", readyAt: 0 }).ok);
  ok("…plantar", ctx.puedeAccion("plant", { seed: "papa" }).ok);
  ok("…y cosechar", ctx.puedeAccion("harvest", { cropKey: "papa" }).ok);

  /* Y ahora cada motivo, uno por uno, con el texto que ve el jugador. */
  const no = (t, o) => ctx.puedeAccion(t, o);
  base(); G.pescaHasta = ctx.nowMs() + 60000;
  let r = no("fish", { type: "fish" });
  ok("laguna en reposo: no deja empezar", !r.ok && /reposo/i.test(r.toast || ""), r.toast);

  base(); G.tools.rod = 0;
  r = no("fish", { type: "fish" });
  ok("sin caña: no deja empezar", !r.ok && /caña/i.test(r.toast || ""), r.toast);

  base(); G.res.lombriz = 0;
  r = no("fish", { type: "fish" });
  ok("sin carnada: manda a los montículos", !r.ok && /montículo/i.test(r.toast || ""), r.toast);

  base(); G.tools.axe = 0;
  r = no("chop", { type: "tree", readyAt: 0 });
  ok("sin hacha: no deja talar", !r.ok && /hacha/i.test(r.toast || ""), r.toast);

  base();
  r = no("chop", { type: "tree", readyAt: ctx.nowMs() + 60000 });
  ok("árbol en enfriamiento: no deja talar", !r.ok, r.toast);

  base(); G.picks.dur.stone = 0;
  r = no("mine", { type: "rock", readyAt: 0 });
  ok("sin pico útil: no deja picar", !r.ok && /pico/i.test(r.toast || ""), r.toast);

  base();
  r = no("mine", { type: "ore", ore: "netherita", readyAt: 0 });
  ok("veta por encima de tu pico: lo dice y nombra el pico", !r.ok && /pico|puede con/i.test(r.toast || ""), r.toast);

  base(); G.seeds.papa = 0;
  r = no("plant", { seed: "papa" });
  ok("sin semillas: manda a la Tienda", !r.ok && /Tienda/i.test(r.toast || ""), r.toast);

  /* El rótulo del cursor manda en el texto del enfriamiento: si el llamador lo pasa, se usa ése. */
  base();
  r = no("chop", { type: "tree", readyAt: ctx.nowMs() + 60000 });
  const conRotulo = ctx.puedeAccion("chop", { type: "tree", readyAt: ctx.nowMs() + 60000 }, () => "Vuelve en 1:00");
  ok("y el aviso del enfriamiento sale del rótulo del cursor", conRotulo.toast === "Vuelve en 1:00",
    "el cartel y el rechazo son la misma cadena");
  base();
}

console.log("\n7. LA LAGUNA, QUE ES LA QUE DIO PROBLEMA DOS VECES");
{
  /* El fallo se reportó, se "arregló" y volvió: había DOS puertas al agua y yo miré una. Acá se
     comprueba lo que el jugador vive, no el texto del código: con la laguna en reposo, ninguna de
     las dos puertas puede dejar empezar. */
  const puertas = (FARM.match(/this\.startAction\("fish"/g) || []).length;
  ok("hay " + puertas + " maneras de tirar la caña", puertas >= 2, "el objeto pesquero y el agua");
  /* Cada una, con su bloque de guardias inmediatamente antes. */
  /* 20/8: ya no se busca la comprobación COPIADA en cada puerta —eso era auditar copias— sino que
     cada puerta pregunte a la función única. Es la misma exigencia, dicha de la única forma que no
     se puede cumplir a medias. */
  let sinGuardia = [], n = 0;
  const re = /this\.startAction\("fish"/g; let m;
  while ((m = re.exec(FARM))) {
    n++;
    const antes = FARM.slice(Math.max(0, m.index - 900), m.index);
    if (!/puedeAccion\("fish"/.test(antes)) sinGuardia.push("puerta " + n);
  }
  ok("las " + n + " preguntan a puedeAccion ANTES", !sinGuardia.length, sinGuardia.join(", ") || "ninguna deja empezar en vano");
  /* Y el rótulo del cursor lo dice sin que haga falta probar. */
  ok("y el rótulo del cursor ya lo anuncia", /La laguna descansa/.test(FARM),
    "se ve antes de hacer clic");
  /* La red del final dice lo mismo que la puerta: un aviso que cambia de texto según por dónde
     entraste es un aviso que no se entiende. */
  ok("el aviso tardío dice lo mismo que el temprano",
    (SRC.match(/La laguna está en reposo/g) || []).length === 1 && !/La laguna necesita descansar/.test(SRC),
    "ya no hay dos textos: hay uno, escrito una vez");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ cada herramienta tiene uso, se enseña, y ninguna deja al jugador encerrado\n");
process.exit(fallos ? 1 : 0);
