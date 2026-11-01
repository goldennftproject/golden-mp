-- Durable verified receipt, independent from farm save/CAS.
alter table golden_internal.usdt_orders
 add column verified_tx text unique,
 add column verified_address text,
 add column verified_block bigint,
 add column verified_hash text,
 add column verified_log integer,
 add column verified_time bigint,
 add column verified_at timestamptz,
 add constraint usdt_order_verified_complete check(
  (verified_tx is null and verified_address is null and verified_block is null and verified_hash is null and verified_log is null and verified_time is null and verified_at is null)
  or (verified_tx is not null and verified_address is not null and verified_block is not null and verified_hash is not null and verified_log is not null and verified_time is not null and verified_tx ~ '^0x[0-9a-f]{64}$' and verified_address ~ '^0x[0-9a-f]{40}$'
   and verified_block>start_block and verified_hash ~ '^0x[0-9a-f]{64}$' and verified_log>=0
   and verified_time>=floor(extract(epoch from created_at)) and verified_time<=floor(extract(epoch from expires_at)) and verified_at is not null)
 );
create function public.usdt_prepare_order(p_uid uuid,p_id uuid,p_tx text,p_address text,p_block bigint,p_hash text,p_log integer,p_amount numeric,p_time bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o golden_internal.usdt_orders; owner_id uuid;
begin
 select * into o from golden_internal.usdt_orders where id=p_id and user_id=p_uid for update;
 if not found then return jsonb_build_object('error','Solicitud no encontrada en tu cuenta');end if;
 if o.tx is not null then
  if o.tx is distinct from p_tx then return jsonb_build_object('error','La solicitud ya tiene otro pago acreditado');end if;
  return jsonb_build_object('ok',true,'verified',true,'credited',true,'tx',o.tx);
 end if;
 if o.verified_tx is not null then
  if o.verified_tx is distinct from p_tx then return jsonb_build_object('error','La solicitud ya tiene otro pago confirmado');end if;
  return jsonb_build_object('ok',true,'verified',true,'tx',o.verified_tx,'amount',(o.amount_wei/1e18)::numeric(20,6)::text);
 end if;
 if not coalesce((select deposits_enabled from golden_internal.usdt_config where id),false) then return jsonb_build_object('error','Depósitos cerrados');end if;
 select user_id into owner_id from golden_internal.usdt_deposits where tx=p_tx;
 if found then return jsonb_build_object('error','La transacción ya está registrada');end if;
 if p_tx is null or p_tx !~ '^0x[0-9a-f]{64}$' or p_address is null or p_address !~ '^0x[0-9a-f]{40}$'
  or p_hash is null or p_hash !~ '^0x[0-9a-f]{64}$' or p_block is null or p_block<=o.start_block
  or p_log is null or p_log<0 or p_amount is null or p_amount<>o.amount_wei
  or p_time is null or p_time<floor(extract(epoch from o.created_at)) or p_time>floor(extract(epoch from o.expires_at)) then
  return jsonb_build_object('error','El pago no coincide con el importe o el plazo de la solicitud');
 end if;
 begin
  update golden_internal.usdt_orders set verified_tx=p_tx,verified_address=p_address,verified_block=p_block,verified_hash=p_hash,verified_log=p_log,verified_time=p_time,verified_at=clock_timestamp() where id=o.id;
 exception when unique_violation then return jsonb_build_object('error','Esta transacción ya pertenece a otra solicitud');end;
 return jsonb_build_object('ok',true,'verified',true,'tx',p_tx,'amount',(o.amount_wei/1e18)::numeric(20,6)::text);
end $$;
revoke all on function public.usdt_prepare_order(uuid,uuid,text,text,bigint,text,integer,numeric,bigint) from public,anon,authenticated;
grant execute on function public.usdt_prepare_order(uuid,uuid,text,text,bigint,text,integer,numeric,bigint) to service_role;

create or replace function public.usdt_order(p_uid uuid,p_action text,p_golden integer default null,p_block bigint default null,p_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o golden_internal.usdt_orders; suffix integer; w golden_internal.usdt_wallets;
begin
 if p_action='estado' then
  select * into w from golden_internal.usdt_wallets where user_id=p_uid;
  return jsonb_build_object('ok',true,'deposits',(select deposits_enabled from golden_internal.usdt_config where id),'paid_remaining',coalesce(w.paid_remaining,0),
   'orders',coalesce((select jsonb_agg(to_jsonb(r)) from (select id,golden_base,amount_wei::text,start_block,scan_block,created_at,expires_at,tx,verified_tx,verified_at,(amount_wei/1e18)::numeric(20,6)::text as amount from golden_internal.usdt_orders where user_id=p_uid order by (verified_tx is not null and tx is null) desc,created_at desc limit 10) r),'[]'),
   'history',coalesce((select jsonb_agg(to_jsonb(r)) from (select tx,golden,created_at from golden_internal.usdt_deposits where user_id=p_uid order by created_at desc limit 20) r),'[]'));
 end if;
 if p_action='create' then
  if not coalesce((select deposits_enabled from golden_internal.usdt_config where id),false) then return jsonb_build_object('error','Depósitos cerrados. No envíes fondos.');end if;
  if p_golden is null or p_golden<1 or p_golden>10000 or p_block is null or p_block<1 then return jsonb_build_object('error','Importe no válido');end if;
  if not exists(select 1 from public.farms where user_id=p_uid) then return jsonb_build_object('error','Guarda primero tu granja');end if;
  perform pg_catalog.pg_advisory_xact_lock(734852,1);
  select * into o from golden_internal.usdt_orders where user_id=p_uid and tx is null and expires_at>clock_timestamp() order by created_at desc limit 1;
  if found then return jsonb_build_object('ok',true,'order',to_jsonb(o)||jsonb_build_object('amount_wei',o.amount_wei::text,'amount',(o.amount_wei/1e18)::numeric(20,6)::text));end if;
  select n into suffix from generate_series(1,9999) n where not exists(select 1 from golden_internal.usdt_orders where amount_wei=p_golden::numeric*1e18+n::numeric*1e12) order by n limit 1;
  if suffix is null then return jsonb_build_object('error','No quedan importes disponibles para esta cantidad. Elige otra.');end if;
  insert into golden_internal.usdt_orders(user_id,golden_base,amount_wei,start_block,scan_block)
   values(p_uid,p_golden,p_golden::numeric*1e18+suffix::numeric*1e12,p_block,p_block) returning * into o;
 elsif p_action in('get','check','find_check','advance') then
  select * into o from golden_internal.usdt_orders where user_id=p_uid and id=p_id for update;
  if not found then return jsonb_build_object('error','Solicitud no encontrada en tu cuenta');end if;
  if p_action='find_check' then
   if o.next_find_at>clock_timestamp() then return jsonb_build_object('error','Espera 10 segundos antes de volver a buscar');end if;
   update golden_internal.usdt_orders set next_find_at=clock_timestamp()+interval '10 seconds' where id=o.id;
  elsif p_action='check' then
   insert into golden_internal.usdt_wallets(user_id) values(p_uid) on conflict do nothing;
   select * into w from golden_internal.usdt_wallets where user_id=p_uid for update;
   if w.next_check_at>clock_timestamp() then return jsonb_build_object('error','Espera 10 segundos antes de comprobar otra vez');end if;
   update golden_internal.usdt_wallets set next_check_at=clock_timestamp()+interval '10 seconds' where user_id=p_uid;
  elsif p_action='advance' and p_block is not null then
   update golden_internal.usdt_orders set scan_block=greatest(scan_block,p_block) where id=o.id returning * into o;
  end if;
 else return jsonb_build_object('error','Acción no permitida');end if;
 return jsonb_build_object('ok',true,'order',to_jsonb(o)||jsonb_build_object('amount_wei',o.amount_wei::text,'amount',(o.amount_wei/1e18)::numeric(20,6)::text));
end $$;
revoke all on function public.usdt_order(uuid,text,integer,bigint,uuid) from public,anon,authenticated;
grant execute on function public.usdt_order(uuid,text,integer,bigint,uuid) to service_role;

