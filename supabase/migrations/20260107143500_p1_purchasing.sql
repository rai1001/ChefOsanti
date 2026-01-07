-- P1 Purchasing base: suppliers and supplier_items with RLS
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, name)
);

create index if not exists suppliers_org_id_idx on public.suppliers (org_id);

create table if not exists public.supplier_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  name text not null,
  purchase_unit text not null check (purchase_unit in ('kg', 'ud')),
  pack_size numeric null,
  rounding_rule text not null check (rounding_rule in ('ceil_pack', 'ceil_unit', 'none')),
  price_per_unit numeric null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, name),
  constraint pack_rounding_check check (
    (rounding_rule = 'ceil_pack' and pack_size is not null and pack_size > 0)
    or (rounding_rule <> 'ceil_pack')
  )
);

create index if not exists supplier_items_supplier_id_idx on public.supplier_items (supplier_id);

alter table public.suppliers enable row level security;
alter table public.supplier_items enable row level security;

-- Suppliers policies
drop policy if exists "Suppliers select by membership" on public.suppliers;
create policy "Suppliers select by membership"
  on public.suppliers
  for select
  using (public.is_org_member(org_id));

drop policy if exists "Suppliers insert by membership" on public.suppliers;
create policy "Suppliers insert by membership"
  on public.suppliers
  for insert
  with check (public.is_org_member(org_id));

drop policy if exists "Suppliers update by membership" on public.suppliers;
create policy "Suppliers update by membership"
  on public.suppliers
  for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Suppliers delete by membership" on public.suppliers;
create policy "Suppliers delete by membership"
  on public.suppliers
  for delete
  using (public.is_org_member(org_id));

-- Supplier items policies (inherit membership via supplier)
drop policy if exists "Supplier items select by membership" on public.supplier_items;
create policy "Supplier items select by membership"
  on public.supplier_items
  for select
  using (
    exists (
      select 1
      from public.suppliers s
      join public.org_memberships m on m.org_id = s.org_id
      where s.id = supplier_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Supplier items insert by membership" on public.supplier_items;
create policy "Supplier items insert by membership"
  on public.supplier_items
  for insert
  with check (
    exists (
      select 1
      from public.suppliers s
      join public.org_memberships m on m.org_id = s.org_id
      where s.id = supplier_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Supplier items update by membership" on public.supplier_items;
create policy "Supplier items update by membership"
  on public.supplier_items
  for update
  using (
    exists (
      select 1
      from public.suppliers s
      join public.org_memberships m on m.org_id = s.org_id
      where s.id = supplier_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.suppliers s
      join public.org_memberships m on m.org_id = s.org_id
      where s.id = supplier_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Supplier items delete by membership" on public.supplier_items;
create policy "Supplier items delete by membership"
  on public.supplier_items
  for delete
  using (
    exists (
      select 1
      from public.suppliers s
      join public.org_memberships m on m.org_id = s.org_id
      where s.id = supplier_id
        and m.user_id = auth.uid()
    )
  );
