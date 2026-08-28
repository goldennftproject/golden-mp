/* LA PESCA v3 SE FUE, Y NO PUEDE VOLVER   (27/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El juego tuvo dos sistemas de pesca conviviendo durante tres tandas, y esa convivencia costó
   dos fallos que nadie habría reportado nunca:

   1) LA HERRERÍA VENDÍA LAS CAÑAS DE LA v4 AL 15 % DE SU PRECIO. Las dos versiones escriben en
      el mismo G.canas, y tres ids coincidían —junco, hierro y abuelo—. Craftear la « caña de
      hierro » vieja por 1 barra de hierro + 4 tablón te daba la Caña de Hierro de la v4, cuyo
      precio del documento es 6 tablón + 4 barra de hierro + 3 cuero + 105 de plata. Las dos
      tablas eran correctas por separado; ninguna sabía de la otra.

   2) UNA FUNCIÓN SE COMÍA A OTRA. ceboBolsa() existía en las dos versiones, y como los cinco
      archivos comparten un ámbito global, la segunda declaración ganaba en silencio. El camarón
      se cobraba de una bolsa que no existe: era gratis, para siempre.

   Los dos son la misma enfermedad: dos sistemas que hablan de lo mismo con las mismas palabras.
   Mientras queden restos de la v3, esa enfermedad puede volver con otro nombre — así que este
   archivo comprueba que no quede ni uno, y NO por una lista que yo mantenga a mano, sino
   barriendo los cinco archivos del juego.
     node tools/test-sin-pesca-v3.js                                                             */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => { try { return vm.runInContext("typeof " + n + " !== 'undefined'", ctx); } catch (e) { return false; } };

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const ARCH = ["config.js", "state.js", "ui.js", "farm.js", "boot.js", "save.js"]
  .map(f => path.join(RAIZ, "public/game", f)).filter(fs.existsSync);
const SRC = {}; ARCH.forEach(f => SRC[path.basename(f)] = fs.readFileSync(f, "utf8"));
const TODO = Object.values(SRC).join("\n");

console.log("\nNINGÚN CATÁLOGO DE LA v3 SIGUE EN PIE");
{
  /* los nombres que de verdad importan: los que definían QUÉ existe. Si vuelve alguno, vuelve
     con él la posibilidad de que dos tablas describan el mismo objeto. */
  const CATALOGOS = ["ESPECIE_DEF", "ESPECIE_ORDER", "CANA_DEF", "CANA_ORDER", "TRAMPA_DEF",
                     "TRAMPA_ORDER", "PESCA_CARNADA", "PESCA_FAMILIA", "CLIMA_DEF", "PELEA_DEF",
                     "PESCA_ESTRELLA"];
  const vivos = CATALOGOS.filter(g);
  ok("ninguno de los " + CATALOGOS.length + " catálogos de la v3 existe", !vivos.length, vivos.join(", "));
  /* y los de la v4 SÍ: un test que solo comprueba ausencias pasaría con el juego entero borrado */
  const V4 = ["PEZ_DEF", "PEZ_ORDER", "CANA_V4_DEF", "NASA_DEF", "CEBO_V4_DEF", "TRUCO_DEF",
              "LONJA_ESCALON", "TITULO_PESCA_DEF"];
  const faltan = V4.filter(k => !g(k));
  ok("y los " + V4.length + " de la v4 están todos", !faltan.length, faltan.join(", "));
  console.log("       → la segunda comprobación no sobra: un archivo que solo mide ausencias");
  console.log("         daría verde con el juego entero borrado.");
}

console.log("\nNI SUS FUNCIONES");
{
  const FUNCS = ["goFishing", "craftCana", "canaUsos", "canaGastar", "especiePrecio", "especieXp",
                 "trampaCalar", "trampaCobrar", "trampaCraftear", "senalNueva", "climaDef",
                 "escamaSumar", "mareaPedidos", "pescaLanceNuevo", "pescaReelTick", "peleaModificar",
                 "carnadaDe", "familiaAbierta", "citaResolver", "amarresParte"];
  const vivas = FUNCS.filter(g);
  ok("ninguna de las " + FUNCS.length + " funciones de la v3 existe", !vivas.length, vivas.join(", "));
}

console.log("\nY NO QUEDAN LLAMADAS HUÉRFANAS   (lo que rompería el juego al abrirlo)");
{
  /* una llamada a algo que ya no existe no da error hasta que ese camino se recorre — y algunos
     caminos solo se recorren en la primera sesión de un jugador nuevo. */
  const IDOS = ["ESPECIE_DEF", "ESPECIE_ORDER", "CANA_DEF", "CANA_ORDER", "TRAMPA_DEF", "TRAMPA_ORDER",
                "PESCA_CARNADA", "PESCA_FAMILIA", "CLIMA_DEF", "CLIMA_ORDER", "PELEA_DEF",
                "goFishing", "craftCana", "canaUsos", "canaGastar", "canaParaEstrella", "canaMejorAguanta",
                "especiePrecio", "especieXp", "especiesDe", "trampaCalar", "trampaCobrar", "trampaUsos",
                "trampaAbierta", "senalNueva", "climaDef", "climaAbreDeDia", "escamaSumar",
                "pescaLanceNuevo", "pescaReelTick", "pescaReelInit", "pescaAnzuelo", "peleaModificar",
                "familiaAbierta", "amarresParte", "citaResolver", "carnadaDe"];
  const malas = [];
  for (const [f, s] of Object.entries(SRC)) {
    /* sin comentarios: mencionar la v3 para explicar por qué se fue es exactamente lo que hay
       que hacer, y no debe hacer fallar nada. */
    const codigo = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const n of IDOS) if (new RegExp("\\b" + n + "\\b").test(codigo)) malas.push(f + " → " + n);
  }
  ok("ningún archivo llama a nada de la v3", !malas.length, malas.slice(0, 8).join(" · "));
}

