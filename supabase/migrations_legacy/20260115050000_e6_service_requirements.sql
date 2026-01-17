
-- E6: Service menu requirements + versioning

-- 1) Extender items OCR con mapping a recetas
alter table public.event_service_menu_items
  add column if not exists recipe_id uuid null references public.recipes (id) on delete set null,
  add column if not exists requires_review boolean not null default true,
  add column if not exists portion_multiplier numeric not null default 1;

alter table public.event_service_menu_items
  drop constraint if exists event_service_menu_items_portion_multiplier_check;
alter table public.event_service_menu_items
  add constraint event_service_menu_items_portion_multiplier_check check (portion_multiplier > 0);

create index if not exists event_service_menu_items_recipe_idx on public.event_service_menu_items (recipe_id);

create or replace function public.validate_service_menu_item()
returns trigger
language plpgsql
as $$
declare
  sec_org uuid;
  rec_org uuid;
begin
  select org_id into sec_org from public.event_service_menu_sections where id = new.section_id;
  if sec_org is null then
    raise exception 'menu section not found';
  end if;
  if sec_org <> new.org_id then
    raise exception 'menu item org mismatch';
  end if;
  if new.recipe_id is not null then
    select org_id into rec_org from public.recipes where id = new.recipe_id;
    if rec_org is null then
      raise exception 'recipe not found';
    end if;
    if rec_org <> new.org_id then
      raise exception 'recipe org mismatch';
    end if;
  end if;
  return new;
end;
$$;

-- 2) Vinculo supplier_items -> products para compras por receta
alter table public.supplier_items
  add column if not exists product_id uuid null references public.products (id) on delete set null,
  add column if not exists is_primary boolean not null default false;

alter table public.supplier_items
  drop constraint if exists supplier_items_primary_requires_product;
alter table public.supplier_items
  add constraint supplier_items_primary_requires_product check (is_primary = false or product_id is not null);

create index if not exists supplier_items_product_idx on public.supplier_items (product_id);
create unique index if not exists supplier_items_primary_product_uniq
  on public.supplier_items (product_id)
  where is_primary = true;

create or replace function public.validate_supplier_item_product()
returns trigger
language plpgsql
as $$
declare
  sup_org uuid;
  prod_org uuid;
begin
  if new.product_id is null then
    return new;
  end if;
  select s.org_id into sup_org from public.suppliers s where s.id = new.supplier_id;
  select org_id into prod_org from public.products where id = new.product_id;
  if sup_org is null or prod_org is null then
    raise exception 'supplier or product not found';
  end if;
  if sup_org <> prod_org then
    raise exception 'org mismatch between supplier_item and product';
  end if;
  return new;
end;
$$;

drop trigger if exists supplier_items_validate_product on public.supplier_items;
create trigger supplier_items_validate_product
before insert or update on public.supplier_items
for each row execute function public.validate_supplier_item_product();

-- 3) Versionado de ordenes (produccion y compras)
create table if not exists public.order_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  entity_type text not null check (entity_type in ('production','purchase')),
  version_num int not null,
  version_reason text null,
  idempotency_key text null,
  is_current boolean not null default true,
  created_by uuid null references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_service_id, entity_type, version_num)
);

create index if not exists order_versions_org_idx on public.order_versions (org_id);
create index if not exists order_versions_service_idx on public.order_versions (event_service_id);
create unique index if not exists order_versions_idempotency_uniq
  on public.order_versions (event_service_id, entity_type, idempotency_key)
  where idempotency_key is not null;

alter table public.order_versions enable row level security;
drop policy if exists "order_versions_by_member" on public.order_versions;
create policy "order_versions_by_member"
  on public.order_versions
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
-- 4) Production plans versionados
alter table public.production_plans
  add column if not exists order_version_id uuid null references public.order_versions (id) on delete set null,
  add column if not exists version_num int not null default 1,
  add column if not exists version_reason text null,
  add column if not exists idempotency_key text null,
  add column if not exists is_current boolean not null default true;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'production_plans'
      and constraint_name = 'production_plans_service_unique'
  ) then
    alter table public.production_plans drop constraint production_plans_service_unique;
  end if;
end $$;

create unique index if not exists production_plans_service_version_uniq
  on public.production_plans (event_service_id, version_num);

