-- Los anuncios anteriores conservan expires_at nulo y se pueden comprar o retirar.
do $check$
begin
  if md5(replace(pg_get_functiondef('golden_internal.market_guard()'::regprocedure), chr(13), ''))
      <> 'f6a9a6614ec3ad9571162fb32ae2d915' then
    raise exception 'market_guard cambió desde la revisión; no aplicar encima';
  end if;
end;
$check$;

alter table public.market add column expires_at timestamptz;

create or replace function golden_internal.market_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); vip boolean; extra integer; descuento integer; n integer; today date := (statement_timestamp() at time zone 'UTC')::date;
begin
  if u is null then raise exception 'Sesión requerida'; end if;
  if tg_op='INSERT' then
    if new.seller is distinct from u or new.sold_to is not null or new.paid then raise exception 'Publicación inválida'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('p2p:'||u::text,0));
    select coalesce((f.data->'produccion'->>'vipHasta')::numeric,0) > extract(epoch from statement_timestamp())*1000
      ,case when f.data->'infraestructura'->>'tienda'='true' then 1 else 0 end
      ,case when f.data->'infraestructura'->>'mercado'='true' then 2 else 0 end
      into vip,extra,descuento from public.farms f where f.user_id=u;
    select q.count into n from golden_internal.p2p_quota q where q.user_id=u and q.day=today;
    if coalesce(n,0)>=(case when coalesce(vip,false) then 10 else 1 end)+coalesce(extra,0) then raise exception 'Cupo P2P diario agotado: Free 1, VIP 10; tiendita +1; cancelar no devuelve el cupo'; end if;
    insert into golden_internal.p2p_quota(user_id,day,count) values(u,today,1)
      on conflict(user_id,day) do update set count=golden_internal.p2p_quota.count+1;
    new.fee_pct := case when coalesce(vip,false) then 7 else 10 end - coalesce(descuento,0);
    new.created_at := statement_timestamp(); new.sold_at := null;
    new.expires_at := new.created_at + interval '168 hours';
    return new;
  end if;
  if (to_jsonb(new)-array['sold_to','sold_at','paid']) is distinct from (to_jsonb(old)-array['sold_to','sold_at','paid']) then
    raise exception 'No se puede modificar el precio, contenido ni comisión de una publicación';
  end if;
  if old.sold_to is null and u<>old.seller and new.sold_to=u and not new.paid then
    -- Se ejecuta con la fila bloqueada, incluso si la compra esperó hasta después del vencimiento.
    if old.expires_at <= clock_timestamp() then raise exception 'Este anuncio ha vencido.'; end if;
    new.sold_at:=statement_timestamp(); return new;
  end if;
  if old.seller=u and old.sold_to is not null and not old.paid and new.paid and new.sold_to=old.sold_to and new.sold_at=old.sold_at then return new; end if;
  raise exception 'Movimiento P2P inválido';
end;
$$;

alter policy market_select on public.market using (
  (sold_to is null and (expires_at is null or expires_at > statement_timestamp()))
  or seller = (select auth.uid())
  or sold_to = (select auth.uid())
);

-- El tablón excluye también los vencidos propios. Mis anuncios conserva su acceso a la tabla.
create view public.market_activo with (security_invoker = true) as
  select id, seller, seller_name, kind, item, name, qty, price, payload,
    sold_to, sold_at, paid, created_at, fee_pct, expires_at
  from public.market
  where sold_to is null and (expires_at is null or expires_at > statement_timestamp());

revoke all on public.market_activo from public, anon, authenticated;
grant select on public.market_activo to authenticated;
