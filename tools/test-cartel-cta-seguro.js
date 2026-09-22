/* EL CARTEL DE EXPANSIÓN FUERA DE CÁMARA
   El lote conserva su posición real aunque su centro esté fuera de la vista de trabajo. Este
   test prueba la pequeña traducción mundo↔pantalla que mantiene la invitación legible, incluso
   con zoom alto y una ventana angosta.
     node tools/test-cartel-cta-seguro.js */
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync("public/game/farm.js", "utf8");

function metodo(nombre, siguiente) {
  const ini = src.indexOf("  " + nombre + "(");
  const fin = src.indexOf("\n\n  " + siguiente + "(", ini);
  if (ini < 0 || fin < 0) throw new Error("No se encontró " + nombre);
  return src.slice(ini, fin);
}

const ctx = { Math, Number, Date };
vm.createContext(ctx);
vm.runInContext("this.posicion = function () { const o = { " +
  metodo("posicionCartelExpansionSeguro", "actualizarCartelExpansion") + " }; return o.posicionCartelExpansionSeguro; }();", ctx);
vm.runInContext("this.actualizar = function () { const o = { " +
  metodo("actualizarCartelExpansion", "tickCamaraGuia") + " }; return o.actualizarCartelExpansion; }();", ctx);

let fallos = 0;
function ok(nombre, condicion, detalle) {
  if (!condicion) fallos++;
  console.log((condicion ? "  ok   " : "  FALLA") + "  " + nombre + (detalle ? "   " + detalle : ""));
}
function cercano(a, b) { return Math.abs(a - b) < 0.02; }
function escenaCamara(safe, zoom) {
  return {
    cameras: { main: { zoom, x: 0, y: 0, scrollX: 0, scrollY: 0 } },
    time: { now: 1000 },
    zonaSeguraCamaraGuia: () => safe,
  };
}

console.log("\nCTA FUERA DEL BORDE IZQUIERDO, A ZOOM MÁXIMO");
{
  const safe = { left: 16, right: 304, top: 80, bottom: 260 };
  const escena = escenaCamara(safe, 2.4);
  const p = ctx.posicion.call(escena, -105, 105, 172, 48);
  const sx = p.x * 2.4, sy = p.y * 2.4;
  const w = 172 * p.escala * 2.4, h = 48 * p.escala * 2.4;
  ok("anclada, la chapa mide EXP_SENAL_PX en pantalla y no su tamaño de objeto del mundo (22/9)",
    Math.abs(172 * p.escala * 2.4 - 70) < 1, (172 * p.escala * 2.4).toFixed(1) + " px");
  ok("la señal se ancla al área visible", p.anclado && sx > safe.left && sx < safe.right,
    "x=" + sx.toFixed(1) + " · escala=" + p.escala.toFixed(3));
  ok("la tarjeta entera entra horizontalmente", sx - w / 2 >= safe.left + 7.9 && sx + w / 2 <= safe.right - 7.9,
    "[" + (sx - w / 2).toFixed(1) + ", " + (sx + w / 2).toFixed(1) + "]");
  ok("y también verticalmente", sy - h / 2 >= safe.top + 7.9 && sy + h / 2 <= safe.bottom - 7.9,
    "[" + (sy - h / 2).toFixed(1) + ", " + (sy + h / 2).toFixed(1) + "]");
  ok("en zoom alto se reduce antes de recortarse", p.escala < 1, p.escala.toFixed(3));
}

console.log("\nCUANDO EL LOTE VUELVE A ENTRAR, EL CARTEL VUELVE A SU ANCLA REAL");
{
  const escena = escenaCamara({ left: 16, right: 624, top: 16, bottom: 344 }, 1);
  const p = ctx.posicion.call(escena, 300, 160, 172, 48);
  ok("no se desplaza innecesariamente", !p.anclado && cercano(p.x, 300) && cercano(p.y, 160),
    p.x.toFixed(1) + "," + p.y.toFixed(1));
  ok("mantiene escala natural", cercano(p.escala, 1), p.escala.toFixed(3));
}

console.log("\nEL BORDE DESCUBRE EL CTA PLATEADO SIN MOVER EL LOTE");
{
  const objetos = Array.from({ length: 3 }, () => ({ visible: false, pos: null, escala: null,
    setVisible(v) { this.visible = v; return this; },
    setPosition(x, y) { this.pos = { x, y }; return this; },
    setScale(v) { this.escala = v; return this; } }));
  const escena = {
    _expCtaVisible: false,
    _expCta: { cx: -105, cy: 105, ancho: 172, alto: 48, chapa: objetos[0], titulo: objetos[1], pista: objetos[2],
      x: null, y: null, escala: null, pulso: null, puede: false, resaltado: false },
    expCartel: objetos,
    posicionCartelExpansionSeguro: () => ({ x: 64, y: 112, escala: 0.8, anclado: true }),
  };
  /* 22/9 (dirección, con captura): la señal de borde NO se muestra si la expansión todavía no
     se puede pagar — la misma regla que tenía la chapa en su sitio. Sin poder pagar, el bosque
     se ve limpio aunque el lote esté fuera de cámara. */
  ctx.actualizar.call(escena);
  ok("sin poder pagar, el CTA remoto sigue oculto", !escena._expCtaVisible && objetos.every(o => !o.visible));
  escena._expCta.puede = true;
  ctx.actualizar.call(escena);
  ok("cuando ya se puede pagar, el CTA remoto se vuelve visible", escena._expCtaVisible && objetos.every(o => o.visible));
  ok("la posición visual cambia, no el ancla del lote", cercano(escena._expCta.cx, -105) && objetos[0].pos.x === 64,
    "lote=" + escena._expCta.cx + " · cartel=" + objetos[0].pos.x);
  ok("la escala segura se aplica a las tres piezas", objetos.every(o => o.escala === 0.8));
  escena._expCta.puede = false;
  escena.posicionCartelExpansionSeguro = () => ({ x: -105, y: 105, escala: 1, anclado: false });
  ctx.actualizar.call(escena);
  ok("al entrar en cámara la marca se ve en su lote aunque no haya hover ni recursos (22/9, como en SFL)", escena._expCtaVisible && objetos.every(o => o.visible));
}

console.log("\n" + (fallos ? "  ✗ " + fallos + " fallas\n" : "  ✓ CTA visible, completo y anclado sin mover la expansión\n"));
process.exit(fallos ? 1 : 0);
