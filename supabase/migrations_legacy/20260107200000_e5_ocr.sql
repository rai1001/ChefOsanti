-- E5: OCR adjuntos y borradores de menú

create table if not exists public.event_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  storage_bucket text not null default 'event-attachments',
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id, storage_path)
);

create index if not exists event_attachments_event_idx on public.event_attachments (event_id);
create index if not exists event_attachments_org_idx on public.event_attachments (org_id);

create table if not exists public.ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  attachment_id uuid not null references public.event_attachments (id) on delete cascade,
  status text not null check (status in ('queued','processing','done','failed')),
  provider text not null default 'mock',
  extracted_text text null,
  draft_json jsonb null,
  error text null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ocr_jobs_attachment_idx on public.ocr_jobs (attachment_id);
create index if not exists ocr_jobs_org_idx on public.ocr_jobs (org_id);
create index if not exists ocr_jobs_status_idx on public.ocr_jobs (status);

create table if not exists public.event_service_menu_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_service_id, title)
);

create index if not exists event_service_menu_sections_service_idx on public.event_service_menu_sections (event_service_id);
create index if not exists event_service_menu_sections_org_idx on public.event_service_menu_sections (org_id);

create table if not exists public.event_service_menu_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  section_id uuid not null references public.event_service_menu_sections (id) on delete cascade,
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_service_menu_items_section_idx on public.event_service_menu_items (section_id);
create index if not exists event_service_menu_items_org_idx on public.event_service_menu_items (org_id);

-- Triggers coherencia
create or replace function public.set_created_by_and_validate_attachment()
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
  if ev_org <> new.org_id then
    raise exception 'attachment org mismatch';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.set_created_by_and_validate_ocr_job()
returns trigger
language plpgsql
as $$
declare
  att_org uuid;
begin
  select org_id into att_org from public.event_attachments where id = new.attachment_id;
  if att_org is null then
    raise exception 'attachment not found';
  end if;
  if att_org <> new.org_id then
    raise exception 'ocr job org mismatch';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.validate_service_menu_section()
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
    raise exception 'menu section org mismatch';
  end if;
  return new;
end;
$$;

create or replace function public.validate_service_menu_item()
returns trigger
language plpgsql
as $$
declare
  sec_org uuid;
begin
  select org_id into sec_org from public.event_service_menu_sections where id = new.section_id;
  if sec_org is null then
    raise exception 'menu section not found';
  end if;
  if sec_org <> new.org_id then
    raise exception 'menu item org mismatch';
  end if;
  return new;
end;
$$;

create trigger event_attachments_validate
before insert or update on public.event_attachments
for each row execute function public.set_created_by_and_validate_attachment();

create trigger ocr_jobs_validate
before insert or update on public.ocr_jobs
for each row execute function public.set_created_by_and_validate_ocr_job();

create trigger ocr_jobs_touch
before update on public.ocr_jobs
for each row execute function public.touch_updated_at();

create trigger service_menu_sections_validate
before insert or update on public.event_service_menu_sections
for each row execute function public.validate_service_menu_section();

create trigger service_menu_items_validate
before insert or update on public.event_service_menu_items
for each row execute function public.validate_service_menu_item();

-- RLS
alter table public.event_attachments enable row level security;
alter table public.ocr_jobs enable row level security;
alter table public.event_service_menu_sections enable row level security;
alter table public.event_service_menu_items enable row level security;

drop policy if exists "Attachments by membership" on public.event_attachments;
create policy "Attachments by membership"
  on public.event_attachments
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "OCR jobs by membership" on public.ocr_jobs;
create policy "OCR jobs by membership"
  on public.ocr_jobs
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Menu sections by membership" on public.event_service_menu_sections;
create policy "Menu sections by membership"
  on public.event_service_menu_sections
  for all
  using (
    public.is_org_member(org_id)
    and exists(select 1 from public.event_services es where es.id = event_service_id and es.org_id = org_id)
  )
  with check (
    public.is_org_member(org_id)
    and exists(select 1 from public.event_services es where es.id = event_service_id and es.org_id = org_id)
  );

drop policy if exists "Menu items by membership" on public.event_service_menu_items;
create policy "Menu items by membership"
  on public.event_service_menu_items
  for all
  using (
    public.is_org_member(public.event_service_menu_items.org_id)
    and exists(
      select 1
      from public.event_service_menu_sections sec
      join public.event_services es on es.id = sec.event_service_id
      where sec.id = section_id and sec.org_id = public.event_service_menu_items.org_id and es.org_id = public.event_service_menu_items.org_id
    )
  )
  with check (
    public.is_org_member(public.event_service_menu_items.org_id)
    and exists(
      select 1
      from public.event_service_menu_sections sec
      join public.event_services es on es.id = sec.event_service_id
      where sec.id = section_id and sec.org_id = public.event_service_menu_items.org_id and es.org_id = public.event_service_menu_items.org_id
    )
  );

-- Storage bucket y políticas
insert into storage.buckets (id, name, public)
values ('event-attachments', 'event-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Attachments access by org members" on storage.objects;
create policy "Attachments access by org members"
  on storage.objects
  for all
  using (
    bucket_id = 'event-attachments'
    and exists (
      select 1 from public.org_memberships m
      where m.user_id = auth.uid()
      and m.org_id::text = (storage.foldername(name))[2]
    )
  )
  with check (
    bucket_id = 'event-attachments'
    and exists (
      select 1 from public.org_memberships m
      where m.user_id = auth.uid()
      and m.org_id::text = (storage.foldername(name))[2]
    )
  );
