/* EL PORTERO DEL GUARDADO · la única puerta de escritura a `farms` (21/8)
   ====================================================================================
   AUTOCONTENIDO A PROPÓSITO: el editor del dashboard de Supabase no siempre empaqueta
   un segundo archivo (el primer deploy falló con "Module not found reglas.mjs"), así
   que las reglas viven acá adentro, entre los marcadores === REGLAS === abajo. El test
   de la suite (tools/test-portero-reglas.js) extrae ese bloque y lo ejecuta tal cual:
   lo que se prueba es EXACTAMENTE lo que se deploya. No mover los marcadores.

   Deploy: Dashboard → Edge Functions → "guardar" → pegar este único archivo → Deploy.
   Instrucciones completas: docs/PORTERO-GUARDADO.md.
   La fecha del guardado la pone EL SERVIDOR (el reloj del cliente no se toca ni se cree). */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* === REGLAS === (JavaScript puro — este bloque lo ejecuta también el test de la suite)
   MODO SOMBRA: el portero anota lo sospechoso en la bitácora pero NUNCA rechaza. El
   rechazo se activa cambiando MODO a "rechazo" y re-deployando, SOLO tras calibrar con
   la bitácora (que ningún jugador honesto dispare sospechas). Los techos salen del
   ancla del juego (20 plata/celda-hora) con margen ×3 y colchones: generosos a
   propósito — acá un falso positivo es peor que un tramposo sin cazar. */
const VERSION = 2;        // v2 (15/9): el portero aprendió qué es el mercado
const MODO = "rechazo";   // 14/9: fuera de sombra en el proyecto nuevo (P2P abierto → el portero rechaza)

const ANCLA = 20;          // plata por celda-hora
const CELDAS_MAX = 169;    // celdas útiles con TODO expandido
const NODOS_MAX = 40;      // árboles + rocas con todo abierto (35 reales + colchón)
const TASA_NODO = 2;       // recursos/hora de un nodo; las cargas no suben la tasa, solo la guardan
const MARGEN = 3;          // multiplicador de gracia sobre el máximo físico

const num = (v) => (typeof v === "number" && isFinite(v)) ? v : 0;

/* ── EL MERCADO ENTRE JUGADORES ───────────────────────────────────────────────────────
   (15/9) El portero no sabía que existe el mercado, y el mercado mueve BULTOS: un maíz
   vale 1.200 de plata y el techo de un guardado rápido es ~2.084. O sea que una venta
   modesta disparaba « plata imposible », el guardado se rechazaba y porteroRechazo()
   devolvía la granja al estado anterior — con el ítem ya entregado al comprador. Eso es
   perder progreso por jugar bien, que es justo lo que prohíbe la ley 1.

   La cuenta NO se le cree al cliente: sale de la tabla `market`, que el portero lee con
   la llave de servicio. Tres movimientos legítimos, tres permisos:
     · COBRAR una venta  → entra plata     (filas mías con paid = true)
     · COMPRAR algo      → entran recursos (filas con sold_to = yo)
     · RETIRAR lo mío    → vuelven recursos (filas mías libres que DESAPARECIERON desde
                            el guardado anterior: retirar borra la fila)
   Para que un permiso no se gaste dos veces, cada guardado aceptado deja anotado en
   `farms.mercado_ack` lo que ya contó. El permiso de hoy es la DIFERENCIA con eso.
   Se acredita el precio ENTERO (sin descontar la comisión): de más, nunca de menos.

   Lo que hace que esto no sea un agujero: el vendedor no puede tocar el `price` ni
   marcar como vendida una fila suya — lo impiden los permisos por columna y las dos
   políticas de sql/mercado-portero.sql. Sin esa migración esto sigue siendo seguro,
   solo más generoso. */
