/* NINGÚN BICHO NACE DENTRO DE UN TRONCO, Y EL QUE CAE ADENTRO SALE              (25/9, diseñador)
   Discord 15:50, con captura: « en ese árbol hay un bug: sale un mob y se queda pegado, no puedo
   recoger lo que da y no hace daño porque no me pega ».
   spawnMonster elegía un punto al azar sin mirar los troncos. Dentro de la caja de un árbol,
   cada paso del bicho (1-2 px) seguía dentro y blockedAt lo frenaba para siempre.
     node tools/test-mob-en-el-arbol.js                                                       */
const path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = (n) => vm.runInContext(n, ctx);
let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d != null ? "   " + d : "")); };
const T = g("GF.TILE");

/* una escena de cartón con UN árbol enorme en el medio de la franja de spawn */
function escena() {
  const esc = Object.create(g("ForestScene").prototype);
  esc.W = 1200; esc.H = 600; esc.monsters = [];
  esc.treeCols = [];
  esc.add = { sprite: (x, y) => ({ x, y, setOrigin() { return this; }, setDepth() { return this; }, setScale() { return this; }, play() { return this; }, height: 40 }),
              text: (x, y) => ({ x, y, setOrigin() { return this; }, setDepth() { return this; } }),
              graphics: () => ({ setDepth() { return this; }, clear() { return this; }, fillStyle() { return this; }, fillRect() { return this; }, lineStyle() { return this; }, strokeRect() { return this; } }) };
  esc.textures = { exists: () => false }; esc.anims = { exists: () => false };
  esc.drawBar = () => {};
  return esc;
}

console.log("\n1 · EL SPAWN ESQUIVA LOS TRONCOS\n");
{
  const esc = escena();
  /* un « bosque » denso: 60 troncos gordos repartidos por toda la franja */
  for (let i = 0; i < 60; i++) esc.treeCols.push({ cx: 100 + (i % 12) * 90, by: 120 + Math.floor(i / 12) * 100, hw: 30, dep: 30 });
  let dentro = 0;
  for (let i = 0; i < 300; i++) { const m = esc.spawnMonster("rata", 0.05, 0.95); if (esc.blockedAt(m.cx, m.by, 6)) dentro++; }
  ok("300 ratas nacidas entre 60 troncos: ninguna adentro", dentro === 0, dentro + " adentro");
  ok("puntoLibre devuelve un punto libre con margen", (() => { const p = esc.puntoLibre(0.05, 0.95); return p.libre && !esc.blockedAt(p.x, p.y, 12); })());
}

console.log("\n2 · EL QUE IGUAL QUEDA ADENTRO, SALE CAMINANDO\n");
{
  const esc = escena();
  esc.treeCols.push({ cx: 600, by: 300, hw: 16, dep: 15 });
  ok("(el arnés lo mete en el tronco)", esc.blockedAt(600, 292, 6));
  /* se simula el paso que da updateMonsters: el bicho persigue al héroe que está a la derecha */
  const spr = { x: 600, y: 292, setPosition(x, y) { this.x = x; this.y = y; return this; }, setDepth() { return this; }, setFlipX() { return this; }, setScale() { return this; }, setAlpha() { return this; }, setTint() { return this; }, clearTint() { return this; }, play() { return this; }, anims: { isPlaying: false }, displayHeight: 40, height: 40, flipX: false };
  const m = { cx: 600, by: 292, def: { spd: 60, hp: 24, dmg: 4, label: "Rata" }, hp: 24, dead: false, home: { x: 600, y: 292 }, spr, bar: { clear() { return this; } }, nextHit: 0 };
  esc.hero = { x: 690, y: 292 }; esc.monsters = [m];   // a 90 px: lo ve y lo persigue
  esc.floatTxt = () => {}; esc.playMob = () => {}; esc.drawBar = () => {}; esc.updateTargetFx = () => {};
  esc.killMonster = () => {}; esc.mobAtaca = () => {}; esc.time = { now: 0 }; esc.tweens = { add() {} };
  const x0 = m.cx;
  for (let i = 0; i < 60; i++) { try { esc.updateMonsters(1 / 60, 1000 + i * 16); } catch (e) { ok("updateMonsters corre en el arnés", false, e.message); break; } }
  ok("a los 60 cuadros se movió hacia el héroe (antes: clavado)", m.cx > x0 + 10, "de " + x0 + " a " + Math.round(m.cx));
  ok("y ya está fuera del tronco", !esc.blockedAt(m.cx, m.by, 6));
}

console.log(fallos ? "\n✗ " + fallos + " fallo(s)\n" : "\n✓ los bichos nacen en el claro y ninguno se queda pegado a un árbol\n");
process.exit(fallos ? 1 : 0);
