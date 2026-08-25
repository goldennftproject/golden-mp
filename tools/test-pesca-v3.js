/* PESCA v3 · TANDA 1 — EL AGUA SE LEE (25/8, propuesta de dirección · docs/PESCA-V3.md)
   « El pez no se sortea: se elige. » Hasta ahora la rareza se tiraba al armar el lance
   (60/25/12/3) y el jugador era espectador de su propia suerte. Ahora el agua es un mapa: hay
   señales visibles, cada carnada abre una familia distinta, y la estrella se ve ANTES de tirar.
   Las dos reglas que mandan sobre todo, y que este medidor existe para vigilar:
     1. LA PLATA ES PLANA — ninguna especie ni ninguna estrella rinde por encima del ancla.
     2. LA ESTRELLA NO PAGA PLATA: PAGA XP — la única moneda que el ancla no gobierna.
   Y por qué la 2 no es un capricho: si el precio escalara con la estrella y se compensara con una
   probabilidad de cobro inversa, la esperanza quedaría igual en todas las estrellas y lo racional
   sería pescar SIEMPRE 1★ — misma plata, cero riesgo, pelea más corta. El 5★ quedaba
   estrictamente peor. Honesto en la planilla, suicida en el juego.
     node tools/test-pesca-v3.js                                                                 */
const fs = require("fs"), vm = require("vm");

const T0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + desfase); } static now() { return T0 + desfase; } }

const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
const avisos = [];
ctx.toast = t => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "saveFarm", "recalcFarmLevel", "tutoEvent", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const pintados = { hud: 0, slots: 0 };
ctx.refreshHud = () => { pintados.hud++; }; ctx.syncSlots = () => { pintados.slots++; };
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const ESP = g("ESPECIE_DEF"), ORDER = g("ESPECIE_ORDER"), STAR = g("PESCA_ESTRELLA"),
      FAM = g("PESCA_FAMILIA"), CARN = g("PESCA_CARNADA"), ANCLA = g("ANCLA_PLATA_HORA"),
      FISH_CD = g("FISH_CD"),
      /* 25/8 (tanda 3): el tope dejó de ser una constante — la lluvia guarda una carga de más.
         Y no alcanza con preguntarlo UNA vez al arrancar: este medidor adelanta el reloj, y al
         cruzar la medianoche UTC el clima cambia. Un medidor que cachea un valor que depende del
         reloj mientras él mismo mueve el reloj se pone rojo solo — que es exactamente lo que
         pasó. Se pregunta en cada aserción, que es cuando importa. */
      MAXC = () => ctx.pescaCargasMax();

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nREGLA 1 · LA PLATA ES PLANA, Y SALE DEL ANCLA");
{
  ok("el ancla tiene nombre y vale " + ANCLA, ANCLA === 20);
  ORDER.forEach(id => {
    const e = ESP[id], esperado = Math.round(e.cadena / 60 * ANCLA * 10) / 10;
    ok(e.label + ": su cadena de " + e.cadena + " min paga " + esperado,
      ctx.especiePrecio(id) === esperado, ctx.especiePrecio(id) + " de plata");
  });
  /* la comprobación que de verdad importa: una hora de laguna paga el ancla, pesques lo que
     pesques. Con FISH_CD de 15 min entran 4 lances por hora; el pez común paga 5. */
  const porHora = 3600 / FISH_CD * ctx.especiePrecio("pez_comun");
  ok("una hora de orilla cierra en el ancla", Math.abs(porHora - ANCLA) < 0.01, porHora + " de plata/h");
  /* y la estrella NO puede tocar el precio en ninguna fila */
  let mueve = 0;
  ORDER.forEach(id => { for (let s = 1; s <= 5; s++) if (ctx.especiePrecio(id, s) !== ctx.especiePrecio(id)) mueve++; });
  ok("la estrella no mueve el precio en NINGUNA especie", mueve === 0, mueve + " desvíos");
}

