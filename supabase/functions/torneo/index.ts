/* EL RANKING DEL TORNEO · la única puerta de `torneo_ranking` (1/9)
   ====================================================================================
   La misma filosofía del portero de guardado: el cliente PROPONE («pesqué un pez espada
   de 74 kg») y el servidor DECIDE — valida que la especie exista, que el peso quepa en
   su rango, calcula los puntos ÉL (la fórmula vive acá, no se le cree al cliente) y
   guarda solo si mejora la marca de la semana. La semana la pone el reloj del SERVIDOR.

   AUTOCONTENIDO A PROPÓSITO, como el portero: el editor del dashboard no siempre
   empaqueta un segundo archivo. El catálogo y la fórmula viven entre los marcadores
   === REGLAS === — el test de la suite (tools/test-torneo-ranking.js) extrae ese bloque
   y comprueba que los puntos del servidor son EXACTAMENTE los del juego, especie por
   especie: si el catálogo del juego cambia y éste no, la suite se pone roja.

   Deploy: Dashboard → Edge Functions → nueva función "torneo" → pegar este único
   archivo → Deploy. Pasos completos: docs/TORNEO-RANKING.md.

   Acciones (POST, con el JWT del jugador):
     { accion: "reportar", pez, kg }  → guarda si mejora; responde tu marca y tu puesto
     { accion: "top", sem? }          → top 10 de esa semana (la actual si no se manda)
                                        + tu puesto y tus puntos                        */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* === REGLAS === (JavaScript puro — este bloque lo ejecuta también el test de la suite)
   El catálogo es una COPIA CONGELADA de PEZ_DEF/TORNEO_MULT del juego. No se importa
   porque la función no puede leer el juego: la sincronía la custodia el test. */
const PECES = {
  merluza: [0.4, 1.8, "comun"], lubina: [0.5, 2.5, "comun"], atun: [2, 9, "comun"],
  robalo: [0.8, 4, "poco_comun"], pargo: [0.7, 3.5, "poco_comun"], salmon: [1.2, 6, "poco_comun"],
  pez_gato: [1.5, 8, "raro"], pez_sapo: [0.3, 1.6, "raro"], pez_globo: [0.4, 2.2, "raro"],
  pez_loro: [1, 5, "epico"], pez_guitarra: [3, 14, "epico"], pez_linterna: [0.2, 1.2, "epico"],
  pez_espada: [20, 90, "legendario"], pez_gota: [0.5, 3, "legendario"], pez_dragon: [10, 45, "legendario"],
  camaron: [0.05, 0.3, "mitico"], cangrejo: [0.3, 1.5, "mitico"], langosta: [0.5, 3, "mitico"],
  calamar_v4: [1, 8, "mitico"],
};
const MULT = { comun: 1, poco_comun: 1.5, raro: 2.5, epico: 4, legendario: 6, mitico: 3 };

/* la MISMA fórmula que torneoPuntos() en state.js: peso relativo A SU RANGO × mult */
function puntosDe(pez, kg) {
  const e = PECES[pez];
  if (!e) return { error: "especie desconocida: " + String(pez) };
  if (!(typeof kg === "number" && isFinite(kg))) return { error: "peso inválido" };
  /* el tope lleva un 0,1 % de gracia por el redondeo a 2 decimales del cliente */
  if (kg < e[0] || kg > e[1] * 1.001) return { error: "un " + pez + " de " + kg + " kg no existe (rango " + e[0] + "-" + e[1] + ")" };
  const rango = e[1] - e[0];
  const rel = rango > 0 ? Math.max(0, Math.min(1, (kg - e[0]) / rango)) : 1;
  return { pts: Math.round(rel * (MULT[e[2]] || 1) * 1000) / 1000 };
}
/* la MISMA cuenta que torneoSemana() en state.js — pero con el reloj del SERVIDOR */
function semanaDe(ms) { return Math.floor((ms - 345600000) / 604800000); }
/* y la MISMA ventana que torneoAbierto(): viernes, sábado y domingo en UTC */
function torneoAbiertoEn(ms) { const d = new Date(ms).getUTCDay(); return d === 5 || d === 6 || d === 0; }
/* === FIN REGLAS === */

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const responder = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    /* quién llama: el JWT del jugador, verificado contra el proyecto */
    const auth = req.headers.get("Authorization") ?? "";
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return responder({ error: "sin sesión" }, 401);

    /* el que escribe: el service role — la tabla no tiene otra puerta */
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const ahora = Date.now();
    const semActual = semanaDe(ahora);

    if (body.accion === "reportar") {
      /* fuera de la ventana no se reporta: el reloj del cliente no vota */
      if (!torneoAbiertoEn(ahora)) return responder({ error: "el torneo abre el viernes (UTC)" }, 400);
      const kg = Math.round(Number(body.kg) * 100) / 100;
      const r = puntosDe(String(body.pez || ""), kg);
      if ("error" in r) return responder({ error: r.error }, 400);
      const nick = String(body.nick || "granjero").slice(0, 24);

      /* guarda solo si MEJORA la marca de la semana (la mejor captura, no la última) */
      const { data: actual } = await admin.from("torneo_ranking")
        .select("pts").eq("user_id", user.id).eq("sem", semActual).maybeSingle();
      if (!actual || r.pts > Number(actual.pts)) {
        const { error } = await admin.from("torneo_ranking").upsert({
          user_id: user.id, sem: semActual, nick, pez: String(body.pez), kg, pts: r.pts,
          updated_at: new Date().toISOString(),
        });
        if (error) return responder({ error: error.message }, 500);
      }
      /* y contesta el puesto, que es lo que el jugador quiere saber */
      const { count } = await admin.from("torneo_ranking")
        .select("*", { count: "exact", head: true })
        .eq("sem", semActual).gt("pts", Math.max(r.pts, actual ? Number(actual.pts) : 0));
      return responder({ ok: true, pts: Math.max(r.pts, actual ? Number(actual.pts) : 0), puesto: (count ?? 0) + 1 });
    }

    if (body.accion === "top") {
      /* la semana pedida o la actual; una semana pasada es una tabla CONGELADA, y es
         exactamente lo que el cobro del podio necesita leer el lunes */
      const sem = Number.isInteger(body.sem) ? Number(body.sem) : semActual;
      if (sem > semActual) return responder({ error: "esa semana no existe todavía" }, 400);
      const { data: top, error } = await admin.from("torneo_ranking")
        .select("nick, pez, kg, pts").eq("sem", sem)
        .order("pts", { ascending: false }).order("updated_at", { ascending: true }).limit(10);
      if (error) return responder({ error: error.message }, 500);
      const { data: mio } = await admin.from("torneo_ranking")
        .select("pts, pez, kg").eq("user_id", user.id).eq("sem", sem).maybeSingle();
      let puesto = null;
      if (mio) {
        const { count } = await admin.from("torneo_ranking")
          .select("*", { count: "exact", head: true }).eq("sem", sem).gt("pts", Number(mio.pts));
        puesto = (count ?? 0) + 1;
      }
      return responder({ ok: true, sem, top: top ?? [], mio, puesto });
    }

    return responder({ error: "acción desconocida" }, 400);
  } catch (e) {
    return responder({ error: (e as Error).message ?? "error" }, 500);
  }
});
