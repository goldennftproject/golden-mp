/* EL PORTERO DEL GUARDADO · la puerta (Edge Function "guardar") — 21/8
   ====================================================================================
   Única entrada de guardados a la tabla `farms`. El cliente ya no escribe directo:
   manda { name, data } acá, el portero identifica al jugador por su sesión, compara con
   el guardado anterior, ANOTA el delta y las sospechas en `farm_saves_log` (modo sombra:
   nunca rechaza — ver reglas.js) y recién entonces escribe.

   Deploy: Supabase Dashboard → Edge Functions → "guardar" — dos archivos: este index.ts
   y reglas.js. Instrucciones completas en docs/PORTERO-GUARDADO.md.
   La fecha del guardado la pone EL SERVIDOR (el reloj del cliente no se toca ni se cree). */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluarGuardado, VERSION, MODO } from "./reglas.mjs";

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
