begin;

select plan(3);

-- preparar datos de org2
set local role service_role;
insert into public.events (id, org_id, hotel_id, title, status)
values ('71000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'Evento Org2', 'confirmed')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*) from public.event_services),
  2::bigint,
  'Usuario org1 ve sus servicios'
);

select throws_like(
$$insert into public.event_services (id, org_id, event_id, service_type, format, starts_at, pax) values ('73000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000099','cena','sentado','2026-01-10T20:00:00Z',50)$$,
  '%event not found%',
  'No permite crear servicio con evento de otra org'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.event_services),
  0::bigint,
  'Usuario org2 no ve servicios de org1'
);

select * from finish();

rollback;
