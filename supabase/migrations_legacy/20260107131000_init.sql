-- Base schema A0: orgs, org_memberships, hotels with RLS
create extension if not exists "pgcrypto";

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, user_id)
);

create index if not exists org_memberships_user_idx on public.org_memberships (user_id);

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  city text,
  country text,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default timezone('utc', now())
);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.orgs to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.hotels to authenticated;

-- Helpers
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

-- RLS
alter table public.orgs enable row level security;
alter table public.org_memberships enable row level security;
alter table public.hotels enable row level security;

drop policy if exists "Members can select orgs" on public.orgs;
create policy "Members can select orgs" on public.orgs
for select using (public.is_org_member(id));

-- org_memberships policies
drop policy if exists "Self can see own memberships" on public.org_memberships;
create policy "Self can see own memberships" on public.org_memberships
for select using (auth.uid() = user_id);

-- hotels policies
drop policy if exists "Members can select hotels" on public.hotels;
create policy "Members can select hotels" on public.hotels
for select using (public.is_org_member(org_id));

-- service-role bypass stays implicit via role privileges; no public grants needed.
