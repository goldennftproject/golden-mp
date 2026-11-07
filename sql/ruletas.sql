-- Ruletas aprobadas tras vista previa. Instalar no modifica granjas existentes.
-- Activar enabled después de publicar y verificar servidor y cliente.
begin;
create table if not exists golden_internal.roulette_pool (
 id boolean primary key default true check(id),enabled boolean not null default false,
 pot numeric(24,6) not null default 10 check(pot>=0),reserve numeric(24,6) not null default 0 check(reserve>=0),
 funded boolean not null default true,round bigint not null default 1 check(round>0),
 tickets bigint not null default 0 check(tickets>=0),paid_out numeric(24,6) not null default 0 check(paid_out>=0),
 updated_at timestamptz not null default now()
);
-- La aportación inicial es única. Reaplicar nunca reinicia el bote.
insert into golden_internal.roulette_pool(id) values(true) on conflict(id) do nothing;
create table if not exists golden_internal.roulette_daily (
 user_id uuid not null references auth.users(id) on delete cascade,day integer not null,
 used integer not null default 0 check(used between 0 and 5),primary key(user_id,day)
);
create table if not exists golden_internal.roulette_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,op uuid not null,
 request jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(user_id,op)
);
alter table golden_internal.roulette_pool enable row level security;
alter table golden_internal.roulette_daily enable row level security;
alter table golden_internal.roulette_receipts enable row level security;
revoke all on golden_internal.roulette_pool,golden_internal.roulette_daily,golden_internal.roulette_receipts from public,anon,authenticated;
grant select,insert,update on golden_internal.roulette_pool,golden_internal.roulette_daily,golden_internal.roulette_receipts to service_role;

create or replace function golden_internal.ruletas_config()
returns jsonb language sql immutable security invoker set search_path='' as $$
 select '{"version":1,"golden":{"ticket":1,"seed":10,"aporteBote":0.8,"aporteReserva":0.2,"pesoJackpot":20,"escala":10000},"objetos":{"gratis":3,"max":5,"precios":[100,200],"premios":[{"item":"madera","kind":"res","qty":5,"weight":3000,"label":"Madera"},{"item":"piedra","kind":"res","qty":5,"weight":2500,"label":"Piedra"},{"item":"stone","kind":"pick","qty":5,"weight":1500,"label":"Pico de piedra"},{"item":"papa","kind":"res","qty":5,"weight":1200,"label":"Papa"},{"item":"papa_asada","kind":"dish","qty":5,"weight":800,"label":"Papa asada"},{"item":"flecha","kind":"res","qty":20,"weight":500,"label":"Flechas"},{"item":"espada_madera","kind":"arm","qty":1,"weight":300,"label":"Espada de madera","payload":{"dur":80}},{"item":"arco_piedra","kind":"arm","qty":1,"weight":150,"label":"Arco de piedra","payload":{"dur":100}},{"item":"espada_bronce","kind":"arm","qty":1,"weight":40,"label":"Espada de bronce","payload":{"dur":240}},{"item":"mazo_oro","kind":"arm","qty":1,"weight":10,"label":"Mazo de oro","payload":{"dur":270}}]}}'::jsonb;
