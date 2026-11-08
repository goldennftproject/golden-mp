-- Owner-approved shared grave protocol. Installs disabled; preserves all existing saves.
-- Preserves current players/saves; both feature gates start false.
-- Shared graves are funded only by a server-side defeated-player deposit.
-- Raw browser graves are never imported; ordinary writes cannot mint escrow.
begin;
create schema if not exists golden_internal;
grant usage on schema golden_internal to service_role;
create table if not exists golden_internal.graves_config(
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 protocol_ready boolean not null default false
);
insert into golden_internal.graves_config(id)values(true)on conflict(id)do nothing;
create table if not exists golden_internal.player_graves(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id)on delete cascade,
 owner_name text not null,
 source_key text not null,
 zona text not null,
 x numeric not null,y numeric not null,
 expires_at timestamptz not null,
 items jsonb not null check(jsonb_typeof(items)='array'),
 revision bigint not null default 1 check(revision>0),
 status text not null default 'active' check(status in('active','claimed','replaced','expired')),
 created_at timestamptz not null default clock_timestamp(),
 unique(owner_id,source_key)
);
create unique index if not exists player_graves_one_active_owner on golden_internal.player_graves(owner_id)where status='active';
create index if not exists player_graves_zone_expiry on golden_internal.player_graves(zona,expires_at)where status='active';
create table if not exists golden_internal.grave_receipts(
 actor_id uuid not null references auth.users(id)on delete cascade,
 op uuid not null,request jsonb not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(actor_id,op)
);
create table if not exists golden_internal.grave_events(
 id bigint generated always as identity primary key,
 grave_id uuid not null references golden_internal.player_graves(id),
 owner_id uuid not null references auth.users(id)on delete cascade,
 actor_id uuid references auth.users(id)on delete set null,
 event text not null,
 from_revision bigint,to_revision bigint not null,
 owner_base_before timestamptz,owner_base_after timestamptz,
 grave_before jsonb,grave_after jsonb,
 non_grave_hash_before text,non_grave_hash_after text,owner_save_op_before text,
 created_at timestamptz not null default clock_timestamp()
);
create index if not exists grave_events_owner on golden_internal.grave_events(owner_id,id);
alter table golden_internal.graves_config enable row level security;
alter table golden_internal.player_graves enable row level security;
alter table golden_internal.grave_receipts enable row level security;
alter table golden_internal.grave_events enable row level security;
revoke all on golden_internal.graves_config,golden_internal.player_graves,golden_internal.grave_receipts,golden_internal.grave_events from public,anon,authenticated;
grant select on golden_internal.graves_config to service_role;
grant select,insert,update on golden_internal.player_graves,golden_internal.grave_receipts to service_role;
grant select,insert on golden_internal.grave_events to service_role;
grant usage,select on sequence golden_internal.grave_events_id_seq to service_role;

create or replace function golden_internal.graves_enabled()
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select enabled and protocol_ready from golden_internal.graves_config where id),false)
$$;
create or replace function golden_internal.graves_server()
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Servidor requerido';end if;
end $$;
create or replace function golden_internal.graves_game_open()
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare opened boolean;
begin
 if to_regclass('golden_internal.game_access')is null then return false;end if;
 execute 'select coalesce((select game_open from golden_internal.game_access where id),false)'into opened;
 return opened;
end $$;
create or replace function golden_internal.grave_source(t jsonb)
returns text language sql immutable security invoker set search_path='' as $$
 select md5(jsonb_build_array(t->'zona',t->'x',t->'y',t->'hasta')::text)
$$;
create or replace function golden_internal.grave_non_tumba_hash(d jsonb)
returns text language sql immutable security invoker set search_path='' as $$
 select encode(sha256(convert_to((d-'tumba')::text,'UTF8')),'hex')
$$;
create or replace function golden_internal.grave_items_valid(items jsonb)
returns void language plpgsql immutable security invoker set search_path='' as $$
declare e jsonb;n numeric;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>256 then raise exception 'Botín inválido';end if;
 for e in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(e) is distinct from 'object' or e->>'kind' is null or e->>'kind' not in('res','seed','fish','dish','arm','armorset','gear','cont')
   or e->>'k' is null or length(e->>'k')not between 1 and 100 or e->>'k' in('__proto__','constructor','prototype')
   or jsonb_typeof(e->'n') is distinct from 'number' then raise exception 'Objeto de botín inválido';end if;
  n:=(e->>'n')::numeric;if n<=0 or n>9007199254740991 or n::text in('NaN','Infinity','-Infinity')then raise exception 'Cantidad inválida';end if;
 end loop;
end $$;
create or replace function golden_internal.grave_container_items(c jsonb,depth integer default 1)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare e jsonb;out_items jsonb:='[]';capacity integer;
begin
 if c is null or c='null'::jsonb then return '[]'::jsonb;end if;
 capacity:=case c->>'c' when 'bag'then 8 when 'backpack'then 20 else null end;
 if depth>2 or jsonb_typeof(c) is distinct from 'object' or capacity is null or jsonb_typeof(c->'items')is distinct from'array' or jsonb_array_length(c->'items')>capacity then raise exception 'Contenedor inválido';end if;
 for e in select value from jsonb_array_elements(c->'items')loop
  if e->>'c' in('bag','backpack')and jsonb_typeof(e->'items')='array' then out_items:=out_items||golden_internal.grave_container_items(e,depth+1);
  else perform golden_internal.grave_items_valid(jsonb_build_array(e));out_items:=out_items||jsonb_build_array(e);end if;
 end loop;
 return out_items;
