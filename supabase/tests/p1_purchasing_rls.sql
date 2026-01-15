begin;

select plan(8);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*) from public.suppliers),
  2::bigint,
  'Usuario 1 ve sus suppliers'
);

select is(
  (select count(*) from public.supplier_items),
  5::bigint,
  'Usuario 1 ve los items de sus suppliers'
);

select lives_ok(
  $$insert into public.suppliers (org_id, name) values ('00000000-0000-0000-0000-000000000001', 'Proveedor Test U1')$$,
  'Usuario 1 puede crear supplier en su org'
);

select throws_like(
  $$insert into public.suppliers (org_id, name) values ('00000000-0000-0000-0000-000000000002', 'Proveedor Bloqueado')$$,
  '%row-level security%',
  'Usuario 1 no puede crear supplier en otra org'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.suppliers),
  0::bigint,
  'Usuario 2 no ve suppliers de org1'
);

select is(
  (select count(*) from public.supplier_items),
  0::bigint,
  'Usuario 2 no ve items de org1'
);

select throws_like(
  $$insert into public.supplier_items (supplier_id, name, purchase_unit, pack_size, rounding_rule) values ('30000000-0000-0000-0000-000000000001', 'Item Bloqueado', 'kg', 1, 'ceil_pack')$$,
  '%row-level security%',
  'Usuario 2 no puede crear item en supplier de otra org'
);

select lives_ok(
  $$insert into public.suppliers (org_id, name) values ('00000000-0000-0000-0000-000000000002', 'Proveedor Test U2')$$,
  'Usuario 2 puede crear supplier en su org'
);

select * from finish();

rollback;
