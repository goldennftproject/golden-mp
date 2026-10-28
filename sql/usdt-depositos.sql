-- Sólo el servicio autenticado puede usar estas operaciones. No admite retiros.
create table golden_internal.usdt_config(id boolean primary key default true check(id),deposits_enabled boolean not null default false);
insert into golden_internal.usdt_config(id) values(true);
alter table golden_internal.usdt_config enable row level security;
revoke all on golden_internal.usdt_config from public,anon,authenticated;
grant select on golden_internal.usdt_config to service_role;
create table golden_internal.usdt_wallets (
 user_id uuid primary key references auth.users(id) on delete restrict,
 address text unique check(address ~ '^0x[0-9a-f]{40}$'),
 linked_at timestamptz,start_block bigint check(start_block>=0),
 paid_remaining numeric(20,6) not null default 0 check(paid_remaining>=0),release_restored boolean not null default false,
 nonce uuid,proposed_address text,message text,expires_at timestamptz,
 next_check_at timestamptz not null default '-infinity'
);
create table golden_internal.usdt_deposits (
 tx text primary key check(tx ~ '^0x[0-9a-f]{64}$'),
 user_id uuid not null references auth.users(id) on delete restrict,
 address text not null,block_number bigint not null,block_hash text not null,
 log_index integer not null,amount_wei numeric(78,0) not null,
 golden integer not null check(golden between 1 and 10000),
 created_at timestamptz not null default clock_timestamp(),
 check(amount_wei=golden::numeric*1000000000000000000)
);
alter table golden_internal.usdt_wallets enable row level security;
alter table golden_internal.usdt_deposits enable row level security;
create index usdt_deposits_user_time on golden_internal.usdt_deposits(user_id,created_at desc);
revoke all on golden_internal.usdt_wallets,golden_internal.usdt_deposits from public,anon,authenticated;
grant select,insert,update on golden_internal.usdt_wallets to service_role;
grant select,insert on golden_internal.usdt_deposits to service_role;

create function public.usdt_wallet(p_uid uuid,p_action text,p_address text default null,p_nonce uuid default null,p_block bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w golden_internal.usdt_wallets; n uuid; m text;
begin
 if p_action='receipt' then
  return jsonb_build_object('ok',true,'credited',exists(select 1 from golden_internal.usdt_deposits where user_id=p_uid and tx=p_address));
 end if;
 if p_action='estado' then
  select * into w from golden_internal.usdt_wallets where user_id=p_uid;
  return jsonb_build_object('ok',true,'deposits',(select deposits_enabled from golden_internal.usdt_config where id),'address',w.address,'linked_at',w.linked_at,'start_block',w.start_block,'paid_remaining',coalesce(w.paid_remaining,0),
   'history',coalesce((select jsonb_agg(to_jsonb(r)) from (select tx,golden,created_at from golden_internal.usdt_deposits where user_id=p_uid order by created_at desc limit 20) r),'[]'::jsonb));
 end if;
 insert into golden_internal.usdt_wallets(user_id) values(p_uid) on conflict do nothing;
 select * into w from golden_internal.usdt_wallets where user_id=p_uid for update;
 if p_action='challenge' then
  if w.address is not null then return jsonb_build_object('error','Esta cuenta ya tiene una wallet vinculada');end if;
  if p_address !~ '^0x[0-9a-f]{40}$' or p_address is null then return jsonb_build_object('error','Dirección inválida');end if;
  if w.expires_at>clock_timestamp()+interval '9 minutes 30 seconds' then return jsonb_build_object('error','Espera 30 segundos antes de volver a solicitar la firma');end if;
  n=gen_random_uuid();
  m='Golden Farm - vincular wallet'||chr(10)||'Dominio: goldenfarm.onrender.com'||chr(10)||'Cuenta: '||p_uid||chr(10)||'Wallet: '||p_address||chr(10)||'Red: BNB Smart Chain (56)'||chr(10)||'Nonce: '||n||chr(10)||'No autoriza pagos ni acceso a tus fondos. Firma válida durante 10 minutos.';
  update golden_internal.usdt_wallets set nonce=n,proposed_address=p_address,message=m,expires_at=clock_timestamp()+interval '10 minutes' where user_id=p_uid;
  return jsonb_build_object('ok',true,'nonce',n,'message',m);
 elsif p_action='proof' then
  if p_nonce is null or w.nonce is null or w.nonce is distinct from p_nonce or w.expires_at is null or w.expires_at<=clock_timestamp() or w.address is not null then return jsonb_build_object('error','Firma caducada o ya utilizada');end if;
  return jsonb_build_object('ok',true,'address',w.proposed_address,'message',w.message);
 elsif p_action='bind' then
  if p_nonce is null or w.nonce is null or w.nonce is distinct from p_nonce or w.expires_at is null or w.expires_at<=clock_timestamp() or w.address is not null or p_block is null or p_block<0 then return jsonb_build_object('error','Vinculación inválida o caducada');end if;
  begin
   update golden_internal.usdt_wallets set address=proposed_address,linked_at=clock_timestamp(),start_block=p_block,nonce=null,message=null,proposed_address=null,expires_at=null where user_id=p_uid;
  exception when unique_violation then return jsonb_build_object('error','Esta wallet ya está vinculada a otra cuenta');end;
  return jsonb_build_object('ok',true);
 elsif p_action='check' then
  if w.address is null then return jsonb_build_object('error','Vincula primero tu wallet');end if;
  if w.next_check_at>clock_timestamp() then return jsonb_build_object('error','Espera 10 segundos antes de comprobar otro depósito');end if;
  update golden_internal.usdt_wallets set next_check_at=clock_timestamp()+interval '10 seconds' where user_id=p_uid;
  return jsonb_build_object('ok',true,'address',w.address,'start_block',w.start_block);
 end if;
 return jsonb_build_object('error','Acción no permitida');
end $$;
-- No borrar una granja con historial financiero mediante Reiniciar cuenta.
create function golden_internal.usdt_guard_farm_delete() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from golden_internal.usdt_deposits where user_id=old.user_id) then
  raise exception 'Esta cuenta tiene depósitos registrados. Contacta con el equipo para reiniciarla sin perder compras.';
 end if;return old;
