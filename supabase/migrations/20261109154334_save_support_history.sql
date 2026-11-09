-- Workspace candidate only. No existing player rows are rewritten or restored.
begin;
create schema if not exists golden_internal;
create table golden_internal.save_support_config(
 id boolean primary key default true check(id),enabled boolean not null default true,
 raw_budget bigint not null default 33554432 check(raw_budget between 0 and 33554432),
 account_budget bigint not null default 3145728 check(account_budget between 0 and 3145728),
 metadata_limit integer not null default 4096 check(metadata_limit between 0 and 4096)
);
insert into golden_internal.save_support_config(id)values(true);
create table golden_internal.save_support_accounts(
 owner_id uuid primary key references auth.users(id)on delete cascade,
 day date not null,new_count integer not null default 0 check(new_count between 0 and 48),
 last_new_at timestamptz,last_seen_at timestamptz not null default clock_timestamp(),last_incident_at timestamptz,
 last_batch_op text,batch_count integer not null default 0 check(batch_count between 0 and 3)
);
create table golden_internal.save_support_blobs(
 owner_id uuid not null references auth.users(id)on delete cascade,
 hash text not null check(hash~'^[a-f0-9]{64}$'),data jsonb not null,
 raw_bytes integer not null check(raw_bytes between 1 and 131072),
 created_at timestamptz not null default clock_timestamp(),primary key(owner_id,hash),
 check(jsonb_typeof(data)='object'),check(octet_length(data::text)=raw_bytes)
);
create table golden_internal.save_support_refs(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id)on delete cascade,
 kind text not null check(kind in('accepted_hourly','accepted_daily','critical_before','rejected','client_evidence')),
 bucket text not null check(bucket in('accepted_hourly','accepted_daily','critical_before','rejected')),
 dedupe_key text not null check(dedupe_key~'^[a-f0-9]{64}$'),reason_code text,
 payload_hash text,canonical_hash text,op_hash text,client_base timestamptz,canonical_version timestamptz,
 canonical_source text check(canonical_source in('canonical_at_evaluation','canonical_at_capture','server_committed')),
 payload_retained boolean not null default false,omitted_reason text,metadata jsonb not null default '{}',
 first_seen timestamptz not null default clock_timestamp(),last_seen timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,seen_count integer not null default 1 check(seen_count between 1 and 1000000000),
 unique(owner_id,dedupe_key),check(octet_length(metadata::text)<=2048)
);
create index save_support_refs_owner_kind on golden_internal.save_support_refs(owner_id,bucket,first_seen desc);
create index save_support_refs_expiry on golden_internal.save_support_refs(expires_at);
create index save_support_refs_payload on golden_internal.save_support_refs(owner_id,payload_hash)where payload_hash is not null;
create index save_support_refs_canonical on golden_internal.save_support_refs(owner_id,canonical_hash)where canonical_hash is not null;
alter table golden_internal.save_support_config enable row level security;
alter table golden_internal.save_support_accounts enable row level security;
alter table golden_internal.save_support_blobs enable row level security;
alter table golden_internal.save_support_refs enable row level security;
revoke all on golden_internal.save_support_config,golden_internal.save_support_accounts,golden_internal.save_support_blobs,golden_internal.save_support_refs from public,anon,authenticated,service_role;
grant usage on schema golden_internal to service_role;
grant select on golden_internal.save_support_config,golden_internal.save_support_accounts,golden_internal.save_support_blobs,golden_internal.save_support_refs to service_role;

