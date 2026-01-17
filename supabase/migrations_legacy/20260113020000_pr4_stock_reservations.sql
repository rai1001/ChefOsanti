-- PR4: Reservas de stock por evento/servicio

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum ('active', 'released');
  end if;
  if not exists (select 1 from pg_type where typname = 'reservation_source') then
    create type public.reservation_source as enum ('gross_need', 'net_need', 'manual');
  end if;
end $$;

-- Tabla principal de reservas
create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid null references public.hotels (id) on delete set null,
  location_id uuid null references public.inventory_locations (id) on delete set null,
  event_id uuid not null references public.events (id) on delete cascade,
  event_service_id uuid null references public.event_services (id) on delete cascade,
  status public.reservation_status not null default 'active',
  reserved_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz null,
  created_by uuid null
);

create index if not exists stock_reservations_org_idx on public.stock_reservations (org_id);
create index if not exists stock_reservations_hotel_idx on public.stock_reservations (hotel_id);
create index if not exists stock_reservations_location_idx on public.stock_reservations (location_id);
create index if not exists stock_reservations_service_idx on public.stock_reservations (event_service_id);
create index if not exists stock_reservations_status_idx on public.stock_reservations (status);
create unique index if not exists stock_reservations_active_uniq
  on public.stock_reservations (event_id, event_service_id, status)
  where status = 'active';

-- Líneas de reserva
create table if not exists public.stock_reservation_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  reservation_id uuid not null references public.stock_reservations (id) on delete cascade,
  supplier_item_id uuid not null references public.supplier_items (id) on delete restrict,
  qty numeric not null check (qty >= 0),
  unit text not null check (unit in ('kg','ud')),
  source public.reservation_source not null default 'gross_need',
  note text null
);

create index if not exists stock_reservation_lines_res_idx on public.stock_reservation_lines (reservation_id);
create index if not exists stock_reservation_lines_org_idx on public.stock_reservation_lines (org_id);
create index if not exists stock_reservation_lines_item_idx on public.stock_reservation_lines (supplier_item_id);

-- Consistencia org/hotel
create or replace function public.validate_stock_reservation()
returns trigger
language plpgsql
as $$
declare
  ev_org uuid;
  ev_hotel uuid;
begin
  select org_id, hotel_id into ev_org, ev_hotel from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if new.org_id <> ev_org then
    raise exception 'org mismatch for reservation';
  end if;
  if new.hotel_id is null then
    new.hotel_id := ev_hotel;
  end if;
  return new;
end;
$$;

create trigger stock_reservations_validate
before insert or update on public.stock_reservations
for each row execute function public.validate_stock_reservation();

-- RLS
alter table public.stock_reservations enable row level security;
alter table public.stock_reservation_lines enable row level security;

drop policy if exists "stock_res_select_member" on public.stock_reservations;
create policy "stock_res_select_member" on public.stock_reservations
  for select using (public.is_org_member(org_id));

drop policy if exists "stock_res_write_member" on public.stock_reservations;
create policy "stock_res_write_member" on public.stock_reservations
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "stock_res_lines_select_member" on public.stock_reservation_lines;
create policy "stock_res_lines_select_member" on public.stock_reservation_lines
  for select using (public.is_org_member(org_id));

drop policy if exists "stock_res_lines_write_member" on public.stock_reservation_lines;
create policy "stock_res_lines_write_member" on public.stock_reservation_lines
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Flag consider_reservations en settings
alter table public.purchasing_settings
  add column if not exists consider_reservations boolean not null default true;

-- RPC: reservas activas por ventana
create or replace function public.reserved_qty_by_window(
  p_org_id uuid,
  p_hotel_id uuid,
  p_item_ids uuid[],
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_exclude_event_id uuid default null
) returns table (supplier_item_id uuid, reserved_qty numeric)
language sql
security definer
as $$
  with windows as (
    select
      sr.id,
      srl.supplier_item_id,
      srl.qty,
      es.starts_at,
      coalesce(es.ends_at, es.starts_at + interval '2 hours') as ends_at
    from public.stock_reservations sr
    join public.stock_reservation_lines srl on srl.reservation_id = sr.id
    join public.event_services es on es.id = sr.event_service_id or es.event_id = sr.event_id
    where sr.org_id = p_org_id
      and sr.hotel_id = p_hotel_id
      and sr.status = 'active'
      and srl.supplier_item_id = any(p_item_ids)
      and (p_exclude_event_id is null or sr.event_id <> p_exclude_event_id)
  )
  select supplier_item_id, sum(qty) as reserved_qty
  from windows
  where tstzrange(windows.starts_at, windows.ends_at, '[)') && tstzrange(p_window_start, p_window_end, '[)')
  group by supplier_item_id;
$$;
