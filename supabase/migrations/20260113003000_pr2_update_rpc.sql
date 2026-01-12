-- Update RPC to return details about missing items
create or replace function public.generate_production_plan(p_service_id uuid)
returns jsonb
language plpgsql
security definer
as $function$
declare
  v_service public.event_services%rowtype;
  v_plan_id uuid;
  v_org_id uuid;
  v_item record;
  v_recipe_id uuid;
  v_meta record;
  v_total_qty numeric;
  v_created_count int := 0;
  v_station public.production_station;
  v_event_id uuid;
  v_missing_items text[] := array[]::text[];
begin
  select * into v_service from public.event_services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;
  
  v_org_id := v_service.org_id;
  v_event_id := v_service.event_id;

  -- Ensure Plan Exists
  insert into public.production_plans (org_id, hotel_id, event_id, event_service_id, status, generated_from)
  values (
    v_org_id, 
    (select hotel_id from public.events where id = v_event_id),
    v_event_id, 
    p_service_id, 
    'draft', 
    'menu'
  )
  on conflict (event_service_id) do update
  set generated_from = 'menu'
  returning id into v_plan_id;

  -- Loop through Menu Items for this Service
  for v_item in (
    select 
      mti.name, 
      mti.unit, 
      mti.qty_per_pax_seated, 
      mti.qty_per_pax_standing
    from public.event_service_menus esm
    join public.menu_template_items mti on mti.template_id = esm.template_id
    where esm.event_service_id = p_service_id
  ) loop
    -- Calculate Quantity
    if v_service.format = 'sentado' then
       v_total_qty := v_service.pax * coalesce(v_item.qty_per_pax_seated, 0);
    else
       v_total_qty := v_service.pax * coalesce(v_item.qty_per_pax_standing, 0);
    end if;

    if v_total_qty <= 0 then continue; end if;

    -- Lookup Alias
    select recipe_id into v_recipe_id
    from public.menu_item_recipe_aliases
    where org_id = v_org_id and lower(alias_name) = lower(v_item.name)
    limit 1;

    if v_recipe_id is not null then
       -- Get Meta
       select * into v_meta 
       from public.recipe_production_meta 
       where recipe_id = v_recipe_id;
       
       v_station := coalesce(v_meta.station, 'caliente');

       if not exists (
         select 1 from public.production_tasks 
         where plan_id = v_plan_id and title = v_item.name and recipe_id = v_recipe_id
       ) then
           insert into public.production_tasks (
             org_id, plan_id, station, title, 
             planned_qty, unit, recipe_id, 
             priority, status, notes
           ) values (
             v_org_id, v_plan_id, v_station, v_item.name,
             v_total_qty, v_item.unit, v_recipe_id,
             3, 'todo', 'Generated from Menu'
           );
           v_created_count := v_created_count + 1;
       end if;
    else
       v_missing_items := array_append(v_missing_items, v_item.name);
    end if;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'created', v_created_count,
    'missing_count', array_length(v_missing_items, 1),
    'missing_items', v_missing_items
  );
end;
$function$;
