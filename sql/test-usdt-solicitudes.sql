-- Disposable fixtures only. Always rollback, including credited balances and receipts.
begin;
do $test$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();o jsonb;other jsonb;r jsonb;base timestamptz;tx text:='0x'||repeat('a',64);addr text:='0x'||repeat('3',40);hash text:='0x'||repeat('b',64);val numeric;oid uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(a,'usdt-order-test-a-'||a||'@example.invalid',now()),(b,'usdt-order-test-b-'||b||'@example.invalid',now());
 insert into public.farms(user_id,name,data) values(a,'ORDER-QA','{"golden":0}'::jsonb),(b,'ORDER-QA','{"golden":0}'::jsonb);
 o:=public.usdt_order(a,'create',10,100)->'order';oid:=(o->>'id')::uuid;val:=(o->>'amount_wei')::numeric;
 other:=public.usdt_order(b,'create',10,100)->'order';
 assert val<>(other->>'amount_wei')::numeric,'duplicate amount across accounts';
 assert (public.usdt_order(a,'create',25,110)->'order'->>'id')=o->>'id','request retry changed amount';
 assert public.usdt_order(b,'get',null,null,oid)?'error','another account order readable';
 select updated_at into base from public.farms where user_id=a;
 r:=public.usdt_credit_order(a,base,oid,tx,addr,101,hash,0,val+1,floor(extract(epoch from clock_timestamp()))::bigint);assert r?'error','wrong amount credited';
 r:=public.usdt_credit_order(a,base,oid,tx,addr,101,hash,0,val,floor(extract(epoch from clock_timestamp()+interval '1 hour'))::bigint);assert r?'error','late payment credited';
 r:=public.usdt_credit_order(a,base,oid,tx,addr,100,hash,0,val,floor(extract(epoch from clock_timestamp()))::bigint);assert r?'error','old block credited';
 r:=public.usdt_credit_order(a,base-interval '1 second',oid,tx,addr,101,hash,0,val,floor(extract(epoch from clock_timestamp()))::bigint);assert (r->>'conflict')::boolean,'stale save not rejected';
 r:=public.usdt_credit_order(a,base,oid,tx,addr,101,hash,0,val,floor(extract(epoch from clock_timestamp()))::bigint);
 assert (r->>'ok')::boolean,'valid credit rejected';
 assert (r->>'cobro')::numeric=val/1e18,'fractional amount lost';
 assert (select (data->>'golden')::numeric=val/1e18 from public.farms where user_id=a),'balance incorrect';
 assert (select address is null and paid_remaining=val/1e18 from golden_internal.usdt_wallets where user_id=a),'paid alpha preservation or no-link failed';
 r:=public.usdt_credit_order(a,base,oid,tx,null,null,null,null,null,null);assert (r->>'repetido')::boolean,'idempotent retry failed';
 r:=public.usdt_credit_order(b,(select updated_at from public.farms where user_id=b),(other->>'id')::uuid,tx,addr,101,hash,0,val,floor(extract(epoch from clock_timestamp()))::bigint);assert r?'error','other account stole payment';
 assert (select count(*)=1 from golden_internal.usdt_deposits where user_id in(a,b)),'duplicate receipt';
 update golden_internal.usdt_orders set expires_at=clock_timestamp()-interval '1 second' where id=(other->>'id')::uuid;
 r:=public.usdt_order(b,'create',10,120);
 assert r->'order'->>'amount_wei'<>other->>'amount_wei','expired amount reused';
 assert not has_function_privilege('authenticated','public.usdt_credit_order(uuid,timestamptz,uuid,text,text,bigint,text,integer,numeric,bigint)','execute'),'client can credit';
 assert not has_table_privilege('authenticated','golden_internal.usdt_orders','select'),'private order table exposed';
end $test$;
rollback;
select jsonb_build_object('orders',(select count(*) from golden_internal.usdt_orders),'deposits',(select count(*) from golden_internal.usdt_deposits),'accounts',(select count(*) from auth.users)) as preserved;
