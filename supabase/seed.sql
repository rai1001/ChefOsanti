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
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'admin')
on conflict (org_id, user_id) do update
set role = excluded.role;

-- marcar org activa por defecto para demo
update public.org_memberships
set is_active = true
where org_id = '00000000-0000-0000-0000-000000000001'
  and user_id = '11111111-1111-1111-1111-111111111111';

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

insert into public.ingredients (id, org_id, hotel_id, name, base_unit, stock, par_level)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Tomate', 'kg', 0, null),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Huevos', 'ud', 0, null)
on conflict (id) do update
set name = excluded.name,
    base_unit = excluded.base_unit,
    stock = excluded.stock,
    par_level = excluded.par_level;

-- Planes demo
insert into public.org_plans (org_id, plan)
values
  ('00000000-0000-0000-0000-000000000001', 'vip'),
  ('00000000-0000-0000-0000-000000000002', 'basic')
on conflict (org_id) do update set plan = excluded.plan;

-- Features IA demo
insert into public.ai_features (key, min_plan, min_role, is_enabled)
values
  ('daily_brief', 'pro', 'manager', true),
  ('ocr_review', 'pro', 'manager', true),
  ('order_audit', 'vip', 'admin', true)
on conflict (key) do update
set min_plan = excluded.min_plan,
    min_role = excluded.min_role,
    is_enabled = excluded.is_enabled;

insert into public.purchase_orders (id, org_id, hotel_id, supplier_id, status, order_number, notes, total_estimated)
values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'draft', 'PO-DEMO-001', 'Pedido demo inicial', 0)
on conflict (id) do update
set hotel_id = excluded.hotel_id,
    supplier_id = excluded.supplier_id,
    status = excluded.status,
    order_number = excluded.order_number,
    notes = excluded.notes;

insert into public.purchase_order_lines (id, org_id, purchase_order_id, supplier_item_id, ingredient_id, requested_qty, received_qty, purchase_unit, rounding_rule, pack_size, unit_price, line_total)
values
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 10, 0, 'kg', 'ceil_pack', 5, 2.8, 28),
  ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 30, 0, 'ud', 'ceil_unit', null, 0.18, 5.4)
on conflict (id) do update
set requested_qty = excluded.requested_qty,
    received_qty = excluded.received_qty,
    purchase_unit = excluded.purchase_unit,
    rounding_rule = excluded.rounding_rule,
    pack_size = excluded.pack_size,
    unit_price = excluded.unit_price,
    line_total = excluded.line_total;

-- E1 demo spaces/events/bookings
insert into public.spaces (id, org_id, hotel_id, name, capacity, notes)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sala A', 80, null),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sala B', 60, null),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sala C', 40, null)
on conflict (id) do update
set name = excluded.name,
    capacity = excluded.capacity,
    notes = excluded.notes;

insert into public.events (id, org_id, hotel_id, title, client_name, status, starts_at, ends_at, notes)
values
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Evento Demo', 'Cliente Demo', 'confirmed', '2026-01-10T09:00:00Z', '2026-01-10T18:00:00Z', 'Evento semilla')
on conflict (id) do update
set title = excluded.title,
    client_name = excluded.client_name,
    status = excluded.status,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    notes = excluded.notes;