console.log("\nREGLA 2 · LA ESTRELLA PAGA XP, Y ESCALA COMO DICE LA TABLA");
{
  ok("los cinco multiplicadores son los del documento",
    STAR[1] === 1 && STAR[2] === 2 && STAR[3] === 3.5 && STAR[4] === 6 && STAR[5] === 10,
    Object.keys(STAR).map(k => "×" + STAR[k]).join(" · "));
  /* LA XP BASE ES LA CADENA EN MINUTOS — la corrección medida del 25/8. La tabla del documento
     traía la XP a mano (5·5·10·15·20) y eso dejaba Pesca 20 a MIL TRESCIENTOS DÍAS de un jugador
     de orilla: un techo decorativo. El código ya calibra el oficio en 60 de XP por hora de
     laguna, o sea 15 por lance de 15 minutos. Con la cadena como base, el ritmo cierra solo. */
  ORDER.forEach(id => {
    const e = ESP[id], top = e.estrellas[1];
    ok(e.label + ": XP base = su cadena (" + e.cadena + " min)", ctx.especieXp(id, 1) === e.cadena, ctx.especieXp(id, 1) + "");
    ok("  y a ★máx, ×" + STAR[top], ctx.especieXp(id, top) === Math.round(e.cadena * STAR[top] * 10) / 10, ctx.especieXp(id, top) + " de XP");
  });
  const ritmo = 3600 / FISH_CD * g("XP_PEZ");
  ok("una hora de orilla a ★1 da exactamente el ritmo del oficio",
    3600 / FISH_CD * ctx.especieXp("pez_comun", 1) === ritmo, ritmo + " de XP/hora");
  ok("y la estrella es lo ÚNICO que lo hace correr más rápido",
    ctx.especieXp("pez_comun", 2) > ctx.especieXp("pez_comun", 1));
  ok("y una estrella más siempre da MÁS XP, nunca menos",
    ORDER.every(id => { for (let s = 2; s <= 5; s++) if (ctx.especieXp(id, s) <= ctx.especieXp(id, s - 1)) return false; return true; }));
}

console.log("\nLAS SEÑALES SE GENERAN AL LLEGAR: UNA POR CARGA GUARDADA");
{
  G.pescaDesde = FakeDate.now(); G.senales = [];
  ok("recién llegado y sin esperar: ninguna carga", ctx.pescaCargas() === 0);
  ok("y por lo tanto ninguna señal", ctx.pescaSenales().length === 0);
  desfase += FISH_CD * 1000 * 2 + 1000;   // dos relojes de laguna
  ok("dos relojes después: dos cargas", ctx.pescaCargas() === 2, ctx.pescaCargas() + "");
  const s = ctx.pescaSenales();
  ok("y el agua reparte DOS señales", s.length === 2);
  ok("cada una dice qué familia trae", s.every(x => !!FAM[x.fam]));
  ok("y cuántas estrellas, dentro del rango de SU especie",
    s.every(x => x.estrella >= ESP[x.esp].estrellas[0] && x.estrella <= ESP[x.esp].estrellas[1]),
    s.map(x => ESP[x.esp].label + " " + x.estrella + "★").join(" · "));
  ok("la señal y la especie coinciden de familia", s.every(x => ESP[x.esp].familia === x.fam));
}

console.log("\nEL F5 NO LAS RE-SORTEA (como la oferta del Goblin)");
{
  const antes = JSON.stringify(G.senales);
  ctx.pescaSenales(); ctx.pescaSenales();
  ok("pedirlas de nuevo no las cambia", JSON.stringify(G.senales) === antes);
  const snap = ctx.snapshot();
  ok("viajan en el guardado", Array.isArray(snap.senales) && snap.senales.length === 2);
  G.senales = []; ctx.hydrate(snap);
  ok("y vuelven iguales tras el F5", JSON.stringify(G.senales) === antes);
}

console.log("\nEL TOPE: LA LAGUNA GUARDA " + MAXC() + " LANCES, NO MÁS");
{
  desfase += FISH_CD * 1000 * 20;   // veinte relojes: mucho más que el tope
  ok("no pasa de " + MAXC() + " por más que te vayas un día", ctx.pescaCargas() === MAXC(), ctx.pescaCargas() + "");
  ok("y hay " + MAXC() + " señales esperándote", ctx.pescaSenales().length === MAXC());
}

console.log("\nLA CARNADA ELIGE LA FAMILIA — Y EL AVISO NOMBRA LA QUE FALTA");
{
  G.res.lombriz = 0; G.res.grillo = 0; G.pescaTiene = {};
  G.skills = { fishing: 99999 };   // con el oficio hecho: acá se mide la CARNADA, no la escalera
  const orilla = { esp: "pez_comun", fam: "orilla", estrella: 1 };
  let p = ctx.pescaPuedeSenal(orilla);
  ok("sin lombriz, la orilla se niega", !p.ok);
  ok("y el aviso NOMBRA la lombriz", /Lombriz/i.test(p.toast), p.toast);
  G.res.lombriz = 1;
  ok("con lombriz, sí", ctx.pescaPuedeSenal(orilla).ok === true);
  const sup = { esp: "pez_mariposa", fam: "superficie", estrella: 1 };
  p = ctx.pescaPuedeSenal(sup);
  ok("la lombriz NO abre la superficie", !p.ok);
  ok("y el aviso nombra el grillo", /Grillo/i.test(p.toast), p.toast);
  G.res.grillo = 1;
  ok("con grillo, la superficie se abre", ctx.pescaPuedeSenal(sup).ok === true);
  /* 25/8 (tanda 3): « coloso » no tiene carnada A PROPÓSITO — no se pesca, se cita. Y es esa
     ausencia la que la mantiene fuera del sorteo del agua, sin una sola línea de excepción. */
  ok("cada familia PESCABLE tiene UNA carnada y no dos", Object.keys(FAM).filter(f => !FAM[f].cita).every(f =>
    Object.keys(CARN).filter(c => CARN[c].familia === f).length === 1));
  ok("y la de coloso no tiene ninguna: por eso el agua nunca la sortea",
    !!FAM.coloso.cita && Object.keys(CARN).every(c => CARN[c].familia !== "coloso")
      && ctx.familiaAbierta("coloso") === false);
}

