-- IMP4: Room schedule view for Sprint 1 events calendar

create or replace view public.event_room_schedule
with (security_invoker = true)
as
select
  e.org_id,
  e.hotel_id,
  date_trunc('day', sb.starts_at)::date as event_date,
  s.name as room_name,
  count(*) as event_count,
  count(*) filter (where e.status not in ('cancelled', 'draft')) as confirmed_events,
  coalesce(jsonb_agg(jsonb_build_object(
    'event_id', e.id,
    'title', e.title,
    'status', e.status
  ) order by sb.starts_at, e.title), '[]'::jsonb) as events
from public.space_bookings sb
join public.spaces s on s.id = sb.space_id and s.org_id = sb.org_id
join public.events e on e.id = sb.event_id and e.org_id = sb.org_id
where sb.starts_at is not null
  and public.is_org_member(e.org_id)
group by e.org_id, e.hotel_id, date_trunc('day', sb.starts_at)::date, s.name;

grant select on public.event_room_schedule to authenticated;
grant select on public.event_room_schedule to anon;
