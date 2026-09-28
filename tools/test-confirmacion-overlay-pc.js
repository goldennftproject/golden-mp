/* CONFIRMACIÓN VERDADERAMENTE MODAL EN ESCRITORIO
   ===============================================
   Una pregunta pequeña puede aparecer sobre Inventario o Mercado. En PC el fondo tiene que
   capturar el puntero: ningún botón o hueco del panel inferior puede ejecutarse hasta responder.
     node tools/test-confirmacion-overlay-pc.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const HTML = fs.readFileSync("public/index.html", "utf8");
const ini = UI.indexOf("function cerrarConfirmacionLocal() {");
const fin = UI.indexOf("// qué se tiraría", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró la confirmación local");

let fallos = 0;
const ok = (n, c, d) => { if (!c) fallos++; console.log((c ? "  ok   " : "  FALLA") + " " + n + (d ? "   " + d : "")); };
function clases() {
  const datos = new Set();
  return { add: n => datos.add(n), remove: n => datos.delete(n), contains: n => datos.has(n), texto: () => [...datos].join(" ") };
}
function entorno(ancho) {
  const handlers = {};
  const ov = { classList: clases(), addEventListener(tipo, fn) { handlers[tipo] = fn; }, _handlers: handlers };
  const titulo = {}, mensaje = {}, si = {};
  let foco = 0, focoCancelar = 0;
  const no = { focus() { focoCancelar++; } };
  const nodos = { "ov-confirm": ov, "cf-title": titulo, "cf-msg": mensaje, "cf-yes": si, "cf-no": no };
  const ctx = { window: { innerWidth: ancho }, $: id => nodos[id] || null, enfocarOvPc: () => foco++, desenfocarAlCerrar() {} };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  return { ctx, ov, titulo, mensaje, si, no, foco: () => foco, focoCancelar: () => focoCancelar };
}
function preguntar(e, onYes, onNo) {
  e.ctx.acepta = onYes; e.ctx.cancela = onNo;
  vm.runInContext('askConfirm("¿Seguro?", acepta, { title:"Decidir", yes:"Sí", no:"No", onNo:cancela })', e.ctx);
}

console.log("\nEL PANEL INFERIOR QUEDA BLOQUEADO MIENTRAS SE CONFIRMA EN PC\n");
{
  const e = entorno(1280);
  let si = 0, no = 0, propagacion = 0;
  preguntar(e, () => si++, () => no++);
  ok("abre la pregunta y conserva su foco", e.ov.classList.contains("show") && e.foco() === 1);
  ok("pone el foco inicial en Cancelar, no en la acción destructiva", e.focoCancelar() === 1);
  ok("instala un fondo que captura pointerdown", typeof e.ov._handlers.pointerdown === "function");
  e.ov._handlers.pointerdown({ target: e.ov, stopPropagation() { propagacion++; } });
  ok("un clic en el fondo sólo cierra la pregunta", !e.ov.classList.contains("show") && propagacion === 1);
  ok("el fondo no ejecuta ninguna elección", si === 0 && no === 0, "sí=" + si + ", no=" + no);
  ok("carga el texto y rótulos de la pregunta", e.titulo.textContent === "Decidir" && e.mensaje.textContent === "¿Seguro?" && e.si.textContent === "Sí" && e.no.textContent === "No");

  preguntar(e, () => si++, () => no++);
  e.no.onclick();
  ok("Cancelar cierra y sí ejecuta la alternativa explícita", !e.ov.classList.contains("show") && si === 0 && no === 1);

  preguntar(e, () => si++, () => no++);
  e.si.onclick();
  ok("Confirmar cierra y ejecuta sólo la aceptación", !e.ov.classList.contains("show") && si === 1 && no === 1);
}

console.log("\nMÓVIL MANTIENE EL FLUJO COMPACTO EXISTENTE\n");
{
  const e = entorno(640);
  preguntar(e, () => {}, () => {});
  ok("sigue abriendo la tarjeta", e.ov.classList.contains("show"));
  ok("deja listo el cierre si se ensancha con la pregunta abierta", typeof e.ov._handlers.pointerdown === "function");
  ok("no toma el foco exclusivo de escritorio", e.focoCancelar() === 0);
}

console.log("\nLA BARRERA Y ESCAPE SON EXCLUSIVOS DE PC\n");
ok("CSS captura el fondo sólo sobre 640 px y queda por encima de la flecha tutorial", /@media\(min-width:641px\)\{#ov-confirm\.show\{z-index:81;pointer-events:auto;background:rgba\(12,7,2,\.26\)\}\}/.test(HTML));
ok("la capa de confirmación supera la flecha de tutorial pero no las pantallas de recuperación", /#tuto-flecha-ui\{[^}]*z-index:99999[\s\S]*?@media\(min-width:641px\)\{#tuto-flecha-ui\{z-index:80\}\}/.test(HTML) && /#fadeblk\{[^}]*z-index:900/.test(HTML));
{
  const esc = UI.indexOf('if (key === "escape") {');
  const confirma = UI.indexOf("window.innerWidth > 640 && cerrarConfirmacionLocal()", esc);
  const pesca = UI.indexOf('typeof P4 !== "undefined" && P4', esc);
  ok("Escape primero cierra la pregunta de PC, incluso antes de una pesca activa", esc >= 0 && confirma > esc && pesca > confirma);
}
{
  const iniTeclas = UI.indexOf("  const KEYS = { i:");
  const finTeclas = UI.indexOf("\n\n  refreshHud();", iniTeclas);
  let listener = null, cierres = 0, pesca = 0;
  const ctx = {
    window: { innerWidth: 1280, addEventListener(tipo, fn) { if (tipo === "keydown") listener = fn; } },
    document: { querySelector: () => null, addEventListener() {} }, P4: {},
    controlDeTecladoActivo() { return false; }, selectorContextualPcAbierto() { return false; },
    cerrarConfirmacionLocal() { cierres++; return true; }, pescaV4Cerrar() { pesca++; },
  };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(iniTeclas, finTeclas), ctx);
  listener({ key: "Escape", target: {}, preventDefault() {} });
  ok("la ruta real de Escape no abandona la pesca debajo de la pregunta", cierres === 1 && pesca === 0, "pregunta=" + cierres + ", pesca=" + pesca);
}
ok("los atajos de PC no cruzan la pregunta salvo Tab, Enter o Espacio en sus botones", /if \(window\.innerWidth > 640 && isOpen\("ov-confirm"\)\) \{[\s\S]*?e\.target\.closest\("#ov-confirm"\)[\s\S]*?key === "tab"[\s\S]*?key === "enter"[\s\S]*?key === "spacebar"[\s\S]*?return;/.test(UI));

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la confirmación de PC no deja clics escapar al panel inferior.\n");
process.exit(fallos ? 1 : 0);
