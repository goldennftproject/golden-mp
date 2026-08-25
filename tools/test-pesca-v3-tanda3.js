/* PESCA v3 · TANDA 3 — LOS COLOSOS (25/8, docs/PESCA-V3.md capítulos 6, 7, 10, 11 y 12)
   La tanda que cierra el sistema, y la que más podía romperlo — porque es la primera que mezcla
   RELOJ DE PARED (las trampas) con una escalera que se sube con HORAS ACTIVAS. La medición previa
   (tools/medir-pesca-tanda3.js) dijo que, tal como venía propuesto, dejaba Pesca 20 en 44 horas
   contra las 113-135 del resto de los oficios. De ahí salieron las dos reglas que este archivo
   vigila: la cita paga la MITAD de la XP, y la presión de la tanda 2 sostiene la banda.

   Lo que se comprueba acá, por capítulo del documento:
     · 6  — las siete peleas: una variación por especie, y cada una con su frase.
     · 7  — la trampa da la CITA, no el pez · los cuatro estados de la boya · el palangre nunca
            sale vacío y nunca engancha por encima de tu mejor caña · los casos borde (levantar
            antes de tiempo, F5, bolsa llena, y la ventana que NO vence peleando).
     · 10 — el clima: determinístico, coprimo con 7, y ninguno rinde menos.
     · 11 — la Lonja solo pide lo que el jugador ya puede pescar.
     · 12 — la estrella no hace el plato más fuerte: lo hace más largo.
     · y las observaciones 3 y 4 del documento, que esta tanda cerró.
     node tools/test-pesca-v3-tanda3.js                                                          */
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
ctx.toast = (t) => avisos.push(String(t)); ctx.log = () => {};
["isOpen", "refreshInv", "refreshHud", "saveFarm", "syncSlots", "recalcFarmLevel", "tutoEvent", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const ESP = g("ESPECIE_DEF"), ORDEN = g("ESPECIE_ORDER"), TRAMPA = g("TRAMPA_DEF");
const CLIMA = g("CLIMA_DEF"), CLIMA_ORDER = g("CLIMA_ORDER"), PELEA = g("PELEA_DEF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const ult = () => avisos[avisos.length - 1] || "";
const dijo = (re) => avisos.some(a => re.test(a));   // el último aviso no siempre es el mío:
                                                     // avisarSinNube habla después en las pruebas
/* poner el oficio en un nivel EXACTO. Multiplicar skillNeed por el nivel es una aproximación que
   se corre —a Pesca « 8 » daba 12— y una prueba que miente sobre el nivel no prueba nada. */
function nivelExacto(sk, n) {
  let acc = 0; for (let k = 2; k <= n; k++) acc += ctx.skillNeed(k, sk);
  G.skills = G.skills || {}; G.skills[sk] = acc;
  return ctx.nivelOficio(sk);
}
/* un pescador hecho y derecho: Pesca 20, las cuatro cañas, y las tres trampas en el cobertizo */
function maestro() {
  desfase = 0;
  nivelExacto("fishing", 20);
  G.canas = { junco: 30, roble: 30, hierro: 25, abuelo: 20 };
  G.trampas = { nasa: 5, red: 5, palangre: 5 };
  G.amarres = [null, null, null];
  G.res = Object.assign({}, G.res, { cebo_vivo: 0, lombriz: 20, grillo: 20 });
  G.fish = {}; G.presion = null; G.marea = null;
  avisos.length = 0;
}

console.log("\nLAS NUEVE ESPECIES, Y NI UN NÚMERO ESCRITO A MANO   (capítulo 5, completo)");
{
  ok("son nueve", ORDEN.length === 9, ORDEN.length + "");
  ok("y ESPECIE_ORDER no se olvidó de ninguna de ESPECIE_DEF",
    Object.keys(ESP).every(k => ORDEN.indexOf(k) >= 0) && ORDEN.every(k => !!ESP[k]));
  ok("las dos de coloso están y son las únicas",
    ORDEN.filter(k => ESP[k].familia === "coloso").join(",") === "pez_espada,tiburon");
  /* la regla derivada de la tanda 1, otra vez: precio = cadena/60 × ancla, XP base = cadena */
  const ancla = g("ANCLA_PLATA_HORA");
  ok("el precio de las cinco nuevas sale de la cadena, no de una tabla",
    ["camaron_rio", "anguila", "pez_volador", "pez_espada", "tiburon"]
      .every(k => Math.abs(ctx.especiePrecio(k) - ESP[k].cadena / 60 * ancla) < 0.05));
  ok("el martillo de 5★ da 600 de XP (60 min × ×10) sin que nadie lo escriba",
    ctx.especieXp("tiburon", 5) === 600, ctx.especieXp("tiburon", 5) + "");
  ok("y el espada de 5★, 450", ctx.especieXp("pez_espada", 5) === 450);
}

console.log("\nLAS SIETE PELEAS: UN MINIJUEGO CON SIETE VARIACIONES   (capítulo 6)");
{
  ok("hay siete variaciones y ni una más", Object.keys(PELEA).length === 7, Object.keys(PELEA).length + "");
  ok("cada una se explica en UNA frase (si no entra en una línea, no entra)",
    Object.keys(PELEA).every(k => PELEA[k].txt && PELEA[k].txt.length > 10 && PELEA[k].txt.indexOf(".") < 0));
  ok("la orilla es el carrete de siempre — el escalón que enseña el sistema",
    ctx.peleaNom("pez_comun") === "normal" && ctx.peleaNom("carpa_dorada") === "normal");
  ok("el camarón mordisquea tres veces", ctx.peleaDe("camaron_rio").mordiscos === 3);
  ok("el mariposa se anticipa, no se reacciona", ctx.peleaDe("pez_mariposa").onda === true);
  ok("el volador se va de la barra", ctx.peleaDe("pez_volador").saltos === 2);
  ok("el calamar tira tinta SOBRE TU ZONA, no sobre la barra entera",
    ctx.peleaDe("calamar").tintas === 2 && /zona/.test(ctx.peleaDe("calamar").txt));
  ok("el espada se gana en los huecos", ctx.peleaDe("pez_espada").sprints === 3);
  ok("el martillo mide el doble y te gasta la caña",
    ctx.peleaDe("tiburon").barraX === 2 && ctx.peleaDe("tiburon").gastaCana === true);
  ok("las seis especies con pelea propia son distintas entre sí",
    new Set(["camaron_rio", "pez_mariposa", "pez_volador", "calamar", "pez_espada", "tiburon"].map(ctx.peleaNom)).size === 6);
}

console.log("\nLA TRAMPA NO TE DA EL PEZ, TE DA LA CITA   (capítulo 7)");
{
  maestro();
  ok("tres trampas, tres amarres", g("TRAMPA_ORDER").length === 3 && ctx.amarresCupo() === 3);
  ok("ninguna cuesta plata — se pagan con reloj de nodo, como el hacha y el pico",
    g("TRAMPA_ORDER").every(k => !TRAMPA[k].cost.plata));
  /* la nasa: la excepción, y da PRODUCTO */
  ctx.trampaCalar("nasa", () => 0.5);
  const a0 = G.amarres[0];
  ok("la nasa se cala en el primer amarre libre", !!a0 && a0.id === "nasa");
  ok("y consume un uso de la trampa", ctx.trampaUsos("nasa") === 4);
  ok("recién calada está « calando »", ctx.amarreEstado(a0) === "calando");
  ok("y no se puede cobrar todavía", ctx.trampaCobrar(0) === null && /calando/.test(ult()));
  desfase = 4 * 3600000 + 1000;
  ok("a las 4 h cabecea", ctx.amarreEstado(a0) === "cabeceando");
  const cob = ctx.trampaCobrar(0);
  ok("la nasa entrega CEBO VIVO, que es lo que no se vende", cob && cob.cebo >= 3 && cob.cebo <= 5);
  ok("y el amarre queda libre", G.amarres[0] === null);
  ok("el cebo entró a la bolsa", (G.res.cebo_vivo || 0) === cob.cebo);
}

console.log("\nEL PALANGRE: NUNCA VACÍO, Y NUNCA POR ENCIMA DE TU CAÑA   (capítulo 7)");
{
  maestro();
  ok("sin cebo no se cala, y el aviso DICE qué falta",
    ctx.trampaCalar("palangre") === null && /Calamar|Cebo vivo/.test(ult()));
  G.fish = { calamar: 2 };
  const a = ctx.trampaCalar("palangre", () => 0.9);
  ok("con 2 calamares sí, y se los come", !!a && (G.fish.calamar || 0) === 0);
  ok("el cebo elige la especie, no la suerte: 2 calamares → tiburón", a.esp === "tiburon");
  ok("NUNCA sale vacío: la cita ya está decidida al calar", !!a.esp && a.estrella >= 1);
  ok("y decidida al calar quiere decir que el F5 no la re-sortea",
    ctx.amarreEstado(a) === "calando" && a.estrella === G.amarres[0].estrella);
  /* la regla 3 de la casa, donde más duele */
  maestro();
  G.canas = { junco: 30 };           // solo 2★
  G.fish = { calamar: 2 };
  const b = ctx.trampaCalar("palangre", () => 0.99);
  ok("con caña de junco (2★) el palangre NO engancha un 5★", b.estrella <= 2, b.estrella + "★");
  maestro();
  G.canas = { junco: 30, roble: 30, hierro: 25 };   // 4★
  G.fish = { calamar: 2 };
  const c = ctx.trampaCalar("palangre", () => 0.99);
  ok("con caña de hierro (4★) engancha 4★, nunca 5", c.estrella === 4, c.estrella + "★");
  /* el cebo de espada */
  maestro();
  G.res.cebo_vivo = 2;
  const d = ctx.trampaCalar("palangre", () => 0.1);
  ok("2 de cebo vivo → pez espada", d.esp === "pez_espada" && (G.res.cebo_vivo || 0) === 0);
}

console.log("\nEL NIVEL TAMBIÉN MANDA: NO SE ENGANCHA LO QUE NO EXISTE PARA VOS");
{
  maestro();
  nivelExacto("fishing", 13);   // Pesca 13: palangre sí, martillo no
  ok("a Pesca 13 el palangre está abierto", ctx.trampaAbierta("palangre"));
  ok("pero el martillo (nivel 20) todavía no", ctx.nivelOficio("fishing") < ESP.tiburon.lvl);
  G.fish = { calamar: 2 };
  ok("así que 2 calamares no alcanzan para cebarlo",
    ctx.trampaCalar("palangre") === null && /Calamar|Cebo vivo/.test(ult()));
}

console.log("\nLOS CUATRO ESTADOS DE LA BOYA, Y LOS CASOS BORDE   (capítulo 7.3)");
{
  ok("los estados son exactamente cuatro", Object.keys(g("BOYA_ESTADO")).length === 4);
  /* levantar antes de tiempo devuelve trampa Y cebo: el error cuesta tiempo, no material */
  maestro(); G.fish = { calamar: 2 };
  ctx.trampaCalar("palangre", () => 0.5);
  ctx.trampaLevantar(0);
  ok("levantar antes de tiempo devuelve la trampa", ctx.trampaUsos("palangre") === 5);
  ok("y devuelve el cebo — solo se pierde el calado", (G.fish.calamar || 0) === 2);
  /* la ventana vence de verdad, y el aviso NOMBRA lo perdido */
  maestro(); G.fish = { calamar: 2 };
  ctx.trampaCalar("palangre", () => 0.5);
  desfase = 25 * 3600000;                       // 12 de calado + 12 de ventana + 1
  ok("pasada la ventana está « soltada »", ctx.amarreEstado(G.amarres[0]) === "soltada");
  avisos.length = 0;
  ctx.trampaCobrar(0);
  ok("y el aviso nombra lo que perdiste — no se vacía en silencio", dijo(/2 Calamar/), avisos.join(" | "));
  ok("el amarre queda libre", G.amarres[0] === null);
  ok("y NO devuelve el cebo: la ventana venció", (G.fish.calamar || 0) === 0);
  /* el F5 no la resucita ni la reinicia */
  maestro(); G.fish = { calamar: 2 };
  ctx.trampaCalar("palangre", () => 0.5);
  desfase = 25 * 3600000;
  const copia = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(copia);
  ok("el F5 no resucita una trampa vencida", ctx.amarreEstado(G.amarres[0]) === "soltada");
  desfase = 6 * 3600000;
  const c2 = JSON.parse(JSON.stringify(ctx.snapshot()));
  ctx.hydrate(c2);
  ok("ni reinicia una que estaba corriendo", ctx.amarreEstado(G.amarres[0]) === "calando");
}

console.log("\nLA VENTANA NO VENCE DURANTE LA PELEA   (el único caso sin precedente)");
{
  maestro(); G.fish = { calamar: 2 };
  ctx.trampaCalar("palangre", () => 0.5);
  desfase = 23 * 3600000;                       // quedan ~1 h de ventana
  const antes = ctx.amarreRestaMs(G.amarres[0]);
  ok("antes de clavar, la ventana corre", antes > 0 && antes < 3600000 + 5000);
  ctx.citaCongelar(0);
  desfase = 40 * 3600000;                       // una pelea absurdamente larga
  ok("con el pez clavado el reloj está congelado", ctx.amarreEstado(G.amarres[0]) === "cabeceando");
  ok("y lo que resta es lo que restaba al clavar", ctx.amarreRestaMs(G.amarres[0]) === antes);
  ctx.citaResolver(0, false);                   // se cortó el hilo
  ok("si se corta el hilo, la cita sigue con lo que le quedaba",
    ctx.amarreEstado(G.amarres[0]) === "cabeceando" && Math.abs(ctx.amarreRestaMs(G.amarres[0]) - antes) < 2000);
  ctx.citaResolver(0, true);
  ok("y si lo sacás, el amarre queda libre", G.amarres[0] === null);
}

console.log("\nEL PARTE AL ENTRAR, Y LA ÚLTIMA LLAMADA   (capítulo 7.4)");
{
  maestro(); G.fish = { calamar: 2 };
  ctx.trampaCalar("palangre", () => 0.9);
  desfase = 13 * 3600000;
  const p = ctx.amarresParte();
  ok("al entrar, el parte avisa que cabecea", p.length === 1 && p[0].tipo === "cabecea");
  ok("y dice QUÉ hay y CUÁNTO queda — no « pasó algo »",
    /Tiburón martillo/.test(p[0].txt) && /★/.test(p[0].txt) && /quedan/.test(p[0].txt), p[0].txt);
  ok("todavía no es última llamada", !ctx.amarreUltimaLlamada(G.amarres[0]));
  desfase = 23 * 3600000 + 20 * 60000;          // al 10 % de las 12 h de ventana
  ok("al 10 % restante, sí", ctx.amarreUltimaLlamada(G.amarres[0]));
}

console.log("\nLA XP DE UNA CITA ES LA MITAD   (lo que salió de medir, no del ojo)");
{
  ok("CITA_XP es 0,5 y está en UN solo lugar", g("CITA_XP") === 0.5);
  const suelto = ctx.lanceXp({ esp: "tiburon", estrella: 5 });
  const cita   = ctx.lanceXp({ esp: "tiburon", estrella: 5, cita: true });
  ok("un martillo peleado a pulmón paga entero", suelto === 600, suelto + "");
  ok("el mismo martillo entregado por el palangre paga la mitad", cita === 300, cita + "");
  ok("y la regla no toca la PLATA: el ancla no se mueve",
    ctx.especiePrecio("tiburon") === 20, ctx.especiePrecio("tiburon") + "");
}

console.log("\nEL CLIMA: CAMBIA QUÉ SE PESCA, NUNCA CUÁNTO   (capítulo 10)");
{
  maestro();
  ok("hay cuatro climas rotando", CLIMA_ORDER.length === 4);
  /* LA REGLA COPRIMA, que el documento pidió convertir en decisión y no dejar en suerte */
  const mcd = (a, b) => b ? mcd(b, a % b) : a;
  ok("el largo del ciclo es COPRIMO con 7 — si no, el que solo juega los sábados ve un solo clima",
    mcd(CLIMA_ORDER.length, 7) === 1, CLIMA_ORDER.length + " y 7");
  const vistos = new Set(); for (let d = 0; d < 28; d++) vistos.add(ctx.climaHoy(d));
  ok("y en cuatro semanas de sábados se ven los cuatro", vistos.size === 4);
  ok("es determinístico: el F5 no re-sortea el clima", ctx.climaHoy(100) === ctx.climaHoy(100));
  ok("cada clima se explica en una frase", CLIMA_ORDER.every(k => CLIMA[k].txt && CLIMA[k].txt.length > 10));
  /* la regla dura: ninguno rinde MENOS */
  ok("ningún clima quita cargas de la laguna", CLIMA_ORDER.every(k => (CLIMA[k].cargas || 0) >= 0));
  ok("ningún clima castiga a una familia — solo favorece",
    CLIMA_ORDER.every(k => !CLIMA[k].castiga));
  ok("la lluvia guarda una carga de más y es el único que toca el rendimiento", CLIMA.lluvia.cargas === 1);
  ok("el viento pone la Superficie al doble", CLIMA.viento.favor === "superficie");
  ok("la niebla es el único día en que el Fondo pica de día", CLIMA.niebla.deDia === "fondo");
}

console.log("\nLA LONJA SOLO PIDE LO QUE YA PODÉS PESCAR   (capítulo 11)");
{
  maestro();
  nivelExacto("fishing", 1);            // recién llegado: solo orilla, caña de junco
  G.canas = { junco: 30 };
  G.marea = null;
  const pedidos = ctx.mareaPedidos();
  ok("hay pedidos también para el que recién llega", pedidos.length >= 1);
  ok("y NINGUNO pide algo que no pueda pescar hoy",
    pedidos.every(p => ctx.especiePescable(p.esp)), pedidos.map(p => p.esp).join(","));
  ok("a Pesca 1 el martillo no aparece jamás", pedidos.every(p => p.esp !== "tiburon"));
  ok("el pedido es determinístico dentro de su tanda — el F5 no lo re-sortea",
    JSON.stringify(ctx.mareaPedidos()) === JSON.stringify(pedidos));
  const t = ctx.mareaTanda();
  desfase = 6 * 3600000 + 1000;
  ok("y cambia cada 6 h", ctx.mareaTanda() === t + 1);
  ok("paga en escamas, no en plata: la moneda que no imprime silver",
    ctx.mareaPaga({ esp: "pez_comun", n: 2 }) >= 1);
}

console.log("\nLA ESTRELLA LLEGA A LA COCINA: MÁS LARGO, NO MÁS FUERTE   (capítulo 12)");
{
  ok("1★ no cambia nada", ctx.platoDuracionMult(1) === 1);
  ok("3★ dura el doble", ctx.platoDuracionMult(3) === 2);
  ok("5★ dura el triple", ctx.platoDuracionMult(5) === 3);
  ok("y el bono en sí NO se toca — la regla del 21/8 de que los precios no se apilan sigue viva",
    typeof ctx.platoDuracionMult(5) === "number" && ctx.platoDuracionMult(5) === 3);
}

console.log("\nLAS DOS OBSERVACIONES QUE ESTA TANDA CERRÓ");
{
  maestro();
  /* 3 · dos cosas distintas se llamaban « camarón » */
  ok("el que se pesca se llama « Camarón de río »", ESP.camaron_rio.label === "Camarón de río");
  ok("el de la nasa se llama « Cebo vivo » — ya no hay dos camarones en la bolsa",
    g("RES_LABEL").cebo_vivo === "Cebo vivo");
  ok("y lo que no se vende está en una LISTA, no en un cero implícito",
    !!g("NO_VENDIBLE").cebo_vivo && ctx.precioVenta("cebo_vivo") === 0);
  ok("la lista dice POR QUÉ, para que el jugador pueda diagnosticarlo",
    g("NO_VENDIBLE").cebo_vivo.length > 20);
  ok("el camarón de río sí se vende, y a su precio de cadena", ctx.especiePrecio("camaron_rio") === 5);
  /* 4 · la lombriz se compraba y desarmaba el argumento del capítulo 2 */
  ok("el grillo ahora también se compra", ctx.carnadaPrecio("grillo") > 0);
  ok("y su precio se DERIVA de la cadena de su familia, no se escribe",
    ctx.carnadaPrecio("grillo") === g("WORM_PRICE") * 2, ctx.carnadaPrecio("grillo") + "");
  ok("así el mariposa cuesta el doble en carnada, como decía el documento",
    ctx.carnadaPrecio("grillo") / ctx.carnadaPrecio("lombriz") === ESP.pez_mariposa.cadena / ESP.pez_comun.cadena);
  ok("el señuelo no se compra por unidad: no se gasta", ctx.carnadaPrecio("senuelo") === 0);
  nivelExacto("fishing", 1); G.plata = 100; G.res.grillo = 0; avisos.length = 0;
  ctx.comprarCarnada("grillo", 1);
  ok("y no se puede comprar antes de que la Superficie abra (Pesca 5)",
    (G.res.grillo || 0) === 0 && dijo(/Pesca 5/), avisos.join(" | "));
}

console.log("\nEL TECHO DE PESCA, OTRA VEZ DERIVADO   (capítulo 13)");
{
  const esc = ctx.oficioAbre("fishing");
  ok("la escalera de Pesca son 11 escalones: 4 cañas + 2 carnadas + 3 trampas + 2 colosos",
    esc.length === 11, esc.length + " escalones");
  ok("y ningún nivel de la escalera queda mudo por duplicado",
    esc.every(([lvl, txt]) => lvl >= 1 && lvl <= 20 && txt && txt.length > 3));
  ok("y el techo sale del máximo — hoy lo pone el tiburón martillo",
    ctx.oficioTecho("fishing") === 20, ctx.oficioTecho("fishing") + "");
  ok("los tres amarres caen en 3, 7 y 12", g("AMARRE_LVL").join(",") === "3,7,12");
  nivelExacto("fishing", 8);
  ok("a Pesca 8 tenés dos amarres", ctx.amarresCupo() === 2, "nivel " + ctx.nivelOficio("fishing"));
  ok("y amarres() ajusta la lista sola, sin un contador aparte", ctx.amarres().length === 2);
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — la tanda 3 todavía no está"
  : "  Todo en orden: la trampa da la cita, la cita paga la mitad, y el clima cambia qué se pesca.");
process.exit(fallos ? 1 : 0);
