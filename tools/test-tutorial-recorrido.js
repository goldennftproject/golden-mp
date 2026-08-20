/* EL TUTORIAL ENTERO, PASO POR PASO, DESDE UNA CUENTA NUEVA (19/8)
   El tutorial pasó hoy de 20 a 29 pasos y de 4 a 8 capítulos. Cada paso nuevo es una oportunidad
   de encerrar a alguien: el embudo permite SOLO los gestos que el paso activo declara, así que un
   permiso olvidado deja al jugador mirando la pantalla sin poder hacer nada — y eso, en un juego
   con relojes de media hora, es un abandono seguro.
   Este test recorre los 29 pasos y comprueba, para cada uno, las cuatro cosas que pueden fallar
   en silencio:
     · que exista alguna manera de darlo por cumplido (evento, recurso o detector de estado);
     · que sus permisos dejen seguir jugando la granja;
     · que lo que pide sea alcanzable con lo que el jugador tiene a esa altura;
     · que la cadena no se repita ni retroceda.
     node tools/test-tutorial-recorrido.js                                                        */
const fs = require("fs"), vm = require("vm");
const SRC = fs.readFileSync("public/game/state.js", "utf8");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(SRC + "\n;this.X={TUTO_STEPS,TUTO_CAPS,TUTO_PERMISOS,PLANO_PASO,KIT_INICIAL,BUILD_DEF," +
  "ARM_DEF,ARMA_ENTRADA,RECIPE_DEF,EXCAV_POR_DIA,CD,CROP_DEF};", ctx);
const X = ctx.X, G = ctx.G;
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* Los detectores de "este paso ya está hecho" viven en tutoHecho(), no en tutoAutoSkip como creí al
   escribir esto: la primera versión partía el archivo por el sitio equivocado y daba por rotos
   cinco pasos que estaban perfectos. Se busca en el archivo entero, que es lo honesto. */
const DETECTA = SRC;

console.log("\nCADA PASO SE PUEDE CUMPLIR DE ALGUNA MANERA");
{
  X.TUTO_STEPS.forEach((s, i) => {
    const porRecurso = !!s.res;                                   // "juntá N de madera"
    const porEvento  = new RegExp('tutoEvent\\("' + s.id + '"\\)').test(fs.readFileSync("public/game/state.js", "utf8") +
                        fs.readFileSync("public/game/farm.js", "utf8") +
                        fs.readFileSync("public/game/forest.js", "utf8") +
                        fs.readFileSync("public/game/ui.js", "utf8"));
    const porEstado  = new RegExp('st\\.id === "' + s.id + '"').test(DETECTA) ||
                       (s.id.indexOf("place_") === 0);            // los "colocá el plano" van por prefijo
    ok("paso " + (i + 1) + " · " + s.id, porRecurso || porEvento || porEstado,
      porRecurso ? "por recurso" : porEvento ? "por evento" : "por estado");
  });
}

console.log("\nNINGÚN PASO ENCIERRA LA GRANJA");
{
  /* La regla: todo paso tiene que dejar al menos UNA forma de producir. Los cuatro primeros son la
     excepción legítima —el cuarteto de enseñanza del bucle, que a propósito solo permite comprar,
     plantar, cosechar y vender— y por eso se miden aparte. */
  const ENSENANZA = ["kit", "buyseed", "plant", "harvest", "sell"];
  X.TUTO_STEPS.forEach((s, i) => {
    if (ENSENANZA.includes(s.id)) return;
    const p = X.TUTO_PERMISOS[s.id];
    if (!p) { ok("paso " + (i + 1) + " · " + s.id + " tiene permisos declarados", false, "sin entrada en TUTO_PERMISOS"); return; }
    const produce = ["chop", "mine", "plant", "harvest", "cultivar", "obra"].some(g => p.includes(g));
    ok("paso " + (i + 1) + " · " + s.id, produce, p.length + " gestos");
  });
}

