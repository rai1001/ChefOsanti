-- S1 staff members

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  home_hotel_id uuid null references public.hotels(id) on delete set null,
  full_name text not null,
  role text not null check (role in ('jefe_cocina','cocinero','ayudante','pasteleria','office','otros')),
  employment_type text not null check (employment_type in ('fijo','eventual','extra')),
  phone text null,
  email text null,
  notes text null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, full_name)
);

create index if not exists staff_members_org_idx on public.staff_members (org_id);
create index if not exists staff_members_home_hotel_idx on public.staff_members (home_hotel_id);
create index if not exists staff_members_active_idx on public.staff_members (active);
create unique index if not exists staff_members_org_email_uidx
  on public.staff_members (org_id, email)
  where email is not null;

create or replace function public.validate_staff_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hotel_org uuid;
begin
  if new.home_hotel_id is null then
    return new;
  end if;
  select org_id into hotel_org from public.hotels where id = new.home_hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found for staff';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'org mismatch between staff and hotel';
  end if;
  return new;
end;
$$;

drop trigger if exists staff_members_validate on public.staff_members;
create trigger staff_members_validate
before insert or update on public.staff_members
for each row execute function public.validate_staff_member();

alter table public.staff_members enable row level security;

drop policy if exists "Staff by membership" on public.staff_members;
create policy "Staff by membership"
  on public.staff_members
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