create function golden_internal.save_support_hash(v text)returns text language sql immutable strict set search_path='' as $$select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v,'UTF8')),'hex')$$;
create function golden_internal.save_support_clean(v jsonb,depth integer default 0,p_deadline timestamptz default null)returns jsonb language plpgsql volatile set search_path='' as $$
declare k text;x jsonb;out_v jsonb;label text;s text;
begin
 if p_deadline is not null and clock_timestamp()>p_deadline then raise exception 'Capture deadline';end if;
 if depth>12 then raise exception 'Unsupported depth';end if;
 case jsonb_typeof(v)
 when 'object' then
  if(select count(*)from jsonb_object_keys(v))>256 then raise exception 'Unsupported object';end if;
  out_v:='{}';for k,x in select key,value from jsonb_each(v)loop
   label:=lower(regexp_replace(k,'[^a-zA-Z0-9]','','g'));
   if label in('authorization','cookie','cookies','headers','password','passwd','accesstoken','refreshtoken','idtoken','jwt','apikey','servicerolekey','sbkey','email','correo','token','secret','clientsecret','privatekey','mnemonic','seedphrase','session','cookiestore','auth','proto','prototype','constructor')then continue;end if;
   out_v:=out_v||jsonb_build_object(k,golden_internal.save_support_clean(x,depth+1,p_deadline));
  end loop;return out_v;
 when 'array' then
  if jsonb_array_length(v)>512 then raise exception 'Unsupported array';end if;
  select coalesce(jsonb_agg(golden_internal.save_support_clean(value,depth+1,p_deadline)order by ordinality),'[]')into out_v from jsonb_array_elements(v)with ordinality;
  return out_v;
 when 'string' then
  s:=v#>>'{}';
  if s~*'Bearer[[:space:]]+[A-Za-z0-9._-]+'or s~'eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}'or s~'[0-9]{6,20}:[A-Za-z0-9_-]{30,100}'or s~*'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'or s~'gh[pousr]_[A-Za-z0-9]{20,}'or s~'github_pat_[A-Za-z0-9_]{20,}'then return '"[redacted]"'::jsonb;end if;
  return v;
 else return v;
 end case;
end$$;
create function golden_internal.save_support_snapshot(v jsonb,p_deadline timestamptz default null)returns jsonb language plpgsql volatile set search_path='' as $$
declare projected jsonb;nodes integer;deadline timestamptz:=coalesce(p_deadline,clock_timestamp()+interval'200 milliseconds');
begin
 if clock_timestamp()>deadline then return null;end if;
 if jsonb_typeof(v)is distinct from'object'or octet_length(v::text)>131072 or(select count(*)from jsonb_object_keys(v))>256 then return null;end if;
 select count(*)into nodes from(select value from jsonb_path_query(v,'strict $.**')as j(value)limit 8193)s;
 if nodes>8192 then return null;end if;
 select coalesce(jsonb_object_agg(key,value),'{}')into projected from jsonb_each(v)where key=any(array['_economiaControl','_graveProtocol','_saveOp','actividadAcciones','actividadGranja','amarres','animals','armCd','armasUnlocked','armor','armorDur','armorEq','armorOff','artefactos','banco','bowOwned','buffCultivoHasta','buffs','built','buzonArchivo','buzonLeidas','canaElegida','canas','canasDur','canasDurV','chestCap','chests','cobertizo','combatXp','cont','conts','cooking','cosEq','cosmeticos','daily','decoBolsa','decos','dishes','doma','dummyTrain','dummyUsedAt','edif2','editVisto','emergBuys','energiaGranja','escamas','escamasLonja','espacioV','establoV','estrellaMax','excav','expObra','expParcelasDadas','expansiones','farmXpBase','farmXpEdificios','farmXpRitmo','firstCropDone','firstSeeds','fish','forjaOps','gear','ghInv','goblin','godHand','golden','hbInit','horno','hotSel','hotbar','hp','hpMax','incDia','incResumen','incursion','incursionTutorialUsada','infraestructura','iniciado','invRows','kitReclamado','layout','layoutPlots','layoutPond','level','logros','logrosAcciones','logrosV2','lombDia','lombricario','lonja','lonjaCap','lonjaEntregados','lonjaMes','marea','mejorasPasivas','mercadoVentas','mkPend','modoPelea','nasaPlanos','nasas','nfts','nodoUsos','nodos','obraDep','obras','ofrendaLog','ofrendaPts','packs','pass','pedidos','pescaDesde','pescaDia','pescaHasta','pescaStats','pescaTiene','pescaV4','picks','planos','plata','plots','plotsCompradas','plotsFicha','plotsOwned','presion','prestige','produccion','recientes','regalos','reinicio','res','rocksOpen','runaOro','seedBuys','seeds','selSeed','senales','sflStock','skills','slots','stam','stamAcc','stamFullAt','stamLastAt','stamRec','stats','statsBase','swordOwned','swordWoodOwned','tituloPesca','tools','torneo','torneoCobrado','torneoPodioCobrado','trampas','treesOpen','triesV','tumba','tuto','vales','visitas','visto','vistos','weaponSpares','weaponSparesOps','weapons','zonaCdHasta','zonaViaje','zonasVistas']::text[]);
 return golden_internal.save_support_clean(projected,0,deadline);
