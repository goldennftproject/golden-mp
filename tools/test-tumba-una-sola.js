/* TU CUERPO ES UNO SOLO, Y CADA COSA EN SU MAPA        (8/9, auditoría general)
   ═══════════════════════════════════════════════════════════════════════════════════════════
   Dos fallos de la misma raíz: ni los cuerpos ni el botín tirado guardaban a qué zona
   pertenecían, y montarTumba() empujaba un cuerpo nuevo en CADA create() de la escena.

   1 · DUPLICACIÓN DE TU PROPIA TUMBA — objetos de la nada.
       montarTumba corre al crear la escena y hacía `GF.forestCuerpos.push(c)` con una copia
       entera de G.tumba.items. El filtro de arriba conserva los cuerpos no revisados con botín,
       así que el anterior se quedaba. Reproducción: morís → entrás (aparece tu cuerpo) → salís
       sin recogerlo (la puerta está abierta: zonaCdLeft() da 0 mientras haya tumba viva) →
       volvés a entrar: DOS cuerpos tuyos, cada uno con tu contenedor y tu equipo completos.
       Vaciar el primero limpia G.tumba, y el segundo sigue entregando su copia porque tumba()
       ya devuelve null. Duplicación limpia de todo lo que llevabas puesto.

   2 · LOS CUERPOS Y EL BOTÍN SE COLABAN ENTRE ZONAS.
       create() redibujaba TODOS los GF.forestCuerpos y TODOS los GF.forestDrops sin mirar de
       qué mapa eran, y tryPickup los levantaba. Lo que dejaste en el pantano aparecía en la
       guarida. Ahora cada uno nace con su zona; los de partidas viejas se adoptan la primera vez
       para no perder nada, y lo de las otras zonas sigue esperando donde lo dejaste.

   La regla que este archivo custodia: la tumba vive en G.tumba, que es UNA. El cuerpo dibujado
   es su reflejo, no una copia con vida propia.
     node tools/test-tumba-una-sola.js                                                          */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const G = ctx.G, g = (n) => vm.runInContext(n, ctx);
