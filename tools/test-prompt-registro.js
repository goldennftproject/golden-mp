/* EL AVISO DEL MUNDO NO SE PISA CON EL REGISTRO
   ══════════════════════════════════════════════
   El prompt de interacción se centra arriba de la hotbar. Al abrir Registro, ese centro puede
   caer sobre su cabecera; debe subir sólo si hay una colisión real, y volver a la geometría de
   siempre cuando el panel está plegado o lejos.
     node tools/test-prompt-registro.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const desde = UI.indexOf("function rectsSeCruzan");
const hasta = UI.indexOf("function initUniversalDrag", desde);

let fallos = 0;
const ok = (nombre, condicion, detalle) => {
  if (!condicion) fallos++;
  console.log((condicion ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
};
function clases(plegado, movida) { return { contains: c => (c === "collapsed" && !!plegado) || (c === "movida" && !!movida) }; }
function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}
function caso({ plegado, logRect, editRect, ancho }) {
  const prompt = { style: {}, getBoundingClientRect() {
    const bottom = Number.parseFloat(this.style.bottom || "0") || 0;
    return rect(285, 576 - bottom - 36, 198, 36);
  } };
  const hotbar = { getBoundingClientRect: () => rect(174, 470, 420, 66) };
  const registro = { classList: clases(plegado), getBoundingClientRect: () => logRect };
  const editbar = editRect && { classList: { contains: c => c === "show" }, getBoundingClientRect: () => editRect };
  const ctx = { window: { innerWidth: ancho == null ? 1280 : ancho, innerHeight: 576 },
    $: id => ({ prompt, hotwrap: hotbar, logpanel: registro, editbar })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(desde, hasta), ctx);
  vm.runInContext("placePrompt()", ctx);
  return { bottom: Number.parseFloat(prompt.style.bottom), prompt: prompt.getBoundingClientRect(), registro: logRect };
}
function cruzan(a, b, margen) {
  const m = margen || 0;
  return a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
}
function casoRegistro({ plegado, movida, hotbarRect, bottomInicial, autoAntes }) {
  const registro = {
    style: { bottom: bottomInicial || "" }, classList: clases(plegado, movida),
    _autoSobreHotbar: !!autoAntes,
    getBoundingClientRect() {
      const bottom = this.style.bottom ? Number.parseFloat(this.style.bottom) : 10;
      return rect(10, 576 - bottom - 114, 340, 114);
    }
  };
  const hotbar = { getBoundingClientRect: () => hotbarRect };
  const ctx = { window: { innerHeight: 576 }, $: id => ({ logpanel: registro, hotwrap: hotbar })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(desde, hasta), ctx);
  vm.runInContext("placeRegistro()", ctx);
  return { bottom: registro.style.bottom, registro: registro.getBoundingClientRect(), hotbar: hotbarRect };
}
function casoGuia({ plegado, movil, logRect, hudRect, flotRect, cssTop }) {
  const guia = {
    style: { top: "", bottom: "" }, classList: { contains: c => c === "hidden" ? false : false },
    getBoundingClientRect() {
      if (!movil) {
        const top = Number.parseFloat(this.style.top || cssTop || "54") || 54;
        return rect(191, top, 218, 33);
      }
      const bottom = this.style.bottom ? Number.parseFloat(this.style.bottom) : 96;
      return rect(191, 500 - bottom - 33, 218, 33);
    }
  };
  const registro = { classList: clases(plegado), getBoundingClientRect: () => logRect };
  const hudbar = hudRect ? { getBoundingClientRect: () => hudRect } : null;
  const hudFlot = flotRect ? { getBoundingClientRect: () => flotRect } : null;
  const ctx = { window: { innerHeight: 500, matchMedia: () => ({ matches: !!movil }), getComputedStyle: () => ({ top: cssTop || "54px" }) },
    $: id => ({ tuto: guia, logpanel: registro, hudbar, "hud-flot": hudFlot })[id] || null };
  vm.createContext(ctx);
  vm.runInContext(UI.slice(desde, hasta), ctx);
  vm.runInContext("placeTuto()", ctx);
  return { top: guia.style.top, bottom: guia.style.bottom, guia: guia.getBoundingClientRect(), registro: logRect, hud: hudRect || null };
}

console.log("\n1 · LA POSICIÓN NORMAL SE CONSERVA SIN UN CRUCE\n");
{
  const lejos = caso({ plegado: false, logRect: rect(520, 300, 220, 150) });
  ok("Registro abierto pero lejos no mueve el aviso", lejos.bottom === 140, lejos.bottom + "px");
}

console.log("\n2 · EL REGISTRO LIBERA EL TEXTO DEL MUNDO, TAMBIÉN PLEGADO\n");
{
  const r = caso({ plegado: false, logRect: rect(10, 421, 340, 114) });
  ok("sube por encima del Registro", r.bottom === 167, r.bottom + "px");
  ok("queda separado incluso con el margen visual", !cruzan(r.prompt, r.registro, 8), JSON.stringify(r.prompt));

  const plegado = caso({ plegado: true, logRect: rect(10, 421, 340, 64) });
  ok("la pestaña plegada tampoco tapa el aviso", plegado.bottom === 167, plegado.bottom + "px");
  ok("y conserva aire alrededor de su cabecera", !cruzan(plegado.prompt, plegado.registro, 8), JSON.stringify(plegado.prompt));
}

console.log("\n2B · EN PC EL CARTEL DE COLOCAR LIBERA LA BARRA DE EDICIÓN\n");
{
  const barra = caso({ plegado: false, logRect: rect(520, 300, 220, 150), editRect: rect(200, 390, 600, 36) });
  ok("sube por encima de la barra de edición", barra.bottom === 198, barra.bottom + "px");
  ok("deja aire también alrededor de sus botones", !cruzan(barra.prompt, rect(200, 390, 600, 36), 8), JSON.stringify(barra.prompt));

  const movil = caso({ plegado: false, logRect: rect(520, 300, 220, 150), editRect: rect(200, 390, 600, 36), ancho: 640 });
  ok("móvil no modifica todavía su composición", movil.bottom === 140, movil.bottom + "px");
}

console.log("\n3 · EL REGISTRO AUTOMÁTICO NO SE ESCONDE DETRÁS DE LA HOTBAR\n");
{
  const hotbar = rect(174, 470, 420, 66);
  const automatico = casoRegistro({ plegado: false, movida: false, hotbarRect: hotbar });
  ok("Registro automático sube justo por encima de la barra", automatico.bottom === "114px", automatico.bottom);
  ok("y las dos cajas ya no se cruzan", !cruzan(automatico.registro, automatico.hotbar), JSON.stringify(automatico.registro));

  const plegado = casoRegistro({ plegado: true, movida: false, hotbarRect: hotbar, bottomInicial: "114px", autoAntes: true });
  ok("plegado sigue por encima de la barra: su cabecera queda tocable", plegado.bottom === "114px", plegado.bottom);
  ok("y tampoco se cruza plegado", !cruzan(plegado.registro, plegado.hotbar), JSON.stringify(plegado.registro));

  const manual = casoRegistro({ plegado: false, movida: true, hotbarRect: hotbar, bottomInicial: "205px" });
  ok("un Registro arrastrado no se mueve solo", manual.bottom === "205px", manual.bottom);
}

console.log("\n4 · LOS GANCHOS REACCIONAN A LA TRANSICIÓN, NO CADA CUADRO\n");
{
  ok("placePrompt compara rectángulos reales", /rectsSeCruzan\(pr, rr, 8\)/.test(UI));
  ok("Registro se separa de hotbar sólo si se cruza", /function placeRegistro\(\)[\s\S]*?rectsSeCruzan\(rr, hr\)/.test(UI));
  ok("Registro se observa durante su cambio de alto", /registro\._promptSizeWatch = new ResizeObserver\(syncRegistroPrompt\)/.test(UI));
  ok("no observa textContent del prompt por MutationObserver", !/prompt\._promptWatch = new MutationObserver/.test(UI));
  ok("la hotbar y Registro recalculan juntos al arrastrarse", /makeHoldDrag\(\$\("hotwrap"\), "gf_hotpos", false, syncRegistroPrompt\)/.test(UI) &&
    /makeHoldDrag\(registro, "gf_logpos", true, syncRegistroPrompt\)/.test(UI));
  ok("edición y botón Cancelar recomponen el cartel", /eb\.classList\.toggle\("show", on\);[\s\S]*?syncRegistroPrompt\(\);/.test(UI) &&
    /window\.syncPlacingUI = \(on\) => \{[\s\S]*?syncRegistroPrompt\(\);/.test(UI));
}

console.log("\n5 · LA GUÍA MÓVIL NO SE ESCONDE DETRÁS DEL REGISTRO\n");
{
  const abierto = casoGuia({ plegado: false, movil: true, logRect: rect(10, 306, 340, 116) });
  ok("sube encima del Registro abierto", abierto.bottom === "206px", abierto.bottom);
  ok("deja un margen real entre las dos cajas", !cruzan(abierto.guia, abierto.registro, 8), JSON.stringify(abierto.guia));

  const plegado = casoGuia({ plegado: true, movil: true, logRect: rect(10, 306, 340, 64) });
  ok("plegado también libera la guía si llega a cruzarse", plegado.bottom === "206px", JSON.stringify(plegado));
  ok("y deja margen con la cabecera", !cruzan(plegado.guia, plegado.registro, 8), JSON.stringify(plegado.guia));

  const escritorio = casoGuia({ plegado: false, movil: false, logRect: rect(10, 306, 340, 116) });
  ok("en escritorio no mueve la guía superior", escritorio.top === "" && escritorio.bottom === "", JSON.stringify(escritorio));
}

console.log("\n6 · EN ESCRITORIO LA GUÍA LIBERA UN HUD DE DOS FILAS\n");
{
  const unaFila = casoGuia({ plegado: false, movil: false, logRect: rect(10, 306, 340, 116), hudRect: rect(0, 0, 1024, 42) });
  ok("un HUD de una fila conserva el anclaje normal", unaFila.top === "", JSON.stringify(unaFila));

  const dosFilas = casoGuia({ plegado: false, movil: false, logRect: rect(10, 306, 340, 116), hudRect: rect(0, 0, 1024, 76) });
  ok("un HUD envuelto baja la guía con un margen real", dosFilas.top === "84px" && dosFilas.guia.top >= dosFilas.hud.bottom + 8,
    JSON.stringify(dosFilas));

  const bajo = casoGuia({ plegado: false, movil: false, logRect: rect(10, 306, 340, 116), hudRect: rect(0, 0, 1024, 36), cssTop: "44px" });
  ok("en una pantalla baja sigue respetando el top compacto de CSS", bajo.top === "", JSON.stringify(bajo));

  const repisa = casoGuia({ plegado: false, movil: false, logRect: rect(10, 306, 340, 116), hudRect: rect(0, 0, 760, 42), flotRect: rect(426, 45, 322, 38) });
  ok("la guía deja aire bajo la repisa de estamina/buffs", repisa.top === "91px" && repisa.guia.top >= 91,
    JSON.stringify(repisa));

  const repisaOculta = casoGuia({ plegado: false, movil: false, logRect: rect(10, 306, 340, 116), hudRect: rect(0, 0, 760, 42), flotRect: rect(748, 45, 0, 0) });
  ok("una repisa vacía no baja la guía", repisaOculta.top === "", JSON.stringify(repisaOculta));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: el aviso conserva aire alrededor del Registro.\n");
process.exit(fallos ? 1 : 0);
