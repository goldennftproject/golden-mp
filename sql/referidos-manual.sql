-- Manual attribution is allowed only while no inviter has been assigned.
create or replace function public.my_referral() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select jsonb_build_object('code',r.code,'inviter_code',p.code,'registered',(select count(*) from golden_internal.referrals i join auth.users u on u.id=i.user_id where i.invited_by=uid and u.email_confirmed_at is not null))
 into result from golden_internal.referrals r left join golden_internal.referrals p on p.user_id=r.invited_by where r.user_id=uid;
 return result;
end $$;
create function public.set_my_referrer(referral_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); inviter uuid; current_inviter uuid; requested text:=upper(trim(coalesce(referral_code,'')));
begin
 if uid is null then raise exception 'Inicia sesion para anadir un referido.' using errcode='42501'; end if;
 if requested !~ '^[A-F0-9]{16}$' then raise exception 'El codigo no es valido.'; end if;
 -- Serialize manual assignments to prevent cycles even with concurrent requests.
 perform pg_catalog.pg_advisory_xact_lock(734851,1);
 select invited_by into current_inviter from golden_internal.referrals where user_id=uid for update;
 if not found then raise exception 'No se encontro tu cuenta.'; end if;
 select user_id into inviter from golden_internal.referrals where code=requested;
 if inviter is null then raise exception 'No existe ese codigo de referido.'; end if;
 if inviter=uid then raise exception 'No puedes usar tu propio codigo.'; end if;
 if current_inviter=inviter then return public.my_referral(); end if;
 if current_inviter is not null then raise exception 'Tu cuenta ya tiene un referido asignado.'; end if;
 if exists(
  with recursive chain as (
   select user_id,invited_by from golden_internal.referrals where user_id=inviter
   union
   select r.user_id,r.invited_by from golden_internal.referrals r join chain c on r.user_id=c.invited_by
  ) select 1 from chain where user_id=uid
 ) then raise exception 'No se puede crear una referencia circular.'; end if;
 update golden_internal.referrals set invited_by=inviter where user_id=uid;
 return public.my_referral();
end $$;
revoke all on function public.set_my_referrer(text) from public,anon;
grant execute on function public.set_my_referrer(text) to authenticated;
