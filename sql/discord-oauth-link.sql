-- Sólo vincula el perfil probado por Discord; no crea ni cambia cuentas de Auth o granjas.
create or replace function public.discord_oauth_link(p_user uuid,p_discord text,p_name text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l golden_internal.discord_links; eligible boolean;
begin
 if p_user is null then raise exception 'Sesión verificada requerida'; end if;
 if p_discord is null or p_discord !~ '^[0-9]{17,20}$' or p_name is null or length(btrim(p_name)) not between 1 and 80 then
  raise exception 'Identidad de Discord inválida';
 end if;
 -- Mismo orden de bloqueo que el flujo histórico; conserva la unicidad entre ambos.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,721));
 select * into l from golden_internal.discord_links where user_id=p_user;
 if l.user_id is not null then
  if l.discord_id<>p_discord then raise exception 'Tu granja ya tiene otro Discord vinculado'; end if;
 else
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_discord,722));
  if exists(select 1 from golden_internal.discord_links where discord_id=p_discord) then raise exception 'Este Discord ya está vinculado a otra granja'; end if;
  insert into golden_internal.discord_links(user_id,discord_id,discord_name) values(p_user,p_discord,p_name);
  delete from golden_internal.discord_challenges where user_id=p_user;
  select * into l from golden_internal.discord_links where user_id=p_user;
 end if;
 select exists(select 1 from golden_internal.usdt_deposits where user_id=p_user) into eligible;
 return jsonb_build_object('ok',true,'linked',true,'name',l.discord_name,'founder_eligible',eligible);
end $$;
revoke all on function public.discord_oauth_link(uuid,text,text) from public,anon,authenticated;
grant execute on function public.discord_oauth_link(uuid,text,text) to service_role;
