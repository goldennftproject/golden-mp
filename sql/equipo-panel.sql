-- Accesos por UUID de Auth: nunca por nombre ni user_metadata.
create table golden_internal.equipo_accesos (
 user_id uuid primary key references auth.users(id) on delete restrict,
 role text not null check(role in ('admin','dev')),active boolean not null default true,
 created_at timestamptz not null default clock_timestamp()
);
create table golden_internal.equipo_auditoria (
 id bigint generated always as identity primary key,actor uuid not null references auth.users(id),
 action text not null,target text,detail text not null default '',created_at timestamptz not null default clock_timestamp()
);
create table golden_internal.usdt_intentos (
 user_id uuid not null references auth.users(id) on delete restrict,tx text not null check(tx ~ '^0x[0-9a-f]{64}$'),
 state text not null check(state in ('pendiente','error','acreditado')),detail text not null,
 attempts integer not null default 1,updated_at timestamptz not null default clock_timestamp(),
 resolved boolean not null default false,note text not null default '',reviewed_by uuid references auth.users(id),
 primary key(user_id,tx)
);
create index usdt_intentos_updated on golden_internal.usdt_intentos(updated_at desc);
alter table golden_internal.equipo_accesos enable row level security;
alter table golden_internal.equipo_auditoria enable row level security;
alter table golden_internal.usdt_intentos enable row level security;
revoke all on golden_internal.equipo_accesos,golden_internal.equipo_auditoria,golden_internal.usdt_intentos from public,anon,authenticated;
grant select on golden_internal.equipo_accesos to service_role;
grant select,insert on golden_internal.equipo_auditoria to service_role;
grant usage on sequence golden_internal.equipo_auditoria_id_seq to service_role;
grant select,insert,update on golden_internal.usdt_intentos to service_role;
grant update(deposits_enabled) on golden_internal.usdt_config to service_role;

