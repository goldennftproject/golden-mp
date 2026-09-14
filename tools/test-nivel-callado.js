/* NINGÚN NIVEL DE GRANJA SE QUEDA SOLO CON EL BONO, Y EL F5 YA NO DESHACE LA PELEA    (14/9)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dos decisiones de dirección del 14/9, las dos con el mismo problema de fondo: algo que el
   jugador ve —un nivel que no entrega nada, una muerte que se esquiva— y que ningún test miraba.

   1 · NINGÚN NIVEL CALLADO. Con el techo en 50, « qué entregan los 26 niveles sin recompensa
       jugable » era la decisión más grande del TODO. Bajar el techo a 25 la achicó sola: 20 de
       los 24 niveles ya entregaban algo. Los otros cuatro (8, 14, 22, 24) daban el bono de venta,
       que es invisible, y un cosmético, que en MVP está escondido y que la ley 3 no cuenta como
       contenido. Se tapan con capacidad de cofre, DERIVADA: se pregunta qué niveles quedaron
       callados en vez de escribir los cuatro números. Si el techo se vuelve a mover, se
       recalculan solos — que es todo el punto.

   2 · EL F5 DENTRO DE LA ZONA. La vida se guardaba solo al entrar, así que recargar te devolvía
       la barra llena: a 3 de vida apretabas F5 y volvías a la granja con todo. Ahora la vida
       viaja al guardado cada ZONA_HP_GUARDA_S segundos mientras te pegan. Lo que este archivo
       custodia es que el arreglo no se pase de largo: tiene que seguir SIN castigar una caída de
       red, porque eso lo prohíbe la ley 1.
     node tools/test-nivel-callado.js                                                           */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

console.log("\n1 · TODOS LOS NIVELES ENTREGAN ALGO QUE SE PUEDA USAR\n");
{
  vm.runInContext("GF.MVP = 0;", ctx);            // con los cosméticos visibles: el caso más exigente
  const MAX = g("FARM_NIVEL_MAX");
  const jugable = /expansi|plano|nivel 2|capacidad de cofre|vales/i;
  const callados = [];
  for (let L = 2; L <= MAX; L++) if (!jugable.test(g("farmUnlockTxt(" + L + ")"))) callados.push(L);
  ok("del 2 al techo (" + MAX + "), ninguno trae solo el bono de venta", callados.length === 0, callados.join(","));

  /* el cosmético NO cuenta (ley 3), así que la cuenta tiene que dar igual con la bandera del MVP
     puesta — que es como lo va a ver el que juegue la semana */
  vm.runInContext("GF.MVP = 1;", ctx);
  const conMvp = [];
  for (let L = 2; L <= MAX; L++) if (!jugable.test(g("farmUnlockTxt(" + L + ")"))) conMvp.push(L);
  ok("y tampoco con GF.MVP = 1, que es como lo ve el playtest", conMvp.length === 0, conMvp.join(","));

  ok("los cuatro que estaban callados (8, 14, 22, 24) tienen cofre", [8, 14, 22, 24].every(L => g("FARM_COFRE")[L] > 0),
    JSON.stringify(g("FARM_COFRE")));
  ok("el relleno es más chico que los escalones de a mano (10 y 15)", g("COFRE_RELLENO") < 10, g("COFRE_RELLENO"));

  /* la parte que importa de verdad: que NO estén escritos a mano. Con otro techo, otros niveles
     quedan callados, y el relleno tiene que encontrarlos igual. */
  const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
  for (const techo of [20, 30, 50]) {
    const { ctx: c2 } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ, {
      "game/state.js": STATE.replace("const FARM_NIVEL_MAX = 25;", "const FARM_NIVEL_MAX = " + techo + ";"),
    });
    vm.runInContext("GF.MVP = 1;", c2);
    const mudos = [];
    for (let L = 2; L <= techo; L++) if (!jugable.test(vm.runInContext("farmUnlockTxt(" + L + ")", c2))) mudos.push(L);
    ok("con techo " + techo + " tampoco queda ninguno callado", mudos.length === 0, mudos.join(","));
  }
}

console.log("\n2 · EL F5 DENTRO DE LA ZONA NO DEVUELVE LA VIDA\n");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("la vida se guarda cuando te pegan, no solo al entrar",
    /G\.hp = Math\.max\(0, G\.hp - dmg\)[\s\S]{0,1600}?_hpGuardadaEn[\s\S]{0,200}?saveFarm\(\)/.test(FOREST));
  ok("con throttle, para no castigar al portero en cada golpe",
    /nowMs\(\) - \(this\._hpGuardadaEn \|\| 0\) > ZONA_HP_GUARDA_S \* 1000/.test(FOREST));
  ok("el intervalo está en una constante y es de segundos, no de minutos",
    g("ZONA_HP_GUARDA_S") > 0 && g("ZONA_HP_GUARDA_S") <= 30, g("ZONA_HP_GUARDA_S"));
  ok("la vida sigue viajando en el guardado (si no, guardarla no serviría de nada)", "hp" in g("snapshot()"));

  /* LEY 1 — esto es lo que no se puede romper arreglando lo de arriba. Perder la conexión no
     puede matar a nadie ni quitarle nada: el arreglo solo saca la curación gratis. */
  ok("nadie muere ni pierde el contenedor por recargar: la tumba solo se llena si la vida llega a 0",
    /if \(G\.hp <= 0\) \{[\s\S]{0,900}?tumbaCaer/.test(FOREST));
  const SAVE = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8");
  ok("y al volver, el viaje se cierra solo y el botín se vuelca (no se pierde por recargar)",
    /zonaViaje && !\(typeof enZona === "function" && enZona\(\)\)[\s\S]{0,120}?zonaSalir\(false\)/.test(SAVE));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
