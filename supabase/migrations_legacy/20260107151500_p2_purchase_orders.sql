-- P2: Purchase orders, ingredients (stock), receiving RPC

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  base_unit text not null check (base_unit in ('kg', 'ud')),
  stock numeric not null default 0,
  par_level numeric null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (hotel_id, name)
);

create index if not exists ingredients_hotel_idx on public.ingredients (hotel_id);
create index if not exists ingredients_org_idx on public.ingredients (org_id);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete restrict,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  status text not null check (status in ('draft', 'confirmed', 'received', 'cancelled')),
  order_number text not null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz null,
  received_at timestamptz null,
  total_estimated numeric not null default 0,
  unique (org_id, order_number)
);

create index if not exists purchase_orders_org_idx on public.purchase_orders (org_id);
create index if not exists purchase_orders_hotel_idx on public.purchase_orders (hotel_id);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id);
create index if not exists purchase_orders_status_idx on public.purchase_orders (status);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  requested_qty numeric not null check (requested_qty >= 0),
  received_qty numeric not null default 0 check (received_qty >= 0),
  purchase_unit text not null check (purchase_unit in ('kg', 'ud')),
  rounding_rule text not null check (rounding_rule in ('ceil_pack', 'ceil_unit', 'none')),
  pack_size numeric null,
  unit_price numeric null,
  line_total numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (purchase_order_id, supplier_item_id)
);

create index if not exists purchase_order_lines_po_idx on public.purchase_order_lines (purchase_order_id);
create index if not exists purchase_order_lines_org_idx on public.purchase_order_lines (org_id);

-- RLS
alter table public.ingredients enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;

-- Ingredients policies
drop policy if exists "Ingredients select by membership" on public.ingredients;
create policy "Ingredients select by membership"
  on public.ingredients
  for select
  using (public.is_org_member(org_id));

drop policy if exists "Ingredients write by membership" on public.ingredients;
create policy "Ingredients write by membership"
  on public.ingredients
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Purchase orders policies
drop policy if exists "PO select by membership" on public.purchase_orders;
create policy "PO select by membership"
  on public.purchase_orders
  for select
  using (public.is_org_member(org_id));

drop policy if exists "PO insert by membership" on public.purchase_orders;
create policy "PO insert by membership"
  on public.purchase_orders
  for insert
  with check (public.is_org_member(org_id));

drop policy if exists "PO update by membership" on public.purchase_orders;
create policy "PO update by membership"
  on public.purchase_orders
  for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "PO delete by membership" on public.purchase_orders;
create policy "PO delete by membership"
  on public.purchase_orders
  for delete
  using (public.is_org_member(org_id));

-- Purchase order lines policies (inherit org via PO)
drop policy if exists "POL select by membership" on public.purchase_order_lines;
create policy "POL select by membership"
  on public.purchase_order_lines
  for select
  using (
    exists (
      select 1 from public.purchase_orders po
      join public.org_memberships m on m.org_id = po.org_id
      where po.id = purchase_order_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "POL insert by membership" on public.purchase_order_lines;
create policy "POL insert by membership"
  on public.purchase_order_lines
  for insert
  with check (
    exists (
      select 1 from public.purchase_orders po
      join public.org_memberships m on m.org_id = po.org_id
      where po.id = purchase_order_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "POL update by membership" on public.purchase_order_lines;
create policy "POL update by membership"
  on public.purchase_order_lines
  for update
  using (
    exists (
      select 1 from public.purchase_orders po
      join public.org_memberships m on m.org_id = po.org_id
      where po.id = purchase_order_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.purchase_orders po
      join public.org_memberships m on m.org_id = po.org_id
      where po.id = purchase_order_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "POL delete by membership" on public.purchase_order_lines;
create policy "POL delete by membership"
  on public.purchase_order_lines
  for delete
  using (
    exists (
      select 1 from public.purchase_orders po
      join public.org_memberships m on m.org_id = po.org_id
      where po.id = purchase_order_id and m.user_id = auth.uid()
    )
  );

-- Validation and totals
create or replace function public.validate_po_org_consistency()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.hotels h where h.id = new.hotel_id and h.org_id = new.org_id) then
    raise exception 'hotel/org mismatch';
  end if;
  if not exists (select 1 from public.suppliers s where s.id = new.supplier_id and s.org_id = new.org_id) then
    raise exception 'supplier/org mismatch';
  end if;
  return new;
end;
$$;

create or replace function public.validate_pol_consistency()
returns trigger
language plpgsql
as $$
declare
  po_org uuid;
  po_hotel uuid;
  ing_org uuid;
  ing_hotel uuid;
begin
  select org_id, hotel_id into po_org, po_hotel from public.purchase_orders where id = new.purchase_order_id;
  if po_org is null then
    raise exception 'purchase order missing';
  end if;
  if new.org_id <> po_org then
    raise exception 'line org mismatch with PO';
  end if;
  select org_id, hotel_id into ing_org, ing_hotel from public.ingredients where id = new.ingredient_id;
  if ing_org is null then
    raise exception 'ingredient missing';
  end if;
  if ing_org <> po_org then
    raise exception 'ingredient org mismatch';
  end if;
  if ing_hotel <> po_hotel then
    raise exception 'ingredient hotel must match PO hotel';
  end if;
  return new;
end;
$$;

create or replace function public.update_line_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := coalesce(new.requested_qty, 0) * coalesce(new.unit_price, 0);
  return new;
end;
$$;

create or replace function public.refresh_po_total()
returns trigger
language plpgsql
as $$
declare
  po_id uuid;
begin
  po_id := coalesce(new.purchase_order_id, old.purchase_order_id);
  update public.purchase_orders
  set total_estimated = coalesce((
    select sum(line_total) from public.purchase_order_lines where purchase_order_id = po_id
  ), 0)
  where id = po_id;
  return null;
end;
$$;

create trigger purchase_orders_validate
before insert or update on public.purchase_orders
for each row execute function public.validate_po_org_consistency();

create trigger purchase_order_lines_validate
before insert or update on public.purchase_order_lines
for each row execute function public.validate_pol_consistency();

create trigger purchase_order_lines_total
before insert or update on public.purchase_order_lines
for each row execute function public.update_line_total();

create trigger purchase_order_lines_total_refresh
after insert or update or delete on public.purchase_order_lines
for each row execute procedure public.refresh_po_total();

-- RPC to receive order and update stock atomically
create or replace function public.receive_purchase_order(p_order_id uuid, p_lines jsonb)
returns void
language plpgsql
as $$
declare
  po_org uuid;
  po_status text;
  line record;
begin
  select org_id, status into po_org, po_status from public.purchase_orders where id = p_order_id;
  if po_org is null then
    raise exception 'purchase order not found';
  end if;
  if po_status <> 'confirmed' then
    raise exception 'purchase order must be confirmed to receive';
  end if;

  for line in select * from jsonb_to_recordset(p_lines) as (line_id uuid, received_qty numeric) loop
    update public.purchase_order_lines
    set received_qty = line.received_qty
    where id = line.line_id
      and purchase_order_id = p_order_id
      and org_id = po_org;
  end loop;

  -- update stock
  update public.ingredients ing
  set stock = stock + sub.received_qty
  from (
    select pol.ingredient_id, pol.received_qty
    from public.purchase_order_lines pol
    where pol.purchase_order_id = p_order_id
      and pol.org_id = po_org
  ) sub
  where ing.id = sub.ingredient_id;

  update public.purchase_orders
  set status = 'received',
      received_at = timezone('utc', now())
  where id = p_order_id;
end;
$$;
