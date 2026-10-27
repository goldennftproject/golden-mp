-- Aditivo. NO reinicia granjas, NO activa release, NO habilita USDT.
create schema if not exists golden_internal;
create table golden_internal.alpha_release (
 id boolean primary key default true check(id),
 phase text not null default 'alpha' check(phase in ('alpha','release')),
 launch_at timestamptz,
 check ((phase='alpha' and launch_at is null) or (phase='release' and launch_at is not null))
);
insert into golden_internal.alpha_release(id) values(true);
create table golden_internal.alpha_entitlements (
 user_id uuid not null references auth.users(id) on delete restrict,
 sku text not null check(length(sku) between 1 and 200),
 units integer not null check(units between 1 and 3),
 acquired_at timestamptz not null default transaction_timestamp(),
 origin text not null check(origin in ('estado_previo','compra_validada')),
 primary key(user_id,sku)
);
alter table golden_internal.alpha_release enable row level security;
alter table golden_internal.alpha_entitlements enable row level security;
revoke all on golden_internal.alpha_release,golden_internal.alpha_entitlements from public,anon,authenticated;
grant usage on schema golden_internal to service_role;
grant select,update on golden_internal.alpha_release to service_role;
grant select,insert,update on golden_internal.alpha_entitlements to service_role;

-- Sólo lee campos que ya controla el portero; nunca saldos, niveles ni recursos.
-- La identidad de cada ejemplar incluye su fecha de compra; renovar no pierde el anterior.
create function golden_internal.alpha_items(d jsonb)
returns table(sku text,units integer) language sql immutable security invoker set search_path='' as $$
 select 'vip',1 where coalesce((d#>>'{produccion,vipHasta}')::numeric,0)>0
 union all select 'godhand',1 where d->'godHand'='true'::jsonb
 union all select 'infra.'||k,1 from unnest(array['tienda','godhand','mercado']) k where d#>array['infraestructura',k]='true'::jsonb
 union all select 'infra.granja',least(3,(d#>>'{infraestructura,granja}')::integer) where coalesce((d#>>'{infraestructura,granja}')::integer,0)>0
 union all select 'pasiva.'||k,1 from unnest(array['hacha_abuelo','pico_viejo']) k where d#>array['nfts',k]='true'::jsonb
 union all select 'mejora.'||k,2 from unnest(array['hacha_abuelo','pico_viejo','cincel_cantera']) k where d#>array['mejorasPasivas','niveles',k]='2'::jsonb
 union all select 'objeto.'||split_part(key,':',1)||'.'||md5(key||':'||(value->>'desde')),1
 from jsonb_each(coalesce(d#>'{artefactos,items}','{}'))
 where split_part(key,':',1) in ('cobre','plata','jade','oro','granero','rubi','corona') and coalesce((value->>'desde')::numeric,0)>0
$$;
revoke all on function golden_internal.alpha_items(jsonb) from public,anon,authenticated;
grant execute on function golden_internal.alpha_items(jsonb) to service_role;

create function golden_internal.alpha_capture() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and jsonb_build_array(new.data->'produccion',new.data->'infraestructura',new.data->'nfts',new.data->'mejorasPasivas',new.data->'artefactos',new.data->'godHand')
   is not distinct from jsonb_build_array(old.data->'produccion',old.data->'infraestructura',old.data->'nfts',old.data->'mejorasPasivas',old.data->'artefactos',old.data->'godHand') then return new; end if;
 if TG_OP='UPDATE' and not exists(select * from golden_internal.alpha_items(new.data) except select * from golden_internal.alpha_items(old.data)) then return new; end if;
 if (select phase from golden_internal.alpha_release where id for share) <> 'alpha' then return new; end if;
 insert into golden_internal.alpha_entitlements(user_id,sku,units,origin)
 select new.user_id,i.sku,i.units,'compra_validada' from golden_internal.alpha_items(new.data) i
 on conflict(user_id,sku) do update set units=greatest(alpha_entitlements.units,excluded.units)
 where excluded.units>alpha_entitlements.units;
 return new;
end $$;
revoke all on function golden_internal.alpha_capture() from public,anon,authenticated;
grant execute on function golden_internal.alpha_capture() to service_role;
create trigger alpha_capture after insert or update of data on public.farms for each row execute function golden_internal.alpha_capture();

-- Se preserva el estado que ya aceptó el servidor. No cambia ninguna granja.
insert into golden_internal.alpha_entitlements(user_id,sku,units,origin)
select f.user_id,i.sku,i.units,'estado_previo' from public.farms f cross join lateral golden_internal.alpha_items(f.data) i
on conflict(user_id,sku) do nothing;

create function golden_internal.alpha_apply(d jsonb,items jsonb,launch_at timestamptz)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare r jsonb:=d; e jsonb; k text; model text; item_key text; at_ms bigint:=floor(extract(epoch from launch_at)*1000); vip_ms bigint;
begin
 if launch_at is null then raise exception 'Falta fecha de lanzamiento'; end if;
 for e in select value from jsonb_array_elements(items) loop
  k:=e->>'sku';
  if k='vip' then
   vip_ms:=greatest(coalesce((r#>>'{produccion,vipHasta}')::bigint,0),at_ms+2592000000);
   r:=jsonb_set(r,'{produccion}',coalesce(nullif(r->'produccion','null'::jsonb),'{"v":1,"vipUnico":1,"base":5,"nodos":{},"pausas":{},"vale":0,"valesV":2}')||jsonb_build_object('vipHasta',vip_ms));
  elsif k='godhand' then r:=jsonb_set(r,'{godHand}','true');
  elsif k like 'infra.%' then
   model:=split_part(k,'.',2);
   r:=jsonb_set(r,'{infraestructura}',coalesce(nullif(r->'infraestructura','null'::jsonb),'{"v":1,"tienda":false,"granja":0,"ops":[]}'));
   if model='granja' then r:=jsonb_set(r,array['infraestructura',model],to_jsonb(greatest(coalesce((r#>>'{infraestructura,granja}')::integer,0),(e->>'units')::integer)));
   elsif model in ('tienda','godhand','mercado') then r:=jsonb_set(r,array['infraestructura',model],'true'); end if;
  elsif k like 'pasiva.%' or k like 'mejora.%' then
   model:=split_part(k,'.',2);
   r:=jsonb_set(r,'{nfts}',coalesce(nullif(r->'nfts','null'::jsonb),'{}')||jsonb_build_object(model,true));
   if k like 'mejora.%' then
    r:=jsonb_set(r,'{mejorasPasivas}',coalesce(nullif(r->'mejorasPasivas','null'::jsonb),'{"v":1,"niveles":{},"ops":[]}'));
    r:=jsonb_set(r,'{mejorasPasivas,niveles}',coalesce(nullif(r#>'{mejorasPasivas,niveles}','null'::jsonb),'{}')||jsonb_build_object(model,2));
   end if;
  elsif k like 'objeto.%' then
   model:=split_part(k,'.',2);item_key:=model||':alpha-'||split_part(k,'.',3);
   r:=jsonb_set(r,'{artefactos}',coalesce(nullif(r->'artefactos','null'::jsonb),'{"v":1,"items":{},"ops":[]}'));
   if r#>array['artefactos','items',item_key] is null then
    r:=jsonb_set(r,'{artefactos,items}',coalesce(nullif(r#>'{artefactos,items}','null'::jsonb),'{}')||jsonb_build_object(item_key,jsonb_build_object('desde',at_ms,'cobrado',at_ms,'resto',0,'moneda','plata-v2')));
   end if;
  end if;
 end loop;
 return r;
end $$;
revoke all on function golden_internal.alpha_apply(jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function golden_internal.alpha_apply(jsonb,jsonb,timestamptz) to service_role;

create function public.alfa_compras(p_uid uuid,p_restaurar boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg golden_internal.alpha_release; items jsonb; f public.farms; restored jsonb;
begin
 select * into strict cfg from golden_internal.alpha_release where id for share;
 select coalesce(jsonb_agg(jsonb_build_object('sku',sku,'units',units) order by sku),'[]') into items from golden_internal.alpha_entitlements where user_id=p_uid;
 if p_restaurar and cfg.phase='release' and cfg.launch_at<=clock_timestamp() and jsonb_array_length(items)>0 then
  select * into f from public.farms where user_id=p_uid for update;
  if found then
   restored:=golden_internal.alpha_apply(f.data,items,cfg.launch_at);
   if restored is distinct from f.data then
    update public.farms set data=restored,updated_at=greatest(clock_timestamp(),f.updated_at+interval '1 millisecond') where user_id=p_uid;
   end if;
  end if;
 end if;
 return jsonb_build_object('ok',true,'phase',cfg.phase,'launch_at',cfg.launch_at,'vip_release_dias',30,'compras',items,'usdt',false);
end $$;
revoke all on function public.alfa_compras(uuid,boolean) from public,anon,authenticated;
grant execute on function public.alfa_compras(uuid,boolean) to service_role;
