begin;
do $test$
declare uid uuid:=gen_random_uuid();other_uid uuid:=gen_random_uuid();o jsonb;order_id uuid;amount numeric;v_tx text:='0x'||repeat('c',64);addr text:='0x'||repeat('5',40);hash text:='0x'||repeat('d',64);r jsonb;base timestamptz;sent_at bigint;
begin
 insert into auth.users(id,email,email_confirmed_at) values(uid,'durable-usdt-test-'||uid||'@example.invalid',now()),(other_uid,'durable-usdt-test-'||other_uid||'@example.invalid',now());
 insert into public.farms(user_id,name,data) values(uid,'USDT-DURABLE-QA','{"golden":0,"plata":3,"marker":"preserve"}'),(other_uid,'USDT-DURABLE-QA','{"golden":0}');
 o:=public.usdt_order(uid,'create',10,100)->'order';order_id:=(o->>'id')::uuid;amount:=(o->>'amount_wei')::numeric;
 -- Historical in-time payment, checked after the request expired.
 update golden_internal.usdt_orders set created_at=clock_timestamp()-interval '60 minutes',expires_at=clock_timestamp()-interval '30 minutes' where usdt_orders.id=order_id;
 sent_at:=floor(extract(epoch from clock_timestamp()-interval '45 minutes'))::bigint;
 r:=public.usdt_prepare_order(uid,order_id,v_tx,addr,101,hash,0,amount+1,sent_at);assert r?'error','wrong amount accepted';
 r:=public.usdt_prepare_order(other_uid,order_id,v_tx,addr,101,hash,0,amount,sent_at);assert r?'error','wrong owner accepted';
 r:=public.usdt_prepare_order(uid,order_id,v_tx,addr,101,hash,0,amount,sent_at+3600);assert r?'error','late payment accepted';
 r:=public.usdt_prepare_order(uid,order_id,v_tx,addr,101,hash,0,amount,sent_at);assert (r->>'verified')::boolean,'could not durably record payment';
 assert (select (data->>'golden')::numeric=0 from public.farms where user_id=uid),'verification wrote farm before sync';
 assert (select count(*)=0 from golden_internal.usdt_deposits where user_id=uid),'verification minted credit';
 assert (public.usdt_order(uid,'estado')->'orders'->0->>'verified_tx')=v_tx,'verified payment missing from state';
 r:=public.usdt_prepare_order(uid,order_id,v_tx,addr,101,hash,0,amount,sent_at);assert (r->>'verified')::boolean,'retry not idempotent';
 r:=public.usdt_prepare_order(uid,order_id,'0x'||repeat('e',64),addr,101,hash,0,amount,sent_at);assert r?'error','verified receipt overwritten';
 select updated_at into base from public.farms where user_id=uid;
 r:=public.usdt_credit_order(uid,base-interval '1 second',order_id,v_tx,addr,101,hash,0,amount,sent_at);assert (r->>'conflict')::boolean,'CAS was bypassed';
 assert (select verified_tx=v_tx and usdt_orders.tx is null from golden_internal.usdt_orders where usdt_orders.id=order_id),'CAS failure lost receipt';
 r:=public.usdt_credit_order(uid,base,order_id,v_tx,addr,101,hash,0,amount,sent_at);assert (r->>'ok')::boolean,'settlement failed after sync';
 r:=public.usdt_credit_order(uid,base,order_id,v_tx,null,null,null,null,null,null);assert (r->>'repetido')::boolean,'credit retry duplicated';
 assert (select (data->>'golden')::numeric=amount/1e18 and data->>'marker'='preserve' and (data->>'plata')::numeric=3 from public.farms where user_id=uid),'credit changed progress';
 assert (select count(*)=1 from golden_internal.usdt_deposits where user_id=uid),'duplicate deposits';
 assert (select paid_remaining=amount/1e18 from golden_internal.usdt_wallets where user_id=uid),'alpha paid Golden not preserved';
 assert not has_function_privilege('authenticated','public.usdt_prepare_order(uuid,uuid,text,text,bigint,text,integer,numeric,bigint)','execute'),'client can forge receipt';
end $test$;
rollback;
select jsonb_build_object('fixtures_remaining',(select count(*) from auth.users where email like 'durable-usdt-test-%@example.invalid'),'real_receipts',(select count(*) from golden_internal.usdt_deposits)) as preservation;
