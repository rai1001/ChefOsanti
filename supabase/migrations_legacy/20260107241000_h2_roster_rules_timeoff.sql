-- H2 roster operativo

-- staff_members extensions
alter table public.staff_members
  add column if not exists shift_pattern text not null default 'rotativo',
  add column if not exists max_shifts_per_week int not null default 5 check (max_shifts_per_week between 0 and 7);

alter table public.staff_members
  add constraint staff_shift_pattern_chk
  check (shift_pattern in ('mañana','tarde','rotativo'));

-- scheduling rules
create table if not exists public.scheduling_rules (
  org_id uuid not null references public.orgs(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  morning_required_weekday int not null default 1,
  morning_required_weekend int not null default 2,
  afternoon_required_daily int not null default 1,
  enforce_two_consecutive_days_off boolean not null default true,
  enforce_one_weekend_off_per_30d boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (org_id, hotel_id)
);

alter table public.scheduling_rules enable row level security;
drop policy if exists "Scheduling rules by membership" on public.scheduling_rules;
create policy "Scheduling rules by membership"
  on public.scheduling_rules
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- time off
create table if not exists public.staff_time_off (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  type text not null check (type in ('vacaciones','permiso','baja','otros')),
  approved boolean not null default true,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date)
);
create index if not exists staff_time_off_org_idx on public.staff_time_off (org_id);
create index if not exists staff_time_off_staff_idx on public.staff_time_off (staff_member_id);
create index if not exists staff_time_off_start_idx on public.staff_time_off (start_date);

alter table public.staff_time_off enable row level security;
drop policy if exists "Time off by membership" on public.staff_time_off;
create policy "Time off by membership"
  on public.staff_time_off
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- allowance
create table if not exists public.staff_vacation_allowance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  year int not null,
  days_total int not null default 47 check (days_total >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (staff_member_id, year)
);
create index if not exists staff_vacation_allowance_org_idx on public.staff_vacation_allowance (org_id);

alter table public.staff_vacation_allowance enable row level security;
drop policy if exists "Allowance by membership" on public.staff_vacation_allowance;
create policy "Allowance by membership"
  on public.staff_vacation_allowance
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- broaden shift_type to include mañana/tarde
alter table public.shifts
  drop constraint if exists shifts_shift_type_check;

alter table public.shifts
  add constraint shifts_shift_type_check
  check (shift_type in ('desayuno','bar_tarde','eventos','produccion','libre','mañana','tarde'));

-- recreate assignment trigger with new rules
create or replace function public.validate_staff_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_rec record;
  staff_org uuid;
  exists_same_day uuid;
  has_timeoff uuid;
  prev_tarde uuid;
begin
  select org_id, hotel_id, shift_date, shift_type into shift_rec from public.shifts where id = coalesce(new.shift_id, old.shift_id);
  if shift_rec is null then
    raise exception 'shift not found';
  end if;
  if shift_rec.org_id <> new.org_id then
    raise exception 'org mismatch between assignment and shift';
  end if;
  select org_id into staff_org from public.staff_members where id = new.staff_member_id;
  if staff_org is null then
    raise exception 'staff not found';
  end if;
  if staff_org <> new.org_id then
    raise exception 'org mismatch between assignment and staff';
  end if;

  select sa.id
  into exists_same_day
  from public.staff_assignments sa
  join public.shifts s on s.id = sa.shift_id
  where sa.staff_member_id = new.staff_member_id
    and s.hotel_id = shift_rec.hotel_id
    and s.shift_date = shift_rec.shift_date
    and sa.id <> coalesce(new.id, old.id)
  limit 1;

  if exists_same_day is not null then
    raise exception 'staff already assigned that day';
  end if;

  select id
  into has_timeoff
  from public.staff_time_off t
  where t.staff_member_id = new.staff_member_id
    and t.approved = true
    and shift_rec.shift_date between t.start_date and t.end_date
  limit 1;
  if has_timeoff is not null then
    raise exception 'staff unavailable (time off)';
  end if;

  if shift_rec.shift_type = 'mañana' then
    select sa.id
    into prev_tarde
    from public.staff_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.staff_member_id = new.staff_member_id
      and s.hotel_id = shift_rec.hotel_id
      and s.shift_date = shift_rec.shift_date - interval '1 day'
      and s.shift_type = 'tarde'
    limit 1;
    if prev_tarde is not null then
      raise exception 'rest violation: tarde->mañana';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists staff_assignments_validate on public.staff_assignments;
create trigger staff_assignments_validate
before insert or update on public.staff_assignments
for each row execute function public.validate_staff_assignment();

