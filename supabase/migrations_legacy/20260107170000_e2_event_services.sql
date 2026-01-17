-- E2: Servicios por evento

create table if not exists public.event_services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  service_type text not null check (service_type in ('desayuno','coffee_break','comida','merienda','cena','coctel','otros')),
  format text not null check (format in ('sentado','de_pie')),
  starts_at timestamptz not null,
  ends_at timestamptz null,
  pax int not null check (pax >= 0),
  notes text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_services_event_idx on public.event_services (event_id);
create index if not exists event_services_org_idx on public.event_services (org_id);
create index if not exists event_services_starts_idx on public.event_services (starts_at);

alter table public.event_services enable row level security;

-- Policies
drop policy if exists "Event services by membership" on public.event_services;
create policy "Event services by membership"
  on public.event_services
  for all
  using (
    public.is_org_member(org_id) and exists (
      select 1 from public.events e
      join public.org_memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(org_id) and exists (
      select 1 from public.events e
      join public.org_memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid()
    )
  );

-- Validation trigger: org consistency and ends_at > starts_at
create or replace function public.validate_event_service()
returns trigger
language plpgsql
as $$
declare
  ev_org uuid;
begin
  select org_id into ev_org from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if new.org_id <> ev_org then
    raise exception 'event service org mismatch';
  end if;
  if new.ends_at is not null and new.ends_at <= new.starts_at then
    raise exception 'service end must be after start';
  end if;
  return new;
end;
$$;

create trigger event_services_validate
before insert or update on public.event_services
for each row execute function public.validate_event_service();
