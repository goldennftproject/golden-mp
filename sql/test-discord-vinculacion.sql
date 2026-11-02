begin;
do $test$
declare u uuid:=gen_random_uuid();v uuid:=gen_random_uuid();r jsonb;h text:=repeat('a',64);h2 text:=repeat('b',64);did text:='1999999999999999999';
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(u,'discord-qa-'||u||'@example.invalid',now(),false),(v,'discord-qa-'||v||'@example.invalid',now(),false);
 r:=public.discord_link_action(u,'create',h);assert not (r->>'linked')::boolean;
 begin perform public.discord_link_action(u,'create',h2);raise exception 'test rate failed';exception when raise_exception then if sqlerrm='test rate failed' then raise;end if;end;
 begin perform public.discord_link_action(u,'confirm');raise exception 'test early confirm failed';exception when raise_exception then if sqlerrm='test early confirm failed' then raise;end if;end;
 r:=public.discord_link_action(null,'claim',h,did,'Prueba (@prueba)');assert (r->>'pending')::boolean;
 assert not exists(select 1 from golden_internal.discord_links where user_id=u),'bot linked without owner confirmation';
 begin perform public.discord_link_action(null,'claim',h,'1888888888888888888','Otro');raise exception 'test replace failed';exception when raise_exception then if sqlerrm='test replace failed' then raise;end if;end;
 r:=public.discord_link_action(u,'state');assert r->>'name'='Prueba (@prueba)';
 r:=public.discord_link_action(u,'confirm');assert (r->>'linked')::boolean;assert not (r->>'founder_eligible')::boolean;
 r:=public.discord_link_action(u,'confirm');assert (r->>'linked')::boolean;
 assert (select count(*)=1 from golden_internal.discord_links where user_id=u),'duplicate link';
 r:=public.discord_link_action(v,'create',h2);
 begin perform public.discord_link_action(null,'claim',h2,did,'Prueba');raise exception 'test duplicate Discord failed';exception when raise_exception then if sqlerrm='test duplicate Discord failed' then raise;end if;end;
 update golden_internal.discord_challenges set expires_at=now()-interval '1 second' where user_id=v;
 begin perform public.discord_link_action(null,'claim',h2,'1888888888888888888','Otro');raise exception 'test expired failed';exception when raise_exception then if sqlerrm='test expired failed' then raise;end if;end;
 assert not has_function_privilege('authenticated','public.discord_link_action(uuid,text,text,text,text)','execute');
 assert not has_table_privilege('anon','golden_internal.discord_links','select');
 assert not has_table_privilege('authenticated','golden_internal.discord_challenges','select');
end $test$;
rollback;
select jsonb_build_object('fixtures',(select count(*) from auth.users where email like 'discord-qa-%@example.invalid'),'links',(select count(*) from golden_internal.discord_links),'players',(select count(*) from auth.users),'deposits',(select count(*) from golden_internal.usdt_deposits)) as preservation;
