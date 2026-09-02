/* LAS MARIPOSAS NO ROBOTEAN LOS MONTÍCULOS                                (2/9, reporte)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección: « las mariposas se quedan roboteando los montículos y no van a otro lugar ».
   Los montículos tenían dos ventajas desleales en el imán del 19/8: readyAt 0 les daba una
   "edad" de t entero (esperaban desde el origen de los tiempos, le ganaban el turno a todo)
   y con las expansiones ya hay más montículos que mariposas — las tres quedaban en órbita
   perpetua. El arreglo: un montículo por vez en la lista, edad desde que nació HOY (o.nace),
   y turno de 20 s de señal + 45 s de descanso, cerrado por tickMariposas.

   Este archivo lo custodia leyendo la letra de farm.js — la mecánica vive en la escena y
   estas reglas son de forma verificable en el fuente.
     node tools/test-mariposas-turno.js                                                      */
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
const SIN = FARM.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

console.log("\nEL TURNO DE LOS MONTÍCULOS EN EL IMÁN");
{
  ok("entra UN montículo por vez a la lista, no el desfile", /yaHayExcav/.test(SIN) &&
    /o\.type === "excav" && !yaHayExcav/.test(SIN));
  ok("el ya señalado descansa — la pausa se consulta al armar la lista", /excavPausa\["excav" \+ o\.idx\]/.test(SIN));
  ok("su edad se mide desde que nació HOY, no desde el origen de los tiempos",
    /edad: t - \(o\.nace \|\| 0\)/.test(SIN));
  ok("y el montículo nace con su fecha", /type: "excav"[\s\S]{0,220}nace:/.test(SIN));
}

console.log("\nY EL TICK CIERRA EL TURNO: 20 s DE SEÑAL, 45 DE DESCANSO");
{
  ok("el ancla lleva su clave para poder cronometrarla", /m\.ancla = \{ x: libre\.x, y: libre\.y, o: libre\.o, k: libre\.k \}/.test(SIN));
  ok("a los 20 s sobre un montículo, la mariposa lo suelta",
    /m\.ancla\.o\.type === "excav" && t - \(m\.anclaDesde \|\| t\) > 20000/.test(SIN));
  ok("y le anota 45 s de descanso", /_excavPausa[\s\S]{0,80}= t \+ 45000/.test(SIN));
  ok("el reloj del turno arranca al cambiar de destino (sobrevive a las reasignaciones)",
    /if \(k !== m\.anclaK\) \{ m\.anclaK = k \|\| null; m\.anclaDesde = t; \}/.test(SIN));
}

console.log("\nLA SEÑAL EN SÍ NO SE PERDIÓ");
{
  ok("los montículos siguen entrando al imán (el aviso de la lombriz gratis queda)",
    /o\.type === "excav" && !yaHayExcav/.test(SIN) && /"excav" \+ o\.idx, prio: objPlots \? 0 : 1/.test(SIN));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: las mariposas avisan del montículo y siguen su vuelo.\n");
process.exit(fallos ? 1 : 0);
