-- PR1: Production Module (Manual Plans)

-- Enums
create type public.production_plan_status as enum ('draft', 'in_progress', 'done');
create type public.production_plan_source as enum ('manual', 'menu');
create type public.production_station as enum ('frio', 'caliente', 'pasteleria', 'barra', 'office', 'almacen', 'externo');
create type public.production_task_status as enum ('todo', 'doing', 'done', 'blocked');

-- Table: production_plans
create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  hotel_id uuid not null, -- denormalized for filtering
  event_id uuid not null references public.events (id) on delete cascade,
  event_service_id uuid not null references public.event_services (id) on delete cascade,
  status public.production_plan_status not null default 'draft',
  generated_from public.production_plan_source not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id),
  
  constraint production_plans_service_unique unique (event_service_id)
);

-- Table: production_tasks
create table if not exists public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  plan_id uuid not null references public.production_plans (id) on delete cascade,
  station public.production_station not null,
  title text not null,
  due_at timestamptz,
  assignee_staff_id uuid references public.staff_members (id) on delete set null,
  priority int not null default 3 check (priority between 1 and 5),
  status public.production_task_status not null default 'todo',
  blocked_reason text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes
create index if not exists production_plans_org_idx on public.production_plans (org_id);
create index if not exists production_plans_event_idx on public.production_plans (event_id);
create index if not exists production_plans_service_idx on public.production_plans (event_service_id);

create index if not exists production_tasks_plan_idx on public.production_tasks (plan_id);
create index if not exists production_tasks_org_idx on public.production_tasks (org_id);
create index if not exists production_tasks_station_idx on public.production_tasks (station);

-- RLS
alter table public.production_plans enable row level security;
alter table public.production_tasks enable row level security;

-- Policies: production_plans
create policy "production_plans_read_member"
  on public.production_plans for select
  using (public.is_org_member(org_id));

create policy "production_plans_write_member"
  on public.production_plans for insert
  with check (public.is_org_member(org_id));

create policy "production_plans_update_member"
  on public.production_plans for update
  using (public.is_org_member(org_id));

create policy "production_plans_delete_member"
  on public.production_plans for delete
  using (public.is_org_member(org_id));

-- Policies: production_tasks
create policy "production_tasks_read_member"
  on public.production_tasks for select
  using (public.is_org_member(org_id));

create policy "production_tasks_write_member"
  on public.production_tasks for insert
  with check (public.is_org_member(org_id));

create policy "production_tasks_update_member"
  on public.production_tasks for update
  using (public.is_org_member(org_id));

create policy "production_tasks_delete_member"
  on public.production_tasks for delete
  using (public.is_org_member(org_id));
