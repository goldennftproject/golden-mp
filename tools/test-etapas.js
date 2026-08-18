/* LAS 17 ETAPAS, CON LA GEOMETRÍA DEL JUEGO (18/8)
   Comprueba lo que no se ve en una captura: que la cerca sea el perímetro exacto, que nada del
   contenido quede fuera, que la cámara alcance todo el terreno y que la memoria de textura no se
   dispare — que fue lo que corrompió la laguna al llegar a 39 MB.
     node tools/test-etapas.js                                                                  */
const fs = require("fs"), vm = require("vm");
const ctx = { console: { log(){}, warn(){} }, Math, Date, JSON }; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync("public/game/config.js", "utf8"), ctx, { filename: "config.js" });
const G = ctx.GF, T = G.TILE;
let fallos = 0;
const mal = (m) => { fallos++; console.log("  FALLA  " + m); };

console.log("etapa  granja   cerca   cámara(px)      césped   bosque    total");
for (let n = 0; n <= 16; n++) {
  const t = G.aplicarTerreno(n);

  // 1) la cerca: contar tramos recorriendo el perímetro, y contrastar con enCerca
  let tramos = 0, celdasCerca = 0;
  t.mias.forEach(s => {
    const p = s.split(","), c = +p[0], r = +p[1];
    if (!t.mias.has(c + "," + (r - 1))) tramos++;
    if (!t.mias.has(c + "," + (r + 1))) tramos++;
    if (!t.mias.has((c - 1) + "," + r)) tramos++;
    if (!t.mias.has((c + 1) + "," + r)) tramos++;
    if (G.enCerca(c, r)) celdasCerca++;
  });
  if (tramos === 0) mal("etapa " + n + ": la cerca no tiene ni un tramo");
  if (celdasCerca === 0 || celdasCerca >= t.mias.size) mal("etapa " + n + ": la banda de cerca es absurda (" + celdasCerca + " de " + t.mias.size + ")");

  // 2) nada del contenido puede quedar sobre la cerca ni fuera del terreno
  const fuera = [];
  G.WORLD_OBJECTS.forEach(o => { for (let c = o.leftCol; c < o.leftCol + Math.ceil(o.wCells); c++)
    if (G.enCerca(c, o.baseRow)) fuera.push(o.type); });
  G.PLOTS.forEach((p, i) => { if (G.enCerca(p.col, p.row)) fuera.push("parcela" + i); });
  for (let c = 0; c < G.POND.cols; c++) for (let r = 0; r < G.POND.rows; r++)
    if (G.enCerca(G.POND.col + c, G.POND.row + r)) fuera.push("laguna");
  if (fuera.length) mal("etapa " + n + ": pisa la cerca -> " + [...new Set(fuera)].join(", "));

  // 3) la cámara tiene que alcanzar TODO el terreno despejado
  const MX = Math.max(T * 3, Math.round(((G.MAPA || 1600) - G.WORLD_W) / 2));
  const MY = Math.max(T * 3, Math.round(((G.MAPA || 1600) - G.WORLD_H) / 2));
  const lim = { x1: G.ORIG_X - MX, y1: G.ORIG_Y - MY, x2: G.ORIG_X + G.WORLD_W + MX, y2: G.ORIG_Y + G.WORLD_H + MY };
  if (lim.x1 > t.dc0 * T || lim.y1 > t.dr0 * T || lim.x2 < t.dc1 * T || lim.y2 < t.dr1 * T)
    mal("etapa " + n + ": la cámara no llega a todo el césped");

  // 4) memoria de textura de los dos renderTextures
  const cExtra = 4;
  const gW = (t.cols + cExtra * 2) * T, gH = (t.rows + cExtra * 2) * T;
  const bW = G.WORLD_W + 2 * Math.min(MX, (G.BOSQUE_RT_CELDAS || 7) * T);
  const bH = G.WORLD_H + 2 * Math.min(MY, (G.BOSQUE_RT_CELDAS || 7) * T);
  const mb = (a, b) => a * b * 4 / 1048576;
  const ces = mb(gW, gH), bos = mb(bW, bH);
  if (ces + bos > 30) mal("etapa " + n + ": " + (ces + bos).toFixed(1) + " MB de textura (el bug de la laguna fue a 39)");

  if (n % 4 === 0 || n === 16)
    console.log(String(n).padStart(5) + (t.cols + "x" + t.rows).padStart(8) + String(tramos).padStart(8) +
      "   " + (Math.round(lim.x2 - lim.x1) + "x" + Math.round(lim.y2 - lim.y1)).padStart(11) +
      ces.toFixed(1).padStart(9) + bos.toFixed(1).padStart(9) + (ces + bos).toFixed(1).padStart(9) + " MB");
}
G.aplicarTerreno(0);
console.log("\n" + (fallos ? "FALLOS: " + fallos : "las 17 etapas en verde"));
process.exit(fallos ? 1 : 0);
