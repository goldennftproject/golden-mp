-- El nombre visible está separado del snapshot y de las identidades de cuenta.
create table golden_internal.farm_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(name ~ '^[[:alnum:] ._-]{3,24}$' and name=btrim(name)),
 changed_at timestamptz not null default now()
);
alter table golden_internal.farm_profiles enable row level security;
revoke all on golden_internal.farm_profiles from public,anon,authenticated;
grant select,insert,update on golden_internal.farm_profiles to service_role;

create function golden_internal.preserve_profile_name() returns trigger
language plpgsql security invoker set search_path='' as $$
declare canonical text;
begin
 select name into canonical from golden_internal.farm_profiles where user_id=new.user_id;
 if found then new.name:=canonical; end if;
 return new;
end $$;
revoke all on function golden_internal.preserve_profile_name() from public,anon,authenticated;
create trigger preserve_profile_name before insert or update of name on public.farms
for each row execute function golden_internal.preserve_profile_name();

create function public.farm_profile(p_uid uuid,p_action text,p_name text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.farms; nick text; discord_name text;
begin
 if p_uid is null then raise exception 'Sesión verificada requerida'; end if;
 if p_action not in ('state','rename') then raise exception 'Acción de perfil no válida'; end if;
 if p_action='rename' then
  if p_name is null or p_name !~ '^[[:alnum:] ._-]{3,24}$' or p_name<>btrim(p_name)
    or p_name !~ '[[:alnum:]]' then raise exception 'Usa de 3 a 24 caracteres: letras, números, espacios, punto, guion o guion bajo'; end if;
  select * into f from public.farms where user_id=p_uid for update;
  if not found then raise exception 'Guarda primero tu granja y vuelve a intentarlo'; end if;
  insert into golden_internal.farm_profiles(user_id,name) values(p_uid,p_name)
   on conflict(user_id) do update set name=excluded.name,changed_at=case when farm_profiles.name=excluded.name then farm_profiles.changed_at else now() end;
  -- No se actualizan data, updated_at ni mercado_ack: la base de guardado sigue siendo válida.
  update public.farms set name=p_name where user_id=p_uid;
 else
  select * into f from public.farms where user_id=p_uid;
  if not found then raise exception 'Guarda primero tu granja y vuelve a intentarlo'; end if;
 end if;
 select coalesce(p.name,regexp_replace(f.name,'^([[][^]]*[]][[:space:]]*)+','')) into nick
 from (select 1) x left join golden_internal.farm_profiles p on p.user_id=p_uid;
 select l.discord_name into discord_name from golden_internal.discord_links l where l.user_id=p_uid;
 return jsonb_build_object('ok',true,'name',coalesce(nick,'Granjero'),'discord_linked',discord_name is not null,'discord_name',discord_name);
end $$;
revoke all on function public.farm_profile(uuid,text,text) from public,anon,authenticated;
grant execute on function public.farm_profile(uuid,text,text) to service_role;