end $$;
create or replace function golden_internal.grave_container_shape(c jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare e record;children jsonb:='[]';
begin
 if c is null or c='null'::jsonb then return 'null'::jsonb;end if;
 for e in select value,ordinality from jsonb_array_elements(c->'items')with ordinality loop
  if e.value->>'c' in('bag','backpack')and jsonb_typeof(e.value->'items')='array' then
   children:=children||jsonb_build_array(jsonb_build_array(e.ordinality,golden_internal.grave_container_shape(e.value)));
  end if;
 end loop;
 return jsonb_build_object('root',c-'items','containers',children);
end $$;
create or replace function golden_internal.grave_totals(items jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_array(k,n)order by k),'[]'::jsonb)
 from(select (value-'n')::text k,sum((value->>'n')::numeric)n from jsonb_array_elements(items)group by (value-'n')::text)s
$$;
create or replace function golden_internal.grave_header(g golden_internal.player_graves,p_uid uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',g.id,'nombre',g.owner_name,'zona',g.zona,'x',g.x,'y',g.y,'expiresAt',g.expires_at,'revision',g.revision,'isMine',g.owner_id=p_uid)
$$;
create or replace function golden_internal.grave_actor_near(d jsonb,g golden_internal.player_graves)
returns boolean language sql stable security invoker set search_path='' as $$
 -- This checks the last accepted browser journey, NOT authoritative live movement.
 select coalesce(jsonb_typeof(d->'hp')='number'and(d->>'hp')::numeric>0 and d#>>'{zonaViaje,pos,zona}'=g.zona and
  jsonb_typeof(d#>'{zonaViaje,pos,x}')='number'and jsonb_typeof(d#>'{zonaViaje,pos,y}')='number'and
  power((d#>>'{zonaViaje,pos,x}')::numeric-g.x,2)+power((d#>>'{zonaViaje,pos,y}')::numeric-g.y,2)<=power(67.2::numeric,2),false)
$$;

-- Ordinary accepted writes preserve canonical escrow, but NEVER create it.
-- Legacy accounts/graves stay private until a confirmed server death enrolls
-- them. The service-operation bypass is transaction-local, not browser input.
create or replace function golden_internal.grave_capture()
returns trigger language plpgsql security invoker set search_path='' as $$
declare t jsonb;old_t jsonb;expired boolean;
begin
 if current_setting('golden.grave_commit',true)='1'then return new;end if;
 if tg_op='INSERT'then
  if new.data ? '_graveProtocol'then raise exception 'El protocolo de tumbas sólo se inicia en el servidor';end if;
  return new;
 end if;
 if old.data->>'_graveProtocol'is distinct from'1'then
  if new.data->'_graveProtocol'is distinct from old.data->'_graveProtocol'then raise exception 'El protocolo de tumbas sólo se inicia en el servidor';end if;
  return new; -- compatible private legacy grave; absolutely no registry writes
 end if;
 new.data:=jsonb_set(new.data,'{_graveProtocol}','1'::jsonb);
 old_t:=coalesce(old.data->'tumba','null'::jsonb);t:=coalesce(new.data->'tumba','null'::jsonb);
 expired:=jsonb_typeof(old_t)='object'and jsonb_typeof(old_t->'hasta')='number'and (old_t->>'hasta')::numeric<=extract(epoch from clock_timestamp())*1000;
 if t is distinct from old_t and not(expired and t='null'::jsonb)then raise exception 'conflicto: la tumba compartida requiere operación confirmada';end if;
 return new;
end $$;
create trigger golden_grave_capture before insert or update of data on public.farms for each row execute function golden_internal.grave_capture();

create or replace function public.gf_graves_status(p_uid uuid,p_zone text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare enabled boolean;markers jsonb;own uuid;wall timestamptz:=clock_timestamp();
begin
 perform golden_internal.graves_server();if p_uid is null then raise exception'Sesión requerida';end if;
 enabled:=golden_internal.graves_enabled();
 if enabled then
  select id into own from golden_internal.player_graves where owner_id=p_uid and status='active'and expires_at>wall;
  select coalesce(jsonb_agg(golden_internal.grave_header(g,p_uid)),'[]'::jsonb)into markers from(select * from golden_internal.player_graves where (zona=p_zone or owner_id=p_uid)and status='active'and expires_at>wall order by owner_id=p_uid desc,created_at,id limit 100)g;
 end if;
 return jsonb_build_object('ok',true,'enabled',enabled,'serverNow',wall,'ownGraveId',own,'markers',coalesce(markers,'[]'::jsonb));
end $$;
create or replace function public.gf_graves_claim_snapshot(p_uid uuid,p_id uuid,p_base text,p_revision bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare g golden_internal.player_graves;f public.farms;owner_f public.farms;
begin
 perform golden_internal.graves_server();if not golden_internal.graves_enabled()then raise exception'Tumbas compartidas no disponibles';end if;
 select * into strict g from golden_internal.player_graves where id=p_id;
 select * into strict f from public.farms where user_id=p_uid;
 select * into strict owner_f from public.farms where user_id=g.owner_id;
 if f.updated_at is distinct from p_base::timestamptz then raise exception'conflicto: otra sesión guardó';end if;
 if g.status<>'active'or g.revision<>p_revision or g.expires_at<=clock_timestamp()then raise exception'La tumba cambió o venció';end if;
 if not golden_internal.grave_actor_near(f.data,g)then raise exception'Acercate al cuerpo para recoger';end if;
 return jsonb_build_object('ok',true,'grave',jsonb_build_object('id',g.id,'revision',g.revision,'items',g.items,'expiresAt',g.expires_at),'actor',jsonb_build_object('data',f.data,'updated_at',f.updated_at),'ownerBase',owner_f.updated_at);
end $$;
create or replace function public.gf_graves_claim(p_uid uuid,p_id uuid,p_op uuid,p_base text,p_owner_base text,p_revision bigint,p_cont jsonb,p_remaining jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare g golden_internal.player_graves;f public.farms;owner_f public.farms;r golden_internal.grave_receipts;
 request jsonb:=jsonb_build_object('action','recoger','graveId',p_id,'revision',p_revision);actor_d jsonb;owner_d jsonb;t jsonb;
 wall timestamptz;stamp timestamptz;before_items jsonb;after_items jsonb;result jsonb;from_revision bigint;
begin
 perform golden_internal.graves_server();
 if p_uid is null or p_id is null or p_op is null or p_base is null or p_owner_base is null or p_revision is null or p_revision<1 then raise exception'Pedido de recogida inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended('grave-op:'||p_uid::text||':'||p_op::text,0));
 select * into r from golden_internal.grave_receipts where actor_id=p_uid and op=p_op;
 if found then
  if r.request<>request then raise exception'Recibo usado para otra tumba';end if;
  select * into strict f from public.farms where user_id=p_uid;
  return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',r.result,'repeated',true,'cancelado',coalesce((r.result->>'cancelado')::boolean,false),
   'conflicto',not coalesce((r.result->>'cancelado')::boolean,false)and f.updated_at is distinct from(r.result->>'actorBaseAfter')::timestamptz);
 end if;
 if not golden_internal.graves_enabled()then raise exception'Tumbas compartidas no disponibles';end if;
 if not golden_internal.graves_game_open()then raise exception'El acceso al juego está temporalmente cerrado';end if;
 select * into strict g from golden_internal.player_graves where id=p_id; -- owner ID is immutable
 -- Global lock order for every claimant: operation -> farms UUID order -> grave.
 perform 1 from public.farms where user_id in(p_uid,g.owner_id)order by user_id for update;
 select * into strict f from public.farms where user_id=p_uid;
 select * into strict owner_f from public.farms where user_id=g.owner_id;
 select * into strict g from golden_internal.player_graves where id=p_id for update;
 wall:=clock_timestamp();
 if f.updated_at is distinct from p_base::timestamptz or owner_f.updated_at is distinct from p_owner_base::timestamptz then raise exception'conflicto: una granja guardó antes de recoger';end if;
 if g.status<>'active'or g.revision<>p_revision or g.expires_at<=wall then raise exception'La tumba cambió o venció';end if;
 if not golden_internal.grave_actor_near(f.data,g)then raise exception'Acercate al cuerpo para recoger';end if;
 t:=owner_f.data->'tumba';
 if t->>'id'is distinct from g.id::text or (t->>'revision')::bigint is distinct from g.revision or t->'items'is distinct from g.items then raise exception'conflicto: fuente de tumba sin sincronizar';end if;
 perform golden_internal.grave_items_valid(p_remaining);
 before_items:=golden_internal.grave_container_items(f.data->'cont')||g.items;
 after_items:=golden_internal.grave_container_items(p_cont)||p_remaining;
 if golden_internal.grave_container_shape(f.data->'cont')is distinct from golden_internal.grave_container_shape(p_cont)then raise exception'No se puede cambiar el contenedor al recoger';end if;
 if golden_internal.grave_totals(before_items)is distinct from golden_internal.grave_totals(after_items)then raise exception'La recogida no conserva los objetos';end if;
 -- Leftovers must be unchanged whole source piles; no synthetic item/payload or
 -- reclassification is accepted from the trusted Edge planner.
 if exists(select 1 from(select value,count(*)n from jsonb_array_elements(p_remaining)group by value)remaining_group
  where remaining_group.n>(select count(*)from jsonb_array_elements(g.items)s where s=remaining_group.value))then raise exception'Resto de botín inválido';end if;
 if exists(select 1 from jsonb_array_elements(golden_internal.grave_totals(golden_internal.grave_container_items(f.data->'cont')))b
  where (b->>1)::numeric>coalesce((select(a->>1)::numeric from jsonb_array_elements(golden_internal.grave_totals(golden_internal.grave_container_items(p_cont)))a where a->>0=b->>0),0))then raise exception'No se puede quitar inventario al recoger';end if;
 if f.data->'cont'='null'::jsonb or f.data->'cont'is null then
  if p_remaining is distinct from g.items then raise exception'No llevas contenedor';end if;
 end if;
 if p_remaining=g.items and p_cont is not distinct from f.data->'cont'then
  result:=jsonb_build_object('action','recoger','op',p_op,'graveId',g.id,'revisionBefore',g.revision,'revisionAfter',g.revision,'claimedPiles',0,'remainingPiles',jsonb_array_length(p_remaining),'actorBaseBefore',f.updated_at,'actorBaseAfter',f.updated_at,'createdAt',wall,'cancelado',false,'noFit',true);
  insert into golden_internal.grave_receipts(actor_id,op,request,result)values(p_uid,p_op,request,result);
  return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',result,'repeated',false,'cancelado',false,'conflicto',false);
 end if;
 from_revision:=g.revision;
 actor_d:=jsonb_set(f.data,'{cont}',coalesce(p_cont,'null'::jsonb));
 owner_d:=jsonb_set(owner_f.data,'{tumba}',case when jsonb_array_length(p_remaining)=0 then'null'::jsonb else t||jsonb_build_object('items',p_remaining,'revision',g.revision+1)end);
 stamp:=greatest(wall,f.updated_at+interval'1 millisecond',owner_f.updated_at+interval'1 millisecond');
 perform set_config('golden.grave_commit','1',true);
 update golden_internal.player_graves set items=p_remaining,revision=revision+1,status=case when jsonb_array_length(p_remaining)=0 then'claimed'else'active'end where id=g.id returning * into g;
 if p_uid=g.owner_id then actor_d:=jsonb_set(actor_d,'{tumba}',owner_d->'tumba');
 else update public.farms set data=owner_d,updated_at=stamp where user_id=g.owner_id;end if;
 update public.farms set data=actor_d,updated_at=stamp where user_id=p_uid returning * into f;
 insert into golden_internal.grave_events(grave_id,owner_id,actor_id,event,from_revision,to_revision,owner_base_before,owner_base_after,grave_before,grave_after,non_grave_hash_before,non_grave_hash_after,owner_save_op_before)
 values(g.id,g.owner_id,p_uid,'claimed',from_revision,g.revision,owner_f.updated_at,stamp,t,owner_d->'tumba',golden_internal.grave_non_tumba_hash(owner_f.data),golden_internal.grave_non_tumba_hash(case when p_uid=g.owner_id then actor_d else owner_d end),owner_f.data->>'_saveOp');
 result:=jsonb_build_object('action','recoger','op',p_op,'graveId',g.id,'revisionBefore',from_revision,'revisionAfter',g.revision,'claimedPiles',jsonb_array_length(t->'items')-jsonb_array_length(p_remaining),'remainingPiles',jsonb_array_length(p_remaining),'actorBaseBefore',p_base::timestamptz,'actorBaseAfter',f.updated_at,'createdAt',wall,'cancelado',false);
 insert into golden_internal.grave_receipts(actor_id,op,request,result)values(p_uid,p_op,request,result);
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',result,'repeated',false,'cancelado',false,'conflicto',false);
end $$;
create or replace function public.gf_graves_reconcile(p_uid uuid,p_id uuid,p_op uuid,p_revision bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r golden_internal.grave_receipts;f public.farms;request jsonb:=jsonb_build_object('action','recoger','graveId',p_id,'revision',p_revision);result jsonb;
begin
 perform golden_internal.graves_server();if p_uid is null or p_id is null or p_op is null or p_revision is null or p_revision<1 then raise exception'Pedido de comprobación inválido';end if;
 -- Always available, including after disable: never strand a durable receipt.
 perform pg_advisory_xact_lock(hashtextextended('grave-op:'||p_uid::text||':'||p_op::text,0));
 select * into strict f from public.farms where user_id=p_uid for update;
 select * into r from golden_internal.grave_receipts where actor_id=p_uid and op=p_op;
 if found then if r.request<>request then raise exception'Recibo usado para otra tumba';end if;result:=r.result;
 else
  result:=jsonb_build_object('action','recoger','op',p_op,'graveId',p_id,'cancelado',true,'createdAt',clock_timestamp());
  insert into golden_internal.grave_receipts(actor_id,op,request,result)values(p_uid,p_op,request,result);
 end if;
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',result,'repeated',true,'cancelado',coalesce((result->>'cancelado')::boolean,false),
  'conflicto',not coalesce((result->>'cancelado')::boolean,false)and f.updated_at is distinct from(result->>'actorBaseAfter')::timestamptz);
end $$;
-- Deterministic death debit from canonical accepted state. Only the Edge CSPRNG
-- chooses break/drop slots; all quantities, metadata and destinations are derived here.
create or replace function golden_internal.grave_death_plan(d jsonb,break_slots jsonb,drop_slots jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare root jsonb;inside jsonb;items jsonb;e jsonb;k text;slot text;pz text;aset text;durability numeric;
 gear jsonb;weapons jsonb;armor jsonb;ad jsonb;off_map jsonb;eq jsonb;pieces jsonb;piece_dur jsonb;
 labels jsonb:='[]';gastadas jsonb:='[]';rotas jsonb:='[]';supported_gear text[]:=array['botas_cuero','casco_cuero','pechera_cuero','escudo_madera','casco_hierro','escudo_hierro','pechera_hierro'];
begin
 if jsonb_typeof(d)is distinct from'object'or jsonb_typeof(d->'hp')is distinct from'number'or(d->>'hp')::numeric>0
  or jsonb_typeof(d->'hpMax')is distinct from'number'or(d->>'hpMax')::numeric<=0 then raise exception'La muerte requiere una derrota confirmada';end if;
 if jsonb_typeof(break_slots)is distinct from'array'or jsonb_array_length(break_slots)>5 or jsonb_typeof(drop_slots)is distinct from'array'or jsonb_array_length(drop_slots)>6 then raise exception'Selección de equipo inválida';end if;
 if exists(select 1 from jsonb_array_elements(break_slots)b where jsonb_typeof(b)<>'string'or b#>>'{}'not in('yelmo','pecho','pantalones','botas','guantes'))
  or exists(select 1 from jsonb_array_elements(drop_slots)b where jsonb_typeof(b)<>'string'or b#>>'{}'not in('casco','armadura','botas','escudo','arma','set'))
  or(select count(*)from jsonb_array_elements(break_slots))<>(select count(distinct value)from jsonb_array_elements(break_slots))
  or(select count(*)from jsonb_array_elements(drop_slots))<>(select count(distinct value)from jsonb_array_elements(drop_slots))then raise exception'Selección de equipo inválida';end if;
 root:=coalesce(d->'cont','null'::jsonb);inside:=golden_internal.grave_container_items(root);items:=inside;
 if root<>'null'::jsonb then
  for e in select value from jsonb_array_elements(root->'items')loop
   if e->>'c'in('bag','backpack')and jsonb_typeof(e->'items')='array'then items:=items||jsonb_build_array(jsonb_build_object('kind','cont','k',e->>'c','n',1));end if;
  end loop;
  items:=items||jsonb_build_array(jsonb_build_object('kind','cont','k',root->>'c','n',1));
 end if;
 gear:=coalesce(nullif(d->'gear','null'),'{}'::jsonb);weapons:=coalesce(nullif(d->'weapons','null'),'{}'::jsonb);
 armor:=coalesce(nullif(d->'armor','null'),'{}'::jsonb);ad:=coalesce(nullif(d->'armorDur','null'),'{}'::jsonb);off_map:=coalesce(nullif(d->'armorOff','null'),'{}'::jsonb);eq:=coalesce(d->'armorEq','null'::jsonb);aset:=d->>'armorEq';
 -- Existing armour rule: every active healthy piece loses five durability;
 -- only an already-zero active piece can appear in break_slots (10% Edge roll).
 for pz in select value#>>'{}'from jsonb_array_elements(break_slots)loop
  k:='arm_'||aset||'_'||pz;
  if aset is null or aset not in('fibra','piel','cuero','colmillo')or coalesce(armor->k,'null')in('null'::jsonb,'false'::jsonb,'0'::jsonb)or coalesce((off_map->>k)::boolean,false)then raise exception'No se puede romper una pieza inactiva';end if;
  durability:=case when jsonb_typeof(ad->k)='number'then greatest(0,least(100,(ad->>k)::numeric))else 100 end;
  if durability<>0 then raise exception'No se puede romper una pieza sana';end if;
 end loop;
 if aset in('fibra','piel','cuero','colmillo')then
  foreach pz in array array['yelmo','pecho','pantalones','botas','guantes']loop
   k:='arm_'||aset||'_'||pz;
   if coalesce(armor->k,'null')in('null'::jsonb,'false'::jsonb,'0'::jsonb)or coalesce((off_map->>k)::boolean,false)then continue;end if;
   durability:=case when jsonb_typeof(ad->k)='number'then greatest(0,least(100,(ad->>k)::numeric))else 100 end;
   if durability>0 then ad:=jsonb_set(ad,array[k],to_jsonb(greatest(0,durability-5)));gastadas:=gastadas||jsonb_build_array(pz);
   elsif break_slots?pz then armor:=armor-k;ad:=ad-k;rotas:=rotas||jsonb_build_array(pz);end if;
  end loop;
 end if;
 -- Equipment order is the same as equipoPuesto: four legacy slots, weapon, set.
 foreach slot in array array['casco','armadura','botas','escudo','arma','set']loop
  if not(drop_slots?slot)then continue;end if;
  if slot in('casco','armadura','botas','escudo')then
   k:=gear->>slot;if k is null or not(k=any(supported_gear))then raise exception'No llevas esa pieza';end if;
   gear:=jsonb_set(gear,array[slot],'null'::jsonb);items:=items||jsonb_build_array(jsonb_build_object('kind','gear','k',k,'n',1));labels:=labels||jsonb_build_array(k);
  elsif slot='arma'then
   k:=gear->>'arma';if k is null or jsonb_typeof(weapons->k)is distinct from'object'then raise exception'No llevas esa arma';end if;
   items:=items||jsonb_build_array(jsonb_build_object('kind','arm','k',k,'n',1,'w',weapons->k));weapons:=weapons-k;gear:=jsonb_set(gear,'{arma}','null'::jsonb);labels:=labels||jsonb_build_array(k);
  else
   if aset is null or aset not in('fibra','piel','cuero','colmillo')then raise exception'No llevas esa armadura';end if;
   pieces:='[]';piece_dur:='{}';
   foreach pz in array array['yelmo','pecho','pantalones','botas','guantes']loop
    k:='arm_'||aset||'_'||pz;
    if coalesce(armor->k,'null')in('null'::jsonb,'false'::jsonb,'0'::jsonb)or coalesce((off_map->>k)::boolean,false)then continue;end if;
    durability:=case when jsonb_typeof(ad->k)='number'then greatest(0,least(100,(ad->>k)::numeric))else 100 end;
    pieces:=pieces||jsonb_build_array(pz);piece_dur:=jsonb_set(piece_dur,array[pz],to_jsonb(durability));armor:=armor-k;ad:=ad-k;
   end loop;
   if jsonb_array_length(pieces)=0 then raise exception'No llevas esa armadura';end if;
   items:=items||jsonb_build_array(jsonb_build_object('kind','armorset','k',aset,'n',1,'piezas',pieces,'dur',piece_dur));labels:=labels||jsonb_build_array(aset);eq:='null'::jsonb;
  end if;
 end loop;
 perform golden_internal.grave_items_valid(items);
 d:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(d,'{cont}','null'::jsonb),'{gear}',gear),'{weapons}',weapons),'{armor}',armor),'{armorDur}',ad),'{armorOff}',off_map),'{armorEq}',eq);
 return jsonb_build_object('data',d,'items',items,'summary',jsonb_build_object('pilas',jsonb_array_length(inside),'piezas',jsonb_array_length(drop_slots),'cont',case when root='null'::jsonb then null else root->>'c'end,'piezasLabel',labels,'armadura',jsonb_build_object('gastadas',gastadas,'rotas',rotas)));
end $$;
create or replace function public.gf_graves_deposit_snapshot(p_uid uuid,p_base text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.farms;p jsonb;
begin
 perform golden_internal.graves_server();if not golden_internal.graves_enabled()then raise exception'Tumbas compartidas no disponibles';end if;
 if not golden_internal.graves_game_open()then raise exception'El acceso al juego está temporalmente cerrado';end if;
 select * into strict f from public.farms where user_id=p_uid;
 if p_base is null or f.updated_at is distinct from p_base::timestamptz then raise exception'conflicto: otra sesión guardó';end if;
 if jsonb_typeof(f.data->'hp')is distinct from'number'or(f.data->>'hp')::numeric>0 then raise exception'La muerte requiere una derrota confirmada';end if;
 p:=f.data#>'{zonaViaje,pos}';
 if jsonb_typeof(p)is distinct from'object'or p->>'zona'is null or p->>'zona'!~'^[a-z_]{1,32}$'or jsonb_typeof(p->'x')is distinct from'number'or jsonb_typeof(p->'y')is distinct from'number'
  or(p->>'x')::numeric<0 or(p->>'x')::numeric>1344 or(p->>'y')::numeric<0 or(p->>'y')::numeric>630 then raise exception'La muerte requiere la posición del viaje aceptado';end if;
 return jsonb_build_object('ok',true,'actor',jsonb_build_object('data',f.data,'updated_at',f.updated_at),'deathSource',md5(jsonb_build_array(f.user_id,f.updated_at)::text));
end $$;
create or replace function public.gf_graves_deposit_commit(p_uid uuid,p_op uuid,p_base text,p_plan jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.farms;r golden_internal.grave_receipts;g golden_internal.player_graves;
 request jsonb:='{"action":"morir"}'::jsonb;plan jsonb;new_d jsonb;old_d jsonb;pos jsonb;items jsonb;t jsonb;
 wall timestamptz;stamp timestamptz;result jsonb;res_gain jsonb;journey jsonb;trip jsonb;grave_id uuid;matados numeric;
begin
 perform golden_internal.graves_server();if p_uid is null or p_op is null or p_base is null then raise exception'Pedido de muerte inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended('grave-op:'||p_uid::text||':'||p_op::text,0));
 select * into r from golden_internal.grave_receipts where actor_id=p_uid and op=p_op;
 if found then
  if r.request<>request then raise exception'Recibo usado para otra operación';end if;
  select * into strict f from public.farms where user_id=p_uid;
  return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',r.result,'repeated',true,'cancelado',coalesce((r.result->>'cancelado')::boolean,false),'conflicto',not coalesce((r.result->>'cancelado')::boolean,false)and f.updated_at is distinct from(r.result->>'actorBaseAfter')::timestamptz);
 end if;
 if not golden_internal.graves_enabled()then raise exception'Tumbas compartidas no disponibles';end if;
 if not golden_internal.graves_game_open()then raise exception'El acceso al juego está temporalmente cerrado';end if;
 select * into strict f from public.farms where user_id=p_uid for update;
 wall:=clock_timestamp();if f.updated_at is distinct from p_base::timestamptz then raise exception'conflicto: otra sesión guardó antes de confirmar la muerte';end if;
 -- Recheck every canonical precondition under the farm lock; no browser source.
 perform public.gf_graves_deposit_snapshot(p_uid,p_base);
 if jsonb_typeof(p_plan)is distinct from'object'or(p_plan-'breakSlots'-'dropSlots')<>'{}'::jsonb then raise exception'Plan de muerte inválido';end if;
 old_d:=f.data;plan:=golden_internal.grave_death_plan(f.data,p_plan->'breakSlots',p_plan->'dropSlots');new_d:=plan->'data';items:=plan->'items';pos:=f.data#>'{zonaViaje,pos}';journey:=f.data->'zonaViaje';
 if jsonb_array_length(items)>0 then
  update golden_internal.player_graves set status='replaced',revision=revision+1 where owner_id=p_uid and status='active';
  insert into golden_internal.player_graves(owner_id,owner_name,source_key,zona,x,y,expires_at,items,created_at)
   values(p_uid,left(coalesce(f.name,'Granjero'),60),'server:'||p_op::text,pos->>'zona',(pos->>'x')::numeric,(pos->>'y')::numeric,wall+interval'10 minutes',items,wall)returning * into g;
  grave_id:=g.id;t:=jsonb_build_object('id',g.id,'revision',g.revision,'zona',g.zona,'x',g.x,'y',g.y,'hasta',floor(extract(epoch from g.expires_at)*1000),'items',g.items);
  new_d:=jsonb_set(jsonb_set(new_d,'{tumba}',t),'{_graveProtocol}','1'::jsonb);
 else
  -- Original zero-item death does not erase the previous private grave. Avoid
  -- enrolling/locking a legacy grave that has not entered the shared protocol.
  if old_d->>'_graveProtocol'='1'or coalesce(old_d->'tumba','null'::jsonb)='null'::jsonb then new_d:=jsonb_set(new_d,'{_graveProtocol}','1'::jsonb);end if;
 end if;
 -- Existing death continuation, committed once with the inventory transaction:
 -- half current max HP, close journey, zero-minute cooldown; no rewards/download.
 new_d:=jsonb_set(jsonb_set(jsonb_set(new_d,'{hp}',to_jsonb(ceil((old_d->>'hpMax')::numeric/2))),'{zonaViaje}','null'::jsonb),'{zonaCdHasta}',to_jsonb(floor(extract(epoch from wall)*1000)));
 select coalesce(jsonb_object_agg(k,n),'{}'::jsonb)into res_gain from(select key k,greatest(0,value::numeric-coalesce((journey#>>array['res',key])::numeric,0))n from jsonb_each_text(coalesce(old_d->'res','{}'::jsonb)))q where n>0;
 select coalesce(sum(value::numeric),0)into matados from jsonb_each_text(coalesce(old_d#>'{stats,matar}','{}'::jsonb));
 trip:=jsonb_build_object('min',greatest(0,(extract(epoch from wall)*1000-coalesce((journey->>'t')::numeric,extract(epoch from wall)*1000))/60000),'res',res_gain,'plata',greatest(0,coalesce((old_d->>'plata')::numeric,0)-coalesce((journey->>'plata')::numeric,0)),'golden',greatest(0,coalesce((old_d->>'golden')::numeric,0)-coalesce((journey->>'golden')::numeric,0)),'xp',greatest(0,coalesce((old_d->>'combatXp')::numeric,0)-coalesce((journey->>'combatXp')::numeric,0)),'matados',greatest(0,matados-coalesce((journey->>'matados')::numeric,0)),'morral',0,'derrotado',true,'desgaste','[]'::jsonb);
 stamp:=greatest(wall,f.updated_at+interval'1 millisecond');perform set_config('golden.grave_commit','1',true);
 update public.farms set data=new_d,updated_at=stamp where user_id=p_uid returning * into f;
 if grave_id is not null then
  insert into golden_internal.grave_events(grave_id,owner_id,actor_id,event,to_revision,owner_base_before,owner_base_after,grave_before,grave_after,non_grave_hash_before,non_grave_hash_after,owner_save_op_before)
   values(grave_id,p_uid,p_uid,'registered',g.revision,p_base::timestamptz,stamp,old_d->'tumba',new_d->'tumba',golden_internal.grave_non_tumba_hash(old_d),golden_internal.grave_non_tumba_hash(new_d),old_d->>'_saveOp');
 end if;
 result:=jsonb_build_object('action','morir','op',p_op,'graveId',grave_id,'revisionAfter',case when grave_id is null then null else g.revision end,'createdAt',wall,'cancelado',false,'actorBaseBefore',p_base::timestamptz,'actorBaseAfter',f.updated_at,'summary',plan->'summary','viajeResumen',trip);
 insert into golden_internal.grave_receipts(actor_id,op,request,result)values(p_uid,p_op,request,result);
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',result,'repeated',false,'cancelado',false,'conflicto',false);
end $$;
create or replace function public.gf_graves_deposit_reconcile(p_uid uuid,p_op uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r golden_internal.grave_receipts;f public.farms;request jsonb:='{"action":"morir"}'::jsonb;result jsonb;
begin
 perform golden_internal.graves_server();if p_uid is null or p_op is null then raise exception'Pedido de comprobación inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended('grave-op:'||p_uid::text||':'||p_op::text,0));
 select * into strict f from public.farms where user_id=p_uid for update;
 select * into r from golden_internal.grave_receipts where actor_id=p_uid and op=p_op;
 if found then if r.request<>request then raise exception'Recibo usado para otra operación';end if;result:=r.result;
 else result:=jsonb_build_object('action','morir','op',p_op,'cancelado',true,'createdAt',clock_timestamp());insert into golden_internal.grave_receipts(actor_id,op,request,result)values(p_uid,p_op,request,result);end if;
 return jsonb_build_object('ok',true,'data',f.data,'updated_at',f.updated_at,'receipt',result,'repeated',true,'cancelado',coalesce((result->>'cancelado')::boolean,false),'conflicto',not coalesce((result->>'cancelado')::boolean,false)and f.updated_at is distinct from(result->>'actorBaseAfter')::timestamptz);
end $$;

create or replace function public.gf_graves_owner_delta(p_uid uuid,p_after bigint default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare events jsonb;
begin
 perform golden_internal.graves_server();if p_uid is null then raise exception'Sesión requerida';end if;
 select coalesce(jsonb_agg(jsonb_build_object('eventId',id,'graveId',grave_id,'kind',event,'fromRevision',from_revision,'toRevision',to_revision,'baseBefore',owner_base_before,'baseAfter',owner_base_after,'graveBefore',grave_before,'graveAfter',grave_after)order by id),'[]'::jsonb)into events
 from(select * from golden_internal.grave_events where owner_id=p_uid and id>p_after order by id limit 50)e;
 return jsonb_build_object('ok',true,'events',events);
end $$;

revoke all on function golden_internal.graves_enabled(),golden_internal.graves_server(),golden_internal.grave_source(jsonb),golden_internal.grave_items_valid(jsonb),golden_internal.grave_container_items(jsonb,integer),golden_internal.grave_container_shape(jsonb),golden_internal.grave_totals(jsonb),golden_internal.grave_header(golden_internal.player_graves,uuid),golden_internal.grave_actor_near(jsonb,golden_internal.player_graves),golden_internal.grave_capture(),public.gf_graves_status(uuid,text),public.gf_graves_claim_snapshot(uuid,uuid,text,bigint),public.gf_graves_claim(uuid,uuid,uuid,text,text,bigint,jsonb,jsonb),public.gf_graves_reconcile(uuid,uuid,uuid,bigint),public.gf_graves_owner_delta(uuid,bigint)from public,anon,authenticated;
grant execute on function golden_internal.graves_enabled(),golden_internal.graves_server(),golden_internal.grave_source(jsonb),golden_internal.grave_items_valid(jsonb),golden_internal.grave_container_items(jsonb,integer),golden_internal.grave_container_shape(jsonb),golden_internal.grave_totals(jsonb),golden_internal.grave_header(golden_internal.player_graves,uuid),golden_internal.grave_actor_near(jsonb,golden_internal.player_graves),golden_internal.grave_capture(),public.gf_graves_status(uuid,text),public.gf_graves_claim_snapshot(uuid,uuid,text,bigint),public.gf_graves_claim(uuid,uuid,uuid,text,text,bigint,jsonb,jsonb),public.gf_graves_reconcile(uuid,uuid,uuid,bigint),public.gf_graves_owner_delta(uuid,bigint)to service_role;
revoke all on function golden_internal.graves_game_open(),golden_internal.grave_non_tumba_hash(jsonb),golden_internal.grave_death_plan(jsonb,jsonb,jsonb),public.gf_graves_deposit_snapshot(uuid,text),public.gf_graves_deposit_commit(uuid,uuid,text,jsonb),public.gf_graves_deposit_reconcile(uuid,uuid)from public,anon,authenticated;
grant execute on function golden_internal.graves_game_open(),golden_internal.grave_non_tumba_hash(jsonb),golden_internal.grave_death_plan(jsonb,jsonb,jsonb),public.gf_graves_deposit_snapshot(uuid,text),public.gf_graves_deposit_commit(uuid,uuid,text,jsonb),public.gf_graves_deposit_reconcile(uuid,uuid)to service_role;

-- Compact foreign-claim proof; no full-farm history copies.
-- Read-only proof for the authenticated owner's ordinary-save hook; no row is rewritten.
create index if not exists grave_events_owner_base_before
on golden_internal.grave_events(owner_id,owner_base_before,id);

create or replace function public.gf_graves_save_proof(p_uid uuid,p_base text,p_op text,p_tumba jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.farms;e golden_internal.grave_events;start_event golden_internal.grave_events;
 base timestamptz;cursor_base timestamptz;anchor_base timestamptz;accepted boolean;
 cursor_grave jsonb;events jsonb:='[]';hash text;count_events integer:=0;last_event bigint:=0;
 wall timestamptz:=clock_timestamp();
begin
 perform golden_internal.graves_server();
 if p_uid is null or p_base is null or p_op is null or p_op!~'^[a-zA-Z0-9._-]{8,100}$' or
   jsonb_typeof(p_tumba)is distinct from'object' or jsonb_typeof(p_tumba->'items')is distinct from'array' or jsonb_array_length(p_tumba->'items')=0
 then return jsonb_build_object('ok',false,'reason','invalid_request');end if;
 base:=p_base::timestamptz;
 -- A claim locks this same owner row before changing either farm or recording its event.
 -- The row lock makes currentData and the end of the proof one consistent snapshot.
 select * into f from public.farms where user_id=p_uid for share;
 if not found or f.updated_at<=base then return jsonb_build_object('ok',false,'reason','no_newer_version');end if;
 accepted:=coalesce(f.data->>'_saveOp'=p_op,false);
 if accepted then
  select * into start_event from golden_internal.grave_events
   where owner_id=p_uid and grave_before=p_tumba and owner_base_before>base and
    owner_save_op_before=p_op order by id limit 1;
  if not found then return jsonb_build_object('ok',false,'reason','accepted_anchor_not_found');end if;
  anchor_base:=start_event.owner_base_before;
 else anchor_base:=base;end if;
 cursor_base:=anchor_base;cursor_grave:=p_tumba;
 loop
  if cursor_base=f.updated_at then exit;end if;
  count_events:=count_events+1;
  if count_events>50 then return jsonb_build_object('ok',false,'reason','history_limit');end if;
  select * into e from golden_internal.grave_events
   where owner_id=p_uid and owner_base_before=cursor_base order by id limit 1;
  if not found or e.event<>'claimed' or e.actor_id is null or e.actor_id=p_uid or
    e.id<=last_event or e.owner_base_after<=e.owner_base_before or e.owner_base_after>f.updated_at or
    e.non_grave_hash_before is null or e.non_grave_hash_after is null or
    e.non_grave_hash_before is distinct from e.non_grave_hash_after or
    e.grave_before is distinct from cursor_grave
   then return jsonb_build_object('ok',false,'reason','not_exclusively_foreign_grave_changes');end if;
  if hash is null then hash:=e.non_grave_hash_before;end if;
  if e.non_grave_hash_before<>hash or e.non_grave_hash_after<>hash
   then return jsonb_build_object('ok',false,'reason','non_grave_change');end if;
  events:=events||jsonb_build_array(jsonb_build_object(
   'eventId',e.id,'kind',e.event,'foreign',true,'graveId',e.grave_id,
   'fromRevision',e.from_revision,'toRevision',e.to_revision,
   'baseBefore',e.owner_base_before,'baseAfter',e.owner_base_after,
   'graveBefore',e.grave_before,'graveAfter',e.grave_after,
   'nonGraveHashBefore',hash,'nonGraveHashAfter',hash));
  cursor_base:=e.owner_base_after;cursor_grave:=e.grave_after;last_event:=e.id;
 end loop;
 if count_events=0 or cursor_grave is distinct from f.data->'tumba' or
   golden_internal.grave_non_tumba_hash(f.data) is distinct from hash
  then return jsonb_build_object('ok',false,'reason','current_snapshot_not_proven');end if;
 wall:=clock_timestamp();
 return jsonb_build_object('ok',true,'proofType','foreign_grave_claim_chain_v1',
  'uid',p_uid,'op',p_op,'requestedBase',base,'acceptedOwn',accepted,'fromBase',anchor_base,
  'currentBase',f.updated_at,'currentData',f.data,'currentName',f.name,
  'nonGraveHashCurrent',hash,'events',events,'serverNow',wall,'validUntil',wall+interval'30 seconds');
end $$;
revoke all on function public.gf_graves_save_proof(uuid,text,text,jsonb)from public,anon,authenticated;
grant execute on function public.gf_graves_save_proof(uuid,text,text,jsonb)to service_role;

commit;
