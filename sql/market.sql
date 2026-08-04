-- ============================================================
-- Golden Farm · Mercado entre jugadores (P2P)
-- Pegá TODO esto en Supabase → SQL Editor → Run.
-- Crea la tabla `market` y las reglas de seguridad (RLS) para que
-- el juego pueda publicar, comprar, retirar y cobrar SIN que nadie
-- pueda tocar publicaciones ajenas.
-- ============================================================

create table if not exists public.market (
  id          bigint generated always as identity primary key,
  seller      uuid not null references auth.users(id) on delete cascade,
  seller_name text,
  kind        text not null,          -- res | seed | dish | fish | arm
  item        text not null,          -- clave del ítem (papa, espada_oro, ...)
  name        text,                   -- nombre lindo para mostrar
  qty         integer not null default 1 check (qty > 0),
  price       integer not null check (price > 0),
  payload     jsonb,                  -- armas: durabilidad, +N y runas
  sold_to     uuid references auth.users(id),
  sold_at     timestamptz,
  paid        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists market_libres_idx on public.market (created_at desc) where sold_to is null;
create index if not exists market_seller_idx on public.market (seller);

alter table public.market enable row level security;

-- Ver: cualquiera logueado ve las publicaciones libres y las suyas
drop policy if exists market_select on public.market;
create policy market_select on public.market
  for select to authenticated
  using (sold_to is null or seller = auth.uid() or sold_to = auth.uid());

-- Publicar: solo a nombre propio y sin marcarla como vendida
drop policy if exists market_insert on public.market;
create policy market_insert on public.market
  for insert to authenticated
  with check (seller = auth.uid() and sold_to is null and paid = false);

-- Comprar (reservar) una publicación libre que no sea tuya, o cobrar la tuya ya vendida
drop policy if exists market_update on public.market;
create policy market_update on public.market
  for update to authenticated
  using ((sold_to is null and seller <> auth.uid()) or seller = auth.uid())
  with check (sold_to is not null);

-- Retirar: solo lo tuyo y solo si nadie lo compró
drop policy if exists market_delete on public.market;
create policy market_delete on public.market
  for delete to authenticated
  using (seller = auth.uid() and sold_to is null);

-- Limpieza opcional: borrar publicaciones cobradas de más de 30 días
-- delete from public.market where paid = true and sold_at < now() - interval '30 days';