function resDePend(lista) {
  const r = {};
  for (const p of (Array.isArray(lista) ? lista : [])) {
    if (!p || p.kind !== "res" || !p.item) continue;
    r[p.item] = num(r[p.item]) + num(p.qty);
  }
  return r;
}
function mercadoPermiso(uid, filas, ack, prev, next) {
  const permiso = { plata: 0, res: {} };
  const nuevo = { ventas: 0, compras: {}, abiertas: {} };
  for (const f of (Array.isArray(filas) ? filas : [])) {
    if (!f) continue;
    const mia = f.seller === uid, qty = num(f.qty), esRes = f.kind === "res" && f.item;
    if (mia && f.paid) nuevo.ventas += num(f.price);
    if (f.sold_to === uid && !mia && esRes) nuevo.compras[f.item] = num(nuevo.compras[f.item]) + qty;
    if (mia && !f.sold_to && esRes) nuevo.abiertas[f.item] = num(nuevo.abiertas[f.item]) + qty;
  }
  /* sin anotación previa (primer guardado tras la migración) se permite todo lo que el
     mercado dice que pasó: de estrenar el sistema no puede salir un rechazo */
  const a = (ack && typeof ack === "object") ? ack : null;
  permiso.plata = Math.max(0, nuevo.ventas - num(a && a.ventas));
  /* lo que estaba en la bandeja de pendientes y ya no está: es una compra vieja que
     recién ahora entró en la bolsa (mkPend), y también tiene que tener permiso */
  const pendAntes = resDePend(prev && prev.mkPend), pendAhora = resDePend(next && next.mkPend);
  const claves = new Set([...Object.keys(nuevo.compras), ...Object.keys(nuevo.abiertas),
    ...Object.keys((a && a.compras) || {}), ...Object.keys((a && a.abiertas) || {}),
    ...Object.keys(pendAntes)]);
  for (const k of claves) {
    const compra = Math.max(0, num(nuevo.compras[k]) - num(a && a.compras && a.compras[k]));
    const retiro = a ? Math.max(0, num(a.abiertas && a.abiertas[k]) - num(nuevo.abiertas[k])) : num(nuevo.abiertas[k]);
    const reclamo = Math.max(0, num(pendAntes[k]) - num(pendAhora[k]));
    const total = compra + retiro + reclamo;
    if (total > 0) permiso.res[k] = total;
  }
  return { permiso, ack: nuevo };
}

function evaluarGuardado(prev, next, elapsedSeg, permiso) {
  const per = (permiso && typeof permiso === "object") ? permiso : { plata: 0, res: {} };
  const perRes = (k) => num(per.res && per.res[k]);
  const sospechas = [], delta = {};
  if (!next || typeof next !== "object") return { delta, sospechas: ["snapshot vacío o inválido"] };

  for (const k of ["plata", "golden", "level", "expansiones"]) {
    const v = next[k];
    if (v != null && (typeof v !== "number" || !isFinite(v) || v < 0)) sospechas.push("valor inválido en " + k + ": " + String(v));
  }
  for (const k in (next.res || {})) {
    const v = next.res[k];
    if (typeof v !== "number" || !isFinite(v) || v < 0) sospechas.push("recurso inválido " + k + ": " + String(v));
  }

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

  /* sin guardado anterior no hay contra qué medir: primera vez, pasa limpio */
  if (!p) return { delta, sospechas };

  if (elapsedSeg < 0) sospechas.push("el reloj fue hacia atrás (" + Math.round(elapsedSeg) + " s)");
  const horas = Math.max(30, elapsedSeg) / 3600;   // piso de 30 s: dos guardados pegados no dividen por cero

  /* plata: ni con TODA la granja expandida vendiendo sin parar se junta más que esto */
  const plataMax = CELDAS_MAX * ANCLA * horas * MARGEN + 2000 + num(per.plata);
  if ((delta.plata || 0) > plataMax) sospechas.push("plata imposible: +" + Math.round(delta.plata) + " en " + fmtHoras(horas) + " (techo " + Math.round(plataMax) + ")");

  /* madera y piedra: nodos × su tasa. Las cargas GUARDAN producción, no la multiplican */
  for (const k of ["madera", "piedra"]) {
    const d = delta["res." + k] || 0;
    const max = NODOS_MAX * TASA_NODO * horas * MARGEN + 100 + perRes(k);
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas) + " (techo " + Math.round(max) + ")");
  }

  /* minerales: UNA veta por tipo, relojes de 8-24 h — por día caben pocos de cada uno */
  for (const k of ["bronce", "hierro", "oro", "diamante", "netherita"]) {
    const d = delta["res." + k] || 0;
    const max = 6 * (horas / 24) * MARGEN + 12 + perRes(k);
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas));
  }

  if ((delta.level || 0) > Math.ceil(horas * 8) + 4) sospechas.push("subida de nivel imposible: +" + delta.level + " en " + fmtHoras(horas));
  if ((delta.expansiones || 0) < 0) sospechas.push("las expansiones no pueden bajar (" + delta.expansiones + ")");
  if ((delta.expansiones || 0) > 4 && horas < 1) sospechas.push("+" + delta.expansiones + " expansiones en " + fmtHoras(horas));

  return { delta, sospechas };
}

