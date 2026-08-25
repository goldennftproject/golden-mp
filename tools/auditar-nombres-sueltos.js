/* NOMBRES SUELTOS: funciones que se llaman y no existen (25/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Este proyecto no usa módulos: doce archivos que se cargan en fila y comparten un solo espacio
   de nombres global. Es simple y funciona — pero tiene un agujero concreto: si alguien escribe
   `refreshCobertizo()` donde la función se llama `refreshCob()`, nada se queja hasta que un
   jugador hace clic ahí. No hay compilador, no hay import que falle, y `tools/arrancar-el-juego`
   tampoco lo ve, porque esa línea solo corre cuando alguien la toca.

   Es la misma familia del bug que ya volvió dos veces en este proyecto: código que « está hecho »
   y nunca se ejecutó. Acá se ejecuta el juego entero y después se pregunta, por cada nombre que
   el código LLAMA, si existe algo con ese nombre en el mundo del juego.

   No pretende ser un compilador. Pretende que un dedo escrito mal no llegue a producción.
     node tools/auditar-nombres-sueltos.js                                                       */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const ARRANQUE = require("./arrancar-el-juego.contexto.js");

const { ctx, ARCHIVOS } = ARRANQUE.arrancar(RAIZ);

/* lo que el navegador trae puesto y no está en nuestro contexto de mentira */
/* lo que trae el navegador o una librería externa, y que nuestro contexto de cartón no tiene.
   Cada nombre de esta lista es una excepción CONSCIENTE: si mañana alguien agrega una, tiene que
   poder explicar de dónde sale. */
const DEL_NAVEGADOR = new Set([
  "EventSource",              // update.js — el canal de avisos del servidor; lo trae el navegador
  "Supabase", "getSession",   // la librería de login, que se carga por <script> aparte
  "Phaser", "Colyseus", "supabase", "console", "Math", "JSON", "Object", "Array", "Number", "String",
  "Boolean", "Set", "Map", "WeakMap", "WeakSet", "Symbol", "Promise", "RegExp", "Error", "TypeError",
  "Date", "Proxy", "Reflect", "Intl", "isNaN", "isFinite", "parseInt", "parseFloat", "encodeURIComponent",
  "decodeURIComponent", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
  "cancelAnimationFrame", "performance", "document", "window", "globalThis", "localStorage", "sessionStorage",
  "location", "navigator", "history", "URLSearchParams", "URL", "TextEncoder", "TextDecoder", "fetch",
  "addEventListener", "removeEventListener", "dispatchEvent", "alert", "confirm", "prompt", "screen",
  "Image", "Audio", "AudioContext", "webkitAudioContext", "structuredClone", "queueMicrotask", "btoa", "atob",
  "Event", "CustomEvent", "Blob", "FileReader", "IntersectionObserver", "ResizeObserver", "MutationObserver",
  "getComputedStyle", "matchMedia", "crypto", "Notification", "AbortController", "Uint8Array", "Float32Array",
  "ArrayBuffer", "DataView", "BigInt", "Infinity", "NaN", "undefined", "eval", "escape", "unescape",
  "function", "return", "if", "for", "while", "switch", "catch", "typeof", "new", "delete", "void", "in",
  "of", "do", "else", "try", "finally", "throw", "class", "extends", "super", "this", "const", "let", "var",
  "async", "await", "yield", "static", "get", "set", "true", "false", "null", "case", "break", "continue",
  "default", "instanceof", "with", "debugger", "export", "import",
]);


/* ── QUITAR COMENTARIOS Y VACIAR TEXTOS, EN UN SOLO RECORRIDO ────────────────────────────────
   La primera versión hacía esto con cuatro regex encadenados y se equivocaba en un caso muy
   común de este proyecto:

       '<div class="secc">Publicaciones activas (' + activas.length + …

   El barrido de comillas DOBLES entraba en `"secc"` —que está dentro de una cadena simple— y a
   partir de ahí todo quedaba descolocado: `activas` parecía una llamada a una función que no
   existe. Cuatro de los últimos falsos positivos venían exactamente de ahí.
   Un recorrido carácter a carácter sabe en todo momento qué comilla abrió, así que no hay
   anidamiento que lo confunda. Se conservan los SALTOS DE LÍNEA para que los números de línea
   que reporta el auditor sigan siendo los del archivo de verdad. */
function limpiar(src) {
  let out = "", i = 0, dentro = 0, cierre = "";
  const n = src.length, nl = (t) => t.replace(/[^\n]/g, " ");
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (dentro === 0) {
      if (c === "/" && d === "/") { const j = src.indexOf("\n", i); const k = j < 0 ? n : j; out += nl(src.slice(i, k)); i = k; continue; }
      if (c === "/" && d === "*") { let j = src.indexOf("*/", i + 2); j = j < 0 ? n : j + 2; out += nl(src.slice(i, j)); i = j; continue; }
      if (c === '"' || c === "'" || c === "`") { dentro = 1; cierre = c; out += " "; i++; continue; }
      out += c; i++; continue;
    }
    if (c === "\\") { out += "  "; i += 2; continue; }
    if (c === cierre) { dentro = 0; out += " "; i++; continue; }
    /* UNA COMILLA SIMPLE O DOBLE NO CRUZA UN SALTO DE LÍNEA — es ilegal en JavaScript. Usarlo
       como red convierte cualquier desincronización en un problema de UNA línea en vez de un
       problema de todo el resto del archivo. Sin esto, una comilla dentro de una expresión
       regular (`/['"]/`) abría un texto que no cerraba nunca y todo lo que venía después quedaba
       descolocado: por ahí se colaba el último falso positivo. Las plantillas (backtick) sí
       pueden ocupar varias líneas, y por eso se exceptúan. */
    if (c === "\n" && cierre !== "`") { dentro = 0; out += "\n"; i++; continue; }
    out += (c === "\n" ? "\n" : " "); i++;   // el texto se vacía, los renglones se respetan
  }
  return out;
}

