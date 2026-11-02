-- Sólo vinculación de identidad. No concede permisos, saldos ni ventajas.
create table golden_internal.discord_links (
 user_id uuid primary key references auth.users(id) on delete cascade,
 discord_id text not null unique check(discord_id ~ '^[0-9]{17,20}$'),
 discord_name text not null check(length(discord_name) between 1 and 80),
 linked_at timestamptz not null default now()
);
create table golden_internal.discord_challenges (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '10 minutes',
 discord_id text check(discord_id ~ '^[0-9]{17,20}$'),
 discord_name text
);
alter table golden_internal.discord_links enable row level security;
alter table golden_internal.discord_challenges enable row level security;
revoke all on golden_internal.discord_links,golden_internal.discord_challenges from public,anon,authenticated;
grant select,insert,update,delete on golden_internal.discord_links,golden_internal.discord_challenges to service_role;

create function public.discord_link_action(p_user uuid,p_action text,p_hash text default null,p_discord text default null,p_name text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l golden_internal.discord_links; c golden_internal.discord_challenges; eligible boolean;
begin
 if p_action='claim' then
  select * into c from golden_internal.discord_challenges where code_hash=p_hash for update;
  if not found or c.expires_at<=now() then raise exception 'Código inválido o caducado'; end if;
  if p_discord !~ '^[0-9]{17,20}$' or p_discord is null or p_name is null or length(p_name) not between 1 and 80 then raise exception 'Identidad de Discord inválida'; end if;
  if c.discord_id is not null and c.discord_id<>p_discord then raise exception 'Código ya presentado; genera uno nuevo en el juego'; end if;
  if exists(select 1 from golden_internal.discord_links where discord_id=p_discord and user_id<>c.user_id) then raise exception 'Este Discord ya está vinculado'; end if;
  update golden_internal.discord_challenges set discord_id=p_discord,discord_name=p_name where user_id=c.user_id;
  return jsonb_build_object('ok',true,'pending',true);
 end if;
 if p_user is null then raise exception 'Sesión verificada requerida'; end if;
 -- Serializa generación y confirmación por cuenta, incluso desde varias pestañas.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,721));
 select * into l from golden_internal.discord_links where user_id=p_user;
 if l.user_id is not null then
  select exists(select 1 from golden_internal.usdt_deposits where user_id=p_user) into eligible;
  return jsonb_build_object('ok',true,'linked',true,'name',l.discord_name,'founder_eligible',eligible);
 end if;
 if p_action='create' then
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Código inválido'; end if;
  if exists(select 1 from golden_internal.discord_challenges where user_id=p_user and created_at>now()-interval '30 seconds') then raise exception 'Espera 30 segundos antes de generar otro código'; end if;
  insert into golden_internal.discord_challenges(user_id,code_hash) values(p_user,p_hash)
   on conflict(user_id) do update set code_hash=excluded.code_hash,created_at=now(),expires_at=now()+interval '10 minutes',discord_id=null,discord_name=null;
 end if;
 select * into c from golden_internal.discord_challenges where user_id=p_user for update;
 if p_action='confirm' then
  if c.user_id is null or c.expires_at<=now() or c.discord_id is null then raise exception 'Confirma primero el código con el bot de Discord'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(c.discord_id,722));
  if exists(select 1 from golden_internal.discord_links where discord_id=c.discord_id) then raise exception 'Este Discord ya está vinculado'; end if;
  insert into golden_internal.discord_links(user_id,discord_id,discord_name) values(p_user,c.discord_id,c.discord_name);
  delete from golden_internal.discord_challenges where user_id=p_user;
  select exists(select 1 from golden_internal.usdt_deposits where user_id=p_user) into eligible;
  return jsonb_build_object('ok',true,'linked',true,'name',c.discord_name,'founder_eligible',eligible);
 end if;
 if p_action not in ('state','create') then raise exception 'Acción no disponible'; end if;
 return jsonb_build_object('ok',true,'linked',false,'pending',c.expires_at>now() and c.discord_id is not null,'name',case when c.expires_at>now() then c.discord_name end,'expires_at',case when c.expires_at>now() then c.expires_at end);
end $$;
revoke all on function public.discord_link_action(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.discord_link_action(uuid,text,text,text,text) to service_role;