function fmtHoras(h) { return h < 1 ? Math.round(h * 60) + " min" : (Math.round(h * 10) / 10) + " h"; }
/* === FIN REGLAS === */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    /* ¿quién sos? — el JWT de la sesión anónima del juego, verificado contra Auth */
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "sin sesión" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !u?.user) return json({ error: "sesión inválida" }, 401);
    const uid = u.user.id;

    /* el paquete: el mismo { name, data } que antes iba directo a la tabla */
    const body = await req.json().catch(() => null);
    const data = body?.data, name = String(body?.name || "Granjero").slice(0, 60);
    if (!data || typeof data !== "object") return json({ error: "snapshot inválido" }, 400);
    if (JSON.stringify(data).length > 700_000) return json({ error: "snapshot demasiado grande" }, 400);

    /* el guardado anterior y cuánto tiempo pasó — según EL SERVIDOR */
    const { data: prevRow } = await admin.from("farms").select("*").eq("user_id", uid).maybeSingle();
    const ahora = new Date();
    const elapsedSeg = prevRow?.updated_at ? (ahora.getTime() - new Date(prevRow.updated_at).getTime()) / 1000 : 0;

    /* lo que el MERCADO dice que hizo este jugador (no lo que dice su navegador) */
    const { data: filas } = await admin.from("market")
      .select("seller,sold_to,kind,item,qty,price,paid")
      .or("seller.eq." + uid + ",sold_to.eq." + uid).limit(2000);
    const mercado = mercadoPermiso(uid, filas ?? [], prevRow?.mercado_ack ?? null, prevRow?.data ?? null, data);

    /* las reglas miran, la bitácora recuerda */
    const { delta, sospechas } = evaluarGuardado(prevRow?.data ?? null, data, elapsedSeg, mercado.permiso);
    const permisoUsado = mercado.permiso.plata || Object.keys(mercado.permiso.res).length;
    await admin.from("farm_saves_log").insert({
      user_id: uid, reglas_v: VERSION, elapsed_s: Math.round(elapsedSeg),
      delta: permisoUsado ? { ...delta, mercado: mercado.permiso } : delta, sospechas,
    });

    /* modo rechazo (futuro, tras calibrar): un guardado con sospechas no entra */
    if (MODO === "rechazo" && sospechas.length) return json({ error: "guardado rechazado", sospechas }, 422);

    /* el guardado ENTRA, y con él queda anotado lo del mercado que ya se contó: así el
       mismo permiso no se gasta dos veces. Si la columna todavía no existe (falta correr
       sql/mercado-portero.sql), se guarda igual sin ella — nunca al revés: que el jugador
       pierda la partida por una migración pendiente sería el mismo error de siempre. */
    const fila = { user_id: uid, name, data, updated_at: ahora.toISOString() };
    let { error: werr } = await admin.from("farms").upsert(
      { ...fila, mercado_ack: mercado.ack }, { onConflict: "user_id" },
    );
    if (werr && /mercado_ack/.test(werr.message || "")) {
      ({ error: werr } = await admin.from("farms").upsert(fila, { onConflict: "user_id" }));
    }
    if (werr) return json({ error: werr.message }, 500);
    return json({ ok: true, sospechas: sospechas.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
