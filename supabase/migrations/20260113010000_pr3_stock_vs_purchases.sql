-- PR3: Stock vs Compras - neteo con stock y pedidos abiertos

-- 1) Localizaciones de inventario
create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid null references public.hotels (id) on delete set null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, coalesce(hotel_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
);

create index if not exists inventory_locations_org_idx on public.inventory_locations (org_id);
create index if not exists inventory_locations_hotel_idx on public.inventory_locations (hotel_id);

-- 2) Niveles de stock por supplier_item y localizacion
create table if not exists public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  location_id uuid not null references public.inventory_locations (id) on delete cascade,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  on_hand_qty numeric not null default 0 check (on_hand_qty >= 0),
  unit text not null check (unit in ('kg','ud')),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (location_id, supplier_item_id)
);

create index if not exists stock_levels_org_idx on public.stock_levels (org_id);
create index if not exists stock_levels_location_idx on public.stock_levels (location_id);
create index if not exists stock_levels_item_idx on public.stock_levels (supplier_item_id);

-- 3) Configuracion de buffer por org
create table if not exists public.purchasing_settings (
  org_id uuid primary key references public.orgs (id) on delete cascade,
  default_buffer_percent numeric not null default 0,
  default_buffer_qty numeric not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

-- 4) Enriquecer lineas de borrador de evento
alter table public.event_purchase_order_lines
  add column if not exists freeze boolean not null default false,
  add column if not exists buffer_percent numeric not null default 0,
  add column if not exists buffer_qty numeric not null default 0,
  add column if not exists gross_qty numeric not null default 0,
  add column if not exists on_hand_qty numeric not null default 0,
  add column if not exists on_order_qty numeric not null default 0,
  add column if not exists net_qty numeric not null default 0,
  add column if not exists rounded_qty numeric not null default 0,
  add column if not exists unit_mismatch boolean not null default false;

-- 5) RLS
alter table public.inventory_locations enable row level security;
alter table public.stock_levels enable row level security;
alter table public.purchasing_settings enable row level security;

-- inventory_locations
drop policy if exists "inv_loc_select_members" on public.inventory_locations;
create policy "inv_loc_select_members"
  on public.inventory_locations
  for select using (public.is_org_member(org_id));

drop policy if exists "inv_loc_write_members" on public.inventory_locations;
create policy "inv_loc_write_members"
  on public.inventory_locations
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- stock_levels
drop policy if exists "stock_levels_select_members" on public.stock_levels;
create policy "stock_levels_select_members"
  on public.stock_levels
  for select using (public.is_org_member(org_id));

drop policy if exists "stock_levels_write_members" on public.stock_levels;
create policy "stock_levels_write_members"
  on public.stock_levels
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- purchasing_settings
drop policy if exists "purchasing_settings_select" on public.purchasing_settings;
create policy "purchasing_settings_select"
  on public.purchasing_settings
  for select using (public.is_org_member(org_id));

drop policy if exists "purchasing_settings_write" on public.purchasing_settings;
create policy "purchasing_settings_write"
  on public.purchasing_settings
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
