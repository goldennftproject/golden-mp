-- One existing contest only. Ordinary referral attribution/counters are unchanged.
-- The advertised final minute is 8 November 23:59 Uruguay; the exclusive cutoff is 03:00 UTC.
-- Install all source triggers before backfill. CREATE TRIGGER holds source-table DML locks
-- until commit, so changes cannot slip between the baseline capture and trigger installation.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table golden_internal.referral_events (
 id text primary key check(id='referidos-20261108'),
 ends_at timestamptz not null check(ends_at=timestamptz '2026-11-09T03:00:00Z'),
 min_farm_level integer not null check(min_farm_level=3),
 max_tickets integer not null check(max_tickets=5),
 created_at timestamptz not null default clock_timestamp(),
 closed_at timestamptz,
 sealed_at timestamptz,
 sealed_snapshot jsonb,
 check((closed_at is null and sealed_at is null and sealed_snapshot is null)
    or (closed_at is not null and closed_at=ends_at and sealed_at is not null and sealed_snapshot is not null))
);
create table golden_internal.referral_event_people (
 event_id text not null references golden_internal.referral_events(id),
 user_id uuid not null,
 invited_by uuid,
 registered_at timestamptz not null,
 confirmed_at timestamptz,
 has_farm boolean not null,
 farm_level integer not null,
 public_name text not null,
 team boolean not null,
 qa boolean not null,
 captured_at timestamptz not null,
 primary key(event_id,user_id)
);
-- Deliberately no Auth/referral FK: deleting or changing a live account after the deadline
-- must not cascade into the frozen contest evidence.
alter table golden_internal.referral_events enable row level security;
alter table golden_internal.referral_event_people enable row level security;
revoke all on golden_internal.referral_events,golden_internal.referral_event_people from public,anon,authenticated,service_role;
insert into golden_internal.referral_events(id,ends_at,min_farm_level,max_tickets)
values('referidos-20261108','2026-11-09T03:00:00Z',3,5);

