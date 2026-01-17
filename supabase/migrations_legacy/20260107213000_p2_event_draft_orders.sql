-- P2 draft orders por evento

create table if not exists public.menu_item_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  alias_text text not null,
  normalized text not null,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, normalized)
);

create index if not exists menu_item_aliases_org_idx on public.menu_item_aliases (org_id);
create index if not exists menu_item_aliases_supplier_idx on public.menu_item_aliases (supplier_item_id);

create or replace function public.validate_menu_item_alias()
returns trigger
language plpgsql
as $$
declare
  sup_org uuid;
begin
  select s.org_id into sup_org from public.suppliers s join public.supplier_items si on si.supplier_id = s.id where si.id = new.supplier_item_id;
  if sup_org is null then
    raise exception 'supplier item not found';
  end if;
  if sup_org <> new.org_id then
    raise exception 'org mismatch in alias';
  end if;
  return new;
end;
$$;

create table if not exists public.event_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  status text not null check (status in ('draft','sent','cancelled')),
  order_number text not null,
  total_estimated numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, order_number)
);

create index if not exists event_purchase_orders_event_idx on public.event_purchase_orders (event_id);
create index if not exists event_purchase_orders_supplier_idx on public.event_purchase_orders (supplier_id);
create index if not exists event_purchase_orders_org_idx on public.event_purchase_orders (org_id);

create table if not exists public.event_purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_purchase_order_id uuid not null references public.event_purchase_orders (id) on delete cascade,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  item_label text not null,
  qty numeric not null check (qty >= 0),
  purchase_unit text not null check (purchase_unit in ('kg','ud')),
  unit_price numeric null,
  line_total numeric not null default 0
);

create index if not exists event_po_lines_order_idx on public.event_purchase_order_lines (event_purchase_order_id);
create index if not exists event_po_lines_org_idx on public.event_purchase_order_lines (org_id);

-- Triggers coherencia y totales
create or replace function public.validate_event_purchase_order()
returns trigger
language plpgsql
as $$
declare
  ev_org uuid;
  sup_org uuid;
  hotel_org uuid;
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
  return new;
end;
$$;

create or replace function public.validate_event_po_line()
returns trigger
language plpgsql
as $$
declare
  po_org uuid;
  sup_org uuid;
begin
  select org_id into po_org from public.event_purchase_orders where id = new.event_purchase_order_id;
  select org_id into sup_org from public.suppliers s join public.supplier_items si on si.supplier_id = s.id where si.id = new.supplier_item_id;
  if po_org is null or sup_org is null then
    raise exception 'order or supplier item missing';
  end if;
  if po_org <> new.org_id or sup_org <> new.org_id then
    raise exception 'org mismatch in order lines';
  end if;
  if new.unit_price is null then
    new.line_total := 0;
  else
    new.line_total := coalesce(new.qty,0) * new.unit_price;
  end if;
  return new;
end;
$$;

create or replace function public.recalc_event_po_total()
returns trigger
language plpgsql
as $$
begin
  update public.event_purchase_orders po
    set total_estimated = coalesce(sub.total,0)
  from (
    select event_purchase_order_id, sum(line_total) as total
    from public.event_purchase_order_lines
    where event_purchase_order_id = coalesce(new.event_purchase_order_id, old.event_purchase_order_id)
    group by event_purchase_order_id
  ) sub
  where po.id = sub.event_purchase_order_id;
  return new;
end;
$$;

create trigger event_purchase_orders_validate
before insert or update on public.event_purchase_orders
for each row execute function public.validate_event_purchase_order();

create trigger menu_item_aliases_validate
before insert or update on public.menu_item_aliases
for each row execute function public.validate_menu_item_alias();

create trigger event_purchase_order_lines_validate
before insert or update on public.event_purchase_order_lines
for each row execute function public.validate_event_po_line();

create trigger event_purchase_order_lines_total
after insert or update or delete on public.event_purchase_order_lines
for each row execute function public.recalc_event_po_total();

-- RLS
alter table public.menu_item_aliases enable row level security;
alter table public.event_purchase_orders enable row level security;
alter table public.event_purchase_order_lines enable row level security;

drop policy if exists "Aliases by membership" on public.menu_item_aliases;
create policy "Aliases by membership"
  on public.menu_item_aliases
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Event orders by membership" on public.event_purchase_orders;
create policy "Event orders by membership"
  on public.event_purchase_orders
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Event order lines by membership" on public.event_purchase_order_lines;
create policy "Event order lines by membership"
  on public.event_purchase_order_lines
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
