-- A1 AI Access Control

-- org_plans: plan por organización (sin enums para minimizar fricción)
create table if not exists public.org_plans (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  plan text not null check (plan in ('basic','pro','vip')),
  created_at timestamptz not null default now()
);

alter table public.org_plans enable row level security;

-- Solo miembros pueden leer
drop policy if exists "org_plans select by membership" on public.org_plans;
create policy "org_plans select by membership" on public.org_plans
  for select
  using (exists (
    select 1 from public.org_memberships m
    where m.org_id = org_plans.org_id and m.user_id = auth.uid()
  ));

-- Escritura solo service_role (admins no pueden auto-upgradear)
drop policy if exists "org_plans write service role" on public.org_plans;
create policy "org_plans write service role" on public.org_plans
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ai_features: catálogo global
create table if not exists public.ai_features (
  key text primary key,
  min_plan text not null check (min_plan in ('basic','pro','vip')),
  min_role text not null check (min_role in ('staff','manager','admin')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ai_features enable row level security;

drop policy if exists "ai_features select authenticated" on public.ai_features;
create policy "ai_features select authenticated" on public.ai_features
  for select
  using (auth.uid() is not null);

drop policy if exists "ai_features write service role" on public.ai_features;
create policy "ai_features write service role" on public.ai_features
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Añadir flag is_active a org_memberships para org activa
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='org_memberships' and column_name='is_active'
  ) then
    alter table public.org_memberships add column is_active boolean not null default false;
    create index if not exists org_memberships_active_idx on public.org_memberships (user_id) where is_active = true;
  end if;
end $$;

-- RPC: can_use_feature(feature_key, p_org_id)
create or replace function public.can_use_feature(feature_key text, p_org_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  user_role text;
  org_plan text := 'basic';
  f_min_plan text;
  f_min_role text;
  f_enabled boolean;
begin
  if auth.role() = 'service_role' then
    return true;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  select role into user_role
  from public.org_memberships
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;

  if user_role is null then
    return false;
  end if;

  select min_plan, min_role, is_enabled
    into f_min_plan, f_min_role, f_enabled
  from public.ai_features
  where key = feature_key;

  if f_min_plan is null or f_enabled is not true then
    return false;
  end if;

  select plan into org_plan
  from public.org_plans
  where org_id = p_org_id;

  -- map plan/role to ordinal for comparison
  if (case org_plan when 'basic' then 1 when 'pro' then 2 when 'vip' then 3 else 1 end) <
     (case f_min_plan when 'basic' then 1 when 'pro' then 2 when 'vip' then 3 else 1 end) then
    return false;
  end if;

  if f_min_role = 'admin' and user_role <> 'admin' then
    return false;
  elsif f_min_role = 'manager' and user_role not in ('manager','admin') then
    return false;
  end if;

  return true;
end;
$$;

comment on function public.can_use_feature is 'Evalúa si el usuario actual puede usar una feature IA en la org indicada.';
