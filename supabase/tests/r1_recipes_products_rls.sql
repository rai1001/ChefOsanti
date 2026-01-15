begin;

select plan(5);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is((select count(*) from public.products), 6::bigint, 'Org1 ve productos seed');
select is((select count(*) from public.recipes), 2::bigint, 'Org1 ve recetas seed');

select throws_like(
  $$insert into public.recipe_lines (org_id, recipe_id, product_id, qty, unit) values ('00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000003',0.1,'ud')$$,
  '%unit must match%',
  'Valida unidad compatible'
);

select throws_like(
  $$insert into public.ingredients (id, org_id, hotel_id, name, base_unit, product_id) values ('90000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Ajeno','kg','90000000-0000-0000-0000-000000000004')$$,
  '%product%',
  'No permite product de otra org en ingredient'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is((select count(*) from public.products where org_id = '00000000-0000-0000-0000-000000000001'), 0::bigint, 'Org2 no ve productos de Org1');

select * from finish();

rollback;
