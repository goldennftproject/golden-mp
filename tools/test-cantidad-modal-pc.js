/* CANTIDAD MODAL EN ESCRITORIO
   ============================
   «¿Cuántas?» se abre sobre la puerta de la Zona. En PC un clic en sus huecos no puede volver a
   activar una pila de la tarjeta inferior: el selector captura el fondo, enfoca el número y
   Escape cancela sólo esta elección. Móvil conserva el flujo compacto anterior.
     node tools/test-cantidad-modal-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function cuantoAtajo(q, max) {");
const fin = UI.indexOf("/* 8/9 (Suren) — LA VISTA", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró el selector de cantidad");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases() {
  const datos = new Set();
  return { add: n => datos.add(n), remove: n => datos.delete(n), contains: n => datos.has(n) };
}
function entorno(ancho) {
  const handlers = {};
  const ov = { classList: clases(), querySelectorAll: () => [], addEventListener(tipo, fn) { handlers[tipo] = fn; }, _handlers: handlers };
  let focos = 0, selecciones = 0, capas = 0;
  const rango = {}, num = { focus() { focos++; }, select() { selecciones++; } };
  const titulo = {}, sub = {}, si = {}, no = {};
  const nodos = { "ov-cuanto": ov, "cu-rango": rango, "cu-num": num, "cu-title": titulo, "cu-sub": sub, "cu-ok": si, "cu-no": no };
  const ctx = { window: { innerWidth: ancho }, $: id => nodos[id] || null, enfocarOvPc: () => capas++, desenfocarAlCerrar() {} };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  return { ctx, ov, rango, num, titulo, sub, si, no, focos: () => focos, selecciones: () => selecciones, capas: () => capas };
}
function preguntar(e, onOk) {
  e.ctx.acepta = onOk;
  vm.runInContext('pedirCuanto(8, "¿Cuántas?", "Flechas", acepta)', e.ctx);
}

console.log("\nEL FONDO DEL SELECTOR NO DEJA CLICS EN LA TARJETA INFERIOR\n");
{
  const e = entorno(1280);
  let pasa = 0, propagacion = 0;
  preguntar(e, () => pasa++);
  ok("abre el selector y conserva su foco visual", e.ov.classList.contains("show") && e.capas() === 1);
  ok("pone el foco y la selección en el número", e.focos() === 1 && e.selecciones() === 1);
  ok("instala el fondo que captura pointerdown", typeof e.ov._handlers.pointerdown === "function");
  e.ov._handlers.pointerdown({ target: e.ov, stopPropagation() { propagacion++; } });
  ok("un clic en el fondo sólo cancela esta cantidad", !e.ov.classList.contains("show") && propagacion === 1 && pasa === 0);
  ok("muestra título, subtítulo y el máximo", e.titulo.textContent === "¿Cuántas?" && e.sub.textContent === "Flechas" && e.rango.max === 8 && e.num.max === 8);

  preguntar(e, () => pasa++);
  e.num.value = "3"; e.si.onclick();
  ok("Aceptar cierra y entrega solamente el número elegido", !e.ov.classList.contains("show") && pasa === 1, String(pasa));
  preguntar(e, () => pasa++);
  e.no.onclick();
  ok("Cancelar explícito no ejecuta el traslado", !e.ov.classList.contains("show") && pasa === 1, String(pasa));
}

console.log("\nMÓVIL MANTIENE EL FLUJO COMPACTO EXISTENTE\n");
{
  const e = entorno(640);
  preguntar(e, () => {});
  ok("la tarjeta sigue abriendo", e.ov.classList.contains("show"));
  ok("no roba el foco inicial de la interacción táctil", e.focos() === 0 && e.selecciones() === 0);
  e.ov._handlers.pointerdown({ target: e.ov, stopPropagation() { throw new Error("no debe detener"); } });
  ok("su listener queda inactivo mientras es móvil", e.ov.classList.contains("show"));
}

console.log("\nESCAPE Y ATAJOS RESPETAN LA ELECCIÓN ACTIVA\n");
{
  const iniKeys = UI.indexOf("  const KEYS = { i:");
  const finKeys = UI.indexOf("\n\n  refreshHud();", iniKeys);
  let listener = null, cantidad = 0, menu = 0, cierres = 0;
  const ctx = {
    window: { innerWidth: 1280, addEventListener(tipo, fn) { if (tipo === "keydown") listener = fn; } },
    document: { querySelector: () => null, addEventListener() {} },
    controlDeTecladoActivo() { return false; }, selectorContextualPcAbierto() { return false; },
    cerrarConfirmacionLocal() { return false; },
    cerrarCantidadLocal() { cantidad++; return true; },
    isOpen(id) { return id === "ov-cuanto"; },
    toggleMenu() { menu++; }, closeAllOv() { cierres++; }, hideSeedWheel() {}, pescaAparejosAbierto() { return false; }, cerrarCuerpoPanelPc() { return false; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniKeys, finKeys), ctx);
  let prevenido = 0;
  listener({ key: "Escape", target: { tagName: "INPUT", closest: () => null }, preventDefault() { prevenido++; } });
  ok("Escape desde el número cierra sólo el selector", cantidad === 1 && cierres === 0, "cantidad=" + cantidad + ", cierres=" + cierres);
  cantidad = 0; prevenido = 0;
  listener({ key: "m", target: { closest: () => null }, preventDefault() { prevenido++; } });
  ok("M no abre el menú detrás de la cantidad", prevenido === 1 && menu === 0 && cantidad === 0);
}

console.log("\nLA BARRERA ES SÓLO DE ESCRITORIO\n");
ok("el CSS de cantidad captura el fondo sobre 640 px y queda sobre la flecha", /@media\(min-width:641px\)\{#ov-cuanto\.show\{z-index:81;pointer-events:auto;background:rgba\(12,7,2,\.26\)\}\}/.test(HTML));
ok("la salida de Escape prioriza cantidad antes de pesca y paneles", (() => {
  const esc = UI.indexOf('if (key === "escape") {');
  const cantidad = UI.indexOf("window.innerWidth > 640 && cerrarCantidadLocal()", esc);
  const pesca = UI.indexOf('typeof P4 !== "undefined" && P4', esc);
  return esc >= 0 && cantidad > esc && pesca > cantidad;
})());
ok("los atajos de PC no cruzan el selector salvo su propio Tab/Enter/Espacio", /if \(window\.innerWidth > 640 && isOpen\("ov-cuanto"\)\) \{[\s\S]*?e\.target\.closest\("#ov-cuanto"\)[\s\S]*?key === "tab"[\s\S]*?key === "enter"[\s\S]*?key === "spacebar"[\s\S]*?return;/.test(UI));

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: cantidad no deja clics ni atajos escapar a la tarjeta inferior en PC.\n");
process.exit(fallos ? 1 : 0);
