/* ¿ALGUNA ACCIÓN TERMINA EN SILENCIO? (24/8, dirección)
   « Mirá las mecánicas que terminan en silencio, sin decir si falla o acierta, que al menos se
   note cómo funciona. »
   El caso que lo motivó: el diseñador intentaba domar una rata con su plato en la bolsa y no
   pasaba NADA — ni éxito ni fallo — porque domaIntentar cortaba antes por nivel de granja. Esa
   clase de fallo es la peor de todas: el jugador no puede diagnosticarla desde dentro del juego
   y concluye, con razón, que la mecánica está rota.

   REGLA DE LA CASA: toda acción que el jugador dispara termina diciendo algo — un toast, una
   línea del registro, un efecto visible o una ventana. Un `return` sin ninguna de esas cosas es
   una acción muda, y solo se permite cuando:
     · es una GUARDA DE CATÁLOGO (el id no existe: bug de programación, no del jugador) y deja
       rastro en la consola con console.warn;
     · es un camino de ÉXITO que ya avisó más arriba;
     · o es render puro (repintar algo no es una acción).

   Este auditor recorre las funciones que el jugador dispara y cuenta las salidas mudas. La línea
   base está abajo: si aparece una nueva, se pone en rojo. Bajarla está siempre bien; subirla hay
   que justificarlo en el mismo commit.
     node tools/auditar-silencios.js                                                             */
const fs = require("fs");

/* las funciones que un CLIC del jugador puede disparar */
const ACCIONES = {
  "public/game/state.js": ["comprarAnimal", "alimentarAnimal", "recogerAnimal", "establoAlimentarTodo",
    "establoRecogerTodo", "cook", "sellDish", "craftMat", "craftTool", "craftPick", "buySeed", "buyWorm",
    "sellItem", "expansionComprar", "goFishing", "excavCavar", "pedidoEntregar", "pedidoDescartar",
    "valesCanjear", "comprarEmergencia", "comprarDeco", "domaIntentar", "domaAlimentar", "goblinAceptar",
    "logroCobrar"],
  "public/game/farm.js": ["interactWith", "tryFish"],
};
/* lo que cuenta como "decir algo" */
const HABLA = /toast\(|log\(|avisoAccion|bagFull|tutoAviso|askConfirm|celebrate|premioFx|puffFx|console\.warn|openOv|startAction|sfx\(/;
/* returns que no son una salida de acción (éxito ya avisado, valores internos, render) */
const NO_CUENTA = /return \{|return this|return true|return false|return o\b|return \w+\.\w|return dados|return total|return b;|return listos|return mejor|return PICK_ORDER/;

let mudos = [], total = 0;
for (const arch in ACCIONES) {
  const src = fs.readFileSync(arch, "utf8");
  for (const fn of ACCIONES[arch]) {
    const re = new RegExp("(function\\s+" + fn + "\\s*\\(|\\n\\s{0,4}" + fn + "\\s*\\([^)]*\\)\\s*\\{)");
    const m = src.match(re); if (!m) continue;
    const i = src.indexOf(m[0]);
    let j = src.indexOf("\nfunction ", i + 10);
    const j2 = src.indexOf("\n  }", i + 10);
    if (j < 0 || (j2 > 0 && j2 < j)) j = j2;
    const lineas = src.slice(i, j > 0 ? j : i + 5000).split("\n");
    lineas.forEach((l, k) => {
      if (!/\breturn\b/.test(l) || NO_CUENTA.test(l)) return;
      total++;
      const ventana = lineas.slice(Math.max(0, k - 3), k + 1).join("\n");
      if (!HABLA.test(ventana)) mudos.push(fn + "  ·  " + l.trim().slice(0, 78));
    });
  }
}

/* LÍNEA BASE — medida el 24/8 tras cerrar los cuatro silencios que encontró el diseñador.
   Lo que queda son ocho salidas legítimas que el patrón no sabe distinguir: los dos «no tenés
   animales de esa especie» (silencio a propósito: lo usan los botones «todo» del establo) y las
   seis de interactWith, que abren una ventana o delegan en una función que sí habla. */
const BASE = 8;

console.log("\n¿ALGUNA ACCIÓN DEL JUGADOR TERMINA MUDA?\n");
console.log("  salidas de acción revisadas: " + total);
console.log("  sin avisar nada:             " + mudos.length + "   (línea base: " + BASE + ")\n");
mudos.forEach(m => console.log("    · " + m));

if (mudos.length > BASE) {
  console.log("\n  !! HAY " + (mudos.length - BASE) + " SILENCIO(S) NUEVO(S). Toda acción tiene que contestar algo:");
  console.log("     un toast, una línea del registro, un efecto o una ventana. Si es una guarda");
  console.log("     de catálogo (un id que no existe), al menos un console.warn.");
  process.exit(1);
}
console.log("\n  ✓ ninguna acción nueva se quedó callada" + (mudos.length < BASE ? "  (y hay " + (BASE - mudos.length) + " menos que en la línea base: bajá BASE)" : ""));
process.exit(0);
