/* LA CUENTA SOBREVIVE AL NAVEGADOR (22/8, dirección)
   El login anónimo muere con el navegador (la tabla farms juntó 100+ "Granjero" en el testeo).
   El contrato nuevo, probado con el panel REAL de Configuración (jsdom) y un Supabase de
   mentira que anota cada llamada:
     · VINCULAR ata el email a la cuenta anónima ACTUAL (updateUser) — la granja no cambia;
     · ENTRAR manda el enlace mágico (signInWithOtp) SIN crear cuentas nuevas
       (shouldCreateUser: false — entrar con un email sin cuenta no fabrica otro "Granjero");
     · el estado se pinta según la cuenta (anónima / guardada / sin nube);
     · emails inválidos no viajan a la red; el panel no cambia de estructura (regla de UI).
     node tools/test-cuenta-email.js                                                            */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");

function armar(fakeUser) {
  const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"));
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, JSON, Object, Array,
    Number, String, Boolean, Set, Map, Promise, isNaN, isFinite, parseInt, parseFloat,
    performance: { now: () => 0 }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; }, setInterval: () => 0, clearInterval() {},
    document: dom.window.document, Image: dom.window.Image,
    location: { search: "", hash: "", origin: "https://juego.test", pathname: "/" } };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  vm.createContext(ctx);
  ["config", "nav", "state", "save", "ui"].forEach(f => vm.runInContext(fs.readFileSync("public/game/" + f + ".js", "utf8"), ctx));
  ctx.avisos = [];
  ctx.toast = t => ctx.avisos.push(String(t)); ctx.log = t => ctx.avisos.push(String(t));
  ["isOpen", "refreshInv", "syncSlots", "refreshHud", "celebrate", "sfx", "tutoRefresh", "tutoCheck",
   "refreshSeedShop", "refreshHotbar", "tutoSync", "syncCobertizo", "saveFarm"].forEach(f => { if (!ctx[f]) ctx[f] = () => {}; });
  ctx.askConfirm = (msg, si) => { ctx.avisos.push("CONFIRM: " + msg); si && si(); };   // el confirm siempre acepta
  const llamadas = { updateUser: null, signInWithOtp: null };
  const sb = { auth: {
    getUser: async () => ({ data: { user: fakeUser } }),
    updateUser: async (x) => { llamadas.updateUser = x; return { error: null }; },
    signInWithOtp: async (x) => { llamadas.signInWithOtp = x; return { error: null }; },
  } };
  vm.runInContext("(function(x){ sb = x; UID = 'uid-test'; })", ctx)(sb);
  return { ctx, dom, llamadas, doc: dom.window.document };
}
const espera = () => new Promise(r => setImmediate(r));

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

(async () => {
  console.log("\nCUENTA ANÓNIMA: EL PANEL LO DICE Y OFRECE GUARDARLA");
  {
    const { ctx, doc, llamadas } = armar({ id: "uid-test", email: null });
    ctx.refreshConfig(); await espera(); await espera();
    ok("el estado dice 'anónima' y que vive solo acá", /anónima/.test(doc.getElementById("cfg-auth-status").textContent));
    ok("la estructura del bloque está completa (input + 2 botones + nota, siempre)",
      !!doc.getElementById("cfg-email") && !!doc.getElementById("cfg-vincular") && !!doc.getElementById("cfg-entrar") && !!doc.getElementById("cfg-auth-nota"));
    /* vincular con email inválido: NO viaja a la red */
    doc.getElementById("cfg-email").value = "esto-no-es-un-email";
    doc.getElementById("cfg-vincular").onclick(); await espera();
    ok("un email inválido no llega a Supabase", llamadas.updateUser === null && ctx.avisos.some(a => /válido/.test(a)));
    /* vincular de verdad */
    doc.getElementById("cfg-email").value = "golden@granja.com";
    doc.getElementById("cfg-vincular").onclick(); await espera(); await espera();
    ok("vincular llama a updateUser con el email (ata la cuenta ACTUAL)",
      !!llamadas.updateUser && llamadas.updateUser.email === "golden@granja.com", JSON.stringify(llamadas.updateUser));
    ok("y avisa que revise el correo", ctx.avisos.some(a => /Revisá|correo/.test(a)));
  }

  console.log("\nENTRAR CON EMAIL: ENLACE MÁGICO, SIN FABRICAR CUENTAS");
  {
    const { ctx, doc, llamadas } = armar({ id: "uid-test", email: null });
    doc.getElementById("cfg-email").value = "surenn@granja.com";
    ctx.refreshConfig(); await espera();
    doc.getElementById("cfg-entrar").onclick(); await espera(); await espera();
    ok("antes de mandar nada, avisa que la granja anónima queda aparte",
      ctx.avisos.some(a => /CONFIRM:.*quedará aparte/.test(a)));
    ok("manda el enlace con signInWithOtp al email", !!llamadas.signInWithOtp && llamadas.signInWithOtp.email === "surenn@granja.com");
    ok("y con shouldCreateUser: false — un email sin cuenta NO fabrica otro Granjero",
      llamadas.signInWithOtp.options && llamadas.signInWithOtp.options.shouldCreateUser === false);
    ok("el enlace vuelve al juego (redirect a la URL del juego)",
      /juego\.test/.test((llamadas.signInWithOtp.options || {}).emailRedirectTo || ""));
  }

  console.log("\nCUENTA YA GUARDADA: EL PANEL LO CELEBRA Y NO RE-VINCULA");
  {
    const { ctx, doc } = armar({ id: "uid-test", email: "golden@granja.com" });
    ctx.refreshConfig(); await espera(); await espera();
    ok("el estado muestra el email guardado", /golden@granja\.com/.test(doc.getElementById("cfg-auth-status").textContent));
    ok("y el botón de vincular queda apagado", doc.getElementById("cfg-vincular").disabled === true);
  }

  console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la granja ya puede seguir a su dueño.\n");
  process.exit(fallos ? 1 : 0);
})();
