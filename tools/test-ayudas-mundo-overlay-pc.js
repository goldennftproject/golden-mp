/* AYUDAS DEL MUNDO Y VENTANAS DE ESCRITORIO
   ==========================================
   Las ventanas corrientes de PC no pausan la granja, pero sus ayudas temporales tampoco deben
   competir visualmente con una tarjeta: brillo bajo el cursor, reloj de enfriamiento y letrero
   de una obra. Este arnés comprueba la puerta compartida y que se consulta una vez por cuadro,
   no una vez por objeto.
     node tools/test-ayudas-mundo-overlay-pc.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "..");
const { ctx } = require("./arrancar-el-juego.contexto.js").arrancar(RAIZ);
const g = n => vm.runInContext(n, ctx);
const FARM = fs.readFileSync(path.join(RAIZ, "public/game/farm.js"), "utf8");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
const anchoInicial = ctx.innerWidth;
const estadoInicial = { editMode: ctx.GF.editMode, uiOpen: ctx.GF.uiOpen, NO_WALK: ctx.GF.NO_WALK };

function escena(frame) {
  const esc = Object.create(g("FarmScene").prototype);
  esc._frameT = frame;
  return esc;
}
function efecto() {
  return { visible: true, llamadas: [], setVisible(v) { this.visible = v; this.llamadas.push(v); return this; } };
}

console.log("\nLA MISMA PUERTA CUBRE TODAS LAS AYUDAS PASAJERAS");
{
  let consultas = 0;
  ctx.innerWidth = 1280;
  ctx.GF.editMode = false; ctx.GF.uiOpen = false; ctx.GF.NO_WALK = false;
  ctx.anyOvOpen = () => { consultas++; return true; };
  const esc = escena(71);
  const hover = efecto(), cerca = efecto();
  esc.hoverFx = hover; esc.nearFx = cerca;

  ok("una tarjeta normal de PC se reconoce como ayuda tapada", esc.ayudasMundoOcultas() === true);
  esc.updateHoverFx();
  ok("apaga el brillo del cursor y el de cercanía", hover.visible === false && cerca.visible === false);
  ok("un reloj o letrero tampoco se considera visible", esc.timerOn({}) === false);
  ok("la comprobación del overlay se reutiliza en el mismo cuadro", consultas === 1, String(consultas));
}

console.log("\nMÓVIL CONSERVA SU COMPORTAMIENTO HASTA SU PROPIA PASADA");
{
  ctx.innerWidth = 640;
  ctx.anyOvOpen = () => true;
  const esc = escena(72);
  ok("una ventana no activa esta puerta visual en móvil", esc.ayudasMundoOcultas() === false);
}

console.log("\nLA IMPLEMENTACIÓN NO DEJA UN CAMINO APARTE");
{
  ok("updateHoverFx usa la puerta compartida", /updateHoverFx\(\) \{[\s\S]{0,1000}this\.ayudasMundoOcultas\(\)/.test(FARM));
  ok("timerOn usa la misma puerta", /timerOn\(o\) \{[\s\S]{0,220}this\.ayudasMundoOcultas\(\)/.test(FARM));
  ok("la consulta se guarda por cuadro", /if \(marco !== undefined && this\._ayudasMundoMarco === marco\)/.test(FARM));
}

ctx.innerWidth = anchoInicial;
Object.assign(ctx.GF, estadoInicial);
ctx.anyOvOpen = () => false;
console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: las ayudas del mundo no se filtran detrás de ventanas de PC.\n");
process.exit(fallos ? 1 : 0);
