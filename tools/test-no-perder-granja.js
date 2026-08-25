/* LA GRANJA NO SE PIERDE NUNCA (24/8 — el fallo más caro de la sesión)
   Dirección: « ahora me reinicia el avance… empecé de cero y ahora me manda de cero 3 h después ».
   La cadena, entera, porque conviene tenerla escrita:
     initSave no puede entrar (candado, red, lo que sea) → devuelve false → loadFarm sale por su
     primera línea, « sin nube no hay nada que pisar », marcando CARGA_OK → el arranque no ve
     ningún fallo → abre LA PUERTA DEL APODO → el jugador escribe su nombre → se crea una cuenta
     anónima NUEVA → granja vacía, y la vieja huérfana para siempre bajo el UID anterior.
   Un problema de un minuto costaba tres horas de juego. Y el arreglo del login lo hizo MÁS
   probable, porque agregó caminos por los que initSave devuelve false.
   LA REGLA: la puerta del apodo es SOLO para navegadores vírgenes. Si hay sesión guardada, este
   navegador ya tiene granja y no se pide apodo: se avisa y no se toca nada. Perder una sesión
   es feo; perder la granja es imperdonable — por eso la reja está TRES veces (loadFarm, el
   arranque y el botón Entrar) y esta prueba las cuenta una por una.
     node tools/test-no-perder-granja.js                                                         */
const fs = require("fs"), vm = require("vm");

const SAVE = fs.readFileSync("public/game/save.js", "utf8");
const MAIN = fs.readFileSync("public/game/main.js", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nREJA 1 · loadFarm NO AUTORIZA A ESCRIBIR SI HAY CUENTA Y NO SE PUDO ENTRAR");
{
  const f = SAVE.slice(SAVE.indexOf("async function loadFarm"), SAVE.indexOf("async function loadFarm") + 1200);
  ok("mira si este navegador ya tenía cuenta", /if \(CUENTA_PREVIA\)/.test(f));
  ok("y en ese caso marca FALLO en vez de dar el visto bueno", /CARGA_FALLO = true;/.test(f));
  ok("el visto bueno queda solo para el navegador virgen", /CARGA_OK = true; return false;\s*\/\/ navegador virgen/.test(f));
  ok("y el guardado se bloquea sin CARGA_OK", /if \(!CARGA_OK\) \{ console\.warn\("saveFarm bloqueado/.test(SAVE));
}

console.log("\nREJA 2 · EL ARRANQUE NO PIDE APODO SI YA HAY GRANJA");
{
  const bloque = MAIN.slice(MAIN.indexOf("ÚLTIMA REJA ANTES DE LA PUERTA"), MAIN.indexOf("})();"));
  ok("comprueba la cuenta previa antes de mostrar la puerta", /if \(typeof CUENTA_PREVIA !== "undefined" && CUENTA_PREVIA\)/.test(bloque));
  ok("y muestra la pantalla de 'no se pudo' en su lugar", /return pantallaNoSePudo\(\);/.test(bloque));
  ok("la comprobación va ANTES de abrir la puerta",
    bloque.indexOf("CUENTA_PREVIA") < bloque.indexOf('getElementById("gate").style.display = "flex"'));
}

console.log("\nREJA 3 · EL BOTÓN ENTRAR, QUE ES EL QUE CONSUMA LA PÉRDIDA");
{
  const b = MAIN.slice(MAIN.indexOf('getElementById("enter").addEventListener'), MAIN.indexOf('getElementById("enter").addEventListener') + 900);
  ok("se corta si hay cuenta previa y no hay sesión abierta", /CUENTA_PREVIA && !UID/.test(b));
  ok("antes de tocar el apodo o guardar nada",
    b.indexOf("CUENTA_PREVIA") < b.indexOf("window.NICK ="));
}

console.log("\nY EL CARTEL LE DICE AL JUGADOR QUE NO EMPIECE DE NUEVO");
{
  const p = MAIN.slice(MAIN.indexOf("function pantallaNoSePudo"), MAIN.indexOf("function pantallaNoSePudo") + 1400);
  ok("dice que la granja sigue guardada", /sigue guardada en tu cuenta/.test(p));
  ok("y le pide EXPLÍCITAMENTE que no arranque una partida nueva", /NO empieces una partida nueva/.test(p));
  ok("esconde el campo del apodo", /getElementById\("nick"\); if \(n\) n\.style\.display = "none"/.test(p));
  ok("y no repite el cartel si se lo llama dos veces", /if \(!g\.querySelector\("\.gf-motivo"\)\)/.test(p));
}

console.log("\nLA CADENA COMPLETA, CORRIDA DE VERDAD");
{
  /* se monta el bloque del login con un supabase colgado y una sesión guardada: el caso exacto
     que le pasó a dirección. Tiene que terminar en "no se pudo", jamás en cuenta nueva. */
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array,
    Number, String, Boolean, Promise, setTimeout, clearTimeout, Error };
  ctx.window = ctx; ctx.globalThis = ctx;
  let anons = 0;
  ctx.localStorage = { getItem: (k) => (/auth-token/.test(k) ? JSON.stringify({ user: { id: "la-de-siempre" } }) : null), setItem() {}, removeItem() {} };
  ctx.window.supabase = { createClient: () => ({ auth: {
    getSession: () => new Promise(() => {}),                    // colgado, como el candado
    signInAnonymously: () => { anons++; return Promise.resolve({ data: { session: { user: { id: "nueva" } } }, error: null }); },
  } }) };
  vm.createContext(ctx);
  const ini = SAVE.indexOf("/* ================= EL LOGIN SE COLGABA");
  const fin = SAVE.indexOf("// campos de progreso que guardamos");
  vm.runInContext('var SB_URL = "https://ref.supabase.co"; var SB_KEY = "x"; var sb = null, UID = null;\n' + SAVE.slice(ini, fin), ctx);
  return ctx.initSave().then(r => {
    ok("initSave avisa que no pudo", r === false);
    ok("detectó que este navegador YA tenía cuenta", ctx.CUENTA_PREVIA === true);
    ok("y NO creó ninguna cuenta nueva", anons === 0, anons + " cuentas creadas");
    ok("ni se quedó con un UID que no es suyo", !ctx.UID, String(ctx.UID));
    console.log(fallos ? "\n" + fallos + " fallo(s)\n"
      : "\nTodo en orden: si no se puede entrar, se avisa. Nunca se empieza de cero por su cuenta.\n");
    process.exit(fallos ? 1 : 0);
  });
}
