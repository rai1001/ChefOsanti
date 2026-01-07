begin;

select plan(4);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*) from public.hotels),
  2::bigint,
  'Usuario 1 solo ve hoteles de su organización'
);

select is(
  (select count(*) from public.orgs),
  1::bigint,
  'Usuario 1 solo ve su organización'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.hotels),
  2::bigint,
  'Usuario 2 solo ve hoteles de su organización'
);

select is(
  (select count(*) from public.orgs),
  1::bigint,
  'Usuario 2 solo ve su organización'
);

select * from finish();

rollback;
