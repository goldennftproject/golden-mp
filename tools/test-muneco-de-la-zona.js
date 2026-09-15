/* EL EQUIPO ABIERTO AL ENTRAR A LA ZONA                          (15/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Quiero que aparezca esto cuando pases a la Zona Negra… como la bolsa, aparece abierto ».

   El muelle de combate existía desde el 8/9, pero enseñaba SEIS huecos de los diez que el
   jugador lleva puestos: las cuatro piezas de loot, el arma y la munición. El set de la
   Curtiduría —las cinco piezas que de verdad paran los golpes desde el 15/9, con su
   durabilidad— no estaba por ningún lado sin abrir un panel. Dentro de la Zona, donde no se
   puede reparar nada, ése es justo el dato que hace falta antes de meterse más adentro.

   Como ui.js no se puede ejecutar sin un DOM de verdad, esto se custodia leyendo la fuente —
   igual que los otros cinco bugs de interfaz que aparecieron abriendo el juego en el navegador.
   Lo que se mira no es el aspecto, es lo que puede mentir: que estén los diez huecos, que la
   firma incluya la durabilidad (si no, el muñeco se dibuja una vez y se queda fijo mientras la
   armadura se gasta) y que una pieza gastada se vea distinta de una que falta.
     node tools/test-muneco-de-la-zona.js                                                      */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · SE VE SOLO, SIN ABRIR NADA, Y SOLO DENTRO DE LA ZONA\n");
{
  const m = UI.match(/function refreshCombate\(\)[\s\S]*?\n\}/);
  ok("(arnés) se encuentra el muelle de combate", !!m);
  const fn = m ? m[0] : "";
  ok("se esconde fuera de la Zona (en la granja sería ruido)", /GF\.scene === "forest"\)\) \{ caja\.style\.display = "none"/.test(fn));
  ok("y no hay que abrir ningún panel: se pinta en el costado", /caja\.innerHTML =/.test(fn) && /cb-doll/.test(fn));
  ok("el panel vive en el HTML y arranca oculto", /id="combate" style="display:none"/.test(HTML));
}

console.log("\n2 · ESTÁN LOS DIEZ HUECOS, NO SEIS\n");
{
  const fn = (UI.match(/function refreshCombate\(\)[\s\S]*?\n\}/) || [""])[0];
  const SLOTS = g("ARMOR_SLOTS");
  ok("las cinco piezas del set se dibujan desde ARMOR_SLOTS (no escritas a mano)",
    /SLOTS\.map\(piezaSet\)/.test(fn) && /ARMOR_SLOTS/.test(fn), SLOTS.join(", "));
  for (const s of ["casco", "armadura", "botas", "escudo"]) ok("sigue el hueco de loot: " + s, new RegExp('pieza\\("' + s + '"').test(fn));
  ok("y siguen el arma y la munición", /armaHtml/.test(fn) && /munHtml/.test(fn));
  ok("las piezas del set salen con su sprite de verdad (armor_<set>_<pieza>)", /armor_" \+ setEq \+ "_" \+ pz/.test(fn));
  ok("y un hueco vacío enseña su silueta, no un cuadro mudo", /SIL_SET\[pz\]/.test(fn));
  /* las cinco siluetas tienen que ser de las que EXISTEN: una inventada deja el hueco en blanco */
  const sil = (fn.match(/const SIL_SET = \{[\s\S]*?\};/) || [""])[0];
  const usadas = (sil.match(/sil_\w+/g) || []);
  const hay = new Set((UI.match(/sil_\w+/g) || []).concat(HTML.match(/sil_\w+/g) || []));
  ok("las siluetas del set son siluetas que el juego ya usa en otro lado",
    usadas.length === SLOTS.length && usadas.every(s => hay.has(s)), usadas.join(", "));
}

console.log("\n3 · Y NO PUEDE MENTIR MIENTRAS SE JUEGA\n");
{
  const fn = (UI.match(/function refreshCombate\(\)[\s\S]*?\n\}/) || [""])[0];
  ok("la firma que decide si hay que redibujar incluye el set y su durabilidad",
    /setFirma/.test(fn) && /armorDur\(G\.armorEq, pz\)/.test(fn));
  ok("una pieza GASTADA se marca aparte (sigue puesta, pero no defiende)", /" seca"/.test(fn));
  ok("y el CSS la muestra distinta de una que falta", /\.cbq\.seca\{/.test(HTML) && /\.cbq\.vacio\{/.test(HTML));
  ok("el rótulo de la gastada dice qué hacer", /GASTADA: no defiende hasta que la repares/.test(fn));
  ok("la defensa total que se muestra sale de gearDefTotal, que suma set y loot",
    /gearDefTotal\(\)/.test(fn) && g("typeof gearDefTotal") === "function");
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
