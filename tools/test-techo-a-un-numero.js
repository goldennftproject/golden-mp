/* EL TECHO DE GRANJA ES UN NÚMERO, Y TODO LO DEMÁS CUELGA DE ÉL            (10/9, MVP punto 2)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección pidió bajar el techo (24 premios jugables sobre 23 niveles → techo honesto 24-25)
   sin tocar las 16 expansiones. Antes de bajarlo había cuatro sitios con el 50 escrito a mano:
   la fórmula de expansiones, el cofre (13/23/33), el altar nivel 2 (27) y la tabla de tareas
   (una fila por nivel del 11 al 50). Bajar el techo con eso así dejaba premios huérfanos por
   encima del techo y niveles mudos por debajo.

   Hoy todo se deriva de FARM_NIVEL_MAX:
     · FARM_EXPANSION reparte las 16 entre el 3 y el techo;
     · FARM_XP_LVLS cuesta FARM_XP_TECHO en total (el mes) sea cual sea el techo;
     · FARM_COFRE y FARM_EDIF2 escalan sus niveles con nivelEscalado();
     · FARM_TAREAS es una escalera de 40 peldaños repartida entre el 11 y el techo.

   El 14/9 Dirección bajó el número: FARM_NIVEL_MAX = 25. No se tocó nada más — cofre, altar,
   expansiones y tareas se acomodaron solos, que era justo lo que este archivo custodiaba.

   LO QUE ESTE ARCHIVO CUSTODIA:
     1 · con el techo de hoy (25) las tablas derivadas caen donde tienen que caer;
     2 · con cualquier techo entre 20 y 50, ningún premio queda por encima del techo, ningún
         nivel del 11 al techo se queda sin tarea, las 16 expansiones siguen siendo 16, la
         escalera de tareas conserva el orden (el dragón sigue siendo lo último) y el techo de
         XP sigue siendo el mes.
   El punto 2 se comprueba re-evaluando state.js con FARM_NIVEL_MAX sustituido en el texto —
   es la única forma de probar « qué pasaría si » sin bajarlo de verdad.
     node tools/test-techo-a-un-numero.js                                                        */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

console.log("\n1 · EL TECHO DE HOY: 25 (bajado el 14/9, MVP punto 3)\n");
ok("FARM_NIVEL_MAX es 25", g("FARM_NIVEL_MAX") === 25, g("FARM_NIVEL_MAX"));
const COFRE = g("FARM_COFRE"), EDIF2 = g("FARM_EDIF2"), TAR = g("FARM_TAREAS"), ESC = g("FARM_TAREAS_ESCALERA");
ok("el cofre bajó con el techo: 12 / 15 / 19 (era 13 / 23 / 33)", COFRE[12] === 10 && COFRE[15] === 10 && COFRE[19] === 15, JSON.stringify(COFRE));
ok("el altar bajó al 17 (era el 27)", EDIF2[17] === "altar" && Object.keys(EDIF2).length === 1, JSON.stringify(EDIF2));
ok("la escalera sigue teniendo 40 peldaños — el contenido no se tocó, se reparte", ESC.length === 40, ESC.length);
ok("nivelEscalado lleva el tramo 11-50 al 11-25", g("nivelEscalado(11)") === 11 && g("nivelEscalado(13)") === 12
  && g("nivelEscalado(27)") === 17 && g("nivelEscalado(33)") === 19 && g("nivelEscalado(50)") === 25);
ok("el primer nivel con tarea es el 11 y el último es el techo",
  JSON.stringify(TAR[11].map(t => [t[0], t[1]])) === JSON.stringify(ESC[0].map(t => [t[0], t[1]]))
  && JSON.stringify(TAR[25].map(t => [t[0], t[1]])) === JSON.stringify(ESC[39].map(t => [t[0], t[1]])));
let subenSolas = true, ultimo = -1;
for (let L = 11; L <= 25; L++) {
  const i = ESC.findIndex(p => JSON.stringify(p.map(t => [t[0], t[1]])) === JSON.stringify(TAR[L].map(t => [t[0], t[1]])));
  if (i <= ultimo) { subenSolas = false; console.log("      nivel " + L + ": peldaño " + i + " (el anterior era " + ultimo + ")"); }
  ultimo = i;
}
ok("los quince niveles toman peldaños en orden, sin repetir ni retroceder", subenSolas);

/* 14/9 — esto se agrega DESPUÉS de encontrarlo roto abriendo el juego en el navegador. El 10/9
   se revisaron el cofre, el altar y las tareas, pero nadie miró los cosméticos: la skin de
   Granja Legendaria pedía nivel 50, el aura y el color violeta pedían 30 y el marco dorado 42.
   Con el techo en 25 los cuatro quedaron colgados en un nivel que ya no existe — premios que el
   juego promete y no puede entregar nunca. Es el mismo error que este archivo existe para
   atajar, así que a partir de hoy también lo cubre: NADA que el jugador pueda ganar puede pedir
   un nivel por encima del techo. */
