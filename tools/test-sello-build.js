/* EL SELLO NO SE ESCRIBE: SE CALCULA (24/8)
   El cargador le pega ?b=GF_BUILD a cada .js y, desde que los servimos con "immutable", ese
   sello es lo ÚNICO que le avisa al navegador que hay código nuevo. Lo escribía un script en
   el deploy… y en el PRIMER deploy después de endurecer la caché el sello se quedó sin
   commitear: el servidor siguió anunciando el número viejo. Con la caché blanda no pasaba
   nada; con la dura, el jugador se queda un año con el código de ayer.
   Un sello que hay que acordarse de actualizar es un sello roto. Contratos:
     · el servidor DERIVA el sello de los propios .js del juego (tamaño y fecha);
     · lo inyecta en el html al servirlo, y el html nunca se cachea;
     · cambiar cualquier archivo cambia el sello; no cambiar nada, no lo cambia;
     · el literal del html se queda igual, como respaldo para abrir el juego sin servidor;
     · y el deploy avisa si quedó algo de public/ o src/ sin subir.
     node tools/test-sello-build.js                                                              */
const fs = require("fs"), path = require("path"), os = require("os");

const SRV = fs.readFileSync("src/index.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const BAT = fs.readFileSync("deploy.bat", "utf8");
const PKG = JSON.parse(fs.readFileSync("package.json", "utf8"));

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\nEL SERVIDOR CALCULA EL SELLO DESDE LOS ARCHIVOS");
{
  ok("hay una función que lo deriva", /function selloDelCodigo\(\)/.test(SRV));
  ok("mira los .js del juego, no una constante", /readdirSync\(JUEGO_DIR\)/.test(SRV) && /\\\.js\$\/\.test\(f\)/.test(SRV));
  ok("y usa tamaño Y fecha (un cambio del mismo tamaño también cuenta)",
    /st\.size/.test(SRV) && /st\.mtimeMs/.test(SRV));
  ok("lo inyecta al servir el html", /const GF_BUILD = "' \+ SELLO \+ '";/.test(SRV));
  ok("el html se sirve SIN caché (es el que trae el sello nuevo)",
    /app\.get\(\["\/", "\/index\.html"\][\s\S]{0,200}no-cache/.test(SRV));
  ok("y se rearma solo si cambió el código (no en cada visita)", /if \(INDEX_HTML && s === SELLO\) return INDEX_HTML;/.test(SRV));
}

console.log("\nY EL CÁLCULO HACE LO QUE DICE (se corre de verdad)");
{
  /* se reproduce la función del servidor sobre una carpeta de mentira */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gf-sello-"));
  const sello = () => {
    const h = require("crypto").createHash("sha1");
    for (const f of fs.readdirSync(dir).sort()) {
      if (!/\.js$/.test(f)) continue;
      const st = fs.statSync(path.join(dir, f));
      h.update(f + ":" + st.size + ":" + Math.floor(st.mtimeMs) + ";");
    }
    return h.digest("hex").slice(0, 12);
  };
  fs.writeFileSync(path.join(dir, "a.js"), "uno");
  fs.writeFileSync(path.join(dir, "b.js"), "dos");
  const s1 = sello();
  ok("dos lecturas seguidas dan el mismo sello", sello() === s1, s1);
  fs.writeFileSync(path.join(dir, "b.js"), "DOS");   // mismo tamaño, contenido distinto
  const s2 = sello();
  ok("cambiar un archivo lo cambia (aunque pese igual)", s2 !== s1, s1 + " → " + s2);
  fs.writeFileSync(path.join(dir, "c.js"), "tres");
  ok("agregar un archivo también", sello() !== s2);
  fs.writeFileSync(path.join(dir, "leeme.txt"), "no es del juego");
  const s3 = sello();
  fs.writeFileSync(path.join(dir, "leeme.txt"), "sigue sin serlo");
  ok("y lo que no es .js no lo mueve", sello() === s3);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log("\nEL RESPALDO DEL HTML SIGUE AHÍ (abrir el juego sin servidor)");
{
  ok("el literal existe", /const GF_BUILD = "[^"]+";/.test(HTML), (HTML.match(/const GF_BUILD = "([^"]+)"/) || [])[1]);
  ok("y el cargador lo usa para pedir los archivos", /f \+ "\?b=" \+ GF_BUILD/.test(HTML));
}

console.log("\nEL DEPLOY AVISA SI QUEDÓ ALGO SIN SUBIR");
{
  ok("mira public/ y src/ después del push", /git status --porcelain -- public src/.test(BAT));
  ok("y grita si hay algo", /OJO: quedaron cambios SIN SUBIR/.test(BAT));
  ok("si el push falla, lo dice y no finge que deployó", /EL PUSH FALLO/.test(BAT) && /if errorlevel 1 goto :fallo/.test(BAT));
  /* 24/8 — el que de verdad rompía: `git add -A` abortaba entero por los enlaces simbólicos de
     node_modules (« Function not implemented » en Windows), no se preparaba NADA, el commit no
     se hacía, y el push subía solo lo que ya estuviera commiteado. En silencio, durante meses. */
  ok("y si el ADD falla, se planta (no deploya a medias)",
    /if errorlevel 1 goto :falloadd/.test(BAT) && /GIT ADD FALLO/.test(BAT));
}

console.log("\nNODE_MODULES NO SE VERSIONA (era lo que rompía el add)");
{
  const IGN = fs.readFileSync(".gitignore", "utf8");
  ok("está ignorado", /^node_modules\/?$/m.test(IGN));
  /* la comprobación de verdad: que el índice de git no tenga ni un archivo de ahí */
  let versionados = 0;
  try {
    versionados = require("child_process")
      .execSync("git ls-files node_modules", { encoding: "utf8" }).split("\n").filter(Boolean).length;
  } catch (e) { console.log("       (sin git a mano: se salta la comprobación del índice)"); }
  ok("y no queda ni un archivo suyo en el índice", versionados === 0, versionados + " archivos");
  ok("las dependencias viven en package.json, que es de donde las instala Render",
    !!(PKG.dependencies && Object.keys(PKG.dependencies).length >= 3),
    Object.keys(PKG.dependencies || {}).join(", "));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n"
  : "\nTodo en orden: nadie escribe el sello, así que nadie puede olvidárselo.\n");
process.exit(fallos ? 1 : 0);