console.log("\nTIRARLE A UNA SEÑAL CUESTA LA CARNADA Y LA CARGA");
{
  G.senales = [{ esp: "pez_comun", fam: "orilla", estrella: 2 }];
  G.pescaDesde = FakeDate.now() - FISH_CD * 1000 * 3;   // tres cargas guardadas
  G.res.lombriz = 2;
  const antesC = ctx.pescaCargas();
  pintados.hud = 0; pintados.slots = 0;
  const s = ctx.pescaSenalGastar(0);
  ok("devuelve la señal elegida", !!s && s.esp === "pez_comun");
  ok("cobró la lombriz", Math.floor(G.res.lombriz) === 1, G.res.lombriz + "");
  ok("gastó una carga", ctx.pescaCargas() === antesC - 1, antesC + " → " + ctx.pescaCargas());
  ok("y la señal ya no está", G.senales.length === 0);
  /* 25/8 (dirección: « no se gasta el lombriz ») — SÍ se gastaba; lo que faltaba era AVISAR.
     Descontar sin repintar deja la bolsa dibujando lo que ya no está, y desde afuera eso es
     idéntico a no cobrar. Quien descuenta, repinta. */
  ok("y la bolsa se entera en el acto (HUD y slots)", pintados.hud >= 1 && pintados.slots >= 1,
    "hud " + pintados.hud + " · slots " + pintados.slots);
  G.res.lombriz = 0;
  G.senales = [{ esp: "pez_comun", fam: "orilla", estrella: 1 }];
  const n = ctx.pescaSenalGastar(0);
  ok("sin carnada no se gasta nada", n === null && G.senales.length === 1);
}

console.log("\nEL LANCE PELEA LO QUE VISTE (no una rareza sorteada aparte)");
{
  const l = ctx.pescaLanceNuevo(() => 0.5, { esp: "calamar", fam: "fondo", estrella: 4 });
  ok("el lance recuerda la especie", l.esp === "calamar");
  ok("y la estrella", l.estrella === 4);
  ok("la dificultad sale de la ESTRELLA, no de un sorteo", l.rar === "epico", l.rar);
  const viejo = ctx.pescaLanceNuevo(() => 0.5);
  ok("sin señal, el camino viejo sigue funcionando igual", !!viejo.rar && !viejo.esp, viejo.rar);
}

console.log("\nCOBRAR: PLATA PLANA, XP POR ESTRELLA, Y EL ÁLBUM SE ACUERDA");
{
  G.tuto = { done: true }; G.fish = {}; G.estrellaMax = {}; G.skills = { fishing: 0 };
  G.tools = { rod: 50 };   /* las cañas son apilables: G.tools.rod es un NÚMERO, no un objeto */ G.invRows = 20; G.res.lombriz = 9; G.seeds = {}; G.dishes = {};
  ctx.goFishing({ esp: "carpa_dorada", estrella: 3 });
  ok("la carpa entró a la bolsa", Math.floor(G.fish.carpa_dorada || 0) === 1);
  ok("dio la XP de su estrella (15 de cadena × 3,5)", Math.abs((G.skills.fishing || 0) - 52.5) < 0.01, G.skills.fishing + "");
  ok("y quedó anotada tu mejor talla", G.estrellaMax.carpa_dorada === 3);
  ctx.goFishing({ esp: "carpa_dorada", estrella: 1 });
  ok("una peor NO baja tu récord", G.estrellaMax.carpa_dorada === 3);
  ok("pero suma su XP igual (+15 de una ★1)", Math.abs((G.skills.fishing || 0) - 67.5) < 0.01, G.skills.fishing + "");
}

