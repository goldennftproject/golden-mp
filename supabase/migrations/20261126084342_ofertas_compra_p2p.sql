-- Ofertas de compra de materiales. Sólo Guardar puede invocar los RPC.
begin;
set local lock_timeout = '5s';
create schema if not exists golden_internal;

create table golden_internal.p2p_buy_offers (
  id bigint generated always as identity primary key,
  owner uuid not null,
  item text not null check (item in ('madera', 'piedra')),
  unit_price integer not null check (unit_price between 1 and 1000000),
  qty_open integer not null check (qty_open between 0 and 99),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '168 hours'),
  cancelled boolean not null default false,
  check (not cancelled or qty_open = 0)
);
create index p2p_buy_offers_priority
  on golden_internal.p2p_buy_offers (item, unit_price desc, created_at, id)
  where not cancelled and qty_open > 0;
create index p2p_buy_offers_owner_day on golden_internal.p2p_buy_offers (owner, created_at desc);
create index p2p_buy_offers_owner_open on golden_internal.p2p_buy_offers (owner, expires_at, id)
  where not cancelled and qty_open > 0;

create table golden_internal.p2p_buy_fills (
  id bigint generated always as identity primary key,
  offer_id bigint not null references golden_internal.p2p_buy_offers(id),
  buyer uuid not null,
  seller uuid not null,
  item text not null check (item in ('madera', 'piedra')),
  qty integer not null check (qty between 1 and 99),
  gross bigint not null check (gross > 0),
  net bigint not null check (net between 0 and gross),
  fee_pct integer not null check (fee_pct in (5,7,8,10)),
  taken boolean not null default false,
  paid boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  check (buyer <> seller)
);
create index p2p_buy_fills_buyer on golden_internal.p2p_buy_fills (buyer, id) where not taken;
create index p2p_buy_fills_seller on golden_internal.p2p_buy_fills (seller, id) where not paid;
create index p2p_buy_fills_totals on golden_internal.p2p_buy_fills (offer_id, seller, fee_pct);

create table golden_internal.p2p_buy_receipts (
  actor uuid not null,
  op uuid not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (actor, op)
);
alter table golden_internal.p2p_buy_offers enable row level security;
alter table golden_internal.p2p_buy_fills enable row level security;
alter table golden_internal.p2p_buy_receipts enable row level security;
revoke all on golden_internal.p2p_buy_offers, golden_internal.p2p_buy_fills, golden_internal.p2p_buy_receipts
  from public, anon, authenticated;
revoke all on sequence golden_internal.p2p_buy_offers_id_seq, golden_internal.p2p_buy_fills_id_seq
  from public, anon, authenticated;

