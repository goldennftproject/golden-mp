/* EL EQUIPO: TODO HUECO VACÍO ENSEÑA SU SILUETA                                        (31/8)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   De los vídeos de referencia de dirección (el equipo de Tibia): « cuando nada hay equipado, se
   muestra la imagen de lo que va ahí, pero como opacado ».

   La ventana de Equipo ya tenía la disposición (tres columnas, diez huecos, 11/8) y SEIS huecos
   ya enseñaban su silueta. Los otros CUATRO —collar, guantes, anillo y pantalones— llevaban un
   <span class="sil"> VACÍO: el emoji que alguna vez lo llenó se fue en una limpieza y quedaron
   como cuadros de madera pelados. Un hueco que no dice qué va en él no invita a llenarlo.

   Este archivo comprueba las tres patas: que los DIEZ huecos tengan silueta en el marcado o en
   el código que los repinta, que los diez sprites sil_* existan en disco de verdad, y que las
   siluetas nuevas respeten el estilo de las seis viejas (el mismo color plano translúcido, que
   es lo que las hace leerse como « esto falta » y no como « esto tenés »).
     node tools/test-equipo-siluetas.js                                                          */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const html = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
const ui = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");

console.log("\nLOS DIEZ HUECOS, CADA UNO CON SU SILUETA");
{
  /* el bloque del equipo, recortado para no confundirse con otras partes del marcado */
  const eq = html.slice(html.indexOf('id="ov-equip"'), html.indexOf('id="eq-grid"'));
  /* los cuatro fijos del marcado (collar y anillo no tienen id: son « próximamente ») */
  ok("el collar enseña sil_collar", /sil_collar\.png/.test(eq));
  ok("el anillo enseña sil_anillo", /sil_anillo\.png/.test(eq));
  ok("los guantes arrancan con sil_guantes", /sil_guantes\.png/.test(eq));
  ok("los pantalones arrancan con sil_pantalones", /sil_pantalones\.png/.test(eq));
  ok("y no queda NINGÚN span de silueta vacío en el equipo", !/<span class="sil"><\/span>/.test(eq),
    "el span venía de un emoji que se fue en una limpieza: quedaba un cuadro mudo");
  /* los seis que ya estaban, por el mapa SIL de refreshEquip */
  ok("los otros seis siguen con su silueta por refreshEquip",
    ["sil_casco", "sil_armadura", "sil_botas", "sil_escudo", "sil_arma", "sil_municion"]
      .every(s => ui.indexOf('"' + s + '"') >= 0));
  /* y el repintado no puede volver a dejar el hueco mudo */
  ok("al desequipar guantes o pantalones, refreshEquip vuelve a poner la silueta",
    /sil_guantes" : "sil_pantalones/.test(ui));
}

console.log("\nY LOS DIEZ SPRITES EXISTEN EN DISCO   (un src que 404ea es un hueco mudo con retraso)");
{
  const DIEZ = ["sil_collar", "sil_guantes", "sil_anillo", "sil_pantalones",
                "sil_casco", "sil_armadura", "sil_botas", "sil_escudo", "sil_arma", "sil_municion"];
  const faltan = DIEZ.filter(s => !fs.existsSync(path.join(RAIZ, "public/assets/farm", s + ".png")));
  ok("los diez sil_*.png están en assets/farm", !faltan.length, faltan.join(", ") || "10 de 10");
}

console.log("\nLAS SILUETAS NUEVAS RESPETAN EL ESTILO DE LAS VIEJAS");
{
  /* el estilo es UN color plano translúcido — (41,34,25) al alfa 140, medido de sil_casco. Si
     una silueta nueva viniera a todo color, se leería como « esto tenés » en vez de « esto
     falta », que es exactamente la confusión que la opacidad evita.

     El PNG se lee a mano, CON SUS FILTROS. La primera versión asumía filtro 0 en todas las filas
     « porque lo escribió PIL » — y PIL elige el filtro POR FILA. Leí bytes filtrados como si
     fueran píxeles y este test acusó a los cuatro sprites de tener un color fantasma
     (215,222,231) que no existía en ninguno: era la resta del filtro leída como color. Un test
     que decodifica un formato a medias no mide el archivo — mide su propia suposición. */
  const zlib = require("zlib");
  const paleta = (nombre) => {
    const buf = fs.readFileSync(path.join(RAIZ, "public/assets/farm", nombre + ".png"));
    let idat = Buffer.alloc(0), pos = 8, ancho = 0, alto = 0;
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos), tipo = buf.toString("ascii", pos + 4, pos + 8);
      if (tipo === "IHDR") { ancho = buf.readUInt32BE(pos + 8); alto = buf.readUInt32BE(pos + 12); }
      if (tipo === "IDAT") idat = Buffer.concat([idat, buf.slice(pos + 8, pos + 8 + len)]);
      pos += 12 + len;
    }
    const crudo = zlib.inflateSync(idat), B = 4, stride = ancho * B;
    const img = Buffer.alloc(alto * stride);
    const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); };
    for (let y = 0; y < alto; y++) {
      const f = crudo[y * (1 + stride)], fila = y * (1 + stride) + 1;
      for (let x = 0; x < stride; x++) {
        const raw = crudo[fila + x];
        const izq = x >= B ? img[y * stride + x - B] : 0;
        const arr = y > 0 ? img[(y - 1) * stride + x] : 0;
        const diag = (x >= B && y > 0) ? img[(y - 1) * stride + x - B] : 0;
        let v = raw;
        if (f === 1) v = raw + izq;
        else if (f === 2) v = raw + arr;
        else if (f === 3) v = raw + ((izq + arr) >> 1);
        else if (f === 4) v = raw + paeth(izq, arr, diag);
        img[y * stride + x] = v & 255;
      }
    }
    const colores = new Set();
    for (let i = 0; i < img.length; i += 4)
      if (img[i + 3] > 0) colores.add(img[i] + "," + img[i + 1] + "," + img[i + 2] + "," + img[i + 3]);
    return colores;
  };
  for (const s of ["sil_collar", "sil_guantes", "sil_anillo", "sil_pantalones"]) {
    let cs;
    try { cs = paleta(s); } catch (e) { ok(s + " se puede leer", false, e.message); continue; }
    ok(s + " es silueta de verdad: un solo color, y es el de la casa",
      cs.size === 1 && cs.has("41,34,25,140"), [...cs].join(" · "));
  }
}

console.log("");
console.log(fallos
  ? "  " + fallos + " fallo(s) — algún hueco vacío sigue sin decir qué va en él"
  : "  Todo en orden: los diez huecos dicen, opacado, lo que les falta.");
process.exit(fallos ? 1 : 0);