create or replace function public.validate_production_plan()
returns trigger
language plpgsql
as $$
declare
  svc_org uuid;
  svc_event uuid;
  ev_hotel uuid;
begin
  select org_id, event_id into svc_org, svc_event from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  select hotel_id into ev_hotel from public.events where id = svc_event;
  if svc_event <> new.event_id or svc_org <> new.org_id then
    raise exception 'production plan org/event mismatch';
  end if;
  if new.hotel_id is null then
    new.hotel_id := ev_hotel;
  end if;
  return new;
end;
$$;

drop trigger if exists production_plans_validate on public.production_plans;
create trigger production_plans_validate
before insert or update on public.production_plans
for each row execute function public.validate_production_plan();

-- 5) Event purchase orders versionados por servicio
alter table public.event_purchase_orders
  add column if not exists event_service_id uuid null references public.event_services (id) on delete set null,
  add column if not exists order_version_id uuid null references public.order_versions (id) on delete set null,
  add column if not exists version_num int not null default 1,
  add column if not exists version_reason text null,
  add column if not exists idempotency_key text null,
  add column if not exists is_current boolean not null default true;

create unique index if not exists event_purchase_orders_service_version_uniq
  on public.event_purchase_orders (event_service_id, version_num, supplier_id)
  where event_service_id is not null;

create or replace function public.validate_event_purchase_order()
returns trigger
language plpgsql
as $$
declare
  ev_org uuid;
  sup_org uuid;
  hotel_org uuid;
  svc_org uuid;
  svc_event uuid;
begin
  select org_id into ev_org from public.events where id = new.event_id;
  select org_id into sup_org from public.suppliers where id = new.supplier_id;
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if ev_org is null or sup_org is null or hotel_org is null then
    raise exception 'event/supplier/hotel not found';
  end if;
  if ev_org <> new.org_id or sup_org <> new.org_id or hotel_org <> new.org_id then
    raise exception 'org mismatch in event_purchase_orders';
  end if;
  if new.event_service_id is not null then
    select org_id, event_id into svc_org, svc_event from public.event_services where id = new.event_service_id;
    if svc_org is null then
      raise exception 'event service not found';
    end if;
    if svc_org <> new.org_id then
      raise exception 'event service org mismatch';
    end if;
    if svc_event <> new.event_id then
      raise exception 'event service mismatch with event';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists event_purchase_orders_validate on public.event_purchase_orders;
create trigger event_purchase_orders_validate
before insert or update on public.event_purchase_orders
for each row execute function public.validate_event_purchase_order();

-- 6) Helper de redondeo
create or replace function public.round_qty(
  p_qty numeric,
  p_rounding_rule text,
  p_pack_size numeric
) returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_rounding_rule = 'ceil_pack' and p_pack_size is not null and p_pack_size > 0
      then ceil(p_qty / p_pack_size) * p_pack_size
    when p_rounding_rule = 'ceil_unit'
      then ceil(p_qty)
    else p_qty
  end;
