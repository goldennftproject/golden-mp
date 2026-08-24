/* EL LOGIN NO SE PUEDE COLGAR — NI INVENTAR UNA CUENTA (24/8, dirección)
   El cartel del arranque dio el nombre: « se colgó en LOGIN y no contestó en 45 s ». Y login
   es getSession(), que ni siquiera es una llamada de red: lee la sesión guardada. Se colgaba
   porque supabase-js v2 envuelve TODA operación de auth en un candado del navegador
   (navigator.locks) para que dos pestañas no refresquen el token a la vez — y si otra pestaña
   se quedó con el candado (dormida, colgada, cerrada de mala manera), la que abre después
   espera para siempre: el candado no vence. Con una pestaña no pasa nunca; con diez abiertas
   probando, pasa todo el rato.
   Contratos:
     · el cliente usa un candado de ESTA página (serializa igual, pero nadie de afuera lo toma);
     · cada paso del login tiene su tope de tiempo;
     · si getSession se cuelga Y HAY sesión guardada, se reintenta una vez y, si no, se falla:
       jamás se crea una cuenta nueva encima de una granja que existe;
     · si no hay nada guardado, es un navegador virgen y ahí sí se crea la cuenta;
     · y la versión de la librería está CLAVADA (venía como "@2" = la última de hoy, o sea que
       el login podía cambiar solo de un día para el otro).
     node tools/test-login-candado.js                                                            */
const fs = require("fs"), vm = require("vm");

const SAVE = fs.readFileSync("public/game/save.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* ---- se levanta SOLO el bloque del login, con un supabase de mentira controlable ---- */
function montar({ getSessionCuelga, hayGuardada, anonCuelga }) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array,
    Number, String, Boolean, Promise, setTimeout, clearTimeout, Error };
  ctx.window = ctx; ctx.globalThis = ctx;
  const llamadas = { getSession: 0, anon: 0 };
  ctx.localStorage = {
    getItem: (k) => (hayGuardada && /auth-token/.test(k)
      ? JSON.stringify({ user: { id: "el-de-siempre" } }) : null),
    setItem() {}, removeItem() {},
  };
  ctx.window.supabase = {
    createClient: (url, key, opts) => {
      ctx._opts = opts;
      return { auth: {
        getSession: () => { llamadas.getSession++;
          return getSessionCuelga ? new Promise(() => {}) : Promise.resolve({ data: { session: { user: { id: "el-de-siempre" } } } }); },
        signInAnonymously: () => { llamadas.anon++;
          return anonCuelga ? new Promise(() => {}) : Promise.resolve({ data: { session: { user: { id: "recien-nacido" } } }, error: null }); },
      } };
    },
  };
  vm.createContext(ctx);
  const ini = SAVE.indexOf("/* ================= EL LOGIN SE COLGABA");
  const fin = SAVE.indexOf("// campos de progreso que guardamos");
  /* var y no let: con `let` la variable no queda colgada del objeto global y la prueba no
     podría mirar UID desde afuera (el juego las declara con let, pero acá se necesita ver). */
  vm.runInContext('var SB_URL = "https://eusxpsmqczmczgyhndtd.supabase.co"; var SB_KEY = "x"; var sb = null, UID = null;\n'
    + SAVE.slice(ini, fin), ctx);
  return { ctx, llamadas };
}

(async () => {
  console.log("\nEL CAMINO NORMAL");
  {
    const { ctx, llamadas } = montar({});
    const r = await ctx.initSave();
    ok("entra con la sesión de siempre", r === true && ctx.UID === "el-de-siempre", ctx.UID);
    ok("y no crea ninguna cuenta", llamadas.anon === 0);
    ok("el cliente se arma con el candado de esta página", typeof (ctx._opts || {}).auth === "object" &&
      typeof ctx._opts.auth.lock === "function");
  }

  console.log("\nSI getSession SE CUELGA Y YA HAY CUENTA: FALLA, PERO NO PISA NADA");
  {
    const { ctx, llamadas } = montar({ getSessionCuelga: true, hayGuardada: true });
    const t0 = Date.now();
    const r = await ctx.initSave();
    const seg = (Date.now() - t0) / 1000;
    ok("no se queda colgado para siempre", seg < 20, seg.toFixed(1) + " s");
    ok("y devuelve que NO pudo", r === false);
    ok("reintentó una vez antes de rendirse", llamadas.getSession === 2, llamadas.getSession + " intentos");
    ok("JAMÁS creó una cuenta nueva (eso dejaría la granja huérfana)", llamadas.anon === 0);
    ok("y no se quedó con un UID inventado", !ctx.UID, String(ctx.UID));
  }

  console.log("\nSI SE CUELGA Y EL NAVEGADOR ESTÁ VIRGEN: SE CREA LA CUENTA (no hay nada que pisar)");
  {
    const { ctx, llamadas } = montar({ getSessionCuelga: true, hayGuardada: false });
    const r = await ctx.initSave();
    ok("entra con una cuenta nueva", r === true && ctx.UID === "recien-nacido", ctx.UID);
    ok("sin reintentar getSession (no hay nada guardado que rescatar)", llamadas.getSession === 1);
  }

  console.log("\nY SI LO QUE SE CUELGA ES LA CREACIÓN DE LA CUENTA");
  {
    const { ctx } = montar({ getSessionCuelga: true, hayGuardada: false, anonCuelga: true });
    const t0 = Date.now();
    const r = await ctx.initSave();
    ok("también tiene tope", (Date.now() - t0) / 1000 < 25, ((Date.now() - t0) / 1000).toFixed(1) + " s");
    ok("y avisa que no pudo", r === false);
  }

  console.log("\nEL CANDADO DE ESTA PÁGINA SIRVE PARA LO QUE TIENE QUE SERVIR");
  {
    const { ctx } = montar({});
    const orden = [];
    const lento = (ms, id) => () => new Promise(r => setTimeout(() => { orden.push(id); r(id); }, ms));
    await Promise.all([
      ctx.candadoDeEstaPagina("a", 0, lento(30, 1)),
      ctx.candadoDeEstaPagina("a", 0, lento(1, 2)),
      ctx.candadoDeEstaPagina("a", 0, lento(1, 3)),
    ]);
    ok("serializa: el segundo espera al primero aunque sea más rápido", orden.join("") === "123", orden.join(""));
    /* y un error adentro no rompe la cola para siempre (era el bug clásico de este patrón) */
    await ctx.candadoDeEstaPagina("a", 0, () => Promise.reject(new Error("plaf"))).catch(() => {});
    const despues = await ctx.candadoDeEstaPagina("a", 0, () => Promise.resolve("sigo vivo"));
    ok("y sobrevive a un error adentro", despues === "sigo vivo");
  }

  console.log("\nLA LIBRERÍA DEL LOGIN NO SE ACTUALIZA SOLA");
  {
    const src = (HTML.match(/supabase-js@([^/]+)\/dist/) || [])[1];
    ok("la versión está clavada, no es '@2'", /^\d+\.\d+\.\d+$/.test(src || ""), src);
    ok("y el juego la carga desde ahí", HTML.includes("supabase-js@" + src));
  }

  console.log(fallos ? "\n" + fallos + " fallo(s)\n"
    : "\nTodo en orden: el login contesta o falla, pero nunca cuelga ni inventa una granja.\n");
  process.exit(fallos ? 1 : 0);
})();
