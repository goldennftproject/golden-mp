/* LA GUÍA SE REFRESCA AL CERRAR UNA VENTANA EN PC
   =================================================
   La flecha del tutorial es un elemento fijo. Quitar `.show` de una tarjeta no genera por sí
   mismo un evento que la recoloque; esta prueba exige el refresco inmediato para ×/atajos,
   Escape y el clic que vuelve al mundo, sin cambiar móvil.
     node tools/test-cierre-guia-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const ini = UI.indexOf("function refrescarGuiaTrasCerrarOv(cerro) {");
const fin = UI.indexOf("/* ---- RESUMEN DEL VIAJE", ini);
const iniTodas = UI.indexOf("function closeAllOv() {");
const finTodas = UI.indexOf("/* ---- HUD ----", iniTodas);
if (ini < 0 || fin < 0 || iniTodas < 0 || finTodas < 0) throw new Error("No se encontraron los cierres de overlay");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases(abierta) {
  let show = !!abierta;
  return { contains: n => n === "show" && show, remove: n => { if (n === "show") show = false; }, abierta: () => show };
}
function entorno(ancho) {
  let guia = 0;
  const equip = { id: "ov-equip", classList: clases(true) };
  const mercado = { id: "ov-market", classList: clases(true) };
  const ctx = {
    window: { innerWidth: ancho },
    $: id => ({ "ov-equip": equip, "ov-market": mercado })[id] || null,
    document: { querySelectorAll: () => [equip, mercado] },
    desenfocarAlCerrar() {},
    tutoHighlight() { guia++; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  vm.runInContext(UI.slice(iniTodas, finTodas), ctx);
  return { ctx, equip, mercado, guia: () => guia };
}

console.log("\nCERRAR UNA TARJETA ACTUALIZA LA FLECHA EN EL MISMO GESTO\n");
{
  const e = entorno(1280);
  e.ctx.closeOv("ov-equip");
  ok("× o atajo quita la tarjeta y refresca la guía", !e.equip.classList.abierta() && e.guia() === 1, String(e.guia()));
  e.ctx.closeOv("ov-equip");
  ok("cerrar una tarjeta ya oculta no repinta sin motivo", e.guia() === 1, String(e.guia()));
}

console.log("\nESCAPE Y CIERRES EN LOTE TAMBIÉN RECALCULAN\n");
{
  const e = entorno(1280);
  e.ctx.closeAllOv();
  ok("closeAllOv limpia las tarjetas normales", !e.equip.classList.abierta() && !e.mercado.classList.abierta());
  ok("y recalcula una sola vez al final", e.guia() === 1, String(e.guia()));
}

console.log("\nMÓVIL QUEDA FUERA DE ESTA PASADA\n");
{
  const e = entorno(640);
  e.ctx.closeOv("ov-equip");
  ok("sigue cerrando la tarjeta", !e.equip.classList.abierta());
  ok("pero no fuerza el refresco de escritorio", e.guia() === 0, String(e.guia()));
}

console.log("\nEL CLIC FUERA USA LA MISMA SALIDA\n");
{
  const iniFuera = UI.indexOf("  // clic fuera de una ventana abierta");
  const finFuera = UI.indexOf("  // clic derecho en el juego", iniFuera);
  const fuera = UI.slice(iniFuera, finFuera);
  ok("recuerda si realmente cerró una tarjeta", /let cerro = false;[\s\S]*?cerro = true;/.test(fuera));
  ok("y refresca la guía después de ese cierre", /refrescarGuiaTrasCerrarOv\(cerro\);/.test(fuera));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la flecha no queda apuntando a una tarjeta cerrada en PC.\n");
process.exit(fallos ? 1 : 0);
