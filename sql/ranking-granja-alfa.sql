-- Lectura exclusivamente desde la Edge Function autenticada. No escribe en farms.
create or replace function public.ranking_granja_alfa(p_uid uuid)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
with raw as (
 select user_id, left(coalesce(name,'Granjero'),40) nombre,
  greatest(1,least(25,floor(case when jsonb_typeof(data->'level')='number' then (data->>'level')::numeric else 1 end))) nivel,
  data,
  coalesce((select jsonb_object_agg(k,case when jsonb_typeof(v)='number' then greatest(0,least(1e15,v::text::numeric)) else 0 end)
    from (values ('farming',data#>'{skills,farming}'),('tala',data#>'{skills,tala}'),('mining',data#>'{skills,mining}'),
     ('corteTala',data#>'{farmXpRitmo,tala}'),('corteMining',data#>'{farmXpRitmo,mining}'),
     ('edificios',data->'farmXpEdificios'),('base',data->'farmXpBase')) n(k,v)), '{}'::jsonb) n
 from public.farms
), scores as (
 select user_id,nombre,nivel,round(greatest(0,
  (n->>'farming')::numeric+(n->>'edificios')::numeric-(n->>'base')::numeric+
  case when jsonb_typeof(data->'farmXpRitmo')='object' then
   least((n->>'tala')::numeric,(n->>'corteTala')::numeric)*15+greatest(0,(n->>'tala')::numeric-(n->>'corteTala')::numeric)*1.5+
   least((n->>'mining')::numeric,(n->>'corteMining')::numeric)*20+greatest(0,(n->>'mining')::numeric-(n->>'corteMining')::numeric)*2
  else (n->>'tala')::numeric*15+(n->>'mining')::numeric*20 end),6) xp
 from raw
), ranked as (
 select *,rank() over(order by nivel desc,xp desc) posicion from scores
), top_rows as (
 select * from ranked order by nivel desc,xp desc,user_id limit 50
)
select jsonb_build_object('ok',true,'temporada','alpha','total',(select count(*) from ranked),
 'actualizado',now(),'cacheSeg',180,
 'top',coalesce((select jsonb_agg(to_jsonb(r) order by nivel desc,xp desc,user_id) from top_rows r),'[]'::jsonb),
 'yo',(select to_jsonb(r) from ranked r where user_id=p_uid));
$$;
revoke all on function public.ranking_granja_alfa(uuid) from public,anon,authenticated;
grant execute on function public.ranking_granja_alfa(uuid) to service_role;
comment on function public.ranking_granja_alfa(uuid) is 'Clasificación alfa: nivel guardado, XP productiva de granja; empates comparten posición. Lectura vía guardar; sin premios automáticos.';
