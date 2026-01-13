-- PR-I1: Stock batches y movimientos con caducidades (FEFO)

-- Tipos enumerados
do $$ begin
  if not exists (select 1 from pg_type where typname = 'stock_batch_source') then
    create type public.stock_batch_source as enum ('purchase', 'prep', 'adjustment');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_movement_reason') then
    create type public.stock_movement_reason as enum ('purchase', 'adjustment', 'consume');
  end if;
end $$;

-- Tablas
create table if not exists public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  location_id uuid not null references public.inventory_locations (id) on delete cascade,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  qty numeric not null check (qty >= 0),
  unit text not null check (unit in ('kg', 'ud')),
  expires_at timestamptz null,
  lot_code text null,
  source public.stock_batch_source not null default 'purchase',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  batch_id uuid not null references public.stock_batches (id) on delete cascade,
  delta_qty numeric not null,
  reason public.stock_movement_reason not null default 'adjustment',
  note text null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null
);

-- Índices
create index if not exists stock_batches_org_location_idx on public.stock_batches (org_id, location_id);
create index if not exists stock_batches_org_item_idx on public.stock_batches (org_id, supplier_item_id);
create index if not exists stock_batches_org_expiry_idx on public.stock_batches (org_id, expires_at);

create index if not exists stock_movements_org_idx on public.stock_movements (org_id);
create index if not exists stock_movements_batch_idx on public.stock_movements (batch_id);
create index if not exists stock_movements_created_idx on public.stock_movements (created_at);

-- RLS
alter table public.stock_batches enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "stock_batches_select_member" on public.stock_batches;
create policy "stock_batches_select_member" on public.stock_batches
  for select using (public.is_org_member(org_id));

drop policy if exists "stock_batches_write_member" on public.stock_batches;
create policy "stock_batches_write_member" on public.stock_batches
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "stock_movements_select_member" on public.stock_movements;
create policy "stock_movements_select_member" on public.stock_movements
  for select using (public.is_org_member(org_id));

drop policy if exists "stock_movements_write_member" on public.stock_movements;
create policy "stock_movements_write_member" on public.stock_movements
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
