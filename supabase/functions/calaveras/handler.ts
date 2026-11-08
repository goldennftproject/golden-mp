type RpcResult = {data: any; error: any};
type Dependencies = {
  authenticate(jwt: string): Promise<{id: string} | null>;
  rpc(name: string, params: Record<string, unknown>): Promise<RpcResult>;
  planClaim(container: any, items: any[]): {cont: any; remaining: any[]};
  planDeath?(data: any): {dropSlots: string[]; breakSlots?: string[]};
};
const origin = "https://goldenfarm.onrender.com";
const cors = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin"};
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {...cors, "Content-Type": "application/json", "Cache-Control": "no-store"}});
function failed(error: any) {
  const conflict = /^conflicto:/i.test(error?.message || "");
  const known = error?.code === "P0001" || /^22/.test(error?.code || "");
  return json({ok: false, error: known ? error.message : "Entrega incierta. Comprobá el mismo recibo antes de repetir.", conflicto: conflict}, conflict ? 409 : known ? 400 : 503);
}
function statusPublic(data: any) {
  if (!data?.ok) throw Error("Estado inválido");
  return {ok: true, enabled: data.enabled === true, serverNow: data.serverNow,
    ownGraveId: uuid(data.ownGraveId) ? data.ownGraveId : null,
    markers: Array.isArray(data.markers) ? data.markers.map((m: any) => ({id: m.id, nombre: m.nombre, zona: m.zona, x: m.x, y: m.y, expiresAt: m.expiresAt, revision: m.revision, isMine: m.isMine === true})) : []};
}
function ackPublic(data: any) {
  if (!data?.ok || !data.data || typeof data.updated_at !== "string" || !Number.isFinite(Date.parse(data.updated_at))) throw Error("Confirmación inválida");
  const receipt: Record<string, unknown> = {};
  for (const key of ["op", "action", "graveId", "revisionBefore", "revisionAfter", "claimedPiles", "remainingPiles", "noFit", "createdAt", "cancelado", "actorBaseBefore", "actorBaseAfter"]) if (data.receipt?.[key] !== undefined) receipt[key] = data.receipt[key];
  if (data.receipt?.action === "morir") for (const key of ["summary", "viajeResumen"]) if (data.receipt[key] !== undefined) receipt[key] = data.receipt[key];
  return {ok: true, data: data.data, updated_at: data.updated_at, receipt, repeated: data.repeated === true, cancelado: data.cancelado === true, conflicto: data.conflicto === true};
}
export function createHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.headers.get("Origin") && req.headers.get("Origin") !== origin) return json({ok: false, error: "Origen no permitido"}, 403);
    if (req.method === "OPTIONS") return new Response("ok", {headers: cors});
    if (req.method !== "POST") return json({ok: false, error: "Método no permitido"}, 405);
    try {
      const auth = req.headers.get("Authorization") || "";
      if (!/^Bearer\s+\S+$/i.test(auth)) return json({ok: false, error: "Sin sesión"}, 401);
      const user = await deps.authenticate(auth.replace(/^Bearer\s+/i, ""));
      if (!user || !uuid(user.id)) return json({ok: false, error: "Sesión inválida"}, 401);
      const raw = await req.text();
      if (raw.length > 3072) return json({ok: false, error: "Pedido demasiado grande"}, 413);
      let body: any; try { body = JSON.parse(raw); } catch { return json({ok: false, error: "Pedido inválido"}, 400); }
      if (body?.cuenta !== user.id) return json({ok: false, error: "La sesión cambió de cuenta"}, 409);
      if (body.accion === "estado") {
        if (typeof body.zona !== "string" || !/^[a-z_]{1,40}$/.test(body.zona)) return json({ok: false, error: "Zona inválida"}, 400);
        const r = await deps.rpc("gf_graves_status", {p_uid: user.id, p_zone: body.zona});
        return r.error ? failed(r.error) : json(statusPublic(r.data));
      }
      if (body.accion === "morir" || (body.accion === "comprobar" && body.tipo === "morir")) {
        if (!uuid(body.op)) return json({ok: false, error: "Recibo de derrota inválido"}, 400);
        if (body.accion === "comprobar") {
          const r = await deps.rpc("gf_graves_deposit_reconcile", {p_uid: user.id, p_op: body.op});
          return r.error ? failed(r.error) : json(ackPublic(r.data));
        }
        if (typeof body.base !== "string" || !Number.isFinite(Date.parse(body.base)) || !deps.planDeath) return json({ok: false, error: "Guardado de derrota inválido"}, 400);
        const pre = await deps.rpc("gf_graves_deposit_snapshot", {p_uid: user.id, p_base: body.base});
        if (pre.error) return failed(pre.error);
        if (!pre.data?.ok || !pre.data.actor?.data || Date.parse(pre.data.actor.updated_at) !== Date.parse(body.base)) return json({ok: false, error: "No se pudo preparar la derrota; comprobá el mismo recibo"}, 503);
        const plan = deps.planDeath(pre.data.actor.data);
        if (!Array.isArray(plan?.dropSlots) || plan.dropSlots.length > 6 || new Set(plan.dropSlots).size !== plan.dropSlots.length || plan.dropSlots.some(s => !["casco", "armadura", "botas", "escudo", "arma", "set"].includes(s))) throw Error("Plan de derrota inválido");
        const breakSlots = plan.breakSlots || [];
        if (!Array.isArray(breakSlots) || breakSlots.length > 5 || new Set(breakSlots).size !== breakSlots.length || breakSlots.some(s => !["yelmo", "pecho", "pantalones", "botas", "guantes"].includes(s))) throw Error("Rotura de derrota inválida");
        // El sorteo y la fuente son del servidor. El cuerpo del navegador no aporta premios.
        const done = await deps.rpc("gf_graves_deposit_commit", {p_uid: user.id, p_op: body.op, p_base: body.base, p_plan: {breakSlots, dropSlots: plan.dropSlots}});
        return done.error ? failed(done.error) : json(ackPublic(done.data));
      }
      if (!["recoger", "comprobar"].includes(body.accion) || (body.accion === "comprobar" && body.tipo != null && body.tipo !== "recoger") || !uuid(body.id) || !uuid(body.op) || !Number.isSafeInteger(body.revision) || body.revision < 1) return json({ok: false, error: "Recibo de calavera inválido"}, 400);
      if (body.accion === "comprobar") {
        const r = await deps.rpc("gf_graves_reconcile", {p_uid: user.id, p_id: body.id, p_op: body.op, p_revision: body.revision});
        return r.error ? failed(r.error) : json(ackPublic(r.data));
      }
      if (typeof body.base !== "string" || !Number.isFinite(Date.parse(body.base))) return json({ok: false, error: "Guardado inválido"}, 400);
      const pre = await deps.rpc("gf_graves_claim_snapshot", {p_uid: user.id, p_id: body.id, p_base: body.base, p_revision: body.revision});
      if (pre.error) return failed(pre.error);
      const p = pre.data;
      if (!p?.ok || !p.actor?.data || !p.grave || !Array.isArray(p.grave.items) || typeof p.ownerBase !== "string" || typeof p.actor.updated_at !== "string" || Date.parse(p.actor.updated_at) !== Date.parse(body.base) || p.grave.revision !== body.revision) return json({ok: false, error: "No se pudo preparar la recogida; comprobá el mismo recibo"}, 503);
      const plan = deps.planClaim(p.actor.data.cont, p.grave.items);
      if (!plan || !Array.isArray(plan.remaining)) throw Error("Plan inválido");
      const done = await deps.rpc("gf_graves_claim", {p_uid: user.id, p_id: body.id, p_op: body.op, p_base: body.base, p_owner_base: p.ownerBase, p_revision: body.revision, p_cont: plan.cont, p_remaining: plan.remaining});
      return done.error ? failed(done.error) : json(ackPublic(done.data));
    } catch { return json({ok: false, error: "Entrega incierta. Comprobá el mismo recibo antes de repetir."}, 503); }
  };
}
