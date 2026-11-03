-- Nodos Golden: preparación aditiva. NO activa ventas ni modifica granjas existentes.
-- Aplicar sólo después de desplegar guardar/cliente compatibles. Flag inicial cerrado.
-- Los derechos históricos sobreviven al reinicio de la granja; nunca se borran al quitar un nodo.
begin;
create table golden_internal.production_premium_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 epoch bigint not null default 1 check(epoch>0)
);
insert into golden_internal.production_premium_config(id,enabled) values(true,false);
create table golden_internal.production_premium_purchases (
 user_id uuid not null references auth.users(id) on delete restrict,
 id uuid not null, tipo text not null check(tipo in('tree','rock','bronce')),
 ordinal smallint not null check(ordinal between 1 and 3),
 coste numeric(12,6) not null check(coste>0), desde timestamptz not null default clock_timestamp(),
 nodo integer check(nodo between 86 and 94), colocacion_epoch text,
 primary key(user_id,id), unique(user_id,tipo,ordinal)
);
create table golden_internal.production_premium_receipts (
 user_id uuid not null references auth.users(id) on delete restrict,
 op uuid not null, request jsonb not null, created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,op)
);
alter table golden_internal.production_premium_config enable row level security;
alter table golden_internal.production_premium_purchases enable row level security;
alter table golden_internal.production_premium_receipts enable row level security;
revoke all on golden_internal.production_premium_config,golden_internal.production_premium_purchases,golden_internal.production_premium_receipts from public,anon,authenticated;
grant select,insert,update on golden_internal.production_premium_config,golden_internal.production_premium_purchases,golden_internal.production_premium_receipts to service_role;

create function golden_internal.production_premium_epoch() returns text
language sql stable security invoker set search_path='' as $$
 select c.epoch::text||':'||case when a.phase='release' and a.launch_at<=current_timestamp then 'release:'||a.launch_at::text else 'alpha' end
 from golden_internal.production_premium_config c cross join golden_internal.alpha_release a where c.id and a.id
$$;
create function golden_internal.production_premium_book(p_uid uuid,p_epoch text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('v',1,'compras',coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'tipo',tipo,'coste',coste,'desde',floor(extract(epoch from desde)*1000),
  'nodo',case when colocacion_epoch=p_epoch then nodo end) order by desde,id),'[]'))
 from golden_internal.production_premium_purchases where user_id=p_uid
$$;

