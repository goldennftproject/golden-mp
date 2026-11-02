begin;
do $test$
declare u uuid:=gen_random_uuid();other_u uuid:=gen_random_uuid();before_row public.farms;after_row public.farms;
 before_rank jsonb;r jsonb;ledger_before bigint;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(u,'profile-qa-'||u||'@example.invalid',now(),false),(other_u,'profile-qa-'||other_u||'@example.invalid',now(),false);
 insert into public.farms(user_id,name,data,mercado_ack) values
 (u,'Nombre viejo','{"level":4,"plata":13,"golden":7.000002,"expansiones":2,"res":{"madera":7},"energiaGranja":{"actual":12.5,"at":100},"produccion":{"vipHasta":9999999999999},"skills":{"farming":180},"expObra":{"i":2,"hasta":9999999999999}}','{"marker":"keep"}'),
 (other_u,'Otra granja','{"level":1,"plata":3,"golden":0}',null);
 insert into golden_internal.discord_links(user_id,discord_id,discord_name) values(u,'1999999999999999998','Perfil (@perfil)');
 select * into before_row from public.farms where user_id=u;
 before_rank:=public.ranking_granja_alfa(u)->'yo';
 select count(*) into ledger_before from golden_economia.movimientos where user_id=u;
 execute 'set local role service_role';
 r:=public.farm_profile(u,'state');assert r->>'name'='Nombre viejo';assert (r->>'discord_linked')::boolean;
 r:=public.farm_profile(u,'rename','Granja José');assert r->>'name'='Granja José';
 select * into after_row from public.farms where user_id=u;
 assert after_row.data=before_row.data and after_row.updated_at=before_row.updated_at and after_row.mercado_ack=before_row.mercado_ack,'rename changed save or CAS';
 assert ((public.ranking_granja_alfa(u)->'yo')-'nombre')=(before_rank-'nombre'),'rename changed position, XP or level';
 assert (select name='Otra granja' from public.farms where user_id=other_u),'another account changed';
 assert (select discord_name='Perfil (@perfil)' from golden_internal.discord_links where user_id=u),'Discord changed';
 assert (select count(*)=ledger_before from golden_economia.movimientos where user_id=u),'economic movement created';
 begin perform public.farm_profile(u,'rename','<script>');raise exception 'test invalid name failed';exception when raise_exception then if sqlerrm='test invalid name failed' then raise;end if;end;
 begin perform public.farm_profile(u,'rename',repeat('a',25));raise exception 'test length failed';exception when raise_exception then if sqlerrm='test length failed' then raise;end if;end;
 r:=public.farm_profile(u,'rename','Granja José');assert r->>'name'='Granja José','retry failed';
 -- Una pestaña anterior puede guardar progreso sin revertir el nombre.
 update public.farms set name='Nombre viejo',data=jsonb_set(data,'{res,madera}','9') where user_id=u and updated_at=before_row.updated_at;
 assert found,'rename invalidated save version';
 assert (select name='Granja José' and data#>>'{res,madera}'='9' from public.farms where user_id=u),'stale client reverted name or lost progress';
 assert not has_function_privilege('authenticated','public.farm_profile(uuid,text,text)','execute');
 assert not has_table_privilege('authenticated','golden_internal.farm_profiles','update');
end $test$;
rollback;
select jsonb_build_object('fixtures',(select count(*) from auth.users where email like 'profile-qa-%@example.invalid'),'profiles',(select count(*) from golden_internal.farm_profiles),'players',(select count(*) from auth.users),'deposits',(select count(*) from golden_internal.usdt_deposits)) as preservation;
