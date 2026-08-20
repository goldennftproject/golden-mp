/* EL PRIMER ESCALÓN DEL COMBATE ESTÁ ABIERTO (19/8, dirección)
   "La espada de madera es como la semilla de papa para el nivel 1 de Cultivo."
   Todas las escaleras del juego arrancan con su primer escalón abierto: papa en Cultivo 1, piedra
   en Minería 1, pez común en Pesca 1, alpaca en Ganadería 1. La Espada de Madera era la única con
   una caja registradora delante — la pestaña Armas, 15 madera + 10 piedra + 300 de plata, o sea
   5 horas de cultivo con tres parcelas. Y detrás de esa caja estaba lo ÚNICO del juego sin
   enfriamientos, que es justo lo que llena el tiempo muerto.
   Este test vigila las dos mitades: que la espada de entrada se pueda forjar sin pagar el peaje, y
   que el peaje siga en pie para las otras diecinueve.
     node tools/test-espada-entrada.js                                                             */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log() {}, warn() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, isNaN, parseInt, parseFloat };
ctx.window = ctx; ctx.globalThis = ctx; ctx.setTimeout = () => 0; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("public/game/config.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("public/game/state.js", "utf8") +
  "\n;this.X={ARM_DEF,ARM_ORDER,ARMA_ENTRADA,ARMAS_UNLOCK_COST,ARMAS_UNLOCK_PLATA,TUTO_STEPS,TUTO_CAPS," +
  "TUTO_PERMISOS,KIT_INICIAL,CROP_DEF,CD,STAM_BASE,STAM_REGEN_SEG,STAM_COSTO,RECIPE_DEF,COOK_LVLS,EXPANSION_COSTO};", ctx);
["isOpen", "refreshInv", "syncSlots", "toast", "log", "refreshHud", "saveFarm", "celebrate", "sfx",
 "refreshForge", "refreshEquip", "applyCombatHp", "tutoRefresh", "tutoAviso"].forEach(f => { if (typeof ctx[f] !== "function") ctx[f] = () => {}; });
const X = ctx.X, G = ctx.G, UI = fs.readFileSync("public/game/ui.js", "utf8");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nLA ESPADA DE ENTRADA NO PAGA PEAJE");
{
  G.armasUnlocked = false; G.weapons = {}; G.armCd = {}; G.gear = { arma: null };
  G.res = { madera: 50, piedra: 50 }; G.plata = 500; G.tuto = { done: true, step: 99 };
  ctx.craftWeapon(X.ARMA_ENTRADA);
  ok("con la pestaña cerrada, la de madera SE FORJA", !!G.weapons[X.ARMA_ENTRADA]);
  /* Y el peaje sigue en pie: si esto se cayera, el desbloqueo dejaría de valer para nada y de paso
     se regalarían diecinueve armas que sí tienen que costar. */
  const otra = X.ARM_ORDER.find(id => id !== X.ARMA_ENTRADA);
  ctx.craftWeapon(otra);
  ok("pero la siguiente sigue pidiendo el desbloqueo", !G.weapons[otra], X.ARM_DEF[otra].label);
  G.armasUnlocked = true; G.armCd = {};
  ctx.craftWeapon(otra);
  ok("y con la pestaña pagada, se forja", !!G.weapons[otra]);
}

console.log("\nLA HERRERÍA LA ENSEÑA AUNQUE ESTÉ CERRADA");
{
  /* El panel era todo-o-nada: con la pestaña cerrada no se dibujaba ni un arma, así que el jugador
     no tenía forma de enterarse de que existía una a su alcance. */
  const bloque = UI.split("if (!G.armasUnlocked)")[1] || "";
  ok("el panel dibuja la espada de entrada con la pestaña cerrada", /ARMA_ENTRADA/.test(bloque.slice(0, 2500)));
  ok("y no pisa el cartel de la sección cerrada", /armas \+= '<div class="forge-row"><div class="fic"><img src="' \+ GF\.spr\("sword"\)/.test(UI),
    "el cartel se suma, no reemplaza");
}