-- El snapshot es una proyección del libro SQL. Una pestaña antigua no puede borrar,
-- duplicar o fabricar derechos; un reset de progreso devuelve los derechos a la bolsa.
create function golden_internal.production_premium_project() returns trigger
language plpgsql security invoker set search_path='' as $$
declare book jsonb; i integer; node_key text;
begin
 book:=golden_internal.production_premium_book(new.user_id,golden_internal.production_premium_epoch());
 if jsonb_array_length(book->'compras')=0 then
  if new.data#>'{produccion,premium}' is not null then new.data:=new.data#-'{produccion,premium}'; end if;
 else
  new.data:=jsonb_set(new.data,'{produccion}',coalesce(nullif(new.data->'produccion','null'),'{}')||jsonb_build_object('premium',book));
 end if;
 -- Cambiar la campaña privada devuelve los derechos a la bolsa. También elimina
 -- soportes reservados falsificados; nunca se toca un índice regular del mundo.
 for i in 86..94 loop
  if not exists(select 1 from jsonb_array_elements(book->'compras') x where (x->>'nodo')::integer=i) then
   node_key:=(case when i<89 then 'tree' when i<92 then 'rock' else 'ore' end)||':0,1#'||i;
   new.data:=new.data#-array['produccion','nodos',i::text]#-array['layout',i::text]#-array['nodos',node_key]#-array['produccion','pausas','n:'||i];
   if new.data#>'{produccion,orden}' is not null then
    new.data:=jsonb_set(new.data,'{produccion,orden}',coalesce((select jsonb_agg(value) from jsonb_array_elements(new.data#>'{produccion,orden}') where value<>to_jsonb('n:'||i)),'[]'));
   end if;
  end if;
 end loop;
 return new;
end $$;
create trigger production_premium_project before insert or update of data on public.farms
 for each row execute function golden_internal.production_premium_project();

-- Lectura previa para validar geometría e identificar reintentos antes de comprobar
-- una colocación que, al reintentar, ya estará visible en la granja.
create function public.gf_produccion_premium_contexto(p_uid uuid,p_op uuid,p_detalle jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare f public.farms; previous jsonb; repeated boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido'; end if;
 select request into previous from golden_internal.production_premium_receipts where user_id=p_uid and op=p_op;
 repeated:=found;
 if repeated and previous is distinct from p_detalle then raise exception 'Recibo usado para otra operación'; end if;
 select * into f from public.farms where user_id=p_uid;
 if not found then raise exception 'conflicto: primero sincroniza tu granja'; end if;
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'repetido',repeated);
end $$;

create function public.gf_produccion_premium(p_uid uuid,p_base text,p_op uuid,p_detalle jsonb,p_colocacion jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.farms; d jsonb; previous jsonb; a text:=p_detalle->>'accion'; v_tipo text;
 n integer; total integer; precio numeric; saldo numeric; compra golden_internal.production_premium_purchases;
 stamp timestamptz; epoch text; idx integer; key text; ms bigint; cd bigint; act jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido'; end if;
 if p_uid is null or p_op is null or p_base is null or jsonb_typeof(p_detalle)<>'object' or a is null or a not in('comprar','colocar') then raise exception 'Pedido de producción inválido'; end if;
 -- Mismo orden que las otras operaciones de alfa: configuración, luego granja.
 perform 1 from golden_internal.alpha_release where id for share;
 select * into f from public.farms where user_id=p_uid for update;
 if not found then raise exception 'conflicto: primero sincroniza tu granja'; end if;
 select request into previous from golden_internal.production_premium_receipts where user_id=p_uid and op=p_op;
 if found then
  if previous is distinct from p_detalle then raise exception 'Recibo usado para otra operación'; end if;
  return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'repetido',true);
 end if;
 if not coalesce((select enabled from golden_internal.production_premium_config where id for share),false) then raise exception 'Los nodos Golden aún no están disponibles'; end if;
 if p_base::timestamptz is distinct from f.updated_at then raise exception 'conflicto: otra sesión guardó'; end if;
 d:=f.data; epoch:=golden_internal.production_premium_epoch();
 if jsonb_typeof(d->'produccion') is distinct from 'object' then raise exception 'Primero sincroniza la producción de tu granja'; end if;
 if a='comprar' then
  v_tipo:=p_detalle->>'tipo';
  if v_tipo is null or v_tipo not in('tree','rock','bronce') then raise exception 'Tipo de nodo inválido'; end if;
  select count(*),count(*) filter(where p.tipo=v_tipo) into total,n from golden_internal.production_premium_purchases p where user_id=p_uid;
  if total>=12 then raise exception 'Límite de 12 nodos Golden por cuenta'; end if;
  if n>=3 then raise exception 'Límite de 3 nodos Golden de este tipo'; end if;
  precio:=case when v_tipo='bronce' then (array[2.5,3.5,5]::numeric[])[n+1] else (array[1,1.5,2]::numeric[])[n+1] end;
  if jsonb_typeof(p_detalle->'precioEsperado') is distinct from 'number' or (p_detalle->>'precioEsperado')::numeric<>precio then raise exception 'precio: el precio cambió; revisa la compra'; end if;
  saldo:=(d->>'golden')::numeric;
  if saldo is null or saldo::text in('NaN','Infinity','-Infinity') or saldo<precio then raise exception 'Golden insuficiente'; end if;
  insert into golden_internal.production_premium_purchases(user_id,id,tipo,ordinal,coste) values(p_uid,p_op,v_tipo,n+1,precio);
  d:=jsonb_set(d,'{golden}',to_jsonb(saldo-precio));
  if (select phase from golden_internal.alpha_release where id)='alpha' then
   insert into golden_internal.alpha_entitlements(user_id,sku,units,origin) values(p_uid,'nodo.'||v_tipo||'.'||p_op::text,1,'compra_validada') on conflict(user_id,sku) do nothing;
  end if;
 else
  select * into compra from golden_internal.production_premium_purchases where user_id=p_uid and id=(p_detalle->>'id')::uuid for update;
  if not found then raise exception 'No tienes ese nodo Golden'; end if;
  if compra.nodo is not null and compra.colocacion_epoch=epoch then raise exception 'Este nodo ya está colocado'; end if;
  if coalesce((d->>'level')::integer,1)<(case when compra.tipo='bronce' then 3 else 1 end) then raise exception 'Todavía no has desbloqueado este nodo'; end if;
  -- La función Edge verifica terreno, cerca, ocupación y coordenadas contra el mundo
  -- real del snapshot. Este parámetro se construye allí y nunca se copia del cliente.
  if jsonb_typeof(p_colocacion) is distinct from 'object' then raise exception 'Falta validar el emplazamiento'; end if;
  idx:=(p_colocacion->>'nodo')::integer; key:=p_colocacion->>'key';
  if idx is null or idx<86 or idx>94 or key is null or p_colocacion->>'tipo' is distinct from compra.tipo then raise exception 'Emplazamiento inválido'; end if;
  if coalesce((d#>>array['produccion','nodos',idx::text])::boolean,false) or exists(select 1 from golden_internal.production_premium_purchases where user_id=p_uid and colocacion_epoch=epoch and nodo=idx) then raise exception 'Ese nodo ya pertenece a tu granja'; end if;
  if compra.tipo='tree' and idx<>all(array[86,87,88]) or compra.tipo='rock' and idx<>all(array[89,90,91]) or compra.tipo='bronce' and idx<>all(array[92,93,94]) then raise exception 'Tipo de emplazamiento inválido'; end if;
  if jsonb_typeof(p_detalle->'cx') is distinct from 'number' or jsonb_typeof(p_detalle->'by') is distinct from 'number' or p_colocacion->'cx' is distinct from p_detalle->'cx' or p_colocacion->'by' is distinct from p_detalle->'by' then raise exception 'Coordenadas inválidas'; end if;
  update golden_internal.production_premium_purchases set nodo=idx,colocacion_epoch=epoch where user_id=p_uid and id=compra.id;
  d:=jsonb_set(d,'{produccion,nodos}',coalesce(nullif(d#>'{produccion,nodos}','null'),'{}')||jsonb_build_object(idx::text,true));
  d:=jsonb_set(d,'{layout}',coalesce(nullif(d->'layout','null'),'{}')||jsonb_build_object(idx::text,jsonb_build_object('cx',p_detalle->'cx','by',p_detalle->'by')));
  ms:=floor(extract(epoch from clock_timestamp())*1000);
  cd:=(case compra.tipo when 'tree' then 1800000 when 'rock' then 2400000 else 14400000 end)*(case when coalesce((d#>>'{produccion,vipHasta}')::numeric,0)>ms then .9 else 1 end);
  d:=jsonb_set(d,'{nodos}',coalesce(nullif(d->'nodos','null'),'{}')||jsonb_build_object(key,jsonb_build_object('cdIni',ms,'halfAt',ms+cd/2,'readyAt',ms+cd)));
  select coalesce(jsonb_agg(value),'[]') into act from jsonb_array_elements(coalesce(nullif(d#>'{produccion,orden}','null'),'[]')) where value<>to_jsonb('n:'||idx);
  d:=jsonb_set(d,'{produccion,orden}',act||jsonb_build_array('n:'||idx));
 end if;
 d:=jsonb_set(d,'{produccion,premium}',golden_internal.production_premium_book(p_uid,epoch));
 stamp:=greatest(clock_timestamp(),f.updated_at+interval '1 millisecond');
 update public.farms set data=d,updated_at=stamp where user_id=p_uid returning * into f;
 insert into golden_internal.production_premium_receipts(user_id,op,request) values(p_uid,p_op,p_detalle);
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at);
end $$;
revoke all on function golden_internal.production_premium_epoch(),golden_internal.production_premium_book(uuid,text),golden_internal.production_premium_project(),public.gf_produccion_premium_contexto(uuid,uuid,jsonb),public.gf_produccion_premium(uuid,text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function golden_internal.production_premium_epoch(),golden_internal.production_premium_book(uuid,text),golden_internal.production_premium_project(),public.gf_produccion_premium_contexto(uuid,uuid,jsonb),public.gf_produccion_premium(uuid,text,uuid,jsonb,jsonb) to service_role;
commit;
