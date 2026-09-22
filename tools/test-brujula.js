/* LA BARRA DE OBJETIVO NO SE APAGA NUNCA                (19/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Que pueda descubrir cosas está bien, no es un problema. Pero si falla la barra de objetivos…
   hacé los cambios suficientes para que eso no falle ».

   Lo que fallaba, medido antes de tocar: la barra guía 29 pasos y después se apaga PARA SIEMPRE.
   Y tres sistemas que están en el mapa desde el primer segundo —el muñeco, la incursión y la
   Lonja— no los presentaba ningún paso, ninguna carta, ningún aviso.

   Dos arreglos, y este archivo custodia los dos:
     A · tres pasos nuevos en la cadena, cada uno en el momento en que el sistema se vuelve
         relevante (la espada recién equipada → el muñeco; la Zona conocida → la incursión; el
         primer pez → la Lonja);
     B · LA BRÚJULA: cuando el tutorial termina, la barra no se apaga — muestra lo más útil que
         hay para hacer, DERIVADO del estado de la partida, no de una lista. Acá se ejecuta de
         verdad contra partidas armadas a mano: un plano sin colocar, una obra a medias, una
         expansión que el nivel ya abrió… y se mira qué dice y en qué orden.
     node tools/test-brujula.js                                                                */
const path = require("path"), vm = require("vm"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const STEPS = g("TUTO_STEPS"), ids = STEPS.map(s => s.id);
const idx = (id) => ids.indexOf(id);

console.log("\nA · LOS TRES SISTEMAS QUE NADIE PRESENTABA, AHORA EN LA CADENA\n");
{
  ok("hay un paso del muñeco", idx("dummy") >= 0);
  ok("y va justo después de equipar la espada (es cuando tiene con qué pegar)", idx("dummy") === idx("equiparm") + 1);
  ok("hay un paso de la incursión", idx("incursion") >= 0);
  ok("y va después del estofado (la Zona ya se conoce; ahora la otra forma de ir)", idx("incursion") === idx("estofado") + 1);
  ok("hay un paso de la Lonja", idx("lonja") >= 0);
  ok("y va justo después del primer pez", idx("lonja") === idx("fish") + 1);
  ok("la versión de la cadena subió (los guardados viejos se recalculan)", g("TUTO_VER") >= 14, "v" + g("TUTO_VER"));
  /* los capítulos agrupan por id: si un paso nuevo no está en ninguno, el panel de la guía lo
     pierde y el progreso del capítulo miente */
  const CAPS = g("TUTO_CAPS"), enCap = (id) => CAPS.some(c => c.pasos.indexOf(id) >= 0);
  ok("los tres pasos están en un capítulo", enCap("dummy") && enCap("incursion") && enCap("lonja"));
  ok("y todos los pasos de la cadena siguen teniendo capítulo", ids.every(enCap), ids.filter(i => !enCap(i)).join(","));
  /* los tres apuntan a algo del mundo, así que la flecha sabe adónde ir */
  const CONF = fs.readFileSync(path.join(RAIZ, "public/game/config.js"), "utf8");
  for (const id of ["dummy", "incursion", "lonja"]) {
    const t = STEPS[idx(id)].target;
    /* el portal no es un objeto de config: vive en la escena (this.portal) y la flecha lo resuelve
       por su nombre en updateTutoArrow */
    const existe = new RegExp('snap\\("' + t + '"').test(CONF) || new RegExp('st\\.target === "' + t + '"').test(FARM);
    ok(id + " apunta a un sitio que la flecha sabe encontrar", !!t && existe, t);
  }
}

console.log("\nA2 · Y CADA PASO SE PUEDE CUMPLIR (hay quien dispara el evento y quien deja rastro)\n");
{
  ok("el muñeco dispara el evento y escribe dummyUsedAt (el campo existía y nadie lo escribía)",
    /G\.dummyUsedAt = nowMs\(\);/.test(STATE) && /tutoEvent\("dummy"\)/.test(STATE));
  ok("la incursión dispara el evento y deja rastro en las estadísticas",
    /statAdd\("incursion", "_", 1\)/.test(STATE) && /tutoEvent\("incursion"\)/.test(STATE));
  ok("vender en la Lonja dispara el evento y deja rastro", /statAdd\("lonja", "_", n\)/.test(STATE) && /tutoEvent\("lonja"\)/.test(STATE));
  /* tutoHecho: si el jugador ya lo hizo antes de que el tutorial lo pida, el paso se salta solo */
  ok("tutoHecho sabe reconocer los tres hechos de antemano",
    /st\.id === "incursion"\)\s+hecho = /.test(STATE) && /st\.id === "lonja"\)\s+hecho = /.test(STATE) && /st\.id === "dummy"\)\s+hecho = /.test(STATE));
}

