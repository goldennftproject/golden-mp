/* TOAST Y GUÍA: DOS MENSAJES, DOS LUGARES
   El aviso breve no puede cubrir el objetivo que explica la siguiente acción.
     node tools/test-toast-tutorial.js */
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync("public/game/ui.js", "utf8");
const html = fs.readFileSync("public/index.html", "utf8");
const ini = src.indexOf("function placeToast() {");
const fin = src.indexOf("function toast(m)", ini);
if (ini < 0 || fin < 0) throw new Error("No se encontró placeToast");

function nodo(rect, clases) {
  const set = new Set(clases || []);
  return { style: { top: "" }, classList: { contains: k => set.has(k) }, getBoundingClientRect: () => rect };
}
let toastEl, guiaEl;
const ctx = {
  window: { innerHeight: 640 },
  $: id => id === "toast" ? toastEl : id === "tuto" ? guiaEl : null,
  Math,
};
vm.createContext(ctx);
vm.runInContext("this.placeToast = " + src.slice(ini, fin).replace("function placeToast", "function") + ";", ctx);

let fallos = 0;
function ok(nombre, condicion, detalle) {
  if (!condicion) fallos++;
  console.log((condicion ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
}

console.log("\nGUÍA ARRIBA: EL TOAST BAJA DEBAJO");
{
  guiaEl = nodo({ left: 210, top: 54, right: 558, bottom: 90, width: 348, height: 36 });
  toastEl = nodo({ left: 260, top: 60, right: 508, bottom: 100, width: 248, height: 40 }, ["show"]);
  ctx.placeToast();
  ok("deja ocho píxeles entre guía y toast", toastEl.style.top === "98px", toastEl.style.top);
}

console.log("\nGUÍA OCULTA O ABAJO: EL TOAST CONSERVA SU CSS");
{
  guiaEl = nodo({ left: 210, top: 54, right: 558, bottom: 90, width: 348, height: 36 }, ["hidden"]);
  toastEl = nodo({ left: 260, top: 60, right: 508, bottom: 100, width: 248, height: 40 }, ["show"]);
  ctx.placeToast();
  ok("sin guía se restaura top del CSS", toastEl.style.top === "", JSON.stringify(toastEl.style.top));
  guiaEl = nodo({ left: 20, top: 520, right: 620, bottom: 564, width: 600, height: 44 });
  toastEl.style.top = "123px";
  ctx.placeToast();
  ok("guía móvil inferior no desplaza el toast", toastEl.style.top === "", JSON.stringify(toastEl.style.top));
}

console.log("\nSE MANTIENE DENTRO DE LA VENTANA");
{
  ctx.window.innerHeight = 160;
  guiaEl = nodo({ left: 20, top: 20, right: 620, bottom: 110, width: 600, height: 90 });
  toastEl = nodo({ left: 30, top: 60, right: 610, bottom: 140, width: 580, height: 80 }, ["show"]);
  ctx.placeToast();
  ok("el ajuste no sale por abajo", toastEl.style.top === "76px", toastEl.style.top);
  ctx.window.innerHeight = 640;
}

console.log("\nEL CÓDIGO SE CONECTA A LOS EVENTOS REALES");
{
  const vivo = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("toast se coloca antes de empezar su temporizador", /t\.classList\.add\("show"\); placeToast\(\);[\s\S]*clearTimeout\(toastT\)/.test(vivo));
  ok("al ocultarse recupera la posición CSS", /classList\.remove\("show"\); placeToast\(\)/.test(vivo));
  ok("tutoRefresh recompone tras cambiar el texto", /tutoHighlight\(\);\s*placeTuto\(\);\s*placeToast\(\);/.test(vivo));
  ok("resize recalcula guía, hotbar y toast", /const syncLayouts = \(\) => \{ syncRegistroPrompt\(\); placeToast\(\); \}/.test(vivo));
}

console.log("\nEN MÓVIL BAJO, LA GUÍA TIENE UN SOLO BORDE VERTICAL");
{
  /* A ≤640 px la guía se ancla abajo para no cruzar el HUD; en una pantalla baja ese `bottom`
     no puede convivir con el `top` de escritorio, porque CSS estira la caja y falsea la
     geometría que placeToast y la cámara usan. */
  ok("móvil angosto conserva top:auto y bottom:96px", /@media\(max-width:640px\)\{[\s\S]{0,700}?#tuto\{top:auto;bottom:96px/.test(html));
  ok("la subida a top:44px queda sólo para pantallas de escritorio", /@media\(max-height:560px\) and \(min-width:641px\)\{[\s\S]{0,160}?#tuto\{top:44px/.test(html));
  const reglaBajaGeneral = html.slice(
    html.indexOf("@media(max-height:560px){"),
    html.indexOf("@media(max-height:560px) and (min-width:641px){")
  );
  ok("la regla baja general ya no agrega top a la guía móvil", !/#tuto\{top:44px/.test(reglaBajaGeneral));
}

console.log("\n" + (fallos ? "  ✗ " + fallos + " fallas\n" : "  ✓ los avisos ya no cubren la guía\n"));
process.exit(fallos ? 1 : 0);
