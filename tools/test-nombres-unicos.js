/* NINGUNA FUNCIÓN PUEDE LLAMARSE COMO OTRA (27/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Los cinco archivos del juego se cargan como scripts sueltos en un mismo ámbito global. No hay
   módulos, no hay import, no hay aviso: si dos funciones se llaman igual, LA SEGUNDA GANA y la
   primera desaparece sin que nada lo diga.

   ESTE ARCHIVO EXISTE POR UN CASO REAL, y merece contarse entero porque es la clase de fallo
   más cara que hay: el que no rompe nada.

   Escribiendo los tres cebos de la Pesca v4 hice una función ceboBolsa(d) que dice de qué bolsa
   sale cada cebo —el camarón de G.fish, la larva de G.res—. Ya existía una ceboBolsa(c) del
   sistema de cebos de la v3, doscientas líneas más abajo, con otra forma de preguntar lo mismo
   (c.donde en vez de d.bolsa). Como las declaraciones se izan, la de abajo pisó a la mía.

   Resultado: al cobrar el camarón el juego restaba de G.res.camaron, que no existe. O sea que el
   cebo de los récords era GRATIS. Para siempre. Sin excepción, sin log, sin nada raro en
   pantalla, y sin forma de que un jugador lo reportara: « me funciona bien » es exactamente lo
   que diría. Lo cazó el test de los cebos porque preguntaba por la bolsa correcta, no porque yo
   lo sospechara.

   El barrido de acá abajo es de tres líneas y cubre para siempre una familia entera de fallos
   que ninguna prueba de comportamiento va a encontrar por su cuenta.
     node tools/test-nombres-unicos.js                                                           */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const ARCHIVOS = ["config.js", "state.js", "ui.js", "farm.js", "boot.js", "save.js"]
  .map(f => path.join(RAIZ, "public/game", f))
  .filter(fs.existsSync);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nUN ÁMBITO GLOBAL, " + ARCHIVOS.length + " ARCHIVOS: NADIE PUEDE LLAMARSE COMO OTRO");
{
  /* solo las declaraciones de nivel superior, que son las que se izan y se pisan; las funciones
     anidadas viven en su ámbito y no molestan a nadie. */
  const donde = {};
  let total = 0;
  for (const f of ARCHIVOS) {
    const nombre = path.basename(f);
    fs.readFileSync(f, "utf8").split("\n").forEach((linea, i) => {
      const m = /^function\s+([A-Za-z0-9_$]+)\s*\(/.exec(linea);
      if (!m) return;
      total++;
      (donde[m[1]] = donde[m[1]] || []).push(nombre + ":" + (i + 1));
    });
  }
  const repes = Object.keys(donde).filter(k => donde[k].length > 1);
  console.log("");
  console.log("    " + total + " funciones globales en " + ARCHIVOS.length + " archivos");
  console.log("");
  ok("ninguna se repite", !repes.length,
    repes.map(k => k + "() en " + donde[k].join(" y ")).join("  ·  "));
  if (repes.length) {
    console.log("");
    console.log("       La segunda gana y la primera desaparece sin decir nada. Renombrá una de");
    console.log("       las dos aunque « parezcan hacer lo mismo »: si de verdad lo hicieran,");
    console.log("       sobraría una, y si no, ya hay un bug corriendo.");
  }
}

console.log("\nY LAS CONSTANTES DE NIVEL SUPERIOR TAMPOCO");
{
  /* const y let de nivel superior SÍ tiran error al redeclararse, así que el navegador avisa.
     var, en cambio, se pisa en silencio igual que las funciones. */
  const donde = {};
  for (const f of ARCHIVOS) {
    const nombre = path.basename(f);
    fs.readFileSync(f, "utf8").split("\n").forEach((linea, i) => {
      const m = /^var\s+([A-Z][A-Z0-9_]{2,})\s*=/.exec(linea);
      if (!m) return;
      (donde[m[1]] = donde[m[1]] || []).push(nombre + ":" + (i + 1));
    });
  }
  const repes = Object.keys(donde).filter(k => donde[k].length > 1);
  ok("ninguna tabla var EN MAYÚSCULAS se declara dos veces", !repes.length,
    repes.map(k => k + " en " + donde[k].join(" y ")).join("  ·  "));
  console.log("       → const y let avisan al redeclararse; var no. Una tabla de balance");
  console.log("         declarada dos veces con números distintos es un juego con dos economías.");
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — hay algo que se está pisando en silencio"
  : "  Todo en orden: cada nombre del juego es de una sola cosa.");
process.exit(fallos ? 1 : 0);
