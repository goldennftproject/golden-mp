-- Known carried families, matching viajeTengo/viajePoner and mkTengo.
-- No inventory writes, drop-rule changes, quantities or payload conversion.
create or replace function golden_internal.grave_items_valid(items jsonb)
returns void language plpgsql immutable security invoker set search_path='' as $$
declare e jsonb;n numeric;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>256 then raise exception 'Botín inválido';end if;
 for e in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(e) is distinct from 'object' or e->>'kind' is null or e->>'kind' not in('res','seed','fish','dish','arm','armor','armorset','gear','cont','pick','tool','cana')
   or e->>'k' is null or length(e->>'k')not between 1 and 100 or e->>'k' in('__proto__','constructor','prototype')
   or jsonb_typeof(e->'n') is distinct from 'number' then raise exception 'Objeto de botín inválido';end if;
  n:=(e->>'n')::numeric;if n<=0 or n>9007199254740991 or n::text in('NaN','Infinity','-Infinity')then raise exception 'Cantidad inválida';end if;
 end loop;
end $$;
revoke all on function golden_internal.grave_items_valid(jsonb)from public,anon,authenticated;
grant execute on function golden_internal.grave_items_valid(jsonb)to service_role;