console.log("\nEL TUTORIAL ENSEÑA LOS DOS GESTOS QUE HABÍA QUE ADIVINAR");
{
  const ids = X.TUTO_STEPS.map(s => s.id);
  ok("forjar el arma es un paso", ids.includes("craftarm"), "paso " + (ids.indexOf("craftarm") + 1) + " de " + ids.length);
  ok("equiparla, también", ids.includes("equiparm"), "paso " + (ids.indexOf("equiparm") + 1));
  ok("entrar a la Zona Negra es un paso", ids.includes("portal"));
  /* Y una vez dentro hay algo que hacer: cruzar el portal y mirar no es un tutorial. */
  /* El botín tenía que servir para algo: el tutorial cierra cocinando lo que cazaste. */
  ok("el paso de caza pide el BOTÍN, no un número de muertes",
    (X.TUTO_STEPS.find(s2 => s2.id === "hunt") || {}).res === "carne");
  ok("y cocinar lo cazado cierra el capítulo de la Zona", ids.indexOf("estofado") > ids.indexOf("hunt"));
  /* El paso que se fue: "crafteá un Hacha" con 35 hachas ya en la mochila. */
  ok("ya no se pide craftear un hacha que el kit regala", !ids.includes("crafttool"),
    "el kit trae " + X.KIT_INICIAL.axe + " hachas");
  ok("los capítulos incluyen los pasos nuevos",
    X.TUTO_CAPS.some(c => c.pasos.includes("craftarm")) && X.TUTO_CAPS.some(c => c.pasos.includes("portal")),
    X.TUTO_CAPS.map(c => c.label).join(" · "));
}

console.log("\nNINGÚN PASO NUEVO DEJA AL JUGADOR ENCERRADO");
{
  /* El embudo del tutorial permite SOLO lo que el paso activo necesita. Si "forjá la espada" no
     dejara talar, quien llegue sin 5 de madera se queda sin salida — y el paso viene justo después
     de construir el Horno, que se lleva toda la madera. */
  ["craftarm", "equiparm", "portal", "hunt", "estofado"].forEach(id => {
    const p = X.TUTO_PERMISOS[id] || [];
    ok("el paso " + id + " deja seguir jugando", p.includes("chop") || p.includes("plant"),
      p.length + " gestos permitidos");
  });
  ok("el último paso no encierra la granja", (X.TUTO_PERMISOS.portal || []).length >= 8,
    "entrar a pelear es una invitación, no un peaje");
}

console.log("\nCADA FUENTE DE COMIDA TIENE SU RECETA DE NIVEL 1");
{
  /* La huerta, la laguna y la caza son las tres formas de conseguir comida. Si una no tiene receta
     en el nivel 1, su botín es un adorno hasta que la Cocina suba — y la caza estaba así: su
     primera receta pedía Cocina 3, diez platos más allá. */
  const R = X.RECIPE_DEF, uno = Object.keys(R).filter(k => (R[k].lvl || 1) === 1);
  const deHuerta = uno.some(k => Object.keys(R[k].res || {}).some(i => X.CROP_DEF[i]));
  const deLaguna = uno.some(k => R[k].fish);
  const deCaza   = uno.some(k => (R[k].res || {}).carne);
  ok("la huerta tiene la suya", deHuerta);
  ok("la laguna tiene la suya", deLaguna);
  ok("y la caza, también", deCaza, uno.filter(k => (R[k].res || {}).carne).map(k => R[k].label).join(", "));
  /* Y que lo que pide sea alcanzable con lo que sueltan los bichos de entrada. */
  const carneQuiere = ((uno.find(k => (R[k].res || {}).carne) && R[uno.find(k => (R[k].res || {}).carne)].res.carne) || 0);
  const porBicho = (0.18 + 0.24 + 0.2 * 1.5) / 3;
  ok("y se junta en unas " + Math.ceil(carneQuiere / porBicho) + " muertes", carneQuiere / porBicho <= 8,
    "pide " + carneQuiere + " de carne · el Pantano suelta " + porBicho.toFixed(2) + " por bicho");
}

