/* LA BARRA DE ARRIBA NO SE MUEVE POR LO QUE PASE EN EL JUEGO              (2/9, reporte)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección: « al abrir el paquete del daily se movió la barra de arriba con todos los datos
   — lo que uno haga dentro del juego no tiene por qué afectar los menúes ». La causa: el
   premio era la Bendición del Granjero (+5 % 1 h), su chip (#buffpill) vivía DENTRO de la
   barra con display:none, y al nacer el chip la barra ya no entraba y envolvía una fila
   hacia abajo (la envoltura es del 18/8, para móviles — correcta, pero no para esto).

   La regla que este archivo custodia: toda píldora que aparece y desaparece según el juego
   (estamina, buffs de comida) vive en la repisa #hud-flot, ABSOLUTA bajo la barra, fuera de
   su flujo. Dentro de la barra solo puede haber elementos permanentes (o de dev, como el
   botón ?test, que no nace jugando).
     node tools/test-barra-quieta.js                                                        */
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");
const barra = HTML.match(/<div class="hudbar">([\s\S]*?)\n  <\/div>/);
const flot = HTML.match(/<div id="hud-flot">([\s\S]*?)<\/div>\s*\n  <\/div>/);

console.log("\nLAS PÍLDORAS DE QUITA Y PON VIVEN EN LA REPISA, NO EN LA BARRA");
{
  ok("existe la repisa #hud-flot", !!flot);
  ok("la estamina vive ahí", !!(flot && /id="stampill"/.test(flot[1])));
  ok("los buffs de comida también", !!(flot && /id="buffpill"/.test(flot[1])));
  /* dentro de .hud (el flujo real de la barra) no puede quedar NINGÚN display:none de juego */
  const hud = HTML.match(/<div class="hud">([\s\S]*?)<\/div>\s*\n    <!-- 2\/9/);
  const escondidas = hud ? [...hud[1].matchAll(/id="([^"]+)"[^>]*style="[^"]*display:none/g)].map(m => m[1]) : ["(no se encontró .hud)"];
  ok("en el flujo de la barra no queda ninguna píldora que aparezca jugando", escondidas.length === 0,
    escondidas.join(", "));
}

console.log("\nY LA REPISA ESTÁ FUERA DEL FLUJO: ABSOLUTA BAJO LA BARRA");
{
  const css = HTML.match(/#hud-flot\{([^}]*)\}/);
  ok("posición absoluta (no participa del flex de la barra)", !!(css && /position:absolute/.test(css[1])));
  ok("anclada al borde inferior real de la barra (top:100%)", !!(css && /top:100%/.test(css[1])));
  ok("con sus clics vivos (pointer-events:auto — la barra los apaga por defecto)",
    !!(css && /pointer-events:auto/.test(css[1])));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la barra es de piedra — los chips van y vienen por abajo.\n");
process.exit(fallos ? 1 : 0);
