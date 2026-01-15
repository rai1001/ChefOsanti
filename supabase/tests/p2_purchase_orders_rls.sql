begin;

select plan(5);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

-- crear supplier_item extra para pruebas
insert into public.supplier_items (id, supplier_id, name, purchase_unit, rounding_rule, pack_size)
values ('40000000-0000-0000-0000-000000009999', '30000000-0000-0000-0000-000000000001', 'Test mismatch', 'kg', 'ceil_pack', 1)
on conflict (id) do nothing;

insert into public.ingredients (id, org_id, hotel_id, name, base_unit, stock)
values ('60000000-0000-0000-0000-000000009999', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Ing hotel distinto', 'kg', 0)
on conflict (id) do nothing;

select is(
  (select count(*) from public.purchase_orders),
  2::bigint,
  'Usuario 1 ve sus purchase_orders'
);

select is(
  (select count(*) from public.purchase_order_lines),
  3::bigint,
  'Usuario 1 ve sus líneas'
);

select throws_like(
$$insert into public.purchase_order_lines (id, org_id, purchase_order_id, supplier_item_id, ingredient_id, requested_qty, purchase_unit, rounding_rule) values ('51000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000009999','60000000-0000-0000-0000-000000009999',5,'kg','ceil_pack')$$,
  '%ingredient hotel must match PO hotel%',
  'No se permite línea con ingredient de otro hotel'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.purchase_orders),
  0::bigint,
  'Usuario 2 no ve pedidos de org1'
);

select throws_like(
  $$insert into public.purchase_orders (org_id, hotel_id, supplier_id, status, order_number, total_estimated) values ('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','draft','X',0)$$,
  '%hotel/org mismatch%',
  'Usuario 2 no puede usar hotel/supplier de otra org'
);

select * from finish();

rollback;
