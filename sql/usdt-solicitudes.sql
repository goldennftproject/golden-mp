-- No wallet connection: permanent unique amounts, time-bound payment requests.
alter table golden_internal.usdt_deposits alter column golden type numeric(20,6);
alter table golden_internal.usdt_deposits drop constraint usdt_deposits_golden_check;
alter table golden_internal.usdt_deposits add constraint usdt_deposits_golden_check check(golden between 1 and 10001);
create table golden_internal.usdt_orders(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 golden_base integer not null check(golden_base between 1 and 10000),
 amount_wei numeric(78,0) not null unique,
 start_block bigint not null check(start_block>=0),
 scan_block bigint not null,
 next_find_at timestamptz not null default '-infinity',
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '30 minutes',
 tx text unique,
 check(amount_wei>golden_base::numeric*1e18 and amount_wei<golden_base::numeric*1e18+1e16)
);
alter table golden_internal.usdt_orders enable row level security;
revoke all on golden_internal.usdt_orders from public,anon,authenticated;
grant select,insert,update on golden_internal.usdt_orders to service_role;
create index usdt_orders_user_time on golden_internal.usdt_orders(user_id,created_at desc);
create function public.usdt_order(p_uid uuid,p_action text,p_golden integer default null,p_block bigint default null,p_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o golden_internal.usdt_orders; suffix integer; w golden_internal.usdt_wallets;
begin
 if p_action='estado' then
  select * into w from golden_internal.usdt_wallets where user_id=p_uid;
  return jsonb_build_object('ok',true,'deposits',(select deposits_enabled from golden_internal.usdt_config where id),'paid_remaining',coalesce(w.paid_remaining,0),
   'orders',coalesce((select jsonb_agg(to_jsonb(r)) from (select id,golden_base,amount_wei::text,start_block,scan_block,created_at,expires_at,tx,(amount_wei/1e18)::numeric(20,6)::text as amount from golden_internal.usdt_orders where user_id=p_uid order by created_at desc limit 10) r),'[]'),
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

create function public.usdt_credit_order(p_uid uuid,p_base timestamptz,p_id uuid,p_tx text,p_address text,p_block bigint,p_hash text,p_log integer,p_amount numeric,p_time bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o golden_internal.usdt_orders;f public.farms;d golden_internal.usdt_deposits;amount numeric(20,6);
begin
 select * into f from public.farms where user_id=p_uid for update;
 if not found then return jsonb_build_object('error','Guarda primero tu granja');end if;
 select * into d from golden_internal.usdt_deposits where tx=p_tx;
 if found then
  if d.user_id<>p_uid then return jsonb_build_object('error','Transacción ya utilizada');end if;
  return jsonb_build_object('ok',true,'repetido',true,'cobro',d.golden,'data',f.data,'updated_at',f.updated_at);
 end if;
 select * into o from golden_internal.usdt_orders where id=p_id and user_id=p_uid for update;
 if not found then return jsonb_build_object('error','Solicitud no encontrada');end if;
 if o.tx is not null then return jsonb_build_object('error','Esta solicitud ya está pagada. No envíes otro pago.');end if;
 if not coalesce((select deposits_enabled from golden_internal.usdt_config where id),false) then return jsonb_build_object('error','Depósitos cerrados');end if;
 if f.updated_at is distinct from p_base then return jsonb_build_object('error','El guardado cambió; sincroniza antes de acreditar','conflict',true);end if;
 if p_tx is null or p_tx !~ '^0x[0-9a-f]{64}$' or p_address is null or p_address !~ '^0x[0-9a-f]{40}$' or p_hash is null or p_hash !~ '^0x[0-9a-f]{64}$'
  or p_block is null or p_block<=o.start_block or p_log is null or p_log<0 or p_amount is null or p_amount<>o.amount_wei
  or p_time is null or p_time<floor(extract(epoch from o.created_at)) or p_time>floor(extract(epoch from o.expires_at)) then
  return jsonb_build_object('error','El pago no coincide con el importe o el plazo de esta solicitud. Contacta con el equipo sin volver a pagar.');
 end if;
 amount=(o.amount_wei/1e18)::numeric(20,6);
 insert into golden_internal.usdt_wallets(user_id) values(p_uid) on conflict do nothing;
 perform 1 from golden_internal.usdt_wallets where user_id=p_uid for update;
 insert into golden_internal.usdt_deposits(tx,user_id,address,block_number,block_hash,log_index,amount_wei,golden)
  values(p_tx,p_uid,p_address,p_block,p_hash,p_log,p_amount,amount);
 update golden_internal.usdt_orders set tx=p_tx where id=o.id;
 if (select phase from golden_internal.alpha_release where id)='alpha' then
  update golden_internal.usdt_wallets set paid_remaining=paid_remaining+amount where user_id=p_uid;
 end if;
 update public.farms set data=jsonb_set(data,'{golden}',to_jsonb(coalesce((data->>'golden')::numeric,0)+amount)),updated_at=greatest(clock_timestamp(),f.updated_at+interval '1 microsecond') where user_id=p_uid returning * into f;
 return jsonb_build_object('ok',true,'cobro',amount,'data',f.data,'updated_at',f.updated_at);
end $$;
revoke all on function public.usdt_credit_order(uuid,timestamptz,uuid,text,text,bigint,text,integer,numeric,bigint) from public,anon,authenticated;
grant execute on function public.usdt_credit_order(uuid,timestamptz,uuid,text,text,bigint,text,integer,numeric,bigint) to service_role;
