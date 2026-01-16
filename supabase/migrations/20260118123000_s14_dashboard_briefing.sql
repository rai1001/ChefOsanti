-- S14: Dashboard rolling horizon, briefing, highlights

create or replace function public.dashboard_rolling_grid(
  p_org_id uuid,
  p_hotel_id uuid,
  p_start date,
  p_days int default 7
) returns table (
  day date,
  events_count int,
  purchase_pending int,
  purchase_ordered int,
  purchase_received int,
  production_draft int,
  production_in_progress int,
  production_done int,
  staff_required int,
  staff_assigned int
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
  with days as (
    select generate_series(p_start, p_start + (p_days - 1), interval '1 day')::date as day
  ),
  event_counts as (
    select
      date_trunc('day', e.starts_at)::date as day,
      count(*) as events_count
    from public.events e
    where e.org_id = p_org_id
      and e.hotel_id = p_hotel_id
      and e.starts_at >= p_start
      and e.starts_at < (p_start + (p_days) * interval '1 day')
    group by date_trunc('day', e.starts_at)::date
  ),
  purchase_counts as (
    select
      date_trunc('day', e.starts_at)::date as day,
      count(*) filter (where epo.status in ('draft', 'approved')) as purchase_pending,
      count(*) filter (where epo.status = 'ordered') as purchase_ordered,
      count(*) filter (where epo.status = 'received') as purchase_received
    from public.event_purchase_orders epo
    join public.events e on e.id = epo.event_id
    where epo.org_id = p_org_id
      and e.hotel_id = p_hotel_id
      and e.starts_at >= p_start
      and e.starts_at < (p_start + (p_days) * interval '1 day')
    group by date_trunc('day', e.starts_at)::date
  ),
  production_counts as (
    select
      date_trunc('day', e.starts_at)::date as day,
      count(*) filter (where pp.status = 'draft') as production_draft,
      count(*) filter (where pp.status = 'in_progress') as production_in_progress,
      count(*) filter (where pp.status = 'done') as production_done
    from public.production_plans pp
    join public.events e on e.id = pp.event_id
    where pp.org_id = p_org_id
      and pp.hotel_id = p_hotel_id
      and e.starts_at >= p_start
      and e.starts_at < (p_start + (p_days) * interval '1 day')
    group by date_trunc('day', e.starts_at)::date
  ),
  staff_counts as (
    select
      s.shift_date as day,
      sum(s.required_count)::int as staff_required,
      count(sa.id)::int as staff_assigned
    from public.shifts s
    left join public.staff_assignments sa on sa.shift_id = s.id
    where s.hotel_id = p_hotel_id
      and s.shift_date >= p_start
      and s.shift_date < (p_start + (p_days) * interval '1 day')
    group by s.shift_date
  )
  select
    d.day,
    coalesce(ec.events_count, 0) as events_count,
    coalesce(pc.purchase_pending, 0) as purchase_pending,
    coalesce(pc.purchase_ordered, 0) as purchase_ordered,
    coalesce(pc.purchase_received, 0) as purchase_received,
    coalesce(pr.production_draft, 0) as production_draft,
    coalesce(pr.production_in_progress, 0) as production_in_progress,
    coalesce(pr.production_done, 0) as production_done,
    coalesce(sc.staff_required, 0) as staff_required,
    coalesce(sc.staff_assigned, 0) as staff_assigned
  from days d
  left join event_counts ec on ec.day = d.day
  left join purchase_counts pc on pc.day = d.day
  left join production_counts pr on pr.day = d.day
  left join staff_counts sc on sc.day = d.day
  order by d.day;
end;
$$;

grant execute on function public.dashboard_rolling_grid(uuid, uuid, date, int) to authenticated;

create or replace function public.dashboard_event_highlights(
  p_org_id uuid,
  p_hotel_id uuid,
  p_start date,
  p_days int default 7
) returns table (
  event_id uuid,
  title text,
  starts_at timestamptz,
  status text,
  pax_total numeric,
  services_count int,
  production_status public.production_plan_status
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    e.id as event_id,
    e.title,
    e.starts_at,
    e.status,
    coalesce(sum(es.pax), 0) as pax_total,
    count(es.id)::int as services_count,
    max(pp.status) as production_status
  from public.events e
  left join public.event_services es on es.event_id = e.id
  left join public.production_plans pp on pp.event_id = e.id and pp.is_current = true
  where e.org_id = p_org_id
    and e.hotel_id = p_hotel_id
    and e.starts_at >= p_start
    and e.starts_at < (p_start + (p_days) * interval '1 day')
  group by e.id, e.title, e.starts_at, e.status
  order by pax_total desc, e.starts_at asc
  limit 5;
end;
$$;

grant execute on function public.dashboard_event_highlights(uuid, uuid, date, int) to authenticated;

create or replace function public.dashboard_briefing(
  p_org_id uuid,
  p_hotel_id uuid,
  p_start date,
  p_days int default 7
) returns table (
  deadline_day date,
  event_purchase_order_id uuid,
  order_number text,
  status public.purchase_order_status,
  product_type public.product_type,
  supplier_name text,
  event_title text,
  lead_time_days int,
  order_deadline_at timestamptz,
  reminder_end_at timestamptz,
  reminder_active boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    date_trunc('day', d.order_deadline_at)::date as deadline_day,
    d.event_purchase_order_id,
    d.order_number,
    d.status,
    d.product_type,
    s.name as supplier_name,
    e.title as event_title,
    d.lead_time_days,
    d.order_deadline_at,
    d.reminder_end_at,
    d.reminder_active
  from public.event_purchase_order_deadlines d
  join public.events e on e.id = d.event_id
  join public.suppliers s on s.id = d.supplier_id
  where d.org_id = p_org_id
    and d.hotel_id = p_hotel_id
    and d.order_deadline_at >= p_start
    and d.order_deadline_at < (p_start + (p_days) * interval '1 day')
  order by d.order_deadline_at asc;
end;
$$;

grant execute on function public.dashboard_briefing(uuid, uuid, date, int) to authenticated;
