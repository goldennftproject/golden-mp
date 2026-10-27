-- Protecciones aditivas. No activa lanzamiento ni modifica las granjas.
create function golden_internal.alpha_release_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='DELETE' then raise exception 'No borrar la configuración de compras de alfa'; end if;
 if old.phase='release' and old.launch_at<=clock_timestamp() and (new.phase is distinct from old.phase or new.launch_at is distinct from old.launch_at) then
  raise exception 'El lanzamiento ya comenzó: su fecha y fase no pueden cambiarse';
 end if;
 return new;
end $$;
revoke all on function golden_internal.alpha_release_guard() from public,anon,authenticated;
grant execute on function golden_internal.alpha_release_guard() to service_role;
create trigger alpha_release_guard before update or delete on golden_internal.alpha_release for each row execute function golden_internal.alpha_release_guard();

create or replace function golden_internal.alpha_items_base(d jsonb)
returns table(sku text,units integer) language sql immutable security invoker set search_path='' as $$
 select 'vip',1 where coalesce((d#>>'{produccion,vipHasta}')::numeric,0)>0
 union all select 'godhand',1 where d->'godHand'='true'::jsonb
 union all select 'infra.'||k,1 from unnest(array['tienda','godhand','mercado']) k where d#>array['infraestructura',k]='true'::jsonb
 union all select 'infra.granja',least(3,(d#>>'{infraestructura,granja}')::integer) where coalesce((d#>>'{infraestructura,granja}')::integer,0)>0
 union all select 'pasiva.'||k,1 from unnest(array['hacha_abuelo','pico_viejo']) k where d#>array['nfts',k]='true'::jsonb
 union all select 'mejora.'||k,2 from unnest(array['hacha_abuelo','pico_viejo','cincel_cantera']) k where d#>array['mejorasPasivas','niveles',k]='2'::jsonb
 union all select 'objeto.'||split_part(key,':',1)||'.'||md5(key||':'||(value->>'desde')),1
 from jsonb_each(coalesce(nullif(d#>'{artefactos,items}','null'::jsonb),'{}'))
 where split_part(key,':',1) in ('cobre','plata','jade','oro','granero','rubi','corona') and coalesce((value->>'desde')::numeric,0)>0
$$;

create or replace function public.alfa_compras(p_uid uuid,p_restaurar boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg golden_internal.alpha_release; items jsonb; f public.farms; restored jsonb;
begin
 select * into strict cfg from golden_internal.alpha_release where id for share;
 select coalesce(jsonb_agg(jsonb_build_object('sku',sku,'units',units) order by sku),'[]') into items from golden_internal.alpha_entitlements where user_id=p_uid;
 if p_restaurar and cfg.phase='release' and cfg.launch_at<=clock_timestamp() and jsonb_array_length(items)>0 then
  select * into f from public.farms where user_id=p_uid for update;
  if not found then raise exception 'Falta la granja para restaurar compras; no borrar filas al reiniciar'; end if;
  if found then
   restored:=golden_internal.alpha_apply(f.data,items,cfg.launch_at);
   if restored is distinct from f.data then
    update public.farms set data=restored,updated_at=greatest(clock_timestamp(),f.updated_at+interval '1 millisecond') where user_id=p_uid;
   end if;
  end if;
 end if;
 return jsonb_build_object('ok',true,'phase',cfg.phase,'launch_at',cfg.launch_at,'vip_release_dias',30,'compras',items,'usdt',false);
end $$;
