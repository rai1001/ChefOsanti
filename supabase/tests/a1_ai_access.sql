begin;

select plan(5);

-- Seed fixtures
select lives_ok($$
  select public.can_use_feature('order_audit','00000000-0000-0000-0000-000000000001')
$$, 'service role allowed');

-- user basic (Org2) no puede order_audit
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is(public.can_use_feature('order_audit','00000000-0000-0000-0000-000000000002'), false, 'basic plan bloquea order_audit');

-- manager pro allowed ocr_review (org1 plan vip satisface pro)
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is(public.can_use_feature('ocr_review','00000000-0000-0000-0000-000000000001'), true, 'manager vip habilita ocr_review');

-- admin vip puede order_audit
select is(public.can_use_feature('order_audit','00000000-0000-0000-0000-000000000001'), true, 'admin vip habilita order_audit');

-- staff vip no puede order_audit
-- insertar staff membership vip
insert into public.org_memberships (org_id, user_id, role) values ('00000000-0000-0000-0000-000000000001','99999999-9999-9999-9999-999999999999','staff') on conflict (org_id, user_id) do update set role=excluded.role;
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
select is(public.can_use_feature('order_audit','00000000-0000-0000-0000-000000000001'), false, 'staff vip bloqueado para order_audit');

select * from finish();
rollback;
