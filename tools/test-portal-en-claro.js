/* EL PORTAL VIVE EN TIERRA PROPIA — LAS 17 ETAPAS DEL TERRENO             (1/9, reporte)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección, con captura: « la puerta de la Zona Negra se movió sola al bosque ». La fórmula
   del portal usaba la esquina inferior-derecha del RECTÁNGULO envolvente del terreno — y ese
   rectángulo crece con cada expansión aunque su esquina sea bosque sin comprar: el claro es
   una L, no un rectángulo. Nadie lo movió: el terreno creció por debajo y la fórmula quedó
   apuntando afuera.

   Este archivo recorre las 17 etapas (0 a 16 expansiones) y comprueba que la celda que el
   portal elige es SIEMPRE del jugador — y de paso deja constancia de en cuáles etapas la
   fórmula vieja lo tiraba al bosque, que es la foto del reporte.
     node tools/test-portal-en-claro.js                                                      */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
const GF = g("GF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* la MISMA elección que hace farm.js al crear el portal: la celda tuya más al sur, y de esa
   fila la más al este */
function celdaDelPortal(n) {
  let pc = GF.C1 - 1, pr = GF.R1 - 1;
  fuera:
  for (let r = GF.R1 - 1; r >= GF.R0; r--)
    for (let c = GF.C1 - 1; c >= GF.C0; c--)
      if (GF.tuyo(c, r, n)) { pc = c; pr = r; break fuera; }
  return { pc, pr };
}

console.log("\nEL PORTAL EN LAS 17 ETAPAS DEL TERRENO");
{
  const viejasMal = [];
  let todasBien = true;
  for (let n = 0; n <= 16; n++) {
    GF.aplicarTerreno(n);
    const { pc, pr } = celdaDelPortal(n);
    if (!GF.tuyo(pc, pr, n)) { todasBien = false; ok("etapa " + n + ": el portal cae en celda TUYA", false, pc + "," + pr); }
    /* la fórmula vieja: la esquina del rectángulo envolvente — ¿era del jugador? */
    if (!GF.tuyo(GF.C1 - 1, GF.R1 - 1, n)) viejasMal.push(n);
  }
  ok("en las 17 etapas, la celda elegida es del jugador", todasBien);
  ok("y la fórmula vieja (la esquina del rectángulo) fallaba en " + viejasMal.length + " de ellas",
    viejasMal.length > 0, "etapas " + viejasMal.join(", ") + " — la foto del reporte");
  console.log("       → el rectángulo envolvente crece con cada compra aunque su esquina sea");
  console.log("         bosque ajeno. El claro es una L: la esquina hay que BUSCARLA, no suponerla.");
  GF.aplicarTerreno(0);   // dejar el terreno como lo esperan los demás tests
}

console.log("\nY LA LETRA DE FARM.JS USA ESTA BÚSQUEDA, NO LA ESQUINA CIEGA");
{
  const fs = require("fs");
  const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("el portal busca la celda con GF.tuyo", /GF\.tuyo\(c, r, G\.expansiones\)/.test(FARM));
  ok("y ya no usa ORIG + WORLD para plantarse", !/GF\.ORIG_X \+ GF\.WORLD_W - 90/.test(FARM));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la puerta de la Zona Negra no vuelve a mudarse sola.\n");
process.exit(fallos ? 1 : 0);