ctx.toast = () => {}; ctx.log = () => {}; ctx.celebrate = () => {};
vm.runInContext("toast = window.toast; log = window.log; celebrate = window.celebrate;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };

/* la escena real, con lo mínimo de Phaser que necesitan dibujarCuerpo y montarTumba */
function escena(zonaKey) {
  const esc = Object.create(g("ForestScene").prototype);
  Object.assign(esc, {
    zonaKey: zonaKey || "pantano",
    hero: { x: 100, y: 100 },
    tweens: { add: (cfg) => { if (cfg.onComplete && cfg.repeat !== -1) cfg.onComplete(); return { stop() {} }; }, killTweensOf() {} },
    add: { text: (x, y, t) => ({ x, y, texto: t, setOrigin() { return this; }, setDepth() { return this; },
             setAlpha() { return this; }, destroy() { this.muerto = true; } }),
           image: (x, y) => ({ x, y, setOrigin() { return this; }, setAngle() { return this; }, setTint() { return this; },
             setAlpha() { return this; }, setDepth() { return this; }, setScale() { return this; }, width: 30, destroy() { this.muerto = true; } }) },
    textures: { exists: () => false },
    time: { delayedCall: () => {} },
  });
  return esc;
}
const mios = () => (g("GF").forestCuerpos || []).filter(c => c.mia);

console.log("\nENTRAR, SALIR Y VOLVER A ENTRAR DEJA UN SOLO CUERPO TUYO");
{
  g("GF").forestCuerpos = []; g("GF").forestDrops = [];
  G.conts = { backpack: 1 }; G.cont = null; G.weapons = {}; G.tumba = null;
  ctx.viajeElegir("backpack");
  ctx.contMeter(ctx.contLlevado(), "res", "esencia_oscura", 9, null, 1);
  ctx.tumbaCaer("pantano", 60, 60, () => 0.99);
  ok("(control) moriste y hay tumba con botín", !!(G.tumba && G.tumba.items.length),
    (G.tumba ? G.tumba.items.length : 0) + " cosa(s)");

  /* tres visitas seguidas al mismo mapa sin recoger nada — que es justo lo que el jugador hace
     cuando entra, ve que no llega, y sale a por comida */
  escena("pantano").montarTumba();
  ok("tras la primera entrada hay UN cuerpo tuyo", mios().length === 1, mios().length + " cuerpo(s)");
  escena("pantano").montarTumba();
  escena("pantano").montarTumba();
  ok("y tras la tercera sigue habiendo UNO", mios().length === 1, mios().length + " cuerpo(s)");

  const total = mios().reduce((s, c) => s + c.drops.length, 0);
  ok("con el botín una sola vez, no tres", total === G.tumba.items.length,
    total + " pilas dibujadas contra " + G.tumba.items.length + " en la tumba");
}

console.log("\nY VACIARLO NO DEJA UNA COPIA ENTREGANDO OTRA VEZ");
{
  const esc = escena("pantano");
  const c = mios()[0];
  esc.hero = { x: c.x, y: c.y };
  G.res = {}; ctx.syncSlots();
  /* al morir cae el contenedor entero, así que el jugador vuelve a por el cuerpo con OTRO — es
     la mecánica, y sin esto recogerCuerpo no tiene dónde meter nada y el test mide el arnés. */
  G.conts = { backpack: 1 }; G.cont = null; ctx.viajeElegir("backpack");
  esc.recogerCuerpo(c);
  ok("la tumba se cerró", !ctx.tumba());
  ok("y no queda ningún cuerpo tuyo con botín",
    mios().every(x => !x.drops.length), JSON.stringify(mios().map(x => x.drops.length)));
  /* si quedara una copia, volver a entrar la montaría y el jugador cobraría dos veces */
  escena("pantano").montarTumba();
  ok("volver a entrar no resucita nada", mios().every(x => !x.drops.length), mios().length + " cuerpo(s)");
}

console.log("\nCADA MAPA ENSEÑA LO SUYO");
{
  g("GF").forestCuerpos = []; g("GF").forestDrops = [];
  G.conts = { backpack: 1 }; G.cont = null; G.tumba = null;
  ctx.viajeElegir("backpack");
  ctx.contMeter(ctx.contLlevado(), "res", "esencia_oscura", 4, null, 1);
  ctx.tumbaCaer("pantano", 60, 60, () => 0.99);

  escena("pantano").montarTumba();
  ok("moriste en el pantano y ahí está tu cuerpo", mios().length === 1);
  escena("guarida").montarTumba();
  ok("en la guarida NO aparece — allá te espera", mios().length === 1 && mios()[0].zona === "pantano",
    "zona del cuerpo: " + mios()[0].zona);

  /* y el botín del suelo, lo mismo: el de un mapa no se levanta en otro */
  const esc = escena("pantano");
  esc.dropLoot({ cx: 80, by: 80 }, [{ k: "carne", n: 2, kind: "res" }]);
  const suelo = g("GF").forestDrops;
  ok("(control) el botín cayó y sabe dónde", suelo.length === 1 && suelo[0].zona === "pantano", JSON.stringify(suelo[0] && suelo[0].zona));
  G.res = {}; ctx.syncSlots();
  const otra = escena("guarida");
  otra.tryPickup(80, 80, 40);
  ok("en otra zona no se puede levantar", g("GF").forestDrops.length === 1, g("GF").forestDrops.length + " en el suelo");
  const propia = escena("pantano");
  propia.tryPickup(80, 80, 40);
  ok("y en la suya sí", g("GF").forestDrops.length === 0);
}

console.log("\nLOS CUERPOS DE LOS BICHOS TAMBIÉN LLEVAN SU ZONA");
{
  g("GF").forestCuerpos = [];
  escena("pantano").crearCuerpo({ cx: 50, by: 50, key: "rata", def: { label: "Rata", sprite: null } },
    [{ k: "carne", n: 1, kind: "res" }]);
  const c = g("GF").forestCuerpos[0];
  ok("el cuerpo del bicho nace con su mapa", c && c.zona === "pantano", c && c.zona);
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: un cuerpo, un mapa, y nada que se duplique.\n");
process.exit(fallos ? 1 : 0);
