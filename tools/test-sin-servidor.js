/* JUGAR CON EL SERVIDOR CAÍDO (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   ESTO NACE DE UNA CAPTURA. El proyecto de Supabase estaba REINICIÁNDOSE y el juego mostró
   « ⚠️ Nada se está guardando ». El aviso hizo su trabajo — dijo la verdad en vez de dejar
   jugar contra un guardado inexistente. Pero al ir a mirar por qué decía eso apareció algo peor:

       saveFarm() empezaba con  `if (!sb || !UID) { avisarSinNube(); return; }`
       y copiaGuardar(), la copia LOCAL, estaba doce líneas más abajo.

   O sea que la red de seguridad —escrita expresamente para cuando la nube falla— no se
   desplegaba justo cuando la nube fallaba. Y loadFarm tenía la mitad simétrica: sin nube salía
   con « navegador virgen: no hay nada que pisar » sin mirar la copia. Las dos juntas significan
   que un jugador podía jugar dos horas con el servidor caído y perderlo todo al recargar.

   La regla que esto defiende la dictó el diseñador, y es literal:
       « el único motivo por el cual se debe resetear una partida es cuando se actualiza
         borrando caché. Si el jugador no borra caché, entonces no tiene por qué resetearse. »
   Sin servidor NO es borrar caché. Así que la granja tiene que seguir ahí.
     node tools/test-sin-servidor.js                                                             */
const fs = require("fs"), vm = require("vm");

const T0 = 1755730800000; let desfase = 0;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + desfase); } static now() { return T0 + desfase; } }