/* ---- la brújula, ejecutada ---- */
const limpio = () => {
  G.tuto = { step: 0, n: 0, done: true, v: g("TUTO_VER") };
  G.planos = {}; G.obras = {}; G.built = {}; G.obraDep = {};
  G.level = 1; G.plata = 0; G.expansiones = 0;
  G.daily = { day: 1, last: g("dayStamp(0)") };       // paquete ya cobrado hoy
  G.buzonLeidas = {}; for (const c of g("CARTAS_ABUELO")) G.buzonLeidas["abuelo" + c.n] = 1;   // cartas leídas
};

console.log("\nB · CON EL TUTORIAL TERMINADO, LA BARRA SIGUE TENIENDO ALGO QUE DECIR\n");
{
  limpio();
  ok("(arnés) el tutorial está terminado", g("tutoActivo()") === null);
  const b = g("brujula()");
  ok("la brújula devuelve algo aun con la partida más vacía posible", !!b, b && b.txt);
  ok("y tiene la forma de un paso (txt) con la marca de brújula", !!(b && b.txt && b.brujula));
  ok("guiaActiva() la entrega cuando no hay paso", (g("guiaActiva()") || {}).brujula === true);
  ok("con el tutorial EN CURSO, guiaActiva() da el paso y no la brújula", (() => {
    G.tuto.done = false; G.tuto.step = 0; const r = g("guiaActiva()"); G.tuto.done = true; return r && !r.brujula && r.id === "kit";
  })());
}

console.log("\nB2 · EL ORDEN: PRIMERO LO GANADO Y SIN COBRAR\n");
{
  limpio();
  G.level = 8; G.plata = 99999;                          // hay expansión comprable y plata de sobra…
  G.planos = { cocina: 1 };                              // …pero hay un plano tirado en el Cobertizo
  let b = g("brujula()");
  ok("un plano sin colocar gana a todo lo demás", /plano de Cocina/.test(b.txt), b.txt);
  ok("y la flecha lleva al Cobertizo", b.panel === "ov-cobertizo");
  G.planos = {}; G.daily = { day: 1, last: "" };          // el paquete del día está para cobrar
  b = g("brujula()");
  ok("el paquete del día sin cobrar va antes que cualquier meta", /paquete del día/.test(b.txt), b.txt);
  ok("y apunta al buzón", b.target === "buzon");
  G.daily = { day: 1, last: g("dayStamp(0)") };
  G.buzonLeidas = {};                                    // carta del abuelo #1 (nivel 2) sin leer, y estoy en 8
  b = g("brujula()");
  ok("una carta del abuelo sin leer también va antes", /carta de tu abuelo/.test(b.txt), b.txt);
}

console.log("\nB3 · DESPUÉS, LO QUE ESTÁ A MEDIAS\n");
{
  limpio();
  G.level = 8; G.plata = 99999;
  G.obras = { horno: { col: 1, row: 1 } };               // obra colocada, nada depositado
  const b = g("brujula()");
  ok("una obra sin terminar va antes que comprar cosas nuevas", /obra de Horno/.test(b.txt), b.txt);
  ok("y dice qué falta", /faltan .* de madera/.test(b.txt));
  ok("y la flecha apunta a la obra", b.target === "horno");
  G.built = { horno: 1 };                                // terminada: deja de aparecer
  ok("terminada, ya no la nombra", !/obra de Horno/.test(g("brujula()").txt));
}

