-- PR-I4: Elaboraciones (preparations) y ejecuciones con lotes e impresiòn de etiqueta

do $$ begin
  if not exists (select 1 from pg_type where typname = 'storage_type') then
    create type public.storage_type as enum ('ambient', 'fridge', 'freezer');
  end if;
end $$;

create table if not exists public.preparations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  default_yield_qty numeric not null default 0,
  default_yield_unit text not null default 'kg',
  shelf_life_days int not null default 0,
  storage public.storage_type not null default 'fridge',
  allergens text null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.preparation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  preparation_id uuid not null references public.preparations (id) on delete cascade,
  produced_qty numeric not null,
  produced_unit text not null,
  produced_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz null,
  location_id uuid not null references public.inventory_locations (id) on delete cascade,
  stock_batch_id uuid null references public.stock_batches (id) on delete set null,
  labels_count int not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null
);

-- Integrar elaboraciones con lotes existentes
alter table public.stock_batches
  add column if not exists preparation_id uuid null references public.preparations (id) on delete set null;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='stock_batches' and column_name='supplier_item_id' and is_nullable='NO') then
    alter table public.stock_batches alter column supplier_item_id drop not null;
  end if;
end $$;

alter table public.stock_batches
  add constraint stock_batches_product_or_prep check (supplier_item_id is not null or preparation_id is not null);

create index if not exists preparations_org_idx on public.preparations (org_id);
create unique index if not exists preparations_org_name_uniq
  on public.preparations (org_id, lower(name));
create index if not exists preparation_runs_org_idx on public.preparation_runs (org_id);
create index if not exists preparation_runs_prep_idx on public.preparation_runs (preparation_id);
create index if not exists preparation_runs_location_idx on public.preparation_runs (location_id);

alter table public.preparations enable row level security;
alter table public.preparation_runs enable row level security;

drop policy if exists "preparations_select_member" on public.preparations;
create policy "preparations_select_member" on public.preparations
  for select using (public.is_org_member(org_id));

drop policy if exists "preparations_write_member" on public.preparations;
create policy "preparations_write_member" on public.preparations
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "prep_runs_select_member" on public.preparation_runs;
create policy "prep_runs_select_member" on public.preparation_runs
  for select using (public.is_org_member(org_id));

drop policy if exists "prep_runs_write_member" on public.preparation_runs;
create policy "prep_runs_write_member" on public.preparation_runs
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
