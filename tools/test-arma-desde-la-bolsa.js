/* EL ARMA SE CAMBIA DESDE LA BOLSA Y SE VE EN EL ACTO                         (26/9, dirección)
   Con vídeo: tocaba el Arco de Piedra en la bolsa, salía « Arco de Piedra equipada »… y la grilla
   seguía igual hasta cerrar y abrir la bolsa. Dos cosas faltaban: la bolsa nunca MARCABA el arma
   en uso (solo el pico), y el clic no repintaba la grilla.
     node tools/test-arma-desde-la-bolsa.js                                                   */
const fs = require("fs");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) { console.log("\n  (saltado: falta jsdom)\n"); process.exit(0); }
const dom = new JSDOM(fs.readFileSync("public/index.html", "utf8"),
  { runScripts: "outside-only", pretendToBeVisual: true, url: "https://golden.test/" });
const w = dom.window;
w.Phaser = { Scene: class {}, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Between: a => a, Distance: { Between: () => 0 } },
  BlendModes: { ADD: 1 }, Geom: {}, Display: { Color: {} } };
const src = ["config", "state", "ui"].map(f => fs.readFileSync("public/game/" + f + ".js", "utf8")).join("\n;\n");
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

w.eval(src + `
window.__caso = function () {
  G.tuto = { done: true }; G.level = 10;
  G.weapons = { espada_piedra: { dur: 100 }, arco_piedra: { dur: 100 } };
  G.gear = Object.assign(G.gear || {}, { arma: "espada_piedra" });
  G.slots = [{ kind: "arm", key: "espada_piedra" }, { kind: "arm", key: "arco_piedra" }];
  if (typeof syncSlots === "function") syncSlots();
  refreshInv();
  const marca = () => Array.from(document.querySelectorAll("#inv-grid .slot, .inv .slot, .slot[data-slot]"))
    .filter(el => el.classList.contains("k-arm"))
    .map(el => (el.classList.contains("eq") ? "EQ:" : "") + (G.slots[+el.dataset.slot] || {}).key);
  const antes = marca();
  const iArco = G.slots.findIndex(s => s && s.kind === "arm" && s.key === "arco_piedra");
  invCellClick(iArco);              // el clic de la bolsa, sin cerrar ni abrir nada
  const despues = marca();
  return JSON.stringify({ antes, despues, arma: G.gear.arma });
};`);

console.log("\nTOCAR EL ARCO EN LA BOLSA\n");
{
  const s = JSON.parse(w.__caso());
  /* el arma EN USO no vive en la grilla (está en la mano): la bolsa muestra las otras */
  ok("antes: la espada está en la mano y en la bolsa se ve el arco", s.antes.includes("arco_piedra") && !s.antes.includes("espada_piedra"), JSON.stringify(s.antes));
  ok("el arma equipada cambió", s.arma === "arco_piedra", s.arma);
  ok("y la bolsa lo muestra SIN cerrarla: el arco pasó a la mano y la espada volvió a la grilla", s.despues.includes("espada_piedra") && !s.despues.includes("arco_piedra"), JSON.stringify(s.despues));
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ el arma se cambia desde la bolsa y se ve en el acto\n");
process.exit(fallos ? 1 : 0);
