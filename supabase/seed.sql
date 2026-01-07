-- Seed A0: orgs, memberships, hotels (idempotente)
insert into public.orgs (id, name, slug)
values
  ('00000000-0000-0000-0000-000000000001', 'Demo Org', 'demo-org'),
  ('00000000-0000-0000-0000-000000000002', 'Org Demo Sur', 'org-demo-sur')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug;

insert into public.org_memberships (org_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'owner')
on conflict (org_id, user_id) do update
set role = excluded.role;

insert into public.hotels (id, org_id, name, city, country, currency)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Hotel Norte 1', 'Bilbao', 'ES', 'EUR'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Hotel Norte 2', 'Madrid', 'ES', 'EUR'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Hotel Sur 1', 'Valencia', 'ES', 'EUR'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Hotel Sur 2', 'Sevilla', 'ES', 'EUR')
on conflict (id) do update
set name = excluded.name,
    city = excluded.city,
    country = excluded.country,
    currency = excluded.currency;

insert into public.suppliers (id, org_id, name)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Proveedor Demo')
on conflict (id) do update
set name = excluded.name,
    org_id = excluded.org_id;

insert into public.supplier_items (id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Tomate rama', 'kg', 5, 'ceil_pack', 2.8, 'Caja de 5kg'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Huevos L', 'ud', null, 'ceil_unit', 0.18, null)
on conflict (id) do update
set name = excluded.name,
    purchase_unit = excluded.purchase_unit,
    pack_size = excluded.pack_size,
    rounding_rule = excluded.rounding_rule,
    price_per_unit = excluded.price_per_unit,
    notes = excluded.notes;