insert into public.space_bookings (id, org_id, event_id, space_id, starts_at, ends_at, group_label, note)
values
  ('72000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '2026-01-10T09:00:00Z', '2026-01-10T11:00:00Z', 'A+B', 'Montaje maniana'),
  ('72000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '2026-01-10T09:00:00Z', '2026-01-10T11:00:00Z', 'A+B', 'Montaje maniana'),
  ('72000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '2026-01-10T10:30:00Z', '2026-01-10T12:00:00Z', null, 'Reserva solapada demo')
on conflict (id) do update
set starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    group_label = excluded.group_label,
    note = excluded.note;

insert into public.event_services (id, org_id, event_id, service_type, format, starts_at, ends_at, pax, notes)
values
  ('73000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'coffee_break', 'de_pie', '2026-01-10T11:30:00Z', null, 80, 'Coffee de mañana'),
  ('73000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'cena', 'sentado', '2026-01-10T20:00:00Z', '2026-01-10T22:00:00Z', 60, 'Cena formal')
on conflict (id) do update
set service_type = excluded.service_type,
    format = excluded.format,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    pax = excluded.pax,
    notes = excluded.notes;

-- Evento solapado para pruebas de reservas
insert into public.events (id, org_id, hotel_id, title, client_name, status, starts_at, ends_at, notes)
values
  ('71000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Evento Solapado', 'Cliente B', 'confirmed', '2026-01-10T12:00:00Z', '2026-01-10T17:00:00Z', 'Evento que compite stock')
on conflict (id) do update set title = excluded.title, client_name = excluded.client_name, status = excluded.status, starts_at = excluded.starts_at, ends_at = excluded.ends_at;

insert into public.event_services (id, org_id, event_id, service_type, format, starts_at, ends_at, pax, notes)
values
  ('73000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', 'comida', 'sentado', '2026-01-10T13:00:00Z', '2026-01-10T15:00:00Z', 50, 'Servicio solapado')
on conflict (id) do update set service_type = excluded.service_type, format = excluded.format, starts_at = excluded.starts_at, ends_at = excluded.ends_at, pax = excluded.pax, notes = excluded.notes;

-- E3: plantillas de menú
insert into public.menu_templates (id, org_id, name, category, active, notes)
values
  ('74000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Coffee break estandar', 'coffee_break', true, 'Plantilla demo')
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    active = excluded.active,
    notes = excluded.notes;

insert into public.menu_template_items (id, org_id, template_id, section, name, unit, qty_per_pax_seated, qty_per_pax_standing, rounding_rule, pack_size, notes)
values
  ('75000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'Solidos', 'Mini bocadillo', 'ud', 1, 2, 'ceil_unit', null, null),
  ('75000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'Bebidas', 'Cafe', 'ud', 1, 1, 'none', null, null),
  ('75000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'Bebidas', 'Zumo', 'ud', 0, 1, 'ceil_unit', null, null)
on conflict (id) do update
set section = excluded.section,
    name = excluded.name,
    unit = excluded.unit,
    qty_per_pax_seated = excluded.qty_per_pax_seated,
    qty_per_pax_standing = excluded.qty_per_pax_standing,
    rounding_rule = excluded.rounding_rule,
    pack_size = excluded.pack_size,
    notes = excluded.notes;

insert into public.event_service_menus (id, org_id, event_service_id, template_id)
values
  ('76000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001')
on conflict (id) do update
set event_service_id = excluded.event_service_id,
    template_id = excluded.template_id;

-- E4 overrides demo sobre servicio coffee_break demo
insert into public.event_service_notes (id, org_id, event_service_id, note)
values ('77000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 'Nota demo alergias')
on conflict (id) do nothing;

insert into public.event_service_excluded_items (id, org_id, event_service_id, template_item_id)
values ('77000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000003')
on conflict do nothing;

insert into public.event_service_added_items (id, org_id, event_service_id, section, name, unit, qty_per_pax_seated, qty_per_pax_standing, rounding_rule, pack_size, notes)
values ('77000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 'Bebidas', 'Agua saborizada', 'ud', 0, 1, 'ceil_unit', null, 'Extra demo')
on conflict do nothing;

insert into public.event_service_replaced_items (id, org_id, event_service_id, template_item_id, section, name, unit, qty_per_pax_seated, qty_per_pax_standing, rounding_rule, pack_size, notes)
values ('77000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', 'Solidos', 'Mini wrap', 'ud', 1, 1.5, 'ceil_unit', null, 'Sustituye bocadillo')
on conflict do nothing;

-- E5: adjuntos y OCR demo
insert into public.event_attachments (id, org_id, event_id, storage_path, original_name, mime_type, size_bytes)
values ('78000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'org/00000000-0000-0000-0000-000000000001/event/71000000-0000-0000-0000-000000000001/demo.txt', 'demo.txt', 'text/plain', 1200)
on conflict (id) do nothing;

insert into public.ocr_jobs (id, org_id, attachment_id, status, provider, extracted_text, draft_json)
values (
  '78000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '78000000-0000-0000-0000-000000000001',
  'done',
  'mock',
  'DESAYUNO 08:00 60 pax\nBEBIDAS:\nCafe\nZumo\n\nCENA 21:00 50 pax\nENTRANTES:\nEnsalada\nPrincipal:\nPasta\n',
  '{
    "rawText": "DESAYUNO 08:00 60 pax\\nBEBIDAS:\\nCafe\\nZumo\\n\\nCENA 21:00 50 pax\\nENTRANTES:\\nEnsalada\\nPrincipal:\\nPasta\\n",
    "warnings": [],
    "detectedServices": [
      {
        "service_type": "desayuno",
        "starts_at_guess": "08:00",
        "pax_guess": 60,
        "format_guess": "sentado",
        "sections": [
          {"title": "BEBIDAS", "items": ["Cafe","Zumo"]}
        ]
      },
      {
        "service_type": "cena",
        "starts_at_guess": "21:00",
        "pax_guess": 50,
        "format_guess": "sentado",
        "sections": [
          {"title": "ENTRANTES", "items": ["Ensalada"]},
          {"title": "PRINCIPAL", "items": ["Pasta"]}
        ]
      }
    ]
  }'::jsonb
)
on conflict (id) do nothing;

insert into public.event_service_menu_sections (id, org_id, event_service_id, title, sort_order)
values
  ('79000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 'Bebidas OCR', 0)
on conflict (id) do nothing;

insert into public.event_service_menu_items (id, org_id, section_id, text, sort_order)
values
  ('79000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '79000000-0000-0000-0000-000000000001', 'Cafe', 0),
  ('79000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '79000000-0000-0000-0000-000000000001', 'Zumo', 1)
on conflict (id) do nothing;

-- P2 draft orders seed
insert into public.menu_item_aliases (id, org_id, alias_text, normalized, supplier_item_id)
values (
  '80000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'mini bocadillo',
  'mini bocadillo',
  '40000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

insert into public.event_purchase_orders (id, org_id, hotel_id, event_id, supplier_id, status, order_number, total_estimated)
values (
  '81000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'draft',
  'EV-PO-001',
  28
)
on conflict (id) do nothing;

insert into public.event_purchase_order_lines (id, org_id, event_purchase_order_id, supplier_item_id, item_label, qty, purchase_unit, unit_price, line_total)
values (
  '82000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'Tomate rama',
  10,
  'kg',
  2.8,
  28
)
on conflict (id) do nothing;

-- R1 productos y recetas demo
insert into public.products (id, org_id, name, base_unit, category, active)
values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tomate', 'kg', 'vegetal', true),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Huevos', 'ud', 'lacteo', true),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Aceite', 'kg', 'basicos', true),
  ('90000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Prod Sur', 'ud', 'demo', true)
on conflict (id) do update
set name = excluded.name,
    base_unit = excluded.base_unit,
    category = excluded.category,
    active = excluded.active;

update public.ingredients i
set product_id = p.id
from public.products p
where i.org_id = p.org_id
  and i.hotel_id = '20000000-0000-0000-0000-000000000001'
  and lower(i.name) = lower(p.name);

insert into public.recipes (id, org_id, name, category, default_servings, notes)
values
  ('90000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Tortilla basica', 'demo', 10, 'Receta demo')
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    default_servings = excluded.default_servings,
    notes = excluded.notes;

insert into public.recipe_lines (id, org_id, recipe_id, product_id, qty, unit, notes)
values
  ('90000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000010', '90000000-0000-0000-0000-000000000002', 10, 'ud', null),
  ('90000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000010', '90000000-0000-0000-0000-000000000003', 0.2, 'kg', null)
on conflict (id) do update
set qty = excluded.qty,
    unit = excluded.unit,
    notes = excluded.notes,
    product_id = excluded.product_id;

-- S1 staff demo
insert into public.staff_members (id, org_id, home_hotel_id, full_name, role, employment_type, active)
values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Juan Chef', 'jefe_cocina', 'fijo', true),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Ana Pasteleria', 'pasteleria', 'fijo', true),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', null, 'Luis Ayudante', 'ayudante', 'eventual', true),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Marta Office', 'office', 'extra', true),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', null, 'Pedro Cocina', 'cocinero', 'eventual', false)
on conflict (id) do update
set full_name = excluded.full_name,
    role = excluded.role,
    employment_type = excluded.employment_type,
    home_hotel_id = excluded.home_hotel_id,
    active = excluded.active;

-- H2 reglas y time off
insert into public.scheduling_rules (org_id, hotel_id, morning_required_weekday, morning_required_weekend, afternoon_required_daily)
values ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 2, 1)
on conflict (org_id, hotel_id) do update
set morning_required_weekday = excluded.morning_required_weekday,
    morning_required_weekend = excluded.morning_required_weekend,
    afternoon_required_daily = excluded.afternoon_required_daily;

insert into public.staff_vacation_allowance (org_id, staff_member_id, year, days_total)
select '00000000-0000-0000-0000-000000000001', id, extract(year from current_date)::int, 47
from public.staff_members
where org_id = '00000000-0000-0000-0000-000000000001'
on conflict (staff_member_id, year) do nothing;

insert into public.staff_time_off (org_id, staff_member_id, start_date, end_date, type, approved, notes)
values
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', date '2026-01-07', date '2026-01-08', 'vacaciones', true, 'Vacaciones demo')
on conflict do nothing;

-- Shifts manana/tarde semana demo
with base_days as (
  select generate_series(date '2026-01-05', date '2026-01-11', interval '1 day')::date as d
)
insert into public.shifts (org_id, hotel_id, shift_date, shift_type, starts_at, ends_at, required_count)
select
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  d,
  t.shift_type,
  t.starts_at,
  t.ends_at,
  t.req
from base_days
cross join (
  values
    ('mañana'::text, '07:00'::time, '15:00'::time, 1),
    ('tarde', '15:00'::time, '23:00'::time, 1)
) as t(shift_type, starts_at, ends_at, req)
on conflict (hotel_id, shift_date, shift_type) do update
set starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    required_count = excluded.required_count;

-- H1 turnos demo (7 dias, hotel demo norte1)
with base_days as (
  select generate_series(date '2026-01-05', date '2026-01-11', interval '1 day')::date as d
)
insert into public.shifts (id, org_id, hotel_id, shift_date, shift_type, starts_at, ends_at, required_count)
select
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  d,
  t.shift_type,
  t.starts_at,
  t.ends_at,
  t.req
from base_days
cross join (
  values
    ('desayuno'::text, '07:00'::time, '15:00'::time, 1),
    ('bar_tarde', '15:00'::time, '23:00'::time, 1),
    ('eventos', '10:00'::time, '18:00'::time, 0)
) as t(shift_type, starts_at, ends_at, req)
on conflict (hotel_id, shift_date, shift_type) do update
set starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    required_count = excluded.required_count;

-- Asignaciones demo: dos desayunos cubiertos
insert into public.staff_assignments (id, org_id, shift_id, staff_member_id)
select
  gen_random_uuid(),
  s.org_id,
  s.id,
  'a0000000-0000-0000-0000-000000000001'
from public.shifts s
where s.hotel_id = '20000000-0000-0000-0000-000000000001'
  and s.shift_type = 'desayuno'
  and s.shift_date in ('2026-01-05', '2026-01-06')
on conflict (shift_id, staff_member_id) do nothing;

-- PR3 demo datos de stock y buffer
insert into public.purchasing_settings (org_id, default_buffer_percent, default_buffer_qty)
values ('00000000-0000-0000-0000-000000000001', 5, 0.5)
on conflict (org_id) do update
set default_buffer_percent = excluded.default_buffer_percent,
    default_buffer_qty = excluded.default_buffer_qty,
    consider_reservations = true;

insert into public.inventory_locations (id, org_id, hotel_id, name)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Almacen Central')
on conflict (id) do update set name = excluded.name;

insert into public.stock_levels (org_id, location_id, supplier_item_id, on_hand_qty, unit)
values
  ('00000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 6, 'kg'),
  ('00000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 120, 'ud')
on conflict (location_id, supplier_item_id) do update
set on_hand_qty = excluded.on_hand_qty,
    unit = excluded.unit;

insert into public.purchase_orders (id, org_id, hotel_id, supplier_id, status, order_number, total_estimated)
values (
  '90000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'confirmed',
  'PO-DEMO-001',
  0
)
on conflict (id) do update set status = excluded.status;

insert into public.purchase_order_lines (purchase_order_id, org_id, supplier_item_id, ingredient_id, requested_qty, received_qty, purchase_unit, rounding_rule, pack_size, unit_price)
values (
  '90000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  10,
  2,
  'kg',
  'ceil_pack',
  5,
  2.8
)
on conflict (purchase_order_id, supplier_item_id) do update
set requested_qty = excluded.requested_qty,
    received_qty = excluded.received_qty;
