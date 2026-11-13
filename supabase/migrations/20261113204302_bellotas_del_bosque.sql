begin;

create schema if not exists golden_internal;

create table golden_internal.bellotas_20261113_cobros (
  user_id uuid not null,
  mision text not null,
  nombre text not null,
  cantidad integer not null check (cantidad in (1, 2)),
  cobrado_at timestamptz not null,
  primary key (user_id, mision)
);

alter table golden_internal.bellotas_20261113_cobros enable row level security;
revoke all on golden_internal.bellotas_20261113_cobros from public, anon, authenticated, service_role;
grant usage on schema golden_internal to service_role;
grant select on golden_internal.bellotas_20261113_cobros to service_role;

create function golden_internal.bellotas_20261113_registrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  estado jsonb := new.data->'bellotasEvento';
  anteriores jsonb := '{}'::jsonb;
  item record;
  momento timestamptz := clock_timestamp();
  dia text := (momento at time zone 'UTC')::date::text;
  valor integer;
  fuera_de_hora boolean := momento < timestamptz '2026-11-13T23:00:00Z'
    or momento >= timestamptz '2026-11-15T23:00:00Z';
begin
  if estado->>'version' is distinct from '2026-11-13/v1' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.data#>>'{bellotasEvento,version}' = '2026-11-13/v1' then
      anteriores := coalesce(old.data#>'{bellotasEvento,cobros}', '{}'::jsonb);
    end if;
  end if;
  if coalesce(estado->'cobros', '{}'::jsonb) = anteriores then
    return new;
  end if;
  if current_setting('role', true) in ('anon', 'authenticated') then
    raise insufficient_privilege using message = 'El servidor confirma los reclamos de Bellotas';
  end if;

  for item in select key, value from jsonb_each(estado->'cobros')
  loop
    continue when anteriores ? item.key;
    if item.key in ('extra:semillas','extra:energia','extra:cultivos','extra:platos') then
      valor := 2;
    elsif item.key in ('extra:papas','extra:madera','extra:piedra','extra:papaAsada','extra:pure','extra:estofado')
      or item.key in ('diaria:'||dia||':siembra','diaria:'||dia||':cocina','diaria:'||dia||':madera',
                      'diaria:'||dia||':mineria','diaria:'||dia||':jornada') then
      valor := 1;
    elsif item.key like 'diaria:%' then
      valor := 0;
    else
      raise exception 'Evento Bellotas: misión inválida';
    end if;

    if fuera_de_hora or valor = 0 then
      if item.key like 'extra:%' then
        raise exception 'Evento Bellotas: reclamo fuera de horario';
      end if;
      estado := jsonb_set(estado, '{cobros}', (estado->'cobros') - item.key);
      continue;
    end if;
    if item.value->'cantidad' is distinct from to_jsonb(valor) then
      raise exception 'Evento Bellotas: cantidad inválida';
    end if;
    insert into golden_internal.bellotas_20261113_cobros(user_id, mision, nombre, cantidad, cobrado_at)
    values (new.user_id, item.key, left(coalesce(nullif(btrim(new.name),''),'Granjero'),40), valor, momento)
    on conflict (user_id, mision) do nothing;
    if not found and item.key like 'extra:%' then
      raise exception 'Evento Bellotas: misión ya reclamada';
    end if;
  end loop;

  estado := jsonb_set(estado, '{total}', to_jsonb(coalesce((
    select sum(c.cantidad) from golden_internal.bellotas_20261113_cobros c where c.user_id = new.user_id
  ), 0)));
  new.data := jsonb_set(new.data, '{bellotasEvento}', estado);
  return new;
end;
$$;

revoke all on function golden_internal.bellotas_20261113_registrar() from public, anon, authenticated, service_role;
create trigger bellotas_20261113_registrar
before insert or update of data on public.farms
for each row execute function golden_internal.bellotas_20261113_registrar();

create function public.gf_ranking_bellotas(p_uid uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ultimos_nombres as (
    select distinct on (user_id) user_id, nombre
    from golden_internal.bellotas_20261113_cobros
    order by user_id, cobrado_at desc, mision
  ), totales as (
    select user_id, sum(cantidad)::integer bellotas
    from golden_internal.bellotas_20261113_cobros
    group by user_id
  ), puestos as (
    select t.user_id, n.nombre, t.bellotas, rank() over (order by t.bellotas desc)::integer puesto
    from totales t join ultimos_nombres n using (user_id)
  ), top as (
    select nombre, bellotas, puesto from puestos
    order by puesto, nombre, user_id
    limit 50
  )
  select jsonb_build_object(
    'ranking', coalesce((select jsonb_agg(to_jsonb(top) order by puesto, nombre) from top), '[]'::jsonb),
    'puesto', (select puesto from puestos where user_id = p_uid),
    'total', coalesce((select bellotas from puestos where user_id = p_uid), 0),
    'misiones', coalesce((select jsonb_agg(mision order by mision)
      from golden_internal.bellotas_20261113_cobros where user_id = p_uid), '[]'::jsonb)
  );
$$;

revoke all on function public.gf_ranking_bellotas(uuid) from public, anon, authenticated;
grant execute on function public.gf_ranking_bellotas(uuid) to service_role;

commit;
