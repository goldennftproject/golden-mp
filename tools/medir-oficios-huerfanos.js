/* LOS SEIS OFICIOS HUÉRFANOS, CON NÚMEROS                       (14/9, para decidir el TODO)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   El TODO lo tiene abierto desde el 9/9: « Espada, Hacha, Mazo, Arco, Tala y Artesanía. O
   reciben algo que abrir, o se acepta que su nivel es un número y se les da un techo honesto. Lo
   que no puede seguir es el 150 de reserva. »

   Este archivo no decide nada: junta lo que hace falta para decidir. Tres preguntas, tres
   respuestas medidas.

     1 · ¿QUÉ HACE HOY el nivel de cada oficio? Los cinco sanos abren cosas concretas (semillas,
         minerales, animales, recetas, cañas). De los seis huérfanos, las cuatro armas sí hacen
         algo —entran en el daño por la fórmula de Tibia— pero no ABREN nada; Tala y Artesanía
         no hacen absolutamente nada: son un contador.
     2 · ¿HASTA DÓNDE LLEGA el jugador de verdad? Un techo de 150 solo es honesto si alguien se
         acerca. Se mide contra la partida entera del simulador.
     3 · ¿CUÁNTO CUESTA el siguiente nivel allá arriba? Es lo que dice si el 150 es una meta o
         un decorado.
     node tools/medir-oficios-huerfanos.js                                                      */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

const SANOS = ["farming", "mining", "ganaderia", "cooking", "fishing"];
const HUERFANOS = ["sword", "hacha", "mazo", "range", "tala", "crafting"];
const LABEL = { farming: "Cultivo", mining: "Minería", ganaderia: "Ganadería", cooking: "Cocina",
  fishing: "Pesca", tala: "Tala", crafting: "Artesanía", sword: "Espada", hacha: "Hacha",
  mazo: "Mazo", range: "Arco" };

console.log("\n1 · QUÉ ABRE CADA OFICIO, Y HASTA DÓNDE\n");
console.log("   oficio       techo   cosas que abre   qué hace su nivel");
const QUE_HACE = {
  tala: "NADA — es un contador puro",
  crafting: "NADA — es un contador puro",
  sword: "entra en el daño (fórmula de Tibia), pero no abre nada",
  hacha: "entra en el daño (fórmula de Tibia), pero no abre nada",
  mazo: "entra en el daño (fórmula de Tibia), pero no abre nada",
  range: "entra en el daño (fórmula de Tibia), pero no abre nada",
};
for (const k of SANOS.concat(HUERFANOS)) {
  let techo = "?", abre = [];
  try { techo = g('oficioTecho("' + k + '")'); } catch (e) {}
  try { abre = g('oficioAbre("' + k + '")') || []; } catch (e) {}
  console.log("   " + LABEL[k].padEnd(12) + String(techo).padStart(5) + String(abre.length).padStart(16) +
    "   " + (QUE_HACE[k] || "abre contenido, y su techo sale de ese contenido"));
}

console.log("\n2 · HASTA DÓNDE LLEGA EL JUGADOR DE VERDAD\n");
{
  /* Las armas suben por INTENTOS desde el 11/9: un golpe, un intento. Así que « hasta dónde
     llega » se contesta en golpes, no en horas, y el número sale de la fórmula del documento. */
  console.log("   LAS ARMAS (suben por intentos: un golpe = un intento)\n");
  console.log("   skill   golpes acumulados   qué significa");
  const refs = [
    [15, "unas cuantas tardes en la Zona"],
    [20, "el jugador del día 7 (medido en medir-combate.js)"],
    [30, "el que sigue jugando semanas"],
    [40, "obsesivo"],
    [50, "el ejemplo grande del documento del diseñador"],
    [60, ""], [80, ""], [100, "el tope del que habla el documento"],
  ];
  for (const [lvl, nota] of refs) {
    const t = g('triesTotal(' + lvl + ', "sword")');
    console.log("   " + String(lvl).padStart(5) + String(Math.round(t).toLocaleString("es")).padStart(20) + "   " + nota);
  }
  const t150 = g('triesTotal(150, "sword")');
  console.log("\n   Para llegar al techo de 150 harían falta " + Math.round(t150).toLocaleString("es") + " golpes.");
  /* a un golpe por segundo peleando sin parar, sin caminar, sin morir y sin dormir */
  const horas = t150 / 3600;
  console.log("   A un golpe por segundo, sin parar nunca, son " + Math.round(horas).toLocaleString("es") +
    " horas (" + Math.round(horas / 24).toLocaleString("es") + " días de reloj CONTINUOS).");
  console.log("   El simulador da la partida entera en 26,3 días con 7,2 h de manos en el juego.");
}

console.log("\n3 · LO QUE CUESTA EL SIGUIENTE ESCALÓN ALLÁ ARRIBA\n");
{
  console.log("   de → a      golpes    contra el escalón 10→11 (50 golpes)");
  for (const l of [10, 20, 30, 50, 100, 149]) {
    const n = g('triesNeed(' + l + ', "sword")');
    console.log("   " + (l + " → " + (l + 1)).padEnd(12) + String(Math.round(n).toLocaleString("es")).padStart(9) +
      String("×" + Math.round(n / 50).toLocaleString("es")).padStart(12));
  }
}

console.log("\n4 · TALA Y ARTESANÍA: EL CASO MÁS CLARO\n");
{
  const fs = require("fs");
  const todo = ["state", "farm", "forest", "ui", "config"].map(f => fs.readFileSync(path.join(RAIZ, "public/game/" + f + ".js"), "utf8")).join("\n");
  /* se busca cualquier lectura del NIVEL de esos dos oficios: si nadie lo pregunta, el nivel no
     existe para el juego, solo para el panel que lo muestra. */
  const lee = (k) => (todo.match(new RegExp('nivelOficio\\("' + k + '"\\)|skillInfo\\(G\\.skills\\.' + k, "g")) || []).length;
  for (const k of ["tala", "crafting"]) {
    const n = lee(k);
    console.log("   " + LABEL[k].padEnd(12) + "el juego pregunta su nivel " + n + " vez(ces)" +
      (n === 0 ? "  ← no lo pregunta NADIE: sube un número que no hace nada" : ""));
  }
  for (const k of ["farming", "mining", "cooking"]) console.log("   " + LABEL[k].padEnd(12) + "(de referencia: " + lee(k) + ")");
}

console.log("\nLO QUE ESTO DEJA SOBRE LA MESA\n");
console.log("   · Tala y Artesanía son contadores: nadie pregunta su nivel. O reciben contenido, o");
console.log("     lo honesto es decir en el panel que miden práctica y no abren nada (la Tala ya");
console.log("     lo dice: « Mide tu práctica · la madera no tiene escalones »).");
console.log("   · Las cuatro armas SÍ hacen algo — el daño — pero su techo de 150 no lo alcanza");
console.log("     nadie ni de lejos. Un techo honesto es el nivel al que de verdad se llega.");
console.log("   · Y el Combate tiene el mismo agujero por arriba: la vida sube al 5 y al 10 y");
console.log("     después nunca más (ver medir-combate.js). Es la misma decisión, no otra.\n");
