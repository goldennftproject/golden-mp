-- Los adornos premium se conservan en la bolsa; nunca reocupan terreno automáticamente.
alter table golden_internal.alpha_entitlements drop constraint alpha_entitlements_units_check;
alter table golden_internal.alpha_entitlements add constraint alpha_entitlements_units_check check(units between 1 and 1000000);
alter function golden_internal.alpha_items(jsonb) rename to alpha_items_base;
create function golden_internal.alpha_deco_total(d jsonb,k text) returns integer language sql immutable security invoker set search_path='' as $$
 select coalesce((d#>>array['decoBolsa',k])::integer,0)+(select count(*)::integer from jsonb_array_elements(coalesce(nullif(d->'decos','null'::jsonb),'[]')) x where x->>'id'=k)
$$;
create function golden_internal.alpha_items(d jsonb) returns table(sku text,units integer) language sql immutable security invoker set search_path='' as $$
 select * from golden_internal.alpha_items_base(d)
 union all select 'adorno.'||k,golden_internal.alpha_deco_total(d,k) from unnest(array['estatua','arbolito']) k where golden_internal.alpha_deco_total(d,k)>0
$$;
create or replace function golden_internal.alpha_capture() returns trigger language plpgsql security invoker set search_path='' as $$
declare k text; delta integer;
begin
 if TG_OP='UPDATE' and not exists(select * from golden_internal.alpha_items(new.data) except select * from golden_internal.alpha_items(old.data)) then return new; end if;
 if (select phase from golden_internal.alpha_release where id for share)<>'alpha' then return new; end if;
 insert into golden_internal.alpha_entitlements(user_id,sku,units,origin)
 select new.user_id,i.sku,i.units,'compra_validada' from golden_internal.alpha_items(new.data) i where i.sku not like 'adorno.%'
 on conflict(user_id,sku) do update set units=greatest(alpha_entitlements.units,excluded.units) where excluded.units>alpha_entitlements.units;
 foreach k in array array['estatua','arbolito'] loop
  delta:=golden_internal.alpha_deco_total(new.data,k)-case when TG_OP='INSERT' then 0 else golden_internal.alpha_deco_total(old.data,k) end;
  if delta>0 then
   insert into golden_internal.alpha_entitlements(user_id,sku,units,origin) values(new.user_id,'adorno.'||k,delta,'compra_validada')
   on conflict(user_id,sku) do update set units=alpha_entitlements.units+excluded.units;
  end if;
 end loop;
 return new;
end $$;
insert into golden_internal.alpha_entitlements(user_id,sku,units,origin)
select f.user_id,i.sku,i.units,'estado_previo' from public.farms f cross join lateral golden_internal.alpha_items(f.data) i where i.sku like 'adorno.%'
on conflict(user_id,sku) do nothing;
alter function golden_internal.alpha_apply(jsonb,jsonb,timestamptz) rename to alpha_apply_base;
create function golden_internal.alpha_apply(d jsonb,items jsonb,launch_at timestamptz) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare r jsonb; e jsonb; k text; missing integer;
begin
 r:=golden_internal.alpha_apply_base(d,coalesce((select jsonb_agg(j.value) from jsonb_array_elements(items) j(value) where j.value->>'sku' not like 'adorno.%'),'[]'),launch_at);
 for e in select value from jsonb_array_elements(items) where value->>'sku' like 'adorno.%' loop
  k:=split_part(e->>'sku','.',2);missing:=(e->>'units')::integer-golden_internal.alpha_deco_total(r,k);
  if missing>0 then r:=jsonb_set(r,'{decoBolsa}',coalesce(nullif(r->'decoBolsa','null'::jsonb),'{}')||jsonb_build_object(k,coalesce((r#>>array['decoBolsa',k])::integer,0)+missing)); end if;
 end loop;
 return r;
end $$;
revoke all on function golden_internal.alpha_items(jsonb),golden_internal.alpha_deco_total(jsonb,text),golden_internal.alpha_apply(jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function golden_internal.alpha_items(jsonb),golden_internal.alpha_deco_total(jsonb,text),golden_internal.alpha_apply(jsonb,jsonb,timestamptz) to service_role;