let fallos = 0;
const linea = () => console.log("─".repeat(78));

console.log("");
linea();
console.log("  NOMBRES QUE EL CÓDIGO LLAMA Y QUE PODRÍAN NO EXISTIR");
linea();

/* Para cada archivo: buscar `nombre(` en posición de llamada, quedarse con los que no están
   definidos localmente (function, var, let, const, class, parámetro) y preguntar al contexto. */
const sospechosos = new Map();   // nombre → [dónde]
for (const rel of ARCHIVOS) {
  const abs = path.join(RAIZ, "public", rel);
  if (!fs.existsSync(abs)) continue;
  let src = fs.readFileSync(abs, "utf8");
  /* fuera comentarios y textos: un nombre dentro de una cadena no es una llamada */
  src = limpiar(src);
  /* ── LA COARTADA, y ésta es la tercera versión ────────────────────────────────────────────
     Las dos primeras intentaron enumerar las formas en que un nombre puede ser local: parámetro,
     variable, método, arrow… Y cada vez se escapaba una (parámetros repartidos en dos líneas,
     `const a = 1, b = 2`, métodos de clase). Un auditor que canta diez falsos positivos no se lee
     más, así que enumerar formas era el camino equivocado.

     La regla que sí funciona es al revés y cabe en una frase:

         un nombre es sospechoso solo si en TODO el archivo aparece ÚNICAMENTE siendo llamado.

     Si `esMia` está en algún lado sin un paréntesis detrás —`esMia = (c,r) =>`, o dentro de una
     lista de parámetros— entonces es local y no hay nada que reportar. Si lo único que existe de
     `refreshCobertizo` en el archivo es `refreshCobertizo()`, es una global, y si no existe en el
     mundo del juego, falta.

     LA EXCEPCIÓN QUE HACE FALTA: `typeof X` NO cuenta como mención. Justamente los dos fallos que
     este auditor encontró estaban escritos `typeof esDeNoche === "function"`, y si esa forma
     valiera de coartada, los habría dejado pasar — que es exactamente lo que hizo el código
     durante días. */
  /* …y una segunda coartada, que la primera versión de esta regla no vio y me llenó la salida de
     216 nombres: en una clase, la DEFINICIÓN de un método —`amarreClic(i) { … }`— es idéntica a
     una llamada. No hay nada delante que la distinga salvo la llave de después. */
  const esDefinicionDeMetodo = (nom) =>
    new RegExp("(?:^|[\\n{;])\\s*(?:async\\s+)?" + nom + "\\s*\\([^)]*\\)\\s*\\{").test(src)
    /* …y lo mismo con `function nom(` — una declaración también termina en paréntesis, así que
       para la regla de arriba era indistinguible de una llamada. Estos archivos envuelven casi
       todo en funciones anónimas que se ejecutan solas (audio.js, update.js, main.js), y ahí
       dentro hay una docena de funciones perfectamente locales. */
    || new RegExp("\\bfunction\\s+" + nom + "\\s*\\(").test(src);
  const mencionadoSinLlamar = (nom) => {
    const re = new RegExp("(typeof\\s+)?\\b" + nom + "\\b(\\s*\\()?", "g");
    let m;
    while ((m = re.exec(src))) {
      if (m[2]) continue;    // es una llamada
      if (m[1]) continue;    // es un `typeof`: no prueba que exista, prueba que se dudaba
      return true;
    }
    return false;
  };

  const lineas = src.split("\n");
  lineas.forEach((l, i) => {
    const re = /(^|[^.\w$)\]])([A-Za-z_$][\w$]*)\s*\(/g; let m;
    while ((m = re.exec(l))) {
      const nom = m[2];
      if (DEL_NAVEGADOR.has(nom)) continue;
      if (nom.length <= 1) continue;
      /* ¿existe en el mundo del juego después de cargarlo entero? */
      let existe = false;
      try { existe = vm.runInContext("typeof " + nom, ctx) !== "undefined"; } catch (e) { existe = false; }
      if (existe) continue;
      if (mencionadoSinLlamar(nom) || esDefinicionDeMetodo(nom)) continue;   // es local o es un método de este archivo
      const k = nom;
      if (!sospechosos.has(k)) sospechosos.set(k, []);
      const donde = rel + ":" + (i + 1);
      if (sospechosos.get(k).length < 3 && !sospechosos.get(k).includes(donde)) sospechosos.get(k).push(donde);
    }
  });
}

if (!sospechosos.size) {
  console.log("  ✓  todo lo que el código llama existe en el mundo del juego");
} else {
  console.log("  " + sospechosos.size + " nombre(s) que no encuentro por ningún lado:\n");
  [...sospechosos.entries()].sort().forEach(([nom, donde]) => {
    console.log("  ✘  " + nom.padEnd(28) + donde.join("  ·  "));
    fallos++;
  });
  console.log("");
  console.log("  Si alguno es un método de una clase de Phaser o una variable local que este");
  console.log("  barrido no supo ver, agregalo a DEL_NAVEGADOR con un comentario que diga por qué.");
  console.log("  Lo que NO hay que hacer es dejarlo pasar en silencio: en un proyecto sin módulos,");
  console.log("  un nombre mal escrito no falla al cargar — falla en la mano del jugador.");
}

console.log("");
process.exit(fallos ? 1 : 0);
