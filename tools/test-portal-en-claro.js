/* EL PORTAL NO SE MUDA — SU CELDA ES FIJA EN LAS 17 ETAPAS                (1/9, reporte)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección, con captura: « la puerta de la Zona Negra se movió sola al bosque ». La fórmula
   del portal usaba la esquina inferior-derecha del RECTÁNGULO envolvente del terreno — y ese
   rectángulo crece con cada expansión aunque su esquina sea bosque sin comprar: el claro es
   una L, no un rectángulo. Nadie lo movió: el terreno creció por debajo y la fórmula quedó
   apuntando afuera.

   Y la regla de la casa, dictada al ver el primer arreglo (que lo seguía a la esquina del
   claro real, mudándolo con cada compra): « lo que está dentro de la granja se queda en su
   posición hasta que el jugador decida moverlo ». Así que el portal vive en una celda FIJA:
   la esquina del claro INICIAL — donde estuvo siempre antes de la primera expansión. Como
   las expansiones solo AGREGAN tierra, esa celda es del jugador para siempre.

   Este archivo recorre las 17 etapas (0 a 16 expansiones) y comprueba las dos cosas: que la
   celda es SIEMPRE la misma, y que es SIEMPRE del jugador — y de paso deja constancia de en
   cuáles etapas la fórmula vieja lo tiraba al bosque, que es la foto del reporte.
     node tools/test-portal-en-claro.js                                                      */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
const GF = g("GF");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* la MISMA elección que hace farm.js al crear el portal: la celda del claro INICIAL más al
   sur, y de esa fila la más al este — GF.tuyo con 0 expansiones, pase lo que pase después */
function celdaDelPortal() {
  let pc = GF.C1 - 1, pr = GF.R1 - 1;
  fuera:
  for (let r = GF.R1 - 1; r >= GF.R0; r--)
    for (let c = GF.C1 - 1; c >= GF.C0; c--)
      if (GF.tuyo(c, r, 0)) { pc = c; pr = r; break fuera; }
  return { pc, pr };
}

console.log("\nEL PORTAL EN LAS 17 ETAPAS DEL TERRENO");
{
  GF.aplicarTerreno(0);
  const casa = celdaDelPortal();          // la celda de la etapa 0: el hogar del portal
  const viejasMal = [];
  let quieta = true, propia = true;
  for (let n = 0; n <= 16; n++) {
    GF.aplicarTerreno(n);
    const { pc, pr } = celdaDelPortal();
    if (pc !== casa.pc || pr !== casa.pr) { quieta = false; ok("etapa " + n + ": el portal NO se movió", false, pc + "," + pr + " ≠ " + casa.pc + "," + casa.pr); }
    if (!GF.tuyo(pc, pr, n)) { propia = false; ok("etapa " + n + ": la celda es del jugador", false, pc + "," + pr); }
    /* la fórmula vieja: la esquina del rectángulo envolvente — ¿era del jugador? */
    if (!GF.tuyo(GF.C1 - 1, GF.R1 - 1, n)) viejasMal.push(n);
  }
  ok("en las 17 etapas, el portal está en LA MISMA celda", quieta, casa.pc + "," + casa.pr + " — la esquina del claro inicial");
  ok("y esa celda es del jugador en todas — expandir solo AGREGA tierra", propia);
  ok("la fórmula vieja (la esquina del rectángulo) fallaba en " + viejasMal.length + " etapas",
    viejasMal.length > 0, "etapas " + viejasMal.join(", ") + " — la foto del reporte");
  console.log("       → « lo que está dentro de la granja se queda en su posición hasta que");
  console.log("         el jugador decida moverlo » — la celda se fija, no se persigue.");
  GF.aplicarTerreno(0);   // dejar el terreno como lo esperan los demás tests
}

console.log("\nY LA LETRA DE FARM.JS USA LA CELDA FIJA, NO LA ESQUINA CIEGA");
{
  const fs = require("fs");
  const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("el portal busca su celda con GF.tuyo(c, r, 0) — el claro inicial", /GF\.tuyo\(c, r, 0\)/.test(FARM));
  ok("no la sigue a las expansiones", !/GF\.tuyo\(c, r, G\.expansiones\)/.test(FARM));
  ok("y ya no usa ORIG + WORLD para plantarse", !/GF\.ORIG_X \+ GF\.WORLD_W - 90/.test(FARM));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la puerta de la Zona Negra vive quieta en su celda de siempre.\n");
process.exit(fallos ? 1 : 0);
