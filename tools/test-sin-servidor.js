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
