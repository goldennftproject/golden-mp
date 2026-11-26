CREATE OR REPLACE FUNCTION golden_internal.grave_death_plan(
  d jsonb, break_slots jsonb, drop_slots jsonb
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path TO ''
AS $function$
DECLARE
  root jsonb;
  inside jsonb;
  items jsonb;
  entry jsonb;
  gear jsonb;
  weapons jsonb;
  armor jsonb;
  durability_by_key jsonb;
  off_map jsonb;
  eq jsonb;
  legacy_set text;
  active jsonb := '{}';
  covered_by_craft jsonb;
  shadowed jsonb := '{}';
  valid_gear jsonb := '{}';
  piece_for_gear constant jsonb := '{"casco":"yelmo","armadura":"pecho","botas":"botas"}';
  gear_for_piece constant jsonb := '{"yelmo":"casco","pecho":"armadura","botas":"botas"}';
  gear_slots constant text[] := ARRAY['casco','armadura','botas','escudo'];
  armor_pieces constant text[] := ARRAY['yelmo','pecho','pantalones','botas','guantes'];
  armor_families constant text[] := ARRAY['vegetal','fibra','piel','cuero','colmillo'];
  slot text;
  piece text;
  family text;
  item_key text;
  selection text;
  durability numeric;
  pieces jsonb;
  piece_dur jsonb;
  labels jsonb := '[]';
  worn jsonb := '[]';
  broken jsonb := '[]';
BEGIN
  IF jsonb_typeof(d) IS DISTINCT FROM 'object'
    OR jsonb_typeof(d->'hp') IS DISTINCT FROM 'number' OR (d->>'hp')::numeric > 0
    OR jsonb_typeof(d->'hpMax') IS DISTINCT FROM 'number' OR (d->>'hpMax')::numeric <= 0 THEN
    RAISE EXCEPTION 'La muerte requiere una derrota confirmada';
  END IF;
  IF jsonb_typeof(break_slots) IS DISTINCT FROM 'array' OR jsonb_array_length(break_slots) > 5
    OR jsonb_typeof(drop_slots) IS DISTINCT FROM 'array' OR jsonb_array_length(drop_slots) > 7 THEN
    RAISE EXCEPTION 'Selección de equipo inválida';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(break_slots) AS b
    WHERE jsonb_typeof(b) <> 'string' OR NOT (b#>>'{}' = ANY (armor_pieces)))
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(drop_slots) AS b
      WHERE jsonb_typeof(b) <> 'string' OR b#>>'{}' NOT IN
        ('casco','armadura','botas','escudo','arma','set','set:vegetal','set:fibra','set:piel','set:cuero','set:colmillo'))
    OR (SELECT count(*) FROM jsonb_array_elements(break_slots)) <> (SELECT count(DISTINCT value) FROM jsonb_array_elements(break_slots))
    OR (SELECT count(*) FROM jsonb_array_elements(drop_slots)) <> (SELECT count(DISTINCT value) FROM jsonb_array_elements(drop_slots)) THEN
    RAISE EXCEPTION 'Selección de equipo inválida';
  END IF;

  root := coalesce(d->'cont', 'null'::jsonb);
  inside := golden_internal.grave_container_items(root);
  items := inside;
  IF root <> 'null'::jsonb THEN
    FOR entry IN SELECT value FROM jsonb_array_elements(root->'items') LOOP
      IF entry->>'c' IN ('bag','backpack') AND jsonb_typeof(entry->'items') = 'array' THEN
        items := items || jsonb_build_array(jsonb_build_object('kind','cont','k',entry->>'c','n',1));
      END IF;
    END LOOP;
    items := items || jsonb_build_array(jsonb_build_object('kind','cont','k',root->>'c','n',1));
  END IF;

  gear := CASE WHEN jsonb_typeof(d->'gear') = 'object' THEN d->'gear' ELSE '{}'::jsonb END;
  weapons := CASE WHEN jsonb_typeof(d->'weapons') = 'object' THEN d->'weapons' ELSE '{}'::jsonb END;
  armor := CASE WHEN jsonb_typeof(d->'armor') = 'object' THEN d->'armor' ELSE '{}'::jsonb END;
  durability_by_key := CASE WHEN jsonb_typeof(d->'armorDur') = 'object' THEN d->'armorDur' ELSE '{}'::jsonb END;
  off_map := CASE WHEN jsonb_typeof(d->'armorOff') = 'object' THEN d->'armorOff' ELSE '{}'::jsonb END;
  eq := coalesce(d->'armorEq', 'null'::jsonb);
  IF jsonb_typeof(eq) = 'string' THEN legacy_set := d->>'armorEq'; END IF;

  FOREACH slot IN ARRAY gear_slots LOOP
    item_key := gear->>slot;
    IF (CASE slot
        WHEN 'casco' THEN item_key IN ('casco_cuero','casco_hierro')
        WHEN 'armadura' THEN item_key IN ('pechera_cuero','pechera_hierro')
        WHEN 'botas' THEN item_key = 'botas_cuero'
        WHEN 'escudo' THEN item_key IN ('escudo_madera','escudo_hierro')
      END) THEN
      valid_gear := jsonb_set(valid_gear, ARRAY[slot], to_jsonb(item_key));
    END IF;
  END LOOP;

  -- Legacy saves displayed loot over crafted armour. An explicitly selected crafted slot takes priority.
  FOREACH piece IN ARRAY armor_pieces LOOP
    family := coalesce(legacy_set, eq->>piece);
    IF family IS NULL OR NOT (family = ANY (armor_families)) OR (family = 'vegetal' AND piece <> 'pecho') THEN CONTINUE; END IF;
    item_key := 'arm_' || family || '_' || piece;
    IF coalesce(armor->item_key, 'null') IN ('null','false','0','""')
      OR coalesce(off_map->item_key, 'null') NOT IN ('null','false','0','""') THEN CONTINUE; END IF;
    slot := gear_for_piece->>piece;
    IF legacy_set IS NOT NULL AND valid_gear ? slot THEN
      shadowed := jsonb_set(shadowed, ARRAY[slot], to_jsonb(piece));
    ELSE
      active := jsonb_set(active, ARRAY[piece], to_jsonb(family));
    END IF;
  END LOOP;

  -- Only active, already-empty pieces may be broken by the Edge roll.
  covered_by_craft := active;
  FOREACH piece IN ARRAY armor_pieces LOOP
    family := active->>piece;
    IF family IS NULL THEN
      IF break_slots ? piece THEN
        -- Old Edge planners could select a legacy piece hidden under loot. Ignore that selection
        -- during a DB-first rollout, while keeping all other ineligible selections invalid.
        IF shadowed->>(gear_for_piece->>piece) IS DISTINCT FROM piece THEN
          RAISE EXCEPTION 'No se puede romper una pieza inactiva';
        END IF;
        item_key := 'arm_' || legacy_set || '_' || piece;
        durability := CASE WHEN jsonb_typeof(durability_by_key->item_key) = 'number'
          THEN greatest(0, least(100, (durability_by_key->>item_key)::numeric)) ELSE 100 END;
        IF durability <> 0 THEN RAISE EXCEPTION 'No se puede romper una pieza sana'; END IF;
      END IF;
      CONTINUE;
    END IF;
    item_key := 'arm_' || family || '_' || piece;
    durability := CASE WHEN jsonb_typeof(durability_by_key->item_key) = 'number'
      THEN greatest(0, least(100, (durability_by_key->>item_key)::numeric)) ELSE 100 END;
    IF break_slots ? piece THEN
      IF durability <> 0 THEN RAISE EXCEPTION 'No se puede romper una pieza sana'; END IF;
      armor := armor - item_key;
      durability_by_key := durability_by_key - item_key;
      off_map := off_map - item_key;
      active := active - piece;
      IF jsonb_typeof(eq) = 'object' THEN eq := eq - piece; END IF;
      broken := broken || jsonb_build_array(piece);
    ELSIF durability > 0 THEN
      durability_by_key := jsonb_set(durability_by_key, ARRAY[item_key], to_jsonb(greatest(0, durability - 5)));
      worn := worn || jsonb_build_array(piece);
    END IF;
  END LOOP;

  FOREACH slot IN ARRAY gear_slots LOOP
    IF NOT (drop_slots ? slot) THEN CONTINUE; END IF;
    item_key := valid_gear->>slot;
    IF item_key IS NULL OR covered_by_craft ? (piece_for_gear->>slot) THEN RAISE EXCEPTION 'No llevas esa pieza'; END IF;
    gear := jsonb_set(gear, ARRAY[slot], 'null'::jsonb);
    items := items || jsonb_build_array(jsonb_build_object('kind','gear','k',item_key,'n',1));
    labels := labels || jsonb_build_array(item_key);
    IF shadowed ? slot AND jsonb_typeof(eq) <> 'object' THEN eq := active; END IF;
  END LOOP;

  IF drop_slots ? 'arma' THEN
    item_key := gear->>'arma';
    IF item_key IS NULL OR jsonb_typeof(weapons->item_key) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'No llevas esa arma'; END IF;
    items := items || jsonb_build_array(jsonb_build_object('kind','arm','k',item_key,'n',1,'w',weapons->item_key));
    weapons := weapons - item_key;
    gear := jsonb_set(gear, '{arma}', 'null'::jsonb);
    labels := labels || jsonb_build_array(item_key);
  END IF;

  IF drop_slots ? 'set' AND (legacy_set IS NULL OR NOT (legacy_set = ANY (armor_families))) THEN
    RAISE EXCEPTION 'No llevas esa armadura';
  END IF;
  FOREACH family IN ARRAY armor_families LOOP
    selection := 'set:' || family;
    IF legacy_set IS NOT NULL AND drop_slots ? selection THEN RAISE EXCEPTION 'No llevas esa armadura'; END IF;
    IF legacy_set = family THEN selection := 'set'; END IF;
    IF NOT (drop_slots ? selection) THEN CONTINUE; END IF;
    pieces := '[]';
    piece_dur := '{}';
    FOREACH piece IN ARRAY armor_pieces LOOP
      IF active->>piece IS DISTINCT FROM family THEN CONTINUE; END IF;
      item_key := 'arm_' || family || '_' || piece;
      durability := CASE WHEN jsonb_typeof(durability_by_key->item_key) = 'number'
        THEN greatest(0, least(100, (durability_by_key->>item_key)::numeric)) ELSE 100 END;
      pieces := pieces || jsonb_build_array(piece);
      piece_dur := jsonb_set(piece_dur, ARRAY[piece], to_jsonb(durability));
      armor := armor - item_key;
      durability_by_key := durability_by_key - item_key;
      off_map := off_map - item_key;
      IF jsonb_typeof(eq) = 'object' THEN eq := eq - piece; END IF;
    END LOOP;
    IF jsonb_array_length(pieces) = 0 THEN
      IF selection = 'set' AND shadowed <> '{}'::jsonb THEN CONTINUE; END IF;
      RAISE EXCEPTION 'No llevas esa armadura';
    END IF;
    items := items || jsonb_build_array(jsonb_build_object('kind','armorset','k',family,'n',1,'piezas',pieces,'dur',piece_dur));
    labels := labels || jsonb_build_array(family);
    IF legacy_set IS NOT NULL THEN eq := 'null'; END IF;
  END LOOP;

  PERFORM golden_internal.grave_items_valid(items);
  d := d || jsonb_build_object('cont',null,'gear',gear,'weapons',weapons,'armor',armor,'armorDur',durability_by_key,'armorOff',off_map,'armorEq',eq);
  RETURN jsonb_build_object(
    'data',d,'items',items,'summary',jsonb_build_object(
      'pilas',jsonb_array_length(inside),'piezas',jsonb_array_length(labels),'cont',root->>'c',
      'piezasLabel',labels,'armadura',jsonb_build_object('gastadas',worn,'rotas',broken)
    )
  );
END $function$;
