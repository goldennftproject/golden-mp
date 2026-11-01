-- Referral attribution is fixed at account creation; no rewards or commissions.
create table golden_internal.referrals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
 invited_by uuid references golden_internal.referrals(user_id) on delete set null,
 created_at timestamptz not null default now(),
 check(invited_by is distinct from user_id)
);
create index referrals_invited_by_idx on golden_internal.referrals(invited_by) where invited_by is not null;
alter table golden_internal.referrals enable row level security;
revoke all on golden_internal.referrals from public,anon,authenticated;
insert into golden_internal.referrals(user_id) select id from auth.users;
create function golden_internal.capture_referral() returns trigger language plpgsql security definer set search_path='' as $$
declare inviter uuid; requested text;
begin
 requested := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code','')));
 if requested ~ '^[A-F0-9]{16}$' then
  select user_id into inviter from golden_internal.referrals where code=requested and user_id<>new.id;
 end if;
 insert into golden_internal.referrals(user_id,invited_by) values(new.id,inviter);
 return new;
end $$;
revoke all on function golden_internal.capture_referral() from public,anon,authenticated;
create trigger golden_capture_referral after insert on auth.users for each row execute function golden_internal.capture_referral();
create function public.my_referral() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select jsonb_build_object('code',r.code,'registered',(select count(*) from golden_internal.referrals i join auth.users u on u.id=i.user_id where i.invited_by=uid and u.email_confirmed_at is not null))
 into result from golden_internal.referrals r where r.user_id=uid;
 return result;
end $$;
revoke all on function public.my_referral() from public,anon;
grant execute on function public.my_referral() to authenticated;
