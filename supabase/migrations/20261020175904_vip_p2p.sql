-- CLI-generated migration, aligned to the verified remote migration version.
-- New listings capture their fee; NULL preserves historical 5%.
alter table public.market add column if not exists fee_pct smallint check (fee_pct in (7,10));
create schema if not exists golden_internal;
revoke all on schema golden_internal from public,anon,authenticated;
create table if not exists golden_internal.p2p_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null check(count > 0),
  primary key(user_id,day)
);
alter table golden_internal.p2p_quota enable row level security;
revoke all on golden_internal.p2p_quota from public,anon,authenticated;
create or replace function golden_internal.market_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); vip boolean; n integer; today date := (statement_timestamp() at time zone 'UTC')::date;
begin
  if u is null then raise exception 'Sesión requerida'; end if;
  if tg_op='INSERT' then
    if new.seller is distinct from u or new.sold_to is not null or new.paid then raise exception 'Publicación inválida'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('p2p:'||u::text,0));
    select coalesce((f.data->'produccion'->>'vipHasta')::numeric,0) > extract(epoch from statement_timestamp())*1000
      into vip from public.farms f where f.user_id=u;
    select q.count into n from golden_internal.p2p_quota q where q.user_id=u and q.day=today;
    if not coalesce(vip,false) and coalesce(n,0)>=1 then raise exception 'Free: una publicación P2P por día UTC; cancelar no devuelve el cupo'; end if;
    insert into golden_internal.p2p_quota(user_id,day,count) values(u,today,1)
      on conflict(user_id,day) do update set count=golden_internal.p2p_quota.count+1;
    new.fee_pct := case when coalesce(vip,false) then 7 else 10 end;
    new.created_at := statement_timestamp(); new.sold_at := null;
    return new;
  end if;
  if (to_jsonb(new)-array['sold_to','sold_at','paid']) is distinct from (to_jsonb(old)-array['sold_to','sold_at','paid']) then
    raise exception 'No se puede modificar el precio, contenido ni comisión de una publicación';
  end if;
  if old.sold_to is null and u<>old.seller and new.sold_to=u and not new.paid then
    new.sold_at:=statement_timestamp(); return new;
  end if;
  if old.seller=u and old.sold_to is not null and not old.paid and new.paid and new.sold_to=old.sold_to and new.sold_at=old.sold_at then return new; end if;
  raise exception 'Movimiento P2P inválido';
end;
$$;
revoke all on function golden_internal.market_guard() from public,anon,authenticated;
drop trigger if exists vip_market_guard on public.market;
create trigger vip_market_guard before insert or update on public.market for each row execute function golden_internal.market_guard();
