/* EL AVISO SIGUE AL EDIFICIO QUE SE EDITA

   El ! no es decoración: es el atajo visual para cobrar, alimentar o continuar una tarea.
   Si al mover su edificio queda colgado en la celda anterior, invita a abrir una ventana que ya
   no está ahí. Este arnés prueba el ancla, el rebote y las dos salidas reales del arrastre.
     node tools/test-avisos-edificios.js */
const fs = require("fs"), vm = require("vm");
const FARM = fs.readFileSync("public/game/farm.js", "utf8");

const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Number, Date, JSON,
  Object, Array, String, Boolean, Set, Map, isFinite, parseInt, parseFloat,
  Phaser: { Scene: class {} } };
ctx.window = ctx; ctx.globalThis = ctx;
let pendientes = 1;
ctx.pendienteDe = () => pendientes;
vm.createContext(ctx);
vm.runInContext(FARM, ctx, { filename: "farm.js" });
vm.runInContext("this.FarmScene = FarmScene;", ctx);

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function texto(x, y) {
  return {
    x, y, visible: true, destruido: false,
    setOrigin() { return this; }, setDepth() { return this; },
    setVisible(v) { this.visible = v; return this; },
    setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
    destroy() { this.destruido = true; return this; }
  };
}

const tweenCalls = [];
const esc = new ctx.FarmScene();
esc.add = { text: texto };
esc.tweens = {
  add(spec) {
    const tw = { spec, parado: false, stop() { this.parado = true; } };
    tweenCalls.push(tw); return tw;
  }
};
const sprite = {
  x: 160, y: 220, displayHeight: 90,
  setPosition(x, y) { this.x = x; this.y = y; return this; }
};
const edificio = { type: "cocina", cx: 160, by: 220, sprite, oculto: false };
esc.objs = [edificio];

console.log("\nEL AVISO NACE ANCLADO AL SPRITE, NO A UNA COORDENADA GUARDADA");
esc.avisosDibujar();
const aviso = edificio._aviso, primerTween = edificio._avisoTween;
ok("se crea cuando hay algo pendiente", !!aviso && tweenCalls.length === 1);
ok("queda encima del edificio", aviso && aviso.x === 162 && aviso.y === 120,
  aviso ? aviso.x + "," + aviso.y : "sin aviso");
esc.avisosDibujar();
ok("un repaso sin cambios no reinicia su rebote", tweenCalls.length === 1);

console.log("\nAL CAMBIAR DE CELDA, EL REBOTE TAMBIÉN CAMBIA DE ANCLA");
sprite.setPosition(320, 300); edificio.cx = 320; edificio.by = 300;
esc.avisosDibujar();
ok("el ! llega a la nueva celda", aviso.x === 322 && aviso.y === 200, aviso.x + "," + aviso.y);
ok("el rebote anterior se detiene", primerTween.parado === true);
ok("y se crea uno con la nueva altura", tweenCalls.length === 2 && tweenCalls[1].spec.y === 194,
  tweenCalls.length + " tweens · destino y=" + (tweenCalls[1] && tweenCalls[1].spec.y));

console.log("\nOCULTAR O TERMINAR LA TAREA NO DEJA UN AVISO FANTASMA");
edificio.oculto = true; esc.avisosDibujar();
ok("un edificio oculto apaga su aviso", aviso.visible === false);
edificio.oculto = false; esc.avisosDibujar();
ok("al volver a existir, el aviso vuelve a verse", aviso.visible === true);
pendientes = 0; esc.avisosDibujar();
ok("sin pendiente destruye el aviso", edificio._aviso === null && aviso.destruido === true);
ok("y detiene el último rebote", tweenCalls[1].parado === true);

console.log("\nEL GESTO REAL LO REPOSICIONA TANTO SI VALE COMO SI SE CANCELA");
const desde = FARM.indexOf("if (this.placeBlocked(o, leftCol, baseRow, wCells))");
const hasta = FARM.indexOf("if (o.type === \"cofre\")", desde);
const soltar = FARM.slice(desde, hasta);
ok("un destino ocupado devuelve el ! a su edificio", /o\.sprite\.setPosition\(o\.origCx, o\.origBy\)[\s\S]{0,500}this\.reposicionarAviso\(o\)/.test(soltar));
ok("un destino válido lo pega a la nueva celda", /o\.sprite\.setPosition\(o\.cx, o\.by\)[\s\S]{0,500}this\.reposicionarAviso\(o\)/.test(soltar));
ok("al tomar un edificio se oculta el ! transitorio", /this\.dragObj = hit[\s\S]{0,700}hit\._aviso\.setVisible\(false\)/.test(FARM));

console.log(fallos ? "\n  ✗ " + fallos + " fallas\n" : "\n  ✓ los avisos no se separan de los edificios editados\n");
process.exit(fallos ? 1 : 0);
