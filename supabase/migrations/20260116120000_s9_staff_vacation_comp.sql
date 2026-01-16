-- S9: Staff vacation balances + extra shift compensation

alter table public.staff_time_off
  add column if not exists created_by uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

create table if not exists public.staff_vacation_adjustments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  year int not null,
  delta_days int not null,
  reason text null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists staff_vac_adj_org_idx on public.staff_vacation_adjustments (org_id);
create index if not exists staff_vac_adj_staff_idx on public.staff_vacation_adjustments (staff_member_id);

alter table public.staff_vacation_adjustments enable row level security;
drop policy if exists "Vacation adjustments by membership" on public.staff_vacation_adjustments;
create policy "Vacation adjustments by membership"
  on public.staff_vacation_adjustments
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create table if not exists public.staff_extra_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  shift_id uuid null references public.shifts(id) on delete set null,
  shift_date date not null,
  hours numeric(6,2) not null check (hours > 0),
  reason text null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists staff_extra_org_idx on public.staff_extra_shifts (org_id);
create index if not exists staff_extra_staff_idx on public.staff_extra_shifts (staff_member_id);

alter table public.staff_extra_shifts enable row level security;
drop policy if exists "Extra shifts by membership" on public.staff_extra_shifts;
create policy "Extra shifts by membership"
  on public.staff_extra_shifts
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create table if not exists public.staff_compensations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  extra_shift_id uuid null references public.staff_extra_shifts(id) on delete set null,
  hours numeric(6,2) not null check (hours > 0),
  status text not null default 'open' check (status in ('open','applied','expired')),
  applied_at date null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists staff_comp_org_idx on public.staff_compensations (org_id);
create index if not exists staff_comp_staff_idx on public.staff_compensations (staff_member_id);

alter table public.staff_compensations enable row level security;
drop policy if exists "Compensations by membership" on public.staff_compensations;
create policy "Compensations by membership"
  on public.staff_compensations
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create or replace view public.staff_vacation_balances
with (security_invoker = true)
as
with vac_days as (
  select
    t.staff_member_id,
    extract(year from d)::int as year,
    count(*)::int as used_days
  from public.staff_time_off t
  join lateral generate_series(t.start_date, t.end_date, interval '1 day') d on true
  where t.approved = true and t.type = 'vacaciones'
  group by t.staff_member_id, extract(year from d)::int
),
adj as (
  select staff_member_id, year, sum(delta_days)::int as delta_days
  from public.staff_vacation_adjustments
  group by staff_member_id, year
)
select
  s.org_id,
  s.id as staff_member_id,
  coalesce(a.year, extract(year from current_date)::int) as year,
  coalesce(a.days_total, 47) + coalesce(adj.delta_days, 0) as days_total,
  coalesce(vac_days.used_days, 0) as days_used,
  (coalesce(a.days_total, 47) + coalesce(adj.delta_days, 0)) - coalesce(vac_days.used_days, 0) as days_remaining
from public.staff_members s
left join public.staff_vacation_allowance a
  on a.staff_member_id = s.id
  and a.year = extract(year from current_date)::int
left join vac_days on vac_days.staff_member_id = s.id and vac_days.year = extract(year from current_date)::int
left join adj on adj.staff_member_id = s.id and adj.year = extract(year from current_date)::int
where public.is_org_member(s.org_id);

create or replace view public.staff_compensation_balances
with (security_invoker = true)
as
select
  s.org_id,
  s.id as staff_member_id,
  coalesce(sum(c.hours) filter (where c.status = 'open'), 0) as hours_open
from public.staff_members s
left join public.staff_compensations c on c.staff_member_id = s.id
where public.is_org_member(s.org_id)
group by s.org_id, s.id;

grant select on public.staff_vacation_balances to authenticated;
grant select on public.staff_compensation_balances to authenticated;

create or replace function public.request_time_off(
  p_org_id uuid,
  p_staff_member_id uuid,
  p_start_date date,
  p_end_date date,
  p_type text,
  p_notes text default null,
  p_approved boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_org uuid;
  v_id uuid;
begin
  select org_id into v_staff_org from public.staff_members where id = p_staff_member_id;
  if v_staff_org is null then raise exception 'staff not found'; end if;
  if v_staff_org <> p_org_id then raise exception 'org mismatch'; end if;
  if p_end_date < p_start_date then raise exception 'invalid date range'; end if;
  if not public.is_org_member(p_org_id) then raise exception 'not authorized'; end if;

  insert into public.staff_time_off (
    org_id,
    staff_member_id,
    start_date,
    end_date,
    type,
    notes,
    approved,
    created_by,
    approved_by,
    approved_at
  ) values (
    p_org_id,
    p_staff_member_id,
    p_start_date,
    p_end_date,
    p_type,
    p_notes,
    p_approved,
    auth.uid(),
    case when p_approved then auth.uid() else null end,
    case when p_approved then timezone('utc', now()) else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.approve_time_off(
  p_time_off_id uuid,
  p_approved boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.staff_time_off where id = p_time_off_id;
  if v_org is null then raise exception 'time_off not found'; end if;
  if not public.is_org_member(v_org) then raise exception 'not authorized'; end if;

  update public.staff_time_off
  set approved = p_approved,
      approved_by = auth.uid(),
      approved_at = timezone('utc', now())
  where id = p_time_off_id;
end;
$$;

create or replace function public.register_extra_shift(
  p_org_id uuid,
  p_staff_member_id uuid,
  p_shift_date date,
  p_hours numeric,
  p_reason text default null,
  p_shift_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_org uuid;
  v_extra_id uuid;
begin
  select org_id into v_staff_org from public.staff_members where id = p_staff_member_id;
  if v_staff_org is null then raise exception 'staff not found'; end if;
  if v_staff_org <> p_org_id then raise exception 'org mismatch'; end if;
  if not public.is_org_member(p_org_id) then raise exception 'not authorized'; end if;
  if p_hours <= 0 then raise exception 'invalid hours'; end if;

  insert into public.staff_extra_shifts (
    org_id,
    staff_member_id,
    shift_id,
    shift_date,
    hours,
    reason,
    created_by
  ) values (
    p_org_id,
    p_staff_member_id,
    p_shift_id,
    p_shift_date,
    p_hours,
    p_reason,
    auth.uid()
  )
  returning id into v_extra_id;

  insert into public.staff_compensations (
    org_id,
    staff_member_id,
    extra_shift_id,
    hours,
    status,
    created_by
  ) values (
    p_org_id,
    p_staff_member_id,
    v_extra_id,
    p_hours,
    'open',
    auth.uid()
  );

  return v_extra_id;
end;
$$;

create or replace function public.apply_compensation(
  p_compensation_id uuid,
  p_applied_at date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.staff_compensations where id = p_compensation_id;
  if v_org is null then raise exception 'compensation not found'; end if;
  if not public.is_org_member(v_org) then raise exception 'not authorized'; end if;

  update public.staff_compensations
  set status = 'applied',
      applied_at = p_applied_at
  where id = p_compensation_id;
end;
$$;
