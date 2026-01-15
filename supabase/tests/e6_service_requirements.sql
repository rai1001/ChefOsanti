begin;

select plan(6);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (public.compute_service_requirements('73000000-0000-0000-0000-000000000002', false)->>'service_id')::uuid,
  '73000000-0000-0000-0000-000000000002'::uuid,
  'Requirements por servicio devuelven service_id'
);

select is(
  (public.generate_production_plan('73000000-0000-0000-0000-000000000002', null, 'test-idem-prod', false)->>'plan_id')::uuid,
  (public.generate_production_plan('73000000-0000-0000-0000-000000000002', null, 'test-idem-prod', false)->>'plan_id')::uuid,
  'Idempotencia en generar produccion'
);

select ok(
  coalesce(jsonb_array_length(public.generate_event_purchase_orders('73000000-0000-0000-0000-000000000002', null, 'test-idem-po', false)->'order_ids'), 0) >= 1,
  'Genera pedidos por servicio'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select throws_like(
  $$select public.compute_service_requirements('73000000-0000-0000-0000-000000000002', false)$$,
  '%service not found%',
  'Org2 no puede leer requirements de org1'
);

select is(
  (select count(*) from public.order_versions),
  0::bigint,
  'Org2 no ve order_versions de org1'
);

select is(
  (select count(*) from public.event_purchase_orders),
  0::bigint,
  'Org2 no ve orders de org1'
);

select * from finish();
rollback;
