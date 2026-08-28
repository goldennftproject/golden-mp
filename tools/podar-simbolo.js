/* PODAR UN SÍMBOLO DE NIVEL SUPERIOR, CON SU CUERPO Y SUS COMENTARIOS   (27/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Borrar código viejo por RANGOS DE LÍNEA es cómo se rompe un archivo de nueve mil líneas: el
   bloque de la Pesca v3 va de la 6310 a la 7200 y en medio hay tres cosas que se quedan.

   Esto borra por NOMBRE. Encuentra la declaración en la columna 0, cuenta llaves hasta cerrarla
   —respetando cadenas, plantillas, expresiones regulares y comentarios, que es donde fallan los
   recortes hechos a ojo— y se lleva también el bloque de comentario que la precede, porque un
   comentario que explica una función borrada es peor que ningún comentario: miente.

   No adivina. Si no encuentra el símbolo, lo dice y no toca nada.
     node tools/podar-simbolo.js <archivo> <simbolo> [<simbolo>…]
     node tools/podar-simbolo.js --lista <archivo>            (qué hay de nivel superior)      */
const fs = require("fs");

function finDelBloque(s, i) {
  /* desde el índice i, avanza hasta cerrar el primer bloque de llaves. Sabe de comillas,
     plantillas, expresiones regulares y comentarios: sin eso, una llave dentro de una cadena
     ("{") corta el recorte por la mitad y deja el archivo sin parsear. */
  let prof = 0, dentro = null, escapa = false, visto = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k], sig = s[k + 1];
    if (dentro) {
      if (escapa) { escapa = false; continue; }
      if (c === "\\") { escapa = true; continue; }
      if (dentro === "//" && c === "\n") dentro = null;
      else if (dentro === "/*" && c === "*" && sig === "/") { dentro = null; k++; }
      else if (dentro === c) dentro = null;
      continue;
    }
    if (c === "/" && sig === "/") { dentro = "//"; k++; continue; }
    if (c === "/" && sig === "*") { dentro = "/*"; k++; continue; }
    if (c === '"' || c === "'" || c === "`") { dentro = c; continue; }
    if (c === "{") { prof++; visto = true; continue; }
    if (c === "}") { prof--; if (visto && prof === 0) return k + 1; continue; }
    /* una declaración de una sola línea sin llaves: se corta en el punto y coma */
    if (!visto && c === ";") return k + 1;
  }
  return -1;
}
/* EL COMENTARIO DE ENCIMA, ENTERO O NADA.
   La primera versión subía línea a línea mientras cada una « pareciera » comentario: empezaba
   por //, por * o terminaba en *\/. Con un bloque cuyas líneas de en medio van indentadas sin
   asterisco —el estilo de este proyecto— la subida se paraba a mitad del bloque, se llevaba la
   cola con su *\/ y dejaba el /* abierto. El archivo dejaba de parsear DIEZ MIL líneas más
   abajo, en un sitio que no tiene nada que ver.
   Ahora, si la línea de encima cierra un bloque, se busca su /* de apertura de verdad y se corta
   ahí. Adivinar dónde empieza un comentario por su aspecto es lo que rompió el archivo. */
function inicioConComentario(s, i) {
  const antes = s.slice(0, i);
  const lineas = antes.split("\n");
  let n = lineas.length - 1;                    // la línea de la declaración (vacía por el corte)
  while (n > 0) {
    const l = lineas[n - 1].trim();
    if (l.endsWith("*/")) {
      /* un bloque: se busca su apertura contando hacia atrás, no adivinando por la forma */
      const hasta = lineas.slice(0, n).join("\n").length;
      const abre = s.lastIndexOf("/*", hasta);
      if (abre < 0) break;
      n = s.slice(0, abre).split("\n").length - 1;
      continue;
    }
    if (l.startsWith("//")) { n--; continue; }
    break;
  }
  return lineas.slice(0, n).join("\n").length + (n ? 1 : 0);
}

const args = process.argv.slice(2);
if (args[0] === "--lista") {
  const s = fs.readFileSync(args[1], "utf8");
  const out = [];
  for (const m of s.matchAll(/^(?:function|var|const|let)\s+([A-Za-z_$][\w$]*)/gm)) out.push(m[1]);
  console.log(out.join("\n"));
  process.exit(0);
}
/* --metodo: lo mismo pero para métodos de clase, que se declaran con dos espacios y sin
   palabra clave. La escena del juego es una clase de mil ochocientas líneas y sus métodos
   muertos hay que poder sacarlos con la misma seguridad que una función suelta. */
const METODO = args[0] === "--metodo";
if (METODO) args.shift();
const archivo = args[0], simbolos = args.slice(1);
if (!archivo || !simbolos.length) { console.log("uso: node tools/podar-simbolo.js <archivo> <simbolo>…"); process.exit(1); }

let s = fs.readFileSync(archivo, "utf8");
const hechos = [], faltan = [];
for (const n of simbolos) {
  const re = METODO
    ? new RegExp("^  " + n.replace(/[$]/g, "\\$") + "\\s*\\(", "m")
    : new RegExp("^(?:function|var|const|let)\\s+" + n.replace(/[$]/g, "\\$") + "\\b", "m");
  const m = re.exec(s);
  if (!m) { faltan.push(n); continue; }
  const fin = finDelBloque(s, m.index);
  if (fin < 0) { faltan.push(n + " (no cierra)"); continue; }
  const ini = inicioConComentario(s, m.index);
  const cuantas = s.slice(ini, fin).split("\n").length;
  s = s.slice(0, ini) + s.slice(fin).replace(/^\n+/, "\n");
  hechos.push(n + " (" + cuantas + " líneas)");
}
fs.writeFileSync(archivo, s);
console.log("  podados: " + (hechos.join(", ") || "ninguno"));
if (faltan.length) console.log("  NO ENCONTRADOS: " + faltan.join(", "));
process.exit(faltan.length ? 1 : 0);
