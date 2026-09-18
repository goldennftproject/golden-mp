/* SOLO SE ENTRA CON CORREO                              (18/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Pero si yo borro caché, ¿por qué no me sale para poner mi correo? » — y después, cuando le
   expliqué que el login estaba escrito pero escondido: « sí, quiero que solo entren jugadores
   con correo ».

   El login por email existía desde el 22/8 y funcionaba. El problema era DÓNDE estaba: en
   Configuración → Cuenta, tres clics adentro. O sea que el jugador lo encontraba después de
   mirar una granja vacía — justo cuando ya no le servía de nada. Un login que nadie ve es un
   login que no existe.

   ESTE ARCHIVO CUSTODIA UNA SOLA COSA, Y ES LA CARA: que la puerta nueva NO pueda repetir el
   accidente del 24/8, cuando pedir un apodo creó una cuenta encima de una granja que ya
   existía y se comió tres horas de juego. Las tres rejas de entonces siguen ahí y el camino
   nuevo tiene que pasar POR AL LADO, sin tocarlas: ninguno de los dos botones de la puerta
   escribe una granja — los dos terminan en « andá a tu correo ».

   Es un test de LECTURA del código, no de ejecución: la puerta vive en el DOM y en la red, y
   las dos cosas mienten en un arnés. Lo que se puede custodiar sin navegador es que las
   decisiones peligrosas estén escritas donde tienen que estar, y eso es lo que se mira.
     node tools/test-puerta-del-correo.js                                                     */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const MAIN = fs.readFileSync(path.join(RAIZ, "public/game/main.js"), "utf8");
const SAVE = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8");
const CONF = fs.readFileSync(path.join(RAIZ, "public/game/config.js"), "utf8");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · LA BANDERA EXISTE Y SE PUEDE APAGAR\n");
{
  const m = CONF.match(/GF\.SOLO_EMAIL = (\d);/);
  ok("hay una bandera GF.SOLO_EMAIL", !!m, m && ("= " + m[1]));
  ok("y está encendida (es lo que pidió dirección el 18/9)", m && m[1] === "1");
  /* la gracia de la bandera es poder apagarla el día del playtest si la gente abandona en la
     puerta del correo. Para eso NADA puede depender de ella sin preguntar */
  ok("el arranque pregunta por la bandera antes de cortar la cuenta anónima",
    /GF\.SOLO_EMAIL\) \{\s*\n?\s*PUERTA_EMAIL = true;/.test(SAVE) || /!session && typeof GF !== "undefined" && GF\.SOLO_EMAIL/.test(SAVE));
  ok("y la puerta también (apagada, vuelve a ser la de siempre)", /if \(!solo\) return;/.test(MAIN));
  ok("el motivo queda escrito en config.js, no en un commit", /SOLO SE ENTRA CON CORREO/.test(CONF));
  ok("incluido el tapón del SMTP, que es lo que rompe esto en producción", /SMTP/.test(CONF));
}

console.log("\n2 · NO NACE NI UNA CUENTA ANÓNIMA MÁS   (ése era el pedido)\n");
{
  ok("(arnés) sigue existiendo el único sitio donde nacía", /sb\.auth\.signInAnonymously\(\)/.test(SAVE));
  /* el corte tiene que estar ANTES de signInAnonymously; si estuviera después, la cuenta ya
     habría nacido y el corte sería decoración */
  const iCorte = SAVE.indexOf("PUERTA_EMAIL = true;");
  const iAnon = SAVE.indexOf("sb.auth.signInAnonymously()");
  ok("y el corte está ANTES de la línea que la crea", iCorte > 0 && iAnon > iCorte,
    "corte en " + iCorte + ", creación en " + iAnon);
  /* …pero DESPUÉS de las rejas: si el corte se adelantara, un navegador con granja caería en
     la puerta del correo en vez de entrar a su granja. Ley 1 */
  const iReja = SAVE.indexOf("if (!session && CUENTA_PREVIA)");
  ok("y DESPUÉS de la reja del navegador que ya tiene granja (ley 1)", iReja > 0 && iCorte > iReja,
    "reja en " + iReja + ", corte en " + iCorte);
  const iRevivir = SAVE.indexOf("refreshSession");
  ok("y después de intentar revivir la sesión de siempre", iRevivir > 0 && iCorte > iRevivir);
}

