/* ¿CUÁNTO PESA ENTRAR A LA GRANJA? (24/8, dirección: « sigue tardando en entrar, algo se ha
   roto ahí en el inicio »)
   No se rompió de golpe: se fue rompiendo, y por eso no lo cazó nadie. El juego son 1.186 KB de
   JavaScript repartidos en doce archivos, y el arranque tenía tres impuestos encima:
     1. el servidor los mandaba SIN COMPRIMIR — con gzip son 400: viajaba el triple;
     2. el cargador los pedía EN FILA, uno esperando al anterior: doce idas y vueltas puestas
        una detrás de otra antes de que corriera la primera línea del juego;
     3. y los .js iban con no-cache, así que en cada carga había una ida y vuelta POR ARCHIVO
        solo para que el server contestara « no cambió » — aunque la dirección ya llevara
        ?b=GF_BUILD, que cambia en cada deploy y hace imposible reusar código viejo.
   Los tres se arreglan sin tocar una línea del juego, y este medidor los deja fijos. Además
   VIGILA EL PESO: el bulto crece solo, un comentario por vez, y es justo la clase de cosa que
   nadie mira hasta que un día tarda.
     node tools/test-arranque-peso.js                                                            */
const fs = require("fs"), path = require("path"), zlib = require("zlib");

const SRV = fs.readFileSync("src/index.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const PKG = JSON.parse(fs.readFileSync("package.json", "utf8"));
const STAMP = fs.readFileSync("tools/stamp-build.ps1", "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* los archivos que el arranque baja, leídos del propio cargador (no de una lista a mano) */
const lista = (HTML.match(/const files = \[([\s\S]*?)\];/) || [])[1] || "";
const FILES = (lista.match(/"game\/[^"]+"/g) || []).map(s => s.replace(/"/g, ""));

/* 26/8 — SE PESA LO QUE VIAJA, NO LO QUE HAY EN DISCO.
   Este medidor gzipeaba los archivos CRUDOS. Pero desde el 25/8 el servidor les quita los
   comentarios antes de mandarlos, así que llevaba contando 222 KB que ningún jugador baja
   nunca: 460 KB medidos contra 238 KB reales. Hoy la suite se puso roja « por pasarse del
   tope » cuando lo único que había crecido eran los comentarios de esta misma semana.
   Un medidor que mide lo que no viaja no mide el arranque: mide cuánto escribimos.
   Se usa la MISMA función que el servidor (src/pelar-comentarios.js), no una copia. */
const { pelarComentarios } = require("../src/pelar-comentarios.js");
console.log("\nEL BULTO DEL ARRANQUE");
let crudo = 0, comprimido = 0, pelado = 0;
FILES.forEach(f => {
  const t = fs.readFileSync(path.join("public", f), "utf8");
  crudo += Buffer.byteLength(t);
  pelado += Buffer.byteLength(pelarComentarios(t));
  comprimido += zlib.gzipSync(pelarComentarios(t)).length;
});
console.log("  " + FILES.length + " archivos  ·  " + Math.round(crudo / 1024) + " KB en disco  ·  " +
  Math.round(pelado / 1024) + " KB sin comentarios  ·  " + Math.round(comprimido / 1024) + " KB es lo que VIAJA");
{
  ok("el cargador tiene su lista de archivos", FILES.length >= 10, FILES.length + " archivos");
  /* TOPE DE PESO — no es una cifra sagrada: es un aviso. Si el juego crece de verdad, se sube
     el tope A PROPÓSITO y en el mismo commit, que es distinto de que crezca sin que nadie se
     entere.
     26/8: bajado de 460 a 300 porque ahora se mide lo que VIAJA (238 KB) en vez de los archivos
     con comentarios (460 KB). El tope viejo, aplicado a la medida nueva, habría dejado pasar el
     doble del juego sin decir nada. Cuando se arregla una vara hay que reajustar la marca, o el
     arreglo se convierte en permiso. */
  const TOPE_KB = 300;
  ok("lo que viaja no pasa del tope", comprimido / 1024 < TOPE_KB,
    Math.round(comprimido / 1024) + " KB de " + TOPE_KB + " KB");
  ok("y comprimir sigue valiendo la pena (≥ 2,5×)", pelado / comprimido >= 2.5,
    (crudo / comprimido).toFixed(2) + "× más chico");
}

console.log("\n1 · EL SERVIDOR COMPRIME");
{
  ok("compression está entre las dependencias", !!(PKG.dependencies && PKG.dependencies.compression),
    (PKG.dependencies || {}).compression || "FALTA");
  ok("y está enchufado", /app\.use\(require\("compression"\)\(\)\)/.test(SRV));
  ok("ANTES del static (si va después, no lo toca)",
    SRV.indexOf('require("compression")') < SRV.indexOf("express.static"));
}

console.log("\n2 · LOS DOCE SE BAJAN A LA VEZ, PERO SE EJECUTAN EN FILA");
{
  ok("el html los pre-anuncia", /l\.rel = "preload"; l\.as = "script"/.test(HTML));
  ok("con el mismo sello que después va a pedir el cargador", /l\.href = f \+ "\?b=" \+ GF_BUILD/.test(HTML));
  ok("y el orden de ejecución sigue siendo uno por vez", /s\.onload = function \(\) \{ i\+\+; next\(0\); \};/.test(HTML),
    "config define lo que state usa: el orden importa");
  ok("los reintentos siguen ahí (el server free corta conexiones)", /if \(r > 8\)/.test(HTML));
  ok("el preload no puede romper nada si el navegador no lo entiende", /try \{[\s\S]{0,400}rel = "preload"/.test(HTML));
}

console.log("\n3 · LA CACHÉ: EL SELLO YA GARANTIZA QUE NO SE REUSA CÓDIGO VIEJO");
{
  ok("con ?b= los .js se cachean de verdad", /max-age=31536000, immutable/.test(SRV));
  ok("sin ?b= se siguen revalidando (red de seguridad)", /res\.setHeader\("Cache-Control", "no-cache"\)/.test(SRV));
  ok("el html NUNCA se cachea (es el que trae el sello nuevo)",
    /\/\\\.\(js\|html\|css\)\$\/\.test\(filePath\)\) res\.setHeader\("Cache-Control", "no-cache"\)/.test(SRV));
  /* con un año de caché, el sello es lo ÚNICO que avisa que hay código nuevo: tiene que cambiar
     SIEMPRE que se deploya, y dos deploys pueden caer en el mismo minuto */
  ok("el sello del deploy lleva segundos", /yyyyMMdd-HHmmss/.test(STAMP),
    (STAMP.match(/'yyyyMMdd-[^']*'/) || [])[0]);
  ok("y el html tiene un sello", /const GF_BUILD = "[^"]+";/.test(HTML),
    (HTML.match(/const GF_BUILD = "([^"]+)"/) || [])[1]);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: entrar cuesta " + Math.round(comprimido / 1024) + " KB, y solo la primera vez de cada deploy.\n");
process.exit(fallos ? 1 : 0);
