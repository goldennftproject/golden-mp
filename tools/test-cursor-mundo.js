/* EL CURSOR DEL MUNDO
   El brillo sobre un objeto tiene que acompañarse de una mano en PC, pero jamás quedarse pegada
   al abrir una interfaz, al cambiar de escena o al pasar a un viewport móvil.
     node tools/test-cursor-mundo.js */
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync("public/game/farm.js", "utf8");
const ini = src.indexOf("  cursorMundo(mano) {");
const fin = src.indexOf("\n  // brillo de interacción:", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró cursorMundo");
const cuerpo = src.slice(ini, fin).replace("  cursorMundo", "function cursorMundo");

const ctx = { window: { innerWidth: 1280 }, document: { querySelector: () => null } };
vm.createContext(ctx);
vm.runInContext(cuerpo + "\nthis.cursorMundo = cursorMundo;", ctx);

let fallos = 0;
function ok(nombre, condicion, detalle) {
  if (!condicion) fallos++;
  console.log((condicion ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
}

console.log("\nCURSOR DEL MUNDO: LA MANO SOLO PROMETE LO QUE SE PUEDE TOCAR");
const canvas = { style: {} }, escena = { game: { canvas }, _cursorMundo: null };
ctx.cursorMundo.call(escena, true);
ok("en escritorio un objeto interactuable usa la mano", canvas.style.cursor === "pointer", canvas.style.cursor);
ctx.cursorMundo.call(escena, false);
ok("al salir del objeto vuelve al cursor normal", canvas.style.cursor === "", JSON.stringify(canvas.style.cursor));

canvas.style.cursor = "pointer"; escena._cursorMundo = "pointer"; ctx.window.innerWidth = 640;
ctx.cursorMundo.call(escena, true);
ok("en móvil se limpia aunque viniera de escritorio", canvas.style.cursor === "", JSON.stringify(canvas.style.cursor));

const sinCanvas = { game: {}, _cursorMundo: null };
let seguro = true;
try { ctx.cursorMundo.call(sinCanvas, true); } catch (e) { seguro = false; }
ok("sin un lienzo disponible no rompe la escena", seguro);

console.log("\nCABLEADO DEL HOVER Y DEL CAMBIO DE ESCENA");
ok("el hover activa la mano para objeto o agua alcanzable", /const aguaLista = !hov && this\.nearPond\(\) && this\.pondDist\(p\.worldX, p\.worldY\) < 1\.05;[\s\S]*this\.cursorMundo\(!!hov \|\| aguaLista\)/.test(src));
ok("una interfaz abierta apaga la mano", /GF\.editMode \|\| GF\.uiOpen\)[\s\S]{0,180}this\.cursorMundo\(false\)/.test(src));
ok("el shutdown restaura el lienzo", /events\.once\("shutdown", \(\) => \{\s*this\.cursorMundo\(false\)/.test(src));

console.log("\n" + (fallos ? "  ✗ " + fallos + " fallas\n" : "  ✓ el cursor acompaña el mundo sin prometer clics imposibles\n"));
process.exit(fallos ? 1 : 0);
