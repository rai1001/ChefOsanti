-- D1: Dashboard semanal (notas por org/usuario/semana)

create table if not exists public.dashboard_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null,
  week_start date not null,
  content text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  unique (org_id, user_id, week_start)
);

create index if not exists dashboard_notes_org_week_idx on public.dashboard_notes (org_id, week_start);

-- Asegura que touch_updated_at exista
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger dashboard_notes_touch
before update on public.dashboard_notes
for each row execute function public.touch_updated_at();

alter table public.dashboard_notes enable row level security;

drop policy if exists "Dashboard notes by owner and membership" on public.dashboard_notes;
create policy "Dashboard notes by owner and membership"
  on public.dashboard_notes
  for all
  using (
    public.is_org_member(org_id)
    and auth.uid() = user_id
  )
  with check (
    public.is_org_member(org_id)
    and auth.uid() = user_id
  );