-- Los UUID del libro los determina el RPC a partir de partidas existentes. Los cobros
-- del vendedor se conservan aunque la otra partida se elimine posteriormente.
create function golden_internal.p2p_buy_limit(snapshot jsonb, instant timestamptz)
returns integer language sql immutable security invoker set search_path = '' as $$
  select (case when coalesce((snapshot#>>'{produccion,vipHasta}')::numeric,0)
    > extract(epoch from instant)*1000 then 10 else 1 end)
    + case when snapshot#>>'{infraestructura,tienda}'='true' then 1 else 0 end;
$$;

create function golden_internal.p2p_buy_best(p_uid uuid, p_item text, instant timestamptz)
returns setof golden_internal.p2p_buy_offers language sql stable security invoker set search_path = '' as $$
  select o.*
    from golden_internal.p2p_buy_offers o
    where o.item = p_item and o.owner <> p_uid and not o.cancelled and o.qty_open > 0
      and o.expires_at > instant
      and exists (select 1 from public.farms f where f.user_id=o.owner)
      and (select count(*) from golden_internal.p2p_buy_fills f where f.buyer = o.owner and not f.taken) < 100
    order by o.unit_price desc, o.created_at, o.id
    limit 1;
$$;

create function golden_internal.p2p_buy_quote(p_uid uuid, snapshot jsonb, bid golden_internal.p2p_buy_offers, qty integer, instant timestamptz)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  rate integer;
  gross bigint := qty::bigint * bid.unit_price;
  previous_gross bigint;
  previous_net bigint;
  net bigint;
  result jsonb;
begin
  rate := case when coalesce((snapshot#>>'{produccion,vipHasta}')::numeric,0)
    > extract(epoch from instant)*1000 then 7 else 10 end
    - case when snapshot#>>'{infraestructura,mercado}'='true' then 2 else 0 end;
  -- La comisión acumulada deja el mismo neto si una venta se divide en varias partes.
  select coalesce(sum(f.gross),0), coalesce(sum(f.net),0) into previous_gross,previous_net
    from golden_internal.p2p_buy_fills f where f.offer_id=bid.id and f.seller=p_uid and f.fee_pct=rate;
  net := greatest(1,round((previous_gross+gross)::numeric*(100-rate)/100))-previous_net;
  result := jsonb_build_object('ok',true,'order',bid.id::text,'item',bid.item,'qty',qty,
    'unitPrice',bid.unit_price,'gross',gross,'fee',gross-net,'net',net);
  -- La huella se recalcula dentro de la transacción. Sólo confirma los datos, sin reservar el lote.
  return result || jsonb_build_object('quote',encode(sha256(convert_to(
    jsonb_build_array(p_uid,result,rate,previous_gross,previous_net)::text,'UTF8')),'hex'));
end $$;

create function public.gf_p2p_ofertas_estado(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  snapshot jsonb;
  instant timestamptz := statement_timestamp();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido' using errcode='42501'; end if;
  select f.data into snapshot from public.farms f where f.user_id=p_uid;
  if not found then raise exception 'Guarda tu granja antes de consultar las ofertas'; end if;
  return jsonb_build_object(
    'ok',true,'maxCantidad',99,'maxPrecio',1000000,
    'limite',golden_internal.p2p_buy_limit(snapshot,instant),
    'creadasHoy',(select count(*) from golden_internal.p2p_buy_offers o
      where o.owner=p_uid and o.created_at>=date_trunc('day',instant,'UTC')),
    'mercado',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id::text,'item',o.item,
      'unitPrice',o.unit_price,'qtyOpen',o.qty_open) order by o.item),'[]')
      from (values ('madera'),('piedra')) materials(item)
      cross join lateral golden_internal.p2p_buy_best(p_uid,materials.item,instant) o),
    'propias',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id::text,'item',o.item,
      'unitPrice',o.unit_price,'qtyOpen',o.qty_open,
      'reservedPlata',o.qty_open::bigint*o.unit_price,'createdAt',o.created_at,'expiresAt',o.expires_at,
      'status',case when o.expires_at>instant then 'activa' else 'vencida' end) order by o.created_at desc,o.id desc),'[]')
      from golden_internal.p2p_buy_offers o where o.owner=p_uid and not o.cancelled and o.qty_open>0),
    'entregas',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id::text,'item',f.item,'qty',f.qty) order by f.id),'[]')
      from golden_internal.p2p_buy_fills f where f.buyer=p_uid and not f.taken),
    'cobros',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id::text,'item',f.item,'qty',f.qty,'net',f.net) order by f.id),'[]')
      from golden_internal.p2p_buy_fills f where f.seller=p_uid and not f.paid));
end $$;

