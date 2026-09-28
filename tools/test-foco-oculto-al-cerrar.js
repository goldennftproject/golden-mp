/* CERRAR UNA TARJETA DEVUELVE EL TECLADO AL MUNDO
   Un input oculto puede retener foco DOM después de cerrar su overlay. La granja y la Zona lo
   respetan para no ejecutar WASD/E mientras se escribe; por eso cada salida debe desenfocarlo.
   node tools/test-foco-oculto-al-cerrar.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("function desenfocarAlCerrar(");
const fin = UI.indexOf("function hayOvPcAbierto()", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró la salida de foco");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + "  " + n + (d ? "   " + d : "")); };
function probar(activoDentro) {
  let blur = 0;
  const activo = { blur() { blur++; } };
  const contenedor = { contains(nodo) { return activoDentro && nodo === activo; } };
  const ctx = { document: { activeElement: activo } };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  ctx.desenfocarAlCerrar(contenedor);
  return blur;
}
function cuerpo(nombre, hasta) {
  const desde = UI.indexOf("function " + nombre + "(");
  const finFn = UI.indexOf(hasta, desde);
  return desde >= 0 && finFn > desde ? UI.slice(desde, finFn) : "";
}

console.log("\nLA TARJETA NO DEJA UN CAMPO INVISIBLE CON EL FOCO");
{
  ok("desenfoca sólo al control que pertenece a la tarjeta", probar(true) === 1);
  ok("no roba foco de otro lugar de la interfaz", probar(false) === 0);
  ok("cantidad libera su número al cerrar", /desenfocarAlCerrar\(ov\);/.test(cuerpo("cerrarCantidadLocal", "function enlazarFondoCantidadPc")));
  ok("confirmación libera su botón al cerrar", /desenfocarAlCerrar\(ov\);/.test(cuerpo("cerrarConfirmacionLocal", "function enlazarFondoConfirmacionPc")));
  ok("la × de cualquier overlay libera su control", /desenfocarAlCerrar\(e\);/.test(cuerpo("closeOv", "/* ---- RESUMEN")));
  ok("cerrar todas las tarjetas no deja focos huérfanos", /querySelectorAll\("\.ov\.show:not\(\.bloquea\)"\)\.forEach\(e => \{ desenfocarAlCerrar\(e\);/.test(cuerpo("closeAllOv", "/* ---- HUD")));
  const fuera = UI.slice(UI.indexOf("  // clic fuera de una ventana abierta"), UI.indexOf("  // clic derecho en el juego"));
  ok("el clic fuera usa la misma salida de foco", /if \(o\.id !== "ov-inv"\) \{ desenfocarAlCerrar\(o\);/.test(fuera));
  const entrar = UI.slice(UI.indexOf('const ent = $("vj-entrar")'), UI.indexOf("function refreshRecientes"));
  ok("entrar a la Zona también suelta el foco de su tarjeta", /desenfocarAlCerrar\(el\); el\.classList\.remove\("show"\)/.test(entrar));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cerrar una tarjeta devuelve sus teclas al juego.\n");
process.exit(fallos ? 1 : 0);
