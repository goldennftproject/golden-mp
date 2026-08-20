/* ¿HAY BOTONES MUERTOS? (19/8, antes del deploy del MVP)
   check-ui lleva tiempo avisando de 31 ids que el código busca y que NO están en index.html. La
   mayoría son legítimos: se dibujan con innerHTML desde un panel y por eso no viven en el HTML
   estático. Pero esa lista es justo donde se escondería un botón de verdad roto — algo que el
   código intenta enganchar y que nadie llega a pintar nunca.
   Este auditor separa las dos cosas: para cada id, mira si alguien lo ESCRIBE (en el HTML o en
   alguna plantilla de JS) y si alguien lo BUSCA. Un id que se busca y nadie escribe es un botón
   muerto; uno que se escribe en JS está bien y solo hay que dejarlo anotado.
     node tools/auditar-botones.js                                                                 */
const fs = require("fs");
const JS = ["ui", "farm", "state", "forest", "save", "boot", "config", "main"]
  .map(f => { try { return fs.readFileSync("public/game/" + f + ".js", "utf8"); } catch (e) { return ""; } })
  .join("\n");
const HTML = fs.readFileSync("public/index.html", "utf8");

/* Los ids que el código BUSCA: $("x") o getElementById("x"). */
const buscados = new Set();
[/\$\(["'`]([\w-]+)["'`]\)/g, /getElementById\(["'`]([\w-]+)["'`]\)/g].forEach(re => {
  let m; while ((m = re.exec(JS))) buscados.add(m[1]);
});
/* Los ids que alguien ESCRIBE: en el HTML estático o dentro de una plantilla de JS. */
const escritos = new Set();
[[HTML, /id=["']([\w-]+)["']/g], [JS, /id=\\?["']([\w-]+)\\?["']/g], [JS, /id=["']([\w-]+)["']/g],
 /* 19/8: y los que el propio JS crea asignando la propiedad —f.id = "tuto-flecha-ui"— que la
    primera versión de este auditor daba por muertos. Un elemento que el código fabrica está tan
    vivo como uno escrito en el HTML. */
 [JS, /\.id\s*=\s*["'`]([\w-]+)["'`]/g]]
  .forEach(([txt, re]) => { let m; while ((m = re.exec(txt))) escritos.add(m[1]); });

const muertos = [...buscados].filter(id => !escritos.has(id)).sort();
const soloJS = [...buscados].filter(id => escritos.has(id) && !HTML.includes('id="' + id + '"')).sort();

console.log("\nBOTONES Y CAMPOS QUE EL CÓDIGO BUSCA: " + buscados.size);
console.log("   los que viven en el HTML ......... " + [...buscados].filter(id => HTML.includes('id="' + id + '"')).length);
console.log("   los que se dibujan desde JS ...... " + soloJS.length);
console.log("   los que NADIE dibuja ............. " + muertos.length);

if (muertos.length) {
  console.log("\n  !! SOSPECHOSOS — se buscan y nadie los pinta:");
  muertos.forEach(id => console.log("     · " + id));
  console.log("\n  (ojo: puede haber falsos positivos si el id se arma concatenando texto,");
  console.log("   por ejemplo id=\"fila-\" + n. Conviene mirarlos uno por uno antes de tocar nada.)");
} else {
  console.log("\n  ✓ ninguno: todo lo que el código engancha, alguien lo dibuja");
}
console.log("");
process.exit(0);
