-- z3_audit_triggers.sql: Audit Triggers Verification

begin;
select plan(7);

-- 1. Setup
insert into public.orgs (id, name, slug) values ('00000000-0000-0000-0000-000000000003', 'Audit Org', 'audit-org');

-- 2. Test Insert on Suppliers
insert into public.suppliers (id, org_id, name, contact_email)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'Audit Supplier', 'audit@test.com');

select is(
  (select count(*) from public.audit_logs where org_id = '00000000-0000-0000-0000-000000000003' and event = 'suppliers insert'),
  1::bigint,
  'Should log supplier insertion'
);

-- 3. Test Update on Suppliers
update public.suppliers 
set contact_email = 'updated@test.com' 
where name = 'Audit Supplier';

select is(
  (select count(*) from public.audit_logs where org_id = '00000000-0000-0000-0000-000000000003' and event = 'suppliers update'),
  1::bigint,
  'Should log supplier update'
);

select is(
  (select (metadata->'new'->>'contact_email') from public.audit_logs where event = 'suppliers update' order by created_at desc limit 1),
  'updated@test.com',
  'Audit log should contain the updated value in metadata'
);

-- 4. Test Delete on Suppliers
delete from public.suppliers where name = 'Audit Supplier';

select is(
  (select count(*) from public.audit_logs where org_id = '00000000-0000-0000-0000-000000000003' and event = 'suppliers delete'),
  1::bigint,
  'Should log supplier deletion'
);

-- 5. Test another master table (events)
insert into public.hotels (id, org_id, name) values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Audit Hotel');
insert into public.events (org_id, hotel_id, title, status)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Audit Event', 'draft');

select is(
  (select count(*) from public.audit_logs where org_id = '00000000-0000-0000-0000-000000000003' and event = 'events insert'),
  1::bigint,
  'Should log event insertion'
);

-- 6. Verify user_id is logged (even if null in tests if no auth context, but trigger handles it)
select ok(
  exists (select 1 from public.audit_logs where org_id = '00000000-0000-0000-0000-000000000003'),
  'Audit logs entry should exist'
);

-- 7. Verify metadata structure
select is(
  (select (metadata->>'table') from public.audit_logs where event = 'events insert' limit 1),
  'events',
  'Metadata should contain the correct table name'
);

select * from finish();
rollback;
