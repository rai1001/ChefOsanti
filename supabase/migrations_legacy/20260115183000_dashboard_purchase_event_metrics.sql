-- IMP5: Dashboard metrics combining purchase orders and events

create or replace view public.dashboard_purchase_event_metrics
with (security_invoker = true)
as
with event_metrics as (
  select
    e.org_id,
    e.hotel_id,
    date_trunc('day', e.starts_at)::date as day,
    count(distinct e.id) as events_count,
    count(distinct e.id) filter (where esm.event_service_id is not null) as confirmed_menus
  from public.events e
  left join public.event_services es on es.event_id = e.id
  left join public.event_service_menus esm on esm.event_service_id = es.id
  where e.starts_at is not null
  group by e.org_id, e.hotel_id, date_trunc('day', e.starts_at)::date
),
purchase_metrics as (
  select
    po.org_id,
    po.hotel_id,
    date_trunc('day', po.created_at)::date as day,
    count(*) filter (where po.status in ('draft', 'confirmed')) as pending_orders,
    count(*) filter (where po.status = 'received') as received_orders,
    coalesce(sum(po.total_estimated), 0) as total_order_value,
    coalesce(sum(po.total_estimated) filter (where po.status in ('draft', 'confirmed')), 0) as pending_value,
    coalesce(sum(po.total_estimated) filter (where po.status = 'received'), 0) as received_value
  from public.purchase_orders po
  group by po.org_id, po.hotel_id, date_trunc('day', po.created_at)::date
)
select
  coalesce(pm.org_id, em.org_id) as org_id,
  coalesce(pm.hotel_id, em.hotel_id) as hotel_id,
  coalesce(pm.day, em.day) as day,
  coalesce(em.events_count, 0) as events_count,
  coalesce(em.confirmed_menus, 0) as confirmed_menus,
  coalesce(pm.pending_orders, 0) as pending_orders,
  coalesce(pm.received_orders, 0) as received_orders,
  coalesce(pm.total_order_value, 0) as total_order_value,
  coalesce(pm.pending_value, 0) as pending_value,
  coalesce(pm.received_value, 0) as received_value
from purchase_metrics pm
full join event_metrics em
  on em.org_id = pm.org_id and em.hotel_id = pm.hotel_id and em.day = pm.day
where public.is_org_member(coalesce(pm.org_id, em.org_id));

grant select on public.dashboard_purchase_event_metrics to authenticated;
grant select on public.dashboard_purchase_event_metrics to anon;
