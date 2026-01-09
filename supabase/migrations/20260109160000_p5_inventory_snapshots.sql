-- Phase 1/5: Inventory Forecasting Base
-- Table for historical stock snapshots

create table if not exists public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  stock_level numeric not null,
  captured_at timestamptz not null default now()
);

create index if not exists inventory_snapshots_org_idx on public.inventory_snapshots(org_id);
create index if not exists inventory_snapshots_hotel_idx on public.inventory_snapshots(hotel_id);
create index if not exists inventory_snapshots_ingredient_idx on public.inventory_snapshots(ingredient_id);
create index if not exists inventory_snapshots_captured_idx on public.inventory_snapshots(captured_at);

-- Table for forecast results
create table if not exists public.forecast_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  forecast_date date not null,
  expected_consumption numeric not null,
  confidence_score numeric null,
  run_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists forecast_runs_org_idx on public.forecast_runs(org_id);
create index if not exists forecast_runs_hotel_idx on public.forecast_runs(hotel_id);
create index if not exists forecast_runs_ingredient_idx on public.forecast_runs(ingredient_id);
create index if not exists forecast_runs_date_idx on public.forecast_runs(forecast_date);

-- RLS
alter table public.inventory_snapshots enable row level security;
alter table public.forecast_runs enable row level security;

-- Policies for inventory_snapshots
create policy "Snapshots select member" on public.inventory_snapshots
  for select using (public.is_org_member(org_id));

create policy "Snapshots insert member" on public.inventory_snapshots
  for insert with check (public.is_org_member(org_id));

create policy "Snapshots delete member" on public.inventory_snapshots
  for delete using (public.is_org_member(org_id));

-- Policies for forecast_runs
create policy "Forecasts select member" on public.forecast_runs
  for select using (public.is_org_member(org_id));

create policy "Forecasts insert member" on public.forecast_runs
  for insert with check (public.is_org_member(org_id));
