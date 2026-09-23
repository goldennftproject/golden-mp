/* EL LOMBRICARIO DICE EL CUPO, NO SOLO LO COBRA                                (23/9, diseñador)
   Discord, 05:08, con captura: « coloco calabazas y para las otras bocas no me deja colocarlo,
   aparece el letrero de arriba y selecciono otro cultivo y tampoco ».
   No era un fallo del cupo (dirección, 9/9: 15 lombrices al día): la calabaza se llevó 12,
   quedaban 3, y cebolla (11) o calabaza (12) no entran. El fallo era que el panel NO LO DECÍA:
   la lista ofrecía cultivos que no entraban y la única respuesta era un toast de dos segundos.
   Ahora:  · el pie dice « Cupo de hoy: 12 de 15 · quedan 3 »;
           · cada fila de la lista dice si entra, y la que no entra queda apagada;
           · si nada de lo que tenés entra, el botón lo explica y nombra lo que sí entraría.
     node tools/test-lombricario-cupo.js                                                      */
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
window.__caso = function (res, lombDiaN) {
  /* G.skills guarda XP; se sube hasta que Cultivo llegue a 10 (dos bocas) */
  G.skills = G.skills || {}; G.skills.farming = 0;
  while (nivelOficio("farming") < 10) G.skills.farming += 50;
  G.lombricario = [{ cultivo: "calabaza", n: 12, listaEn: nowMs() + 7 * 3600e3 }];
  G.res = Object.assign({}, res);
  G.lombDia = { dia: hoyClave(), n: lombDiaN };
  const lista = document.getElementById("lom-lista"); lista.style.display = "";
  refreshLombricario();
  const filas = Array.from(lista.querySelectorAll(".lom-cult")).map(el => ({ k: el.dataset.lomCult, off: el.disabled, st: el.querySelector(".st").textContent }));
  return JSON.stringify({ bocas: lombricarioBocas(), libre: lombricesCupoLibre(), boton: document.getElementById("lom-echar").textContent,
    off: document.getElementById("lom-echar").disabled, pie: document.getElementById("lom-dia").textContent, filas });
};`);

console.log("\nLA CAPTURA DEL DISEÑADOR: calabaza puesta (12 de 15), cebolla y calabaza en el granero\n");
{
  const s = JSON.parse(w.__caso({ cebolla: 11, calabaza: 12 }, 12));
  ok("hay más de una boca (la fila existe)", s.bocas > 1, "bocas " + s.bocas);
  ok("quedan 3 del cupo", s.libre === 3, "quedan " + s.libre);
  ok("el pie dice el cupo de hoy y cuánto queda", /Cupo de hoy: 12 de 15/.test(s.pie) && /quedan 3/.test(s.pie), s.pie.slice(0, 60));
  ok("el pie ya no promete « 3 tandas » como rinde", !/3 tandas de 8 h/.test(s.pie));
  ok("el botón explica que nada de lo que tenés entra y nombra lo que sí", /no entra nada/.test(s.boton) && /papa|ciruela|cereza/i.test(s.boton) && s.off, s.boton);
}

console.log("\nCON UN CULTIVO BARATO EN EL GRANERO, LA LISTA DISTINGUE\n");
{
  const s = JSON.parse(w.__caso({ cebolla: 11, ciruela: 6 }, 12));
  ok("el botón se puede usar", !s.off, s.boton);
  const ceb = s.filas.find(f => f.k === "cebolla"), cir = s.filas.find(f => f.k === "ciruela");
  ok("la cebolla se ve pero apagada, con el motivo", ceb && ceb.off && /no entra hoy/.test(ceb.st), JSON.stringify(ceb));
  ok("la ciruela entra y sigue diciendo el stock", cir && !cir.off && /tenés 6/.test(cir.st), JSON.stringify(cir));
}

console.log("\nCUPO AGOTADO\n");
{
  const s = JSON.parse(w.__caso({ ciruela: 6 }, 15));
  ok("el botón dice que el cupo se agotó y cuándo vuelve", /agotado/.test(s.boton) && /00:00/.test(s.boton) && s.off, s.boton);
  ok("y el pie también", /agotado/.test(s.pie));
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ el Lombricario dice el cupo antes de que el jugador choque con él\n");
process.exit(fallos ? 1 : 0);
