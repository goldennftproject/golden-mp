-- Ejecutar dentro de una transacción y terminar con ROLLBACK.
-- No deja cambios en las dos cuentas usadas como fixtures.
do $$
declare u uuid; otro uuid; t timestamptz; op uuid:=gen_random_uuid(); r jsonb; r2 jsonb; antes jsonb; valor numeric;
begin
  select user_id into u from public.farms order by user_id limit 1;
  select user_id into otro from public.farms order by user_id offset 1 limit 1;
  if otro is null then raise exception 'Se necesitan dos cuentas para QA'; end if;
  update golden_economia.presion set volumen=0,vendido=0,dia=(now() at time zone 'UTC')::date,actualizado=now();
  update golden_economia.comprador set gastado=0,dia=(now() at time zone 'UTC')::date;
  update golden_economia.fracciones set resto=0 where user_id in(u,otro);
  update public.farms set data=jsonb_build_object('plata',100,'golden',20,'level',1,'prestige',0,'buffs','[]'::jsonb,'res',jsonb_build_object('papa',1000,'madera',1000,'tablon',10)),updated_at=clock_timestamp() where user_id in (u,otro);
  select updated_at into t from public.farms where user_id=u;
  r:=public.gf_mercado_vender(u,'papa',10,'plata',0,t,op);
  if (r->>'total')::numeric<=0 then raise exception 'Venta sin precio'; end if;
  select data into antes from public.farms where user_id=u;
  r2:=public.gf_mercado_vender(u,'papa',10,'plata',0,t,op);
  if r<>r2 or (select data from public.farms where user_id=u)<>antes then raise exception 'Reintento duplicó la venta'; end if;
  begin
    perform public.gf_mercado_vender(u,'papa',1,'plata',0,t,gen_random_uuid());
    raise exception 'FALLO: se aceptó una base vieja';
  exception when raise_exception then if sqlerrm not like 'conflicto:%' then raise; end if; end;
  select updated_at into t from public.farms where user_id=otro;
  r2:=public.gf_mercado_vender(otro,'papa',10,'plata',0,t,gen_random_uuid());
  if (r2->>'total')::numeric>(r->>'total')::numeric then raise exception 'La presión no se compartió entre jugadores'; end if;
  select data,updated_at into antes,t from public.farms where user_id=u;
  begin
    perform public.gf_mercado_vender(u,'papa',1,'plata',1000000000,t,gen_random_uuid());
    raise exception 'FALLO: aceptó una cotización peor';
  exception when raise_exception then if sqlerrm not like 'precio:%' then raise; end if; end;
  if (select data from public.farms where user_id=u)<>antes then raise exception 'Precio rechazado consumió inventario'; end if;
  update golden_economia.comprador set gastado=presupuesto where id=1;
  begin
    perform public.gf_mercado_vender(u,'papa',1,'plata',0,t,gen_random_uuid());
    raise exception 'FALLO: excedió el presupuesto';
  exception when raise_exception then if sqlerrm not like 'presupuesto:%' then raise; end if; end;
  if (select data from public.farms where user_id=u)<>antes then raise exception 'Presupuesto agotado consumió inventario'; end if;
  update golden_economia.comprador set gastado=0 where id=1;
  update golden_economia.presion set vendido=400 where item='papa';
  begin
    perform public.gf_mercado_vender(u,'papa',1,'plata',0,t,gen_random_uuid());
    raise exception 'FALLO: excedió la demanda';
  exception when raise_exception then if sqlerrm not like 'demanda:%' then raise; end if; end;
  if (select data from public.farms where user_id=u)<>antes then raise exception 'Demanda agotada consumió inventario'; end if;
  r:=public.gf_mercado_vender(u,'tablon',1,'plata',0,t,gen_random_uuid());
  if (r->>'cobro')::numeric<>36 then raise exception 'Procesado mal cotizado'; end if;
  select updated_at into t from public.farms where user_id=u;
  r:=public.gf_mercado_vender(u,'madera',100,'golden',0,t,gen_random_uuid());
  if (r->>'cobro')::bigint<>floor((r->>'total')::numeric/500) or (r->>'cobro')::bigint<1 then raise exception 'Conversión Golden incorrecta'; end if;
  if (select (data->>'golden')::numeric from public.farms where user_id=u)<>20+(r->>'cobro')::numeric then raise exception 'Golden no acreditado'; end if;
  update golden_economia.comprador set gastado=presupuesto,dia=(now() at time zone 'UTC')::date-1 where id=1;
  update golden_economia.presion set vendido=400,dia=(now() at time zone 'UTC')::date-1 where item='papa';
  select updated_at into t from public.farms where user_id=u;
  r:=public.gf_mercado_vender(u,'papa',1,'plata',0,t,gen_random_uuid());
  if (r->>'disponible')::integer<>399 or (r->>'presupuesto')::numeric<=0 then raise exception 'El día UTC no renovó los límites'; end if;
  if has_function_privilege('authenticated','public.gf_mercado_vender(uuid,text,integer,text,bigint,timestamptz,uuid)','EXECUTE') then raise exception 'RPC privilegiada expuesta a clientes'; end if;
  if has_schema_privilege('authenticated','golden_economia','USAGE') then raise exception 'Datos privados expuestos'; end if;
end $$;
