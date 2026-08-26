/* PELAR COMENTARIOS — la misma función para el servidor y para el medidor (26/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Vivía dentro de src/index.js, y por eso `test-arranque-peso` no podía usarla: requerir
   src/index.js levanta un servidor. Así que el medidor pesaba los archivos CRUDOS mientras el
   servidor mandaba los PELADOS, y llevaba contando 222 KB que ningún jugador baja nunca
   (460 KB medidos contra 238 KB reales). Un medidor que mide lo que no viaja no mide el
   arranque: mide el tamaño de nuestros comentarios.

   Copiar la función al medidor habría sido peor: dos copias que se separan a la primera mejora,
   y volvemos a medir otra cosa. Una función, dos usuarios. */
function pelarComentarios(src) {
  /* Un barrido carácter a carácter, no un regex. Con regex, un `//` dentro de una cadena o de
     una expresión regular se come el resto de la línea, y eso es un bug silencioso servido a
     producción. Acá se sabe en todo momento si estamos dentro de un texto. */
  let out = "", i = 0, dentro = 0, cierre = "";
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (dentro === 0) {
      if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
      if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
      if (c === '"' || c === "'" || c === "`") { dentro = 1; cierre = c; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (c === "\\") { out += c + (src[i + 1] || ""); i += 2; continue; }
    out += c; if (c === cierre) dentro = 0; i++;
  }
  return out.split("\n").filter(l => l.trim()).join("\n");
}
module.exports = { pelarComentarios };
