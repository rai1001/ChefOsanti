-- Test RLS for inventory forecasting
begin;
select plan(6);

-- 1. Setup orgs and users
select tests.create_supabase_user('user1', 'user1@example.com');
select tests.create_supabase_user('user2', 'user2@example.com');

insert into public.orgs (id, name, slug) values 
  ('00000000-0000-0000-0000-000000000001', 'Org 1', 'org-1'),
  ('00000000-0000-0000-0000-000000000002', 'Org 2', 'org-2');

insert into public.org_memberships (org_id, user_id, role) values 
  ('00000000-0000-0000-0000-000000000001', tests.get_user_id('user1'), 'member'),
  ('00000000-0000-0000-0000-000000000002', tests.get_user_id('user2'), 'member');

-- Setup hotel and ingredient
insert into public.hotels (id, org_id, name) values 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Hotel 1');

insert into public.ingredients (id, org_id, hotel_id, name, base_unit) values 
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ing 1', 'kg');

-- 2. Test inventory_snapshots RLS
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}'; -- user1
select tests.authenticate_as('user1');

select lives_ok(
  $$ insert into public.inventory_snapshots (org_id, hotel_id, ingredient_id, stock_level) 
     values ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 10) $$,
  'User 1 can insert snapshot in Org 1'
);

select tests.authenticate_as('user2');
select throws_ok(
  $$ insert into public.inventory_snapshots (org_id, hotel_id, ingredient_id, stock_level) 
     values ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 10) $$,
  'new row violates row-level security policy for table "inventory_snapshots"',
  'User 2 cannot insert snapshot in Org 1'
);

select is(
  (select count(*)::int from public.inventory_snapshots),
  0,
  'User 2 sees 0 snapshots from Org 1'
);

-- 3. Test forecast_runs RLS
select tests.authenticate_as('user1');
select lives_ok(
  $$ insert into public.forecast_runs (org_id, hotel_id, ingredient_id, forecast_date, expected_consumption) 
     values ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-01-10', 5.5) $$,
  'User 1 can insert forecast in Org 1'
);

select tests.authenticate_as('user2');
select throws_ok(
  $$ insert into public.forecast_runs (org_id, hotel_id, ingredient_id, forecast_date, expected_consumption) 
     values ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-01-10', 5.5) $$,
  'new row violates row-level security policy for table "forecast_runs"',
  'User 2 cannot insert forecast in Org 1'
);

select is(
  (select count(*)::int from public.forecast_runs),
  0,
  'User 2 sees 0 forecasts from Org 1'
);

select * from finish();
rollback;
