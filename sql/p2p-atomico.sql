-- Mercado y granja en una sola transacción. Sólo guardar (service_role) puede operar.
create table if not exists golden_internal.p2p_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 op uuid not null, request jsonb not null, created_at timestamptz not null default now(),
 primary key(user_id,op)
);
alter table golden_internal.p2p_receipts enable row level security;
revoke all on golden_internal.p2p_receipts from public,anon,authenticated;

create or replace function public.p2p_operar(p_uid uuid,p_base text,p_op uuid,p_detalle jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.farms; m public.market; d jsonb; previous jsonb; a text:=p_detalle->>'accion';
 kind text; item text; bucket text; qty integer; price integer; stock numeric; payload jsonb; net numeric;
 pend jsonb; ack jsonb; stamp timestamptz;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido'; end if;
 if p_uid is null or p_op is null or p_base is null or jsonb_typeof(p_detalle)<>'object' or a not in('publicar','comprar','retirar','cobrar') or a is null then raise exception 'Pedido P2P inválido'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('p2p:'||p_uid::text,0));
 select * into strict f from public.farms where user_id=p_uid for update;
 select request into previous from golden_internal.p2p_receipts where user_id=p_uid and op=p_op;
 if found then
  if previous<>p_detalle then raise exception 'Recibo P2P usado para otra operación'; end if;
  return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'repetido',true);
 end if;
 if p_base<>(to_jsonb(f.updated_at)#>>'{}') then raise exception 'conflicto: otra sesión guardó'; end if;
 d:=f.data;pend:=coalesce(nullif(d->'mkPend','null'),'[]'::jsonb);
 if jsonb_typeof(pend)<>'array' or (a in('comprar','retirar') and jsonb_array_length(pend)>=100) then raise exception 'Recogé tus entregas pendientes antes de operar'; end if;
 -- El guard existente fija comisión, cuota diaria y fecha a partir de la cuenta real.
 perform set_config('request.jwt.claim.sub',p_uid::text,true);
 if a='publicar' then
  kind:=p_detalle->>'kind'; item:=p_detalle->>'item';qty:=(p_detalle->>'qty')::integer;price:=(p_detalle->>'price')::integer;
  if kind not in('res','seed','fish','dish','arm','armor') or kind is null or item is null or item!~'^[a-zA-Z0-9_@.:-]{1,100}$' or qty is null or price is null or qty<1 or price<1 then raise exception 'Publicación inválida'; end if;
  bucket:=case kind when 'res' then 'res' when 'seed' then 'seeds' when 'fish' then 'fish' when 'dish' then 'dishes' when 'arm' then 'weapons' else 'armor' end;
  if kind in('arm','armor') then
   if qty<>1 or d#>array[bucket,item] is null or d#>array[bucket,item] in('null'::jsonb,'false'::jsonb) then raise exception 'No tenés esa pieza'; end if;
   if kind='arm' then
    payload:=d#>array[bucket,item];
    if d#>>'{gear,arma}'=item then d:=jsonb_set(d,'{gear,arma}','null'); end if;
   else
    payload:=jsonb_build_object('dur',coalesce((d#>>array['armorDur',item])::numeric,100));
    d:=jsonb_set(d,'{armorDur}',coalesce(nullif(d->'armorDur','null'),'{}'::jsonb)-item);
    d:=jsonb_set(d,'{armorOff}',coalesce(nullif(d->'armorOff','null'),'{}'::jsonb)-item);
   end if;
   d:=jsonb_set(d,array[bucket],(d->bucket)-item);
  else
   stock:=coalesce((d#>>array[bucket,item])::numeric,0);
   if stock<qty then raise exception 'No tenés esa cantidad'; end if;
   d:=jsonb_set(d,array[bucket],jsonb_set(coalesce(nullif(d->bucket,'null'),'{}'::jsonb),array[item],to_jsonb(stock-qty)));
  end if;
  insert into public.market(seller,seller_name,kind,item,name,qty,price,payload)
   values(p_uid,f.name,kind,item,left(coalesce(p_detalle->>'name',item),120),qty,price,payload) returning * into m;
 else
  select * into m from public.market where id=(p_detalle->>'id')::bigint for update;
  if not found then raise exception 'La publicación ya no está disponible'; end if;
  if a='comprar' then
   if m.seller=p_uid or m.sold_to is not null then raise exception 'La publicación ya no está disponible'; end if;
   if p_detalle->>'price' is null or (p_detalle->>'price')::numeric<>m.price then raise exception 'El precio cambió; revisá la publicación'; end if;
   if coalesce((d->>'plata')::numeric,0)<m.price then raise exception 'Te falta Plata'; end if;
   if m.kind in('arm','armor') and (coalesce(d->case when m.kind='arm' then 'weapons' else 'armor' end,'{}')?m.item or exists(select 1 from jsonb_array_elements(pend) p where p->>'kind'=m.kind and p->>'item'=m.item)) then raise exception 'Ya tenés esa pieza'; end if;
   update public.market set sold_to=p_uid,sold_at=clock_timestamp() where id=m.id;
   d:=jsonb_set(d,'{plata}',to_jsonb((d->>'plata')::numeric-m.price));
  elsif a='retirar' then
   if m.seller<>p_uid or m.sold_to is not null then raise exception 'No se puede retirar esa publicación'; end if;
   delete from public.market where id=m.id;
  else
   if m.seller<>p_uid or m.sold_to is null or m.paid then raise exception 'Esa venta no se puede cobrar'; end if;
   net:=greatest(1,round(m.price*(1-coalesce(m.fee_pct,5)::numeric/100)));
   update public.market set paid=true where id=m.id;
   d:=jsonb_set(d,'{plata}',to_jsonb(coalesce((d->>'plata')::numeric,0)+net));
  end if;
  if a in('comprar','retirar') then
   d:=jsonb_set(d,'{mkPend}',pend||jsonb_build_array(jsonb_build_object('kind',m.kind,'item',m.item,'qty',m.qty,'payload',m.payload)));
  end if;
 end if;
 -- Ya se aplicó el movimiento: el portero no debe conceder su crédito otra vez.
 select jsonb_build_object(
  'ventas',coalesce((select sum(greatest(1,round(mm.price*(1-coalesce(mm.fee_pct,5)::numeric/100)))) from public.market mm where mm.seller=p_uid and mm.paid),0),
  'compras',coalesce((select jsonb_object_agg(q.item,q.n) from(select mm.item,sum(mm.qty) n from public.market mm where mm.sold_to=p_uid and mm.seller<>p_uid and mm.kind='res' group by mm.item) q),'{}'::jsonb),
  'abiertas',coalesce((select jsonb_object_agg(q.item,q.n) from(select mm.item,sum(mm.qty) n from public.market mm where mm.seller=p_uid and mm.sold_to is null and mm.kind='res' group by mm.item) q),'{}'::jsonb)
 ) into ack;
 stamp:=greatest(clock_timestamp(),f.updated_at+interval '1 microsecond');
 update public.farms set data=d,mercado_ack=ack,updated_at=stamp where user_id=p_uid returning * into f;
 insert into golden_internal.p2p_receipts(user_id,op,request) values(p_uid,p_op,p_detalle);
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'listing',m.id,'cobro',net);
end $$;
revoke all on function public.p2p_operar(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.p2p_operar(uuid,text,uuid,jsonb) to service_role;

-- La transición se cierra DESPUÉS de publicar el cliente nuevo. Ver p2p-atomico-cierre.sql.
