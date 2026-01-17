-- Fix: cast counts to int for dashboard_rolling_grid result types

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
      count(*)::int as events_count
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
      count(*) filter (where epo.status in ('draft', 'approved'))::int as purchase_pending,
      count(*) filter (where epo.status = 'ordered')::int as purchase_ordered,
      count(*) filter (where epo.status = 'received')::int as purchase_received
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
      count(*) filter (where pp.status = 'draft')::int as production_draft,
      count(*) filter (where pp.status = 'in_progress')::int as production_in_progress,
      count(*) filter (where pp.status = 'done')::int as production_done
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
