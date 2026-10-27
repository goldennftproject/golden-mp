-- Siempre en una transacción exterior que termine en ROLLBACK. Sólo cuentas QA existentes.
do $$
declare a uuid;b uuid; r jsonb; f public.farms; base_a text;base_b text; listing bigint; blocked boolean; before_data jsonb; n integer;k text;bucket text;itemkey text;testop uuid;
 op1 uuid:='a7270001-0000-4000-8000-000000000001';op2 uuid:='a7270002-0000-4000-8000-000000000002';
 op3 uuid:='a7270003-0000-4000-8000-000000000003';detail jsonb;
begin
 select id into strict a from auth.users where email='surenfxs+guardadoqa20261027@gmail.com';
 select id into strict b from auth.users where email='surenfxs+goldenqa20261027@gmail.com';
 if has_function_privilege('authenticated','public.p2p_operar(uuid,text,uuid,jsonb)','execute') or has_table_privilege('authenticated','golden_internal.p2p_receipts','insert') then raise exception 'Acceso P2P privilegiado expuesto';end if;
 delete from golden_internal.p2p_quota where user_id in(a,b) and day=(statement_timestamp() at time zone 'UTC')::date;
 update public.farms set data=jsonb_set(jsonb_set(jsonb_set(jsonb_set(data,'{res}','{"madera":10}'),'{plata}','100'),'{mkPend}','[]'),'{produccion,vipHasta}',to_jsonb(extract(epoch from now()+interval '1 day')*1000)),mercado_ack=null where user_id in(a,b);
 perform set_config('request.jwt.claim.role','service_role',true);
 select to_jsonb(updated_at)#>>'{}' into base_a from public.farms where user_id=a;
 detail:='{"accion":"publicar","kind":"res","item":"madera","qty":2,"price":10,"name":"Madera QA"}';
 r:=public.p2p_operar(a,base_a,op1,detail);listing:=(r->>'listing')::bigint;
 if r#>>'{data,res,madera}'<>'8' then raise exception 'Publicación no retiró stock';end if;
 r:=public.p2p_operar(a,base_a,op1,detail);if not (r->>'repetido')::boolean or r#>>'{data,res,madera}'<>'8' then raise exception 'Reintento de publicación duplicó';end if;
 blocked:=false;begin perform public.p2p_operar(a,base_a,op1,detail||'{"qty":3}');exception when others then blocked:=true;end;
 if not blocked then raise exception 'Recibo aceptó otro contenido';end if;
 select to_jsonb(updated_at)#>>'{}' into base_b from public.farms where user_id=b;
 detail:=jsonb_build_object('accion','comprar','id',listing,'price',10);
 r:=public.p2p_operar(b,base_b,op2,detail);
 if r#>>'{data,plata}'<>'90' or jsonb_array_length(r#>'{data,mkPend}')<>1 then raise exception 'Pago/entrega no atómicos';end if;
 r:=public.p2p_operar(b,base_b,op2,detail);if r#>>'{data,plata}'<>'90' or jsonb_array_length(r#>'{data,mkPend}')<>1 then raise exception 'Respuesta perdida duplicó compra';end if;
 before_data:=r->'data';blocked:=false;begin perform public.p2p_operar(b,r->>'updated_at',op3,detail);exception when others then blocked:=true;end;
 if not blocked or (select data from public.farms where user_id=b)<>before_data then raise exception 'Segunda compra cambió la granja';end if;
 select to_jsonb(updated_at)#>>'{}' into base_a from public.farms where user_id=a;
 detail:=jsonb_build_object('accion','cobrar','id',listing);r:=public.p2p_operar(a,base_a,op3,detail);
 if (r#>>'{data,plata}')::numeric<>109 then raise exception 'Cobro/comisión incorrectos';end if;
 r:=public.p2p_operar(a,base_a,op3,detail);if (r#>>'{data,plata}')::numeric<>109 then raise exception 'Cobro duplicado';end if;
 -- Cancelación atómica, incluyendo respuesta perdida. El cupo no se devuelve.
 base_a:=r->>'updated_at';detail:='{"accion":"publicar","kind":"res","item":"madera","qty":3,"price":15}';
 r:=public.p2p_operar(a,base_a,'a7270004-0000-4000-8000-000000000004',detail);listing:=(r->>'listing')::bigint;base_a:=r->>'updated_at';
 detail:=jsonb_build_object('accion','retirar','id',listing);r:=public.p2p_operar(a,base_a,'a7270005-0000-4000-8000-000000000005',detail);
 if exists(select 1 from public.market where id=listing) or r#>>'{data,res,madera}'<>'5' or r#>>'{data,mkPend,0,qty}'<>'3' then raise exception 'Cancelación perdió o duplicó stock';end if;
 r:=public.p2p_operar(a,base_a,'a7270005-0000-4000-8000-000000000005',detail);if jsonb_array_length(r#>'{data,mkPend}')<>1 then raise exception 'Cancelación repetida duplicó entrega';end if;
 select count into n from golden_internal.p2p_quota where user_id=a and day=(statement_timestamp() at time zone 'UTC')::date;
 if n<>2 then raise exception 'Cuota incorrecta después de reintentar/cancelar: %',n;end if;
 -- Una versión vieja no modifica la publicación ni el inventario.
 before_data:=r->'data';blocked:=false;begin perform public.p2p_operar(a,base_a,'a7270006-0000-4000-8000-000000000006','{"accion":"publicar","kind":"res","item":"madera","qty":1,"price":1}');exception when others then blocked:=true;end;
 if not blocked or (select data from public.farms where user_id=a)<>before_data then raise exception 'CAS no protegió la sesión';end if;
 -- La ficha del arma sale del servidor, incluyendo desgaste, mejora y runas.
 update public.farms set data=jsonb_set(data,'{weapons}','{"espada_madera":{"dur":27,"plus":3,"sockets":{"1":"fuego"}}}') where user_id=a;
 select to_jsonb(updated_at)#>>'{}' into base_a from public.farms where user_id=a;
 r:=public.p2p_operar(a,base_a,'a7270007-0000-4000-8000-000000000007','{"accion":"publicar","kind":"arm","item":"espada_madera","qty":1,"price":5}');listing:=(r->>'listing')::bigint;
 if r#>'{data,weapons}'?'espada_madera' then raise exception 'No retiró el arma del vendedor';end if;
 select to_jsonb(updated_at)#>>'{}' into base_b from public.farms where user_id=b;
 r:=public.p2p_operar(b,base_b,'a7270008-0000-4000-8000-000000000008',jsonb_build_object('accion','comprar','id',listing,'price',5));
 if r#>>'{data,mkPend,1,payload,dur}'<>'27' or r#>>'{data,mkPend,1,payload,plus}'<>'3' or r#>>'{data,mkPend,1,payload,sockets,1}'<>'fuego' then raise exception 'El arma perdió su ficha';end if;
 update public.farms set data=jsonb_set(jsonb_set(jsonb_set(data,'{armor}','{"arm_fibra_yelmo":true}'),'{armorDur}','{"arm_fibra_yelmo":41}'),'{armorOff}','{"arm_fibra_yelmo":true}') where user_id=a;
 select to_jsonb(updated_at)#>>'{}' into base_a from public.farms where user_id=a;
 r:=public.p2p_operar(a,base_a,'a7270010-0000-4000-8000-000000000010','{"accion":"publicar","kind":"armor","item":"arm_fibra_yelmo","qty":1,"price":5}');listing:=(r->>'listing')::bigint;
 if r#>'{data,armor}'?'arm_fibra_yelmo' or r#>'{data,armorDur}'?'arm_fibra_yelmo' then raise exception 'La armadura no salió completa';end if;
 r:=public.p2p_operar(a,r->>'updated_at','a7270011-0000-4000-8000-000000000011',jsonb_build_object('accion','retirar','id',listing));
 if r#>>'{data,mkPend,1,payload,dur}'<>'41' then raise exception 'La armadura perdió desgaste';end if;
 foreach k in array array['seed','dish','fish'] loop
  bucket:=case k when 'seed' then 'seeds' when 'dish' then 'dishes' else 'fish' end;
  itemkey:=case k when 'seed' then 'papa' when 'dish' then 'papa_asada' else 'carpa@1.5' end;
  update public.farms set data=jsonb_set(data,array[bucket],jsonb_build_object(itemkey,3)) where user_id=a;
  select to_jsonb(updated_at)#>>'{}' into base_a from public.farms where user_id=a;
  testop:=gen_random_uuid();r:=public.p2p_operar(a,base_a,testop,jsonb_build_object('accion','publicar','kind',k,'item',itemkey,'qty',2,'price',2));listing:=(r->>'listing')::bigint;
  if r#>>array['data',bucket,itemkey]<>'1' then raise exception 'No descontó %',k;end if;
  r:=public.p2p_operar(a,r->>'updated_at',gen_random_uuid(),jsonb_build_object('accion','retirar','id',listing));
  if not exists(select 1 from jsonb_array_elements(r#>'{data,mkPend}') p where p->>'kind'=k and p->>'item'=itemkey and p->>'qty'='2') then raise exception 'No devolvió %',k;end if;
 end loop;
 -- Un fallo DESPUÉS de mutar market revierte también publicación, cuota y recibo.
 before_data:=(select data from public.farms where user_id=a);
 execute $q$ create function pg_temp.qa_p2p_interrumpir() returns trigger language plpgsql as $f$ begin raise exception 'FALLO QA DESPUÉS DE MARKET'; end; $f$ $q$;
 execute 'create trigger qa_p2p_interrumpir before update on public.farms for each row execute function pg_temp.qa_p2p_interrumpir()';
 select to_jsonb(updated_at)#>>'{}' into base_a from public.farms where user_id=a;
 blocked:=false;begin perform public.p2p_operar(a,base_a,'a7270009-0000-4000-8000-000000000009','{"accion":"publicar","kind":"res","item":"madera","qty":1,"price":17}');exception when others then blocked:=position('FALLO QA' in SQLERRM)>0;end;
 if not blocked or (select data from public.farms where user_id=a)<>before_data or exists(select 1 from public.market where seller=a and price=17) or exists(select 1 from golden_internal.p2p_receipts where user_id=a and op='a7270009-0000-4000-8000-000000000009') then raise exception 'Interrupción dejó un movimiento parcial';end if;
 select count into n from golden_internal.p2p_quota where user_id=a and day=(statement_timestamp() at time zone 'UTC')::date;
 if n<>7 then raise exception 'Interrupción consumió cuota';end if;
 execute 'drop trigger qa_p2p_interrumpir on public.farms';
end $$;