console.log("\nLA CADENA NO SE REPITE NI RETROCEDE");
{
  const ids = X.TUTO_STEPS.map(s => s.id);
  ok("los " + ids.length + " pasos tienen id distinto", new Set(ids).size === ids.length);
  /* Cada capítulo tiene que ser un tramo CONTINUO de la cadena: si los pasos de un capítulo
     quedaran salteados, la barra de progreso del panel Objetivos mostraría cualquier cosa. */
  X.TUTO_CAPS.forEach(c => {
    const idx = c.pasos.map(id => ids.indexOf(id)).filter(i => i >= 0);
    const seguido = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
    ok("el capítulo « " + c.label + " » es un tramo seguido", seguido, "pasos " + idx.map(i => i + 1).join(", "));
  });
  const enCap = new Set([].concat.apply([], X.TUTO_CAPS.map(c => c.pasos)));
  const huerfanos = ids.filter(id => !enCap.has(id));
  ok("ningún paso quedó fuera de su capítulo", !huerfanos.length, huerfanos.join(", "));
}

console.log("\nLO QUE PIDE CADA PASO ESTÁ AL ALCANCE");
{
  /* Un paso puede estar bien escrito y ser imposible. Éstos son los cuatro que dependen de algo
     que hay que conseguir antes, y que hoy cambiaron de sitio. */
  ok("la espada se forja con lo que da un árbol",
    (X.ARM_DEF[X.ARMA_ENTRADA].cost.madera || 0) <= X.BUILD_DEF.store.cost.madera,
    X.ARM_DEF[X.ARMA_ENTRADA].cost.madera + " de madera · la Herrería ya pidió " + X.BUILD_DEF.store.cost.madera);
  ok("el Estofado pide carne que el Pantano suelta", (X.RECIPE_DEF.estofado.res.carne || 0) <= 1,
    "pide " + X.RECIPE_DEF.estofado.res.carne);
  ok("y se cocina desde el primer nivel de Cocina", (X.RECIPE_DEF.estofado.lvl || 1) === 1);
  ok("la carnada sale de la tierra, gratis", ctx.excavBotin(0).res === "lombriz",
    X.EXCAV_POR_DIA + " montículos por día, sin herramienta");
  /* Y el kit trae la caña con la que se pesca: si no, el paso de la laguna sería un callejón. */
  ok("y la caña viene en el kit", (X.KIT_INICIAL.rod || 0) > 0, X.KIT_INICIAL.rod + " usos");
}

console.log("\nLOS PLANOS DE LA CADENA SIGUEN CAYENDO POR PASO");
{
  /* Lo más caro que puede romperse: si un plano dejara de caer en su paso, el jugador nuevo llega
     a "colocá el plano del Horno" con las manos vacías y ahí se acaba la partida. */
  ["store", "horno", "cocina"].forEach(t => {
    const paso = X.PLANO_PASO[t];
    ok("el plano de " + X.BUILD_DEF[t].label + " cae en su paso", !!paso && X.TUTO_STEPS.some(s => s.id === paso), paso);
  });
  G.skills = { farming: 0, mining: 0, tala: 0, fishing: 0, ganaderia: 0, cooking: 0, crafting: 0, sword: 0, hacha: 0, mazo: 0, range: 0 };
  G.level = 1; G.planos = {}; G.built = {}; G.obras = {};
  ["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm"].forEach(f => { if (typeof ctx[f] !== "function") ctx[f] = () => {}; });
  let faltó = null;
  X.TUTO_STEPS.forEach((s, i) => {
    G.tuto = { step: i, done: false };
    ctx.planosSync(true);
    const t = Object.keys(X.PLANO_PASO).find(k => X.PLANO_PASO[k] === s.id);
    if (t && !(G.planos && G.planos[t])) faltó = s.id;
  });
  ok("recorriendo los " + X.TUTO_STEPS.length + " pasos con todo a cero, ningún plano falta", !faltó, faltó || "los 3 llegan");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ el tutorial se puede terminar sin quedarse encerrado\n");
process.exit(fallos ? 1 : 0);
