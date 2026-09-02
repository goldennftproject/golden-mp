/* LA CARGA ES UNA SOLA PASADA — Y LA BARRA NUNCA RETROCEDE                (2/9, reporte)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dirección: « la carga está más lenta… la barra va cargando, retrocede, y vuelve a cargar —
   como que son diferentes procesos ». Eran, literalmente: el atlas quedó en v48 (de antes de
   la Pesca v4) y el muelle entero — Lombricario, Lonja, Boya y sus planos — se bajaba SUELTO
   en una segunda pasada de reintentos, cuyo progress renace en 0 y hacía retroceder la barra.
   La isla (única imagen que no cabe en el atlas) también quedaba para los reintentos.

   La regla que este archivo custodia: TODO lo que assetList() pide tiene que venir en la
   primera pasada — en el atlas, o precargado a mano en preload() como la isla. Si mañana un
   sprite nuevo queda afuera, esto se pone rojo ANTES de que la barra vuelva a bailar.
     node tools/test-carga-una-pasada.js                                                     */
const path = require("path"), fs = require("fs"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

const BOOT = fs.readFileSync(path.join(RAIZ, "public/game/boot.js"), "utf8");
const ST = fs.readFileSync(path.join(RAIZ, "public/game/state.js"), "utf8");
const ATLAS = JSON.parse(fs.readFileSync(path.join(RAIZ, "public/assets/atlas.json"), "utf8")).frames;

/* assetList() de verdad, evaluando el boot con el CROP_ORDER real */
const CROP_ORDER = eval(ST.match(/CROP_ORDER\s*=\s*(\[[^\]]*\])/)[1]);
const ctx = { Phaser: { Scene: class {} }, CROP_ORDER, console };
vm.createContext(ctx);
vm.runInContext(BOOT + ";globalThis.__B = BootScene;", ctx);
const lista = Object.create(ctx.__B.prototype).assetList();

console.log("\nTODO LO QUE EL JUEGO PIDE VIAJA EN LA PRIMERA PASADA");
{
  /* precargados a mano en preload(): claves con this.load.image("clave", ...) fuera de assetList */
  const pre = new Set([...BOOT.matchAll(/this\.load\.image\("([^_"][^"]*)",\s*"assets/g)].map(m => m[1]));
  const sueltos = lista.filter(([k]) => !ATLAS[k] && !pre.has(k));
  ok("assetList entera está en el atlas o precargada (" + lista.length + " claves)", sueltos.length === 0,
    sueltos.length ? "sueltas: " + sueltos.map(s => s[0]).join(", ") : "");
  ok("el muelle de la Pesca v4 entró al atlas", !!(ATLAS.lombricario && ATLAS.lonja && ATLAS.boya),
    "lombricario, lonja, boya — los 3 que disparaban la segunda pasada");
  ok("la isla viaja precargada (no cabe en el atlas: 1190x854)", pre.has("isla") && !ATLAS.isla);
}

console.log("\nEL BESTIARIO TAMBIÉN (la fase «Cargando criaturas…» no pide nada)");
{
  const best = JSON.parse(fs.readFileSync(path.join(RAIZ, "public/assets/farm/bestiario.json"), "utf8"));
  const mobs = best.mobs || best;
  const faltan = [];
  mobs.forEach(m => {
    for (let i = 0; i < 4; i++) if (!ATLAS[m + "_idle_" + i]) faltan.push(m + "_idle_" + i);
    for (let i = 0; i < 6; i++) if (!ATLAS[m + "_walk_" + i]) faltan.push(m + "_walk_" + i);
    for (let i = 0; i < 6; i++) if (!ATLAS[m + "_atk_" + i]) faltan.push(m + "_atk_" + i);
  });
  ok("los " + mobs.length + " mobs del manifiesto tienen sus frames en el atlas", faltan.length === 0,
    faltan.slice(0, 5).join(", "));
}

console.log("\nY LA BARRA ES MONOTÓNICA: RECUERDA SU MÁXIMO");
{
  ok("paso() guarda el máximo visto", /this\._maxV = Math\.max\(this\._maxV \|\| 0/.test(BOOT));
  ok("y la barra se pinta con ese máximo, nunca con el progress crudo",
    /loadPaso\(0\.40 \+ 0\.50 \* this\._maxV/.test(BOOT) && !/loadPaso\(0\.40 \+ 0\.50 \* Math\.max/.test(BOOT));
  const va = BOOT.match(/atlas\.png\?v=(\d+)/), vb = BOOT.match(/atlas\.json\?v=(\d+)/);
  ok("el atlas subió de versión y png/json van parejos", va && vb && va[1] === vb[1] && +va[1] >= 49,
    "v=" + (va && va[1]));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: una pasada, una barra, sin marcha atrás.\n");
process.exit(fallos ? 1 : 0);