console.log("\n3 · « NO HAY CUENTA TODAVÍA » NO ES « SE ROMPIÓ »\n");
{
  ok("hay una bandera propia para el navegador virgen", /var PUERTA_EMAIL = false;/.test(SAVE));
  ok("y el aviso de « sin conexión con el servidor » la respeta (sería mentirle al jugador)",
    /PUERTA_EMAIL !== "undefined" && PUERTA_EMAIL\)/.test(MAIN));
  /* CARGA_FALLO es lo que bloquea el guardado y saca la pantalla de avería. Un jugador nuevo
     no puede caer ahí: no falló nada, todavía no dio su correo */
  ok("y el camino nuevo NO enciende CARGA_FALLO", !/PUERTA_EMAIL[\s\S]{0,200}?CARGA_FALLO = true/.test(SAVE));
}

console.log("\n4 · LA PUERTA SE VE, Y ES LA PRIMERA PANTALLA\n");
{
  ok("hay un campo de correo en la puerta", /id="gmail"/.test(HTML));
  ok("arranca oculto (el que ya tiene granja no ve una puerta nueva)", /id="gmail"[^>]*display:none/.test(HTML));
  ok("y lo enciende el arranque, junto con la puerta del apodo", /puertaDelCorreo\(\);/.test(MAIN));
  ok("hay un « ya tengo cuenta », que es la respuesta a « borré la caché »", /id="gate-ya"/.test(HTML));
  ok("y se ofrece SIEMPRE, con bandera o sin ella (esa pregunta no depende de los nuevos)",
    /el "ya tengo cuenta" se ofrece SIEMPRE[\s\S]{0,200}?alt\.style\.display = "block"/.test(MAIN));
  ok("hay hueco para contestarle al jugador qué pasó con su correo", /id="gate-msg"/.test(HTML));
  ok("y el mensaje distingue « salió » de « falló » (si no, no sabe si ir al correo o reintentar)",
    /gate-msg\.ok/.test(HTML.replace(/\s+/g, "")) || /\.gate-msg\.ok\{/.test(HTML));
}

console.log("\n5 · LOS DOS GESTOS SON DOS FUNCIONES, Y NO SE CONFUNDEN\n");
{
  ok("crear cuenta nueva existe", /async function crearCuentaConEmail/.test(SAVE));
  ok("y crea (shouldCreateUser: true): es un jugador nuevo",
    /crearCuentaConEmail[\s\S]{0,600}?shouldCreateUser: true/.test(SAVE));
  ok("entrar con una cuenta vieja existe", /async function entrarConEmail/.test(SAVE));
  ok("y NO crea (shouldCreateUser: false): un correo desconocido tiene que fallar, no fabricar una granja vacía",
    /entrarConEmail[\s\S]{0,600}?shouldCreateUser: false/.test(SAVE));
  ok("el apodo viaja DENTRO del enlace, para no pedirlo dos veces",
    /data: \{ nick: n \}/.test(SAVE) && /function apodoElegido/.test(SAVE));
  ok("y se lee de la cuenta, no solo del navegador (el correo se abre donde el jugador quiera)",
    /user_metadata && u\.user_metadata\.nick/.test(SAVE));
}

console.log("\n6 · LAS TRES REJAS DEL 24/8 SIGUEN EN PIE\n");
{
  ok("reja 1 · initSave no crea cuenta si este navegador tuvo granja",
    /if \(!session && CUENTA_PREVIA\)/.test(SAVE));
  ok("reja 2 · el arranque no pide apodo si hubo cuenta", /hay cuenta en este navegador: NO se pide apodo/.test(MAIN));
  ok("reja 3 · el botón Entrar se corta igual", /Entrar bloqueado: este navegador ya tiene granja/.test(MAIN));
  /* y la de verdad: el camino nuevo no escribe NADA. Manda un correo y termina. La granja la
     crea la vuelta del enlace, que pasa por el arranque normal y por estas mismas rejas */
  /* el cuerpo EXACTO de la función, no una ventana de N caracteres: la primera versión de este
     test se comía el manejador de abajo y daba un falso rojo. Un test que mide de más miente
     igual que uno que mide de menos. */
  const cuerpo = (MAIN.match(/async function mandarElEnlace\(\) \{([\s\S]*?)\n\}/) || [])[1];
  ok("(arnés) se pudo aislar el cuerpo de mandarElEnlace", !!cuerpo, cuerpo ? cuerpo.length + " car." : "");
  ok("el camino del correo no guarda ninguna granja: manda el enlace y termina",
    !!cuerpo && !/saveFarm\(/.test(cuerpo) && !/enterGame\(/.test(cuerpo));
  ok("y la vuelta del enlace solo entra si NO había granja previa (si la había, entra por el camino de siempre)",
    /vuelta del enlace[\s\S]{0,600}?CUENTA_PREVIA\)\) \{/.test(MAIN) ||
    /apodoElegido === "function" &&[\s\S]{0,200}?CUENTA_PREVIA\)\)/.test(MAIN));
}