console.log("\nLA ESCAMA DEL QUE SE FUE: EL FRACASO DEJA DE SER UN CERO");
{
  G.escamas = {}; G.vistos = {}; avisos.length = 0;
  const r = ctx.pescaPerdido({ esp: "pez_mariposa", estrella: 3 });
  ok("deja una escama de SU especie", r && r.escamas === 1 && G.escamas.pez_mariposa === 1);
  ok("el álbum lo marca « visto, no cobrado »", G.vistos.pez_mariposa === true);
  ok("y te lo dice", avisos.some(a => /escama/i.test(a)), avisos.join(" · "));
  ctx.pescaPerdido({ esp: "pez_mariposa", estrella: 2 });
  ok("dos fracasos, dos escamas", G.escamas.pez_mariposa === 2);
  ok("un lance sin especie no inventa nada", ctx.pescaPerdido({ rar: "comun" }) === null);
}

console.log("\nLA ESCALERA: EL AGUA NO OFRECE LO QUE TODAVÍA NO PODÉS PESCAR");
{
  /* 25/8 v2 (dirección: « que no te lo pregunte del minuto uno »). El capítulo 13 abre la
     familia Superficie en PESCA 5 y el señuelo en la 9. Sin esas puertas, el jugador nuevo veía
     señales que no podía pescar y le cobrábamos una pregunta por cada montículo del día. */
  G.skills = { fishing: 0 };
  ok("de recién llegado, solo la orilla está abierta",
    ctx.familiasAbiertas().join(",") === "orilla", ctx.familiasAbiertas().join(" · "));
  ok("la superficie NO", ctx.familiaAbierta("superficie") === false);
  ok("y el fondo tampoco", ctx.familiaAbierta("fondo") === false);
  /* y por lo tanto NINGUNA señal puede ser de una familia cerrada */
  G.senales = []; G.pescaDesde = FakeDate.now() - FISH_CD * 1000 * 8;
  const s = ctx.pescaSenales();
  ok("las señales son todas de orilla", s.length === MAXC() && s.every(x => x.fam === "orilla"),
    s.map(x => x.fam).join(" · "));
  /* al subir a Pesca 5 se abre la superficie */
  G.skills = { fishing: ctx.skillNeed(5, "fishing") * 5 };
  ok("a Pesca " + ctx.nivelOficio("fishing") + " ya se abre la superficie", ctx.familiaAbierta("superficie") === true);
  ok("pero el fondo sigue esperando a la 9", ctx.familiaAbierta("fondo") === false);
}

console.log("\nEL MONTÍCULO AHORA ES UNA ELECCIÓN");
{
  G.excav = null; G.res.lombriz = 0; G.res.grillo = 0;
  const b1 = ctx.excavBotin(0, "lombriz"), b2 = ctx.excavBotin(0, "grillo");
  ok("se puede pedir lombriz", b1.res === "lombriz");
  ok("o grillo", b2.res === "grillo");
  ok("y la cantidad es la misma (la elección no es un premio)", b1.n === b2.n, b1.n + " vs " + b2.n);
  ok("sin elegir, sigue dando lombriz como siempre", ctx.excavBotin(0).res === "lombriz");
  ok("el grillo existe en la bolsa", "grillo" in G.res && g("ITEM_RES_ORDER").includes("grillo"));
  ok("y tiene nombre e ícono propios", g("RES_LABEL").grillo === "Grillo" && g("RES_EMOJI").grillo === "🦗");
}

console.log("\nLAS ESPECIES, Y EL PRIMER ESCALÓN ABIERTO");
{
  /* 25/8: la tanda 1 traía cuatro y la 3 completó las nueve del documento. Lo que este medidor
     tiene que vigilar NO es el número —que iba a crecer desde el día uno— sino que las cuatro de
     la tanda 1 sigan estando y que ninguna se haya caído por el camino. */
  ok("las cuatro de la tanda 1 siguen ahí",
    ["pez_comun", "carpa_dorada", "pez_mariposa", "calamar"].every(k => ORDER.indexOf(k) >= 0), ORDER.join(" · "));
  ok("y ahora son las nueve del documento", ORDER.length === 9, ORDER.length + "");
  /* la regla del primer escalón: un oficio cuyo primer escalón esté cerrado es un oficio que el
     jugador nunca empieza. El pez común con lombriz tiene que estar disponible en el minuto uno. */
  const c = CARN[ctx.carnadaDe("orilla")];
  ok("la orilla no pide nivel", !c.lvl);
  ok("ni receta ni crafteo: sale del montículo", c.gasta === true);
  ok("el calamar es de noche (y por eso pide su propia visita)", ESP.calamar.noche === true);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: el pez se elige, la plata no se mueve y la estrella se paga en oficio.\n");
process.exit(fallos ? 1 : 0);
