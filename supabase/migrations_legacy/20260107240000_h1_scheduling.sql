-- H1 horarios/turnos

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  shift_date date not null,
  shift_type text not null check (shift_type in ('desayuno','bar_tarde','eventos','produccion','libre')),
  starts_at time not null,
  ends_at time not null,
  required_count int not null default 1 check (required_count >= 0),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at),
  unique (hotel_id, shift_date, shift_type)
);

create index if not exists shifts_org_idx on public.shifts (org_id);
create index if not exists shifts_hotel_date_idx on public.shifts (hotel_id, shift_date);

create or replace function public.validate_shift_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hotel_org uuid;
begin
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found for shift';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'org mismatch between shift and hotel';
  end if;
  return new;
end;
$$;

drop trigger if exists shifts_validate_org on public.shifts;
create trigger shifts_validate_org
before insert or update on public.shifts
for each row execute function public.validate_shift_org();

alter table public.shifts enable row level security;

drop policy if exists "Shifts by membership" on public.shifts;
create policy "Shifts by membership"
  on public.shifts
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Asignaciones
create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (shift_id, staff_member_id)
);

create index if not exists staff_assignments_org_idx on public.staff_assignments (org_id);
create index if not exists staff_assignments_shift_idx on public.staff_assignments (shift_id);

create or replace function public.validate_staff_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_rec record;
  staff_org uuid;
  exists_same_day uuid;
begin
  select org_id, hotel_id, shift_date into shift_rec from public.shifts where id = coalesce(new.shift_id, old.shift_id);
  if shift_rec is null then
    raise exception 'shift not found';
  end if;
  if shift_rec.org_id <> new.org_id then
    raise exception 'org mismatch between assignment and shift';
  end if;
  select org_id into staff_org from public.staff_members where id = new.staff_member_id;
  if staff_org is null then
    raise exception 'staff not found';
  end if;
  if staff_org <> new.org_id then
    raise exception 'org mismatch between assignment and staff';
  end if;

  select sa.id
  into exists_same_day
  from public.staff_assignments sa
  join public.shifts s on s.id = sa.shift_id
  where sa.staff_member_id = new.staff_member_id
    and s.hotel_id = shift_rec.hotel_id
    and s.shift_date = shift_rec.shift_date
    and sa.id <> coalesce(new.id, old.id)
  limit 1;

  if exists_same_day is not null then
    raise exception 'staff already assigned that day';
  end if;

  return new;
end;
$$;

drop trigger if exists staff_assignments_validate on public.staff_assignments;
create trigger staff_assignments_validate
before insert or update on public.staff_assignments
for each row execute function public.validate_staff_assignment();

alter table public.staff_assignments enable row level security;

drop policy if exists "Assignments by membership" on public.staff_assignments;
create policy "Assignments by membership"
  on public.staff_assignments
  for all
  using (
    public.is_org_member(org_id)
    and exists (select 1 from public.shifts s where s.id = shift_id and s.org_id = org_id)
  )
  with check (
    public.is_org_member(org_id)
    and exists (select 1 from public.shifts s where s.id = shift_id and s.org_id = org_id)
  );
