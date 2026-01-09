BEGIN;
SELECT plan(6);

-- 1. Setup
INSERT INTO public.orgs (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000002', 'Approval Org', 'approval-org');
INSERT INTO public.hotels (id, org_id, name) VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Approval Hotel');
INSERT INTO public.suppliers (id, org_id, name) VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Approval Supplier');

-- Create a PO
INSERT INTO public.purchase_orders (id, org_id, hotel_id, supplier_id, order_number, status)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'PO-TEST-APP', 'draft');

-- 2. Mock users
SELECT tests.create_supabase_user('app_staff', 'staff@test.com');
SELECT tests.create_supabase_user('app_admin', 'admin@test.com');

-- Memberships
INSERT INTO public.org_memberships (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000002', tests.get_supabase_uid('app_staff'), 'member');
INSERT INTO public.org_memberships (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000002', tests.get_supabase_uid('app_admin'), 'owner');

-- 3. Test RLS: Staff cannot insert approval
SELECT tests.authenticate_as('app_staff');
SELECT throws_ok(
    $$ INSERT INTO public.approvals (org_id, entity_type, entity_id, status, approver_id) 
       VALUES ('00000000-0000-0000-0000-000000000002', 'purchase_order', '00000000-0000-0000-0000-000000000010', 'approved', tests.get_supabase_uid('app_staff')) $$,
    'new row violates row-level security policy for table "approvals"'
);

-- 4. Test RLS: Admin can insert approval
SELECT tests.authenticate_as('app_admin');
SELECT lives_ok(
    $$ INSERT INTO public.approvals (org_id, entity_type, entity_id, status, approver_id) 
       VALUES ('00000000-0000-0000-0000-000000000002', 'purchase_order', '00000000-0000-0000-0000-000000000010', 'approved', tests.get_supabase_uid('app_admin')) $$,
    'Admin can insert approval'
);

-- 5. Test Trigger: Check if PO status updated
SELECT results_eq(
    $$ SELECT approval_status FROM public.purchase_orders WHERE id = '00000000-0000-0000-0000-000000000010' $$,
    $$ VALUES ('approved'::approval_status) $$,
    'Purchase order approval_status should be updated by trigger'
);

-- 6. Test RLS: Staff can select approvals in their org
SELECT tests.authenticate_as('app_staff');
SELECT is(
    (SELECT count(*)::int FROM public.approvals WHERE entity_id = '00000000-0000-0000-0000-000000000010'),
    1,
    'Staff can see approvals in their org'
);

-- 7. Test Isolation: Create another org/user and check they can't see the approval
INSERT INTO public.orgs (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000020', 'Other Org', 'other-org');
SELECT tests.create_supabase_user('other_user', 'other@test.com');
INSERT INTO public.org_memberships (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000020', tests.get_supabase_uid('other_user'), 'member');

SELECT tests.authenticate_as('other_user');
SELECT is(
    (SELECT count(*)::int FROM public.approvals WHERE entity_id = '00000000-0000-0000-0000-000000000010'),
    0,
    'User from other org cannot see approvals'
);

-- 8. Test rejection logic (multiple approvals, latest wins)
SELECT tests.authenticate_as('app_admin');
INSERT INTO public.approvals (org_id, entity_type, entity_id, status, approver_id, reason) 
VALUES ('00000000-0000-0000-0000-000000000002', 'purchase_order', '00000000-0000-0000-0000-000000000010', 'rejected', tests.get_supabase_uid('app_admin'), 'Mistake');

SELECT results_eq(
    $$ SELECT approval_status FROM public.purchase_orders WHERE id = '00000000-0000-0000-0000-000000000010' $$,
    $$ VALUES ('rejected'::approval_status) $$,
    'Purchase order approval_status should update to latest approval status'
);

SELECT * FROM finish();
ROLLBACK;