create function golden_internal.capture_referral_event_person_20261108(p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare at_time timestamptz; person_fact record; person_exists boolean;
begin
 if p_user is null or clock_timestamp()>=timestamptz '2026-11-09T03:00:00Z' then return; end if;
 -- Shared event lock keeps sealing behind every already admitted capture transaction.
 perform pg_catalog.pg_advisory_xact_lock_shared(734852,20261108);
 -- Serialize different source changes for the same person without locking source rows again.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gf-referral-20261108-person:'||p_user::text,0));
 at_time:=clock_timestamp();
 if at_time>=timestamptz '2026-11-09T03:00:00Z'
    or exists(select 1 from golden_internal.referral_events where id='referidos-20261108' and closed_at is not null) then return; end if;
 select u.id as user_id,r.invited_by,u.created_at as registered_at,u.email_confirmed_at as confirmed_at,f.user_id is not null as has_farm,
  case when jsonb_typeof(f.data->'level')='number' then greatest(1,least(25,floor((f.data->>'level')::numeric)))::integer else 1 end as farm_level,
  left(regexp_replace(coalesce(nullif(btrim(l.discord_name),''),nullif(btrim(f.name),''),'Granjero'),'[\r\n\t]',' ','g'),80) as public_name,
  exists(select 1 from golden_internal.equipo_accesos e where e.user_id=u.id and e.active) as team,
  coalesce(f.name in('QA-Suren','QA-Guardado'),false) as qa
 into person_fact
 from auth.users u left join public.farms f on f.user_id=u.id
 left join golden_internal.referrals r on r.user_id=u.id
 left join golden_internal.discord_links l on l.user_id=u.id
 where u.id=p_user;
 person_exists:=found;
 -- The source read itself could wait across the boundary (for example behind DDL).
 -- Check the real clock again after materializing it, before any fact INSERT/UPDATE/DELETE.
 at_time:=clock_timestamp();
 if at_time>=timestamptz '2026-11-09T03:00:00Z' then return; end if;
 if not person_exists then
  delete from golden_internal.referral_event_people where event_id='referidos-20261108' and user_id=p_user;
  return;
 end if;
 insert into golden_internal.referral_event_people as dst
  (event_id,user_id,invited_by,registered_at,confirmed_at,has_farm,farm_level,public_name,team,qa,captured_at)
 values('referidos-20261108',person_fact.user_id,person_fact.invited_by,person_fact.registered_at,person_fact.confirmed_at,
  person_fact.has_farm,person_fact.farm_level,person_fact.public_name,person_fact.team,person_fact.qa,at_time)
 on conflict(event_id,user_id) do update set
  invited_by=excluded.invited_by,registered_at=excluded.registered_at,confirmed_at=excluded.confirmed_at,
  has_farm=excluded.has_farm,farm_level=excluded.farm_level,public_name=excluded.public_name,
  team=excluded.team,qa=excluded.qa,captured_at=excluded.captured_at
 where row(dst.invited_by,dst.registered_at,dst.confirmed_at,dst.has_farm,dst.farm_level,dst.public_name,dst.team,dst.qa)
  is distinct from row(excluded.invited_by,excluded.registered_at,excluded.confirmed_at,excluded.has_farm,excluded.farm_level,excluded.public_name,excluded.team,excluded.qa);
end $$;
revoke all on function golden_internal.capture_referral_event_person_20261108(uuid) from public,anon,authenticated,service_role;

create function golden_internal.referral_event_capture_trigger_20261108()
returns trigger language plpgsql security definer set search_path='' as $$
declare person uuid;
begin
 -- The ordinary five-second farm autosave does no event work unless relevant data changed.
 if tg_op='UPDATE' then
  if tg_table_schema='public' and tg_table_name='farms' then
   if old.data->'level' is not distinct from new.data->'level' and old.name is not distinct from new.name then return new; end if;
  elsif tg_table_schema='auth' and tg_table_name='users' then
   if old.created_at is not distinct from new.created_at and old.email_confirmed_at is not distinct from new.email_confirmed_at then return new; end if;
  elsif tg_table_name='referrals' then
   if old.invited_by is not distinct from new.invited_by then return new; end if;
  elsif tg_table_name='equipo_accesos' then
   if old.active is not distinct from new.active then return new; end if;
  elsif tg_table_name='discord_links' then
   if old.discord_name is not distinct from new.discord_name then return new; end if;
  end if;
 end if;
 if tg_table_schema='auth' and tg_table_name='users' then
  person:=case when tg_op='DELETE' then old.id else new.id end;
 else
  person:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 end if;
 perform golden_internal.capture_referral_event_person_20261108(person);
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function golden_internal.referral_event_capture_trigger_20261108() from public,anon,authenticated,service_role;

create trigger golden_event_referrals_auth_20261108 after insert or update of email_confirmed_at,created_at or delete
 on auth.users for each row execute function golden_internal.referral_event_capture_trigger_20261108();
create trigger golden_event_referrals_farms_20261108 after insert or update of data,name or delete
 on public.farms for each row execute function golden_internal.referral_event_capture_trigger_20261108();
create trigger golden_event_referrals_attribution_20261108 after insert or update of invited_by or delete
 on golden_internal.referrals for each row execute function golden_internal.referral_event_capture_trigger_20261108();
create trigger golden_event_referrals_team_20261108 after insert or update of active or delete
 on golden_internal.equipo_accesos for each row execute function golden_internal.referral_event_capture_trigger_20261108();
create trigger golden_event_referrals_names_20261108 after insert or update of discord_name or delete
 on golden_internal.discord_links for each row execute function golden_internal.referral_event_capture_trigger_20261108();

-- Preserve already valid referrals, including registrations before the public announcement.
do $$
declare person uuid;
begin
 if clock_timestamp()>=timestamptz '2026-11-09T03:00:00Z' then raise exception 'Cannot seed this event after its deadline.'; end if;
 for person in select id from auth.users order by id loop
  perform golden_internal.capture_referral_event_person_20261108(person);
 end loop;
end $$;

create function golden_internal.referral_event_snapshot_20261108()
returns jsonb language sql volatile security definer set search_path='' as $$
 with settings as (
  select ends_at,min_farm_level,max_tickets,clock_timestamp() as captured_at
  from golden_internal.referral_events where id='referidos-20261108'
 ), people as (
  select * from golden_internal.referral_event_people where event_id='referidos-20261108'
 ), edges as (
  select a.user_id as inviter_id,a.public_name,a.has_farm,b.user_id as invited_id,b.registered_at,b.confirmed_at,b.farm_level,
   b.confirmed_at is not null and b.confirmed_at<=s.captured_at and b.confirmed_at<s.ends_at as confirmed,
   b.registered_at<timestamptz '2026-11-03T00:42:27.316Z' as preannouncement,
   b.registered_at<least(s.ends_at,s.captured_at) and b.confirmed_at is not null
    and b.confirmed_at<=s.captured_at and b.confirmed_at<s.ends_at and b.farm_level>=s.min_farm_level as valid
  from people b join people a on a.user_id=b.invited_by cross join settings s
  where not a.team and not a.qa and not b.team and not b.qa
 ), grouped as (
  select inviter_id,public_name as name,has_farm,count(*)filter(where confirmed) as confirmed_total,
   count(*)filter(where valid) as raffle_valid,count(*)filter(where confirmed and preannouncement) as confirmed_preannouncement,
   count(*)filter(where valid and preannouncement) as valid_preannouncement
  from edges group by inviter_id,public_name,has_farm
 ), ranked as (
  select inviter_id,name,confirmed_total,raffle_valid,least((select max_tickets from settings),raffle_valid) as tickets,
   rank()over(order by confirmed_total desc) as position,confirmed_preannouncement,valid_preannouncement
  from grouped where confirmed_total>0 and has_farm
 )
 select jsonb_build_object(
  'id','referidos-20261108','captured_at',(select captured_at from settings),
  'announcement_at','2026-11-03T00:42:27.316Z','ends_at_exclusive',(select ends_at from settings),
  'includes_preannouncement',true,'min_farm_level',(select min_farm_level from settings),'max_tickets',(select max_tickets from settings),
  'source_farms',(select count(*)from people where has_farm),
  'excluded_team',(select count(*)from people where team and has_farm),
  'excluded_qa',(select count(*)from people where not team and qa and has_farm),
  'source_public_farms',(select count(*)from people where has_farm and not team and not qa),
  'confirmed_historical_total',coalesce((select sum(confirmed_total)from grouped),0),
  'confirmed_inviter_without_farm',coalesce((select sum(confirmed_total)from grouped where not has_farm),0),
  'raffle_valid_total',coalesce((select sum(raffle_valid)from ranked),0),
  'tickets_total',coalesce((select sum(tickets)from ranked),0),
  'rows',coalesce((select jsonb_agg(to_jsonb(r)order by confirmed_total desc,name,inviter_id)from ranked r),'[]'::jsonb),
  'candidate_edges',coalesce((select jsonb_agg(to_jsonb(e)order by inviter_id,invited_id)from edges e),'[]'::jsonb)
 )
$$;
revoke all on function golden_internal.referral_event_snapshot_20261108() from public,anon,authenticated,service_role;

create function golden_internal.close_referral_event_20261108()
returns boolean language plpgsql security definer set search_path='' as $$
declare event_row golden_internal.referral_events%rowtype; snapshot jsonb; sealed_time timestamptz; pending_job bigint;
begin
 if clock_timestamp()<timestamptz '2026-11-09T03:00:00Z' then return false; end if;
 -- Try instead of blocking: my_referral can be called by a transaction that already owns
 -- a shared capture lock. A blocking upgrade could deadlock against another such caller.
 if not pg_catalog.pg_try_advisory_xact_lock(734852,20261108) then return false; end if;
 if clock_timestamp()<timestamptz '2026-11-09T03:00:00Z' then return false; end if;
 select * into event_row from golden_internal.referral_events where id='referidos-20261108' for update;
 if event_row.closed_at is null then
  snapshot:=golden_internal.referral_event_snapshot_20261108();sealed_time:=clock_timestamp();
  update golden_internal.referral_events set closed_at=ends_at,sealed_at=sealed_time,sealed_snapshot=snapshot
   where id=event_row.id and closed_at is null;
 end if;
 -- Only this contest's retry job is removed. All other jobs and the extension are preserved.
 for pending_job in select jobid from cron.job where jobname='gf-referral-20261108-close' loop
  perform cron.unschedule(pending_job);
 end loop;
 return true;
end $$;
revoke all on function golden_internal.close_referral_event_20261108() from public,anon,authenticated,service_role;

-- CREATE OR REPLACE retains the existing function owner and ACL; preserve both callers.
create or replace function public.my_referral()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb; event_row golden_internal.referral_events%rowtype;
 snapshot jsonb; participant jsonb; at_time timestamptz; own_tickets integer:=0; own_qualified integer:=0;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select jsonb_build_object('code',r.code,'inviter_code',p.code,'registered',(
  select count(*)from golden_internal.referrals i join auth.users u on u.id=i.user_id
  where i.invited_by=uid and u.email_confirmed_at is not null))
 into result from golden_internal.referrals r left join golden_internal.referrals p on p.user_id=r.invited_by where r.user_id=uid;
 if result is null then return null; end if;
 perform golden_internal.close_referral_event_20261108();
 select * into event_row from golden_internal.referral_events where id='referidos-20261108';
 at_time:=clock_timestamp();
 snapshot:=coalesce(event_row.sealed_snapshot,golden_internal.referral_event_snapshot_20261108());
 select entry into participant from jsonb_array_elements(snapshot->'rows') as entries(entry) where entry->>'inviter_id'=uid::text;
 own_tickets:=coalesce((participant->>'tickets')::integer,0);own_qualified:=coalesce((participant->>'raffle_valid')::integer,0);
 return result||jsonb_build_object('event',jsonb_build_object(
  'id',event_row.id,'status',case when event_row.closed_at is not null or at_time>=event_row.ends_at then 'closed' else 'open' end,
  'ends_at',event_row.ends_at,'server_now',at_time,'tickets',own_tickets,'my_qualified',own_qualified));
end $$;
revoke all on function public.my_referral() from public,anon;
grant execute on function public.my_referral() to authenticated,service_role;

-- A one-minute retry makes a restart or a busy transaction delay sealing only, never
-- extend eligibility: capture functions and RPC status use the fixed database-clock cutoff.
select cron.schedule('gf-referral-20261108-close','* * * * *','select golden_internal.close_referral_event_20261108();');
do $$ begin
 if clock_timestamp()>=timestamptz '2026-11-09T03:00:00Z' then raise exception 'Event setup crossed its deadline; rolling back.'; end if;
end $$;
