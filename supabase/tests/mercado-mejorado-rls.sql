-- Ejecutar con sql/mejora-mercado.sql dentro de BEGIN/ROLLBACK. No conserva cambios.
select set_config('golden.qa_seller',(select user_id::text from public.farms order by user_id limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('golden.qa_seller'),true);
update public.farms set data=jsonb_set(jsonb_set(data,'{produccion}',coalesce(data->'produccion','{}')||jsonb_build_object('vipHasta',0)),'{infraestructura}',jsonb_build_object('v',1,'tienda',false,'mercado',true,'granja',0,'ops','[]'::jsonb)) where user_id=current_setting('golden.qa_seller')::uuid;
delete from golden_internal.p2p_quota where user_id=current_setting('golden.qa_seller')::uuid and day=(statement_timestamp() at time zone 'UTC')::date;
select set_config('golden.qa_listing',(select least(-1,coalesce(min(id),0)-1)::text from public.market),true);
set local role authenticated;
insert into public.market(id,seller,seller_name,kind,item,name,qty,price,paid,fee_pct) overriding system value values(current_setting('golden.qa_listing')::bigint,auth.uid(),'QA rollback','res','madera','QA rollback',1,10,false,0);
do $qa$ begin
 if (select fee_pct from public.market where id=current_setting('golden.qa_listing')::bigint)<>8 then raise exception 'No aplicó comisión autorizada con RLS'; end if;
 begin
  update public.market set fee_pct=5 where id=current_setting('golden.qa_listing')::bigint;
  raise exception 'FALLO: permitió alterar comisión';
 exception when others then if sqlstate<>'42501' and sqlerrm not like 'No se puede modificar el precio%' then raise; end if;
 end;
end; $qa$;
