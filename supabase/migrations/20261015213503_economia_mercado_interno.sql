-- Comprador compartido de moneda INTERNA. Sin depósitos, retiros ni obligación en USDT.
create schema if not exists golden_economia;
revoke all on schema golden_economia from public, anon, authenticated;
grant usage on schema golden_economia to service_role;
create table golden_economia.catalogo (
  item text primary key, precio numeric not null check(precio>0), semilla numeric not null default 0,
  demanda integer not null default 100 check(demanda>0)
);
create table golden_economia.presion (
  item text primary key references golden_economia.catalogo(item), volumen double precision not null default 0 check(volumen>=0),
  actualizado timestamptz not null default now(), dia date not null default ((now() at time zone 'UTC')::date), vendido integer not null default 0 check(vendido>=0)
);
create table golden_economia.comprador (
  id integer primary key check(id=1), presupuesto numeric not null default 5000 check(presupuesto>=0), gastado numeric not null default 0 check(gastado>=0),
  dia date not null default ((now() at time zone 'UTC')::date)
);
create table golden_economia.fracciones (
  user_id uuid not null references auth.users(id) on delete cascade, item text not null references golden_economia.catalogo(item),
  resto double precision not null default 0 check(resto>=0 and resto<1), primary key(user_id,item)
);
create table golden_economia.operaciones (
  user_id uuid not null references auth.users(id) on delete cascade, op uuid not null, item text not null, cantidad integer not null,
  moneda text not null, resultado jsonb not null, creado timestamptz not null default now(), primary key(user_id,op)
);
alter table golden_economia.catalogo enable row level security;
alter table golden_economia.presion enable row level security;
alter table golden_economia.comprador enable row level security;
alter table golden_economia.fracciones enable row level security;
alter table golden_economia.operaciones enable row level security;
revoke all on all tables in schema golden_economia from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema golden_economia to service_role;
insert into golden_economia.catalogo(item,precio,semilla,demanda) values
('papa',2,1,100),('ciruela',4,2,100),('cereza',5,2,100),('remolacha',7,3,100),('zanahoria',8,3,100),('cebolla',16,6,100),
('calabacin',25,10,100),('repollo',50,20,100),('calabaza',100,40,25),('brocoli',210,90,30),('girasol',380,180,15),('trigo',680,360,20),('maiz',1200,720,20),
('madera',12,0,100),('piedra',15,0,100),('bronce',160,0,30),('hierro',240,0,30),('oro',280,0,30),('diamante',360,0,30),('netherita',480,0,30),
('tablon',36,0,40),('barra_piedra',45,0,40),('barra_bronce',480,0,40),('barra_hierro',720,0,40),('barra_oro',840,0,40);
insert into golden_economia.presion(item) select item from golden_economia.catalogo;
insert into golden_economia.comprador(id) values(1);

