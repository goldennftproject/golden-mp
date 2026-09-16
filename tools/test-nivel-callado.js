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

/* ═══ 1c · LA TALA ES UNA LLAVE, NO UN MURO   (15/9, dirección) ══════════════════════════════
   « Tala, que sea un requisito para subir de nivel la granja ». La mecánica es fácil; lo que hay
   que custodiar es que no se vuelva el muro de « 85 ratas para la espada de piedra »: el requisito
   tiene que quedar POR DEBAJO de lo que el jugador tiene naturalmente a esa altura. Los números de
   la columna « tiene » salen del simulador (3 sesiones al día, techo 25) y son los que hacen que
   esto sea una llave y no un candado. */
console.log("\n1c · LA TALA FRENA AL QUE NO TALÓ, NO AL QUE TALÓ\n");
{
  const G = ctx.G, MAX = g("FARM_NIVEL_MAX");
  /* lo que el jugador de tres sesiones tiene de Tala al llegar a cada nivel de granja */
  const natural = { 18: 19, 19: 20, 20: 20, 21: 21, 22: 21, 23: 22, 24: 23, 25: 24 };
  ok("el tramo empieza donde dice el ejemplo de dirección, traducido a esta escala",
    g("farmTalaDesde()") === g("nivelEscalado(30)"), "granja " + g("farmTalaDesde()"));
  let antes = [], holguraMin = 99;
  for (let L = 2; L < g("farmTalaDesde()"); L++) if (g("farmTalaReq(" + L + ")")) antes.push(L);
  ok("antes del tramo final no pide Tala a nadie", antes.length === 0, antes.join(","));
  for (const L in natural) {
    const req = g("farmTalaReq(" + L + ")");
    holguraMin = Math.min(holguraMin, natural[L] - req);
  }
  ok("y en el tramo final SIEMPRE queda por debajo de lo que el jugador ya tiene",
    holguraMin > 0, "la holgura más chica es de " + holguraMin + " niveles");
  ok("con holgura de sobra: al menos 2 niveles en todo el tramo", holguraMin >= 2, holguraMin + "");

  /* y que de verdad frene al que no taló */
  G.level = MAX - 1; G.skills.farming = 1e12; G.skills.tala = 0; G.tareasHechas = null;
  ok("el que nunca taló no puede subir el último nivel", !g("farmTalaCumple(" + MAX + ")"));
  G.skills.tala = (function () { let t = 0; for (let i = 1; i < g("farmTalaReq(" + MAX + ")"); i++) t += g("skillNeed(" + i + ")"); return t; })();
  ok("y con la Tala pedida, sí", g("farmTalaCumple(" + MAX + ")"),
    "pide Tala " + g("farmTalaReq(" + MAX + ")"));

  /* el muro mudo es el peligro de verdad: si frena, la barra tiene que decir por qué */
  const UI = fs.readFileSync(path.join(RAIZ, "public/game/ui.js"), "utf8");
  ok("y si frena, la barra de granja lo dice (no es un muro mudo)",
    /soloTala \? "Tala " \+ skillInfo/.test(UI) && /te falta talar/.test(UI));
}

console.log("\n2 · EL F5 DENTRO DE LA ZONA NO DEVUELVE LA VIDA\n");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("la vida se guarda cuando te pegan, no solo al entrar",
    /G\.hp = Math\.max\(0, G\.hp - dmg\)[\s\S]{0,1800}?_hpGuardadaEn[\s\S]{0,400}?saveFarm\(\)/.test(FOREST));
  ok("con throttle, para no castigar al portero en cada golpe",
    /nowMs\(\) - \(this\._hpGuardadaEn \|\| 0\) > ZONA_HP_GUARDA_S \* 1000/.test(FOREST));
  ok("el intervalo está en una constante y es de segundos, no de minutos",
    g("ZONA_HP_GUARDA_S") > 0 && g("ZONA_HP_GUARDA_S") <= 30, g("ZONA_HP_GUARDA_S"));
  ok("la vida sigue viajando en el guardado (si no, guardarla no serviría de nada)", "hp" in g("snapshot()"));

  /* LEY 1 — esto es lo que no se puede romper arreglando lo de arriba. Perder la conexión no
     puede matar a nadie ni quitarle nada: el arreglo solo saca la curación gratis. */
  ok("nadie muere ni pierde el contenedor por recargar: la tumba solo se llena si la vida llega a 0",
    /if \(G\.hp <= 0\) \{[\s\S]{0,2200}?tumbaCaer/.test(FOREST));   // 15/9: el bloque creció con la rotura de armadura
  const SAVE = fs.readFileSync(path.join(RAIZ, "public/game/save.js"), "utf8");
  /* 16/9 — ESTO CAMBIÓ DE CONTRATO, por pedido del diseñador: « si estás en zona negra y das F5
     aparece en la granja, debe aparecer justo donde quedó ». Antes recargar LIQUIDABA el viaje y
     volcaba el botín; ahora el viaje se queda abierto y el juego vuelve a entrar solo. Lo que
     sigue siendo ley 1 —y es lo único que este renglón custodia— es que si NO se puede volver,
     el viaje se cierre igual y el botín aparezca en la bolsa: quedarse sin poder entrar ni salir,
     con el morral escondido, sería perder progreso. */
  ok("recargar dentro de la Zona te deja dentro, no te devuelve a la granja",
    /window\.__volverALaZona = z/.test(SAVE) && /GF\.zona = z;/.test(SAVE));
  ok("y solo si la zona guardada existe (si no, no habría mapa al que volver)",
    /const existe = z && typeof ZONA_DEF/.test(SAVE));
  ok("si no se puede volver, el viaje se cierra y el botín se vuelca (ley 1)",
    /\} else if \(typeof zonaSalir === "function"\) \{[\s\S]{0,120}?zonaSalir\(false\)/.test(SAVE));
  const MAIN = fs.readFileSync(path.join(RAIZ, "public/game/main.js"), "utf8");
  ok("y el que cruza el portal tiene su propia red: si la escena no arranca, también se cierra",
    /no se pudo volver a la Zona[\s\S]{0,400}?zonaSalir\(false\)/.test(MAIN));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
