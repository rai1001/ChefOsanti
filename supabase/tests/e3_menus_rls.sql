begin;

select plan(4);

-- preparar datos org2
set local role service_role;
insert into public.menu_templates (id, org_id, name, category) values ('74000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000002','Template Sur','coffee_break') on conflict (id) do nothing;
insert into public.events (id, org_id, hotel_id, title, status)
values ('71000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003','Evento Sur','confirmed')
on conflict (id) do nothing;
insert into public.event_services (id, org_id, event_id, service_type, format, starts_at, pax)
values ('73000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000099','coffee_break','de_pie','2026-01-11T10:00:00Z',50)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*) from public.menu_templates),
  2::bigint,
  'Org1 ve sus plantillas'
);

select is(
  (select count(*) from public.event_service_menus),
  2::bigint,
  'Org1 ve su vinculacion de plantilla'
);

select throws_like(
$$insert into public.event_service_menus (id, org_id, event_service_id, template_id) values ('76000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000099','74000000-0000-0000-0000-000000000099')$$,
  '%event service not found%',
  'No permite aplicar plantilla de otra org a servicio'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.menu_templates),
  1::bigint,
  'Org2 solo ve su plantilla'
);

select * from finish();

rollback;
