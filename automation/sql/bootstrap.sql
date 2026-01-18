-- Bootstrap script for the clean Supabase baseline.
-- Run this only after the project is linked and the baseline (00000000000000_base.sql) has been pushed.

-- 1. Org / hotel / membership / user
insert into public.orgs (id, name, slug)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hotel Atlántico', 'hotel-atlantico')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

insert into public.hotels (id, org_id, name)
values ('f773bc83-072c-40af-9eb9-12802cef0fca', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hotel Atlántico')
on conflict (id) do nothing;

insert into public.org_memberships (org_id, user_id, role, is_active)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '4b938ba3-fbd1-4149-9798-3029a83e139c', 'admin', true)
on conflict do nothing;

-- 2. Event + spaces + bookings
insert into public.events (id, org_id, hotel_id, title, starts_at, ends_at, status)
values (
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'f773bc83-072c-40af-9eb9-12802cef0fca',
  'Evento Staff Test',
  now() + interval '1 day',
  now() + interval '1 day' + interval '5 hours',
  'draft')
on conflict do nothing;

insert into public.spaces (id, org_id, hotel_id, name)
values (
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'f773bc83-072c-40af-9eb9-12802cef0fca',
  'Cocina Principal')
on conflict do nothing;

insert into public.space_bookings (id, org_id, event_id, space_id, starts_at, ends_at)
select
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  e.id,
  s.id,
  now() + interval '1 day',
  now() + interval '1 day' + interval '5 hours'
from public.events e
join public.spaces s on s.org_id = e.org_id and s.hotel_id = e.hotel_id
where e.title = 'Evento Staff Test'
limit 1
on conflict do nothing;

-- 3. Services + production
insert into public.event_services (id, org_id, event_id, service_type, format)
values (
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  (select id from public.events where title = 'Evento Staff Test' limit 1),
  'coffee_break',
  'de_pie')
on conflict do nothing;

insert into public.production_plans (id, org_id, hotel_id, event_service_id, status)
values (
  'pr-01',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'f773bc83-072c-40af-9eb9-12802cef0fca',
  (select id from public.event_services where format = 'de_pie' limit 1),
  'draft')
on conflict do nothing;

insert into public.production_tasks (id, org_id, hotel_id, plan_id, title, station, priority)
values (
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'f773bc83-072c-40af-9eb9-12802cef0fca',
  'pr-01',
  'Montar máquina de café',
  'cocina',
  10)
on conflict do nothing;

-- 4. Products + orders
insert into public.products (id, org_id, name, unit)
values ('prod-01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Café en grano', 'kg')
on conflict do nothing;

insert into public.purchase_orders (id, org_id, hotel_id, supplier_id, status, total_estimated)
values (
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'f773bc83-072c-40af-9eb9-12802cef0fca',
  gen_random_uuid(),
  'draft',
  1200)
on conflict do nothing;

insert into public.event_purchase_orders (id, org_id, event_id, status)
values (
  gen_random_uuid(),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  (select id from public.events where title = 'Evento Staff Test' limit 1),
  'draft')
on conflict do nothing;