$$;
create or replace function golden_internal.ruletas_premio(p_roll integer)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare r jsonb; lim integer:=0; idx integer:=0;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'Sorteo inválido';end if;
 for r in select value from jsonb_array_elements(golden_internal.ruletas_config()#>'{objetos,premios}') loop
  lim:=lim+(r->>'weight')::integer;
  if p_roll<lim then return r||jsonb_build_object('segmentIndex',idx);end if;
  idx:=idx+1;
 end loop;
 raise exception 'Tabla de premios inválida';
end $$;
-- CSPRNG: rechaza el resto 2^32 mod 10000, sin sesgo de módulo.
-- Ningún parámetro del cliente ni saldo puede elegir o alterar el número.
create or replace function golden_internal.ruletas_azar()
returns integer language plpgsql volatile security invoker set search_path='' as $$
declare b bytea; n bigint;
begin
 loop
  b:=extensions.gen_random_bytes(4);
  n:=get_byte(b,0)::bigint*16777216+get_byte(b,1)::bigint*65536+get_byte(b,2)::bigint*256+get_byte(b,3)::bigint;
  exit when n<4294960000;
 end loop;
 return (n%10000)::integer;
end $$;
create or replace function golden_internal.ruletas_estado(p_uid uuid,p_now timestamptz)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare p golden_internal.roulette_pool; n integer; day_no integer:=floor(extract(epoch from p_now)/86400)::integer;
begin
 select * into strict p from golden_internal.roulette_pool where id;
 select used into n from golden_internal.roulette_daily where user_id=p_uid and day=day_no;n:=coalesce(n,0);
 return jsonb_build_object('config',golden_internal.ruletas_config(),'habilitado',p.enabled,
  'juegoAbierto',coalesce((select game_open from golden_internal.game_access where id),false),
  'bote',p.pot,'reserva',p.reserve,'financiado',p.funded,'ronda',p.round,
  'dia',day_no,'usados',n,'gratisRestantes',greatest(0,3-n),'pagosRestantes',greatest(0,2-greatest(0,n-3)),
  'precioPlata',case when n<3 then 0 when n=3 then 100 when n=4 then 200 else null end,
  'reiniciaAt',to_timestamp((day_no::bigint+1)*86400));
end $$;
create or replace function public.gf_ruletas_estado(p_uid uuid,p_op uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare receipt jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido';end if;
 if p_uid is null then raise exception 'Sesión requerida';end if;
 if not exists(select 1 from public.farms where user_id=p_uid) then raise exception 'Primero sincronizá tu granja';end if;
 if p_op is not null then select result into receipt from golden_internal.roulette_receipts where user_id=p_uid and op=p_op;end if;
 return jsonb_build_object('ok',true,'estado',golden_internal.ruletas_estado(p_uid,statement_timestamp()),'recibo',receipt,'found',receipt is not null);
end $$;
create or replace function public.gf_ruletas_girar(p_uid uuid,p_base text,p_op uuid,p_modo text,p_precio_esperado numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p golden_internal.roulette_pool; f public.farms; previous golden_internal.roulette_receipts;
 d jsonb; pend jsonb; request jsonb; reward jsonb; result jsonb; roll integer; count_used integer;
 now_at timestamptz; day_no integer; price numeric; balance numeric; payout numeric:=0;
 stamp timestamptz; paid numeric:=0; total_before numeric; paid_spend numeric; current_phase text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido';end if;
 if p_uid is null or p_op is null or p_base is null or p_modo is null or p_modo not in('golden','objetos')
  or p_precio_esperado is null or p_precio_esperado<0 or p_precio_esperado>200 or p_precio_esperado::text in('NaN','Infinity','-Infinity') then raise exception 'Pedido de ruleta inválido';end if;
 request:=jsonb_build_object('modo',p_modo,'precioEsperado',p_precio_esperado);
 -- La reconciliación usa el mismo primer lock: una cancelación confirmada
 -- impide que un primer pedido retrasado llegue a cobrar después.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ruleta-op:'||p_uid::text||':'||p_op::text,0));
 -- Orden fijo: operación -> bote -> granja -> wallet.
 select * into strict p from golden_internal.roulette_pool where id for update;
 select * into f from public.farms where user_id=p_uid for update;
 if not found then raise exception 'Primero sincronizá tu granja';end if;
 now_at:=clock_timestamp();
 select * into previous from golden_internal.roulette_receipts where user_id=p_uid and op=p_op;
 if found then
  if previous.request<>request then raise exception 'Recibo usado para otro giro';end if;
  return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'estado',golden_internal.ruletas_estado(p_uid,now_at),'recibo',previous.result,'found',true,'repetido',true,'cancelado',coalesce((previous.result->>'cancelado')::boolean,false));
 end if;
 if not p.enabled then raise exception 'Las ruletas todavía no están disponibles';end if;
 if not coalesce((select game_open from golden_internal.game_access where id),false) then raise exception 'El acceso al juego está temporalmente cerrado';end if;
 if f.updated_at is distinct from p_base::timestamptz then raise exception 'conflicto: otra sesión guardó; sincronizá antes de girar';end if;
 d:=f.data;if jsonb_typeof(d) is distinct from 'object' then raise exception 'Partida inválida';end if;
 day_no:=floor(extract(epoch from now_at)/86400)::integer;
 if p_modo='objetos' then
  select used into count_used from golden_internal.roulette_daily where user_id=p_uid and day=day_no;count_used:=coalesce(count_used,0);
  if count_used>=5 then raise exception 'Ya usaste los 5 giros de hoy (UTC)';end if;
  price:=case when count_used<3 then 0 when count_used=3 then 100 else 200 end;
  if p_precio_esperado<>price then raise exception 'precio: cambió el coste del giro; revisá antes de confirmar';end if;
  balance:=coalesce((d->>'plata')::numeric,0);
  if balance<price or balance::text in('NaN','Infinity','-Infinity') then raise exception 'No alcanza la Plata';end if;
  pend:=coalesce(nullif(d->'mkPend','null'),'[]'::jsonb);
  if jsonb_typeof(pend) is distinct from 'array' or jsonb_array_length(pend)>=100 then raise exception 'Recogé tus entregas pendientes antes de girar';end if;
  roll:=golden_internal.ruletas_azar();reward:=golden_internal.ruletas_premio(roll);
  d:=jsonb_set(d,'{plata}',to_jsonb(balance-price));
  -- Cola duradera: duplicados/inventario lleno siguen pendientes, sin rerrollear.
  d:=jsonb_set(d,'{mkPend}',pend||jsonb_build_array(jsonb_build_object('kind',reward->>'kind','item',reward->>'item','qty',(reward->>'qty')::integer,'payload',reward->'payload')));
  insert into golden_internal.roulette_daily(user_id,day,used) values(p_uid,day_no,count_used+1) on conflict(user_id,day) do update set used=excluded.used;
  result:=jsonb_build_object('op',p_op,'modo',p_modo,'roll',roll,'segmentIndex',(reward->>'segmentIndex')::integer,'premio',reward-'weight'-'segmentIndex','coste',price,'payout',0,'goldenWin',false,'dia',day_no,'intento',count_used+1,'created_at',now_at);
 else
  price:=1;
  if p_precio_esperado<>price then raise exception 'precio: cambió el coste del ticket; revisá antes de confirmar';end if;
  if not p.funded then raise exception 'Próximo bote en preparación';end if;
  balance:=coalesce((d->>'golden')::numeric,0);
  if balance<price or balance::text in('NaN','Infinity','-Infinity') then raise exception 'No alcanza el Golden';end if;
  -- Descontar Golden comprado ANTES del premio, incluso si gana y el neto crece.
  -- Primero se gasta Golden ganado; el premio nunca se reclasifica como comprado.
  select ar.phase into current_phase from golden_internal.alpha_release ar where id;
  if current_phase='alpha' then
   select paid_remaining into paid from golden_internal.usdt_wallets where user_id=p_uid for update;paid:=coalesce(paid,0);
   total_before:=greatest(0,balance)+golden_internal.usdt_bag(d->'cont')+golden_internal.usdt_bag(d->'tumba');
   paid_spend:=greatest(0,price-greatest(0,total_before-paid));
   if paid_spend>0 then update golden_internal.usdt_wallets set paid_remaining=greatest(0,paid_remaining-paid_spend) where user_id=p_uid;end if;
  end if;
  roll:=golden_internal.ruletas_azar();p.pot:=p.pot+.8;p.reserve:=p.reserve+.2;p.tickets:=p.tickets+1;
  if roll<20 then
   payout:=p.pot;p.paid_out:=p.paid_out+payout;p.round:=p.round+1;p.funded:=p.reserve>=10;
   if p.funded then p.reserve:=p.reserve-10;p.pot:=10;else p.pot:=0;end if;
  end if;
  d:=jsonb_set(d,'{golden}',to_jsonb(balance-price+payout));
  update golden_internal.roulette_pool set pot=p.pot,reserve=p.reserve,funded=p.funded,round=p.round,tickets=p.tickets,paid_out=p.paid_out,updated_at=now_at where id;
  result:=jsonb_build_object('op',p_op,'modo',p_modo,'roll',roll,'segmentIndex',case when roll<20 then 0 else 1 end,'premio',case when roll<20 then jsonb_build_object('kind','golden','item','golden','qty',payout,'label','Bote Golden') else null end,'coste',price,'payout',payout,'goldenWin',roll<20,'ronda',case when roll<20 then p.round-1 else p.round end,'created_at',now_at);
 end if;
 stamp:=greatest(clock_timestamp(),f.updated_at+interval '1 millisecond');
 update public.farms set data=d,updated_at=stamp where user_id=p_uid returning * into f;
 insert into golden_internal.roulette_receipts(user_id,op,request,result,created_at) values(p_uid,p_op,request,result,now_at);
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'estado',golden_internal.ruletas_estado(p_uid,now_at),'recibo',result,'found',true,'repetido',false);
end $$;

-- Operación autoritativa de reconciliación, nunca un nuevo giro. Si el primer
-- pedido no llegó, se guarda una cancelación permanente ANTES de responder.
-- Si estaba en vuelo, el lock espera su desenlace y devuelve el mismo recibo.
create or replace function public.gf_ruletas_reconciliar(p_uid uuid,p_op uuid,p_modo text,p_precio_esperado numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.farms; previous golden_internal.roulette_receipts; request jsonb; result jsonb; now_at timestamptz;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido';end if;
 if p_uid is null or p_op is null or p_modo is null or p_modo not in('golden','objetos')
  or p_precio_esperado is null or p_precio_esperado not in(0,1,100,200) then raise exception 'Pedido de comprobación inválido';end if;
 request:=jsonb_build_object('modo',p_modo,'precioEsperado',p_precio_esperado);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ruleta-op:'||p_uid::text||':'||p_op::text,0));
 perform 1 from golden_internal.roulette_pool where id for update;
 select * into f from public.farms where user_id=p_uid for update;
 if not found then raise exception 'Primero sincronizá tu granja';end if;
 now_at:=clock_timestamp();
 select * into previous from golden_internal.roulette_receipts where user_id=p_uid and op=p_op;
 if found then
  if previous.request<>request then raise exception 'Recibo usado para otro giro';end if;
  result:=previous.result;
 else
  result:=jsonb_build_object('op',p_op,'modo',p_modo,'cancelado',true,'coste',0,'payout',0,'premio',null,'created_at',now_at);
  insert into golden_internal.roulette_receipts(user_id,op,request,result,created_at) values(p_uid,p_op,request,result,now_at);
 end if;
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'estado',golden_internal.ruletas_estado(p_uid,now_at),'recibo',result,'found',true,'repetido',true,'cancelado',coalesce((result->>'cancelado')::boolean,false));
end $$;
revoke all on function golden_internal.ruletas_config(),golden_internal.ruletas_premio(integer),golden_internal.ruletas_azar(),golden_internal.ruletas_estado(uuid,timestamptz),public.gf_ruletas_estado(uuid,uuid),public.gf_ruletas_girar(uuid,text,uuid,text,numeric),public.gf_ruletas_reconciliar(uuid,uuid,text,numeric) from public,anon,authenticated;
grant execute on function golden_internal.ruletas_config(),golden_internal.ruletas_premio(integer),golden_internal.ruletas_azar(),golden_internal.ruletas_estado(uuid,timestamptz),public.gf_ruletas_estado(uuid,uuid),public.gf_ruletas_girar(uuid,text,uuid,text,numeric),public.gf_ruletas_reconciliar(uuid,uuid,text,numeric) to service_role;
commit;
