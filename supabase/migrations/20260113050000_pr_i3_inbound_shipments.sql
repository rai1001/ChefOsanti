-- PR-I3: Inbound shipments (albaranes) con OCR asistido

do $$ begin
  if not exists (select 1 from pg_type where typname = 'inbound_source') then
    create type public.inbound_source as enum ('ocr', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'inbound_line_status') then
    create type public.inbound_line_status as enum ('ready', 'blocked', 'skipped');
  end if;
end $$;

create table if not exists public.inbound_shipments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  location_id uuid not null references public.inventory_locations (id) on delete cascade,
  supplier_id uuid null references public.suppliers (id) on delete set null,
  supplier_name text null,
  delivery_note_number text null,
  delivered_at date null,
  source public.inbound_source not null default 'manual',
  raw_ocr_text text null,
  file_url text null,
  dedupe_key text null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null
);

create table if not exists public.inbound_shipment_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  shipment_id uuid not null references public.inbound_shipments (id) on delete cascade,
  supplier_item_id uuid null references public.supplier_items (id) on delete set null,
  description text not null,
  qty numeric not null check (qty >= 0),
  unit text not null,
  expires_at timestamptz null,
  lot_code text null,
  status public.inbound_line_status not null default 'ready',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inbound_shipments_org_idx on public.inbound_shipments (org_id);
create index if not exists inbound_shipments_location_idx on public.inbound_shipments (location_id);
create index if not exists inbound_shipments_dedupe_idx on public.inbound_shipments (org_id, dedupe_key);
create unique index if not exists inbound_shipments_org_dedupe_uniq
  on public.inbound_shipments (
    org_id,
    (coalesce(supplier_name, '')),
    (coalesce(delivery_note_number, '')),
    (coalesce(delivered_at, date '0001-01-01'))
  );

create index if not exists inbound_lines_org_idx on public.inbound_shipment_lines (org_id);
create index if not exists inbound_lines_shipment_idx on public.inbound_shipment_lines (shipment_id);
create index if not exists inbound_lines_item_idx on public.inbound_shipment_lines (supplier_item_id);

alter table public.inbound_shipments enable row level security;
alter table public.inbound_shipment_lines enable row level security;

drop policy if exists "inbound_shipments_select_member" on public.inbound_shipments;
create policy "inbound_shipments_select_member" on public.inbound_shipments
  for select using (public.is_org_member(org_id));

drop policy if exists "inbound_shipments_write_member" on public.inbound_shipments;
create policy "inbound_shipments_write_member" on public.inbound_shipments
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "inbound_lines_select_member" on public.inbound_shipment_lines;
create policy "inbound_lines_select_member" on public.inbound_shipment_lines
  for select using (public.is_org_member(org_id));

drop policy if exists "inbound_lines_write_member" on public.inbound_shipment_lines;
create policy "inbound_lines_write_member" on public.inbound_shipment_lines
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
