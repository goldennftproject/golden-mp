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
  const titulo = {}, mensaje = {}, si = {}, no = {};
  let foco = 0;
  const nodos = { "ov-confirm": ov, "cf-title": titulo, "cf-msg": mensaje, "cf-yes": si, "cf-no": no };
  const ctx = { window: { innerWidth: ancho }, $: id => nodos[id] || null, enfocarOvPc: () => foco++ };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(ini, fin), ctx);
  return { ctx, ov, titulo, mensaje, si, no, foco: () => foco };
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
}

console.log("\nLA BARRERA Y ESCAPE SON EXCLUSIVOS DE PC\n");
ok("CSS captura el fondo sólo sobre 640 px", /@media\(min-width:641px\)\{#ov-confirm\.show\{pointer-events:auto;background:rgba\(12,7,2,\.26\)\}\}/.test(HTML));
ok("Escape primero cierra sólo la pregunta en PC", /window\.innerWidth > 640 && cerrarConfirmacionLocal\(\)\) return;/.test(UI));

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: la confirmación de PC no deja clics escapar al panel inferior.\n");
process.exit(fallos ? 1 : 0);
