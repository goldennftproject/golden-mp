/* LA COPIA SIN DUEÑO NO ENTRA POR LA PUERTA DEL CORREO                      (19/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La bitácora de Golden, tal cual la pegó:
     20:19:16  arranque · navegador virgen
     20:19:16  navegador virgen y SOLO_EMAIL: no se crea cuenta anónima, se pide el correo
     20:19:16  sin nube: se cargó la copia local · nivel 3
     20:19:36  SIN NUBE (base): se guarda solo en este navegador      ← cada dos minutos, dos horas
   Tres líneas seguidas que se contradicen: la segunda dice « se pide el correo » y la tercera
   lo mete a jugar igual, con una copia local que no es de ninguna cuenta. Y el aviso de « base
   de datos caída » era falso: la base estaba perfecta; lo que no había era sesión.
   El 18/9 cerré el camino en main.js. Pero loadFarm tiene el suyo propio, corre ANTES, y
   devolvía `true` con el apodo puesto — main.js ya no llegaba a mirar nada.

   Contratos:
     · con la puerta del correo puesta y sin cuenta, loadFarm NO carga la copia local;
     · la copia sin dueño se APARCA (otra clave), no se borra ni se deja donde compite;
     · una copia CON dueño (SOLO_LOCAL de una cuenta real, base caída) no se toca;
     · con la bandera apagada, todo sigue como el 25/8.
     node tools/test-copia-sin-dueno.js                                                           */
const fs = require("fs"), vm = require("vm");

const store = {};
const bitacora = [];
const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array,
  Number, String, Boolean, Set, Map, isNaN, isFinite, parseInt, parseFloat,
  performance: { now: () => 0 }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
ctx.location = { origin: "https://golden.test" };
ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
vm.createContext(ctx);
["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
["isOpen", "refreshInv", "refreshHud", "syncSlots", "recalcFarmLevel", "tutoEvent", "bagFull", "toast", "log"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
const G = ctx.G;

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const bit = () => JSON.parse(store["gf-sesion-log"] || "[]").map(e => e.que);
/* SB_REF es un const del archivo, no llega al contexto: la clave se saca de la primera copia escrita */
let COPIA, APARCADA;

function copiaSinDueno(nivel) {
  G.level = nivel; G.plata = 300;
  vm.runInContext('UID = "";', ctx);
  ctx.copiaGuardar(ctx.snapshot());
  const c = ctx.copiaLeer();
  if (c.uid) throw new Error("el arnés esperaba una copia sin uid");
  COPIA = Object.keys(store).find(k => /^gf-granja-copia-/.test(k)); APARCADA = COPIA.replace("copia", "aparcada");
  G.level = 1; G.plata = 0;
}
async function arranqueSinCuenta(puerta) {
  vm.runInContext('UID = ""; CUENTA_PREVIA = false; PUERTA_EMAIL = ' + (puerta ? "true" : "false") + '; CARGA_OK = false; SOLO_LOCAL = false; CARGA_FALLO = false; window.NICK = null;', ctx);
  return ctx.loadFarm();
}

(async () => {
  console.log("\n1 · EL CASO DE LA BITÁCORA: navegador virgen + copia sin dueño + puerta del correo\n");
  {
    copiaSinDueno(3);
    delete store["gf-sesion-log"];
    const r = await arranqueSinCuenta(true);
    ok("loadFarm NO dice « ya hay granja »", r === false, "devolvió " + r);
    ok("no hidrató la copia (el nivel sigue en 1)", (G.level || 1) === 1, "nivel " + G.level);
    ok("no puso apodo", !ctx.window.NICK);
    ok("y CARGA_OK queda en false: en la puerta no hay nada que guardar", ctx.CARGA_OK === false);
    ok("la copia ya no está en la clave viva (no puede competir con la granja de la nube)", !store[COPIA]);
    const ap = JSON.parse(store[APARCADA] || "null");
    ok("pero NO se borró: quedó aparcada", !!(ap && ap.data), ap && ("nivel " + ap.nivel));
    ok("con la hora en que se aparcó", !!(ap && ap.aparcadaAt));
    ok("y la bitácora lo dice con la causa de verdad", bit().some(q => /aparcada/.test(q)), bit().join(" | "));
    ok("y NO dice « sin nube: se cargó la copia local », que era la línea mentirosa", !bit().some(q => /se cargó la copia local/.test(q)));
    ok("hayGranjaLocal() ahora contesta que no (main.js va derecho a la puerta)", ctx.hayGranjaLocal() === false);
  }

  console.log("\n2 · SEGUNDO ARRANQUE: nada que aparcar, y no se pisa la aparcada\n");
  {
    const antes = store[APARCADA];
    const r = await arranqueSinCuenta(true);
    ok("sigue devolviendo false", r === false);
    ok("la aparcada sigue siendo la misma", store[APARCADA] === antes);
  }

  console.log("\n3 · UNA COPIA CON DUEÑO NO SE TOCA (cuenta real, base caída → SOLO_LOCAL)\n");
  {
    delete store[APARCADA];
    G.level = 7; G.plata = 900;
    vm.runInContext('UID = "cuenta-real";', ctx);
    ctx.copiaGuardar(ctx.snapshot());
    G.level = 1; G.plata = 0;
    vm.runInContext('UID = ""; CUENTA_PREVIA = true; PUERTA_EMAIL = false; CARGA_OK = false; SOLO_LOCAL = false; CARGA_FALLO = false;', ctx);
    const r = await ctx.loadFarm();
    ok("entra en modo SOLO LOCAL como el 25/8", r === true && ctx.SOLO_LOCAL === true);
    ok("con la granja de nivel 7", G.level === 7);
    ok("y no se aparcó nada", !store[APARCADA]);
    ok("la puerta del correo no se abre para el que ya tiene cuenta (PUERTA_EMAIL sigue false)", ctx.PUERTA_EMAIL === false);
  }

  console.log("\n4 · CON LA BANDERA APAGADA, EL CAMINO DEL 25/8 SIGUE ENTERO\n");
  {
    delete store[COPIA]; delete store[APARCADA];
    copiaSinDueno(4);
    const r = await arranqueSinCuenta(false);
    ok("sin puerta del correo, la copia sin dueño se carga como antes", r === true && G.level === 4, "nivel " + G.level);
    ok("y no se aparca", !store[APARCADA]);
  }

  console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ la copia sin dueño no entra por la puerta del correo, y no se pierde\n");
  process.exit(fallos ? 1 : 0);
})();