console.log("\n7 · Y AL QUE YA JUEGA SIN CORREO SE LE AVISA, NO SE LE CIERRA LA PUERTA\n");
{
  ok("el aviso existe y dice dónde está el botón", /Configuración → Cuenta/.test(MAIN));
  ok("es un aviso, no una ventana que tape la pantalla", !/openOv\("ov-cuenta"\)/.test(MAIN));
  ok("al que ya tiene cuenta atada no se le dice nada", /c\.modo === "email"\) return;/.test(MAIN));
  /* 18/9 — EL CASO QUE FALTABA. Dirección lo encontró probando: el que juega con partida local
     y SIN cuenta en la nube no recibía ningún aviso, porque el aviso preguntaba por una cuenta
     que no tiene. Entra igual (ley 1), pero callado no. */
  ok("y al que juega sin cuenta en la nube TAMBIÉN se le avisa", /no está en la nube/.test(MAIN));
  ok("con un texto distinto: a ése, Configuración → Cuenta no le sirve (no tiene sesión)",
    /SOLO en este navegador/.test(MAIN));
  ok("y sin prometerle que recargando se arregla (recargar toma el mismo camino)",
    !/Recargá la página cuando tengas conexión para crear/.test(MAIN));
  ok("queda anotado en la consola, para enterarnos si le pasa a alguien de verdad",
    /partida local SIN cuenta en la nube/.test(MAIN));
  /* lo importante: en ningún lado se le impide entrar */
  ok("en ningún sitio se bloquea la entrada por no tener correo",
    !/modo === "anonima"[\s\S]{0,300}?(pantallaNoSePudo|return false)/.test(MAIN));
}

console.log("\n7b · POR QUÉ BORRAR EL ALMACENAMIENTO Y RECARGAR NO LIMPIA NADA   (18/9)\n");
{
  /* Dirección probó `localStorage.clear(); location.reload()` y siguió entrando a su granja.
     No era la puerta: el juego guarda al SALIR, así que entre el clear y la recarga se vuelve
     a escribir la copia. Le pasa igual a « Clear site data » + F5 y a cerrar la pestaña.
     No se cambia —guardar al salir es lo que salva partidas— pero queda escrito acá para que
     el próximo que lo pruebe no pierda la tarde que perdimos nosotros. Lo que sirve para
     probar de verdad es una ventana de incógnito. */
  const SAVE2 = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8");
  ok("(hecho) el juego guarda en beforeunload, y por eso reescribe lo que borraste",
    /beforeunload", \(\) => \{ saveFarm\(\); \}/.test(SAVE2));
  ok("(hecho) y la copia local vive en localStorage, que es lo que se reescribe",
    /localStorage\.setItem\(GF_COPIA_KEY/.test(SAVE2));
  ok("(hecho) el camino de « partida local sin cuenta » sigue existiendo…",
    /no hay cuenta, pero SÍ hay partida en este navegador/.test(MAIN));
  /* …pero 18/9, dirección: « yo solo permitiría partidas con login correo y ya ». Era el último
     sitio por donde entraba una partida sin cuenta, así que la bandera lo cierra. */
  ok("…pero SOLO con la bandera apagada", /if \(!soloCorreo\) \{/.test(MAIN));
  ok("y la partida local NO se borra al cerrarlo (queda por si hay que rescatarla)",
    /la partida local queda guardada, no se toca/.test(MAIN));
  ok("y la puerta se lo DICE, en vez de dejarlo creer que perdió la granja",
    /__GF_GRANJA_HUERFANA/.test(MAIN) && /No se borró/.test(MAIN));
}

console.log("\n8 · UN CORREO MAL ESCRITO NO SE MANDA AL VACÍO\n");
{
  ok("se comprueba antes de mandar", /function correoPlausible/.test(MAIN));
  ok("y el jugador se entera de por qué no salió", /no parece completo/.test(MAIN));
  ok("el « no hay granja con ese correo » se traduce (Supabase lo dice en inglés y en jerga)",
    /No hay ninguna granja atada a ese correo/.test(MAIN));
  ok("y el límite de correos por hora también, que es EL error que vamos a ver con el SMTP de fábrica",
    /muchos correos seguidos/.test(MAIN));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