-- RPC generate_week_roster_v2
create or replace function public.generate_week_roster_v2(p_hotel_id uuid, week_start date, dry_run boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
  rules record;
  staff_list json;
  shifts_out json := '[]'::json;
  assigns_out json := '[]'::json;
  warnings json := '[]'::json;
  d date;
  shift_type text;
  need int;
  day_assign json;
  staff_rec record;
  assigned_week jsonb := '[]'::jsonb;
begin
  select org_id into org from public.hotels where id = p_hotel_id;
  if org is null then
    raise exception 'hotel not found';
  end if;

  select * into rules from public.scheduling_rules where hotel_id = p_hotel_id;
  if rules is null then
    rules.morning_required_weekday := 1;
    rules.morning_required_weekend := 2;
    rules.afternoon_required_daily := 1;
  end if;

  for d in select week_start + offs from generate_series(0,6) as offs loop
    -- morning
    if extract(isodow from d) in (6,7) then
      need := coalesce(rules.morning_required_weekend,1);
    else
      need := coalesce(rules.morning_required_weekday,1);
    end if;
    shifts_out := shifts_out || json_build_object('shift_date', d, 'shift_type', 'mañana', 'required_count', need);
    -- afternoon
    shifts_out := shifts_out || json_build_object('shift_date', d, 'shift_type', 'tarde', 'required_count', coalesce(rules.afternoon_required_daily,1));
  end loop;

  for staff_rec in
    select s.*, coalesce(v.days_total,47) as allowance_days
    from public.staff_members s
    where s.org_id = org and s.active = true
  loop
    assigned_week := jsonb_set(assigned_week, ('{'||staff_rec.id||'}')::text[], '0'::jsonb, true);
  end loop;

  -- simple greedy
  for d in select week_start + offs as day from generate_series(0,6) as offs loop
    for shift_type in select unnest(array['mañana','tarde']) loop
      need := (select (elem->>'required_count')::int from json_array_elements(shifts_out) elem where elem->>'shift_date' = d::text and elem->>'shift_type' = shift_type limit 1);
      if need is null then need := 0; end if;
      while need > 0 loop
        select * into staff_rec
        from public.staff_members s
        where s.org_id = org
          and s.active = true
          and (s.shift_pattern = shift_type or s.shift_pattern = 'rotativo')
          and coalesce((assigned_week ->> s.id)::int,0) < s.max_shifts_per_week
          and not exists (
            select 1 from public.staff_assignments sa
            join public.shifts sh on sh.id = sa.shift_id
            where sa.staff_member_id = s.id and sh.hotel_id = hotel_id and sh.shift_date = d
          )
          and not exists (
            select 1 from public.staff_time_off t
            where t.staff_member_id = s.id and t.approved = true and d between t.start_date and t.end_date
          )
          and (shift_type <> 'mañana' or not exists (
            select 1 from public.staff_assignments sa
            join public.shifts sh on sh.id = sa.shift_id
            where sa.staff_member_id = s.id and sh.hotel_id = hotel_id and sh.shift_date = d - interval '1 day' and sh.shift_type = 'tarde'
          ))
        order by coalesce((assigned_week ->> s.id)::int,0), s.full_name
        limit 1;

        if staff_rec.id is null then
          warnings := warnings || json_build_object('code','coverage_shortfall','message', format('Sin candidatos %s %s', shift_type, d));
          exit;
        end if;

        assigns_out := assigns_out || json_build_object('shift_date', d, 'shift_type', shift_type, 'staff_member_id', staff_rec.id);
        assigned_week := jsonb_set(assigned_week, ('{'||staff_rec.id||'}')::text[], to_jsonb(coalesce((assigned_week ->> staff_rec.id)::int,0) + 1), true);
        need := need - 1;
      end loop;
    end loop;
  end loop;

  if dry_run = false then
    -- upsert shifts and assignments
    for day_assign in select * from json_array_elements(shifts_out) loop
      insert into public.shifts (org_id, hotel_id, shift_date, shift_type, starts_at, ends_at, required_count)
      values (org, p_hotel_id, (day_assign->>'shift_date')::date, day_assign->>'shift_type', '07:00', '15:00', (day_assign->>'required_count')::int)
      on conflict (hotel_id, shift_date, shift_type) do update
      set required_count = excluded.required_count;
    end loop;
    for day_assign in select * from json_array_elements(assigns_out) loop
      insert into public.staff_assignments (org_id, shift_id, staff_member_id)
      select org, sh.id, (day_assign->>'staff_member_id')::uuid
      from public.shifts sh
      where sh.hotel_id = p_hotel_id and sh.shift_date = (day_assign->>'shift_date')::date and sh.shift_type = (day_assign->>'shift_type')
      on conflict do nothing;
    end loop;
  end if;

  return json_build_object('shifts', shifts_out, 'assignments', assigns_out, 'warnings', warnings, 'stats', json_build_object());
end;
$$;
