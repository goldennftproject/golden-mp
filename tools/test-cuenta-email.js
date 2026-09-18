/* LA CUENTA SOBREVIVE AL NAVEGADOR — SEGUNDA VERSIÓN      (22/8 · reescrito el 18/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   La primera versión probaba el panel de cuando una granja podía NO tener correo: dos botones,
   « Guardar mi cuenta » (atarle un email a la cuenta anónima) y « Entrar con mi email » (traer
   otra granja desde este navegador), y el estado « anónima ».

   El 18/9 dirección cerró esa puerta: « no va a existir más jugadores sin correo, desde el
   minuto cero el juego te pide correo ». Con eso, los dos botones se quedaron sin caso y el
   panel se quedó con uno solo: CERRAR SESIÓN. Este archivo se reescribió entero en vez de
   parcharse, porque un test que custodia botones que ya no existen no protege nada: solo se
   pone rojo el día que alguien limpia, que es exactamente al revés de para qué sirve.

   Lo que custodia ahora, con el panel REAL (jsdom) y un Supabase de mentira que anota todo:
     · el panel dice de quién es la granja, con el correo a la vista;
     · el botón de salir existe, y no se enciende si no hay nube;
     · y sobre todo EL ORDEN al salir: guardar → cerrar → borrar nuestras marcas. Si se invierte,
       el jugador pierde lo último jugado o vuelve a entrar solo.
     node tools/test-cuenta-email.js                                                           */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

