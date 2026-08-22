-- ============================================================
-- Golden Farm · EL PORTERO DEL GUARDADO (21/8)
--
-- ⚠️ ORDEN IMPORTANTE — dos partes, con una prueba en el medio:
--   PARTE 1 (la bitácora): correla YA, es inofensiva.
--   PARTE 2 (cerrar la puerta vieja): correla SOLO cuando la Edge
--   Function "guardar" esté deployada y hayas visto guardados
--   entrando en la bitácora. Si la corrés antes, NADIE puede guardar.
--   (Cómo deployar la función: docs/PORTERO-GUARDADO.md)
--
-- Pegá cada parte en Supabase → SQL Editor → Run.
-- ============================================================

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
-- PARTE 2 · CERRAR LA PUERTA VIEJA  (correr SOLO con la función viva)
-- Le quita al cliente la escritura directa sobre `farms`: leer su
-- granja sigue igual; escribirla, únicamente a través del portero.
-- ============================================================

-- 2a. Asegurar la lectura de la granja propia ANTES de tocar nada
--     (si existía una policy "ALL", tirarla se llevaría también el SELECT)
drop policy if exists farms_leer_propia on public.farms;
create policy farms_leer_propia on public.farms
  for select using (auth.uid() = user_id);

-- 2b. Tirar TODAS las demás policies de farms (insert/update/delete/all),
--     se llamen como se llamen — se crearon a mano y no sabemos el nombre.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'farms'
      and policyname <> 'farms_leer_propia'
  loop
    execute format('drop policy %I on public.farms', p.policyname);
  end loop;
end $$;

alter table public.farms enable row level security;

-- ============================================================
-- MARCHA ATRÁS (por si algo sale mal y hay que reabrir la puerta
-- vieja mientras se arregla la función — descomentar y correr):
-- ============================================================
-- create policy farms_escribir_propia on public.farms
--   for insert with check (auth.uid() = user_id);
-- create policy farms_actualizar_propia on public.farms
--   for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