$$;
-- 7) Requirements por servicio (OCR o plantilla)
create or replace function public.compute_service_requirements(
  p_event_service_id uuid,
  p_strict boolean default true
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_service record;
  v_missing_items text[] := array[]::text[];
  v_recipes jsonb := '[]'::jsonb;
  v_products jsonb := '[]'::jsonb;
  v_has_menu_items boolean := false;
begin
  select es.id, es.org_id, es.event_id, ev.hotel_id, es.pax, es.format
  into v_service
  from public.event_services es
  join public.events ev on ev.id = es.event_id
  where es.id = p_event_service_id;

  if not found then
    raise exception 'service not found';
  end if;

  select exists(
    select 1
    from public.event_service_menu_items emi
    join public.event_service_menu_sections sec on sec.id = emi.section_id
    where sec.event_service_id = p_event_service_id
  ) into v_has_menu_items;

  if v_has_menu_items then
    with items as (
      select emi.text as item_name, emi.recipe_id, emi.requires_review, emi.portion_multiplier
      from public.event_service_menu_items emi
      join public.event_service_menu_sections sec on sec.id = emi.section_id
      where sec.event_service_id = p_event_service_id
    )
    select coalesce(array_agg(item_name), array[]::text[])
    into v_missing_items
    from items
    where recipe_id is null or requires_review = true;

    with items as (
      select emi.text as item_name, emi.recipe_id, emi.requires_review, emi.portion_multiplier
      from public.event_service_menu_items emi
      join public.event_service_menu_sections sec on sec.id = emi.section_id
      where sec.event_service_id = p_event_service_id
    ),
    recipe_totals as (
      select recipe_id, sum((v_service.pax::numeric) * coalesce(portion_multiplier, 1)) as servings
      from items
      where recipe_id is not null and requires_review = false
      group by recipe_id
    ),
    recipe_rows as (
      select r.id, r.name, r.default_servings, rt.servings
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'recipe_id', rr.id,
      'name', rr.name,
      'servings', rr.servings,
      'default_servings', rr.default_servings
    )), '[]'::jsonb)
    into v_recipes
    from recipe_rows rr;

    with items as (
      select emi.text as item_name, emi.recipe_id, emi.requires_review, emi.portion_multiplier
      from public.event_service_menu_items emi
      join public.event_service_menu_sections sec on sec.id = emi.section_id
      where sec.event_service_id = p_event_service_id
    ),
    recipe_totals as (
      select recipe_id, sum((v_service.pax::numeric) * coalesce(portion_multiplier, 1)) as servings
      from items
      where recipe_id is not null and requires_review = false
      group by recipe_id
    ),
    product_totals as (
      select rl.product_id,
             sum((rt.servings / nullif(r.default_servings, 0)) * rl.qty) as qty,
             max(rl.unit) as unit
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
      join public.recipe_lines rl on rl.recipe_id = rt.recipe_id
      group by rl.product_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', pt.product_id,
      'name', p.name,
      'qty', pt.qty,
      'unit', pt.unit
    )), '[]'::jsonb)
    into v_products
    from product_totals pt
    join public.products p on p.id = pt.product_id;
  else
    with base_items as (
      select mti.id, mti.name, mti.unit, mti.qty_per_pax_seated, mti.qty_per_pax_standing
      from public.event_service_menus esm
      join public.menu_template_items mti on mti.template_id = esm.template_id
      where esm.event_service_id = p_event_service_id
    ),
    excluded as (
      select template_item_id from public.event_service_excluded_items where event_service_id = p_event_service_id
    ),
    replaced as (
      select template_item_id, name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_replaced_items
      where event_service_id = p_event_service_id
    ),
    added as (
      select name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_added_items
      where event_service_id = p_event_service_id
    ),
    final_items as (
      select
        coalesce(r.name, b.name) as item_name,
        coalesce(r.unit, b.unit) as unit,
        coalesce(r.qty_per_pax_seated, b.qty_per_pax_seated) as qty_per_pax_seated,
        coalesce(r.qty_per_pax_standing, b.qty_per_pax_standing) as qty_per_pax_standing
      from base_items b
      left join replaced r on r.template_item_id = b.id
      where not exists (select 1 from excluded e where e.template_item_id = b.id)
      union all
      select name, unit, qty_per_pax_seated, qty_per_pax_standing from added
    ),
    menu_totals as (
      select
        item_name,
        unit,
        (v_service.pax::numeric) * case
          when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
          else coalesce(qty_per_pax_standing, 0)
        end as servings
      from final_items
      where case
        when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
        else coalesce(qty_per_pax_standing, 0)
      end > 0
    ),
    mapped as (
      select mt.item_name, mt.unit, mt.servings, mia.recipe_id
      from menu_totals mt
      left join public.menu_item_recipe_aliases mia
        on mia.org_id = v_service.org_id
       and lower(mia.alias_name) = lower(mt.item_name)
    )
    select coalesce(array_agg(item_name), array[]::text[])
    into v_missing_items
    from mapped
    where recipe_id is null;

    with base_items as (
      select mti.id, mti.name, mti.unit, mti.qty_per_pax_seated, mti.qty_per_pax_standing
      from public.event_service_menus esm
      join public.menu_template_items mti on mti.template_id = esm.template_id
      where esm.event_service_id = p_event_service_id
    ),
    excluded as (
      select template_item_id from public.event_service_excluded_items where event_service_id = p_event_service_id
    ),
    replaced as (
      select template_item_id, name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_replaced_items
      where event_service_id = p_event_service_id
    ),
    added as (
      select name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_added_items
      where event_service_id = p_event_service_id
    ),
    final_items as (
      select
        coalesce(r.name, b.name) as item_name,
        coalesce(r.unit, b.unit) as unit,
        coalesce(r.qty_per_pax_seated, b.qty_per_pax_seated) as qty_per_pax_seated,
        coalesce(r.qty_per_pax_standing, b.qty_per_pax_standing) as qty_per_pax_standing
      from base_items b
      left join replaced r on r.template_item_id = b.id
      where not exists (select 1 from excluded e where e.template_item_id = b.id)
      union all
      select name, unit, qty_per_pax_seated, qty_per_pax_standing from added
    ),
    menu_totals as (
      select
        item_name,
        unit,
        (v_service.pax::numeric) * case
          when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
          else coalesce(qty_per_pax_standing, 0)
        end as servings
      from final_items
      where case
        when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
        else coalesce(qty_per_pax_standing, 0)
      end > 0
    ),
    mapped as (
      select mt.item_name, mt.unit, mt.servings, mia.recipe_id
      from menu_totals mt
      left join public.menu_item_recipe_aliases mia
        on mia.org_id = v_service.org_id
       and lower(mia.alias_name) = lower(mt.item_name)
    ),
    recipe_totals as (
      select recipe_id, sum(servings) as servings
      from mapped
      where recipe_id is not null
      group by recipe_id
    ),
    recipe_rows as (
      select r.id, r.name, r.default_servings, rt.servings
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'recipe_id', rr.id,
      'name', rr.name,
      'servings', rr.servings,
      'default_servings', rr.default_servings
    )), '[]'::jsonb)
    into v_recipes
    from recipe_rows rr;

    with base_items as (
      select mti.id, mti.name, mti.unit, mti.qty_per_pax_seated, mti.qty_per_pax_standing
      from public.event_service_menus esm
      join public.menu_template_items mti on mti.template_id = esm.template_id
      where esm.event_service_id = p_event_service_id
    ),
    excluded as (
      select template_item_id from public.event_service_excluded_items where event_service_id = p_event_service_id
    ),
    replaced as (
      select template_item_id, name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_replaced_items
      where event_service_id = p_event_service_id
    ),
    added as (
      select name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_added_items
      where event_service_id = p_event_service_id
    ),
    final_items as (
      select
        coalesce(r.name, b.name) as item_name,
        coalesce(r.unit, b.unit) as unit,
        coalesce(r.qty_per_pax_seated, b.qty_per_pax_seated) as qty_per_pax_seated,
        coalesce(r.qty_per_pax_standing, b.qty_per_pax_standing) as qty_per_pax_standing
      from base_items b
      left join replaced r on r.template_item_id = b.id
      where not exists (select 1 from excluded e where e.template_item_id = b.id)
      union all
      select name, unit, qty_per_pax_seated, qty_per_pax_standing from added
    ),
    menu_totals as (
      select
        item_name,
        unit,
        (v_service.pax::numeric) * case
          when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
          else coalesce(qty_per_pax_standing, 0)
        end as servings
      from final_items
      where case
        when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
        else coalesce(qty_per_pax_standing, 0)
      end > 0
    ),
    mapped as (
      select mt.item_name, mt.unit, mt.servings, mia.recipe_id
      from menu_totals mt
      left join public.menu_item_recipe_aliases mia
        on mia.org_id = v_service.org_id
       and lower(mia.alias_name) = lower(mt.item_name)
    ),
    recipe_totals as (
      select recipe_id, sum(servings) as servings
      from mapped
      where recipe_id is not null
      group by recipe_id
    ),
    product_totals as (
      select rl.product_id,
             sum((rt.servings / nullif(r.default_servings, 0)) * rl.qty) as qty,
             max(rl.unit) as unit
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
      join public.recipe_lines rl on rl.recipe_id = rt.recipe_id
      group by rl.product_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', pt.product_id,
      'name', p.name,
      'qty', pt.qty,
      'unit', pt.unit
    )), '[]'::jsonb)
    into v_products
    from product_totals pt
    join public.products p on p.id = pt.product_id;
  end if;

  return jsonb_build_object(
    'service_id', v_service.id,
    'event_id', v_service.event_id,
    'pax', v_service.pax,
    'missing_items', to_jsonb(coalesce(v_missing_items, array[]::text[])),
    'recipes', v_recipes,
    'products', v_products
  );
