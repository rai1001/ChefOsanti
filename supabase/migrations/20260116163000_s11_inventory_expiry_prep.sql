-- S11: Inventory expiry rules by product type + preparation process rules

do $$ begin
  if not exists (select 1 from pg_type where typname = 'product_type') then
    create type public.product_type as enum ('fresh', 'pasteurized', 'frozen');
  end if;
  if not exists (select 1 from pg_type where typname = 'preparation_process') then
    create type public.preparation_process as enum ('cooked', 'pasteurized', 'vacuum', 'frozen', 'pasteurized_frozen');
  end if;
end $$;

-- Products: type + lead time
alter table public.products
  add column if not exists product_type public.product_type not null default 'fresh',
  add column if not exists lead_time_days int not null default 2;

do $$ begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'products'
      and constraint_name = 'products_lead_time_chk'
  ) then
    alter table public.products add constraint products_lead_time_chk check (lead_time_days >= 0);
  end if;
end $$;

create index if not exists products_type_idx on public.products (product_type);

-- Supplier items: overrides for type + lead time
alter table public.supplier_items
  add column if not exists product_type_override public.product_type null,
  add column if not exists lead_time_days_override int null;

do $$ begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'supplier_items'
      and constraint_name = 'supplier_items_lead_time_override_chk'
  ) then
    alter table public.supplier_items
      add constraint supplier_items_lead_time_override_chk
      check (lead_time_days_override is null or lead_time_days_override >= 0);
  end if;
end $$;

create index if not exists supplier_items_type_override_idx on public.supplier_items (product_type_override);

-- Preparations: default process and runs
alter table public.preparations
  add column if not exists default_process_type public.preparation_process not null default 'cooked';

alter table public.preparation_runs
  add column if not exists process_type public.preparation_process not null default 'cooked';

create index if not exists prep_runs_process_idx on public.preparation_runs (process_type);
create index if not exists prep_runs_batch_idx on public.preparation_runs (stock_batch_id);

-- Process rules per org (optional override of shelf life days)
create table if not exists public.preparation_process_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  process_type public.preparation_process not null,
  shelf_life_days int not null check (shelf_life_days >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, process_type)
);

create index if not exists prep_process_rules_org_idx on public.preparation_process_rules (org_id);

alter table public.preparation_process_rules enable row level security;

drop policy if exists "prep_process_rules_select_member" on public.preparation_process_rules;
create policy "prep_process_rules_select_member" on public.preparation_process_rules
  for select using (public.is_org_member(org_id));

drop policy if exists "prep_process_rules_write_member" on public.preparation_process_rules;
create policy "prep_process_rules_write_member" on public.preparation_process_rules
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Expiry rules: per product type
alter table public.expiry_rules
  add column if not exists product_type public.product_type null;

create unique index if not exists expiry_rules_org_type_uniq
  on public.expiry_rules (org_id, product_type)
  where product_type is not null;

-- Seed default rules (fresh/pasteurized: 48h, frozen: 7d)
insert into public.expiry_rules (org_id, days_before, is_enabled, product_type)
select o.id, 2, true, 'fresh'::public.product_type
from public.orgs o
where not exists (
  select 1 from public.expiry_rules r where r.org_id = o.id and r.product_type = 'fresh'
);

insert into public.expiry_rules (org_id, days_before, is_enabled, product_type)
select o.id, 2, true, 'pasteurized'::public.product_type
from public.orgs o
where not exists (
  select 1 from public.expiry_rules r where r.org_id = o.id and r.product_type = 'pasteurized'
);

insert into public.expiry_rules (org_id, days_before, is_enabled, product_type)
select o.id, 7, true, 'frozen'::public.product_type
from public.orgs o
where not exists (
  select 1 from public.expiry_rules r where r.org_id = o.id and r.product_type = 'frozen'
);