console.log("\n1b · NINGÚN PREMIO PIDE UN NIVEL QUE NO EXISTE\n");
{
  const MAX = g("FARM_NIVEL_MAX");
  ctx.G.cosmeticos = [];
  ctx.G.level = MAX;
  const alTecho = {
    "color violeta": g("cosColoresDisponibles()").indexOf("violeta") >= 0,
    "color celeste": g("cosColoresDisponibles()").indexOf("celeste") >= 0,
    "marco hoja": g("cosMarcosDisponibles()").indexOf("hoja") >= 0,
    "marco dorado": g("cosMarcosDisponibles()").indexOf("dorado") >= 0,
    "aura": g("cosAuraDisponible()"),
    "skin Granja Legendaria": g("cosGranjaOroDisponible()"),
  };
  for (const k in alTecho) ok("en el techo (" + MAX + ") se puede tener: " + k, alTecho[k]);
  ctx.G.level = 1;
  ok("y a nivel 1 todavía no (siguen siendo premios, no regalos)",
    !g("cosAuraDisponible()") && !g("cosGranjaOroDisponible()") && g("cosMarcosDisponibles()").indexOf("dorado") < 0);
  /* sin los comentarios: los de arriba CUENTAN la historia del bug y nombran el `>= 50` viejo */
  const STATE0 = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("ninguna puerta de cosmético tiene el nivel escrito a mano",
    !/G\.level >= (2[6-9]|[3-9][0-9]|\d{3,})\b/.test(STATE0),
    (STATE0.match(/G\.level >= (2[6-9]|[3-9][0-9]|\d{3,})\b/g) || []).join(", "));
}

console.log("\n2 · CON OTRO TECHO — se re-evalúa state.js con el número cambiado\n");
const STATE = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
ok("el techo está una sola vez escrito a mano, como FARM_NIVEL_MAX", (STATE.match(/const FARM_NIVEL_MAX = 25;/g) || []).length === 1);

function conTecho(techo) {
  const { ctx: c2, problemas } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ, {
    "game/state.js": STATE.replace("const FARM_NIVEL_MAX = 25;", "const FARM_NIVEL_MAX = " + techo + ";"),
  });
  const grave = problemas.filter(p => p.grave);
  if (grave.length) throw new Error(grave.map(p => p.quien + ": " + p["qué"]).join(" · "));
  const r = (n) => vm.runInContext(n, c2);
  return {
    max: r("FARM_NIVEL_MAX"), exp: r("FARM_EXPANSION"), xp: r("FARM_XP_LVLS"), techoXp: r("FARM_XP_TECHO"),
    cofre: r("FARM_COFRE"), edif2: r("FARM_EDIF2"), tareas: r("FARM_TAREAS"),
  };
}
const ultimoPeldano = JSON.stringify(g("FARM_TAREAS_ESCALERA[39]").map(t => [t[0], t[1]]));
for (const techo of [20, 25, 30, 50]) {
  let s;
  try { s = conTecho(techo); }
  catch (e) { ok("techo " + techo + ": state.js arranca", false, e.message); continue; }
  console.log("   techo " + techo);
  ok("  16 expansiones, la última en el techo", s.exp.length === 16 && s.exp[15] === techo, s.exp.join(","));
  const arriba = Object.keys(s.cofre).concat(Object.keys(s.edif2)).map(Number).filter(n => n > techo);
  ok("  ni cofre ni altar por encima del techo", arriba.length === 0, arriba.join(","));
  ok("  el altar sigue existiendo", Object.values(s.edif2).indexOf("altar") >= 0, JSON.stringify(s.edif2));
  ok("  3 escalones de cofre, distintos entre sí", Object.keys(s.cofre).length === 3, JSON.stringify(s.cofre));
  const mudos = []; for (let L = 11; L <= techo; L++) if (!s.tareas[L] || !s.tareas[L].length) mudos.push(L);
  ok("  ningún nivel del 11 al techo sin tarea", mudos.length === 0, mudos.join(","));
  ok("  nada por encima del techo en tareas", Object.keys(s.tareas).map(Number).every(n => n <= techo));
  ok("  el nivel 11 es el primer peldaño y el techo es el último (dragón)",
    JSON.stringify(s.tareas[11].map(t => [t[0], t[1]])) === JSON.stringify(g("FARM_TAREAS_ESCALERA[0]").map(t => [t[0], t[1]]))
    && JSON.stringify(s.tareas[techo].map(t => [t[0], t[1]])) === ultimoPeldano);
  ok("  la cola de XP llega al techo y cuesta el mes (±2 %, como test-cola-de-niveles)",
    s.xp.length === techo + 1 && Math.abs(s.xp[techo] - s.techoXp) / s.techoXp < 0.02, s.xp[techo] + " / " + s.techoXp);
  const paso = (L) => s.xp[L] - s.xp[L - 1];
  let mono = true; for (let L = 12; L <= techo; L++) if (paso(L) < paso(L - 1)) mono = false;
  ok("  en la cola ningún nivel cuesta menos que el anterior", mono);
  /* Con menos niveles, cada uno cuesta MÁS puntos (el mes se reparte entre menos escalones), así
     que el valle del 11 se achica solo. Se imprime, no se exige: el reparto del mes se mide con
     simular-partida.js, no acá. */
  console.log("       el 11 cuesta " + paso(11) + " (el 10 cuesta " + paso(10) + ", " + Math.round(paso(11) / paso(10) * 100) + " %)");
}

console.log("\n" + (fallos ? "FALLAN " + fallos : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
