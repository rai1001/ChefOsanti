-- E4: Overrides por servicio

create table if not exists public.event_service_excluded_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  template_item_id uuid not null references public.menu_template_items (id) on delete restrict,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_service_id, template_item_id)
);

create index if not exists event_service_excluded_items_service_idx on public.event_service_excluded_items (event_service_id);
create index if not exists event_service_excluded_items_org_idx on public.event_service_excluded_items (org_id);

create table if not exists public.event_service_added_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  section text null,
  name text not null,
  unit text not null check (unit in ('ud','kg')),
  qty_per_pax_seated numeric not null default 0 check (qty_per_pax_seated >= 0),
  qty_per_pax_standing numeric not null default 0 check (qty_per_pax_standing >= 0),
  rounding_rule text not null check (rounding_rule in ('ceil_unit','ceil_pack','none')),
  pack_size numeric null,
  notes text null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_service_added_items_service_idx on public.event_service_added_items (event_service_id);
create index if not exists event_service_added_items_org_idx on public.event_service_added_items (org_id);

create table if not exists public.event_service_replaced_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  template_item_id uuid not null references public.menu_template_items (id) on delete restrict,
  section text null,
  name text not null,
  unit text not null check (unit in ('ud','kg')),
  qty_per_pax_seated numeric not null default 0 check (qty_per_pax_seated >= 0),
  qty_per_pax_standing numeric not null default 0 check (qty_per_pax_standing >= 0),
  rounding_rule text not null check (rounding_rule in ('ceil_unit','ceil_pack','none')),
  pack_size numeric null,
  notes text null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_service_id, template_item_id)
);

create index if not exists event_service_replaced_items_service_idx on public.event_service_replaced_items (event_service_id);
create index if not exists event_service_replaced_items_org_idx on public.event_service_replaced_items (org_id);

create table if not exists public.event_service_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  note text not null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_service_notes_service_idx on public.event_service_notes (event_service_id);
create index if not exists event_service_notes_org_idx on public.event_service_notes (org_id);

-- RLS
alter table public.event_service_excluded_items enable row level security;
alter table public.event_service_added_items enable row level security;
alter table public.event_service_replaced_items enable row level security;
alter table public.event_service_notes enable row level security;

create or replace function public.is_event_service_member(p_org uuid, p_service uuid)
returns boolean
language sql
as $$
  select public.is_org_member(p_org) and exists (
    select 1 from public.event_services es where es.id = p_service and es.org_id = p_org
  );
$$;

drop policy if exists "Excluded by membership" on public.event_service_excluded_items;
create policy "Excluded by membership"
  on public.event_service_excluded_items
  for all
  using (public.is_event_service_member(org_id, event_service_id))
  with check (public.is_event_service_member(org_id, event_service_id));

drop policy if exists "Added by membership" on public.event_service_added_items;
create policy "Added by membership"
  on public.event_service_added_items
  for all
  using (public.is_event_service_member(org_id, event_service_id))
  with check (public.is_event_service_member(org_id, event_service_id));

drop policy if exists "Replaced by membership" on public.event_service_replaced_items;
create policy "Replaced by membership"
  on public.event_service_replaced_items
  for all
  using (public.is_event_service_member(org_id, event_service_id))
  with check (public.is_event_service_member(org_id, event_service_id));

drop policy if exists "Notes by membership" on public.event_service_notes;
create policy "Notes by membership"
  on public.event_service_notes
  for all
  using (public.is_event_service_member(org_id, event_service_id))
  with check (public.is_event_service_member(org_id, event_service_id));

-- Triggers coherencia y created_by
create or replace function public.validate_override_service_and_template()
returns trigger
language plpgsql
as $$
declare
  svc_org uuid;
  tmpl_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'override org mismatch with service';
  end if;
  if tg_table_name in ('event_service_excluded_items', 'event_service_replaced_items') then
    select org_id into tmpl_org from public.menu_template_items where id = new.template_item_id;
    if tmpl_org is null then
      raise exception 'template item not found';
    end if;
    if tmpl_org <> svc_org then
      raise exception 'template item org mismatch';
    end if;
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.validate_added_item()
returns trigger
language plpgsql
as $$
declare
  svc_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'added item org mismatch';
  end if;
  if new.rounding_rule = 'ceil_pack' and (new.pack_size is null or new.pack_size <= 0) then
    raise exception 'pack_size required for ceil_pack';
  end if;
  if coalesce(new.qty_per_pax_seated,0) = 0 and coalesce(new.qty_per_pax_standing,0) = 0 then
    raise exception 'at least one qty_per_pax > 0';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.validate_note_service()
returns trigger
language plpgsql
as $$
declare
  svc_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'note org mismatch';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger event_service_excluded_items_validate
before insert or update on public.event_service_excluded_items
for each row execute function public.validate_override_service_and_template();

create trigger event_service_replaced_items_validate
before insert or update on public.event_service_replaced_items
for each row execute function public.validate_override_service_and_template();

create trigger event_service_added_items_validate
before insert or update on public.event_service_added_items
for each row execute function public.validate_added_item();

create trigger event_service_notes_validate
before insert or update on public.event_service_notes
for each row execute function public.validate_note_service();
