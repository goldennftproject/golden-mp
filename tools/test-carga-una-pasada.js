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
const FOREST = fs.readFileSync(path.join(RAIZ, "public/game/forest.js"), "utf8");
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");
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

console.log("\nHACHA Y MAZO NO HEREDAN EL ESPADAZO");
{
  const ataques = ["axe", "mace"].flatMap(tipo => Array.from({ length: 8 }, (_, i) => "hero_" + tipo + "_" + i));
  const faltan = ataques.filter(k => !ATLAS[k]);
  ok("los 16 frames nuevos viajan en el atlas", faltan.length === 0, faltan.join(", "));
  const creadas = [];
  const bootDePrueba = Object.create(ctx.__B.prototype);
  bootDePrueba.textures = { exists: () => true };
  bootDePrueba.anims = { create: spec => creadas.push(spec) };
  bootDePrueba.buildAnims();
  const gesto = key => creadas.find(a => a.key === key);
  ok("Boot crea ambos gestos con sus ocho frames", !!gesto("act_axe") && gesto("act_axe").frames.length === 8 && !!gesto("act_mace") && gesto("act_mace").frames.length === 8);
  ok("el Bosque elige la animación de hacha y mazo", /tipoArma === "hacha" && this\.anims\.exists\("act_axe"\)/.test(FOREST) && /tipoArma === "mazo" && this\.anims\.exists\("act_mace"\)/.test(FOREST));
}

console.log("\nLOS ANIMALES DEL ESTABLO CAMINAN");
{
  const animales = ["alpaca", "conejo", "toro", "jabali"];
  const cuadros = animales.flatMap(a => Array.from({ length: 9 }, (_, i) => "animal_" + a + "_walk_" + i));
  const faltan = cuadros.filter(k => !ATLAS[k]);
  ok("los 36 cuadros de caminata viajan en el atlas", faltan.length === 0, faltan.join(", "));
  const pinta = Array.from({ length: 8 }, (_, i) => "pet_gallina_walk_" + i);
  const faltanPinta = pinta.filter(k => !ATLAS[k]);
  ok("los ocho cuadros de Pinta viajan en el atlas", faltanPinta.length === 0, faltanPinta.join(", "));
  const creadas = [];
  const bootDePrueba = Object.create(ctx.__B.prototype);
  bootDePrueba.textures = { exists: () => true };
  bootDePrueba.anims = { create: spec => creadas.push(spec) };
  bootDePrueba.buildAnims();
  const anim = a => creadas.find(x => x.key === "animal_" + a + "_walk");
  ok("Boot crea una caminata de nueve cuadros por especie", animales.every(a => anim(a) && anim(a).frames.length === 9));
  const animaPinta = creadas.find(x => x.key === "pet_gallina_walk");
  ok("Boot crea la caminata limpia de ocho cuadros de Pinta", !!animaPinta && animaPinta.frames.length === 8);
  ok("la granja usa Sprite y alterna caminar / quieto", /this\.add\.sprite\(x, y, key\)/.test(FARM) &&
    /const aniCaminar = "animal_" \+ a\.k \+ "_walk";/.test(FARM) &&
    /a\.spr\.play\(aniCaminar\)/.test(FARM) && /a\.spr\.setTexture\("animal_" \+ a\.k\)/.test(FARM));
  ok("Pinta también alterna caminar / quieta", /this\.add\.sprite\(pt\.x, pt\.y, def\.sprite\)/.test(FARM) &&
    /m\.spr\.play\("pet_gallina_walk"\)/.test(FARM) && /m\.spr\.setTexture\("pet_gallina"\)/.test(FARM));
}

console.log("\nNODOS Y TALADO COMUNICAN SU ESTADO");
{
  const piedra = ["node_stone", "node_stone_half", "node_stone_mined"];
  const faltan = piedra.filter(k => !ATLAS[k]);
  ok("los tres estados de piedra viajan en el atlas", faltan.length === 0, faltan.join(", "));
  ok("el tocón con hojas viaja en el atlas", !!ATLAS.tree_stump_leaves);
  ok("el caché se renovó para piedra y tocón", [
    "node_stone.png?v=4", "node_stone_half.png?v=4", "node_stone_mined.png?v=8",
    "tree_stump_leaves.png?v=4"
  ].every(url => BOOT.includes(url)));
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

console.log("\nEL ARTE OPCIONAL NO SE SALTA SI LA RED VA LENTA");
{
  /* El atlas evita esta descarga en condiciones normales. Pero si falla y el manifiesto sí
     respondió, empezar a los 1,8 s mientras todavía entran los frames deja ForestScene sin
     animaciones: la criatura cae al emoji o queda quieta. Se simula el loader en sus dos
     pasadas reales (manifiesto → imágenes), sin esperar tiempo de verdad. */
  function opcional(mobs) {
    const demoras = [], oyentes = { complete: [] }, imagenes = [];
    let arranques = 0, animaciones = 0, starts = 0;
    const load = {
      on() {}, json() {}, image(k) { imagenes.push(k); },
      once(ev, fn) { (oyentes[ev] || (oyentes[ev] = [])).push(fn); },
      start() { starts++; },
      complete() { const ahora = (oyentes.complete || []).splice(0); ahora.forEach(fn => fn()); },
    };
    const escena = Object.create(ctx.__B.prototype);
    escena.load = load;
    escena.time = { delayedCall(ms, fn) { demoras.push({ ms, fn }); } };
    escena.cache = { json: { get: () => ({ mobs }) } };
    escena.textures = { exists: () => false };
    escena.msg = { setText() {} };
    escena.buildAnims = () => { animaciones++; };
    escena.scene = { start() { arranques++; } };
    escena.loadOptional();
    return {
      load, demoras, imagenes,
      get arranques() { return arranques; }, get animaciones() { return animaciones; }, get starts() { return starts; },
    };
  }
  const lenta = opcional(["murcielago"]);
  lenta.load.complete();                       // contestó el manifiesto; ahora entran 16 frames
  const corta = lenta.demoras.find(d => d.ms === 1800);
  ok("el límite corto existe para un manifiesto que no responde", !!corta);
  corta.fn();                                  // 1,8 s mientras sigue la descarga de imágenes
  ok("no arranca con el manifiesto ya resuelto y frames a medio bajar", lenta.arranques === 0 && lenta.animaciones === 0,
    lenta.arranques + " arranques · " + lenta.animaciones + " animaciones");
  ok("la pasada opcional pidió los 16 frames de la criatura", lenta.imagenes.length === 16, lenta.imagenes.length + " imágenes");
  lenta.load.complete();                       // terminan las imágenes
  ok("al terminar, crea las animaciones antes de entrar a la granja", lenta.arranques === 1 && lenta.animaciones === 1,
    lenta.arranques + " arranque · " + lenta.animaciones + " animaciones");
  lenta.demoras.filter(d => d.ms === 6000).forEach(d => d.fn());
  ok("el tope largo no vuelve a iniciar una escena que ya está lista", lenta.arranques === 1);

  const caido = opcional(["murcielago"]);     // el manifiesto nunca llama complete()
  caido.demoras.find(d => d.ms === 1800).fn();
  ok("si el manifiesto ni responde, conserva el arranque rápido", caido.arranques === 1 && caido.animaciones === 1,
    caido.arranques + " arranque · " + caido.animaciones + " animaciones");
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
