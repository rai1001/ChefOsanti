-- E2E compatibility patch for legacy inserts

-- Events: allow "name" inserts and keep title populated
alter table public.events
  add column if not exists name text null;

update public.events
set name = title
where name is null;

create or replace function public.events_fill_title()
returns trigger
language plpgsql
as $$
begin
  if new.title is null then
    new.title := coalesce(new.name, 'Evento');
  end if;
  if new.name is null then
    new.name := new.title;
  end if;
  return new;
end;
$$;

drop trigger if exists events_fill_title on public.events;
create trigger events_fill_title
before insert or update on public.events
for each row execute function public.events_fill_title();

-- Event services: default starts_at and normalize format values
alter table public.event_services
  alter column starts_at set default timezone('utc', now());

create or replace function public.event_services_fill_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is null then
    new.starts_at := timezone('utc', now());
  end if;
  if new.format is not null and lower(new.format) in ('cocktail', 'coctel') then
    new.format := 'de_pie';
  end if;
  return new;
end;
$$;

drop trigger if exists event_services_fill_defaults on public.event_services;
create trigger event_services_fill_defaults
before insert or update on public.event_services
for each row execute function public.event_services_fill_defaults();

-- Menu templates: accept legacy "type" field and default category
alter table public.menu_templates
  add column if not exists type text null;

alter table public.menu_templates
  alter column category set default 'otros';

update public.menu_templates
set type = category
where type is null;

-- Menu template items: fill org_id and rounding_rule defaults
alter table public.menu_template_items
  alter column rounding_rule set default 'none';

create or replace function public.menu_template_items_fill_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.org_id is null then
    select org_id into new.org_id from public.menu_templates where id = new.template_id;
  end if;
  if new.rounding_rule is null then
    new.rounding_rule := 'none';
  end if;
  return new;
end;
$$;

drop trigger if exists menu_template_items_fill_defaults on public.menu_template_items;
create trigger menu_template_items_fill_defaults
before insert or update on public.menu_template_items
for each row execute function public.menu_template_items_fill_defaults();

-- Event service menus: fill org_id when omitted
create or replace function public.event_service_menus_fill_org()
returns trigger
language plpgsql
as $$
begin
  if new.org_id is null then
    select org_id into new.org_id from public.event_services where id = new.event_service_id;
  end if;
  return new;
end;
$$;

drop trigger if exists event_service_menus_fill_org on public.event_service_menus;
create trigger event_service_menus_fill_org
before insert or update on public.event_service_menus
for each row execute function public.event_service_menus_fill_org();

-- Recipes: accept legacy status field
alter table public.recipes
  add column if not exists status text null default 'active';

update public.recipes
set status = 'active'
where status is null;
