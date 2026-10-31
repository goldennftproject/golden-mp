-- Pausa reversible de juego; Auth y registro siguen abiertos.
create table golden_internal.game_access (
 id boolean primary key default true check(id),
 game_open boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into golden_internal.game_access(id,game_open) values(true,false);
alter table golden_internal.game_access enable row level security;
revoke all on golden_internal.game_access from public,anon,authenticated;
grant select on golden_internal.game_access to service_role;
create function golden_internal.require_game_open() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not coalesce((select game_open from golden_internal.game_access where id),false) then
  raise exception 'Alfa pospuesta: el acceso al juego está temporalmente cerrado. Tu progreso se conserva.' using errcode='P0001';
 end if;
 if TG_OP='DELETE' then return OLD;else return NEW;end if;
end $$;
revoke all on function golden_internal.require_game_open() from public,anon,authenticated;
grant execute on function golden_internal.require_game_open() to service_role;
create trigger game_access_guard before insert or update or delete on public.farms for each row execute function golden_internal.require_game_open();
create trigger game_access_guard before insert or update or delete on public.market for each row execute function golden_internal.require_game_open();
update golden_internal.usdt_config set deposits_enabled=false where id;
