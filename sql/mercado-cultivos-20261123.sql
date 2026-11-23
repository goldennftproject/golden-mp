begin;
set local lock_timeout = '5s';

-- Calcula la misma política para la cotización y la liquidación, conservando las ventas de hoy.
create function golden_economia.cupo_familia_venta(
  demanda integer, capacidad integer, cultivo boolean
) returns integer
language sql immutable strict parallel safe security invoker set search_path = ''
as $$
  select ceil(demanda * (case when cultivo then 2 else 4 end)
                      * greatest(1, capacidad / 5.0))::integer
$$;

create function golden_economia.factor_margen_cultivo(item text, semilla numeric)
returns double precision
language sql immutable strict parallel safe security invoker set search_path = ''
as $$
  select case when semilla > 0 and item <> 'papa' then 0.5 else 1 end
$$;

revoke execute on function golden_economia.cupo_familia_venta(integer, integer, boolean)
  from public, anon, authenticated;
revoke execute on function golden_economia.factor_margen_cultivo(text, numeric)
  from public, anon, authenticated;
grant execute on function golden_economia.cupo_familia_venta(integer, integer, boolean) to service_role;
grant execute on function golden_economia.factor_margen_cultivo(text, numeric) to service_role;

CREATE OR REPLACE FUNCTION public.gf_mercado_cotizar(p_uid uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with f as(select data from public.farms where user_id=p_uid),
 entorno as(select greatest(1,(select count(*) from public.farms where updated_at>now()-interval '7 days'))::integer poblacion,
 greatest(5,coalesce((f.data->'produccion'->>'base')::integer,5)+coalesce((f.data->>'expansiones')::integer,0)+case when coalesce((f.data->'produccion'->>'vipHasta')::numeric,0)>extract(epoch from now())*1000 then greatest(2,ceil((coalesce((f.data->'produccion'->>'base')::integer,5)+coalesce((f.data->>'expansiones')::integer,0))*.25)::integer) else 0 end) capacidad from f)
 select jsonb_build_object('ok',true,'version',2,'at',extract(epoch from now())*1000,'presupuesto',999999999999,
 'presupuestoGolden',greatest(0,greatest(5000,e.capacidad*1000)-coalesce(g.valor,0)),
 'recursos',(select jsonb_object_agg(c.item,jsonb_build_object('precio',c.precio,'semilla',c.semilla,'factor',c.factor,'familia',c.familia,
 'factorMargen',golden_economia.factor_margen_cultivo(c.item,c.semilla),
 'demanda',raiz.demanda*e.poblacion,'piso',case when raiz.item in('bronce','hierro','oro','diamante','netherita') then .6 else .5 end,
 'volumen',p.volumen*exp(-greatest(0,extract(epoch from now()-p.actualizado))/21600.0),
 'disponible',greatest(0,floor((golden_economia.cupo_familia_venta(raiz.demanda,e.capacidad,raiz.semilla>0)-coalesce(q.cantidad,0))/c.factor)),
 'resto',coalesce(fr.resto,0))) from golden_economia.catalogo c join golden_economia.catalogo raiz on raiz.item=c.familia
 join golden_economia.presion p on p.item=c.familia
 left join golden_economia.cuotas_personales q on q.user_id=p_uid and q.familia=c.familia and q.dia=(now() at time zone 'UTC')::date
 left join golden_economia.fracciones fr on fr.user_id=p_uid and fr.item=c.item))
 from entorno e left join golden_economia.golden_diario g on g.user_id=p_uid and g.dia=(now() at time zone 'UTC')::date;
$function$;


CREATE OR REPLACE FUNCTION public.gf_mercado_vender(p_uid uuid, p_item text, p_cantidad integer, p_moneda text, p_minimo bigint, p_base timestamp with time zone, p_op uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare f public.farms%rowtype; c golden_economia.catalogo%rowtype; raiz golden_economia.catalogo%rowtype; p golden_economia.presion%rowtype;
 recibo golden_economia.operaciones%rowtype; t timestamptz:=clock_timestamp(); hoy date:=(t at time zone 'UTC')::date;
 capacidad integer; poblacion integer; cuota integer; usado integer; gasto numeric; presupuesto numeric;
 v double precision; resto double precision; mult double precision; buff jsonb; mejor double precision:=1;
 base_precio double precision; piso double precision; unidades integer; libres integer; pendientes integer; prima double precision; exacto double precision;
 total bigint; cobro bigint; stock numeric; nuevo jsonb; resultado jsonb;
begin
 if p_uid is null or p_op is null or p_cantidad is null or p_cantidad<1 or p_cantidad>10000 or p_moneda is null or p_moneda not in('plata','golden') or p_minimo is null or p_minimo<0 then raise exception 'cantidad: Venta inválida'; end if;
 select * into f from public.farms where user_id=p_uid for update;
 if not found then raise exception 'sesion: Guardá la granja antes de vender'; end if;
 select * into recibo from golden_economia.operaciones where user_id=p_uid and op=p_op;
 if found then
   if recibo.item<>p_item or recibo.cantidad<>p_cantidad or recibo.moneda<>p_moneda then raise exception 'operacion: Identificador reutilizado'; end if;
   return recibo.resultado;
 end if;
 if p_base is distinct from f.updated_at then raise exception 'conflicto: Otra sesión guardó antes'; end if;
 select * into c from golden_economia.catalogo where item=p_item;
 if not found then raise exception 'recurso: Recurso no negociable'; end if;
 select * into raiz from golden_economia.catalogo where item=c.familia;
 stock:=coalesce((f.data->'res'->>p_item)::numeric,0);
 if stock<p_cantidad or stock<>trunc(stock) then raise exception 'stock: Inventario insuficiente'; end if;
 capacidad:=greatest(5,coalesce((f.data->'produccion'->>'base')::integer,5)+coalesce((f.data->>'expansiones')::integer,0)+case when coalesce((f.data->'produccion'->>'vipHasta')::numeric,0)>extract(epoch from t)*1000 then greatest(2,ceil((coalesce((f.data->'produccion'->>'base')::integer,5)+coalesce((f.data->>'expansiones')::integer,0))*.25)::integer) else 0 end);
 select greatest(1,count(*))::integer into poblacion from public.farms where updated_at>t-interval '7 days';
 cuota:=golden_economia.cupo_familia_venta(raiz.demanda,capacidad,raiz.semilla>0); unidades:=p_cantidad*c.factor;
 insert into golden_economia.cuotas_personales(user_id,familia,dia) values(p_uid,c.familia,hoy) on conflict do nothing;
 select cantidad into usado from golden_economia.cuotas_personales where user_id=p_uid and familia=c.familia and dia=hoy for update;
 if usado+unidades>cuota then raise exception 'demanda: Agotaste tu cupo de esta familia hoy; los demás conservan el suyo'; end if;
 select * into p from golden_economia.presion where item=c.familia for update;
 v:=p.volumen*exp(-greatest(0,extract(epoch from t-p.actualizado))/21600.0);
 insert into golden_economia.fracciones(user_id,item) values(p_uid,p_item) on conflict do nothing;
 select fr.resto into resto from golden_economia.fracciones fr where fr.user_id=p_uid and fr.item=p_item for update;
 for buff in select value from jsonb_array_elements(coalesce(f.data->'buffs','[]'::jsonb)) loop
 if buff->>'type'='yield' and coalesce((buff->>'until')::numeric,0)>extract(epoch from t)*1000 then mejor:=greatest(mejor,least(3,(buff->>'mult')::double precision)); end if; end loop;
 mult:=least(10,(1+.015*greatest(0,coalesce((f.data->>'level')::integer,1)-1)+.015*greatest(0,coalesce((f.data->>'prestige')::integer,0)))*mejor);
 base_precio:=case when c.semilla>0 then c.semilla+(c.precio-c.semilla)*mult*golden_economia.factor_margen_cultivo(c.item,c.semilla) else c.precio*mult/c.factor end;
 piso:=case when c.semilla>0 then c.semilla+(base_precio-c.semilla)*.2 else base_precio*case when raiz.item in('bronce','hierro','oro','diamante','netherita') then .6 else .5 end end;
 libres:=least(unidades,greatest(0,ceil(3-v)::integer)); pendientes:=unidades-libres;
 prima:=libres+case when pendientes>0 then exp(-greatest(0,v+libres-3)/(raiz.demanda*poblacion))*(1-exp(-pendientes::double precision/(raiz.demanda*poblacion)))/(1-exp(-1.0/(raiz.demanda*poblacion))) else 0 end;
 exacto:=unidades*piso+(base_precio-piso)*prima+resto; total:=floor(exacto+1e-9)::bigint;
 if total<=0 or total<p_minimo then raise exception 'precio: Cambió la cotización; revisá el lote'; end if;
 presupuesto:=greatest(5000,capacidad*1000);
 insert into golden_economia.golden_diario(user_id,dia) values(p_uid,hoy) on conflict do nothing;
 select valor into gasto from golden_economia.golden_diario where user_id=p_uid and dia=hoy for update;
 if p_moneda='golden' and gasto+total>presupuesto then raise exception 'presupuesto: Agotaste tu cupo personal de Golden por hoy'; end if;
 cobro:=case when p_moneda='golden' then floor(total/500.0)::bigint else total end;
 if cobro<1 then raise exception 'precio: El lote no alcanza para un Golden entero'; end if;
 nuevo:=jsonb_set(f.data-'_saveOp',array['res',p_item],to_jsonb(stock-p_cantidad),true);
 nuevo:=jsonb_set(nuevo,array[p_moneda],to_jsonb(coalesce((f.data->>p_moneda)::numeric,0)+cobro),true);
 t:=greatest(t,f.updated_at+interval '1 microsecond');
 perform set_config('golden.origen','mercado_sistema_'||p_moneda,true);
 perform set_config('golden.operacion',p_op::text,true);
 update public.farms set data=nuevo,updated_at=t where user_id=p_uid;
 update golden_economia.presion set volumen=v+unidades,actualizado=t where item=c.familia;
 update golden_economia.cuotas_personales set cantidad=usado+unidades where user_id=p_uid and familia=c.familia and dia=hoy;
 if p_moneda='golden' then update golden_economia.golden_diario set valor=gasto+total where user_id=p_uid and dia=hoy; end if;
 update golden_economia.fracciones set resto=greatest(0,least(.999999999,exacto-total)) where user_id=p_uid and item=p_item;
 resultado:=jsonb_build_object('ok',true,'version',2,'item',p_item,'cantidad',p_cantidad,'moneda',p_moneda,'cobro',cobro,'total',total,'updated_at',t,
 'resto',greatest(0,least(.999999999,exacto-total)),'volumen',v+unidades,'at',extract(epoch from t)*1000,
 'disponible',floor((cuota-usado-unidades)::numeric/c.factor),'presupuesto',999999999999,'presupuestoGolden',presupuesto-gasto-case when p_moneda='golden' then total else 0 end);
 insert into golden_economia.operaciones(user_id,op,item,cantidad,moneda,resultado) values(p_uid,p_op,p_item,p_cantidad,p_moneda,resultado);
 return resultado;
end;
$function$;

commit;
