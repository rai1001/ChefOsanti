-- PR2: Automatic Production Generation

-- 1. Table: menu_item_recipe_aliases
create table if not exists public.menu_item_recipe_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  alias_name text not null, -- The name appearing on the menu (e.g. "Solomillo al Whisky")
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (org_id, alias_name)
);

-- 2. Table: recipe_production_meta
create table if not exists public.recipe_production_meta (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  station public.production_station not null,
  lead_time_minutes int not null default 0,
  default_batch_size numeric null,
  shelf_life_days int null,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (recipe_id)
);

-- 3. Alter production_tasks
alter table public.production_tasks 
  add column if not exists planned_qty numeric null,
  add column if not exists unit text null,
  add column if not exists recipe_id uuid references public.recipes (id) on delete set null;

-- 4. RLS
alter table public.menu_item_recipe_aliases enable row level security;
alter table public.recipe_production_meta enable row level security;

drop policy if exists "aliases_read_member" on public.menu_item_recipe_aliases;
create policy "aliases_read_member" on public.menu_item_recipe_aliases
  for select using (public.is_org_member(org_id));

drop policy if exists "aliases_write_member" on public.menu_item_recipe_aliases;
create policy "aliases_write_member" on public.menu_item_recipe_aliases
  for insert with check (public.is_org_member(org_id));

drop policy if exists "aliases_update_member" on public.menu_item_recipe_aliases;
create policy "aliases_update_member" on public.menu_item_recipe_aliases
  for update using (public.is_org_member(org_id));

drop policy if exists "aliases_delete_member" on public.menu_item_recipe_aliases;
create policy "aliases_delete_member" on public.menu_item_recipe_aliases
  for delete using (public.is_org_member(org_id));

drop policy if exists "meta_read_member" on public.recipe_production_meta;
create policy "meta_read_member" on public.recipe_production_meta
  for select using (public.is_org_member(org_id));

drop policy if exists "meta_write_member" on public.recipe_production_meta;
create policy "meta_write_member" on public.recipe_production_meta
  for insert with check (public.is_org_member(org_id));

drop policy if exists "meta_update_member" on public.recipe_production_meta;
create policy "meta_update_member" on public.recipe_production_meta
  for update using (public.is_org_member(org_id));

drop policy if exists "meta_delete_member" on public.recipe_production_meta;
create policy "meta_delete_member" on public.recipe_production_meta
  for delete using (public.is_org_member(org_id));

-- 5. RPC: generate_production_plan
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
  v_missing_count int := 0;
  v_station public.production_station;
  v_event_id uuid;
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
    -- Simple logic: if format is 'sentado', use seated qty. If 'de_pie', use standing.
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
       
       v_station := coalesce(v_meta.station, 'caliente'); -- Default to caliente if no meta

       -- Create Task (Avoid duplicates? For now, allow duplicates or check existence?)
       -- Let's simple insert. If user re-generates, we might duplicate.
       -- Ideally we should clear old "generated" tasks or check if exists.
       -- Simple check:
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
       v_missing_count := v_missing_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'created', v_created_count,
    'missing', v_missing_count
  );
end;
$function$;
