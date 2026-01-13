-- PR-I2: Mapeo barcode -> supplier_item

create table if not exists public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  barcode text not null,
  symbology text null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null,
  unique (org_id, barcode)
);

create index if not exists product_barcodes_org_idx on public.product_barcodes (org_id);
create index if not exists product_barcodes_item_idx on public.product_barcodes (supplier_item_id);

alter table public.product_barcodes enable row level security;

drop policy if exists "product_barcodes_select_member" on public.product_barcodes;
create policy "product_barcodes_select_member" on public.product_barcodes
  for select using (public.is_org_member(org_id));

drop policy if exists "product_barcodes_write_member" on public.product_barcodes;
create policy "product_barcodes_write_member" on public.product_barcodes
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