end $$;
revoke all on function golden_internal.usdt_guard_farm_delete() from public,anon,authenticated;
grant execute on function golden_internal.usdt_guard_farm_delete() to service_role;
create trigger usdt_guard_farm_delete before delete on public.farms for each row execute function golden_internal.usdt_guard_farm_delete();

create function public.usdt_credit(p_uid uuid,p_base timestamptz,p_tx text,p_address text,p_block bigint,p_hash text,p_log integer,p_amount numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w golden_internal.usdt_wallets; f public.farms; d golden_internal.usdt_deposits; amount integer; updated timestamptz;
begin
 select * into f from public.farms where user_id=p_uid for update;
 if not found then return jsonb_build_object('error','Guarda primero tu granja');end if;
 select * into w from golden_internal.usdt_wallets where user_id=p_uid for update;
 if w.address is null or w.address is distinct from p_address then return jsonb_build_object('error','Wallet no vinculada');end if;
 select * into d from golden_internal.usdt_deposits where tx=p_tx;
 if found then
  if d.user_id<>p_uid then return jsonb_build_object('error','Transacción ya utilizada');end if;
  return jsonb_build_object('ok',true,'repetido',true,'cobro',d.golden,'data',f.data,'updated_at',f.updated_at);
 end if;
 if not (select deposits_enabled from golden_internal.usdt_config where id) then return jsonb_build_object('error','Depósitos todavía no abiertos');end if;
 if f.updated_at is distinct from p_base then return jsonb_build_object('error','El guardado cambió; sincroniza antes de acreditar','conflict',true);end if;
 if p_tx is null or p_tx !~ '^0x[0-9a-f]{64}$' or p_hash is null or p_hash !~ '^0x[0-9a-f]{64}$' or p_block is null or p_block<=w.start_block or p_log is null or p_log<0 or p_amount is null or p_amount<1e18 or p_amount>1e22 or mod(p_amount,1e18)<>0 then return jsonb_build_object('error','Depósito inválido');end if;
 amount=(p_amount/1e18)::integer;
 insert into golden_internal.usdt_deposits(tx,user_id,address,block_number,block_hash,log_index,amount_wei,golden) values(p_tx,p_uid,p_address,p_block,p_hash,p_log,p_amount,amount);
 if (select phase from golden_internal.alpha_release where id)='alpha' then
  update golden_internal.usdt_wallets set paid_remaining=paid_remaining+amount where user_id=p_uid;
 end if;
 update public.farms set data=jsonb_set(data,'{golden}',to_jsonb(coalesce((data->>'golden')::numeric,0)+amount)),updated_at=greatest(clock_timestamp(),f.updated_at+interval '1 microsecond') where user_id=p_uid returning * into f;
 return jsonb_build_object('ok',true,'cobro',amount,'data',f.data,'updated_at',f.updated_at);
end $$;
revoke all on function public.usdt_wallet(uuid,text,text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.usdt_credit(uuid,timestamptz,text,text,bigint,text,integer,numeric) from public,anon,authenticated;
grant execute on function public.usdt_wallet(uuid,text,text,uuid,bigint) to service_role;
grant execute on function public.usdt_credit(uuid,timestamptz,text,text,bigint,text,integer,numeric) to service_role;

-- Mismo ámbito de custodia que el portero: saldo, contenedores y tumba.
create function golden_internal.usdt_bag(v jsonb,depth integer default 0) returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare total numeric:=0; item jsonb;
begin
 if v is null or depth>12 then return 0;end if;
 if jsonb_typeof(v)='object' and v->>'k'='golden' then total:=greatest(0,coalesce((v->>'n')::numeric,0));end if;
 if jsonb_typeof(v)='array' then
  for item in select value from jsonb_array_elements(v) loop total:=total+golden_internal.usdt_bag(item,depth+1);end loop;
 elsif jsonb_typeof(v)='object' then
  total:=total+golden_internal.usdt_bag(v->'items',depth+1)+golden_internal.usdt_bag(v->'raiz',depth+1);
 end if;return total;
end $$;
create function golden_internal.usdt_track_paid() returns trigger language plpgsql security invoker set search_path='' as $$
declare total numeric;
begin
 if not exists(select 1 from golden_internal.usdt_wallets where user_id=new.user_id and paid_remaining>0) then return new;end if;
 if (select phase from golden_internal.alpha_release where id)<>'alpha' then return new;end if;
 total:=greatest(0,coalesce((new.data->>'golden')::numeric,0))+golden_internal.usdt_bag(new.data->'cont')+golden_internal.usdt_bag(new.data->'tumba');
 update golden_internal.usdt_wallets set paid_remaining=least(paid_remaining,total) where user_id=new.user_id and paid_remaining>total;
 return new;
end $$;
revoke all on function golden_internal.usdt_bag(jsonb,integer),golden_internal.usdt_track_paid() from public,anon,authenticated;
grant execute on function golden_internal.usdt_bag(jsonb,integer),golden_internal.usdt_track_paid() to service_role;
create trigger usdt_track_paid after update of data on public.farms for each row execute function golden_internal.usdt_track_paid();

-- La fase release congela el remanente pagado de alfa antes del reset futuro.
-- Restauración una sola vez, junto con los derechos permanentes ya existentes.
create or replace function public.alfa_compras(p_uid uuid,p_restaurar boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg golden_internal.alpha_release; items jsonb; f public.farms; restored jsonb; w golden_internal.usdt_wallets;
begin
 select * into strict cfg from golden_internal.alpha_release where id for share;
 select coalesce(jsonb_agg(jsonb_build_object('sku',sku,'units',units) order by sku),'[]') into items from golden_internal.alpha_entitlements where user_id=p_uid;
 if p_restaurar and cfg.phase='release' and cfg.launch_at<=clock_timestamp() and
   (jsonb_array_length(items)>0 or exists(select 1 from golden_internal.usdt_wallets where user_id=p_uid and paid_remaining>0 and not release_restored)) then
  select * into f from public.farms where user_id=p_uid for update;
  if not found then raise exception 'Falta la granja para restaurar compras; no borrar filas al reiniciar';end if;
  select * into w from golden_internal.usdt_wallets where user_id=p_uid for update;
  restored:=golden_internal.alpha_apply(f.data,items,cfg.launch_at);
  if w.user_id is not null and not w.release_restored then
   restored:=jsonb_set(restored,'{golden}',to_jsonb(coalesce((restored->>'golden')::numeric,0)+w.paid_remaining));
   update golden_internal.usdt_wallets set release_restored=true where user_id=p_uid;
  end if;
  if restored is distinct from f.data then update public.farms set data=restored,updated_at=greatest(clock_timestamp(),f.updated_at+interval '1 millisecond') where user_id=p_uid;end if;
 end if;
 return jsonb_build_object('ok',true,'phase',cfg.phase,'launch_at',cfg.launch_at,'vip_release_dias',30,'compras',items,'usdt',false);
end $$;
