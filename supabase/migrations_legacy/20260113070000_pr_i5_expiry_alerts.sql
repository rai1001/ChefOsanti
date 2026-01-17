-- PR-I5: Alertas de caducidad (in-app) y dashboard operativo

-- Tipos
do $$ begin
  if not exists (select 1 from pg_type where typname = 'expiry_alert_status') then
    create type public.expiry_alert_status as enum ('open', 'dismissed', 'sent');
  end if;
end $$;

-- Reglas por org
create table if not exists public.expiry_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  days_before int not null check (days_before >= 0),
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- Alertas generadas por job
create table if not exists public.expiry_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  batch_id uuid not null references public.stock_batches (id) on delete cascade,
  rule_id uuid not null references public.expiry_rules (id) on delete cascade,
  status public.expiry_alert_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz null,
  constraint expiry_alerts_unique unique (org_id, batch_id, rule_id)
);

create index if not exists expiry_rules_org_idx on public.expiry_rules (org_id, is_enabled);
create index if not exists expiry_alerts_org_idx on public.expiry_alerts (org_id, status);
create index if not exists expiry_alerts_batch_idx on public.expiry_alerts (batch_id);

alter table public.expiry_rules enable row level security;
alter table public.expiry_alerts enable row level security;

-- Policies
drop policy if exists "expiry_rules_select_member" on public.expiry_rules;
create policy "expiry_rules_select_member" on public.expiry_rules
  for select using (public.is_org_member(org_id));

drop policy if exists "expiry_rules_write_member" on public.expiry_rules;
create policy "expiry_rules_write_member" on public.expiry_rules
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "expiry_alerts_select_member" on public.expiry_alerts;
create policy "expiry_alerts_select_member" on public.expiry_alerts
  for select using (public.is_org_member(org_id));

drop policy if exists "expiry_alerts_write_member" on public.expiry_alerts;
create policy "expiry_alerts_write_member" on public.expiry_alerts
  for update using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
