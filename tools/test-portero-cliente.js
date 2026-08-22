/* EL PORTERO, DEL LADO DEL JUEGO: saveFarm ENTRA POR LA PUERTA NUEVA (21/8)
   Se carga el save.js real con un Supabase de mentira que anota cada llamada, y se
   verifica el contrato de la transición:
     1. con la Edge Function viva, el guardado va por ella y NO toca la tabla directo;
     2. si la función no está (aún sin deployar), cae al camino viejo y nadie pierde
        su guardado;
     3. si las dos puertas fallan, lastSavedKey no avanza (el autosave reintenta).
     node tools/test-portero-cliente.js                                                         */
const fs = require("fs"), vm = require("vm");

function armarContexto() {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
    Number, String, Boolean, Set, Map, Promise, isNaN, isFinite, parseInt, parseFloat,
    performance: { now: () => 0 }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; },
    setInterval: () => 0, clearInterval() {}, clearTimeout() {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.document = { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) };
  vm.createContext(ctx);
  ["config", "nav", "state", "save"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
  ["toast", "log", "isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh",
   "tutoCheck", "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "refreshMarket",
   "showSaving", "showSaved"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
  /* sleepMs no demora: usa setTimeout, y el setTimeout de este contexto dispara al instante */
  return ctx;
}

/* el Supabase de mentira: anota cada llamada y responde lo que el caso pida */
function armarSb(ctx, { funcionViva, tablaViva }) {
  const llamadas = { invoke: 0, upsert: 0 };
  const sb = {
    functions: {
      invoke: async (nombre, opts) => {
        llamadas.invoke++; llamadas.invokeNombre = nombre; llamadas.cuerpo = opts && opts.body;
        return funcionViva ? { data: { ok: true, sospechas: 0 }, error: null }
                           : { data: null, error: { message: "Function not found" } };
      }
    },
    from: () => ({
      upsert: async () => { llamadas.upsert++; return tablaViva ? { error: null } : { error: { message: "RLS: permiso denegado" } }; }
    })
  };
  vm.runInContext("(function(x){ sb = x; UID = 'test-uid'; CARGA_OK = true; })", ctx)(sb);
  return llamadas;
}

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

(async () => {
  console.log("\nCON EL PORTERO VIVO: TODO ENTRA POR LA FUNCIÓN, NADA DIRECTO A LA TABLA");
  {
    const ctx = armarContexto();
    const ll = armarSb(ctx, { funcionViva: true, tablaViva: true });
    await ctx.saveFarm(true);
    ok("saveFarm llamó a la Edge Function 'guardar'", ll.invoke === 1 && ll.invokeNombre === "guardar");
    ok("con el paquete completo ({ name, data })", !!(ll.cuerpo && ll.cuerpo.data && "plata" in ll.cuerpo.data), Object.keys(ll.cuerpo || {}).join(","));
    ok("y NO tocó la tabla directo", ll.upsert === 0, ll.upsert + " upserts");
    const clave = vm.runInContext("lastSavedKey !== null", ctx);
    ok("el guardado quedó marcado como persistido", clave === true);
  }

  console.log("\nSIN LA FUNCIÓN DEPLOYADA: CAE AL CAMINO VIEJO (nadie pierde su guardado)");
  {
    const ctx = armarContexto();
    const ll = armarSb(ctx, { funcionViva: false, tablaViva: true });
    await ctx.saveFarm(true);
    ok("intentó primero por el portero", ll.invoke >= 1);
    ok("y al no estar, guardó por la tabla como siempre", ll.upsert === 1, ll.upsert + " upserts");
    ok("y quedó persistido igual", vm.runInContext("lastSavedKey !== null", ctx) === true);
  }

  console.log("\nSI LAS DOS PUERTAS SE CAEN: EL AUTOSAVE SE QUEDA CON GANAS DE REINTENTAR");
  {
    const ctx = armarContexto();
    armarSb(ctx, { funcionViva: false, tablaViva: false });
    await ctx.saveFarm(true);
    ok("lastSavedKey no avanza: el próximo ciclo lo vuelve a intentar", vm.runInContext("lastSavedKey === null", ctx) === true);
  }

  console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: una sola puerta, y la transición no deja a nadie afuera.\n");
  process.exit(fallos ? 1 : 0);
})();