/* un localStorage de verdad (con memoria): sin él no se puede probar nada de esto */
function nuevoCtx(almacen) {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date: FakeDate, JSON, Object, Array,
    Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
    performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.localStorage = {
    getItem: (k) => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
    removeItem: (k) => { delete almacen[k]; },
  };
  ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
  vm.createContext(ctx);
  ["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
  ctx.toast = (t) => avisos.push(String(t)); ctx.log = (t) => avisos.push(String(t));
  ["isOpen", "refreshInv", "refreshHud", "saveFarm_", "syncSlots", "showSaving", "recalcFarmLevel", "bagFull"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
  return ctx;
}
let avisos = [];
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const dijo = (re) => avisos.some(a => re.test(a));

/* el navegador del jugador: sobrevive entre "recargas" porque el almacén es el mismo objeto */
const navegador = {};

console.log("\nEL SERVIDOR SE CAE Y EL JUGADOR SIGUE JUGANDO");
let ctx = nuevoCtx(navegador);
{
  const G = ctx.G;
  /* sin nube: ni cliente ni UID, que es exactamente lo que pasa con el proyecto reiniciándose */
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = false; CARGA_OK = true;", ctx);
  avisos = [];
  G.plata = 1234; G.level = 7;
  ctx.saveFarm(true);
  ok("con el servidor caído, saveFarm NO se queda de brazos cruzados",
    !!navegador[vm.runInContext("GF_COPIA_KEY", ctx)], "hay copia local");
  const c = ctx.copiaLeer();
  ok("la copia guarda el progreso de verdad", c && c.plata === 1234 && c.nivel === 7,
    c ? "nivel " + c.nivel + " · " + c.plata + " plata" : "no hay copia");
  ok("la copia sabe que se hizo sin cuenta", c && !c.uid);
  /* LA REGLA 9: y lo dice, sin exagerar */
  ok("y el aviso dice la verdad NUEVA: se guarda acá, no allá",
    dijo(/este navegador/i), avisos.join(" | ").slice(0, 90));
  ok("ya no dice « nada se está guardando », porque sería mentira", !dijo(/Nada se está guardando/i));
}

console.log("\nEL AVISO DICE POR QUÉ, NO SOLO QUÉ   (dirección del 25/8)");
{
  /* « que diga no se puede conectar a la base de datos, o la base de datos en mantenimiento ».
     La razón de fondo: « sin conexión » no le dice al jugador si el problema es SUYO o NUESTRO,
     y de eso depende lo único que le importa — si puede hacer algo o solo le toca esperar. */
  /* el caso REAL de hoy: la librería cargó bien desde el CDN, pero el proyecto de Supabase
     estaba reiniciándose y signInAnonymously no devolvió sesión. O sea sb sí, UID no. */
  vm.runInContext("sb = { deMentira: true }; UID = null; navigator = { onLine: true };", ctx);
  const m = ctx.motivoSinNube();
  ok("con la librería cargada y sin sesión, la causa es la BASE DE DATOS", m.causa === "base", m.causa);
  ok("y lo dice con esas palabras", /base de datos/i.test(m.largo) && /base de datos/i.test(m.corto), m.corto);
  ok("nombra el mantenimiento, que es el caso que se vio hoy", /mantenimiento|reinici/i.test(m.largo));
  ok("y le quita la culpa al jugador en vez de dejarlo adivinando", /no es problema tuyo/i.test(m.largo));

  /* si el que está sin internet es ÉL, el mensaje tiene que ser otro: eso sí lo puede arreglar */
  ctx.navigator = { onLine: false };
  vm.runInContext("navigator = { onLine: false };", ctx);
  const mi = ctx.motivoSinNube();
  ok("si el que está caído es SU internet, se lo dice a él", mi.causa === "internet", mi.causa);
  ok("y no lo manda a esperar un mantenimiento que no existe", !/mantenimiento/i.test(mi.largo));
  vm.runInContext("navigator = { onLine: true };", ctx);

  /* y si ni siquiera cargó la librería, la salida es distinta otra vez */
  vm.runInContext("sb = null;", ctx);
  const ml = ctx.motivoSinNube();
  ok("si no cargó el sistema de guardado, apunta al bloqueador", ml.causa === "libreria", ml.causa);
  ok("las tres causas dan tres mensajes distintos",
    new Set([m.largo, mi.largo, ml.largo]).size === 3);
  ok("y las tres dicen que la granja se guarda igual — nadie se queda sin red",
    [m, mi, ml].every(x => /este navegador/i.test(x.largo)));
}

console.log("\nEL JUGADOR RECARGA — Y SU GRANJA SIGUE AHÍ");
{
  /* navegador NUEVO (contexto nuevo) pero el MISMO localStorage: eso es un F5 */
  ctx = nuevoCtx(navegador);
  const G = ctx.G;
  ok("antes de cargar, la granja está en blanco", (G.plata || 0) < 100 && (G.level || 1) === 1);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = false;", ctx);
  avisos = [];
  let volvio = null;
  ctx.loadFarm().then(r => { volvio = r; });
  /* loadFarm sale por el camino sin nube de forma síncrona hasta el primer await; se comprueba
     el efecto, que es lo que importa */
  ok("loadFarm carga la copia local en vez de empezar de cero",
    (ctx.G.plata || 0) === 1234 && (ctx.G.level || 1) === 7,
    "nivel " + ctx.G.level + " · " + Math.floor(ctx.G.plata) + " plata");
  ok("y lo dice, que es media mecánica", dijo(/copia|guardada|navegador/i), avisos.join(" | ").slice(0, 80));
  ok("el guardado queda AUTORIZADO: hay granja cargada", vm.runInContext("CARGA_OK", ctx) === true);
}

console.log("\nVUELVE EL SERVIDOR: EL PROGRESO DE LA SESIÓN CAÍDA NO SE TIRA");
{
  ctx = nuevoCtx(navegador);
  const G = ctx.G;
  vm.runInContext("UID = 'usuario-de-verdad';", ctx);
  /* la nube trae una granja VIEJA (la de antes de la caída) */
  G.level = 3; G.plata = 40;
  const c = ctx.copiaLeer();
  ok("la copia local sin dueño se considera, no se descarta", ctx.copiaEsMejor(c) === true,
    "copia nv" + c.nivel + " vs nube nv" + G.level);
  /* pero la de OTRO usuario, jamás */
  const ajena = Object.assign({}, c, { uid: "otro-usuario" });
  ok("la copia de OTRA cuenta no se toca ni de casualidad", ctx.copiaEsMejor(ajena) === false);
  /* y si la nube trae MÁS, manda la nube */
  G.level = 20; G.plata = 99999;
  ok("si la nube viene más adelantada, manda la nube", ctx.copiaEsMejor(c) === false);
}

console.log("\nEL APODO VUELVE CON LA GRANJA — si no, el arranque pide apodo y PARECE un reseteo");
{
  /* Éste es el que el diseñador ve en la pantalla: « con la base caída, si le doy F5 mi progreso
     se resetea ». La granja se hidrataba bien, pero window.NICK solo se rellenaba desde la fila
     de la nube — así que el arranque hacía `if (returning && window.NICK)`, daba falso POR EL
     NOMBRE, y caía en la puerta del apodo. Para el jugador eso es un reseteo: le está pidiendo
     el apodo, que es literalmente la pantalla de « sos nuevo ». */
  const nb = {};
  let cc = nuevoCtx(nb);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = false; CARGA_OK = true;", cc);
  cc.NICK = "Suren"; cc.G.plata = 3000; cc.G.level = 9;
  cc.saveFarm(true);
  ok("la copia se lleva el apodo", (cc.copiaLeer() || {}).nick === "Suren", (cc.copiaLeer() || {}).nick);

  cc = nuevoCtx(nb);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = false;", cc);
  ok("y al recargar el juego NO sabe todavía cómo te llamás", !cc.NICK);
  cc.loadFarm();
  ok("tras cargar la copia, el apodo volvió", cc.NICK === "Suren", cc.NICK || "(vacío)");
  ok("y la granja también", (cc.G.level || 1) === 9);
  /* LA CONDICIÓN EXACTA DEL ARRANQUE: main.js hace `if (returning && window.NICK) enterGame()`.
     Con las dos cosas puestas, entra directo en vez de pedir apodo. */
  ok("con granja Y apodo, el arranque entra directo — no hay puerta de apodo",
    !!(cc.G.level > 1) && !!cc.NICK);
  /* y jamás pisa un apodo ya puesto */
  cc.NICK = "OtroNombre";
  cc.copiaNick(cc.copiaLeer());
  ok("y nunca pisa un apodo que ya esté puesto", cc.NICK === "OtroNombre");
}

console.log("\nEL QUE JUGÓ SIN CUENTA NO PIERDE LAS HORAS CUANDO VUELVE LA BASE");
{
  /* El agujero que abrí yo hoy mismo: la copia sin dueño no contaba como « este navegador ya
     tenía granja », así que al volver el servicio el juego pedía apodo, creaba una cuenta
     ANÓNIMA NUEVA, la nube venía vacía… y la copia con nivel 11 quedaba huérfana. El mismo
     desastre del 24/8 por la puerta de al lado. */
  const solo = {};
  let cc = nuevoCtx(solo);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = false; CARGA_OK = true;", cc);
  cc.G.plata = 5000; cc.G.level = 11;
  cc.saveFarm(true);
  cc = nuevoCtx(solo);
  /* 25/8 (revisión): esta comprobación estaba escrita CON la confusión que después produjo el
     bloqueo — le preguntaba a huboGranja() (« ¿tuvo cuenta en la nube? ») algo que le toca a
     hayGranjaLocal() (« ¿hay partida guardada acá? »). La regla que hay que exigir es que el
     juego NO le pida el apodo, y eso lo decide la segunda. */
  ok("al volver la base, el juego SABE que hay una partida en este navegador",
    cc.hayGranjaLocal() === true, "si diera false, le pediría apodo y crearía cuenta nueva");
  ok("y NO la confunde con haber tenido cuenta en la nube — ahí estaba el bloqueo",
    cc.huboGranja() === false);
  ok("y la copia sigue ahí, con su progreso", (cc.copiaLeer() || {}).nivel === 11);
}

console.log("\nCON CUENTA Y LA BASE CAÍDA: SE JUEGA, PERO NO SE PISA LA NUBE");
{
  /* Éste le tocaba justo al que más juega. Con cuenta y sin poder entrar, el juego mostraba
     « No se pudo cargar tu granja » y ahí se terminaba: no se podía jugar, aunque la copia de
     este mismo navegador estuviera a un centímetro. */
  const suyo = {};
  let cc = nuevoCtx(suyo);
  vm.runInContext("UID = 'el-de-siempre'; sb = { x: 1 }; CARGA_OK = true;", cc);
  cc.G.plata = 8000; cc.G.level = 15;
  cc.copiaGuardar(cc.snapshot());

  cc = nuevoCtx(suyo);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = true;", cc);
  avisos = [];
  cc.loadFarm();
  ok("se puede jugar: se hidrató la copia de este navegador",
    (cc.G.level || 1) === 15, "nivel " + cc.G.level);
  ok("y NO queda en la pantalla de « no se pudo cargar »",
    vm.runInContext("CARGA_FALLO", cc) !== true);
  ok("pero la nube queda BLOQUEADA toda la sesión (modo solo local)",
    vm.runInContext("SOLO_LOCAL", cc) === true && vm.runInContext("CARGA_OK", cc) === false);
  ok("y el aviso explica las dos mitades: se juega acá, no se toca lo de allá",
    dijo(/este navegador/i) && dijo(/no se toca|NO se toca/i), avisos.join(" | ").slice(0, 100));
  /* y guardar SÍ escribe local… */
  cc.G.plata = 9999;
  cc.saveFarm(true);
  ok("guardar en modo solo local sí escribe la copia", (cc.copiaLeer() || {}).plata === 9999);
  /* …aunque la conexión vuelva a mitad de partida, NO sube: subir sin haber leído es lo que
     borró una granja el 24/8 */
  vm.runInContext("sb = { x: 1 }; UID = 'el-de-siempre';", cc);
  let subio = false;
  cc.sb = { from: () => { subio = true; return { upsert: () => ({ error: null }) }; }, functions: { invoke: () => { subio = true; return { data: { ok: true } }; } } };
  vm.runInContext("SOLO_LOCAL", cc);
  cc.G.plata = 12345;
  cc.saveFarm(true);
  ok("y si la conexión vuelve a mitad de partida, sigue SIN subir", subio === false,
    "se sube en la próxima carga, cuando se pueda LEER primero");

  /* sin copia local, el callejón sigue siendo lo correcto */
  const vacio = {};
  const c3 = nuevoCtx(vacio);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = true;", c3);
  c3.loadFarm();
  ok("sin copia local, con cuenta y sin entrar, SIGUE bloqueando (mejor eso que una granja en blanco)",
    vm.runInContext("CARGA_FALLO", c3) === true);
}

console.log("\nEL BLOQUEO CIRCULAR: jugó sin cuenta, vuelve la base, y el juego se negaba a entrar");
{
  /* EL FALLO QUE ESTO CLAVA, y me lo hice yo mismo esta tarde.
     Le saqué el `c.uid &&` a huboGranja() para que la copia local sin cuenta contara como granja.
     Y contaba — pero esa bandera la lee OTRO que decide otra cosa:

         initSave:  if (!session && CUENTA_PREVIA) return false;   // no crear cuenta nueva

     Esa guarda es del 24/8 y está bien. Solo que ahora, el que jugó sin cuenta con la base caída
     daba CUENTA_PREVIA = true, sin sesión y sin refresh_token que revivir… así que initSave se
     negaba a crear la cuenta que NUNCA TUVO. UID null → modo solo local → y en el próximo F5 lo
     mismo. Un bloqueo circular en el que la base online no cambiaba nada.
     Son dos preguntas distintas y estaban en una sola bandera. */
  const nb = {};
  let cc = nuevoCtx(nb);
  vm.runInContext("sb = null; UID = null; CUENTA_PREVIA = false; CARGA_OK = true;", cc);
  cc.NICK = "Suren"; cc.G.plata = 3000; cc.G.level = 9;
  cc.saveFarm(true);

  cc = nuevoCtx(nb);
  ok("la copia sin dueño NO cuenta como « tuvo cuenta en la nube »",
    cc.huboGranja() === false, "si diera true, initSave no crearía la cuenta que nunca tuvo");
  ok("pero SÍ cuenta como « hay una partida en este navegador »",
    cc.hayGranjaLocal() === true, "que es la otra pregunta, la que decide si se pide apodo");
  ok("y son dos funciones distintas, no una bandera para dos cosas",
    typeof cc.huboGranja === "function" && typeof cc.hayGranjaLocal === "function");

  /* con eso, initSave puede crear la cuenta: se simula que la base volvió */
  vm.runInContext("CUENTA_PREVIA = huboGranja();", cc);
  ok("CUENTA_PREVIA queda en false, así que initSave NO se bloquea",
    vm.runInContext("CUENTA_PREVIA", cc) === false);

  /* y al cargar con cuenta nueva, la nube viene vacía: la copia huérfana se sube */
  vm.runInContext("UID = 'cuenta-nueva'; sb = null;", cc);
  ok("la copia huérfana sigue disponible para subirse", (cc.copiaLeer() || {}).nivel === 9);
}

console.log("\nLO QUE NO SE PUEDE ROMPER AL ARREGLAR ESTO");
{
  /* la guarda del 18/8: si la granja nunca se cargó, no se escribe NADA — ni local. Guardar un
     estado que nunca se hidrató no es salvar: es fabricar la pérdida con otro nombre. */
  const otro = {};
  const c2 = nuevoCtx(otro);
  vm.runInContext("sb = null; UID = null; CARGA_OK = false;", c2);
  c2.G.plata = 777;
  c2.saveFarm(true);
  ok("si la granja NUNCA se cargó, no se guarda ni siquiera en local",
    !otro[vm.runInContext("GF_COPIA_KEY", c2)], "la guarda del 18/8 sigue en pie");

  /* y el orden importa: la copia se escribe ANTES de intentar la nube */
  const SRC = fs.readFileSync("public/game/save.js", "utf8");
  const cuerpo = SRC.slice(SRC.indexOf("async function saveFarm"));
  /* OJO: hay que buscar la LÍNEA DE CÓDIGO, no el texto. El comentario que explica este mismo
     arreglo cita la línea vieja (`if (!sb || !UID) …`) y el buscador la encontraba ahí primero,
     dando un falso rojo. Un medidor que lee comentarios como si fueran código no mide código. */
  const soloCodigo = cuerpo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const iCopia = soloCodigo.indexOf("copiaGuardar(snapshot())");
  const iNube = soloCodigo.indexOf("if (!sb || !UID)");
  ok("copiaGuardar corre ANTES de la comprobación de nube — ése era el bug",
    iCopia > 0 && iNube > 0 && iCopia < iNube, "copia en " + iCopia + ", nube en " + iNube);
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — sin servidor todavía se pierde la granja"
  : "  Todo en orden: sin servidor se juega, se guarda y al volver se sube.");
process.exit(fallos ? 1 : 0);
