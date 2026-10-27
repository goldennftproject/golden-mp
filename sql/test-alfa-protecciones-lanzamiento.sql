-- Ejecutar en transacción y terminar con ROLLBACK. Sólo usa una cuenta QA.
do $$
declare u uuid; f public.farms; blocked boolean; items jsonb;
begin
 select jsonb_agg(to_jsonb(i)) into items from golden_internal.alpha_items('{"artefactos":{"items":null}}') i;
 if items is not null then raise exception 'Items null produjo compras'; end if;
 select id into strict u from auth.users where email='surenfxs+guardadoqa20261027@gmail.com';
 select * into strict f from public.farms where user_id=u;
 update public.farms set data=jsonb_set(data,'{godHand}','true') where user_id=u;
 update golden_internal.alpha_release set phase='release',launch_at=clock_timestamp()-interval '1 hour' where id;
 blocked:=false;
 begin update golden_internal.alpha_release set launch_at=clock_timestamp() where id; exception when others then blocked:=position('lanzamiento ya comenzó' in SQLERRM)>0; end;
 if not blocked then raise exception 'Se pudo mover la fecha activa'; end if;
 blocked:=false;
 begin update golden_internal.alpha_release set phase='alpha',launch_at=null where id; exception when others then blocked:=position('lanzamiento ya comenzó' in SQLERRM)>0; end;
 if not blocked then raise exception 'Se pudo reabrir alfa tras el lanzamiento'; end if;
 blocked:=false;
 begin delete from golden_internal.alpha_release where id; exception when others then blocked:=position('No borrar' in SQLERRM)>0; end;
 if not blocked then raise exception 'Se borró la configuración'; end if;
 delete from public.farms where user_id=u;
 blocked:=false;
 begin perform public.alfa_compras(u,true); exception when others then blocked:=position('Falta la granja' in SQLERRM)>0; end;
 if not blocked then raise exception 'Restauración sin granja dio éxito'; end if;
 insert into public.farms select (f).*;
 perform public.alfa_compras(u,true);
 if (select data->'godHand' from public.farms where user_id=u)<>'true'::jsonb then raise exception 'Recuperación posterior falló'; end if;
end $$;