exception when others then return null;
end$$;

-- All mutating support paths hold the same transaction-level try-lock; never wait for it.
create function golden_internal.save_support_gc(p_now timestamptz)returns void language plpgsql set search_path='' as $$
begin
 delete from golden_internal.save_support_refs r using(select id from golden_internal.save_support_refs where expires_at<=p_now order by expires_at limit 128 for update skip locked)x where r.id=x.id;
 delete from golden_internal.save_support_blobs b using(select b0.owner_id,b0.hash from golden_internal.save_support_blobs b0 where not exists(select 1 from golden_internal.save_support_refs r where r.owner_id=b0.owner_id and(r.payload_hash=b0.hash or r.canonical_hash=b0.hash))limit 128)x where b.owner_id=x.owner_id and b.hash=x.hash;
 delete from golden_internal.save_support_accounts a where a.last_seen_at<p_now-interval'7 days'and not exists(select 1 from golden_internal.save_support_refs r where r.owner_id=a.owner_id);
end$$;

create function golden_internal.save_support_store(p_uid uuid,p_kind text,p_op text,p_base timestamptz,p_reason text,p_payload jsonb,p_canonical jsonb,p_canonical_version timestamptz,p_canonical_source text,p_meta jsonb,p_capture_version timestamptz,p_deadline timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='20ms' as $$
declare cfg golden_internal.save_support_config%rowtype;a golden_internal.save_support_accounts%rowtype;prior golden_internal.save_support_refs%rowtype;
 t timestamptz:=clock_timestamp();deadline timestamptz:=coalesce(p_deadline,clock_timestamp()+interval'200 milliseconds');d date:=(clock_timestamp()at time zone'UTC')::date;kind_bucket text;max_refs integer;ttl interval;dedupe text;ph text;ch text;oh text;
 payload jsonb;canon jsonb;meta jsonb:='{}';retained boolean:=false;why text;pid uuid;extra_bytes bigint;total_bytes bigint;own_bytes bigint;counts integer;px integer;cx integer;seq text;
begin
 if clock_timestamp()>deadline then return jsonb_build_object('ok',true,'captured','unavailable','payloadRetained',false);end if;
 if p_uid is null or p_kind not in('accepted_hourly','accepted_daily','critical_before','rejected','client_evidence')then return jsonb_build_object('ok',true,'captured','invalid');end if;
 select *into cfg from golden_internal.save_support_config where id;
 if not coalesce(cfg.enabled,false)then return jsonb_build_object('ok',true,'captured','disabled');end if;
 -- Every input is size bounded even if the caller or old client omits its own limit.
 if octet_length(coalesce(p_payload,'null')::text)+octet_length(coalesce(p_canonical,'null')::text)+octet_length(coalesce(p_meta,'{}')::text)>700000 or length(coalesce(p_op,''))>100 or octet_length(coalesce(p_meta,'{}')::text)>2048 or jsonb_typeof(coalesce(p_meta,'{}'))<>'object'then return jsonb_build_object('ok',true,'captured','invalid');end if;
 kind_bucket:=case when p_kind='client_evidence'then'rejected'else p_kind end;
 max_refs:=case kind_bucket when'accepted_hourly'then 12 when'accepted_daily'then 7 when'critical_before'then 2 else 3 end;
 ttl:=case when p_kind='accepted_hourly'then interval'24 hours'else interval'7 days'end;
 oh:=golden_internal.save_support_hash(coalesce(p_op,''));
 ph:=golden_internal.save_support_hash(coalesce(p_payload,'null')::text);ch:=case when p_canonical is not null then golden_internal.save_support_hash(p_canonical::text)end;
 seq:=case p_kind when'accepted_hourly'then to_char(t at time zone'UTC','YYYY-MM-DD-HH24')when'accepted_daily'then to_char(t at time zone'UTC','YYYY-MM-DD')else concat_ws('|',oh,ph,ch,p_reason,p_base::text)end;
 dedupe:=golden_internal.save_support_hash(concat_ws('|',p_uid::text,kind_bucket,coalesce(p_canonical->>'iniciado',p_payload->>'iniciado','unknown'),coalesce(p_canonical->>'reinicio',p_payload->>'reinicio','0'),seq));
 -- Most ordinary writes can return before taking any support lock.
 if p_kind in('accepted_hourly','accepted_daily')and exists(select 1 from golden_internal.save_support_refs where owner_id=p_uid and dedupe_key=dedupe)then return jsonb_build_object('ok',true,'captured','deduped','payloadRetained',false);end if;
 if not pg_try_advisory_xact_lock(hashtextextended('golden.save-support.v1',0))then return jsonb_build_object('ok',true,'captured','busy');end if;
 perform golden_internal.save_support_gc(t);
 if clock_timestamp()>deadline then raise exception 'Capture deadline';end if;
 select *into prior from golden_internal.save_support_refs where owner_id=p_uid and dedupe_key=dedupe;
 if found then
  if prior.last_seen<=t-interval'1 minute'then update golden_internal.save_support_refs set last_seen=t,seen_count=least(1000000000,seen_count+1)where id=prior.id;end if;
  return jsonb_build_object('ok',true,'captured','deduped','supportId',prior.id,'payloadRetained',prior.payload_retained,'omitted',coalesce((prior.metadata->>'partial')::boolean,false)or not prior.payload_retained);
 end if;
 select count(*)into counts from golden_internal.save_support_refs;
 if counts>=cfg.metadata_limit then return jsonb_build_object('ok',true,'captured','rate_limited','reason','metadata_capacity');end if;
 if not exists(select 1 from golden_internal.save_support_accounts where owner_id=p_uid)and(select count(*)from golden_internal.save_support_accounts)>=4096 then return jsonb_build_object('ok',true,'captured','rate_limited');end if;
 insert into golden_internal.save_support_accounts(owner_id,day)values(p_uid,d)on conflict(owner_id)do nothing;
 select *into a from golden_internal.save_support_accounts where owner_id=p_uid;
 if a.day<>d then a.new_count:=0;end if;
 if a.new_count>=48 then return jsonb_build_object('ok',true,'captured','rate_limited');end if;
 if p_kind='client_evidence'and coalesce(p_op!~'^client-batch:[a-f0-9]{64}$',true)then return jsonb_build_object('ok',true,'captured','invalid');end if;
 if p_kind in('rejected','client_evidence')and a.last_incident_at>t-interval'1 minute'and not(p_kind='client_evidence'and a.last_batch_op=oh and a.batch_count<3)then return jsonb_build_object('ok',true,'captured','rate_limited');end if;
 payload:=golden_internal.save_support_snapshot(p_payload,deadline);canon:=case when p_canonical is not null then golden_internal.save_support_snapshot(p_canonical,deadline)end;
 if clock_timestamp()>deadline then raise exception 'Capture deadline';end if;
 if p_meta->>'supportForceOmission'in('stage_mismatch','unknown_stage')then why:=p_meta->>'supportForceOmission';
 elsif payload is null or(p_canonical is not null and canon is null)then why:='oversize_or_unsupported';
 else
  ph:=golden_internal.save_support_hash(payload::text);ch:=case when canon is not null then golden_internal.save_support_hash(canon::text)end;
  px:=octet_length(payload::text);cx:=case when canon is not null then octet_length(canon::text)else 0 end;
  select coalesce(sum(raw_bytes),0)into total_bytes from golden_internal.save_support_blobs;
  select coalesce(sum(raw_bytes),0)into own_bytes from golden_internal.save_support_blobs where owner_id=p_uid;
  select coalesce(sum(n),0)into extra_bytes from(select ph h,px n union select ch,cx where ch is not null)b where not exists(select 1 from golden_internal.save_support_blobs x where x.owner_id=p_uid and x.hash=b.h);
  if total_bytes+extra_bytes>cfg.raw_budget or own_bytes+extra_bytes>cfg.account_budget then why:='budget';else retained:=true;end if;
 end if;
 -- Only fixed, small metadata fields survive. Never copy errors, headers, tokens or e-mail.
 if p_meta->>'build'~'^[A-Za-z0-9._-]{1,64}$'then meta:=meta||jsonb_build_object('build',p_meta->>'build');end if;
 if p_meta->>'rulesVersion'~'^[0-9]{1,6}$'then meta:=meta||jsonb_build_object('rulesVersion',(p_meta->>'rulesVersion')::int);end if;
 if p_meta->>'clientHash'~'^[a-f0-9]{64}$'then meta:=meta||jsonb_build_object('clientHash',p_meta->>'clientHash');end if;
 if p_meta->>'source'in('copia','aparcada','carga','rechazo','conflicto')then meta:=meta||jsonb_build_object('source',p_meta->>'source');end if;
 if p_meta->>'omitted'~'^[0-9]{1,6}$'then meta:=meta||jsonb_build_object('omitted',(p_meta->>'omitted')::int);end if;
 meta:=meta||jsonb_build_object('serializerVersion',1,'sanitized',coalesce(p_meta->'sanitized'='true'::jsonb,false)or payload is distinct from p_payload or canon is distinct from p_canonical,'partial',coalesce(p_meta->'sanitized'='true'::jsonb,false)or coalesce(p_meta->>'omitted','0')~'^(true|[1-9][0-9]{0,5})$'or payload is distinct from p_payload or canon is distinct from p_canonical or why is not null,'canonicalAtCaptureVersion',p_capture_version,
 'stageStarted',case when coalesce(p_canonical->>'iniciado',p_payload->>'iniciado','')~'^[0-9]{1,16}$'then coalesce(p_canonical->'iniciado',p_payload->'iniciado')else'null'::jsonb end,
 'stageReset',case when coalesce(p_canonical->>'reinicio',p_payload->>'reinicio','0')~'^[0-9]{1,16}$'then coalesce(p_canonical->'reinicio',p_payload->'reinicio','0'::jsonb)else'null'::jsonb end);
 if retained then
  insert into golden_internal.save_support_blobs(owner_id,hash,data,raw_bytes)values(p_uid,ph,payload,px)on conflict do nothing;
  if ch is not null then insert into golden_internal.save_support_blobs(owner_id,hash,data,raw_bytes)values(p_uid,ch,canon,cx)on conflict do nothing;end if;
 end if;
 if clock_timestamp()>deadline then raise exception 'Capture deadline';end if;
 insert into golden_internal.save_support_refs(owner_id,kind,bucket,dedupe_key,reason_code,payload_hash,canonical_hash,op_hash,client_base,canonical_version,canonical_source,payload_retained,omitted_reason,metadata,first_seen,last_seen,expires_at)
 values(p_uid,p_kind,kind_bucket,dedupe,p_reason,case when retained then ph end,case when retained then ch end,oh,p_base,p_canonical_version,p_canonical_source,retained,why,meta,t,t,t+ttl)returning id into pid;
 delete from golden_internal.save_support_refs r using(select id from golden_internal.save_support_refs where owner_id=p_uid and bucket=kind_bucket order by first_seen desc,id desc offset max_refs)x where r.id=x.id;
 update golden_internal.save_support_accounts set day=d,new_count=a.new_count+1,last_new_at=t,last_seen_at=t,
 last_incident_at=case when p_kind in('rejected','client_evidence')then t else last_incident_at end,
 last_batch_op=case when p_kind='client_evidence'then oh when p_kind='rejected'then null else last_batch_op end,
 batch_count=case when p_kind='client_evidence'then case when a.last_incident_at>t-interval'1 minute'and a.last_batch_op=oh then a.batch_count+1 else 1 end when p_kind='rejected'then 0 else batch_count end where owner_id=p_uid;
 perform golden_internal.save_support_gc(t);
 return jsonb_build_object('ok',true,'captured',case when retained then'retained'else'metadata_only'end,'supportId',pid,'payloadRetained',retained,'omitted',coalesce((meta->>'partial')::boolean,false)or not retained,'reason',why);
exception when others then return jsonb_build_object('ok',true,'captured','unavailable','payloadRetained',false);
end$$;

create function public.gf_save_support_capture(p_uid uuid,p_kind text,p_op text,p_base text,p_reason text,p_payload jsonb,p_meta jsonb default '{}',p_observed_base text default null,p_observed_data jsonb default null)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='20ms' as $$
declare f public.farms%rowtype;b timestamptz;o timestamptz;canon jsonb;version timestamptz;source text;meta jsonb:=case when jsonb_typeof(p_meta)='object'then p_meta else'{}'::jsonb end;reason text:=p_reason;
begin
 if auth.role()is distinct from'service_role'then raise exception 'Server required'using errcode='42501';end if;
 if p_kind is null or p_kind not in('rejected','client_evidence')or(p_kind='rejected'and coalesce(p_reason not in('economy','heuristic','cas','validation'),true))then return jsonb_build_object('ok',true,'captured','invalid');end if;
 if p_base is not null then if length(p_base)>64 or p_base!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:.+-]+Z?$'then return jsonb_build_object('ok',true,'captured','invalid');end if;b:=p_base::timestamptz;end if;
 select *into f from public.farms where user_id=p_uid;
 if not found then return jsonb_build_object('ok',true,'captured','no_farm');end if;
 if p_kind='client_evidence'then
  reason:='client';
  if f.data->>'iniciado'is null or p_payload->>'iniciado'is null then meta:=meta||jsonb_build_object('supportForceOmission','unknown_stage');
  elsif f.data->>'iniciado'is distinct from p_payload->>'iniciado'or coalesce(f.data->>'reinicio','0')is distinct from coalesce(p_payload->>'reinicio','0')then meta:=meta||jsonb_build_object('supportForceOmission','stage_mismatch');end if;
 end if;
 if p_observed_base is not null and p_observed_data is not null then
  if length(p_observed_base)>64 or p_observed_base!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:.+-]+Z?$'then return jsonb_build_object('ok',true,'captured','invalid');end if;
  o:=p_observed_base::timestamptz;if o>f.updated_at then return jsonb_build_object('ok',true,'captured','invalid');end if;
  canon:=p_observed_data;version:=o;source:='canonical_at_evaluation';
 elsif p_observed_base is not null or p_observed_data is not null then return jsonb_build_object('ok',true,'captured','invalid');
 else canon:=f.data;version:=f.updated_at;source:='canonical_at_capture';end if;
 return golden_internal.save_support_store(p_uid,p_kind,p_op,b,reason,p_payload,canon,version,source,meta,f.updated_at);