console.log("\nLA RED DE SEGURIDAD DEL PASO DE CAZA (y solo de ese paso)");
{
  /* Con un 24% de caída, uno de cada cuatro jugadores mata siete bichos sin ver carne. En medio del
     tutorial eso no es "aprender que el botín es azaroso", es quedarse sin estamina con el juego a
     medio explicar. Se garantiza en la muerte nº TUTO_PITY — y SOLO mientras el paso está activo. */
  const rata = { loot: { carne: [1, 1, 0.18], plata: [1, 1, 1] } };
  const paso = X.TUTO_STEPS.findIndex(s2 => s2.id === "hunt");
  const peorCaso = () => {
    G.res = { carne: 0 }; G.tuto = { step: paso, done: false, n: 0, pity: 0 };
    let muertes = 0;
    for (let i = 0; i < 30 && (G.res.carne || 0) < 1; i++) {
      muertes++;
      const out = {};                      // el peor caso posible: el azar nunca acompaña
      ctx.tutoPity(rata, out);
      Object.keys(out).forEach(k => G.res[k] = (G.res[k] || 0) + out[k]);
    }
    return muertes;
  };
  const m = peorCaso();
  ok("con la peor suerte del mundo, la carne cae en la muerte nº " + m, m <= ctx.TUTO_PITY,
    "el tutorial no depende de un dado");
  /* Y fuera del paso, el azar manda: si esto se filtrara, cazar carne sería trivial para siempre. */
  G.tuto = { done: true, step: 99 }; G.res = { carne: 0 };
  let sueltos = 0;
  for (let i = 0; i < 20; i++) { const out = {}; ctx.tutoPity(rata, out); if (out.carne) sueltos++; }
  ok("fuera del tutorial no regala nada", sueltos === 0, "20 muertes, 0 botines regalados");
  /* Ni en otros pasos que no piden ese material. */
  G.tuto = { step: X.TUTO_STEPS.findIndex(s2 => s2.id === "estofado"), done: false }; G.res = { carne: 0 };
  let s2 = 0;
  for (let i = 0; i < 20; i++) { const out = {}; ctx.tutoPity(rata, out); if (out.carne) s2++; }
  ok("ni en un paso que no pide botín", s2 === 0);
}

console.log("\nEL CAMINO DE CRECIMIENTO, QUE ERA EL ÚNICO SIN ENSEÑAR");
{
  /* Las expansiones son la ÚNICA fuente de nodos, y la cadena tiene tres eslabones que había que
     adivinar enteros: comprar → el regalo llega al baúl → pasa al Cobertizo → lo colocás vos. */
  const ids = X.TUTO_STEPS.map(s2 => s2.id);
  ["expandir", "reclamar", "colocar"].forEach(id =>
    ok("el tutorial enseña " + id, ids.includes(id), "paso " + (ids.indexOf(id) + 1)));
  /* EL ORDEN IMPORTA y no es el intuitivo: el regalo NO existe hasta que la expansión está
     comprada, porque se nace con las 3 parcelas que corresponden al nivel 1. Si los pasos
     estuvieran al revés, el jugador se quedaría mirando un baúl vacío. */
  ok("y en el orden real: primero expandir, después reclamar y colocar",
    ids.indexOf("expandir") < ids.indexOf("reclamar") && ids.indexOf("reclamar") < ids.indexOf("colocar"));
  G.level = 3; G.expansiones = 0; G.regalos = { tree: 0, rock: 0, plot: 0 }; G.cobertizo = {}; G.plotsOwned = 3;
  ctx.regalosSync();
  ok("sin expansión, el baúl está vacío", ((G.regalos || {}).plot || 0) === 0,
    "por eso 'reclamá tu parcela' no puede ir antes");
  G.expansiones = 1; ctx.regalosSync();
  ok("con la expansión comprada, llega la parcela", ((G.regalos || {}).plot || 0) === 1);
  ctx.regaloReclamar("plot");
  ok("y al reclamarla pasa al Cobertizo", ((G.cobertizo || {}).plot || 0) === 1,
    "desde ahí el jugador elige dónde va");
  ok("el capítulo existe", X.TUTO_CAPS.some(c => c.pasos.includes("expandir")),
    X.TUTO_CAPS.map(c => c.label).join(" · "));
  ["expandir", "reclamar", "colocar"].forEach(id => {
    const p = X.TUTO_PERMISOS[id] || [];
    ok("el paso " + id + " deja juntar materiales", p.includes("chop"), p.length + " gestos");
  });
}

console.log("\nY LA CUENTA QUE MOTIVÓ TODO ESTO");
{
  const antes = X.ARMAS_UNLOCK_PLATA / (3 * (X.CROP_DEF.papa.price - X.CROP_DEF.papa.seedCost) * 3600 / X.CROP_DEF.papa.grow);
  ok("el peaje eran " + antes.toFixed(1) + " h de cultivo con 3 parcelas", antes > 3,
    "ahora la espada son " + X.ARM_DEF[X.ARMA_ENTRADA].cost.madera + " de madera");
  const bichos = Math.floor(86400 / X.STAM_REGEN_SEG / X.STAM_COSTO.rata);
  ok("y detrás hay " + bichos + " bichos al día de contenido sin relojes", bichos > 50,
    "unos " + Math.round(bichos * 15 / 60) + " min diarios, que la estamina ya regula");
}

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ el combate se abre el primer día, y el arsenal sigue costando\n");
process.exit(fallos ? 1 : 0);
