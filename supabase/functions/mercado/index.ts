import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  try{
    const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
    if(!jwt)return json({error:"Sin sesión"},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:u,error:authError}=await admin.auth.getUser(jwt);
    if(authError||!u?.user)return json({error:"Sesión inválida"},401);
    const texto=await req.text(); if(texto.length>4000)return json({error:"Pedido demasiado grande"},413);
    let body;try{body=JSON.parse(texto);}catch{return json({error:"Pedido inválido"},400);}
    if(body?.accion==="cotizar"){
      const {data,error}=await admin.rpc("gf_mercado_cotizar",{p_uid:u.user.id});
      return error?json({error:"No se pudo consultar el comprador"},503):json(data);
    }
    if(body?.accion!=="vender"||!Number.isSafeInteger(body.cantidad)||body.cantidad<1||body.cantidad>10000||typeof body.item!=="string"||body.item.length>30||!["plata","golden"].includes(body.moneda)||!Number.isSafeInteger(body.minimo)||body.minimo<0||typeof body.base!=="string"||!Number.isFinite(Date.parse(body.base))||typeof body.op!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.op))return json({error:"Parámetros de venta inválidos"},400);
    const {data,error}=await admin.rpc("gf_mercado_vender",{p_uid:u.user.id,p_item:body.item,p_cantidad:body.cantidad,p_moneda:body.moneda,p_minimo:body.minimo,p_base:body.base,p_op:body.op});
    if(error){const conflicto=(error.message||"").startsWith("conflicto:");return json({error:error.code==="P0001"?error.message:"No se pudo confirmar la venta",conflicto},conflicto?409:error.code==="P0001"?400:503);}
    return json(data);
  }catch{return json({error:"No se pudo completar la operación. No cierres hasta comprobar la conexión."},503);}
});
