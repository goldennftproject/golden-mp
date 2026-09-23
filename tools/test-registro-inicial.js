/* EL REGISTRO NO LE ROBA GRANJA AL PRIMER CICLO
   ═════════════════════════════════════════════
   El panel de Registro empieza plegado para dejar ver las parcelas, pero sigue siendo una
   herramienta: en cuanto alguien lo abre/cierra a propósito, esa decisión manda durante la
   sesión —también en los webviews sin sessionStorage, donde viaja con el tutorial guardado.
   Este arnés ejecuta la pequeña pieza de UI aislada para vigilar los tres contratos:
     node tools/test-registro-inicial.js */
const fs = require("fs"), vm = require("vm");
const UI = fs.readFileSync("public/game/ui.js", "utf8");
const desde = UI.indexOf("let _registroInicioPlegado");
const hasta = UI.indexOf("function tutoSync", desde);

let fallos = 0;
const ok = (nombre, condicion, detalle) => {
  if (!condicion) fallos++;
  console.log((condicion ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
};

function panel(plegado) {
  const clases = new Set(plegado ? ["collapsed"] : []);
  return { classList: {
    add: c => clases.add(c), remove: c => clases.delete(c),
    contains: c => clases.has(c), toggle: (c, forzar) => {
      if (forzar === undefined) { if (clases.has(c)) clases.delete(c); else clases.add(c); }
      else if (forzar) clases.add(c); else clases.delete(c);
      return clases.has(c);
    }
  } };
}
function control() {
  const attrs = {};
  return { textContent: "", attrs, setAttribute: (k, v) => { attrs[k] = String(v); } };
}
function cargar(paso, logPanel, memoria, guia, estado, sinSesion, logmin) {
  const ctx = {
    $: id => ({ logpanel: logPanel, logmin })[id] || null,
    tutoActivo: () => paso,
    guiaActiva: () => guia || null,
    G: estado || { tuto: {} }
  };
  if (!sinSesion) ctx.sessionStorage = {
    getItem: k => memoria.has(k) ? memoria.get(k) : null,
    setItem: (k, v) => memoria.set(k, String(v))
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(UI.slice(desde, hasta), ctx);
  return ctx;
}

console.log("\n1 · EL PRIMER CICLO SE COMPACTA, Y NADA MÁS\n");
{
  const memoria = new Map(), p = panel(false);
  const ctx = cargar({ id: "plant" }, p, memoria);
  vm.runInContext("plegarRegistroPrimerCiclo()", ctx);
  ok("plant pliega el Registro", p.classList.contains("collapsed"));
  p.classList.remove("collapsed");
  vm.runInContext("plegarRegistroPrimerCiclo()", ctx);
  ok("no lo vuelve a tocar en la misma carga", !p.classList.contains("collapsed"));
}

console.log("\n2 · LA ELECCIÓN MANUAL GANA, INCLUSO DESPUÉS DE F5\n");
{
  const memoria = new Map(), antes = panel(true);
  const estadoAntes = { tuto: {} }, ctxAntes = cargar({ id: "kit" }, antes, memoria, null, estadoAntes);
  antes.classList.remove("collapsed");
  vm.runInContext("registroCambioManual($('logpanel'))", ctxAntes);
  ok("guardar abierto deja una marca de sesión", memoria.get("gf_registro_manual") === "open");
  ok("y también una marca en el tutorial guardable", estadoAntes.tuto.registroManual === "open");

  const despues = panel(true);       // el HTML vuelve a nacer plegado tras recargar
  const ctxDespues = cargar({ id: "harvest" }, despues, memoria);
  vm.runInContext("registroRestaurarCambioManual(); plegarRegistroPrimerCiclo()", ctxDespues);
  ok("la recarga restaura Registro abierto", !despues.classList.contains("collapsed"));
  ok("y el tutorial ya no puede volver a plegarlo", !despues.classList.contains("collapsed"));
}

console.log("\n3 · SI EL WEBVIEW BLOQUEA SESSIONSTORAGE, EL RESPALDO SIGUE SIRVIENDO\n");
{
  const memoria = new Map(), antes = panel(true), estado = { tuto: {} };
  const ctxAntes = cargar({ id: "kit" }, antes, memoria, null, estado, true);
  antes.classList.remove("collapsed");
  vm.runInContext("registroCambioManual($('logpanel'))", ctxAntes);
  ok("abrir no rompe sin sessionStorage", estado.tuto.registroManual === "open");

  const despues = panel(true), recarga = { tuto: { registroManual: estado.tuto.registroManual } };
  const ctxDespues = cargar({ id: "harvest" }, despues, memoria, null, recarga, true);
  vm.runInContext("plegarRegistroPrimerCiclo()", ctxDespues);
  ok("la recarga respeta el respaldo guardado", !despues.classList.contains("collapsed"));
}

console.log("\n4 · NO SE METE EN LA BRÚJULA NI EN PASOS POSTERIORES\n");
{
  const memoria = new Map(), posterior = panel(false);
  const ctxPosterior = cargar({ id: "sell" }, posterior, memoria);
  vm.runInContext("plegarRegistroPrimerCiclo()", ctxPosterior);
  ok("sell no se compacta", !posterior.classList.contains("collapsed"));

  const brujula = panel(false);
  const ctxBrujula = cargar(null, brujula, memoria, { brujula: true, id: "brujula" });
  vm.runInContext("plegarRegistroPrimerCiclo()", ctxBrujula);
  ok("la brújula no se compacta", !brujula.classList.contains("collapsed"));
}

console.log("\n5 · EL CÓDIGO ESTÁ CONECTADO A LA UI REAL\n");
{
  ok("tutoSync aplica la regla", /tutoAdelanto[\s\S]{0,260}plegarRegistroPrimerCiclo\(\)/.test(UI));
  ok("initUI recupera la elección antes de enganchar controles", /function initUI\(\)\s*\{[\s\S]{0,100}registroRestaurarCambioManual\(\)/.test(UI));
  ok("minimizar registra una elección", /logmin[\s\S]{0,260}registroCambioManual\(panel\)/.test(UI));
  const desdeTabs = UI.indexOf('document.querySelectorAll(".ltab")');
  const hastaTabs = UI.indexOf("const ci =", desdeTabs);
  ok("las pestañas también registran una elección", desdeTabs >= 0 && hastaTabs > desdeTabs &&
    UI.slice(desdeTabs, hastaTabs).includes("registroCambioManual(panel)"));
}

console.log("\n6 · EL CARET DICE SI EL REGISTRO ESTÁ PLEGADO U ABIERTO\n");
{
  const memoria = new Map(), p = panel(true), b = control();
  const ctx = cargar({ id: "kit" }, p, memoria, null, { tuto: {} }, false, b);
  vm.runInContext("actualizarControlRegistro($('logpanel'))", ctx);
  ok("plegado muestra una flecha para desplegar", b.textContent === "▾" && b.attrs["aria-expanded"] === "false" && /Desplegar/.test(b.attrs["aria-label"] || ""));
  p.classList.remove("collapsed");
  vm.runInContext("actualizarControlRegistro($('logpanel'))", ctx);
  ok("abierto muestra una flecha para plegar", b.textContent === "▴" && b.attrs["aria-expanded"] === "true" && /Plegar/.test(b.attrs["aria-label"] || ""));
  const HTML = fs.readFileSync("public/index.html", "utf8");
  ok("el estado inicial del HTML ya comunica que está plegado", /id="logmin"[^>]*aria-label="Desplegar Registro"[^>]*aria-expanded="false"/.test(HTML));
  const MAIN = fs.readFileSync("public/game/main.js", "utf8");
  ok("una recuperación que abre el Registro también actualiza el caret", /panel\.classList\.remove\("collapsed"\);[\s\S]{0,260}actualizarControlRegistro\(panel\)/.test(MAIN));
}

console.log(fallos ? "\n" + fallos + " fallo(s)\n" : "\nTodo en orden: Registro despeja el inicio sin perder control manual.\n");
process.exit(fallos ? 1 : 0);
