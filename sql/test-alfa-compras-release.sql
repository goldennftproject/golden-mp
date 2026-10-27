-- Ejecutar dentro de BEGIN junto a la instalación y terminar con ROLLBACK.
do $$
declare u uuid; d jsonb; before_time timestamptz; after_time timestamptz; result jsonb; n integer; launch timestamptz:='2030-01-01 00:00:00+00';
begin
 if has_table_privilege('anon','golden_internal.alpha_entitlements','INSERT') or has_table_privilege('authenticated','golden_internal.alpha_entitlements','UPDATE') then raise exception 'Ledger accesible al cliente'; end if;
 if has_function_privilege('authenticated','public.alfa_compras(uuid,boolean)','EXECUTE') then raise exception 'RPC privilegiado accesible al cliente'; end if;
 if not has_function_privilege('service_role','public.alfa_compras(uuid,boolean)','EXECUTE') then raise exception 'Falta permiso del servidor'; end if;
 -- Dos ejemplares, mejora máxima y VIP; un restore repetido no duplica ni alarga.
 select jsonb_agg(jsonb_build_object('sku',sku,'units',units)) into result from golden_internal.alpha_items('{"produccion":{"vipHasta":1},"godHand":true,"infraestructura":{"granja":3,"tienda":true},"nfts":{"hacha_abuelo":true},"mejorasPasivas":{"niveles":{"cincel_cantera":2}},"artefactos":{"items":{"cobre":{"desde":1},"cobre:otro":{"desde":2}}}}');
 if jsonb_array_length(result)<>8 then raise exception 'Extracción incompleta: %',result; end if;
 d:=golden_internal.alpha_apply('{"plata":3,"golden":0,"infraestructura":null,"mejorasPasivas":null,"nfts":null,"artefactos":null,"produccion":{"v":1,"vipUnico":1,"base":5}}',result,launch);
 if d#>>'{produccion,vipHasta}' <> '1896048000000' then raise exception 'VIP no dura 30 días desde lanzamiento'; end if;
 if d#>>'{infraestructura,granja}'<>'3' or d#>>'{mejorasPasivas,niveles,cincel_cantera}'<>'2' then raise exception 'Mejoras incompletas'; end if;
 if (select count(*) from jsonb_object_keys(d#>'{artefactos,items}'))<>2 then raise exception 'Se perdieron ejemplares'; end if;
 if golden_internal.alpha_apply(d,result,launch)<>d then raise exception 'Restore no idempotente'; end if;
 if d->>'plata'<>'3' or d->>'golden'<>'0' then raise exception 'Restore emitió moneda'; end if;
 -- Una cuenta QA existente; todas las escrituras siguientes se revierten al terminar.
 select id into u from auth.users where email='surenfxs+guardadoqa20261027@gmail.com';
 if u is null then raise exception 'Falta cuenta QA para prueba transaccional'; end if;
 select data,updated_at into d,before_time from public.farms where user_id=u;
 if d is null then raise exception 'Falta granja QA'; end if;
 select count(*) into n from golden_internal.alpha_entitlements where user_id=u;
 perform public.alfa_compras(u,true);
 if (select updated_at from public.farms where user_id=u)<>before_time then raise exception 'Alpha modificó granja al consultar'; end if;
 update public.farms set data=jsonb_set(d,'{godHand}','true') where user_id=u;
 if not exists(select 1 from golden_internal.alpha_entitlements where user_id=u and sku='godhand') then raise exception 'Compra no registrada atómicamente'; end if;
 update public.farms set data=d where user_id=u;
 if not exists(select 1 from golden_internal.alpha_entitlements where user_id=u and sku='godhand') then raise exception 'Borrar progreso eliminó compra'; end if;
 update golden_internal.alpha_release set phase='release',launch_at=clock_timestamp()-interval '1 hour' where id;
 perform public.alfa_compras(u,true);
 if (select data->'godHand' from public.farms where user_id=u)<>'true'::jsonb then raise exception 'Release no restauró compra'; end if;
 select updated_at into after_time from public.farms where user_id=u;
 perform public.alfa_compras(u,true);
 if (select updated_at from public.farms where user_id=u)<>after_time then raise exception 'Login sin cambios vuelve a escribir'; end if;
end $$;
