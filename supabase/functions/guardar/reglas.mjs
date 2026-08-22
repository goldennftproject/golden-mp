/* EL PORTERO DEL GUARDADO · las reglas (21/8, dirección: "te doy vía libre")
   ====================================================================================
   El problema: la partida se calcula en el navegador del jugador y el guardado se
   aceptaba tal cual llegara — cualquiera con la consola (F12) puede escribir
   G.res.madera = 999999 y guardar. Hoy no importa; el día que el token valga, sí.

   Escalón 1 (esto): MODO SOMBRA. El portero NO rechaza nada todavía: mira cada guardado,
   lo compara con el anterior y anota en la bitácora lo que le parece imposible. Con la
   bitácora llena se calibra (que ningún jugador honesto dispare sospechas) y recién
   entonces se activa el rechazo — cambiando UNA constante, MODO abajo.

   Los techos salen del ANCLA (20 de plata por celda-hora) y de los relojes reales de los
   nodos — el mismo modelo que tools/auditoria-costes-tiempo.js. Son deliberadamente
   GENEROSOS (margen ×3 y colchones fijos): en modo sombra, un falso positivo enseña; en
   modo rechazo, rompería una partida honesta. Antes de endurecer, mirar la bitácora.

   Este archivo es JavaScript puro sin dependencias: lo importa igual la Edge Function
   (Deno) y el test de la suite (node tools/test-portero-reglas.js).                    */

export const VERSION = 1;
export const MODO = "sombra";   // "sombra" = anotar y dejar pasar · "rechazo" = además, rechazar

/* Techos físicos del juego (generosos a propósito — calibrar con la bitácora antes de endurecer) */
const ANCLA = 20;          // plata por celda-hora
const CELDAS_MAX = 169;    // celdas útiles con TODO expandido
const NODOS_MAX = 40;      // árboles + rocas con todo abierto (35 reales + colchón)
const TASA_NODO = 2;       // recursos/hora de un nodo (reloj de 30-40 min); las cargas no suben la tasa, solo la guardan
const MARGEN = 3;          // multiplicador de gracia sobre el máximo físico

const num = (v) => (typeof v === "number" && isFinite(v)) ? v : 0;

/* Compara el guardado anterior con el nuevo. Devuelve { delta, sospechas }:
   delta = qué cambió (solo lo distinto de cero, para la bitácora);
   sospechas = lista de frases humanas con lo que no cierra. Vacía en un jugador honesto. */
export function evaluarGuardado(prev, next, elapsedSeg) {
  const sospechas = [], delta = {};
  if (!next || typeof next !== "object") return { delta, sospechas: ["snapshot vacío o inválido"] };

  /* lo básico tiene que ser un número sano, venga de donde venga */
  for (const k of ["plata", "golden", "level", "expansiones"]) {
    const v = next[k];
    if (v != null && (typeof v !== "number" || !isFinite(v) || v < 0)) sospechas.push("valor inválido en " + k + ": " + String(v));
  }
  for (const k in (next.res || {})) {
    const v = next.res[k];
    if (typeof v !== "number" || !isFinite(v) || v < 0) sospechas.push("recurso inválido " + k + ": " + String(v));
  }

  /* el delta: qué cambió desde el guardado anterior */
  const p = prev && typeof prev === "object" ? prev : null;
  delta.plata = num(next.plata) - num(p && p.plata);
  delta.golden = num(next.golden) - num(p && p.golden);
  delta.level = num(next.level) - num(p && p.level);
  delta.expansiones = num(next.expansiones) - num(p && p.expansiones);
  const resPrev = (p && p.res) || {}, resNext = next.res || {};
  const claves = new Set([...Object.keys(resPrev), ...Object.keys(resNext)]);
  let anotadas = 0;
  for (const k of claves) {
    const d = num(resNext[k]) - num(resPrev[k]);
    if (d && anotadas < 60) { delta["res." + k] = d; anotadas++; }
  }
  for (const k of Object.keys(delta)) if (!delta[k]) delete delta[k];

  /* sin guardado anterior no hay contra qué medir: primera vez, se deja pasar limpio */
  if (!p) return { delta, sospechas };

  if (elapsedSeg < 0) sospechas.push("el reloj fue hacia atrás (" + Math.round(elapsedSeg) + " s)");
  const horas = Math.max(30, elapsedSeg) / 3600;   // piso de 30 s: dos guardados pegados no dividen por cero

  /* plata: ni con TODA la granja expandida vendiendo sin parar se junta más que esto */
  const plataMax = CELDAS_MAX * ANCLA * horas * MARGEN + 2000;   // +2000: pedidos, paquete diario, ventas de stock viejo
  if ((delta.plata || 0) > plataMax) sospechas.push("plata imposible: +" + Math.round(delta.plata) + " en " + fmtHoras(horas) + " (techo " + Math.round(plataMax) + ")");

  /* madera y piedra: nodos × su tasa. Las cargas GUARDAN producción, no la multiplican */
  for (const k of ["madera", "piedra"]) {
    const d = delta["res." + k] || 0;
    const max = NODOS_MAX * TASA_NODO * horas * MARGEN + 100;   // +100: el baúl del kit, regalos, compras al mercado
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas) + " (techo " + Math.round(max) + ")");
  }

  /* minerales: UNA veta por tipo, relojes de 8-24 h — por día caben pocos de cada uno */
  for (const k of ["bronce", "hierro", "oro", "diamante", "netherita"]) {
    const d = delta["res." + k] || 0;
    const max = 6 * (horas / 24) * MARGEN + 12;   // 6/día la más rápida (bronce, yield 2) · +12: mercado y cofres
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas));
  }

  /* niveles: ni el tutorial regala más de esto */
  if ((delta.level || 0) > Math.ceil(horas * 8) + 4) sospechas.push("subida de nivel imposible: +" + delta.level + " en " + fmtHoras(horas));
  if ((delta.expansiones || 0) < 0) sospechas.push("las expansiones no pueden bajar (" + delta.expansiones + ")");
  if ((delta.expansiones || 0) > 4 && horas < 1) sospechas.push("+" + delta.expansiones + " expansiones en " + fmtHoras(horas));

  return { delta, sospechas };
}

function fmtHoras(h) { return h < 1 ? Math.round(h * 60) + " min" : (Math.round(h * 10) / 10) + " h"; }
