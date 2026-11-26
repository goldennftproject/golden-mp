import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Ofertas de compra: sólo la cuenta autenticada puede operar o consultar su bandeja.
const OFERTA_RUTAS = ["p2pOfertaEstado","p2pOfertaCotizar","p2pOfertaRecibo","p2pOferta"];
function ofertaUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
function ofertaObjeto(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
async function ofertaRpc(admin, uid, body) {
  const routes = OFERTA_RUTAS.filter(key => Object.hasOwn(body, key));
  const route = routes[0], write = route === 'p2pOferta';
  const allowed = write ? [route, 'cuenta', 'base', 'op'] : [route, 'cuenta'];
  if (routes.length !== 1 || Object.keys(body).some(key => !allowed.includes(key))) {
    return json({error:'Solicita una sola operación de ofertas'},400);
  }
  if (body.cuenta !== uid) return json({error:'La sesión cambió de cuenta',conflicto:true},409);
  let rpc, params;
  if (route === 'p2pOfertaEstado' && body.p2pOfertaEstado === true) {
    rpc = 'gf_p2p_ofertas_estado';
    params = {p_uid:uid};
  } else if (route === 'p2pOfertaCotizar' && ofertaObjeto(body.p2pOfertaCotizar)) {
    const q = body.p2pOfertaCotizar;
    if (!['madera','piedra'].includes(q.item) || !Number.isSafeInteger(q.qty) || q.qty < 1 || q.qty > 99 ||
        Object.keys(q).some(key => !['item','qty'].includes(key))) return json({error:'Material o cantidad inválidos'},400);
    rpc = 'gf_p2p_ofertas_cotizar';
    params = {p_uid:uid,p_item:q.item,p_qty:q.qty};
  } else if (route === 'p2pOfertaRecibo' && ofertaUuid(body.p2pOfertaRecibo)) {
    rpc = 'gf_p2p_ofertas_recibo';
    params = {p_uid:uid,p_op:body.p2pOfertaRecibo};
  } else if (write && ofertaUuid(body.op) && typeof body.base === 'string' && body.base.length <= 64 &&
      Number.isFinite(Date.parse(body.base)) && ofertaObjeto(body.p2pOferta)) {
    if (!['oferta_crear','oferta_cancelar','oferta_vender','oferta_recibir','oferta_cobrar'].includes(body.p2pOferta.accion)) {
      return json({error:'Acción de oferta inválida'},400);
    }
    rpc = 'gf_p2p_ofertas_operar';
    params = {p_uid:uid,p_base:body.base,p_op:body.op,p_detail:body.p2pOferta};
  } else return json({error:'Solicitud de ofertas inválida'},400);

  const {data,error} = await admin.rpc(rpc, params);
  if (error) {
    if (error.code === 'P0001' && /^conflicto:/i.test(error.message || '')) {
      return json({error:'Otra sesión guardó; recupera la versión del servidor',code:'OFERTA_CONFLICTO_BASE',conflicto:true},409);
    }
    if (error.code === 'P0001' && error.message === 'COTIZACION_CAMBIO') {
      return json({error:'La oferta cambió. Revisa el nuevo precio y confirma otra vez.',code:'COTIZACION_CAMBIO'},400);
    }
    if (error.code === 'P0001') return json({error:error.message,code:'OFERTA_RECHAZADA'},400);
    if (/^22/.test(error.code || '')) return json({error:'Material, cantidad o recibo inválidos',code:'OFERTA_RECHAZADA'},400);
    return json({error:'No se pudo confirmar el estado de las ofertas'},503);
  }
  if (!data?.ok || (write && (!data.data || typeof data.updated_at !== 'string' ||
      String(data.recibo?.op).toLowerCase() !== body.op.toLowerCase()))) {
    return json({error:'La respuesta de ofertas quedó sin confirmar'},503);
  }
  return json(data);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const authorization = req.headers.get("Authorization") || "";
  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  if (!token) return json({ error: "Sin sesión" }, 401);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.getUser(token);
    const uid = data?.user?.id;
    if (error || !uid) return json({ error: "Sesión inválida" }, 401);

    const content = await req.text();
    if (content.length > 4096) return json({ error: "Solicitud demasiado grande" }, 413);
    const body = JSON.parse(content);
    if (!ofertaObjeto(body)) return json({ error: "Solicitud de ofertas inválida" }, 400);
    return await ofertaRpc(admin, uid, body);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Solicitud de ofertas inválida" }, 400);
    return json({ error: "No se pudo confirmar el estado de las ofertas" }, 503);
  }
});