-- Missing-expiry alerts for inbound shipments
create or replace function public.list_inbound_missing_expiry(
  p_org_id uuid,
  p_hotel_id uuid default null,
  p_location_id uuid default null
)
returns table (
  line_id uuid,
  shipment_id uuid,
  location_id uuid,
  hotel_id uuid,
  location_name text,
  supplier_name text,
  description text,
  qty numeric,
  unit text,
  delivered_at date,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  if p_produced_qty is null or p_produced_qty <= 0 then
    raise exception 'produced qty must be > 0';
  end if;

  if p_labels_count is not null and p_labels_count < 1 then
    raise exception 'labels_count must be >= 1';
  end if;

  if p_produced_unit not in ('kg', 'ud') then
    raise exception 'invalid produced unit';
  end if;

  if p_produced_at is null then
    raise exception 'produced_at required';
  end if;

  return query
  select
    l.id as line_id,
    l.shipment_id,
    s.location_id,
    loc.hotel_id,
    loc.name as location_name,
    coalesce(s.supplier_name, 'Sin proveedor') as supplier_name,
    l.description,
    l.qty,
    l.unit,
    s.delivered_at,
    l.created_at
  from public.inbound_shipment_lines l
  join public.inbound_shipments s on s.id = l.shipment_id
  join public.inventory_locations loc on loc.id = s.location_id
  where l.org_id = p_org_id
    and l.expires_at is null
    and l.status = 'ready'
    and (p_hotel_id is null or loc.hotel_id = p_hotel_id)
    and (p_location_id is null or s.location_id = p_location_id)
  order by l.created_at desc;
end;
$$;

grant execute on function public.list_inbound_missing_expiry(uuid, uuid, uuid) to authenticated;

-- Create preparation run in DB (preparation + stock + movement)
create or replace function public.create_preparation_run(
  p_org_id uuid,
  p_preparation_id uuid,
  p_location_id uuid,
  p_produced_qty numeric,
  p_produced_unit text,
  p_produced_at timestamptz,
  p_process_type public.preparation_process default null,
  p_labels_count int default 1
)
returns table (run_id uuid, batch_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_default_process public.preparation_process;
  v_shelf_life int;
  v_expires timestamptz;
  v_batch_id uuid;
  v_run_id uuid;
  v_location_org uuid;
  v_process public.preparation_process;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  select org_id, shelf_life_days, default_process_type
    into v_org, v_shelf_life, v_default_process
  from public.preparations
  where id = p_preparation_id;

  if v_org is null then
    raise exception 'preparation not found';
  end if;
  if v_org <> p_org_id then
    raise exception 'org mismatch';
  end if;

  select org_id into v_location_org
  from public.inventory_locations
  where id = p_location_id;

  if v_location_org is null then
    raise exception 'location not found';
  end if;
  if v_location_org <> p_org_id then
    raise exception 'location org mismatch';
  end if;

  v_process := coalesce(p_process_type, v_default_process, 'cooked');

  select shelf_life_days
    into v_shelf_life
  from public.preparation_process_rules
  where org_id = p_org_id
    and process_type = v_process;

  if v_shelf_life is null then
    select shelf_life_days into v_shelf_life
    from public.preparations
    where id = p_preparation_id;
  end if;

  if v_shelf_life is null then
    v_expires := null;
  else
    v_expires := p_produced_at + (v_shelf_life || ' days')::interval;
  end if;

  insert into public.stock_batches (
    org_id,
    location_id,
    supplier_item_id,
    preparation_id,
    qty,
    unit,
    expires_at,
    lot_code,
    source,
    created_by
  ) values (
    p_org_id,
    p_location_id,
    null,
    p_preparation_id,
    p_produced_qty,
    p_produced_unit,
    v_expires,
    null,
    'prep',
    auth.uid()
  )
  returning id into v_batch_id;

  insert into public.stock_movements (
    org_id,
    batch_id,
    delta_qty,
    reason,
    note,
    created_by
  ) values (
    p_org_id,
    v_batch_id,
    p_produced_qty,
    'prep',
    'Elaboracion',
    auth.uid()
  );

  insert into public.preparation_runs (
    org_id,
    preparation_id,
    produced_qty,
    produced_unit,
    produced_at,
    expires_at,
    location_id,
    stock_batch_id,
    labels_count,
    process_type,
    created_by
  ) values (
    p_org_id,
    p_preparation_id,
    p_produced_qty,
    p_produced_unit,
    p_produced_at,
    v_expires,
    p_location_id,
    v_batch_id,
    coalesce(p_labels_count, 1),
    v_process,
    auth.uid()
  )
  returning id into v_run_id;

  return query select v_run_id, v_batch_id, v_expires;
end;
$$;

grant execute on function public.create_preparation_run(
  uuid, uuid, uuid, numeric, text, timestamptz, public.preparation_process, int
) to authenticated;

-- List expiry alerts with type-specific rules
create or replace function public.list_expiry_alerts(
  p_org_id uuid,
  p_status public.expiry_alert_status default 'open'
)
returns table (
  id uuid,
  batch_id uuid,
  rule_id uuid,
  status public.expiry_alert_status,
  created_at timestamptz,
  sent_at timestamptz,
  days_before int,
  expires_at timestamptz,
  qty numeric,
  unit text,
  product_name text,
  location_id uuid,
  location_name text,
  hotel_id uuid,
  lot_code text,
  source public.stock_batch_source
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  with rules as (
    select id, days_before, product_type
    from public.expiry_rules
    where org_id = p_org_id
      and is_enabled = true
  ),
  batches as (
    select
      b.id,
      b.expires_at,
      b.qty,
      b.unit,
      b.lot_code,
      b.source,
      b.location_id,
      si.name as supplier_item_name,
      prep.name as preparation_name,
      coalesce(
        case
          when b.preparation_id is not null then
            case pr.process_type
              when 'frozen' then 'frozen'::public.product_type
              when 'pasteurized_frozen' then 'frozen'::public.product_type
              when 'pasteurized' then 'pasteurized'::public.product_type
              when 'vacuum' then 'pasteurized'::public.product_type
              else 'fresh'::public.product_type
            end
          else null
        end,
        si.product_type_override,
        p.product_type,
        'fresh'::public.product_type
      ) as product_type
    from public.stock_batches b
    left join public.supplier_items si on si.id = b.supplier_item_id
    left join public.products p on p.id = si.product_id
    left join public.preparations prep on prep.id = b.preparation_id
    left join public.preparation_runs pr on pr.stock_batch_id = b.id
    where b.org_id = p_org_id
      and b.expires_at is not null
      and b.qty > 0
  ),
  applied_rules as (
    select b.id as batch_id, r.id as rule_id, r.days_before
    from batches b
    join rules r on r.product_type is not distinct from b.product_type
    union all
    select b.id as batch_id, r.id as rule_id, r.days_before
    from batches b
    join rules r on r.product_type is null
    where not exists (
      select 1 from rules r2 where r2.product_type is not distinct from b.product_type
    )
  ),
  due as (
    select ar.batch_id, ar.rule_id
    from applied_rules ar
    join batches b on b.id = ar.batch_id
    where b.expires_at <= (now() + (ar.days_before || ' days')::interval)
  )
  insert into public.expiry_alerts (org_id, batch_id, rule_id, status)
  select p_org_id, d.batch_id, d.rule_id, 'open'::public.expiry_alert_status
  from due d
  on conflict (org_id, batch_id, rule_id) do nothing;

  return query
  select
    ea.id,
    ea.batch_id,
    ea.rule_id,
    ea.status,
    ea.created_at,
    ea.sent_at,
    r.days_before,
    b.expires_at,
    b.qty,
    b.unit,
    coalesce(si.name, prep.name, 'Lote') as product_name,
    loc.id as location_id,
    loc.name as location_name,
    loc.hotel_id,
    b.lot_code,
    b.source
  from public.expiry_alerts ea
  join public.expiry_rules r on r.id = ea.rule_id
  join public.stock_batches b on b.id = ea.batch_id
  left join public.supplier_items si on si.id = b.supplier_item_id
  left join public.preparations prep on prep.id = b.preparation_id
  left join public.inventory_locations loc on loc.id = b.location_id
  where ea.org_id = p_org_id
    and ea.status = p_status
  order by ea.created_at desc;
end;
$$;

grant execute on function public.list_expiry_alerts(uuid, public.expiry_alert_status) to authenticated;

-- Search indexing for inventory names
create extension if not exists pg_trgm;

create index if not exists supplier_items_name_trgm_idx
  on public.supplier_items
  using gin (name gin_trgm_ops);

create index if not exists products_name_trgm_idx
  on public.products
  using gin (name gin_trgm_ops);

create index if not exists preparations_name_trgm_idx
  on public.preparations
  using gin (name gin_trgm_ops);