function armar(fakeUser, opts) {
  opts = opts || {};
  const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"));
  const orden = [];              // en qué orden pasaron las cosas al salir
  const borradas = [];           // qué llaves se borraron del navegador
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
    Number, String, Boolean, Set, Map, Promise, isNaN, isFinite, parseInt, parseFloat,
    performance: { now: () => 0 }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; }, setInterval: () => 0, clearInterval() {},
    document: dom.window.document, Image: dom.window.Image,
    location: { search: "", hash: "", origin: "https://juego.test", pathname: "/", reload: () => orden.push("reload") } };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem: (k) => { borradas.push(k); orden.push("borrar:" + k); } };
  vm.createContext(ctx);
  ["config", "nav", "state", "save", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
  ctx.avisos = [];
  ctx.toast = t => ctx.avisos.push(String(t)); ctx.log = t => ctx.avisos.push(String(t));
  ["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
   "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
  ctx.askConfirm = (msg, si) => { ctx.avisos.push("CONFIRM: " + msg); si && si(); };   // el confirm siempre acepta
  const llamadas = { signOut: 0, guardados: 0 };
  /* el saveFarm de verdad necesita media granja montada; acá interesa CUÁNDO se llama, no qué
     escribe, así que se reemplaza por uno que solo deja constancia */
  vm.runInContext("(function(f){ saveFarm = f; })", ctx)(async (force) => {
    llamadas.guardados++; orden.push("guardar" + (force ? ":force" : "")); return true;
  });
  const sb = opts.sinNube ? null : { auth: {
    getUser: async () => ({ data: { user: fakeUser } }),
    signOut: async () => { llamadas.signOut++; orden.push("cerrar"); return { error: null }; },
    signInWithOtp: async () => ({ error: null }),
  } };
  vm.runInContext("(function(x, u){ sb = x; UID = u; })", ctx)(sb, opts.sinNube ? null : "uid-test");
  return { ctx, dom, llamadas, orden, borradas, doc: dom.window.document };
}
const espera = () => new Promise(r => setImmediate(r));

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

(async () => {
  console.log("\n1 · EL PANEL DICE DE QUIÉN ES LA GRANJA\n");
  {
    const { ctx, doc } = armar({ id: "uid-test", email: "golden@granja.com" });
    ctx.refreshConfig(); await espera(); await espera();
    ok("el estado muestra el correo de la cuenta",
      /golden@granja\.com/.test(doc.getElementById("cfg-auth-status").textContent));
    ok("hay un botón para salir", !!doc.getElementById("cfg-salir"));
    ok("y con la cuenta a la vista queda encendido", doc.getElementById("cfg-salir").disabled === false);
    /* los botones del panel viejo ya no están: un botón que nunca se enciende no es una opción,
       es una duda. Si vuelven algún día, que sea a propósito y no por arrastre */
    ok("« Guardar mi cuenta » ya no está (no hay a quién atarle un correo)", !doc.getElementById("cfg-vincular"));
    ok("« Entrar con mi email » tampoco: eso lo hace la puerta de entrada", !doc.getElementById("cfg-entrar"));
  }

  console.log("\n2 · SIN NUBE NO SE OFRECE SALIR   (no habría con qué guardar antes)\n");
  {
    const { ctx, doc } = armar(null, { sinNube: true });
    ctx.refreshConfig(); await espera(); await espera();
    ok("el estado lo dice", /Sin conexión/.test(doc.getElementById("cfg-auth-status").textContent));
    ok("y el botón queda apagado", doc.getElementById("cfg-salir").disabled === true);
  }

  console.log("\n3 · AL SALIR, EL ORDEN   (guardar → cerrar → borrar las marcas)\n");
  {
    const { ctx, doc, llamadas, orden, borradas } = armar({ id: "uid-test", email: "golden@granja.com" });
    ctx.refreshConfig(); await espera(); await espera();
    doc.getElementById("cfg-salir").onclick(); await espera(); await espera(); await espera();
    ok("avisa antes de hacer nada", ctx.avisos.some(a => /CONFIRM:/.test(a)));
    ok("y el aviso NOMBRA el correo con el que se vuelve",
      ctx.avisos.some(a => /CONFIRM:.*golden@granja\.com/.test(a)));
    ok("guardó", llamadas.guardados === 1, JSON.stringify(orden));
    ok("y guardó con force (si no, un guardado « que no tocaba » se saltea)",
      orden.indexOf("guardar:force") >= 0);
    ok("cerró la sesión", llamadas.signOut === 1);
    ok("GUARDÓ ANTES DE CERRAR (al revés se pierde lo último jugado)",
      orden.indexOf("guardar:force") >= 0 && orden.indexOf("cerrar") > orden.indexOf("guardar:force"));
    /* ésta es la que hace que un botón de logout « no funcione »: el arranque revive la sesión
       con el refresh token que guardamos NOSOTROS, así que si la marca queda, el jugador se
       desconecta y vuelve a entrar solo en la recarga siguiente */
    ok("borró nuestra copia de la llave (si no, el arranque revive la sesión)",
      borradas.some(k => /^gf-cuenta-/.test(k)), borradas.join(" · "));
    ok("y la copia local de la granja", borradas.some(k => /^gf-granja-copia-/.test(k)));
    ok("y las borró DESPUÉS de cerrar, no antes", orden.indexOf("cerrar") < orden.findIndex(x => /^borrar:/.test(x)));
    ok("y recién al final recarga", orden[orden.length - 1] === "reload", orden.join(" → "));
  }

  console.log("\n4 · Y NO SE SALE DE UNA CUENTA SIN CORREO   (seguro por si se apaga la bandera)\n");
  {
    const { ctx, doc, llamadas } = armar({ id: "uid-test", email: null });
    ctx.refreshConfig(); await espera(); await espera();
    /* el botón no se enciende, pero el seguro está en la función: se la llama a mano, que es lo
       que haría el código si algún día alguien cambia la UI sin mirar esto */
    const r = await vm.runInContext("cerrarSesion()", ctx);
    ok("se niega", !!(r && r.error), JSON.stringify(r));
    ok("sin haber cerrado nada", llamadas.signOut === 0);
    ok("y sin haber borrado nada", llamadas.guardados === 0);
  }

  console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la granja sigue a su dueño, y salir no le cuesta nada.\n");
  process.exit(fallos ? 1 : 0);
})();