console.log("\nUNA SOLA PUERTA AL AGUA");
{
  /* sin comentarios, por la misma razón de siempre: los que quedaron dicen QUÉ vivía ahí y por
     qué se fue, y esa es justamente la información que un lector futuro va a necesitar. */
  const farm = (SRC["farm.js"] || "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("la laguna abre pescaV4Abrir() y nada más",
    /pescaV4Abrir\(\)/.test(farm) && !/pesca-mini/.test(farm),
    "el panel #pesca-mini de la v3 ya no se busca");
  ok("y el mundo no tiene su propio bucle de lance", !/this\.lance\b/.test(farm),
    "la pulseada vive en el panel, con su requestAnimationFrame");
  /* y el HTML tampoco lo lleva: un panel que existe en el marcado y nadie abre es peso muerto
     que el navegador descarga en cada visita. */
  const html = require("fs").readFileSync(require("path").join(RAIZ, "public/index.html"), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "");
  ok("y el marcado del panel viejo no está en index.html", !/pesca-mini/.test(html));
}

console.log("\nUN SOLO NOMBRE PARA CADA COSA   (la enfermedad de fondo)");
{
  /* esto ya lo cubre test-nombres-unicos.js; se repite acá porque es LA razón por la que la v3
     tenía que irse, y un lector de este archivo tiene que verlo sin abrir otro. */
  const decl = {};
  for (const [f, s] of Object.entries(SRC))
    for (const m of s.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm))
      (decl[m[1]] = decl[m[1]] || []).push(f);
  const repes = Object.keys(decl).filter(k => decl[k].length > 1);
  ok("ninguna función se declara dos veces", !repes.length,
    repes.map(k => k + " en " + decl[k].join(" y ")).join(" · "));
  /* y el caso concreto que nos costó el camarón gratis */
  ok("ceboBolsa() —la que se comía a la otra— ya no existe en ninguna versión",
    !/\bfunction ceboBolsa\b/.test(TODO), "la de la v4 se llama ceboV4Bolsa");
}

console.log("\nLA MUDANZA SOBREVIVE A LO QUE MUDA");
{
  /* la migración devolvía el material de las trampas leyéndolo de TRAMPA_DEF — la tabla que ella
     misma venía a retirar. Una migración que necesita el código viejo para correr es una cuerda
     atada a los dos lados del puente que estás quemando. */
  const st = SRC["state.js"] || "";
  const mud = st.slice(st.indexOf("function mudanzaPescaV4"), st.indexOf("function mudanzaPescaV4") + 3500);
  ok("mudanzaPescaV4 existe", mud.length > 100);
  /* SIN COMENTARIOS, y esto lo aprendí acá mismo: la primera versión daba rojo porque el
     comentario que EXPLICA el arreglo nombra la tabla que se quitó. Un test que prohíbe hablar
     del pasado obliga a borrar la única explicación de por qué el código es como es. */
  const mudCodigo = mud.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("y no depende de ninguna tabla de la v3", !/TRAMPA_DEF|ESPECIE_DEF|CANA_DEF/.test(mudCodigo),
    "el coste de las trampas viejas va congelado dentro");
  ok("con el coste congelado y fechado", /TRAMPA_V3_COSTE/.test(mud));

  /* y que de verdad funcione: una partida vieja con trampas caladas y peces de la v3 */
  const G = ctx.G;
  G.fish = { pez_comun: 3, carpa_dorada: 1 };
  G.canas = { roble: 12, hierro: 8 };
  G.amarres = [{ tipo: "nasa" }, { tipo: "palangre" }];
  G.res = { madera: 0, piedra: 0, tablon: 0, barra_hierro: 0 };
  G.plata = 0;
  ctx.toast = () => {}; ctx.log = () => {};
  vm.runInContext("toast = window.toast; log = window.log;", ctx);
  ctx.mudanzaPescaV4();
  ok("una partida de la v3 se migra sin romperse", true);
  ok("las cañas viejas se convierten en el acceso a la de junco",
    JSON.stringify(G.canas) === '{"junco":1}', JSON.stringify(G.canas));
  ok("los amarres se levantan", (G.amarres || []).length === 0);
  ok("y el material de las trampas vuelve entero",
    G.res.madera === 4 && G.res.piedra === 2 && G.res.tablon === 8 && G.res.barra_hierro === 1,
    "nasa (4 madera + 2 piedra) + palangre (1 barra de hierro + 8 tablón)");
  ok("los peces del catálogo viejo se venden, no se quedan de fantasmas",
    !G.fish.pez_comun && !G.fish.carpa_dorada && G.plata > 0, G.plata + " de plata");
  console.log("       → « un objeto que existe en el estado y no existe en la bolsa es un objeto");
  console.log("         que el jugador tiene y no puede usar ».");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — todavía queda algo de la v3 que puede volver a chocar"
  : "  Todo en orden: una sola pesca, un solo nombre para cada cosa.");
process.exit(fallos ? 1 : 0);
