-- IMP4: Room schedule view for Sprint 1 events calendar

create view if not exists public.event_room_schedule as
select
  e.org_id,
  e.hotel_id,
  e.event_date,
  er.room_name,
  count(*) as event_count,
  count(*) filter (where e.status not in ('cancelled', 'draft')) as confirmed_events,
  coalesce(jsonb_agg(jsonb_build_object(
    'event_id', e.id,
    'title', e.name,
    'status', e.status,
    'menu_status', e.menu_status
  ) order by e.event_date, e.name), '[]'::jsonb) as events
from public.event_rooms er
join public.events e on e.id = er.event_id and e.org_id = er.org_id
where e.event_date is not null
group by e.org_id, e.hotel_id, e.event_date, er.room_name;

grant select on public.event_room_schedule to authenticated;
grant select on public.event_room_schedule to anon;

alter view public.event_room_schedule enable row level security;

create policy "Room schedule by membership"
  on public.event_room_schedule
  for select
  using (public.is_org_member(org_id));
