-- E3: Plantillas de menú y aplicación a servicios

create table if not exists public.menu_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  category text not null check (category in ('deportivo','turistico','empresa','coffee_break','coctel','otros')),
  active boolean not null default true,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, name)
);

create index if not exists menu_templates_org_idx on public.menu_templates (org_id);
create index if not exists menu_templates_category_idx on public.menu_templates (category);

create table if not exists public.menu_template_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  template_id uuid not null references public.menu_templates (id) on delete cascade,
  section text null,
  name text not null,
  unit text not null check (unit in ('ud','kg')),
  qty_per_pax_seated numeric not null default 0 check (qty_per_pax_seated >= 0),
  qty_per_pax_standing numeric not null default 0 check (qty_per_pax_standing >= 0),
  rounding_rule text not null check (rounding_rule in ('ceil_unit','ceil_pack','none')),
  pack_size numeric null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (template_id, name)
);

create index if not exists menu_template_items_template_idx on public.menu_template_items (template_id);
create index if not exists menu_template_items_org_idx on public.menu_template_items (org_id);

create table if not exists public.event_service_menus (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  template_id uuid not null references public.menu_templates (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_service_id)
);

create index if not exists event_service_menus_org_idx on public.event_service_menus (org_id);
create index if not exists event_service_menus_service_idx on public.event_service_menus (event_service_id);

-- RLS
alter table public.menu_templates enable row level security;
alter table public.menu_template_items enable row level security;
alter table public.event_service_menus enable row level security;

drop policy if exists "Menu templates by membership" on public.menu_templates;
create policy "Menu templates by membership"
  on public.menu_templates
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Menu template items by membership" on public.menu_template_items;
create policy "Menu template items by membership"
  on public.menu_template_items
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Service menus by membership" on public.event_service_menus;
create policy "Service menus by membership"
  on public.event_service_menus
  for all
  using (
    public.is_org_member(org_id) and exists (
      select 1 from public.event_services es
      join public.org_memberships m on m.org_id = es.org_id
      where es.id = event_service_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(org_id) and exists (
      select 1 from public.event_services es
      join public.org_memberships m on m.org_id = es.org_id
      where es.id = event_service_id and m.user_id = auth.uid()
    )
  );

-- Validation triggers
create or replace function public.validate_menu_template_item()
returns trigger
language plpgsql
as $$
declare
  tmpl_org uuid;
begin
  select org_id into tmpl_org from public.menu_templates where id = new.template_id;
  if tmpl_org is null then
    raise exception 'template not found';
  end if;
  if tmpl_org <> new.org_id then
    raise exception 'template item org mismatch';
  end if;
  if new.rounding_rule = 'ceil_pack' and (new.pack_size is null or new.pack_size <= 0) then
    raise exception 'pack_size required for ceil_pack';
  end if;
  if coalesce(new.qty_per_pax_seated,0) = 0 and coalesce(new.qty_per_pax_standing,0) = 0 then
    raise exception 'at least one qty_per_pax must be > 0';
  end if;
  return new;
end;
$$;

create or replace function public.validate_event_service_menu()
returns trigger
language plpgsql
as $$
declare
  service_org uuid;
  template_org uuid;
begin
  select org_id into service_org from public.event_services where id = new.event_service_id;
  if service_org is null then
    raise exception 'event service not found';
  end if;
  if new.org_id <> service_org then
    raise exception 'service menu org mismatch';
  end if;
  select org_id into template_org from public.menu_templates where id = new.template_id;
  if template_org is null then
    raise exception 'template not found';
  end if;
  if template_org <> service_org then
    raise exception 'template org mismatch with service';
  end if;
  return new;
end;
$$;

create trigger menu_template_items_validate
before insert or update on public.menu_template_items
for each row execute function public.validate_menu_template_item();

create trigger event_service_menus_validate
before insert or update on public.event_service_menus
for each row execute function public.validate_event_service_menu();
