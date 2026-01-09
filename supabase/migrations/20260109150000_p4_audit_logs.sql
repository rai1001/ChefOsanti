-- Phase 5: Observability - Audit Logs
-- Table and RPC for centralized event logging

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  level text not null,
  event text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_idx on public.audit_logs(org_id);
create index if not exists audit_logs_event_idx on public.audit_logs(event);

alter table public.audit_logs enable row level security;

-- Members can see logs for their org
create policy "Logs select member" on public.audit_logs for select
  using (exists (select 1 from public.org_memberships m where m.org_id = audit_logs.org_id and m.user_id = auth.uid()));

-- RPC to log events from client (SECURITY DEFINER to allow logging even if RLS is strict)
create or replace function public.log_event(
  p_org_id uuid,
  p_level text,
  p_event text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (org_id, user_id, level, event, metadata)
  values (p_org_id, auth.uid(), p_level, p_event, p_metadata);
end;
$$;