create function public.usdt_intento(p_uid uuid,p_tx text,p_state text,p_detail text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_tx !~ '^0x[0-9a-f]{64}$' or p_state not in ('pendiente','error','acreditado') then return;end if;
 -- Diagnóstico acotado a 50 transacciones por cuenta; recibos financieros separados e íntegros.
 perform pg_advisory_xact_lock(hashtextextended(p_uid::text,19));
 if not exists(select 1 from golden_internal.usdt_intentos where user_id=p_uid and tx=p_tx) and
    (select count(*) from golden_internal.usdt_intentos where user_id=p_uid)>=50 then return;end if;
 insert into golden_internal.usdt_intentos(user_id,tx,state,detail)
 values(p_uid,p_tx,p_state,left(coalesce(p_detail,''),300))
 on conflict(user_id,tx) do update set state=excluded.state,detail=excluded.detail,attempts=least(usdt_intentos.attempts+1,1000000),updated_at=clock_timestamp(),resolved=case when excluded.state='acreditado' then true else false end;
end $$;

create function public.equipo_consulta(p_uid uuid,p_vista text,p_search text default '',p_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare rol text;rows jsonb;skip integer;needle text;
begin
 select role into rol from golden_internal.equipo_accesos where user_id=p_uid and active;
 if p_vista='acceso' then return jsonb_build_object('ok',true,'role',rol);end if;
 if rol is null then return jsonb_build_object('error','No tienes acceso al panel del equipo','denied',true);end if;
 if p_page is null or p_page<0 or p_page>10000 then return jsonb_build_object('error','Página inválida');end if;
 skip:=p_page*25;needle:=left(coalesce(p_search,''),100);
 if p_vista='resumen' then
  return jsonb_build_object('ok',true,'role',rol,'at',clock_timestamp(),'deposits_enabled',(select deposits_enabled from golden_internal.usdt_config where id),
   'fase',(select phase from golden_internal.alpha_release where id),'cuentas',(select count(*) from public.farms),
   'granjas',(select count(*) from public.farms),'wallets',(select count(*) from golden_internal.usdt_wallets where address is not null),
   'depositos',(select count(*) from golden_internal.usdt_deposits),'usdt_confirmados',(select coalesce(sum(golden),0) from golden_internal.usdt_deposits),
   'golden_pagado_pendiente',(select coalesce(sum(paid_remaining),0) from golden_internal.usdt_wallets where not release_restored),
   'incidencias',(select count(*) from golden_internal.usdt_intentos where state<>'acreditado' and not resolved),
   'guardados_24h',(select count(*) from public.farms where updated_at>clock_timestamp()-interval '24 hours'),
   'compras_conservadas',(select count(*) from golden_internal.alpha_entitlements));
 elsif p_vista='cuentas' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (
   select f.user_id,f.name,f.updated_at,
    case when jsonb_typeof(f.data->'level')='number' then (f.data->>'level')::numeric else 1 end nivel,
    case when jsonb_typeof(f.data->'plata')='number' then (f.data->>'plata')::numeric else 0 end plata,
    case when jsonb_typeof(f.data->'golden')='number' then (f.data->>'golden')::numeric else 0 end golden,
    w.address wallet,coalesce(w.paid_remaining,0) golden_pagado,
    case when jsonb_typeof(f.data#>'{produccion,vipHasta}')='number' then (f.data#>>'{produccion,vipHasta}')::numeric else 0 end vip_hasta,
    (select count(*) from golden_internal.alpha_entitlements e where e.user_id=f.user_id) compras_conservadas
   from public.farms f left join golden_internal.usdt_wallets w on w.user_id=f.user_id
   where needle='' or position(lower(needle) in lower(coalesce(f.name,'')||' '||f.user_id::text||' '||coalesce(w.address,'')))>0
   order by f.user_id limit 26 offset skip) r;
 elsif p_vista='depositos' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (
   select d.user_id,f.name,d.tx,d.golden,d.address,d.block_number,d.block_hash,d.created_at
   from golden_internal.usdt_deposits d left join public.farms f on f.user_id=d.user_id
   where needle='' or position(lower(needle) in lower(d.tx||' '||d.user_id::text||' '||d.address||' '||coalesce(f.name,'')))>0
   order by d.created_at desc,d.tx limit 26 offset skip) r;
 elsif p_vista='incidencias' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (
   select i.*,f.name from golden_internal.usdt_intentos i left join public.farms f on f.user_id=i.user_id
   where needle='' or position(lower(needle) in lower(i.tx||' '||i.user_id::text||' '||coalesce(f.name,'')||' '||i.state))>0
   order by i.resolved,i.updated_at desc,i.user_id,i.tx limit 26 offset skip) r;
 elsif p_vista='auditoria' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (
   select a.id,a.actor,f.name,a.action,a.target,a.detail,a.created_at
   from golden_internal.equipo_auditoria a left join public.farms f on f.user_id=a.actor
   order by a.id desc limit 26 offset skip) r;
 else return jsonb_build_object('error','Vista no permitida');end if;
 return jsonb_build_object('ok',true,'role',rol,'at',clock_timestamp(),'rows',rows,'page',p_page);
end $$;

create function public.equipo_operar(p_uid uuid,p_action text,p_target uuid default null,p_tx text default null,p_note text default '',p_version timestamptz default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rol text;was_enabled boolean;changed integer;
begin
 select role into rol from golden_internal.equipo_accesos where user_id=p_uid and active;
 if rol is null then return jsonb_build_object('error','No tienes acceso al panel del equipo','denied',true);end if;
 if p_action='pausar' then
  select deposits_enabled into was_enabled from golden_internal.usdt_config where id for update;
  update golden_internal.usdt_config set deposits_enabled=false where id and deposits_enabled;
  if was_enabled then insert into golden_internal.equipo_auditoria(actor,action,detail) values(p_uid,'pausar_depositos','Recargas pausadas; reintentos de recibos existentes conservados');end if;
  return jsonb_build_object('ok',true,'deposits_enabled',false,'changed',was_enabled);
 elsif p_action='resolver' then
  if length(trim(coalesce(p_note,''))) not between 5 and 500 or p_version is null then return jsonb_build_object('error','Añade una nota de 5 a 500 caracteres');end if;
  update golden_internal.usdt_intentos set resolved=true,note=p_note,reviewed_by=p_uid,updated_at=clock_timestamp()
   where user_id=p_target and tx=p_tx and updated_at=p_version and not resolved;
  get diagnostics changed=row_count;
  if changed<>1 then return jsonb_build_object('error','La incidencia cambió; actualiza antes de revisarla','conflict',true);end if;
  insert into golden_internal.equipo_auditoria(actor,action,target,detail) values(p_uid,'revisar_incidencia',p_target::text||':'||p_tx,p_note);
  return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('error','Acción no permitida');
end $$;
revoke all on function public.usdt_intento(uuid,text,text,text),public.equipo_consulta(uuid,text,text,integer),public.equipo_operar(uuid,text,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.usdt_intento(uuid,text,text,text),public.equipo_consulta(uuid,text,text,integer),public.equipo_operar(uuid,text,uuid,text,text,timestamptz) to service_role;
