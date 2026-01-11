
-- Ensure Table exists (copied from p4_audit_logs.sql)
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

-- Policies (idempotent check needed)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Logs select member' AND tablename = 'audit_logs'
    ) THEN
        create policy "Logs select member" on public.audit_logs for select
        using (exists (select 1 from public.org_memberships m where m.org_id = audit_logs.org_id and m.user_id = auth.uid()));
    END IF;
END $$;


-- Ensure Function exists
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


-- Now Grants (Fix)
GRANT EXECUTE ON FUNCTION public.log_event(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event(uuid, text, text, jsonb) TO service_role;

GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
