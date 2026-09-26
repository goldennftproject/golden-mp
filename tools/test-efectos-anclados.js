/* EFECTOS DEL MUNDO QUE SIGUEN A SU OBJETO

   Mover algo en edición no puede dejar una segunda versión visual atrás: aura de cultivo,
   barra de crecimiento, brasa de la Herrería, halo nocturno o acompañantes del edificio.
   Este arnés prueba las anclas sin tener que arrancar toda la granja.
     node tools/test-efectos-anclados.js */
const fs = require("fs"), vm = require("vm");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");

let ocupaciones = 0;
const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Number, Date, JSON,
  Object, Array, String, Boolean, Set, Map, isFinite, parseInt, parseFloat,
  Phaser: { Scene: class {}, BlendModes: { ADD: 1 } } };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.GF = { TILE: 40, PLOTS: [{ col: 1, row: 2 }], ocupCambio() { ocupaciones++; } };
ctx.G = { layoutPlots: {}, forgeLitUntil: 99999 };
ctx.nowMs = () => 100;
ctx.FX_BARRA_GOLPES = true; ctx.GOLPES_TALAR = 3; ctx.GOLPES_MINAR = 3;
vm.createContext(ctx);
vm.runInContext(FARM, ctx, { filename: "farm.js" });
vm.runInContext("this.FarmScene = FarmScene;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const cerca = (a, b) => Math.abs(a - b) < 0.000001;
function nodo(x = 0, y = 0) {
  return {
    x, y, depth: 0, visible: true, destruido: false, clearCount: 0, rects: [],
    setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
    setDepth(d) { this.depth = d; return this; },
    setVisible(v) { this.visible = v; return this; },
    clear() { this.clearCount++; this.rects = []; return this; },
    fillStyle() { return this; },
    fillRect(...r) { this.rects.push(r); return this; },
    destroy() { this.destruido = true; return this; }
  };
}

const esc = new ctx.FarmScene();
esc.add = { graphics: () => nodo() };

console.log("\nLA PARCELA MUDA SU BRILLO Y SU BARRA CON LA TIERRA");
const pl = {
  i: 0, cx: 60, by: 100, state: "growing", readyAt: 1000, barraPct: .5,
  ground: Object.assign(nodo(60, 100), { displayHeight: 40 }), spr: nodo(), emo: nodo(),
  timer: nodo(), glowTxt: nodo(), glowAura: nodo(), glowSp: [nodo(), nodo(), nodo()], barraG: nodo()
};
let barra = null;
esc.barraCultivo = (p, t) => { barra = { p, t }; };
esc.moverParcela(pl, 5, 6);
ok("la parcela queda en la celda nueva", pl.cx === 220 && pl.by === 260,
  pl.cx + "," + pl.by);
ok("la aura dorada queda bajo el cultivo nuevo", pl.glowAura.x === 220 && pl.glowAura.y === 256 && pl.glowAura.depth === 259);
ok("las tres chispas conservan sus offsets", cerca(pl.glowSp[0].x, 204.8) && pl.glowSp[0].y === 236 &&
  cerca(pl.glowSp[1].x, 234.4) && pl.glowSp[1].y === 246 && pl.glowSp[2].x === 220 && pl.glowSp[2].y === 226);
ok("la barra invalida su porcentaje y se redibuja ya", pl.barraPct === null && barra && barra.p === pl && barra.t === 100);
ok("la nueva celda queda guardada y actualiza ocupación", ctx.GF.PLOTS[0].col === 5 && ctx.GF.PLOTS[0].row === 6 &&
  ctx.G.layoutPlots[0].col === 5 && ctx.G.layoutPlots[0].row === 6 && ocupaciones === 1);

console.log("\nLA VISTA PREVIA Y LAS MARIPOSAS SUELTAN LA CELDA VIEJA");
esc.previaSpr = nodo(); esc.previaEmo = nodo(); esc._previaFirma = "60,100|papa";
esc.previaSiembra(null);
ok("la vista previa se apaga y olvida su firma", esc.previaSpr.visible === false && esc.previaEmo.visible === false && esc._previaFirma === "");
const mariposaVieja = { ancla: { o: pl, k: "listo0" }, anclaK: "listo0", percha: { x: 60, y: 84 }, posadaHasta: 900, firmaPosada: "ready:0" };
const mariposaAjena = { ancla: { o: { i: 99 }, k: "otro" }, anclaK: "otro", percha: { x: 1, y: 1 }, posadaHasta: 900 };
esc.maripos = [mariposaVieja, mariposaAjena]; esc._mariAt = 900;
esc.soltarMariposasDe(pl);
ok("solo la mariposa del recurso movido abandona su percha", mariposaVieja.ancla === null && mariposaVieja.percha === null &&
  mariposaVieja.posadaHasta === 0 && mariposaVieja.firmaPosada === null && mariposaAjena.anclaK === "otro" && esc._mariAt === 0);
const desdeMover = FARM.indexOf("moverParcela(pl, col, row) {");
const hastaMover = FARM.indexOf("refreshPlotLocks()", desdeMover);
ok("mover una parcela libera las mariposas que la seguían", /this\.barraCultivo\(pl, nowMs\(\)\)[\s\S]{0,160}this\.soltarMariposasDe\(pl\)/.test(FARM.slice(desdeMover, hastaMover)));
const desdePrompt = FARM.indexOf("updatePrompt() {");
const hastaNoWalk = FARM.indexOf("if (GF.NO_WALK)", desdePrompt);
const promptPrevias = FARM.slice(desdePrompt, hastaNoWalk);
ok("editar o colocar apaga la vista previa de siembra", /if \(this\.placing\)[\s\S]{0,500}this\.previaSiembra\(null\)/.test(promptPrevias) &&
  /GF\.uiOpen[\s\S]{0,350}this\.previaSiembra\(null\)/.test(promptPrevias));

console.log("\nLA BARRA DE GOLPES TAMBIÉN VIAJA CON EL NODO");
const barraGolpe = nodo();
const nodoGolpe = { type: "tree", cx: 340, by: 280, golpes: 1, barra: barraGolpe };
esc.barraGolpes(nodoGolpe);
ok("la barra conserva profundidad y se vuelve a dibujar", barraGolpe.depth === 283 && barraGolpe.clearCount === 1 &&
  barraGolpe.rects.length === 4 && barraGolpe.rects[0][0] === 323 && barraGolpe.rects[0][1] === 282);
const desdeNodo = FARM.indexOf("o.cx = leftCol * T + wCells * T / 2;");
const hastaNodo = FARM.indexOf("this.reposicionarAviso(o);", desdeNodo);
ok("el soltar real repinta la barra del nodo movido", /o\.sprite\.setPosition\(o\.cx, o\.by\)[\s\S]{0,500}this\.barraGolpes\(o\)/.test(FARM.slice(desdeNodo, hastaNodo)));

console.log("\nLA BRASA DE LA HERRERÍA NO QUEDA EN SU UBICACIÓN VIEJA");
const core = nodo(), halo = nodo();
esc.storeObj = { cx: 300, by: 420, rw: 110, w: 110,
  sprite: { displayHeight: 99, texture: { key: "store" } } };
esc.textures = { exists: () => false };
esc.forgeGlow = [core, halo];
esc.updateForge();
const fx = 300 - .027 * 110, fy = 420 - .299 * 99;
ok("el núcleo usa la boca actual de la fragua", cerca(core.x, fx) && cerca(core.y, fy) && core.depth === 421 && core.visible);
ok("el halo conserva su separación y profundidad", cerca(halo.x, fx) && cerca(halo.y, fy - 2) && cerca(halo.depth, 420.9) && halo.visible);

console.log("\nEL HALO DEL FAROL SIGUE EL ADORNO DURANTE EL ARRASTRE");
const haloFarol = nodo(100, 100), otroHalo = nodo(50, 50);
haloFarol._farolI = 7; otroHalo._farolI = 8;
esc.faroles = [haloFarol, otroHalo];
esc.moverHaloFarol({ i: 7, id: "farol" }, 440, 360);
ok("solo el halo correspondiente se mueve", haloFarol.x === 440 && haloFarol.y === 336 && haloFarol.depth === 90001 &&
  haloFarol.visible && otroHalo.x === 50 && otroHalo.y === 50);
const desdeDeco = FARM.indexOf("if (this.dragDeco) {");
const hastaDeco = FARM.indexOf("} else if (this.dragObj)", desdeDeco);
const gestoDeco = FARM.slice(desdeDeco, hastaDeco);
ok("el gesto real llama al seguimiento del halo", /a\.g\.setPosition\(pt\.worldX, pt\.worldY\)[\s\S]{0,250}this\.moverHaloFarol\(a, pt\.worldX, pt\.worldY\)/.test(gestoDeco));
const desdeSync = FARM.indexOf("syncAdornos() {");
const hastaSync = FARM.indexOf("limpiarFaroles()", desdeSync);
ok("reconstruir adornos también refresca sus luces", /this\.refrescarFaroles\(\)/.test(FARM.slice(desdeSync, hastaSync)));

console.log("\nPAQUETE, GOBLIN Y MASCOTA ACOMPAÑAN A SU EDIFICIO");
const buzon = { type: "buzon", cx: 500, by: 260 };
const establo = { type: "establo", cx: 180, by: 340 };
const paquete = { sprite: nodo() };
const goblin = { sprite: nodo(), shadow: nodo(), shadowDy: 2, shadowDepthDy: -1 };
const mascota = { sprite: nodo(), shadow: nodo(), shadowDy: 2, shadowDepthDy: -1 };
esc.objs = [buzon, establo]; esc.paqueteObj = paquete; esc.goblinObj = goblin; esc.domaObj = mascota;
esc.reanclarAcompanantes("buzon");
ok("paquete y goblin se anclan al buzón", paquete.cx === 510 && paquete.by === 272 && paquete.sprite.x === 510 && paquete.sprite.y === 272 &&
  goblin.cx === 470 && goblin.by === 268 && goblin.sprite.x === 470 && goblin.shadow.x === 470 && goblin.shadow.y === 270);
esc.reanclarAcompanantes("establo");
ok("la mascota se ancla al establo con su sombra", mascota.cx === 226 && mascota.by === 346 && mascota.sprite.x === 226 && mascota.sprite.y === 346 &&
  mascota.shadow.x === 226 && mascota.shadow.y === 348);
const desdeSoltar = FARM.indexOf("o.cx = leftCol * T + wCells * T / 2;");
const hastaSoltar = FARM.indexOf("this.dragObj = null;", desdeSoltar);
const soltar = FARM.slice(desdeSoltar, hastaSoltar);
ok("al soltar, los acompañantes se recolocan antes de la colisión", /this\.reanclarAcompanantes\(o\.type\)[\s\S]{0,300}this\.rebuildCollisions\(\)/.test(soltar));
ok("goblin y mascota usan la sombra arrastrable estándar", /type: "goblinmerc"[\s\S]{0,220}shadow, shadowDy: 2/.test(FARM) &&
  /type: "domabicho"[\s\S]{0,220}shadow, shadowDy: 2/.test(FARM));

console.log("\nEL AGUA ENTERA VIAJA CON LA LAGUNA");
let punto = 0;
esc.pondPoint = () => ({ x: 500 + ++punto, y: 600 + punto });
const ondaA = nodo(), ondaB = nodo(), pez = nodo();
esc.pondWaves = [ondaA, ondaB]; esc.pondFish = [{ s: pez, tgt: null }];
esc.reposicionarAmbienteLaguna();
ok("ondas, destellos y peces salen de la celda vieja", ondaA.x === 501 && ondaA.y === 601 && ondaB.x === 502 && ondaB.y === 602 &&
  pez.x === 503 && pez.y === 603 && esc.pondFish[0].tgt.x === 504 && esc.pondFish[0].tgt.y === 604);
const desdeMoverLaguna = FARM.indexOf("if (this.dragPond) {");
const hastaMoverLaguna = FARM.indexOf("if (!this.dragObj)", desdeMoverLaguna);
const soltarLaguna = FARM.slice(desdeMoverLaguna, hastaMoverLaguna);
ok("el soltar real recoloca todo el ambiente del agua", /this\.pondImg\.setPosition[\s\S]{0,260}this\.reposicionarAmbienteLaguna\(\)/.test(soltarLaguna));
const desdeTomarLaguna = FARM.indexOf("if (this.pondImg && this.pondDist(wx, wy) < 1)");
const hastaTomarLaguna = FARM.indexOf("this.hold =", desdeTomarLaguna);
const tomarLaguna = FARM.slice(desdeTomarLaguna, hastaTomarLaguna);
ok("no permite mover la laguna con un lance activo", /this\.action && this\.action\.kind === "fish"[\s\S]{0,260}this\.dragPond = true/.test(tomarLaguna));

console.log("\nLA GUÍA CAMBIA CON LA PARCELA Y LA LAGUNA");
const desdePlot = FARM.indexOf("if (this.dragPlot) {");
const hastaPlot = FARM.indexOf("// soltar la LAGUNA", desdePlot);
const soltarPlot = FARM.slice(desdePlot, hastaPlot);
ok("una parcela reubicada refresca su guía", /this\.moverParcela\(pl, col, row\)[\s\S]{0,220}this\.updateTutoArrow\(\)/.test(soltarPlot));
const desdePond = FARM.indexOf("if (this.dragPond) {");
const hastaPond = FARM.indexOf("if (!this.dragObj)", desdePond);
const soltarPond = FARM.slice(desdePond, hastaPond);
ok("una laguna reubicada refresca su guía", /p2\.col = col; p2\.row = row;[\s\S]{0,900}this\.updateTutoArrow\(\)/.test(soltarPond));

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ los efectos del mundo no quedan separados de lo que representan\n");
process.exit(fallos ? 1 : 0);
