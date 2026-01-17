-- E1: Salones (spaces), eventos y reservas

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  capacity int null check (capacity >= 0),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (hotel_id, name)
);

create index if not exists spaces_hotel_idx on public.spaces (hotel_id);
create index if not exists spaces_org_idx on public.spaces (org_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  client_name text null,
  status text not null check (status in ('draft','confirmed','in_production','closed','cancelled')),
  starts_at timestamptz null,
  ends_at timestamptz null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_hotel_idx on public.events (hotel_id);
create index if not exists events_org_idx on public.events (org_id);

create table if not exists public.space_bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  group_label text null,
  note text null,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index if not exists space_bookings_space_idx on public.space_bookings (space_id, starts_at);
create index if not exists space_bookings_event_idx on public.space_bookings (event_id);
create index if not exists space_bookings_org_idx on public.space_bookings (org_id);

-- RLS enable
alter table public.spaces enable row level security;
alter table public.events enable row level security;
alter table public.space_bookings enable row level security;

-- Policies by org membership
drop policy if exists "Spaces by membership" on public.spaces;
create policy "Spaces by membership"
  on public.spaces
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Events by membership" on public.events;
create policy "Events by membership"
  on public.events
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Bookings by membership" on public.space_bookings;
create policy "Bookings by membership"
  on public.space_bookings
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Validation helpers
create or replace function public.validate_space_org_consistency()
returns trigger
language plpgsql
as $$
declare
  hotel_org uuid;
begin
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'space org mismatch with hotel';
  end if;
  return new;
end;
$$;

create or replace function public.validate_event_org_consistency()
returns trigger
language plpgsql
as $$
declare
  hotel_org uuid;
begin
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'event org mismatch with hotel';
  end if;
  return new;
end;
$$;

create or replace function public.validate_booking_consistency()
returns trigger
language plpgsql
as $$
declare
  ev_org uuid;
  ev_hotel uuid;
  space_org uuid;
  space_hotel uuid;
begin
  select org_id, hotel_id into ev_org, ev_hotel from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if new.org_id <> ev_org then
    raise exception 'booking org mismatch with event';
  end if;

  select org_id, hotel_id into space_org, space_hotel from public.spaces where id = new.space_id;
  if space_org is null then
    raise exception 'space not found';
  end if;
  if space_org <> ev_org then
    raise exception 'booking space org mismatch';
  end if;
  if space_hotel <> ev_hotel then
    raise exception 'booking must use space from same hotel as event';
  end if;

  return new;
end;
$$;

create trigger spaces_validate
before insert or update on public.spaces
for each row execute function public.validate_space_org_consistency();

create trigger events_validate
before insert or update on public.events
for each row execute function public.validate_event_org_consistency();

create trigger space_bookings_validate
before insert or update on public.space_bookings
for each row execute function public.validate_booking_consistency();

-- Overlaps helper
create or replace function public.space_booking_overlaps(
  p_space_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_booking_id uuid default null
) returns boolean
language sql
as $$
  select exists (
    select 1 from public.space_bookings b
    where b.space_id = p_space_id
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and not (b.ends_at <= p_starts_at or b.starts_at >= p_ends_at)
  );
$$;
