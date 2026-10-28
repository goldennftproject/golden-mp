-- Prueba transaccional con identidades ficticias. Siempre ROLLBACK.
begin;
do $$ declare a uuid:=gen_random_uuid();d uuid:=gen_random_uuid();x uuid:=gen_random_uuid();begin
 perform set_config('golden_test.admin',a::text,true);perform set_config('golden_test.dev',d::text,true);perform set_config('golden_test.player',x::text,true);
 insert into auth.users(id) values(a),(d),(x);
 insert into golden_internal.equipo_accesos(user_id,role) values(a,'admin'),(d,'dev');
 insert into public.farms(user_id,name,data,updated_at) values(x,'<img src=x onerror=alert(1)>','{"level":3,"golden":2,"plata":20}',clock_timestamp());
end $$;
set local role service_role;
do $$ declare a uuid:=current_setting('golden_test.admin')::uuid;d uuid:=current_setting('golden_test.dev')::uuid;x uuid:=current_setting('golden_test.player')::uuid;j jsonb;v timestamptz;testtx text:='0x'||repeat('f',64);begin
 assert public.equipo_consulta(a,'acceso')->>'role'='admin';
 assert public.equipo_consulta(d,'acceso')->>'role'='dev';
 assert public.equipo_consulta(x,'resumen')->>'denied'='true';
 assert public.equipo_operar(x,'pausar')->>'denied'='true';
 assert public.equipo_consulta(d,'resumen')->>'ok'='true';
 j:=public.equipo_consulta(a,'cuentas','<img');assert jsonb_array_length(j->'rows')=1;
 assert not ((j->'rows'->0)?'data');assert not ((j->'rows'->0)?'email');
 assert public.equipo_consulta(a,'cuentas','',-1)->>'error'='Página inválida';
 perform public.usdt_intento(x,testtx,'pendiente','Esperando finalidad');
 j:=public.equipo_consulta(a,'incidencias',testtx);assert jsonb_array_length(j->'rows')=1;
 v:=(j#>>'{rows,0,updated_at}')::timestamptz;
 assert public.equipo_operar(d,'resolver',x,testtx,'Revisado sin alterar fondos',v+interval '1 second')->>'conflict'='true';
 assert public.equipo_operar(d,'resolver',x,testtx,'Revisado sin alterar fondos',v)->>'ok'='true';
 assert (select resolved from golden_internal.usdt_intentos where user_id=x and tx=testtx);
 update golden_internal.usdt_config set deposits_enabled=true;
 assert public.equipo_operar(a,'pausar')->>'changed'='true';
 assert public.equipo_operar(a,'pausar')->>'changed'='false';
 j:=public.equipo_consulta(a,'auditoria');assert jsonb_array_length(j->'rows')>=2;
 assert (select count(*)=2 from golden_internal.equipo_auditoria where actor in (a,d));
 assert (select (data->>'golden')::int=2 from public.farms where user_id=x);
 assert (select deposits_enabled=false from golden_internal.usdt_config where id);
 assert not has_table_privilege('service_role','auth.users','SELECT');
end $$;
rollback;
