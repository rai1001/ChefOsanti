-- Test helpers for pgTAP
create extension if not exists pgcrypto;

create schema if not exists tests;

create table if not exists tests.users (
  label text primary key,
  user_id uuid not null,
  email text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function tests.ensure_instance()
returns uuid
language plpgsql
security definer
set search_path = auth, public, tests
as $$
declare
  v_instance_id uuid;
begin
  select id into v_instance_id from auth.instances limit 1;
  if v_instance_id is null then
    v_instance_id := gen_random_uuid();
    insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
    values (
      v_instance_id,
      v_instance_id,
      '{}'::text,
      timezone('utc', now()),
      timezone('utc', now())
    );
  end if;
  return v_instance_id;
end;
$$;

create or replace function tests.create_supabase_user(
  p_label text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = auth, public, extensions, tests
as $$
declare
  v_user_id uuid;
  v_email text;
  v_instance_id uuid;
begin
  select user_id into v_user_id from tests.users where label = p_label;
  if v_user_id is not null then
    return v_user_id;
  end if;

  v_user_id := gen_random_uuid();
  v_email := coalesce(p_email, p_label || '@example.com');
  v_instance_id := tests.ensure_instance();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
  )
  values (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    'email',
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (provider, provider_id) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = excluded.updated_at;

  insert into tests.users (label, user_id, email)
  values (p_label, v_user_id, v_email)
  on conflict (label) do update
  set user_id = excluded.user_id,
      email = excluded.email;

  return v_user_id;
end;
$$;

create or replace function tests.get_user_id(p_label text)
returns uuid
language sql
stable
as $$
  select user_id from tests.users where label = $1
$$;

create or replace function tests.get_supabase_uid(p_label text)
returns uuid
language sql
stable
as $$
  select user_id from tests.users where label = $1
$$;

create or replace function tests.authenticate_as(p_label text)
returns void
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from tests.users where label = p_label;
  if v_user_id is null then
    raise exception 'Unknown test user: %', p_label;
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_user_id::text, 'role', 'authenticated')::text,
    true
  );

  execute 'set local role authenticated';
end;
$$;

do $$
declare
  v_instance_id uuid;
begin
  v_instance_id := tests.ensure_instance();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
  )
  values (
    '11111111-1111-1111-1111-111111111111',
    v_instance_id,
    'authenticated',
    'authenticated',
    'admin@chefos.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'email',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object(
      'sub', '11111111-1111-1111-1111-111111111111',
      'email', 'admin@chefos.com',
      'email_verified', true
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (provider, provider_id) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = excluded.updated_at;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
  )
  values (
    '22222222-2222-2222-2222-222222222222',
    v_instance_id,
    'authenticated',
    'authenticated',
    'org2@chefos.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'email',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object(
      'sub', '22222222-2222-2222-2222-222222222222',
      'email', 'org2@chefos.com',
      'email_verified', true
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (provider, provider_id) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = excluded.updated_at;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
  )
  values (
    '33333333-3333-3333-3333-333333333333',
    v_instance_id,
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    'email',
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object(
      'sub', '33333333-3333-3333-3333-333333333333',
      'email', 'test@example.com',
      'email_verified', true
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (provider, provider_id) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = excluded.updated_at;
end $$;

grant usage on schema tests to authenticated;
grant select on tests.users to authenticated;
grant execute on all functions in schema tests to authenticated;
grant usage on schema tests to service_role;
grant select on tests.users to service_role;
grant execute on all functions in schema tests to service_role;

begin;
select plan(1);
select ok(true, 'helpers loaded');
select * from finish();
rollback;
