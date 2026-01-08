begin;

select plan(3);

-- preparar org dummy para validar FK
insert into public.orgs (id, name, slug)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org Test', 'org-test-a1')
on conflict (id) do nothing;

-- default manager
select is(
  (select column_default from information_schema.columns where table_name='org_memberships' and column_name='role'),
  '''manager''::text',
  'Default role manager'
);

-- constraint values
select lives_ok($$insert into public.org_memberships (org_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','admin')$$, 'admin permitido');
select throws_like($$insert into public.org_memberships (org_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','owner')$$, '%role%', 'role invalido bloqueado');

select * from finish();
rollback;