console.log("\nB4 · DESPUÉS, LO QUE EL NIVEL YA ABRIÓ\n");
{
  limpio();
  const e = g("expansionSiguiente()");
  G.level = e.nivel; G.res = { madera: 0, piedra: 0 };
  let b = g("brujula()");
  ok("expansión abierta por nivel y sin materiales: dice cuánto falta (madera y piedra, no plata)",
    /Juntá \d+ de madera y \d+ de piedra para la expansión 1/.test(b.txt), b.txt);
  ok("y manda a talar (lo primero que falta)", b.target === "tree");
  G.res = { madera: e.costo.madera, piedra: e.costo.piedra };
  b = g("brujula()");
  ok("con la plata, dice que se puede comprar", /Podés comprar la expansión 1/.test(b.txt), b.txt);
  ok("y apunta al Mercado", b.target === "market" && b.panel === "ov-market");
  G.level = e.nivel - 1;
  ok("un nivel por debajo, NO la ofrece (sería mandarlo a un « todavía no »)", !/expansión 1/.test(g("brujula()").txt), g("brujula()").txt);
}

console.log("\nB5 · Y SI NO HAY NADA PENDIENTE, EL NIVEL SIGUIENTE Y LO QUE TRAE\n");
{
  limpio();
  G.level = 1; G.plata = 0;
  vm.runInContext("var _metaReal = metaSemana; metaSemana = () => null;", ctx);   // sin pedido semanal esta vez
  const b = g("brujula()");
  ok("nombra el nivel siguiente", /Granja 2 trae/.test(b.txt), b.txt);
  ok("y lo que trae sale de farmUnlockTxt, no está escrito a mano",
    b.txt.indexOf(String(g("farmUnlockTxt(2)")).split(" + ")[0]) >= 0);
  ok("y dice cómo subir (cosechar, picar, pescar)", /cosechá, picá y pescá/.test(b.txt));
  G.level = g("FARM_NIVEL_MAX");
  ok("en el techo de granja no promete un nivel que no existe", !/Granja \d+ trae/.test((g("brujula()") || {}).txt || ""));
  vm.runInContext("metaSemana = _metaReal;", ctx);
}

console.log("\nC · LA BARRA, LAS FLECHAS Y EL RESALTADO LEEN LA GUÍA, NO SOLO EL TUTORIAL\n");
{
  ok("tutoRefresh usa guiaActiva()", /function tutoRefresh\(\) \{[\s\S]{0,600}?guiaActiva/.test(UI));
  ok("y con brújula no intenta pintar el contador X/N", /\(sub \|\| st\.brujula\) \? ""/.test(UI));
  ok("tutoHighlight (la flecha de los menús) también", /function tutoHighlight\(\) \{[\s\S]{0,400}?guiaActiva/.test(UI));
  ok("tutoSync mete el texto de la brújula en la firma (si no, la barra no se redibuja al cobrar algo)",
    /st && st\.brujula \? st\.txt : ""/.test(UI));
  ok("y la flecha del mundo (farm.js) también", /updateTutoArrow\(\) \{[\s\S]{0,600}?guiaActiva/.test(FARM));   /* 22/9: la cámara de la guía (ChatGPT) metió líneas entre medio; se busca desde la definición */
  ok("el sub-objetivo no se calcula sobre la brújula (no es un paso, no se « cumple »)",
    /!st\.brujula && typeof tutoSub/.test(UI) && /!st\.brujula && typeof tutoSub/.test(FARM));
  ok("al terminar el tutorial se le dice al jugador que la barra sigue", /La barra de arriba te sigue marcando/.test(STATE));
}

console.log("\nD · LO QUE LA BRÚJULA NO HACE, A PROPÓSITO\n");
{
  const cuerpo = (STATE.match(/function brujula\(\) \{([\s\S]*?)\n\}/) || [])[1] || "";
  ok("(arnés) se aisló el cuerpo", !!cuerpo);
  /* 19/8: dos intentos con textos que rotaban o contaban segundos se fueron. Una línea quieta */
  ok("no cuenta segundos ni minutos (nombrar la espera la vuelve protagonista)", !/fmtDur|fmtSecs|segundos|minutos/.test(cuerpo));
  ok("no rota entre sugerencias (devuelve UNA, la primera que aplica)", !/Math\.random|rotar|alternar/.test(cuerpo));
  ok("no tiene una lista escrita de objetivos: todo sale del estado", !/txt: "[^"]*"\s*\}\s*,\s*\{/.test(cuerpo));
  ok("y si algo revienta adentro, devuelve null en vez de tirar la barra entera", /catch \(e\) \{ console\.warn\("brújula:"/.test(cuerpo));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
