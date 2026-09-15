/* EL PANTANO SE RECORRE EN ORDEN: RATAS, VAMPIROS Y AL FONDO LAS LARVAS   (15/9, dirección)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   « ¿Puedes editar el pantano? Para que los primeros mobs sean solo ratas… inicio ratas, medio
   vampiros y de último las larvas ».

   Cada bicho de un mapa vive en una franja de profundidad: [x0, x1], donde 0 es la entrada y 1
   el fondo. En el pantano las tres franjas se PISABAN (rata 0,08-0,40 · murciélago 0,20-0,62 ·
   larva 0,35-0,90), así que en x = 0,35 podían salir los tres a la vez y el que acababa de
   terminar el tutorial se encontraba de frente una larva de 42 de vida — el bicho más largo de
   los tres desde el refuerzo del 15/9. La primera entrada al bosque es la escena que decide si
   alguien vuelve: no puede depender de la suerte del reparto.

   Lo que este archivo custodia NO son los seis números, que dirección puede querer mover, sino
   la forma: que en el pantano las franjas no se toquen y que el orden sea el del bicho más
   flojo al más duro. Y de paso la trampa que ya nos mordió: la lista del pantano estaba escrita
   DOS VECES (state.js y el respaldo de forest.js), así que una se quedaba vieja en silencio.
     node tools/test-orden-del-pantano.js                                                      */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };

const PANTANO = g("ZONA_DEF.pantano"), MON = g("MONSTER_DEF");

console.log("\n1 · LAS TRES FRANJAS NO SE TOCAN\n");
{
  const mobs = PANTANO.mobs.slice().sort((a, b) => a[1] - b[1]);
  for (const [k, x0, x1, n] of mobs) {
    console.log("   " + (MON[k].label || k).padEnd(14) + "x " + x0.toFixed(2) + " → " + x1.toFixed(2) +
      "   " + n + " bichos   vida " + MON[k].hp + "   pega " + MON[k].dmg);
  }
  let pisadas = [];
  for (let i = 1; i < mobs.length; i++) if (mobs[i][1] <= mobs[i - 1][2]) pisadas.push(mobs[i - 1][0] + "/" + mobs[i][0]);
  ok("ninguna franja empieza antes de que termine la anterior", pisadas.length === 0, pisadas.join(" · "));
  let respiro = 9;
  for (let i = 1; i < mobs.length; i++) respiro = Math.min(respiro, mobs[i][1] - mobs[i - 1][2]);
  ok("y entre una y otra queda un respiro de verdad (≥ 5 % del mapa)", respiro >= 0.05,
    "el más chico es " + Math.round(respiro * 100) + " %");
}

console.log("\n2 · Y VAN DE LO FLOJO A LO DURO, QUE ES EL PEDIDO\n");
{
  const mobs = PANTANO.mobs.slice().sort((a, b) => a[1] - b[1]);
  ok("el primero que se cruza es la rata", mobs[0][0] === "rata", mobs[0][0]);
  ok("el último es la larva", mobs[mobs.length - 1][0] === "larva", mobs[mobs.length - 1][0]);
  let creceVida = true, creceDmg = true;
  for (let i = 1; i < mobs.length; i++) {
    if (MON[mobs[i][0]].hp < MON[mobs[i - 1][0]].hp) creceVida = false;
    if (MON[mobs[i][0]].dmg < MON[mobs[i - 1][0]].dmg) creceDmg = false;
  }
  ok("cuanto más adentro, más vida tiene lo que hay", creceVida);
  ok("cuanto más adentro, más te pega", creceDmg);
  /* la entrada es lo primero que ve alguien que nunca peleó: el primer tramo tiene que ser el
     bicho de entrada y NADA más */
  const enLaEntrada = PANTANO.mobs.filter(m => m[1] < 0.35).map(m => m[0]);
  ok("en el primer tercio del mapa no hay nada más que ratas",
    enLaEntrada.length === 1 && enLaEntrada[0] === "rata", enLaEntrada.join(","));
}

console.log("\n3 · LA LISTA VIVE EN UN SOLO SITIO\n");
{
  const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
  ok("forest.js no tiene su propia copia a mano de los bichos del pantano",
    !/\["rata",\s*0\./.test(FOREST));
  ok("y cuando no hay zona, cae en la tabla de state.js", /ZONA_DEF\.pantano\.mobs/.test(FOREST));
}

console.log("\n" + (fallos ? fallos + " fallo(s)" : "TODO EN VERDE") + "\n");
process.exit(fallos ? 1 : 0);
