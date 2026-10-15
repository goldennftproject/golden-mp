-- Prueba de las policies del mercado instalado. Usa dos cuentas existentes sin modificarlas.
-- Toda la publicación de QA se revierte: no deja filas, cobros, inventarios ni cuentas nuevas.
begin;
set local statement_timeout = '10s';
select set_config('golden.qa_seller', (select user_id::text from public.farms order by user_id limit 1), true);
select set_config('golden.qa_buyer', (select user_id::text from public.farms order by user_id offset 1 limit 1), true);
do $$ begin
  if nullif(current_setting('golden.qa_buyer', true),'') is null then raise exception 'Se necesitan dos cuentas para esta prueba'; end if;
end $$;
with nueva as (
  insert into public.market(id,seller,seller_name,kind,item,name,qty,price,paid)
  overriding system value
  select least(-1,coalesce(min(id),0)-1),current_setting('golden.qa_seller')::uuid,'QA ROLLBACK','res','madera','QA ROLLBACK',1,10,false
  from public.market returning id
) select set_config('golden.qa_listing',(select id::text from nueva),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('golden.qa_seller'),true);
do $$ declare n integer; begin
  begin
    update public.market set price=999 where id=current_setting('golden.qa_listing')::bigint;
    raise exception 'FALLO: el vendedor pudo editar el precio';
  exception when insufficient_privilege then null;
  end;
  update public.market set sold_to=auth.uid() where id=current_setting('golden.qa_listing')::bigint;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FALLO: el vendedor pudo comprarse su publicación'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('golden.qa_buyer'),true);
do $$ declare n integer; begin
  update public.market set sold_to=auth.uid(),sold_at=now() where id=current_setting('golden.qa_listing')::bigint;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'FALLO: el comprador no pudo reservar'; end if;
  update public.market set paid=true where id=current_setting('golden.qa_listing')::bigint;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FALLO: el comprador pudo cobrar al vendedor'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('golden.qa_seller'),true);
do $$ declare n integer; begin
  update public.market set paid=true where id=current_setting('golden.qa_listing')::bigint;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'FALLO: el vendedor no pudo marcar el cobro'; end if;
  update public.market set paid=true where id=current_setting('golden.qa_listing')::bigint;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FALLO: el vendedor pudo marcar cobro de nuevo'; end if;
end $$;
reset role;
rollback;
select 'OK: precio fijo, no autocompra, reserva del comprador, cobro del vendedor una vez; prueba revertida' as resultado;
