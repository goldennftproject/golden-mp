-- ============================================================
-- Golden Farm · EL RANKING DEL TORNEO (1/9)
--
-- La tabla comparativa 1º-10º del fin de semana que el capítulo 11
-- promete. La misma filosofía del portero de guardado: NADIE escribe
-- directo — solo la Edge Function "torneo" (service role), que además
-- CALCULA los puntos en el servidor a partir de especie y kilos: el
-- cliente propone la captura, el servidor decide cuánto vale.
--
-- Pegá TODO este archivo en Supabase → SQL Editor → Run.
-- Después deployá la función (supabase/functions/torneo/index.ts):
-- pasos exactos en docs/TORNEO-RANKING.md.
-- ============================================================

-- La tabla base: una fila por jugador y semana, con su MEJOR captura.
create table if not exists public.torneo_ranking (
  user_id    uuid not null,
  sem        integer not null,          -- torneoSemana(): la misma cuenta que el juego
  nick       text not null default 'granjero',
  pez        text not null,             -- id de especie del catálogo v4
  kg         numeric(8,2) not null,
  pts        numeric(8,3) not null,     -- los calcula LA FUNCIÓN, nunca el cliente
  updated_at timestamptz not null default now(),
  primary key (user_id, sem)
);

create index if not exists tr_sem_pts on public.torneo_ranking (sem, pts desc);

-- RLS sin policies = solo el service role (la Edge Function) toca la tabla.
alter table public.torneo_ranking enable row level security;

-- La cara pública: el top SIN user_id (los apodos son públicos, las cuentas no).
-- La lee la Edge Function para armar el top; si algún día se quiere leer directo
-- desde el cliente, es esta view la que se abre, jamás la tabla.
create or replace view public.torneo_top as
  select sem, nick, pez, kg, pts,
         rank() over (partition by sem order by pts desc, updated_at asc) as puesto
  from public.torneo_ranking;

-- Para revisar (vos, en el SQL Editor):
--   select * from torneo_top where sem = (select max(sem) from torneo_ranking)
--   order by puesto limit 20;
