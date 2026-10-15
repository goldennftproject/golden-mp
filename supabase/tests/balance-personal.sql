-- Siempre BEGIN + ROLLBACK. No deja cambios en partidas, cuotas ni cotizaciones.
do $$
declare u uuid; otro uuid; t timestamptz; r jsonb; c jsonb; op uuid:=gen_random_uuid(); antes jsonb;
begin
 select user_id into u from public.farms order by user_id limit 1;
 select user_id into otro from public.farms order by user_id offset 1 limit 1;
 if otro is null then raise exception 'Faltan dos fixtures'; end if;
 update public.farms set data=jsonb_build_object('plata',100,'golden',20,'level',1,'buffs','[]'::jsonb,'produccion',jsonb_build_object('base',5,'vipHasta',0),'res',jsonb_build_object('papa',1000,'madera',1000,'tablon',100,'maiz',10)),updated_at=clock_timestamp() where user_id in(u,otro);
 delete from golden_economia.cuotas_personales where user_id in(u,otro);
 delete from golden_economia.golden_diario where user_id in(u,otro);
 update golden_economia.presion set volumen=0,actualizado=now();
 update golden_economia.fracciones set resto=0 where user_id in(u,otro);
 update golden_economia.comprador set gastado=presupuesto;
 select updated_at into t from public.farms where user_id=u;
 r:=public.gf_mercado_vender(u,'papa',400,'plata',0,t,op);
 if not (r->>'ok')::boolean then raise exception 'No liquida'; end if;
 select data into antes from public.farms where user_id=u;
 c:=public.gf_mercado_vender(u,'papa',400,'plata',0,t,op);
 if c<>r or (select data from public.farms where user_id=u)<>antes then raise exception 'Reintento duplicó la venta'; end if;
 select updated_at into t from public.farms where user_id=otro;
 r:=public.gf_mercado_vender(otro,'papa',3,'plata',0,t,gen_random_uuid());
 if (r->>'cobro')::integer<3 then raise exception 'El principiante quedó sin venta por otro jugador'; end if;
 select updated_at into t from public.farms where user_id=u;
 begin
 perform public.gf_mercado_vender(u,'papa',1,'plata',0,t,gen_random_uuid());raise exception 'FALLO: excedió cupo propio';
 exception when raise_exception then if sqlerrm not like 'demanda:%' then raise; end if; end;
 r:=public.gf_mercado_vender(u,'madera',397,'plata',0,t,gen_random_uuid());
 c:=public.gf_mercado_cotizar(u);
 if (c->'recursos'->'tablon'->>'disponible')::integer<>1 then raise exception 'Tablón no comparte cuota'; end if;
 if (c->'recursos'->'tablon'->>'volumen')::numeric<396 then raise exception 'Tablón reinicia presión'; end if;
 select updated_at into t from public.farms where user_id=u;
 r:=public.gf_mercado_vender(u,'tablon',1,'plata',0,t,gen_random_uuid());
 select data,updated_at into antes,t from public.farms where user_id=u;
 begin
 perform public.gf_mercado_vender(u,'tablon',1,'plata',0,t,gen_random_uuid());raise exception 'FALLO: la transformación eludió el cupo';
 exception when raise_exception then if sqlerrm not like 'demanda:%' then raise; end if; end;
 if (select data from public.farms where user_id=u)<>antes then raise exception 'Rechazo consumió inventario'; end if;
 r:=public.gf_mercado_vender(u,'maiz',1,'golden',0,t,gen_random_uuid());
 if (r->>'cobro')::integer<>2 then raise exception 'Conversión Golden incorrecta'; end if;
 update golden_economia.golden_diario set valor=5000 where user_id=u;
 select data,updated_at into antes,t from public.farms where user_id=u;
 begin
 perform public.gf_mercado_vender(u,'maiz',1,'golden',0,t,gen_random_uuid());raise exception 'FALLO: excedió Golden personal';
 exception when raise_exception then if sqlerrm not like 'presupuesto:%' then raise; end if; end;
 if (select data from public.farms where user_id=u)<>antes then raise exception 'Rechazo Golden consumió stock'; end if;
 select updated_at into t from public.farms where user_id=otro;
 r:=public.gf_mercado_vender(otro,'maiz',1,'golden',0,t,gen_random_uuid());
 if (r->>'cobro')::integer<1 then raise exception 'Un jugador agotó Golden de otro'; end if;
 select updated_at into t from public.farms where user_id=u;
 r:=public.gf_mercado_vender(u,'maiz',1,'plata',0,t,gen_random_uuid());
 if (r->>'cobro')::integer<1 then raise exception 'Cupo Golden bloqueó las semillas'; end if;
 if has_function_privilege('authenticated','public.gf_mercado_vender(uuid,text,integer,text,bigint,timestamptz,uuid)','EXECUTE') then raise exception 'RPC expuesta'; end if;
 if not exists(select 1 from golden_economia.movimientos where user_id=u and origen='mercado_sistema_golden' and golden>0 and operacion is not null) then raise exception 'Venta Golden sin trazabilidad'; end if;
 if has_table_privilege('authenticated','golden_economia.movimientos','SELECT') then raise exception 'Historial privado expuesto'; end if;
end $$;
