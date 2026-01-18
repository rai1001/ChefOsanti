-- Schema baseline.
create table orgs (
  id uuid primary key,
  name text not null,
  slug text unique not null
);
create table org_members (
  org_id uuid references orgs(id),
  user_id uuid,
  role text not null,
  is_active boolean default true,
  primary key (org_id,user_id)
);
create table hotels (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  name text not null
);
create type event_status as enum ('draft','confirmed','cancelled');
create table events (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  hotel_id uuid references hotels(id) not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status event_status default 'draft'
);
create table spaces (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  hotel_id uuid references hotels(id) not null,
  name text not null
);
create table space_bookings (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  event_id uuid references events(id) not null,
  space_id uuid references spaces(id) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);
create type service_type as enum('coffee_break','dinner','production');
create type service_format as enum('de_pie','sentado');
create table event_services (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  event_id uuid references events(id) not null,
  service_type service_type not null,
  format service_format not null
);
create type production_status as enum('draft','in_progress','done');
create table production_plans (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  hotel_id uuid references hotels(id) not null,
  event_service_id uuid references event_services(id) not null,
  status production_status default 'draft'
);
create table production_tasks (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  hotel_id uuid references hotels(id) not null,
  plan_id uuid references production_plans(id) not null,
  title text not null,
  station text,
  priority int
);
create table products (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  name text not null,
  unit text not null
);
create type purchase_status as enum('draft','approved','ordered','received');
create table purchase_orders (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  hotel_id uuid references hotels(id) not null,
  supplier_id uuid,
  status purchase_status default 'draft',
  total_estimated numeric
);
create table event_purchase_orders (
  id uuid primary key,
  org_id uuid references orgs(id) not null,
  event_id uuid references events(id) not null,
  status purchase_status default 'draft'
);