end;
$$;
-- 8) RPC: generar plan de produccion versionado
create or replace function public.generate_production_plan(
  p_service_id uuid,
  p_version_reason text default null,
  p_idempotency_key text default null,
  p_strict boolean default true
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_service record;
  v_requirements jsonb;
  v_missing_items text[] := array[]::text[];
  v_version_id uuid;
  v_existing_version_id uuid;
  v_version_num int;
  v_plan_id uuid;
  v_created_count int := 0;
  v_recipe jsonb;
  v_recipe_id uuid;
  v_servings numeric;
  v_meta record;
begin
  select es.id, es.org_id, es.event_id, ev.hotel_id, es.pax, es.format
  into v_service
  from public.event_services es
  join public.events ev on ev.id = es.event_id
  where es.id = p_service_id;
  if not found then
    raise exception 'service not found';
  end if;

  if not public.has_org_role(v_service.org_id, array['owner', 'admin', 'manager']) then
    raise exception 'insufficient permissions';
  end if;

  perform pg_advisory_xact_lock(hashtext('production:' || p_service_id::text));

  if p_idempotency_key is not null then
    select id into v_existing_version_id
    from public.order_versions
    where event_service_id = p_service_id
      and entity_type = 'production'
      and idempotency_key = p_idempotency_key
    limit 1;
    if v_existing_version_id is not null then
      select id into v_plan_id from public.production_plans where order_version_id = v_existing_version_id;
      return jsonb_build_object('plan_id', v_plan_id, 'created', 0, 'missing_items', to_jsonb(array[]::text[]), 'version_num', null);
    end if;
  end if;

  select public.compute_service_requirements(p_service_id, false) into v_requirements;
  select coalesce(array_agg(value), array[]::text[]) into v_missing_items
  from jsonb_array_elements_text(coalesce(v_requirements->'missing_items', '[]'::jsonb)) as value;

  if p_strict and array_length(v_missing_items, 1) > 0 then
    return jsonb_build_object(
      'status', 'blocked',
      'missing_items', to_jsonb(v_missing_items),
      'created', 0
    );
  end if;

  select coalesce(max(version_num), 0) + 1
  into v_version_num
  from public.order_versions
  where event_service_id = p_service_id
    and entity_type = 'production';

  insert into public.order_versions (
    org_id, event_id, event_service_id, entity_type, version_num, version_reason, idempotency_key, created_by, is_current
  )
  values (
    v_service.org_id, v_service.event_id, p_service_id, 'production', v_version_num, p_version_reason, p_idempotency_key, auth.uid(), true
  )
  returning id into v_version_id;

  update public.order_versions
  set is_current = false
  where event_service_id = p_service_id
    and entity_type = 'production'
    and id <> v_version_id;

  insert into public.production_plans (
    org_id, hotel_id, event_id, event_service_id, status, generated_from,
    order_version_id, version_num, version_reason, idempotency_key, is_current
  )
  values (
    v_service.org_id,
    v_service.hotel_id,
    v_service.event_id,
    p_service_id,
    'draft',
    'menu',
    v_version_id,
    v_version_num,
    p_version_reason,
    p_idempotency_key,
    true
  )
  returning id into v_plan_id;

  update public.production_plans
  set is_current = false
  where event_service_id = p_service_id
    and id <> v_plan_id;

  for v_recipe in
    select * from jsonb_array_elements(coalesce(v_requirements->'recipes', '[]'::jsonb))
  loop
    v_recipe_id := (v_recipe->>'recipe_id')::uuid;
    v_servings := (v_recipe->>'servings')::numeric;
    if v_recipe_id is null or v_servings is null or v_servings <= 0 then
      continue;
    end if;
    select * into v_meta from public.recipe_production_meta where recipe_id = v_recipe_id;
    insert into public.production_tasks (
      org_id, plan_id, station, title, planned_qty, unit, recipe_id, priority, status, notes
    ) values (
      v_service.org_id,
      v_plan_id,
      coalesce(v_meta.station, 'caliente'),
      (v_recipe->>'name'),
      v_servings,
      'ud',
      v_recipe_id,
      3,
      'todo',
      'Generado desde menu'
    );
    v_created_count := v_created_count + 1;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'created', v_created_count,
    'missing_items', to_jsonb(coalesce(v_missing_items, array[]::text[])),
    'version_num', v_version_num
  );
