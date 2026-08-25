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
  /* 25/8: la ventana era de 1200 caracteres y la rama « sin nube » creció al mirar la copia
     local, así que el trozo se cortaba antes de llegar a lo que había que comprobar. Se recorta
     por donde EMPIEZA lo siguiente, no por un número de caracteres que envejece con el archivo. */
  const f = SAVE.slice(SAVE.indexOf("async function loadFarm"), SAVE.indexOf("for (let intento", SAVE.indexOf("async function loadFarm")));
  ok("mira si este navegador ya tenía cuenta", /if \(CUENTA_PREVIA\)/.test(f));
  ok("y en ese caso marca FALLO en vez de dar el visto bueno", /CARGA_FALLO = true;/.test(f));
  /* 25/8 (revisión): la rama « sin nube » ya no es una sola línea — antes de rendirse mira la
     copia local, porque un navegador con granja guardada y sin servidor NO es un navegador
     virgen. Lo que este medidor tiene que exigir sigue siendo lo mismo: que el `return false`
     (« no hay granja, pedí apodo ») quede SOLO para el que de verdad no tiene nada. */
  ok("el visto bueno de « no hay nada » queda solo para el navegador virgen de verdad",
    /CARGA_OK = true; return false;\s*\/\/ navegador virgen de verdad/.test(f));
  ok("y antes de rendirse mira si hay copia local — sin servidor no es lo mismo que sin granja",
    /copiaLeer/.test(f) && /return true;/.test(f));
  /* 25/8 — LA REGLA SE PARTIÓ EN DOS PERMISOS, Y ESTÁ BIEN QUE ASÍ SEA. « Sin CARGA_OK no se
     escribe » mezclaba dos cosas distintas: escribir en la NUBE (que sin haber leído es lo que
     borró una granja el 24/8) y escribir en ESTE navegador (que no puede pisar nada de nadie).
     Juntas dejaban al jugador con cuenta en un callejón sin salida cuando la base se caía.
     Lo que este medidor tiene que seguir exigiendo es lo importante: que a la NUBE no se suba
     nada sin haber leído primero. */
  ok("guardar sigue bloqueado si nunca hubo hydrate", /if \(!CARGA_OK && !SOLO_LOCAL\) \{ console\.warn\("saveFarm bloqueado/.test(SAVE));
  ok("y en modo solo local NO se sube a la nube, ni aunque vuelva la conexión",
    /if \(SOLO_LOCAL\) return;/.test(SAVE));
  ok("SOLO_LOCAL solo se enciende habiendo hidratado una copia de verdad",
    /SOLO_LOCAL = true;\s*\n\s*hydrate\(local\.data\);/.test(SAVE));
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

console.log("\nNUESTRA PROPIA COPIA DE LA LLAVE (la librería borra la suya sola)");
{
  /* No es una sospecha: en el código de supabase-js, getSession llama a _removeSession() cuando
     considera inválida la sesión guardada. Después de eso el navegador PARECE recién estrenado,
     y la reja de arriba no tendría nada que detectar. */
  ok("guardamos una marca con nuestra propia llave", /const GF_CUENTA_KEY = "gf-cuenta";/.test(SAVE));
  ok("con el uid y el refresh token", /uid: session\.user\.id, refresh_token: session\.refresh_token/.test(SAVE));
  /* 25/8 v2: son TRES pruebas — la sesión de supabase, nuestra marca, y la copia de la granja.
     Alcanza con una para que la puerta del apodo no se abra. */
  ok("y « hubo granja » mira las TRES pruebas",
    /if \(sesionGuardada\(\)\) return true;/.test(SAVE) &&
    /if \(\(marcaCuenta\(\) \|\| \{\}\)\.uid\) return true;/.test(SAVE) &&
    /typeof copiaLeer === "function"/.test(SAVE));
  ok("y ninguna prueba que falle puede tirar a las otras", (SAVE.match(/\} catch \(e\) \{\}/g) || []).length >= 3,
    "cada una en su propio try");
  ok("la reja usa esa pregunta, no solo la sesión de supabase", /CUENTA_PREVIA = huboGranja\(\);/.test(SAVE));
  ok("antes de crear una cuenta, se INTENTA REVIVIR la de siempre", /refreshSession\(\{ refresh_token: marca\.refresh_token \}\)/.test(SAVE));
  ok("y si no se puede revivir, no se crea ninguna", /if \(!session && CUENTA_PREVIA\) \{/.test(SAVE));
  ok("la copia se mantiene fresca en cada renovación",
    /onAuthStateChange\(\(ev, s\) => \{[\s\S]{0,400}if \(s && s\.user\) marcarCuenta\(s\);/.test(SAVE));
  ok("y se guarda apenas se entra", /marcarCuenta\(session\);\s*\/\/ nuestra copia de la llave/.test(SAVE));
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
  return ctx.initSave().then(async (r) => {
    ok("initSave avisa que no pudo", r === false);
    ok("detectó que este navegador YA tenía cuenta", ctx.CUENTA_PREVIA === true);
    ok("y NO creó ninguna cuenta nueva", anons === 0, anons + " cuentas creadas");
    ok("ni se quedó con un UID que no es suyo", !ctx.UID, String(ctx.UID));

    /* --- el caso que la reja sola NO cubría: supabase borró su sesión, pero nosotros tenemos
       la copia. Tiene que REVIVIR la de siempre, no crear una nueva. --- */
    console.log("\nEL CASO FEO: SUPABASE BORRÓ SU SESIÓN Y NOSOTROS TENEMOS LA COPIA");
    const ctx2 = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array,
      Number, String, Boolean, Promise, setTimeout, clearTimeout, Error };
    ctx2.window = ctx2; ctx2.globalThis = ctx2;
    let anons2 = 0, revividas = 0;
    const guardado = { "gf-cuenta": JSON.stringify({ uid: "la-de-siempre", refresh_token: "la-llave", at: 1 }) };
    ctx2.localStorage = { getItem: (k) => guardado[k] || null, setItem(k, v) { guardado[k] = v; }, removeItem(k) { delete guardado[k]; } };
    ctx2.window.supabase = { createClient: () => ({ auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),        // la borró la librería
      refreshSession: ({ refresh_token }) => { revividas++;
        return Promise.resolve(refresh_token === "la-llave"
          ? { data: { session: { user: { id: "la-de-siempre" }, refresh_token: "llave-nueva" } }, error: null }
          : { data: { session: null }, error: { message: "token inválido" } }); },
      signInAnonymously: () => { anons2++; return Promise.resolve({ data: { session: { user: { id: "nueva" } } }, error: null }); },
      onAuthStateChange: () => {},
    } }) };
    vm.createContext(ctx2);
    vm.runInContext('var SB_URL = "https://ref.supabase.co"; var SB_KEY = "x"; var sb = null, UID = null;\n' + SAVE.slice(ini, fin), ctx2);
    const r2 = await ctx2.initSave();
    ok("entra", r2 === true);
    ok("intentó revivir la sesión vieja", revividas === 1);
    ok("y volvió con el UID DE SIEMPRE, no uno nuevo", ctx2.UID === "la-de-siempre", String(ctx2.UID));
    ok("sin crear ninguna cuenta", anons2 === 0, anons2 + " cuentas creadas");
    ok("y guardó la llave nueva para la próxima",
      (JSON.parse(guardado["gf-cuenta"]) || {}).refresh_token === "llave-nueva");

    console.log(fallos ? "\n" + fallos + " fallo(s)\n"
      : "\nTodo en orden: si no se puede entrar, se avisa. Nunca se empieza de cero por su cuenta.\n");
    process.exit(fallos ? 1 : 0);
  });
}
