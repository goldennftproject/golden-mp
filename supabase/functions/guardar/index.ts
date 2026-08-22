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
const VERSION = 1;
const MODO = "sombra";

const ANCLA = 20;          // plata por celda-hora
const CELDAS_MAX = 169;    // celdas útiles con TODO expandido
const NODOS_MAX = 40;      // árboles + rocas con todo abierto (35 reales + colchón)
const TASA_NODO = 2;       // recursos/hora de un nodo; las cargas no suben la tasa, solo la guardan
const MARGEN = 3;          // multiplicador de gracia sobre el máximo físico

const num = (v) => (typeof v === "number" && isFinite(v)) ? v : 0;

function evaluarGuardado(prev, next, elapsedSeg) {
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
  const plataMax = CELDAS_MAX * ANCLA * horas * MARGEN + 2000;
  if ((delta.plata || 0) > plataMax) sospechas.push("plata imposible: +" + Math.round(delta.plata) + " en " + fmtHoras(horas) + " (techo " + Math.round(plataMax) + ")");

  /* madera y piedra: nodos × su tasa. Las cargas GUARDAN producción, no la multiplican */
  for (const k of ["madera", "piedra"]) {
    const d = delta["res." + k] || 0;
    const max = NODOS_MAX * TASA_NODO * horas * MARGEN + 100;
    if (d > max) sospechas.push(k + " imposible: +" + Math.round(d) + " en " + fmtHoras(horas) + " (techo " + Math.round(max) + ")");
  }

  /* minerales: UNA veta por tipo, relojes de 8-24 h — por día caben pocos de cada uno */
  for (const k of ["bronce", "hierro", "oro", "diamante", "netherita"]) {
    const d = delta["res." + k] || 0;
    const max = 6 * (horas / 24) * MARGEN + 12;
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
    const { data: prevRow } = await admin.from("farms").select("data,updated_at").eq("user_id", uid).maybeSingle();
    const ahora = new Date();
    const elapsedSeg = prevRow?.updated_at ? (ahora.getTime() - new Date(prevRow.updated_at).getTime()) / 1000 : 0;

    /* las reglas miran, la bitácora recuerda */
    const { delta, sospechas } = evaluarGuardado(prevRow?.data ?? null, data, elapsedSeg);
    await admin.from("farm_saves_log").insert({
      user_id: uid, reglas_v: VERSION, elapsed_s: Math.round(elapsedSeg), delta, sospechas,
    });

    /* modo rechazo (futuro, tras calibrar): un guardado con sospechas no entra */
    if (MODO === "rechazo" && sospechas.length) return json({ error: "guardado rechazado", sospechas }, 422);

    const { error: werr } = await admin.from("farms").upsert(
      { user_id: uid, name, data, updated_at: ahora.toISOString() },
      { onConflict: "user_id" },
    );
    if (werr) return json({ error: werr.message }, 500);
    return json({ ok: true, sospechas: sospechas.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