create function public.gf_p2p_ofertas_cotizar(p_uid uuid,p_item text,p_qty integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  snapshot jsonb;
  bid golden_internal.p2p_buy_offers;
  instant timestamptz := statement_timestamp();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido' using errcode='42501'; end if;
  if p_item is null or p_item not in ('madera','piedra') or p_qty is null or p_qty<1 or p_qty>99 then
    raise exception 'Cantidad o material inválido';
  end if;
  select f.data into snapshot from public.farms f where f.user_id=p_uid;
  if not found then raise exception 'Guarda tu granja antes de cotizar'; end if;
  select * into bid from golden_internal.p2p_buy_best(p_uid,p_item,instant);
  if not found or bid.qty_open<p_qty then raise exception 'COTIZACION_CAMBIO'; end if;
  return golden_internal.p2p_buy_quote(p_uid,snapshot,bid,p_qty,instant);
end $$;

create function public.gf_p2p_ofertas_recibo(p_uid uuid,p_op uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido' using errcode='42501'; end if;
  return jsonb_build_object('ok',true,'recibo',(
    select r.result from golden_internal.p2p_buy_receipts r where r.actor=p_uid and r.op=p_op
  ));
end $$;

create function public.gf_p2p_ofertas_operar(p_uid uuid,p_base text,p_op uuid,p_detail jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor public.farms;
  bid golden_internal.p2p_buy_offers;
  matched golden_internal.p2p_buy_fills;
  saved golden_internal.p2p_buy_receipts;
  action text := p_detail->>'accion';
  item_key text := p_detail->>'item';
  qty integer;
  unit_price integer;
  order_id bigint;
  fill_id bigint;
  gross bigint;
  net bigint;
  rate integer;
  quotation jsonb;
  parts jsonb;
  snapshot jsonb;
  pending jsonb;
  instant timestamptz;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido' using errcode='42501'; end if;
  if p_uid is null or p_op is null or p_base is null or jsonb_typeof(p_detail) is distinct from 'object'
    or action is null or action not in ('oferta_crear','oferta_cancelar','oferta_vender','oferta_recibir','oferta_cobrar') then
    raise exception 'Operación de oferta inválida';
  end if;

  -- Cada operación toma la granja del actor, luego el material y después el buzón
  -- comprador si corresponde. Una venta nunca bloquea ni actualiza la granja compradora.
  select * into actor from public.farms f where f.user_id=p_uid for update;
  if not found then raise exception 'Guarda tu granja antes de operar con ofertas'; end if;
  select * into saved from golden_internal.p2p_buy_receipts r where r.actor=p_uid and r.op=p_op;
  if found then
    if saved.request is distinct from p_detail then raise exception 'Recibo usado para otra operación'; end if;
    return jsonb_build_object('ok',true,'data',actor.data,'updated_at',actor.updated_at,'recibo',saved.result,'repetido',true);
  end if;
  if p_base::timestamptz is distinct from actor.updated_at then raise exception 'conflicto: otra sesión guardó'; end if;
  snapshot := actor.data;
  if snapshot->'zonaViaje' is not null and snapshot->'zonaViaje'<>'null'::jsonb then
    raise exception 'Vuelve a la granja antes de operar con ofertas';
  end if;

  if action in ('oferta_crear','oferta_vender') then
    if p_detail->>'kind' is distinct from 'res' or item_key is null or item_key not in ('madera','piedra')
      or jsonb_typeof(p_detail->'qty') is distinct from 'number'
      or jsonb_typeof(p_detail->'unitPrice') is distinct from 'number'
      or not coalesce(p_detail->>'qty' ~ '^[1-9][0-9]?$' and p_detail->>'unitPrice' ~ '^[1-9][0-9]{0,6}$',false) then
      raise exception 'Cantidad, material o precio inválido';
    end if;
    qty := (p_detail->>'qty')::integer;
    unit_price := (p_detail->>'unitPrice')::integer;
    if unit_price>1000000 then raise exception 'El precio máximo es 1.000.000 Plata por unidad'; end if;
  end if;

  if action in ('oferta_cancelar','oferta_vender') then
    if not coalesce(p_detail->>'order' ~ '^[1-9][0-9]{0,17}$',false) then raise exception 'Identificador de oferta inválido'; end if;
    order_id := (p_detail->>'order')::bigint;
  end if;
  if action='oferta_cancelar' then
    select o.item into item_key from golden_internal.p2p_buy_offers o where o.id=order_id and o.owner=p_uid;
    if not found then raise exception 'Oferta propia no encontrada'; end if;
  end if;
  if action in ('oferta_crear','oferta_cancelar','oferta_vender') then
    perform pg_advisory_xact_lock(hashtextextended('golden.p2p.buy.item.v1:'||item_key,0));
  end if;
  instant := clock_timestamp();

  if action='oferta_crear' then
    if (select count(*) from golden_internal.p2p_buy_offers o where o.owner=p_uid
      and o.created_at>=date_trunc('day',instant,'UTC'))>=golden_internal.p2p_buy_limit(snapshot,instant) then
      raise exception 'Agotaste tu cupo de ofertas de compra. Se renueva a las 00:00 UTC';
    end if;
    if (select count(*) from golden_internal.p2p_buy_offers o where o.owner=p_uid and not o.cancelled and o.qty_open>0)>=20 then
      raise exception 'Retira alguna oferta pendiente antes de publicar otra';
    end if;
    gross := qty::bigint * unit_price;
    if coalesce((snapshot->>'plata')::numeric,0)<gross then raise exception 'Falta Plata disponible'; end if;
    snapshot := jsonb_set(snapshot,'{plata}',to_jsonb((snapshot->>'plata')::numeric-gross));
    insert into golden_internal.p2p_buy_offers (owner,item,unit_price,qty_open,created_at,expires_at)
      values (p_uid,item_key,unit_price,qty,instant,instant+interval '168 hours') returning * into bid;
    parts := jsonb_build_object('order',bid.id::text,'reserved',gross,'reservedPlata',gross,'qtyOpen',qty);
  elsif action='oferta_cancelar' then
    select * into bid from golden_internal.p2p_buy_offers o
      where o.id=order_id and o.owner=p_uid and not o.cancelled and o.qty_open>0 for update;
    if not found then raise exception 'No hay reserva para devolver'; end if;
    gross := bid.qty_open::bigint * bid.unit_price;
    update golden_internal.p2p_buy_offers set qty_open=0,cancelled=true where id=bid.id;
    snapshot := jsonb_set(snapshot,'{plata}',to_jsonb(coalesce((snapshot->>'plata')::numeric,0)+gross));
    parts := jsonb_build_object('order',bid.id::text,'refunded',gross);
  elsif action='oferta_vender' then
    if jsonb_typeof(p_detail->'minNet') is distinct from 'number'
      or not coalesce(p_detail->>'minNet' ~ '^[0-9]{1,9}$',false)
      or not coalesce(p_detail->>'quote' ~ '^[0-9a-f]{64}$',false) then
      raise exception 'Cotización inválida';
    end if;
    if coalesce((snapshot#>>array['res',item_key])::numeric,0)<qty then raise exception 'Faltan materiales disponibles'; end if;
    if (select count(*) from golden_internal.p2p_buy_fills f where f.seller=p_uid and not f.paid)>=100 then
      raise exception 'Cobra alguna venta antes de entregar otra';
    end if;
    select * into bid from golden_internal.p2p_buy_best(p_uid,item_key,instant);
    if not found or bid.id<>order_id or bid.unit_price<>unit_price or bid.qty_open<qty then
      raise exception 'COTIZACION_CAMBIO';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('golden.p2p.buy.inbox.v1:'||bid.owner::text,0));
    instant := clock_timestamp();
    if bid.expires_at<=instant or
      (select count(*) from golden_internal.p2p_buy_fills f where f.buyer=bid.owner and not f.taken)>=100 then
      raise exception 'COTIZACION_CAMBIO';
    end if;
    quotation := golden_internal.p2p_buy_quote(p_uid,snapshot,bid,qty,instant);
    net := (quotation->>'net')::bigint;
    if quotation->>'quote' is distinct from p_detail->>'quote' or net<(p_detail->>'minNet')::bigint then
      raise exception 'COTIZACION_CAMBIO';
    end if;
    rate := case when coalesce((snapshot#>>'{produccion,vipHasta}')::numeric,0)>extract(epoch from instant)*1000 then 7 else 10 end
      - case when snapshot#>>'{infraestructura,mercado}'='true' then 2 else 0 end;
    gross := qty::bigint * bid.unit_price;
    update golden_internal.p2p_buy_offers set qty_open=qty_open-qty where id=bid.id;
    insert into golden_internal.p2p_buy_fills (offer_id,buyer,seller,item,qty,gross,net,fee_pct)
      values (bid.id,bid.owner,p_uid,item_key,qty,gross,net,rate) returning * into matched;
    snapshot := jsonb_set(snapshot,array['res',item_key],to_jsonb((snapshot#>>array['res',item_key])::numeric-qty));
    parts := jsonb_build_object('order',bid.id::text,'fill',matched.id::text,'qty',qty,'gross',gross,'net',net,'fee',gross-net);
  else
    if not coalesce(p_detail->>(case when action='oferta_recibir' then 'delivery' else 'receipt' end) ~ '^[1-9][0-9]{0,17}$',false) then
      raise exception 'Identificador de ejecución inválido';
    end if;
    fill_id := (p_detail->>(case when action='oferta_recibir' then 'delivery' else 'receipt' end))::bigint;
    if action='oferta_recibir' then
      perform pg_advisory_xact_lock(hashtextextended('golden.p2p.buy.inbox.v1:'||p_uid::text,0));
      select * into matched from golden_internal.p2p_buy_fills f where f.id=fill_id and f.buyer=p_uid and not f.taken for update;
      if not found then raise exception 'Entrega propia no disponible'; end if;
      pending := coalesce(nullif(snapshot->'mkPend','null'::jsonb),'[]'::jsonb);
      if jsonb_typeof(pending)<>'array' or jsonb_array_length(pending)>=100 then
        raise exception 'Recoge tus entregas pendientes para hacer sitio en la cola';
      end if;
      snapshot := jsonb_set(snapshot,'{mkPend}',pending||
        jsonb_build_array(jsonb_build_object('kind','res','item',matched.item,'qty',matched.qty,'payload',null)));
      update golden_internal.p2p_buy_fills set taken=true where id=fill_id;
      parts := jsonb_build_object('fill',matched.id::text,'qty',matched.qty,'item',matched.item);
    else
      select * into matched from golden_internal.p2p_buy_fills f where f.id=fill_id and f.seller=p_uid and not f.paid for update;
      if not found then raise exception 'Cobro propio no disponible'; end if;
      snapshot := jsonb_set(snapshot,'{plata}',to_jsonb(coalesce((snapshot->>'plata')::numeric,0)+matched.net));
      update golden_internal.p2p_buy_fills set paid=true where id=fill_id;
      parts := jsonb_build_object('fill',matched.id::text,'net',matched.net);
    end if;
  end if;

  update public.farms set data=snapshot,updated_at=greatest(clock_timestamp(),actor.updated_at+interval '1 microsecond')
    where user_id=p_uid returning * into actor;
  parts := parts || jsonb_build_object('op',p_op,'accion',action);
  insert into golden_internal.p2p_buy_receipts(actor,op,request,result) values(p_uid,p_op,p_detail,parts);
  return jsonb_build_object('ok',true,'data',actor.data,'updated_at',actor.updated_at,'recibo',parts);
end $$;

revoke all on function golden_internal.p2p_buy_limit(jsonb,timestamptz),
  golden_internal.p2p_buy_best(uuid,text,timestamptz),
  golden_internal.p2p_buy_quote(uuid,jsonb,golden_internal.p2p_buy_offers,integer,timestamptz)
  from public,anon,authenticated;
revoke all on function public.gf_p2p_ofertas_operar(uuid,text,uuid,jsonb),public.gf_p2p_ofertas_estado(uuid),
  public.gf_p2p_ofertas_cotizar(uuid,text,integer),public.gf_p2p_ofertas_recibo(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.gf_p2p_ofertas_operar(uuid,text,uuid,jsonb),public.gf_p2p_ofertas_estado(uuid),
  public.gf_p2p_ofertas_cotizar(uuid,text,integer),public.gf_p2p_ofertas_recibo(uuid,uuid)
  to service_role;
commit;
