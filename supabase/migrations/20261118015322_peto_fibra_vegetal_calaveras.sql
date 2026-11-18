CREATE OR REPLACE FUNCTION golden_internal.grave_death_plan(d jsonb, break_slots jsonb, drop_slots jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare root jsonb;inside jsonb;items jsonb;e jsonb;k text;slot text;pz text;aset text;durability numeric;
 gear jsonb;weapons jsonb;armor jsonb;ad jsonb;off_map jsonb;eq jsonb;pieces jsonb;piece_dur jsonb;
 piezas_del_set text[];
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
 piezas_del_set:=case when aset='vegetal' then array['pecho'] else array['yelmo','pecho','pantalones','botas','guantes'] end;
 -- Existing armour rule: every active healthy piece loses five durability;
 -- only an already-zero active piece can appear in break_slots (10% Edge roll).
 for pz in select value#>>'{}'from jsonb_array_elements(break_slots)loop
  k:='arm_'||aset||'_'||pz;
  if aset is null or aset not in('fibra','piel','cuero','colmillo','vegetal')or not(pz=any(piezas_del_set))or coalesce(armor->k,'null')in('null'::jsonb,'false'::jsonb,'0'::jsonb)or coalesce((off_map->>k)::boolean,false)then raise exception'No se puede romper una pieza inactiva';end if;
  durability:=case when jsonb_typeof(ad->k)='number'then greatest(0,least(100,(ad->>k)::numeric))else 100 end;
  if durability<>0 then raise exception'No se puede romper una pieza sana';end if;
 end loop;
 if aset in('fibra','piel','cuero','colmillo','vegetal')then
  foreach pz in array piezas_del_set loop
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
   if aset is null or aset not in('fibra','piel','cuero','colmillo','vegetal')then raise exception'No llevas esa armadura';end if;
   pieces:='[]';piece_dur:='{}';
   foreach pz in array piezas_del_set loop
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
end $function$;