end;
$$;
-- 9) RPC: generar pedidos de compra por servicio (versionado)
create or replace function public.generate_event_purchase_orders(
  p_event_service_id uuid,
  p_version_reason text default null,
  p_idempotency_key text default null,
  p_strict boolean default true
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_service record;
  v_requirements jsonb;
  v_missing_items text[] := array[]::text[];
  v_version_id uuid;
  v_existing_version_id uuid;
  v_version_num int;
  v_order_ids uuid[] := array[]::uuid[];
  v_settings record;
  v_product record;
  v_supplier record;
  v_order_id uuid;
  v_idx int := 0;
begin
  select es.id, es.org_id, es.event_id, ev.hotel_id
  into v_service
  from public.event_services es
  join public.events ev on ev.id = es.event_id
  where es.id = p_event_service_id;
  if not found then
    raise exception 'service not found';
  end if;

  if not public.has_org_role(v_service.org_id, array['owner', 'admin', 'manager']) then
    raise exception 'insufficient permissions';
  end if;

  perform pg_advisory_xact_lock(hashtext('purchase:' || p_event_service_id::text));

  if p_idempotency_key is not null then
    select id into v_existing_version_id
    from public.order_versions
    where event_service_id = p_event_service_id
      and entity_type = 'purchase'
      and idempotency_key = p_idempotency_key
    limit 1;
    if v_existing_version_id is not null then
      select coalesce(array_agg(id), array[]::uuid[]) into v_order_ids
      from public.event_purchase_orders
      where order_version_id = v_existing_version_id;
      return jsonb_build_object(
        'order_ids', v_order_ids,
        'missing_items', to_jsonb(array[]::text[]),
        'version_num', null,
        'created', 0
      );
    end if;
  end if;

  select public.compute_service_requirements(p_event_service_id, false) into v_requirements;
  select coalesce(array_agg(value), array[]::text[]) into v_missing_items
  from jsonb_array_elements_text(coalesce(v_requirements->'missing_items', '[]'::jsonb)) as value;

  select default_buffer_percent, default_buffer_qty into v_settings
  from public.purchasing_settings
  where org_id = v_service.org_id;
  if v_settings.default_buffer_percent is null then
    v_settings.default_buffer_percent := 0;
  end if;
  if v_settings.default_buffer_qty is null then
    v_settings.default_buffer_qty := 0;
  end if;

  create temporary table tmp_po_lines (
    supplier_id uuid,
    supplier_item_id uuid,
    item_label text,
    gross_qty numeric,
    buffer_percent numeric,
    buffer_qty numeric,
    net_qty numeric,
    rounded_qty numeric,
    purchase_unit text,
    unit_price numeric,
    unit_mismatch boolean
  ) on commit drop;

  for v_product in
    select
      (value->>'product_id')::uuid as product_id,
      (value->>'name') as name,
      (value->>'qty')::numeric as qty,
      (value->>'unit') as unit
    from jsonb_array_elements(coalesce(v_requirements->'products', '[]'::jsonb)) as value
  loop
    if v_product.product_id is null or v_product.qty is null or v_product.qty <= 0 then
      continue;
    end if;

    select si.id, si.supplier_id, si.purchase_unit, si.rounding_rule, si.pack_size, si.price_per_unit, si.is_primary
    into v_supplier
    from public.supplier_items si
    join public.suppliers s on s.id = si.supplier_id
    where s.org_id = v_service.org_id
      and si.product_id = v_product.product_id
    order by si.is_primary desc, si.created_at
    limit 1;

    if not found then
      v_missing_items := array_append(v_missing_items, v_product.name);
      continue;
    end if;

    if v_supplier.purchase_unit <> v_product.unit then
      v_missing_items := array_append(v_missing_items, v_product.name);
      continue;
    end if;

    insert into tmp_po_lines (
      supplier_id,
      supplier_item_id,
      item_label,
      gross_qty,
      buffer_percent,
      buffer_qty,
      net_qty,
      rounded_qty,
      purchase_unit,
      unit_price,
      unit_mismatch
    ) values (
      v_supplier.supplier_id,
      v_supplier.id,
      v_product.name,
      v_product.qty,
      v_settings.default_buffer_percent,
      v_settings.default_buffer_qty,
      v_product.qty + (v_product.qty * v_settings.default_buffer_percent / 100) + v_settings.default_buffer_qty,
      public.round_qty(
        v_product.qty + (v_product.qty * v_settings.default_buffer_percent / 100) + v_settings.default_buffer_qty,
        v_supplier.rounding_rule,
        v_supplier.pack_size
      ),
      v_supplier.purchase_unit,
      v_supplier.price_per_unit,
      false
    );
  end loop;

  if p_strict and array_length(v_missing_items, 1) > 0 then
    return jsonb_build_object(
      'status', 'blocked',
      'missing_items', to_jsonb(v_missing_items),
      'created', 0
    );
  end if;

  if not exists (select 1 from tmp_po_lines) then
    return jsonb_build_object(
      'status', 'empty',
      'missing_items', to_jsonb(coalesce(v_missing_items, array[]::text[])),
      'order_ids', array[]::uuid[],
      'created', 0
    );
  end if;

  select coalesce(max(version_num), 0) + 1
  into v_version_num
  from public.order_versions
  where event_service_id = p_event_service_id
    and entity_type = 'purchase';

  insert into public.order_versions (
    org_id, event_id, event_service_id, entity_type, version_num, version_reason, idempotency_key, created_by, is_current
  )
  values (
    v_service.org_id, v_service.event_id, p_event_service_id, 'purchase', v_version_num, p_version_reason, p_idempotency_key, auth.uid(), true
  )
  returning id into v_version_id;

  update public.order_versions
  set is_current = false
  where event_service_id = p_event_service_id
    and entity_type = 'purchase'
    and id <> v_version_id;

  for v_supplier in
    select distinct supplier_id
    from tmp_po_lines
  loop
    v_idx := v_idx + 1;
    insert into public.event_purchase_orders (
      org_id, hotel_id, event_id, event_service_id, supplier_id,
      status, order_number, total_estimated, approval_status,
      order_version_id, version_num, version_reason, idempotency_key, is_current
    )
    values (
      v_service.org_id,
      v_service.hotel_id,
      v_service.event_id,
      p_event_service_id,
      v_supplier.supplier_id,
      'draft',
      'SV-' || left(p_event_service_id::text, 8) || '-' || v_idx::text,
      0,
      'pending',
      v_version_id,
      v_version_num,
      p_version_reason,
      p_idempotency_key,
      true
    )
    returning id into v_order_id;

    v_order_ids := array_append(v_order_ids, v_order_id);

    insert into public.event_purchase_order_lines (
      org_id,
      event_purchase_order_id,
      supplier_item_id,
      item_label,
      qty,
      purchase_unit,
      unit_price,
      line_total,
      "freeze",
      buffer_percent,
      buffer_qty,
      gross_qty,
      on_hand_qty,
      on_order_qty,
      net_qty,
      rounded_qty,
      unit_mismatch
    )
    select
      v_service.org_id,
      v_order_id,
      l.supplier_item_id,
      l.item_label,
      l.rounded_qty,
      l.purchase_unit,
      l.unit_price,
      coalesce(l.rounded_qty, 0) * coalesce(l.unit_price, 0),
      false,
      l.buffer_percent,
      l.buffer_qty,
      l.gross_qty,
      0,
      0,
      l.net_qty,
      l.rounded_qty,
      l.unit_mismatch
    from tmp_po_lines l
    where l.supplier_id = v_supplier.supplier_id;
  end loop;

  update public.event_purchase_orders
  set is_current = false
  where event_service_id = p_event_service_id
    and id <> all(v_order_ids);

  return jsonb_build_object(
    'order_ids', coalesce(v_order_ids, array[]::uuid[]),
    'missing_items', to_jsonb(coalesce(v_missing_items, array[]::text[])),
    'version_num', v_version_num,
    'created', coalesce(array_length(v_order_ids, 1), 0)
  );
end;
$$;
