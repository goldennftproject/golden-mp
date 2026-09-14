-- ============================================================
-- Golden Farm · INSTALAR EL JUEGO EN UN PROYECTO NUEVO DE SUPABASE (14/9)
--
-- Pegá TODO este archivo en el SQL Editor del proyecto NUEVO → Run.
-- Es idempotente: se puede correr dos veces sin romper nada.
-- Deja lo que el juego necesita para arrancar de cero:
--   1 · la tabla `farms` (una fila por cuenta anónima) con sus reglas
--   2 · las vistas `leaderboard` y `ofrenda_rank` (escondidas tras el MVP, pero
--       el código las consulta y sin ellas escupe errores en consola)
--   3 · el mercado P2P (`market`)                — sql/market.sql, tal cual
--   4 · la bitácora del portero (`farm_saves_log`) — sql/portero-guardado.sql PARTE 1 y 1b
-- Lo que NO está acá, a propósito: la PARTE 2 del portero (cerrar la escritura
-- directa) — va DESPUÉS de deployar la función `guardar` y verla anotar. Y el
-- torneo (sql/torneo-ranking.sql): escondido tras el MVP, queda para después.
-- Los pasos completos: docs/MUDANZA-SUPABASE.md
-- ============================================================

-- ============================================================
-- 1 · LA GRANJA DE CADA CUENTA
-- El juego guarda TODO el estado en `data` (jsonb) y el apodo en `name`.
-- Cada cuenta lee y escribe SOLO su fila (RLS por user_id).
-- ============================================================
create table if not exists public.farms (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.farms enable row level security;
drop policy if exists farms_leer_propia on public.farms;
create policy farms_leer_propia on public.farms
  for select using (auth.uid() = user_id);
drop policy if exists farms_escribir_propia on public.farms;
create policy farms_escribir_propia on public.farms
  for insert with check (auth.uid() = user_id);
drop policy if exists farms_actualizar_propia on public.farms;
create policy farms_actualizar_propia on public.farms
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 2 · LOS RANKINGS (vistas públicas de solo lectura sobre `farms`)
-- security_invoker OFF a propósito: la vista se lee con los permisos del
-- dueño, así cualquier jugador ve el ranking entero aunque solo pueda leer
-- SU fila de `farms`. Solo exponen apodo y números, nunca el `data` completo.
-- ============================================================
create or replace view public.leaderboard as
select f.user_id,
       f.name,
       coalesce((f.data->>'plata')::numeric, 0)::integer   as plata,
       coalesce(f.data->'skills', '{}'::jsonb)          as skills,
       coalesce((f.data->>'level')::integer, 1)           as level,
       coalesce((f.data->>'prestige')::integer, 0)        as prestige
from public.farms f
order by level desc, plata desc;

create or replace view public.ofrenda_rank as
select f.user_id,
       f.name,
       coalesce((f.data->>'ofrendaPts')::numeric, 0)::integer as ofrenda_pts
from public.farms f;

grant select on public.leaderboard, public.ofrenda_rank to anon, authenticated;

-- ============================================================
-- 3 · EL MERCADO P2P  (copia literal de sql/market.sql)
-- ============================================================
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

-- ============================================================
-- 4 · LA BITÁCORA DEL PORTERO  (sql/portero-guardado.sql, PARTE 1 y 1b)
-- ============================================================
-- PARTE 1 · LA BITÁCORA  (correr ya)
-- Cada guardado deja su rastro: cuánto tiempo pasó, qué cambió y
-- qué le pareció sospechoso al portero. Solo la Edge Function
-- escribe acá (service role); los jugadores ni la ven.
-- ============================================================

create table if not exists public.farm_saves_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  reglas_v   integer,                 -- versión de reglas.js que evaluó
  elapsed_s  integer,                 -- segundos desde el guardado anterior (reloj del SERVIDOR)
  delta      jsonb,                   -- qué cambió (solo lo distinto de cero)
  sospechas  jsonb,                   -- [] en un jugador honesto
  created_at timestamptz not null default now()
);

create index if not exists fsl_user_idx    on public.farm_saves_log (user_id, created_at desc);
-- las filas con sospechas son las que se miran: índice solo para ellas
create index if not exists fsl_sospechosas on public.farm_saves_log (created_at desc)
  where jsonb_array_length(sospechas) > 0;

-- RLS sin policies = solo el service role (la función) puede tocarla
alter table public.farm_saves_log enable row level security;

-- Para revisar la bitácora (vos, en el SQL Editor):
--   select user_id, elapsed_s, sospechas, delta, created_at
--   from farm_saves_log where jsonb_array_length(sospechas) > 0
--   order by created_at desc limit 100;

-- ============================================================

-- PARTE 1b · LA BITÁCORA CON NOMBRES (correr cuando quieras)
-- Una vista que cruza la bitácora con el nick de cada granja:
-- en Table Editor aparece como `bitacora` y se lee con nombres.
-- security_invoker: los jugadores no pueden leerla por la API
-- (la bitácora sigue sin policies); vos en el dashboard sí.
-- ============================================================
create or replace view public.bitacora
  with (security_invoker = on) as
select l.id, f.name as nick, l.user_id, l.elapsed_s, l.sospechas, l.delta, l.created_at
from public.farm_saves_log l
left join public.farms f on f.user_id = l.user_id
order by l.created_at desc;
