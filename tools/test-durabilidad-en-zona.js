/* LA DURABILIDAD DEL ARMA SE VE DONDE SE GASTA               (15/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « Necesitamos la durabilidad del arma en zona negra en un espacio… abajo… y que aparezca un
   icono en rojo con la espada avisando que le queda poca durabilidad ».

   El número vivía en la Herrería, o sea en la granja: justo donde ya no sirve. El arma se gasta
   peleando, y quedarse sin ella a mitad de la Zona significa volver caminando con lo puesto.

   ui.js no se puede ejecutar sin un DOM de verdad, así que lo que se prueba acá es lo que se
   puede leer sin navegador: que el HTML salga de la durabilidad REAL, que el aviso se encienda
   en el umbral y no antes, que el arma rota se distinga de la gastada, y —lo que ya nos mordió
   dos veces hoy— que la firma del panel incluya la durabilidad. Sin eso el muelle enseñaría el
   número del momento en que entraste y se quedaría mintiendo mientras el arma se rompe.
     node tools/test-durabilidad-en-zona.js                                                     */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
const HTML = fs.readFileSync(path.join(RAIZ, "public/index.html"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

/* se ejecuta la función de verdad, con un GF.spr de mentira (no hay navegador que cargue sprites) */
ctx.GF.spr = (k) => "spr/" + k + ".png";
vm.runInContext(UI.match(/var ARMA_DUR_AVISO = [\s\S]*?\nfunction refreshCombate/)[0].replace(/\nfunction refreshCombate$/, ""), ctx);
const AVISO = g("ARMA_DUR_AVISO");

console.log("\n1 · EL NÚMERO ES EL DE VERDAD\n");
{
  const max = g('ARM_DEF.espada_bronce.dur');
  G.weapons = { espada_bronce: { dur: max } };
  let h = g('durArmaHtml("espada_bronce")');
  ok("(arnés) la espada de bronce aguanta " + max + " golpes", max > 0);
  ok("con el arma entera, el relleno está al 100 %", /width:100%/.test(h), h.match(/width:[\d.]+%/)[0]);
  ok("y el número que se enseña es la durabilidad, no el porcentaje", h.indexOf("<b>" + max + "</b>") > 0);
  G.weapons.espada_bronce.dur = Math.round(max / 2);
  h = g('durArmaHtml("espada_bronce")');
  ok("a media vida, el relleno va por la mitad", /width:5[01]%/.test(h), h.match(/width:[\d.]+%/)[0]);
  ok("sin arma equipada lo dice, no se esconde", /Sin arma/.test(g('durArmaHtml(null)')));
}

console.log("\n2 · EL AVISO SE ENCIENDE EN EL UMBRAL, NO ANTES\n");
{
  const max = g('ARM_DEF.espada_bronce.dur');
  const enUmbral = Math.floor(max * AVISO), justoArriba = Math.ceil(max * AVISO) + 1;
  G.weapons.espada_bronce.dur = justoArriba;
  ok("por encima del umbral no avisa (si avisara siempre, no avisaría nunca)",
    !/cb-dur poca/.test(g('durArmaHtml("espada_bronce")')), justoArriba + "/" + max);
  G.weapons.espada_bronce.dur = enUmbral;
  const h = g('durArmaHtml("espada_bronce")');
  ok("en el umbral sí, y en rojo", /cb-dur poca/.test(h), enUmbral + "/" + max);
  ok("y el rótulo dice qué hacer, no solo que pasa algo", /volvé antes de que se rompa/.test(h));
  G.weapons.espada_bronce.dur = 0;
  const r = g('durArmaHtml("espada_bronce")');
  ok("el arma ROTA se distingue de la gastada", /cb-dur rota/.test(r) && !/poca/.test(r));
  ok("y dice dónde se arregla", /reparala en la Herrería/.test(r));
}

console.log("\n3 · EL UMBRAL ES EL MISMO QUE EL RESTO DEL JUEGO\n");
{
  ok("es un cuarto, como la vida y como una pieza de armadura gastada", AVISO === 0.25, AVISO + "");
  ok("la barra de vida usa el mismo cuarto", /pct <= 0\.25/.test(UI));
  ok("y está en una constante con nombre, no escrito en el medio del HTML", /var ARMA_DUR_AVISO = /.test(UI));
}

console.log("\n4 · Y NO SE QUEDA MINTIENDO MIENTRAS PELEÁS\n");
{
  ok("la firma del muelle incluye la durabilidad del arma", /durArma\].join\("\|"\)/.test(UI) &&
    /const durArma = \(gr\.arma && G\.weapons/.test(UI));
  ok("el muelle la pinta debajo del muñeco", /durArmaHtml\(gr\.arma\) \+/.test(UI));
  ok("y solo dentro de la Zona (en la granja está la Herrería, que ya lo dice)",
    /GF\.scene === "forest"\)\) \{ caja\.style\.display = "none"/.test(UI));
}

console.log("\n5 · EL CSS DISTINGUE LOS TRES ESTADOS\n");
{
  for (const c of ["\\.cb-dur\\{", "\\.cb-dur\\.poca\\{", "\\.cb-dur\\.rota\\{", "\\.cb-dur\\.vacia\\{"])
    ok("existe " + c.replace(/\\/g, ""), new RegExp(c).test(HTML));
  ok("el aviso late, para que se vea sin leer el número", /animation:cbdur/.test(HTML));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
