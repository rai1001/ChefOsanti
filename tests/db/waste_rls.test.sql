
BEGIN;

SELECT plan(10);

-- Create test users
SELECT tests.create_supabase_user('waste_user', 'waste_user@example.com', 'password');
SELECT tests.create_supabase_user('other_user', 'other_user@example.com', 'password');

-- Create test org
INSERT INTO public.orgs (id, name, slug) VALUES ('org-1', 'Test Org 1', 'test-org-1');
INSERT INTO public.orgs (id, name, slug) VALUES ('org-2', 'Test Org 2', 'test-org-2');

-- Add users to orgs
INSERT INTO public.org_members (org_id, user_id, role) VALUES ('org-1', tests.get_supabase_uid('waste_user'), 'owner');
INSERT INTO public.org_members (org_id, user_id, role) VALUES ('org-2', tests.get_supabase_uid('other_user'), 'owner');

-- Create dependencies (Hotel, Product) for Org 1
INSERT INTO public.hotels (id, org_id, name) VALUES ('hotel-1', 'org-1', 'Hotel 1');
INSERT INTO public.products (id, org_id, name, base_unit) VALUES ('prod-1', 'org-1', 'Product 1', 'kg');

-- Create dependencies for Org 2
INSERT INTO public.hotels (id, org_id, name) VALUES ('hotel-2', 'org-2', 'Hotel 2');
INSERT INTO public.products (id, org_id, name, base_unit) VALUES ('prod-2', 'org-2', 'Product 2', 'kg');

-- Switch to waste_user
SELECT tests.authenticate_as('waste_user');

-- Test 1: Can create Waste Reason in own org
PREPARE scan_insert_reason AS INSERT INTO public.waste_reasons (org_id, name) VALUES ('org-1', 'Test Reason');
SELECT lives_ok('scan_insert_reason', 'Users can create waste reasons in their org');

-- Test 2: Can create Waste Entry in own org
PREPARE scan_insert_entry AS INSERT INTO public.waste_entries 
    (org_id, hotel_id, product_id, unit, quantity, reason_id, unit_cost) 
    SELECT 'org-1', 'hotel-1', 'prod-1', 'kg', 10, id, 5 FROM public.waste_reasons WHERE name = 'Test Reason';
SELECT lives_ok('scan_insert_entry', 'Users can create waste entries in their org');

-- Test 3: Cannot see Waste Reasons from other org
INSERT INTO public.waste_reasons (org_id, name) VALUES ('org-2', 'Hidden Reason'); -- Inserted by system/setup (bypass RLS for setup?) 
-- Wait, we are authenticated as waste_user, so we can't insert into org-2 normally if RLS blocks it. 
-- We need to switch role or use a function setup. 
-- For simplicity in this test structure, let's assume we test SELECT visibility.

-- Switch to active admin to setup data for Org 2
SET ROLE postgres;
INSERT INTO public.waste_reasons (org_id, name) VALUES ('org-2', 'Hidden Reason');
SELECT tests.authenticate_as('waste_user');

SELECT is_empty(
    $$ SELECT * FROM public.waste_reasons WHERE org_id = 'org-2' $$,
    'Users cannot see waste reasons from other orgs'
);

-- Test 4: Cannot insert Waste Entry for other org
PREPARE fail_insert_other_org AS INSERT INTO public.waste_entries 
    (org_id, hotel_id, product_id, unit, quantity, reason_id, unit_cost) 
    VALUES ('org-2', 'hotel-2', 'prod-2', 'kg', 10, (SELECT id FROM public.waste_reasons WHERE name = 'Hidden Reason'), 5);
SELECT throws_ok('fail_insert_other_org', 'new row violates row-level security policy for table "waste_entries"', 'Users cannot insert waste entries for other orgs');

-- Test 5: Org Consistency Trigger
PREPARE fail_consistency AS INSERT INTO public.waste_entries 
    (org_id, hotel_id, product_id, unit, quantity, reason_id, unit_cost) 
    VALUES ('org-1', 'hotel-1', 'prod-2', 'kg', 10, (SELECT id FROM public.waste_reasons WHERE name = 'Test Reason'), 5); -- prod-2 is in org-2
SELECT throws_like('fail_consistency', '%Product does not belong to the Organisation%', 'Trigger enforces product org consistency');

SELECT * FROM finish();
ROLLBACK;