-- Invoker + service_role exclusivamente: sólo la Edge Function con JWT de usuario verificado
-- puede llamar. No hay SECURITY DEFINER público ni llave de servicio en el navegador.
create function public.gf_mercado_cotizar(p_uid uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select jsonb_build_object('ok',true,'at',extract(epoch from now())*1000,
    'presupuesto',greatest(0,b.presupuesto-case when b.dia=(now() at time zone 'UTC')::date then b.gastado else 0 end),
    'recursos',(select jsonb_object_agg(c.item,jsonb_build_object('precio',c.precio,'semilla',c.semilla,'demanda',c.demanda,
      'volumen',p.volumen*exp(-greatest(0,extract(epoch from now()-p.actualizado))/21600.0),
      'disponible',greatest(0,c.demanda*4-case when p.dia=(now() at time zone 'UTC')::date then p.vendido else 0 end),
      'resto',coalesce(f.resto,0)))
      from golden_economia.catalogo c join golden_economia.presion p using(item)
      left join golden_economia.fracciones f on f.item=c.item and f.user_id=p_uid))
  from golden_economia.comprador b where b.id=1;
$$;

create function public.gf_mercado_vender(p_uid uuid,p_item text,p_cantidad integer,p_moneda text,p_minimo bigint,p_base timestamptz,p_op uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  f public.farms%rowtype; c golden_economia.catalogo%rowtype; p golden_economia.presion%rowtype;
  b golden_economia.comprador%rowtype; anterior golden_economia.operaciones%rowtype;
  t timestamptz:=clock_timestamp(); hoy date:=(t at time zone 'UTC')::date;
  v double precision; resto double precision; mult double precision:=1; mejor double precision:=1; buff jsonb;
  base_precio double precision; piso double precision; gratis integer; pendientes integer; prima double precision;
  exacto double precision; total bigint; cobro bigint; stock numeric; saldo numeric; nuevo jsonb; resultado jsonb;
begin
  if p_uid is null or p_op is null or p_cantidad is null or p_cantidad<1 or p_cantidad>10000 or p_moneda not in ('plata','golden') or p_moneda is null or p_minimo is null or p_minimo<0 then
    raise exception 'cantidad: Parámetros de venta inválidos';
  end if;
  select * into f from public.farms where user_id=p_uid for update;
  if not found then raise exception 'sesion: Guardá tu granja antes de vender'; end if;
  select * into anterior from golden_economia.operaciones where user_id=p_uid and op=p_op;
  if found then
    if anterior.item<>p_item or anterior.cantidad<>p_cantidad or anterior.moneda<>p_moneda then raise exception 'operacion: Identificador reutilizado con otra venta'; end if;
    return anterior.resultado;
  end if;
  if p_base is distinct from f.updated_at then raise exception 'conflicto: Otra sesión guardó antes. No se realizó la venta'; end if;
  select * into c from golden_economia.catalogo where item=p_item;
  if not found then raise exception 'recurso: Recurso no negociable'; end if;
  stock:=coalesce((f.data->'res'->>p_item)::numeric,0);
  if stock<p_cantidad or stock<>trunc(stock) then raise exception 'stock: No tenés esa cantidad en el guardado aceptado'; end if;
  select * into p from golden_economia.presion where item=p_item for update;
  select * into b from golden_economia.comprador where id=1 for update;
  if p.dia<>hoy then p.vendido:=0; end if;
  if b.dia<>hoy then b.gastado:=0; end if;
  if p.vendido+p_cantidad>c.demanda*4 then raise exception 'demanda: El comprador ya cubrió la demanda de este recurso por hoy'; end if;
  v:=p.volumen*exp(-greatest(0,extract(epoch from t-p.actualizado))/21600.0);
  insert into golden_economia.fracciones(user_id,item) values(p_uid,p_item) on conflict do nothing;
  select x.resto into resto from golden_economia.fracciones x where x.user_id=p_uid and x.item=p_item for update;
  for buff in select value from jsonb_array_elements(coalesce(f.data->'buffs','[]'::jsonb)) loop
    if buff->>'type'='yield' and coalesce((buff->>'until')::numeric,0)>extract(epoch from t)*1000 then mejor:=greatest(mejor,least(3,(buff->>'mult')::double precision)); end if;
  end loop;
  mult:=least(10,(1+.015*greatest(0,coalesce((f.data->>'level')::integer,1)-1)+.015*greatest(0,coalesce((f.data->>'prestige')::integer,0)))*mejor);
  base_precio:=case when c.semilla>0 then c.semilla+(c.precio-c.semilla)*mult else c.precio*mult end;
  piso:=case when c.semilla>0 then c.semilla+(base_precio-c.semilla)*.2 else base_precio*.5 end;
  gratis:=least(p_cantidad,greatest(0,ceil(3-v)::integer)); pendientes:=p_cantidad-gratis;
  prima:=gratis+case when pendientes>0 then exp(-greatest(0,v+gratis-3)/c.demanda)*(1-exp(-pendientes::double precision/c.demanda))/(1-exp(-1.0/c.demanda)) else 0 end;
  exacto:=p_cantidad*piso+(base_precio-piso)*prima+resto;
  total:=floor(exacto+1e-9)::bigint;
  if total<=0 or total<p_minimo then raise exception 'precio: La cotización cambió. Revisá el lote y volvé a vender'; end if;
  if b.gastado+total>b.presupuesto then raise exception 'presupuesto: El comprador agotó el presupuesto compartido de hoy'; end if;
  cobro:=case when p_moneda='golden' then floor(total/500.0)::bigint else total end;
  if cobro<1 then raise exception 'precio: El lote no alcanza para un Golden entero'; end if;
  saldo:=coalesce((f.data->>p_moneda)::numeric,0);
  nuevo:=jsonb_set(f.data-'_saveOp',array['res',p_item],to_jsonb(stock-p_cantidad),true);
  nuevo:=jsonb_set(nuevo,array[p_moneda],to_jsonb(saldo+cobro),true);
  t:=greatest(t,f.updated_at+interval '1 microsecond');
  update public.farms set data=nuevo,updated_at=t where user_id=p_uid;
  update golden_economia.presion set volumen=v+p_cantidad,actualizado=t,dia=hoy,vendido=p.vendido+p_cantidad where item=p_item;
  update golden_economia.comprador set gastado=b.gastado+total,dia=hoy where id=1;
  update golden_economia.fracciones set resto=greatest(0,least(.999999999,exacto-total)) where user_id=p_uid and item=p_item;
  resultado:=jsonb_build_object('ok',true,'item',p_item,'cantidad',p_cantidad,'moneda',p_moneda,'cobro',cobro,'total',total,'updated_at',t,
    'resto',greatest(0,least(.999999999,exacto-total)),'volumen',v+p_cantidad,'at',extract(epoch from t)*1000,
    'disponible',c.demanda*4-p.vendido-p_cantidad,'presupuesto',b.presupuesto-b.gastado-total);
  insert into golden_economia.operaciones(user_id,op,item,cantidad,moneda,resultado) values(p_uid,p_op,p_item,p_cantidad,p_moneda,resultado);
  return resultado;
end;
$$;
revoke all on function public.gf_mercado_cotizar(uuid) from public,anon,authenticated;
revoke all on function public.gf_mercado_vender(uuid,text,integer,text,bigint,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.gf_mercado_cotizar(uuid) to service_role;
grant execute on function public.gf_mercado_vender(uuid,text,integer,text,bigint,timestamptz,uuid) to service_role;
