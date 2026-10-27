-- Ejecutar junto con sql/infraestructura-tiendita.sql dentro de BEGIN/ROLLBACK.
do $qa$
declare u uuid; v boolean; t boolean; m boolean; lim integer; i integer; ident bigint; rechazado boolean;
begin
 select user_id into u from public.farms order by user_id limit 1;
 if u is null then raise exception 'Falta cuenta existente para prueba con rollback'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 foreach v in array array[false,true] loop
  foreach t in array array[false,true] loop
   foreach m in array array[false,true] loop
   update public.farms set data=jsonb_set(jsonb_set(data,'{produccion}',coalesce(data->'produccion','{}')||jsonb_build_object('vipHasta',case when v then extract(epoch from statement_timestamp()+interval '1 day')*1000 else 0 end)),'{infraestructura}',jsonb_build_object('v',1,'tienda',t,'mercado',m,'granja',0,'ops','[]'::jsonb)) where user_id=u;
   delete from golden_internal.p2p_quota where user_id=u and day=(statement_timestamp() at time zone 'UTC')::date;
   lim=(case when v then 10 else 1 end)+(case when t then 1 else 0 end);
   for i in 1..lim loop
    select least(-1,coalesce(min(id),0)-1) into ident from public.market;
    insert into public.market(id,seller,seller_name,kind,item,name,qty,price,paid,fee_pct) overriding system value values(ident,u,'QA rollback','res','madera','QA rollback',1,10,false,0);
    if (select fee_pct from public.market where id=ident)<>(case when v then 7 else 10 end)-(case when m then 2 else 0 end) then raise exception 'Comisión alterada'; end if;
   end loop;
   delete from public.market where id=ident;
   rechazado=false;
   begin
    insert into public.market(id,seller,seller_name,kind,item,name,qty,price,paid) overriding system value values(ident,u,'QA rollback','res','madera','QA rollback',1,10,false);
   exception when others then
    if sqlerrm not like 'Cupo P2P diario agotado:%' then raise; end if;
    rechazado=true;
   end;
   if not rechazado then raise exception 'Cuota falló para VIP %, tienda %',v,t; end if;
  end loop;
 end loop;
 end loop;
end;
$qa$;