exception when insufficient_privilege then raise;when others then return jsonb_build_object('ok',true,'captured','unavailable','payloadRetained',false);
end$$;
revoke all on function public.gf_save_support_capture(uuid,text,text,text,text,jsonb,jsonb,text,jsonb)from public,anon,authenticated;
grant execute on function public.gf_save_support_capture(uuid,text,text,text,text,jsonb,jsonb,text,jsonb)to service_role;

create function golden_internal.save_support_capture_commit()returns trigger language plpgsql security definer set search_path='' set lock_timeout='20ms' as $$
declare deadline timestamptz:=clock_timestamp()+interval'200 milliseconds';
begin
 -- The trigger rows roll back with the actual farm write; an attempted save is not a checkpoint.
 if TG_OP='UPDATE'and new.data is not distinct from old.data then return new;end if;
 perform golden_internal.save_support_store(new.user_id,'accepted_hourly',null,null,null,new.data,null,new.updated_at,'server_committed','{}',new.updated_at,deadline);
 perform golden_internal.save_support_store(new.user_id,'accepted_daily',null,null,null,new.data,null,new.updated_at,'server_committed','{}',new.updated_at,deadline);
 if TG_OP='UPDATE'and((new.data->'expObra'is distinct from old.data->'expObra'and new.data->'expObra'is not null and new.data->'expObra'<>'null'::jsonb)or new.data->'expansiones'is distinct from old.data->'expansiones'or
  exists(select 1 from unnest(array['forjaOps','weaponSparesOps','mkPend','artefactos','infraestructura','mejorasPasivas','packs','banco','daily','visitas','nfts','godHand'])k where new.data->k is distinct from old.data->k)or
  new.data#>'{produccion,premium}'is distinct from old.data#>'{produccion,premium}'or(to_jsonb(new)->'mercado_ack'is distinct from to_jsonb(old)->'mercado_ack')or current_setting('golden.grave_commit',true)='1')then
  perform golden_internal.save_support_store(old.user_id,'critical_before',new.data->>'_saveOp',old.updated_at,'critical',old.data,null,old.updated_at,'server_committed','{}',new.updated_at,deadline);
 end if;
 return new;
exception when others then return new;
end$$;
create trigger golden_save_support_committed after insert or update of data on public.farms for each row execute function golden_internal.save_support_capture_commit();

-- Sanitized administrative metadata only. Payload access remains a separate privileged SQL review.
create function public.gf_save_support_status(p_uid uuid)returns jsonb language plpgsql security definer set search_path='' set lock_timeout='20ms' as $$
declare events jsonb;
begin
 if auth.role()is distinct from'service_role'then raise exception 'Server required';end if;
 select coalesce(jsonb_agg(x order by x.last_seen desc),'[]')into events from(select id,kind,reason_code,payload_retained,omitted_reason,canonical_version,canonical_source,first_seen,last_seen,seen_count,expires_at,metadata from golden_internal.save_support_refs where owner_id=p_uid and expires_at>clock_timestamp()order by last_seen desc limit 32)x;
 return jsonb_build_object('ok',true,'events',events,'rawBytes',(select coalesce(sum(raw_bytes),0)from golden_internal.save_support_blobs where owner_id=p_uid),'globalRawBytes',(select coalesce(sum(raw_bytes),0)from golden_internal.save_support_blobs),'metadataRecords',(select count(*)from golden_internal.save_support_refs));
end$$;
revoke all on function public.gf_save_support_status(uuid)from public,anon,authenticated;
grant execute on function public.gf_save_support_status(uuid)to service_role;
create function golden_internal.save_support_retention()returns jsonb language plpgsql security definer set search_path='' set lock_timeout='20ms' as $$
declare deadline timestamptz:=clock_timestamp()+interval'200 milliseconds';i integer:=0;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('golden.save-support.v1',0))then return jsonb_build_object('ok',true,'captured','busy');end if;
 while i<8 and clock_timestamp()<deadline loop perform golden_internal.save_support_gc(clock_timestamp());i:=i+1;end loop;
 return jsonb_build_object('ok',true,'batches',i);
exception when others then return jsonb_build_object('ok',true,'captured','unavailable');
end$$;
revoke all on function golden_internal.save_support_retention()from public,anon,authenticated,service_role;
-- This is a new, dedicated retention job, not a revival of any cancelled player automation.
do $cron_setup$begin
 if to_regprocedure('cron.schedule(text,text,text)')is not null then
  execute $schedule$select cron.schedule('golden-save-support-retention-v1','*/10 * * * *','select golden_internal.save_support_retention();')$schedule$;
 end if;
end$cron_setup$;
revoke all on function golden_internal.save_support_hash(text),golden_internal.save_support_clean(jsonb,integer,timestamptz),golden_internal.save_support_snapshot(jsonb,timestamptz),golden_internal.save_support_gc(timestamptz),golden_internal.save_support_store(uuid,text,text,timestamptz,text,jsonb,jsonb,timestamptz,text,jsonb,timestamptz,timestamptz),golden_internal.save_support_capture_commit()from public,anon,authenticated,service_role;
commit;
